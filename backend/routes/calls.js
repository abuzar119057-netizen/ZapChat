const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const { protect } = require('../middleware/auth');

// @desc    Get all call logs for current user
// @route   GET /api/calls
router.get('/', protect, async (req, res) => {
    try {
        const calls = await Call.find({
            $or: [{ caller: req.user.id }, { participants: req.user.id }]
        })
        .populate('caller', 'displayName profilePicture phone role')
        .populate('participants', 'displayName profilePicture phone role')
        .populate('group', 'displayName groupIcon')
        .sort({ createdAt: -1 })
        .limit(50);

        res.json(calls);
    } catch (error) {
        console.error('Fetch Calls Error:', error);
        res.status(500).json({ message: 'Error fetching call history' });
    }
});

// @desc    Log a new call
// @route   POST /api/calls
router.post('/', protect, async (req, res) => {
    try {
        const { participants, type, status, duration, isGroup, group } = req.body;
        
        const call = await Call.create({
            caller: req.user.id,
            participants,
            type,
            status,
            duration,
            isGroup,
            group
        });

        const populatedCall = await Call.findById(call._id)
            .populate('caller', 'displayName profilePicture phone role')
            .populate('participants', 'displayName profilePicture phone role')
            .populate('group', 'displayName groupIcon');

        // Real-time update via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(req.user.id.toString()).emit('call_history_update', populatedCall);
            if (participants && participants.length > 0) {
                participants.forEach(pId => {
                    io.to(pId.toString()).emit('call_history_update', populatedCall);
                });
            }
        }

        res.status(201).json(populatedCall);
    } catch (error) {
        console.error('Log Call Error:', error);
        res.status(500).json({ message: 'Error logging call' });
    }
});

module.exports = router;
