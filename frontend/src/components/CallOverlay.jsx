import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../context/CallContext';
import { 
    Phone, PhoneOff, Video, Mic, Volume2, 
    ChevronDown, Lock, UserPlus, Sparkles, 
    Grid, MoreHorizontal, ChevronUp, MicOff,
    VideoOff, PhoneCall, X, Users, MessageSquare,
    Pause, Share2, Disc, ShieldCheck, Music, Loader2
} from 'lucide-react';
import ContactPickerModal from './ContactPickerModal';
import { useAuth } from '../context/AuthContext';

// ─── Pro SVG Icons for each effect ──────────────────────────────────────────
const EffectIcons = {
    normal: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
    ),
    beauty: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.09 6.26L20 10l-5.91 3.74L16 20l-4-3-4 3 1.91-6.26L4 10l5.91-1.74z"/>
        </svg>
    ),
    blur: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z" strokeDasharray="3 2" opacity="0.6"/>
            <path d="M12 1C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1z" strokeDasharray="2 3" opacity="0.35"/>
        </svg>
    ),
    warm: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C9 7 5 9 5 13a7 7 0 0014 0c0-4-4-6-7-11z"/>
            <path d="M12 12v6" opacity="0.6"/>
        </svg>
    ),
    cool: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="22"/>
            <path d="M17 5H9.5a3.5 3.5 0 010 7h5a3.5 3.5 0 110 7H6"/>
        </svg>
    ),
    noir: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a10 10 0 010 20" fill="rgba(255,255,255,0.3)"/>
            <line x1="12" y1="8" x2="12" y2="16" opacity="0.6"/>
            <line x1="8" y1="12" x2="16" y2="12" opacity="0.6"/>
        </svg>
    ),
    neon: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
    ),
    vibrant: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2a10 10 0 00-7.07 2.93" stroke="#ff6b6b"/>
            <path d="M4.93 4.93A10 10 0 002 12" stroke="#ffd93d"/>
            <path d="M2 12a10 10 0 002.93 7.07" stroke="#6bcb77"/>
            <path d="M4.93 19.07A10 10 0 0012 22" stroke="#4d96ff"/>
            <path d="M12 22a10 10 0 007.07-2.93" stroke="#c77dff"/>
            <path d="M19.07 19.07A10 10 0 0022 12" stroke="#ff6b6b"/>
            <path d="M22 12a10 10 0 00-2.93-7.07" stroke="#ffd93d"/>
            <path d="M19.07 4.93A10 10 0 0012 2" stroke="#6bcb77"/>
        </svg>
    ),
    pastel: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
    ),
    dramatic: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2l20 20M2 22 22 2" opacity="0.3"/>
            <path d="M7 2H2v5M17 2h5v5M7 22H2v-5M17 22h5v-5"/>
        </svg>
    ),
    scifi: () => (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" strokeDasharray="4 2"/>
            <path d="M12 6v2M12 16v2M6 12H4M20 12h-2M7.76 7.76l1.42 1.42M14.82 14.82l1.42 1.42M7.76 16.24l1.42-1.42M14.82 9.18l1.42-1.42"/>
        </svg>
    ),
};

