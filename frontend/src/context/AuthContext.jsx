import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  createLocalUser, 
  verifyLocalPassword, 
  getActiveOfflineSession, 
  clearActiveOfflineSession 
} from '../services/localDB';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('ONLINE'); // 'ONLINE' | 'OFFLINE'

  const getBaseURL = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl && !backendUrl.includes('zapchat1') && !backendUrl.includes('zapchat-8svilt1a')) {
      return `${backendUrl.replace(/\/$/, '')}/api`;
    }
    return 'https://zapchat2-r1rsg0hu.b4a.run/api';
  };

  const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 15000,
  });

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  useEffect(() => {
    const checkLoggedIn = async () => {
      // 1. First check active offline session (works without internet)
      const offlineUser = await getActiveOfflineSession();
      if (offlineUser && offlineUser.accountType === 'LOCAL_OFFLINE') {
        setUser(offlineUser);
        setAuthMode('OFFLINE');
        setLoading(false);
        return;
      }

      // 2. Then try online token if internet available
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser({ ...res.data, token, accountType: 'ONLINE', isOffline: false });
          setAuthMode('ONLINE');
          setLoading(false);
          return;
        } catch (error) {
          console.warn('[AuthContext] Online token verification failed:', error.message);
          // Token expired or server unreachable - clear it
          localStorage.removeItem('token');
        }
      }

      setLoading(false);
    };
    checkLoggedIn();
  }, []);

  // ── Online Login ───────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        // Clear any offline session when going online
        await clearActiveOfflineSession();
        const userData = { ...res.data, accountType: 'ONLINE', isOffline: false };
        setUser(userData);
        setAuthMode('ONLINE');
        return userData;
      } else {
        throw new Error('Server سے token نہیں ملا');
      }
    } catch (error) {
      console.error('[AuthContext] Online login failed:', error);
      throw error;
    }
  };

  // ── Online Register ────────────────────────────────────────────────────────
  const register = async (displayName, email, password, phone) => {
    try {
      const res = await api.post('/auth/register', { displayName, email, password, phone });
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        await clearActiveOfflineSession();
        const userData = { ...res.data, accountType: 'ONLINE', isOffline: false };
        setUser(userData);
        setAuthMode('ONLINE');
        return userData;
      } else {
        throw new Error('Server سے token نہیں ملا');
      }
    } catch (error) {
      console.error('[AuthContext] Online registration failed:', error);
      throw error;
    }
  };

  // ── STEP 10: Offline Account Creation ─────────────────────────────────────
  const createOfflineAccount = async (displayName, username, password) => {
    try {
      const offlineUser = await createLocalUser({ displayName, username, password });
      // Clear any online token
      localStorage.removeItem('token');
      setUser(offlineUser);
      setAuthMode('OFFLINE');
      return offlineUser;
    } catch (error) {
      console.error('[AuthContext] Offline account creation failed:', error);
      throw error;
    }
  };

  // ── STEP 10: Offline Login ─────────────────────────────────────────────────
  const loginOffline = async (username, password) => {
    try {
      const offlineUser = await verifyLocalPassword(username, password);
      // Clear any online token
      localStorage.removeItem('token');
      setUser(offlineUser);
      setAuthMode('OFFLINE');
      return offlineUser;
    } catch (error) {
      console.error('[AuthContext] Offline login failed:', error);
      throw error;
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    clearActiveOfflineSession();
    setUser(null);
    setAuthMode('ONLINE');
  };

  // ── Update Profile ─────────────────────────────────────────────────────────
  const updateProfile = async (profileData) => {
    if (user?.isOffline) {
      const updated = { ...user, ...profileData };
      setUser(updated);
      localStorage.setItem('zapchat_active_offline_user', JSON.stringify(updated));
      return updated;
    }
    try {
      const res = await api.put('/auth/profile', profileData);
      setUser(prev => ({ ...prev, ...res.data }));
      return res.data;
    } catch (error) {
      console.error('[AuthContext] Update profile failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      authMode, 
      setAuthMode, 
      login, 
      register, 
      createOfflineAccount, 
      loginOffline, 
      logout, 
      updateProfile, 
      api 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
