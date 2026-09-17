import { Capacitor } from '@capacitor/core';

// Access the WifiDirect plugin registered via MainActivity.java
const WifiDirect = Capacitor.Plugins.WifiDirect;

class WifiDirectService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform() && !!WifiDirect;
    this.listeners = new Map();
  }

  isNativeAvailable() {
    return this.isNative;
  }

  async checkPermissions() {
    if (!this.isNative) {
      return { granted: false, reason: 'Web browser environment — Wi-Fi Direct requires a physical Android phone with native APK built.' };
    }
    try {
      return await WifiDirect.checkPermissions();
    } catch (e) {
      console.warn('checkPermissions error:', e);
      return { granted: false, error: e.message };
    }
  }

  async requestPermissions() {
    if (!this.isNative) {
      return { granted: false };
    }
    try {
      return await WifiDirect.requestPermissions();
    } catch (e) {
      console.warn('requestPermissions error:', e);
      return { granted: false, error: e.message };
    }
  }

  async startDiscovery() {
    if (!this.isNative) {
      throw new Error('Wi-Fi Direct P2P offline messaging is supported on Android native devices only.');
    }
    return await WifiDirect.startDiscovery();
  }

  async stopDiscovery() {
    if (!this.isNative) return;
    return await WifiDirect.stopDiscovery();
  }

  async connect(deviceAddress) {
    if (!this.isNative) {
      throw new Error('Wi-Fi Direct is not available in browser mode.');
    }
    return await WifiDirect.connect({ deviceAddress });
  }

  async disconnect() {
    if (!this.isNative) return;
    return await WifiDirect.disconnect();
  }

  async sendMessage(msgData) {
    if (!this.isNative) {
      throw new Error('Wi-Fi Direct is not available in browser mode.');
    }
    return await WifiDirect.sendMessage(msgData);
  }

  async getConnectionStatus() {
    if (!this.isNative) {
      return { status: 'Disconnected', isConnected: false };
    }
    return await WifiDirect.getConnectionStatus();
  }

  onPeersDiscovered(callback) {
    if (!this.isNative) return { remove: () => {} };
    const handle = WifiDirect.addListener('onPeersDiscovered', (data) => callback(data));
    return handle;
  }

  onConnectionStatusChanged(callback) {
    if (!this.isNative) return { remove: () => {} };
    const handle = WifiDirect.addListener('onConnectionStatusChanged', (data) => callback(data));
    return handle;
  }

  onMessageReceived(callback) {
    if (!this.isNative) return { remove: () => {} };
    const handle = WifiDirect.addListener('onMessageReceived', (data) => callback(data));
    return handle;
  }

  onError(callback) {
    if (!this.isNative) return { remove: () => {} };
    const handle = WifiDirect.addListener('onError', (data) => callback(data));
    return handle;
  }
}

export const wifiDirectService = new WifiDirectService();
export default wifiDirectService;
