const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Sidebar.jsx', 'utf8');

const oldBlock = `                {/* Others' Updates */}
                <div style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  color: '#8E8E93',
                  fontWeight: '600',
                  letterSpacing: '-0.2px',
                  background: '#F2F2F7',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '0.5px solid #E5E5EA'
                }}>
                  <span>Recent Updates</span>
                  <div
                    onClick={() => { setShowStatusSearch(prev => !prev); setStatusSearchQuery(''); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: showStatusSearch ? '#007AFF' : 'rgba(142,142,147,0.15)', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <Search size={15} color={showStatusSearch ? '#FFF' : '#8E8E93'} />
                  </div>
                </div>
                {/* Status Search Bar */}
                {showStatusSearch && (
                  <div style={{ padding: '8px 16px 10px', background: '#F2F2F7', borderBottom: '0.5px solid #E5E5EA', animation: 'slideDown 0.2s ease' }}>
                    <style>{\`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }\`}</style>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: '12px', padding: '8px 12px', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #E5E5EA' }}>
                      <Search size={15} color="#8E8E93" style={{ flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="Search recent updates..."
                        value={statusSearchQuery}
                        onChange={e => setStatusSearchQuery(e.target.value)}
                        autoFocus
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: '#000', fontFamily: 'inherit' }}
                      />
                      {statusSearchQuery && (
                        <div onClick={() => setStatusSearchQuery('')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {stories.filter(s => s.user?._id?.toString() !== (user?.id || user?._id)?.toString()).length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#8E8E93', fontSize: '14px' }}>No updates available</div>
                ) : (
                  stories.filter(s => s.user?._id?.toString() !== (user?.id || user?._id)?.toString()).filter(s => !statusSearchQuery.trim() || s.user?.displayName?.toLowerCase().includes(statusSearchQuery.toLowerCase())).map(story => (`;

const newBlock = `                {/* Others' Updates */}
                {showStatusSearch ? (
                  /* ── Search Mode: header replaced by search bar ── */
                  <div style={{
                    padding: '8px 16px',
                    background: '#F2F2F7',
                    borderBottom: '0.5px solid #E5E5EA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    animation: 'slideDown 0.2s ease'
                  }}>
                    <style>{\`@keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }\`}</style>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#FFFFFF', borderRadius: '12px', padding: '8px 12px', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #E5E5EA' }}>
                      <Search size={15} color="#8E8E93" style={{ flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="Search recent updates..."
                        value={statusSearchQuery}
                        onChange={e => setStatusSearchQuery(e.target.value)}
                        autoFocus
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: '#000', fontFamily: 'inherit' }}
                      />
                      {statusSearchQuery && (
                        <div onClick={() => setStatusSearchQuery('')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '17px', height: '17px', borderRadius: '50%', background: '#C7C7CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Cancel button to close search */}
                    <div
                      onClick={() => { setShowStatusSearch(false); setStatusSearchQuery(''); }}
                      style={{ color: '#007AFF', fontSize: '15px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      Cancel
                    </div>
                  </div>
                ) : (
                  /* ── Normal Mode: header with search icon ── */
                  <div style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    color: '#8E8E93',
                    fontWeight: '600',
                    letterSpacing: '-0.2px',
                    background: '#F2F2F7',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '0.5px solid #E5E5EA'
                  }}>
                    <span>Recent Updates</span>
                    <div
                      onClick={() => setShowStatusSearch(true)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(142,142,147,0.15)', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Search size={15} color="#8E8E93" />
                    </div>
                  </div>
                )}
                {stories.filter(s => s.user?._id?.toString() !== (user?.id || user?._id)?.toString()).length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#8E8E93', fontSize: '14px' }}>No updates available</div>
                ) : (
                  stories.filter(s => s.user?._id?.toString() !== (user?.id || user?._id)?.toString()).filter(s => !statusSearchQuery.trim() || s.user?.displayName?.toLowerCase().includes(statusSearchQuery.toLowerCase())).map(story => (`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('frontend/src/components/Sidebar.jsx', content);
  console.log('SUCCESS: Search replaces header now!');
} else {
  console.log('ERROR: Target block not found');
}
