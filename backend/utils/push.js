// backend/utils/push.js
// Helper to send push notifications via Firebase Admin SDK
// Uses the User model to fetch stored FCM tokens and respects settings.messageNotifications

const admin = require('../config/firebase');
const User = require('../models/User');

/**
 * Sends a push notification to a user.
 * @param {string} userId - MongoDB ObjectId of the recipient user.
 * @param {object} payload - Firebase message payload (notification + data).
 */
async function sendPushNotification(userId, payload) {
  try {
    const user = await User.findById(userId).select('fcmTokens settings.messageNotifications');
    if (!user) return;
    // Respect user's notification preference
    if (user.settings?.messageNotifications === false) return;
    const tokens = user.fcmTokens?.filter(Boolean);
    if (!tokens || tokens.length === 0) return;

    let response;
    try {
        response = await admin.messaging().sendToDevice(tokens, payload);
    } catch (err) {
        if (err.errorInfo?.code === 'messaging/invalid-registration-token') {
            // Remove invalid tokens from DB
            await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { $in: tokens } } });
        }
        return;
    }
    // Cleanup invalid / unregistered tokens
    const invalid = [];
    response.results.forEach((result, idx) => {
      if (result.error && (result.error.code === 'messaging/invalid-registration-token' || result.error.code === 'messaging/registration-token-not-registered')) {
        invalid.push(tokens[idx]);
      }
    });
    if (invalid.length) {
      await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { $in: invalid } } });
    }
  } catch (err) {
    console.error('🔔 sendPushNotification error:', err);
  }
}

module.exports = { sendPushNotification };
