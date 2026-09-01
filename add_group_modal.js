const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Sidebar.jsx', 'utf8');

// 1. Add state variables after existing states (after selectingContactsFor)
const stateAnchor = "const [selectingContactsFor, setSelectingContactsFor] = useState(null); // null, 'exceptions', 'only_share', 'close_friends'";
const newStates = `const [selectingContactsFor, setSelectingContactsFor] = useState(null); // null, 'exceptions', 'only_share', 'close_friends'
const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
const [createGroupStep, setCreateGroupStep] = useState(1); // 1 = select members, 2 = name & icon
const [groupSelectedMembers, setGroupSelectedMembers] = useState([]);
const [groupName, setGroupName] = useState('');
const [groupDescription, setGroupDescription] = useState('');
const [groupIconFile, setGroupIconFile] = useState(null);
const [groupIconPreview, setGroupIconPreview] = useState(null);
const [groupMemberSearch, setGroupMemberSearch] = useState('');
const [isCreatingGroup, setIsCreatingGroup] = useState(false);
const groupIconInputRef = useRef(null);`;

content = content.replace(stateAnchor, newStates);

// 2. Wire the "New group" button to open modal
const oldNewGroupBtn = `                <div
                  onClick={() => { setSelectContactOpen(false); setActiveTab('contacts'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#fff', borderBottom: '0.5px solid #E5E5EA', cursor: 'pointer' }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} color="#fff" />
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#000' }}>New group</span>
                </div>`;

const newNewGroupBtn = `                <div
                  onClick={() => { setSelectContactOpen(false); setGroupSelectedMembers([]); setGroupName(''); setGroupDescription(''); setGroupIconFile(null); setGroupIconPreview(null); setGroupMemberSearch(''); setCreateGroupStep(1); setShowCreateGroupModal(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#fff', borderBottom: '0.5px solid #E5E5EA', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F2F2F7'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #007AFF, #5AC8FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,122,255,0.3)' }}>
                    <Users size={20} color="#fff" />
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#000' }}>New Group</span>
                </div>`;

content = content.replace(oldNewGroupBtn, newNewGroupBtn);

