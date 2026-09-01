const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/StoryViewer.jsx', 'utf8');

// 1. Add Share2 to import
content = content.replace(
  "import { X, ChevronLeft, ChevronRight, Download, Play, MessageSquare, Image as ImageIcon, Video as VideoIcon, Mic, Eye, Search, Send, Heart, Smile, Loader2, Trash2 } from 'lucide-react';",
  "import { X, ChevronLeft, ChevronRight, Download, Play, MessageSquare, Image as ImageIcon, Video as VideoIcon, Mic, Eye, Search, Send, Heart, Smile, Loader2, Trash2, Share2 } from 'lucide-react';"
);

// 2. Add isDeletingStory state after the stories state
content = content.replace(
  "    const [stories, setStories] = useState(storyGroup.stories);",
  "    const [stories, setStories] = useState(storyGroup.stories);\n    const [isDeletingStory, setIsDeletingStory] = useState(false);\n    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);"
);

// 3. Add handleDeleteStory and handleShareStory functions before return(
const functionsToAdd = `
    // Delete Story (only owner or admin)
    const handleDeleteStory = async () => {
        setShowDeleteConfirm(false);
        setIsDeletingStory(true);
        try {
            const resp = await fetch(\`http://localhost:5000/api/stories/\${currentStory._id}\`, {
                method: 'DELETE',
                headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
            });
            if (!resp.ok) throw new Error('Delete failed');
            // Remove from local state
            const remaining = stories.filter(s => s._id !== currentStory._id);
            if (remaining.length === 0) {
                onClose();
            } else {
                setStories(remaining);
                if (currentIndex >= remaining.length) {
                    setCurrentIndex(remaining.length - 1);
                }
                setProgress(0);
            }
            setToastMsg('🗑️ Status deleted');
        } catch (err) {
            console.error('Delete story failed:', err);
            setToastMsg('❌ Failed to delete status');
        } finally {
            setIsDeletingStory(false);
        }
    };

    // Share Story
    const handleShareStory = async () => {
        const storyUrl = currentStory.fileId
            ? \`http://localhost:5000/api/files/\${currentStory.fileId}?token=\${localStorage.getItem('token')}\`
            : null;
        const shareData = {
            title: \`\${storyGroup.user.displayName}'s Status\`,
            text: currentStory.caption || \`Check out \${storyGroup.user.displayName}'s status!\`,
            ...(storyUrl ? { url: storyUrl } : {})
        };
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') setToastMsg('❌ Share failed');
            }
        } else {
            // Fallback: copy to clipboard
            const textToCopy = storyUrl || shareData.text;
            try {
                await navigator.clipboard.writeText(textToCopy);
                setToastMsg('🔗 Link copied to clipboard!');
            } catch {
                setToastMsg('❌ Could not copy link');
            }
        }
    };

`;

content = content.replace(
    "    return (\n        <div style={{\n            position: 'fixed',",
    functionsToAdd + "    return (\n        <div style={{\n            position: 'fixed',"
);

// 4. Replace the header right-side buttons to add Share + Delete + Confirm dialog
const oldHeaderRight = `            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>`;

const newHeaderRight = `            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Share Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleShareStory(); }}
                        title="Share Status"
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        <Share2 size={18} />
                    </button>
                    {/* Delete Button — only for owner or admin */}
                    {(storyGroup.user._id === currentUser.id || storyGroup.user._id === currentUser._id || currentUser.role === 'admin') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                            title="Delete Status"
                            disabled={isDeletingStory}
                            style={{ background: 'rgba(255,59,48,0.2)', border: 'none', color: '#FF3B30', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDeletingStory ? 'default' : 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.35)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,59,48,0.2)'}
                        >
                            {isDeletingStory ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                    )}
                    {/* Close Button */}
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        <X size={20} />
                    </button>
                </div>

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }} onClick={() => setShowDeleteConfirm(false)}>
                    <div style={{ background: '#1C1C1E', borderRadius: '20px', padding: '28px 24px', maxWidth: '320px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,59,48,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Trash2 size={26} color="#FF3B30" />
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#FFF', marginBottom: '8px' }}>Delete Status?</div>
                        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '24px', lineHeight: '1.5' }}>
                            This status will be permanently deleted. This action cannot be undone.
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '13px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={handleDeleteStory} style={{ flex: 1, padding: '13px', borderRadius: '14px', background: '#FF3B30', border: 'none', color: '#FFF', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}`;

if (content.includes(oldHeaderRight)) {
    content = content.replace(oldHeaderRight, newHeaderRight);
    fs.writeFileSync('frontend/src/components/StoryViewer.jsx', content);
    console.log('SUCCESS: Delete + Share icons added!');
} else {
    console.log('ERROR: Could not find header right block');
}
