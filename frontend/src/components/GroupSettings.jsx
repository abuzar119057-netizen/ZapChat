import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Camera, Users, UserPlus, Shield, ShieldOff, Crown, LogOut, Trash2, 
  Link, Copy, RefreshCw, Bell, BellOff, Star, Pin, MessageCircle, Lock, 
  ChevronRight, Check, X, Clock, Megaphone, Edit2, UserMinus, Search,
  MessageSquare, Mic, Image as ImageIcon, File, Smile, CornerUpLeft, Navigation,
  EyeOff, AlertTriangle, MessageCircleOff, ShieldAlert, Key, Edit3, MonitorOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const GroupSettings = ({ group, onClose, onGroupUpdated }) => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [activeSection, setActiveSection] = useState('main'); // main, members, addMember, permissions, invite
  const [groupData, setGroupData] = useState(group);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [newName, setNewName] = useState(group?.name || '');
  const [newDesc, setNewDesc] = useState(group?.description || '');
  const [inviteLink, setInviteLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starredMessages, setStarredMessages] = useState([]);
  const [pinnedMessagesList, setPinnedMessagesList] = useState([]);
  const [muteOption, setMuteOption] = useState('off');
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const pendingChangesRef = useRef({}); // Track { key: timestamp } to prevent snap-back


  const isAdmin = groupData?.admins?.some(a => (a._id || a) === user?._id);
  const token = localStorage.getItem('token');
  const API = `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/groups`;

  // Fetch fresh group data
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`${API}/${group._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setGroupData(data);
        setPinnedMessagesList(data.pinnedMessages || []);
      } catch (err) {
        console.error('Fetch group failed:', err);
      }
    };
    fetchGroup();
  }, [group?._id]);

  // Sync with prop updates (socket feedback - handled by internal state once panel is open)
  // useEffect(() => {
  //   if (group) setGroupData(group);
  // }, [group]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const handleUpdated = (data) => { if (data._id === group._id) setGroupData(data); };
    const handleSettings = ({ groupId, settings }) => {
      if (groupId === group._id) {
          setGroupData(prev => {
              const newSettings = { ...settings };
              // Respect pending local changes (don't let socket overwrite us for 3 seconds)
              Object.keys(pendingChangesRef.current).forEach(key => {
                  if (Date.now() - pendingChangesRef.current[key] < 3000) {
                      newSettings[key] = prev.settings?.[key];
                  }
              });
              return { ...prev, settings: newSettings };
          });
      }
    };
    socket.on('group_updated', handleUpdated);
    socket.on('group_settings_updated', handleSettings);
    return () => {
      socket.off('group_updated', handleUpdated);
      socket.off('group_settings_updated', handleSettings);
    };
  }, [socket, group?._id]);

  if (!group) return null;

  const apiCall = async (url, method = 'PUT', body = null) => {
    setLoading(true);
    try {
      const opts = {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      const data = await res.json();
      setLoading(false);
      return { ok: res.ok, data };
    } catch (err) {
      setLoading(false);
      console.error('API call failed:', err);
      return { ok: false, data: { message: err.message } };
    }
  };

  const handleUpdateInfo = async () => {
    const res = await apiCall(`${API}/${group._id}/update-info`, 'PUT', { name: newName, description: newDesc });
    if (res.ok) {
      setGroupData(res.data);
      setEditingName(false);
      setEditingDesc(false);
      onGroupUpdated?.();
    }
  };

  const handleToggleSetting = async (key, value) => {
    if (!isAdmin) return;
    
    // Lock this key to prevent socket snap-back
    pendingChangesRef.current[key] = Date.now();
    
    // Optimistic Update for "Workability"
    setGroupData(prev => ({
        ...prev,
        settings: {
            ...prev.settings,
            [key]: value
        }
    }));

    const res = await apiCall(`${API}/${group._id}/settings`, 'PUT', { [key]: value });

    // Keep it locked for a short bit even after success to allow socket propagation to settle
    setTimeout(() => {
        delete pendingChangesRef.current[key];
    }, 2000);

    if (!res.ok) {
        console.error("Setting update failed:", res.data?.message);
        // Rollback on failure
        const fresh = await fetch(`${API}/${group._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        setGroupData(await fresh.json());
    } else {
        onGroupUpdated?.();
    }
  };

  const handleCycleSetting = async (key, opt1, opt2) => {
    if (!isAdmin) return;
    const current = groupData.settings?.[key] || opt1;
    await handleToggleSetting(key, current === opt1 ? opt2 : opt1);
  };

  const handleAddMember = async (userId) => {
    const res = await apiCall(`${API}/${group._id}/add-member`, 'PUT', { userId });
    if (res.ok) {
      const fresh = await fetch(`${API}/${group._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      setGroupData(await fresh.json());
      onGroupUpdated?.();
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    const res = await apiCall(`${API}/${group._id}/remove-member`, 'PUT', { userId });
    if (res.ok) {
      setGroupData(prev => ({
        ...prev,
        members: prev.members.filter(m => (m._id || m) !== userId)
      }));
      onGroupUpdated?.();
    }
  };

  const handleMakeAdmin = async (userId) => {
    if (groupData.admins && groupData.admins.length >= 3) {
      alert("A maximum of 3 admins can be added to the group.");
      return;
    }
    await apiCall(`${API}/${group._id}/make-admin`, 'PUT', { userId });
    const fresh = await fetch(`${API}/${group._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    setGroupData(await fresh.json());
    onGroupUpdated?.();
  };

  const handleRemoveAdmin = async (userId) => {
    await apiCall(`${API}/${group._id}/remove-admin`, 'PUT', { userId });
    const fresh = await fetch(`${API}/${group._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    setGroupData(await fresh.json());
    onGroupUpdated?.();
  };

  const handleLeave = async () => {
    if (!window.confirm(`Leave "${groupData.name}"?`)) return;
    const res = await apiCall(`${API}/${group._id}/leave`, 'PUT');
    if (res.ok) { onClose(); window.location.reload(); }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(`Delete "${groupData.name}" permanently? All messages will be lost.`)) return;
    const res = await apiCall(`${API}/${group._id}`, 'DELETE');
    if (res.ok) { onClose(); window.location.reload(); }
  };

  const handleGenerateInvite = async () => {
    const res = await apiCall(`${API}/${group._id}/invite-link`, 'POST');
    if (res.ok) setInviteLink(`http://localhost:5173/join/${res.data.inviteCode}`);
  };

  const handleRevokeInvite = async () => {
    await apiCall(`${API}/${group._id}/invite-link`, 'DELETE');
    setInviteLink('');
  };

  const handleMute = async (duration) => {
    await apiCall(`${API}/${group._id}/mute`, 'PUT', { duration });
    setMuteOption(duration);
    setShowMuteMenu(false);
  };

  const handleSearchMembers = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/contacts/search?q=${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const memberIds = groupData.members?.map(m => m._id || m) || [];
      setSearchResults(data.filter(u => !memberIds.includes(u._id)));
    } catch (err) { console.error(err); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const SectionHeader = ({ title, onBack }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderBottom: '1px solid #E5E5EA', background: '#FFF' }}>
      <ArrowLeft size={24} color="#007AFF" style={{ cursor: 'pointer' }} onClick={onBack} />
      <h2 style={{ fontSize: '17px', fontWeight: '700', flex: 1 }}>{title}</h2>
    </div>
  );

  const SettingRow = ({ icon: Icon, title, subtitle, onClick, rightContent, color = '#007AFF', danger = false }) => (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', cursor: onClick ? 'pointer' : 'default', borderBottom: '0.5px solid #F2F2F7' }}
      onClick={onClick}
    >
      {Icon && (
        <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: danger ? '#FF3B30' : color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color="#FFF" />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', color: danger ? '#FF3B30' : '#000', fontWeight: '500' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>{subtitle}</div>}
      </div>
      {rightContent || (onClick && <ChevronRight size={18} color="#C7C7CC" />)}
    </div>
  );

  const ToggleSwitch = ({ value, onChange }) => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isAdmin) onChange(!value);
      }}
      style={{
        width: '51px', height: '31px', borderRadius: '16px',
        background: value ? '#34C759' : '#e9e9eb',
        position: 'relative', cursor: isAdmin ? 'pointer' : 'not-allowed', transition: 'background 0.2s', flexShrink: 0, opacity: isAdmin ? 1 : 0.5
      }}
    >
      <div style={{
        position: 'absolute', top: '2px', left: value ? '22px' : '2px',
        width: '27px', height: '27px', background: '#FFF', borderRadius: '50%',
        boxShadow: '0 3px 8px rgba(0,0,0,0.15)', transition: 'left 0.2s'
      }} />
    </div>
  );

  // ─── ADD MEMBER SECTION ───
  if (activeSection === 'addMember') {
    return (
      <div style={{ width: '100%', flex: 1, height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Add Participants" onBack={() => setActiveSection('members')} />
        <div style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: '#8E8E93' }} />
            <input
              type="text" placeholder="Search contacts..."
              value={searchQuery} onChange={(e) => handleSearchMembers(e.target.value)}
              style={{ width: '100%', height: '38px', background: '#FFF', border: '1px solid #E5E5EA', borderRadius: '10px', padding: '0 12px 0 40px', fontSize: '15px', outline: 'none' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {searchResults.map(u => (
            <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 20px', cursor: 'pointer', borderBottom: '0.5px solid #F2F2F7', background: '#FFF' }} onClick={() => handleAddMember(u._id)}>
              <img src={u.profilePicture ? (u.profilePicture.startsWith('http') ? u.profilePicture : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/${u.profilePicture}?token=${token}`) : (import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(u.displayName || '') + "&background=random&color=fff"} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{u.displayName}</div>
                <div style={{ fontSize: '13px', color: '#8E8E93' }}>{u.email}</div>
              </div>
              <UserPlus size={20} color="#007AFF" />
            </div>
          ))}
          {searchQuery && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8E8E93' }}>No contacts found</div>
          )}
        </div>
      </div>
    );
  }

  // ─── MEMBERS SECTION ───
  if (activeSection === 'members') {
    return (
      <div style={{ width: '100%', flex: 1, height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title={`${groupData.members?.length || 0} Participants`} onBack={() => setActiveSection('main')} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isAdmin && (
            <div style={{ background: '#FFF', marginBottom: '8px' }}>
              <SettingRow icon={UserPlus} title="Add Participants" color="#34C759" onClick={() => setActiveSection('addMember')} />
            </div>
          )}
          <div style={{ background: '#FFF' }}>
            {groupData.settings?.hideMemberList && !isAdmin ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8E8E93' }}>
                    <EyeOff size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#000', marginBottom: '4px' }}>Member list is hidden</div>
                    <div style={{ fontSize: '14px' }}>Only admins can see who's in this group for privacy.</div>
                </div>
            ) : groupData.members?.map(member => {
              const memberId = member._id || member;
              const memberIsAdmin = groupData.admins?.some(a => (a._id || a) === memberId);
              const isMe = memberId === user._id;
              const isOnline = onlineUsers[memberId]?.status === 'online';

              return (
                <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 20px', borderBottom: '0.5px solid #F2F2F7' }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={member.profilePicture ? (member.profilePicture.startsWith('http') ? member.profilePicture : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/${member.profilePicture}?token=${token}`) : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/avatar?name=${member.displayName || 'U'}&background=random&color=fff`}
                      style={{ width: '44px', height: '44px', borderRadius: '50%' }} alt=""
                    />
                    {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: '#34C759', borderRadius: '50%', border: '2px solid #FFF' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>{isMe ? 'You' : (member.displayName || 'User')}</div>
                    <div style={{ fontSize: '13px', color: '#8E8E93' }}>{isOnline ? 'online' : 'offline'}</div>
                  </div>
                  {memberIsAdmin && (
                    <span style={{ fontSize: '11px', color: '#34C759', border: '1px solid #34C759', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>Admin</span>
                  )}
                  {isAdmin && !isMe && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!memberIsAdmin ? (
                        <div title="Make Admin" onClick={() => handleMakeAdmin(memberId)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F0F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Crown size={16} color="#007AFF" />
                        </div>
                      ) : (
                        <div title="Remove Admin" onClick={() => handleRemoveAdmin(memberId)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <ShieldOff size={16} color="#FF9500" />
                        </div>
                      )}
                      <div title="Remove" onClick={() => handleRemoveMember(memberId)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <UserMinus size={16} color="#FF3B30" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── PERMISSIONS SECTION ───
  if (activeSection === 'permissions') {
    return (
      <div style={{ width: '100%', flex: 1, height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Group Permissions" onBack={() => setActiveSection('main')} />
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}>
          
          <div style={{ padding: '16px 20px 8px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>MESSAGING</div>
          <div style={{ background: '#FFF', marginBottom: '16px' }}>
            <SettingRow 
              icon={MessageSquare} title="Only admins can send messages" 
              subtitle={groupData.settings?.messagingRestricted ? 'Enabled — members can only read' : 'Disabled — everyone can send'}
              rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.messagingRestricted} onChange={(v) => handleToggleSetting('messagingRestricted', v)} />} 
            />
          </div>

          <div style={{ padding: '16px 20px 8px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>GROUP INFO</div>
          <div style={{ background: '#FFF', marginBottom: '16px' }}>
            <SettingRow 
              icon={Edit2} title="Only admins can edit group info" 
              subtitle={groupData.settings?.editInfoRestricted ? 'Restricted to admins' : 'All members can edit'}
              rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.editInfoRestricted} onChange={(v) => handleToggleSetting('editInfoRestricted', v)} />} 
            />
          </div>

          <div style={{ padding: '16px 20px 8px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>ADVANCED & MODERATION</div>
          <div style={{ background: '#FFF', marginBottom: '16px' }}>
            <SettingRow 
              icon={Megaphone} title="Announcement Mode" 
              subtitle="Only admins can send, members receive as announcements"
              rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.announcementMode} onChange={(v) => handleToggleSetting('announcementMode', v)} />} 
            />
            <SettingRow 
                icon={Clock} title="Slow Mode (Anti-Spam)" 
                subtitle={groupData.settings?.slowMode > 0 ? `Active: 1 message per ${groupData.settings.slowMode}s` : 'Disabled — no time limit'} 
                rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.slowMode > 0} onChange={(v) => handleToggleSetting('slowMode', v ? 30 : 0)} />} 
            />
            <SettingRow 
                icon={AlertTriangle} title="Auto-Delete Bad Words" 
                subtitle="Automatically filters profanity" 
                rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.autoFilterBadWords} onChange={(v) => handleToggleSetting('autoFilterBadWords', v)} />} 
            />
            <SettingRow 
                icon={ShieldAlert} title="Auto Spam Detection" 
                subtitle="Detects and blocks repetitive texts" 
                rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.autoSpamDetection} onChange={(v) => handleToggleSetting('autoSpamDetection', v)} />} 
            />
            <SettingRow 
                icon={MessageSquare} title="Auto Reply Bot" 
                subtitle={groupData.settings?.autoReply ? "Enabled — bot active" : "Disabled — bot inactive"}
                rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.autoReply} onChange={(v) => {
                    handleToggleSetting('autoReply', v);
                    if(v && !groupData.settings?.autoReplyText) handleToggleSetting('autoReplyText', 'Thanks for touching base. An admin will respond shortly.');
                }} />} 
            />
            <SettingRow 
                icon={Clock} title="Disappearing Messages" 
                subtitle={groupData.settings?.disappearingMessages ? `Timer: ${groupData.settings.disappearingMessages / 86400} days` : 'Disabled — messages stay forever'} 
                onClick={() => isAdmin && setActiveSection('disappearing')}
                rightContent={<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ToggleSwitch disabled={!isAdmin} value={groupData.settings?.disappearingMessages > 0} onChange={(v) => handleToggleSetting('disappearingMessages', v ? 86400 : 0)} />
                    {isAdmin && <ChevronRight size={18} color="#C7C7CC" />}
                </div>}
            />
          </div>

          <div style={{ padding: '16px 20px 8px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>PRIVACY & MANAGEMENT</div>
          <div style={{ background: '#FFF', marginBottom: '16px' }}>
            <SettingRow 
                icon={Pin} title="Pin Messages" 
                subtitle={groupData.settings?.whoCanPin === 'admins' ? 'Admins only can pin messages' : 'Everyone can pin messages'}
                rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.whoCanPin === 'admins'} onChange={(v) => handleToggleSetting('whoCanPin', v ? 'admins' : 'everyone')} />} 
            />
            <SettingRow 
                icon={MonitorOff} title="Restrict Screenshots" 
                subtitle="Block selection & print protection" 
                rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.restrictScreenshot} onChange={(v) => handleToggleSetting('restrictScreenshot', v)} />} 
            />
            <SettingRow 
                icon={EyeOff} title="Hide Member List" 
                subtitle={groupData.settings?.hideMemberList ? 'Private roster — admins only' : 'Public roster — visible to all'} 
                rightContent={<ToggleSwitch disabled={!isAdmin} value={groupData.settings?.hideMemberList} onChange={(v) => handleToggleSetting('hideMemberList', v)} />} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: '#F0F7FF' }}>
            <Lock size={16} color="#34C759" />
            <div style={{ flex: 1, fontSize: '15px', color: '#000', fontWeight: '500' }}>End-to-End Encrypted Group</div>
          </div>

        </div>
      </div>
    );
  }

  // ─── INVITE LINK SECTION ───
  if (activeSection === 'invite') {
    return (
      <div style={{ width: '100%', flex: 1, height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Invite Link" onBack={() => setActiveSection('main')} />
        <div style={{ flex: 1, padding: '20px' }}>
          <div style={{ background: '#FFF', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', borderRadius: '50%', background: '#F0F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Link size={36} color="#007AFF" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>Group Invite Link</h3>
              <p style={{ color: '#8E8E93', fontSize: '14px' }}>Share this link to invite people to your group</p>
            </div>
            
            {inviteLink ? (
              <div>
                <div style={{ background: '#F2F2F7', borderRadius: '10px', padding: '14px', fontSize: '14px', color: '#007AFF', wordBreak: 'break-all', marginBottom: '16px' }}>
                  {inviteLink}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => copyToClipboard(inviteLink)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#007AFF', color: '#FFF', border: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Copy size={16} /> Copy Link
                  </button>
                  <button onClick={handleRevokeInvite} style={{ padding: '12px 16px', borderRadius: '10px', background: '#FF3B30', color: '#FFF', border: 'none', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw size={16} /> Revoke
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={handleGenerateInvite} style={{ width: '100%', padding: '14px', borderRadius: '10px', background: '#007AFF', color: '#FFF', border: 'none', fontSize: '16px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Link size={18} /> Generate Invite Link
              </button>
            )}
          </div>
          
          <div style={{ fontSize: '13px', color: '#8E8E93', textAlign: 'center', lineHeight: '1.5' }}>
            Anyone with this link can join your group. Only share it with people you trust. You can revoke the link at any time.
          </div>
        </div>
      </div>
    );
  }

  // ─── DISAPPEARING MESSAGES SECTION ───
  if (activeSection === 'disappearing') {
    const options = [
      { label: 'Off', value: 0 },
      { label: '24 hours', value: 86400 },
      { label: '7 days', value: 604800 },
      { label: '90 days', value: 7776000 },
    ];
    return (
      <div style={{ width: '100%', flex: 1, height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Disappearing Messages" onBack={() => setActiveSection('main')} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px 20px', fontSize: '14px', color: '#8E8E93', lineHeight: '1.5' }}>
            When enabled, new messages will disappear after the selected duration. This setting is strictly managed by group admins.
          </div>
          <div style={{ background: '#FFF' }}>
            {options.map(opt => (
              <div 
                key={opt.value} 
                onClick={() => isAdmin && handleToggleSetting('disappearingMessages', opt.value)}
                style={{ padding: '14px 20px', borderBottom: '0.5px solid #F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'default', opacity: isAdmin ? 1 : 0.7 }}
              >
                <span style={{ fontSize: '16px', color: '#000' }}>{opt.label}</span>
                {groupData.settings?.disappearingMessages === opt.value && <Check size={20} color="#007AFF" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── PINNED MESSAGES SECTION ───
  if (activeSection === 'pinned') {
    return (
      <div style={{ width: '100%', flex: 1, height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Pinned Messages" onBack={() => setActiveSection('main')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {pinnedMessagesList.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8E8E93', marginTop: '40px' }}>No pinned messages</div>
          ) : (
            pinnedMessagesList.map(msg => (
              <div key={msg._id} style={{ background: '#FFF', padding: '16px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={msg.sender?.profilePicture ? `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/${msg.sender.profilePicture}?token=${token}` : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/avatar?name=${msg.sender?.displayName || 'User'}&background=random&color=fff`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{msg.sender?.displayName || 'User'}</div>
                    <div style={{ fontSize: '15px', marginTop: '2px' }}>{msg.content}</div>
                  </div>
                  {isAdmin && (
                    <button
                        onClick={async () => {
                            await apiCall(`${API}/${group._id}/pin/${msg._id}`, 'PUT');
                            setPinnedMessagesList(prev => prev.filter(m => m._id !== msg._id));
                            onGroupUpdated?.();
                        }}
                        style={{ background: 'none', border: 'none', color: '#007AFF', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                     >
                        Unpin
                     </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── STARRED MESSAGES SECTION ───
  if (activeSection === 'starred') {
    return (
      <div style={{ width: '100%', flex: 1, height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="Starred Messages" onBack={() => setActiveSection('main')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {starredMessages.length === 0 ? (
             <div style={{ textAlign: 'center', color: '#8E8E93', marginTop: '40px' }}>No starred messages</div>
          ) : (
            starredMessages.map(msg => (
              <div key={msg._id} style={{ background: '#FFF', padding: '16px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <img src={msg.sender?.profilePicture ? `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/${msg.sender.profilePicture}?token=${token}` : `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/avatar?name=${msg.sender?.displayName || 'User'}&background=random&color=fff`} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="" />
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{msg.sender?.displayName || 'Unknown'}</span>
                  <span style={{ fontSize: '12px', color: '#8E8E93', marginLeft: 'auto' }}>{new Date(msg.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '15px', color: '#000', lineHeight: '1.4' }}>{msg.content}</div>
                <div style={{ borderTop: '0.5px solid #F2F2F7', marginTop: '12px', paddingTop: '12px', textAlign: 'right' }}>
                    <button
                        onClick={async () => {
                            await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/messages/${msg._id}/star`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
                            setStarredMessages(prev => prev.filter(m => m._id !== msg._id));
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', background: 'none', border: 'none', color: '#FF9500', fontWeight: '600', cursor: 'pointer', fontSize: '14px', width: '100%' }}
                    >
                        <Star size={16} fill="#FF9500" /> Unstar
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── MAIN SETTINGS VIEW ───
  const memberCount = groupData.members?.length || 0;
  const displayName = groupData.name || group.name;
  const displayDesc = groupData.description || '';

  return (
    <div className="animate-fade" style={{ width: '100%', flex: 1, height: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E5E5EA', background: '#FFF', position: 'sticky', top: 0, zIndex: 10 }}>
        <ArrowLeft size={24} color="#007AFF" style={{ cursor: 'pointer' }} onClick={onClose} />
        <h1 style={{ fontSize: '17px', fontWeight: '700' }}>Group Info</h1>
        <div style={{ width: '24px' }} />
      </div>

      {/* Group Identity */}
      <div style={{ background: '#FFF', textAlign: 'center', padding: '28px 20px', marginBottom: '8px' }}>
        <div style={{ width: '120px', height: '120px', margin: '0 auto 16px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #E5E5EA', position: 'relative' }}>
          <img
            src={groupData.icon ? `${import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000"}/api/files/${groupData.icon}?token=${token}` : `(import.meta.env.VITE_BACKEND_URL || "http://192.168.1.22:5000") + "/api/avatar?name=" + encodeURIComponent(displayName || '') + "&background=random&color=fff"&size=120`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""
          />
          {groupData.settings?.disappearingMessages > 0 && (
            <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: '#FFF', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', border: '2px solid #007AFF' }}>
                <Clock size={18} color="#007AFF" />
            </div>
          )}
          {isAdmin && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '36px', height: '36px', borderRadius: '50%', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #FFF', cursor: 'pointer' }}>
              <Camera size={16} color="#FFF" />
            </div>
          )}
        </div>

        {editingName ? (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ fontSize: '22px', fontWeight: '700', border: 'none', borderBottom: '2px solid #007AFF', outline: 'none', textAlign: 'center', background: 'transparent', width: '200px' }} autoFocus />
            <Check size={20} color="#007AFF" style={{ cursor: 'pointer' }} onClick={handleUpdateInfo} />
            <X size={20} color="#FF3B30" style={{ cursor: 'pointer' }} onClick={() => { setEditingName(false); setNewName(displayName); }} />
          </div>
        ) : (
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px', cursor: isAdmin ? 'pointer' : 'default' }} onClick={() => isAdmin && setEditingName(true)}>
            {displayName} {isAdmin && <Edit2 size={14} color="#8E8E93" style={{ marginLeft: '4px' }} />}
          </h2>
        )}

        <p style={{ color: '#8E8E93', fontSize: '15px', marginBottom: '4px' }}>Group · {memberCount} participants</p>

        {editingDesc ? (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '8px' }}>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Add group description..." style={{ fontSize: '14px', border: 'none', borderBottom: '2px solid #007AFF', outline: 'none', textAlign: 'center', background: 'transparent', width: '250px', color: '#8E8E93' }} autoFocus />
            <Check size={16} color="#007AFF" style={{ cursor: 'pointer' }} onClick={handleUpdateInfo} />
            <X size={16} color="#FF3B30" style={{ cursor: 'pointer' }} onClick={() => { setEditingDesc(false); setNewDesc(displayDesc); }} />
          </div>
        ) : (
          <p style={{ color: '#8E8E93', fontSize: '14px', cursor: isAdmin ? 'pointer' : 'default', marginTop: '4px' }} onClick={() => isAdmin && setEditingDesc(true)}>
            {displayDesc || 'Add group description...'} {isAdmin && <Edit2 size={12} color="#C7C7CC" />}
          </p>
        )}
      </div>

      {/* 🔔 Notifications */}
      <div style={{ background: '#FFF', marginBottom: '8px' }}>
        <div style={{ padding: '8px 20px 4px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>NOTIFICATIONS</div>
        <SettingRow
          icon={muteOption === 'off' ? Bell : BellOff}
          title="Mute Notifications"
          subtitle={muteOption === 'off' ? 'Notifications are on' : `Muted (${muteOption})`}
          onClick={() => setShowMuteMenu(!showMuteMenu)}
          color={muteOption === 'off' ? '#007AFF' : '#8E8E93'}
        />
        {showMuteMenu && (
          <div style={{ padding: '0 20px 10px' }}>
            {[{ label: 'Unmute', val: 'off' }, { label: '8 hours', val: '8h' }, { label: '1 week', val: '1w' }, { label: 'Always', val: 'always' }].map(opt => (
              <div key={opt.val} onClick={() => handleMute(opt.val)} style={{ padding: '10px 16px', cursor: 'pointer', borderRadius: '8px', background: muteOption === opt.val ? '#F0F7FF' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px' }}>{opt.label}</span>
                {muteOption === opt.val && <Check size={18} color="#007AFF" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 👥 Members Preview */}
      <div style={{ background: '#FFF', marginBottom: '8px' }}>
        <div style={{ padding: '8px 20px 4px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>MEMBERS</div>
        <SettingRow icon={Users} title={`${memberCount} participants`} onClick={() => setActiveSection('members')} color="#5856D6" />
        {isAdmin && <SettingRow icon={UserPlus} title="Add Participants" onClick={() => setActiveSection('addMember')} color="#34C759" />}
      </div>

      {/* 💬 Chat Features */}
      <div style={{ background: '#FFF', marginBottom: '8px' }}>
        <div style={{ padding: '8px 20px 4px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>CHAT FEATURES</div>
        <SettingRow 
            icon={Star} 
            title="Starred Messages" 
            onClick={async () => {
                const res = await fetch(`${API}/${group._id}/starred`, { headers: { 'Authorization': `Bearer ${token}` } });
                setStarredMessages(await res.json());
                setActiveSection('starred');
            }} 
            color="#FF9500" 
        />
        <SettingRow 
            icon={Pin} 
            title="Pinned Messages" 
            subtitle={`${groupData.pinnedMessages?.length || 0} pinned`} 
            onClick={async () => {
                const res = await fetch(`${API}/${group._id}/pinned`, { headers: { 'Authorization': `Bearer ${token}` } });
                setPinnedMessagesList(await res.json());
                setActiveSection('pinned');
            }} 
            color="#AF52DE" 
        />
      </div>

      {/* 🔐 Permissions (Admin Only) */}
      {isAdmin && (
        <div style={{ background: '#FFF', marginBottom: '8px' }}>
          <div style={{ padding: '8px 20px 4px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>PERMISSIONS</div>
          <SettingRow icon={Shield} title="Group Permissions" subtitle="Who can send messages, edit info" onClick={() => setActiveSection('permissions')} color="#007AFF" />
        </div>
      )}

      {/* 🔗 Invite Link (Admin Only) */}
      {isAdmin && (
        <div style={{ background: '#FFF', marginBottom: '8px' }}>
          <div style={{ padding: '8px 20px 4px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>INVITE</div>
          <SettingRow icon={Link} title="Invite via Link" subtitle="Generate a link to invite people" onClick={() => setActiveSection('invite')} color="#34C759" />
        </div>
      )}

      {/* 🔒 Security */}
      <div style={{ background: '#FFF', marginBottom: '8px' }}>
        <div style={{ padding: '8px 20px 4px', fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.5px' }}>SECURITY</div>
        <SettingRow
          icon={Lock} title="Encryption"
          subtitle="Messages are end-to-end encrypted"
          color="#34C759"
          rightContent={<span style={{ fontSize: '13px', color: '#34C759', fontWeight: '600' }}>Active</span>}
        />
      </div>

      {/* 🚫 Exit / Delete */}
      <div style={{ background: '#FFF', marginBottom: '40px' }}>
        <SettingRow icon={LogOut} title="Exit Group" danger onClick={handleLeave} />
        {isAdmin && <SettingRow icon={Trash2} title="Delete Group" danger onClick={handleDeleteGroup} />}
      </div>
    </div>
  );
};

export default GroupSettings;
