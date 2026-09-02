import React, { useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import useFCM from "./hooks/useFCM";
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';
import SplashPage from './pages/SplashPage';
import JoinGroup from './pages/JoinGroup';
import CallOverlay from './components/CallOverlay';
import AutoUpdateModal from './components/AutoUpdateModal';

import { syncService } from './services/syncService';
import { nearbyService } from './services/nearbyService';

function App() {
  const { user, loading } = useAuth();
  
  // Apply theme from user settings or system preference
  useEffect(() => {
    const theme = user?.settings?.theme || localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    // Register service worker for Firebase Cloud Messaging (only in HTTPS / supported env)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .catch(err => console.warn('Service worker registration failed', err));
    }
  }, [user]);

  // Offline mesh & background sync initialization
  useEffect(() => {
    syncService.startMonitoring();
    nearbyService.initializeMeshListener(user);

    return () => {
      syncService.stopMonitoring();
    };
  }, [user]);

  if (loading) {
    return <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  return (
    <>
      <CallOverlay />
      <AutoUpdateModal />
      <Routes>
         <Route path="/" element={<SplashPage />} />
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/chat" />} />
        <Route path="/chat" element={user ? <ChatPage /> : <Navigate to="/auth" />} />
        <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/auth" />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/chat" />} />
        <Route path="/join/:inviteCode" element={user ? <JoinGroup /> : <Navigate to="/auth" />} />
      </Routes>
    </>
  );
}

export default App;
