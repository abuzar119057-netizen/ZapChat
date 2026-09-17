// ═══════════════════════════════════════════════════════════════════════
//  localDB.js — Enhanced Offline-First IndexedDB Store (v2)
//  Stores Users, Chats, Messages, Files, and Persistent Sync Queue
// ═══════════════════════════════════════════════════════════════════════
import { openDB } from 'idb';

const DB_NAME = 'zapchat_offline_db';
const DB_VERSION = 2;

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

        // ── 4. Users Store (v2) ────────────────────────────────────────────
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'userId' });
          userStore.createIndex('displayName', 'displayName', { unique: false });
        }

        // ── 5. Files Store (v2) ────────────────────────────────────────────
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'fileId' });
          fileStore.createIndex('messageId', 'messageId', { unique: false });
          fileStore.createIndex('transferStatus', 'transferStatus', { unique: false });
        }

        // ── 6. Sync Queue Store (v2) ───────────────────────────────────────
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
    // Exponential Backoff: 1s, 3s, 9s, 27s, max 60s
    const delay = Math.min(1000 * Math.pow(3, item.attemptCount - 1), 60000);
    item.nextRetryAt = Date.now() + delay;
    if (item.attemptCount >= 10) {
      item.status = 'failed';
    }
    await db.put('sync_queue', item);
  }
}

// ── Diagnostics Stats ────────────────────────────────────────────────────────

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

export async function getLocalDBStats() {
  const db = await getDB();
  const msgCount = await db.count('messages');
  const chatCount = await db.count('chats');
  const fileCount = await db.count('files');
  const queueCount = await db.count('sync_queue');
  
  return {
    dbVersion: DB_VERSION,
    msgCount,
    chatCount,
    fileCount,
    queueCount
  };
}
