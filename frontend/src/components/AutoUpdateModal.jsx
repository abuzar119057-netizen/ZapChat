import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle, Bell } from 'lucide-react';

// ⚠️ IMPORTANT: This is the version hardcoded in the current APK build.
// The server's /api/version returns a NEWER version -> popup triggers.
export const APP_CURRENT_VERSION = '1.0.0';
const VERSION_CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds (was once only)

const AutoUpdateModal = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updating, setUpdating] = useState(false);
  const intervalRef = useRef(null);
  const hasShownRef = useRef(false);

  useEffect(() => {
    // Clear any old dismissed state on mount (important for re-triggering)
    // Only suppress if same version was already dismissed THIS session
    checkVersion();

    // Poll every 30 seconds for new updates while app is open
    intervalRef.current = setInterval(() => {
      if (!hasShownRef.current) {
        checkVersion();
      }
    }, VERSION_CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const checkVersion = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://zapchat1-vbymlxsu.b4a.run';
      // Add cache-busting timestamp so browser never returns cached response
      const res = await fetch(`${backendUrl}/api/version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.version) return;

      // Compare against what user last installed/updated to
      const installedVersion = localStorage.getItem('app_installed_version') || APP_CURRENT_VERSION;
      const serverVersion = data.version;

      const isNewer = compareVersions(serverVersion, installedVersion) > 0;

      if ((isNewer || data.forceUpdate) && !hasShownRef.current) {
        setUpdateInfo(data);
        setUpdateAvailable(true);
        hasShownRef.current = true;
        // Stop polling once shown
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch (err) {
      // Silently ignore — user might be offline
    }
  };

  // Compare semver strings: returns >0 if a > b, 0 if equal, <0 if a < b
  const compareVersions = (a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const handleUpdate = () => {
    setUpdating(true);
    if (updateInfo?.version) {
      localStorage.setItem('app_installed_version', updateInfo.version);
    }
    setTimeout(() => {
      // Clear all caches so new bundle loads fresh
      if ('caches' in window) {
        caches.keys().then((names) => {
          Promise.all(names.map((name) => caches.delete(name))).then(() => {
            window.location.reload(true);
          });
        });
      } else {
        window.location.reload(true);
      }
    }, 600);
  };

  const handleDismiss = () => {
    // Snooze for this session only — next session it'll check again
    setUpdateAvailable(false);
    hasShownRef.current = false;
    // Resume polling after 5 mins in case user wants to update later
    setTimeout(() => {
      hasShownRef.current = false;
      checkVersion();
    }, 5 * 60 * 1000);
  };

  if (!updateAvailable || !updateInfo) return null;

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes popInUpdate {
          0% { opacity: 0; transform: scale(0.85) translateY(30px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spinUpdate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 8px 20px rgba(0, 122, 255, 0.35); }
          50% { box-shadow: 0 8px 30px rgba(0, 122, 255, 0.6); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
          background: 'linear-gradient(145deg, #ffffff, #f0f6ff)',
          borderRadius: '28px',
          padding: '32px 24px 24px',
          maxWidth: '370px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(0, 80, 200, 0.3), 0 0 0 1px rgba(255,255,255,0.6) inset',
          textAlign: 'center',
          position: 'relative',
          animation: 'popInUpdate 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}>

          {/* Dismiss Button */}
          {!updateInfo.forceUpdate && (
            <button
              onClick={handleDismiss}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                border: 'none',
                background: 'rgba(0,0,0,0.07)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <X size={16} color="#6B6B6B" />
            </button>
          )}

          {/* Animated Icon */}
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #007AFF, #00C2FF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            animation: 'pulseGlow 2s ease-in-out infinite'
          }}>
            <ArrowUpCircle size={40} color="#FFFFFF" />
          </div>

          {/* Title */}
          <h3 style={{ fontSize: '21px', fontWeight: '800', color: '#000', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
            🎉 Update Ready!
          </h3>

          {/* Version Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(0, 122, 255, 0.1)',
            color: '#007AFF',
            fontSize: '12px',
            fontWeight: '700',
            padding: '4px 14px',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <Sparkles size={12} />
            Version {updateInfo.version}
          </div>

          {/* Release Notes */}
          <div style={{
            fontSize: '13.5px',
            color: '#3A3A3C',
            lineHeight: '1.55',
            margin: '0 0 22px 0',
            background: '#FFFFFF',
            padding: '12px 16px',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.06)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Bell size={14} color="#007AFF" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{updateInfo.releaseNotes || 'New features and improvements are ready!'}</span>
            </div>
          </div>

          {/* Update Button */}
          <button
            onClick={handleUpdate}
            disabled={updating}
            style={{
              width: '100%',
              padding: '15px 20px',
              borderRadius: '18px',
              background: updating
                ? 'linear-gradient(135deg, #8E8E93, #636366)'
                : 'linear-gradient(135deg, #007AFF, #0055D4)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '16px',
              fontWeight: '700',
              cursor: updating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
              boxShadow: updating ? 'none' : '0 8px 22px rgba(0, 122, 255, 0.4)',
              transition: 'all 0.2s ease',
              letterSpacing: '-0.2px'
            }}
          >
            {updating ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spinUpdate 0.8s linear infinite' }} />
                Applying Update...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                ⚡ Update Now (Instant)
              </>
            )}
          </button>

          <p style={{ fontSize: '11px', color: '#8E8E93', marginTop: '10px', marginBottom: 0 }}>
            No re-install needed • Takes &lt;1 second
          </p>
        </div>
      </div>
    </>
  );
};

export default AutoUpdateModal;
