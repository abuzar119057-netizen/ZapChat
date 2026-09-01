import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Settings, Shield, User, Zap, LogOut, ArrowRight, Activity, Users, LayoutDashboard } from 'lucide-react';

const HomePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const menuItems = [
        { 
            title: 'Messages', 
            desc: 'Chat with your friends and global communities', 
            icon: <MessageSquare size={28} />, 
            link: '/chat',
            color: 'var(--primary)',
            bg: 'var(--primary-glass)',
            large: true
        },
        { 
            title: 'Settings', 
            desc: 'Configure privacy and app controls', 
            icon: <Settings size={28} />, 
            link: '/settings',
            color: '#64748b',
            bg: 'rgba(100, 116, 139, 0.1)'
        },
        { 
            title: 'Profile', 
            desc: 'Edit your identity and avatar', 
            icon: <User size={28} />, 
            link: '/settings',
            color: '#ec4899',
            bg: 'rgba(236, 72, 153, 0.1)'
        }
    ];

    if (user?.role === 'admin') {
        menuItems.push({
            title: 'Admin Panel',
            desc: 'System monitoring and user management',
            icon: <Shield size={28} />,
            link: '/admin',
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.1)',
            large: true
        });
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'var(--bg-main)',
            overflowY: 'auto',
            padding: '32px 32px 100px'
        }}>
            {/* Pro Header */}
            <header style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '48px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="glass" style={{ 
                        background: 'var(--primary)',
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)'
                    }}>
                        <Zap size={24} fill="white" />
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-pro)' }}>Zap Chat</span>
                </div>
                <button className="icon-btn glass" onClick={logout} style={{ width: '44px', height: '44px' }}>
                    <LogOut size={20} color="var(--text-muted)" />
                </button>
            </header>

            {/* Welcome Quote */}
            <section className="animate-fade" style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--text-pro)', fontWeight: '800', marginBottom: '8px' }}>
                   Welcome, {user?.displayName.split(' ')[0]}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>What would you like to do today?</p>
            </section>

            {/* Quick Insights */}
            <div className="animate-fade" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '20px',
                marginBottom: '40px'
            }}>
                <div className="glass" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={18} />
                        <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800' }}>Active & Secure</div>
                </div>
                <div className="glass" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} />
                        <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Community</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800' }}>1.2k Online</div>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="animate-fade" style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px'
            }}>
                {menuItems.map((item, idx) => (
                    <div 
                        key={idx} 
                        className="glass"
                        onClick={() => navigate(item.link)}
                        style={{ 
                            cursor: 'pointer',
                            padding: '32px',
                            borderRadius: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            position: 'relative',
                            transition: 'var(--transition-pro)',
                            boxShadow: 'var(--shadow-l2)',
                            gridColumn: item.large ? 'span 2' : 'span 1'
                        }}
                    >
                        <div style={{ 
                            width: '56px', 
                            height: '56px', 
                            background: item.bg, 
                            color: item.color,
                            borderRadius: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {item.icon}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>{item.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>{item.desc}</p>
                        </div>
                        <div style={{ position: 'absolute', right: '32px', bottom: '32px', opacity: 0.3 }}>
                           <ArrowRight size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Pro Floating Navigation */}
            <nav className="glass" style={{ 
                position: 'fixed', 
                bottom: '24px', 
                left: '50%', 
                transform: 'translateX(-50%)',
                padding: '12px 32px',
                borderRadius: '999px',
                display: 'flex',
                gap: '40px',
                boxShadow: 'var(--shadow-l3)',
                zIndex: 100
            }}>
                <div onClick={() => navigate('/chat')} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                   <MessageSquare size={24} />
                </div>
                <div onClick={() => navigate('/')} style={{ cursor: 'pointer', color: 'var(--primary)' }}>
                   <Zap size={24} />
                </div>
                <div onClick={() => navigate('/admin')} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                   <LayoutDashboard size={24} />
                </div>
                <div onClick={() => navigate('/settings')} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                   <User size={24} />
                </div>
            </nav>
        </div>
    );
};

export default HomePage;
