const TemplatePreset = require('../models/TemplatePreset');

const MAX_TEMPLATE_PAYLOAD_BYTES = 450000;

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
    const presets = await TemplatePreset.find({ owner: req.user._id })
      .sort({ updatedAt: -1, _id: -1 })
      .lean();

    return res.json({
      success: true,
      presets: presets.map((preset) => serializePreset(preset))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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

    const existingPreset = await TemplatePreset.findOne({ owner: req.user._id, nameLower });
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTemplatePreset = async (req, res) => {
  try {
    const preset = await TemplatePreset.findOne({ _id: req.params.id, owner: req.user._id });
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Template preset not found' });
    }

    if (req.body?.name !== undefined) {
      const nextName = normalizeName(req.body.name);
      if (!nextName) {
        return res.status(400).json({ success: false, message: 'Template name is required' });
      }
      const nextNameLower = nextName.toLowerCase();

      const conflict = await TemplatePreset.findOne({
        owner: req.user._id,
        nameLower: nextNameLower,
        _id: { $ne: preset._id }
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Template name already exists for this user',
          code: 'TEMPLATE_NAME_CONFLICT'
        });
      }

      preset.name = nextName;
      preset.nameLower = nextNameLower;
    }

    if (req.body?.template !== undefined) {
      const templateResult = normalizeTemplatePayload(req.body.template);
      if (!templateResult.value) {
        return res.status(400).json({ success: false, message: templateResult.error });
      }
      preset.template = templateResult.value;
    }

    if (req.body?.visibility !== undefined) {
      if (!['private', 'public'].includes(req.body.visibility)) {
        return res.status(400).json({ success: false, message: 'Invalid visibility value' });
      }
      preset.visibility = req.body.visibility;
    }

    await preset.save();

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
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTemplatePreset = async (req, res) => {
  try {
    const preset = await TemplatePreset.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Template preset not found' });
    }

    return res.json({ success: true, message: 'Template preset deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleTemplatePresetShare = async (req, res) => {
  try {
    const preset = await TemplatePreset.findOne({ _id: req.params.id, owner: req.user._id });
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Template preset not found' });
    }

    const requested = req.body?.visibility;
    if (requested && !['private', 'public'].includes(requested)) {
      return res.status(400).json({ success: false, message: 'Invalid visibility value' });
    }

    preset.visibility = requested || (preset.visibility === 'public' ? 'private' : 'public');
    await preset.save();

    return res.json({
      success: true,
      preset: serializePreset(preset)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
