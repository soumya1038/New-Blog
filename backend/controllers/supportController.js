const crypto = require('crypto');
const SupportRequest = require('../models/SupportRequest');
const mongoose = require('mongoose');
const { sendContactEmail } = require('../utils/mailService');
const { logError, sendSafeServerError } = require('../utils/safeErrorLog');

const sendSupportServerError = (res, error) =>
  sendSafeServerError(res, '[supportController] request failed:', error, 'Unable to process support request');

const ALLOWED_TYPES = new Set(['support', 'report', 'appeal']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORT_STATUSES = ['open', 'reviewing', 'waiting_for_user', 'resolved', 'closed'];
const SUPPORT_STATUS_SET = new Set(SUPPORT_STATUSES);
const ACTIVE_SUPPORT_STATUSES = ['open', 'reviewing'];
const SUPPORT_PRIORITIES = ['normal', 'high', 'urgent'];
const SUPPORT_PRIORITY_SET = new Set(SUPPORT_PRIORITIES);
const ADMIN_EVENT_LIMIT = 50;
const SUPPORT_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.SUPPORT_QUERY_MAX_TIME_MS) || 5000);
const MAX_SUPPORT_PAGE_LIMIT = Math.max(1, Number(process.env.MAX_SUPPORT_PAGE_LIMIT) || 100);
const MAX_SUPPORT_PAGE = Math.max(1, Number(process.env.MAX_SUPPORT_PAGE) || 1000);

const cleanText = (value, maxLength) =>
  String(value || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeSourcePath = (value) => {
  const sourcePath = cleanText(value, 300);
  if (!sourcePath) return '';

  if (/^\/(?!\/)/.test(sourcePath)) return sourcePath;

  try {
    const parsed = new URL(sourcePath);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    const normalizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 300);
    return normalizedPath.startsWith('/') ? normalizedPath : '';
  } catch (error) {
    return '';
  }
};

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
    const exists = await SupportRequest.exists({ referenceNumber })
      .maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS);
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

const toPlain = (value) => {
  if (!value) return value;
  if (typeof value.toObject === 'function') return value.toObject();
  return value;
};

const serializeUserSummary = (value) => {
  if (!value) return null;
  const user = toPlain(value);
  if (typeof user !== 'object' || typeof user.toHexString === 'function') {
    return { _id: String(user) };
  }
  return {
    _id: String(user._id || user.id || ''),
    username: user.username || '',
    name: user.name || '',
  };
};

const serializeAdminEvent = (event) => {
  const item = toPlain(event) || {};
  return {
    action: item.action || 'support_request_updated',
    adminId: item.adminId ? String(item.adminId) : '',
    adminUsername: item.adminUsername || '',
    changes: item.changes || {},
    createdAt: item.createdAt,
  };
};

const serializeSupportRequest = (request, { includeAdminFields = false } = {}) => {
  const item = toPlain(request) || {};
  const payload = {
    _id: String(item._id || ''),
    referenceNumber: item.referenceNumber || '',
    type: item.type || '',
    category: item.category || '',
    email: item.email || '',
    subject: item.subject || '',
    description: item.description || '',
    reference: item.reference || '',
    sourcePath: item.sourcePath || '',
    userId: serializeUserSummary(item.userId),
    username: item.username || '',
    status: item.status || 'open',
    priority: item.priority || 'normal',
    assignedTo: serializeUserSummary(item.assignedTo),
    resolvedAt: item.resolvedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  if (includeAdminFields) {
    payload.adminNotes = item.adminNotes || '';
    payload.adminEvents = Array.isArray(item.adminEvents)
      ? item.adminEvents.map(serializeAdminEvent)
      : [];
  }

  return payload;
};

const buildSupportAdminChanges = (previous, request, touchedFields) => {
  const changes = {};
  if (touchedFields.status && previous.status !== request.status) {
    changes.status = { from: previous.status, to: request.status };
  }
  if (touchedFields.priority && previous.priority !== request.priority) {
    changes.priority = { from: previous.priority, to: request.priority };
  }
  if (touchedFields.adminNotes && previous.adminNotes !== request.adminNotes) {
    changes.adminNotes = { changed: true, length: request.adminNotes.length };
  }
  const assignedTo = request.assignedTo ? String(request.assignedTo) : '';
  if (touchedFields.assignedTo && previous.assignedTo !== assignedTo) {
    changes.assignedTo = { from: previous.assignedTo, to: assignedTo };
  }
  return changes;
};

exports.createSupportRequest = async (req, res) => {
  try {
    const type = cleanText(req.body.type, 20).toLowerCase();
    const category = cleanText(req.body.category, 120);
    const email = cleanText(req.body.email, 254).toLowerCase();
    const subject = cleanText(req.body.subject, 160);
    const description = cleanText(req.body.description, 5000);
    const reference = cleanText(req.body.reference, 500);
    const sourcePath = normalizeSourcePath(req.body.sourcePath);

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
      logError('[support] Admin notification email failed:', error);
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
    logError('[support] create request failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to record the request right now. Please try again.',
    });
  }
};

