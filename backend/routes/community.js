const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');

// @route   GET api/community/all
// @desc    Get all community data (Roadmap, Contributors, Discussions)
// @access  Private
router.get('/all', protect, async (req, res) => {
    try {
        // 1. Roadmap (Simulated real data)
        const roadmap = [
            { title: 'AI Chat Assistant', status: 'In Progress', progress: 65, color: '#007AFF' },
            { title: 'Cloud Media Sync', status: 'Testing', progress: 92, color: '#34C759' },
            { title: 'Custom App Icons', status: 'Planned', progress: 15, color: '#FF9500' },
            { title: 'Advanced Call Filters', status: 'Planned', progress: 8, color: '#5856D6' },
            { title: 'Voice Message Transcription', status: 'Idea', progress: 0, color: '#8E8E93' }
        ];

        // 2. Contributors (Real Data from Users)
        // We'll simulate points based on message count or just pick top users
        const users = await User.find().limit(10);
        const contributors = users.map(u => ({
            name: u.displayName,
            role: u.role === 'admin' ? 'Elite Architect' : 'Pro Member',
            points: Math.floor(Math.random() * 5000) + 1000 + (u.role === 'admin' ? 5000 : 0),
            badge: u.role === 'admin' ? '🏆' : '⭐'
        })).sort((a, b) => b.points - a.points);

        // 3. Discussions (Simulated real threads)
        const discussions = [
            { title: 'Best Privacy Settings for 2026?', replies: 142, tag: 'Tips' },
            { title: 'How to use two-step verification?', replies: 89, tag: 'Security' },
            { title: 'Feature request: Voice message speed', replies: 256, tag: 'Idea' },
            { title: 'Desktop app beta testing feedback', replies: 67, tag: 'Beta' },
            { title: 'Group Admin best practices', replies: 45, tag: 'Groups' }
        ];

        res.json({ roadmap, contributors, discussions });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
