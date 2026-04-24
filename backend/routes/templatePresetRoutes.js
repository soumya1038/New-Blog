const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMyTemplatePresets,
  createTemplatePreset,
  updateTemplatePreset,
  deleteTemplatePreset,
  toggleTemplatePresetShare
} = require('../controllers/templatePresetController');

router.get('/me', protect, getMyTemplatePresets);
router.post('/', protect, createTemplatePreset);
router.put('/:id', protect, updateTemplatePreset);
router.delete('/:id', protect, deleteTemplatePreset);
router.post('/:id/share', protect, toggleTemplatePresetShare);

module.exports = router;