exports.getMySupportRequests = async (req, res) => {
  try {
    const requests = await SupportRequest.find({ userId: req.user._id })
      .select('-adminNotes -adminEvents -metadata')
      .sort({ createdAt: -1 })
      .limit(100)
      .maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS)
      .lean();
    return res.json({
      success: true,
      requests: requests.map((request) => serializeSupportRequest(request)),
    });
  } catch (error) {
    return sendSupportServerError(res, error);
  }
};

exports.getAdminSupportRequests = async (req, res) => {
  try {
    const { type, status, priority, page = 1, limit = 50 } = req.query;
    const query = {};

    const normalizedType = cleanText(type, 20).toLowerCase();
    if (normalizedType) {
      if (!ALLOWED_TYPES.has(normalizedType)) {
        return res.status(400).json({ success: false, message: 'Invalid support request type.' });
      }
      query.type = normalizedType;
    }
    const normalizedStatus = cleanText(status, 40).toLowerCase();
    if (normalizedStatus) {
      if (!SUPPORT_STATUS_SET.has(normalizedStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid support request status.' });
      }
      query.status = normalizedStatus;
    }
    const normalizedPriority = cleanText(priority, 40).toLowerCase();
    if (normalizedPriority) {
      if (!SUPPORT_PRIORITY_SET.has(normalizedPriority)) {
        return res.status(400).json({ success: false, message: 'Invalid support request priority.' });
      }
      query.priority = normalizedPriority;
    }

    const safeLimit = Math.min(toPositiveInteger(limit, 50), MAX_SUPPORT_PAGE_LIMIT);
    const safePage = Math.min(toPositiveInteger(page, 1), MAX_SUPPORT_PAGE);
    const [requests, total] = await Promise.all([
      SupportRequest.find(query)
        .populate('userId', 'username name')
        .populate('assignedTo', 'username name')
        .sort({ priority: -1, createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS)
        .lean(),
      SupportRequest.countDocuments(query).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
    ]);

    return res.json({
      success: true,
      requests: requests.map((request) =>
        serializeSupportRequest(request, { includeAdminFields: true })
      ),
      total,
      page: safePage,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    });
  } catch (error) {
    return sendSupportServerError(res, error);
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
      SupportRequest.countDocuments(activeQuery).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
      SupportRequest.countDocuments({ ...activeQuery, priority: 'urgent' }).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
      SupportRequest.countDocuments({ ...activeQuery, priority: { $in: ['high', 'urgent'] } }).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
      SupportRequest.countDocuments({ ...activeQuery, createdAt: { $lte: staleCutoff } }).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
      SupportRequest.countDocuments({ ...activeQuery, assignedTo: null }).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
      SupportRequest.countDocuments({ createdAt: { $gte: recentCutoff } }).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
      SupportRequest.countDocuments({ status: 'waiting_for_user' }).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
      SupportRequest.findOne(activeQuery)
        .select('referenceNumber type priority status createdAt')
        .sort({ createdAt: 1 })
        .maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS),
      SupportRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).option({ maxTimeMS: SUPPORT_QUERY_MAX_TIME_MS }),
      SupportRequest.aggregate([
        { $match: activeQuery },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]).option({ maxTimeMS: SUPPORT_QUERY_MAX_TIME_MS }),
      SupportRequest.aggregate([
        { $match: activeQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]).option({ maxTimeMS: SUPPORT_QUERY_MAX_TIME_MS }),
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
        byPriority: toCountMap(byPriorityRows, SUPPORT_PRIORITIES),
      },
    });
  } catch (error) {
    return sendSupportServerError(res, error);
  }
};
exports.updateAdminSupportRequest = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid support request id.' });
    }

    const request = await SupportRequest.findById(req.params.id)
      .maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Support request not found.' });
    }

    const { status, priority, adminNotes, assignToMe } = req.body;
    const previous = {
      status: request.status,
      priority: request.priority,
      adminNotes: request.adminNotes || '',
      assignedTo: request.assignedTo ? String(request.assignedTo) : '',
    };
    const touchedFields = {
      status: false,
      priority: false,
      adminNotes: false,
      assignedTo: false,
    };

    const setUpdates = {};

    if (status !== undefined) {
      const normalizedStatus = cleanText(status, 40).toLowerCase();
      if (!SUPPORT_STATUS_SET.has(normalizedStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' });
      }
      request.status = normalizedStatus;
      request.resolvedAt = normalizedStatus === 'resolved' || normalizedStatus === 'closed' ? new Date() : null;
      setUpdates.status = request.status;
      setUpdates.resolvedAt = request.resolvedAt;
      touchedFields.status = true;
    }
    if (priority !== undefined) {
      const normalizedPriority = cleanText(priority, 40).toLowerCase();
      if (!SUPPORT_PRIORITY_SET.has(normalizedPriority)) {
        return res.status(400).json({ success: false, message: 'Invalid priority.' });
      }
      request.priority = normalizedPriority;
      setUpdates.priority = request.priority;
      touchedFields.priority = true;
    }
    if (adminNotes !== undefined) {
      request.adminNotes = cleanText(adminNotes, 5000);
      setUpdates.adminNotes = request.adminNotes;
      touchedFields.adminNotes = true;
    }
    if (assignToMe !== undefined && typeof assignToMe !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid assignment value.' });
    }
    if (assignToMe === true) {
      request.assignedTo = req.user._id;
      setUpdates.assignedTo = req.user._id;
      touchedFields.assignedTo = true;
    }
    if (assignToMe === false) {
      request.assignedTo = null;
      setUpdates.assignedTo = null;
      touchedFields.assignedTo = true;
    }

    const changes = buildSupportAdminChanges(previous, request, touchedFields);
    const update = {};
    if (Object.keys(setUpdates).length > 0) {
      update.$set = setUpdates;
    }
    if (Object.keys(changes).length > 0) {
      update.$push = {
        adminEvents: {
          $each: [{
            action: 'support_request_updated',
            adminId: req.user._id,
            adminUsername: cleanText(req.user?.username || req.user?.name || 'admin', 100),
            changes,
          }],
          $slice: -ADMIN_EVENT_LIMIT,
        },
      };
    }

    const updatedRequest = Object.keys(update).length > 0
      ? await SupportRequest.findOneAndUpdate(
          { _id: request._id },
          update,
          { new: true, runValidators: true }
        ).maxTimeMS(SUPPORT_QUERY_MAX_TIME_MS)
      : request;

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Support request not found.' });
    }

    await updatedRequest.populate([
      { path: 'userId', select: 'username name' },
      { path: 'assignedTo', select: 'username name' },
    ]);

    return res.json({
      success: true,
      request: serializeSupportRequest(updatedRequest, { includeAdminFields: true }),
    });
  } catch (error) {
    return sendSupportServerError(res, error);
  }
};


