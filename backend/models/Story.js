const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'text', 'voice'],
    required: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to GridFS file
    required: true,
  },
  caption: {
    type: String,
    default: '',
  },
  bgColor: {
    type: String,
    default: '#007AFF',
  },
  fontColor: {
    type: String,
    default: '#FFFFFF',
  },
  fontSize: {
    type: String,
    default: '32px',
  },
  fontFamily: {
    type: String,
    default: 'inherit',
  },
   viewers: [{
     type: mongoose.Schema.Types.ObjectId,
     ref: 'User'
   }],
   reactions: [{
     user: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'User',
       required: true
     },
     emoji: {
       type: String,
       required: true
     }
   }],
   expiresAt: {
     type: Date,
     required: true,
     index: { expires: 0 } // TTL index: documents will be removed at this exact time
   }
 }, { timestamps: true });

module.exports = mongoose.model('Story', storySchema);
