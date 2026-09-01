const admin = require('firebase-admin');

const path = require('path');
let firebaseAdminInstance;

try {
  // Decode base64-encoded service account JSON from env var (local fallback enabled) 
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  let serviceAccount;
  if (serviceAccountBase64) {
    const json = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(json);
  } else {
    // Fallback to file path for local development
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : path.join(__dirname, 'firebaseServiceAccount.json');
    serviceAccount = require(serviceAccountPath);
  }

  // Check if it's a placeholder private key to avoid Node pem parsing error
  if (!serviceAccount.private_key || serviceAccount.private_key.includes('...')) {
    throw new Error('Placeholder private key detected');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseAdminInstance = admin;
} catch (error) {
  console.warn('⚠️ Firebase Admin SDK initialization failed/skipped (using mock for local dev):', error.message);
  // Return mock admin object so the server doesn't crash on local dev
  firebaseAdminInstance = {
    messaging: () => ({
      sendToDevice: async (tokens, payload) => {
        console.log('🔔 [MOCK FCM] Sending message to tokens:', tokens, 'Payload:', payload);
        return { results: [] };
      }
    }),
    credential: {
      cert: () => ({})
    }
  };
}

module.exports = firebaseAdminInstance;
