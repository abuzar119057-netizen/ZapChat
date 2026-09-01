const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending',
  }
}, { timestamps: true });

// Ensure a user cannot have multiple contact records for the same person
contactSchema.index({ user: 1, contact: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);
