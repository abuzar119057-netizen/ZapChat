// backend/routes/fcm.js
// Route to register / deregister FCM tokens for a logged‑in user

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendPushNotification } = require('../utils/push');
const { protect } = require('../middleware/auth'); // assumed existing auth middleware

// POST /api/fcm/token  { token: '<FCM_TOKEN>' }
router.post('/token', protect, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'FCM token required' });
  try {
    await User.updateOne(
      { _id: req.user.id },
      { $addToSet: { fcmTokens: token } } // $addToSet prevents duplicates
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('FCM token save error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/fcm/token  { token: '<FCM_TOKEN>' }
router.delete('/token', protect, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'FCM token required' });
  try {
    await User.updateOne({ _id: req.user.id }, { $pull: { fcmTokens: token } });
    res.json({ ok: true });
  } catch (err) {
    console.error('FCM token delete error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
