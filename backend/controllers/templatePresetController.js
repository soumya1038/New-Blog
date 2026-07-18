const TemplatePreset = require('../models/TemplatePreset');
const mongoose = require('mongoose');
const { sendSafeServerError } = require('../utils/safeErrorLog');

const sendTemplatePresetServerError = (res, error) =>
  sendSafeServerError(res, '[templatePresetController] request failed:', error, 'Unable to process template preset request');

const MAX_TEMPLATE_PAYLOAD_BYTES = 450000;
const TEMPLATE_PRESET_DEFAULT_LIMIT = Math.max(1, Number(process.env.TEMPLATE_PRESET_DEFAULT_LIMIT) || 50);
const TEMPLATE_PRESET_MAX_LIMIT = Math.max(1, Number(process.env.TEMPLATE_PRESET_MAX_LIMIT) || 100);
const TEMPLATE_PRESET_QUERY_MAX_TIME_MS = Math.max(100, Number(process.env.TEMPLATE_PRESET_QUERY_MAX_TIME_MS) || 5000);

const parsePresetLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return TEMPLATE_PRESET_DEFAULT_LIMIT;
  return Math.min(parsed, TEMPLATE_PRESET_MAX_LIMIT);
};

const isValidPresetId = (id) => mongoose.isValidObjectId(id);

const serializePreset = (preset) => ({
  id: preset._id,
  name: preset.name,
  template: preset.template,
  visibility: preset.visibility,
  createdAt: preset.createdAt,
  updatedAt: preset.updatedAt
});

const normalizeName = (value = '') => String(value || '').trim().slice(0, 80);

const normalizeTemplatePayload = (rawTemplate) => {
  let parsed = rawTemplate;

  if (typeof rawTemplate === 'string') {
    try {
      parsed = JSON.parse(rawTemplate);
    } catch (error) {
      return { error: 'Invalid template JSON payload' };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'Template payload must be an object' };
  }

  let asJson;
  try {
    asJson = JSON.stringify(parsed);
  } catch (error) {
    return { error: 'Template payload could not be serialized' };
  }

  if (!asJson || Buffer.byteLength(asJson, 'utf8') > MAX_TEMPLATE_PAYLOAD_BYTES) {
    return { error: 'Template payload is too large' };
  }

  return {
    value: JSON.parse(asJson)
  };
};

exports.getMyTemplatePresets = async (req, res) => {
  try {
    const limit = parsePresetLimit(req.query?.limit);
    const query = { owner: req.user._id };
    const [presets, total] = await Promise.all([
      TemplatePreset.find(query)
        .sort({ updatedAt: -1, _id: -1 })
        .limit(limit)
        .maxTimeMS(TEMPLATE_PRESET_QUERY_MAX_TIME_MS)
        .lean(),
      TemplatePreset.countDocuments(query)
        .maxTimeMS(TEMPLATE_PRESET_QUERY_MAX_TIME_MS)
    ]);

    return res.json({
      success: true,
      presets: presets.map((preset) => serializePreset(preset)),
      total,
      pagination: {
        mode: 'limit',
        limit
      }
    });
  } catch (error) {
    return sendTemplatePresetServerError(res, error);
  }
};

exports.createTemplatePreset = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    const templateResult = normalizeTemplatePayload(req.body?.template);
    if (!templateResult.value) {
      return res.status(400).json({ success: false, message: templateResult.error });
    }

    const visibility = req.body?.visibility === 'public' ? 'public' : 'private';
    const nameLower = name.toLowerCase();

    const existingPreset = await TemplatePreset.findOne({ owner: req.user._id, nameLower })
      .maxTimeMS(TEMPLATE_PRESET_QUERY_MAX_TIME_MS);
    if (existingPreset) {
      return res.status(409).json({
        success: false,
        message: 'Template name already exists for this user',
        code: 'TEMPLATE_NAME_CONFLICT'
      });
    }

    const created = await TemplatePreset.create({
      owner: req.user._id,
      name,
      nameLower,
      template: templateResult.value,
      visibility
    });

    return res.status(201).json({
      success: true,
      preset: serializePreset(created)
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Template name already exists for this user',
        code: 'TEMPLATE_NAME_CONFLICT'
      });
    }
    return sendTemplatePresetServerError(res, error);
  }
};

exports.updateTemplatePreset = async (req, res) => {
  try {
    if (!isValidPresetId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid template preset id' });
    }

    const updates = {};

    if (req.body?.name !== undefined) {
      const nextName = normalizeName(req.body.name);
      if (!nextName) {
        return res.status(400).json({ success: false, message: 'Template name is required' });
      }
      const nextNameLower = nextName.toLowerCase();

      const conflict = await TemplatePreset.findOne({
        owner: req.user._id,
        nameLower: nextNameLower,
        _id: { $ne: req.params.id }
      }).maxTimeMS(TEMPLATE_PRESET_QUERY_MAX_TIME_MS);
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Template name already exists for this user',
          code: 'TEMPLATE_NAME_CONFLICT'
        });
      }

      updates.name = nextName;
      updates.nameLower = nextNameLower;
    }

    if (req.body?.template !== undefined) {
      const templateResult = normalizeTemplatePayload(req.body.template);
      if (!templateResult.value) {
        return res.status(400).json({ success: false, message: templateResult.error });
      }
      updates.template = templateResult.value;
    }

    if (req.body?.visibility !== undefined) {
      if (!['private', 'public'].includes(req.body.visibility)) {
        return res.status(400).json({ success: false, message: 'Invalid visibility value' });
      }
      updates.visibility = req.body.visibility;
    }

    const preset = await TemplatePreset.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      Object.keys(updates).length ? { $set: updates } : { $set: { updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).maxTimeMS(TEMPLATE_PRESET_QUERY_MAX_TIME_MS);

    if (!preset) {
      return res.status(404).json({ success: false, message: 'Template preset not found' });
    }

    return res.json({
      success: true,
      preset: serializePreset(preset)
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Template name already exists for this user',
        code: 'TEMPLATE_NAME_CONFLICT'
      });
    }
    return sendTemplatePresetServerError(res, error);
  }
};

exports.deleteTemplatePreset = async (req, res) => {
  try {
    if (!isValidPresetId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid template preset id' });
    }

    const preset = await TemplatePreset.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
      .maxTimeMS(TEMPLATE_PRESET_QUERY_MAX_TIME_MS);
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Template preset not found' });
    }

    return res.json({ success: true, message: 'Template preset deleted' });
  } catch (error) {
    return sendTemplatePresetServerError(res, error);
  }
};

exports.toggleTemplatePresetShare = async (req, res) => {
  try {
    if (!isValidPresetId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid template preset id' });
    }

    const preset = await TemplatePreset.findOne({ _id: req.params.id, owner: req.user._id })
      .select('visibility')
      .maxTimeMS(TEMPLATE_PRESET_QUERY_MAX_TIME_MS);
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Template preset not found' });
    }

    const requested = req.body?.visibility;
    if (requested && !['private', 'public'].includes(requested)) {
      return res.status(400).json({ success: false, message: 'Invalid visibility value' });
    }

    const updated = await TemplatePreset.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { visibility: requested || (preset.visibility === 'public' ? 'private' : 'public') } },
      { new: true, runValidators: true }
    ).maxTimeMS(TEMPLATE_PRESET_QUERY_MAX_TIME_MS);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Template preset not found' });
    }

    return res.json({
      success: true,
      preset: serializePreset(updated)
    });
  } catch (error) {
    return sendTemplatePresetServerError(res, error);
  }
};
