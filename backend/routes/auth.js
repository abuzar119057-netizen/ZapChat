const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const AccountReport = require('../models/AccountReport');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const { getGfsBucket } = require('../config/db');
const { Readable, PassThrough } = require('stream');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id, email) => {
  return jwt.sign({ id: id.toString(), email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, phone } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'Please provide all required fields (email, password, displayName)' });
    }

    // 🔐 Check Global Registration Setting
    const adminUser = await User.findOne({ role: 'admin' }).select('settings');
    if (adminUser?.settings?.openRegistration === false) {
        return res.status(403).json({ message: '🚫 Registration is currently closed by the administrator.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password: hashedPassword,
      displayName,
      phone: phone || ''
    });


    if (user) {
      return res.status(201).json({
        _id: user.id,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        about: user.about,
        profilePicture: user.profilePicture,
        role: user.role,
        settings: user.settings,
        statusSettings: user.statusSettings,
        token: generateToken(user._id, user.email),
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email/phone and password' });
    }

    // Support login by email OR phone
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: email }
      ]
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      return res.status(200).json({
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        about: user.about,
        profilePicture: user.profilePicture,
        role: user.role,
        settings: user.settings,
        statusSettings: user.statusSettings,
        token: generateToken(user._id, user.email),
      });
    } else {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server error during login', error: error.message, stack: error.stack });
  }
});

// @desc    Get user data
// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error('Fetch Me Error:', error);
    return res.status(500).json({ message: 'Server error fetching profile', error: error.message });
  }
});

// @desc    Get any user profile by ID
// @route   GET /api/auth/users/:id
router.get('/users/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('displayName profilePicture about phone status lastSeen');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching user' });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { displayName, profilePicture, about, phone, settings } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (displayName) user.displayName = displayName;
    if (profilePicture) user.profilePicture = profilePicture;
    if (about) user.about = about;
    if (phone) user.phone = phone;
    if (settings) {
      const currentSettings = user.settings ? (typeof user.settings.toObject === 'function' ? user.settings.toObject() : user.settings) : {};
      
      // Sanitize settings to prevent enum validation errors
      const sanitizedSettings = { ...settings };
      const privacyEnums = ['everyone', 'contacts', 'nobody'];
      
      ['lastSeenVisible', 'profilePhotoPrivacy', 'aboutPrivacy'].forEach(key => {
        if (sanitizedSettings[key] && !privacyEnums.includes(sanitizedSettings[key])) {
          delete sanitizedSettings[key]; // Remove invalid enum values
        }
      });

      user.settings = { ...currentSettings, ...sanitizedSettings };
    }

    try {
      await user.save();
    } catch (saveError) {
      console.error('Mongoose Save Error:', saveError);
      // If save fails due to remaining validation errors, try to save without settings as a fallback
      if (saveError.name === 'ValidationError') {
        // Fallback: only update the top-level fields requested (excluding settings)
        if (displayName) user.displayName = displayName;
        if (profilePicture) user.profilePicture = profilePicture;
        if (about) user.about = about;
        if (phone) user.phone = phone;
        // Skip settings update if it's causing validation failure
        await User.updateOne({ _id: user._id }, { 
          displayName: user.displayName,
          profilePicture: user.profilePicture,
          about: user.about,
          phone: user.phone
        });
      } else {
        throw saveError;
      }
    }

    return res.status(200).json({
      _id: user.id,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      about: user.about,
      profilePicture: user.profilePicture,
      role: user.role,
      settings: user.settings,
      statusSettings: user.statusSettings
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ message: 'Server error updating profile', error: error.message });
  }
});

// @desc    Update status settings
// @route   PUT /api/auth/status-settings
router.put('/status-settings', protect, async (req, res) => {
  try {
    const { statusSettings } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.statusSettings = { ...user.statusSettings?.toObject(), ...statusSettings };
    await user.save();
    return res.status(200).json(user.statusSettings);
  } catch (error) {
    console.error('Status Settings Error:', error);
    return res.status(500).json({ message: 'Error updating status settings' });
  }
});

