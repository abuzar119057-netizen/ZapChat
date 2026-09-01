import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { ArrowLeft, Phone, Video, Info, Plus, Send, Mic, MessageCircle, MoreVertical, Smile, Check, CheckCheck, Paperclip, Image, Camera, MapPin, User as UserIcon, FileText, Download, Loader2, ChevronDown, ChevronRight, Trash2, Share2, Forward, Copy, CheckSquare, PhoneIncoming, PhoneOutgoing, PhoneMissed, Star, Pin, Clock, Pause, Play, X, ZoomIn, Maximize, CornerUpLeft, AlertTriangle, BellOff, Sparkles, RotateCcw, Crop, Wand2, PenTool, MessageSquare } from 'lucide-react';
import MediaPicker from './MediaPicker';
import MapPicker from './MapPicker';
import { saveMessage, getMessagesByChatId, markMessageSynced } from '../services/localDB';
import { nearbyService } from '../services/nearbyService';

const DB_NAME = 'zapchat_audio';
const STORE_NAME = 'voice_messages';

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
    });
};

const saveAudioBlob = async (id, blob) => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, id);
    } catch (e) { console.error('IDB save error', e); }
};

const getAudioBlob = async (id) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) { return null; }
};

const defaultWallpapers = [
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&q=80',
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&q=80',
    'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=600&q=80',
    'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=600&q=80',
    'https://images.unsplash.com/photo-1519750783826-e2420f4d687f?w=600&q=80',
    'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&q=80',
    'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=600&q=80',
    'https://images.unsplash.com/photo-1502657877623-f66bf489d236?w=600&q=80',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80',
    'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=600&q=80',
    'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=600&q=80',
    'https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?w=600&q=80',
    'https://images.unsplash.com/photo-1604871000636-074fa5117945?w=600&q=80',
    'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=600&q=80',
    'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=600&q=80',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=80'
];

