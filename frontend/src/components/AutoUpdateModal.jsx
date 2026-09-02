import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';

export const APP_CURRENT_VERSION = '1.0.0';

const AutoUpdateModal = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://zapchat-8svilt1a.b4a.run';
      const res = await axios.get(`${backendUrl}/api/version`);
      if (res.data && res.data.version) {
        const savedVersion = localStorage.getItem('app_installed_version') || APP_CURRENT_VERSION;
        if (res.data.version !== savedVersion || res.data.forceUpdate) {
          setUpdateInfo(res.data);
          setUpdateAvailable(true);
        }
      }
    } catch (err) {
      console.warn('Version check failed (offline or network timeout)', err);
    }
  };

  const handleUpdate = () => {
    setUpdating(true);
    if (updateInfo?.version) {
      localStorage.setItem('app_installed_version', updateInfo.version);
    }
    setTimeout(() => {
      // Force reload to pick up updated web bundle and clear cache
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      window.location.reload(true);
    }, 800);
  };

  if (!updateAvailable || !updateInfo) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 246, 255, 0.98))',
        borderRadius: '24px',
        padding: '28px 24px',
        maxWidth: '380px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 122, 255, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
        textAlign: 'center',
        position: 'relative',
        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        {!updateInfo.forceUpdate && (
          <button 
            onClick={() => setUpdateAvailable(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
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
        )}

        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #007AFF, #00C6FF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: '0 8px 20px rgba(0, 122, 255, 0.35)'
        }}>
          <ArrowUpCircle size={38} color="#FFFFFF" />
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#000', margin: '0 0 8px 0' }}>
          🎉 New Update Available!
        </h3>

        <div style={{
          display: 'inline-block',
          background: 'rgba(0, 122, 255, 0.1)',
          color: '#007AFF',
          fontSize: '12px',
          fontWeight: '700',
          padding: '4px 12px',
          borderRadius: '12px',
          marginBottom: '14px'
        }}>
          Version {updateInfo.version}
        </div>

        <p style={{
          fontSize: '13px',
          color: '#3A3A3C',
          lineHeight: '1.5',
          margin: '0 0 20px 0',
          background: '#FFFFFF',
          padding: '12px 14px',
          borderRadius: '14px',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          {updateInfo.releaseNotes || 'New features and improvements are ready for your app!'}
        </p>

        <button
          onClick={handleUpdate}
          disabled={updating}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #007AFF, #0056B3)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 8px 18px rgba(0, 122, 255, 0.35)',
            transition: 'all 0.2s ease'
          }}
        >
          {updating ? (
            <>
              <RefreshCw size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              Updating Instant Code...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              ⚡ Update Now (Instant 1-Sec)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AutoUpdateModal;
