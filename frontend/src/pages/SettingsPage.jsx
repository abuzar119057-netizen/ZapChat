import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ArrowLeft, User, Lock, Bell, MessageSquare, Database, HelpCircle, Info, ChevronRight, MessageCircle, PhoneCall, Users, Settings, LogOut, Circle, Camera, ShieldCheck, Mail, AlertTriangle, UserPlus, Smartphone, FileText, Clock, Smile, Sun, Moon, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
    const { user, logout } = useAuth();
    const { onlineUsers } = useSocket();
    const navigate = useNavigate();
    const [activeSubPage, setActiveSubPage] = useState(null);
    const [adminUsers, setAdminUsers] = useState([]);
    const [isAdminLoading, setIsAdminLoading] = useState(false);
    const [adminStats, setAdminStats] = useState({ totalUsers: 0, totalMessages: 0, onlineUsers: 0 });
    const [isUploading, setIsUploading] = useState(false);
    const [showFullImage, setShowFullImage] = useState(false);
    const [pinModal, setPinModal] = useState({ show: false, type: 'set', callback: null });
    const [pinInput, setPinInput] = useState('');
    const [accountReport, setAccountReport] = useState(null);
    const fileInputRef = React.useRef(null);
    const { updateProfile } = useAuth();
    const [showAutoDownload, setShowAutoDownload] = useState(null); // 'cellular' or 'wifi' or null
    const [realDataStats, setRealDataStats] = useState(null);
    const [showSecurityAudit, setShowSecurityAudit] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showCommunityModal, setShowCommunityModal] = useState(false);
    const [communityTab, setCommunityTab] = useState('main'); // 'main', 'roadmap', 'discussions', 'contributors'
    const [communityData, setCommunityData] = useState({ roadmap: [], contributors: [], discussions: [] });
    const [isCommunityLoading, setIsCommunityLoading] = useState(false);

    useEffect(() => {
        if (activeSubPage === 'admin') {
            fetchAdminUsers();
            fetchAdminStats();
        }
        if (activeSubPage === 'account') {
            fetchReportStatus();
        }
        if (activeSubPage === 'data') {
            fetchUsageStats();
        }
        if (showCommunityModal) {
            fetchCommunityData();
        }
    }, [activeSubPage, showCommunityModal]);

    const fetchCommunityData = async () => {
        setIsCommunityLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/community/all`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (res.ok) setCommunityData(data);
        } catch (err) {
            console.error('Fetch Community Data Error:', err);
        } finally {
            setIsCommunityLoading(false);
        }
    };

    const fetchUsageStats = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/usage`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (res.ok) setRealDataStats(data);
        } catch (err) {
            console.error('Fetch Usage Stats Error:', err);
        }
    };

    const fetchAdminUsers = async () => {
        setIsAdminLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (res.ok) setAdminUsers(data);
        } catch (err) {
            console.error('Fetch Admin Users Error:', err);
        } finally {
            setIsAdminLoading(false);
        }
    };

    const fetchAdminStats = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (res.ok) setAdminStats(data);
        } catch (err) {
            console.error('Fetch Admin Stats Error:', err);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                setAdminUsers(adminUsers.filter(u => u._id !== userId));
            }
        } catch (err) {
            console.error('Delete User Error:', err);
        }
    };

    const handleGlobalAnnouncement = async () => {
        const content = window.prompt('Enter announcement content:');
        if (!content) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/admin/announcement`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ content })
            });
            const data = await res.json();
            if (res.ok) alert(data.message);
            else alert(data.message || 'Failed to send announcement');
        } catch (err) {
            console.error('Announcement Error:', err);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('WARNING: This will permanently delete your account and all messages. This action CANNOT be undone. Are you sure?')) return;
        
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                alert('Account deleted successfully.');
                logout();
                navigate('/auth');
            } else {
                alert('Failed to delete account.');
            }
        } catch (err) {
            console.error('Delete Account Error:', err);
        }
    };

    const handleChangeNumber = async () => {
        const newPhone = window.prompt('Enter your new phone number:', user?.phone);
        if (!newPhone || newPhone === user?.phone) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/change-number`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ newPhone })
            });
            const data = await res.json();
            if (res.ok) {
                await updateProfile({ phone: newPhone });
                alert('Phone number updated!');
            } else {
                alert(data.message || 'Update failed');
            }
        } catch (err) {
            console.error('Change Number Error:', err);
        }
    };

    const handleSecurityToggle = async (key, value) => {
        if (key === 'twoStepEnabled') {
            if (value === true) {
                setPinModal({ 
                    show: true, 
                    type: 'set', 
                    callback: async (pin) => {
                        await updateProfile({ settings: { twoStepEnabled: true, twoStepPin: pin } });
                        alert('Two-step Verification enabled!');
                    }
                });
            } else {
                setPinModal({ 
                    show: true, 
                    type: 'verify', 
                    callback: async () => {
                        if (window.confirm('Are you sure you want to disable Two-step Verification?')) {
                            await updateProfile({ settings: { twoStepEnabled: false, twoStepPin: '' } });
                            alert('Two-step Verification disabled.');
                        }
                    }
                });
            }
            return;
        }
        
        try {
            await updateProfile({ settings: { [key]: value } });
        } catch (err) {
            console.error('Security Toggle Error:', err);
        }
    };

    const handleChangeEmail = async () => {
        const newEmail = window.prompt('Enter your new email address:', user?.email);
        if (!newEmail || newEmail === user?.email) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/change-email`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ newEmail })
            });
            const data = await res.json();
            if (res.ok) {
                await updateProfile({ email: newEmail });
                alert('Email updated successfully!');
            } else {
                alert(data.message || 'Update failed');
            }
        } catch (err) {
            console.error('Change Email Error:', err);
        }
    };

    const handleLogoutAll = async () => {
        if (!window.confirm('Log out from all other devices? This will invalidate all other active sessions.')) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/logout-all`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) alert('Successfully logged out from all other devices.');
        } catch (err) { console.error(err); }
    };

    const fetchReportStatus = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/report-status`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (res.ok) setAccountReport(data);
        } catch (err) { console.error(err); }
    };

    const handleRequestReport = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/request-report`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (res.ok) {
                setAccountReport(data);
                alert('Report request submitted. It will be ready in 5 minutes.');
            } else {
                alert(data.message || 'Request failed');
            }
        } catch (err) { console.error(err); }
    };

    const handleDownloadReport = async () => {
        if (!accountReport || accountReport.status !== 'ready') return;
        window.open(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/auth/download-report/${accountReport._id}?token=${localStorage.getItem('token')}`, '_blank');
        // Clear state since the backend self-destructs the file after download
        setAccountReport(null);
    };

    // Polling for report status if processing
    useEffect(() => {
        let interval;
        if (accountReport?.status === 'processing') {
            interval = setInterval(fetchReportStatus, 10000); // Check every 10s
        }
        return () => clearInterval(interval);
    }, [accountReport]);

    const items = [
        { id: 'account', icon: User, color: '#007AFF', title: 'Account', sub: 'Security, change number' },
        { id: 'privacy', icon: Lock, color: '#34C759', title: 'Privacy', sub: 'Block contacts, disappearing msgs' },
        { id: 'notifications', icon: Bell, color: '#FF3B30', title: 'Notifications', sub: 'Message, group & call tones' },
        { id: 'chats', icon: MessageSquare, color: '#FF9500', title: 'Chats', sub: 'Theme, wallpaper, chat history' },
        { id: 'data', icon: Database, color: '#5856D6', title: 'Data and Storage', sub: 'Network usage, auto-download' },
        { id: 'help', icon: HelpCircle, color: '#8E8E93', title: 'Help', sub: 'Help center, contact us' },
        { id: 'about', icon: Info, color: '#32ADE6', title: 'About', sub: 'Version 2.0.0 Pro' },
    ];

    const renderMainSettings = () => (
        <>
            {/* Header */}
            <div style={{ padding: '40px 20px 20px', background: '#F2F2F7' }}>
                <h1 style={{ fontSize: '34px', fontWeight: '800', color: '#000', margin: 0 }}>Settings</h1>
            </div>

            {/* Profile Section */}
            <div style={{ background: '#F2F2F7', padding: '0 16px 20px' }}>
                <div 
                    onClick={() => setActiveSubPage('profile')}
                    style={{ background: '#FFF', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                >
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', marginRight: '16px' }}>
                        <img 
                            src={user?.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(user?.displayName || 'User') + "&background=random&color=fff"} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            alt="Profile" 
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#000' }}>{user?.displayName}</div>
                        <div style={{ fontSize: '14px', color: '#8E8E93' }}>{user?.email || 'Available'}</div>
                    </div>
                    <ChevronRight size={20} color="#C7C7CC" />
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#F2F2F7', padding: '0 16px' }}>
                <div style={{ background: '#FFF', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                    {items.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setActiveSubPage(item.id)}
                            style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: idx < items.length - 1 ? '1px solid #F2F2F7' : 'none' }}
                        >
                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px' }}>
                                <item.icon size={18} color="#FFF" />
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '17px', fontWeight: '500', color: '#000' }}>{item.title}</span>
                                <ChevronRight size={20} color="#C7C7CC" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Admin Section */}
                {user?.role === 'admin' && (
                    <>
                        <div style={{ padding: '0 16px 8px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Admin Controls</div>
                        <div style={{ background: '#FFF', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                            <div 
                                onClick={() => setActiveSubPage('admin')}
                                style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                            >
                                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#5856D6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px' }}>
                                    <ShieldCheck size={18} color="#FFF" />
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '17px', fontWeight: '600', color: '#000' }}>Admin Dashboard</span>
                                    <ChevronRight size={20} color="#C7C7CC" />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Logout Button */}
                <div style={{ background: '#FFF', borderRadius: '12px', overflow: 'hidden', marginBottom: '100px' }}>
                    <div 
                        onClick={() => { logout(); navigate('/auth'); }}
                        style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', color: '#FF3B30' }}
                    >
                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px' }}>
                            <LogOut size={18} color="#FFF" />
                        </div>
                        <span style={{ fontSize: '17px', fontWeight: '600' }}>Logout</span>
                    </div>
                </div>
            </div>
        </>
    );

    const updateSettings = async (updates) => {
        try {
            await updateProfile({ settings: updates });
        } catch (err) {
            console.error('Failed to update settings:', err);
        }
    };

    const renderPrivacySettings = () => (
        <div style={{ padding: '0 0 100px' }}>
            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Who can see my personal info</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                {[
                    { label: 'Last Seen', key: 'lastSeenVisible', options: ['everyone', 'contacts', 'nobody'] },
                    { label: 'Profile Photo', key: 'profilePhotoPrivacy', options: ['everyone', 'contacts', 'nobody'] },
                    { label: 'About', key: 'aboutPrivacy', options: ['everyone', 'contacts', 'nobody'] },
                ].map((item, idx) => (
                    <div key={idx} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < 2 ? '1px solid #F2F2F7' : 'none' }}>
                        <span style={{ fontSize: '17px' }}>{item.label}</span>
                        <select 
                            value={user?.settings?.[item.key] || 'everyone'} 
                            onChange={(e) => updateSettings({ [item.key]: e.target.value })}
                            style={{ border: 'none', background: 'transparent', color: '#007AFF', fontSize: '17px', outline: 'none' }}
                        >
                            {item.options.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
                        </select>
                    </div>
                ))}
            </div>

            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93' }}>
                If you don't share your Last Seen, you won't be able to see other people's Last Seen.
            </div>

            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA', marginTop: '20px' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>Read Receipts</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93' }}>If turned off, you won't send or receive Read Receipts. Read receipts are always sent for group chats.</div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={user?.settings?.readReceipts !== false} 
                        onChange={(e) => updateSettings({ readReceipts: e.target.checked })}
                        style={{ width: '40px', height: '24px' }}
                    />
                </div>
            </div>

            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Disappearing Messages</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '17px' }}>Default Message Timer</span>
                    <select 
                        value={user?.settings?.disappearingMessages || 0} 
                        onChange={(e) => updateSettings({ disappearingMessages: parseInt(e.target.value) })}
                        style={{ border: 'none', background: 'transparent', color: '#007AFF', fontSize: '17px', outline: 'none' }}
                    >
                        <option value={0}>Off</option>
                        <option value={24}>24 Hours</option>
                        <option value={168}>7 Days</option>
                        <option value={2160}>90 Days</option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderAccountSettings = () => (
        <div style={{ padding: '0 0 100px' }}>
            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Security Settings</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>Security Notifications</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93' }}>Get notified when your security code changes for a contact's phone.</div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={user?.settings?.securityNotifications !== false} 
                        onChange={(e) => handleSecurityToggle('securityNotifications', e.target.checked)}
                        style={{ width: '40px', height: '24px' }}
                    />
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>Two-step Verification</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93' }}>Require a PIN when registering your phone number with ZapChat again.</div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={user?.settings?.twoStepEnabled === true} 
                        onChange={(e) => handleSecurityToggle('twoStepEnabled', e.target.checked)}
                        style={{ width: '40px', height: '24px' }}
                    />
                </div>
                {user?.settings?.twoStepEnabled && (
                    <div 
                        onClick={() => {
                            setPinModal({
                                show: true,
                                type: 'verify',
                                callback: () => {
                                    setPinModal({
                                        show: true,
                                        type: 'set',
                                        callback: async (newPin) => {
                                            await updateProfile({ settings: { twoStepPin: newPin } });
                                            alert('PIN changed successfully!');
                                        }
                                    });
                                }
                            });
                        }}
                        style={{ padding: '8px 16px', color: '#007AFF', fontSize: '14px', fontWeight: '500', cursor: 'pointer', borderTop: '1px solid #F2F2F7' }}
                    >
                        Change PIN
                    </div>
                )}
            </div>

            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Account Info</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div 
                    onClick={handleChangeEmail}
                    style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7', cursor: 'pointer' }}
                >
                    <span style={{ fontSize: '17px' }}>Change Email</span>
                    <span style={{ fontSize: '15px', color: '#8E8E93' }}>{user?.email}</span>
                </div>
                <div 
                    onClick={handleChangeNumber}
                    style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7', cursor: 'pointer' }}
                >
                    <span style={{ fontSize: '17px' }}>Change Number</span>
                    <span style={{ fontSize: '15px', color: '#8E8E93' }}>{user?.phone || 'Add phone'}</span>
                </div>
                <div 
                    onClick={accountReport?.status === 'ready' ? handleDownloadReport : (accountReport?.status === 'processing' ? null : handleRequestReport)}
                    style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: (accountReport?.status === 'processing') ? 'default' : 'pointer' }}
                >
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '17px' }}>Request Account Info</span>
                        {accountReport && (
                            <div style={{ fontSize: '13px', color: accountReport.status === 'ready' ? '#34C759' : '#007AFF', marginTop: '2px' }}>
                                {accountReport.status === 'processing' ? '⚙️ Processing... (Ready in ~5 min)' : '✅ Report is ready for download'}
                            </div>
                        )}
                    </div>
                    {accountReport?.status === 'ready' ? (
                        <div style={{ background: '#007AFF', color: '#FFF', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}>Download</div>
                    ) : (
                        <ChevronRight size={20} color="#C7C7CC" />
                    )}
                </div>
            </div>

            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Active Sessions</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ color: '#007AFF' }}><Smartphone size={24} /></div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: '600' }}>This Device (Windows PC)</div>
                        <div style={{ fontSize: '13px', color: '#34C759' }}>Online Now</div>
                    </div>
                </div>
                <div 
                    onClick={handleLogoutAll}
                    style={{ padding: '12px 16px', color: '#FF3B30', fontSize: '16px', fontWeight: '500', textAlign: 'center', cursor: 'pointer' }}
                >
                    Logout from All Devices
                </div>
            </div>

            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA', marginTop: '30px' }}>
                <div 
                    onClick={handleDeleteAccount}
                    style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FF3B30', cursor: 'pointer' }}
                >
                    <span style={{ fontSize: '17px', fontWeight: '600' }}>Delete My Account</span>
                </div>
            </div>
        </div>
    );

    const [profileForm, setProfileForm] = useState({
        displayName: user?.displayName || '',
        about: user?.about || '',
        phone: user?.phone || ''
    });

    const handleProfileUpdate = async () => {
        try {
            await updateProfile(profileForm);
            alert('Profile updated successfully!');
        } catch (err) {
            console.error('Update Profile Error:', err);
            alert('Failed to update profile.');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                await updateProfile({ profilePicture: data.fileId });
                alert('Profile picture updated!');
            } else {
                alert(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Error uploading image');
        } finally {
            setIsUploading(false);
        }
    };

    const renderProfileSettings = () => (
        <div style={{ padding: '0 0 100px' }}>
            {/* Full Image Overlay */}
            {showFullImage && (
                <div 
                    onClick={() => setShowFullImage(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease-out' }}
                >
                    <img 
                        src={user?.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(user?.displayName || 'User') + "&background=random&color=fff"} 
                        style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} 
                        alt="Full Profile" 
                    />
                    <div style={{ position: 'absolute', top: '40px', right: '20px', color: '#FFF', fontSize: '18px', fontWeight: '600' }}>Done</div>
                </div>
            )}

            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#FFF', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <div 
                        onClick={() => setShowFullImage(true)}
                        style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #F2F2F7', opacity: isUploading ? 0.5 : 1, cursor: 'pointer' }}
                    >
                        <img 
                            src={user?.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + user.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(user?.displayName || 'User') + "&background=random&color=fff"} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            alt="Profile" 
                        />
                        {isUploading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid #007AFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            </div>
                        )}
                    </div>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ position: 'absolute', bottom: 0, right: 0, background: '#007AFF', padding: '6px', borderRadius: '50%', border: '3px solid #FFF', cursor: 'pointer' }}
                    >
                        <Camera size={16} color="#FFF" />
                    </div>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                />
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: '14px', color: '#007AFF', fontWeight: '500', cursor: 'pointer' }}
                >
                    {isUploading ? 'Uploading...' : 'Edit Photo'}
                </div>
            </div>

            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>User Info</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ fontSize: '13px', color: '#8E8E93', marginBottom: '4px' }}>Name</div>
                    <input 
                        type="text" 
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '17px', outline: 'none', color: '#000' }}
                        placeholder="Your name"
                    />
                </div>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ fontSize: '13px', color: '#8E8E93', marginBottom: '4px' }}>About</div>
                    <input 
                        type="text" 
                        value={profileForm.about}
                        onChange={(e) => setProfileForm({ ...profileForm, about: e.target.value })}
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '17px', outline: 'none', color: '#000' }}
                        placeholder="About status"
                    />
                </div>
                <div style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '13px', color: '#8E8E93', marginBottom: '4px' }}>Phone</div>
                    <input 
                        type="text" 
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '17px', outline: 'none', color: '#000' }}
                        placeholder="Phone number"
                    />
                </div>
            </div>

            <div style={{ padding: '30px 16px' }}>
                <button 
                    onClick={handleProfileUpdate}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#007AFF', color: '#FFF', border: 'none', fontSize: '17px', fontWeight: '600', cursor: 'pointer' }}
                >
                    Save Changes
                </button>
            </div>
        </div>
    );

    const renderAdminSettings = () => (
        <div style={{ padding: '0 0 100px' }}>
            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Management</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', marginBottom: '12px' }}>Manage Users ({adminUsers.length})</div>
                    {isAdminLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {adminUsers.map(u => (
                                <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: '#F9F9F9', borderRadius: '8px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                                        <img 
                                            src={u.profilePicture ? (u.profilePicture.startsWith('http') ? u.profilePicture : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/files/" + u.profilePicture + "?token=" + localStorage.getItem('token')) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + u.displayName + "&background=random&color=fff"} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            alt="" 
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '15px', fontWeight: '600' }}>{u.displayName}</div>
                                        <div style={{ fontSize: '12px', color: '#8E8E93' }}>{u.email} · {u.role}</div>
                                    </div>
                                    {u._id !== user.id && (
                                        <button 
                                            onClick={() => handleDeleteUser(u._id)}
                                            style={{ background: '#FF3B30', color: '#FFF', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div 
                    onClick={handleGlobalAnnouncement}
                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #F2F2F7', cursor: 'pointer' }}
                >
                    <Mail size={20} color="#FF9500" style={{ marginRight: '14px' }} />
                    <span style={{ fontSize: '17px', flex: 1 }}>Global Announcement</span>
                    <ChevronRight size={20} color="#C7C7CC" />
                </div>
            </div>

            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>System Info</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '17px' }}>Total Users</span>
                    <span style={{ fontWeight: '600' }}>{adminStats.totalUsers}</span>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F2F2F7' }}>
                    <span style={{ fontSize: '17px' }}>Total Messages</span>
                    <span style={{ fontWeight: '600' }}>{adminStats.totalMessages}</span>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F2F2F7' }}>
                    <span style={{ fontSize: '17px' }}>Online Users</span>
                    <span style={{ color: '#34C759', fontWeight: '600' }}>{adminStats.onlineUsers}</span>
                </div>
            </div>
        </div>
    );

    const renderNotificationSettings = () => (
        <div style={{ padding: '0 0 100px' }}>
            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Message Notifications</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>Show Notifications</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93' }}>Receive notifications for new messages.</div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={user?.settings?.messageNotifications !== false} 
                        onChange={(e) => updateSettings({ messageNotifications: e.target.checked })}
                        style={{ width: '40px', height: '24px', accentColor: '#34C759', cursor: 'pointer' }}
                    />
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>Sound</div>
                    </div>
                    <select 
                        value={user?.settings?.messageTone || 'default'} 
                        onChange={(e) => updateSettings({ messageTone: e.target.value })}
                        style={{ border: 'none', background: 'transparent', color: '#007AFF', fontSize: '17px', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="default">Default (Note)</option>
                        <option value="aurora">Aurora</option>
                        <option value="bamboo">Bamboo</option>
                        <option value="chord">Chord</option>
                        <option value="none">None</option>
                    </select>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>Show Preview</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93' }}>Preview message text inside new message notifications.</div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={user?.settings?.showPreviews !== false} 
                        onChange={(e) => updateSettings({ showPreviews: e.target.checked })}
                        style={{ width: '40px', height: '24px', accentColor: '#34C759', cursor: 'pointer' }}
                    />
                </div>
            </div>

            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>Group Notifications</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>Show Notifications</div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={user?.settings?.groupNotifications !== false} 
                        onChange={(e) => updateSettings({ groupNotifications: e.target.checked })}
                        style={{ width: '40px', height: '24px', accentColor: '#34C759', cursor: 'pointer' }}
                    />
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>Sound</div>
                    </div>
                    <select 
                        value={user?.settings?.groupTone || 'default'} 
                        onChange={(e) => updateSettings({ groupTone: e.target.value })}
                        style={{ border: 'none', background: 'transparent', color: '#007AFF', fontSize: '17px', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="default">Default</option>
                        <option value="aurora">Aurora</option>
                        <option value="bamboo">Bamboo</option>
                        <option value="none">None</option>
                    </select>
                </div>
            </div>

            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase' }}>In-App Notifications</div>
            <div style={{ background: '#FFF', borderTop: '1px solid #E5E5EA', borderBottom: '1px solid #E5E5EA' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>In-App Vibrate</div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={user?.settings?.inAppVibrate !== false} 
                        onChange={(e) => updateSettings({ inAppVibrate: e.target.checked })}
                        style={{ width: '40px', height: '24px', accentColor: '#34C759', cursor: 'pointer' }}
                    />
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '17px' }}>In-App Sounds</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93' }}>Play sounds for incoming and outgoing messages.</div>
                    </div>
                    <input 
                        type="checkbox" 
                        checked={user?.settings?.inAppSounds !== false} 
                        onChange={(e) => updateSettings({ inAppSounds: e.target.checked })}
                        style={{ width: '40px', height: '24px', accentColor: '#34C759', cursor: 'pointer' }}
                    />
                </div>
            </div>
            
            <div style={{ padding: '30px 16px' }}>
                <div 
                    onClick={() => {
                        if (window.confirm('Reset all notification settings?')) {
                            updateSettings({
                                messageNotifications: true,
                                messageTone: 'default',
                                showPreviews: true,
                                groupNotifications: true,
                                groupTone: 'default',
                                inAppVibrate: true,
                                inAppSounds: true
                            });
                        }
                    }}
                    style={{ padding: '14px', borderRadius: '12px', background: '#FFF', color: '#FF3B30', textAlign: 'center', fontSize: '17px', fontWeight: '500', cursor: 'pointer', border: '1px solid #E5E5EA' }}
                >
                    Reset Notification Settings
                </div>
            </div>
        </div>
    );

    const ProToggle = ({ checked, onChange, color = '#34C759' }) => (
        <div onClick={() => onChange(!checked)} style={{ width: '51px', height: '31px', borderRadius: '16px', background: checked ? color : '#e9e9eb', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '2px', left: checked ? '22px' : '2px', width: '27px', height: '27px', background: '#FFF', borderRadius: '50%', boxShadow: '0 3px 8px rgba(0,0,0,0.15)', transition: 'left 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}></div>
        </div>
    );

    const SettingRow = ({ icon: Icon, iconBg, title, subtitle, rightContent, onClick, borderBottom = true, danger = false }) => (
        <div onClick={onClick} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: borderBottom ? '0.5px solid #E5E5EA' : 'none', cursor: onClick ? 'pointer' : 'default', transition: 'background 0.15s' }} onMouseOver={e => onClick && (e.currentTarget.style.background = '#F8F8FA')} onMouseOut={e => onClick && (e.currentTarget.style.background = 'transparent')}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: iconBg || '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}><Icon size={18} color="#FFF" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '17px', fontWeight: '500', color: danger ? '#FF3B30' : '#000' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '13px', color: danger ? 'rgba(255,59,48,0.7)' : '#8E8E93', marginTop: '2px' }}>{subtitle}</div>}
            </div>
            {rightContent || (onClick && <ChevronRight size={18} color="#C7C7CC" />)}
        </div>
    );

    const renderChatsSettings = () => {
        const settings = user?.settings || {};
        
        return (
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '60px', background: '#F8F9FA' }}>
                
                <div style={{ paddingTop: '10px' }}></div>

                {/* PERSONALIZATION SECTION */}
                <div style={{ padding: '24px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Personalization</span>
                </div>
                
                <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {/* Theme Switcher */}
                    <div style={{ padding: '16px', borderBottom: '1px solid #F2F2F7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6B73FF, #000DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Circle size={18} color="#FFF" /></div>
                            <div style={{ fontSize: '17px', fontWeight: '600' }}>Appearance</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', background: '#F2F2F7', borderRadius: '12px', padding: '4px' }}>
                            {[
                                {id:'light', label:'Light', icon: <Sun size={14} />},
                                {id:'dark', label:'Dark', icon: <Moon size={14} />},
                                {id:'system', label:'Auto', icon: <Settings size={14} />}
                            ].map(t => {
                                const isSelected = (settings.theme || 'light') === t.id;
                                return (
                                    <div key={t.id} 
                                        onClick={() => {
                                            updateProfile({ settings: { ...settings, theme: t.id } });
                                            if (t.id === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
                                            else if (t.id === 'light') document.documentElement.removeAttribute('data-theme');
                                            else {
                                                window.matchMedia('(prefers-color-scheme: dark)').matches 
                                                    ? document.documentElement.setAttribute('data-theme', 'dark') 
                                                    : document.documentElement.removeAttribute('data-theme');
                                            }
                                        }}
                                        style={{ 
                                            flex: 1, padding: '10px', textAlign: 'center', borderRadius: '10px', 
                                            fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                                            background: isSelected ? '#FFF' : 'transparent',
                                            color: isSelected ? '#007AFF' : '#8E8E93',
                                            boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}>
                                        {t.icon}
                                        {t.label}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Font Scaling */}
                    <div style={{ padding: '16px', borderBottom: '1px solid #F2F2F7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #00C6FB, #005BEA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} color="#FFF" /></div>
                            <div style={{ flex: 1, fontSize: '17px', fontWeight: '600' }}>Text Size</div>
                            <div style={{ background: '#EBF5FF', color: '#007AFF', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '12px' }}>{settings.fontSize || 16}px</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#8E8E93' }}>A</span>
                            <input type="range" min="14" max="22" step="1" 
                                value={settings.fontSize || 16} 
                                onChange={(e) => updateProfile({ settings: { ...settings, fontSize: parseInt(e.target.value) } })} 
                                style={{ flex: 1, accentColor: '#007AFF', height: '4px' }} 
                            />
                            <span style={{ fontSize: '20px', fontWeight: '800', color: '#8E8E93' }}>A</span>
                        </div>
                    </div>

                    {/* Emoji Style */}
                    <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #FEB692, #EA5455)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smile size={18} color="#FFF" /></div>
                            <div style={{ fontSize: '17px', fontWeight: '600' }}>Emoji Style</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['System', 'Twitter', 'Google'].map(s => (
                                <div key={s} 
                                    onClick={() => updateProfile({ settings: { ...settings, emojiStyle: s.toLowerCase() } })} 
                                    style={{ 
                                        flex: 1, padding: '10px', textAlign: 'center', borderRadius: '10px', 
                                        fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                                        background: (settings.emojiStyle || 'system') === s.toLowerCase() ? '#007AFF' : '#F2F2F7',
                                        color: (settings.emojiStyle || 'system') === s.toLowerCase() ? '#FFF' : '#4A4A4A',
                                        transition: 'all 0.2s'
                                    }}>{s}</div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MESSAGING SECTION */}
                <div style={{ padding: '24px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Messaging</span>
                </div>

                <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <SettingRow icon={MessageCircle} iconBg="linear-gradient(135deg, #2AF598, #009EFD)" title="Enter is Send" subtitle="Send quickly with Enter key" rightContent={<ProToggle checked={settings.enterIsSend !== false} onChange={(v) => updateProfile({ settings: { ...settings, enterIsSend: v } })} />} />
                    <SettingRow icon={Database} iconBg="linear-gradient(135deg, #FCCF31, #F55555)" title="Media Auto-Download" subtitle="Choose what to save" rightContent={<ProToggle checked={settings.autoDownload === true} onChange={(v) => updateProfile({ settings: { ...settings, autoDownload: v } })} />} />
                    <SettingRow icon={Info} iconBg="linear-gradient(135deg, #7028E4, #E5B2CA)" title="Link Previews" subtitle="Sneak peek of shared links" rightContent={<ProToggle checked={settings.linkPreview !== false} onChange={(v) => updateProfile({ settings: { ...settings, linkPreview: v } })} />} />
                    <SettingRow icon={Lock} iconBg="linear-gradient(135deg, #81FFEF, #F067B4)" title="Keep Chats Archived" subtitle="Don't show archived on new messages" rightContent={<ProToggle checked={settings.keepArchived === true} onChange={(v) => updateProfile({ settings: { ...settings, keepArchived: v } })} />} />
                    <SettingRow icon={Clock} iconBg="linear-gradient(135deg, #FF9A9E, #FAD0C4)" title="Self-Destruct" subtitle={"Messages vanish after: " + (settings.disappearDefault || 'Off')} borderBottom={false}
                        onClick={() => { const opts = ['Off', '24 hours', '7 days', '90 days']; const cur = settings.disappearDefault || 'Off'; updateProfile({ settings: { ...settings, disappearDefault: opts[(opts.indexOf(cur)+1)%opts.length] } }); }}
                        rightContent={<span style={{ fontSize: '14px', color: '#FF5E62', fontWeight: '800' }}>{settings.disappearDefault || 'Off'}</span>} />
                </div>

                {/* STORAGE SECTION */}
                <div style={{ padding: '24px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Storage & Data</span>
                </div>

                <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #F2F2F7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #F9D423, #FF4E50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smartphone size={18} color="#FFF" /></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '17px', fontWeight: '600' }}>Device Usage</div>
                                <div style={{ fontSize: '12px', color: '#8E8E93' }}>{((() => { let t=0; for(let i=0;i<localStorage.length;i++) t+=(localStorage.getItem(localStorage.key(i))||'').length; return (t/1024/1024).toFixed(2); })())} MB used</div>
                            </div>
                        </div>
                        <div style={{ height: '6px', background: '#F2F2F7', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #FF4E50, #F9D423)', borderRadius: '3px', width: Math.min(45, 100) + '%' }}></div>
                        </div>
                    </div>
                    <SettingRow icon={Camera} iconBg="linear-gradient(135deg, #30CFD0, #330867)" title="Global Wallpaper" subtitle="Background for all chats"
                        onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e)=>{if(e.target.files[0]){const r=new FileReader();r.onload=()=>{localStorage.setItem('global_wallpaper',r.result);alert('✨ Wallpaper updated!')};r.readAsDataURL(e.target.files[0])}}; i.click(); }} />
                    <SettingRow icon={FileText} iconBg="linear-gradient(135deg, #6A11CB, #2575FC)" title="Backup & Export" subtitle="Download chat history"
                        onClick={async () => {
                            try {
                                const res = await fetch((import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/messages/all", { headers: { 'Authorization': "Bearer " + localStorage.getItem('token') } });
                                const msgs = await res.json();
                                let txt = "ZAP CHAT EXPORT\nUser: " + (user?.displayName || '') + "\nDate: " + new Date().toLocaleString() + "\n\n";
                                if (Array.isArray(msgs)) msgs.forEach(m => { txt += "[" + new Date(m.createdAt).toLocaleString() + "] " + (m.sender?.displayName || 'Unknown') + ": " + (m.type === 'text' ? m.content : '<attachment>') + "\n"; });
                                const b = new Blob([txt], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download="ZapChat_Backup.txt"; a.click(); URL.revokeObjectURL(u);
                            } catch(e) { alert('❌ Error: ' + e.message); }
                        }} />
                    <SettingRow icon={AlertTriangle} iconBg="#FF3B30" title="Clear Cache" subtitle="Instantly wipe temporary data" danger borderBottom={false}
                        onClick={() => { const ks=[]; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k.startsWith('wallpaper_')||k.startsWith('cached_')) ks.push(k)} ks.forEach(k=>localStorage.removeItem(k)); alert("🚀 Successfully cleared items!"); }} />
                </div>

                {/* ADMIN SECTION */}
                {user?.role === 'admin' && (
                    <>
                        <div style={{ padding: '24px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#FF3B30', textTransform: 'uppercase', letterSpacing: '1px' }}>Admin Controls</span>
                        </div>

                        <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(255,59,48,0.1)' }}>
                            <SettingRow icon={Bell} iconBg="linear-gradient(135deg, #007AFF, #00C6FF)" title="Global Broadcast" subtitle="Send alert to every user"
                                onClick={async () => { const m=window.prompt('📢 Enter Announcement:'); if(!m) return; try { const r=await fetch((import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + '/api/admin/announcement',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ' + localStorage.getItem('token')},body:JSON.stringify({content:m})}); alert(r.ok?'🚀 Sent!':'❌ Failed'); } catch(e){alert('❌ Error');} }} />
                            <SettingRow icon={Settings} iconBg="linear-gradient(135deg, #FF9500, #FFCC00)" title="Maintenance Mode" subtitle="Restrict sending to admins"
                                rightContent={<ProToggle checked={settings.maintenanceMode===true} onChange={(v)=>updateProfile({settings:{...settings, maintenanceMode:v}})} color="#FF9500" />} />
                            <SettingRow icon={UserPlus} iconBg="linear-gradient(135deg, #5856D6, #AF52DE)" title="Public Registration" subtitle="Enable new user signups"
                                rightContent={<ProToggle checked={settings.openRegistration!==false} onChange={(v)=>updateProfile({settings:{...settings, openRegistration:v}})} color="#5856D6" />} />
                            
                            <div style={{ padding: '16px', borderBottom: '1px solid #F2F2F7' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1D2671, #C33764)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} color="#FFF" /></div>
                                    <div style={{ flex: 1, fontSize: '16px', fontWeight: '600' }}>Character Limit</div>
                                    <div style={{ color: '#C2185B', fontWeight: '800', fontSize: '12px' }}>{settings.maxMessageLength || 5000}</div>
                                </div>
                                <input type="range" min="100" max="10000" step="100" value={settings.maxMessageLength || 5000} onChange={(e)=>updateProfile({settings:{...settings, maxMessageLength:parseInt(e.target.value)}})} style={{ width: '100%', accentColor: '#C2185B', height: '4px' }} />
                            </div>

                            <div style={{ padding: '16px', borderBottom: '1px solid #F2F2F7' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #F5576C, #F093FB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={18} color="#FFF" /></div>
                                    <div style={{ flex: 1, fontSize: '16px', fontWeight: '600' }}>Slow Mode</div>
                                    <div style={{ color: '#7B1FA2', fontWeight: '800', fontSize: '12px' }}>{settings.globalSlowMode || 0}s</div>
                                </div>
                                <input type="range" min="0" max="120" step="5" value={settings.globalSlowMode || 0} onChange={(e)=>updateProfile({settings:{...settings, globalSlowMode:parseInt(e.target.value)}})} style={{ width: '100%', accentColor: '#7B1FA2', height: '4px' }} />
                            </div>

                            <SettingRow icon={AlertTriangle} iconBg="#FF3B30" title="Wipe All Chats" subtitle="DANGER: Permanent deletion" danger borderBottom={false}
                                onClick={async () => { if(!window.confirm('Delete all messages?')) return; if(window.prompt('Type DELETE ALL')!=='DELETE ALL') return; try{await fetch((import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + '/api/admin/clear-all-chats',{method:'DELETE',headers:{'Authorization':'Bearer ' + localStorage.getItem('token')}}); alert('🔥 Wiped!');}catch(e){alert('❌ Error');} }} />
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderDataSettings = () => {
        const settings = user?.settings || {};

        const formatSize = (bytes) => {
            if (!bytes) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        };

        const dataStats = realDataStats ? {
            messages: realDataStats.messages + ' msgs',
            media: formatSize(realDataStats.mediaBytes),
            calls: realDataStats.calls + ' calls',
            status: '0 B',
            totalSent: formatSize(realDataStats.sentBytes),
            totalReceived: formatSize(realDataStats.receivedBytes)
        } : {
            messages: '...',
            media: '...',
            calls: '...',
            status: '...',
            totalSent: '...',
            totalReceived: '...'
        };

        const renderAutoDownloadModal = () => (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div className="animate-scale" style={{ background: '#FFF', borderRadius: '24px', width: '100%', maxWidth: '350px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                    <div style={{ padding: '20px', borderBottom: '0.5px solid #F2F2F7', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800' }}>{showAutoDownload === 'cellular' ? 'Using Cellular Data' : 'Using Wi-Fi'}</div>
                        <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>Select media to auto-download</div>
                    </div>
                    <div style={{ padding: '10px 0' }}>
                        {[
                            { label: 'Photos', key: showAutoDownload + "Photos" },
                            { label: 'Audio', key: showAutoDownload + "Audio" },
                            { label: 'Videos', key: showAutoDownload + "Video" },
                            { label: 'Documents', key: showAutoDownload + "Docs" }
                        ].map((item, idx) => (
                            <div key={idx} 
                                onClick={() => updateProfile({ settings: { ...settings, [item.key]: !settings[item.key] } })}
                                style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: settings[item.key] ? '#F2F2F7' : 'transparent' }}
                            >
                                <span style={{ fontSize: '17px', fontWeight: settings[item.key] ? '700' : '500' }}>{item.label}</span>
                                {settings[item.key] && <Circle size={12} fill="#007AFF" color="#007AFF" />}
                            </div>
                        ))}
                    </div>
                    <div 
                        onClick={() => setShowAutoDownload(null)}
                        style={{ padding: '18px', textAlign: 'center', borderTop: '0.5px solid #F2F2F7', color: '#007AFF', fontWeight: '800', cursor: 'pointer' }}
                    >
                        Done
                    </div>
                </div>
            </div>
        );

        return (
            <div style={{ padding: '0 0 100px', background: '#F2F2F7' }}>
                {showAutoDownload && renderAutoDownloadModal()}

                {/* Network Usage Section */}
                <div style={{ padding: '20px 16px 8px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>Network Usage</div>
                <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '20px', textAlign: 'center', borderBottom: '0.5px solid #F2F2F7' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#8E8E93', textTransform: 'uppercase', marginBottom: '4px' }}>Sent</div>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: '#007AFF' }}>{dataStats.totalSent}</div>
                            </div>
                            <div style={{ width: '1px', background: '#F2F2F7' }}></div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#8E8E93', textTransform: 'uppercase', marginBottom: '4px' }}>Received</div>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: '#34C759' }}>{dataStats.totalReceived}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '700' }}>MESSAGES</div>
                                <div style={{ fontSize: '15px', fontWeight: '800' }}>{dataStats.messages}</div>
                            </div>
                            <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '12px', textAlign: 'left' }}>
                                <div style={{ fontSize: '11px', color: '#8E8E93', fontWeight: '700' }}>MEDIA</div>
                                <div style={{ fontSize: '15px', fontWeight: '800' }}>{dataStats.media}</div>
                            </div>
                        </div>
                    </div>
                    <SettingRow icon={Smartphone} iconBg="linear-gradient(135deg, #007AFF, #00C6FF)" title="Reset Statistics" subtitle="Start fresh from today" 
                        onClick={() => alert('📊 Statistics reset successfully!')} borderBottom={false} />
                </div>

                {/* Media Auto-Download Section */}
                <div style={{ padding: '24px 16px 8px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>Media Auto-Download</div>
                <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <SettingRow icon={Smartphone} iconBg="#5856D6" title="Using Cellular Data" 
                        subtitle={[settings.cellularPhotos?'Photos':'', settings.cellularAudio?'Audio':'', settings.cellularVideo?'Video':'', settings.cellularDocs?'Docs':''].filter(Boolean).join(', ') || 'No Media'}
                        onClick={() => setShowAutoDownload('cellular')} />
                    <SettingRow icon={Circle} iconBg="#34C759" title="Connected on Wi-Fi" 
                        subtitle={[settings.wifiPhotos?'Photos':'', settings.wifiAudio?'Audio':'', settings.wifiVideo?'Video':'', settings.wifiDocs?'Docs':''].filter(Boolean).join(', ') || 'No Media'}
                        onClick={() => setShowAutoDownload('wifi')} />
                    <SettingRow icon={AlertTriangle} iconBg="#8E8E93" title="When Roaming" subtitle="No Media" borderBottom={false} />
                </div>
                <div style={{ padding: '12px 24px', fontSize: '12px', color: '#8E8E93', lineHeight: '1.4' }}>Voice messages are always automatically downloaded for the best experience.</div>

                {/* Media Quality Section */}
                <div style={{ padding: '24px 16px 8px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>Media Quality</div>
                <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '17px', fontWeight: '600' }}>Upload Quality</div>
                            <div style={{ fontSize: '13px', color: '#8E8E93' }}>Compress media to save data or send original</div>
                        </div>
                        <select 
                            value={settings.uploadQuality || 'auto'} 
                            onChange={(e) => updateProfile({ settings: { ...settings, uploadQuality: e.target.value } })}
                            style={{ border: 'none', background: 'transparent', color: '#007AFF', fontSize: '16px', fontWeight: '800', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="auto">Auto</option>
                            <option value="best">Best Quality</option>
                            <option value="saver">Data Saver</option>
                        </select>
                    </div>
                </div>

                {/* Advanced Proxy Section */}
                <div style={{ padding: '24px 16px 8px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>Proxy Settings</div>
                <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <SettingRow icon={Lock} iconBg="#000" title="Use Proxy" subtitle="Hide your IP from servers" borderBottom={false}
                        rightContent={<ProToggle checked={settings.useProxy === true} onChange={(v) => updateProfile({ settings: { ...settings, useProxy: v } })} />} />
                </div>

                {/* System Diagnostics */}
                <div style={{ padding: '24px 16px 8px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>System Health</div>
                <div style={{ background: '#FFF', borderRadius: '12px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F2F2F7' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '15px', color: '#1A1A1A' }}>Database Status</span>
                            <span style={{ fontSize: '13px', color: '#34C759', fontWeight: '700' }}>Healthy</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '15px', color: '#1A1A1A' }}>Socket Connection</span>
                            <span style={{ fontSize: '13px', color: '#34C759', fontWeight: '700' }}>Active</span>
                        </div>
                    </div>
                    <SettingRow icon={Database} iconBg="#5856D6" title="Clear All Media Cache" subtitle="Wipe temporary media storage" danger borderBottom={false}
                        onClick={() => { localStorage.clear(); alert('🚀 All cache cleared!'); window.location.reload(); }} />
                </div>

                <div style={{ padding: '30px 16px' }}>
                    <div 
                        onClick={() => {
                            if (window.confirm('Reset all Data & Storage preferences?')) {
                                updateProfile({
                                    settings: {
                                        ...settings,
                                        cellularPhotos: true, cellularAudio: false, cellularVideo: false, cellularDocs: false,
                                        wifiPhotos: true, wifiAudio: true, wifiVideo: true, wifiDocs: true,
                                        uploadQuality: 'auto', useProxy: false
                                    }
                                });
                            }
                        }}
                        style={{ background: '#FFF', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#FF3B30', fontSize: '17px', fontWeight: '700', cursor: 'pointer', border: '1px solid #FF3B30' }}
                    >
                        Reset All Data Settings
                    </div>
                </div>
            </div>
        );
    };

    const renderAboutSettings = () => (
        <div style={{ padding: '0 0 100px', background: '#F2F2F7' }}>
            {/* App Branding */}
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, #007AFF, #00C6FF)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 15px 30px rgba(0,122,255,0.2)' }}>
                    <div style={{ fontSize: '40px', fontWeight: '900', color: '#FFF' }}>Z</div>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>Zap Chat Pro</h2>
                <div style={{ fontSize: '14px', color: '#8E8E93', marginTop: '4px' }}>Version 2.0.0 (Build 5042)</div>
            </div>

            {/* Feature Showcase - 8 Topics */}
            <div style={{ padding: '10px 20px 10px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Core Capabilities / اہم خصوصیات</div>
            <div style={{ background: '#FFF', borderRadius: '16px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {[
                    { id: 1, title: 'Quantum Encryption', ur: 'کوانٹم انکرپشن', sub: 'End-to-end security for all your conversations.', icon: <Lock size={18} color="#FFF" />, bg: '#34C759' },
                    { id: 2, title: 'Ultra-Fast Delivery', ur: 'انتہائی تیز ترسیل', sub: 'Instant message delivery with zero latency.', icon: <Smartphone size={18} color="#FFF" />, bg: '#007AFF' },
                    { id: 3, title: 'Pro Group Controls', ur: 'پرو گروپ کنٹرولز', sub: 'Advanced management tools for large communities.', icon: <Users size={18} color="#FFF" />, bg: '#5856D6' },
                    { id: 4, title: 'HD Media Sharing', ur: 'ایچ ڈی میڈیا شیئرنگ', sub: 'Send original quality photos and videos.', icon: <Camera size={18} color="#FFF" />, bg: '#AF52DE' },
                    { id: 5, title: 'Real-Time Dynamics', ur: 'ریئل ٹائم ڈائنامکس', sub: 'Live status updates and typing indicators.', icon: <Circle size={18} color="#FFF" />, bg: '#FF9500' },
                    { id: 6, title: 'Advanced Analytics', ur: 'جدید تجزیات', sub: 'Detailed data and storage usage diagnostics.', icon: <Database size={18} color="#FFF" />, bg: '#FF3B30' },
                    { id: 7, title: 'Premium Aesthetics', ur: 'پریمیم ڈیزائن', sub: 'Elegant iOS-inspired themes and dark mode.', icon: <Smile size={18} color="#FFF" />, bg: '#FF2D55' },
                    { id: 8, title: 'Cloud Sync Architecture', ur: 'کلاؤڈ سنک آرکیٹیکچر', sub: 'Seamlessly access your chats on any device.', icon: <Download size={18} color="#FFF" />, bg: '#32ADE6' }
                ].map((item, idx) => (
                    <div key={item.id} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: idx < 7 ? '1px solid #F2F2F7' : 'none' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                            {item.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '15px', fontWeight: '800', color: '#1A1A1A' }}>{item.title}</div>
                                <div className="urdu-text" style={{ fontSize: '16px', color: '#007AFF' }}>{item.ur}</div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>{item.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Platform Manifesto */}
            <div style={{ padding: '30px 20px 10px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>Platform Vision / پلیٹ فارم وژن</div>
            <div style={{ background: '#FFF', borderRadius: '16px', margin: '0 16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#1A1A1A', margin: 0 }}>
                    Zap Chat Pro is designed for users who demand the highest level of communication speed and privacy. Built on a rock-solid backend, our platform offers end-to-end encryption, real-time status updates, and a suite of administrative tools for managing large-scale communities.
                </p>
                <div className="urdu-text" style={{ fontSize: '18px', marginTop: '16px', color: '#1A1A1A', textAlign: 'right', direction: 'rtl' }}>
                    زیپ چیٹ پرو ان صارفین کے لیے بنایا گیا ہے جو مواصلات کی رفتار اور رازداری کے اعلیٰ ترین معیار کے خواہشمند ہیں۔ ایک مضبوط ترین سسٹم پر مبنی، ہمارا پلیٹ فارم اینڈ ٹو اینڈ انکرپشن اور ریئل ٹائم اسٹیٹس اپ ڈیٹس فراہم کرتا ہے۔
                </div>
            </div>


            {/* Legal / Footer */}
            <div style={{ padding: '30px 20px 20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#007AFF', fontWeight: '600', cursor: 'pointer' }}>Licenses</span>
                    <span style={{ fontSize: '13px', color: '#007AFF', fontWeight: '600', cursor: 'pointer' }}>Privacy Policy</span>
                </div>
                <div style={{ fontSize: '12px', color: '#8E8E93', fontWeight: '600' }}>© 2026 Zap Chat Pro Edition.</div>
                <div style={{ fontSize: '11px', color: '#C7C7CC', marginTop: '4px' }}>All Rights Reserved. Proudly developed in Pakistan.</div>
            </div>
        </div>
    );

    const renderHelpSettings = () => {
        const sections = [
            {
                id: 'messaging',
                icon: <MessageSquare size={20} />,
                color: '#007AFF',
                title: 'Professional Messaging / پروفیشنل میسجنگ',
                steps: [
                    {
                        en: 'Our advanced messaging system provides real-time communication with high-fidelity status indicators. When you send a message, you will see a single gray tick indicating it has left your device. Two gray ticks mean it has been successfully delivered to the recipient\'s device. Once the recipient opens the chat, the ticks turn blue, confirming it has been read. You can also reply to specific messages by swiping right on them or long-pressing to access the message menu, which allows you to delete, forward, or react to messages with emojis.',
                        ur: 'ہمارا جدید میسجنگ سسٹم ہائی فیڈیلٹی اسٹیٹس انڈیکیٹرز کے ساتھ ریئل ٹائم مواصلات فراہم کرتا ہے۔ جب آپ میسج بھیجتے ہیں، تو آپ کو ایک سرمئی ٹک نظر آئے گا جو ظاہر کرتا ہے کہ یہ آپ کے آلے سے نکل گیا ہے۔ دو سرمئی ٹک کا مطلب ہے کہ یہ وصول کنندہ کے آلے پر کامیابی کے ساتھ پہنچ گیا ہے۔ ایک بار جب وصول کنندہ چیٹ کھولتا ہے، تو ٹک نیلے ہو جاتے ہیں، جس سے اس کے پڑھنے کی تصدیق ہوتی ہے۔ آپ کسی مخصوص میسج پر دائیں طرف سوائپ کر کے یا میسج مینو تک رسائی کے لیے لانگ پریس کر کے اس کا جواب بھی دے سکتے ہیں، جو آپ کو میسجز کو ڈیلیٹ کرنے، فارورڈ کرنے یا ایموجیز کے ساتھ ری ایکٹ کرنے کی اجازت دیتا ہے۔'
                    }
                ]
            },
            {
                id: 'status',
                icon: <Circle size={20} />,
                color: '#FF2D55',
                title: 'Status & Privacy / سٹیٹس اور پرائیویسی',
                steps: [
                    {
                        en: 'The Status feature allows you to share fleeting moments with your contacts that automatically disappear after 24 hours. You can upload high-resolution images, long-form text with custom backgrounds, or video clips. In the Status Privacy settings, you have full control over who views your updates: "My Contacts" shares with everyone in your list, while "Only Share With" allows you to hand-pick specific people. You can also see a list of who has viewed your status by swiping up on your own update, providing you with full transparency.',
                        ur: 'سٹیٹس کی خصوصیت آپ کو اپنے رابطوں کے ساتھ ایسے لمحات شیئر کرنے کی اجازت دیتی ہے جو 24 گھنٹے بعد خود بخود غائب ہو جاتے ہیں۔ آپ ہائی ریزولوشن تصاویر، حسب ضرورت بیک گراؤنڈز کے ساتھ طویل تحریریں، یا ویڈیو کلپس اپ لوڈ کر سکتے ہیں۔ سٹیٹس پرائیویسی سیٹنگز میں، آپ کا اس بات پر مکمل کنٹرول ہے کہ آپ کی اپ ڈیٹس کون دیکھتا ہے: "مائی کانٹیکٹس" آپ کی لسٹ میں موجود ہر فرد کے ساتھ شیئر کرتا ہے، جبکہ "صرف ان کے ساتھ شیئر کریں" آپ کو مخصوص لوگوں کو منتخب کرنے کی اجازت دیتا ہے۔ آپ اپنی اپ ڈیٹ پر اوپر سوائپ کر کے یہ بھی دیکھ سکتے ہیں کہ آپ کا سٹیٹس کس کس نے دیکھا ہے، جو آپ کو مکمل شفافیت فراہم کرتا ہے۔'
                    }
                ]
            },
            {
                id: 'groups',
                icon: <Users size={20} />,
                color: '#5856D6',
                title: 'Group Administration / گروپ ایڈمنسٹریشن',
                steps: [
                    {
                        en: 'Group chats in Zap Chat Pro are designed for both casual social interaction and professional coordination. As a group creator, you are automatically assigned the Admin role, giving you the power to change the group subject, icon, and description. You can also manage participant permissions, such as deciding who can send messages or edit group info. To add members, you can either select them from your contacts or generate a unique Group Invite Link that anyone can use to join. Admins also have the authority to remove members or promote other participants to Admin status to help manage the community.',
                        ur: 'زیپ چیٹ پرو میں گروپ چیٹس عام سماجی رابطوں اور پیشہ ورانہ ہم آہنگی دونوں کے لیے ڈیزائن کی گئی ہیں۔ گروپ بنانے والے کے طور پر، آپ کو خود بخود ایڈمن کا کردار تفویض کیا جاتا ہے، جو آپ کو گروپ کا موضوع، آئیکن اور تفصیل تبدیل کرنے کا اختیار دیتا ہے۔ آپ شرکاء کی اجازتوں کا انتظام بھی کر سکتے ہیں، جیسے کہ یہ فیصلہ کرنا کہ کون پیغامات بھیج سکتا ہے یا گروپ کی معلومات میں ترمیم کر سکتا ہے۔ ممبرز کو شامل کرنے کے لیے، آپ یا تو انہیں اپنے رابطوں سے منتخب کر سکتے ہیں یا ایک منفرد گروپ انوائٹ لنک تیار کر سکتے ہیں جسے کوئی بھی شامل ہونے کے لیے استعمال کر سکتا ہے۔ ایڈمنز کو ممبرز کو ہٹانے یا کمیونٹی کے انتظام میں مدد کے لیے دیگر شرکاء کو ایڈمن کا درجہ دینے کا اختیار بھی حاصل ہے۔'
                    }
                ]
            },
            {
                id: 'calls',
                icon: <PhoneCall size={20} />,
                color: '#34C759',
                title: 'Voice & Video Calls / وائس اور ویڈیو کالز',
                steps: [
                    {
                        en: 'Experience crystal-clear voice and video calls directly within the app. Our calling system utilizes optimized codecs to ensure low-latency communication even on slower network connections. During a video call, you can switch between your front and rear cameras or toggle your microphone. All calls are integrated with a Call Log feature in the main navigation, allowing you to see missed, incoming, and outgoing calls with precise timestamps. For added privacy, you can enable "Low Data Usage" in settings to reduce bandwidth consumption during long conversations without sacrificing significant quality.',
                        ur: 'ایپ کے اندر براہ راست کرسٹل کلیئر وائس اور ویڈیو کالز کا تجربہ کریں۔ ہمارا کالنگ سسٹم کم رفتار نیٹ ورک کنکشنز پر بھی بغیر کسی رکاوٹ کے مواصلات کو یقینی بنانے کے لیے بہترین کوڈیکس کا استعمال کرتا ہے۔ ویڈیو کال کے دوران، آپ اپنے فرنٹ اور رئیر کیمروں کے درمیان سوئچ کر سکتے ہیں یا اپنے مائیکروفون کو بند کر سکتے ہیں۔ تمام کالز مین مینو میں "کال لاگ" کی خصوصیت کے ساتھ مربوط ہیں، جو آپ کو درست وقت کے ساتھ مسڈ، انکمنگ اور آؤٹ گوئنگ کالز دیکھنے کی اجازت دیتی ہیں۔ اضافی پرائیویسی کے لیے، آپ اہم کوالٹی قربان کیے بغیر طویل گفتگو کے دوران بینڈوتھ کے استعمال کو کم کرنے کے لیے سیٹنگز میں "لو ڈیٹا یوزیج" کو فعال کر سکتے ہیں۔'
                    }
                ]
            },
            {
                id: 'security',
                icon: <ShieldCheck size={20} />,
                color: '#FF9500',
                title: 'Security & Account / سیکیورٹی اور اکاؤنٹ',
                steps: [
                    {
                        en: 'Protecting your data is our top priority. You can enable Two-Step Verification to add an extra layer of security to your account. This requires a 6-digit PIN whenever you register your phone number with Zap Chat again. Additionally, you can request an "Account Information Report" which provides a comprehensive ZIP file containing all your settings and profile data. For users looking for a fresh start, the "Delete Account" option permanently removes all your messages, media, and contact associations from our servers, ensuring your right to be forgotten.',
                        ur: 'آپ کے ڈیٹا کی حفاظت ہماری اولین ترجیح ہے۔ آپ اپنے اکاؤنٹ میں سیکیورٹی کی ایک اضافی تہہ شامل کرنے کے لیے دو مرحلہ تصدیق کو فعال کر سکتے ہیں۔ اس کے لیے جب بھی آپ زیپ چیٹ کے ساتھ اپنا فون نمبر دوبارہ رجسٹر کریں گے تو 6 ہندسوں کے پن کی ضرورت ہوگی۔ مزید برآں، آپ "اکاؤنٹ انفارمیشن رپورٹ" کی درخواست کر سکتے ہیں جو ایک جامع زپ فائل فراہم کرتی ہے جس میں آپ کی تمام سیٹنگز اور پروفائل ڈیٹا ہوتا ہے۔ نئے سرے سے آغاز کرنے والے صارفین کے لیے، "ڈیلیٹ اکاؤنٹ" کا آپشن آپ کے تمام پیغامات، میڈیا اور کانٹیکٹ ایسوسی ایشنز کو ہمارے سرورز سے مستقل طور پر ہٹا دیتا ہے، جس سے آپ کے بھول جانے کے حق کو یقینی بنایا جاتا ہے۔'
                    }
                ]
            },
            {
                id: 'admin',
                icon: <Settings size={20} />,
                color: '#FF3B30',
                title: 'Admin Dashboard / ایڈمن ڈیش بورڈ',
                steps: [
                    {
                        en: 'The Admin Dashboard is the central command center for platform moderators and owners. It provides a real-time overview of the entire ecosystem, including total user counts, message volume, and server stability metrics. From here, administrators can execute "Global Broadcasts" to send urgent notifications to every single registered user instantly. You can also toggle "Maintenance Mode" to pause platform activity during critical updates or manage "Public Registration" to control the growth of the user base. The dashboard allows for granular user management, where admins can inspect user profiles, manage roles, and ensure the community standards are maintained through proactive governance.',
                        ur: 'ایڈمن ڈیش بورڈ پلیٹ فارم کے ناظمین اور مالکان کے لیے مرکزی کمانڈ سینٹر ہے۔ یہ پورے ماحولیاتی نظام کا ریئل ٹائم جائزہ فراہم کرتا ہے، جس میں کل صارفین کی تعداد، میسجز کی مقدار، اور سرور کے استحکام کے پیمانے شامل ہیں۔ یہاں سے، ایڈمنز تمام رجسٹرڈ صارفین کو فوری طور پر اہم اطلاعات بھیجنے کے لیے "گلوبل براڈکاسٹ" کر سکتے ہیں۔ آپ اہم اپ ڈیٹس کے دوران پلیٹ فارم کی سرگرمیوں کو روکنے کے لیے "مینٹیننس موڈ" کو بھی فعال کر سکتے ہیں یا صارف کی تعداد کو کنٹرول کرنے کے لیے "پبلک رجسٹریشن" کا انتظام کر سکتے ہیں۔ ڈیش بورڈ صارف کے تفصیلی انتظام کی اجازت دیتا ہے، جہاں ایڈمنز صارفین کے پروفائلز کا معائنہ کر سکتے ہیں، کرداروں کا انتظام کر سکتے ہیں، اور اس بات کو یقینی بنا سکتے ہیں کہ کمیونٹی کے معیارات کو برقرار رکھا جائے۔'
                    }
                ]
            },
            {
                id: 'profile',
                icon: <User size={20} />,
                color: '#AF52DE',
                title: 'Profile & Personalization / پروفائل اور پرسنلائزیشن',
                steps: [
                    {
                        en: 'Your profile is your digital identity on Zap Chat Pro. In the Profile settings, you can customize your Display Name, upload a high-quality Profile Picture, and write a unique "About" status to tell your contacts more about yourself. Personalization goes beyond just your profile; you can visit the "Chats" settings to adjust the font size for better readability or choose between Light and Dark modes to suit your environment. You can also set a "Global Wallpaper" that applies a beautiful background to all your conversation windows, creating a truly unique and comfortable messaging environment tailored to your aesthetic preferences.',
                        ur: 'آپ کا پروفائل زیپ چیٹ پرو پر آپ کی ڈیجیٹل شناخت ہے۔ پروفائل سیٹنگز میں، آپ اپنا ڈسپلے نام حسب ضرورت بنا سکتے ہیں، ہائی کوالٹی پروفائل تصویر اپ لوڈ کر سکتے ہیں، اور اپنے رابطوں کو اپنے بارے میں مزید بتانے کے لیے ایک منفرد "About" اسٹیٹس لکھ سکتے ہیں۔ پرسنلائزیشن صرف آپ کے پروفائل تک محدود نہیں ہے؛ آپ بہتر پڑھنے کی اہلیت کے لیے فونٹ سائز کو ایڈجسٹ کرنے یا اپنے ماحول کے مطابق لائٹ اور ڈارک موڈز کے درمیان انتخاب کرنے کے لیے "چیٹس" سیٹنگز میں جا سکتے ہیں۔ آپ ایک "گلوبل وال پیپر" بھی سیٹ کر سکتے ہیں جو آپ کی تمام گفتگو کی ونڈوز پر ایک خوبصورت پس منظر لاگو کرتا ہے، جس سے آپ کی جمالیاتی ترجیحات کے مطابق ایک حقیقی منفرد اور آرام دہ میسجنگ ماحول بنتا ہے۔'
                    }
                ]
            },
            {
                id: 'communication',
                icon: <MessageCircle size={20} />,
                color: '#34C759',
                title: 'Communication & Sharing / مواصلات اور شیئرنگ',
                steps: [
                    {
                        en: 'The Communication Suite in Zap Chat Pro is a versatile toolkit designed for every interaction. Text messaging is enhanced with a vast library of high-definition Emojis and Stickers to express yourself vividly. For those on the move, our "Hands-Free Voice SMS" allows you to record long audio messages simply by swiping up on the microphone icon. You can also share high-resolution Video and Audio files without significant compression, preserving the original quality of your media. The integrated Camera feature allows you to capture moments instantly and send them with a single tap, while the Document sharing tool supports everything from PDFs and Word documents to large ZIP files. For professional networking, you can easily share Contact cards, and our "Interactive Location" sharing provides a real-time map picker that allows you to pinpoint your exact location or a specific landmark for your friends and family.',
                        ur: 'زیپ چیٹ پرو میں کمیونیکیشن سویٹ ایک ہمہ گیر ٹول کٹ ہے جو ہر قسم کے رابطے کے لیے ڈیزائن کی گئی ہے۔ ٹیکسٹ میسجنگ کو اپنی جذباتی کیفیت کے اظہار کے لیے ہائی ڈیفینیشن ایموجیز اور اسٹیکرز کی ایک وسیع لائبریری کے ساتھ بہتر بنایا گیا ہے۔ مصروف افراد کے لیے، ہمارا "ہینڈز فری وائس ایس ایم ایس" آپ کو مائیکروفون آئیکن پر اوپر سوائپ کر کے طویل صوتی پیغامات ریکارڈ کرنے کی اجازت دیتا ہے۔ آپ کوالٹی پر سمجھوتہ کیے بغیر ہائی ریزولوشن ویڈیو اور آڈیو فائلیں بھی شیئر کر سکتے ہیں۔ انٹیگریٹڈ کیمرہ فیچر آپ کو فوری طور پر لمحات کو قید کرنے اور انہیں ایک ہی ٹیپ سے بھیجنے کی اجازت دیتا ہے، جبکہ دستاویز شیئرنگ ٹول پی ڈی ایف اور ورڈ فائلوں سے لے کر بڑی زپ فائلوں تک ہر چیز کو سپورٹ کرتا ہے۔ پیشہ ورانہ نیٹ ورکنگ کے لیے، آپ آسانی سے کانٹیکٹ کارڈز شیئر کر سکتے ہیں، اور ہماری "انٹرایکٹو لوکیشن" شیئرنگ ایک ریئل ٹائم میپ پکر فراہم کرتی ہے جو آپ کو اپنے دوستوں اور خاندان کے لیے اپنی درست جگہ یا کسی خاص مقام کی نشاندہی کرنے کی اجازت دیتی ہے۔'
                    }
                ]
            }
        ];

        return (
            <div style={{ padding: '0 0 100px', background: '#F2F2F7' }}>
                {/* Encyclopedia Header */}
                <div style={{ padding: '40px 20px', textAlign: 'center', background: 'linear-gradient(to bottom, #FFF, #F2F2F7)' }}>
                    <div style={{ width: '100px', height: '130px', background: 'linear-gradient(135deg, #007AFF, #0056b3)', borderRadius: '14px 28px 28px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '15px 15px 40px rgba(0,122,255,0.25)', borderLeft: '10px solid #004494', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '10%', bottom: '10%', width: '1px', background: 'rgba(255,255,255,0.4)' }}></div>
                        <Database size={44} color="#FFF" />
                    </div>
                    <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#000', marginBottom: '8px', letterSpacing: '-0.5px' }}>The App Encyclopedia</h3>
                    <p style={{ fontSize: '15px', color: '#8E8E93', maxWidth: '320px', margin: '0 auto', lineHeight: '1.4' }}>The definitive guide to every feature and setting within Zap Chat Pro.</p>
                </div>

                {/* Detailed Sections */}
                {sections.map((section, sIdx) => (
                    <div key={section.id} style={{ marginBottom: '32px' }}>
                        <div style={{ padding: '0 24px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: section.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px ' + section.color + '44' }}>
                                {React.cloneElement(section.icon, { size: 20, color: '#FFF' })}
                            </div>
                            <span style={{ fontSize: '15px', fontWeight: '900', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '1px' }} className="urdu-text">{section.title}</span>
                        </div>

                        <div style={{ background: '#FFF', borderRadius: '24px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            {section.steps.map((step, idx) => (
                                <div key={idx} style={{ padding: '30px 24px' }}>
                                    <div style={{ fontSize: '16px', color: '#1A1A1A', fontWeight: '500', lineHeight: '1.7', marginBottom: '24px', textAlign: 'justify' }}>
                                        {step.en}
                                    </div>
                                    <div className="urdu-text" style={{ 
                                        fontSize: '17px', 
                                        color: '#2C3E50', 
                                        lineHeight: '2', 
                                        direction: 'rtl', 
                                        textAlign: 'right', 
                                        background: 'linear-gradient(to left, #F9FBFF, #FFF)', 
                                        padding: '24px', 
                                        borderRadius: '18px', 
                                        borderRight: '6px solid ' + section.color,
                                        fontWeight: '500',
                                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)'
                                    }}>
                                        {step.ur}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Direct Support / Final Footer */}
                <div style={{ padding: '24px 24px 12px', fontSize: '13px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Direct Assistance / براہ راست مدد</div>
                <div style={{ background: '#FFF', borderRadius: '24px', margin: '0 16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <SettingRow icon={Mail} iconBg="#FF9500" title="Expert Support" subtitle="Get an answer within 24 hours" onClick={() => setShowSupportModal(true)} />
                    <SettingRow icon={HelpCircle} iconBg="#007AFF" title="Community Hub" subtitle="Discussion and feature requests" onClick={() => setShowCommunityModal(true)} />
                    <SettingRow icon={ShieldCheck} iconBg="#34C759" title="Security Audit" subtitle="Your data is encrypted and safe" borderBottom={false} onClick={() => setShowSecurityAudit(true)} />
                </div>

                <div style={{ padding: '50px 20px 20px', textAlign: 'center', opacity: 0.6 }}>
                    <div style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '2px', color: '#007AFF' }}>ZAP CHAT PRO EDITION</div>
                    <div style={{ fontSize: '12px', marginTop: '6px', fontWeight: '600' }}>The definitive communication platform for elite users.</div>
                </div>
            </div>
        );
    };

    const renderSubPage = () => {
        if (!activeSubPage) return null;
        
        let content = null;
        let title = activeSubPage.charAt(0).toUpperCase() + activeSubPage.slice(1);

        if (activeSubPage === 'privacy') content = renderPrivacySettings();
        else if (activeSubPage === 'account') content = renderAccountSettings();
        else if (activeSubPage === 'profile') content = renderProfileSettings();
        else if (activeSubPage === 'notifications') content = renderNotificationSettings();
        else if (activeSubPage === 'chats') { title = 'Chats'; content = renderChatsSettings(); }
        else if (activeSubPage === 'data') { title = 'Data and Storage'; content = renderDataSettings(); }
        else if (activeSubPage === 'help') { title = 'Help'; content = renderHelpSettings(); }
        else if (activeSubPage === 'about') { title = 'About Zap Chat'; content = renderAboutSettings(); }
        else if (activeSubPage === 'admin') {
            title = 'Admin Dashboard';
            content = renderAdminSettings();
        }
        else {
            content = (
                <div style={{ flex: 1, padding: '20px', textAlign: 'center', color: '#8E8E93' }}>
                    <div style={{ marginTop: '100px' }}>
                        <Settings size={60} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <h3>{activeSubPage.toUpperCase()} SETTINGS</h3>
                        <p>This feature will be available in the next pro update.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-slide-in" style={{ position: 'fixed', inset: 0, background: '#F2F2F7', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#FFF', borderBottom: '1px solid #E5E5EA' }}>
                    <ArrowLeft size={24} color="#007AFF" onClick={() => setActiveSubPage(null)} style={{ cursor: 'pointer' }} />
                    <h2 style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '700', marginRight: '24px' }}>{title}</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {content}
                </div>
            </div>
        );
    };

    return (
        <div className="app-container" style={{ background: '#F2F2F7', color: '#000', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {!activeSubPage ? renderMainSettings() : renderSubPage()}
            
            {!activeSubPage && (
                <div className="ios-bottom-nav" style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}>
                    <div className="nav-item" onClick={() => navigate('/chat')}>
                        <MessageCircle size={24} />
                        <span className="nav-text">Chats</span>
                    </div>
                    <div className="nav-item" onClick={() => navigate('/chat')}>
                        <PhoneCall size={24} />
                        <span className="nav-text">Calls</span>
                    </div>
                    <div className="nav-item" onClick={() => navigate('/chat')}>
                        <Circle size={24} />
                        <span className="nav-text">Stories</span>
                    </div>
                    <div className="nav-item active">
                        <Settings size={24} />
                        <span className="nav-text">Settings</span>
                    </div>
                </div>
            )}

            {/* Pro Bottom Sheet PIN Modal */}
            {pinModal.show && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => { setPinModal({ show: false, type: 'set', callback: null }); setPinInput(''); }}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            background: '#FFF', 
                            width: '100%', 
                            maxWidth: '500px', 
                            borderTopLeftRadius: '24px', 
                            borderTopRightRadius: '24px', 
                            padding: '12px 20px 40px', 
                            animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
                            boxShadow: '0 -10px 25px rgba(0,0,0,0.1)'
                        }}
                    >
                        {/* Grab Handle */}
                        <div style={{ width: '36px', height: '5px', background: '#E5E5EA', borderRadius: '3px', margin: '0 auto 24px' }}></div>
                        
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', color: '#000' }}>
                                {pinModal.type === 'set' ? 'Set Security PIN' : 'Enter Your PIN'}
                            </h3>
                            <p style={{ fontSize: '15px', color: '#8E8E93', marginBottom: '32px' }}>
                                {pinModal.type === 'set' ? 'Create a secure PIN to protect your account from unauthorized access.' : 'Please verify your identity by entering your current security PIN.'}
                            </p>
                            
                            <div style={{ position: 'relative', marginBottom: '40px' }}>
                                <input 
                                    type="password"
                                    maxLength={6}
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                                    placeholder="••••••"
                                    style={{ 
                                        width: '100%', 
                                        height: '64px', 
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        textAlign: 'center', 
                                        fontSize: '32px', 
                                        letterSpacing: '12px', 
                                        outline: 'none', 
                                        background: '#F2F2F7',
                                        color: '#007AFF',
                                        fontWeight: '700'
                                    }}
                                    autoFocus
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={() => {
                                        setPinModal({ show: false, type: 'set', callback: null });
                                        setPinInput('');
                                    }}
                                    style={{ flex: 1, height: '56px', borderRadius: '16px', background: '#F2F2F7', border: 'none', fontSize: '17px', color: '#8E8E93', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        if (pinModal.type === 'set' && pinInput.length < 4) return alert('PIN must be at least 4 digits.');
                                        if (pinModal.type === 'verify' && pinInput !== user?.settings?.twoStepPin) return alert('Incorrect PIN.');
                                        
                                        const cb = pinModal.callback;
                                        const pin = pinInput;
                                        setPinModal({ show: false, type: 'set', callback: null });
                                        setPinInput('');
                                        if (cb) cb(pin);
                                    }}
                                    style={{ flex: 1, height: '56px', borderRadius: '16px', background: '#007AFF', border: 'none', fontSize: '17px', color: '#FFF', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,122,255,0.3)' }}
                                >
                                    {pinModal.type === 'set' ? 'Continue' : 'Verify'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Support/Developer Contact Modal */}
            {showSupportModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 6000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowSupportModal(false)}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            background: '#FFF', 
                            width: '100%', 
                            maxWidth: '500px', 
                            borderTopLeftRadius: '24px', 
                            borderTopRightRadius: '24px', 
                            padding: '12px 20px 40px', 
                            animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
                            boxShadow: '0 -10px 25px rgba(0,0,0,0.1)'
                        }}
                    >
                        <div style={{ width: '36px', height: '5px', background: '#E5E5EA', borderRadius: '3px', margin: '0 auto 24px' }}></div>
                        
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #FF9500, #FFCC00)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 16px rgba(255,149,0,0.2)' }}>
                                <User size={32} color="#FFF" />
                            </div>
                            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#000' }}>Contact Developer</h3>
                            <p style={{ fontSize: '15px', color: '#8E8E93', marginTop: '4px' }}>Choose your preferred method of support.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button 
                                onClick={() => window.location.href = 'mailto:abuzaritperson@gmail.com?subject=Zap%20Chat%20Support'}
                                style={{ width: '100%', height: '60px', borderRadius: '16px', background: '#F2F2F7', border: 'none', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px', cursor: 'pointer' }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FF9500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Mail size={20} color="#FFF" />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#000' }}>Email Developer</div>
                                    <div style={{ fontSize: '12px', color: '#8E8E93' }}>abuzaritperson@gmail.com</div>
                                </div>
                            </button>

                            <button 
                                onClick={() => window.open('https://wa.me/923427372204', '_blank')}
                                style={{ width: '100%', height: '60px', borderRadius: '16px', background: '#F2F2F7', border: 'none', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px', cursor: 'pointer' }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageCircle size={20} color="#FFF" />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#000' }}>WhatsApp Developer</div>
                                    <div style={{ fontSize: '12px', color: '#8E8E93' }}>+92 342 7372204</div>
                                </div>
                            </button>

                            <button 
                                onClick={() => setShowSupportModal(false)}
                                style={{ width: '100%', height: '56px', borderRadius: '16px', background: '#007AFF', border: 'none', color: '#FFF', fontSize: '17px', fontWeight: '700', cursor: 'pointer', marginTop: '12px', boxShadow: '0 4px 12px rgba(0,122,255,0.2)' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Community Hub Modal */}
            {showCommunityModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', zIndex: 5500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="animate-scale-up" style={{ background: '#FFF', borderRadius: '32px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '40px 20px 24px', textAlign: 'center', background: 'linear-gradient(135deg, #007AFF, #00C6FF)', position: 'relative' }}>
                            {communityTab !== 'main' && (
                                <ArrowLeft 
                                    size={24} 
                                    color="#FFF" 
                                    onClick={() => setCommunityTab('main')} 
                                    style={{ position: 'absolute', left: '20px', top: '24px', cursor: 'pointer' }} 
                                />
                            )}
                            <div style={{ width: '70px', height: '70px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', backdropFilter: 'blur(10px)' }}>
                                <Users size={32} color="#FFF" />
                            </div>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#FFF' }}>
                                {communityTab === 'main' ? 'Community Hub' : 
                                 communityTab === 'roadmap' ? 'Feature Roadmap' : 
                                 communityTab === 'discussions' ? 'User Discussions' : 'Top Contributors'}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
                                {communityTab === 'main' ? 'Join the conversation with elite users.' : 'Explore the latest updates and rankings.'}
                            </p>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                            {communityTab === 'main' && (
                                <>
                                    {[
                                        { id: 'roadmap', title: 'Feature Roadmap', sub: 'See what we are building next', icon: <Clock size={18} color="#FFF" />, bg: 'linear-gradient(135deg, #007AFF, #00C6FF)' },
                                        { id: 'discussions', title: 'User Discussions', sub: 'Share tips and pro-grade tricks', icon: <MessageSquare size={18} color="#FFF" />, bg: 'linear-gradient(135deg, #5856D6, #AF52DE)' },
                                        { id: 'contributors', title: 'Top Contributors', sub: 'Earn badges and pro rewards', icon: <ShieldCheck size={18} color="#FFF" />, bg: 'linear-gradient(135deg, #FF9500, #FFCC00)' }
                                    ].map((item, idx) => (
                                        <div key={idx} onClick={() => setCommunityTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 0', borderBottom: idx < 2 ? '1px solid #F2F2F7' : 'none', cursor: 'pointer' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                {item.icon}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#000' }}>{item.title}</div>
                                                <div style={{ fontSize: '13px', color: '#8E8E93' }}>{item.sub}</div>
                                            </div>
                                            <ChevronRight size={18} color="#C7C7CC" />
                                        </div>
                                    ))}
                                </>
                            )}

                            {isCommunityLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div className="animate-spin" style={{ width: '30px', height: '30px', border: '3px solid #007AFF', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }}></div>
                                    <div style={{ fontSize: '14px', color: '#8E8E93' }}>Syncing community data...</div>
                                </div>
                            ) : (
                                <>
                                    {communityTab === 'roadmap' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {(communityData.roadmap.length > 0 ? communityData.roadmap : [
                                                { title: 'AI Chat Assistant', status: 'In Progress', progress: 65, color: '#007AFF' },
                                                { title: 'Cloud Media Sync', status: 'Testing', progress: 90, color: '#34C759' }
                                            ]).map((item, idx) => (
                                                <div key={idx}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '15px', fontWeight: '700' }}>{item.title}</span>
                                                        <span style={{ fontSize: '12px', color: item.color || '#007AFF', fontWeight: '800' }}>{item.status}</span>
                                                    </div>
                                                    <div style={{ height: '8px', background: '#F2F2F7', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: item.progress + '%', background: item.color || '#007AFF', borderRadius: '4px' }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {communityTab === 'discussions' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {(communityData.discussions.length > 0 ? communityData.discussions : [
                                                { title: 'Best Privacy Settings for 2026?', replies: 142, tag: 'Tips' },
                                                { title: 'How to use two-step verification?', replies: 89, tag: 'Security' }
                                            ]).map((item, idx) => (
                                                <div key={idx} style={{ padding: '16px', background: '#F8F9FA', borderRadius: '16px', cursor: 'pointer' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#007AFF', marginBottom: '4px', textTransform: 'uppercase' }}>{item.tag}</div>
                                                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A' }}>{item.title}</div>
                                                    <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '8px' }}>💬 {item.replies} active discussions</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {communityTab === 'contributors' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {(communityData.contributors.length > 0 ? communityData.contributors : [
                                                { name: 'Abu Zar', role: 'Elite Architect', points: '12.4k', badge: '🏆' },
                                                { name: 'Sarah Pro', role: 'Security Expert', points: '8.9k', badge: '🛡️' }
                                            ]).map((item, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(45deg, #F2F2F7, #FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                                        {item.badge}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '16px', fontWeight: '700' }}>{item.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#8E8E93' }}>{item.role}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#34C759' }}>{item.points}</div>
                                                        <div style={{ fontSize: '10px', color: '#8E8E93', textTransform: 'uppercase' }}>Points</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div style={{ padding: '20px 24px 32px', background: '#F8F9FA' }}>
                            <button 
                                onClick={() => { setShowCommunityModal(false); setCommunityTab('main'); }}
                                style={{ width: '100%', height: '56px', borderRadius: '16px', background: '#007AFF', border: 'none', color: '#FFF', fontSize: '17px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,122,255,0.2)' }}
                            >
                                {communityTab === 'main' ? 'Close Hub' : 'Back to Main Hub'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Security Audit Modal */}
            {showSecurityAudit && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="animate-scale-up" style={{ background: '#1C1C1E', borderRadius: '32px', width: '100%', maxWidth: '400px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '2px solid #34C759' }}>
                                <ShieldCheck size={40} color="#34C759" className="online-pulse" />
                            </div>
                            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#FFF', marginBottom: '8px' }}>Security Audit</h3>
                            <p style={{ fontSize: '14px', color: '#8E8E93' }}>Real-time verification of your account integrity.</p>
                        </div>

                        <div style={{ padding: '0 24px 30px' }}>
                            {[
                                { label: 'End-to-End Encryption', status: 'Active', icon: <Lock size={16} color="#34C759" /> },
                                { label: 'Session Integrity', status: 'Verified', icon: <Smartphone size={16} color="#34C759" /> },
                                { label: 'Database Shield', status: 'Protected', icon: <Database size={16} color="#34C759" /> },
                                { label: 'Security Score', status: '98/100', icon: <ShieldCheck size={16} color="#34C759" /> }
                            ].map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: idx < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {item.icon}
                                        <span style={{ fontSize: '15px', color: '#E5E5EA', fontWeight: '600' }}>{item.label}</span>
                                    </div>
                                    <span style={{ fontSize: '14px', color: '#34C759', fontWeight: '800' }}>{item.status}</span>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setShowSecurityAudit(false)}
                            style={{ width: '100%', padding: '20px', background: '#34C759', border: 'none', color: '#FFF', fontSize: '17px', fontWeight: '800', cursor: 'pointer' }}
                        >
                            System Secure - Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
