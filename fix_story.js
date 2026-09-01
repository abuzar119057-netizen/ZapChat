const fs = require('fs');
const file = 'frontend/src/components/StoryViewer.jsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes("background: 'rgba(255,255,255,0.1)',"));
const endIndex = lines.findIndex(l => l.includes("{/* Footer / Caption */}"));

if (startIndex !== -1 && endIndex !== -1) {
    // We want to replace from startIndex + 6 (which is `cursor: 'pointer'`) down to endIndex - 2 (which is `)}`)
    const replacement = `                            border: '1px solid rgba(255,255,255,0.2)',
                            cursor: 'pointer'
                        }} onClick={() => setIsDownloaded(true)}>
                            {currentStory.mediaType === 'video' && <VideoIcon size={32} />}
                            {currentStory.mediaType === 'image' && <ImageIcon size={32} />}
                            {currentStory.mediaType === 'voice' && <Mic size={32} />}
                            {currentStory.mediaType === 'text' && <MessageSquare size={32} />}
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                            Admin {currentStory.mediaType.charAt(0).toUpperCase() + currentStory.mediaType.slice(1)} Update
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>
                            {currentStory.mediaType === 'video' && 'Video File • 4.2 MB'}
                            {currentStory.mediaType === 'image' && 'Image File • 850 KB'}
                            {currentStory.mediaType === 'voice' && 'Voice Note • 320 KB'}
                            {currentStory.mediaType === 'text' && 'Status Message'}
                        </p>
                        <button 
                            onClick={() => setIsDownloaded(true)}
                            style={{ 
                                background: 'var(--primary)', 
                                border: 'none', 
                                color: '#FFF', 
                                padding: '12px 32px', 
                                borderRadius: '24px', 
                                fontSize: '15px', 
                                fontWeight: '700',
                                boxShadow: '0 4px 15px rgba(0,122,255,0.3)'
                            }}
                        >
                            Download
                        </button>
                    </div>
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        {currentStory.mediaType === 'video' && (
                            <video 
                                ref={mediaRef}
                                src={\`http://localhost:5000/api/files/\${currentStory.fileId}?token=\${localStorage.getItem('token')}\`}
                                autoPlay
                                playsInline
                                style={{ maxWidth: '100%', maxHeight: '100%' }}
                            />
                        )}
                        {currentStory.mediaType === 'image' && (
                            <img 
                                src={\`http://localhost:5000/api/files/\${currentStory.fileId}?token=\${localStorage.getItem('token')}\`}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                alt="Status Update"
                            />
                        )}
                        {currentStory.mediaType === 'voice' && (
                            <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <style>{\`
                                    @keyframes soundwave {
                                        0% { height: 8px; opacity: 0.4; }
                                        50% { height: 48px; opacity: 1; }
                                        100% { height: 8px; opacity: 0.4; }
                                    }
                                    @keyframes pulse-ring {
                                        0% { transform: scale(1); opacity: 0.5; }
                                        100% { transform: scale(1.8); opacity: 0; }
                                    }
                                \`}</style>
                                <div style={{ position: 'relative', margin: '0 auto 40px', width: '140px', height: '140px' }}>
                                    {!isPaused && (
                                        <>
                                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
                                            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: '1s' }}></div>
                                        </>
                                    )}
                                    <div style={{ 
                                        position: 'relative',
                                        width: '140px', 
                                        height: '140px', 
                                        background: 'linear-gradient(135deg, var(--primary) 0%, #8A2BE2 100%)', 
                                        borderRadius: '50%', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 -5px 15px rgba(0,0,0,0.3)',
                                        zIndex: 2,
                                        transform: isPaused ? 'scale(0.95)' : 'scale(1)',
                                        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }}>
                                        <Mic size={56} color="#FFF" />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', height: '60px', marginBottom: '30px' }}>
                                    {[...Array(24)].map((_, i) => {
                                        const dur = 0.5 + (i % 3) * 0.2 + (i % 2) * 0.1;
                                        const del = (i % 5) * 0.1;
                                        return (
                                            <div 
                                                key={i}
                                                style={{
                                                    width: '5px',
                                                    background: '#FFF',
                                                    borderRadius: '4px',
                                                    height: isPaused ? '8px' : '24px', 
                                                    animation: isPaused ? 'none' : \`soundwave \${dur}s ease-in-out infinite alternate\`,
                                                    animationDelay: \`\${del}s\`,
                                                    transition: 'all 0.3s ease'
                                                }}
                                            />
                                        )
                                    })}
                                </div>
                                <div style={{ 
                                    background: 'rgba(0,0,0,0.3)', 
                                    padding: '8px 24px', 
                                    borderRadius: '20px',
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                    color: 'rgba(255,255,255,0.9)',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    letterSpacing: '1.5px',
                                    textTransform: 'uppercase'
                                }}>
                                    {isPaused ? 'Paused' : 'Playing Voice Note'}
                                </div>
                                <audio 
                                    ref={mediaRef}
                                    src={\`http://localhost:5000/api/files/\${currentStory.fileId}?token=\${localStorage.getItem('token')}\`}
                                    autoPlay
                                    style={{ display: 'none' }}
                                />
                            </div>
                        )}
                        {currentStory.mediaType === 'text' && (
                            <div style={{ 
                                background: currentStory.bgColor || '#34C759', 
                                width: '100%', 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                padding: '40px',
                                textAlign: 'center',
                                fontSize: currentStory.fontSize || '28px',
                                fontWeight: '600',
                                color: currentStory.fontColor || '#FFF',
                                fontFamily: currentStory.fontFamily || 'inherit',
                                lineBreak: 'anywhere'
                            }}>
                                {currentStory.caption}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Nav Overlays (Next/Prev) */}
            {!needsDownload && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 5 }}>
                    <div 
                        onMouseDown={handlePressStart}
                        onMouseUp={(e) => handlePressEnd(e, 'prev')}
                        onMouseLeave={() => isHoldPaused && setIsHoldPaused(false)}
                        onTouchStart={handlePressStart}
                        onTouchEnd={(e) => handlePressEnd(e, 'prev')}
                        style={{ flex: 1, cursor: 'pointer' }} 
                    />
                    <div 
                        onMouseDown={handlePressStart}
                        onMouseUp={(e) => handlePressEnd(e, 'next')}
                        onMouseLeave={() => isHoldPaused && setIsHoldPaused(false)}
                        onTouchStart={handlePressStart}
                        onTouchEnd={(e) => handlePressEnd(e, 'next')}
                        style={{ flex: 1, cursor: 'pointer' }} 
                    />
                </div>
            )}`;
            
    lines.splice(startIndex + 6, (endIndex - 1) - (startIndex + 6), replacement);
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Fixed successfully!');
} else {
    console.log('Markers not found', startIndex, endIndex);
}
