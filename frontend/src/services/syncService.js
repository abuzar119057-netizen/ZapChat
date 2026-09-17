// ═══════════════════════════════════════════════════════════════════════
//  syncService.js — Advanced Offline-First Background Sync Engine
//  Syncs local IndexedDB messages, read receipts, and files with MERN backend.
// ═══════════════════════════════════════════════════════════════════════

import axios from 'axios';
import { 
  getUnsyncedMessages, 
  markMessageSynced, 
  getPendingSyncQueue, 
  removeSyncItem, 
  recordSyncFailure,
  getLocalDBStats 
} from './localDB';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.retryCount = 0;
    
    this.api = axios.create({
      baseURL: import.meta.env.VITE_BACKEND_URL
        ? `${import.meta.env.VITE_BACKEND_URL}/api`
        : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api`,
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  startMonitoring() {
    window.addEventListener('online', () => {
      console.log('[SyncEngine] Network restored (online). Initiating sync...');
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncEngine] Network offline.');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        console.log('[SyncEngine] App foregrounded. Running sync check...');
        this.triggerSync();
      }
    });

    // Periodic background sync poll every 20 seconds
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.triggerSync();
      }
    }, 20000);

    if (navigator.onLine) {
      this.triggerSync();
    }
  }

  stopMonitoring() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  async triggerSync() {
    if (this.isSyncing) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      this.isSyncing = true;

      // ── 1. Sync Unsynced Offline Messages ─────────────────────────────────
      const unsynced = await getUnsyncedMessages();
      if (unsynced && unsynced.length > 0) {
        console.log(`[SyncEngine] Found ${unsynced.length} unsynced offline messages. Syncing...`);
        const payload = unsynced.map(m => ({
          localId: m.localId || m.messageId,
          recipient: m.recipient,
          groupId: m.groupId,
          content: m.content || m.text,
          type: m.type || 'text',
          fileUrl: m.fileUrl,
          fileMetadata: m.fileMetadata,
          timestamp: m.timestamp || m.createdAt
        }));

        const response = await this.api.post('/messages/sync', { messages: payload });
        if (response.data && response.data.success) {
          const { synced } = response.data;
          for (const item of synced) {
            await markMessageSynced(item.localId, item.serverMsg._id);
            console.log(`[SyncEngine] Synced ${item.localId} -> Server ID ${item.serverMsg._id}`);
          }
        }
      }

      // ── 2. Sync Queue Items (Read Receipts & Custom Jobs) ──────────────────
      const queueItems = await getPendingSyncQueue();
      if (queueItems && queueItems.length > 0) {
        console.log(`[SyncEngine] Processing ${queueItems.length} persistent sync queue items...`);
        for (const item of queueItems) {
          try {
            if (item.type === 'READ_RECEIPT') {
              await this.api.post('/messages/read', { messageId: item.payload.messageId });
              await removeSyncItem(item.queueId);
            } else if (item.type === 'DELIVERY_ACK') {
              await this.api.post('/messages/deliver', { messageId: item.payload.messageId });
              await removeSyncItem(item.queueId);
            } else {
              await removeSyncItem(item.queueId);
            }
          } catch (itemErr) {
            await recordSyncFailure(item.queueId, itemErr.message);
          }
        }
      }

      this.lastSyncTime = new Date().toISOString();
      this.retryCount = 0;

      window.dispatchEvent(new CustomEvent('zapchat_sync_complete', {
        detail: { timestamp: this.lastSyncTime }
      }));

    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
      this.retryCount += 1;
    } finally {
      this.isSyncing = false;
    }
  }

  async getSyncStats() {
    const dbStats = await getLocalDBStats();
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      retryCount: this.retryCount,
      ...dbStats
    };
  }
}

export const syncService = new SyncService();
export default syncService;
