const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');
const { protect } = require('../middleware/auth');
const Call = require('../models/Call');

const fs = require('fs');

// Ensure directory exists
const uploadDir = 'uploads/recordings';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        crypto.randomBytes(16, (err, buf) => {
            if (err) return cb(err);
            cb(null, buf.toString('hex') + path.extname(file.originalname));
        });
    }
});

const upload = multer({ storage });


// @route   POST api/calls/recordings/upload
// @desc    Upload a call recording
// @access  Private
router.post('/upload', [protect, upload.single('recording')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Update call record with the recording file path
    if (req.body.callId) {
        await Call.findByIdAndUpdate(req.body.callId, {
            recordingUrl: `/uploads/recordings/${req.file.filename}`,
            isRecorded: true
        });
    }

    res.json({ 
      msg: 'Recording uploaded successfully', 
      path: `/uploads/recordings/${req.file.filename}`,
      filename: req.file.filename 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }

});

// @route   GET api/calls/recordings/:id
// @desc    Get a recording by ID
// @access  Private
// (Requires GridFS download logic - can be added if needed)

module.exports = router;
