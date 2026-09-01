const express = require('express');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');
const { getGfsBucket } = require('../config/db');
const mongoose = require('mongoose');

const router = express.Router();

// @desc    Get all messages for current user (for export)
// @route   GET /api/messages/all
router.get('/all', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { recipient: req.user.id }],
      deletedFor: { $ne: req.user.id }
    })
    .sort({ createdAt: 1 })
    .populate('sender recipient', 'displayName email profilePicture');
    
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Star / Unstar message
// @route   PUT /api/messages/:messageId/star
router.put('/:messageId/star', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const idx = msg.starredBy.indexOf(req.user.id);
    if (idx > -1) {
      msg.starredBy.splice(idx, 1);
    } else {
      msg.starredBy.push(req.user.id);
    }
    await msg.save();
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Pin / Unpin message
// @route   PUT /api/messages/:messageId/pin
router.put('/:messageId/pin', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    msg.isPinned = !msg.isPinned;
    await msg.save();

    const io = req.app.get('io');
    if (io) {
      if (msg.groupId) {
        const Group = require('../models/Group');
        const group = await Group.findById(msg.groupId);
        if (group) {
            const pinIdx = group.pinnedMessages.indexOf(msg._id);
            if (pinIdx > -1 && !msg.isPinned) {
                group.pinnedMessages.splice(pinIdx, 1);
            } else if (pinIdx === -1 && msg.isPinned) {
                group.pinnedMessages.push(msg._id);
            }
            await group.save();
            const populatedGroup = await Group.findById(msg.groupId).populate({
                path: 'pinnedMessages',
                populate: { path: 'sender', select: 'displayName profilePicture' }
            });
            io.to(`group:${msg.groupId}`).emit('message_pinned', { 
                groupId: msg.groupId, 
                messageId: msg._id, 
                pinned: msg.isPinned,
                pinnedMessages: populatedGroup.pinnedMessages
            });
        }
      } else {
        io.to(`user:${msg.sender}`).emit('message_pinned', { messageId: msg._id, pinned: msg.isPinned });
        io.to(`user:${msg.recipient}`).emit('message_pinned', { messageId: msg._id, pinned: msg.isPinned });
      }
    }

    res.json({ pinned: msg.isPinned });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get chat history between current user and a contact
// @route   GET /api/messages/:contactId
router.get('/:contactId', protect, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Support pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { sender: req.user.id, recipient: contactId },
            { sender: contactId, recipient: req.user.id }
          ]
        },
        { deletedFor: { $ne: req.user.id } },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Update unseen messages to 'read' if recipient is current user
    const unreadMessageIds = messages
        .filter(m => m.recipient?.toString() === req.user.id && m.status !== 'read')
        .map(m => m._id);
    
    if (unreadMessageIds.length > 0) {
        await Message.updateMany(
            { _id: { $in: unreadMessageIds } },
            { $set: { status: 'read' } }
        );
    }

    // Retroactive Size Population: Fetch missing file sizes from GridFS
    const gfsBucket = getGfsBucket();
    const messagesWithFiles = messages.filter(m => m.fileId && (!m.fileMetadata || !m.fileMetadata.size));
    
    if (gfsBucket && messagesWithFiles.length > 0) {
        const fileIds = messagesWithFiles
            .filter(m => mongoose.isValidObjectId(m.fileId))
            .map(m => new mongoose.Types.ObjectId(m.fileId));
        
        let files = [];
        if (fileIds.length > 0) {
            files = await gfsBucket.find({ _id: { $in: fileIds } }).toArray();
        }
        
        const fileInfoMap = {};
        files.forEach(f => { fileInfoMap[f._id.toString()] = f; });

        messages.forEach(m => {
            if (m.fileId && (!m.fileMetadata || !m.fileMetadata.size)) {
                const info = fileInfoMap[m.fileId.toString()];
                if (info) {
                    m.fileMetadata = {
                        ...(m.fileMetadata || {}),
                        size: info.length,
                        contentType: m.fileMetadata?.contentType || info.contentType,
                        filename: m.fileMetadata?.filename || info.filename
                    };
                }
            }
        });
    }

    res.json(messages.reverse()); // Reverse to get chronological order
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get group chat history
// @route   GET /api/messages/group/:groupId
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Support pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      groupId,
      deletedFor: { $ne: req.user.id },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
    .populate('sender', 'displayName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Advanced search messages
// @route   GET /api/messages/search/all?q=query
router.get('/search/all', protect, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json([]);
        }

        const messages = await Message.find({
            $or: [
                { sender: req.user.id },
                { recipient: req.user.id }
            ],
            content: { $regex: q, $options: 'i' },
            deletedFor: { $ne: req.user.id }
        })
        .populate('sender', 'displayName profilePicture')
        .populate('recipient', 'displayName profilePicture')
        .sort({ createdAt: -1 })
        .limit(20);

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get only media messages (images, audio, files, video)
// @route   GET /api/messages/media/:contactId
router.get('/media/:contactId', protect, async (req, res) => {
    try {
        const { contactId } = req.params;
        const media = await Message.find({
            $or: [
                { sender: req.user.id, recipient: contactId },
                { sender: contactId, recipient: req.user.id },
                { groupId: contactId }
            ],
            type: { $in: ['image', 'audio', 'file', 'video'] },
            deletedFor: { $ne: req.user.id }
        })
        .sort({ createdAt: -1 })
        .limit(30);

        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete single or multiple messages
// @route   POST /api/messages/delete
router.post('/delete', protect, async (req, res) => {
    try {
        const { messageIds, contactId, deleteType } = req.body;
        console.log(`[Delete] User ${req.user.id} requested ${deleteType} delete for ${messageIds?.length} messages`);
        
        const userRole = req.user.role?.toLowerCase();
        const isAdmin = userRole === 'admin';
        const io = req.app.get('io');
        
        // Convert string IDs to ObjectIds for reliable DB matching
        const objIds = messageIds.map(id => {
            try { return new mongoose.Types.ObjectId(id); } catch(e) { return null; }
        }).filter(i => i);

        if (deleteType === 'everyone') {
            const messages = await Message.find({ _id: { $in: objIds } });
            
            if (messages.length === 0) {
                console.log('[Delete] No messages found for the provided IDs');
                return res.json({ success: true, count: 0 });
            }

            // Authorization Check: Admin can delete anything, Sender can delete their own
            const isAuthorized = messages.every(m => 
                isAdmin || m.sender.toString() === req.user.id
            );

            if (!isAuthorized) {
                console.log(`[Delete] User ${req.user.id} unauthorized for 'everyone' delete`);
                return res.status(403).json({ message: 'Not authorized to delete some messages for everyone' });
            }

            const deleteResult = await Message.deleteMany({ _id: { $in: objIds } });
            console.log(`[Delete] Hard deleted ${deleteResult.deletedCount} messages`);
            
            if (io) {
                const participantIds = new Set();
                participantIds.add(req.user.id);
                if (contactId) participantIds.add(contactId);

                messages.forEach(m => {
                    const sId = m.sender?.toString();
                    const rId = m.recipient?.toString();
                    const gId = m.groupId?.toString();
                    if (sId) participantIds.add(sId);
                    if (rId) participantIds.add(rId);
                    if (gId) {
                        io.to(`group:${gId}`).emit('messages_deleted', { messageIds, type: 'hard' });
                        console.log(`[Delete] Broadcasted to group:${gId}`);
                    }
                });

                participantIds.forEach(pId => {
                    io.to(`user:${pId}`).emit('messages_deleted', { messageIds, type: 'hard' });
                });
            }
        } else {
            // Soft delete for current user
            const updateResult = await Message.updateMany(
                { _id: { $in: objIds } },
                { $addToSet: { deletedFor: req.user.id } }
            );
            console.log(`[Delete] Soft deleted ${updateResult.modifiedCount} messages for user ${req.user.id}`);
            
            if (io) {
                io.to(`user:${req.user.id}`).emit('messages_deleted', { messageIds, type: 'soft', userId: req.user.id });
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('[Delete] Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Clear entire chat
// @route   POST /api/messages/clear
router.post('/clear', protect, async (req, res) => {
    try {
        const { contactId } = req.body;
        const userRole = req.user.role?.toLowerCase();
        const io = req.app.get('io');

        const query = {
            $or: [
                { sender: req.user.id, recipient: contactId },
                { sender: contactId, recipient: req.user.id }
            ]
        };

        if (userRole === 'admin') {
            await Message.deleteMany(query);
            if (io) {
                // Notify both parties that the entire thread is gone
                io.to(`user:${req.user.id}`).emit('chat_cleared', { contactId, type: 'hard' });
                io.to(`user:${contactId}`).emit('chat_cleared', { contactId: req.user.id, type: 'hard' });
            }
        } else {
            await Message.updateMany(query, { $addToSet: { deletedFor: req.user.id } });
            if (io) {
                io.to(`user:${req.user.id}`).emit('chat_cleared', { contactId, type: 'soft' });
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// @desc    Sync offline messages
// @route   POST /api/messages/sync
router.post('/sync', protect, async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Invalid messages data' });
        }

        const synced = [];
        const io = req.app.get('io');

        for (const m of messages) {
            const newMsg = new Message({
                sender: req.user.id,
                recipient: m.recipient,
                groupId: m.groupId,
                content: m.content,
                type: m.type || 'text',
                fileUrl: m.fileUrl,
                fileMetadata: m.fileMetadata,
                status: 'delivered',
                createdAt: m.timestamp || m.createdAt || new Date()
            });

            await newMsg.save();

            const populatedMsg = await Message.findById(newMsg._id)
                .populate('sender', 'displayName profilePicture')
                .populate('recipient', 'displayName profilePicture');

            synced.push({
                localId: m.localId,
                serverMsg: populatedMsg
            });

            if (io) {
                if (m.groupId) {
                    io.to(`group:${m.groupId}`).emit('receive_group_message', populatedMsg);
                } else {
                    io.to(`user:${m.recipient}`).emit('receive_message', populatedMsg);
                }
            }
        }

        res.json({ success: true, synced });
    } catch (error) {
        console.error('[Sync] Error syncing messages:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