// 3. Add the Create Group Modal JSX before the final closing </div> of the sidebar return
const modalCode = `
      {/* ═══════════════════ CREATE GROUP MODAL ═══════════════════ */}
      {showCreateGroupModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#FFFFFF', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s cubic-bezier(0.2,0.8,0.2,1)' }}>
            <style>{\`
              @keyframes fadeIn { from{opacity:0} to{opacity:1} }
              @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
              .member-chip:hover { background: rgba(255,59,48,0.12) !important; }
              .contact-row:hover { background: #F2F2F7 !important; }
            \`}</style>

            {/* Drag Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#C7C7CC' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#000', letterSpacing: '-0.4px' }}>
                  {createGroupStep === 1 ? 'New Group' : 'Group Info'}
                </div>
                <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>
                  {createGroupStep === 1 ? \`\${groupSelectedMembers.length} of \${contacts.length} selected\` : 'Add name and icon'}
                </div>
              </div>
              <button onClick={() => setShowCreateGroupModal(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F2F2F7', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <XIcon size={16} color="#8E8E93" />
              </button>
            </div>

            {/* Step Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px 16px', gap: '8px' }}>
              {[1,2].map(s => (
                <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: createGroupStep >= s ? '#007AFF' : '#E5E5EA', transition: 'background 0.3s' }} />
              ))}
            </div>

            {/* STEP 1 — Select Members */}
            {createGroupStep === 1 && (
              <>
                {/* Selected Chips */}
                {groupSelectedMembers.length > 0 && (
                  <div style={{ padding: '0 20px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {groupSelectedMembers.map(m => (
                      <div key={m._id} className="member-chip" onClick={() => setGroupSelectedMembers(prev => prev.filter(x => x._id !== m._id))} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: '20px', padding: '5px 10px 5px 6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <img src={m.profilePicture ? (m.profilePicture.startsWith('http') ? m.profilePicture : \`http://localhost:5000/api/files/\${m.profilePicture}?token=\${localStorage.getItem('token')}\`) : \`http://localhost:5000/api/avatar?name=\${m.displayName}&background=random&color=fff\`} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#007AFF' }}>{m.displayName}</span>
                        <XIcon size={12} color="#007AFF" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div style={{ margin: '0 20px 12px', display: 'flex', alignItems: 'center', background: '#F2F2F7', borderRadius: '12px', padding: '9px 14px', gap: '8px' }}>
                  <Search size={15} color="#8E8E93" />
                  <input
                    placeholder="Search contacts..."
                    value={groupMemberSearch}
                    onChange={e => setGroupMemberSearch(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: '#000' }}
                    autoFocus
                  />
                  {groupMemberSearch && <XIcon size={15} color="#8E8E93" style={{ cursor: 'pointer' }} onClick={() => setGroupMemberSearch('')} />}
                </div>

                {/* Contact List */}
                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
                  {contacts
                    .filter(c => !groupMemberSearch.trim() || (c.displayName || '').toLowerCase().includes(groupMemberSearch.toLowerCase()))
                    .map(c => {
                      const isSelected = groupSelectedMembers.some(m => m._id === c._id);
                      return (
                        <div key={c._id} className="contact-row" onClick={() => setGroupSelectedMembers(prev => isSelected ? prev.filter(x => x._id !== c._id) : [...prev, c])} style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: '14px', cursor: 'pointer', transition: 'background 0.15s', background: isSelected ? 'rgba(0,122,255,0.05)' : '#fff' }}>
                          <div style={{ position: 'relative' }}>
                            <img src={c.profilePicture ? (c.profilePicture.startsWith('http') ? c.profilePicture : \`http://localhost:5000/api/files/\${c.profilePicture}?token=\${localStorage.getItem('token')}\`) : \`http://localhost:5000/api/avatar?name=\${c.displayName}&background=random&color=fff\`} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '2px solid #007AFF' : '2px solid transparent', transition: 'border 0.2s' }} alt="" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: '#000', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.displayName}</div>
                            <div style={{ fontSize: '13px', color: '#8E8E93', marginTop: '1px' }}>{c.username || c.phone || ''}</div>
                          </div>
                          {/* Checkbox */}
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: isSelected ? 'none' : '2px solid #C7C7CC', background: isSelected ? '#007AFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                            {isSelected && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5l4 4 7-8" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Next Button */}
                <div style={{ position: 'sticky', bottom: 0, padding: '16px 20px 28px', background: '#fff', borderTop: '0.5px solid #E5E5EA' }}>
                  <button
                    onClick={() => { if (groupSelectedMembers.length > 0) setCreateGroupStep(2); }}
                    disabled={groupSelectedMembers.length === 0}
                    style={{ width: '100%', padding: '15px', borderRadius: '16px', border: 'none', background: groupSelectedMembers.length > 0 ? 'linear-gradient(135deg, #007AFF, #5AC8FA)' : '#E5E5EA', color: groupSelectedMembers.length > 0 ? '#FFF' : '#8E8E93', fontSize: '16px', fontWeight: '700', cursor: groupSelectedMembers.length > 0 ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: groupSelectedMembers.length > 0 ? '0 8px 24px rgba(0,122,255,0.3)' : 'none' }}
                  >
                    Next → ({groupSelectedMembers.length} selected)
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 — Group Name & Icon */}
            {createGroupStep === 2 && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 0' }}>
                  {/* Group Icon Picker */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <div style={{ position: 'relative' }}>
                      <div onClick={() => groupIconInputRef.current?.click()} style={{ width: '100px', height: '100px', borderRadius: '50%', background: groupIconPreview ? 'transparent' : 'linear-gradient(135deg, #007AFF, #5AC8FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,122,255,0.3)', border: '3px solid rgba(0,122,255,0.2)' }}>
                        {groupIconPreview ? <img src={groupIconPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Users size={40} color="#FFF" />}
                      </div>
                      <div onClick={() => groupIconInputRef.current?.click()} style={{ position: 'absolute', bottom: '2px', right: '2px', width: '30px', height: '30px', borderRadius: '50%', background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                        <Camera size={14} color="#FFF" />
                      </div>
                      <input ref={groupIconInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if(f){ setGroupIconFile(f); setGroupIconPreview(URL.createObjectURL(f)); }}} />
                    </div>
                  </div>

                  {/* Group Name Input */}
                  <div style={{ background: '#F2F2F7', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Group Name *</div>
                    <input
                      type="text"
                      placeholder="Enter group name..."
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      maxLength={50}
                      autoFocus
                      style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '16px', color: '#000', fontWeight: '500' }}
                    />
                    <div style={{ fontSize: '11px', color: '#C7C7CC', textAlign: 'right', marginTop: '4px' }}>{groupName.length}/50</div>
                  </div>

                  {/* Description */}
                  <div style={{ background: '#F2F2F7', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Description (optional)</div>
                    <textarea
                      placeholder="What's this group about?"
                      value={groupDescription}
                      onChange={e => setGroupDescription(e.target.value)}
                      maxLength={200}
                      rows={2}
                      style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: '#000', resize: 'none', fontFamily: 'inherit' }}
                    />
                  </div>

                  {/* Members Preview */}
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Members · {groupSelectedMembers.length}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                    {groupSelectedMembers.map(m => (
                      <div key={m._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '56px' }}>
                        <img src={m.profilePicture ? (m.profilePicture.startsWith('http') ? m.profilePicture : \`http://localhost:5000/api/files/\${m.profilePicture}?token=\${localStorage.getItem('token')}\`) : \`http://localhost:5000/api/avatar?name=\${m.displayName}&background=random&color=fff\`} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E5E5EA' }} alt="" />
                        <span style={{ fontSize: '11px', color: '#8E8E93', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{m.displayName.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ padding: '16px 20px 28px', background: '#fff', borderTop: '0.5px solid #E5E5EA', display: 'flex', gap: '12px' }}>
                  <button onClick={() => setCreateGroupStep(1)} style={{ flex: 0, padding: '15px 20px', borderRadius: '16px', border: '1px solid #E5E5EA', background: '#fff', color: '#007AFF', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button
                    onClick={async () => {
                      if (!groupName.trim() || isCreatingGroup) return;
                      setIsCreatingGroup(true);
                      try {
                        let groupIconId = null;
                        if (groupIconFile) {
                          const fd = new FormData();
                          fd.append('file', groupIconFile);
                          const uploadResp = await fetch('http://localhost:5000/api/files/upload', { method: 'POST', headers: { Authorization: \`Bearer \${localStorage.getItem('token')}\` }, body: fd });
                          if (uploadResp.ok) { const ud = await uploadResp.json(); groupIconId = ud.fileId; }
                        }
                        const resp = await fetch('http://localhost:5000/api/groups', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${localStorage.getItem('token')}\` },
                          body: JSON.stringify({ displayName: groupName.trim(), description: groupDescription.trim(), members: groupSelectedMembers.map(m => m._id), ...(groupIconId ? { groupIcon: groupIconId } : {}) })
                        });
                        if (!resp.ok) throw new Error('Failed to create group');
                        const newGroup = await resp.json();
                        setShowCreateGroupModal(false);
                        if (onSelectContact) onSelectContact(newGroup);
                      } catch(err) {
                        console.error('Create group error:', err);
                        alert('Failed to create group. Please try again.');
                      } finally {
                        setIsCreatingGroup(false);
                      }
                    }}
                    disabled={!groupName.trim() || isCreatingGroup}
                    style={{ flex: 1, padding: '15px', borderRadius: '16px', border: 'none', background: groupName.trim() && !isCreatingGroup ? 'linear-gradient(135deg, #34C759, #30D158)' : '#E5E5EA', color: groupName.trim() && !isCreatingGroup ? '#FFF' : '#8E8E93', fontSize: '16px', fontWeight: '700', cursor: groupName.trim() && !isCreatingGroup ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: groupName.trim() ? '0 8px 24px rgba(52,199,89,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {isCreatingGroup ? (
                      <><svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#FFF" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10"/></svg> Creating...</>
                    ) : (
                      <><Users size={18} /> Create Group</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}`;

// Insert modal before last closing tag of sidebar component
const lastReturn = '  );\n};\n\nexport default Sidebar;';
if (content.includes(lastReturn)) {
    content = content.replace(lastReturn, modalCode + '\n' + lastReturn);
    fs.writeFileSync('frontend/src/components/Sidebar.jsx', content);
    console.log('SUCCESS: Group creation modal added!');
} else {
    console.log('ERROR: Could not find insertion point');
    // Try alternate ending
    const alt = ');\n};\n\nexport default Sidebar;';
    if (content.includes(alt)) {
        content = content.replace(alt, modalCode + '\n' + alt);
        fs.writeFileSync('frontend/src/components/Sidebar.jsx', content);
        console.log('SUCCESS (alt): Group creation modal added!');
    } else {
        console.log('Could not find any ending pattern');
    }
}
