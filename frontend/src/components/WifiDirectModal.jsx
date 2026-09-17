import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Send, AlertCircle, ShieldAlert, CheckCircle2, UserCheck, Smartphone, X, Zap, Radio } from 'lucide-react';
import { wifiDirectService } from '../services/wifiDirectService';
import { useAuth } from '../context/AuthContext';

const WifiDirectModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  
  const [status, setStatus] = useState('Disconnected'); // 'Searching', 'Device Found', 'Connecting', 'Connected', 'Disconnected'
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);

  const chatEndRef = useRef(null);

  const isNative = wifiDirectService.isNativeAvailable();

  useEffect(() => {
    if (!isOpen) return;

    // Check initial status and permissions
    if (isNative) {
      wifiDirectService.checkPermissions().then(res => {
        if (res && res.granted === false) {
          setHasPermission(false);
        }
      });

      wifiDirectService.getConnectionStatus().then(res => {
        if (res && res.status) {
          setStatus(res.status);
        }
      });
    }

    // Subscribe to Wi-Fi Direct events
    const peerSub = wifiDirectService.onPeersDiscovered((data) => {
      console.log('Peers discovered:', data);
      if (data && data.devices) {
        setDiscoveredDevices(data.devices);
        if (data.devices.length > 0 && status !== 'Connected' && status !== 'Connecting') {
          setStatus('Device Found');
        }
      }
    });

    const statusSub = wifiDirectService.onConnectionStatusChanged((data) => {
      console.log('Connection status changed:', data);
      if (data && data.status) {
        setStatus(data.status);
        if (data.status === 'Disconnected') {
          setConnectedDevice(null);
          setIsScanning(false);
        } else if (data.status === 'Connected') {
          setIsScanning(false);
        }
      }
    });

    const msgSub = wifiDirectService.onMessageReceived((msg) => {
      console.log('P2P Message received:', msg);
      if (!msg || !msg.messageId) return;

      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.messageId === msg.messageId)) return prev;
        return [...prev, {
          messageId: msg.messageId,
          text: msg.text,
          senderName: msg.senderName || 'Nearby ZapChat User',
          senderId: msg.senderId || 'remote',
          timestamp: msg.timestamp || Date.now(),
          isMe: false
        }];
      });
    });

    const errSub = wifiDirectService.onError((err) => {
      console.warn('P2P Error:', err);
      if (err && err.message) {
        setErrorMessage(err.message);
      }
    });

    return () => {
      if (peerSub && peerSub.remove) peerSub.remove();
      if (statusSub && statusSub.remove) statusSub.remove();
      if (msgSub && msgSub.remove) msgSub.remove();
      if (errSub && errSub.remove) errSub.remove();
    };
  }, [isOpen, isNative]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setErrorMessage('');
    const res = await wifiDirectService.requestPermissions();
    if (res && res.granted) {
      setHasPermission(true);
    } else {
      setErrorMessage('Permission denied. Please grant Location and Nearby Devices permissions in Android Settings.');
    }
  };

  const handleStartScan = async () => {
    setErrorMessage('');
    try {
      setIsScanning(true);
      setStatus('Searching');
      await wifiDirectService.startDiscovery();
    } catch (e) {
      setIsScanning(false);
      setStatus('Disconnected');
      setErrorMessage(e.message || 'Failed to start Wi-Fi Direct scanning.');
    }
  };

  const handleStopScan = async () => {
    try {
      setIsScanning(false);
      await wifiDirectService.stopDiscovery();
      if (status === 'Searching') {
        setStatus(discoveredDevices.length > 0 ? 'Device Found' : 'Disconnected');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleConnect = async (device) => {
    setErrorMessage('');
    try {
      setStatus('Connecting');
      setConnectedDevice(device);
      await wifiDirectService.connect(device.deviceAddress);
    } catch (e) {
      setStatus('Disconnected');
      setConnectedDevice(null);
      setErrorMessage(e.message || 'Failed to connect to device.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await wifiDirectService.disconnect();
      setStatus('Disconnected');
      setConnectedDevice(null);
      setIsScanning(false);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text || !text.trim()) return;

    setErrorMessage('');
    const msgId = `p2p_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const newMsg = {
      messageId: msgId,
      text: text.trim(),
      senderName: user?.name || user?.username || 'ZapChat User',
      senderId: user?._id || 'local_user',
      timestamp: Date.now(),
      isMe: true
    };

    // Add optimistically to UI
    setMessages(prev => [...prev, newMsg]);
    if (!textToSend) setInputText('');

    try {
      await wifiDirectService.sendMessage({
        text: newMsg.text,
        messageId: newMsg.messageId,
        senderName: newMsg.senderName,
        senderId: newMsg.senderId
      });
    } catch (e) {
      setErrorMessage(`Failed to send P2P message: ${e.message}`);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'Searching':
        return (
          <span className="flex items-[#00e676] bg-[#00e676]/10 px-3 py-1 rounded-full text-xs font-semibold items-center gap-1.5 animate-pulse">
            <Radio className="w-3.5 h-3.5 animate-spin" /> Searching Nearby Devices...
          </span>
        );
      case 'Device Found':
        return (
          <span className="flex text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full text-xs font-semibold items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> Discovered Devices Found
          </span>
        );
      case 'Connecting':
        return (
          <span className="flex text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full text-xs font-semibold items-center gap-1.5 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting...
          </span>
        );
      case 'Connected':
        return (
          <span className="flex text-[#00e676] bg-[#00e676]/15 border border-[#00e676]/30 px-3 py-1 rounded-full text-xs font-bold items-center gap-1.5 shadow-[0_0_12px_rgba(0,230,118,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected (Offline P2P)
          </span>
        );
      default:
        return (
          <span className="flex text-gray-400 bg-gray-800 px-3 py-1 rounded-full text-xs font-medium items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5" /> Disconnected
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center transition-all duration-300">
      <div className="w-full max-w-lg bg-[#111b21] border-t border-emerald-500/30 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] h-[92vh] overflow-hidden text-white animate-in slide-in-from-bottom duration-300">
        
        {/* Top Handle bar */}
        <div className="w-full flex justify-center py-2 bg-[#111b21]">
          <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between bg-[#111b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                Offline Wi-Fi Direct Chat
              </h2>
              <p className="text-xs text-emerald-400 font-medium">Real P2P • No Internet Required</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-2.5 bg-[#182229] border-b border-gray-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Status:</span>
            {getStatusBadge()}
          </div>
          {status === 'Connected' && (
            <button
              onClick={handleDisconnect}
              className="text-xs text-red-400 hover:text-red-300 font-semibold underline transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Non-native environment alert */}
        {!isNative && (
          <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">Web Browser Environment Detected</p>
              <p className="mt-0.5 text-amber-300/90">
                Wi-Fi Direct P2P uses native Android Wi-Fi APIs (`WifiP2pManager`). To test real offline hardware P2P between two physical phones, build and install the ZapChat Android APK.
              </p>
            </div>
          </div>
        )}

        {/* Error message alert */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start justify-between gap-2 text-red-300 text-xs">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Permission Request Prompt */}
        {!hasPermission && (
          <div className="mx-4 mt-3 p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex flex-col items-center text-center gap-2">
            <Wifi className="w-8 h-8 text-emerald-400 animate-bounce" />
            <h3 className="text-sm font-bold text-emerald-200">Android Permissions Required</h3>
            <p className="text-xs text-gray-300 max-w-xs">
              Wi-Fi Direct requires Nearby Devices and Location permissions to discover and connect to nearby ZapChat devices without internet.
            </p>
            <button
              onClick={handleRequestPermission}
              className="mt-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              Grant Permissions
            </button>
          </div>
        )}

        {/* MAIN BODY: Switch between Device Discovery & Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

          {status !== 'Connected' ? (
            /* DISCOVERY VIEW */
            <div className="flex flex-col gap-4 flex-1">
              
              {/* Scan Control Header */}
              <div className="flex items-center justify-between bg-[#1f2c34] p-3.5 rounded-2xl border border-gray-800">
                <div>
                  <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" /> Discover Nearby Devices
                  </h3>
                  <p className="text-xs text-gray-400">Make sure Wi-Fi is enabled on both phones</p>
                </div>
                {isScanning ? (
                  <button
                    onClick={handleStopScan}
                    className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white font-semibold text-xs rounded-xl transition-all shadow"
                  >
                    Stop Scan
                  </button>
                ) : (
                  <button
                    onClick={handleStartScan}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Start Scan
                  </button>
                )}
              </div>

              {/* Device List */}
              <div className="flex-1 flex flex-col">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Discovered Devices ({discoveredDevices.length})
                </h4>

                {discoveredDevices.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-gray-800 rounded-2xl text-center">
                    <Smartphone className="w-12 h-12 text-gray-600 mb-2 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-gray-300">No ZapChat devices found nearby</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      Tap "Start Scan" above. On Phone B, open this Offline Chat screen as well.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {discoveredDevices.map((dev, idx) => (
                      <div
                        key={dev.deviceAddress || idx}
                        className="flex items-center justify-between p-3.5 bg-[#1f2c34] hover:bg-[#202c33] border border-gray-800 rounded-2xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold text-gray-100">{dev.deviceName}</h5>
                            <p className="text-[11px] text-gray-400 font-mono">{dev.deviceAddress || 'Wi-Fi Direct P2P'}</p>
                            <span className="text-[10px] text-emerald-400 font-medium">Status: {dev.statusText || 'Available'}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleConnect(dev)}
                          disabled={status === 'Connecting'}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow"
                        >
                          {status === 'Connecting' && connectedDevice?.deviceAddress === dev.deviceAddress ? 'Connecting...' : 'Connect'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* CHAT MESSAGES STREAM VIEW */
            <div className="flex-1 flex flex-col gap-3 min-h-0">

              {/* Connected Banner */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 px-3 py-2 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <Wifi className="w-4 h-4 text-[#00e676]" />
                  <span>Local Wi-Fi Direct Channel Active</span>
                </div>
                <span className="text-[10px] text-gray-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  No Internet Required
                </span>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <Zap className="w-10 h-10 text-emerald-500/50 mb-2" />
                    <p className="text-sm font-semibold text-gray-300">Wi-Fi Direct Connection Established!</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Type a message below or tap quick buttons ("Hello", "Hi") to test offline P2P chat.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={msg.messageId || i}
                      className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
                          msg.isMe
                            ? 'bg-emerald-700 text-white rounded-br-none'
                            : 'bg-[#202c33] text-gray-100 rounded-bl-none border border-gray-700/60'
                        }`}
                      >
                        {!msg.isMe && (
                          <span className="block text-[11px] font-semibold text-emerald-400 mb-0.5">
                            {msg.senderName}
                          </span>
                        )}
                        <p className="break-words leading-relaxed">{msg.text}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="bg-black/30 px-1 rounded text-[9px]">Offline P2P</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Test Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
                <span className="text-[10px] text-gray-400 shrink-0 font-medium">Quick Send:</span>
                {['Hello 👋', 'Hi 😃', 'Testing P2P Offline Chat ⚡'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleSendMessage(preset)}
                    className="px-2.5 py-1 bg-[#1f2c34] hover:bg-emerald-900/40 border border-gray-700/60 text-gray-200 text-[11px] font-medium rounded-full shrink-0 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 bg-[#1f2c34] p-2 rounded-2xl border border-gray-800"
              >
                <input
                  type="text"
                  placeholder="Type offline P2P message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 placeholder-gray-500 px-3"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all shadow-md shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default WifiDirectModal;
