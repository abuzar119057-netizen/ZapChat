import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MessageCircle, X, Check, Phone, Mail, User, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AddContactModal = ({ isOpen, onClose, onSelectContact, onContactAdded }) => {
  const { api, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedContactIds, setSavedContactIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (query) => {
    if (!query.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await api.get(`/contacts/search?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(res.data || []);
      if (res.data.length === 0) {
        setMessage('No user found matching phone, email, or name.');
      }
    } catch (err) {
      console.error('Failed to search users:', err);
      setMessage('Search failed. Please check network.');
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
      const errMessage = err.response?.data?.message || 'Failed to add contact';
      if (errMessage.includes('already exists')) {
        setSavedContactIds(prev => new Set([...prev, targetId]));
      } else {
        alert(errMessage);
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleStartChat = (targetUser) => {
    onSelectContact(targetUser);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: '24px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #007AFF, #00C6FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              boxShadow: '0 6px 14px rgba(0,122,255,0.3)'
            }}>
              <UserPlus size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#000' }}>Add New Contact</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#8E8E93' }}>Search user by Phone, Email, or Name</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} color="#8E8E93" />
          </button>
        </div>

        {/* Input Form */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} color="#8E8E93" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Enter Phone Number, Email, or Name..."
            autoFocus
            style={{
              width: '100%',
              padding: '13px 14px 13px 42px',
              borderRadius: '16px',
              border: '1.5px solid #E5E5EA',
              fontSize: '15px',
              background: '#F9F9FB',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#000',
              transition: 'border-color 0.2s, background 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#007AFF'}
            onBlur={e => e.target.style.borderColor = '#E5E5EA'}
          />
          {loading && (
            <Loader2 size={18} color="#007AFF" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />
          )}
        </div>

        {/* Search Results List */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!searchQuery.trim() && (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: '#8E8E93', fontSize: '14px' }}>
              <User size={36} color="#C7C7CC" style={{ marginBottom: '8px' }} />
              <div>Type a phone number, email address, or name to find users on ZapChat.</div>
            </div>
          )}

          {searchQuery.trim() && !loading && searchResults.length === 0 && (
            <div style={{ padding: '24px 10px', textAlign: 'center', color: '#8E8E93', fontSize: '14px', background: '#F2F2F7', borderRadius: '16px' }}>
              {message || 'No matching user found.'}
            </div>
          )}

          {searchResults.map(u => {
            const isSaved = savedContactIds.has(u._id);
            const isSaving = savingId === u._id;

            return (
              <div
                key={u._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: '#F8F9FA',
                  borderRadius: '16px',
                  border: '1px solid #E9ECEF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, marginRight: '10px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #007AFF, #0056B3)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '17px',
                    flexShrink: 0
                  }}>
                    {u.displayName ? u.displayName.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.displayName}
                    </div>
                    {u.phone && (
                      <div style={{ fontSize: '12px', color: '#8E8E93', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
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

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleStartChat(u)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: '#007AFF',
                      color: '#FFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <MessageCircle size={14} />
                    Chat
                  </button>

                  <button
                    onClick={() => handleSaveContact(u)}
                    disabled={isSaved || isSaving}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: isSaved ? '#34C759' : 'rgba(0,122,255,0.12)',
                      color: isSaved ? '#FFF' : '#007AFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: isSaved ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {isSaved ? (
                      <>
                        <Check size={14} /> Saved
                      </>
                    ) : isSaving ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        <UserPlus size={14} /> Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;
