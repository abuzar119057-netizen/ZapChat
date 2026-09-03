import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, MessageCircle, X, Check, Phone, Mail, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AddContactModal = ({ isOpen, onClose, onSelectContact, onContactAdded }) => {
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedContactIds, setSavedContactIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setVisible(true);
        setTimeout(() => inputRef.current?.focus(), 300);
      }, 10);
    } else {
      setVisible(false);
      setTimeout(() => {
        setSearchQuery('');
        setSearchResults([]);
        setMessage('');
        setSavedContactIds(new Set());
      }, 350);
    }
  }, [isOpen]);

  // Auto search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setMessage('');
      return;
    }
    const timer = setTimeout(() => handleSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (query) => {
    if (!query.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.get(`/contacts/search?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(res.data || []);
      if ((res.data || []).length === 0) {
        setMessage('No user found with this phone, email, or name.');
      }
    } catch (err) {
      setMessage('Search failed. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async (targetUser) => {
    const targetId = targetUser._id;
    setSavingId(targetId);
    try {
      await api.post('/contacts', { contactId: targetId });
      setSavedContactIds(prev => new Set([...prev, targetId]));
      if (onContactAdded) onContactAdded();
    } catch (err) {
      const errMsg = err.response?.data?.message || '';
      if (errMsg.includes('already')) {
        setSavedContactIds(prev => new Set([...prev, targetId]));
      } else {
        alert(errMsg || 'Could not save contact.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleStartChat = (targetUser) => {
    onSelectContact(targetUser);
    handleClose();
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideDownSheet {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(100%); opacity: 0; }
        }
        @keyframes fadeInOverlay { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeOutOverlay { from { opacity:1; } to { opacity:0; } }
        @keyframes spinLoader { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 99990,
          animation: `${visible ? 'fadeInOverlay' : 'fadeOutOverlay'} 0.3s ease forwards`
        }}
      />

      {/* Bottom Sheet */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: '#FFFFFF',
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        padding: '0 0 env(safe-area-inset-bottom, 16px)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        animation: `${visible ? 'slideUpSheet' : 'slideDownSheet'} 0.35s cubic-bezier(0.32,0.72,0,1) forwards`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
      }}>

        {/* Drag Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#D1D1D6' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #007AFF, #34C759)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,122,255,0.35)'
            }}>
              <UserPlus size={22} color="#FFF" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#000', lineHeight: '1.2' }}>New Contact</div>
              <div style={{ fontSize: '12px', color: '#8E8E93', marginTop: '2px' }}>Search by phone, email or name</div>
            </div>
          </div>
          <button onClick={handleClose} style={{
            border: 'none', background: 'rgba(0,0,0,0.06)', borderRadius: '50%',
            width: '32px', height: '32px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer'
          }}>
            <X size={16} color="#6B6B6B" />
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: '0 16px 12px', position: 'relative' }}>
          <Search size={17} color="#8E8E93" style={{ position: 'absolute', left: '30px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Phone number, email, or name..."
            style={{
              width: '100%',
              padding: '12px 44px 12px 42px',
              borderRadius: '14px',
              border: '1.5px solid #E5E5EA',
              fontSize: '15px',
              background: '#F5F5F7',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#000',
              fontFamily: 'inherit'
            }}
            onFocus={e => { e.target.style.borderColor = '#007AFF'; e.target.style.background = '#FFF'; }}
            onBlur={e => { e.target.style.borderColor = '#E5E5EA'; e.target.style.background = '#F5F5F7'; }}
          />
          {loading && (
            <Loader2 size={17} color="#007AFF" style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', animation: 'spinLoader 0.8s linear infinite' }} />
          )}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>

          {/* Empty State */}
          {!searchQuery.trim() && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#8E8E93' }}>
              <User size={48} color="#C7C7CC" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#3C3C43', marginBottom: '6px' }}>Find someone on ZapChat</div>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>Type their phone number, email address, or name above to search</div>
            </div>
          )}

          {/* No Results */}
          {searchQuery.trim() && !loading && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: '#F5F5F7', borderRadius: '16px', color: '#8E8E93', fontSize: '14px' }}>
              {message || 'No matching user found.'}
            </div>
          )}

          {/* Results List */}
          {searchResults.map(u => {
            const isSaved = savedContactIds.has(u._id);
            const isSaving = savingId === u._id;

            return (
              <div key={u._id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: '#F8F9FA',
                borderRadius: '16px',
                border: '1px solid #EBEBEB',
                marginBottom: '10px'
              }}>
                {/* Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, marginRight: '10px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #007AFF, #0056B3)',
                    color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '800', fontSize: '17px', flexShrink: 0
                  }}>
                    {u.displayName?.slice(0, 2).toUpperCase() || 'ZC'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.displayName}
                      {u.role === 'admin' && (
                        <span style={{ marginLeft: '6px', fontSize: '10px', background: '#007AFF', color: '#FFF', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>ADMIN</span>
                      )}
                    </div>
                    {u.phone && (
                      <div style={{ fontSize: '12px', color: '#8E8E93', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={11} /> {u.phone}
                      </div>
                    )}
                    {u.email && (
                      <div style={{ fontSize: '12px', color: '#8E8E93', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Mail size={11} /> {u.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleStartChat(u)}
                    style={{
                      padding: '8px 12px', borderRadius: '12px',
                      background: '#007AFF', color: '#FFF',
                      border: 'none', fontSize: '13px', fontWeight: '700',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                      boxShadow: '0 2px 8px rgba(0,122,255,0.3)'
                    }}
                  >
                    <MessageCircle size={14} />
                    Chat
                  </button>

                  <button
                    onClick={() => !isSaved && handleSaveContact(u)}
                    disabled={isSaved || isSaving}
                    style={{
                      padding: '8px 12px', borderRadius: '12px',
                      background: isSaved ? '#34C759' : 'rgba(0,122,255,0.1)',
                      color: isSaved ? '#FFF' : '#007AFF',
                      border: 'none', fontSize: '13px', fontWeight: '700',
                      cursor: isSaved ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSaved ? <><Check size={14} /> Saved</> :
                     isSaving ? <Loader2 size={14} style={{ animation: 'spinLoader 0.8s linear infinite' }} /> :
                     <><UserPlus size={14} /> Save</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AddContactModal;
