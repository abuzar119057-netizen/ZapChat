import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Send, AlertCircle, ShieldAlert, CheckCircle2, Smartphone, X, Zap, Radio, Paperclip, Image as ImageIcon, Video as VideoIcon, FileText, Download, Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX, Camera, CameraOff, SwitchCamera, Network, GitCommit, Layers, Terminal, Activity } from 'lucide-react';
import { wifiDirectService } from '../services/wifiDirectService';
import { useAuth } from '../context/AuthContext';

const WifiDirectModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  
  const [status, setStatus] = useState('Disconnected');
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMeshDiagnostics, setShowMeshDiagnostics] = useState(false);

  // Mesh Network Diagnostic States
  const [localDeviceId, setLocalDeviceId] = useState('loading...');
  const [meshDiagnostics, setMeshDiagnostics] = useState({
    deviceId: '',
    connectedPeers: [],
    routeTable: [],
    queuedMessagesCount: 0,
    processedMessagesCount: 0
  });

  // Real-time Voice & Video Call States
  const [callState, setCallState] = useState('idle');
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [activeCallId, setActiveCallId] = useState(null);
  const [callerName, setCallerName] = useState('ZapChat User');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [remoteVideoFrame, setRemoteVideoFrame] = useState(null);
  const [localVideoFrame, setLocalVideoFrame] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  // File Inputs Refs
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const timerRef = useRef(null);
  const diagIntervalRef = useRef(null);

  const isNative = wifiDirectService.isNativeAvailable();

  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

      wifiDirectService.getLocalDeviceId().then(res => {
        if (res && res.deviceId) {
          setLocalDeviceId(res.deviceId);
        }
      });
    }

    // Refresh Mesh Diagnostic data periodically
    diagIntervalRef.current = setInterval(() => {
      wifiDirectService.getMeshDiagnostics().then(diag => {
        if (diag) setMeshDiagnostics(diag);
      });
    }, 2000);

    const peerSub = wifiDirectService.onPeersDiscovered((data) => {
      if (data && data.devices) {
        setDiscoveredDevices(data.devices);
        if (data.devices.length > 0 && status !== 'Connected' && status !== 'Connecting') {
          setStatus('Device Found');
        }
      }
    });

    const statusSub = wifiDirectService.onConnectionStatusChanged((data) => {
      if (data && data.status) {
        setStatus(data.status);
        if (data.status === 'Disconnected') {
          setConnectedDevice(null);
          setIsScanning(false);
          setCallState('idle');
          clearInterval(timerRef.current);
        } else if (data.status === 'Connected') {
          setIsScanning(false);
        }
      }
    });

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
          msgType: 'TEXT',
          hops: msg.hops || 1,
          isMeshRelayed: !!msg.isMeshRelayed
        }];
      });
    });

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

    const meshRelaySub = wifiDirectService.onMeshPacketRelayed((relayData) => {
      console.log('Mesh Packet Relayed:', relayData);
      wifiDirectService.getMeshDiagnostics().then(diag => {
        if (diag) setMeshDiagnostics(diag);
      });
    });

    // Voice & Video Call Event Listeners
    const callReqSub = wifiDirectService.onCallRequest((data) => {
      setActiveCallId(data.callId);
      setCallerName(data.callerName || 'Nearby ZapChat User');
      setIsVideoCall(!!data.isVideo);
      setCallState('incoming');
    });

    const callAccSub = wifiDirectService.onCallAccepted(() => {
      setCallState('connected');
      setCallDuration(0);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    });

    const callRejSub = wifiDirectService.onCallRejected(() => {
      setCallState('ended');
      clearInterval(timerRef.current);
      setTimeout(() => setCallState('idle'), 2000);
    });

    const callEndSub = wifiDirectService.onCallEnded(() => {
      setCallState('ended');
      clearInterval(timerRef.current);
      setRemoteVideoFrame(null);
      setLocalVideoFrame(null);
      setTimeout(() => setCallState('idle'), 2000);
    });

    const remoteVideoSub = wifiDirectService.onRemoteVideoFrame((data) => {
      if (data && data.frameData) setRemoteVideoFrame(data.frameData);
    });

    const localVideoSub = wifiDirectService.onLocalVideoFrame((data) => {
      if (data && data.frameData) setLocalVideoFrame(data.frameData);
    });

    const errSub = wifiDirectService.onError((err) => {
      if (err && err.message) setErrorMessage(err.message);
    });

    return () => {
      if (peerSub && peerSub.remove) peerSub.remove();
      if (statusSub && statusSub.remove) statusSub.remove();
      if (msgSub && msgSub.remove) msgSub.remove();
      if (progressSub && progressSub.remove) progressSub.remove();
      if (fileReceivedSub && fileReceivedSub.remove) fileReceivedSub.remove();
      if (meshRelaySub && meshRelaySub.remove) meshRelaySub.remove();
      if (callReqSub && callReqSub.remove) callReqSub.remove();
      if (callAccSub && callAccSub.remove) callAccSub.remove();
      if (callRejSub && callRejSub.remove) callRejSub.remove();
      if (callEndSub && callEndSub.remove) callEndSub.remove();
      if (remoteVideoSub && remoteVideoSub.remove) remoteVideoSub.remove();
      if (localVideoSub && localVideoSub.remove) localVideoSub.remove();
      if (errSub && errSub.remove) errSub.remove();
      clearInterval(timerRef.current);
      clearInterval(diagIntervalRef.current);
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
      setErrorMessage('Permission denied. Please grant Location, Nearby Devices, Camera and Microphone permissions in Android Settings.');
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
      setCallState('idle');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text || !text.trim()) return;

    setErrorMessage('');
    const msgId = `mesh_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const newMsg = {
      messageId: msgId,
      text: text.trim(),
      senderName: user?.name || user?.username || 'ZapChat User',
      senderId: localDeviceId,
      timestamp: Date.now(),
      isMe: true,
      msgType: 'TEXT',
      hops: 1
    };

    setMessages(prev => [...prev, newMsg]);
    if (!textToSend) setInputText('');

    try {
      await wifiDirectService.sendMeshMessage({
        text: newMsg.text,
        destinationId: 'broadcast',
        senderName: newMsg.senderName
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
      console.warn('File send initiated:', err);
    }
  };

  const handleStartVoiceCall = async () => {
    setErrorMessage('');
    try {
      setIsVideoCall(false);
      setCallState('calling');
      setCallerName(connectedDevice?.deviceName || 'Nearby ZapChat User');
      const res = await wifiDirectService.startVoiceCall({
        callerName: user?.name || user?.username || 'ZapChat User',
        callerId: localDeviceId
      });
      if (res && res.callId) setActiveCallId(res.callId);
    } catch (e) {
      setCallState('idle');
      setErrorMessage(e.message || 'Failed to initiate voice call.');
    }
  };

  const handleStartVideoCall = async () => {
    setErrorMessage('');
    try {
      setIsVideoCall(true);
      setCallState('calling');
      setCallerName(connectedDevice?.deviceName || 'Nearby ZapChat User');
      const res = await wifiDirectService.startVideoCall({
        callerName: user?.name || user?.username || 'ZapChat User',
        callerId: localDeviceId
      });
      if (res && res.callId) setActiveCallId(res.callId);
    } catch (e) {
      setCallState('idle');
      setErrorMessage(e.message || 'Failed to initiate video call.');
    }
  };

  const handleAcceptCall = async () => {
    try {
      setCallState('connected');
      setCallDuration(0);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
      await wifiDirectService.acceptVoiceCall({ callId: activeCallId });
    } catch (e) {
      setCallState('idle');
      setErrorMessage(e.message || 'Failed to accept call.');
    }
  };

  const handleRejectCall = async () => {
    try {
      setCallState('idle');
      clearInterval(timerRef.current);
      await wifiDirectService.rejectVoiceCall({ callId: activeCallId });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleEndCall = async () => {
    try {
      setCallState('ended');
      clearInterval(timerRef.current);
      setRemoteVideoFrame(null);
      setLocalVideoFrame(null);
      await wifiDirectService.endVoiceCall({ callId: activeCallId });
      setTimeout(() => setCallState('idle'), 1500);
    } catch (e) {
      setCallState('idle');
    }
  };

  const handleSwitchCamera = async () => await wifiDirectService.switchCamera();
  const handleToggleCamera = async () => {
    const newEnabled = !isCameraEnabled;
    setIsCameraEnabled(newEnabled);
    await wifiDirectService.setCameraEnabled(newEnabled);
  };
  const handleToggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await wifiDirectService.setMute(newMuted);
  };
  const handleToggleSpeaker = async () => {
    const newSpeaker = !isSpeakerOn;
    setIsSpeakerOn(newSpeaker);
    await wifiDirectService.setSpeaker(newSpeaker);
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
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected (Multi-Hop Mesh ON)
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
      <div className="w-full max-w-lg bg-[#111b21] border-t border-emerald-500/30 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] h-[92vh] overflow-hidden text-white animate-in slide-in-from-bottom duration-300 relative">
        
        {/* Hidden File Inputs */}
        <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />
        <input type="file" ref={docInputRef} accept="*/*" className="hidden" onChange={(e) => handleFileSelect(e, 'doc')} />

        {/* Top Handle bar */}
        <div className="w-full flex justify-center py-2 bg-[#111b21]">
          <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between bg-[#111b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                Offline P2P Mesh (A → B → C)
              </h2>
              <p className="text-xs text-emerald-400 font-medium">Multi-Hop Relay • No Internet Needed</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowMeshDiagnostics(!showMeshDiagnostics)}
              className={`p-2 rounded-full transition-all ${showMeshDiagnostics ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              title="Developer Mesh Diagnostics & Route Table"
            >
              <Terminal className="w-4 h-4" />
            </button>
            {status === 'Connected' && callState === 'idle' && (
              <>
                <button onClick={handleStartVoiceCall} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow" title="Voice Call">
                  <Phone className="w-4 h-4" />
                </button>
                <button onClick={handleStartVideoCall} className="p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow" title="Video Call">
                  <VideoIcon className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-2.5 bg-[#182229] border-b border-gray-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Status:</span>
            {getStatusBadge()}
          </div>
          {status === 'Connected' && (
            <button onClick={handleDisconnect} className="text-xs text-red-400 hover:text-red-300 font-semibold underline">
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
                Multi-Hop Mesh Routing (A → B → C) requires native Android APK running on 3 physical Android phones.
              </p>
            </div>
          </div>
        )}

        {/* DEVELOPER MESH DIAGNOSTIC OVERLAY PANEL */}
        {showMeshDiagnostics && (
          <div className="mx-4 mt-3 p-4 bg-[#0b141a] border border-emerald-500/40 rounded-2xl text-xs font-mono flex flex-col gap-2.5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4" /> Mesh Developer Diagnostics
              </span>
              <button onClick={() => setShowMeshDiagnostics(false)} className="text-gray-400 hover:text-gray-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-gray-300">
              <span>Local Device ID:</span>
              <span className="text-emerald-300 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">{localDeviceId}</span>
            </div>

            <div className="flex items-center justify-between text-gray-300">
              <span>Connected Direct Peers:</span>
              <span className="text-cyan-400">{meshDiagnostics.connectedPeers?.length || 0} Connected</span>
            </div>

            <div className="flex items-center justify-between text-gray-300">
              <span>Store-and-Forward Queue:</span>
              <span className="text-amber-400">{meshDiagnostics.queuedMessagesCount || 0} Queued</span>
            </div>

            {/* Route Table View */}
            <div className="mt-1">
              <span className="text-gray-400 block mb-1 font-sans text-[11px] font-semibold">Active Route Table:</span>
              {meshDiagnostics.routeTable && meshDiagnostics.routeTable.length > 0 ? (
                <div className="space-y-1">
                  {meshDiagnostics.routeTable.map((rt, idx) => (
                    <div key={idx} className="bg-gray-900 p-2 rounded border border-gray-800 flex items-center justify-between text-[11px]">
                      <span className="text-gray-200">Dest: {rt.destinationId}</span>
                      <span className="text-emerald-400">Next: {rt.nextHopId}</span>
                      <span className="text-cyan-300 font-bold">Hops: {rt.hops}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-[11px] italic">No active multi-hop routes cached yet.</p>
              )}
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
              Microphone, Camera, Nearby Devices & Location permissions are required to make real-time Wi-Fi Direct calls and relay mesh packets.
            </p>
            <button onClick={handleRequestPermission} className="mt-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md">
              Grant Permissions
            </button>
          </div>
        )}

        {/* VOICE & VIDEO CALL OVERLAY SCREEN */}
        {callState !== 'idle' && (
          <div className="absolute inset-0 z-40 bg-[#0b141a] flex flex-col items-center justify-between p-6 text-white animate-in fade-in zoom-in-95 duration-200">
            {isVideoCall && callState === 'connected' ? (
              <div className="relative w-full flex-1 rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-2xl flex items-center justify-center">
                {remoteVideoFrame ? (
                  <img src={remoteVideoFrame} alt="Remote Video" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <VideoIcon className="w-12 h-12 animate-pulse" />
                    <span className="text-xs">Receiving P2P Video Stream...</span>
                  </div>
                )}
                <div className="absolute bottom-4 right-4 w-28 h-36 bg-gray-900 border-2 border-emerald-500/60 rounded-xl overflow-hidden shadow-2xl">
                  {localVideoFrame && isCameraEnabled ? (
                    <img src={localVideoFrame} alt="Local Video" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900 text-[10px]">
                      <CameraOff className="w-5 h-5 mb-1" />
                      <span>Cam Off</span>
                    </div>
                  )}
                </div>
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#00e676] animate-ping" />
                  <span className="font-semibold text-emerald-300">{callerName}</span>
                  <span className="text-[10px] text-gray-400">• {formatCallDuration(callDuration)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 mt-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow-2xl ring-4 ring-emerald-500/30">
                    {callerName[0]?.toUpperCase() || 'Z'}
                  </div>
                  {callState === 'connected' && (
                    <span className="absolute bottom-0 right-0 w-6 h-6 bg-[#00e676] border-2 border-[#0b141a] rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                    </span>
                  )}
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-100">{callerName}</h3>
                  <p className="text-xs text-emerald-400 font-semibold mt-1">
                    {callState === 'calling' && (isVideoCall ? 'Calling Video P2P...' : 'Calling Voice P2P...')}
                    {callState === 'incoming' && (isVideoCall ? 'Incoming Video Call...' : 'Incoming Voice Call...')}
                    {callState === 'connected' && `Connected (${formatCallDuration(callDuration)})`}
                    {callState === 'ended' && 'Call Ended'}
                  </p>
                </div>
              </div>
            )}

            <div className="w-full flex items-center justify-center gap-4 my-4">
              {callState === 'incoming' ? (
                <>
                  <button onClick={handleRejectCall} className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg">
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <button onClick={handleAcceptCall} className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-lg animate-pulse">
                    {isVideoCall ? <VideoIcon className="w-7 h-7" /> : <PhoneCall className="w-7 h-7" />}
                  </button>
                </>
              ) : (
                <>
                  {callState === 'connected' && (
                    <>
                      {isVideoCall && (
                        <button onClick={handleSwitchCamera} className="w-12 h-12 rounded-full bg-gray-800 text-gray-200 flex items-center justify-center">
                          <SwitchCamera className="w-5 h-5" />
                        </button>
                      )}
                      {isVideoCall && (
                        <button onClick={handleToggleCamera} className={`w-12 h-12 rounded-full flex items-center justify-center ${!isCameraEnabled ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-200'}`}>
                          {!isCameraEnabled ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                        </button>
                      )}
                      <button onClick={handleToggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-200'}`}>
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                      <button onClick={handleToggleSpeaker} className={`w-12 h-12 rounded-full flex items-center justify-center ${isSpeakerOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-200'}`}>
                        {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      </button>
                    </>
                  )}
                  <button onClick={handleEndCall} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-xl">
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
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
                  <p className="text-xs text-gray-400">Ensure Wi-Fi is enabled on all phones</p>
                </div>
                {isScanning ? (
                  <button onClick={handleStopScan} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white font-semibold text-xs rounded-xl shadow">
                    Stop Scan
                  </button>
                ) : (
                  <button onClick={handleStartScan} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow">
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
                      Tap "Start Scan" above. On Phone B & C, open this Offline Mesh Chat screen as well.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {discoveredDevices.map((dev, idx) => (
                      <div key={dev.deviceAddress || idx} className="flex items-center justify-between p-3.5 bg-[#1f2c34] hover:bg-[#202c33] border border-gray-800 rounded-2xl">
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

                        <button onClick={() => handleConnect(dev)} disabled={status === 'Connecting'} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow">
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
                  <span>Mesh Active (A → B → C)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={handleStartVoiceCall} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg font-semibold text-[11px] shadow">
                    <Phone className="w-3 h-3" /> Voice
                  </button>
                  <button onClick={handleStartVideoCall} className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded-lg font-semibold text-[11px] shadow">
                    <VideoIcon className="w-3 h-3" /> Video
                  </button>
                </div>
              </div>

              {/* Message History List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <Zap className="w-10 h-10 text-emerald-500/50 mb-2" />
                    <p className="text-sm font-semibold text-gray-300">Multi-Hop Mesh Active!</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      Send messages, files, or start calls. If Phone C is not directly connected to Phone A, Phone B will relay packets automatically!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={msg.messageId || i} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${msg.isMe ? 'bg-emerald-700 text-white rounded-br-none' : 'bg-[#202c33] text-gray-100 rounded-bl-none border border-gray-700/60'}`}>
                        {!msg.isMe && (
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[11px] font-semibold text-emerald-400">{msg.senderName}</span>
                            {msg.isMeshRelayed && (
                              <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 font-mono">
                                Relayed ({msg.hops} Hops: A→B→C)
                              </span>
                            )}
                          </div>
                        )}

                        {/* RENDER TEXT MESSAGE */}
                        {msg.msgType === 'TEXT' && (
                          <p className="break-words leading-relaxed">{msg.text}</p>
                        )}

                        {/* RENDER IMAGE MESSAGE */}
                        {msg.msgType === 'IMAGE' && (
                          <div className="flex flex-col gap-1.5">
                            {msg.fileUrl ? (
                              <img src={msg.fileUrl} alt={msg.filename} className="max-h-56 max-w-full rounded-xl object-cover border border-black/20" />
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
                              <video src={msg.fileUrl} controls className="max-h-56 max-w-full rounded-xl object-cover border border-black/20" />
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
                              <a href={msg.fileUrl} download={msg.filename} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow">
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* TRANSFER PROGRESS BAR */}
                        {(msg.isUploading || msg.isDownloading || (msg.percent !== undefined && msg.percent < 100)) && (
                          <div className="mt-2 w-full bg-black/30 p-2 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between text-[10px] mb-1 text-gray-200">
                              <span>{msg.isUploading ? 'Uploading P2P Mesh...' : 'Downloading P2P Mesh...'}</span>
                              <span>{msg.percent || 0}% ({msg.speed || '0 KB/s'})</span>
                            </div>
                            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-400 h-full transition-all duration-200" style={{ width: `${msg.percent || 0}%` }} />
                            </div>
                          </div>
                        )}

                        {/* TIMESTAMP & BADGE */}
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="bg-black/30 px-1 rounded text-[9px] font-mono">Offline Mesh</span>
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
                  <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-emerald-950/50 text-gray-100 text-xs font-semibold rounded-xl transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span>📷 Send Image</span>
                  </button>
                  <button onClick={() => videoInputRef.current?.click()} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-teal-950/50 text-gray-100 text-xs font-semibold rounded-xl transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center">
                      <VideoIcon className="w-4 h-4" />
                    </div>
                    <span>🎥 Send Video</span>
                  </button>
                  <button onClick={() => docInputRef.current?.click()} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-cyan-950/50 text-gray-100 text-xs font-semibold rounded-xl transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span>📄 Send Document / File (PDF, DOCX, ZIP)</span>
                  </button>
                </div>
              )}

              {/* Message Input Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2 bg-[#1f2c34] p-2 rounded-2xl border border-gray-800">
                <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${showAttachMenu ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-emerald-400 hover:bg-gray-800'}`} title="Attach file">
                  <Paperclip className="w-4 h-4" />
                </button>

                <input type="text" placeholder="Type multi-hop mesh message..." value={inputText} onChange={(e) => setInputText(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 placeholder-gray-500 px-2" />
                <button type="submit" disabled={!inputText.trim()} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all shadow-md shrink-0">
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
