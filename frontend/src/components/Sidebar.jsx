import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useSocket } from '../context/SocketContext';
import StoryViewer from './StoryViewer';
import {
  Search, Camera, Plus, MessageCircle, Phone, Video, Users, Settings,
  UserPlus, Check, CheckCheck, MapPin, Mic, FileText, User as UserIcon,
  MoreVertical, ArrowLeft, Clock, Circle, Type, Download, Trash, Trash2,
  X as XIcon, Image, Share2, CheckCircle, MessageSquare, Square, Palette,
  CaseSensitive, Smile, ALargeSmall, RotateCw, Undo, Edit3, Send, Crop,
  Sliders, Sparkles, UserMinus, UserCheck, Lock, Globe, EyeOff,
  ShieldAlert, Share, Timer, ShieldCheck, ChevronRight,
  Maximize, ArrowLeftRight, ArrowUpDown, Compass, Sun, Moon,
  Contrast, Droplet, Thermometer, CircleDot, LogOut, Bell, Database,
  HelpCircle, Info, Star, Shield, Trash as TrashIcon, AlertTriangle, Play, Pause
} from 'lucide-react';

const Sidebar = ({ onSelectContact, selectedContact, initialStoryGroup, onStoryGroupClosed }) => {
  const { user, updateProfile, logout, api } = useAuth();
  const { initiateCall } = useCall();
  const { socket, onlineUsers } = useSocket();

  // Helper to extract user initials
  const getInitials = (name) => {
    if (!name) return 'Z';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const renderUserAvatar = (userId, displayName, profilePicture, isGroup = false, size = 54) => {
    const contactIdStr = userId?.toString();
    const isOnline = !isGroup && (onlineUsers[contactIdStr]?.status === 'online');
    
    const storyGroup = !isGroup && stories.find(group => 
      group.user?._id?.toString() === contactIdStr && group.stories?.length > 0
    );
    const hasStory = !!storyGroup;
    const storyCount = storyGroup?.stories?.length || 0;

    const avatarUrl = profilePicture 
      ? (profilePicture.startsWith('http') ? profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + profilePicture + "?token=" + localStorage.getItem('token')) 
      : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(displayName || '') + "&background=random&color=fff";

    const strokeWidth = 2.2;
    const r = (size / 2) - (strokeWidth / 2) - 0.5;
    const C = 2 * Math.PI * r;

    return (
      <div 
        style={{ position: 'relative', flexShrink: 0, cursor: hasStory ? 'pointer' : 'default', width: `${size}px`, height: `${size}px` }}
        onClick={(e) => {
          if (hasStory) {
            e.stopPropagation();
            setViewingStoryGroup(storyGroup);
          }
        }}
      >
        {hasStory && (
          <svg 
            width={size} 
            height={size} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              transform: 'rotate(-90deg)', 
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            {storyCount === 1 ? (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#007AFF"
                strokeWidth={strokeWidth}
              />
            ) : (
              (() => {
                const gap = 3.5;
                const totalGap = storyCount * gap;
                const segmentLength = (C - totalGap) / storyCount;
                return (
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="#007AFF"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${segmentLength} ${gap}`}
                  />
                );
              })()
            )}
          </svg>
        )}

        <div style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          padding: hasStory ? '3.5px' : '0px',
          background: hasStory ? '#FFFFFF' : 'transparent'
        }}>
          <img
            src={avatarUrl}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              boxSizing: 'border-box'
            }}
            alt=""
          />
        </div>
        
        {isGroup && (
          <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#007AFF', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #FFFFFF', zIndex: 2 }}>
            <Users size={10} color="#fff" />
          </div>
        )}

        {isOnline && !isGroup && (
          <div style={{ 
            position: 'absolute', 
            bottom: '1px', 
            right: '1px', 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: '#34C759', 
            border: '2px solid #fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            zIndex: 2
          }} />
        )}
      </div>
    );
  };

  // ── Core State ───────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdminUser, setSelectedAdminUser] = useState(null);
  const [showAdminControlPanel, setShowAdminControlPanel] = useState(false);
  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [callLogs, setCallLogs] = useState([]);
  
  // Chats Tab Filter Chips: 'all', 'unread', 'groups', 'favorites'
  const [chatFilter, setChatFilter] = useState('all');
  const [favorites, setFavorites] = useState([]);

  // Settings Subpage State: null, 'profile', 'privacy', 'account', 'chats_appearance', 'data', 'help', 'about'
  const [settingsSubPage, setSettingsSubPage] = useState(null);

  // Profile Edit fields
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAbout, setEditAbout] = useState(user?.about || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Two-step Verification PIN fields
  const [twoStepEnabled, setTwoStepEnabled] = useState(user?.settings?.twoStepVerification || false);
  const [twoStepPin, setTwoStepPin] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  // Privacy toggles
  const [privacyLastSeen, setPrivacyLastSeen] = useState(user?.settings?.privacyLastSeen || 'everyone');
  const [privacyProfilePhoto, setPrivacyProfilePhoto] = useState(user?.settings?.privacyProfilePhoto || 'everyone');
  const [readReceipts, setReadReceipts] = useState(user?.settings?.readReceipts !== false);
  const [disappearingMessages, setDisappearingMessages] = useState(user?.settings?.disappearingMessagesTimer || 0);

  // Auto-download settings
  const [autoDownloadPhotos, setAutoDownloadPhotos] = useState(true);
  const [autoDownloadVideos, setAutoDownloadVideos] = useState(false);
  const [autoDownloadAudio, setAutoDownloadAudio] = useState(true);
  const [autoDownloadDocs, setAutoDownloadDocs] = useState(false);

  // ── Status/Stories ────────────────────────────────────────────────────────
  const [stories, setStories] = useState([]);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [uploadingStoryType, setUploadingStoryType] = useState('');
  const [isAddStatusModalOpen, setIsAddStatusModalOpen] = useState(false);
  const [isMyStatusManagerOpen, setIsMyStatusManagerOpen] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState(null);

  // ── Status Privacy Settings (Pro Features) ────────────────────────────────
  const [showStatusSettings, setShowStatusSettings] = useState(false);
const [showStatusSearch, setShowStatusSearch] = useState(false);
const [statusSearchQuery, setStatusSearchQuery] = useState('');
  const [selectingContactsFor, setSelectingContactsFor] = useState(null); // null, 'exceptions', 'only_share', 'close_friends'
const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
const [createGroupStep, setCreateGroupStep] = useState(1); // 1 = select members, 2 = name & icon
const [groupSelectedMembers, setGroupSelectedMembers] = useState([]);
const [groupName, setGroupName] = useState('');
const [groupDescription, setGroupDescription] = useState('');
const [groupIconFile, setGroupIconFile] = useState(null);
const [groupIconPreview, setGroupIconPreview] = useState(null);
const [groupMemberSearch, setGroupMemberSearch] = useState('');
const [isCreatingGroup, setIsCreatingGroup] = useState(false);
const [groupAllUsers, setGroupAllUsers] = useState([]);
const [loadingGroupUsers, setLoadingGroupUsers] = useState(false);
const groupIconInputRef = useRef(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  
  const [statusPrivacy, setStatusPrivacy] = useState(user?.statusSettings?.privacy || 'contacts');
  const [statusPrivacyExceptions, setStatusPrivacyExceptions] = useState(user?.statusSettings?.privacyExceptions || []);
  const [statusPrivacyOnlyShare, setStatusPrivacyOnlyShare] = useState(user?.statusSettings?.privacyOnlyShare || []);
  const [statusHideViewersList, setStatusHideViewersList] = useState(user?.statusSettings?.hideViewersList || false);
  const [statusDisableScreenshot, setStatusDisableScreenshot] = useState(user?.statusSettings?.disableScreenshot || false);
  const [statusCustomExpiryTime, setStatusCustomExpiryTime] = useState(user?.statusSettings?.customExpiryTime || 24);
  const [statusAllowDownload, setStatusAllowDownload] = useState(user?.statusSettings?.allowDownload !== false);
  const [statusAllowForward, setStatusAllowForward] = useState(user?.statusSettings?.allowForward !== false);
  const [statusPrivateAccount, setStatusPrivateAccount] = useState(user?.statusSettings?.privateAccount || false);
  const [statusCloseFriends, setStatusCloseFriends] = useState(user?.statusSettings?.closeFriends || []);
  const [savingStatusSettings, setSavingStatusSettings] = useState(false);
  const [justSavedStatus, setJustSavedStatus] = useState(false);

  // ── Text Status Creator States ─────────────────────────────────────────────
  const [isTextCreatorOpen, setIsTextCreatorOpen] = useState(false);
  const [textStatusBg, setTextStatusBg] = useState('linear-gradient(135deg, #007AFF 0%, #0056B3 100%)');
  const [textStatusColor, setTextStatusColor] = useState('#FFFFFF');
  const [textStatusFont, setTextStatusFont] = useState('inherit');
  const [textStatusCaption, setTextStatusCaption] = useState('');
  const [isPostingTextStatus, setIsPostingTextStatus] = useState(false);

  // ── Editor State ──────────────────────────────────────────────────────────
  const [editorMedia, setEditorMedia] = useState(null);
  const [editorTab, setEditorTab] = useState('none');
  const [activeColor, setActiveColor] = useState('#FFFFFF');
  const [activeTool, setActiveTool] = useState('none');
  const [cropRatio, setCropRatio] = useState('none');
  const [cropBox, setCropBox] = useState({ x: 20, y: 50, w: 360, h: 400 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [straightenAngle, setStraightenAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [exposure, setExposure] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [activeCropSubTab, setActiveCropSubTab] = useState('menu');
  const [activeAdjustSubTab, setActiveAdjustSubTab] = useState('menu');

  // ── Camera State ─────────────────────────────────────────────────────────
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('user');
  const cameraVideoRef = useRef(null);

  // ── Voice Status Recorder States ─────────────────────────────────────────
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isVoiceRecordingPaused, setIsVoiceRecordingPaused] = useState(false);
  const [voiceRecordTime, setVoiceRecordTime] = useState(0);
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState(null);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState(null);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false);

  const voiceMediaRecorderRef = useRef(null);
  const voiceTimerRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceAudioPlayerRef = useRef(null);

  // ── Select Contact Modal ───────────────────────────────────────────────
  const [selectContactOpen, setSelectContactOpen] = useState(false);
  const [selectContactSearch, setSelectContactSearch] = useState('');

  // ── Refs ──────────────────────────────────────────────────────────────────
  const dragInfoRef = useRef(null);
  const drawingStateRef = useRef({ isDrawing: false, lastX: 0, lastY: 0 });
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const optimisticIdRef = useRef(null);
  const profilePhotoInputRef = useRef(null);

  // ── Camera Functions ─────────────────────────────────────────────────────
  const openCamera = async (facing = 'user') => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false
      });
      setCameraStream(stream);
      setCameraFacing(facing);
      setCameraOpen(true);
      // Attach stream to video element after render
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play();
        }
      }, 100);
    } catch (err) {
      alert('Could not access camera: ' + err.message);
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      const url = URL.createObjectURL(file);
      closeCamera();
      // Open editor with the captured image
      setEditorMedia({ file, url, type: 'image', rotation: 0, flipH: false, flipV: false, filter: '', texts: [], stickers: [], drawings: [] });
    }, 'image/jpeg', 0.95);
  };

  // ── Voice Status Recorder Functions ──────────────────────────────────────
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceMediaRecorderRef.current = new MediaRecorder(stream);
      voiceChunksRef.current = [];

      voiceMediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          voiceChunksRef.current.push(e.data);
        }
      };

      voiceMediaRecorderRef.current.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, { type: 'audio/webm' });
        setRecordedVoiceBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVoiceUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      voiceMediaRecorderRef.current.start();
      setIsRecordingVoice(true);
      setIsVoiceRecordingPaused(false);
      setVoiceRecordTime(0);
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone: ' + err.message);
    }
  };

  const stopVoiceRecording = () => {
    if (voiceMediaRecorderRef.current && isRecordingVoice) {
      voiceMediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      setIsVoiceRecordingPaused(false);
      clearInterval(voiceTimerRef.current);
    }
  };

  const discardVoiceRecording = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (voiceMediaRecorderRef.current) {
      voiceMediaRecorderRef.current.onstop = () => {};
      try {
        voiceMediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (voiceAudioPlayerRef.current) {
      voiceAudioPlayerRef.current.pause();
      voiceAudioPlayerRef.current = null;
    }
    setRecordedVoiceBlob(null);
    setRecordedVoiceUrl(null);
    setIsRecordingVoice(false);
    setIsVoiceRecordingPaused(false);
    setVoiceRecordTime(0);
    setIsPlayingVoicePreview(false);
  };

  const toggleVoiceRecordingPause = () => {
    if (!voiceMediaRecorderRef.current || !isRecordingVoice) return;
    
    if (isVoiceRecordingPaused) {
      voiceMediaRecorderRef.current.resume();
      setIsVoiceRecordingPaused(false);
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordTime(prev => prev + 1);
      }, 1000);
    } else {
      voiceMediaRecorderRef.current.pause();
      setIsVoiceRecordingPaused(true);
      clearInterval(voiceTimerRef.current);
    }
  };

  const toggleVoicePreviewPlayback = () => {
    if (!recordedVoiceUrl) return;
    if (isPlayingVoicePreview) {
      if (voiceAudioPlayerRef.current) {
        voiceAudioPlayerRef.current.pause();
      }
      setIsPlayingVoicePreview(false);
    } else {
      if (!voiceAudioPlayerRef.current) {
        voiceAudioPlayerRef.current = new Audio(recordedVoiceUrl);
        voiceAudioPlayerRef.current.onended = () => {
          setIsPlayingVoicePreview(false);
        };
      } else {
        voiceAudioPlayerRef.current.src = recordedVoiceUrl;
      }
      voiceAudioPlayerRef.current.play();
      setIsPlayingVoicePreview(true);
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (voiceMediaRecorderRef.current && isRecordingVoice) {
      try {
        voiceMediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (voiceAudioPlayerRef.current) {
      voiceAudioPlayerRef.current.pause();
      voiceAudioPlayerRef.current = null;
    }
    setRecordedVoiceBlob(null);
    setRecordedVoiceUrl(null);
    setIsRecordingVoice(false);
    setIsVoiceRecordingPaused(false);
    setVoiceRecordTime(0);
    setIsPlayingVoicePreview(false);
    setIsVoiceRecorderOpen(false);
  };

  const submitVoiceStatus = async () => {
    if (!recordedVoiceBlob) return;

    if (voiceAudioPlayerRef.current) {
      voiceAudioPlayerRef.current.pause();
      voiceAudioPlayerRef.current = null;
    }

    setUploadingStoryType('Voice');
    setUploadingStory(true); 
    setIsVoiceRecorderOpen(false);
    
    // Add optimistic story
    addOptimisticStory('voice');

    const file = new File([recordedVoiceBlob], `voice_status_${Date.now()}.webm`, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/upload`, {
        method: 'POST', 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, 
        body: formData
      });
      const uploadData = await uploadRes.json();
      const storyRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ fileId: uploadData.fileId, mediaType: 'voice', caption: '' })
      });
      if (storyRes.ok) { 
        removeOptimisticStory(); 
        await fetchContacts(); 
      }
    } catch (err) { 
      console.error('Failed to upload voice status:', err); 
      removeOptimisticStory(); 
    } finally { 
      setUploadingStory(false); 
      setRecordedVoiceBlob(null);
      setRecordedVoiceUrl(null);
      setVoiceRecordTime(0);
      setIsPlayingVoicePreview(false);
    }
  };

  // Load Favorites from LocalStorage on mount
  useEffect(() => {
    if (user?._id) {
      const stored = localStorage.getItem(`favorites_${user._id}`);
      if (stored) {
        try { setFavorites(JSON.parse(stored)); } catch (e) { console.error(e); }
      }
    }
  }, [user]);

  // Save Favorites helper
  const toggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    let updated;
    if (favorites.includes(id)) {
      updated = favorites.filter(favId => favId !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    if (user?._id) {
      localStorage.setItem(`favorites_${user._id}`, JSON.stringify(updated));
    }
  };

  const fetchContacts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const [contactsRes, groupsRes, storiesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/stories`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      let allContacts = [];
      if (contactsRes.ok) {
        const cd = await contactsRes.json();
        allContacts = Array.isArray(cd) ? cd : (cd.contacts || cd.data || []);
      }
      if (groupsRes.ok) {
        const gd = await groupsRes.json();
        const groupsArr = Array.isArray(gd) ? gd : (gd.groups || gd.data || []);
        const formattedGroups = groupsArr.map(g => ({ ...g, isGroup: true, displayName: g.name || g.displayName || 'Group Chat' }));
        allContacts = [...allContacts, ...formattedGroups];
      }
      setContacts(allContacts);

      if (storiesRes.ok) {
        const sd = await storiesRes.json();
        setStories(Array.isArray(sd) ? sd : (sd.stories || sd.data || []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCallLogs = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/calls`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const cd = await res.json();
        setCallLogs(Array.isArray(cd) ? cd : (cd.calls || cd.data || []));
      }
    } catch (err) { console.error(err); }
  }, []);

  const fetchDirectoryUsers = useCallback(async (query = '') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/contacts/search?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDirectoryUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch directory users:', err);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchCallLogs();
    fetchDirectoryUsers();
  }, [fetchContacts, fetchCallLogs, fetchDirectoryUsers]);

  useEffect(() => {
    if (!socket) return;
    
    const handleReceiveMessage = (message) => {
        setContacts(prevContacts => {
            const newContacts = [...prevContacts];
            
            let contactId;
            if (message.groupId) {
                contactId = typeof message.groupId === 'object' ? message.groupId._id : message.groupId;
            } else {
                const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender;
                const recipientId = typeof message.recipient === 'object' ? message.recipient._id : message.recipient;
                contactId = senderId === user._id ? recipientId : senderId;
            }
            
            const contactIndex = newContacts.findIndex(c => (c.userId || c._id) === contactId);
            
            if (contactIndex > -1) {
                const contact = { ...newContacts[contactIndex] };
                contact.lastMessage = message;
                // Move to top
                newContacts.splice(contactIndex, 1);
                newContacts.unshift(contact);
                return newContacts;
            } else {
                // Not in current list, refetch
                fetchContacts();
                return prevContacts;
            }
        });
    };

    socket.on('receive_message', handleReceiveMessage);
    
    return () => {
        socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, user?._id, fetchContacts]);

  useEffect(() => {
    if (initialStoryGroup) setViewingStoryGroup(initialStoryGroup);
  }, [initialStoryGroup]);

  // Synchronize Settings when SubPage changes or loads
  useEffect(() => {
    if (user) {
      setEditName(user.displayName || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone || '');
      setEditAbout(user.about || '');
      setTwoStepEnabled(user.settings?.twoStepVerification || false);
      setPrivacyLastSeen(user.settings?.privacyLastSeen || 'everyone');
      setPrivacyProfilePhoto(user.settings?.privacyProfilePhoto || 'everyone');
      setReadReceipts(user.settings?.readReceipts !== false);
      setDisappearingMessages(user.settings?.disappearingMessagesTimer || 0);
      
      // Status Settings Sync
      if (user.statusSettings) {
        setStatusPrivacy(user.statusSettings.privacy || 'contacts');
        setStatusPrivacyExceptions(user.statusSettings.privacyExceptions || []);
        setStatusPrivacyOnlyShare(user.statusSettings.privacyOnlyShare || []);
        setStatusHideViewersList(user.statusSettings.hideViewersList || false);
        setStatusDisableScreenshot(user.statusSettings.disableScreenshot || false);
        setStatusCustomExpiryTime(user.statusSettings.customExpiryTime || 24);
        setStatusAllowDownload(user.statusSettings.allowDownload !== false);
        setStatusAllowForward(user.statusSettings.allowForward !== false);
        setStatusPrivateAccount(user.statusSettings.privateAccount || false);
        setStatusCloseFriends(user.statusSettings.closeFriends || []);
      }
    }
  }, [user, settingsSubPage]);

  // ── Save Status Settings ──────────────────────────────────────────────────
  const saveStatusSettings = async (updates = {}) => {
    setSavingStatusSettings(true);
    try {
      const payload = {
        privacy: updates.privacy !== undefined ? updates.privacy : statusPrivacy,
        privacyExceptions: updates.privacyExceptions !== undefined ? updates.privacyExceptions : statusPrivacyExceptions,
        privacyOnlyShare: updates.privacyOnlyShare !== undefined ? updates.privacyOnlyShare : statusPrivacyOnlyShare,
        hideViewersList: updates.hideViewersList !== undefined ? updates.hideViewersList : statusHideViewersList,
        disableScreenshot: updates.disableScreenshot !== undefined ? updates.disableScreenshot : statusDisableScreenshot,
        customExpiryTime: updates.customExpiryTime !== undefined ? updates.customExpiryTime : statusCustomExpiryTime,
        allowDownload: updates.allowDownload !== undefined ? updates.allowDownload : statusAllowDownload,
        allowForward: updates.allowForward !== undefined ? updates.allowForward : statusAllowForward,
        privateAccount: updates.privateAccount !== undefined ? updates.privateAccount : statusPrivateAccount,
        closeFriends: updates.closeFriends !== undefined ? updates.closeFriends : statusCloseFriends,
      };

      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/status-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ statusSettings: payload })
      });
      if (res.ok) {
        // Update user context in memory
        if (user) {
          user.statusSettings = payload;
        }
        setJustSavedStatus(true);
        setTimeout(() => setJustSavedStatus(false), 2200);
      }
    } catch (err) {
      console.error('Failed to save status settings:', err);
    } finally {
      setSavingStatusSettings(false);
    }
  };

  const handleContactToggle = (contactId) => {
    if (selectingContactsFor === 'exceptions') {
      const isChecked = (statusPrivacyExceptions || []).includes(contactId);
      const updated = isChecked
        ? statusPrivacyExceptions.filter(id => id !== contactId)
        : [...statusPrivacyExceptions, contactId];
      setStatusPrivacyExceptions(updated);
      saveStatusSettings({ privacyExceptions: updated });
    } else if (selectingContactsFor === 'only_share') {
      const isChecked = (statusPrivacyOnlyShare || []).includes(contactId);
      const updated = isChecked
        ? statusPrivacyOnlyShare.filter(id => id !== contactId)
        : [...statusPrivacyOnlyShare, contactId];
      setStatusPrivacyOnlyShare(updated);
      saveStatusSettings({ privacyOnlyShare: updated });
    } else if (selectingContactsFor === 'close_friends') {
      const isChecked = (statusCloseFriends || []).includes(contactId);
      const updated = isChecked
        ? statusCloseFriends.filter(id => id !== contactId)
        : [...statusCloseFriends, contactId];
      setStatusCloseFriends(updated);
      saveStatusSettings({ closeFriends: updated });
    }
  };

  // ── Gallery Mockup Selection Pipeline ──────────────────────────────────────
  const selectGalleryMockup = async (imageUrl, imageName) => {
    try {
      setIsAddStatusModalOpen(false);
      // Fetch mockup image from URL and convert into JavaScript File object
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], imageName || 'mockup.jpg', { type: blob.type || 'image/jpeg' });
      
      const url = URL.createObjectURL(file);
      setEditorMedia({ 
        file, 
        url, 
        type: 'image', 
        caption: '', 
        rotation: 0, 
        filter: 'none', 
        texts: [], 
        stickers: [] 
      });
      setEditorTab('none'); 
      setActiveTool('none');
      setCropRatio('none'); 
      setBrightness(100); 
      setContrast(100); 
      setSaturation(100);
    } catch (err) {
      console.error('Failed to load gallery mockup image:', err);
    }
  };

  // ── Typography & Text Styling Utilities ────────────────────────────────────
  const cycleFont = () => {
    const fonts = [
      'system-ui, -apple-system, sans-serif',
      '"Playfair Display", Georgia, serif',
      '"Courier New", Courier, monospace',
      '"Pacifico", "Brush Script MT", cursive'
    ];
    let currentIdx = fonts.indexOf(textStatusFont);
    if (currentIdx === -1) currentIdx = 0;
    const nextIdx = (currentIdx + 1) % fonts.length;
    setTextStatusFont(fonts[nextIdx]);
  };

  const toggleTextColor = () => {
    setTextStatusColor(prev => prev === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF');
  };

  // ── Post Custom Styled Text Status ─────────────────────────────────────────
  const handlePostTextStatus = async () => {
    if (!textStatusCaption.trim()) return;
    setIsPostingTextStatus(true);
    addOptimisticStory('text');
    try {
      const token = localStorage.getItem('token');
      const storyRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/stories`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          fileId: user?.id || user?._id, // GridFS requires ObjectId; active user.id is perfect
          mediaType: 'text', 
          caption: textStatusCaption,
          bgColor: textStatusBg,
          fontColor: textStatusColor,
          fontFamily: textStatusFont,
          fontSize: '32px'
        })
      });
      if (storyRes.ok) {
        setTextStatusCaption('');
        setIsTextCreatorOpen(false);
        removeOptimisticStory();
        await fetchContacts(); 
      } else {
        removeOptimisticStory();
      }
    } catch (err) {
      console.error('Failed to post text status:', err);
      removeOptimisticStory();
    } finally {
      setIsPostingTextStatus(false);
    }
  };

  // ── Optimistic Story Helpers ──────────────────────────────────────────────
  const addOptimisticStory = (mediaType) => {
    const id = `optimistic_${Date.now()}`;
    optimisticIdRef.current = id;
    setStories(prev => [...prev, {
      _id: id, userId: user?._id, displayName: 'You',
      profilePicture: user?.profilePicture, mediaType, isOptimistic: true
    }]);
  };

  const removeOptimisticStory = () => {
    if (optimisticIdRef.current) {
      setStories(prev => prev.filter(s => s._id !== optimisticIdRef.current));
      optimisticIdRef.current = null;
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!confirm("Are you sure you want to delete this status?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchContacts();
      } else {
        alert("Failed to delete status");
      }
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  };

  // ── Drag Handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (e, type, id) => {
    if (e.cancelable) e.preventDefault();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    let initialX = 0, initialY = 0;
    if (type === 'text') {
      const item = editorMedia?.texts.find(t => t.id === id);
      if (item) { initialX = item.x; initialY = item.y; }
    } else {
      const item = editorMedia?.stickers.find(s => s.id === id);
      if (item) { initialX = item.x; initialY = item.y; }
    }
    dragInfoRef.current = { type, id, startX: clientX, startY: clientY, initialX, initialY };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = useCallback((e) => {
    if (!dragInfoRef.current) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const deltaX = clientX - dragInfoRef.current.startX;
    const deltaY = clientY - dragInfoRef.current.startY;
    const newX = Math.max(10, Math.min(390, dragInfoRef.current.initialX + deltaX));
    const newY = Math.max(10, Math.min(490, dragInfoRef.current.initialY + deltaY));
    const { type, id } = dragInfoRef.current;
    setEditorMedia(prev => {
      if (!prev) return prev;
      if (type === 'text') return { ...prev, texts: prev.texts.map(t => t.id === id ? { ...t, x: newX, y: newY } : t) };
      return { ...prev, stickers: prev.stickers.map(s => s.id === id ? { ...s, x: newX, y: newY } : s) };
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragInfoRef.current = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  }, [handleDragMove]);

  // ── Drawing Handlers ──────────────────────────────────────────────────────
  const handleDrawingStart = (e) => {
    if (activeTool !== 'pen') return;
    if (e.cancelable) e.preventDefault();
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    drawingStateRef.current = { isDrawing: true, lastX: x, lastY: y };
    const ctx = canvas.getContext('2d');
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.strokeStyle = activeColor; ctx.lineWidth = 4;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  };

  const handleDrawingMove = (e) => {
    if (activeTool !== 'pen' || !drawingStateRef.current.isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y); ctx.stroke();
    drawingStateRef.current.lastX = x; drawingStateRef.current.lastY = y;
  };

  const handleDrawingEnd = () => { drawingStateRef.current.isDrawing = false; };

  // ── Send Edited Status ───────────────────────────────────────────────────
  const handleSendEditedStatus = async () => {
    if (!editorMedia) return;
    setUploadingStory(true);
    setUploadingStoryType(editorMedia.type === 'video' ? 'Video' : 'Image');
    const typeOverride = editorMedia.type;
    const captionText = editorMedia.caption;
    let finalFile = editorMedia.file;
    const urlToRevoke = editorMedia.url;
    const snapRotation = editorMedia.rotation;
    const snapFilter = editorMedia.filter;
    const snapTexts = editorMedia.texts;
    const snapStickers = editorMedia.stickers;
    setEditorMedia(null); setEditorTab('none'); setActiveTool('none');
    setCropRatio('none'); setBrightness(100); setContrast(100); setSaturation(100);
    setStraightenAngle(0); setFlipH(false); setFlipV(false);
    setExposure(0); setTemperature(0); setTint(0); setVignette(0);
    setActiveCropSubTab('menu'); setActiveAdjustSubTab('menu');

    if (typeOverride === 'image') {
      try {
        const img = new window.Image();
        img.src = urlToRevoke;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const isRot = (snapRotation / 90) % 2 === 1;
        canvas.width = isRot ? img.height : img.width;
        canvas.height = isRot ? img.width : img.height;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((snapRotation * Math.PI) / 180);
        ctx.filter = snapFilter !== 'none' ? snapFilter : `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none';
        const drawingCanvas = document.getElementById('status-draw-canvas');
        if (drawingCanvas) ctx.drawImage(drawingCanvas, 0, 0, canvas.width, canvas.height);
        const scaleX = canvas.width / 400; const scaleY = canvas.height / 500;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        snapTexts.forEach(t => {
          ctx.font = `bold ${t.size * scaleY}px sans-serif`;
          ctx.fillStyle = t.color; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
          ctx.fillText(t.text, t.x * scaleX, t.y * scaleY); ctx.shadowBlur = 0;
        });
        snapStickers.forEach(s => {
          ctx.font = `${s.size * scaleY}px sans-serif`;
          ctx.fillText(s.emoji, s.x * scaleX, s.y * scaleY);
        });
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95));
        finalFile = new File([blob], 'status_edited.jpg', { type: 'image/jpeg' });
      } catch (err) { console.error('Canvas composition failed:', err); }
    }

    URL.revokeObjectURL(urlToRevoke);
    addOptimisticStory(typeOverride);
    const formData = new FormData();
    formData.append('file', finalFile);
    try {
      const uploadRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: formData
      });
      const uploadData = await uploadRes.json();
      const storyRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ fileId: uploadData.fileId, mediaType: typeOverride, caption: captionText })
      });
      if (storyRes.ok) { removeOptimisticStory(); await fetchContacts(); }
    } catch (err) { console.error('Story upload failed:', err); removeOptimisticStory(); }
    finally { setUploadingStory(false); }
  };

  // ── Story Upload (open editor for image/video) ───────────────────────────
  const handleStoryUpload = async (e, typeOverride) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let mediaType = typeOverride || (file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'voice' : 'image');
    if (mediaType === 'image' || mediaType === 'video') {
      setIsAddStatusModalOpen(false);
      const url = URL.createObjectURL(file);
      setEditorMedia({ file, url, type: mediaType, caption: '', rotation: 0, filter: 'none', texts: [], stickers: [] });
      setEditorTab('none'); setActiveTool('none');
      setCropRatio('none'); setBrightness(100); setContrast(100); setSaturation(100);
      return;
    }
    const typeLabels = { voice: 'Voice' };
    setUploadingStoryType(typeLabels[mediaType] || 'Media');
    setUploadingStory(true); setIsAddStatusModalOpen(false);
    addOptimisticStory(mediaType);
    const formData = new FormData(); formData.append('file', file);
    try {
      const uploadRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: formData
      });
      const uploadData = await uploadRes.json();
      const storyRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ fileId: uploadData.fileId, mediaType, caption: '' })
      });
      if (storyRes.ok) { removeOptimisticStory(); await fetchContacts(); }
    } catch (err) { console.error(err); removeOptimisticStory(); }
    finally { setUploadingStory(false); }
  };

  // ── Save Profile Changes ─────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        displayName: editName,
        email: editEmail,
        phone: editPhone,
        about: editAbout
      });
      alert('Profile updated successfully!');
      setSettingsSubPage(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Upload Avatar Photo ──────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setSavingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const uploadRes = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        const profilePicUrl = `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/${uploadData.fileId}?token=${token}`;
        await updateProfile({ profilePicture: profilePicUrl });
        alert('Profile picture updated!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload picture.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Save Account Settings (Two-Step & Security) ──────────────────────────
  const handleSaveAccount = async () => {
    setSavingAccount(true);
    try {
      await updateProfile({
        settings: {
          theme: user?.settings?.theme || 'light',
          privacyLastSeen,
          privacyProfilePhoto,
          readReceipts,
          disappearingMessagesTimer: disappearingMessages,
          twoStepVerification: twoStepEnabled,
          twoStepVerificationPIN: twoStepPin
        }
      });
      alert('Account settings updated!');
      setSettingsSubPage(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update account settings.');
    } finally {
      setSavingAccount(false);
    }
  };

  // ── Toggle App Theme ─────────────────────────────────────────────────────
  const toggleThemeMode = async (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    try {
      await updateProfile({
        settings: {
          ...user?.settings,
          theme
        }
      });
    } catch (err) {
      console.error('Failed to sync theme to server:', err);
    }
  };

  // ── Delete Account Action ────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (window.confirm('WARNING: Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/profile`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          alert('Account deleted.');
          logout();
        } else {
          alert('Failed to delete account.');
        }
      } catch (err) {
        console.error(err);
        alert('Error deleting account.');
      }
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Flatten Contacts to avoid structure inconsistencies
  const getFormattedContacts = () => {
    return contacts.map(c => {
      const isGroup = c.isGroup || false;
      return {
        _id: c.contact?._id || c._id,
        displayName: c.contact?.displayName || c.displayName || c.name || 'Group Chat',
        profilePicture: c.contact?.profilePicture || c.profilePicture,
        status: c.contact?.status || c.status,
        about: c.contact?.about || c.contact?.status || c.about || c.status || 'Hey there! I am using Zap Chat.',
        phone: c.contact?.phone || c.phone,
        email: c.contact?.email || c.email,
        role: c.contact?.role || c.role || 'user',
        unreadCount: c.unreadCount || 0,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt || c.lastMessage?.createdAt,
        isGroup,
        isChatOnly: c.isChatOnly || false,
        raw: c
      };
    });
  };

  // Filter Active Chats List
  const getFilteredChats = () => {
    const formatted = getFormattedContacts();
    let result = formatted.filter(c => c.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (chatFilter === 'unread') {
      result = result.filter(c => c.unreadCount > 0);
    } else if (chatFilter === 'groups') {
      result = result.filter(c => c.isGroup);
    } else if (chatFilter === 'favorites') {
      result = result.filter(c => favorites.includes(c._id));
    }
    
    return result;
  };

  // Filter Contacts List
  const getFilteredContactsList = () => {
    return directoryUsers.filter(u =>
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const buildFilterCSS = () => {
    const parts = [];
    if (editorMedia?.filter && editorMedia.filter !== 'none') parts.push(editorMedia.filter);
    if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) parts.push(`saturate(${saturation}%)`);
    return parts.join(' ') || 'none';
  };

  // Resolve Header Title
  const getHeaderTitle = () => {
    if (activeTab === 'settings') {
      if (settingsSubPage === 'profile') return 'Profile';
      if (settingsSubPage === 'privacy') return 'Privacy';
      if (settingsSubPage === 'account') return 'Account';
      if (settingsSubPage === 'chats_appearance') return 'Chats & Wallpapers';
      if (settingsSubPage === 'data') return 'Data & Storage';
      if (settingsSubPage === 'help') return 'Help';
      if (settingsSubPage === 'about') return 'About';
      return 'Settings';
    }
    if (activeTab === 'status') {
      if (selectingContactsFor === 'exceptions') return 'Exclude Contacts';
      if (selectingContactsFor === 'only_share') return 'Share With';
      if (selectingContactsFor === 'close_friends') return 'Close Friends';
      if (showStatusSettings) return 'Status Privacy';
      return '';
    }
    if (activeTab === 'calls') return 'Calls';
    if (activeTab === 'contacts') return 'Contacts';
    return '';
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-ios, #f2f2f7)', color: 'var(--text-primary, #000000)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', position: 'relative' }}>

      {/* ── iOS Top Navigation Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px', background: 'var(--bg-ios)', zIndex: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {activeTab === 'chats' || activeTab === 'calls' || activeTab === 'contacts' ? (
            <span style={{ color: '#007AFF', fontSize: '17px', fontWeight: '400', cursor: 'pointer' }}>Edit</span>
          ) : activeTab === 'settings' && settingsSubPage ? (
            <button onClick={() => setSettingsSubPage(null)} style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '17px', padding: 0 }}>
              <ArrowLeft size={22} /> Back
            </button>
          ) : activeTab === 'status' && showStatusSettings ? (
            <button onClick={() => { if (selectingContactsFor) setSelectingContactsFor(null); else setShowStatusSettings(false); }} style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '17px', padding: 0 }}>
              <ArrowLeft size={22} /> Back
            </button>
          ) : null}
        </div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          {((activeTab === 'settings' && settingsSubPage) || (activeTab === 'status' && showStatusSettings)) ? (
            <span style={{ fontSize: '17px', fontWeight: '600' }}>{getHeaderTitle()}</span>
          ) : (
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#8E8E93', letterSpacing: '0.5px' }}>ZAPCHAT</span>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
            {activeTab === 'chats' && (
              <>
                <Camera size={24} color="#007AFF" strokeWidth={1.5} style={{ cursor: 'pointer' }} onClick={() => openCamera('user')} />
                <div style={{ cursor: 'pointer', background: '#007AFF', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,122,255,0.3)' }} onClick={() => { setSelectContactSearch(''); setSelectContactOpen(true); }}>
                  <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                </div>
              </>
            )}
            {activeTab === 'status' && !showStatusSettings && (
                <Settings size={24} color="#007AFF" strokeWidth={1.5} style={{ cursor: 'pointer' }} onClick={() => setShowStatusSettings(true)} />
            )}
            {activeTab === 'status' && showStatusSettings && savingStatusSettings && (
                <RotateCw size={18} className="animate-spin" color="#007AFF" />
            )}
            {activeTab === 'status' && showStatusSettings && justSavedStatus && (
                <Check size={20} color="#34C759" strokeWidth={3} />
            )}
            {activeTab === 'calls' && (
              <Phone size={24} color="#007AFF" strokeWidth={1.5} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('contacts')} />
            )}
            {activeTab === 'contacts' && (
              <div style={{ cursor: 'pointer', background: '#007AFF', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,122,255,0.3)' }} onClick={() => setSettingsSubPage('profile')}>
                <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
              </div>
            )}
        </div>
      </div>

      {/* ── Large iOS Title ── */}
      {!(activeTab === 'settings' && settingsSubPage) && !(activeTab === 'status' && showStatusSettings) && (
        <div style={{ padding: '4px 16px 8px', background: 'var(--bg-ios)' }}>
          <h1 style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '0.4px', margin: 0, color: 'var(--text-primary, #000)' }}>
            {getHeaderTitle()}
          </h1>
        </div>
      )}

      {/* ── Search Bar (Conditional for lists) ── */}
      {activeTab !== 'settings' && activeTab !== 'status' && (
        <div className="ios-search-container" style={{ flexShrink: 0, marginTop: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#8E8E93" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="ios-search-pill"
              placeholder={activeTab === 'contacts' ? "Search contacts directory" : "Search chats"}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: '#E5E5EA', color: '#000000' }}
            />
          </div>
        </div>
      )}

      {/* ── Chats Filter chips (Only inside Chats Tab) ── */}
      {activeTab === 'chats' && (
        <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'groups', label: 'Groups' },
            { id: 'favorites', label: 'Favorites' }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setChatFilter(chip.id)}
              style={{
                background: chatFilter === chip.id ? '#E5F0FF' : '#F2F2F7',
                color: chatFilter === chip.id ? '#007AFF' : '#8E8E93',
                fontSize: '13px',
                fontWeight: '600',
                padding: '6px 14px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}


      {/* ── Body Content Container ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#FFFFFF' }}>

        {/* ── CHATS TAB ── */}
        {activeTab === 'chats' && (
          <div style={{ paddingBottom: '20px' }}>
            {loading && <div style={{ padding: '30px', textAlign: 'center', color: '#8E8E93', fontSize: '14px' }}>Loading chats...</div>}
            {!loading && getFilteredChats().length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8E8E93' }}>
                <MessageCircle size={48} style={{ marginBottom: '12px', opacity: 0.3, color: '#007AFF' }} />
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#000000' }}>No chats yet</div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>Start a conversation!</div>
              </div>
            )}
            {getFilteredChats().map((contact, idx) => (
              <div
                key={contact._id || idx}
                onClick={() => onSelectContact(contact)}
                className={`ios-contact-row ${selectedContact?._id === contact._id ? 'active' : ''}`}
                style={{ borderBottom: '0.5px solid #E5E5EA' }}
              >
                {renderUserAvatar(contact._id, contact.displayName, contact.profilePicture, contact.isGroup, 54)}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontWeight: '700', color: '#000000', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {contact.displayName}
                      </span>
                      {contact.role === 'admin' && (
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: '800',
                          backgroundColor: '#007AFF', 
                          color: '#FFFFFF',
                          padding: '2px 5px', 
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          lineHeight: '1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          ADMIN
                        </span>
                      )}
                    </div>
                    {contact.lastMessageAt && (
                      <span style={{ fontSize: '12px', color: contact.unreadCount > 0 ? '#007AFF' : '#8E8E93', fontWeight: contact.unreadCount > 0 ? '600' : '400', flexShrink: 0, marginLeft: '8px' }}>
                        {formatTime(contact.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#8E8E93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '8px' }}>
                      {(() => {
                        const lm = contact.lastMessage;
                        if (!lm) return <span style={{ color: '#8E8E93', fontSize: '13px', fontStyle: 'italic' }}>Tap to chat</span>;
                        
                        let isLoc = false;
                        let textVal = '';
                        
                        if (typeof lm === 'string') {
                          textVal = lm;
                        } else if (typeof lm === 'object') {
                          if (lm.type === 'location') {
                            isLoc = true;
                          } else {
                            textVal = lm.content || lm.text || lm.caption || '';
                          }
                        }
                        
                        if (typeof textVal === 'string' && /^-?\d+\.\d+,-?\d+\.\d+$/.test(textVal.trim())) {
                          isLoc = true;
                        }
                        
                        if (isLoc) {
                          return (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF416C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span style={{ color: '#555', fontSize: '13px', fontWeight: '500' }}>Location</span>
                            </span>
                          );
                        }
                        
                        if (typeof lm === 'string') {
                          return lm;
                        }
                        
                        if (typeof lm === 'object') {
                          if (lm.type === 'image') return <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF8E53" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style={{ color: '#555', fontSize: '13px', fontWeight: '500' }}>Photo</span></span>;
                          if (lm.type === 'video') return <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#764ba2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg><span style={{ color: '#555', fontSize: '13px', fontWeight: '500' }}>Video</span></span>;
                          if (lm.type === 'audio' || lm.type === 'voice') return <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#11998e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg><span style={{ color: '#555', fontSize: '13px', fontWeight: '500' }}>Voice message</span></span>;
                          if (lm.type === 'document') return <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f093fb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span style={{ color: '#555', fontSize: '13px', fontWeight: '500' }}>Document</span></span>;
                          return textVal || 'Message';
                        }
                        return 'Tap to chat';
                      })()}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Admin Control Button */}
                      {user?.role === 'admin' && !contact.isGroup && contact._id !== user?._id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAdminUser(contact);
                            setShowAdminControlPanel(true);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#FF3B30',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '50%',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFECEB'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Shield size={16} />
                        </button>
                      )}
                      {/* Star Icon for Favorite */}
                      <button onClick={(e) => toggleFavorite(contact._id, e)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'transform 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.25)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                        <Star size={16} fill={favorites.includes(contact._id) ? '#FFCC00' : 'none'} stroke={favorites.includes(contact._id) ? '#FFCC00' : '#C7C7CC'} style={{ filter: favorites.includes(contact._id) ? 'drop-shadow(0 0 4px rgba(255,204,0,0.6))' : 'none', transition: 'all 0.3s ease' }} />
                      </button>
                      {contact.unreadCount > 0 && (
                        <span style={{ background: '#007AFF', color: '#fff', borderRadius: '10px', minWidth: '20px', height: '20px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STATUS TAB ── */}
        {activeTab === 'status' && (
          <div style={{ 
            paddingBottom: '40px', 
            background: (showStatusSettings || selectingContactsFor) ? 'var(--bg-vip-light, #f2f2f7)' : '#FFFFFF', 
            minHeight: '100%',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>

            {/* ── SUB-PAGE 1: CONTACT SELECTION LIST ── */}
            {selectingContactsFor ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '12px' }}>
                <div style={{ padding: '0 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '600' }}>
                  {selectingContactsFor === 'exceptions' && "Exclude contacts"}
                  {selectingContactsFor === 'only_share' && "Share only with selected contacts"}
                  {selectingContactsFor === 'close_friends' && "Select close friends inner circle"}
                </div>

                {/* Search Bar for Contact Picker */}
                <div style={{ padding: '0 16px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} color="#8E8E93" style={{ position: 'absolute', left: '12px' }} />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      style={{ 
                        width: '100%', 
                        height: '38px', 
                        background: 'var(--bg-vip, #FFFFFF)', 
                        border: '1px solid var(--border-vip, rgba(0,0,0,0.05))', 
                        borderRadius: '10px', 
                        padding: '0 12px 0 36px', 
                        fontSize: '15px', 
                        outline: 'none',
                        color: 'var(--text-main, #000000)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    />
                    {contactSearchQuery && (
                      <button 
                        onClick={() => setContactSearchQuery('')}
                        style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#8E8E93', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      >
                        <XIcon size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contacts List */}
                <div style={{ background: 'var(--bg-vip, #FFFFFF)', borderTop: '0.5px solid var(--border-ios, #C8C7CC)', borderBottom: '0.5px solid var(--border-ios, #C8C7CC)' }}>
                  {(() => {
                    const formatted = getFormattedContacts();
                    const filtered = formatted.filter(contact => {
                      const query = contactSearchQuery.toLowerCase();
                      return (
                        contact.displayName.toLowerCase().includes(query) ||
                        (contact.phone && contact.phone.includes(query)) ||
                        (contact.email && contact.email.toLowerCase().includes(query))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#8E8E93', fontSize: '14px' }}>
                          No contacts found
                        </div>
                      );
                    }

                    return filtered.map((contact, idx, arr) => {
                      let isChecked = false;
                      if (selectingContactsFor === 'exceptions') {
                        isChecked = (statusPrivacyExceptions || []).includes(contact._id);
                      } else if (selectingContactsFor === 'only_share') {
                        isChecked = (statusPrivacyOnlyShare || []).includes(contact._id);
                      } else if (selectingContactsFor === 'close_friends') {
                        isChecked = (statusCloseFriends || []).includes(contact._id);
                      }

                      return (
                        <div
                          key={contact._id}
                          onClick={() => handleContactToggle(contact._id)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '10px 16px', 
                            cursor: 'pointer', 
                            borderBottom: idx === arr.length - 1 ? 'none' : '0.5px solid var(--border-ios, #E5E5EA)', 
                            gap: '12px',
                            background: 'transparent'
                          }}
                        >
                          <img
                            src={contact.profilePicture ? (contact.profilePicture.startsWith('http') ? contact.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + contact.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(contact.displayName || '') + "&background=random&color=fff"}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                            alt=""
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-main, #000000)', fontSize: '15px' }}>
                              {contact.displayName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#8E8E93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                              {contact.about || contact.email || contact.phone || "Hey there! I am using Zap Chat."}
                            </div>
                          </div>
                          {isChecked && (
                            <Check size={20} color="#007AFF" style={{ flexShrink: 0 }} />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : showStatusSettings ? (
              // ── SUB-PAGE 2: STATUS PRIVACY & SETTINGS PANELS (ULTRA-PRO EDITION) ──
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px', animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <style>{`
                  @keyframes pulse-ring-glow {
                    0%, 100% { filter: drop-shadow(0 0 5px var(--glow-color, rgba(52, 199, 89, 0.45))); }
                    50% { filter: drop-shadow(0 0 15px var(--glow-color, rgba(52, 199, 89, 0.75))); }
                  }
                  @keyframes pulse-badge {
                    0%, 100% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.03); filter: brightness(1.1); }
                  }
                  .vip-row-hover {
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
                  }
                  .vip-row-hover:hover {
                    background: var(--bg-vip-light, rgba(0, 0, 0, 0.02)) !important;
                    transform: scale(1.012) translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
                  }
                  .vip-row-hover:active {
                    transform: scale(0.98);
                  }
                  .vip-switch-hover {
                    transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
                  }
                  .vip-switch-hover:hover {
                    background: var(--bg-vip-light, rgba(0, 0, 0, 0.015)) !important;
                    padding-left: 4px !important;
                  }
                  .vip-slider-thumb::-webkit-slider-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #FFFFFF;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.18);
                    transition: transform 0.1s ease;
                    cursor: pointer;
                    -webkit-appearance: none;
                  }
                  .vip-slider-thumb::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                  }
                  .vip-slider-thumb::-webkit-slider-thumb:active {
                    transform: scale(0.9);
                  }
                `}</style>
                
                {/* Description Banner */}
                <div style={{ padding: '0 20px', fontSize: '13px', color: '#8E8E93', lineHeight: '1.45', textAlign: 'center' }}>
                  Choose who can see your status updates. Changes will apply to your new status updates immediately.
                </div>

                {/* ── LIVE PRIVACY RING PREVIEW WIDGET (PRO HIGHLIGHT) ── */}
                <div style={{
                  margin: '0 16px',
                  padding: '18px 16px',
                  background: 'linear-gradient(135deg, var(--bg-vip, #FFFFFF) 0%, rgba(0, 122, 255, 0.02) 100%)',
                  border: '1px solid var(--border-vip, rgba(0,0,0,0.06))',
                  borderRadius: '24px',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  {/* Glowing ambient background circle */}
                  <div style={{
                    position: 'absolute',
                    top: '-35px',
                    right: '-35px',
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    filter: 'blur(30px)',
                    opacity: 0.15,
                    background: statusPrivacy === 'contacts' ? '#34C759' :
                               statusPrivacy === 'exceptions' ? '#FF3B30' :
                               statusPrivacy === 'only_share' ? '#007AFF' : '#FFCC00',
                    transition: 'all 0.5s ease'
                  }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                    {/* Left Column: Dynamic Spinning Ring */}
                    <div style={{ position: 'relative', width: '68px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      
                      {/* Ring Outer Canvas */}
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '3px solid transparent',
                        borderTopColor: statusPrivacy === 'contacts' ? '#34C759' :
                                        statusPrivacy === 'exceptions' ? '#FF3B30' :
                                        statusPrivacy === 'only_share' ? '#007AFF' : '#FFCC00',
                        borderRightColor: statusPrivacy === 'contacts' ? '#34C759' :
                                          statusPrivacy === 'exceptions' ? 'rgba(255, 59, 48, 0.2)' :
                                          statusPrivacy === 'only_share' ? '#007AFF' : '#FFCC00',
                        borderBottomColor: statusPrivacy === 'contacts' ? '#34C759' :
                                           statusPrivacy === 'exceptions' ? '#FF3B30' :
                                           statusPrivacy === 'only_share' ? '#007AFF' : '#FFCC00',
                        borderLeftColor: statusPrivacy === 'contacts' ? '#34C759' :
                                         statusPrivacy === 'exceptions' ? 'rgba(255, 59, 48, 0.2)' :
                                         statusPrivacy === 'only_share' ? 'rgba(0, 122, 255, 0.2)' : 'rgba(255, 204, 0, 0.2)',
                        animation: 'spin 14s linear infinite',
                        filter: `drop-shadow(0 0 5px ${
                          statusPrivacy === 'contacts' ? 'rgba(52, 199, 89, 0.4)' :
                          statusPrivacy === 'exceptions' ? 'rgba(255, 59, 48, 0.4)' :
                          statusPrivacy === 'only_share' ? 'rgba(0, 122, 255, 0.4)' : 'rgba(255, 204, 0, 0.4)'
                        })`,
                        transition: 'all 0.5s ease'
                      }} />

                      {/* Badge Indicators */}
                      {statusPrivacy === 'exceptions' && (
                        <div style={{ position: 'absolute', top: -1, right: -1, background: '#FF3B30', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg-vip, #fff)', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}>
                          <Lock size={10} strokeWidth={3} />
                        </div>
                      )}
                      {statusPrivacy === 'only_share' && (
                        <div style={{ position: 'absolute', top: -1, right: -1, background: '#007AFF', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg-vip, #fff)', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}>
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                      {statusPrivacy === 'contacts' && (
                        <div style={{ position: 'absolute', top: -1, right: -1, background: '#34C759', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg-vip, #fff)', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}>
                          <Globe size={10} strokeWidth={3} />
                        </div>
                      )}

                      {/* Center profile circle */}
                      <div style={{ width: '54px', height: '54px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--bg-vip, #FFFFFF)', background: '#E5E5EA', position: 'relative' }}>
                        {user?.profilePicture ? (
                          <img
                            src={user.profilePicture.startsWith('http') ? user.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token')}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            alt=""
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#007AFF', color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                            {getInitials(user?.displayName || user?.name || 'User')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Title & Dynamic Descriptions */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#8E8E93' }}>Status Ring</span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2.5px 8px',
                          borderRadius: '12px',
                          color: '#FFFFFF',
                          background: statusPrivacy === 'contacts' ? 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)' :
                                      statusPrivacy === 'exceptions' ? 'linear-gradient(135deg, #FF3B30 0%, #C72A21 100%)' :
                                      statusPrivacy === 'only_share' ? 'linear-gradient(135deg, #007AFF 0%, #0056B3 100%)' : 'linear-gradient(135deg, #FFCC00 0%, #CCA300 100%)',
                          boxShadow: `0 2px 8px ${
                            statusPrivacy === 'contacts' ? 'rgba(52, 199, 89, 0.3)' :
                            statusPrivacy === 'exceptions' ? 'rgba(255, 59, 48, 0.3)' :
                            statusPrivacy === 'only_share' ? 'rgba(0, 122, 255, 0.3)' : 'rgba(255, 204, 0, 0.3)'
                          }`,
                          transition: 'all 0.5s ease'
                        }}>
                          {statusPrivacy === 'contacts' ? 'My Contacts' :
                           statusPrivacy === 'exceptions' ? 'Excluded Ring' :
                           statusPrivacy === 'only_share' ? 'Whitelist Active' : 'Friends Circle'}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main, #000000)', lineHeight: '1.25' }}>
                        {statusPrivacy === 'contacts' && "Visible to all synced contacts."}
                        {statusPrivacy === 'exceptions' && `Excluded ${statusPrivacyExceptions?.length || 0} contacts.`}
                        {statusPrivacy === 'only_share' && `Sharing with ${statusPrivacyOnlyShare?.length || 0} whitelisted contacts.`}
                      </div>

                      {/* Active Security Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                        {statusHideViewersList && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: '800', background: 'rgba(175, 82, 222, 0.1)', color: '#AF52DE', padding: '2px 6px', borderRadius: '6px', border: '0.5px solid rgba(175, 82, 222, 0.15)' }}>
                            <EyeOff size={9} /> GHOST ACTIVE
                          </span>
                        )}
                        {statusDisableScreenshot && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: '800', background: 'rgba(88, 86, 214, 0.08)', color: '#5856D6', padding: '2px 6px', borderRadius: '6px', border: '0.5px solid rgba(88, 86, 214, 0.12)' }}>
                            <ShieldCheck size={9} /> ANTI-SCREENSHOT
                          </span>
                        )}
                        {statusCustomExpiryTime !== 24 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: '800', background: 'rgba(255, 149, 0, 0.08)', color: '#FF9500', padding: '2px 6px', borderRadius: '6px', border: '0.5px solid rgba(255, 149, 0, 0.12)' }}>
                            <Timer size={9} /> {statusCustomExpiryTime}h EXPIRY
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Visual Feed Simulator overlay (STUNNING PHONE WRAPPER) ── */}
                  <div style={{
                    position: 'relative',
                    padding: '24px 14px 14px 14px',
                    background: 'rgba(255, 255, 255, 0.55)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {/* Mock phone status bar */}
                    <div style={{ position: 'absolute', top: '6px', left: '14px', right: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#000000', fontWeight: '600', opacity: 0.65, letterSpacing: '-0.1px' }}>
                      <span>9:41</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {/* cellular */}
                        <svg width="12" height="8" viewBox="0 0 17 11" fill="currentColor"><path d="M 2 9 L 3.5 9 L 3.5 11 L 2 11 Z M 5 7 L 6.5 7 L 6.5 11 L 5 11 Z M 8 5 L 9.5 5 L 9.5 11 L 8 11 Z M 11 3 L 12.5 3 L 12.5 11 L 11 11 Z M 14 0 L 15.5 0 L 15.5 11 L 14 11 Z" /></svg>
                        {/* wifi */}
                        <svg width="10" height="8" viewBox="0 0 15 11" fill="currentColor"><path d="M 7.5 11 A 1.5 1.5 0 1 1 7.5 8 A 1.5 1.5 0 1 1 7.5 11 M 7.5 7 A 3.5 3.5 0 0 0 4.2 8.7 L 3.1 7.6 A 5 5 0 0 1 7.5 5.5 A 5 5 0 0 1 11.9 7.6 L 10.8 8.7 A 3.5 3.5 0 0 0 7.5 7 M 7.5 3 A 7.5 7.5 0 0 0 2.2 5.1 L 1.1 4 A 9 9 0 0 1 7.5 1.5 A 9 9 0 0 1 13.9 4 L 12.8 5.1 A 7.5 7.5 0 0 0 7.5 3 Z" /></svg>
                        {/* battery */}
                        <span style={{ fontSize: '8px', border: '1px solid currentColor', padding: '0px 2px', borderRadius: '3px', fontWeight: '700' }}>100%</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '2px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#007AFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live View Simulator</span>
                      <span style={{ fontSize: '9px', background: 'rgba(0,122,255,0.1)', color: '#007AFF', padding: '1px 6px', borderRadius: '4px', fontWeight: '750' }}>ACTIVE PREVIEW</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Story Circle Bubble */}
                      <div style={{ 
                        position: 'relative', 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '50%', 
                        padding: '2.5px',
                        background: statusPrivacy === 'contacts' ? '#34C759' :
                                    statusPrivacy === 'exceptions' ? '#FF3B30' :
                                    statusPrivacy === 'only_share' ? '#007AFF' : '#FFCC00',
                        boxShadow: `0 0 8px ${
                          statusPrivacy === 'contacts' ? 'rgba(52, 199, 89, 0.2)' :
                          statusPrivacy === 'exceptions' ? 'rgba(255, 59, 48, 0.2)' :
                          statusPrivacy === 'only_share' ? 'rgba(0, 122, 255, 0.2)' : 'rgba(255, 204, 0, 0.2)'
                        }`,
                        transition: 'all 0.4s ease'
                      }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '2.5px solid var(--bg-vip, #FFFFFF)', background: '#E5E5EA' }}>
                          {user?.profilePicture ? (
                            <img src={user.profilePicture.startsWith('http') ? user.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#007AFF', color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                              {getInitials(user?.displayName || user?.name || 'User')}
                            </div>
                          )}
                        </div>
                        {/* Overlap Privacy Badge on Simulator */}
                        <div style={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: statusPrivacy === 'contacts' ? '#34C759' :
                                      statusPrivacy === 'exceptions' ? '#FF3B30' :
                                      statusPrivacy === 'only_share' ? '#007AFF' : '#FFCC00',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1.5px solid var(--bg-vip, #FFFFFF)',
                          color: '#FFFFFF'
                        }}>
                          {statusPrivacy === 'contacts' && <Globe size={9} strokeWidth={3} />}
                          {statusPrivacy === 'exceptions' && <Lock size={9} strokeWidth={3} />}
                          {statusPrivacy === 'only_share' && <Check size={9} strokeWidth={3} />}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-main, #000000)' }}>Your Story</div>
                        <div style={{ fontSize: '11px', color: '#8E8E93', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Just now</span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: statusDisableScreenshot ? '#FF3B30' : '#8E8E93', fontWeight: statusDisableScreenshot ? '700' : 'normal' }}>
                            {statusDisableScreenshot ? 'Screenshot Blocked' : 'Normal Story'}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ 
                        fontSize: '10px', 
                        background: 'rgba(0,0,0,0.04)', 
                        padding: '3px 8px', 
                        borderRadius: '8px', 
                        fontWeight: '800', 
                        color: 'var(--text-main, #8E8E93)',
                        border: '0.5px solid var(--border-vip, rgba(0,0,0,0.05))'
                      }}>
                        {statusCustomExpiryTime}h left
                      </div>
                    </div>

                    {/* Glowing dynamic security badge tags inside phone container */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '0.5px solid rgba(0,0,0,0.05)', paddingTop: '10px', marginTop: '2px' }}>
                      {statusHideViewersList && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          fontWeight: '850',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          background: 'linear-gradient(135deg, #AF52DE 0%, #7622A5 100%)',
                          boxShadow: '0 2px 6px rgba(175, 82, 222, 0.35)',
                          animation: 'pulse-badge 2s infinite'
                        }}>
                          <span>🕵️</span> Ghost Mode Active
                        </div>
                      )}
                      {statusDisableScreenshot && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          fontWeight: '850',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          background: 'linear-gradient(135deg, #5856D6 0%, #3D39B3 100%)',
                          boxShadow: '0 2px 6px rgba(88, 86, 214, 0.35)',
                          animation: 'pulse-badge 2s infinite'
                        }}>
                          <span>🚫</span> Screenshot Shield
                        </div>
                      )}
                      {statusPrivateAccount && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          fontWeight: '850',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          background: 'linear-gradient(135deg, #FF453A 0%, #C8261E 100%)',
                          boxShadow: '0 2px 6px rgba(255, 69, 58, 0.35)',
                          animation: 'pulse-badge 2s infinite'
                        }}>
                          <span>🔒</span> Approved Only
                        </div>
                      )}
                      {!statusAllowDownload && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          fontWeight: '850',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          background: 'linear-gradient(135deg, #30B0C7 0%, #1A8395 100%)',
                          boxShadow: '0 2px 6px rgba(48, 176, 199, 0.35)',
                          animation: 'pulse-badge 2s infinite'
                        }}>
                          <span>📥</span> Save Blocked
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Group 1: Privacy Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ padding: '0 20px', fontSize: '12px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.6px' }}>
                    Status Privacy
                  </div>
                  <div style={{ 
                    background: 'var(--bg-vip, #FFFFFF)', 
                    borderRadius: '20px', 
                    margin: '0 16px', 
                    padding: '4px 16px',
                    border: '1px solid var(--border-vip, rgba(0,0,0,0.06))',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.015)'
                  }}>
                    
                    {/* Row 1: My Contacts */}
                    <div 
                      onClick={() => {
                        setStatusPrivacy('contacts');
                        saveStatusSettings({ privacy: 'contacts' });
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios, #E5E5EA)', padding: '12px 0', cursor: 'pointer' }}
                    >
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Users size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>My Contacts</span>
                        <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>Share with all your synced contacts</span>
                      </div>
                      {statusPrivacy === 'contacts' && <Check size={20} color="#007AFF" strokeWidth={2.5} />}
                    </div>

                    {/* Row 2: My Contacts Except */}
                    <div 
                      onClick={() => {
                        setStatusPrivacy('exceptions');
                        saveStatusSettings({ privacy: 'exceptions' });
                        setSelectingContactsFor('exceptions');
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios, #E5E5EA)', padding: '12px 0', cursor: 'pointer' }}
                    >
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #FF3B30 0%, #D81B1B 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <UserMinus size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>My Contacts Except...</span>
                          {(statusPrivacyExceptions || []).length > 0 && (
                            <span style={{ fontSize: '11px', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>
                              {statusPrivacyExceptions.length}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>Exclude specific contacts from viewing</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {statusPrivacy === 'exceptions' && <Check size={20} color="#007AFF" strokeWidth={2.5} style={{ marginRight: '6px' }} />}
                        <ChevronRight size={18} color="#C7C7CC" />
                      </div>
                    </div>

                    {/* Row 3: Only Share With */}
                    <div 
                      onClick={() => {
                        setStatusPrivacy('only_share');
                        saveStatusSettings({ privacy: 'only_share' });
                        setSelectingContactsFor('only_share');
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer' }}
                    >
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #007AFF 0%, #0056B3 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <UserCheck size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>Only Share With...</span>
                          {(statusPrivacyOnlyShare || []).length > 0 && (
                            <span style={{ fontSize: '11px', background: 'rgba(0,122,255,0.1)', color: '#007AFF', padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>
                              {statusPrivacyOnlyShare.length}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>Share only with whitelisted contacts</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {statusPrivacy === 'only_share' && <Check size={20} color="#007AFF" strokeWidth={2.5} style={{ marginRight: '6px' }} />}
                        <ChevronRight size={18} color="#C7C7CC" />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Group 2: Exclusives */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ padding: '0 20px', fontSize: '12px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.6px' }}>
                    Inner Circles
                  </div>
                  <div style={{ 
                    background: 'var(--bg-vip, #FFFFFF)', 
                    borderRadius: '20px', 
                    margin: '0 16px', 
                    padding: '4px 16px',
                    border: '1px solid var(--border-vip, rgba(0,0,0,0.06))',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.015)'
                  }}>
                    <div 
                      onClick={() => setSelectingContactsFor('close_friends')}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '7px',
                          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Star size={18} fill="#FFFFFF" color="#FFFFFF" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>Close Friends</span>
                          <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>Separate updates specifically for your inner circle</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(statusCloseFriends || []).length > 0 && (
                          <span style={{ fontSize: '12px', color: '#FFA500', fontWeight: '700' }}>
                            {statusCloseFriends.length} friends
                          </span>
                        )}
                        <ChevronRight size={18} color="#C7C7CC" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group 3: Expiry & Timers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ padding: '0 20px', fontSize: '12px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.6px' }}>
                    Status Expiry Duration
                  </div>
                  <div style={{ 
                    background: 'var(--bg-vip, #FFFFFF)', 
                    borderRadius: '20px', 
                    margin: '0 16px', 
                    padding: '16px',
                    border: '1px solid var(--border-vip, rgba(0,0,0,0.06))',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.015)'
                  }}>
                    
                    {/* Header showing current time */}
                    <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', marginBottom: '14px', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '7px',
                          background: 'linear-gradient(135deg, #FF9500 0%, #FF5E00 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Timer size={18} color="#FFFFFF" />
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>Expiry Time</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '800', background: 'rgba(255,149,0,0.1)', color: '#FF9500', padding: '4px 12px', borderRadius: '12px' }}>
                        {statusCustomExpiryTime} Hours
                      </span>
                    </div>

                    {/* Expiry Slider */}
                    <div style={{ margin: '10px 0 16px' }}>
                      <input 
                        type="range" 
                        min="1" 
                        max="72" 
                        value={statusCustomExpiryTime} 
                        onChange={(e) => setStatusCustomExpiryTime(Number(e.target.value))}
                        onMouseUp={() => saveStatusSettings({ customExpiryTime: statusCustomExpiryTime })}
                        onTouchEnd={() => saveStatusSettings({ customExpiryTime: statusCustomExpiryTime })}
                        style={{ 
                          width: '100%', 
                          height: '6px', 
                          background: `linear-gradient(to right, #007AFF 0%, #007AFF ${((statusCustomExpiryTime - 1) / 71) * 100}%, #E5E5EA ${((statusCustomExpiryTime - 1) / 71) * 100}%, #E5E5EA 100%)`, 
                          outline: 'none', 
                          borderRadius: '3px',
                          cursor: 'pointer',
                          WebkitAppearance: 'none'
                        }}
                        className="vip-slider-thumb"
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8E8E93', marginTop: '6px' }}>
                        <span>1 Hour</span>
                        <span>24h (Default)</span>
                        <span>72 Hours</span>
                      </div>
                    </div>

                    {/* Expiry Presets */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { val: 1, label: '1 Hour' },
                        { val: 12, label: '12 Hours' },
                        { val: 24, label: '24 Hours' },
                        { val: 48, label: '48 Hours' }
                      ].map(preset => {
                        const isSelected = statusCustomExpiryTime === preset.val;
                        return (
                          <button
                            key={preset.val}
                            onClick={() => {
                              setStatusCustomExpiryTime(preset.val);
                              saveStatusSettings({ customExpiryTime: preset.val });
                            }}
                            style={{
                              flex: 1,
                              background: isSelected ? 'rgba(0,122,255,0.12)' : 'var(--bg-vip-light, #F2F2F7)',
                              color: isSelected ? '#007AFF' : 'var(--text-main, #000000)',
                              border: isSelected ? '1px solid rgba(0, 122, 255, 0.4)' : '1px solid transparent',
                              borderRadius: '10px',
                              padding: '8px 0',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                  </div>
                </div>

                {/* Group 4: Advanced Status Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '20px' }}>
                  <div style={{ padding: '0 20px', fontSize: '12px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.6px' }}>
                    Advanced Security & Vault
                  </div>
                  <div style={{ 
                    background: 'var(--bg-vip, #FFFFFF)', 
                    borderRadius: '20px', 
                    margin: '0 16px', 
                    padding: '4px 16px',
                    border: '1px solid var(--border-vip, rgba(0,0,0,0.06))',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.015)'
                  }}>
                    
                    {/* Ghost Mode Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios, #E5E5EA)', padding: '14px 0' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #AF52DE 0%, #7622A5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <EyeOff size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '12px', flex: 1 }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>Ghost View Mode</span>
                        <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px', lineHeight: '1.35' }}>
                          View other people's updates anonymously. Your view list is also hidden.
                        </span>
                      </div>
                      <label className="ios-toggle-switch">
                        <input
                          type="checkbox"
                          checked={statusHideViewersList}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setStatusHideViewersList(val);
                            saveStatusSettings({ hideViewersList: val });
                          }}
                        />
                        <span className="ios-toggle-slider"></span>
                      </label>
                    </div>

                    {/* Disable Screenshot Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios, #E5E5EA)', padding: '14px 0' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #5856D6 0%, #3D39B3 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ShieldCheck size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '12px', flex: 1 }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>Screenshot Protection</span>
                        <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px', lineHeight: '1.35' }}>
                          Prevent viewers from taking screenshots or screen recordings of your updates.
                        </span>
                      </div>
                      <label className="ios-toggle-switch">
                        <input
                          type="checkbox"
                          checked={statusDisableScreenshot}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setStatusDisableScreenshot(val);
                            saveStatusSettings({ disableScreenshot: val });
                          }}
                        />
                        <span className="ios-toggle-slider"></span>
                      </label>
                    </div>

                    {/* Allow Downloads Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios, #E5E5EA)', padding: '14px 0' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #30B0C7 0%, #1A8395 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Download size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '12px', flex: 1 }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>Allow Media Downloads</span>
                        <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px', lineHeight: '1.35' }}>
                          Allow other users to save/download photos and videos from your updates.
                        </span>
                      </div>
                      <label className="ios-toggle-switch">
                        <input
                          type="checkbox"
                          checked={statusAllowDownload}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setStatusAllowDownload(val);
                            saveStatusSettings({ allowDownload: val });
                          }}
                        />
                        <span className="ios-toggle-slider"></span>
                      </label>
                    </div>

                    {/* Allow Forwarding Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '0.5px solid var(--border-ios, #E5E5EA)', padding: '14px 0' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #FF2D55 0%, #C3143B 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Share2 size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '12px', flex: 1 }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>Allow Forwarding</span>
                        <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px', lineHeight: '1.35' }}>
                          Permit other users to forward your status posts directly into active chat groups.
                        </span>
                      </div>
                      <label className="ios-toggle-switch">
                        <input
                          type="checkbox"
                          checked={statusAllowForward}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setStatusAllowForward(val);
                            saveStatusSettings({ allowForward: val });
                          }}
                        />
                        <span className="ios-toggle-slider"></span>
                      </label>
                    </div>

                    {/* Private Status Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'linear-gradient(135deg, #FF453A 0%, #C8261E 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Lock size={18} color="#FFFFFF" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '12px', flex: 1 }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main, #000000)' }}>Restricted Followers Only</span>
                        <span style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px', lineHeight: '1.35' }}>
                          Require explicit follower approval before contacts can access any of your updates.
                        </span>
                      </div>
                      <label className="ios-toggle-switch">
                        <input
                          type="checkbox"
                          checked={statusPrivateAccount}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setStatusPrivateAccount(val);
                            saveStatusSettings({ privateAccount: val });
                          }}
                        />
                        <span className="ios-toggle-slider"></span>
                      </label>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              // ── DEFAULT VIEW: ORIGINAL STATUS UPDATES LIST ──
              <>
                <div
                  style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: '0.5px solid #E5E5EA', gap: '12px', background: '#FFFFFF' }}
                  onClick={() => {
                    const myStoryGroup = stories.find(group => group.user?._id?.toString() === (user?.id || user?._id)?.toString());
                    if (myStoryGroup && myStoryGroup.stories && myStoryGroup.stories.length >= 2) {
                      setIsMyStatusManagerOpen(true);
                    } else if (myStoryGroup && myStoryGroup.stories && myStoryGroup.stories.length === 1) {
                      setViewingStoryGroup(myStoryGroup);
                    } else {
                      setIsAddStatusModalOpen(true);
                    }
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    {(() => {
                      const myStoryGroup = stories.find(group => group.user?._id?.toString() === (user?.id || user?._id)?.toString());
                      const hasMyStory = !!myStoryGroup && myStoryGroup.stories?.length > 0;
                      const isUploading = uploadingStory;
                      const storyCount = myStoryGroup?.stories?.length || 0;
                      const size = 54;
                      const strokeWidth = 2.2;
                      const r = (size / 2) - (strokeWidth / 2) - 0.5;
                      const C = 2 * Math.PI * r;

                      return (
                        <div style={{
                          position: 'relative',
                          width: `${size}px`,
                          height: `${size}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box'
                        }}>
                          {/* SVG Loader or Story Ring */}
                          {isUploading && (
                            <svg 
                              width={size} 
                              height={size} 
                              style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                transform: 'rotate(-90deg)', 
                                pointerEvents: 'none',
                                zIndex: 1
                              }}
                            >
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={r}
                                fill="none"
                                stroke="#007AFF"
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${C / 4} ${C}`}
                                style={{
                                  animation: 'spin 1s linear infinite',
                                  transformOrigin: 'center'
                                }}
                              />
                            </svg>
                          )}

                          {!isUploading && hasMyStory && (
                            <svg 
                              width={size} 
                              height={size} 
                              style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                transform: 'rotate(-90deg)', 
                                pointerEvents: 'none',
                                zIndex: 1
                              }}
                            >
                              {storyCount === 1 ? (
                                <circle
                                  cx={size / 2}
                                  cy={size / 2}
                                  r={r}
                                  fill="none"
                                  stroke="#007AFF"
                                  strokeWidth={strokeWidth}
                                />
                              ) : (
                                (() => {
                                  const gap = 3.5;
                                  const totalGap = storyCount * gap;
                                  const segmentLength = (C - totalGap) / storyCount;
                                  return (
                                    <circle
                                      cx={size / 2}
                                      cy={size / 2}
                                      r={r}
                                      fill="none"
                                      stroke="#007AFF"
                                      strokeWidth={strokeWidth}
                                      strokeDasharray={`${segmentLength} ${gap}`}
                                    />
                                  );
                                })()
                              )}
                            </svg>
                          )}

                          {/* Profile Picture */}
                          <div style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            padding: (isUploading || hasMyStory) ? '3.5px' : '0px',
                            background: (isUploading || hasMyStory) ? '#FFFFFF' : 'transparent'
                          }}>
                            {user?.profilePicture ? (
                              <img
                                src={user.profilePicture.startsWith('http') ? user.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token')}
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  borderRadius: '50%', 
                                  objectFit: 'cover'
                                }}
                                alt=""
                              />
                            ) : (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                background: '#007AFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                fontWeight: '600',
                                fontSize: '16px'
                              }}>
                                {getInitials(user?.displayName || user?.name || 'User')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        const myStoryGroup = stories.find(group => group.user?._id?.toString() === (user?.id || user?._id)?.toString());
                        if (myStoryGroup && myStoryGroup.stories && myStoryGroup.stories.length >= 1) {
                          setIsMyStatusManagerOpen(true);
                        } else {
                          setIsAddStatusModalOpen(true);
                        }
                      }}
                      style={{ position: 'absolute', bottom: 0, right: 0, background: '#007AFF', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFFFFF', zIndex: 3 }}
                    >
                      <Plus size={12} color="#fff" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#000000', fontSize: '16px' }}>My Status</div>
                    <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>
                      {(() => {
                        const myStoryGroup = stories.find(group => group.user?._id?.toString() === (user?.id || user?._id)?.toString());
                        if (myStoryGroup && myStoryGroup.stories.length > 0) {
                          return "Tap to manage status updates";
                        }
                        return "Tap to add status update";
                      })()}
                    </div>
                  </div>
                </div>

                {/* Others' Updates */}
                {!uploadingStory && (
                  <>
                    {showStatusSearch ? (
                  /* ── Search Mode: header replaced by search bar ── */
                  <div style={{
                    padding: '8px 16px',
                    background: '#F2F2F7',
                    borderBottom: '0.5px solid #E5E5EA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    animation: 'slideDown 0.2s ease'
                  }}>
                    <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: '12px', padding: '8px 12px', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #E5E5EA' }}>
                      <Search size={15} color="#8E8E93" style={{ flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="Search recent updates..."
                        value={statusSearchQuery}
                        onChange={e => setStatusSearchQuery(e.target.value)}
                        autoFocus
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: '#000', fontFamily: 'inherit' }}
                      />
                      {statusSearchQuery && (
                        <div onClick={() => setStatusSearchQuery('')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '17px', height: '17px', borderRadius: '50%', background: '#C7C7CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Cancel button to close search */}
                    <div
                      onClick={() => { setShowStatusSearch(false); setStatusSearchQuery(''); }}
                      style={{ color: '#007AFF', fontSize: '15px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      Cancel
                    </div>
                  </div>
                ) : (
                  /* ── Normal Mode: header with search icon ── */
                  <div style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    color: '#8E8E93',
                    fontWeight: '600',
                    letterSpacing: '-0.2px',
                    background: '#F2F2F7',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '0.5px solid #E5E5EA'
                  }}>
                    <span>Recent Updates</span>
                    <div
                      onClick={() => setShowStatusSearch(true)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(142,142,147,0.15)', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Search size={15} color="#8E8E93" />
                    </div>
                  </div>
                )}
                {(() => {
                  const otherStories = stories.filter(s => s.user?._id?.toString() !== (user?.id || user?._id)?.toString());
                  if (otherStories.length === 0) {
                    return <div style={{ padding: '30px', textAlign: 'center', color: '#8E8E93', fontSize: '14px' }}>No updates available</div>;
                  }
                  const q = statusSearchQuery.trim().toLowerCase();
                  const filtered = q
                    ? otherStories.filter(s => {
                        try {
                          return (
                            (s.user?.displayName || '').toLowerCase().includes(q) ||
                            (s.user?.username || '').toLowerCase().includes(q) ||
                            (s.user?._id?.toString() || '').toLowerCase().includes(q)
                          );
                        } catch(e) { return false; }
                      })
                    : otherStories;
                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '50px 20px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{ position: 'relative', width: '72px', height: '72px' }}>
                          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #F2F2F7, #E5E5EA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Search size={28} color="#C7C7CC" />
                          </div>
                          <div style={{ position: 'absolute', bottom: '0px', right: '0px', width: '22px', height: '22px', borderRadius: '50%', background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '700', color: '#000000', letterSpacing: '-0.3px' }}>Not Found</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93', maxWidth: '210px', lineHeight: '1.5' }}>
                          No status found for{' '}<span style={{ fontWeight: '600', color: '#007AFF' }}>"{ statusSearchQuery}"</span>
                        </div>
                      </div>
                    );
                  }
                  return filtered.map((story, i) => (
                    <div
                      key={story.user?._id || story._id || i}
                      style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: '0.5px solid #E5E5EA', gap: '12px' }}
                      onClick={() => setViewingStoryGroup(story)}
                    >
                      {(() => {
                        const size = 54;
                        const strokeWidth = 2.2;
                        const r = (size / 2) - (strokeWidth / 2) - 0.5;
                        const C = 2 * Math.PI * r;
                        const storyCount = story.stories?.length || 0;
                        const avatarUrl = story.user?.profilePicture 
                          ? (story.user.profilePicture.startsWith('http') ? story.user.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + story.user.profilePicture + "?token=" + localStorage.getItem('token')) 
                          : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(story.user?.displayName || '') + "&background=random&color=fff";

                        return (
                          <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg 
                              width={size} 
                              height={size} 
                              style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                transform: 'rotate(-90deg)', 
                                pointerEvents: 'none',
                                zIndex: 1
                              }}
                            >
                              {storyCount === 1 ? (
                                <circle
                                  cx={size / 2}
                                  cy={size / 2}
                                  r={r}
                                  fill="none"
                                  stroke="#007AFF"
                                  strokeWidth={strokeWidth}
                                />
                              ) : (
                                (() => {
                                  const gap = 3.5;
                                  const totalGap = storyCount * gap;
                                  const segmentLength = (C - totalGap) / storyCount;
                                  return (
                                    <circle
                                      cx={size / 2}
                                      cy={size / 2}
                                      r={r}
                                      fill="none"
                                      stroke="#007AFF"
                                      strokeWidth={strokeWidth}
                                      strokeDasharray={`${segmentLength} ${gap}`}
                                    />
                                  );
                                })()
                              )}
                            </svg>
                            <div style={{
                              width: `${size}px`,
                              height: `${size}px`,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              padding: '3.5px',
                              background: '#FFFFFF'
                            }}>
                              <img
                                src={avatarUrl}
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                alt=""
                              />
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', color: '#000000', fontSize: '16px' }}>{story.user?.displayName}</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{formatTime(story.stories?.[0]?.createdAt)}</span>
                          {q && (story.user?._id?.toString() || '').toLowerCase().includes(q) && (
                            <span style={{ fontSize: '11px', color: '#007AFF', background: 'rgba(0,122,255,0.1)', padding: '1px 6px', borderRadius: '6px', fontWeight: '600' }}>ID Match</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
                  </>
                )}
              </>
            )}

          </div>
        )}

        {/* ── CALLS TAB ── */}
        {activeTab === 'calls' && (
          <div style={{ paddingBottom: '20px' }}>
            <div style={{ padding: '6px 16px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '-0.2px', background: '#F2F2F7', textTransform: 'uppercase' }}>Recent Calls</div>
            {callLogs.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8E8E93' }}>
                <Phone size={48} style={{ marginBottom: '12px', opacity: 0.3, color: '#FF3B30' }} />
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#000000' }}>No call history</div>
              </div>
            ) : (
              callLogs.map((call, i) => {
                const otherPerson = call.caller?._id === (user?.id || user?._id) ? call.participants?.[0] : call.caller;
                const callName = call.isGroup ? call.group?.displayName : (otherPerson?.displayName || call.displayName || call.name || 'Unknown');
                const callAvatar = call.isGroup ? call.group?.groupIcon : (otherPerson?.profilePicture || call.profilePicture);
                const callRole = otherPerson?.role || call.role;

                return (
                  <div key={call._id || i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid #E5E5EA', gap: '12px' }}>
                    <img
                      src={callAvatar ? (callAvatar.startsWith('http') ? callAvatar : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + callAvatar + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(callName || '') + "&background=random&color=fff"}
                      className="ios-avatar"
                      alt=""
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', color: call.status === 'missed' ? '#FF3B30' : '#000000', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {callName}
                        </span>
                        {callRole === 'admin' && (
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: '800',
                            backgroundColor: '#007AFF', 
                            color: '#FFFFFF',
                            padding: '2px 5px', 
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            lineHeight: '1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            ADMIN
                          </span>
                        )}
                      </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>
                      {call.type === 'video' ? <Video size={13} /> : <Phone size={13} />}
                      <span>{call.status === 'missed' ? 'Missed' : call.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}</span>
                      <span>·</span>
                      <span>{formatTime(call.createdAt)}</span>
                      {call.duration > 0 && (
                        <>
                          <span>·</span>
                          <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Call Action Trigger buttons */}
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                      onClick={() => initiateCall(call, 'audio')}
                      style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', padding: '4px' }}
                    >
                      <Phone size={20} />
                    </button>
                    <button
                      onClick={() => initiateCall(call, 'video')}
                      style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', padding: '4px' }}
                    >
                      <Video size={20} />
                    </button>
                  </div>
                </div>
              );
            })
            )}
          </div>
        )}

        {/* ── CONTACTS TAB ── */}
        {activeTab === 'contacts' && (
          <div style={{ paddingBottom: '20px' }}>
            <div style={{ padding: '6px 16px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '-0.2px', background: '#F2F2F7', textTransform: 'uppercase' }}>All Contacts</div>
            {getFilteredContactsList().length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#8E8E93', fontSize: '14px' }}>No contacts found</div>
            ) : (
              getFilteredContactsList().map(u => (
                <div
                  key={u._id}
                  onClick={() => onSelectContact(u)}
                  className="ios-contact-row"
                  style={{ borderBottom: '0.5px solid #E5E5EA', alignItems: 'center' }}
                >
                  {renderUserAvatar(u._id, u.displayName, u.profilePicture, false, 54)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '700', color: '#000000', fontSize: '16px' }}>{u.displayName}</span>
                      {u.role === 'admin' && (
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: '800',
                          backgroundColor: '#007AFF', 
                          color: '#FFFFFF',
                          padding: '2px 5px', 
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          lineHeight: '1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#8E8E93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {u.about || 'Hey there! I am using Zap Chat.'}
                    </div>
                  </div>
                  {/* Real-time Call and Video launchers directly next to contact */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    {user?.role === 'admin' && u._id !== user?._id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdminUser(u);
                          setShowAdminControlPanel(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FF3B30',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '50%',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFECEB'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Shield size={18} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); initiateCall(u, 'audio'); }}
                      style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer' }}
                    >
                      <Phone size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); initiateCall(u, 'video'); }}
                      style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer' }}
                    >
                      <Video size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div style={{ paddingBottom: '40px', background: '#F2F2F7', minHeight: '100%' }}>

            {/* INDEX VIEW */}
            {!settingsSubPage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '12px' }}>

                {/* Profile Card Section */}
                <div
                  onClick={() => setSettingsSubPage('profile')}
                  style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', padding: '14px 16px', cursor: 'pointer', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', gap: '14px' }}
                >
                  <img
                    src={user?.profilePicture || (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(user?.displayName || '') + "&background=random&color=fff"}
                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                    alt=""
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '18px', color: '#000000' }}>{user?.displayName || 'User'}</div>
                    <div style={{ fontSize: '14px', color: '#8E8E93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {user?.about || 'Hey there! I am using Zap Chat.'}
                    </div>
                  </div>
                  <ChevronRight size={20} color="#C7C7CC" />
                </div>

                {/* Group 1: General Account Settings */}
                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC' }}>
                  {[
                    { id: 'account', label: 'Account', icon: UserIcon, color: '#007AFF' },
                    { id: 'privacy', label: 'Privacy', icon: Lock, color: '#34C759' },
                    { id: 'chats_appearance', label: 'Chats & Wallpaper', icon: MessageSquare, color: '#FF9500' },
                    { id: 'data', label: 'Data and Storage Usage', icon: Database, color: '#5856D6' }
                  ].map((item, idx, arr) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSettingsSubPage(item.id)}
                        style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: idx === arr.length - 1 ? 'none' : '0.5px solid #C8C7CC', gap: '14px' }}
                      >
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                          <Icon size={18} />
                        </div>
                        <span style={{ flex: 1, fontSize: '16px', fontWeight: '500', color: '#000000' }}>{item.label}</span>
                        <ChevronRight size={18} color="#C7C7CC" />
                      </div>
                    );
                  })}
                </div>

                {/* Group 2: Support & Info */}
                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC' }}>
                  {[
                    { id: 'help', label: 'Help', icon: HelpCircle, color: '#8E8E93' },
                    { id: 'about', label: 'About', icon: Info, color: '#32ADE6' }
                  ].map((item, idx, arr) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSettingsSubPage(item.id)}
                        style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: idx === arr.length - 1 ? 'none' : '0.5px solid #C8C7CC', gap: '14px' }}
                      >
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                          <Icon size={18} />
                        </div>
                        <span style={{ flex: 1, fontSize: '16px', fontWeight: '500', color: '#000000' }}>{item.label}</span>
                        <ChevronRight size={18} color="#C7C7CC" />
                      </div>
                    );
                  })}
                </div>

                {/* Group 3: Admin Actions (Conditional) */}
                {user?.role === 'admin' && (
                  <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC' }}>
                    <div
                      onClick={() => alert('Accessing Admin Controls...')}
                      style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: '14px' }}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                        <ShieldAlert size={18} />
                      </div>
                      <span style={{ flex: 1, fontSize: '16px', fontWeight: '500', color: '#000000' }}>System Audit Dashboard</span>
                      <ChevronRight size={18} color="#C7C7CC" />
                    </div>
                  </div>
                )}

                {/* Group 4: Log Out */}
                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC' }}>
                  <div
                    onClick={logout}
                    style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: '14px' }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                      <LogOut size={18} />
                    </div>
                    <span style={{ flex: 1, fontSize: '16px', fontWeight: '600', color: '#FF3B30' }}>Log Out</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROFILE PAGE ── */}
            {settingsSubPage === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#FFFFFF', padding: '20px', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC' }}>
                  <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => profilePhotoInputRef.current.click()}>
                    <img
                      src={user?.profilePicture || (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(user?.displayName || '') + "&background=random&color=fff"}
                      style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #E5E5EA' }}
                      alt=""
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: '600' }}>Edit</div>
                  </div>
                  <input type="file" accept="image/*" ref={profilePhotoInputRef} style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  <span style={{ fontSize: '13px', color: '#8E8E93' }}>Tap photo to change profile image</span>
                </div>

                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '4px 16px' }}>
                  <div style={{ borderBottom: '0.5px solid #C8C7CC', padding: '10px 0' }}>
                    <label style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '500' }}>DISPLAY NAME</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '16px', color: '#000000', marginTop: '4px' }} />
                  </div>
                  <div style={{ borderBottom: '0.5px solid #C8C7CC', padding: '10px 0' }}>
                    <label style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '500' }}>EMAIL ADDRESS</label>
                    <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '16px', color: '#000000', marginTop: '4px' }} />
                  </div>
                  <div style={{ borderBottom: '0.5px solid #C8C7CC', padding: '10px 0' }}>
                    <label style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '500' }}>PHONE NUMBER</label>
                    <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '16px', color: '#000000', marginTop: '4px' }} />
                  </div>
                  <div style={{ padding: '10px 0' }}>
                    <label style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '500' }}>ABOUT / STATUS</label>
                    <input type="text" value={editAbout} onChange={e => setEditAbout(e.target.value)} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '16px', color: '#000000', marginTop: '4px' }} />
                  </div>
                </div>

                <div style={{ padding: '0 16px' }}>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    style={{ width: '100%', background: '#007AFF', border: 'none', borderRadius: '10px', color: '#FFFFFF', padding: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Profile Details'}
                  </button>
                </div>
              </div>
            )}

            {/* ── PRIVACY PAGE ── */}
            {settingsSubPage === 'privacy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
                <div style={{ padding: '0 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Who can see my personal info</div>

                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '4px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #C8C7CC', padding: '12px 0' }}>
                    <span style={{ fontSize: '16px', color: '#000000' }}>Last Seen Visibility</span>
                    <select value={privacyLastSeen} onChange={e => setPrivacyLastSeen(e.target.value)} style={{ border: 'none', outline: 'none', background: 'none', fontSize: '15px', color: '#007AFF', fontWeight: '500' }}>
                      <option value="everyone">Everyone</option>
                      <option value="contacts">My Contacts</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #C8C7CC', padding: '12px 0' }}>
                    <span style={{ fontSize: '16px', color: '#000000' }}>Profile Photo</span>
                    <select value={privacyProfilePhoto} onChange={e => setPrivacyProfilePhoto(e.target.value)} style={{ border: 'none', outline: 'none', background: 'none', fontSize: '15px', color: '#007AFF', fontWeight: '500' }}>
                      <option value="everyone">Everyone</option>
                      <option value="contacts">My Contacts</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                    <span style={{ fontSize: '16px', color: '#000000' }}>Read Receipts</span>
                    <input type="checkbox" checked={readReceipts} onChange={e => setReadReceipts(e.target.checked)} style={{ width: '22px', height: '22px', accentColor: '#34C759' }} />
                  </div>
                </div>

                <div style={{ padding: '0 16px 0', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Default Message Timer</div>
                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', color: '#000000' }}>Disappearing Messages</span>
                  <select value={disappearingMessages} onChange={e => setDisappearingMessages(Number(e.target.value))} style={{ border: 'none', outline: 'none', background: 'none', fontSize: '15px', color: '#007AFF', fontWeight: '500' }}>
                    <option value={0}>Off</option>
                    <option value={86400}>24 Hours</option>
                    <option value={604800}>7 Days</option>
                    <option value={7776000}>90 Days</option>
                  </select>
                </div>

                <div style={{ padding: '0 16px' }}>
                  <button
                    onClick={handleSaveAccount}
                    disabled={savingAccount}
                    style={{ width: '100%', background: '#007AFF', border: 'none', borderRadius: '10px', color: '#FFFFFF', padding: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Save Privacy Settings
                  </button>
                </div>
              </div>
            )}

            {/* ── ACCOUNT PAGE ── */}
            {settingsSubPage === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
                <div style={{ padding: '0 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Security & Protection</div>

                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '4px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #C8C7CC', padding: '12px 0' }}>
                    <span style={{ fontSize: '16px', color: '#000000' }}>Two-Step Verification</span>
                    <input type="checkbox" checked={twoStepEnabled} onChange={e => setTwoStepEnabled(e.target.checked)} style={{ width: '22px', height: '22px', accentColor: '#007AFF' }} />
                  </div>
                  {twoStepEnabled && (
                    <div style={{ padding: '10px 0' }}>
                      <label style={{ fontSize: '12px', color: '#8E8E93' }}>ENTER 6-DIGIT SECURITY PIN</label>
                      <input type="password" maxLength={6} placeholder="••••••" value={twoStepPin} onChange={e => setTwoStepPin(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '20px', color: '#000000', marginTop: '4px', letterSpacing: '8px' }} />
                    </div>
                  )}
                </div>

                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => alert('Data request sent. You will be notified when your account report is ready for download.')}>
                  <span style={{ fontSize: '16px', color: '#000000' }}>Request Account Info Report</span>
                  <ChevronRight size={18} color="#C7C7CC" />
                </div>

                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={handleDeleteAccount}>
                  <span style={{ fontSize: '16px', color: '#FF3B30', fontWeight: '600' }}>Delete My Account</span>
                  <ChevronRight size={18} color="#C7C7CC" />
                </div>

                <div style={{ padding: '0 16px' }}>
                  <button
                    onClick={handleSaveAccount}
                    disabled={savingAccount}
                    style={{ width: '100%', background: '#007AFF', border: 'none', borderRadius: '10px', color: '#FFFFFF', padding: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Save Verification Details
                  </button>
                </div>
              </div>
            )}

            {/* ── CHATS & WALLPAPERS PAGE ── */}
            {settingsSubPage === 'chats_appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
                <div style={{ padding: '0 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Theme Switcher</div>

                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '4px 16px' }}>
                  <div onClick={() => toggleThemeMode('light')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #C8C7CC', padding: '12px 0', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Sun size={18} color="#FF9500" />
                      <span style={{ fontSize: '16px', color: '#000000' }}>Light Mode</span>
                    </div>
                    {(!user?.settings?.theme || user?.settings?.theme === 'light') && <Check size={18} color="#007AFF" />}
                  </div>
                  <div onClick={() => toggleThemeMode('dark')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Moon size={18} color="#5856D6" />
                      <span style={{ fontSize: '16px', color: '#000000' }}>Dark Mode</span>
                    </div>
                    {user?.settings?.theme === 'dark' && <Check size={18} color="#007AFF" />}
                  </div>
                </div>

                <div style={{ padding: '0 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Chat Wallpaper</div>
                <div
                  onClick={() => alert('Wallpapers can be adjusted directly inside active chat rooms via chat headers.')}
                  style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: '16px', color: '#000000' }}>Select Wallpaper</span>
                  <ChevronRight size={18} color="#C7C7CC" />
                </div>
              </div>
            )}

            {/* ── DATA & STORAGE PAGE ── */}
            {settingsSubPage === 'data' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
                <div style={{ padding: '0 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Media Auto-Download</div>

                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '4px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #C8C7CC', padding: '12px 0' }}>
                    <span style={{ fontSize: '16px', color: '#000000' }}>Photos</span>
                    <input type="checkbox" checked={autoDownloadPhotos} onChange={e => setAutoDownloadPhotos(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#007AFF' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #C8C7CC', padding: '12px 0' }}>
                    <span style={{ fontSize: '16px', color: '#000000' }}>Videos</span>
                    <input type="checkbox" checked={autoDownloadVideos} onChange={e => setAutoDownloadVideos(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#007AFF' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #C8C7CC', padding: '12px 0' }}>
                    <span style={{ fontSize: '16px', color: '#000000' }}>Audio</span>
                    <input type="checkbox" checked={autoDownloadAudio} onChange={e => setAutoDownloadAudio(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#007AFF' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                    <span style={{ fontSize: '16px', color: '#000000' }}>Documents</span>
                    <input type="checkbox" checked={autoDownloadDocs} onChange={e => setAutoDownloadDocs(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#007AFF' }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── HELP PAGE ── */}
            {settingsSubPage === 'help' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '12px 16px', cursor: 'pointer' }} onClick={() => alert('Support request submitted. Our team will contact you shortly.')}>
                  <div style={{ fontWeight: '600', color: '#000000', fontSize: '16px' }}>Contact Support</div>
                  <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>Email help center or send logs</div>
                </div>
                <div style={{ background: '#FFFFFF', borderTop: '0.5px solid #C8C7CC', borderBottom: '0.5px solid #C8C7CC', padding: '12px 16px', cursor: 'pointer' }} onClick={() => alert('Terms of Service: All chat details are protected under standard WebRTC-mesh policies.')}>
                  <div style={{ fontWeight: '600', color: '#000000', fontSize: '16px' }}>Terms and Privacy Policy</div>
                  <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>Read agreements</div>
                </div>
              </div>
            )}

            {/* ── ABOUT PAGE ── */}
            {settingsSubPage === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '18px', background: 'linear-gradient(135deg, #007AFF, #5856D6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '36px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  Z
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', color: '#000000' }}>Zap Chat Pro</div>
                  <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>Version 3.4.1 (Stable Build)</div>
                </div>
                <div style={{ fontSize: '12px', color: '#8E8E93', padding: '20px', textAlign: 'center', lineHeight: '1.5' }}>
                  Zap Chat is a premium real-time messaging application powered by MongoDB, Node.js, Socket.io, and peer-to-peer WebRTC mesh calls.
                  <br />© 2026 Zap Chat Team. All Rights Reserved.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── iOS Bottom Sticky Tab Bar (.ios-bottom-nav) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: '#F9F9F9',
        borderTop: '0.5px solid #E0E0E0',
        paddingTop: '8px',
        paddingBottom: '20px',
        flexShrink: 0
      }}>
        {[
          { id: 'chats',    label: 'Chats',    icon: MessageCircle },
          { id: 'calls',    label: 'Calls',    icon: Phone },
          { id: 'status',   label: 'Status',   icon: CircleDot },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSettingsSubPage(null); }}
              style={{
                background: 'none',
                border: 'none',
                padding: '0 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                color: isActive ? '#007AFF' : '#8E8E93',
                minWidth: '60px',
                position: 'relative'
              }}
            >
              <Icon
                size={26}
                strokeWidth={isActive ? 2 : 1.5}
                color={isActive ? '#007AFF' : '#8E8E93'}
              />
              <span style={{
                fontSize: '10px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#007AFF' : '#8E8E93',
                letterSpacing: '-0.1px'
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Story Viewer Modal ── */}
      {viewingStoryGroup && (
        <StoryViewer 
          storyGroup={viewingStoryGroup} 
          onClose={() => {
            setViewingStoryGroup(null);
            if (onStoryGroupClosed) onStoryGroupClosed();
          }} 
        />
      )}

      {/* ── Add Status Modal ── */}
      {isAddStatusModalOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.4)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 5000, 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'flex-end', 
            alignItems: 'center',
            padding: '0px',
            animation: 'fadeIn 0.25s ease-out'
          }} 
          onClick={() => setIsAddStatusModalOpen(false)}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUpFromBottom {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.85)', 
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              borderRadius: '24px 24px 0 0', 
              padding: '28px 24px 44px 24px', 
              width: '100%',
              maxWidth: '420px', 
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
              animation: 'slideUpFromBottom 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Load custom premium typography styles & animations locally */}
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Outfit:wght@400;600;700&display=swap');
              
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '22px', color: '#1C1C1E', letterSpacing: '-0.5px' }}>Add Status</span>
              <button 
                onClick={() => setIsAddStatusModalOpen(false)} 
                style={{ 
                  background: 'rgba(0, 0, 0, 0.05)', 
                  border: 'none', 
                  color: '#3A3A3C', 
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Circular Action Options Row */}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px 0' }}>
              {/* Voice Status Action */}
              <div 
                onClick={() => {
                  setIsAddStatusModalOpen(false);
                  setIsVoiceRecorderOpen(true);
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <div 
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'rgba(0, 122, 255, 0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 122, 255, 0.1)',
                    transition: 'transform 0.2s, background 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.background = 'rgba(0, 122, 255, 0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'rgba(0, 122, 255, 0.1)';
                  }}
                >
                  <Mic size={24} color="#007AFF" />
                </div>
                <span style={{ color: '#8E8E93', fontSize: '13px', fontWeight: '600' }}>Voice</span>
              </div>

              {/* Camera Status Action */}
              <div 
                onClick={() => {
                  setIsAddStatusModalOpen(false);
                  openCamera('user');
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <div 
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'rgba(52, 199, 89, 0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(52, 199, 89, 0.1)',
                    transition: 'transform 0.2s, background 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.background = 'rgba(52, 199, 89, 0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'rgba(52, 199, 89, 0.1)';
                  }}
                >
                  <Camera size={24} color="#34C759" />
                </div>
                <span style={{ color: '#8E8E93', fontSize: '13px', fontWeight: '600' }}>Camera</span>
              </div>

              {/* Text Status Action */}
              <div 
                onClick={() => {
                  setIsAddStatusModalOpen(false);
                  setIsTextCreatorOpen(true);
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <div 
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'rgba(255, 45, 85, 0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(255, 45, 85, 0.1)',
                    transition: 'transform 0.2s, background 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.background = 'rgba(255, 45, 85, 0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'rgba(255, 45, 85, 0.1)';
                  }}
                >
                  <Type size={24} color="#FF2D55" />
                </div>
                <span style={{ color: '#8E8E93', fontSize: '13px', fontWeight: '600' }}>Text</span>
              </div>
            </div>

            {/* Divider line */}
            <div style={{ height: '0.5px', background: 'rgba(0, 0, 0, 0.08)', margin: '4px 0' }} />

            {/* Device Gallery Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#8E8E93', letterSpacing: '0.08em' }}>DEVICE GALLERY</span>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#007AFF', cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  View All
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    style={{ display: 'none' }} 
                    onChange={e => handleStoryUpload(e, 'image')} 
                  />
                </label>
              </div>

              {/* Gallery Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { name: 'sunset.jpg', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', label: 'Sunset' },
                  { name: 'city.jpg', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&auto=format&fit=crop&q=80', label: 'Urban' },
                  { name: 'nature.jpg', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80', label: 'Forest' },
                  { name: 'cyber.jpg', url: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=600&auto=format&fit=crop&q=80', label: 'Neon' }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => selectGalleryMockup(item.url, item.name)}
                    style={{ 
                      position: 'relative', 
                      aspectRatio: '3/4', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.04)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                    }}
                  >
                    <img 
                      src={item.url} 
                      alt={item.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                    <div 
                      style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'center',
                        paddingBottom: '4px'
                      }}
                    >
                      <span style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px' }}>{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── My Statuses Manager Modal ── */}
      {isMyStatusManagerOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.4)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 5000, 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'flex-end', 
            alignItems: 'center',
            padding: '0px',
            animation: 'fadeIn 0.25s ease-out'
          }} 
          onClick={() => setIsMyStatusManagerOpen(false)}
        >
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.9)', 
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              borderRadius: '24px 24px 0 0', 
              padding: '28px 24px 44px 24px', 
              width: '100%',
              maxWidth: '420px', 
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              animation: 'slideUpFromBottom 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: '800', fontSize: '22px', color: '#1C1C1E', letterSpacing: '-0.5px' }}>My Statuses</span>
                <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>Manage or add new status updates</div>
              </div>
              <button 
                onClick={() => setIsMyStatusManagerOpen(false)} 
                style={{ 
                  background: 'rgba(0, 0, 0, 0.05)', 
                  border: 'none', 
                  color: '#3A3A3C', 
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* List of current active statuses */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
              {(() => {
                const myStoryGroup = stories.find(group => group.user?._id?.toString() === (user?.id || user?._id)?.toString());
                if (!myStoryGroup || myStoryGroup.stories.length === 0) {
                  return (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#8E8E93', fontSize: '14px' }}>
                      No active status updates.
                    </div>
                  );
                }
                return myStoryGroup.stories.map((story, idx) => {
                  return (
                    <div 
                      key={story._id || idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '10px 14px', 
                        background: 'rgba(255, 255, 255, 0.6)', 
                        border: '1px solid rgba(0, 0, 0, 0.04)',
                        borderRadius: '16px', 
                        gap: '12px' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        {/* Media type icon / preview */}
                        {story.mediaType === 'image' || story.mediaType === 'video' ? (
                          <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden' }}>
                            <img 
                              src={story.fileId.startsWith('http') ? story.fileId : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + story.fileId + "?token=" + localStorage.getItem('token')}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              alt=""
                            />
                            {story.mediaType === 'video' && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Play size={10} color="#FFF" fill="#FFF" />
                              </div>
                            )}
                          </div>
                        ) : story.mediaType === 'text' ? (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: story.bgColor || '#007AFF',
                            color: story.fontColor || '#FFF',
                            fontSize: '8px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            padding: '2px',
                            textAlign: 'center',
                            fontFamily: story.fontFamily || 'inherit'
                          }}>
                            {story.caption || 'Text'}
                          </div>
                        ) : (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 122, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Mic size={16} color="#007AFF" />
                          </div>
                        )}

                        {/* Text info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '700', color: '#1C1C1E', fontSize: '14px', textTransform: 'capitalize' }}>
                            {story.mediaType} Status
                          </div>
                          <div style={{ fontSize: '11px', color: '#8E8E93', marginTop: '1px' }}>
                            {formatTime(story.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Actions: View and Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setIsMyStatusManagerOpen(false);
                            setViewingStoryGroup(myStoryGroup);
                          }}
                          style={{
                            background: 'rgba(0, 122, 255, 0.08)',
                            border: 'none',
                            color: '#007AFF',
                            fontSize: '12px',
                            fontWeight: '700',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteStory(story._id);
                          }}
                          style={{
                            background: 'rgba(255, 59, 48, 0.08)',
                            border: 'none',
                            color: '#FF3B30',
                            padding: '8px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Divider line */}
            <div style={{ height: '0.5px', background: 'rgba(0, 0, 0, 0.08)', margin: '4px 0' }} />

            {/* Add more statuses options */}
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#8E8E93', letterSpacing: '0.08em' }}>ADD ANOTHER STATUS</span>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px 0' }}>
              {/* Voice Status Action */}
              <div 
                onClick={() => {
                  setIsMyStatusManagerOpen(false);
                  setIsVoiceRecorderOpen(true);
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <div 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: 'rgba(0, 122, 255, 0.08)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 122, 255, 0.05)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Mic size={22} color="#007AFF" />
                </div>
                <span style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600' }}>Voice</span>
              </div>

              {/* Camera Status Action */}
              <div 
                onClick={() => {
                  setIsMyStatusManagerOpen(false);
                  openCamera('user');
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <div 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: 'rgba(52, 199, 89, 0.08)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(52, 199, 89, 0.05)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Camera size={22} color="#34C759" />
                </div>
                <span style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600' }}>Camera</span>
              </div>

              {/* Media Upload (Gallery) */}
              <label 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  style={{ display: 'none' }} 
                  onChange={e => {
                    setIsMyStatusManagerOpen(false);
                    handleStoryUpload(e, 'image');
                  }} 
                />
                <div 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: 'rgba(255, 149, 0, 0.08)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(255, 149, 0, 0.05)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Image size={22} color="#FF9500" />
                </div>
                <span style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600' }}>Gallery</span>
              </label>

              {/* Text Status Action */}
              <div 
                onClick={() => {
                  setIsMyStatusManagerOpen(false);
                  setIsTextCreatorOpen(true);
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <div 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: 'rgba(255, 45, 85, 0.08)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(255, 45, 85, 0.05)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Type size={22} color="#FF2D55" />
                </div>
                <span style={{ color: '#8E8E93', fontSize: '12px', fontWeight: '600' }}>Text</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Text Status Creator Overlay ── */}
      {isTextCreatorOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: textStatusBg, 
            zIndex: 9999, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            padding: '28px 24px 36px 24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
            transition: 'background 0.4s ease',
            overflow: 'hidden'
          }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>

          {/* Top Bar Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '750px', margin: '0 auto', zIndex: 10 }}>
            {/* Close Button */}
            <button 
              onClick={() => {
                setTextStatusCaption('');
                setIsTextCreatorOpen(false);
              }}
              style={{ 
                background: 'rgba(255, 255, 255, 0.15)', 
                border: 'none', 
                color: '#FFFFFF', 
                cursor: 'pointer',
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <XIcon size={20} />
            </button>

            {/* Typography & Color controls */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Font Button */}
              <button 
                onClick={cycleFont}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.15)', 
                  border: 'none', 
                  color: '#FFFFFF', 
                  cursor: 'pointer',
                  padding: '0 16px',
                  height: '42px',
                  borderRadius: '21px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'background 0.2s, transform 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <ALargeSmall size={16} />
                <span>
                  {textStatusFont.includes('Playfair') ? 'Elegant' : 
                   textStatusFont.includes('Courier') ? 'Typewriter' : 
                   textStatusFont.includes('Pacifico') ? 'Cursive' : 'Modern'}
                </span>
              </button>

              {/* Color Button */}
              <button 
                onClick={toggleTextColor}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.15)', 
                  border: 'none', 
                  color: '#FFFFFF', 
                  cursor: 'pointer',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s, transform 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Palette size={16} />
              </button>
            </div>
          </div>

          {/* Large Center Textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%', position: 'relative', zIndex: 10 }}>
            <textarea 
              value={textStatusCaption}
              onChange={e => {
                if (e.target.value.length <= 250) {
                  setTextStatusCaption(e.target.value);
                }
              }}
              placeholder="Type a status..."
              autoFocus
              style={{ 
                border: 'none', 
                outline: 'none', 
                background: 'transparent', 
                color: textStatusColor, 
                fontFamily: textStatusFont, 
                fontSize: '36px', 
                fontWeight: '700', 
                textAlign: 'center', 
                width: '90%', 
                maxWidth: '650px', 
                minHeight: '180px',
                maxHeight: '300px',
                resize: 'none', 
                caretColor: textStatusColor || '#FFFFFF',
                lineHeight: '1.4',
                padding: '16px',
                transition: 'color 0.3s ease'
              }}
            />
            {/* Character Counter */}
            <div style={{ color: textStatusCaption.length >= 230 ? '#FF453A' : 'rgba(255, 255, 255, 0.6)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', marginTop: '12px' }}>
              {textStatusCaption.length} / 250
            </div>
          </div>

          {/* Bottom Bar: Gradients & Publish Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '750px', margin: '0 auto', zIndex: 10 }}>
            {/* Gradient Selector Circles */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {[
                'linear-gradient(135deg, #007AFF 0%, #0056B3 100%)', // Cobalt Nebula
                'linear-gradient(135deg, #34C759 0%, #157347 100%)', // Emerald Green
                'linear-gradient(135deg, #FF9500 0%, #FF5E00 100%)', // Sunset Flare
                'linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)', // Royal Amethyst
                'linear-gradient(135deg, #FF3B30 0%, #B01E17 100%)', // Crimson Flame
                'linear-gradient(135deg, #1C1C1E 0%, #000000 100%)'  // Dark Obsidian
              ].map((grad, i) => (
                <button 
                  key={i}
                  onClick={() => setTextStatusBg(grad)}
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: grad, 
                    border: textStatusBg === grad ? '2.5px solid #FFFFFF' : '1.5px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transform: textStatusBg === grad ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.2s, border 0.2s'
                  }}
                  onMouseEnter={e => {
                    if (textStatusBg !== grad) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (textStatusBg !== grad) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                />
              ))}
            </div>

            {/* Post button row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button 
                onClick={handlePostTextStatus}
                disabled={isPostingTextStatus || !textStatusCaption.trim()}
                style={{ 
                  background: textStatusCaption.trim() ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)', 
                  border: 'none', 
                  color: textStatusCaption.trim() ? '#1C1C1E' : 'rgba(255, 255, 255, 0.35)', 
                  padding: '12px 24px', 
                  borderRadius: '24px', 
                  fontWeight: '700', 
                  fontSize: '15px', 
                  cursor: textStatusCaption.trim() ? 'pointer' : 'not-allowed', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  boxShadow: textStatusCaption.trim() ? '0 4px 12px rgba(0,0,0,0.15)' : 'none', 
                  opacity: textStatusCaption.trim() ? 1 : 0.6,
                  transform: textStatusCaption.trim() ? 'scale(1)' : 'scale(0.98)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={e => {
                  if (textStatusCaption.trim()) {
                    e.currentTarget.style.background = '#F2F2F7';
                    e.currentTarget.style.transform = 'scale(1.03) translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  if (textStatusCaption.trim()) {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  }
                }}
              >
                {isPostingTextStatus ? (
                  <div style={{ width: '16px', height: '16px', border: `2px solid ${textStatusCaption.trim() ? '#1C1C1E' : 'rgba(255, 255, 255, 0.35)'}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <Send size={16} />
                )}
                <span>Share to Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full-Screen Status Media Editor Modal ── */}
      {editorMedia && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 9999, display: 'flex', flexDirection: 'column', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' }} onClick={e => e.stopPropagation()}>

          {/* Top Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(rgba(0,0,0,0.8), transparent)', zIndex: 10, flexShrink: 0 }}>
            <button onClick={() => { URL.revokeObjectURL(editorMedia.url); setEditorMedia(null); setEditorTab('none'); setActiveTool('none'); }} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}>
              <XIcon size={24} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              {editorMedia.type === 'image' && (
                <>
                  <button onClick={() => setEditorMedia(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }} title="Rotate"><RotateCw size={22} /></button>
                  <button onClick={() => { setEditorTab(prev => prev === 'crop' ? 'none' : 'crop'); setActiveTool('none'); }} style={{ background: 'none', border: 'none', color: editorTab === 'crop' ? '#007AFF' : '#FFFFFF', cursor: 'pointer' }} title="Crop"><Crop size={22} /></button>
                  <button onClick={() => { setEditorTab(prev => prev === 'adjust' ? 'none' : 'adjust'); setActiveTool('none'); }} style={{ background: 'none', border: 'none', color: editorTab === 'adjust' ? '#007AFF' : '#FFFFFF', cursor: 'pointer' }} title="Adjust"><Sliders size={22} /></button>
                  <button onClick={() => { setEditorTab(prev => prev === 'filters' ? 'none' : 'filters'); setActiveTool('none'); }} style={{ background: 'none', border: 'none', color: editorTab === 'filters' ? '#007AFF' : '#FFFFFF', cursor: 'pointer' }} title="Filters"><Sparkles size={22} /></button>
                  <button onClick={() => { setActiveTool(prev => prev === 'pen' ? 'none' : 'pen'); setEditorTab('none'); }} style={{ background: 'none', border: 'none', color: activeTool === 'pen' ? '#007AFF' : '#FFFFFF', cursor: 'pointer' }} title="Draw"><Edit3 size={22} /></button>
                  <button onClick={() => { const c = document.getElementById('status-draw-canvas'); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} title="Clear Drawing"><Undo size={20} /></button>
                </>
              )}
              <button onClick={() => { setEditorTab(prev => prev === 'stickers' ? 'none' : 'stickers'); setActiveTool('none'); }} style={{ background: 'none', border: 'none', color: editorTab === 'stickers' ? '#007AFF' : '#FFFFFF', cursor: 'pointer' }} title="Stickers"><Smile size={22} /></button>
              {editorMedia.type === 'image' && (
                <button onClick={() => { const txt = window.prompt('Enter text overlay:'); if (txt?.trim()) setEditorMedia(prev => ({ ...prev, texts: [...prev.texts, { id: Date.now(), text: txt, color: activeColor, x: 200, y: 250, size: 28 }] })); }} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }} title="Text"><Type size={22} /></button>
              )}
            </div>
          </div>

          {/* Preview Area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'relative', width: '400px', height: '500px', borderRadius: '12px', overflow: 'hidden', background: '#000000', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', flexShrink: 0 }}>
              {editorMedia.type === 'image' ? (
                <img src={editorMedia.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: buildFilterCSS(), transform: `rotate(${editorMedia.rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1}) rotate(${straightenAngle}deg)`, transition: 'transform 0.3s' }} />
              ) : (
                <video src={editorMedia.url} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}

              {/* Sticker overlays */}
              {editorMedia.stickers.map(s => (
                <div key={s.id} onMouseDown={e => handleDragStart(e, 'sticker', s.id)} onTouchStart={e => handleDragStart(e, 'sticker', s.id)}
                  onDoubleClick={() => setEditorMedia(prev => ({ ...prev, stickers: prev.stickers.filter(x => x.id !== s.id) }))}
                  style={{ position: 'absolute', left: s.x, top: s.y, fontSize: s.size, cursor: 'move', zIndex: 30, userSelect: 'none', transform: 'translate(-50%,-50%)', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                  {s.emoji}
                </div>
              ))}

              {/* Text overlays */}
              {editorMedia.texts.map(t => (
                <div key={t.id} onMouseDown={e => handleDragStart(e, 'text', t.id)} onTouchStart={e => handleDragStart(e, 'text', t.id)}
                  onDoubleClick={() => setEditorMedia(prev => ({ ...prev, texts: prev.texts.filter(x => x.id !== t.id) }))}
                  style={{ position: 'absolute', left: t.x, top: t.y, color: t.color, fontSize: t.size, fontWeight: 'bold', textShadow: '0 2px 8px rgba(0,0,0,0.8)', cursor: 'move', zIndex: 30, userSelect: 'none', transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap' }}>
                  {t.text}
                </div>
              ))}

              {/* Drawing canvas */}
              {editorMedia.type === 'image' && (
                <canvas id="status-draw-canvas" width={400} height={500}
                  onMouseDown={handleDrawingStart} onMouseMove={handleDrawingMove} onMouseUp={handleDrawingEnd} onMouseLeave={handleDrawingEnd}
                  onTouchStart={handleDrawingStart} onTouchMove={handleDrawingMove} onTouchEnd={handleDrawingEnd}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: activeTool === 'pen' ? 40 : 5, cursor: activeTool === 'pen' ? 'crosshair' : 'default', pointerEvents: activeTool === 'pen' ? 'auto' : 'none' }}
                />
              )}
            </div>

            {/* Pen Color Picker */}
            {activeTool === 'pen' && (
              <div style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.6)', padding: '12px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 50 }}>
                {['#FFFFFF','#FF3B30','#FF9500','#FFCC00','#4CD964','#5AC8FA','#007AFF','#5856D6','#FF2D55'].map(c => (
                  <div key={c} onClick={() => setActiveColor(c)} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: activeColor === c ? '2.5px solid #FFFFFF' : '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', transform: activeColor === c ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s' }} />
                ))}
              </div>
            )}
          </div>

          {/* Sticker Drawer */}
          {editorTab === 'stickers' && (
            <div style={{ background: '#111b21', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 20px', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: '10px' }}>STICKERS & EMOJIS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px', maxHeight: '110px', overflowY: 'auto' }}>
                {['❤️','😂','👍','🔥','😍','👏','🎉','🚀','💡','👑','✨','🌟','💯','👻','🎨','🌈','🍕','🍔','🍩','🎬','📷','🗺️','🧸','💎'].map(emoji => (
                  <div key={emoji} onClick={() => setEditorMedia(prev => ({ ...prev, stickers: [...prev.stickers, { id: Date.now(), emoji, x: 200, y: 250, size: 44 }] }))}
                    style={{ fontSize: '28px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    {emoji}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters Drawer */}
          {editorTab === 'filters' && (
            <div style={{ background: '#111b21', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 20px', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: '10px' }}>FILTERS</div>
              <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[{ name: 'Normal', filter: 'none' },{ name: 'B&W', filter: 'grayscale(100%)' },{ name: 'Vintage', filter: 'sepia(80%)' },{ name: 'Warm', filter: 'hue-rotate(20deg) sepia(20%)' },{ name: 'Cool', filter: 'hue-rotate(-20deg) saturate(120%)' },{ name: 'Retro', filter: 'contrast(140%) saturate(140%)' },{ name: 'Invert', filter: 'invert(100%)' },{ name: 'Blur', filter: 'blur(3px)' }].map(f => (
                  <div key={f.name} onClick={() => setEditorMedia(prev => ({ ...prev, filter: f.filter }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', minWidth: '64px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: `url(${editorMedia.url}) center/cover`, filter: f.filter, border: editorMedia.filter === f.filter ? '2.5px solid #007AFF' : '1px solid rgba(255,255,255,0.15)', transition: 'all 0.2s' }} />
                    <span style={{ fontSize: '11px', fontWeight: '600', color: editorMedia.filter === f.filter ? '#007AFF' : 'rgba(255,255,255,0.7)' }}>{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crop Sub-menu */}
          {editorTab === 'crop' && (
            <div style={{ background: '#111b21', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 20px', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: '10px' }}>CROP ASPECT RATIO</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {[{ name: 'Free', ratio: 'none' },{ name: '1:1', ratio: '1:1' },{ name: '4:3', ratio: '4:3' },{ name: '16:9', ratio: '16:9' },{ name: '9:16', ratio: '9:16' }].map(c => (
                  <button key={c.ratio} onClick={() => setCropRatio(c.ratio)} style={{ padding: '8px 16px', borderRadius: '20px', border: cropRatio === c.ratio ? '1.5px solid #007AFF' : '1px solid rgba(255,255,255,0.2)', background: cropRatio === c.ratio ? 'rgba(0,122,255,0.15)' : 'transparent', color: cropRatio === c.ratio ? '#007AFF' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                    {c.name}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={() => setFlipH(v => !v)} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: flipH ? '1.5px solid #007AFF' : '1px solid rgba(255,255,255,0.2)', background: flipH ? 'rgba(0,122,255,0.1)' : 'transparent', color: flipH ? '#007AFF' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <ArrowLeftRight size={14} /> Flip H
                </button>
                <button onClick={() => setFlipV(v => !v)} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: flipV ? '1.5px solid #007AFF' : '1px solid rgba(255,255,255,0.2)', background: flipV ? 'rgba(0,122,255,0.1)' : 'transparent', color: flipV ? '#007AFF' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <ArrowUpDown size={14} /> Flip V
                </button>
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Straighten {straightenAngle}°</span>
                  <input type="range" min="-45" max="45" value={straightenAngle} onChange={e => setStraightenAngle(Number(e.target.value))} style={{ width: '100%', accentColor: '#007AFF' }} />
                </div>
              </div>
            </div>
          )}

          {/* Adjust Sub-menu */}
          {editorTab === 'adjust' && (
            <div style={{ background: '#111b21', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 20px', flexShrink: 0, maxHeight: '200px', overflowY: 'auto' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: '12px' }}>ADJUSTMENTS</div>
              {[
                { label: 'Brightness', value: brightness, setter: setBrightness, min: 50, max: 150, unit: '%' },
                { label: 'Contrast', value: contrast, setter: setContrast, min: 50, max: 150, unit: '%' },
                { label: 'Saturation', value: saturation, setter: setSaturation, min: 0, max: 200, unit: '%' },
                { label: 'Exposure', value: exposure, setter: setExposure, min: -50, max: 50, unit: '' },
                { label: 'Temperature', value: temperature, setter: setTemperature, min: -100, max: 100, unit: '' },
                { label: 'Tint', value: tint, setter: setTint, min: -100, max: 100, unit: '' },
                { label: 'Vignette', value: vignette, setter: setVignette, min: 0, max: 100, unit: '' },
              ].map(({ label, value, setter, min, max, unit }) => (
                <div key={label} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
                    <span style={{ fontSize: '12px', color: '#007AFF' }}>{value}{unit}</span>
                  </div>
                  <input type="range" min={min} max={max} value={value} onChange={e => setter(Number(e.target.value))} style={{ width: '100%', accentColor: '#007AFF' }} />
                </div>
              ))}
            </div>
          )}

          {/* Caption + Send Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', flexShrink: 0 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: '28px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <MessageSquare size={18} color="rgba(255,255,255,0.6)" />
              <input type="text" placeholder="Add a caption..." value={editorMedia.caption} onChange={e => setEditorMedia(prev => ({ ...prev, caption: e.target.value }))}
                style={{ flex: 1, background: 'none', border: 'none', color: '#FFFFFF', outline: 'none', fontSize: '14px' }} />
            </div>
            <button onClick={handleSendEditedStatus}
              style={{ background: '#007AFF', border: 'none', color: '#FFFFFF', width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,122,255,0.4)', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <Send size={22} />
            </button>
          </div>
        </div>
      )}

      {/* Global CSS animations & styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .ios-header {
          height: 64px;
          background: #F9F9F9;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0 16px;
          border-bottom: 0.5px solid #C8C7CC;
          flex-shrink: 0;
        }
        
        .ios-header-left {
          position: absolute;
          left: 16px;
          color: #007AFF;
          font-size: 17px;
          font-weight: 500;
          cursor: pointer;
        }
        
        .ios-header-right {
          position: absolute;
          right: 16px;
          display: flex;
          gap: 16px;
          color: #007AFF;
          cursor: pointer;
        }
        
        .ios-title {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.4px;
          color: #000000;
        }
        
        .segmented-pill {
          display: flex;
          background: #EBEBEB;
          padding: 2px;
          border-radius: 8px;
          margin: 12px 16px;
        }
        
        .segment-item {
          flex: 1;
          padding: 6px 0;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          color: #000000;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .segment-item.active {
          background: #FFFFFF;
          box-shadow: 0 3px 8px rgba(0,0,0,0.12);
        }
        
        .ios-search-container {
          padding: 0 16px 12px;
        }
        
        .ios-search-pill {
          width: 100%;
          height: 38px;
          background: #EBEBEB;
          border: none;
          border-radius: 10px;
          padding: 0 12px 0 36px;
          font-size: 16px;
          outline: none;
        }
        
        .ios-contact-row {
          display: flex;
          padding: 12px 16px;
          gap: 12px;
          cursor: pointer;
          transition: background 0.1s;
          background: #FFFFFF;
        }
        
        .ios-contact-row:active {
          background: #E5E5EA;
        }
        
        .ios-contact-row.active {
          background: #007AFF15;
        }
        
        .ios-avatar {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .ios-bottom-nav {
          height: 80px;
          background: #F9F9F9;
          border-top: 0.5px solid #C8C7CC;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding-bottom: 20px;
          flex-shrink: 0;
        }
        
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #8E8E93;
          cursor: pointer;
        }
        
        .nav-item.active {
          color: #007AFF;
        }
        
        .nav-text {
          font-size: 10px;
          font-weight: 500;
        }

        /* Support Dark Mode theme attributes if set */
        [data-theme='dark'] .ios-header {
          background: #1C1C1E;
          border-bottom: 0.5px solid #38383A;
        }
        [data-theme='dark'] .ios-title {
          color: #FFFFFF;
        }
        [data-theme='dark'] .ios-bottom-nav {
          background: #1C1C1E;
          border-top: 0.5px solid #38383A;
        }
        [data-theme='dark'] .segmented-pill {
          background: #2C2C2E;
        }
        [data-theme='dark'] .segment-item {
          color: #AEAEB2;
        }
        [data-theme='dark'] .segment-item.active {
          background: #636366;
          color: #FFFFFF;
        }
        [data-theme='dark'] .ios-search-pill {
          background: #2C2C2E;
          color: #FFFFFF;
        }
        [data-theme='dark'] .ios-contact-row {
          background: #000000;
          border-bottom: 0.5px solid #1C1C1E;
        }
        [data-theme='dark'] .ios-contact-row:active {
          background: #2C2C2E;
        }
        [data-theme='dark'] span {
          color: #FFFFFF;
        }
      ` }} />
      {/* ── Select Contact Modal ── */}
      {selectContactOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', flexDirection: 'column', background: '#F2F2F7' }}>
          {/* Header */}
          <div style={{ background: '#FFFFFF', borderBottom: '0.5px solid #E5E5EA', padding: '16px 16px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '18px', color: '#000' }}>Select contact</div>
                <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>{getFilteredContactsList().length} contacts</div>
              </div>
              <button onClick={() => setSelectContactOpen(false)} style={{ background: 'none', border: 'none', color: '#007AFF', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}>Cancel</button>
            </div>
            {/* Search Bar */}
            <div style={{ background: '#E5E5EA', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
              <Search size={14} color="#8E8E93" />
              <input
                value={selectContactSearch}
                onChange={e => setSelectContactSearch(e.target.value)}
                placeholder="Search contacts"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '15px', color: '#000' }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* New Group */}
            {!selectContactSearch && (
              <>
                <div
                  onClick={async () => {
    setSelectContactOpen(false);
    setGroupSelectedMembers([]);
    setGroupName('');
    setGroupDescription('');
    setGroupIconFile(null);
    setGroupIconPreview(null);
    setGroupMemberSearch('');
    setCreateGroupStep(1);
    setShowCreateGroupModal(true);
    // Fetch all users from DB
    setLoadingGroupUsers(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/contacts/search?q=`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        const selfId = (user?.id || user?._id)?.toString();
        // endpoint returns plain array
        const arr = Array.isArray(data) ? data : (data.users || []);
        setGroupAllUsers(arr.filter(u => u._id?.toString() !== selfId));
      }
    } catch(e) {
      // fallback to contacts list already in state
      setGroupAllUsers(contacts.map(c => c.contact || c).filter(Boolean));
    } finally {
      setLoadingGroupUsers(false);
    }
  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#fff', borderBottom: '0.5px solid #E5E5EA', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F2F2F7'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #007AFF, #5AC8FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,122,255,0.3)' }}>
                    <Users size={20} color="#fff" />
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#000' }}>New Group</span>
                </div>
                <div
                  onClick={() => { setSelectContactOpen(false); setActiveTab('contacts'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#fff', borderBottom: '0.5px solid #E5E5EA', cursor: 'pointer' }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserPlus size={20} color="#fff" />
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#000' }}>New contact</span>
                </div>
              </>
            )}

            {/* Contacts on ZapChat */}
            <div style={{ padding: '8px 16px 4px', fontSize: '12px', fontWeight: '600', color: '#8E8E93', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Contacts on Zap Chat
            </div>
            {getFilteredContactsList()
              .filter(u => !selectContactSearch || (u.displayName || '').toLowerCase().includes(selectContactSearch.toLowerCase()))
              .map((u, i) => (
                <div
                  key={u._id || i}
                  onClick={() => { setSelectContactOpen(false); onSelectContact(u); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px', background: '#fff', borderBottom: '0.5px solid #E5E5EA', cursor: 'pointer' }}
                >
                  {renderUserAvatar(u._id, u.displayName, u.profilePicture, false, 44)}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '500', color: '#000' }}>{u.displayName || u.name}</span>
                      {u.role === 'admin' && (
                        <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#007AFF', color: '#fff', padding: '2px 5px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ADMIN</span>
                      )}
                    </div>
                    {u.about && <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '1px' }}>{u.about}</div>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Camera Modal ── */}
      {cameraOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Video Preview */}
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none'
            }}
          />

          {/* Controls */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
            {/* Close */}
            <button
              onClick={closeCamera}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
            >
              <XIcon size={22} />
            </button>

            {/* Capture */}
            <button
              onClick={capturePhoto}
              style={{ background: '#fff', border: '4px solid rgba(255,255,255,0.5)', borderRadius: '50%', width: '72px', height: '72px', cursor: 'pointer', boxShadow: '0 0 0 4px rgba(255,255,255,0.3)' }}
            />

            {/* Flip Camera */}
            <button
              onClick={() => openCamera(cameraFacing === 'user' ? 'environment' : 'user')}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
            >
              <ArrowLeftRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ── Custom Premium Voice Status Recorder Overlay ── */}
      {isVoiceRecorderOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'linear-gradient(135deg, #1C0F30 0%, #0C061A 100%)', 
            zIndex: 9999, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            padding: '32px 24px 48px 24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif',
            animation: 'fadeInVoice 0.35s ease-out'
          }}
          onClick={e => e.stopPropagation()}
        >
          <style>{`
            @keyframes fadeInVoice {
              from { opacity: 0; transform: scale(1.05); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes pulseRing {
              0% {
                transform: scale(0.95);
                opacity: 1;
              }
              100% {
                transform: scale(1.4);
                opacity: 0;
              }
            }
            @keyframes audioWaveVoice {
              0% {
                transform: scaleY(0.3);
              }
              100% {
                transform: scaleY(1.8);
              }
            }
            @keyframes pulseMicGlow {
              0% {
                box-shadow: 0 0 20px rgba(0, 122, 255, 0.3);
              }
              100% {
                box-shadow: 0 0 40px rgba(0, 122, 255, 0.6);
              }
            }
            @keyframes pulseRecordGlow {
              0% {
                box-shadow: 0 0 20px rgba(255, 59, 48, 0.3);
              }
              100% {
                box-shadow: 0 0 40px rgba(255, 59, 48, 0.7);
              }
            }
          `}</style>

          {/* Top Bar Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '800px', margin: '0 auto', zIndex: 10 }}>
            {/* Close Button */}
            <button 
              onClick={cancelVoiceRecording}
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                border: 'none', 
                color: '#FFFFFF', 
                cursor: 'pointer',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'background 0.2s, transform 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <XIcon size={22} />
            </button>

            {/* Header Title */}
            <span style={{ fontWeight: '700', fontSize: '18px', color: '#FFFFFF', letterSpacing: '-0.3px', opacity: 0.9 }}>
              Voice Status
            </span>

            {/* Balancing Spacer */}
            <div style={{ width: '44px' }} />
          </div>

          {/* Center Sound Hub */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%', gap: '40px' }}>
            
            {/* Pulsing Visualizer Circle */}
            <div style={{ 
              width: '180px', 
              height: '180px', 
              borderRadius: '50%', 
              background: isRecordingVoice ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0, 122, 255, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative',
              transition: 'all 0.3s ease',
              animation: isRecordingVoice ? 'pulseRecordGlow 2s infinite alternate' : recordedVoiceBlob ? 'none' : 'pulseMicGlow 2s infinite alternate',
              animationPlayState: isVoiceRecordingPaused ? 'paused' : 'running',
              border: isRecordingVoice ? '2px solid rgba(255, 59, 48, 0.3)' : '2px solid rgba(0, 122, 255, 0.3)'
            }}>
              {/* Outer pulsing rings (only when recording) */}
              {isRecordingVoice && (
                <>
                  <div style={{
                    position: 'absolute',
                    inset: '-12px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 59, 48, 0.4)',
                    animationName: 'pulseRing',
                    animationDuration: '1.5s',
                    animationTimingFunction: 'cubic-bezier(0.215, 0.610, 0.355, 1)',
                    animationIterationCount: 'infinite',
                    animationPlayState: isVoiceRecordingPaused ? 'paused' : 'running'
                  }} />
                  <div style={{
                    position: 'absolute',
                    inset: '-24px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 59, 48, 0.2)',
                    animationName: 'pulseRing',
                    animationDuration: '1.5s',
                    animationTimingFunction: 'cubic-bezier(0.215, 0.610, 0.355, 1)',
                    animationIterationCount: 'infinite',
                    animationDelay: '0.5s',
                    animationPlayState: isVoiceRecordingPaused ? 'paused' : 'running'
                  }} />
                </>
              )}

              {/* Dynamic Waveform Simulation when recording */}
              {isRecordingVoice ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '60px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
                    const randomDelay = `${i * 0.1}s`;
                    const randomDuration = `${0.4 + Math.random() * 0.5}s`;
                    // Heights peak at the center
                    const baseHeight = i <= 5 ? i * 8 : (10 - i) * 8;
                    return (
                      <div key={i} style={{
                        width: '4px',
                        height: `${baseHeight}px`,
                        background: '#FF3B30',
                        borderRadius: '3px',
                        boxShadow: '0 0 10px rgba(255, 59, 48, 0.5)',
                        animationName: 'audioWaveVoice',
                        animationDuration: randomDuration,
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite',
                        animationDirection: 'alternate',
                        animationDelay: randomDelay,
                        animationPlayState: isVoiceRecordingPaused ? 'paused' : 'running'
                      }} />
                    );
                  })}
                </div>
              ) : recordedVoiceBlob ? (
                /* Preview State Play/Pause Button */
                <button 
                  onClick={toggleVoicePreviewPlayback}
                  style={{
                    border: 'none',
                    background: '#007AFF',
                    color: '#FFF',
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 12px 24px rgba(0, 122, 255, 0.35), 0 0 0 8px rgba(0, 122, 255, 0.1)',
                    transition: 'transform 0.2s, background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isPlayingVoicePreview ? <Pause size={38} fill="#FFF" /> : <Play size={38} fill="#FFF" style={{ marginLeft: '6px' }} />}
                </button>
              ) : (
                /* Idle/Ready to Record State Mic Icon */
                <div style={{
                  background: 'rgba(0, 122, 255, 0.2)',
                  borderRadius: '50%',
                  width: '90px',
                  height: '90px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 0 20px rgba(0,122,255,0.2)'
                }}>
                  <Mic size={44} color="#007AFF" />
                </div>
              )}
            </div>

            {/* Timer and Status Subtitles */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
              {/* Compact high-tech timer pill */}
              <div style={{
                background: isRecordingVoice ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                border: isRecordingVoice ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '30px',
                padding: '8px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: isRecordingVoice ? '0 0 20px rgba(255, 59, 48, 0.25)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}>
                {isRecordingVoice && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#FF3B30',
                    animation: 'pulseRecordGlow 1s infinite alternate',
                    animationPlayState: isVoiceRecordingPaused ? 'paused' : 'running'
                  }} />
                )}
                <span style={{ 
                  fontSize: '26px', 
                  fontWeight: '700', 
                  color: isRecordingVoice ? '#FF3B30' : '#FFFFFF',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.5px',
                  fontFamily: 'monospace, var(--font-main)'
                }}>
                  {Math.floor(voiceRecordTime / 60)}:{(voiceRecordTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              <span style={{ 
                fontSize: '14px', 
                color: 'rgba(255, 255, 255, 0.65)', 
                fontWeight: '500', 
                maxWidth: '280px',
                lineHeight: '1.4',
                letterSpacing: '-0.1px'
              }}>
                {isRecordingVoice 
                  ? isVoiceRecordingPaused
                    ? 'Recording paused. Tap Hold button to resume'
                    : 'Recording live... Tap center to stop, pause to hold' 
                  : recordedVoiceBlob 
                    ? 'Tap center to retake, right to publish' 
                    : 'Tap the center button to start recording'}
              </span>
            </div>

          </div>

          {/* Bottom Controls Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '420px', margin: '0 auto', gap: '20px', zIndex: 10 }}>
            
            {/* Actions / Buttons Container */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px' }}>
              {/* Discard / Delete Button (Left) */}
              <button
                disabled={!isRecordingVoice && !recordedVoiceBlob}
                onClick={discardVoiceRecording}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: (isRecordingVoice || recordedVoiceBlob) 
                    ? '1px solid rgba(255, 69, 58, 0.4)' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: (isRecordingVoice || recordedVoiceBlob) 
                    ? 'linear-gradient(135deg, rgba(255, 69, 58, 0.25) 0%, rgba(255, 69, 58, 0.1) 100%)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  color: (isRecordingVoice || recordedVoiceBlob) ? '#FF453A' : 'rgba(255, 255, 255, 0.15)',
                  cursor: (isRecordingVoice || recordedVoiceBlob) ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: (isRecordingVoice || recordedVoiceBlob) ? '0 8px 24px rgba(255, 69, 58, 0.25)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: 'scale(1)'
                }}
                onMouseEnter={e => { if (isRecordingVoice || recordedVoiceBlob) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseDown={e => { if (isRecordingVoice || recordedVoiceBlob) e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { if (isRecordingVoice || recordedVoiceBlob) e.currentTarget.style.transform = 'scale(1.08)'; }}
              >
                <Trash2 size={24} />
              </button>

              {/* Pause / Resume / Hold Button (Second) */}
              <button
                disabled={!isRecordingVoice}
                onClick={toggleVoiceRecordingPause}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: isRecordingVoice 
                    ? isVoiceRecordingPaused 
                      ? '1px solid rgba(48, 209, 88, 0.4)' 
                      : '1px solid rgba(255, 159, 10, 0.4)' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isRecordingVoice 
                    ? isVoiceRecordingPaused 
                      ? 'linear-gradient(135deg, rgba(48, 209, 88, 0.25) 0%, rgba(48, 209, 88, 0.1) 100%)' 
                      : 'linear-gradient(135deg, rgba(255, 159, 10, 0.25) 0%, rgba(255, 159, 10, 0.1) 100%)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  color: isRecordingVoice 
                    ? isVoiceRecordingPaused 
                      ? '#30D158' 
                      : '#FF9F0A' 
                    : 'rgba(255, 255, 255, 0.15)',
                  cursor: isRecordingVoice ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isRecordingVoice 
                    ? isVoiceRecordingPaused 
                      ? '0 8px 24px rgba(48, 209, 88, 0.25)' 
                      : '0 8px 24px rgba(255, 159, 10, 0.25)' 
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: 'scale(1)'
                }}
                onMouseEnter={e => { if (isRecordingVoice) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseDown={e => { if (isRecordingVoice) e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { if (isRecordingVoice) e.currentTarget.style.transform = 'scale(1.08)'; }}
                title={isVoiceRecordingPaused ? "Resume Recording" : "Pause Recording"}
              >
                {isVoiceRecordingPaused ? (
                  <Play size={24} fill="#30D158" style={{ marginLeft: '3px' }} />
                ) : (
                  <Pause size={24} fill={isRecordingVoice ? "#FF9F0A" : "none"} />
                )}
              </button>

              {/* Main Action Trigger Button (Center/Third) */}
              <button
                onClick={
                  recordedVoiceBlob 
                    ? () => {
                        if (voiceAudioPlayerRef.current) {
                          voiceAudioPlayerRef.current.pause();
                          voiceAudioPlayerRef.current = null;
                        }
                        setRecordedVoiceBlob(null);
                        setRecordedVoiceUrl(null);
                        setVoiceRecordTime(0);
                        setIsPlayingVoicePreview(false);
                        startVoiceRecording();
                      }
                    : isRecordingVoice 
                      ? stopVoiceRecording 
                      : startVoiceRecording
                }
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isRecordingVoice 
                    ? 'linear-gradient(135deg, #FF453A 0%, #BF1A10 100%)' 
                    : recordedVoiceBlob 
                      ? 'linear-gradient(135deg, #FF9F0A 0%, #D47A00 100%)'
                      : 'linear-gradient(135deg, #0A84FF 0%, #0055D4 100%)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isRecordingVoice 
                    ? '0 8px 24px rgba(255, 69, 58, 0.4), 0 0 0 4px rgba(255, 69, 58, 0.15)' 
                    : recordedVoiceBlob 
                      ? '0 8px 24px rgba(255, 159, 10, 0.35)' 
                      : '0 8px 24px rgba(10, 132, 255, 0.35), 0 0 0 4px rgba(10, 132, 255, 0.15)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: 'scale(1)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              >
                {isRecordingVoice ? (
                  <Square size={24} fill="#FFF" />
                ) : recordedVoiceBlob ? (
                  <RotateCw size={24} strokeWidth={2.5} />
                ) : (
                  <Mic size={26} />
                )}
              </button>

              {/* Share / Send Button (Right/Fourth) */}
              <button
                disabled={!recordedVoiceBlob}
                onClick={submitVoiceStatus}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: recordedVoiceBlob ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: recordedVoiceBlob 
                    ? 'linear-gradient(135deg, #30D158 0%, #1A8B35 100%)'
                    : 'rgba(255, 255, 255, 0.02)',
                  color: recordedVoiceBlob ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)',
                  cursor: recordedVoiceBlob ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: recordedVoiceBlob ? '0 8px 24px rgba(48, 209, 88, 0.4)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: 'scale(1)',
                  paddingLeft: recordedVoiceBlob ? '3px' : '0'
                }}
                onMouseEnter={e => { if (recordedVoiceBlob) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseDown={e => { if (recordedVoiceBlob) e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={e => { if (recordedVoiceBlob) e.currentTarget.style.transform = 'scale(1.08)'; }}
              >
                <Send size={24} />
              </button>
            </div>
            
          </div>

        </div>
      )}

      {/* ═══ CREATE GROUP MODAL (iOS Premium) ═══ */}
      {showCreateGroupModal && (
        <div
          onClick={() => setShowCreateGroupModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'cgFadeIn 0.2s ease' }}
        >
          <style>{`
            @keyframes cgFadeIn { from{opacity:0} to{opacity:1} }
            @keyframes cgSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
            .cg-contact:hover { background: #F2F2F7 !important; }
            .cg-chip:hover { background: rgba(255,59,48,0.1) !important; border-color: #FF3B30 !important; }
            .cg-btn-back:hover { background: #E5E5EA !important; }
            .cg-input-wrap:focus-within { border-color: #007AFF !important; box-shadow: 0 0 0 3px rgba(0,122,255,0.12) !important; }
          `}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#F2F2F7', borderTopLeftRadius: '26px', borderTopRightRadius: '26px', maxHeight: '93dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'cgSlideUp 0.32s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 -4px 40px rgba(0,0,0,0.18)' }}
          >
            {/* Pill */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '2px', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#C7C7CC' }} />
            </div>

            {/* ── STEP 1 ── */}
            {createGroupStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 12px', flexShrink: 0 }}>
                  <button onClick={() => setShowCreateGroupModal(false)} style={{ fontSize: '16px', color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', padding: '4px 0' }}>Cancel</button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: '#000', letterSpacing: '-0.4px' }}>New Group</div>
                    <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '1px' }}>Step 1 of 2</div>
                  </div>
                  <button
                    onClick={() => { if (groupSelectedMembers.length > 0) setCreateGroupStep(2); }}
                    disabled={groupSelectedMembers.length === 0}
                    style={{ fontSize: '16px', color: groupSelectedMembers.length > 0 ? '#007AFF' : '#C7C7CC', background: 'none', border: 'none', cursor: groupSelectedMembers.length > 0 ? 'pointer' : 'default', fontWeight: '700', padding: '4px 0', transition: 'color 0.2s' }}
                  >Next</button>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
                  <div className="cg-input-wrap" style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '14px', padding: '10px 14px', gap: '8px', border: '1.5px solid #E5E5EA', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <Search size={16} color="#8E8E93" style={{ flexShrink: 0 }} />
                    <input
                      placeholder="Search by name or ID..."
                      value={groupMemberSearch}
                      onChange={e => setGroupMemberSearch(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: '#000', fontFamily: 'inherit' }}
                      autoFocus
                    />
                    {groupMemberSearch ? (
                      <div onClick={() => setGroupMemberSearch('')} style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#C7C7CC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <XIcon size={10} color="#fff" />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Selected chips */}
                {groupSelectedMembers.length > 0 && (
                  <div style={{ padding: '0 16px 10px', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                    {groupSelectedMembers.map(m => (
                      <div key={m._id} className="cg-chip" onClick={() => setGroupSelectedMembers(prev => prev.filter(x => x._id !== m._id))} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.25)', borderRadius: '20px', padding: '4px 10px 4px 5px', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <img src={m.profilePicture ? (m.profilePicture.startsWith('http') ? m.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + m.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(m.displayName || '') + "&background=random&color=fff"} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#007AFF' }}>{m.displayName}</span>
                        <XIcon size={11} color="#007AFF" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Count badge */}
                <div style={{ padding: '4px 16px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {loadingGroupUsers ? 'Loading...' : `${groupAllUsers.length} Users on ZapChat`}
                  </span>
                  {groupSelectedMembers.length > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#007AFF' }}>{groupSelectedMembers.length} selected</span>
                  )}
                </div>

                {/* User List */}
                <div style={{ flex: 1, overflowY: 'auto', background: '#fff', borderRadius: '16px', margin: '0 8px 8px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                  {loadingGroupUsers ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#8E8E93', gap: '10px' }}>
                      <svg style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#007AFF" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
                      <span style={{ fontSize: '15px' }}>Loading users...</span>
                    </div>
                  ) : (() => {
                    const q = groupMemberSearch.trim().toLowerCase();
                    const list = (groupAllUsers.length > 0 ? groupAllUsers : contacts).filter(u => {
                      if (!q) return true;
                      return (
                        (u.displayName || '').toLowerCase().includes(q) ||
                        (u.username || '').toLowerCase().includes(q) ||
                        (u._id || '').toString().toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q)
                      );
                    });
                    if (list.length === 0) return (
                      <div style={{ padding: '50px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Search size={24} color="#C7C7CC" />
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#000' }}>No Users Found</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93' }}>No match for "{groupMemberSearch}"</div>
                      </div>
                    );
                    return list.map((u, idx) => {
                      const isSelected = groupSelectedMembers.some(m => m._id === u._id);
                      const isLast = idx === list.length - 1;
                      return (
                        <div key={u._id} className="cg-contact" onClick={() => setGroupSelectedMembers(prev => isSelected ? prev.filter(x => x._id !== u._id) : [...prev, u])} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '13px', cursor: 'pointer', transition: 'background 0.12s', background: isSelected ? 'rgba(0,122,255,0.04)' : '#fff', borderBottom: isLast ? 'none' : '0.5px solid #F2F2F7' }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img src={u.profilePicture ? (u.profilePicture.startsWith('http') ? u.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + u.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(u.displayName || '') + "&background=random&color=fff"} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '2.5px solid #007AFF' : '2.5px solid transparent', transition: 'border 0.2s' }} alt="" />
                            {u.status === 'online' && <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', borderRadius: '50%', background: '#34C759', border: '2px solid #fff' }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '600', color: '#000', fontSize: '15.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.displayName}</span>
                              {u.role === 'admin' && <span style={{ fontSize: '9px', fontWeight: '800', background: 'linear-gradient(135deg,#FFD700,#FFA500)', color: '#000', padding: '1px 5px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.3px', flexShrink: 0 }}>Admin</span>}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#8E8E93', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {u.username ? `@${u.username}` : (u.email || u._id?.toString()?.slice(-8))}
                            </div>
                          </div>
                          {/* iOS-style checkmark circle */}
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: isSelected ? 'none' : '2px solid #D1D1D6', background: isSelected ? '#007AFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.18s cubic-bezier(0.2,0.8,0.2,1)', transform: isSelected ? 'scale(1.05)' : 'scale(1)' }}>
                            {isSelected && <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-9" stroke="#FFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Bottom bar */}
                <div style={{ padding: '10px 16px 28px', background: '#F2F2F7', flexShrink: 0 }}>
                  <button
                    onClick={() => { if (groupSelectedMembers.length > 0) setCreateGroupStep(2); }}
                    disabled={groupSelectedMembers.length === 0}
                    style={{ width: '100%', padding: '15px', borderRadius: '16px', border: 'none', background: groupSelectedMembers.length > 0 ? '#007AFF' : '#C7C7CC', color: '#FFF', fontSize: '16px', fontWeight: '700', cursor: groupSelectedMembers.length > 0 ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: groupSelectedMembers.length > 0 ? '0 4px 16px rgba(0,122,255,0.35)' : 'none', letterSpacing: '-0.2px' }}
                  >
                    {groupSelectedMembers.length > 0 ? `Continue with ${groupSelectedMembers.length} member${groupSelectedMembers.length > 1 ? 's' : ''}` : 'Select at least 1 member'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {createGroupStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px', flexShrink: 0 }}>
                  <button onClick={() => setCreateGroupStep(1)} className="cg-btn-back" style={{ fontSize: '16px', color: '#007AFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', padding: '4px 0' }}>← Back</button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: '#000', letterSpacing: '-0.4px' }}>Group Info</div>
                    <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '1px' }}>Step 2 of 2</div>
                  </div>
                  <div style={{ width: '60px' }} />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                  {/* Icon Picker */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                    <div style={{ position: 'relative' }}>
                      <div onClick={() => groupIconInputRef.current?.click()} style={{ width: '96px', height: '96px', borderRadius: '50%', background: groupIconPreview ? 'transparent' : 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,122,255,0.3)', border: '3px solid rgba(255,255,255,0.8)' }}>
                        {groupIconPreview ? <img src={groupIconPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Users size={38} color="#FFF" />}
                      </div>
                      <div onClick={() => groupIconInputRef.current?.click()} style={{ position: 'absolute', bottom: '0', right: '0', width: '28px', height: '28px', borderRadius: '50%', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid #F2F2F7', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                        <Camera size={13} color="#FFF" />
                      </div>
                      <input ref={groupIconInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if(f){ setGroupIconFile(f); setGroupIconPreview(URL.createObjectURL(f)); }}} />
                    </div>
                  </div>

                  {/* Name */}
                  <div style={{ background: '#fff', borderRadius: '14px', marginBottom: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '4px 16px 0', fontSize: '11px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '12px' }}>Group Name *</div>
                    <input
                      type="text"
                      placeholder="E.g. Family, Work Team..."
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      maxLength={50}
                      autoFocus
                      style={{ width: '100%', padding: '8px 16px 14px', border: 'none', outline: 'none', background: 'transparent', fontSize: '16px', color: '#000', fontWeight: '500', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Description */}
                  <div style={{ background: '#fff', borderRadius: '14px', marginBottom: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '12px 16px 0', fontSize: '11px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</div>
                    <textarea
                      placeholder="What's this group about?"
                      value={groupDescription}
                      onChange={e => setGroupDescription(e.target.value)}
                      maxLength={200}
                      rows={2}
                      style={{ width: '100%', padding: '8px 16px 14px', border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: '#000', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Members preview */}
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', paddingLeft: '4px' }}>
                    Members · {groupSelectedMembers.length}
                  </div>
                  <div style={{ background: '#fff', borderRadius: '14px', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    {groupSelectedMembers.map(m => (
                      <div key={m._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '52px' }}>
                        <img src={m.profilePicture ? (m.profilePicture.startsWith('http') ? m.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + m.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(m.displayName || '') + "&background=random&color=fff"} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E5EA' }} alt="" />
                        <span style={{ fontSize: '10.5px', color: '#8E8E93', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{m.displayName.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Create Button */}
                <div style={{ padding: '10px 16px 28px', background: '#F2F2F7', flexShrink: 0 }}>
                  <button
                    onClick={async () => {
                      if (!groupName.trim() || isCreatingGroup) return;
                      setIsCreatingGroup(true);
                      try {
                        let groupIconId = null;
                        if (groupIconFile) {
                          const fd = new FormData();
                          fd.append('file', groupIconFile);
                          const ur = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: fd });
                          if (ur.ok) { const ud = await ur.json(); groupIconId = ud.fileId; }
                        }
                        const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                          body: JSON.stringify({ name: groupName.trim(), description: groupDescription.trim(), members: groupSelectedMembers.map(m => m._id), ...(groupIconId ? { icon: groupIconId } : {}) })
                        });
                        if (!resp.ok) throw new Error('Failed');
                        const newGroup = await resp.json();
                        setShowCreateGroupModal(false);
                        if (onSelectContact) onSelectContact(newGroup);
                      } catch(err) {
                        console.error(err);
                        alert('Failed to create group. Please try again.');
                      } finally {
                        setIsCreatingGroup(false);
                      }
                    }}
                    disabled={!groupName.trim() || isCreatingGroup}
                    style={{ width: '100%', padding: '15px', borderRadius: '16px', border: 'none', background: groupName.trim() && !isCreatingGroup ? '#34C759' : '#C7C7CC', color: '#FFF', fontSize: '16px', fontWeight: '700', cursor: groupName.trim() && !isCreatingGroup ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: groupName.trim() ? '0 4px 16px rgba(52,199,89,0.35)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '-0.2px' }}
                  >
                    {isCreatingGroup ? (
                      <><svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#FFF" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg><span>Creating Group...</span></>
                    ) : (
                      <><Users size={18} /><span>Create Group</span></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAdminControlPanel && selectedAdminUser && createPortal(
        (
          <div 
            onClick={() => {
            setShowAdminControlPanel(false);
            setSelectedAdminUser(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {/* Bottom Sheet wrapper */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#F2F2F7',
              width: '100%',
              maxWidth: '500px',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '0.5px solid #C6C6C8',
              background: '#FFFFFF',
            }}>
              <span style={{ fontSize: '17px', fontWeight: '600', color: '#000000' }}>Admin Panel</span>
              <button 
                onClick={() => {
                  setShowAdminControlPanel(false);
                  setSelectedAdminUser(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007AFF',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>

            {/* Content Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 40px' }}>
              {/* User Identity Info Card */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <img
                  src={selectedAdminUser.profilePicture ? (selectedAdminUser.profilePicture.startsWith('http') ? selectedAdminUser.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + selectedAdminUser.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(selectedAdminUser.displayName || '') + "&background=random&color=fff"}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
                  alt=""
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '17px', fontWeight: '700', color: '#000000' }}>
                    {selectedAdminUser.displayName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px', wordBreak: 'break-all' }}>
                    ID: {selectedAdminUser._id}
                  </div>
                </div>
              </div>

              {/* SECTION 1: ACCOUNT METADATA & INFO (Feature 1) */}
              <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', paddingLeft: '8px' }}>
                Account Information
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid #E5E5EA' }}>
                  <span style={{ fontSize: '15px', color: '#8E8E93' }}>Email</span>
                  <span style={{ fontSize: '15px', color: '#000000', fontWeight: '500' }}>{selectedAdminUser.email || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid #E5E5EA' }}>
                  <span style={{ fontSize: '15px', color: '#8E8E93' }}>Phone</span>
                  <span style={{ fontSize: '15px', color: '#000000', fontWeight: '500' }}>{selectedAdminUser.phone || 'None'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid #E5E5EA' }}>
                  <span style={{ fontSize: '15px', color: '#8E8E93' }}>Status</span>
                  <span style={{ 
                    fontSize: '15px', 
                    color: selectedAdminUser.isSuspended ? '#FF3B30' : '#34C759', 
                    fontWeight: '600' 
                  }}>
                    {selectedAdminUser.isSuspended ? '🔴 Suspended' : '🟢 Active'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                  <span style={{ fontSize: '15px', color: '#8E8E93' }}>Role</span>
                  <span style={{ fontSize: '15px', color: '#007AFF', fontWeight: '600', textTransform: 'uppercase' }}>
                    {selectedAdminUser.role || 'user'}
                  </span>
                </div>
              </div>

              {/* SECTION 2: WORKABLE CONTROLS */}
              <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', paddingLeft: '8px' }}>
                Admin Controls & Actions
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                
                {/* Feature 2: Toggle Role (User/Admin) */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  borderBottom: '0.5px solid #E5E5EA',
                  cursor: 'pointer'
                }}
                onClick={async () => {
                  if (isAdminActionLoading) return;
                  const newRole = selectedAdminUser.role === 'admin' ? 'user' : 'admin';
                  if (!window.confirm(`Are you sure you want to change role to ${newRole.toUpperCase()}?`)) return;
                  
                  setIsAdminActionLoading(true);
                  try {
                    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${selectedAdminUser._id}/role`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({ role: newRole })
                    });
                    if (!res.ok) throw new Error('Action failed');
                    const updated = await res.json();
                    setSelectedAdminUser(prev => ({ ...prev, role: updated.role }));
                    alert(`Role updated to ${updated.role.toUpperCase()}`);
                    fetchContacts();
                  } catch (err) {
                    alert('Error changing user role');
                  } finally {
                    setIsAdminActionLoading(false);
                  }
                }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '500', color: '#000000' }}>Promote to Admin</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#8E8E93' }}>
                      {selectedAdminUser.role === 'admin' ? 'Admin' : 'Regular User'}
                    </span>
                    <ArrowLeftRight size={16} color="#8E8E93" />
                  </div>
                </div>

                {/* Feature 3: Suspend/Ban Account Toggle */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px',
                  cursor: 'pointer'
                }}
                onClick={async () => {
                  if (isAdminActionLoading) return;
                  const nextSuspendState = !selectedAdminUser.isSuspended;
                  if (!window.confirm(`Are you sure you want to ${nextSuspendState ? 'SUSPEND' : 'RE-ACTIVATE'} this user?`)) return;
                  
                  setIsAdminActionLoading(true);
                  try {
                    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${selectedAdminUser._id}/suspend`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({ isSuspended: nextSuspendState })
                    });
                    if (!res.ok) throw new Error('Action failed');
                    const updated = await res.json();
                    setSelectedAdminUser(prev => ({ ...prev, isSuspended: updated.isSuspended }));
                    alert(`Account ${updated.isSuspended ? 'Suspended' : 'Activated'}`);
                    fetchContacts();
                  } catch (err) {
                    alert('Error updating suspension state');
                  } finally {
                    setIsAdminActionLoading(false);
                  }
                }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '500', color: selectedAdminUser.isSuspended ? '#34C759' : '#FF3B30' }}>
                    {selectedAdminUser.isSuspended ? 'Re-activate Account' : 'Suspend / Ban Account'}
                  </span>
                  <Shield size={18} color={selectedAdminUser.isSuspended ? '#34C759' : '#FF3B30'} />
                </div>
              </div>

              {/* DANGER DESTRUCTIVE ACTIONS */}
              <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', paddingLeft: '8px' }}>
                Danger Zone
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                
                {/* Feature 4: Wipe Messages / Clear History */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  borderBottom: '0.5px solid #E5E5EA',
                  cursor: 'pointer'
                }}
                onClick={async () => {
                  if (isAdminActionLoading) return;
                  if (!window.confirm('WARNING: Are you sure you want to WIPE all message history for this user? This cannot be undone.')) return;
                  
                  setIsAdminActionLoading(true);
                  try {
                    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${selectedAdminUser._id}/messages`, {
                      method: 'DELETE',
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      }
                    });
                    if (!res.ok) throw new Error('Action failed');
                    const data = await res.json();
                    alert(data.message || 'Wiped message history successfully.');
                    fetchContacts();
                  } catch (err) {
                    alert('Error clearing user messages');
                  } finally {
                    setIsAdminActionLoading(false);
                  }
                }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#FF3B30' }}>Wipe Chat History</span>
                  <TrashIcon size={18} color="#FF3B30" />
                </div>

                {/* Feature 5: Delete User Account ID */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px',
                  cursor: 'pointer'
                }}
                onClick={async () => {
                  if (isAdminActionLoading) return;
                  if (!window.confirm('CRITICAL WARNING: Are you sure you want to DELETE this User ID from the database permanently?')) return;
                  
                  setIsAdminActionLoading(true);
                  try {
                    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${selectedAdminUser._id}`, {
                      method: 'DELETE',
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      }
                    });
                    if (!res.ok) throw new Error('Action failed');
                    const data = await res.json();
                    alert(data.message || 'User deleted successfully.');
                    setShowAdminControlPanel(false);
                    setSelectedAdminUser(null);
                    fetchContacts();
                  } catch (err) {
                    alert('Error deleting user ID');
                  } finally {
                    setIsAdminActionLoading(false);
                  }
                }}
                >
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#FF3B30' }}>Delete User ID / Account</span>
                  <AlertTriangle size={18} color="#FF3B30" />
                </div>

              </div>

            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default Sidebar;
