import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Axios instance with interceptor to add token
  const getBaseURL = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
      // Remove trailing slash if present
      return `${backendUrl.replace(/\/$/, '')}/api`;
    }
    return 'https://zapchat1-vbymlxsu.b4a.run/api'; // Live Back4App backend
  };

  const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 15000, // 15 second timeout for mobile networks
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
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and get user profile
          const res = await api.get('/auth/me');
          setUser({ ...res.data, token });
        } catch (error) {
          console.error("Token verification failed:", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      console.error('Login request failed:', error);
      throw error;
    }
  };

  const register = async (displayName, email, password, phone) => {
    try {
      const res = await api.post('/auth/register', { displayName, email, password, phone });
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        setUser(res.data);
        return res.data;
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      console.error('Registration request failed:', error);
      throw error;
    }
  };


  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await api.put('/auth/profile', profileData);
      setUser(prev => ({ ...prev, ...res.data }));
      return res.data;
    } catch (error) {
      console.error('Update profile failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, api }}>
      {children}
    </AuthContext.Provider>
  );
};