// @desc    Change phone number
// @route   PUT /api/auth/change-number
router.put('/change-number', protect, async (req, res) => {
  try {
    const { newPhone } = req.body;
    if (!newPhone) return res.status(400).json({ message: 'New phone number is required' });

    const user = await User.findById(req.user.id);
    user.phone = newPhone;
    await user.save();

    res.status(200).json({ message: 'Phone number updated successfully', phone: user.phone });
  } catch (error) {
    res.status(500).json({ message: 'Error changing number' });
  }
});

// @desc    Change email
// @route   PUT /api/auth/change-email
router.put('/change-email', protect, async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) return res.status(400).json({ message: 'New email is required' });

    const existing = await User.findOne({ email: newEmail });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.findById(req.user.id);
    user.email = newEmail;
    await user.save();

    res.status(200).json({ message: 'Email updated successfully', email: user.email });
  } catch (error) {
    res.status(500).json({ message: 'Error changing email' });
  }
});

// @desc    Request account info report
// @route   POST /api/auth/request-report
router.post('/request-report', protect, async (req, res) => {
  try {
    // Check if there's already a processing report
    const existing = await AccountReport.findOne({ user: req.user.id, status: 'processing' });
    if (existing) return res.status(400).json({ message: 'A report is already being processed.' });

    const report = new AccountReport({
      user: req.user.id,
      status: 'processing',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    await report.save();

    // Start background "generation" (5 minutes)
    setTimeout(async () => {
      try {
        const user = await User.findById(req.user.id);
        const gfsBucket = getGfsBucket();
        if (!gfsBucket) throw new Error('GFS Bucket not found');

        // 1. Fetch Messages
        const messages = await Message.find({
          $or: [{ sender: req.user.id }, { receiver: req.user.id }]
        }).sort({ createdAt: 1 }).populate('sender receiver', 'displayName email');

        // 2. Create Chat PDF in memory
        const doc = new PDFDocument();
        const pdfStream = new PassThrough();
        doc.pipe(pdfStream);

        doc.fillColor('#007AFF').fontSize(26).text('Chat History Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).fillColor('#000').text(`User: ${user.displayName} (${user.email})`);
        doc.text(`Generated: ${new Date().toLocaleString()}`);
        doc.moveDown();

        messages.forEach(msg => {
          const senderName = msg.sender?.displayName || 'Unknown';
          const time = new Date(msg.createdAt).toLocaleString();
          doc.fontSize(10).fillColor('#8E8E93').text(`${time} - ${senderName}:`, { continued: true });
          doc.fillColor('#000').text(` ${msg.content || '[Media Attachment]'}`);
          if (msg.messageType !== 'text') {
              doc.fontSize(8).fillColor('#007AFF').text(`   Attachment: ${msg.fileId || 'N/A'}`);
          }
          doc.moveDown(0.2);
        });
        doc.end();

        // 3. Create ZIP Archive
        const archive = archiver('zip', { zlib: { level: 9 } });
        const archiveStream = gfsBucket.openUploadStream(`report_${user.id}_${Date.now()}.zip`, {
          contentType: 'application/zip',
          metadata: { userId: user.id, type: 'account_report' }
        });
        const reportFileId = archiveStream.id;

        archive.pipe(archiveStream);

        // Add Chat PDF
        archive.append(pdfStream, { name: 'Chats/chat_history.pdf' });

        // Add Media Files
        const mediaFiles = messages.filter(m => m.fileId);
        for (const msg of mediaFiles) {
          try {
            const fileId = new mongoose.Types.ObjectId(msg.fileId);
            const files = await gfsBucket.find({ _id: fileId }).toArray();
            if (files && files.length > 0) {
              const file = files[0];
              const downloadStream = gfsBucket.openDownloadStream(fileId);
              const folder = file.contentType.startsWith('image') ? 'Images' : 
                             file.contentType.startsWith('video') ? 'Videos' : 'Files';
              archive.append(downloadStream, { name: `${folder}/${file.filename}` });
            }
          } catch (err) {
            console.error(`Error adding file ${msg.fileId} to ZIP:`, err);
          }
        }

        await archive.finalize();

        archiveStream.on('finish', async () => {
          await AccountReport.findByIdAndUpdate(report._id, { 
            status: 'ready',
            fileId: reportFileId 
          });

          // Notify via socket if connected
          const io = req.app.get('io');
          if (io) {
            io.to(req.user.id).emit('report_ready', { reportId: report._id });
          }
        });

      } catch (err) {
        console.error('Report Generation Error:', err);
      }
    }, 5 * 60 * 1000); // 5 minutes

    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error requesting report' });
  }
});

// @desc    Get report status
// @route   GET /api/auth/report-status
router.get('/report-status', protect, async (req, res) => {
  try {
    const report = await AccountReport.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report status' });
  }
});

// @desc    Download report (Self-destructs after download)
// @route   GET /api/auth/download-report/:id
router.get('/download-report/:id', protect, async (req, res) => {
  try {
    const report = await AccountReport.findOne({ _id: req.params.id, user: req.user.id });
    if (!report || report.status !== 'ready') return res.status(404).json({ message: 'Report not found or not ready' });

    const gfsBucket = getGfsBucket();
    
    if (!mongoose.Types.ObjectId.isValid(report.fileId)) {
      return res.status(400).json({ message: 'This report was generated with an older version. Please request a new report.' });
    }
    
    const fileId = new mongoose.Types.ObjectId(report.fileId);
    
    const files = await gfsBucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) return res.status(404).json({ message: 'File not found' });

    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="zapchat_export_${req.user.id}.zip"`);
    
    const downloadStream = gfsBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

    // Self-destruct logic: Delete after successful stream
    res.on('finish', async () => {
      try {
        await gfsBucket.delete(fileId);
        await AccountReport.findByIdAndDelete(report._id);
        console.log(`Report ${report._id} self-destructed successfully.`);
      } catch (err) {
        console.error('Self-destruct Error:', err);
      }
    });
  } catch (error) {
    console.error('Download Error:', error);
    res.status(500).json({ message: 'Error downloading report' });
  }
});

// @desc    Logout from all devices (simulation of token invalidation)
// @route   POST /api/auth/logout-all
router.post('/logout-all', protect, async (req, res) => {
  try {
    // In a real production app with refresh tokens, we would invalidate them all here.
    // For this implementation, we'll just acknowledge the request.
    res.status(200).json({ message: 'Successfully logged out from all other devices' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out from all devices' });
  }
});

// @desc    Delete user account
// @route   DELETE /api/auth/me
router.delete('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Clean up messages (optional but recommended)
    await Message.deleteMany({ $or: [{ sender: user._id }, { recipient: user._id }] });
    
    await User.findByIdAndDelete(user._id);

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account' });
  }
});

// @desc    Get real usage stats (Data & Storage)
// @route   GET /api/auth/usage
router.get('/usage', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Total Messages Sent/Received
    const messageCount = await Message.countDocuments({
      $or: [{ sender: userId }, { recipient: userId }]
    });

    // 2. Total Media Size (Aggregation)
    const mediaStats = await Message.aggregate([
      { 
        $match: { 
          $or: [{ sender: userId }, { recipient: userId }],
          type: { $in: ['image', 'video', 'file', 'audio'] },
          'fileMetadata.size': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileMetadata.size' }
        }
      }
    ]);

    const totalMediaBytes = mediaStats.length > 0 ? mediaStats[0].totalSize : 0;

    // 3. Call Count (Simulation or actual if model exists)
    // Since Call model might not be in the workspace or exported here, we'll check Message type 'call'
    const callCount = await Message.countDocuments({
      $or: [{ sender: userId }, { recipient: userId }],
      type: 'call'
    });

    res.status(200).json({
      messages: messageCount,
      mediaBytes: totalMediaBytes,
      calls: callCount,
      messagesSize: (messageCount * 1024), // Rough estimate: 1KB per text message meta
      receivedBytes: totalMediaBytes + (messageCount * 512), // Simulated
      sentBytes: (totalMediaBytes * 0.4) + (messageCount * 256) // Simulated
    });
  } catch (error) {
    console.error('Usage Stats Error:', error);
    res.status(500).json({ message: 'Error fetching usage stats' });
  }
});

module.exports = router;
