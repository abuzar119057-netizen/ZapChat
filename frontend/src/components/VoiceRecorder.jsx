import React, { useState, useRef } from 'react';
import { Mic, Square, X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VoiceRecorder = ({ onSend, onCancel }) => {
    const { api } = useAuth();
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const timerRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const handleSend = async () => {
        if (!audioBlob) return;

        const formData = new FormData();
        const filename = `voice_note_${Date.now()}.webm`;
        formData.append('file', audioBlob, filename);

        try {
            const res = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onSend({
                fileId: res.data.fileId,
                filename: res.data.filename,
                contentType: res.data.contentType,
                size: res.data.size
            });
            setAudioBlob(null);
        } catch (error) {
            console.error('Failed to upload voice note:', error);
            alert('Failed to send voice note');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isRecording && !audioBlob) {
        return (
            <button className="btn" style={{ padding: '0.5rem', background: 'transparent' }} onClick={startRecording}>
                <Mic size={20} color="var(--text-secondary)" />
            </button>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem', background: 'var(--bg-color)', borderRadius: '20px', flex: 1 }}>
            {isRecording ? (
                <>
                    <div style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ width: '8px', height: '8px', background: 'red', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                        <span style={{ fontSize: '0.875rem' }}>{formatTime(recordingTime)}</span>
                    </div>
                    <button className="btn" style={{ marginLeft: 'auto', background: 'transparent' }} onClick={stopRecording}>
                        <Square size={16} color="var(--text-secondary)" />
                    </button>
                </>
            ) : (
                <>
                    <button className="btn" style={{ background: 'transparent' }} onClick={onCancel}>
                        <X size={18} color="var(--text-secondary)" />
                    </button>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Voice Note ({formatTime(recordingTime)})</div>
                    <button className="btn btn-primary" style={{ marginLeft: 'auto', padding: '0.25rem 0.75rem', borderRadius: '15px' }} onClick={handleSend}>
                        <Send size={16} />
                    </button>
                </>
            )}
        </div>
    );
};

export default VoiceRecorder;
