const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog' },
  short: { type: mongoose.Schema.Types.ObjectId, ref: 'Short' },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isHearted: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

commentSchema.pre('validate', function(next) {
  if (!this.blog && !this.short) {
    next(new Error('Comment must reference either a blog or a short'));
  } else if (this.blog && this.short) {
    next(new Error('Comment cannot reference both blog and short'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Comment', commentSchema);
