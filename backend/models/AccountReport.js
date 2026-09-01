const mongoose = require('mongoose');

const accountReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'ready', 'expired'],
    default: 'processing'
  },
  fileId: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('AccountReport', accountReportSchema);
