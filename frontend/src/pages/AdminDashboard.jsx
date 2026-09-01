import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquare, Trash2, Activity, Search } from 'lucide-react';

const AdminDashboard = () => {
    const { api } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            const [statsRes, usersRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
            alert('Access Denied or Server Error');
            navigate('/chat');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u._id !== userId));
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(u => 
        (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (u._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F2F2F7' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#007AFF" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
                <span style={{ fontSize: '15px', color: '#8E8E93', fontWeight: '500' }}>Loading Admin...</span>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#F2F2F7', color: '#000', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            {/* iOS Style Navigation Bar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(242, 242, 247, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(60,60,67,0.36)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', height: '44px' }}>
                    <button onClick={() => navigate('/chat')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#007AFF', fontSize: '17px', cursor: 'pointer', padding: 0 }}>
                        <ArrowLeft size={22} />
                        <span>Chat</span>
                    </button>
                    <span style={{ fontSize: '17px', fontWeight: '600' }}>Admin Dashboard</span>
                    <button onClick={() => {
                        Notification.requestPermission().then(permission => {
                            alert('Notification permission: ' + permission);
                        }).catch(err => {
                            console.error('Permission request failed', err);
                        });
                    }} style={{ background: '#007AFF', color: '#FFF', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '15px', cursor: 'pointer' }}>Notify</button>
                </div>
            </div>

            <div style={{ padding: '20px 16px', maxWidth: '800px', margin: '0 auto' }}>
                
                {/* Stats Section */}
                <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px', letterSpacing: '-0.5px' }}>Overview</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '32px' }}>
                    <div style={{ background: '#FFF', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <Users size={24} color="#007AFF" />
                        <span style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>{stats?.totalUsers || 0}</span>
                        <span style={{ fontSize: '13px', color: '#8E8E93', fontWeight: '500' }}>Total Users</span>
                    </div>
                    <div style={{ background: '#FFF', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <MessageSquare size={24} color="#34C759" />
                        <span style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>{stats?.totalMessages || 0}</span>
                        <span style={{ fontSize: '13px', color: '#8E8E93', fontWeight: '500' }}>Messages</span>
                    </div>
                    <div style={{ background: '#FFF', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <Activity size={24} color="#FF9F0A" />
                        <span style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>{stats?.onlineUsers || 0}</span>
                        <span style={{ fontSize: '13px', color: '#8E8E93', fontWeight: '500' }}>Online Now</span>
                    </div>
                </div>

                {/* Announcement Section */}
                <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px', letterSpacing: '-0.5px' }}>Global Announcement</h2>
                <div style={{ background: '#FFF', borderRadius: '16px', padding: '16px', marginBottom: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MessageSquare size={20} color="#FFF" />
                        </div>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>Broadcast Message</div>
                            <div style={{ fontSize: '13px', color: '#8E8E93' }}>Send a notification to all users</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            id="announcementInput"
                            placeholder="Message content..." 
                            style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E5EA', background: '#F2F2F7', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = '#007AFF'}
                            onBlur={e => e.target.style.borderColor = '#E5E5EA'}
                        />
                        <button 
                            onClick={async () => {
                                const content = document.getElementById('announcementInput').value;
                                if (!content) return;
                                try {
                                    const res = await api.post('/admin/announcement', { content });
                                    alert(res.data.message || 'Sent successfully');
                                    document.getElementById('announcementInput').value = '';
                                } catch (err) {
                                    alert('Failed to send announcement');
                                }
                            }}
                            style={{ background: '#007AFF', color: '#FFF', fontWeight: '600', border: 'none', borderRadius: '12px', padding: '0 20px', cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                            onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                            Send
                        </button>
                    </div>
                </div>

                {/* Users List Section */}
                <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px', letterSpacing: '-0.5px' }}>User Directory</h2>
                
                {/* Search Bar iOS Style */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#E3E3E8', borderRadius: '10px', padding: '8px 12px', marginBottom: '16px' }}>
                    <Search size={18} color="#8E8E93" style={{ flexShrink: 0 }} />
                    <input 
                        type="text" 
                        placeholder="Search by name, ID, or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '17px', color: '#000', paddingLeft: '8px' }}
                    />
                </div>

                <div style={{ background: '#FFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
                    {filteredUsers.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#8E8E93' }}>No users found.</div>
                    ) : (
                        filteredUsers.map((u, index) => {
                            const isLast = index === filteredUsers.length - 1;
                            const profilePicUrl = u.profilePicture 
                                ? (u.profilePicture.startsWith('http') ? u.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + u.profilePicture + "?token=" + localStorage.getItem('token')) 
                                : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/avatar?name=${encodeURIComponent(u.displayName)}&background=random`;

                            return (
                                <div key={u._id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: isLast ? 'none' : '0.5px solid #E5E5EA', background: '#FFF' }}>
                                    
                                    <div style={{ position: 'relative', flexShrink: 0, marginRight: '14px' }}>
                                        <img 
                                            src={profilePicUrl}
                                            alt="" 
                                            onClick={() => setViewingImage(profilePicUrl)}
                                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', cursor: 'zoom-in', border: '1px solid rgba(0,0,0,0.05)' }} 
                                        />
                                        <div style={{ position: 'absolute', bottom: '0', right: '0', width: '14px', height: '14px', borderRadius: '50%', background: u.status === 'online' ? '#34C759' : '#C7C7CC', border: '2.5px solid #FFF' }} />
                                    </div>
                                    
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '17px', fontWeight: '600', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.displayName}</span>
                                            {u.role === 'admin' && (
                                                <span style={{ background: '#007AFF', color: '#FFF', fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Admin</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            ID: <span style={{ fontFamily: 'monospace' }}>{u._id}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#8E8E93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.email}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleDeleteUser(u._id)}
                                        style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30', border: 'none', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                                        title="Delete User"
                                        onMouseOver={e => { e.currentTarget.style.background = '#FF3B30'; e.currentTarget.style.color = '#FFF'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.1)'; e.currentTarget.style.color = '#FF3B30'; }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Image View Modal iOS Style */}
            {viewingImage && (
                <div 
                    onClick={() => setViewingImage(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}
                >
                    <div style={{ position: 'absolute', top: '20px', right: '20px', color: '#FFF', fontSize: '17px', fontWeight: '600', cursor: 'pointer', padding: '10px' }}>Done</div>
                    <img 
                        src={viewingImage} 
                        style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', objectFit: 'contain' }} 
                        alt="Full View" 
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
