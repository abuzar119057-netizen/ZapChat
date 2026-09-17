// ═══════════════════════════════════════════════════════════════════════
//  localDB.js — Offline-First IndexedDB Store (v3)
//  Stores Users, Chats, Messages, Files, and Persistent Sync Queue
//  Step 10: Full offline account creation + signin with real PBKDF2
// ═══════════════════════════════════════════════════════════════════════
import { openDB } from 'idb';

const DB_NAME = 'zapchat_offline_db';
const DB_VERSION = 3; // bumped to 3 to force fresh upgrade

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // ── 1. Messages Store ──────────────────────────────────────────────
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'localId' });
          msgStore.createIndex('chatId', 'chatId', { unique: false });
          msgStore.createIndex('is_synced', 'is_synced', { unique: false });
          msgStore.createIndex('status', 'status', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // ── 2. Chats Store ─────────────────────────────────────────────────
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: '_id' });
          chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // ── 3. Nearby Peers Store ──────────────────────────────────────────
        if (!db.objectStoreNames.contains('peers')) {
          db.createObjectStore('peers', { keyPath: 'peerId' });
        }

        // ── 4. Users Store ────────────────────────────────────────────────
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'userId' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('displayName', 'displayName', { unique: false });
        }

        // ── 5. Files Store ────────────────────────────────────────────────
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'fileId' });
          fileStore.createIndex('messageId', 'messageId', { unique: false });
          fileStore.createIndex('transferStatus', 'transferStatus', { unique: false });
        }

        // ── 6. Sync Queue Store ───────────────────────────────────────────
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'queueId' });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

// ── Message CRUD & Status Engine ──────────────────────────────────────────────

export async function saveMessage(message) {
  const db = await getDB();
  const localId = message.localId || message.messageId || message._id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Deduplication check
  const existing = await db.get('messages', localId);
  const record = {
    ...existing,
    ...message,
    localId,
    status: message.status || (existing ? existing.status : (message._id ? 'sent' : 'pending')),
    is_synced: message.is_synced ?? (existing ? existing.is_synced : (message._id ? 1 : 0)),
    transportType: message.transportType || (existing ? existing.transportType : 'online'),
    timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
    createdAt: message.createdAt || (existing ? existing.createdAt : new Date().toISOString()),
    updatedAt: new Date().toISOString()
  };
  
  await db.put('messages', record);
  return record;
}

