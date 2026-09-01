// src/hooks/useFCM.js
// Uses native browser Notification API (no Firebase dependency needed)
import { useEffect, useState } from 'react';

export default function useFCM() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (typeof Notification === 'undefined') return;

    // If already granted, nothing to do
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return;
    }

    // Request permission on mount
    Notification.requestPermission().then((result) => {
      setPermission(result);
    });
  }, []);

  // Helper to show a local notification
  const showNotification = (title = 'Notification', body = '') => {
    if (permission === 'granted') {
      new Notification(title, { body });
    }
  };

  // Stub removeToken for API compatibility
  const removeToken = () => {};

  return { token: null, permission, showNotification, removeToken };
}
