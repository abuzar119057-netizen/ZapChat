import React, { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Search, Smile, Image as ImageIcon, MessageCircle } from 'lucide-react';

const MediaPicker = ({ onEmojiClick, onGifClick, onStickerClick, isBottomSheet }) => {
    const [view, setView] = useState('emoji');
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Curated Stickers (WhatsApp styles)
    const STICKERS = [
        { id: 1, url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY4ZWFuaDhzbm44bmM4bm44bmM4bm44bmM4bm44bmM4bm44bmM4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKMGpxN87F15Z2E/giphy.gif' },
        { id: 2, url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY4ZWFuaDhzbm44bmM4bm44bmM4bm44bmM4bm44bmM4bm44bmM4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVUn7iM8FMEU24/giphy.gif' },
        { id: 3, url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY4ZWFuaDhzbm44bmM4bm44bmM4bm44bmM4bm44bmM4bm44bmM4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVyU9FmX9M4Q00/giphy.gif' },
        { id: 4, url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY4ZWFuaDhzbm44bmM4bm44bmM4bm44bmM4bm44bmM4bm44bmM4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVUn7iM8FMEU24/giphy.gif' },
        { id: 5, url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY4ZWFuaDhzbm44bmM4bm44bmM4bm44bmM4bm44bmM4bm44bmM4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKTUn7iM8FMEU24/giphy.gif' },
        { id: 6, url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHY4ZWFuaDhzbm44bmM4bm44bmM4bm44bmM4bm44bmM4bm44bmM4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1z/3o7TKVUn7iM8FMEU24/giphy.gif' },
    ];

    const fetchGifs = async (query = '') => {
        setLoading(true);
        try {
            // Using Tenor API (Google's service)
            const apikey = "LIVDSRZULEUE"; // Public test key
            const endpoint = query 
                ? `https://tenor.googleapis.com/v2/search?q=${query}&key=${apikey}&limit=20`
                : `https://tenor.googleapis.com/v2/featured?key=${apikey}&limit=20`;
            
            const resp = await fetch(endpoint);
            const data = await resp.json();
            setGifs(data.results || []);
        } catch (err) {
            console.error('GIF fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'gif') fetchGifs();
    }, [view]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') fetchGifs(gifSearch);
    };

    return (
        <div className="media-picker" style={isBottomSheet ? {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        } : { 
            position: 'absolute', 
            bottom: '74px', 
            left: '16px', 
            background: 'white', 
            borderRadius: '18px', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', 
            width: '380px', 
            height: '300px', 
            zIndex: 100, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.05)'
        }}>
            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {view === 'emoji' && (
                    <EmojiPicker 
                        onEmojiClick={(emojiData) => onEmojiClick(emojiData.emoji)}
                        width="100%"
                        height="100%"
                        skinTonesDisabled
                        emojiStyle="google" // High-fidelity Google/Android style Emojis
                        searchPlaceHolder="Search emojis..."
                        previewConfig={{ showPreview: false }}
                    />
                )}

                {view === 'gif' && (
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <input 
                                type="text"
                                placeholder="Search Tenor GIFs"
                                value={gifSearch}
                                onChange={(e) => setGifSearch(e.target.value)}
                                onKeyDown={handleSearch}
                                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '20px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                            />
                            <Search size={16} color="#54656f" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {loading ? (
                                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '20px' }}>Loading...</div>
                            ) : (
                                gifs.map(gif => (
                                    <img 
                                        key={gif.id}
                                        src={gif.media_formats.tinygif.url}
                                        onClick={() => onGifClick(gif.media_formats.gif.url)}
                                        style={{ width: '100%', borderRadius: '8px', cursor: 'pointer' }}
                                        alt=""
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}

                {view === 'sticker' && (
                    <div style={{ padding: '12px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {STICKERS.map(sticker => (
                            <img 
                                key={sticker.id}
                                src={sticker.url}
                                onClick={() => onStickerClick(sticker.url)}
                                style={{ width: '100%', cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                alt=""
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation (WhatsApp Style) */}
            <div style={{ display: 'flex', borderTop: '1px solid rgba(0,0,0,0.05)', background: isBottomSheet ? 'rgba(255, 255, 255, 0.05)' : '#f0f2f5' }}>
                <div 
                    onClick={() => setView('emoji')}
                    style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '12px', cursor: 'pointer', borderBottom: view === 'emoji' ? '3px solid var(--primary)' : '3px solid transparent' }}
                >
                    <Smile size={24} color={view === 'emoji' ? 'var(--primary)' : (isBottomSheet ? '#8E8E93' : '#54656f')} />
                </div>
                <div 
                    onClick={() => setView('gif')}
                    style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '12px', cursor: 'pointer', borderBottom: view === 'gif' ? '3px solid var(--primary)' : '3px solid transparent' }}
                >
                    <span style={{ fontWeight: '800', fontSize: '18px', color: view === 'gif' ? 'var(--primary)' : (isBottomSheet ? '#8E8E93' : '#54656f') }}>GIF</span>
                </div>
                <div 
                    onClick={() => setView('sticker')}
                    style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '12px', cursor: 'pointer', borderBottom: view === 'sticker' ? '3px solid var(--primary)' : '3px solid transparent' }}
                >
                    <ImageIcon size={24} color={view === 'sticker' ? 'var(--primary)' : (isBottomSheet ? '#8E8E93' : '#54656f')} />
                </div>
            </div>
        </div>
    );
};

export default MediaPicker;
