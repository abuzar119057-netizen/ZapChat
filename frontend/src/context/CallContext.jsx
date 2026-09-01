import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import axios from 'axios';

const CallContext = createContext();

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error('useCall must be used within CallProvider');
    return context;
};

export const CallProvider = ({ children }) => {
    const { socket } = useSocket();
    const { user } = useAuth();
    
    const [callState, setCallState] = useState('idle');
    const [remoteUser, setRemoteUser] = useState(null);
    const [callType, setCallType] = useState(null);
    const [localStreamState, setLocalStreamState] = useState(null); // reactive state for UI
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isOnHold, setIsOnHold] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingParticipants, setRecordingParticipants] = useState([]);
    const [isNoiseIsolationActive, setIsNoiseIsolationActive] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [mutedParticipants, setMutedParticipants] = useState([]);
    const [activeEffect, setActiveEffect] = useState(null);

    const localStreamRef = useRef(null);
    const pcsRef = useRef({}); 
    const remoteStreamsRef = useRef({}); 
    const callDataRef = useRef(null);
    const startTimeRef = useRef(null);
    const pendingCandidatesRef = useRef({}); 
    const recordersRef = useRef({}); // Map of userId -> MediaRecorder
    const chunksMapRef = useRef({}); // Map of userId -> chunks array
    const originalVideoTrackRef = useRef(null);
    const effectIntervalRef = useRef(null);


    const STUN_SERVERS = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
        ]
    };

    // Helper: update stream in BOTH ref (for internal logic) and state (for UI reactivity)
    const setLocalStream = (stream) => {
        localStreamRef.current = stream;
        setLocalStreamState(stream);
    };

    // Release existing media before acquiring new stream
    const releaseLocalStream = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStreamState(null);
        }
    };

    // Creates a dummy video track from a canvas to keep video call UI and PeerConnections active
    const createDummyVideoTrack = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        const drawPlaceholder = () => {
            if (!ctx) return;
            ctx.fillStyle = '#0b141a';
            ctx.fillRect(0, 0, 640, 480);
            ctx.fillStyle = '#8696a0';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Camera unavailable (in use)', 320, 240);
        };

        drawPlaceholder();
        
        // Keep rendering frames so stream remains active
        const interval = setInterval(drawPlaceholder, 1000);

        const stream = canvas.captureStream(5); // 5 fps
        const track = stream.getVideoTracks()[0];
        
        // Override stop to clear interval
        const originalStop = track.stop;
        track.stop = () => {
            clearInterval(interval);
            originalStop.call(track);
        };

        return track;
    };

    // Robust getUserMedia with fallback: if video call camera is busy/in-use, returns audio + dummy video track
    const getMediaStream = async (wantVideo) => {
        // Release any existing stream first so OS frees the device
        releaseLocalStream();
        // Small delay so OS can fully release camera/mic
        await new Promise(res => setTimeout(res, 200));

        // mediaDevices requires HTTPS or localhost in browsers.
        // On local network (192.168.x.x), enable via Chrome flag:
        //   chrome://flags/#unsafely-treat-insecure-origin-as-secure
        // OR use the APK which runs in a secure Capacitor WebView.
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const isLocalNetwork = /^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.hostname);
            if (isLocalNetwork) {
                throw new Error(
                    'Camera/Mic blocked by browser security.\n\n' +
                    'Fix Option 1 (Chrome): Open chrome://flags/#unsafely-treat-insecure-origin-as-secure\n' +
                    'Add: http://' + window.location.host + '\n' +
                    'Then restart Chrome.\n\n' +
                    'Fix Option 2: Install the ChatApp.apk on your phone - calls work there without HTTPS.'
                );
            }
            throw new Error('Camera/Mic not available. Please use HTTPS or install the APK.');
        }

        if (wantVideo) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });
                return { stream, actualType: 'video' };
            } catch (err) {
                console.warn('Failed to get camera, attempting audio with dummy video track:', err.name, err.message);
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: false
                    });
                    const dummyTrack = createDummyVideoTrack();
                    audioStream.addTrack(dummyTrack);
                    return { stream: audioStream, actualType: 'video' };
                } catch (audioErr) {
                    console.error('Failed to get even audio stream:', audioErr);
                    throw audioErr;
                }
            }
        } else {
            // Audio-only call
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            return { stream, actualType: 'audio' };
        }
    };

    const cleanup = (logStatus = null) => {
        const currentUserForLog = remoteUser;
        const currentTypeForLog = callType;

        if (startTimeRef.current && logStatus === 'completed') {
            const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
            sendCallLog(duration, false, currentUserForLog, currentTypeForLog);
        } else if (logStatus === 'missed') {
            sendCallLog(null, true, currentUserForLog, currentTypeForLog);
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStreamState(null);
        }

        // Stop all recorders
        Object.values(recordersRef.current).forEach(r => {
            if (r.state !== 'inactive') r.stop();
        });
        recordersRef.current = {};
        chunksMapRef.current = {};

        Object.values(pcsRef.current).forEach(pc => pc.close());
        pcsRef.current = {};
        remoteStreamsRef.current = {};
        setRemoteStreams({});
        pendingCandidatesRef.current = {};

        setCallState('idle');
        setRemoteUser(null);
        setCallType(null);
        callDataRef.current = null;
        startTimeRef.current = null;
        setIsMuted(false);
        setIsVideoOff(false);
        setIsSpeakerOn(false);
        setIsOnHold(false);
        setIsRecording(false);
        setRecordingParticipants([]);
        setIsNoiseIsolationActive(false);
        setParticipants([]);
        setMutedParticipants([]);
        setActiveEffect(null);
        if (effectIntervalRef.current) {
            clearInterval(effectIntervalRef.current);
            effectIntervalRef.current = null;
        }
        if (originalVideoTrackRef.current) {
            originalVideoTrackRef.current.stop();
            originalVideoTrackRef.current = null;
        }
    };
    const toggleNoiseIsolation = () => {
        setIsNoiseIsolationActive(prev => !prev);
    };

    // Map effect ID to canvas 2D filter string (and optional overlay fn)
    const EFFECT_FILTERS = {
        null:      null,
        beauty:    'brightness(1.08) contrast(0.92) saturate(1.1) blur(0.4px)',
        blur:      'blur(8px)',
        warm:      'sepia(0.35) saturate(1.4) brightness(1.05)',
        cool:      'saturate(0.85) hue-rotate(180deg) brightness(1.05)',
        noir:      'grayscale(1) contrast(1.3) brightness(0.9)',
        neon:      'saturate(2.5) hue-rotate(90deg) brightness(1.2) contrast(1.1)',
        vibrant:   'saturate(2.2) contrast(1.15) brightness(1.05)',
        pastel:    'saturate(0.6) brightness(1.18) contrast(0.85)',
        dramatic:  'contrast(1.5) brightness(0.82) saturate(1.2)',
        scifi:     'hue-rotate(200deg) saturate(1.8) brightness(1.1) contrast(1.2)',
    };

    const applyVideoEffect = async (effect) => {
        if (!localStreamRef.current) return;
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (!videoTrack) return;

        // Save original camera track once
        if (!originalVideoTrackRef.current) {
            if (videoTrack._isCanvas !== true) {
                originalVideoTrackRef.current = videoTrack;
            }
        }

        // Clean up previous canvas interval
        if (effectIntervalRef.current) {
            clearInterval(effectIntervalRef.current);
            effectIntervalRef.current = null;
        }

        // Remove any leftover hidden video elements
        document.querySelectorAll('video[data-effect-source]').forEach(el => {
            el.pause();
            el.remove();
        });

        let newTrack = null;

        if (effect && effect !== 'none') {
            const filterStr = EFFECT_FILTERS[effect] || null;
            const width = 640;
            const height = 480;

            const sourceTrack = originalVideoTrackRef.current;
            if (!sourceTrack) return;

            // Hidden source video element
            const hiddenVideo = document.createElement('video');
            hiddenVideo.setAttribute('data-effect-source', effect);
            hiddenVideo.srcObject = new MediaStream([sourceTrack]);
            hiddenVideo.muted = true;
            hiddenVideo.autoplay = true;
            hiddenVideo.playsInline = true;
            hiddenVideo.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
            document.body.appendChild(hiddenVideo);
            await hiddenVideo.play().catch(e => console.warn('[Effect] hiddenVideo play:', e));

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            effectIntervalRef.current = setInterval(() => {
                if (!ctx || hiddenVideo.readyState < 2) return;
                ctx.clearRect(0, 0, width, height);

                if (filterStr) {
                    ctx.filter = filterStr;
                } else {
                    ctx.filter = 'none';
                }
                ctx.drawImage(hiddenVideo, 0, 0, width, height);
                ctx.filter = 'none';

                // Vignette overlay for dramatic / noir / scifi
                if (effect === 'dramatic' || effect === 'noir') {
                    const grad = ctx.createRadialGradient(
                        width/2, height/2, height*0.25,
                        width/2, height/2, height*0.75
                    );
                    grad.addColorStop(0, 'rgba(0,0,0,0)');
                    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, width, height);
                }
                if (effect === 'scifi') {
                    const grad = ctx.createRadialGradient(
                        width/2, height/2, height*0.2,
                        width/2, height/2, height*0.7
                    );
                    grad.addColorStop(0, 'rgba(0,180,255,0)');
                    grad.addColorStop(1, 'rgba(0,0,80,0.35)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, width, height);
                }
                if (effect === 'neon') {
                    const grad = ctx.createRadialGradient(
                        width/2, height/2, height*0.15,
                        width/2, height/2, height*0.65
                    );
                    grad.addColorStop(0, 'rgba(0,0,0,0)');
                    grad.addColorStop(1, 'rgba(100,0,180,0.25)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, width, height);
                }
            }, 33); // ~30fps

            const stream = canvas.captureStream(30);
            newTrack = stream.getVideoTracks()[0];
            newTrack._isCanvas = true;

            // Clean up hidden video on track end
            newTrack.addEventListener('ended', () => {
                hiddenVideo.pause();
                hiddenVideo.remove();
            });
        } else {
            // No effect – restore original camera track
            newTrack = originalVideoTrackRef.current;
        }

        if (newTrack) {
            const localVideoTrack = localStreamRef.current.getVideoTracks()[0];
            if (localVideoTrack && localVideoTrack !== newTrack) {
                localStreamRef.current.removeTrack(localVideoTrack);
                if (localVideoTrack !== originalVideoTrackRef.current) {
                    localVideoTrack.stop();
                }
                localStreamRef.current.addTrack(newTrack);
            }

            for (const pc of Object.values(pcsRef.current)) {
                const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(newTrack).catch(e => console.error('[Effect] replaceTrack:', e));
                }
            }

            setCallState(prev => prev);
        }
    };

    // Direct setter – used by the effects drawer
    const setVideoEffect = (effectId) => {
        setActiveEffect(effectId);
        applyVideoEffect(effectId);
    };

    const toggleVideoEffect = () => {
        const next = activeEffect ? null : 'beauty';
        setVideoEffect(next);
    };

    const muteParticipant = (userId) => {
        const isCurrentlyMuted = mutedParticipants.includes(userId);
        setMutedParticipants(prev => 
            isCurrentlyMuted ? prev.filter(id => id !== userId) : [...prev, userId]
        );
        
        const stream = remoteStreamsRef.current[userId];
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = isCurrentlyMuted; 
            });
        }
    };

    const kickParticipant = (userId) => {
        setParticipants(prev => prev.filter(p => p.user._id !== userId));
        if (pcsRef.current[userId]) {
            pcsRef.current[userId].close();
            delete pcsRef.current[userId];
            delete remoteStreamsRef.current[userId];
        }
        socket.emit('call:kick', { targetUserId: userId });
        if (participants.length <= 1) {
            endCall();
        }
    };

    const sendCallLog = async (duration, isMissed = false, targetUser, targetType) => {
        const finalUser = targetUser || remoteUser;
        const finalType = targetType || callType;
        if (!finalUser) return;
        
        const formatTime = (s) => {
            if (s === null || s === undefined) return '0:00';
            const mins = Math.floor(s / 60);
            const secs = s % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const typeLabel = finalType === 'video' ? 'Video' : 'Voice';
        const content = isMissed ? `Missed ${typeLabel} Call` : `${typeLabel} Call (${formatTime(duration)})`;

        socket.emit('send_message', {
            recipientId: finalUser._id,
            content,
            type: 'call',
            clientId: `call_${Date.now()}`
        });

        try {
            // Extract all remote participant IDs for the log
            const participantIds = participants
                .filter(p => !p.isLocal)
                .map(p => p.user._id);
                
            // Fallback to finalUser if participants array is empty (e.g. immediate miss)
            if (participantIds.length === 0 && finalUser) {
                participantIds.push(finalUser._id);
            }

            await axios.post(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/calls`, {
                participants: participantIds,
                type: finalType || 'audio',
                status: isMissed ? 'missed' : 'completed',

                duration: duration || 0
            }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (err) {
            console.error('Failed to save call log:', err);
        }
    };

    // Helper to safely attach local stream tracks to a peer connection.
    // Uses addTrack for new senders, replaceTrack (awaited) for existing ones.
    const setLocalStreamOnPeerConnection = async (pc, stream) => {
        if (!stream) return;
        const senders = pc.getSenders();
        for (const track of stream.getTracks()) {
            const existingSender = senders.find(s => s.track?.kind === track.kind);
            if (existingSender) {
                try {
                    await existingSender.replaceTrack(track);
                    console.log(`[WebRTC] replaceTrack OK: ${track.kind}`);
                } catch (e) {
                    console.warn(`[WebRTC] replaceTrack failed for ${track.kind}:`, e.message);
                }
            } else {
                pc.addTrack(track, stream);
                console.log(`[WebRTC] addTrack: ${track.kind}`);
            }
        }
    };

    const createPeerConnection = (recipientId) => {
        const pc = new RTCPeerConnection(STUN_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('call:signal', {
                    recipientId,
                    signal: { candidate: event.candidate }
                });
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (!stream) return;
            console.log(`[WebRTC] ontrack from ${recipientId}: ${event.track.kind}`);
            remoteStreamsRef.current[recipientId] = stream;
            setRemoteStreams(prev => ({ ...prev, [recipientId]: stream }));
            setCallState('active');
            setParticipants(prev => prev.map(p =>
                p.user._id === recipientId ? { ...p, status: 'active' } : p
            ));
        };

        // NOTE: do NOT call addTransceiver here — tracks are added
        // explicitly via addTrack in each call flow (initiateCall / acceptCall)
        // to avoid transceiver mismatch issues.

        pcsRef.current[recipientId] = pc;
        return pc;
    };

    const initiateCall = async (recipient, type) => {
        try {
            cleanup();
            setCallState('calling');
            setRemoteUser(recipient);
            setCallType(type);
            setParticipants([{ user: recipient, status: 'active' }]);

            const { stream, actualType } = await getMediaStream(type === 'video');
            if (actualType !== type) setCallType(actualType);
            setLocalStream(stream); // sets both ref and state

            const pc = createPeerConnection(recipient._id);

            // Add local tracks directly — this creates transceivers automatically
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
                console.log(`[WebRTC] initiateCall addTrack: ${track.kind}`);
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const callId = `call_${Date.now()}`;
            socket.emit('call:initiate', {
                recipientId: recipient._id,
                type,
                offer,
                callId,
                isGroup: recipient.isGroup,
                groupName: recipient.isGroup ? recipient.name : undefined,
                groupPicture: recipient.isGroup ? recipient.profilePicture : undefined
            });

            callDataRef.current = { recipientId: recipient._id, callId };
            console.log('📞 Call initiated with callId:', callId);
        } catch (err) {
            console.error('Failed to initiate call:', err);
            alert(err.message || 'Failed to initiate call.');
            cleanup();
        }
    };

    const handleIncomingCall = async (data) => {
        setCallState('incoming');
        setRemoteUser({ _id: data.callerId, displayName: data.callerName, profilePicture: data.callerPicture });
        setCallType(data.type);
        setParticipants([{ user: { _id: data.callerId, displayName: data.callerName, profilePicture: data.callerPicture }, status: 'active' }]);
        callDataRef.current = { callerId: data.callerId, offer: data.offer, callId: data.callId };
    };

    const acceptCall = async () => {
        try {
            const { callerId, offer, isConference } = callDataRef.current;
            console.log('[acceptCall] start | callerId:', callerId, '| isConference:', isConference);

            const { stream, actualType } = await getMediaStream(callType === 'video');
            if (actualType !== callType) setCallType(actualType);
            setLocalStream(stream); // sets both ref and state for UI reactivity
            console.log('[acceptCall] got local stream | tracks:', stream.getTracks().map(t => t.kind));

            if (isConference) {
                setCallState('active');
                startTimeRef.current = Date.now();
                socket.emit('call:respond', {
                    callerId,
                    accepted: true,
                    isConference: true,
                    callId: callDataRef.current?.callId
                });
                return;
            }

            // ── Standard 1-to-1 flow ──────────────────────────────────────
            const pc = createPeerConnection(callerId);

            // STEP 1: Add local tracks BEFORE setRemoteDescription
            // (ensures our media is in the answer SDP and sender is ready)
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
                console.log(`[WebRTC] acceptCall addTrack: ${track.kind}`);
            });

            // STEP 2: Set remote description (the caller's offer)
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('[WebRTC] acceptCall setRemoteDescription OK');

            // STEP 3: Drain any ICE candidates that arrived before remote desc was set
            const queued = pendingCandidatesRef.current[callerId] || [];
            if (queued.length > 0) {
                console.log(`[WebRTC] draining ${queued.length} queued ICE candidates for ${callerId}`);
                for (const cand of queued) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch(e) {}
                }
                delete pendingCandidatesRef.current[callerId];
            }

            // STEP 4: Create and set local description (our answer)
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('[WebRTC] acceptCall setLocalDescription (answer) OK');

            socket.emit('call:respond', {
                callerId,
                accepted: true,
                answer,
                callId: callDataRef.current?.callId
            });

            setCallState('active');
            startTimeRef.current = Date.now();
            console.log('[acceptCall] done — call is active');
        } catch (err) {
            console.error('[acceptCall] FAILED:', err);
            alert(err.message || 'Failed to accept call.');
            cleanup();
        }
    };

    const declineCall = () => {
        if (callDataRef.current?.callerId) {
            socket.emit('call:respond', {
                callerId: callDataRef.current.callerId,
                accepted: false
            });
            sendCallLog(null, true);
        }
        cleanup();
    };

    const endCall = () => {
        const callId = callDataRef.current?.callId;
        console.log('🔚 endCall triggered | callId:', callId, '| peers:', Object.keys(pcsRef.current));

        // Emit to each peer directly (fallback path via recipientId)
        Object.keys(pcsRef.current).forEach(id => {
            socket.emit('call:end', { recipientId: id, callId });
        });

        // Also broadcast via callId room (primary path)
        if (callId) {
            socket.emit('call:end', { callId });
        }

        console.log('🔔 Emitted call:end to all participants');
        cleanup(callState === 'active' ? 'completed' : 'missed');
    };

    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current && callType === 'video') {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const toggleSpeaker = () => setIsSpeakerOn(!isSpeakerOn);

    const toggleHold = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.enabled = isOnHold;
            });
            setIsOnHold(!isOnHold);
        }
    };

    const upgradeToVideo = async () => {
        if (callType === 'audio') {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = stream.getVideoTracks()[0];
                if (localStreamRef.current) {
                    localStreamRef.current.addTrack(videoTrack);
                    for (const pc of Object.values(pcsRef.current)) {
                        setLocalStreamOnPeerConnection(pc, localStreamRef.current);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socket.emit('call:signal', {
                            recipientId: Object.keys(pcsRef.current).find(key => pcsRef.current[key] === pc),
                            signal: { offer }
                        });
                    }
                }
                setCallType('video');
                setIsVideoOff(false);
            } catch (err) { console.error(err); }
        }
    };

    const downgradeToAudio = () => {
        if (callType === 'video') {
            if (localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach(track => track.stop());
            }
            setCallType('audio');
            Object.keys(pcsRef.current).forEach(id => {
                socket.emit('call:signal', { recipientId: id, signal: { type: 'downgrade-to-audio' } });
            });
        }
    };

    const startRecording = (userId) => {
        const stream = userId ? remoteStreamsRef.current[userId] : localStreamRef.current;
        if (!stream) return;

        const chunks = [];
        chunksMapRef.current[userId || 'local'] = chunks;

        let options = {};
        if (typeof MediaRecorder.isTypeSupported === 'function') {
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
                options = { mimeType: 'video/webm;codecs=vp9,opus' };
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                options = { mimeType: 'video/webm;codecs=vp8,opus' };
            } else if (MediaRecorder.isTypeSupported('video/webm')) {
                options = { mimeType: 'video/webm' };
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                options = { mimeType: 'video/mp4' };
            }
        }

        const recorder = new MediaRecorder(stream, options);
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const formData = new FormData();
            formData.append('recording', blob, `call_${userId || 'local'}_${Date.now()}.webm`);
            formData.append('callId', callDataRef.current?.callId || callDataRef.current?._id || '');
            formData.append('participantId', userId || '');

            try {
                await axios.post(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/recordings/upload`, formData, { 
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    } 
                });
            } catch (err) { console.error('Recording upload failed:', err); }
        };

        recorder.start();
        recordersRef.current[userId || 'local'] = recorder;
        if (userId) {
            setRecordingParticipants(prev => [...prev, userId]);
        } else {
            setIsRecording(true);
        }
    };

    const stopRecording = (userId) => {
        const recorder = recordersRef.current[userId || 'local'];
        if (recorder) {
            recorder.stop();
            delete recordersRef.current[userId || 'local'];
            if (userId) {
                setRecordingParticipants(prev => prev.filter(id => id !== userId));
            } else {
                setIsRecording(false);
            }
        }
    };


    const inviteToCall = (targetUser) => {
        socket.emit('call:invite', { 
            targetUserId: targetUser._id, 
            callId: callDataRef.current?.callId,
            type: callType 
        });
        setParticipants(prev => {
            if (prev.find(p => p.user._id === targetUser._id)) return prev;
            return [...prev, { user: targetUser, status: 'inviting' }];
        });
    };

    useEffect(() => {
        if (!socket) return;
        const handleInviteReceived = (data) => {
            console.log('🔵 CONFERENCE INVITE RECEIVED:', data);
            const inviter = {
                _id: data.callerId,
                displayName: data.callerName,
                profilePicture: data.callerPicture
            };
            setRemoteUser(inviter);
            setCallType(data.type || 'video');
            setParticipants([{ user: inviter, status: 'active' }]);
            
            // Critical for mesh: track that this is a group invite
            callDataRef.current = { 
                callerId: data.callerId, 
                isConference: true,
                callId: data.callId 
            };
            
            console.log('🟡 Setting callState to incoming for conference...');
            setCallState('incoming');
        };



        socket.on('call:incoming', handleIncomingCall);
        socket.on('call:invite_received', handleInviteReceived);
        socket.on('call:response', async (data) => {
            try {
                const pc = pcsRef.current[data.callerId || data.recipientId];
                
                if (data.accepted) {
                    // Instantly update UI to "Connected" for this specific participant
                    setParticipants(prev => prev.map(p => 
                        p.user._id === (data.recipientId || data.from) ? { ...p, status: 'active' } : p
                    ));

                    if (data.answer || data.isConference) {
                        if (callState !== 'active') {
                            setCallState('active');
                            startTimeRef.current = Date.now();
                        }
                        
                        if (data.answer && pc && pc.signalingState === 'have-local-offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                        }
                    }
                } else {

                    if (participants.length <= 1) {
                        cleanup();
                    }
                }
            } catch (err) {
                console.error('Error in call:response:', err);
            }
        });


        socket.on('call:signal', async (data) => {
            try {
                const fromId = data.callerId || data.recipientId || data.from;
                let pc = pcsRef.current[fromId];

                // If it's a new peer sending an offer (Mesh Discovery), create the connection dynamically
                if (!pc && data.signal?.offer) {
                    console.log(`🌐 Creating dynamic mesh connection for ${fromId}`);
                    pc = createPeerConnection(fromId);

                    // Add local stream tracks immediately if available
                    if (localStreamRef.current) {
                        localStreamRef.current.getTracks().forEach(track => {
                            pc.addTrack(track, localStreamRef.current);
                        });
                    }
                }

                if (!pc) {
                    // PC not created yet (e.g., incoming call not yet accepted). Queue the ICE candidate!
                    if (data.signal?.candidate) {
                        if (!pendingCandidatesRef.current[fromId]) {
                            pendingCandidatesRef.current[fromId] = [];
                        }
                        pendingCandidatesRef.current[fromId].push(data.signal.candidate);
                        console.log(`[WebRTC] Queued early ICE candidate for ${fromId}`);
                    }
                    return;
                }

                if (data.signal.candidate) {
                    if (pc.remoteDescription && pc.remoteDescription.type) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
                        } catch (iceErr) {
                            console.warn('ICE candidate add failed (non-fatal):', iceErr.message);
                        }
                    } else {
                        // Queue candidate until remote description is set
                        if (!pendingCandidatesRef.current[fromId]) {
                            pendingCandidatesRef.current[fromId] = [];
                        }
                        pendingCandidatesRef.current[fromId].push(data.signal.candidate);
                    }
                }
                
                if (data.signal.offer && pc.signalingState === 'stable') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.signal.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('call:signal', { recipientId: fromId, signal: { answer }, callId: data.callId });
                    // Drain any queued ICE candidates now that remote desc is set
                    const queued = pendingCandidatesRef.current[fromId] || [];
                    for (const cand of queued) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch(e) {}
                    }
                    delete pendingCandidatesRef.current[fromId];
                }
                
                if (data.signal.answer && pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.signal.answer));
                    // Drain queued ICE candidates
                    const queued = pendingCandidatesRef.current[fromId] || [];
                    for (const cand of queued) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch(e) {}
                    }
                    delete pendingCandidatesRef.current[fromId];
                }
                
                if (data.signal.type === 'downgrade-to-audio') {
                    setCallType('audio');
                }
            } catch (err) {
                console.error('Error handling call:signal:', err);
            }
        });

        socket.on('call:end', (data) => {
            console.log('🔔 Received call:end', data);
            // Force-stop all local media tracks immediately
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }
            // Close all peer connections immediately
            Object.values(pcsRef.current).forEach(pc => pc.close());
            pcsRef.current = {};
            remoteStreamsRef.current = {};
            setRemoteStreams({});
            cleanup('completed');
        });

        // Also handle the 'call:initiated' event to store callId sent back from backend
        socket.on('call:initiated', (data) => {
            if (data?.callId && callDataRef.current) {
                callDataRef.current.callId = data.callId;
                console.log('✅ callId confirmed from backend:', data.callId);
            }
        });

        socket.on('call:kick', (data) => {
            const myId = user?.id || user?._id;
            if (myId === data.targetUserId) {
                // If I am the one being kicked
                cleanup();
                alert('You have been removed from the call');
                // Ensure we formally disconnect from the room
                socket.emit('call:end', { callId: callDataRef.current?.callId });
            } else {
                // If someone else was kicked, remove them from our participants list
                setParticipants(prev => prev.filter(p => p.user._id !== data.targetUserId));
                
                // Also close their specific peer connection to free up resources
                if (pcsRef.current[data.targetUserId]) {
                    pcsRef.current[data.targetUserId].close();
                    delete pcsRef.current[data.targetUserId];
                }
            }
        });

        socket.on('call:user_joined', async (data) => {
            console.log('👥 New user joined conference:', data);
            
            // 1. Update participants list with the latest roster from backend
            if (data.participants) {
                setParticipants(prev => {
                    // Filter out ourselves and anyone already in our state
                    const newParticipants = data.participants.filter(newP => 
                        newP._id !== user._id && !prev.find(existingP => existingP.user._id === newP._id)
                    );
                    
                    if (newParticipants.length === 0) return prev;
                    
                    // Add new participants with their actual data
                    const addedParticipants = newParticipants.map(p => ({
                        user: p,
                        status: 'inviting' // will become 'active' when their media track arrives
                    }));
                    return [...prev, ...addedParticipants];
                });
            }


            // 2. If WE are already in the call, and someone NEW joins,
            // WE initiate the connection to THEM
            if (callState === 'active' && data.userId !== user._id) {
                console.log(`🚀 Initiating mesh connection to ${data.userId}...`);
                const pc = createPeerConnection(data.userId);

                // Add local tracks before creating the offer
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        pc.addTrack(track, localStreamRef.current);
                    });
                }

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('call:signal', {
                    recipientId: data.userId,
                    signal: { offer },
                    callId: callDataRef.current?.callId
                });
            }

        });

        socket.on('call:ended', (data) => {
            console.log('🔚 Received call:ended', data);
            // Force-stop all local media tracks immediately
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }
            // Close all peer connections immediately
            Object.values(pcsRef.current).forEach(pc => pc.close());
            pcsRef.current = {};
            remoteStreamsRef.current = {};
            setRemoteStreams({});
            cleanup(callState === 'active' ? 'completed' : 'missed');
        });

        return () => {
            socket.off('call:incoming');
            socket.off('call:invite_received');
            socket.off('call:response');
            socket.off('call:signal');
            socket.off('call:ended');
            socket.off('call:end');
            socket.off('call:kick');
            socket.off('call:initiated');
            socket.off('call:user_joined');
        };
    }, [socket, user, callState]);


    return (
        <CallContext.Provider value={{
            callState, remoteUser, callType,
            localStream: localStreamState,      // reactive state → UI always up-to-date
            remoteStreams,
            isMuted, isVideoOff, isSpeakerOn, isOnHold,
            initiateCall, acceptCall, declineCall, endCall,
            toggleAudio, toggleVideo, toggleSpeaker, toggleHold,
            upgradeToVideo, downgradeToAudio,
            isRecording, recordingParticipants, startRecording, stopRecording,
            inviteToCall, participants, mutedParticipants,
            muteParticipant, kickParticipant,
            isNoiseIsolationActive, toggleNoiseIsolation,
            activeEffect, setVideoEffect, toggleVideoEffect
        }}>
            {children}
        </CallContext.Provider>
    );
};
