const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog' },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
  short: { type: mongoose.Schema.Types.ObjectId, ref: 'Short' },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isHearted: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

commentSchema.pre('validate', function(next) {
  const refs = [this.blog, this.article, this.short].filter(Boolean);
  if (refs.length === 0) {
    next(new Error('Comment must reference a blog, article, or short'));
  } else if (refs.length > 1) {
    next(new Error('Comment can only reference one content type'));
  } else {
    next();
  }
});

module.exports = mongoose.model('Comment', commentSchema);
