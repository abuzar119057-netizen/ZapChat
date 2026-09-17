import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Send, AlertCircle, ShieldAlert, CheckCircle2, Smartphone, X, Zap, Radio, Paperclip, Image as ImageIcon, Video as VideoIcon, FileText, Download, Play, Check, FileCheck, Eye } from 'lucide-react';
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
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // File Inputs Refs
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const isNative = wifiDirectService.isNativeAvailable();

  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (!isOpen) return;

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

    // Peer discovery subscription
    const peerSub = wifiDirectService.onPeersDiscovered((data) => {
      if (data && data.devices) {
        setDiscoveredDevices(data.devices);
        if (data.devices.length > 0 && status !== 'Connected' && status !== 'Connecting') {
          setStatus('Device Found');
        }
      }
    });

    // Connection status subscription
    const statusSub = wifiDirectService.onConnectionStatusChanged((data) => {
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

    // Incoming text message subscription
    const msgSub = wifiDirectService.onMessageReceived((msg) => {
      if (!msg || !msg.messageId) return;

      setMessages(prev => {
        if (prev.some(m => m.messageId === msg.messageId)) return prev;
        return [...prev, {
          messageId: msg.messageId,
          text: msg.text,
          senderName: msg.senderName || 'Nearby ZapChat User',
          senderId: msg.senderId || 'remote',
          timestamp: msg.timestamp || Date.now(),
          isMe: false,
          msgType: 'TEXT'
        }];
      });
    });

    // File transfer progress subscription
    const progressSub = wifiDirectService.onFileTransferProgress((prog) => {
      setMessages(prev => {
        return prev.map(m => {
          if (m.transferId === prog.transferId) {
            return {
              ...m,
              percent: prog.percent,
              transferredBytes: prog.transferredBytes,
              totalBytes: prog.totalBytes,
              speed: prog.speed,
              isUploading: prog.direction === 'upload' && prog.percent < 100,
              isDownloading: prog.direction === 'download' && prog.percent < 100
            };
          }
          return m;
        });
      });
    });

    // File received subscription
    const fileReceivedSub = wifiDirectService.onFileReceived((fileData) => {
      setMessages(prev => {
        if (prev.some(m => m.transferId === fileData.transferId)) return prev;

        const isImg = fileData.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileData.filename);
        const isVid = fileData.mimeType?.startsWith('video/') || /\.(mp4|mkv|3gp|webm|avi)$/i.test(fileData.filename);

        return [...prev, {
          messageId: `file_${fileData.transferId}`,
          transferId: fileData.transferId,
          filename: fileData.filename,
          mimeType: fileData.mimeType,
          fileSize: fileData.fileSize,
          filePath: fileData.filePath,
          fileUrl: fileData.fileUrl,
          senderName: 'Nearby ZapChat User',
          timestamp: Date.now(),
          isMe: false,
          msgType: isImg ? 'IMAGE' : (isVid ? 'VIDEO' : 'DOCUMENT'),
          percent: 100
        }];
      });
    });

    const errSub = wifiDirectService.onError((err) => {
      if (err && err.message) {
        setErrorMessage(err.message);
      }
    });

    return () => {
      if (peerSub && peerSub.remove) peerSub.remove();
      if (statusSub && statusSub.remove) statusSub.remove();
      if (msgSub && msgSub.remove) msgSub.remove();
      if (progressSub && progressSub.remove) progressSub.remove();
      if (fileReceivedSub && fileReceivedSub.remove) fileReceivedSub.remove();
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
      isMe: true,
      msgType: 'TEXT'
    };

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
      setErrorMessage(`Failed to send message: ${e.message}`);
    }
  };

  const handleFileSelect = async (e, category) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachMenu(false);
    setErrorMessage('');

    const transferId = `ft_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const isImg = category === 'image' || file.type.startsWith('image/');
    const isVid = category === 'video' || file.type.startsWith('video/');
    const msgType = isImg ? 'IMAGE' : (isVid ? 'VIDEO' : 'DOCUMENT');

    const fileUrl = URL.createObjectURL(file);

    const fileMsg = {
      messageId: `file_${transferId}`,
      transferId,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      fileUrl,
      senderName: user?.name || 'ZapChat User',
      timestamp: Date.now(),
      isMe: true,
      msgType,
      percent: 0,
      isUploading: true,
      speed: '0 KB/s'
    };

    setMessages(prev => [...prev, fileMsg]);

    try {
      // In native Android environment, pass file path or web object
      const pathToPass = window.Ionic?.WebView?.convertFileSrc?.(file.name) || fileUrl;
      await wifiDirectService.sendFile({
        filePath: pathToPass,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        transferId,
        fileSize: file.size,
        senderName: user?.name || 'ZapChat User'
      });
    } catch (err) {
      console.warn('File send initiated / progress active:', err);
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
        
        {/* Hidden File Inputs */}
        <input 
          type="file" 
          ref={imageInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => handleFileSelect(e, 'image')} 
        />
        <input 
          type="file" 
          ref={videoInputRef} 
          accept="video/*" 
          className="hidden" 
          onChange={(e) => handleFileSelect(e, 'video')} 
        />
        <input 
          type="file" 
          ref={docInputRef} 
          accept="*/*" 
          className="hidden" 
          onChange={(e) => handleFileSelect(e, 'doc')} 
        />

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
                Offline P2P File & Text Chat
              </h2>
              <p className="text-xs text-emerald-400 font-medium">Wi-Fi Direct • No Internet / Server Needed</p>
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

        {/* Non-native alert */}
        {!isNative && (
          <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">Web Browser Mode</p>
              <p className="mt-0.5 text-amber-300/90">
                To send real offline files (Images, Videos, PDFs) over Wi-Fi Direct hardware without internet, run the ZapChat APK on two physical Android phones.
              </p>
            </div>
          </div>
        )}

        {/* Error alert */}
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

        {/* Permission Prompt */}
        {!hasPermission && (
          <div className="mx-4 mt-3 p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex flex-col items-center text-center gap-2">
            <Wifi className="w-8 h-8 text-emerald-400 animate-bounce" />
            <h3 className="text-sm font-bold text-emerald-200">Android Permissions Required</h3>
            <p className="text-xs text-gray-300 max-w-xs">
              Nearby Devices, Location & Media permissions are required to scan devices and send files over Wi-Fi Direct.
            </p>
            <button
              onClick={handleRequestPermission}
              className="mt-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
            >
              Grant Permissions
            </button>
          </div>
        )}

        {/* MAIN BODY: Discovery vs Active Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative">

          {status !== 'Connected' ? (
            /* DISCOVERY VIEW */
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between bg-[#1f2c34] p-3.5 rounded-2xl border border-gray-800">
                <div>
                  <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" /> Discover Nearby Devices
                  </h3>
                  <p className="text-xs text-gray-400">Ensure Wi-Fi is enabled on both phones</p>
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
            <div className="flex-1 flex flex-col gap-3 min-h-0 relative">

              {/* Connected Banner */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 px-3 py-2 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <Wifi className="w-4 h-4 text-[#00e676]" />
                  <span>Wi-Fi Direct Channel Active</span>
                </div>
                <span className="text-[10px] text-gray-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Files & Messages • No Internet
                </span>
              </div>

              {/* Message History List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <Zap className="w-10 h-10 text-emerald-500/50 mb-2" />
                    <p className="text-sm font-semibold text-gray-300">P2P Channel Connected!</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      Send text messages or tap the paperclip icon (📎) below to send Images, Videos, or PDF documents offline!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={msg.messageId || i}
                      className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
                          msg.isMe
                            ? 'bg-emerald-700 text-white rounded-br-none'
                            : 'bg-[#202c33] text-gray-100 rounded-bl-none border border-gray-700/60'
                        }`}
                      >
                        {!msg.isMe && (
                          <span className="block text-[11px] font-semibold text-emerald-400 mb-1">
                            {msg.senderName}
                          </span>
                        )}

                        {/* RENDER TEXT MESSAGE */}
                        {msg.msgType === 'TEXT' && (
                          <p className="break-words leading-relaxed">{msg.text}</p>
                        )}

                        {/* RENDER IMAGE MESSAGE */}
                        {msg.msgType === 'IMAGE' && (
                          <div className="flex flex-col gap-1.5">
                            {msg.fileUrl ? (
                              <img 
                                src={msg.fileUrl} 
                                alt={msg.filename} 
                                className="max-h-56 max-w-full rounded-xl object-cover border border-black/20"
                              />
                            ) : (
                              <div className="w-48 h-32 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[11px] text-gray-200">
                              <span className="truncate max-w-[140px] font-medium">{msg.filename}</span>
                              <span className="opacity-80">{formatBytes(msg.fileSize)}</span>
                            </div>
                          </div>
                        )}

                        {/* RENDER VIDEO MESSAGE */}
                        {msg.msgType === 'VIDEO' && (
                          <div className="flex flex-col gap-1.5">
                            {msg.fileUrl ? (
                              <video 
                                src={msg.fileUrl} 
                                controls 
                                className="max-h-56 max-w-full rounded-xl object-cover border border-black/20"
                              />
                            ) : (
                              <div className="w-48 h-32 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                                <VideoIcon className="w-8 h-8" />
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[11px] text-gray-200">
                              <span className="truncate max-w-[140px] font-medium">{msg.filename}</span>
                              <span className="opacity-80">{formatBytes(msg.fileSize)}</span>
                            </div>
                          </div>
                        )}

                        {/* RENDER DOCUMENT/FILE MESSAGE */}
                        {msg.msgType === 'DOCUMENT' && (
                          <div className="flex items-center gap-3 p-2.5 bg-black/20 rounded-xl border border-white/10">
                            <div className="w-10 h-10 rounded-lg bg-emerald-900/60 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate text-gray-100">{msg.filename}</p>
                              <p className="text-[10px] opacity-80">{formatBytes(msg.fileSize)}</p>
                            </div>
                            {msg.filePath && (
                              <a
                                href={msg.fileUrl}
                                download={msg.filename}
                                target="_blank"
                                rel="noreferrer"
                                className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* TRANSFER PROGRESS BAR */}
                        {(msg.isUploading || msg.isDownloading || (msg.percent !== undefined && msg.percent < 100)) && (
                          <div className="mt-2 w-full bg-black/30 p-2 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between text-[10px] mb-1 text-gray-200">
                              <span>{msg.isUploading ? 'Uploading P2P...' : 'Downloading P2P...'}</span>
                              <span>{msg.percent || 0}% ({msg.speed || '0 KB/s'})</span>
                            </div>
                            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-400 h-full transition-all duration-200"
                                style={{ width: `${msg.percent || 0}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* TIMESTAMP & BADGE */}
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="bg-black/30 px-1 rounded text-[9px] font-mono">Offline P2P</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Attachment Popover Menu */}
              {showAttachMenu && (
                <div className="absolute bottom-16 left-4 bg-[#1f2c34] border border-gray-700/80 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-emerald-950/50 text-gray-100 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span>📷 Send Image</span>
                  </button>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-teal-950/50 text-gray-100 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center">
                      <VideoIcon className="w-4 h-4" />
                    </div>
                    <span>🎥 Send Video</span>
                  </button>
                  <button
                    onClick={() => docInputRef.current?.click()}
                    className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-cyan-950/50 text-gray-100 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span>📄 Send Document / File (PDF, DOCX, ZIP)</span>
                  </button>
                </div>
              )}

              {/* Message & Attachment Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 bg-[#1f2c34] p-2 rounded-2xl border border-gray-800"
              >
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    showAttachMenu ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-emerald-400 hover:bg-gray-800'
                  }`}
                  title="Attach offline file (Image, Video, PDF)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Type offline message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 placeholder-gray-500 px-2"
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
