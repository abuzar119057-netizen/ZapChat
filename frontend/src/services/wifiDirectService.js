import { Capacitor } from '@capacitor/core';

// Access the WifiDirect plugin registered via MainActivity.java
const WifiDirect = Capacitor.Plugins.WifiDirect;

class WifiDirectService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform() && !!WifiDirect;
  }

  isNativeAvailable() {
    return this.isNative;
  }

  async checkPermissions() {
    if (!this.isNative) {
      return { granted: false, reason: 'Web browser mode — Wi-Fi Direct requires a physical Android phone.' };
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
      throw new Error('Wi-Fi Direct P2P is supported on Android native devices only.');
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

  async sendFile(fileData) {
    if (!this.isNative) {
      throw new Error('Wi-Fi Direct file transfer is supported on native Android devices only.');
    }
    return await WifiDirect.sendFile(fileData);
  }

  // ── VOICE & VIDEO CALLING METHODS ──

  async startVoiceCall(callData) {
    if (!this.isNative) {
      throw new Error('Offline voice calling requires native Android APK.');
    }
    return await WifiDirect.startVoiceCall(callData);
  }

  async startVideoCall(callData) {
    if (!this.isNative) {
      throw new Error('Offline video calling requires native Android APK.');
    }
    return await WifiDirect.startVideoCall(callData);
  }

  async acceptVoiceCall(callData) {
    if (!this.isNative) return;
    return await WifiDirect.acceptVoiceCall(callData);
  }

  async rejectVoiceCall(callData) {
    if (!this.isNative) return;
    return await WifiDirect.rejectVoiceCall(callData);
  }

  async endVoiceCall(callData) {
    if (!this.isNative) return;
    return await WifiDirect.endVoiceCall(callData);
  }

  async switchCamera() {
    if (!this.isNative) return;
    return await WifiDirect.switchCamera();
  }

  async setCameraEnabled(enabled) {
    if (!this.isNative) return;
    return await WifiDirect.setCameraEnabled({ enabled });
  }

  async setMute(muted) {
    if (!this.isNative) return;
    return await WifiDirect.setMute({ muted });
  }

  async setSpeaker(speakerOn) {
    if (!this.isNative) return;
    return await WifiDirect.setSpeaker({ speakerOn });
  }

  async getConnectionStatus() {
    if (!this.isNative) {
      return { status: 'Disconnected', isConnected: false, isCallActive: false, isVideoCall: false };
    }
    return await WifiDirect.getConnectionStatus();
  }

  // ── EVENT LISTENERS ──

  onPeersDiscovered(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onPeersDiscovered', (data) => callback(data));
  }

  onConnectionStatusChanged(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onConnectionStatusChanged', (data) => callback(data));
  }

  onMessageReceived(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onMessageReceived', (data) => callback(data));
  }

  onFileTransferProgress(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onFileTransferProgress', (data) => callback(data));
  }

  onFileReceived(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onFileReceived', (data) => callback(data));
  }

  onCallRequest(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onCallRequest', (data) => callback(data));
  }

  onCallAccepted(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onCallAccepted', (data) => callback(data));
  }

  onCallRejected(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onCallRejected', (data) => callback(data));
  }

  onCallEnded(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onCallEnded', (data) => callback(data));
  }

  onRemoteVideoFrame(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onRemoteVideoFrame', (data) => callback(data));
  }

  onLocalVideoFrame(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onLocalVideoFrame', (data) => callback(data));
  }

  onError(callback) {
    if (!this.isNative) return { remove: () => {} };
    return WifiDirect.addListener('onError', (data) => callback(data));
  }
}

export const wifiDirectService = new WifiDirectService();
export default wifiDirectService;
