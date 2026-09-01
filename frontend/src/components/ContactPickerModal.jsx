import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ContactPickerModal = ({ onSelect, onClose }) => {
    const { api } = useAuth();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchUsers = async (query = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/contacts/search?q=${query}`);
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchUsers(search);
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [search]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(11, 20, 26, 0.95)',
            zIndex: 3000, display: 'flex', flexDirection: 'column',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            {/* WhatsApp Style Header */}
            <div style={{ 
                background: '#202c33', padding: '12px 16px', display: 'flex', 
                alignItems: 'center', gap: '20px', color: '#e9edef',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#e9edef', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={24} />
                </button>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '500' }}>Select Contact</h3>
                    <div style={{ fontSize: '13px', opacity: 0.8 }}>{users.length} contacts</div>
                </div>
                <Search size={20} style={{ cursor: 'pointer' }} />
            </div>

            {/* WhatsApp Style Search Bar (Conditional or Persistent) */}
            <div style={{ padding: '8px 16px', background: '#111b21' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ 
                            width: '100%', background: '#202c33', border: 'none',
                            borderRadius: '8px', padding: '10px 16px', color: '#d1d7db', 
                            outline: 'none', fontSize: '15px'
                        }}
                    />
                    {loading && (
                        <Loader2 size={18} className="spin" style={{ position: 'absolute', right: '12px', color: '#00a884' }} />
                    )}
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#111b21' }}>
                {/* Fixed "New Group" Style Item */}
                {!search && (
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <UserPlus size={22} />
                        </div>
                        <span style={{ fontSize: '17px', color: '#e9edef', fontWeight: '400' }}>New participant</span>
                    </div>
                )}

                {users.length > 0 ? (
                    users.map(user => {
                        const profilePicUrl = user.profilePicture 
                            ? (user.profilePicture.startsWith('http') 
                                ? user.profilePicture 
                                : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token'))
                            : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(user.displayName || '') + "&background=random&color=fff";

                        return (
                            <div 
                                key={user._id} 
                                onClick={() => onSelect(user)}
                                style={{ 
                                    padding: '12px 16px', display: 'flex', alignItems: 'center', 
                                    gap: '15px', cursor: 'pointer', transition: 'background 0.2s'
                                }}
                                className="wa-item-hover"
                            >
                                <img 
                                    src={profilePicUrl} 
                                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                                    alt=""
                                />
                                <div style={{ flex: 1, borderBottom: '1px solid #222d34', paddingBottom: '12px', paddingTop: '4px' }}>
                                    <div style={{ fontSize: '17px', color: '#e9edef' }}>{user.displayName}</div>
                                    <div style={{ fontSize: '14px', color: '#8696a0', marginTop: '2px' }}>
                                        {user.about || user.status || 'Hey there! I am using Zap Chat.'}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : !loading && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8696a0' }}>
                        No contacts found
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .wa-item-hover:hover {
                    background: #202c33;
                }
            ` }} />
        </div>
    );
};

export default ContactPickerModal;