const EFFECTS_LIST = [
    { id: null,       label: 'Normal',   iconKey: 'normal',   gradient: 'linear-gradient(145deg,#2c3e50,#4a5568)',   glow: '#64748b', desc: 'Original'        },
    { id: 'beauty',   label: 'Beauty',   iconKey: 'beauty',   gradient: 'linear-gradient(145deg,#f7971e,#ffd200)',   glow: '#ffd200', desc: 'Skin smoothing'  },
    { id: 'blur',     label: 'Portrait', iconKey: 'blur',     gradient: 'linear-gradient(145deg,#4facfe,#00f2fe)',   glow: '#00f2fe', desc: 'Depth blur'      },
    { id: 'warm',     label: 'Warm',     iconKey: 'warm',     gradient: 'linear-gradient(145deg,#f12711,#f5af19)',   glow: '#f5af19', desc: 'Golden tone'     },
    { id: 'cool',     label: 'Cool',     iconKey: 'cool',     gradient: 'linear-gradient(145deg,#00b4db,#0083b0)',   glow: '#00b4db', desc: 'Ice blue'        },
    { id: 'noir',     label: 'Noir',     iconKey: 'noir',     gradient: 'linear-gradient(145deg,#434343,#808080)',   glow: '#9ca3af', desc: 'B&W cinema'      },
    { id: 'neon',     label: 'Neon',     iconKey: 'neon',     gradient: 'linear-gradient(145deg,#a855f7,#ec4899)',   glow: '#a855f7', desc: 'Neon glow'       },
    { id: 'vibrant',  label: 'Vibrant',  iconKey: 'vibrant',  gradient: 'linear-gradient(145deg,#f093fb,#f5576c)',   glow: '#f5576c', desc: 'Pop colors'      },
    { id: 'pastel',   label: 'Pastel',   iconKey: 'pastel',   gradient: 'linear-gradient(145deg,#fddb92,#d1fdff)',   glow: '#fddb92', desc: 'Dreamy soft'     },
    { id: 'dramatic', label: 'Dramatic', iconKey: 'dramatic', gradient: 'linear-gradient(145deg,#1a1a2e,#e94560)',   glow: '#e94560', desc: 'Dark cinematic'  },
    { id: 'scifi',    label: 'Sci-Fi',   iconKey: 'scifi',    gradient: 'linear-gradient(145deg,#0f0c29,#302b63)',   glow: '#818cf8', desc: 'Cyber blue'      },
];

