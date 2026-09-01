const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Changed to false for group messages
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null,
  },
  content: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'gif', 'sticker', 'location', 'contact', 'live_location', 'call'],
    default: 'text',
  },
  expiresAt: {
    type: Date,
    default: null
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId, // Refers to GridFS file
    default: null,
  },
  fileMetadata: {
    filename: String,
    contentType: String,
    size: Number,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'played'],
    default: 'sent',
  },
  isForwarded: { type: Boolean, default: false },
  isSystem: { type: Boolean, default: false },
  starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPinned: { type: Boolean, default: false },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String
  }]
}, { timestamps: true });

// Message schema indices for faster queries
messageSchema.index({ sender: 1 });
messageSchema.index({ recipient: 1 });
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ deletedFor: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
