const express = require('express');
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const User = require('../models/User');
const Message = require('../models/Message');

const router = express.Router();

// All routes here are protected and admin-only
router.use(protect, admin);

// @desc    Get system statistics
// @route   GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalMessages = await Message.countDocuments();
        const onlineUsers = await User.countDocuments({ status: 'online' });
        
        res.status(200).json({
            totalUsers,
            totalMessages,
            onlineUsers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all users (for management)
// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        // Additional cleanup like deleting messages could be added here
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Send Global Announcement
// @route   POST /api/admin/announcement
router.post('/announcement', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ message: 'Content is required' });

        const users = await User.find({ _id: { $ne: req.user.id } });
        
        // Ensure Admin and User are mutual contacts
        const Contact = require('../models/Contact');
        const contactEntries = [];
        users.forEach(u => {
            // Admin is contact for User
            contactEntries.push({ user: u._id, contact: req.user.id, status: 'accepted' });
            // User is contact for Admin
            contactEntries.push({ user: req.user.id, contact: u._id, status: 'accepted' });
        });
        
        // Use a loop or bulkWrite for efficiency
        for (const entry of contactEntries) {
            await Contact.findOneAndUpdate(
                { user: entry.user, contact: entry.contact },
                entry,
                { upsert: true, new: true }
            );
        }

        const messages = users.map(u => ({
            sender: req.user.id,
            recipient: u._id,
            content: `📢 GLOBAL ANNOUNCEMENT: ${content}`,
            type: 'text',
            status: 'sent'
        }));

        const insertedMessages = await Message.insertMany(messages);
 
         // Notify via socket for real-time appearance
         const io = req.app.get('io');
         if (io) {
             const adminUser = await User.findById(req.user.id).select('displayName profilePicture') || { _id: req.user.id, displayName: 'System Admin' };
             
             const adminRoom = `user:${req.user.id}`;
             
             insertedMessages.forEach(msg => {
                 const recipientRoom = `user:${msg.recipient}`;
                 const populatedMsg = {
                     ...msg.toObject(),
                     sender: {
                         _id: adminUser._id,
                         displayName: adminUser.displayName || 'System Admin',
                         profilePicture: adminUser.profilePicture
                     },
                     createdAt: new Date()
                 };
                 
                 // Send to recipient
                 io.to(recipientRoom).emit('receive_message', populatedMsg);
                 io.to(recipientRoom).emit('notification', { 
                     type: 'new_message', 
                     senderName: adminUser.displayName || 'System Admin',
                     message: content.substring(0, 50) 
                 });

                 // Also send to Admin (sender) room so their UI updates
                 io.to(adminRoom).emit('receive_message', populatedMsg);
             });
         }
 
         res.status(200).json({ message: `Announcement sent to ${users.length} users` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Suspend/unsuspend user
// @route   PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', async (req, res) => {
    try {
        const { isSuspended } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { isSuspended }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Wipe all messages for a user
// @route   DELETE /api/admin/users/:id/messages
router.delete('/users/:id/messages', async (req, res) => {
    try {
        const result = await Message.deleteMany({
            $or: [{ sender: req.params.id }, { recipient: req.params.id }]
        });
        res.status(200).json({ message: `Cleared all user chat history. ${result.deletedCount} messages deleted.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Clear all chats platform-wide (DANGER)
// @route   DELETE /api/admin/clear-all-chats
router.delete('/clear-all-chats', async (req, res) => {
    try {
        const result = await Message.deleteMany({});
        res.status(200).json({ message: `All chats cleared. ${result.deletedCount} messages deleted.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
