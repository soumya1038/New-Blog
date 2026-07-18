const mongoose = require('mongoose');

const statusViewSchema = new mongoose.Schema({
  statusOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  statusId: { type: mongoose.Schema.Types.ObjectId, required: true },
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, select: false },
}, { timestamps: false });

statusViewSchema.index(
  { statusOwnerId: 1, statusId: 1, viewerId: 1 },
  { unique: true, name: 'status_view_unique' }
);
statusViewSchema.index({ statusOwnerId: 1, statusId: 1, seenAt: -1 });
statusViewSchema.index({ viewerId: 1, seenAt: -1 });
statusViewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('StatusView', statusViewSchema);
