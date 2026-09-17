import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Phone, Eye, EyeOff, Wifi, WifiOff, ShieldCheck, UserPlus, LogIn } from 'lucide-react';

const AuthPage = () => {
    const [mode, setMode] = useState('ONLINE'); // 'ONLINE' | 'OFFLINE'
    const [isLogin, setIsLogin] = useState(true);
    
    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register, createOfflineAccount, loginOffline } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'OFFLINE') {
                if (isLogin) {
                    if (!username || !password) {
                        throw new Error('Please enter your offline username and password.');
                    }
                    await loginOffline(username, password);
                } else {
                    if (!displayName || !username || !password) {
                        throw new Error('Please fill in all required fields.');
                    }
                    if (password.length < 4) {
                        throw new Error('Password must be at least 4 characters long.');
                    }
                    if (password !== confirmPassword) {
                        throw new Error('Passwords do not match.');
                    }
                    await createOfflineAccount(displayName, username, password);
                }
            } else {
                if (isLogin) {
                    await login(email, password);
                } else {
                    await register(displayName, email, password, phone);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Authentication failed.');
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
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5vh' }}>
                    <img 
                      src="/logo.png" 
                      alt="ZapChat Logo" 
                      style={{ 
                        width: '72px', 
                        height: '72px', 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 6px 12px rgba(0,122,255,0.25))'
                      }} 
                    />
                </div>

                {/* Typography Header */}
                <div style={{ textAlign: 'center', marginBottom: '2vh' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#000', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p style={{ color: '#8E8E93', fontSize: '13px', fontWeight: '500' }}>
                        {mode === 'OFFLINE' 
                            ? (isLogin ? 'Sign in with your local offline key' : 'Create a password-protected local identity')
                            : (isLogin ? 'Login with your cloud account' : 'Sign up for cloud & online sync')
                        }
                    </p>
                </div>

                {/* Mode Selector Toggle Switch */}
                <div style={{ 
                    display: 'flex', 
                    background: '#F2F2F7', 
                    padding: '4px', 
                    borderRadius: '14px', 
                    marginBottom: '2vh' 
                }}>
                    <button
                        type="button"
                        onClick={() => { setMode('ONLINE'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: mode === 'ONLINE' ? '#FFF' : 'transparent',
                            color: mode === 'ONLINE' ? '#007AFF' : '#8E8E93',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: mode === 'ONLINE' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Wifi size={15} />
                        Online Cloud Mode
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('OFFLINE'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: mode === 'OFFLINE' ? '#34C759' : 'transparent',
                            color: mode === 'OFFLINE' ? '#FFF' : '#8E8E93',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: mode === 'OFFLINE' ? '0 2px 8px rgba(52,199,89,0.3)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <WifiOff size={15} />
                        Offline Mesh Mode
                    </button>
                </div>

                {/* Offline Hardware/Encryption Banner */}
                {mode === 'OFFLINE' && (
                    <div style={{ 
                        padding: '10px 14px', 
                        background: '#34C75915', 
                        color: '#28A745', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        marginBottom: '2vh', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontWeight: '600' 
                    }}>
                        <ShieldCheck size={18} color="#34C759" />
                        <span>Secured with PBKDF2 (100k rounds) & Hardware Keystore</span>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div style={{ padding: '12px', background: '#FF3B3015', color: '#FF3B30', borderRadius: '12px', fontSize: '13px', marginBottom: '2vh', textAlign: 'center', fontWeight: '600' }}>
                        {error}
                    </div>
                )}

                {/* Forms Section */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5vh' }}>
                    
                    {/* Display Name (Online Register OR Offline Signup) */}
                    {(!isLogin || mode === 'OFFLINE' && !isLogin) && (
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                            <User size={20} color="#8E8E93" style={{ marginRight: '12px' }} />
                            <input
                                type="text"
                                placeholder="Full Display Name"
                                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {/* Offline Username OR Online Email/Phone */}
                    {mode === 'OFFLINE' ? (
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                            <User size={20} color="#8E8E93" style={{ marginRight: '12px' }} />
                            <input
                                type="text"
                                placeholder="Local Username (e.g. alex_mesh)"
                                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    ) : (
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
                    )}

                    {/* Phone field (Online Register only) */}
                    {mode === 'ONLINE' && !isLogin && (
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                            <Phone size={20} color="#8E8E93" style={{ marginRight: '12px' }} />
                            <input
                                type="tel"
                                placeholder="Phone Number (Optional)"
                                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Password Input */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                        <Lock size={20} color="#8E8E93" style={{ marginRight: '12px' }} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder={mode === 'OFFLINE' ? "Local Password" : "Password"}
                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '10px' }}
                        >
                            {showPassword ? <EyeOff size={20} color="#8E8E93" /> : <Eye size={20} color="#8E8E93" />}
                        </button>
                    </div>

                    {/* Confirm Password (Offline Signup only) */}
                    {mode === 'OFFLINE' && !isLogin && (
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', border: '1px solid #E5E5EA', borderRadius: '14px', background: '#FFF' }}>
                            <Lock size={20} color="#8E8E93" style={{ marginRight: '12px' }} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000', background: 'transparent' }}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {/* Action Button */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ 
                            background: mode === 'OFFLINE' ? '#34C759' : '#007AFF', 
                            color: 'white', 
                            padding: '14px', 
                            borderRadius: '14px', 
                            fontWeight: '700', 
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            marginTop: '1vh',
                            boxShadow: mode === 'OFFLINE' ? '0 6px 18px rgba(52,199,89,0.3)' : '0 6px 18px rgba(0,122,255,0.2)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {loading ? 'Processing...' : (
                            isLogin 
                                ? (mode === 'OFFLINE' ? 'Sign In Offline' : 'Login Online') 
                                : (mode === 'OFFLINE' ? 'Create Offline Account' : 'Sign Up Online')
                        )}
                    </button>
                </form>
            </div>

            {/* Footer Link */}
            <div style={{ textAlign: 'center', marginTop: '2vh' }}>
                <p style={{ color: '#8E8E93', fontSize: '14px' }}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <span 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }} 
                        style={{ color: mode === 'OFFLINE' ? '#34C759' : '#007AFF', fontWeight: '700', cursor: 'pointer', marginLeft: '4px' }}
                    >
                        {isLogin ? (mode === 'OFFLINE' ? 'Create Offline Account' : 'Sign up') : (mode === 'OFFLINE' ? 'Sign In' : 'Login')}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;