const CallOverlay = () => {
    const { user } = useAuth();
    const { 
        callState, 
        remoteUser, 
        callType, 
        localStream, 
        remoteStreams, 
        acceptCall, 
        declineCall, 
        endCall,
        isMuted,
        isVideoOff,
        isSpeakerOn,
        isOnHold,
        toggleAudio,
        toggleVideo,
        toggleSpeaker,
        toggleHold,
        upgradeToVideo,
        downgradeToAudio,
        isRecording,
        recordingParticipants,
        startRecording,
        stopRecording,
        isNoiseIsolationActive,
        toggleNoiseIsolation,
        inviteToCall,
        participants,
        mutedParticipants,
        muteParticipant,
        kickParticipant,
        activeEffect,
        setVideoEffect
    } = useCall();

    const remoteStream = remoteUser ? remoteStreams[remoteUser._id] : null;



    const [timer, setTimer] = useState(0);
    const [showFeatures, setShowFeatures] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);

    const [showContactPicker, setShowContactPicker] = useState(false);
    const [showEffectsDrawer, setShowEffectsDrawer] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // Timer effect
    useEffect(() => {
        let interval;
        if (callState === 'active') {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [callState]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, callState]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, callState]);

    if (callState === 'idle') return null;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getProfilePic = (user) => {
        if (!user?.profilePicture) return null;
        return user.profilePicture.startsWith('http') 
            ? user.profilePicture 
            : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token');
    };

    return (
        <div className="animate-slide-up"
             style={{ 
                 position: 'fixed', 
                 inset: 0, 
                 zIndex: 3000, 
                 display: 'flex', 
                 flexDirection: 'column', 
                 color: 'white',
                 overflow: 'hidden',
                 fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
             }}>
            
            {/* Background Layer */}
            {callType === 'video' ? (
                <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: -1 }}>
                    {callState === 'active' && (
                        <video 
                            ref={remoteVideoRef} 
                            autoPlay 
                            playsInline 
                            className="video-reveal"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )}
                </div>
            ) : (
                <div className="call-bg-pattern" style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
                    {/* Hidden audio tag to play remote audio in audio-only calls */}
                    {callState === 'active' && (
                        <audio 
                            ref={remoteVideoRef} 
                            autoPlay 
                            playsInline 
                            style={{ display: 'none' }}
                        />
                    )}
                </div>
            )}

            {/* Top Navigation Bar */}
            <div style={{ 
                padding: '20px 24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                zIndex: 10 
            }}>
                <button style={{ background: 'transparent', border: 'none', color: 'white', opacity: 0.8 }}>
                    <ChevronDown size={28} />
                </button>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '12px', 
                    fontWeight: '500', 
                    opacity: 0.6,
                    letterSpacing: '0.3px'
                }}>
                    <Lock size={12} />
                    End-to-end Encrypted
                </div>
                <button 
                    onClick={() => setShowContactPicker(true)}
                    style={{ background: 'transparent', border: 'none', color: 'white', opacity: 0.8, cursor: 'pointer' }}
                >
                    <UserPlus size={24} />
                </button>
            </div>

            {/* Center Header (Name & Status) - Only for 1-on-1 calls */}
            {participants.length <= 1 && (
                <div style={{ textAlign: 'center', marginTop: '10px', zIndex: 10 }}>
                    <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                        {remoteUser?.displayName || 'Unknown'}
                    </h2>
                    <div style={{ fontSize: '16px', fontWeight: '500', opacity: 0.8 }}>
                        {callState === 'calling' ? 'Calling...' : 
                        callState === 'incoming' ? 'Incoming Call' : 
                        callState === 'active' ? formatTime(timer) : 'Connecting...'}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div style={{ 
                flex: 1, position: 'relative', display: 'flex', 
                flexDirection: 'column', padding: '20px'
            }}>
                <style>{`
                    @keyframes pulse-ring {
                        0% { transform: scale(0.95); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.8; }
                        100% { transform: scale(0.95); opacity: 1; }
                    }
                    .animate-pulse-pro {
                        animation: pulse-ring 2s infinite ease-in-out;
                    }
                    .spin {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>

                {participants.length > 1 ? (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: (participants.length + 1) <= 2 ? '1fr' : '1fr 1fr',
                        gap: '16px', 
                        padding: '20px',
                        width: '100%',
                        maxWidth: '1200px',
                        margin: '0 auto',
                        alignContent: 'center'
                    }}>
                        {[{ user: user, status: 'active', isLocal: true }, ...participants].map((p, idx) => {
                            const isMulti = (participants.length + 1) > 2;
                            const isInviting = p.status === 'inviting';
                            const isLocal = p.isLocal;
                            const pic = p.user.profilePicture 
                                ? (p.user.profilePicture.startsWith('http') ? p.user.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + p.user.profilePicture + "?token=" + localStorage.getItem('token'))
                                : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(p.user.displayName || '') + "&background=random&color=fff";


                            return (
                                <div key={p.user._id || idx} style={{ 
                                    background: 'linear-gradient(145deg, #26353d, #1a252b)', 
                                    borderRadius: '28px', 
                                    height: isMulti ? '210px' : '280px',
                                    width: '100%',
                                    maxWidth: isMulti ? '310px' : '340px',
                                    position: 'relative', overflow: 'hidden',

                                    display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                    justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    margin: '0 auto'
                                }} className="hover-lift">
                                    <div style={{ position: 'relative' }}>
                                        <img 
                                            src={pic} 
                                            className={isInviting ? "animate-pulse-pro" : ""}
                                            style={{ 
                                                width: isMulti ? '70px' : '90px', 
                                                height: isMulti ? '70px' : '90px', 
                                                borderRadius: '50%', objectFit: 'cover',
                                                border: '3px solid #00a884',
                                                boxShadow: isInviting ? '0 0 25px rgba(0,168,132,0.4)' : '0 0 20px rgba(0,168,132,0.2)',
                                                transition: 'all 0.3s ease'
                                            }} 
                                            alt="" 
                                        />
                                    </div>

                                    <div style={{ marginTop: isMulti ? '8px' : '15px', textAlign: 'center', width: '100%' }}>
                                        <div style={{ fontSize: isMulti ? '15px' : '18px', fontWeight: '600', color: 'white' }}>{isLocal ? 'You' : p.user.displayName}</div>
                                        <div style={{ 
                                            fontSize: isMulti ? '12px' : '14px', color: isInviting ? '#8696a0' : '#00a884', 
                                            marginTop: '2px', fontWeight: '500', marginBottom: (isMulti && !isLocal) ? '6px' : '12px'
                                        }}>
                                            {isInviting ? 'Calling...' : 'Connected'}
                                        </div>

                                        {/* Pro Mini Controls Overlay - Hidden for local user */}
                                        {!isLocal && (
                                            <div style={{ 
                                                display: 'flex', gap: isMulti ? '8px' : '14px', justifyContent: 'center', 
                                                padding: isMulti ? '6px 12px' : '10px 18px', 
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                backdropFilter: 'blur(12px)',
                                                borderRadius: '24px', 
                                                width: 'fit-content', 
                                                margin: '0 auto',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                transition: 'all 0.3s ease'
                                            }} className="hover-lift">
                                                <button onClick={() => muteParticipant(p.user._id)} style={{ 
                                                    background: mutedParticipants.includes(p.user._id) ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.08)', 
                                                    border: 'none', color: mutedParticipants.includes(p.user._id) ? '#ff3b30' : 'white', 
                                                    borderRadius: '50%', width: isMulti ? '30px' : '36px', height: isMulti ? '30px' : '36px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                }}>
                                                    {mutedParticipants.includes(p.user._id) ? <MicOff size={isMulti ? 14 : 18} /> : <Mic size={isMulti ? 14 : 18} />}
                                                </button>
                                                
                                                <button onClick={() => kickParticipant(p.user._id)} style={{ 
                                                    background: 'linear-gradient(135deg, #FF3B30, #D70015)', 
                                                    border: 'none', color: 'white', borderRadius: '50%', 
                                                    width: isMulti ? '34px' : '42px', height: isMulti ? '34px' : '42px',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', 
                                                    justifyContent: 'center', boxShadow: '0 4px 15px rgba(215,0,21,0.4)',
                                                    transform: 'translateY(-1px)'
                                                }}>
                                                    <Phone size={isMulti ? 14 : 18} style={{ transform: 'rotate(135deg)' }} />
                                                </button>

                                                <button onClick={() => recordingParticipants.includes(p.user._id) ? stopRecording(p.user._id) : startRecording(p.user._id)} style={{ 
                                                    background: recordingParticipants.includes(p.user._id) ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.08)', 
                                                    border: 'none', color: recordingParticipants.includes(p.user._id) ? '#ff3b30' : 'white', 
                                                    borderRadius: '50%', width: isMulti ? '30px' : '36px', height: isMulti ? '30px' : '36px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', transition: 'all 0.2s'
                                                }}>
                                                    <Disc size={isMulti ? 14 : 18} className={recordingParticipants.includes(p.user._id) ? "animate-pulse" : ""} />
                                                </button>
                                            </div>
                                        )}




                                    </div>
                                </div>
                            );
                        })}
                    </div>


                ) : (
                    /* Original Single User Layout */
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', width: '100%' }}>
                        {callType === 'video' ? (
                            <>
                                {callState !== 'active' && (
                                    <div className="video-reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 }}>
                                        <div className="avatar-ring" style={{ 
                                            width: '180px', height: '180px', borderRadius: '50%', 
                                            padding: '4px', background: 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <div style={{ 
                                                width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                                                border: '4px solid #0b141a'
                                            }}>
                                                {getProfilePic(remoteUser) ? (
                                                    <img src={getProfilePic(remoteUser)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', background: '#1c272e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Video size={60} color="#8696a0" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Video Content */}
                                <div style={{ position: 'absolute', left: '0', bottom: '130px', zIndex: 10 }}>
                                    <button 
                                        onClick={() => setShowEffectsDrawer(!showEffectsDrawer)}
                                        className="glass-panel" 
                                        style={{ 
                                            width: '52px', height: '52px', borderRadius: '14px', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: activeEffect ? '2px solid #00a884' : 'none', color: 'white',
                                            background: activeEffect ? 'rgba(0,168,132,0.2)' : 'rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        <Sparkles size={24} />
                                    </button>
                                </div>

                                {/* Local Video PiP */}
                                <div className="video-reveal" style={{ 
                                    position: 'absolute', 
                                    top: '40px', 
                                    right: '20px', 
                                    width: '110px', 
                                    height: '160px', 
                                    borderRadius: '20px', 
                                    overflow: 'hidden', 
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                    background: '#000',
                                    zIndex: 20
                                }}>
                                    <video 
                                        ref={localVideoRef} 
                                        autoPlay 
                                        playsInline 
                                        muted
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
                                        <Sparkles size={14} color="white" />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Audio Call Avatar */
                            <div className="video-reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div className="avatar-ring" style={{ 
                                    width: '180px', height: '180px', borderRadius: '50%', 
                                    padding: '4px', background: 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div style={{ 
                                        width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                                        border: '4px solid #0b141a'
                                    }}>
                                        {getProfilePic(remoteUser) ? (
                                            <img src={getProfilePic(remoteUser)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#1c272e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Phone size={60} color="#8696a0" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Local audio is captured by WebRTC but not played locally to prevent echo */}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Controls Panel - New Floating Pill Design */}
            <div style={{ 
                width: '100%', 
                padding: '0 20px 50px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                zIndex: 100 
            }}>
                {callState === 'incoming' ? (
                    <div style={{ display: 'flex', gap: '60px', marginBottom: '20px' }}>
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <button 
                                onClick={declineCall} 
                                className="btn-decline-glow"
                                style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#ff3b30', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                            >
                                <PhoneOff size={32} color="white" />
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>Decline</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <button 
                                onClick={acceptCall} 
                                className="btn-accept-glow"
                                style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                            >
                                <Phone size={32} color="white" />
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>Accept</span>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                        {showKeypad && (
                            <div className="animate-scale-up glass-panel" style={{ 
                                width: '100%', maxWidth: '280px', borderRadius: '24px', 
                                padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', 
                                gap: '12px', background: 'rgba(0,0,0,0.6)', marginBottom: '10px',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                {['1','2','3','4','5','6','7','8','9','*','0','#'].map(num => (
                                    <button key={num} style={{ height: '44px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '18px', fontWeight: '600' }}>{num}</button>
                                ))}
                            </div>
                        )}

                        {/* Recording Indicator */}
                        {isRecording && (
                            <div className="animate-pulse" style={{ 
                                background: 'rgba(255, 59, 48, 0.2)', padding: '6px 12px', 
                                borderRadius: '12px', display: 'flex', alignItems: 'center', 
                                gap: '8px', marginBottom: '15px', border: '1px solid #ff3b30'
                            }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff3b30' }} className="record-dot" />
                                <span style={{ color: '#ff3b30', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>REC</span>
                            </div>
                        )}

                        {/* Expanded Pro Control Strip */}
                        <div style={{ 
                            background: '#1c272e', 
                            backdropFilter: 'blur(20px)',
                            borderRadius: '35px', 
                            padding: '12px 20px', 
                            display: 'flex', 
                            gap: '12px', 
                            alignItems: 'center',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
                            width: 'fit-content'
                        }}>
                            <ControlBtn 
                                icon={MoreHorizontal} 
                                variant="dark"
                                onClick={() => setShowFeatures(true)}
                            />
                            <ControlBtn 
                                icon={Volume2} 
                                variant={isSpeakerOn ? "white" : "dark"}
                                onClick={toggleSpeaker}
                            />
                            <ControlBtn 
                                icon={callType === 'video' ? Phone : Video} 
                                variant="dark"
                                onClick={() => callState === 'active' ? (callType === 'video' ? downgradeToAudio() : upgradeToVideo()) : null}
                                disabled={callState !== 'active'}
                            />

                            <ControlBtn 
                                icon={isMuted ? MicOff : Mic} 
                                variant={!isMuted ? "white" : "dark"}
                                onClick={toggleAudio}
                            />
                            <ControlBtn 
                                icon={isRecording ? Disc : Phone} 
                                variant={isRecording ? "red-pro" : "red-pro"}
                                onClick={isRecording ? stopRecording : endCall}
                                rotate={isRecording ? 0 : 135}
                                animation={isRecording ? "pulse-red" : "none"}
                            />
                        </div>

                        <div style={{ opacity: 0.4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '40px', height: '4px', background: 'white', borderRadius: '2px' }}></div>
                        </div>
                    </div>
                )}
            </div>

            {/* More Features Bottom Sheet */}
            {showFeatures && (
                <div style={{ 
                    position: 'absolute', inset: 0, zIndex: 1000, 
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
                }}>
                    <div className="animate-slide-up" style={{ 
                        background: '#1c272e', borderRadius: '32px 32px 0 0', 
                        padding: '24px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '600' }}>
                                {callType === 'video' ? 'Video Call Features' : 'Audio Call Features'}
                            </h3>
                            <button 
                                onClick={() => setShowFeatures(false)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ 
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px',
                            marginBottom: '20px'
                        }}>
                            {callType === 'video' ? (
                                <>
                                    <FeatureItem icon={Video} label="Camera Off" active={isVideoOff} onClick={toggleVideo} />
                                    <FeatureItem icon={Mic} label="Mute" active={isMuted} onClick={toggleAudio} />
                                    <FeatureItem icon={Volume2} label="Speaker" active={isSpeakerOn} onClick={toggleSpeaker} />
                                    <FeatureItem icon={Users} label="Add Participant" onClick={() => setShowContactPicker(true)} />
                                    <FeatureItem icon={Sparkles} label="Video Effects" active={!!activeEffect} onClick={() => { setShowFeatures(false); setShowEffectsDrawer(true); }} />
                                    <FeatureItem icon={Disc} label="Record Video" onClick={() => alert('Recording Coming Soon')} />
                                </>
                            ) : (
                                <>
                                    <FeatureItem icon={Grid} label="Keypad" active={showKeypad} onClick={() => { setShowKeypad(!showKeypad); setShowFeatures(false); }} />
                                    <FeatureItem icon={Users} label="Add Call" onClick={() => setShowContactPicker(true)} />
                                    <FeatureItem icon={Pause} label={isOnHold ? "Unhold" : "Hold"} active={isOnHold} onClick={toggleHold} />
                                    <FeatureItem icon={Music} label="Voice Effects" onClick={() => alert('Voice Changer Coming Soon')} />
                                    <FeatureItem icon={ShieldCheck} label="Noise Isolation" active={isNoiseIsolationActive} onClick={toggleNoiseIsolation} />
                                    <FeatureItem icon={Disc} label={isRecording ? "Stop Recording" : "Record Call"} active={isRecording} onClick={isRecording ? stopRecording : startRecording} />
                                </>
                            )}
                        </div>
                        
                        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '10px auto 0' }}></div>
                    </div>
                </div>
            )}

            {/* Contact Picker Modal */}
            {showContactPicker && (
                <ContactPickerModal 
                    onClose={() => setShowContactPicker(false)}
                    onSelect={(contact) => {
                        inviteToCall(contact);
                        setShowContactPicker(false);
                        setShowFeatures(false);
                    }}
                />
            )}

            {/* ── Video Effects Drawer (Pro) ─────────────────────── */}
            {showEffectsDrawer && (
                <div
                    onClick={() => setShowEffectsDrawer(false)}
                    style={{
                        position: 'absolute', inset: 0, zIndex: 1100,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
                    }}
                >
                    <div
                        className="animate-slide-up"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(180deg, #0d1117 0%, #111b21 100%)',
                            borderRadius: '32px 32px 0 0',
                            paddingBottom: '40px',
                            boxShadow: '0 -20px 80px rgba(0,0,0,0.8)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderBottom: 'none',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Gradient shimmer top bar */}
                        <div style={{ height: '3px', background: 'linear-gradient(90deg, #a855f7, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444)', borderRadius: '32px 32px 0 0' }} />

                        {/* Handle */}
                        <div style={{ width: '44px', height: '4px', borderRadius: '3px', background: 'rgba(255,255,255,0.18)', margin: '14px auto 0' }} />

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg,#a855f7,#6366f1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 20px rgba(168,85,247,0.4)'
                                }}>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                    </svg>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.4px' }}>Video Effects</h3>
                                        <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.8px', background: 'linear-gradient(135deg,#a855f7,#6366f1)', padding: '2px 7px', borderRadius: '20px', color: 'white' }}>PRO</span>
                                    </div>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Apply live filters to your camera</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowEffectsDrawer(false)}
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Active indicator pill */}
                        {activeEffect && (
                            <div style={{ margin: '14px 22px 0', padding: '8px 14px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} />
                                    <span style={{ fontSize: '12px', color: '#c4b5fd' }}>
                                        Active: <strong style={{ color: 'white' }}>{EFFECTS_LIST.find(e => e.id === activeEffect)?.label}</strong>
                                    </span>
                                </div>
                                <button onClick={() => { setVideoEffect(null); }} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', letterSpacing: '0.3px' }}>✕ Remove</button>
                            </div>
                        )}

                        {/* Effects grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '10px',
                            padding: '18px 16px 0',
                            overflowY: 'auto',
                            maxHeight: '340px',
                        }}>
                            {EFFECTS_LIST.map(eff => {
                                const isSelected = activeEffect === eff.id;
                                const IconComp = EffectIcons[eff.iconKey];
                                return (
                                    <div
                                        key={String(eff.id)}
                                        onClick={() => { setVideoEffect(eff.id); setShowEffectsDrawer(false); }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '7px',
                                            cursor: 'pointer',
                                            padding: '12px 6px',
                                            borderRadius: '18px',
                                            background: isSelected
                                                ? `linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))`
                                                : 'rgba(255,255,255,0.02)',
                                            border: isSelected
                                                ? `1.5px solid ${eff.glow}55`
                                                : '1.5px solid rgba(255,255,255,0.05)',
                                            boxShadow: isSelected ? `0 0 20px ${eff.glow}25, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                                            transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                                            position: 'relative',
                                        }}
                                    >
                                        {/* Glow ring */}
                                        <div style={{
                                            position: 'relative',
                                            width: '60px', height: '60px',
                                        }}>
                                            {/* Outer glow ring for selected */}
                                            {isSelected && (
                                                <div style={{
                                                    position: 'absolute', inset: '-4px',
                                                    borderRadius: '50%',
                                                    background: `conic-gradient(${eff.glow}, transparent, ${eff.glow})`,
                                                    animation: 'spin-slow 3s linear infinite',
                                                    opacity: 0.8,
                                                }} />
                                            )}
                                            {/* Icon circle */}
                                            <div style={{
                                                position: 'absolute', inset: isSelected ? '2px' : '0',
                                                borderRadius: '50%',
                                                background: eff.gradient,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: isSelected
                                                    ? `0 6px 24px ${eff.glow}60`
                                                    : '0 4px 12px rgba(0,0,0,0.5)',
                                                transition: 'all 0.25s ease',
                                            }}>
                                                {IconComp && <IconComp />}
                                            </div>
                                        </div>

                                        {/* Label */}
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: isSelected ? '700' : '500',
                                            color: isSelected ? 'white' : '#94a3b8',
                                            textAlign: 'center',
                                            letterSpacing: '-0.1px',
                                        }}>
                                            {eff.label}
                                        </span>

                                        {/* Sub-desc */}
                                        <span style={{
                                            fontSize: '9px',
                                            color: isSelected ? eff.glow : '#334155',
                                            textAlign: 'center',
                                            letterSpacing: '0.1px',
                                            lineHeight: '1.2',
                                        }}>
                                            {eff.desc}
                                        </span>

                                        {/* Selected checkmark */}
                                        {isSelected && (
                                            <div style={{
                                                position: 'absolute', top: '6px', right: '8px',
                                                width: '16px', height: '16px', borderRadius: '50%',
                                                background: eff.glow,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: `0 0 8px ${eff.glow}`,
                                            }}>
                                                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                                                    <polyline points="1.5,5 4,7.5 8.5,2.5"/>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Spin animation style */}
                        <style>{`
                            @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                        `}</style>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: `
                .control-btn-active {
                    background: rgba(255,255,255,0.2) !important;
                }
            ` }} />
        </div>
    );
};

