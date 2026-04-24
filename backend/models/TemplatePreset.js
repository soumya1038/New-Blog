const mongoose = require('mongoose');

const templatePresetSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    nameLower: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true
    },
    template: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private'
    }
  },
  { timestamps: true }
);

templatePresetSchema.index({ owner: 1, nameLower: 1 }, { unique: true });
templatePresetSchema.index({ visibility: 1, updatedAt: -1 });

module.exports = mongoose.model('TemplatePreset', templatePresetSchema);
