const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
  },
  password: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    default: '',
  },
  fcmTokens: [{ type: String }], // multi-device push tokens
  about: {
    type: String,
    default: 'Hey there! I am using Zap Chat.',
  },
  profilePicture: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline',
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  settings: {
    lastSeenVisible: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    profilePhotoPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    aboutPrivacy: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
    readReceipts: { type: Boolean, default: true },
    groupsPrivacy: { type: String, enum: ['everyone', 'contacts', 'except'], default: 'everyone' },
    blockedContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    theme: { type: String, default: 'light' },
    disappearingMessages: { type: Number, default: 0 }, // 0 = off, 24, 168, 2160 (hours)
    twoStepEnabled: { type: Boolean, default: false },
    twoStepPin: { type: String, default: '' },
    securityNotifications: { type: Boolean, default: true },
    messageNotifications: { type: Boolean, default: true },
    messageTone: { type: String, default: 'default' },
    showPreviews: { type: Boolean, default: true },
    groupNotifications: { type: Boolean, default: true },
    groupTone: { type: String, default: 'default' },
    inAppVibrate: { type: Boolean, default: true },
    inAppSounds: { type: Boolean, default: true },
    mutedContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Pro Chat Settings
    fontSize: { type: Number, default: 16 },
    enterIsSend: { type: Boolean, default: true },
    autoDownload: { type: Boolean, default: false },
    linkPreview: { type: Boolean, default: true },
    keepArchived: { type: Boolean, default: false },
    emojiStyle: { type: String, default: 'native' },
    disappearDefault: { type: String, default: 'Off' },
    // Data & Storage Settings
    cellularPhotos: { type: Boolean, default: true },
    cellularAudio: { type: Boolean, default: false },
    cellularVideo: { type: Boolean, default: false },
    cellularDocs: { type: Boolean, default: false },
    wifiPhotos: { type: Boolean, default: true },
    wifiAudio: { type: Boolean, default: true },
    wifiVideo: { type: Boolean, default: true },
    wifiDocs: { type: Boolean, default: true },
    uploadQuality: { type: String, default: 'auto' }, // 'auto', 'best', 'saver'
    lowDataCalls: { type: Boolean, default: false },
    // Admin Global Controls (stored on admin user, applied via middleware/logic)
    maintenanceMode: { type: Boolean, default: false },
    forceReadReceipts: { type: Boolean, default: false },
    maxMessageLength: { type: Number, default: 5000 },
    globalSlowMode: { type: Number, default: 0 },
    openRegistration: { type: Boolean, default: true },
  },
  statusSettings: {
    privacy: { type: String, enum: ['contacts', 'except', 'only', 'me', 'public', 'exceptions', 'only_share'], default: 'contacts' },
    privacyExceptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    privacyOnlyShare: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hideViewersList: { type: Boolean, default: false },
    disableScreenshot: { type: Boolean, default: false },
    customExpiryTime: { type: Number, default: 24 }, // in hours
    allowDownload: { type: Boolean, default: true },
    allowForward: { type: Boolean, default: true },
    voicePrivacy: { type: String, default: 'contacts' },
    autoPrivacySuggestion: { type: Boolean, default: false },
    closeFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    privateAccount: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