const ControlBtn = ({ icon: Icon, variant, onClick, rotate = 0, disabled = false, animation = "none" }) => {
    const getStyles = () => {
        switch(variant) {
            case 'white':
                return { 
                    bg: 'linear-gradient(135deg, #FFF, #F2F2F7)', 
                    color: '#000',
                    shadow: '0 4px 12px rgba(255,255,255,0.3)'
                };
            case 'red-pro':
                return { 
                    bg: 'linear-gradient(135deg, #FF3B30, #D70015)', 
                    color: '#FFF',
                    shadow: '0 6px 20px rgba(255,59,48,0.5)'
                };
            case 'dark':
            default:
                return { 
                    bg: 'linear-gradient(135deg, #2C2C2E, #1C1C1E)', 
                    color: '#FFF',
                    shadow: '0 4px 10px rgba(0,0,0,0.2)'
                };
        }
    };
    const { bg, color, shadow } = getStyles();

    return (
        <div 
            onClick={disabled ? null : onClick}
            style={{ 
                width: '54px', 
                height: '54px', 
                borderRadius: '50%', 
                background: bg, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: disabled ? 'default' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: color,
                boxShadow: shadow,
                border: variant === 'white' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                transform: `rotate(${rotate}deg)`,
                opacity: disabled ? 0.3 : 1
            }}
            className={`${disabled ? "" : "hover-scale"} ${animation !== 'none' ? `animate-${animation}` : ''}`}
        >
            <Icon size={26} strokeWidth={2.5} />
        </div>
    );
};

const FeatureItem = ({ icon: Icon, label, active, onClick }) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '16px 8px', 
            borderRadius: '16px', 
            background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        }}
    >
        <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '50%', 
            background: active ? 'white' : 'rgba(255,255,255,0.08)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: active ? '#000' : 'white' 
        }}>
            <Icon size={22} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: '500', textAlign: 'center', color: active ? 'white' : '#8696a0' }}>{label}</span>
    </div>
);

export default CallOverlay;

