import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Phone, Eye, MessageCircle, UserPlus, CheckCircle } from 'lucide-react';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
        if (isLogin) {
          await login(email, password);
        } else {
          await register(displayName, email, password, phone);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Authentication failed.');
      } finally {
        setLoading(false);
      }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            width: '100vw',
            background: '#FFFFFF', 
            padding: '3vh 6vw', 
            boxSizing: 'border-box',
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif'
        }}>
            <div>
                {/* Brand Logo Illustration */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2vh' }}>
                    <img 
                      src="/logo.png" 
                      alt="ZapChat Logo" 
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 6px 12px rgba(0,122,255,0.25))'
                      }} 
                    />
                </div>

                    {/* Typography Header */}
                    <div style={{ textAlign: 'center', marginBottom: '2.5vh' }}>
                        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#000', marginBottom: '6px', letterSpacing: '-0.5px' }}>
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h1>
                        <p style={{ color: '#8E8E93', fontSize: '14px', fontWeight: '500' }}>
                            {isLogin ? 'Login to continue' : 'Sign up to get started'}
                        </p>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div style={{ padding: '12px', background: '#FF3B3015', color: '#FF3B30', borderRadius: '12px', fontSize: '13px', marginBottom: '2vh', textAlign: 'center', fontWeight: '600' }}>
                            {error}
                        </div>
                    )}

                    {/* Forms Section */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.8vh' }}>
                        
                        {!isLogin && (
                            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                                <User size={20} color="#8E8E93" style={{ marginRight: '12px' }} />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                            {!isLogin ? <Mail size={20} color="#8E8E93" style={{ marginRight: '12px' }} /> : <User size={20} color="#8E8E93" style={{ marginRight: '12px' }} />}
                            <input
                                type={!isLogin ? "email" : "text"}
                                placeholder={isLogin ? "Email or Phone" : "Email"}
                                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {!isLogin && (
                            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                                <Phone size={20} color="#8E8E93" style={{ marginRight: '12px' }} />
                                <input
                                    type="tel"
                                    placeholder="Phone Number"
                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                            <Lock size={20} color="#8E8E93" style={{ marginRight: '12px' }} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            {isLogin && (
                                <span style={{ fontSize: '13px', color: '#007AFF', fontWeight: '600', cursor: 'pointer', paddingLeft: '10px' }}>Forgot?</span>
                            )}
                            {!isLogin && (
                                <Eye size={20} color="#8E8E93" style={{ cursor: 'pointer', marginLeft: '10px' }} onClick={() => setShowPassword(!showPassword)} />
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                background: '#007AFF', 
                                color: 'white', 
                                padding: '14px', 
                                borderRadius: '14px', 
                                fontWeight: '700', 
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '16px',
                                marginTop: '1vh',
                                boxShadow: '0 6px 18px rgba(0,122,255,0.2)',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                        </button>

                        {isLogin && (
                            <div style={{ marginTop: '2.5vh' }}>
                                {/* Styled 'Or continue with' Divider */}
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2vh' }}>
                                    <div style={{ flex: 1, height: '1px', background: '#E5E5EA' }}></div>
                                    <span style={{ padding: '0 12px', color: '#8E8E93', fontSize: '13px', fontWeight: '500' }}>Or continue with</span>
                                    <div style={{ flex: 1, height: '1px', background: '#E5E5EA' }}></div>
                                </div>

                                {/* Social Buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" style={{ 
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                                        padding: '12px', background: '#FFF', border: '1px solid #E5E5EA', borderRadius: '14px', 
                                        cursor: 'pointer', fontWeight: '600', color: '#000', fontSize: '15px' 
                                    }}>
                                        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                                            </g>
                                        </svg>
                                        Google
                                    </button>
                                    <button type="button" style={{ 
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', 
                                        padding: '12px', background: '#FFF', border: '1px solid #E5E5EA', borderRadius: '14px', 
                                        cursor: 'pointer', fontWeight: '600', color: '#000', fontSize: '15px' 
                                    }}>
                                        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                            <path fill="#000" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.53.68 3.09.68.79 0 2.1-.81 3.52-.75 2.15.09 3.55 1.13 4.25 2.55-3.66 2.13-3.06 6.36.43 7.82-.79 1.44-1.74 2.87-3.29 2.67zM12.03 7.25c-.15-2.23 1.89-4.22 4-4.25.18 2.29-2.07 4.28-4 4.25z"/>
                                        </svg>
                                        Apple
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
            </div>

            {/* Footer Link */}
            <div style={{ textAlign: 'center', marginTop: '2.5vh' }}>
                <p style={{ color: '#8E8E93', fontSize: '14px' }}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <span 
                        onClick={() => setIsLogin(!isLogin)} 
                        style={{ color: '#007AFF', fontWeight: '700', cursor: 'pointer', marginLeft: '4px' }}
                    >
                        {isLogin ? 'Sign up' : 'Login'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