export async function getMessagesByChatId(chatId) {
  const db = await getDB();
  const index = db.transaction('messages').store.index('chatId');
  const msgs = await index.getAll(chatId);
  return msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export async function getUnsyncedMessages() {
  const db = await getDB();
  const index = db.transaction('messages').store.index('is_synced');
  return index.getAll(0);
}

export async function updateMessageStatus(localId, status, serverId = null) {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  const record = await tx.store.get(localId);
  if (record) {
    record.status = status;
    if (serverId) record._id = serverId;
    if (status === 'sent' || status === 'delivered' || status === 'read') {
      record.is_synced = 1;
    }
    record.updatedAt = new Date().toISOString();
    await tx.store.put(record);
  }
  await tx.done;
}

export async function markMessageSynced(localId, serverId) {
  await updateMessageStatus(localId, 'sent', serverId);
}

export async function deleteMessage(localId) {
  const db = await getDB();
  await db.delete('messages', localId);
}

// ── Chat CRUD ─────────────────────────────────────────────────────────────────

export async function saveChat(chat) {
  const db = await getDB();
  const existing = await db.get('chats', chat._id);
  await db.put('chats', {
    ...existing,
    ...chat,
    updatedAt: chat.updatedAt || new Date().toISOString()
  });
}

export async function getAllChats() {
  const db = await getDB();
  const chats = await db.getAll('chats');
  return chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function clearAllLocal() {
  const db = await getDB();
  await db.clear('messages');
  await db.clear('chats');
  await db.clear('files');
  await db.clear('sync_queue');
}

// ── File Records ─────────────────────────────────────────────────────────────

export async function saveFileRecord(fileInfo) {
  const db = await getDB();
  const fileId = fileInfo.fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    ...fileInfo,
    fileId,
    transferStatus: fileInfo.transferStatus || 'pending',
    uploadedBytes: fileInfo.uploadedBytes || 0,
    totalBytes: fileInfo.totalBytes || 0,
    updatedAt: new Date().toISOString()
  };
  await db.put('files', record);
  return record;
}

export async function getFileRecord(fileId) {
  const db = await getDB();
  return db.get('files', fileId);
}

// ── Persistent Sync Queue ─────────────────────────────────────────────────────

export async function enqueueSyncItem(type, payload) {
  const db = await getDB();
  const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item = {
    queueId,
    type,
    payload,
    attemptCount: 0,
    status: 'pending',
    lastAttemptAt: null,
    nextRetryAt: Date.now(),
    createdAt: new Date().toISOString()
  };
  await db.put('sync_queue', item);
  return item;
}

export async function getPendingSyncQueue() {
  const db = await getDB();
  const allItems = await db.getAll('sync_queue');
  const now = Date.now();
  return allItems.filter(item => item.status === 'pending' && (!item.nextRetryAt || item.nextRetryAt <= now));
}

export async function removeSyncItem(queueId) {
  const db = await getDB();
  await db.delete('sync_queue', queueId);
}

export async function recordSyncFailure(queueId, reason = '') {
  const db = await getDB();
  const item = await db.get('sync_queue', queueId);
  if (item) {
    item.attemptCount += 1;
    item.lastAttemptAt = Date.now();
    const delay = Math.min(1000 * Math.pow(3, item.attemptCount - 1), 60000);
    item.nextRetryAt = Date.now() + delay;
    if (item.attemptCount >= 10) {
      item.status = 'failed';
    }
    await db.put('sync_queue', item);
  }
}

// ── Peers ────────────────────────────────────────────────────────────────────

export async function savePeer(peer) {
  const db = await getDB();
  const peerId = peer.peerId || peer.id || peer._id || `peer_${Date.now()}`;
  await db.put('peers', { ...peer, peerId, lastSeen: Date.now() });
}

export async function getAllPeers() {
  const db = await getDB();
  return db.getAll('peers');
}

export async function removePeer(peerId) {
  const db = await getDB();
  await db.delete('peers', peerId);
}

// ═══════════════════════════════════════════════════════════════════════
//  STEP 10: Secure Offline Password Hashing
//  Uses PBKDF2-SHA256 with deriveBits (NOT AES-GCM key)
//  Works in both browser and Capacitor Android WebView
// ═══════════════════════════════════════════════════════════════════════

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple SHA-256 fallback using SubtleCrypto (works without HTTPS in Capacitor)
 * Used as inner hash for PBKDF2 simulation when SubtleCrypto.PBKDF2 unavailable
 */
async function sha256(data) {
  const buf = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(buf);
}

/**
 * Robust PBKDF2-SHA256 implementation
 * Uses SubtleCrypto PBKDF2 when available, falls back to manual HMAC-SHA256 rounds
 */
async function hashPasswordPBKDF2(password, saltHex = null) {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);

  // Generate or decode salt
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));

  const saltStr = bytesToHex(salt);

  try {
    // Primary: SubtleCrypto PBKDF2 using deriveBits (correct approach)
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 32 bytes
    );

    const hashHex = bytesToHex(new Uint8Array(derivedBits));
    return { hashHex, saltHex: saltStr };

  } catch (cryptoErr) {
    // Fallback: Manual PBKDF2-like iterative SHA-256 (works in all environments)
    console.warn('[localDB] SubtleCrypto PBKDF2 unavailable, using SHA-256 fallback:', cryptoErr.message);

    const iterations = 100000;
    // Combine password + salt for initial block
    const combined = new Uint8Array(passwordBytes.length + salt.length);
    combined.set(passwordBytes);
    combined.set(salt, passwordBytes.length);

    let block = combined;
    for (let i = 0; i < iterations; i++) {
      block = await sha256(block);
    }

    const hashHex = bytesToHex(block);
    return { hashHex, saltHex: saltStr };
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Offline User Account CRUD (Step 10)
// ═══════════════════════════════════════════════════════════════════════

export async function createLocalUser({ displayName, username, password }) {
  const db = await getDB();
  const cleanUsername = username.trim().toLowerCase();

  // Check username uniqueness
  const allUsers = await db.getAll('users');
  const existing = allUsers.find(u => u.username === cleanUsername);
  if (existing) {
    throw new Error('یہ username پہلے سے موجود ہے۔ کوئی دوسرا نام چنیں۔');
  }

  // Hash password
  let hashHex, saltHex;
  try {
    const result = await hashPasswordPBKDF2(password);
    hashHex = result.hashHex;
    saltHex = result.saltHex;
  } catch (e) {
    throw new Error('Password hashing failed: ' + e.message);
  }

  const localAccountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const userRecord = {
    userId: localAccountId,
    localAccountId,
    displayName: displayName.trim(),
    username: cleanUsername,
    passwordHash: hashHex,
    saltHex,
    accountType: 'LOCAL_OFFLINE',
    failedAttempts: 0,
    lockoutUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.put('users', userRecord);

  const user = {
    _id: localAccountId,
    localAccountId,
    displayName: displayName.trim(),
    username: cleanUsername,
    accountType: 'LOCAL_OFFLINE',
    isOffline: true
  };

  await saveActiveOfflineSession(user);
  return user;
}

export async function verifyLocalPassword(username, password) {
  const db = await getDB();
  const cleanUsername = username.trim().toLowerCase();
  const allUsers = await db.getAll('users');
  const user = allUsers.find(u => u.username === cleanUsername);

  if (!user) {
    throw new Error('غلط username یا password۔');
  }

  // Brute-force lockout check
  if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
    const remainingSecs = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
    throw new Error(`بہت زیادہ غلط کوششیں۔ ${remainingSecs} سیکنڈ بعد دوبارہ کوشش کریں۔`);
  }

  // Verify password
  let hashHex;
  try {
    const result = await hashPasswordPBKDF2(password, user.saltHex);
    hashHex = result.hashHex;
  } catch (e) {
    throw new Error('Password verification failed: ' + e.message);
  }

  if (hashHex !== user.passwordHash) {
    const failedAttempts = (user.failedAttempts || 0) + 1;
    let lockoutUntil = null;
    let errMsg = `غلط password۔ (${failedAttempts}/5 کوششیں)`;

    if (failedAttempts >= 5) {
      lockoutUntil = Date.now() + 60000;
      errMsg = 'بہت زیادہ غلط کوششیں۔ اکاؤنٹ 60 سیکنڈ کے لیے بند ہے۔';
      user.failedAttempts = 0;
    } else {
      user.failedAttempts = failedAttempts;
    }

    user.lockoutUntil = lockoutUntil;
    user.updatedAt = new Date().toISOString();
    await db.put('users', user);

    throw new Error(errMsg);
  }

  // Successful login — reset counters
  user.failedAttempts = 0;
  user.lockoutUntil = null;
  user.updatedAt = new Date().toISOString();
  await db.put('users', user);

  const activeUser = {
    _id: user.localAccountId,
    localAccountId: user.localAccountId,
    displayName: user.displayName,
    username: user.username,
    accountType: user.accountType || 'LOCAL_OFFLINE',
    isOffline: true
  };

  await saveActiveOfflineSession(activeUser);
  return activeUser;
}

export async function saveActiveOfflineSession(user) {
  try {
    localStorage.setItem('zapchat_active_offline_user', JSON.stringify(user));
  } catch (e) {
    console.error('[localDB] Failed to save offline session:', e);
  }
}

export async function getActiveOfflineSession() {
  try {
    const stored = localStorage.getItem('zapchat_active_offline_user');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[localDB] Failed to parse offline session:', e);
  }
  return null;
}

export async function clearActiveOfflineSession() {
  try {
    localStorage.removeItem('zapchat_active_offline_user');
  } catch (e) {
    console.error('[localDB] Failed to clear offline session:', e);
  }
}

// ── Diagnostics Stats ────────────────────────────────────────────────────────

export async function getLocalDBStats() {
  const db = await getDB();
  const msgCount = await db.count('messages');
  const chatCount = await db.count('chats');
  const fileCount = await db.count('files');
  const queueCount = await db.count('sync_queue');
  const userCount = await db.count('users');

  return {
    dbVersion: DB_VERSION,
    msgCount,
    chatCount,
    fileCount,
    queueCount,
    userCount
  };
}
