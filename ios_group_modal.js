const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Sidebar.jsx', 'utf8');

// ── 1. Remove old modal block entirely ──────────────────────────────
const modalStartMarker = '\n      {/* ═══════════════════ CREATE GROUP MODAL ═══════════════════ */}';
const modalIdx = content.indexOf(modalStartMarker);
if (modalIdx === -1) { console.log('ERROR: Old modal not found'); process.exit(1); }
// Find where it ends — it's followed by \n    </div>
// The modal ends with the closing )} of the conditional, which is before </div>
// Let's find the closing of the full modal: "      )}\n    </div>"
const afterModal = content.indexOf('\n    </div>', modalIdx);
if (afterModal === -1) { console.log('ERROR: Cannot find end of modal'); process.exit(1); }
content = content.substring(0, modalIdx) + content.substring(afterModal);

// ── 2. Add new state variables (add groupAllUsers state) ──────────────
content = content.replace(
  'const [isCreatingGroup, setIsCreatingGroup] = useState(false);\nconst groupIconInputRef = useRef(null);',
  'const [isCreatingGroup, setIsCreatingGroup] = useState(false);\nconst [groupAllUsers, setGroupAllUsers] = useState([]);\nconst [loadingGroupUsers, setLoadingGroupUsers] = useState(false);\nconst groupIconInputRef = useRef(null);'
);

// ── 3. New "New Group" button – update onClick to also fetch all users ──
content = content.replace(
  `onClick={() => { setSelectContactOpen(false); setGroupSelectedMembers([]); setGroupName(''); setGroupDescription(''); setGroupIconFile(null); setGroupIconPreview(null); setGroupMemberSearch(''); setCreateGroupStep(1); setShowCreateGroupModal(true); }}`,
  `onClick={async () => {
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
      const resp = await fetch('http://localhost:5000/api/contacts/search?q=', {
        headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }
      });
      if (resp.ok) {
        const data = await resp.json();
        const selfId = (user?.id || user?._id)?.toString();
        setGroupAllUsers((data.users || data).filter(u => u._id?.toString() !== selfId));
      }
    } catch(e) {
      setGroupAllUsers(contacts || []);
    } finally {
      setLoadingGroupUsers(false);
    }
  }}`
);

// ── 4. Insert new premium modal before closing </div> ──────────────
const newModal = `
      {/* ═══ CREATE GROUP MODAL (iOS Premium) ═══ */}
      {showCreateGroupModal && (
        <div
          onClick={() => setShowCreateGroupModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'cgFadeIn 0.2s ease' }}
        >
          <style>{\`
            @keyframes cgFadeIn { from{opacity:0} to{opacity:1} }
            @keyframes cgSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
            .cg-contact:hover { background: #F2F2F7 !important; }
            .cg-chip:hover { background: rgba(255,59,48,0.1) !important; border-color: #FF3B30 !important; }
            .cg-btn-back:hover { background: #E5E5EA !important; }
            .cg-input-wrap:focus-within { border-color: #007AFF !important; box-shadow: 0 0 0 3px rgba(0,122,255,0.12) !important; }
          \`}</style>
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
                        <img src={m.profilePicture ? (m.profilePicture.startsWith('http') ? m.profilePicture : \`http://localhost:5000/api/files/\${m.profilePicture}?token=\${localStorage.getItem('token')}\`) : \`http://localhost:5000/api/avatar?name=\${m.displayName}&background=random&color=fff\`} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#007AFF' }}>{m.displayName}</span>
                        <XIcon size={11} color="#007AFF" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Count badge */}
                <div style={{ padding: '4px 16px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {loadingGroupUsers ? 'Loading...' : \`\${groupAllUsers.length} Users on ZapChat\`}
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
                            <img src={u.profilePicture ? (u.profilePicture.startsWith('http') ? u.profilePicture : \`http://localhost:5000/api/files/\${u.profilePicture}?token=\${localStorage.getItem('token')}\`) : \`http://localhost:5000/api/avatar?name=\${u.displayName}&background=random&color=fff\`} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '2.5px solid #007AFF' : '2.5px solid transparent', transition: 'border 0.2s' }} alt="" />
                            {u.status === 'online' && <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', borderRadius: '50%', background: '#34C759', border: '2px solid #fff' }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: '600', color: '#000', fontSize: '15.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.displayName}</span>
                              {u.role === 'admin' && <span style={{ fontSize: '9px', fontWeight: '800', background: 'linear-gradient(135deg,#FFD700,#FFA500)', color: '#000', padding: '1px 5px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.3px', flexShrink: 0 }}>Admin</span>}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#8E8E93', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {u.username ? \`@\${u.username}\` : (u.email || u._id?.toString()?.slice(-8))}
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
                    {groupSelectedMembers.length > 0 ? \`Continue with \${groupSelectedMembers.length} member\${groupSelectedMembers.length > 1 ? 's' : ''}\` : 'Select at least 1 member'}
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
                        <img src={m.profilePicture ? (m.profilePicture.startsWith('http') ? m.profilePicture : \`http://localhost:5000/api/files/\${m.profilePicture}?token=\${localStorage.getItem('token')}\`) : \`http://localhost:5000/api/avatar?name=\${m.displayName}&background=random&color=fff\`} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E5EA' }} alt="" />
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
                          const ur = await fetch('http://localhost:5000/api/files/upload', { method: 'POST', headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }, body: fd });
                          if (ur.ok) { const ud = await ur.json(); groupIconId = ud.fileId; }
                        }
                        const resp = await fetch('http://localhost:5000/api/groups', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${localStorage.getItem('token')}\` },
                          body: JSON.stringify({ displayName: groupName.trim(), description: groupDescription.trim(), members: groupSelectedMembers.map(m => m._id), ...(groupIconId ? { groupIcon: groupIconId } : {}) })
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
      )}`;

const insertBefore = '\n    </div>\n\n  );\n};\n\nexport default Sidebar;';
if (content.includes(insertBefore)) {
  content = content.replace(insertBefore, '\n    </div>' + newModal + '\n\n  );\n};\n\nexport default Sidebar;');
  fs.writeFileSync('frontend/src/components/Sidebar.jsx', content);
  console.log('SUCCESS: iOS-level group modal installed!');
} else {
  // Try alternate
  const alt = '\n    </div>\n  );\n};\n\nexport default Sidebar;';
  if (content.includes(alt)) {
    content = content.replace(alt, '\n    </div>' + newModal + '\n  );\n};\n\nexport default Sidebar;');
    fs.writeFileSync('frontend/src/components/Sidebar.jsx', content);
    console.log('SUCCESS (alt): iOS-level group modal installed!');
  } else {
    console.log('ERROR: Could not find closing pattern. Last 200 chars:');
    console.log(JSON.stringify(content.slice(-200)));
  }
}
