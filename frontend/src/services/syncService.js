// ═══════════════════════════════════════════════════════════════════════
//  syncService.js — Background Synchronization Agent for Web/MERN
//  Synchronizes local IndexedDB offline messages to remote MongoDB backend.
// ═══════════════════════════════════════════════════════════════════════

import axios from 'axios';
import { getUnsyncedMessages, markMessageSynced } from './localDB';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.api = axios.create({
      baseURL: import.meta.env.VITE_BACKEND_URL
        ? `${import.meta.env.VITE_BACKEND_URL}/api`
        : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api`,
    });

    // Add interceptor to pick up the token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ── Start Network Status Monitoring ──────────────────────────────────────────
  startMonitoring() {
    window.addEventListener('online', () => {
      console.log('[Sync] Device is online. Initiating background sync...');
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('[Sync] Device went offline.');
    });

    // Run periodic sync check every 30 seconds
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.triggerSync();
      }
    }, 30000);

    // Run initial sync check
    if (navigator.onLine) {
      this.triggerSync();
    }
  }

  stopMonitoring() {
    clearInterval(this.syncInterval);
  }

  // ── Trigger Synchronisation ──────────────────────────────────────────────────
  async triggerSync() {
    if (this.isSyncing) return;
    const token = localStorage.getItem('token');
    if (!token) return; // Not logged in yet

    try {
      const unsynced = await getUnsyncedMessages();
      if (unsynced.length === 0) return;

      this.isSyncing = true;
      console.log(`[Sync] Found ${unsynced.length} unsynced messages. Syncing with backend...`);

      // Prepare request payload
      const payload = unsynced.map(m => ({
        localId: m.localId,
        recipient: m.recipient,
        groupId: m.groupId,
        content: m.content,
        type: m.type || 'text',
        fileUrl: m.fileUrl,
        fileMetadata: m.fileMetadata,
        timestamp: m.timestamp
      }));

      const response = await this.api.post('/messages/sync', { messages: payload });
      if (response.data && response.data.success) {
        const { synced } = response.data;
        
        for (const item of synced) {
          await markMessageSynced(item.localId, item.serverMsg._id);
          console.log(`[Sync] Synced message ${item.localId} -> Server ID ${item.serverMsg._id}`);
        }

        // Notify app shell that sync is complete
        window.dispatchEvent(new CustomEvent('zapchat_sync_complete', {
          detail: { count: synced.length }
        }));
      }
    } catch (error) {
      console.error('[Sync] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncService = new SyncService();
