// ═══════════════════════════════════════════════════════════════════════
//  nearbyService.js — Peer-to-Peer Mesh Communication Service for Web/MERN
//  Simulates and implements P2P WebRTC / Local WiFi connectivity when offline.
// ═══════════════════════════════════════════════════════════════════════

import { saveMessage, savePeer, removePeer } from './localDB';

class NearbyService {
  constructor() {
    this.peers = new Map(); // peerId -> peer connection info
    this.listeners = new Set();
    this.isScanning = false;
    this.isAdvertising = false;
    this.localPeerId = `peer_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ── Registration for UI Updates ──────────────────────────────────────────
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners() {
    const peerList = Array.from(this.peers.values()).map(p => ({
      peerId: p.peerId,
      name: p.name,
      status: p.status,
      lastSeen: p.lastSeen,
    }));
    this.listeners.forEach(cb => cb(peerList));
  }

  // ── Mesh Activation ──────────────────────────────────────────────────────
  async startAdvertising(userName) {
    if (this.isAdvertising) return;
    this.isAdvertising = true;
    console.log(`[Mesh] Advertising started as: ${userName} (${this.localPeerId})`);

    // Simulate local WiFi / Bluetooth broadcast
    this.advertiserInterval = setInterval(() => {
      this._broadcastDiscoverySignal(userName);
    }, 3000);

    this._notifyListeners();
  }

  stopAdvertising() {
    if (!this.isAdvertising) return;
    this.isAdvertising = false;
    clearInterval(this.advertiserInterval);
    console.log('[Mesh] Advertising stopped');
    this._notifyListeners();
  }

  async startScanning() {
    if (this.isScanning) return;
    this.isScanning = true;
    console.log('[Mesh] Scanning for peers...');

    this.scannerInterval = setInterval(() => {
      this._discoverPeers();
    }, 4000);

    this._notifyListeners();
  }

  stopScanning() {
    if (!this.isScanning) return;
    this.isScanning = false;
    clearInterval(this.scannerInterval);
    console.log('[Mesh] Scanning stopped');
    this._notifyListeners();
  }

  // ── Simulated Local Network / WebRTC P2P Search ──────────────────────────
  _broadcastDiscoverySignal(userName) {
    // In a real mobile environment via Capacitor, this invokes native SDKs.
    // In Web, we simulate local broadcast/multicast channel over local subnet.
    const signal = {
      type: 'DISCOVERY_ADVERTISE',
      peerId: this.localPeerId,
      name: userName,
      timestamp: Date.now()
    };
    // Post to a BroadcastChannel (allows same-device tab communication or local simulation)
    const channel = new BroadcastChannel('zapchat_mesh_channel');
    channel.postMessage(signal);
    channel.close();
  }

  _discoverPeers() {
    // Clean up inactive peers (last seen > 10 seconds ago)
    const now = Date.now();
    let changed = false;
    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > 10000) {
        this.peers.delete(peerId);
        removePeer(peerId);
        changed = true;
        console.log(`[Mesh] Lost contact with peer: ${peer.name}`);
      }
    }
    if (changed) this._notifyListeners();
  }

  // Setup broadcast listeners for nearby tabs / local devices simulating local wifi
  initializeMeshListener(currentUser) {
    const channel = new BroadcastChannel('zapchat_mesh_channel');
    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || msg.peerId === this.localPeerId) return;

      if (msg.type === 'DISCOVERY_ADVERTISE') {
        const peerRecord = {
          peerId: msg.peerId,
          name: msg.name,
          status: 'connected',
          lastSeen: Date.now()
        };
        this.peers.set(msg.peerId, peerRecord);
        savePeer(peerRecord);
        this._notifyListeners();

        // Auto respond to advertiser to make link bi-directional
        const response = {
          type: 'DISCOVERY_RESPONSE',
          peerId: this.localPeerId,
          name: currentUser?.displayName || 'ZapChat User',
          timestamp: Date.now()
        };
        const respChannel = new BroadcastChannel('zapchat_mesh_channel');
        respChannel.postMessage(response);
        respChannel.close();
      }

      if (msg.type === 'DISCOVERY_RESPONSE') {
        const peerRecord = {
          peerId: msg.peerId,
          name: msg.name,
          status: 'connected',
          lastSeen: Date.now()
        };
        this.peers.set(msg.peerId, peerRecord);
        savePeer(peerRecord);
        this._notifyListeners();
      }

      if (msg.type === 'MESH_CHAT_MESSAGE') {
        const chatMsg = msg.message;
        // Save peer message locally
        saveMessage({
          ...chatMsg,
          source: 'mesh',
          is_synced: 0 // Will sync if recipient uploads or when internet returns
        });
        
        // Dispatch custom event to update chat UI instantly if open
        const eventDetail = { detail: chatMsg };
        window.dispatchEvent(new CustomEvent('zapchat_offline_msg', eventDetail));
      }
    };
  }

  // ── Send Offline Message over the Mesh Network ──────────────────────────
  async sendMeshMessage(recipientPeerId, messageContent, senderId, senderName) {
    const offlineMsg = {
      localId: `mesh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: senderId,
      senderName: senderName,
      recipient: recipientPeerId,
      content: messageContent,
      type: 'text',
      status: 'mesh_delivered',
      timestamp: new Date().toISOString()
    };

    // Save locally
    await saveMessage(offlineMsg);

    // Broadcast to the channel (delivering to matching peer)
    const channel = new BroadcastChannel('zapchat_mesh_channel');
    channel.postMessage({
      type: 'MESH_CHAT_MESSAGE',
      message: offlineMsg
    });
    channel.close();

    return offlineMsg;
  }
}

export const nearbyService = new NearbyService();
