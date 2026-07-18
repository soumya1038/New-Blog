const mongoose = require('mongoose');

const GROUP_CALL_ROOM_NAME_MAX_LENGTH = Math.max(
  1,
  Number(process.env.GROUP_CALL_ROOM_NAME_MAX_LENGTH || process.env.SOCKET_ROOM_NAME_MAX_LENGTH) || 120
);

const groupCallSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  roomName: {
    type: String,
    required: true,
    trim: true,
    maxlength: GROUP_CALL_ROOM_NAME_MAX_LENGTH
  },
  callType: {
    type: String,
    enum: ['audio', 'video'],
    default: 'video'
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  duration: Number
}, {
  timestamps: true
});

groupCallSchema.index({ group: 1, status: 1 });
groupCallSchema.index({ roomName: 1, status: 1 });
groupCallSchema.index({ startedAt: -1 });
groupCallSchema.index(
  { group: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'unique_active_group_call'
  }
);

module.exports = mongoose.model('GroupCall', groupCallSchema);
