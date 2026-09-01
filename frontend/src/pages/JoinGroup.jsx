import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

const JoinGroup = () => {
    const { inviteCode } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        const fetchGroupDetails = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups/invite/${inviteCode}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (!res.ok) throw new Error('Invalid or expired invite link');
                const data = await res.json();
                setGroup(data);
                
                // If user is already a member, show joined state
                if (data.members.some(m => (m._id || m) === user?._id)) {
                    setJoined(true);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchGroupDetails();
    }, [inviteCode, user]);

    const handleJoin = async () => {
        setJoining(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups/join/${inviteCode}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) throw new Error('Failed to join group');
            const data = await res.json();
            setJoined(true);
            setTimeout(() => navigate('/'), 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
                <Loader2 className="animate-spin" size={48} color="#007AFF" />
                <p style={{ marginTop: '16px', color: '#54656F', fontWeight: '500' }}>Loading group info...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5', padding: '20px' }}>
                <div style={{ background: '#fff', padding: '32px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                    <div style={{ width: '64px', height: '64px', background: '#FFE5E5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <span style={{ fontSize: '32px' }}>⚠️</span>
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>Oops!</h2>
                    <p style={{ color: '#54656F', lineHeight: '1.5', marginBottom: '24px' }}>{error}</p>
                    <button 
                        onClick={() => navigate('/')}
                        style={{ width: '100%', padding: '14px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}
                    >
                        Back to Chats
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5', padding: '20px' }}>
            <div className="animate-scale" style={{ background: '#fff', padding: '40px 32px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 24px' }}>
                    <img 
                        src={group.profilePicture ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + group.profilePicture + "?token=" + localStorage.getItem('token') : `(import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(group.name || '') + "&background=random&color=fff"&size=120`} 
                        style={{ width: '100%', height: '100%', borderRadius: '30%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        alt=""
                    />
                    {joined && (
                        <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: '#fff', borderRadius: '50%', padding: '2px' }}>
                            <CheckCircle2 size={32} color="#34C759" fill="#fff" />
                        </div>
                    )}
                </div>

                <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px', color: '#000' }}>{group.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#54656F', marginBottom: '32px' }}>
                    <Users size={16} />
                    <span style={{ fontWeight: '600' }}>{group.members.length} members</span>
                </div>

                {group.description && (
                    <p style={{ color: '#54656F', fontSize: '15px', lineHeight: '1.5', marginBottom: '32px', padding: '16px', background: '#F8F9FA', borderRadius: '12px', fontStyle: 'italic' }}>
                        "{group.description}"
                    </p>
                )}

                {joined ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ color: '#34C759', fontWeight: '700', fontSize: '18px', marginBottom: '10px' }}>You are a member</div>
                        <button 
                            onClick={() => navigate('/')}
                            style={{ width: '100%', padding: '16px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,122,255,0.3)' }}
                        >
                            Open Chat
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleJoin}
                        disabled={joining}
                        style={{ width: '100%', padding: '16px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,122,255,0.3)', transition: 'all 0.2s' }}
                    >
                        {joining ? <Loader2 className="animate-spin" size={20} /> : 'Join Group'}
                    </button>
                )}

                <button 
                    onClick={() => navigate('/')}
                    style={{ background: 'none', border: 'none', color: '#007AFF', fontWeight: '600', marginTop: '24px', cursor: 'pointer', fontSize: '15px' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default JoinGroup;
