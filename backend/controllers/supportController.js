const crypto = require('crypto');
const SupportRequest = require('../models/SupportRequest');
const { sendContactEmail } = require('../utils/mailService');

const ALLOWED_TYPES = new Set(['support', 'report', 'appeal']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORT_STATUSES = ['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed'];
const ACTIVE_SUPPORT_STATUSES = ['open', 'reviewing'];

const cleanText = (value, maxLength) =>
  String(value || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);

const buildReferenceNumber = () => {
  const date = new Date();
  const datePart = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `LEK-${datePart}-${randomPart}`;
};

const createUniqueReferenceNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referenceNumber = buildReferenceNumber();
    const exists = await SupportRequest.exists({ referenceNumber });
    if (!exists) return referenceNumber;
  }
  return `LEK-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

const getPriority = (type, category) => {
  const normalized = String(category || '').toLowerCase();
  if (
    normalized.includes('child safety') ||
    normalized.includes('threat') ||
    normalized.includes('illegal')
  ) {
    return 'urgent';
  }
  if (type === 'report' || normalized.includes('payment') || normalized.includes('fraud')) {
    return 'high';
  }
  return 'normal';
};

exports.createSupportRequest = async (req, res) => {
  try {
    const type = cleanText(req.body.type, 20).toLowerCase();
    const category = cleanText(req.body.category, 120);
    const email = cleanText(req.body.email, 254).toLowerCase();
    const subject = cleanText(req.body.subject, 160);
    const description = cleanText(req.body.description, 5000);
    const reference = cleanText(req.body.reference, 500);
    const sourcePath = cleanText(req.body.sourcePath, 300);

    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ success: false, message: 'Select a valid request type.' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Select a category.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid response email.' });
    }
    if (subject.length < 4) {
      return res.status(400).json({ success: false, message: 'Enter a clearer subject.' });
    }
    if (description.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Add at least 20 characters of useful detail.',
      });
    }

    const referenceNumber = await createUniqueReferenceNumber();
    const supportRequest = await SupportRequest.create({
      referenceNumber,
      type,
      category,
      email,
      subject,
      description,
      reference,
      sourcePath,
      userId: req.user?._id || null,
      username: cleanText(req.user?.username, 100),
      priority: getPriority(type, category),
      metadata: {
        userAgent: cleanText(req.get('user-agent'), 500),
        platform: cleanText(req.get('sec-ch-ua-platform'), 100),
      },
    });

    sendContactEmail({
      userEmail: email,
      username: req.user?.username || 'Public support requester',
      issue: `[${type.toUpperCase()}] ${category}: ${subject}\n\n${description}\n\nReference: ${reference || 'Not provided'}\nTicket: ${referenceNumber}`,
      advice: `Source: ${sourcePath || 'Not provided'} | Priority: ${supportRequest.priority}`,
    }).catch((error) => {
      console.error('[support] Admin notification email failed:', error.message);
    });

    return res.status(201).json({
      success: true,
      message:
        type === 'report'
          ? 'Your report has been recorded for review.'
          : type === 'appeal'
            ? 'Your appeal has been recorded for review.'
            : 'Your support request has been recorded.',
      referenceNumber,
    });
  } catch (error) {
    console.error('[support] create request failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to record the request right now. Please try again.',
    });
  }
};

exports.getMySupportRequests = async (req, res) => {
  try {
    const requests = await SupportRequest.find({ userId: req.user._id })
      .select('-adminNotes -metadata')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminSupportRequests = async (req, res) => {
  try {
    const { type, status, priority, page = 1, limit = 50 } = req.query;
    const query = {};
    if (ALLOWED_TYPES.has(String(type || '').toLowerCase())) query.type = type;
    if (['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed'].includes(status)) {
      query.status = status;
    }
    if (['normal', 'high', 'urgent'].includes(priority)) query.priority = priority;

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const [requests, total] = await Promise.all([
      SupportRequest.find(query)
        .populate('userId', 'username name email')
        .populate('assignedTo', 'username name')
        .sort({ priority: -1, createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      SupportRequest.countDocuments(query),
    ]);

    return res.json({
      success: true,
      requests,
      total,
      page: safePage,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


const toCountMap = (rows, expectedKeys = []) => {
  const counts = expectedKeys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
  rows.forEach((row) => {
    if (row._id) counts[row._id] = row.count;
  });
  return counts;
};

exports.getAdminSupportMetrics = async (req, res) => {
  try {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeQuery = { status: { $in: ACTIVE_SUPPORT_STATUSES } };

    const [
      activeTotal,
      urgentActive,
      highOrUrgentActive,
      staleActive,
      unassignedActive,
      createdLast24h,
      waitingForUser,
      oldestActive,
      byStatusRows,
      byTypeRows,
      byPriorityRows,
    ] = await Promise.all([
      SupportRequest.countDocuments(activeQuery),
      SupportRequest.countDocuments({ ...activeQuery, priority: 'urgent' }),
      SupportRequest.countDocuments({ ...activeQuery, priority: { $in: ['high', 'urgent'] } }),
      SupportRequest.countDocuments({ ...activeQuery, createdAt: { $lte: staleCutoff } }),
      SupportRequest.countDocuments({ ...activeQuery, assignedTo: null }),
      SupportRequest.countDocuments({ createdAt: { $gte: recentCutoff } }),
      SupportRequest.countDocuments({ status: 'waiting_for_user' }),
      SupportRequest.findOne(activeQuery)
        .select('referenceNumber type priority status createdAt')
        .sort({ createdAt: 1 }),
      SupportRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SupportRequest.aggregate([
        { $match: activeQuery },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      SupportRequest.aggregate([
        { $match: activeQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    return res.json({
      success: true,
      metrics: {
        generatedAt: now.toISOString(),
        activeTotal,
        urgentActive,
        highOrUrgentActive,
        staleActive,
        unassignedActive,
        createdLast24h,
        waitingForUser,
        staleAfterHours: 72,
        oldestActive,
        byStatus: toCountMap(byStatusRows, SUPPORT_STATUSES),
        byType: toCountMap(byTypeRows, Array.from(ALLOWED_TYPES)),
        byPriority: toCountMap(byPriorityRows, ['normal', 'high', 'urgent']),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.updateAdminSupportRequest = async (req, res) => {
  try {
    const request = await SupportRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Support request not found.' });
    }

    const { status, priority, adminNotes, assignToMe } = req.body;
    if (status !== undefined) {
      if (!['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
      }
      request.status = status;
      request.resolvedAt = status === 'resolved' || status === 'closed' ? new Date() : null;
    }
    if (priority !== undefined) {
      if (!['normal', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ success: false, message: 'Invalid priority.' });
      }
      request.priority = priority;
    }
    if (adminNotes !== undefined) {
      request.adminNotes = cleanText(adminNotes, 5000);
    }
    if (assignToMe === true) request.assignedTo = req.user._id;
    if (assignToMe === false) request.assignedTo = null;

    await request.save();
    return res.json({ success: true, request });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


