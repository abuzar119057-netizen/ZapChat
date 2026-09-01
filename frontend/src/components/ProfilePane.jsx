import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, MoreVertical, Phone, Info, Shield, ChevronRight, MessageCircle, 
  CheckCircle, Slash, AlertCircle, PhoneCall, Image, Video, FileText, Mic, 
  User, LogOut, ArrowLeftRight, AlertTriangle, Trash as TrashIcon 
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const ProfilePane = ({ contact, onClose }) => {
    const { user: currentUser, updateProfile } = useAuth();
    const { onlineUsers } = useSocket();
    const [media, setMedia] = useState([]);
    
    // Admin Control states
    const [showAdminControlPanel, setShowAdminControlPanel] = useState(false);
    const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);
    const [userObj, setUserObj] = useState(contact);
    
    if (!contact) return null;
    const targetUser = userObj || contact;

    useEffect(() => {
        const fetchMedia = async () => {
            try {
                const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/messages/media/${contact._id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await resp.json();
                setMedia(data);
            } catch (err) {
                console.error('Fetch media failed:', err);
            }
        };
        fetchMedia();
    }, [contact._id]);

    useEffect(() => {
        setUserObj(contact);
        if (!contact.isGroup) {
            const fetchUserDetails = async () => {
                try {
                    const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (resp.ok) {
                        const allUsers = await resp.json();
                        const found = allUsers.find(u => u._id === contact._id);
                        if (found) {
                            setUserObj(found);
                        }
                    }
                } catch (err) {
                    console.error('Fetch user admin details failed:', err);
                }
            };
            fetchUserDetails();
        }
    }, [contact]);

    const handleLeaveGroup = async () => {
        if (!window.confirm(`Are you sure you want to leave ${contact.name}?`)) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups/${contact._id}/leave`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                onClose();
                window.location.reload(); // Refresh to update sidebar
            }
        } catch (err) {
            console.error('Failed to leave group:', err);
        }
    };

    const settings = [
        { icon: MessageCircle, title: 'Mute Notifications', color: '#007AFF', hasSwitch: true },
        { icon: PhoneCall, title: 'Custom Notifications', color: '#AF52DE' },
        { icon: Image, title: 'Media Visibility', color: '#34C759' },
    ];

    const displayName = contact.isGroup ? contact.name : contact.displayName;
    const profilePicture = contact.isGroup 
        ? (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(displayName || '') + "&background=random&color=fff"
        : (contact.profilePicture ? (contact.profilePicture.startsWith('http') ? contact.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + contact.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(displayName || '') + "&background=random&color=fff");

    const getOfflineStatusText = (member) => {
        const ls = onlineUsers[member._id]?.lastSeen || member.lastSeen;
        if (!ls) return 'offline';
        const date = new Date(ls);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (date.toDateString() === today.toDateString()) return `last seen today at ${timeStr}`;
        if (date.toDateString() === yesterday.toDateString()) return `last seen yesterday at ${timeStr}`;
        return `last seen on ${date.toLocaleDateString()} at ${timeStr}`;
    };

    return (
        <div className="profile-pane animate-fade" style={{ width: '100%', height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-ios)', background: '#FFF' }}>
                <ArrowLeft size={24} style={{ cursor: 'pointer', color: '#007AFF' }} onClick={onClose} />
                <h1 style={{ fontSize: '17px', fontWeight: '700' }}>{contact.isGroup ? 'Group Info' : 'Contact Info'}</h1>
                <div style={{ color: '#007AFF', fontSize: '17px', fontWeight: '500', cursor: 'pointer' }}>Edit</div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }} className="hide-scrollbar">
                {/* Profile Card */}
                <div style={{ background: '#FFF', textAlign: 'center', padding: '32px 20px', marginBottom: '12px' }}>
                    <div style={{ width: '140px', height: '140px', margin: '0 auto 20px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #E5E5EA' }}>
                        <img 
                            src={profilePicture} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            alt="" 
                        />
                    </div>
                    <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>{displayName}</h2>
                    {contact.isGroup ? (
                        <p style={{ color: '#8E8E93', fontSize: '17px' }}>Group · {contact.members?.length || 0} participants</p>
                    ) : (
                        <p style={{ color: '#8E8E93', fontSize: '17px' }}>{contact.email}</p>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '24px' }}>
                        {!contact.isGroup && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#007AFF', cursor: 'pointer' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F0F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={24} /></div>
                                    <span style={{ fontSize: '13px' }}>Audio</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#007AFF', cursor: 'pointer' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F0F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={24} /></div>
                                    <span style={{ fontSize: '13px' }}>Video</span>
                                </div>
                            </>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#22C55E', cursor: 'pointer' }} onClick={onClose}>
                           <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F0FFF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageCircle size={24} /></div>
                           <span style={{ fontSize: '13px' }}>Message</span>
                        </div>
                    </div>
                </div>

                {/* Group Members List */}
                {contact.isGroup && (
                    <div style={{ background: '#FFF', padding: '16px', marginBottom: '12px' }}>
                         <div style={{ fontSize: '15px', color: '#8E8E93', marginBottom: '12px' }}>{contact.members?.length || 0} participants</div>
                         {contact.members?.map((member) => {
                             const isOnline = onlineUsers[member._id]?.status === 'online';
                             const isMe = member._id === currentUser._id;
                             return (
                                 <div key={member._id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 0', borderBottom: '0.5px solid #F2F2F7' }}>
                                     <div style={{ position: 'relative' }}>
                                        <img 
                                            src={member.profilePicture ? (member.profilePicture.startsWith('http') ? member.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + member.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(member.displayName || '') + "&background=random&color=fff"} 
                                            style={{ width: '40px', height: '40px', borderRadius: '50%' }} 
                                            alt="" 
                                        />
                                        {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#34C759', borderRadius: '50%', border: '2px solid #FFF' }}></div>}
                                     </div>
                                     <div style={{ flex: 1 }}>
                                         <div style={{ fontSize: '17px', fontWeight: '600' }}>{isMe ? 'You' : member.displayName}</div>
                                         <div style={{ fontSize: '13px', color: '#8E8E93' }}>{isOnline ? 'online' : (member.status === 'away' ? 'away' : getOfflineStatusText(member))}</div>
                                     </div>
                                     {contact.admins?.includes(member._id) && (
                                         <div style={{ fontSize: '12px', color: '#34C759', border: '1px solid #34C759', padding: '2px 6px', borderRadius: '4px' }}>Group Admin</div>
                                     )}
                                 </div>
                             );
                         })}
                    </div>
                )}

                {/* About & Phone */}
                {!contact.isGroup && (
                    <div style={{ background: '#FFF', padding: '16px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '15px', color: '#8E8E93', marginBottom: '8px' }}>About and phone number</div>
                        <div style={{ fontSize: '17px', fontWeight: '500', marginBottom: '8px' }}>{contact.about || 'Hey there! I am using Zap Chat.'}</div>
                        <div style={{ borderTop: '1px solid #F2F2F7', paddingTop: '8px', fontSize: '17px', fontWeight: '500', color: contact.phone ? '#000' : '#8E8E93' }}>{contact.phone || 'No phone number added'}</div>
                    </div>
                )}

                {!contact.isGroup && (
                    <div 
                      style={{ background: '#FFF', padding: '16px', marginBottom: '12px', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentUser?.role === 'admin') {
                          setShowAdminControlPanel(true);
                        } else {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(contact._id);
                            alert('User ID copied to clipboard!');
                          }
                        }
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentUser?.role === 'admin') {
                          setShowAdminControlPanel(true);
                        } else {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(contact._id);
                            alert('User ID copied to clipboard!');
                          }
                        }
                      }}
                    >
                        <div style={{ fontSize: '15px', color: '#8E8E93', marginBottom: '8px' }}>
                          {currentUser?.role === 'admin' ? 'User ID (Admin Control Panel)' : 'User ID'}
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '600', color: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{contact._id}</span>
                            <ChevronRight size={18} color="#007AFF" />
                        </div>
                    </div>
                )}

                {/* Media Section */}
                <div style={{ background: '#FFF', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}>
                        <span style={{ color: '#8E8E93' }}>Media, links, and docs</span>
                        <span style={{ color: '#007AFF' }}>{media.length} <ChevronRight size={14} style={{ display: 'inline' }} /></span>
                    </div>
                    {media.length > 0 ? (
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }} className="hide-scrollbar">
                            {media.map((item) => (
                                <div key={item._id} style={{ width: '70px', height: '70px', borderRadius: '8px', background: '#F2F2F7', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {(item.type === 'image' || item.type === 'video' || item.fileMetadata?.contentType?.includes('image')) ? (
                                        <img src={(import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + item.fileId + "?token=" + localStorage.getItem('token')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    ) : item.type === 'audio' ? (
                                        <Mic size={24} color="#007AFF" />
                                    ) : (
                                        <FileText size={24} color="#8E8E93" />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: '14px', color: '#8E8E93', textAlign: 'center', padding: '10px' }}>No media shared yet</div>
                    )}
                </div>

                {/* Notifications & Settings */}
                <div style={{ background: '#FFF', padding: '0 16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #F2F2F7', cursor: 'pointer' }} onClick={() => {
                        const isMuted = currentUser.settings?.mutedContacts?.includes(contact._id);
                        let newMuted = currentUser.settings?.mutedContacts || [];
                        if (isMuted) newMuted = newMuted.filter(id => id !== contact._id);
                        else newMuted = [...newMuted, contact._id];
                        updateProfile({ settings: { mutedContacts: newMuted } });
                    }}>
                        <div style={{ flex: 1, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '12px' }}><MessageCircle size={22} color="#007AFF" /> Mute Notifications</div>
                        <div style={{ width: '51px', height: '31px', background: currentUser.settings?.mutedContacts?.includes(contact._id) ? '#34C759' : '#e9e9eb', borderRadius: '16px', position: 'relative', transition: 'background 0.2s' }}>
                            <div style={{ position: 'absolute', top: '2px', left: currentUser.settings?.mutedContacts?.includes(contact._id) ? '22px' : '2px', width: '27px', height: '27px', background: '#FFF', borderRadius: '50%', boxShadow: '0 3px 8px rgba(0,0,0,0.15)', transition: 'left 0.2s' }}></div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #F2F2F7', cursor: 'pointer' }}>
                        <div style={{ flex: 1, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '12px' }}><PhoneCall size={22} color="#AF52DE" /> Custom Notifications</div>
                        <ChevronRight size={18} color="#C7C7CC" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 0', cursor: 'pointer' }}>
                        <div style={{ flex: 1, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '12px' }}><Image size={22} color="#34C759" /> Media Visibility</div>
                        <ChevronRight size={18} color="#C7C7CC" />
                    </div>
                </div>

                {/* Actions Block */}
                <div style={{ background: '#FFF', padding: '0 16px', marginBottom: '40px' }}>
                    {contact.isGroup ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', cursor: 'pointer', color: '#FF3B30' }} onClick={handleLeaveGroup}>
                            <LogOut size={20} />
                            <span style={{ fontSize: '17px' }}>Exit Group</span>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', borderBottom: '1px solid #F2F2F7', cursor: 'pointer', color: '#FF3B30' }}>
                                <Slash size={20} />
                                <span style={{ fontSize: '17px' }}>Block {contact.displayName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', cursor: 'pointer', color: '#FF3B30' }}>
                                <AlertCircle size={20} />
                                <span style={{ fontSize: '17px' }}>Report {contact.displayName}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        {showAdminControlPanel && targetUser && createPortal(
          (
            <div 
              onClick={() => setShowAdminControlPanel(false)}
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
            }}>
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
                    src={targetUser.profilePicture ? (targetUser.profilePicture.startsWith('http') ? targetUser.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + targetUser.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(targetUser.displayName || '') + "&background=random&color=fff"}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
                    alt=""
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: '#000000' }}>
                      {targetUser.displayName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px', wordBreak: 'break-all' }}>
                      ID: {targetUser._id}
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
                    <span style={{ fontSize: '15px', color: '#000000', fontWeight: '500' }}>{targetUser.email || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid #E5E5EA' }}>
                    <span style={{ fontSize: '15px', color: '#8E8E93' }}>Phone</span>
                    <span style={{ fontSize: '15px', color: '#000000', fontWeight: '500' }}>{targetUser.phone || 'None'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid #E5E5EA' }}>
                    <span style={{ fontSize: '15px', color: '#8E8E93' }}>Status</span>
                    <span style={{ 
                      fontSize: '15px', 
                      color: targetUser.isSuspended ? '#FF3B30' : '#34C759', 
                      fontWeight: '600' 
                    }}>
                      {targetUser.isSuspended ? '🔴 Suspended' : '🟢 Active'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <span style={{ fontSize: '15px', color: '#8E8E93' }}>Role</span>
                    <span style={{ fontSize: '15px', color: '#007AFF', fontWeight: '600', textTransform: 'uppercase' }}>
                      {targetUser.role || 'user'}
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
                    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
                    if (!window.confirm(`Are you sure you want to change role to ${newRole.toUpperCase()}?`)) return;
                    
                    setIsAdminActionLoading(true);
                    try {
                      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${targetUser._id}/role`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ role: newRole })
                      });
                      if (!res.ok) throw new Error('Action failed');
                      const updated = await res.json();
                      setUserObj(prev => ({ ...prev, role: updated.role }));
                      alert(`Role updated to ${updated.role.toUpperCase()}`);
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
                        {targetUser.role === 'admin' ? 'Admin' : 'Regular User'}
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
                    const nextSuspendState = !targetUser.isSuspended;
                    if (!window.confirm(`Are you sure you want to ${nextSuspendState ? 'SUSPEND' : 'RE-ACTIVATE'} this user?`)) return;
                    
                    setIsAdminActionLoading(true);
                    try {
                      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${targetUser._id}/suspend`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ isSuspended: nextSuspendState })
                      });
                      if (!res.ok) throw new Error('Action failed');
                      const updated = await res.json();
                      setUserObj(prev => ({ ...prev, isSuspended: updated.isSuspended }));
                      alert(`Account ${updated.isSuspended ? 'Suspended' : 'Activated'}`);
                    } catch (err) {
                      alert('Error updating suspension state');
                    } finally {
                      setIsAdminActionLoading(false);
                    }
                  }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: '500', color: targetUser.isSuspended ? '#34C759' : '#FF3B30' }}>
                      {targetUser.isSuspended ? 'Re-activate Account' : 'Suspend / Ban Account'}
                    </span>
                    <Shield size={18} color={targetUser.isSuspended ? '#34C759' : '#FF3B30'} />
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
                      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${targetUser._id}/messages`, {
                        method: 'DELETE',
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem('token')}`
                        }
                      });
                      if (!res.ok) throw new Error('Action failed');
                      const data = await res.json();
                      alert(data.message || 'Wiped message history successfully.');
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
                      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${targetUser._id}`, {
                        method: 'DELETE',
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem('token')}`
                        }
                      });
                      if (!res.ok) throw new Error('Action failed');
                      const data = await res.json();
                      alert(data.message || 'User deleted successfully.');
                      setShowAdminControlPanel(false);
                      onClose();
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

export default ProfilePane;
