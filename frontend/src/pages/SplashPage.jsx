import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';

const SplashPage = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            const timer = setTimeout(() => {
                if (user) {
                    navigate('/chat');
                } else {
                    navigate('/auth');
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [user, loading, navigate]);

    return (
        <div style={{ 
            height: '100%', 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            background: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}>
            {/* Center Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                {/* Icon Squircle */}
                <div style={{ 
                    width: '100px', 
                    height: '100px', 
                    background: '#007AFF', 
                    borderRadius: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 12px 32px rgba(0,122,255,0.3)',
                    marginBottom: '32px'
                }}>
                   <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="white"/>
                       </svg>
                       <Zap size={22} color="#007AFF" fill="#007AFF" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                   </div>
                </div>
                
                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                    <span style={{ color: '#000' }}>Zap </span>
                    <span style={{ color: '#007AFF' }}>Chat</span>
                </h1>
                
                <p style={{ color: '#555555', fontSize: '16px', fontWeight: '500', letterSpacing: '0.2px' }}>
                    Fast. Secure. Simple.
                </p>
            </div>

            {/* Background SVG Waves */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%', zIndex: 1 }}>
                <svg viewBox="0 0 1440 320" style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%', preserveAspectRatio: 'none' }}>
                    {/* Primary Wave */}
                    <path fill="rgba(0,122,255,0.05)" d="M0,256L48,229.3C96,203,192,149,288,138.7C384,128,480,160,576,192C672,224,768,256,864,250.7C960,245,1056,203,1152,176C1248,149,1344,139,1392,133.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    {/* Secondary Wave Line */}
                    <path fill="none" stroke="#007AFF" strokeWidth="2" strokeOpacity="1" d="M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,224C672,213,768,171,864,133.3C960,96,1056,64,1152,58.7C1248,53,1344,75,1392,85.3L1440,96"></path>
                </svg>
            </div>

            {/* Bottom Slider Indicator */}
            <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '8px', zIndex: 10 }}>
                <div style={{ width: '32px', height: '6px', background: '#007AFF', borderRadius: '4px' }}></div>
                <div style={{ width: '6px', height: '6px', background: '#E5E5EA', borderRadius: '50%' }}></div>
                <div style={{ width: '6px', height: '6px', background: '#E5E5EA', borderRadius: '50%' }}></div>
            </div>
        </div>
    );
};

export default SplashPage;
