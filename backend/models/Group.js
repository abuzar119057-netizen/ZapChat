const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isGroup: {
    type: Boolean,
    default: true
  },
  // Settings
  settings: {
    messagingRestricted: { type: Boolean, default: false },
    editInfoRestricted: { type: Boolean, default: false },
    disappearingMessages: { type: Number, default: 0 },
    announcementMode: { type: Boolean, default: false },
    
    // Messaging Control
    allowText: { type: Boolean, default: true },
    allowVoice: { type: Boolean, default: true },
    allowMedia: { type: Boolean, default: true },
    allowFiles: { type: Boolean, default: true },
    allowLinks: { type: Boolean, default: true },
    allowEmojis: { type: Boolean, default: true },
    
    // Member Permissions
    whoCanAddMembers: { type: String, enum: ['everyone', 'admins'], default: 'everyone' },
    whoCanInvite: { type: String, enum: ['everyone', 'admins'], default: 'everyone' },
    
    // Editing Permissions
    whoCanEditName: { type: String, enum: ['everyone', 'admins'], default: 'everyone' },
    whoCanEditImage: { type: String, enum: ['everyone', 'admins'], default: 'everyone' },
    whoCanEditDesc: { type: String, enum: ['everyone', 'admins'], default: 'everyone' },
    whoCanPin: { type: String, enum: ['everyone', 'admins'], default: 'admins' },
    
    // Interaction Control
    allowReactions: { type: Boolean, default: true },
    allowReply: { type: Boolean, default: true },
    allowForward: { type: Boolean, default: true },
    
    // Advanced Control
    slowMode: { type: Number, default: 0 }, // Seconds limit per user
    autoReply: { type: Boolean, default: false },
    autoReplyText: { type: String, default: '' },
    
    // Security Permissions
    hideMemberList: { type: Boolean, default: false },
    restrictScreenshot: { type: Boolean, default: false },

    // Moderation Tools
    autoSpamDetection: { type: Boolean, default: false },
    autoFilterBadWords: { type: Boolean, default: false }
  },
  // Banned members and mutes
  bannedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Invite system
  inviteCode: { type: String, unique: true, sparse: true },
  inviteLinkActive: { type: Boolean, default: false },
  // Pinned messages
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  // Per-user mute settings: { oderId: { muted: true, until: Date } }
  muteSettings: {
    type: Map,
    of: {
      muted: Boolean,
      until: Date
    },
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
