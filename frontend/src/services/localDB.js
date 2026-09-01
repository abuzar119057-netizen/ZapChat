// ═══════════════════════════════════════════════════════════════════════
//  localDB.js  —  IndexedDB wrapper (equivalent to local_db_helper.dart)
//  Stores messages & chats locally. Tracks is_synced flag for background sync.
// ═══════════════════════════════════════════════════════════════════════
import { openDB } from 'idb';

const DB_NAME = 'zapchat_offline_db';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // ── Messages Store ──────────────────────────────────────────────
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'localId' });
          msgStore.createIndex('chatId', 'chatId', { unique: false });
          msgStore.createIndex('is_synced', 'is_synced', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // ── Chats Store ─────────────────────────────────────────────────
        if (!db.objectStoreNames.contains('chats')) {
          const chatStore = db.createObjectStore('chats', { keyPath: '_id' });
          chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // ── Nearby Peers Store ──────────────────────────────────────────
        if (!db.objectStoreNames.contains('peers')) {
          db.createObjectStore('peers', { keyPath: 'peerId' });
        }
      },
    });
  }
  return dbPromise;
}

// ── Message CRUD ─────────────────────────────────────────────────────────────

export async function saveMessage(message) {
  const db = await getDB();
  const record = {
    ...message,
    localId: message.localId || message._id || `local_${Date.now()}_${Math.random()}`,
    is_synced: message.is_synced ?? (message._id ? 1 : 0),
    source: message.source || 'online', // 'online' | 'mesh' | 'offline'
    timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
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
  return index.getAll(0); // is_synced = 0 means unsynced
}

export async function markMessageSynced(localId, serverId) {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  const record = await tx.store.get(localId);
  if (record) {
    record.is_synced = 1;
    record._id = serverId || record._id;
    await tx.store.put(record);
  }
  await tx.done;
}

export async function deleteMessage(localId) {
  const db = await getDB();
  await db.delete('messages', localId);
}

// ── Chat CRUD ─────────────────────────────────────────────────────────────────

export async function saveChat(chat) {
  const db = await getDB();
  await db.put('chats', { ...chat, updatedAt: chat.updatedAt || new Date().toISOString() });
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
}

// ── Peer Store ────────────────────────────────────────────────────────────────

export async function savePeer(peer) {
  const db = await getDB();
  await db.put('peers', { ...peer, lastSeen: Date.now() });
}

export async function getAllPeers() {
  const db = await getDB();
  return db.getAll('peers');
}

export async function removePeer(peerId) {
  const db = await getDB();
  await db.delete('peers', peerId);
}