const ChatArea = ({ contact, onBack, onHeaderClick, onSelectContact }) => {
    const { user, updateProfile } = useAuth();
    const { socket, onlineUsers } = useSocket();
    const { initiateCall } = useCall();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [contactTyping, setContactTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playingMsgId, setPlayingMsgId] = useState(null);
    const [playbackInfo, setPlaybackInfo] = useState({ currentTime: 0, duration: 0 });
    const [downloadingIds, setDownloadingIds] = useState(new Set());
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [viewingMedia, setViewingMedia] = useState(null);
    const [cachedFileIds, setCachedFileIds] = useState(new Set());

    const docInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    const audioInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [forwardingMessage, setForwardingMessage] = useState(null);
    const [showContactPicker, setShowContactPicker] = useState(false);
    const [availableContacts, setAvailableContacts] = useState([]);
    const [selectedLiveDuration, setSelectedLiveDuration] = useState(60);
    const [showCamera, setShowCamera] = useState(false);
    const [showChatOptions, setShowChatOptions] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMsgIds, setSelectedMsgIds] = useState(new Set());
    const [forwardingMode, setForwardingMode] = useState(false);
    const longPressTimerRef = useRef(null);
    const videoRef = useRef(null);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [showLiveDurations, setShowLiveDurations] = useState(false);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [loadingPlaces, setLoadingPlaces] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [locationSearch, setLocationSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchingLocation, setSearchingLocation] = useState(false);
    const locationSearchTimer = useRef(null);
    const liveWatchIdRef = useRef(null);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [groupData, setGroupData] = useState(contact.isGroup ? contact : null);
    const [pinnedMessages, setPinnedMessages] = useState(contact.isGroup ? (contact.pinnedMessages || []) : []);
    const [showUnpinConfirm, setShowUnpinConfirm] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteOption, setDeleteOption] = useState('me');
    const [canDeleteForEveryone, setCanDeleteForEveryone] = useState(false);
    const [showFullImage, setShowFullImage] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatWallpaper, setChatWallpaper] = useState(null);
    const [showWallpaperModal, setShowWallpaperModal] = useState(false);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaCaption, setMediaCaption] = useState('');
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [showMeshSheet, setShowMeshSheet] = useState(false);
    const [meshPeers, setMeshPeers] = useState([]);
    const [isMeshAdvertising, setIsMeshAdvertising] = useState(false);
    const [isMeshScanning, setIsMeshScanning] = useState(false);
    const wallpaperInputRef = useRef(null);

    useEffect(() => {
        const unsubscribe = nearbyService.addListener((peersList) => {
            setMeshPeers(peersList);
        });
        setIsMeshAdvertising(nearbyService.isAdvertising);
        setIsMeshScanning(nearbyService.isScanning);
        
        const handleOfflineMsg = (e) => {
            const msg = e.detail;
            const targetId = contact.isGroup ? contact._id : (contact.userId || contact._id);
            if (msg && (msg.sender === targetId || msg.recipient === targetId)) {
                setMessages(prev => {
                    if (prev.some(m => m.localId === msg.localId || m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
            }
        };

        const handleSyncComplete = () => {
            fetchMessages();
        };

        window.addEventListener('zapchat_offline_msg', handleOfflineMsg);
        window.addEventListener('zapchat_sync_complete', handleSyncComplete);

        return () => {
            unsubscribe();
            window.removeEventListener('zapchat_offline_msg', handleOfflineMsg);
            window.removeEventListener('zapchat_sync_complete', handleSyncComplete);
        };
    }, [contact?._id]);

    const handleGenerateAiWallpaper = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingAi(true);
        
        try {
            const token = localStorage.getItem('token');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout
            
            console.log('[AI Wallpaper] Sending request for:', aiPrompt.trim());
            
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/ai/wallpaper?prompt=${encodeURIComponent(aiPrompt.trim())}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('[AI Wallpaper] Response status:', response.status);
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Server returned ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            console.log('[AI Wallpaper] Content-Type:', contentType);
            
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('Response is not an image');
            }
            
            const blob = await response.blob();
            console.log('[AI Wallpaper] Image blob size:', blob.size);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                localStorage.setItem(`wallpaper_${contact._id}`, base64data);
                setChatWallpaper(base64data);
                setIsGeneratingAi(false);
                setShowWallpaperModal(false);
                setAiPrompt('');
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('[AI Wallpaper] Error:', error.message);
            setIsGeneratingAi(false);
            if (error.name === 'AbortError') {
                alert('AI generation timed out. Try a simpler prompt.');
            } else {
                alert('Failed to generate: ' + error.message);
            }
        }
    };

    useEffect(() => {
        if (contact) {
            setChatWallpaper(localStorage.getItem(`wallpaper_${contact._id}`) || localStorage.getItem('global_wallpaper') || null);
        }
    }, [contact]);

    useEffect(() => {
        return () => {
            if (liveWatchIdRef.current) navigator.geolocation.clearWatch(liveWatchIdRef.current);
        };
    }, []);

    useEffect(() => {
        initDB().then(db => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).getAllKeys();
            req.onsuccess = () => setCachedFileIds(new Set(req.result));
        }).catch(() => { });
    }, []);

    const [playedAudioIds, setPlayedAudioIds] = useState(() => {
        try {
            return new Set(JSON.parse(localStorage.getItem('playedAudios')) || []);
        } catch (e) {
            return new Set();
        }
    });

    const [contextMenu, setContextMenu] = useState(null);

    const onMessageLongPress = (e, msgId) => {
        e.preventDefault();
        setContextMenu({ x: e.pageX, y: e.pageY, msgId });
    };

    const handlePinMessage = async (msgId) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/messages/${msgId}/pin`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isPinned: data.pinned } : m));
            setContextMenu(null);
        } catch (err) { console.error(err); }
    };

    const handleStarMessage = async (msgId) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/messages/${msgId}/star`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            setMessages(prev => prev.map(m => m._id === msgId ? data : m));
            setContextMenu(null);
        } catch (err) { console.error(err); }
    };

    const handleReportMessage = async (msgId) => {
        const reason = prompt("Why are you reporting this message?", "Inappropriate content");
        if (!reason) return;
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups/${contact._id}/report`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messageId: msgId, reason })
            });
            alert("Message reported to admins.");
            setContextMenu(null);
        } catch (err) { console.error(err); }
    };

    const handleEmojiReaction = (msgId, emoji) => {
        if (!socket) return;
        socket.emit('send_reaction', { messageId: msgId, emoji });
        
        // Optimistic UI Update
        setMessages(prev => prev.map(m => {
            if (String(m._id) === String(msgId)) {
                const existingReactions = m.reactions || [];
                const existingIdx = existingReactions.findIndex(r => String(r.userId || r) === String(user._id));
                let newReactions = [...existingReactions];
                
                if (existingIdx > -1) {
                    if (newReactions[existingIdx].emoji === emoji) {
                        newReactions.splice(existingIdx, 1);
                    } else {
                        newReactions[existingIdx].emoji = emoji;
                    }
                } else {
                    newReactions.push({ userId: user._id, emoji });
                }
                return { ...m, reactions: newReactions };
            }
            return m;
        }));
        
        setContextMenu(null);
    };

    const handleReply = (msgId) => {
        const msg = messages.find(m => String(m._id) === String(msgId));
        setReplyingTo(msg);
        setContextMenu(null);
    };

    const handleForward = (msgId) => {
        setSelectedMsgIds(new Set([msgId]));
        setForwardingMode(true);
        setShowContactPicker(true);
        setContextMenu(null);
    };

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleTime, setScheduleTime] = useState('');

    const handleScheduleMessage = async () => {
        if (!newMessage.trim() || !scheduleTime) return;
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups/${contact._id}/schedule`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: newMessage, executeAt: scheduleTime })
            });
            alert("Message scheduled!");
            setNewMessage('');
            setShowScheduleModal(false);
        } catch (err) { console.error(err); }
    };


    useEffect(() => {
        if (!contact.isGroup) return;

        // Fetch fresh group data on mount
        const fetchGroup = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups/${contact._id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await res.json();
                setGroupData(data);
                setPinnedMessages(data.pinnedMessages || []);
            } catch (err) { console.error('Failed to fetch group:', err); }
        };
        fetchGroup();

        if (!socket) return;
        const handleSettings = ({ groupId, settings }) => {
            if (groupId === contact._id) setGroupData(prev => ({ ...prev, settings }));
        };
        const handlePinned = (data) => {
            if (data.messageId) {
                setMessages(prev => prev.map(m => String(m._id) === String(data.messageId) ? { ...m, isPinned: data.pinned } : m));
            }
            if (data.pinnedMessages && data.groupId === contact._id) {
                setPinnedMessages(data.pinnedMessages);
            }
        };
        const handleUpdated = (data) => {
            if (data._id === contact._id) setGroupData(data);
        };

        socket.on('group_settings_updated', handleSettings);
        socket.on('message_pinned', handlePinned);
        socket.on('group_updated', handleUpdated);

        return () => {
            socket.off('group_settings_updated', handleSettings);
            socket.off('message_pinned', handlePinned);
            socket.off('group_updated', handleUpdated);
        };
    }, [contact._id, socket]);

    const isAdmin = groupData?.admins?.some(a => (a._id || a) === user._id);
    const isMessagingRestricted = groupData?.settings?.messagingRestricted && !isAdmin;
    const isAnnouncementOnly = groupData?.settings?.announcementMode && !isAdmin;

    // Pro Group Permissions Check
    const activeGroupSettings = groupData?.settings || {};
    const allowText = isAdmin || (activeGroupSettings.allowText !== false);
    const allowVoice = isAdmin || (activeGroupSettings.allowVoice !== false);
    const allowMedia = isAdmin || (activeGroupSettings.allowMedia !== false);
    const allowFiles = isAdmin || (activeGroupSettings.allowFiles !== false);
    const allowEmojis = isAdmin || (activeGroupSettings.allowEmojis !== false);
    const allowReactions = !contact.isGroup || isAdmin || (activeGroupSettings.allowReactions !== false);
    const allowReply = !contact.isGroup || isAdmin || (activeGroupSettings.allowReply !== false);
    const allowForward = !contact.isGroup || isAdmin || (activeGroupSettings.allowForward !== false);
    const allowPin = !contact.isGroup || isAdmin || (activeGroupSettings.whoCanPin === 'everyone');

    const [downloadedMediaIds, setDownloadedMediaIds] = useState(() => {
        try {
            return new Set(JSON.parse(localStorage.getItem('downloadedMedias')) || []);
        } catch (e) {
            return new Set();
        }
    });

    const handleMediaDownload = async (msgId, fileId, filename) => {
        setDownloadingIds(prev => new Set(prev).add(msgId));

        try {
            const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/${fileId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!resp.ok) throw new Error('Download failed');

            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename || 'download';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setDownloadedMediaIds(prev => {
                const next = new Set(prev).add(msgId);
                localStorage.setItem('downloadedMedias', JSON.stringify([...next]));
                return next;
            });
        } catch (err) {
            console.error('Download failed:', err);
            alert('Failed to download file.');
        } finally {
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(msgId);
                return next;
            });
        }
    };
    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const activeAudioRef = useRef(null);
    const isCancelledRef = useRef(false);
    const audioCacheRef = useRef({});

    const handlePlayVoice = async (msgId, fileId, justDownload = false) => {
        try {
            let isNewDownload = false;

            if (!justDownload && playingMsgId === msgId) {
                activeAudioRef.current?.pause();
                setPlayingMsgId(null);
                return;
            }

            if (!justDownload && activeAudioRef.current) {
                activeAudioRef.current.pause();
                activeAudioRef.current = null;
            }

            let url = audioCacheRef.current[fileId];
            if (!url) {
                setDownloadingIds(prev => new Set(prev).add(fileId));

                const cachedBlob = await getAudioBlob(fileId);
                if (cachedBlob) {
                    url = URL.createObjectURL(cachedBlob);
                    audioCacheRef.current[fileId] = url;
                } else {
                    const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/${fileId}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (!resp.ok) throw new Error('Could not fetch audio file');
                    const blob = await resp.blob();
                    url = URL.createObjectURL(blob);
                    audioCacheRef.current[fileId] = url;

                    saveAudioBlob(fileId, blob);
                    setCachedFileIds(prev => new Set(prev).add(fileId));
                    isNewDownload = true;
                }

                setDownloadingIds(prev => {
                    const next = new Set(prev);
                    next.delete(fileId);
                    return next;
                });
            }

            if (justDownload) return;

            if (!justDownload) {
                setPlayedAudioIds(prev => {
                    const next = new Set(prev).add(msgId);
                    localStorage.setItem('playedAudios', JSON.stringify([...next]));
                    return next;
                });

                const msg = messages.find(m => m._id === msgId);
                if (msg && msg.recipient === user._id && msg.status !== 'played') {
                    socket?.emit('mark_played', { messageIds: [msgId], senderId: msg.sender._id || msg.sender });
                }
            }

            const audio = new Audio(url);

            audio.onloadedmetadata = () => {
                setPlaybackInfo({ currentTime: 0, duration: audio.duration });
            };

            audio.ontimeupdate = () => {
                setPlaybackInfo(prev => ({ ...prev, currentTime: audio.currentTime }));
            };

            audio.onended = () => {
                setPlayingMsgId(null);
                setPlaybackInfo({ currentTime: 0, duration: 0 });
            };

            activeAudioRef.current = audio;
            setPlayingMsgId(msgId);
            audio.play();
        } catch (err) {
            console.error('Playback/Download failed', err);
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
            if (!justDownload) alert('Failed to play voice message.');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const playOutgoingSound = () => {
        if (user?.settings?.inAppSounds === false) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
            
            if (user?.settings?.inAppVibrate !== false && navigator.vibrate) {
                navigator.vibrate(50);
            }
        } catch(e) {}
    };

    useEffect(() => {
        if (isRecording && !isPaused) {
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
        return () => {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            if (activeAudioRef.current) activeAudioRef.current.pause();
        };
    }, [isRecording, isPaused]);

    const isOnline = contact && onlineUsers[contact.userId || contact._id]?.status === 'online';

    useEffect(() => {
        if (!contact) return;
        const targetId = contact.isGroup ? contact._id : (contact.userId || contact._id);
        fetchMessages();

        socket?.on('receive_message', (message) => {
            const isMatch = message.groupId
                ? (contact.isGroup && (message.groupId._id || message.groupId) === targetId)
                : (!contact.isGroup && (
                    (message.sender?._id || message.sender) === targetId || 
                    (message.recipient?._id || message.recipient) === targetId
                  ));

            if (isMatch) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });

                if ((message.sender?._id || message.sender) === targetId) {
                    socket.emit('mark_read', { messageIds: [message._id], senderId: (message.sender?._id || message.sender) });
                }
            }
        });

        socket?.on('messages_delivered', ({ messageIds }) => {
            setMessages(prev => prev.map(m =>
                messageIds.includes(m._id) ? { ...m, status: 'delivered' } : m
            ));
        });

        socket?.on('messages_read', ({ messageIds }) => {
            setMessages(prev => prev.map(m =>
                messageIds.includes(m._id) ? { ...m, status: 'read' } : m
            ));
        });

        socket?.on('messages_played', ({ messageIds }) => {
            setMessages(prev => prev.map(m =>
                messageIds.includes(m._id) ? { ...m, status: 'played' } : m
            ));
        });

        socket?.on('typing', ({ senderId }) => {
            if (senderId === targetId) setContactTyping(true);
        });

        socket?.on('stop_typing', ({ senderId }) => {
            if (senderId === targetId) setContactTyping(false);
        });

        socket?.on('live_location_updated', ({ messageId, content }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content } : m));
        });

        socket?.on('live_location_stopped', ({ messageId }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, expiresAt: new Date().toISOString() } : m));
        });

        socket?.on('messages_deleted', ({ messageIds }) => {
            setMessages(prev => prev.filter(m => {
                const mIdStr = String(m._id);
                return !messageIds.some(delId => String(delId) === mIdStr);
            }));
        });

        socket?.on('message_reaction_updated', ({ messageId, reactions }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
        });

        socket?.on('chat_cleared', ({ contactId }) => {
            if (contactId === targetId) {
                setMessages([]);
            }
        });

        return () => {
            socket?.off('receive_message');
            socket?.off('messages_delivered');
            socket?.off('messages_read');
            socket?.off('typing');
            socket?.off('stop_typing');
            socket?.off('live_location_updated');
            socket?.off('live_location_stopped');
            socket?.off('messages_deleted');
            socket?.off('chat_cleared');
            socket?.off('message_reaction_updated');
        };
    }, [contact?._id, socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const insertEmoji = (emoji) => {
        setNewMessage(prev => prev + emoji);
    };

    const fetchMessages = async () => {
        if (!contact) return;
        const targetId = contact.isGroup ? contact._id : (contact.userId || contact._id);
        
        try {
            if (navigator.onLine) {
                const url = contact.isGroup
                    ? `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/messages/group/${targetId}`
                    : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/messages/${targetId}`;

                const resp = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await resp.json();
                if (resp.ok) {
                    const messagesList = Array.isArray(data) ? data : [];
                    setMessages(messagesList);
                    
                    // Cache messages in IndexedDB
                    for (const m of messagesList) {
                        await saveMessage({ ...m, chatId: targetId, is_synced: 1 });
                    }
                    return;
                }
            }
        } catch (err) {
            console.error('Fetch messages online failed, trying local DB:', err);
        }

        // Offline / Error Fallback
        try {
            const cachedMsgs = await getMessagesByChatId(targetId);
            setMessages(cachedMsgs || []);
        } catch (dbErr) {
            console.error('IndexedDB fetch failed:', dbErr);
            setMessages([]);
        }
    };

    const handleMicClick = async () => {
        if (isRecording) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        } else {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert('Mic not available. Camera/Mic features require HTTPS. Please use the app via HTTPS or the APK.');
                    return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Determine supported MIME type with fallback options
                let mimeType = '';
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mimeType = 'audio/webm;codecs=opus';
                } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    mimeType = 'audio/webm';
                } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                    mimeType = 'audio/ogg;codecs=opus';
                }
                const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
                audioChunksRef.current = [];

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };

                recorder.onstop = async () => {
                    if (isCancelledRef.current) {
                        stream.getTracks().forEach(track => track.stop());
                        return;
                    }
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());

                    const formData = new FormData();
                    formData.append('file', audioBlob, 'voicenote.webm');

                    try {
                        console.log('Uploading Voice Note...');
                        const uploadResp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/upload`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                            body: formData
                        });

                        if (!uploadResp.ok) throw new Error(`Upload failed with status: ${uploadResp.status}`);

                        const uploadData = await uploadResp.json();

                        if (uploadData.fileId) {
                            // Pre-cache natively so sender doesn't have to download
                            audioCacheRef.current[uploadData.fileId] = URL.createObjectURL(audioBlob);
                            saveAudioBlob(uploadData.fileId, audioBlob);
                            setCachedFileIds(prev => new Set(prev).add(uploadData.fileId));

                            const tempId = Date.now().toString();
                            const msgData = {
                                recipientId: contact.userId || contact._id,
                                content: 'Voice Message',
                                type: 'audio',
                                fileId: uploadData.fileId,
                                fileMetadata: {
                                    contentType: uploadData.contentType,
                                    filename: uploadData.filename,
                                    size: uploadData.size
                                },
                                clientId: tempId
                            };
                            socket?.emit('send_message', msgData, (response) => {
                                if (response?.messageId) {
                                    setMessages(prev => prev.map(m =>
                                        m._id === tempId ? { ...m, _id: response.messageId, status: response.status } : m
                                    ));
                                }
                            });

                            setMessages(prev => [...prev, {
                                _id: tempId,
                                sender: user,
                                recipient: contact._id,
                                content: 'Voice Message',
                                fileId: uploadData.fileId,
                                fileMetadata: {
                                    contentType: uploadData.contentType,
                                    filename: uploadData.filename,
                                    size: uploadData.size
                                },
                                createdAt: new Date().toISOString(),
                                status: 'sent'
                            }]);
                            playOutgoingSound();
                        }
                    } catch (err) {
                        console.error('Audio upload failed', err);
                        alert('Failed to send voice message. Please check your connection.');
                    }
                };

                recorder.start();
                mediaRecorderRef.current = recorder;
                isCancelledRef.current = false;
                setRecordingDuration(0);
                setIsRecording(true);
            } catch (err) {
                console.error('Mic access denied or recorder error', err);
                alert('Cannot access microphone or create recorder. Please ensure permissions and a supported browser.');
            }
        }
    };

    const handleTogglePause = () => {
        if (!mediaRecorderRef.current) return;
        if (isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
        } else {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
        }
    };

    const streamRef = useRef(null);
    const canvasRef = useRef(null);

    const startCamera = async () => {
        setShowAttachMenu(false);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera not available. Camera/Mic features require HTTPS. Please use the app via HTTPS or the APK.');
            return;
        }
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera access denied', err);
            setShowCamera(false);
            alert('Cannot access camera. Please allow camera permissions.');
        }
    };

    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const capturePhoto = async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        // Convert canvas to blob then upload
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            closeCamera();
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            await handleAttachmentUpload(file, 'image');
        }, 'image/jpeg', 0.92);
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !contact) return;
        try {
            const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const targetId = contact.userId || contact._id;

            const optimisticMsg = {
                localId: tempId,
                _id: tempId,
                sender: user,
                recipient: contact.isGroup ? null : contact._id,
                groupId: contact.isGroup ? contact : null,
                chatId: targetId,
                content: newMessage,
                type: 'text',
                status: 'pending',
                is_synced: 0,
                createdAt: new Date().toISOString(),
                replyTo: replyingTo
            };

            // Save to IndexedDB
            await saveMessage(optimisticMsg);

            setMessages(prev => [...prev, optimisticMsg]);
            setNewMessage('');
            setReplyingTo(null);
            playOutgoingSound();

            if (navigator.onLine && socket) {
                const msgData = {
                    content: optimisticMsg.content,
                    type: 'text',
                    clientId: tempId,
                    replyTo: replyingTo ? replyingTo._id : null
                };

                if (contact.isGroup) {
                    msgData.groupId = contact._id;
                    socket?.emit('send_group_message', msgData, async (response) => {
                        if (response?.messageId) {
                            await markMessageSynced(tempId, response.messageId);
                            setMessages(prev => prev.map(m => m.localId === tempId ? { ...m, _id: response.messageId, status: response.status, is_synced: 1 } : m));
                        }
                    });
                } else {
                    msgData.recipientId = targetId;
                    socket?.emit('send_message', msgData, async (response) => {
                        if (response?.messageId) {
                            await markMessageSynced(tempId, response.messageId);
                            setMessages(prev => prev.map(m => m.localId === tempId ? { ...m, _id: response.messageId, status: response.status, is_synced: 1 } : m));
                        }
                    });
                }
            } else {
                // Offline fallback - send via P2P Mesh
                const meshPeers = Array.from(nearbyService.peers.values());
                const matchedPeer = meshPeers.find(p => p.name.toLowerCase() === (contact.displayName || contact.name || '').toLowerCase());
                
                if (matchedPeer) {
                    console.log(`[Mesh] Broadcasting offline message to peer: ${matchedPeer.name}`);
                    await nearbyService.sendMeshMessage(matchedPeer.peerId, optimisticMsg.content, user._id, user.displayName);
                    setMessages(prev => prev.map(m => m.localId === tempId ? { ...m, status: 'mesh_delivered' } : m));
                } else {
                    console.log(`[Offline] No matching peer found for ${contact.displayName || contact.name}. Message saved locally.`);
                }
            }
        } catch (err) {
            console.error('Send failed:', err);
        }
    };

    const handleSendMedia = (url, type) => {
        try {
            const tempId = Date.now().toString();
            const msgData = { content: url, type, clientId: tempId };

            if (contact.isGroup) {
                msgData.groupId = contact._id;
                socket?.emit('send_group_message', msgData, (response) => {
                    if (response?.messageId) {
                        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: response.messageId, status: response.status } : m));
                    }
                });
            } else {
                const targetId = contact.userId || contact._id;
                msgData.recipientId = targetId;
                socket?.emit('send_message', msgData, (response) => {
                    if (response?.messageId) {
                        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: response.messageId, status: response.status } : m));
                    }
                });
            }

            const optimisticMsg = {
                _id: tempId,
                sender: user,
                recipient: contact.isGroup ? null : contact._id,
                groupId: contact.isGroup ? contact : null,
                content: url,
                type,
                createdAt: new Date().toISOString(),
                status: 'sent'
            };

            setMessages(prev => [...prev, optimisticMsg]);
            setShowEmojiPicker(false);
            playOutgoingSound();
        } catch (err) {
            console.error('Media send failed:', err);
        }
    };

    const handleAttachmentUpload = async (file, type, caption = '') => {
        try {
            const formData = new FormData();
            formData.append('file', file, file.name || 'attachment');
            setShowAttachMenu(false);

            const uploadResp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            if (!uploadResp.ok) throw new Error('Upload failed');
            const uploadData = await uploadResp.json();

            if (uploadData.fileId) {
                const tempId = Date.now().toString();
                const msgData = {
                    content: caption || (type === 'file' ? file.name : (type === 'image' || type === 'video' ? 'Media' : 'Audio')),
                    type: type,
                    fileId: uploadData.fileId,
                    fileMetadata: {
                        contentType: uploadData.contentType,
                        filename: uploadData.filename,
                        size: uploadData.size
                    },
                    clientId: tempId
                };

                if (contact.isGroup) {
                    msgData.groupId = contact._id;
                    socket?.emit('send_group_message', msgData, (response) => {
                        if (response?.messageId) {
                            setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: response.messageId, status: response.status } : m));
                        }
                    });
                } else {
                    msgData.recipientId = contact.userId || contact._id;
                    socket?.emit('send_message', msgData, (response) => {
                        if (response?.messageId) {
                            setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: response.messageId, status: response.status } : m));
                        }
                    });
                }

                setMessages(prev => [
                    ...prev,
                    {
                        ...msgData,
                        _id: tempId,
                        sender: user,
                        recipient: contact.isGroup ? null : contact._id,
                        groupId: contact.isGroup ? contact : null,
                        createdAt: new Date().toISOString(),
                        status: 'sent'
                    }
                ]);
                playOutgoingSound();
            }
        } catch (err) {
            console.error('Attachment upload failed:', err);
            alert('Failed to send attachment.');
        }
    };

    const handleLocationOptionClick = () => {
        setShowAttachMenu(false);
        setNearbyPlaces([]);
        setUserCoords(null);
        setLocationSearch('');
        setSearchResults([]);
        setShowLocationPicker(true);
        setLoadingPlaces(true);
        if (!navigator.geolocation) { setLoadingPlaces(false); return; }
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            setUserCoords({ lat, lon });
            try {
                const query = `[out:json][timeout:10];(
                node["amenity"](around:600,${lat},${lon});
                node["shop"](around:600,${lat},${lon});
              );out body 20;`;
                const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
                const data = await res.json();
                const amenityIcons = {
                    hospital: '🏥', clinic: '🏥', pharmacy: '💊', doctors: '🩺',
                    mosque: '🕌', church: '⛪', school: '🏫', university: '🎓',
                    restaurant: '🍽️', cafe: '☕', fast_food: '🍔', bakery: '🥐',
                    supermarket: '🛒', convenience: '🏪', marketplace: '🏬',
                    bank: '🏦', atm: '💳', fuel: '⛽', parking: '🅿️',
                    police: '🚓', fire_station: '🚒', post_office: '📮',
                    hotel: '🏨', bus_station: '🚌', taxi: '🚕', hospital: '🏥',
                };
                const places = data.elements
                    .filter(el => el.tags && (el.tags.name))
                    .map(el => ({
                        id: el.id,
                        name: el.tags.name,
                        type: el.tags.amenity || el.tags.shop || 'place',
                        icon: amenityIcons[el.tags.amenity || el.tags.shop] || '📍',
                        lat: el.lat,
                        lon: el.lon,
                    }))
                    .slice(0, 12);
                setNearbyPlaces(places);
            } catch (e) {
                console.error('Nearby places fetch failed', e);
            } finally {
                setLoadingPlaces(false);
            }
        }, () => setLoadingPlaces(false), { timeout: 8000 });
    };

    const handleSendCurrentLocation = () => {
        setShowLocationPicker(false);
        if (!navigator.geolocation) return alert('Geolocation not supported');
        navigator.geolocation.getCurrentPosition((position) => {
            const tempId = Date.now().toString();
            const q = `${position.coords.latitude},${position.coords.longitude}`;
            const msgData = { recipientId: contact.userId || contact._id, content: q, type: 'location', clientId: tempId };
            socket?.emit('send_message', msgData, (r) => {
                if (r?.messageId) setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: r.messageId, status: r.status } : m));
            });
            setMessages(prev => [...prev, { ...msgData, _id: tempId, sender: user, recipient: contact._id, createdAt: new Date().toISOString(), status: 'sent' }]);
        }, () => alert('Unable to retrieve location.'));
    };

    const handleSendPlaceLocation = (place) => {
        setShowLocationPicker(false);
        setLocationSearch('');
        setSearchResults([]);
        const tempId = Date.now().toString();
        const q = `${place.lat},${place.lon}`;
        const msgData = { recipientId: contact.userId || contact._id, content: q, type: 'location', clientId: tempId };
        socket?.emit('send_message', msgData, (r) => {
            if (r?.messageId) setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: r.messageId, status: r.status } : m));
        });
        setMessages(prev => [...prev, { ...msgData, _id: tempId, sender: user, recipient: contact._id, createdAt: new Date().toISOString(), status: 'sent', placeName: place.name }]);
        playOutgoingSound();
    };

    const handleLocationSearch = (val) => {
        setLocationSearch(val);
        if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current);
        if (!val.trim()) { setSearchResults([]); return; }
        setSearchingLocation(true);
        locationSearchTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1`, {
                    headers: { 'Accept-Language': 'en' }
                });
                const data = await res.json();
                setSearchResults(data.map(r => ({
                    id: r.place_id,
                    name: r.display_name.split(',').slice(0, 2).join(','),
                    address: r.display_name.split(',').slice(2).join(',').trim(),
                    lat: parseFloat(r.lat),
                    lon: parseFloat(r.lon),
                    type: r.type || r.class || 'place',
                })));
            } catch { setSearchResults([]); }
            finally { setSearchingLocation(false); }
        }, 500);
    };

    const handleSendLiveLocation = (durationMinutes) => {
        setShowLocationPicker(false);
        if (!navigator.geolocation) return alert('Geolocation not supported');

        const expiresAt = new Date(Date.now() + durationMinutes * 60000).toISOString();
        const tempId = Date.now().toString();

        navigator.geolocation.getCurrentPosition((pos) => {
            const q = `${pos.coords.latitude},${pos.coords.longitude}`;
            const msgData = { recipientId: contact.userId || contact._id, content: q, type: 'live_location', expiresAt, clientId: tempId };

            socket?.emit('send_message', msgData, (r) => {
                if (r?.messageId) {
                    setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: r.messageId, status: r.status } : m));

                    // Start live tracking
                    if (liveWatchIdRef.current) navigator.geolocation.clearWatch(liveWatchIdRef.current);
                    liveWatchIdRef.current = navigator.geolocation.watchPosition((newPos) => {
                        if (new Date() > new Date(expiresAt)) {
                            navigator.geolocation.clearWatch(liveWatchIdRef.current);
                            return;
                        }
                        const newQ = `${newPos.coords.latitude},${newPos.coords.longitude}`;
                        socket?.emit('update_live_location', { messageId: r.messageId, content: newQ, recipientId: contact.userId || contact._id });
                        setMessages(prev => prev.map(m => m._id === r.messageId ? { ...m, content: newQ } : m));
                    }, null, { enableHighAccuracy: true });
                }
            });

            setMessages(prev => [...prev, { ...msgData, _id: tempId, sender: user, recipient: contact._id, createdAt: new Date().toISOString(), status: 'sent' }]);
            playOutgoingSound();
        }, () => alert('Unable to retrieve location.'));
    };

    const handleStopLiveLocation = (msgId) => {
        if (liveWatchIdRef.current) navigator.geolocation.clearWatch(liveWatchIdRef.current);
        socket?.emit('stop_live_location', { messageId: msgId, recipientId: contact.userId || contact._id });
        setMessages(prev => prev.map(m => m._id === msgId ? { ...m, expiresAt: new Date().toISOString() } : m));
    };

    const handleMapSelect = (selectedData) => {
        setShowMapPicker(false);
        const [coords, addressText] = selectedData.split('|');
        const tempId = Date.now().toString();
        const msgData = { recipientId: contact.userId || contact._id, content: coords, type: 'location', clientId: tempId, address: addressText };

        socket?.emit('send_message', msgData, (r) => {
            if (r?.messageId) setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: r.messageId, status: r.status } : m));
        });

        setMessages(prev => [...prev, { ...msgData, _id: tempId, sender: user, recipient: contact._id, createdAt: new Date().toISOString(), status: 'sent' }]);
        playOutgoingSound();
    };

    const handleContactClick = async () => {
        setShowAttachMenu(false);
        setShowContactPicker(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/contacts`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableContacts(data.contacts.map(c => c.contact));
            }
        } catch (err) {
            console.error('Failed to load real contacts');
        }
    };

    const handleContactShare = (sharedUser) => {
        if (forwardingMode) {
            const msgsToForward = messages.filter(m => selectedMsgIds.has(m._id));
            msgsToForward.forEach(msg => {
                const tempId = Date.now().toString() + Math.random();
                const msgData = {
                    content: msg.content,
                    type: msg.type,
                    fileId: msg.fileId,
                    fileMetadata: msg.fileMetadata,
                    clientId: tempId,
                    isForwarded: true
                };

                if (sharedUser.isGroup) {
                    msgData.groupId = sharedUser._id;
                    socket?.emit('send_group_message', msgData);
                } else {
                    msgData.recipientId = sharedUser._id;
                    socket?.emit('send_message', msgData);
                }
            });
            setForwardingMode(false);
            setIsSelectionMode(false);
            setSelectedMsgIds(new Set());
            setShowContactPicker(false);
            alert(`Forwarded ${msgsToForward.length} messages to ${sharedUser.displayName}`);
            return;
        }

        setShowContactPicker(false);
        const tempId = Date.now().toString();
        const content = `${sharedUser.displayName}|${sharedUser._id}`;
        const msgData = { recipientId: contact._id, content, type: 'contact', clientId: tempId };

        socket?.emit('send_message', msgData, (response) => {
            if (response?.messageId) {
                setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: response.messageId, status: response.status } : m));
            }
        });

        setMessages(prev => [...prev, { _id: tempId, sender: user, recipient: contact._id, content, type: 'contact', createdAt: new Date().toISOString(), status: 'sent' }]);
    };

    const handleDeleteSelected = async (type = 'me') => {
        console.log(`[Delete] Deleting messages:`, Array.from(selectedMsgIds), `Type:`, type);
        if (selectedMsgIds.size === 0) {
            console.warn('[Delete] No messages selected');
            return;
        }
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/messages/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    messageIds: Array.from(selectedMsgIds), 
                    contactId: contact._id,
                    deleteType: type 
                })
            });
            if (!res.ok) {
                const errorData = await res.json();
                console.error('[Delete] Server error:', errorData);
                alert(errorData.message || 'Failed to delete messages');
            } else {
                console.log('[Delete] Successfully requested deletion');
            }
        } catch (err) {
            console.error('[Delete] Fetch error:', err);
        }
        setIsSelectionMode(false);
        setSelectedMsgIds(new Set());
    };

    const handleClearChat = async () => {
        const confirmMsg = user.role === 'admin' ? 'Are you sure? This will clear the chat for BOTH you and the user.' : 'Are you sure you want to clear your chat history?';
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/messages/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ contactId: contact._id })
            });
            if (res.ok) {
                setMessages([]);
                setShowChatOptions(false);
            } else {
                alert('Failed to clear chat');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCopySelected = () => {
        const selectedMsgs = messages.filter(m => selectedMsgIds.has(m._id) && m.type === 'text');
        if (selectedMsgs.length === 0) return alert('Only text messages can be copied.');
        const textToCopy = selectedMsgs.map(m => m.content).join('\n');
        navigator.clipboard.writeText(textToCopy);
        setIsSelectionMode(false);
        setSelectedMsgIds(new Set());
    };

    const handleForwardSelected = () => {
        if (selectedMsgIds.size === 0) return;
        setForwardingMode(true);
        setShowContactPicker(true);
        handleContactClick(); // Reuse contact fetcher
    };

    const handleSelectAll = () => {
        if (selectedMsgIds.size === messages.length) {
            setSelectedMsgIds(new Set());
            setIsSelectionMode(false);
        } else {
            setSelectedMsgIds(new Set(messages.map(m => m._id)));
        }
    };

    const handleAddSharedContact = async (contactId) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ contactId })
            });
            if (res.ok) {
                alert('Contact added successfully!');
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to add contact');
            }
        } catch (err) {
            console.error(err);
            alert('Error adding contact');
        }
    };

    const handleMessageSharedContact = async (contactId, displayName) => {
        try {
            // Fetch full user info to ensure we have profile picture and other details
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/users/${contactId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const fullUser = res.ok ? await res.json() : { _id: contactId, displayName };

            if (onSelectContact) {
                onSelectContact(fullUser);
            }
        } catch (err) {
            console.error(err);
            // Fallback to basic info if fetch fails
            if (onSelectContact) {
                onSelectContact({ _id: contactId, displayName });
            }
        }
    };

    const handleShareSelected = async () => {
        const selectedMsgs = messages.filter(m => selectedMsgIds.has(m._id) && m.type === 'text');
        if (selectedMsgs.length === 0) return alert('Only text messages can be shared natively right now.');
        const textToShare = selectedMsgs.map(m => m.content).join('\n');
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Shared from Zap Chat', text: textToShare });
            } catch (e) { }
        } else {
            navigator.clipboard.writeText(textToShare);
            alert('Copied to clipboard instead (Share not supported)');
        }
        setIsSelectionMode(false);
        setSelectedMsgIds(new Set());
    };

    const handlePointerDown = (msgId) => {
        if (isSelectionMode) return;
        longPressTimerRef.current = setTimeout(() => {
            setIsSelectionMode(true);
            setSelectedMsgIds(prev => new Set(prev).add(msgId));
            if (navigator.vibrate) navigator.vibrate(50);
        }, 700);
    };

    const handlePointerUpOrLeave = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const toggleSelection = (msgId) => {
        if (!isSelectionMode) return;
        setSelectedMsgIds(prev => {
            const next = new Set(prev);
            if (next.has(msgId)) {
                next.delete(msgId);
                if (next.size === 0) setIsSelectionMode(false);
            } else {
                next.add(msgId);
            }
            return next;
        });
    };

    const groupMessagesByDate = (msgs) => {
        const groups = {};
        const seenIds = new Set();
        msgs.forEach(m => {
            const mId = m._id?.toString() || m._id;
            if (seenIds.has(mId)) return;
            seenIds.add(mId);

            if (searchQuery) {
                if (m.type !== 'text' || !m.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return;
                }
            }

            const date = new Date(m.createdAt).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(m);
        });
        return groups;
    };

    const handleExportChat = () => {
        let exportText = `ZapChat Export: ${contact?.isGroup ? contact.name : contact?.displayName}\n\n`;
        messages.forEach(m => {
            const date = new Date(m.createdAt).toLocaleString();
            const sender = m.sender?._id === user._id ? 'You' : (m.sender?.displayName || 'Unknown');
            const text = m.type === 'text' ? m.content : `<${m.type} attached>`;
            exportText += `[${date}] ${sender}: ${text}\n`;
        });
        
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ZapChat_${contact?.isGroup ? contact.name : contact?.displayName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        setShowChatOptions(false);
    };

    const getOfflineStatusText = () => {
        const targetId = contact.userId || contact._id;
        const socketStatus = onlineUsers[targetId];
        const ls = socketStatus?.lastSeen || contact.lastSeen;
        if (!ls) return 'offline';
        
        const date = new Date(ls);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (date.toDateString() === today.toDateString()) {
            return `last seen today at ${timeStr}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `last seen yesterday at ${timeStr}`;
        }
        return `last seen on ${date.toLocaleDateString()} at ${timeStr}`;
    };

    if (!contact) {
        return (
            <div className="chat-area" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ background: '#F2F2F7', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--primary)' }}>
                        <MessageCircle size={40} />
                    </div>
                    <h2 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '28px', fontWeight: '800' }}>ZapChat</h2>
                    <p style={{ fontSize: '16px' }}>Select a chat to start messaging.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-area">
            {/* Full Image Overlay */}
            {showFullImage && (
                <div 
                    onClick={() => setShowFullImage(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease-out' }}
                >
                    <img 
                        src={contact.profilePicture ? (contact.profilePicture.startsWith('http') ? contact.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + contact.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(contact.displayName || '') + "&background=random&color=fff"} 
                        style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} 
                        alt="Full Profile" 
                    />
                    <div style={{ position: 'absolute', top: '40px', right: '20px', color: '#FFF', fontSize: '18px', fontWeight: '600' }}>Done</div>
                </div>
            )}

            {/* High-Fidelity iOS Chat Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                borderBottom: '0.5px solid var(--border-ios)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                flexShrink: 0,
                height: '64px',
                zIndex: 100
            }}>
                {isSearching ? (
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }} className="animate-fade">
                        <ArrowLeft size={28} color="var(--primary)" style={{ cursor: 'pointer' }} onClick={() => { setIsSearching(false); setSearchQuery(''); }} />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Search in chat..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ flex: 1, border: 'none', background: '#F2F2F7', padding: '10px 16px', borderRadius: '12px', fontSize: '16px', outline: 'none' }}
                        />
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <ArrowLeft size={28} color="var(--primary)" style={{ cursor: 'pointer' }} onClick={onBack} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onHeaderClick}>
                        <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setShowFullImage(true); }}>
                            <img
                                src={contact.profilePicture ? (contact.profilePicture.startsWith('http') ? contact.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + contact.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(contact.displayName || '') + "&background=random&color=fff"}
                                className="ios-avatar"
                                style={{ width: '42px', height: '42px', cursor: 'zoom-in' }}
                                alt=""
                            />
                            {isOnline && <div style={{ position: 'absolute', bottom: '0', right: '0', width: '11px', height: '11px', background: '#34C759', border: '2px solid #FFF', borderRadius: '50%' }}></div>}
                            {contact.isGroup && contact.settings?.disappearingMessages > 0 && (
                                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#FFF', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                    <Clock size={11} color="#8E8E93" />
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                <div style={{ fontSize: '17px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                                    {contact.isGroup ? contact.name : contact.displayName}
                                </div>
                                {((contact.contact?.role === 'admin') || (contact.role === 'admin')) && (
                                    <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>ADMIN</span>
                                )}
                             </div>
                            <div style={{ fontSize: '13px', color: contactTyping ? '#34C759' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {contact.isGroup
                                    ? `${contact.members?.length || 0} members, ${contact.members?.filter(m => onlineUsers[m._id]?.status === 'online').length || 0} online`
                                    : (contactTyping ? 'typing...' : (isOnline ? 'online' : getOfflineStatusText()))
                                }
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: 'var(--primary)' }}>
                    <Video size={24} style={{ cursor: 'pointer' }} onClick={() => {
                        const target = contact.isGroup ? contact : { ...contact, _id: contact.userId || contact._id };
                        initiateCall(target, 'video');
                    }} />
                    <Phone size={22} style={{ cursor: 'pointer' }} onClick={() => {
                        const target = contact.isGroup ? contact : { ...contact, _id: contact.userId || contact._id };
                        initiateCall(target, 'audio');
                    }} />
                    {/* Mesh Offline P2P Control Button */}
                    <div 
                        onClick={() => setShowMeshSheet(true)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                        title="Mesh Offline P2P"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isMeshAdvertising || isMeshScanning ? "#34C759" : "var(--primary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s' }}>
                            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                            <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"/>
                            <circle cx="12" cy="12" r="2" fill={isMeshAdvertising || isMeshScanning ? "#34C759" : "var(--primary)"}/>
                        </svg>
                        {(isMeshAdvertising || isMeshScanning) && (
                            <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: '#34C759', borderRadius: '50%', border: '1px solid white' }}></span>
                        )}
                    </div>
                    <MoreVertical size={24} style={{ cursor: 'pointer', color: '#54656F' }} onClick={() => setShowChatOptions(!showChatOptions)} />

                    {showChatOptions && (
                        <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowChatOptions(false)}></div>
                            <div className="animate-fade" style={{ position: 'absolute', top: '45px', right: '8px', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-ios)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: '220px', zIndex: 100 }}>
                                <div onClick={() => { setShowChatOptions(false); onHeaderClick(); }} style={{ padding: '14px 16px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios)' }}>
                                    <Info size={20} color="var(--primary)" /> {contact.isGroup ? 'Group Info' : 'Contact Info'}
                                </div>
                                <div onClick={() => { setShowChatOptions(false); setIsSearching(true); }} style={{ padding: '14px 16px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios)' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Search
                                </div>
                                <div onClick={async () => {
                                    setShowChatOptions(false);
                                    try {
                                        const isMuted = user.settings?.mutedContacts?.includes(contact._id);
                                        let newMuted = user.settings?.mutedContacts || [];
                                        if (isMuted) newMuted = newMuted.filter(id => id !== contact._id);
                                        else newMuted = [...newMuted, contact._id];
                                        
                                        await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/profile`, {
                                            method: 'PUT',
                                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ settings: { mutedContacts: newMuted } })
                                        });
                                        window.location.reload(); // Refresh to apply mute globally
                                    } catch (err) {}
                                }} style={{ padding: '14px 16px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios)' }}>
                                    <BellOff size={20} color={user.settings?.mutedContacts?.includes(contact._id) ? '#34C759' : '#8E8E93'} /> 
                                    {user.settings?.mutedContacts?.includes(contact._id) ? 'Unmute Notifications' : 'Mute Notifications'}
                                </div>
                                <div onClick={handleExportChat} style={{ padding: '14px 16px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios)' }}>
                                    <Download size={20} /> Export Chat
                                </div>
                                <div onClick={() => { setShowChatOptions(false); setShowWallpaperModal(true); }} style={{ padding: '14px 16px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios)' }}>
                                    <Image size={20} /> Chat Wallpaper
                                </div>
                                {!contact.isGroup && (
                                    <div onClick={async () => {
                                        setShowChatOptions(false);
                                        try {
                                            const isBlocked = user.settings?.blockedContacts?.includes(contact._id);
                                            let newBlocked = user.settings?.blockedContacts || [];
                                            if (isBlocked) newBlocked = newBlocked.filter(id => id !== contact._id);
                                            else newBlocked = [...newBlocked, contact._id];
                                            
                                            // Instant optimistic UI update
                                            updateProfile({ settings: { ...user.settings, blockedContacts: newBlocked } });
                                            
                                            await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/profile`, {
                                                method: 'PUT',
                                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ settings: { blockedContacts: newBlocked } })
                                            });
                                        } catch (err) {}
                                    }} style={{ padding: '14px 16px', color: '#FF3B30', cursor: 'pointer', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios)' }}>
                                        <AlertTriangle size={20} /> {user.settings?.blockedContacts?.includes(contact._id) ? 'Unblock Contact' : 'Block Contact'}
                                    </div>
                                )}
                                <div onClick={handleClearChat} style={{ padding: '14px 16px', color: '#FF3B30', cursor: 'pointer', fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Trash2 size={20} /> Clear Chat
                                </div>
                            </div>
                        </>
                    )}
                </div>
                </>
                )}
            </div>

            {/* Pinned Message Bar */}
            {contact.isGroup && pinnedMessages.length > 0 && (
                <div
                    onClick={() => {
                        const lastPin = pinnedMessages[pinnedMessages.length - 1];
                        const el = document.getElementById(`msg-${lastPin._id || lastPin}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el?.classList.add('highlight-pin');
                        setTimeout(() => el?.classList.remove('highlight-pin'), 2000);
                    }}
                    style={{ background: '#FFF', borderBottom: '0.5px solid #C7C7CC', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', position: 'sticky', top: '0', zIndex: 90, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                >
                    <Pin size={18} color="#007AFF" style={{ transform: 'rotate(45deg)' }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#007AFF' }}>Pinned Message</div>
                        <div style={{ fontSize: '13px', color: '#54656F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {typeof pinnedMessages[pinnedMessages.length - 1] === 'object' ? pinnedMessages[pinnedMessages.length - 1].content : 'Click to view'}
                        </div>
                    </div>
                </div>
            )}


            {/* Immersive Chat Content */}
            <div className="chat-area-content" style={{ 
                padding: '12px 14px 8px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                backgroundImage: chatWallpaper ? `url(${chatWallpaper})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 24px' }}>
                    <div style={{ background: '#FFF9C4', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', color: '#111b21', textAlign: 'center', maxWidth: '85%', boxShadow: '0 1px 1px rgba(0,0,0,0.1)', border: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <span style={{ fontWeight: '700', display: 'block', marginBottom: '4px' }}>🔒 End-to-end encrypted</span>
                        Messages and calls are secured. No one outside of this chat, not even ZapChat, can read or listen to them.
                    </div>
                </div>

                {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
                    <React.Fragment key={date}>
                        <div style={{ textAlign: 'center', margin: '24px 0 16px' }}>
                            <span style={{ background: 'var(--bg-lite-grey)', padding: '5px 14px', borderRadius: '12px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', boxShadow: '0 1px 0.5px rgba(0,0,0,0.1)', letterSpacing: '0.5px' }}>
                                {date === new Date().toLocaleDateString() ? 'TODAY' : date.toUpperCase()}
                            </span>
                        </div>
                        {msgs.map((msg) => {
                            const isMe = msg.sender?._id == user?._id || msg.sender == user?._id;
                            const isVoice = msg.fileId && msg.fileMetadata?.contentType?.includes('audio');

                            if (msg.isSystem) {
                                return (
                                    <div key={msg._id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0', width: '100%' }}>
                                        <div style={{ background: 'rgba(255, 249, 196, 0.7)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', color: '#54656f', textAlign: 'center', boxShadow: '0 1px 0.5px rgba(0,0,0,0.1)' }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={msg._id}
                                    id={`msg-${msg._id}`}
                                    className={`bubble-row ${isMe ? 'sent' : 'received'} animate-message`}
                                    onContextMenu={(e) => onMessageLongPress(e, msg._id)}
                                    onClick={() => isSelectionMode ? toggleSelection(msg._id) : null}
                                    style={{
                                        marginBottom: '3px',
                                        padding: isSelectionMode ? '3px 0' : '0',
                                        background: selectedMsgIds.has(msg._id) ? 'rgba(0,122,255,0.1)' : 'transparent',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                        width: '100%',
                                        justifyContent: isMe ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <div className="pill-bubble" style={{
                                        position: 'relative',
                                        borderBottomRightRadius: isMe ? '4px' : '16px',
                                        borderBottomLeftRadius: isMe ? '16px' : '4px',
                                        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                        padding: (msg.type === 'image' || msg.type === 'video' || msg.type === 'location') ? '6px' : '8px 12px 6px'
                                    }}>
                                        {contact.isGroup && !isMe && msg.sender && (
                                            <div style={{ fontWeight: '700', fontSize: '13px', color: '#007AFF', marginBottom: '4px', cursor: 'pointer' }}>
                                                {msg.sender?.displayName || 'Participant'}
                                            </div>
                                        )}
                                        {msg.replyTo && (
                                            <div 
                                                onClick={() => {
                                                    const el = document.getElementById(`msg-${msg.replyTo._id || msg.replyTo}`);
                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }}
                                                style={{ background: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '8px', marginBottom: '8px', borderLeft: '4px solid #007AFF', cursor: 'pointer', transition: 'background 0.2s' }}
                                            >
                                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#007AFF', marginBottom: '2px' }}>{msg.replyTo.sender?.displayName || 'User'}</div>
                                                <div style={{ fontSize: '12px', color: isMe ? 'rgba(0,0,0,0.6)' : '#667781', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.replyTo.content || 'Media Message'}</div>
                                            </div>
                                        )}
                                        {/* Status / Story Reply Preview Header */}
                                        {(msg.content && (msg.content.includes('(Reply to status)') || msg.content.includes('Reacted ') && msg.content.includes('to status') || msg.content.includes('Voice reply to status') || msg.content.includes('🎤 Voice reply to status'))) && (
                                            <div style={{ 
                                                background: isMe ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)', 
                                                borderRadius: '8px', 
                                                padding: '8px 10px', 
                                                marginBottom: '8px', 
                                                borderLeft: '4px solid #007AFF',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                backdropFilter: 'blur(5px)',
                                                border: '1.5px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '6px',
                                                    background: 'linear-gradient(135deg, #007AFF 0%, #00C6FF 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#FFF',
                                                    flexShrink: 0
                                                }}>
                                                    <Sparkles size={14} color="#FFF" />
                                                </div>
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#007AFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Update</div>
                                                    <div style={{ fontSize: '12px', color: isMe ? 'rgba(255,255,255,0.7)' : '#54656F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                                                        {isMe ? 'You replied to status' : `${contact.displayName || 'User'}'s status`}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {msg.type === 'image' || msg.type === 'video' ? (
                                            <div style={{ margin: '-6px -10px', overflow: 'hidden', borderRadius: '12px' }}>
                                                <div style={{ position: 'relative', background: '#d1d7db', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '260px', height: '260px' }}>
                                                    {(!isMe && !downloadedMediaIds.has(msg._id)) ? (
                                                        <div style={{ position: 'absolute', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                            <div onClick={(e) => { e.stopPropagation(); handleMediaDownload(msg._id, msg.fileId, msg.fileMetadata?.filename); }} style={{ width: '54px', height: '54px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(5px)' }}>
                                                                {downloadingIds.has(msg._id) ? <Loader2 size={26} className="animate-spin" /> : <Download size={26} />}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    {(isMe || downloadedMediaIds.has(msg._id)) ? (
                                                        msg.type === 'video' ? (
                                                            <video
                                                                onClick={(e) => { e.stopPropagation(); setViewingMedia({ type: 'video', url: msg.fileId ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + msg.fileId + "?token=" + localStorage.getItem('token') : msg.content }); }}
                                                                src={msg.fileId ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + msg.fileId + "?token=" + localStorage.getItem('token') : msg.content}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                            />
                                                        ) : (
                                                            <img
                                                                onClick={(e) => { e.stopPropagation(); setViewingMedia({ type: 'image', url: msg.fileId ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + msg.fileId + "?token=" + localStorage.getItem('token') : msg.content }); }}
                                                                src={msg.fileId ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + msg.fileId + "?token=" + localStorage.getItem('token') : msg.content}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                alt="media"
                                                            />
                                                        )
                                                    ) : (
                                                        <div style={{ filter: 'blur(15px)', width: '100%', height: '100%', opacity: 0.6 }}></div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (msg.type === 'location' || msg.type === 'live_location' || (msg.content && typeof msg.content === 'string' && /^-?\d+\.\d+,-?\d+\.\d+$/.test(msg.content.trim()))) ? (() => {
                                            const [lat, lon] = (msg.content || '0,0').split(',').map(Number);
                                            const isLive = msg.type === 'live_location';
                                            const isExpired = isLive && msg.expiresAt && new Date() > new Date(msg.expiresAt);
                                            const isDownloaded = isMe || downloadedMediaIds.has(msg._id);

                                            const tileZoom = 14;
                                                                      const tileY = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, tileZoom));
                                            const pinAvatarSrc = isMe 
                                                ? (user?.profilePicture 
                                                    ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token') 
                                                    : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(user?.displayName || 'Me') + "&background=random&color=fff") 
                                                : (contact?.profilePicture 
                                                    ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + contact.profilePicture + "?token=" + localStorage.getItem('token') 
                                                    : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(contact?.displayName || 'User') + "&background=random&color=fff");

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', width: '260px', borderRadius: '14px', overflow: 'hidden', background: isMe ? 'var(--bg-grey)' : '#fff', border: isMe ? 'none' : '0.5px solid rgba(0,0,0,0.08)' }}>
                                                    {/* Map thumbnail / Download Placeholder */}
                                                    <div style={{ position: 'relative', width: '260px', height: '130px', background: '#e8f0fe', overflow: 'hidden' }}>
                                                        {!isDownloaded ? (
                                                            <div
                                                                onClick={(e) => { e.stopPropagation(); handleMediaDownload(msg._id); }}
                                                                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.05)', backdropFilter: 'blur(10px)' }}
                                                            >
                                                                <div style={{ width: '50px', height: '50px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                                    {downloadingIds.has(msg._id) ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                                                                </div>
                                                                <span style={{ position: 'absolute', bottom: '10px', fontSize: '11px', fontWeight: '700', color: isMe ? 'var(--text-main)' : '#54656f', background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: '10px' }}>Tap to download map</span>
                                                            </div>
                                                        ) : (
                                                            <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none' }}>
                                                                <img
                                                                    src={`https://tile.openstreetmap.org/${tileZoom}/${tileX}/${tileY}.png`}
                                                                    alt="map"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                                />
                                                                {isLive && !isExpired && (
                                                                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'white', borderRadius: '12px', padding: '3px 8px', fontSize: '11px', fontWeight: '700', color: '#007AFF', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                                                                        <div style={{ width: '6px', height: '6px', background: '#34C759', borderRadius: '50%' }}></div>
                                                                        LIVE
                                                                    </div>
                                                                )}
                                                                {/* Profile pin overlay */}
                                                                <div style={{ position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', background: '#007AFF' }}>
                                                                        <img src={pinAvatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                                    </div>
                                                                    <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid white', marginTop: '-1px' }}></div>
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                    {/* Card body */}
                                                    <div style={{ padding: '10px 14px 4px', background: isMe ? 'var(--bg-grey)' : '#fff' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                            <MapPin size={14} color={isLive && !isExpired ? '#34C759' : '#007AFF'} fill={isLive && !isExpired ? '#34C759' : 'none'} />
                                                            <span style={{ fontWeight: '700', fontSize: '14px', color: isMe ? 'var(--text-main)' : '#000' }}>
                                                                {isLive ? (isExpired ? 'Live location ended' : 'Live location') : 'Current location'}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: isMe ? 'var(--text-muted)' : '#667781', marginBottom: '8px', paddingLeft: '20px' }}>
                                                            {isLive && !isExpired ? 'Updated just now' : (isLive ? 'Sharing ended' : 'Tap to download map')}
                                                        </div>
                                                        {isLive && !isExpired && isDownloaded && (
                                                            <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#007AFF', padding: '8px 0', borderTop: `0.5px solid ${isMe ? 'var(--border-ios)' : 'rgba(0,0,0,0.08)'}`, textDecoration: 'none', marginTop: '2px' }}>
                                                                View live location
                                                            </a>
                                                        )}
                                                        {isLive && !isExpired && isMe && (
                                                            <div onClick={() => handleStopLiveLocation(msg._id)} style={{ textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#FF3B30', padding: '8px 0', borderTop: `0.5px solid var(--border-ios)`, cursor: 'pointer' }}>
                                                                Stop sharing
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()
                                            : msg.type === 'contact' ? (
                                                <div style={{ width: '230px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '12px' }}>
                                                        <div style={{ width: '48px', height: '48px', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <UserIcon size={26} color="#007AFF" />
                                                        </div>
                                                        <div style={{ fontWeight: '700', fontSize: '17px' }}>{msg.content.split('|')[0]}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', borderTop: '0.5px solid rgba(0,0,0,0.1)', marginTop: '4px' }}>
                                                        <button onClick={() => handleMessageSharedContact(msg.content.split('|')[1], msg.content.split('|')[0])} style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: isMe ? 'var(--text-main)' : '#007AFF', fontWeight: '700', fontSize: '15px' }}>Message</button>
                                                        <div style={{ width: '0.5px', background: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', margin: '8px 0' }}></div>
                                                        <button onClick={() => addSharedContact(msg.content.split('|')[1])} style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: isMe ? 'var(--text-main)' : '#007AFF', fontWeight: '700', fontSize: '15px' }}>Add Contact</button>
                                                    </div>
                                                </div>
                                            ) : msg.type === 'call' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '6px 0', width: '210px' }}>
                                                    <div style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '50%',
                                                        background: msg.content.includes('Missed') ? 'rgba(255, 59, 48, 0.1)' : (isMe ? 'var(--bg-lite-grey)' : 'rgba(0, 122, 255, 0.1)'),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: isMe ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                                    }}>
                                                        {msg.content.includes('Video') ? (
                                                            msg.content.includes('Missed') ? <Video size={22} color="#FF3B30" /> : (isMe ? <Video size={22} color="#007AFF" /> : <Video size={22} color="#007AFF" />)
                                                        ) : (
                                                            msg.content.includes('Missed') ? <PhoneMissed size={22} color="#FF3B30" /> : (isMe ? <PhoneOutgoing size={22} color="#007AFF" /> : <PhoneIncoming size={22} color="#007AFF" />)
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '700', fontSize: '16px', color: isMe ? 'var(--text-main)' : '#000', marginBottom: '1px' }}>
                                                            {msg.content.includes('Missed')
                                                                ? (isMe ? 'Not Responding' : `Missed ${msg.content.includes('Video') ? 'Video' : 'Voice'} Call`)
                                                                : (msg.content.includes('Video') ? 'Video Call' : 'Voice Call')}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: isMe ? 'var(--text-muted)' : '#667781', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {msg.content.match(/\((.*?)\)/)?.[1] || '0:00'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : isVoice ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '270px', padding: '4px 0' }}>
                                                    <div
                                                        onClick={() => handlePlayVoice(msg._id, msg.fileId)}
                                                        style={{ width: '42px', height: '42px', background: playingMsgId === msg._id ? (isMe ? '#4da2ff' : '#007AFF') : (isMe ? '#5C6BC0' : '#54656F'), borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexShrink: 0, transition: 'all 0.2s' }}
                                                    >
                                                        {downloadingIds.has(msg.fileId) ? (
                                                            <Loader2 size={24} color="#FFFFFF" className="animate-spin" />
                                                        ) : (!audioCacheRef.current[msg.fileId] && !cachedFileIds.has(msg.fileId)) ? (
                                                            <Download size={24} color="#FFFFFF" strokeWidth={2.5} />
                                                        ) : playingMsgId === msg._id ? (
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                <div style={{ width: '4px', height: '16px', background: '#FFF', borderRadius: '2px' }}></div>
                                                                <div style={{ width: '4px', height: '16px', background: '#FFF', borderRadius: '2px' }}></div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '13px solid #FFF', marginLeft: '4px' }}></div>
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ height: '28px', position: 'relative', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                            {[12, 18, 14, 22, 16, 20, 14, 18, 12, 16, 12, 20, 18, 14].map((h, i) => (
                                                                <div key={i} style={{ flex: 1, height: `${h}px`, background: (playingMsgId === msg._id && (i / 14) < (playbackInfo.currentTime / playbackInfo.duration)) ? (isMe ? '#FFF' : '#007AFF') : 'rgba(0,0,0,0.15)', borderRadius: '2px' }}></div>
                                                            ))}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-2px' }}>
                                                            <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.8 }}>
                                                                {(!audioCacheRef.current[msg.fileId] && !cachedFileIds.has(msg.fileId)) ? 'Download' : (playingMsgId === msg._id ? formatTime(Math.floor(playbackInfo.currentTime)) : '0:00')}
                                                            </span>
                                                            {msg.fileMetadata?.size && (
                                                                <span style={{ fontSize: '10px', fontWeight: '700', opacity: 0.8 }}>
                                                                    {(msg.fileMetadata.size / 1024).toFixed(1)} KB
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ position: 'relative', flexShrink: 0, marginLeft: '4px' }}>
                                                        <img
                                                            src={isMe ? (user.profilePicture ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token') : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(user.displayName || '') + "&background=random&color=fff") : (contact.profilePicture ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + contact.profilePicture + "?token=" + localStorage.getItem('token') : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(contact.displayName || '') + "&background=random&color=fff")}
                                                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid white' }}
                                                            alt=""
                                                        />
                                                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#FFF', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                                            <Mic size={11} color={msg.status === 'played' ? '#34B7F1' : (isMe ? '#007AFF' : '#54656F')} fill={msg.status === 'played' ? '#34B7F1' : 'none'} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : msg.type === 'file' ? (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    width: '280px',
                                                    background: isMe ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.03)',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    border: isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.05)'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '10px 12px',
                                                        background: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.02)',
                                                        borderBottom: isMe ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(0,0,0,0.05)'
                                                    }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            background: isMe ? 'rgba(255,255,255,0.2)' : '#F0F2F5',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            position: 'relative',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {msg.fileMetadata?.contentType?.startsWith('image') ? (
                                                                <img
                                                                    src={(import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + msg.fileId + "?token=" + localStorage.getItem('token')}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    alt=""
                                                                />
                                                            ) : msg.fileMetadata?.contentType?.startsWith('video') ? (
                                                                <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Play size={14} color="#FFF" fill="#FFF" />
                                                                </div>
                                                            ) : (
                                                                <FileText size={22} color="#007AFF" />
                                                            )}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontSize: '14px',
                                                                fontWeight: '600',
                                                                color: '#111b21',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {msg.fileMetadata?.filename || msg.content}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#667781', marginTop: '1px' }}>
                                                                {msg.fileMetadata?.size ? ((msg.fileMetadata.size / 1024).toFixed(1) + " KB") : 'File'} • {msg.fileMetadata?.filename?.split('.').pop()?.toUpperCase() || 'DOCUMENT'}
                                                            </div>
                                                        </div>
                                                        {/* Download Button Logic: Hide if already downloaded (for both User and Admin) */}
                                                        {((!isMe && user.role !== 'admin' && !isAdmin && !downloadedMediaIds.has(msg._id)) || ((user.role === 'admin' || isAdmin) && !downloadedMediaIds.has(msg._id))) && (
                                                            <div 
                                                                onClick={(e) => { e.stopPropagation(); handleMediaDownload(msg._id, msg.fileId, msg.fileMetadata?.filename); }}
                                                                style={{ 
                                                                    width: '32px', 
                                                                    height: '32px', 
                                                                    borderRadius: '50%', 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    justifyContent: 'center', 
                                                                    cursor: 'pointer',
                                                                    background: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                                                                    color: isMe ? '#FFF' : '#54656F',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                className="hover-scale"
                                                            >
                                                                {downloadingIds.has(msg._id) ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Preview Area for certain file types */}
                                                    {(msg.fileMetadata?.contentType?.startsWith('image') || msg.fileMetadata?.contentType?.startsWith('video')) && (
                                                        <div style={{ height: '140px', width: '100%', position: 'relative', background: '#000' }}>
                                                            <img
                                                                src={(import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + msg.fileId + "?token=" + localStorage.getItem('token')}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                                                                alt=""
                                                            />
                                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (() => {
                                                const isReaction = msg.content && msg.content.startsWith('Reacted ') && msg.content.includes('to status');
                                                
                                                if (isReaction) {
                                                    const emojiMatch = msg.content.match(/Reacted (.*?) to status/);
                                                    const emoji = emojiMatch ? emojiMatch[1] : '👍';
                                                    return (
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            flexDirection: 'column', 
                                                            alignItems: 'center', 
                                                            padding: '10px 0 6px', 
                                                            width: '200px' 
                                                        }}>
                                                            <div style={{ 
                                                                fontSize: '12px', 
                                                                color: isMe ? 'rgba(255,255,255,0.7)' : '#8E8E93', 
                                                                fontWeight: '700', 
                                                                marginBottom: '6px',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px'
                                                            }}>
                                                                Quick Reaction
                                                            </div>
                                                            <div style={{ 
                                                                fontSize: '44px', 
                                                                animation: 'popEmoji 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                                                                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                                                                lineHeight: '1.2'
                                                            }}>
                                                                {emoji}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                
                                                const cleanContent = msg.content
                                                    ? msg.content.replace(' (Reply to status)', '')
                                                    : '';
                                                    
                                                return (
                                                    <span style={{ 
                                                        display: 'block', 
                                                        fontSize: (user?.settings?.fontSize || 16.5) + "px", 
                                                        lineHeight: '1.4', 
                                                        letterSpacing: '-0.2px',
                                                        color: 'inherit'
                                                    }}>
                                                        {cleanContent}
                                                    </span>
                                                );
                                            })()}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: '600' }}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {msg.starredBy?.includes(user._id) && <Star size={11} color="#FF9500" fill="#FF9500" />}
                                            {msg.isPinned && <Pin size={11} color="#8E8E93" style={{ transform: 'rotate(45deg)' }} />}
                                            {isMe && (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    {msg.status === 'pending' ? (
                                                        <Clock size={11} color="#8E8E93" />
                                                    ) : msg.status === 'mesh_delivered' ? (
                                                        <span style={{ fontSize: '11px', color: '#34C759', display: 'flex', alignItems: 'center' }}>📡</span>
                                                    ) : msg.status === 'read' ? (
                                                        <CheckCheck size={16} color="#34B7F1" />
                                                    ) : msg.status === 'delivered' ? (
                                                        <CheckCheck size={16} color="#8E8E93" />
                                                    ) : (
                                                        <Check size={16} color="#8E8E93" />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {msg.reactions?.length > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '-10px',
                                                [isMe ? 'left' : 'right']: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                background: 'white',
                                                borderRadius: '20px',
                                                padding: '2px 6px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                                border: '0.5px solid rgba(0,0,0,0.08)',
                                                zIndex: 5,
                                                cursor: 'default',
                                                pointerEvents: 'none'
                                            }}>
                                                {[...new Set(msg.reactions.map(r => r.emoji))].slice(0, 3).map((emoji, idx) => (
                                                    <span key={idx} style={{ fontSize: '14px', lineHeight: '1' }}>{emoji}</span>
                                                ))}
                                                {msg.reactions.length > 1 && (
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#8E8E93', marginLeft: '2px' }}>
                                                        {msg.reactions.length}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {isSelectionMode && (
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2.5px solid #C7C7CC', background: selectedMsgIds.has(msg._id) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '12px' }}>
                                            {selectedMsgIds.has(msg._id) && <Check size={16} color="#FFF" strokeWidth={5} />}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Exactly Replicated iOS Input Bar */}
            <div style={{
                padding: '10px 12px 10px',
                background: '#F6F6F6',
                borderTop: '0.5px solid #C7C7CC',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
                position: 'relative',
                zIndex: 110
            }}>
                {user.settings?.blockedContacts?.includes(contact._id) ? (
                    <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '12px', color: '#FF3B30', fontSize: '15px', fontWeight: '600' }}>
                        You blocked this contact. Tap the top menu to unblock.
                    </div>
                ) : isMessagingRestricted || isAnnouncementOnly ? (
                    <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '12px', color: '#8E8E93', fontSize: '14px', fontWeight: '500' }}>
                        Only admins can send messages
                    </div>
                ) : isSelectionMode ? (
                    <div className="animate-slide-up" style={{ flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: '28px', height: '54px', border: '0.5px solid #C7C7CC', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <Trash2 size={26} color="#FF3B30" onClick={() => {
                            if (selectedMsgIds.size === 0) return;
                            const canEveryone = Array.from(selectedMsgIds).every(id => {
                                const m = messages.find(msg => String(msg._id) === String(id));
                                return user.role === 'admin' || m?.sender?._id === user._id || m?.sender === user._id;
                            });
                            setCanDeleteForEveryone(canEveryone);
                            setDeleteOption('me');
                            setShowDeleteModal(true);
                        }} style={{ cursor: 'pointer' }} />
                        <Copy size={26} color="#007AFF" onClick={handleCopySelected} style={{ cursor: 'pointer' }} />
                        {allowForward && <Forward size={26} color="#007AFF" onClick={handleForwardSelected} style={{ cursor: 'pointer' }} />}
                        {allowForward && <Share2 size={26} color="#007AFF" onClick={handleShareSelected} style={{ cursor: 'pointer' }} />}
                        <span onClick={() => { setIsSelectionMode(false); setSelectedMsgIds(new Set()); }} style={{ fontWeight: '600', color: '#007AFF', cursor: 'pointer', fontSize: '18px', paddingRight: '8px' }}>Done</span>
                    </div>
                ) : isRecording ? (
                    <div className="animate-slide-up" style={{ display: 'flex', alignItems: 'center', flex: 1, background: '#F2F2F7', borderRadius: '24px', padding: '4px 6px', height: '48px', border: '0.5px solid #C7C7CC', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div onClick={() => { isCancelledRef.current = true; if (mediaRecorderRef.current) mediaRecorderRef.current.stop(); setIsRecording(false); setIsPaused(false); }} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, borderRadius: '50%', transition: 'background 0.2s' }}>
                            <Trash2 size={22} color="#8E8E93" />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', height: '24px' }}>
                            <div className={"online-pulse " + (isPaused ? 'paused-animation' : '')} style={{ width: '8px', height: '8px', background: '#FF3B30', borderRadius: '50%', flexShrink: 0, boxShadow: '0 0 4px rgba(255,59,48,0.5)' }}></div>
                            <span style={{ fontSize: '15px', fontWeight: '500', color: '#000', minWidth: '42px', fontVariantNumeric: 'tabular-nums' }}>{formatTime(recordingDuration)}</span>
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '0 8px' }}>
                            {[...Array(25)].map((_, i) => {
                                const h = [4, 8, 6, 12, 16, 10, 8, 14, 18, 12, 8, 16, 20, 14, 10, 16, 22, 18, 12, 8, 14, 10, 8, 6, 4][i];
                                return (
                                    <div key={i} className={"voice-pulse " + (isPaused ? 'paused-animation' : '')} style={{ flex: 1, maxWidth: '3px', height: h + "px", background: isPaused ? '#C7C7CC' : '#007AFF', borderRadius: '2px', opacity: isPaused ? 0.5 : 0.8, animationDelay: (i * 0.05).toFixed(2) + "s", transition: 'background 0.3s' }} />
                                )
                            })}
                        </div>

                        <div onClick={handleTogglePause} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, borderRadius: '50%' }}>
                            {isPaused ? <Mic size={22} color="#007AFF" /> : <Pause size={22} color="#FF3B30" />}
                        </div>

                        <div onClick={handleMicClick} style={{ width: '36px', height: '36px', background: '#007AFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: '4px', boxShadow: '0 2px 8px rgba(0,122,255,0.3)' }}>
                            <Send size={18} color="#FFF" style={{ marginLeft: '2px' }} />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Reply UI */}
                        {replyingTo && (
                            <div className="animate-slide-up" style={{ position: 'absolute', bottom: '100%', left: '0', right: '0', background: '#F0F2F5', padding: '8px 16px', borderTop: '1px solid #E5E5EA', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
                                <div style={{ borderLeft: '4px solid #007AFF', paddingLeft: '8px', flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#007AFF' }}>{replyingTo.sender?.displayName || 'User'}</div>
                                    <div style={{ fontSize: '13px', color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyingTo.content}</div>
                                </div>
                                <div onClick={() => setReplyingTo(null)} style={{ cursor: 'pointer', color: '#8E8E93' }}>
                                    <X size={18} />
                                </div>
                            </div>
                        )}
                        {allowEmojis && <Smile size={28} color="#007AFF" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setShowEmojiPicker(!showEmojiPicker)} />}
                        <div style={{ flex: 1, background: '#F2F2F7', borderRadius: '24px', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '48px', border: '0.5px solid #C7C7CC', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
                            <textarea disabled={!allowText} placeholder={allowText ? "Type a message..." : "Text messages disabled"} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '16px', color: '#000', resize: 'none', maxHeight: '150px', lineHeight: '22px', padding: '2px 0', fontFamily: 'inherit' }} rows={1} value={newMessage} onChange={(e) => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; if (contact) { socket?.emit('typing', { recipientId: contact._id }); clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = setTimeout(() => socket?.emit('stop_typing', { recipientId: contact._id }), 2000); } }} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} />
                            {(allowMedia || allowFiles) && <Paperclip size={22} color="#8E8E93" style={{ cursor: 'pointer', transform: 'rotate(45deg)', flexShrink: 0 }} onClick={() => setShowAttachMenu(!showAttachMenu)} />}
                            {allowMedia && <Camera size={22} color="#8E8E93" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={startCamera} />}
                        </div>
                        {allowVoice || newMessage.trim() ? (
                            <div
                                onClick={newMessage.trim() ? handleSend : (allowVoice ? handleMicClick : null)}
                                onContextMenu={(e) => {
                                    if (isAdmin && newMessage.trim()) {
                                        e.preventDefault();
                                        setShowScheduleModal(true);
                                    }
                                }}
                                style={{ width: '44px', height: '44px', background: newMessage.trim() || allowVoice ? '#007AFF' : '#C7C7CC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() || allowVoice ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.2s', paddingLeft: newMessage.trim() ? '2px' : '0' }}
                            >
                                {newMessage.trim() ? <Send size={22} color="#FFF" /> : <Mic size={22} color="#FFF" />}
                            </div>
                        ) : null}
                    </>
                )}
            </div>

            {/* Emoji Bottom Sheet (iOS Style) */}
            {showEmojiPicker && (
                <>
                    {/* Backdrop */}
                    <div 
                        onClick={() => setShowEmojiPicker(false)}
                        className="animate-pure-fade"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            zIndex: 140
                        }}
                    />
                    
                    {/* Bottom Sheet */}
                    <div 
                        className="animate-slide-up"
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '420px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
                            borderTop: '0.5px solid rgba(0,0,0,0.1)',
                            zIndex: 150,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        {/* iOS Drag Handle */}
                        <div style={{ width: '36px', height: '5px', borderRadius: '3px', background: 'rgba(0,0,0,0.12)', margin: '8px auto 4px', flexShrink: 0 }} />
                        
                        {/* Sheet Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 16px 8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '13px', color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Media & Emojis</span>
                            <div onClick={() => setShowEmojiPicker(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'background 0.2s' }} className="hover-bg"><X size={16} color="#8E8E93" /></div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                            <MediaPicker 
                                onEmojiClick={insertEmoji} 
                                onGifClick={(url) => { handleSendMedia(url, 'gif'); setShowEmojiPicker(false); }} 
                                onStickerClick={(url) => { handleSendMedia(url, 'sticker'); setShowEmojiPicker(false); }} 
                                isBottomSheet={true} 
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Attachment Bottom Sheet (iOS Share Sheet Style) */}
            {showAttachMenu && (
                <>
                    {/* Backdrop */}
                    <div 
                        onClick={() => setShowAttachMenu(false)}
                        className="animate-pure-fade"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            zIndex: 140
                        }}
                    />
                    
                    {/* Bottom Sheet */}
                    <div 
                        className="animate-slide-up"
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(246, 246, 246, 0.94)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
                            borderTop: '0.5px solid rgba(0,0,0,0.1)',
                            zIndex: 150,
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px 16px 34px',
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* iOS Drag Handle */}
                        <div style={{ width: '36px', height: '5px', borderRadius: '3px', background: 'rgba(0,0,0,0.12)', margin: '0 auto 12px', flexShrink: 0 }} />

                        {/* Sheet Header with Name & Close Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0px 12px', flexShrink: 0 }}>
                            <span style={{ fontSize: '13px', color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Share</span>
                            <div 
                                onClick={() => setShowAttachMenu(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.05)',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                className="hover-bg"
                            >
                                <X size={16} color="#8E8E93" />
                            </div>
                        </div>

                        {/* Action Items List */}
                        <div style={{ 
                            background: '#FFFFFF', 
                            borderRadius: '14px', 
                            overflow: 'hidden', 
                            display: 'flex', 
                            flexDirection: 'column',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            {[
                                { icon: FileText, label: 'Document', color: '#007AFF', onClick: () => { setShowAttachMenu(false); docInputRef.current?.click(); }, show: allowFiles },
                                { icon: Camera, label: 'Camera', color: '#FF2D55', onClick: () => { setShowAttachMenu(false); startCamera(); }, show: allowMedia },
                                { icon: Image, label: 'Photo & Video Library', color: '#5856D6', onClick: () => { setShowAttachMenu(false); galleryInputRef.current?.click(); }, show: allowMedia },
                                { icon: Mic, label: 'Audio', color: '#FF9500', onClick: () => { setShowAttachMenu(false); audioInputRef.current?.click(); }, show: allowVoice },
                                { icon: MapPin, label: 'Location', color: '#34C759', onClick: () => { setShowAttachMenu(false); handleLocationOptionClick(); }, show: true },
                                { icon: UserIcon, label: 'Contact', color: '#5AC8FA', onClick: () => { setShowAttachMenu(false); handleContactClick(); }, show: true },
                            ].filter(opt => opt.show !== false).map((opt, i, arr) => (
                                <div 
                                    key={i} 
                                    onClick={opt.onClick}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '14px', 
                                        padding: '14px 16px', 
                                        cursor: 'pointer',
                                        background: '#FFFFFF',
                                        borderBottom: i === arr.length - 1 ? 'none' : '0.5px solid #E5E5EA',
                                        transition: 'background 0.15s ease'
                                    }}
                                    className="hover-bg"
                                >
                                    <div style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        borderRadius: '8px', 
                                        background: opt.color, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                                    }}>
                                        <opt.icon size={18} color="white" />
                                    </div>
                                    <span style={{ fontSize: '17px', color: '#000000', fontWeight: '500', flex: 1 }}>{opt.label}</span>
                                    <ChevronRight size={18} color="#C7C7CC" />
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Hidden File Inputs */}
            <input type="file" ref={wallpaperInputRef} accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                if (e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        localStorage.setItem('wallpaper_' + contact._id, reader.result);
                        setChatWallpaper(reader.result);
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
                e.target.value = '';
            }} />
            <input type="file" ref={docInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleAttachmentUpload(e.target.files[0], 'file'); e.target.value = ''; }} />
            <input type="file" ref={galleryInputRef} accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => { 
                if (e.target.files[0]) {
                    setMediaPreview({ file: e.target.files[0], type: e.target.files[0].type.startsWith('video') ? 'video' : 'image', url: URL.createObjectURL(e.target.files[0]) });
                    setMediaCaption('');
                }
                e.target.value = ''; 
            }} />
            <input type="file" ref={cameraInputRef} accept="image/*,video/*" capture="environment" style={{ display: 'none' }} onChange={(e) => { 
                if (e.target.files[0]) {
                    setMediaPreview({ file: e.target.files[0], type: e.target.files[0].type.startsWith('video') ? 'video' : 'image', url: URL.createObjectURL(e.target.files[0]) });
                    setMediaCaption('');
                }
                e.target.value = ''; 
            }} />
            <input type="file" ref={audioInputRef} accept="audio/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) handleAttachmentUpload(e.target.files[0], 'audio'); e.target.value = ''; }} />

            {/* Contact Picker Modal */}
            {showContactPicker && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowContactPicker(false)}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '300px', padding: '20px' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>Select Contact</h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {availableContacts.map((u, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', cursor: 'pointer', borderRadius: '8px' }}
                                    onClick={() => handleContactShare(u)}
                                >
                                    <img src={u.profilePicture ? (u.profilePicture.startsWith('http') ? u.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + u.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(u.displayName || '') + "&background=random&color=fff"} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
                                    <span style={{ fontWeight: '500', color: '#000' }}>{u.displayName}</span>
                                </div>
                            ))}
                            {availableContacts.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#888', fontSize: '14px', margin: '20px 0' }}>No saved contacts found. Add contacts first.</div>
                            )}
                        </div>
                        <button style={{ width: '100%', padding: '12px', marginTop: '16px', background: '#F2F2F7', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#000' }} onClick={() => setShowContactPicker(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Media Preview Modal */}
            {mediaPreview && (
                <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
                    {/* Top Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }}>
                        <X size={28} color="#FFF" style={{ cursor: 'pointer' }} onClick={() => setMediaPreview(null)} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#FFF' }}>
                            {/* Editor Icons Placeholders */}
                            <RotateCcw size={22} style={{ cursor: 'pointer' }} />
                            <Crop size={22} style={{ cursor: 'pointer' }} />
                            <Wand2 size={22} style={{ cursor: 'pointer' }} />
                            <PenTool size={22} style={{ cursor: 'pointer' }} />
                            <Smile size={22} style={{ cursor: 'pointer' }} />
                            <span style={{ fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'serif' }}>T</span>
                        </div>
                    </div>

                    {/* Media Container */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {mediaPreview.type === 'video' ? (
                            <video src={mediaPreview.url} controls style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} autoPlay loop />
                        ) : (
                            <img src={mediaPreview.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        )}
                    </div>

                    {/* Bottom Bar (Caption & Send) */}
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                        <div style={{ flex: 1, background: '#2C2C2E', borderRadius: '24px', display: 'flex', alignItems: 'center', padding: '10px 16px' }}>
                            <MessageSquare size={20} color="rgba(255,255,255,0.5)" style={{ marginRight: '10px' }} />
                            <input 
                                type="text" 
                                placeholder="Add a caption..." 
                                value={mediaCaption}
                                onChange={(e) => setMediaCaption(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: '#FFF', fontSize: '15px', outline: 'none', width: '100%' }}
                                autoFocus
                            />
                        </div>
                        <div 
                            onClick={async () => {
                                if (isUploadingMedia) return;
                                setIsUploadingMedia(true);
                                await handleAttachmentUpload(mediaPreview.file, mediaPreview.type, mediaCaption);
                                setIsUploadingMedia(false);
                                setMediaPreview(null);
                            }}
                            style={{ width: '48px', height: '48px', borderRadius: '50%', background: isUploadingMedia ? '#8E8E93' : '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isUploadingMedia ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                        >
                            {isUploadingMedia ? (
                                <Loader2 size={20} color="#FFF" style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Send size={20} color="#FFF" style={{ marginLeft: '4px' }} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Send Location Modal - Exact Reference Design */}
            {showLocationPicker && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }} onClick={() => { setShowLocationPicker(false); setShowLiveDurations(false); }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.3s ease' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: '#000' }}>
                                {showLiveDurations ? 'Share Live Location' : 'Send Location'}
                            </span>
                            <div onClick={() => { setShowLocationPicker(false); setShowLiveDurations(false); }} style={{ cursor: 'pointer', color: '#007AFF', fontWeight: '600', fontSize: '16px' }}>✕</div>
                        </div>

                        {!showLiveDurations ? (
                            /* ── MAIN OPTIONS VIEW ── */
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {/* Option 1: Send Current Location */}
                                <div onClick={handleSendCurrentLocation} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <MapPin size={24} color='#25D366' fill='#25D366' />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>Send Current Location</div>
                                        <div style={{ fontSize: '13px', color: '#667781', marginTop: '2px' }}>Accurate to 16 meters</div>
                                    </div>
                                </div>

                                {/* Option 2: Share Live Location */}
                                <div onClick={() => setShowLiveDurations(true)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="#2196F3" /><circle cx="12" cy="12" r="7" stroke="#2196F3" strokeWidth="2" fill="none" opacity="0.5" /><circle cx="12" cy="12" r="11" stroke="#2196F3" strokeWidth="1.5" fill="none" opacity="0.2" /></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>Share Live Location</div>
                                        <div style={{ fontSize: '13px', color: '#667781', marginTop: '2px' }}>Update in real-time</div>
                                    </div>
                                </div>

                                {/* Option 3: Choose on Map */}
                                <div onClick={() => { setShowLocationPicker(false); setShowMapPicker(true); }} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#2196F3" strokeWidth="2" /><line x1="12" y1="3" x2="12" y2="21" stroke="#2196F3" strokeWidth="2" /><line x1="3" y1="12" x2="21" y2="12" stroke="#2196F3" strokeWidth="2" /><circle cx="12" cy="12" r="2" fill="#2196F3" /></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>Choose on Map</div>
                                        <div style={{ fontSize: '13px', color: '#667781', marginTop: '2px' }}>Pick a location on map</div>
                                    </div>
                                </div>

                                {/* Nearby Places */}
                                {!loadingPlaces && nearbyPlaces.length > 0 && (
                                    <>
                                        <div style={{ background: '#f6f6f6', padding: '10px 20px 6px', fontSize: '12px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nearby Places</div>
                                        {nearbyPlaces.map(place => (
                                            <div key={place.id} onClick={() => handleSendPlaceLocation(place)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{place.icon}</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: '500', fontSize: '15px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#667781', textTransform: 'capitalize' }}>{place.type.replace(/_/g, ' ')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                                {loadingPlaces && (
                                    <div style={{ padding: '24px', textAlign: 'center', color: '#667781', fontSize: '14px' }}>
                                        <div style={{ width: '20px', height: '20px', border: '2px solid #007AFF', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }}></div>
                                        Finding nearby places...
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ── LIVE LOCATION DURATION VIEW ── */
                            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Duration pill buttons */}
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {[{ label: '15 min', val: 15 }, { label: '1 hour', val: 60 }, { label: '8 hours', val: 480 }, { label: '24 hours', val: 1440 }].map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => setSelectedLiveDuration(opt.val)}
                                            style={{ padding: '9px 18px', borderRadius: '20px', border: '1.5px solid #007AFF', background: opt.val === selectedLiveDuration ? '#007AFF' : '#fff', color: opt.val === selectedLiveDuration ? '#fff' : '#007AFF', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Caption input */}
                                <div>
                                    <div style={{ fontSize: '14px', color: '#667781', marginBottom: '8px' }}>Add a caption (optional)</div>
                                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E5EA', borderRadius: '12px', padding: '12px 14px', gap: '10px' }}>
                                        <input placeholder="Type a message..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }} />
                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#C7C7CC" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                    </div>
                                </div>

                                {/* Share button */}
                                <button onClick={() => { setShowLiveDurations(false); handleSendLiveLocation(selectedLiveDuration); }} style={{ width: '100%', padding: '16px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                                    Share Live Location
                                </button>

                                <div onClick={() => setShowLiveDurations(false)} style={{ textAlign: 'center', color: '#007AFF', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>← Back</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Long Press / Context Menu */}
            {contextMenu && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100 }} onClick={() => setContextMenu(null)}>
                    <div className="animate-scale" style={{ position: 'absolute', top: Math.min(contextMenu.y, window.innerHeight - 320), left: Math.min(contextMenu.x, window.innerWidth - 190), background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(30px) saturate(150%)', borderRadius: '16px', boxShadow: '0 12px 45px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: '175px', maxWidth: '185px', border: '0.5px solid rgba(255,255,255,0.3)', zIndex: 1200 }} onClick={e => e.stopPropagation()}>
                        {allowReactions && (
                            <div className="no-scrollbar" style={{ display: 'flex', gap: '6px', padding: '6px 8px', overflowX: 'auto', background: 'rgba(255, 255, 255, 0.2)', whiteSpace: 'nowrap', margin: '8px 8px 4px', borderRadius: '24px', border: '0.5px solid rgba(255,255,255,0.2)' }}>
                                {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '✔️', '💯', '✨', '🎉', '🚀', '📍', '💡', '🤝'].map(emoji => (
                                    <div 
                                        key={emoji} 
                                        onClick={() => handleEmojiReaction(contextMenu.msgId, emoji)} 
                                        style={{ 
                                            fontSize: '22px', 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                            display: 'flex', 
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '2px',
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            width: '34px',
                                            height: '34px'
                                        }} 
                                        className="emoji-reaction-pro"
                                    >
                                        {emoji}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {allowReply && (
                                <div className="context-item-pro" onClick={() => handleReply(contextMenu.msgId)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
                                    <CornerUpLeft size={16} color="#007AFF" />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Reply</span>
                                </div>
                            )}
                            {allowForward && (
                                <div className="context-item-pro" onClick={() => handleForward(contextMenu.msgId)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
                                    <Forward size={16} color="#007AFF" />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Forward</span>
                                </div>
                            )}
                            <div className="context-item-pro" onClick={() => { navigator.clipboard.writeText(messages.find(m => String(m._id) === String(contextMenu.msgId))?.content || ''); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
                                <Copy size={16} color="#007AFF" />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Copy</span>
                            </div>
                            {allowPin && (
                                <div className="context-item-pro" onClick={() => handlePinMessage(contextMenu.msgId)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
                                    <Pin size={16} color="#007AFF" />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>Pin / Unpin</span>
                                </div>
                            )}
                            <div className="context-item-pro" onClick={() => handleStarMessage(contextMenu.msgId)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
                                <Star size={16} color="#FF9500" />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Star / Unstar</span>
                            </div>
                            <div className="context-item-pro" onClick={() => handleReportMessage(contextMenu.msgId)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
                                <AlertTriangle size={16} color="#FF3B30" />
                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#FF3B30' }}>Report</span>
                            </div>
                            <div className="context-item-pro" onClick={() => { 
                                const msg = messages.find(m => String(m._id) === String(contextMenu.msgId));
                                const canEveryone = user.role === 'admin' || msg?.sender?._id === user._id || msg?.sender === user._id;
                                setCanDeleteForEveryone(canEveryone);
                                setSelectedMsgIds(new Set([contextMenu.msgId]));
                                setDeleteOption('me');
                                setShowDeleteModal(true);
                                setContextMenu(null); 
                            }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer' }}>
                                <Trash2 size={16} color="#FF3B30" />
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#FF3B30' }}>Delete</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pro Delete Confirmation Bottom Sheet */}
            {showDeleteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowDeleteModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(40px) saturate(200%)', borderRadius: '24px 24px 0 0', paddingBottom: 'env(safe-area-inset-bottom, 20px)', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)' }}>
                        
                        {/* Drag Handle Indicator */}
                        <div style={{ width: '40px', height: '5px', background: 'rgba(0,0,0,0.15)', borderRadius: '3px', margin: '12px auto' }}></div>

                        <div style={{ padding: '8px 24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                <Trash2 size={24} color="#FF3B30" />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0', textAlign: 'center', color: '#000', letterSpacing: '-0.5px' }}>Delete Message?</h3>
                            <p style={{ fontSize: '14px', color: '#667781', margin: 0, textAlign: 'center', fontWeight: '500', lineHeight: '1.4' }}>This action cannot be undone. How would you like to proceed?</p>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 20px 20px', gap: '10px' }}>
                            {canDeleteForEveryone && (
                                <button 
                                    onClick={() => { setShowDeleteModal(false); handleDeleteSelected('everyone'); }}
                                    style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#FF3B30', color: '#fff', border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.1s, filter 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(255,59,48,0.25)' }}
                                    onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                                    onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
                                >
                                    Delete for Everyone
                                </button>
                            )}
                            
                            <button 
                                onClick={() => { setShowDeleteModal(false); handleDeleteSelected('me'); }}
                                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: canDeleteForEveryone ? 'rgba(255, 59, 48, 0.1)' : '#FF3B30', color: canDeleteForEveryone ? '#FF3B30' : '#fff', border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: canDeleteForEveryone ? 'none' : '0 4px 12px rgba(255,59,48,0.25)' }}
                                onMouseOver={e => { if(canDeleteForEveryone) e.currentTarget.style.background = 'rgba(255, 59, 48, 0.15)' }}
                                onMouseOut={e => { if(canDeleteForEveryone) e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)' }}
                            >
                                Delete for Me
                            </button>
                            
                            <button 
                                onClick={() => { setShowDeleteModal(false); if(!isSelectionMode) setSelectedMsgIds(new Set()); }} 
                                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#F2F2F7', border: 'none', fontWeight: '700', fontSize: '16px', color: '#8E8E93', cursor: 'pointer', marginTop: '6px', transition: 'background 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = '#E5E5EA'}
                                onMouseOut={e => e.currentTarget.style.background = '#F2F2F7'}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduled Message Modal */}
            {showScheduleModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '350px', padding: '24px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Schedule Message</h3>
                        <p style={{ fontSize: '14px', color: '#667781', marginBottom: '16px' }}>Your message will be sent automatically at the selected time.</p>
                        <input
                            type="datetime-local"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '10px', marginBottom: '20px', fontSize: '15px' }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowScheduleModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#F2F2F7', border: 'none', fontWeight: '600' }}>Cancel</button>
                            <button onClick={handleScheduleMessage} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#007AFF', color: '#fff', border: 'none', fontWeight: '600' }}>Schedule</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Wallpaper Modal */}
            {showWallpaperModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowWallpaperModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', background: '#fff', borderRadius: '24px', padding: '24px', animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>Chat Wallpaper</h3>
                            <div onClick={() => setShowWallpaperModal(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} color="#8E8E93" /></div>
                        </div>
                        
                        <div style={{ overflowY: 'auto', paddingRight: '4px', flex: 1, marginBottom: '20px' }} className="custom-scrollbar">
                            
                            {/* AI Generation Section (Pro) */}
                            <div style={{ background: 'linear-gradient(135deg, #1A2980 0%, #26D0CE 100%)', borderRadius: '16px', padding: '20px', marginBottom: '20px', color: '#FFF', boxShadow: '0 8px 24px rgba(38,208,206,0.3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <Sparkles size={20} color="#FFF" />
                                    <span style={{ fontSize: '16px', fontWeight: '700' }}>AI Generator Pro</span>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Describe your perfect wallpaper..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#FFF', outline: 'none', fontSize: '15px', marginBottom: '12px' }}
                                />
                                <button 
                                    onClick={handleGenerateAiWallpaper} 
                                    disabled={isGeneratingAi || !aiPrompt.trim()}
                                    style={{ width: '100%', padding: '12px', background: '#FFF', color: '#1A2980', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '15px', cursor: (isGeneratingAi || !aiPrompt.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: (isGeneratingAi || !aiPrompt.trim()) ? 0.7 : 1, transition: 'all 0.2s' }}
                                >
                                    {isGeneratingAi ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    {isGeneratingAi ? 'Generating Art...' : 'Generate with AI'}
                                </button>
                            </div>

                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#8E8E93', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gallery</div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                                {defaultWallpapers.map((url, i) => (
                                    <div key={i} style={{ position: 'relative', paddingTop: '150%', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: chatWallpaper === url ? '3px solid #007AFF' : '2px solid transparent', transition: 'all 0.2s' }} onClick={() => {
                                        localStorage.setItem('wallpaper_' + contact._id, url);
                                        setChatWallpaper(url);
                                        setShowWallpaperModal(false);
                                    }}>
                                        <img src={url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                            <button onClick={() => wallpaperInputRef.current?.click()} style={{ flex: 1, padding: '14px', background: '#F2F2F7', color: '#000', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='#E5E5EA'} onMouseOut={e => e.currentTarget.style.background='#F2F2F7'}>
                                <Image size={18} /> Device
                            </button>
                            <button onClick={() => {
                                localStorage.removeItem('wallpaper_' + contact._id);
                                setChatWallpaper(null);
                                setShowWallpaperModal(false);
                            }} style={{ flex: 1, padding: '14px', background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255, 59, 48, 0.15)'} onMouseOut={e => e.currentTarget.style.background='rgba(255, 59, 48, 0.1)'}>
                                <Trash2 size={18} /> Remove
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Screenshot Protection & Pro Emoji Animations CSS */}
            <style>
                {`
                    @keyframes popEmoji {
                        0% { transform: scale(0.4); opacity: 0; }
                        50% { transform: scale(1.15); opacity: 0.9; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    ${groupData?.settings?.restrictScreenshot ? `
                        @media print { body { display: none; } }
                        body {
                            user-select: none;
                            -webkit-user-select: none;
                        }
                    ` : ''}
                `}
            </style>

            {/* Live Camera Modal */}
            {showCamera && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', zIndex: 2, position: 'absolute', width: '100%' }}>
                        <div onClick={closeCamera} style={{ color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}>Cancel</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video autoPlay playsInline ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '30px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', position: 'absolute', bottom: 0, width: '100%' }}>
                        <div onClick={capturePhoto} style={{ width: '70px', height: '70px', borderRadius: '50%', border: '4px solid white', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'white' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Map Picker View */}
            {showMapPicker && (
                <MapPicker
                    onBack={() => setShowMapPicker(false)}
                    onSelect={handleMapSelect}
                />
            )}
            {/* Premium Media Viewer Overlay */}
            {viewingMedia && (
                <div className="animate-fade" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '15px' }}>
                        <div onClick={() => setViewingMedia(null)} style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <X size={24} />
                        </div>
                    </div>

                    <div className="animate-zoom-in" style={{ width: '90vw', height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {viewingMedia.type === 'video' ? (
                            <video src={viewingMedia.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                        ) : (
                            <img src={viewingMedia.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} alt="viewer" />
                        )}
                    </div>
                </div>
            )}

            {/* Offline Mesh P2P Bottom Sheet */}
            {showMeshSheet && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 1200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowMeshSheet(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', background: '#FFF', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px 24px 40px', animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', color: '#000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Offline Mesh Network 📡
                                </h3>
                                <span style={{ fontSize: '12px', color: '#8E8E93' }}>Local ID: {nearbyService.localPeerId}</span>
                            </div>
                            <div onClick={() => setShowMeshSheet(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} color="#8E8E93" /></div>
                        </div>

                        {/* Mesh Controls */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            <button 
                                onClick={() => {
                                    if (isMeshAdvertising) {
                                        nearbyService.stopAdvertising();
                                        setIsMeshAdvertising(false);
                                    } else {
                                        nearbyService.startAdvertising(user.displayName);
                                        setIsMeshAdvertising(true);
                                    }
                                }}
                                style={{ flex: 1, padding: '14px', background: isMeshAdvertising ? '#34C759' : '#F2F2F7', color: isMeshAdvertising ? 'white' : 'black', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                {isMeshAdvertising ? 'Advertising...' : 'Advertise'}
                            </button>
                            <button 
                                onClick={() => {
                                    if (isMeshScanning) {
                                        nearbyService.stopScanning();
                                        setIsMeshScanning(false);
                                    } else {
                                        nearbyService.startScanning();
                                        setIsMeshScanning(true);
                                    }
                                }}
                                style={{ flex: 1, padding: '14px', background: isMeshScanning ? '#34C759' : '#F2F2F7', color: isMeshScanning ? 'white' : 'black', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                {isMeshScanning ? 'Scanning...' : 'Scan Peers'}
                            </button>
                        </div>

                        {/* Discovered Peers Section */}
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#8E8E93', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nearby Peers ({meshPeers.length})</div>
                            {meshPeers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: '#8E8E93' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                                    <span>No active mesh users found nearby.</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {meshPeers.map((peer, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F2F2F7', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '10px', height: '10px', background: '#34C759', borderRadius: '50%' }}></div>
                                                <span style={{ fontWeight: '600' }}>{peer.name}</span>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#8E8E93' }}>Connected</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatArea;
