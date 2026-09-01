const express = require('express');
const crypto = require('crypto');
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');
const Report = require('../models/Report');
const ScheduledMessage = require('../models/ScheduledMessage');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── CREATE GROUP ───
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, icon, members } = req.body;
    if (!name || !members || members.length === 0) {
      return res.status(400).json({ message: 'Please provide group name and members' });
    }

    const allMembers = [...new Set([...members, req.user.id])];

    const group = await Group.create({
      name, description, icon,
      members: allMembers,
      admins: [req.user.id],
      createdBy: req.user.id
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'displayName profilePicture status lastSeen');

    await Message.create({
      sender: req.user.id,
      groupId: group._id,
      content: `${req.user.displayName || 'Someone'} created group "${name}"`,
      type: 'text',
      isSystem: true,
      status: 'sent'
    });

    const io = req.app.get('io');
    if (io) {
      allMembers.forEach(memberId => {
        io.to(`user:${memberId}`).emit('group_created', populatedGroup);
      });
    }

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET ALL GROUPS FOR USER ───
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('members', 'displayName profilePicture status lastSeen');

    const enrichedGroups = await Promise.all(groups.map(async (g) => {
      const lastMessage = await Message.findOne({ groupId: g._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'displayName');
      return { ...g.toObject(), lastMessage };
    }));

    res.json(enrichedGroups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET SINGLE GROUP ───
router.get('/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'displayName profilePicture status lastSeen email')
      .populate('admins', 'displayName profilePicture')
      .populate('createdBy', 'displayName')
      .populate('pinnedMessages');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── UPDATE GROUP INFO (name, description, icon) ───
router.put('/:groupId/update-info', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check permission
    if (group.settings.editInfoRestricted && !group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can edit group info' });
    }

    const { name, description, icon } = req.body;
    
    const isAdmin = group.admins.includes(req.user.id);
    if (!isAdmin) {
        if (name && group.settings.whoCanEditName === 'admins') return res.status(403).json({ message: 'Only admins can edit group name' });
        if (description !== undefined && group.settings.whoCanEditDesc === 'admins') return res.status(403).json({ message: 'Only admins can edit description' });
        if (icon !== undefined && group.settings.whoCanEditImage === 'admins') return res.status(403).json({ message: 'Only admins can edit group image' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (icon !== undefined) group.icon = icon;
    await group.save();

    const updated = await Group.findById(group._id)
      .populate('members', 'displayName profilePicture status lastSeen');

    // System message
    await Message.create({
      sender: req.user.id, groupId: group._id,
      content: `${req.user.displayName || 'Someone'} updated group info`,
      type: 'text', isSystem: true, status: 'sent'
    });

    const io = req.app.get('io');
    if (io) io.to(`group:${group._id}`).emit('group_updated', updated);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── UPDATE GROUP SETTINGS ───
router.put('/:groupId/settings', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can change settings' });
    }

    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
             group.settings[key] = req.body[key];
        });
    }
    group.markModified('settings');
    await group.save();

    const io = req.app.get('io');
    if (io) io.to(`group:${group._id}`).emit('group_settings_updated', { groupId: group._id, settings: group.settings });

    res.json({ settings: group.settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── BAN USER ───
router.put('/:groupId/ban-user', protect, async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (!group.admins.includes(req.user.id)) return res.status(403).json({ message: 'Only admins can ban users' });

        const { userId } = req.body;
        if (!group.bannedMembers) group.bannedMembers = [];
        
        if (!group.bannedMembers.includes(userId)) {
            group.bannedMembers.push(userId);
            // Also remove from members and admins immediately
            group.members = group.members.filter(m => m.toString() !== userId);
            group.admins = group.admins.filter(a => a.toString() !== userId);
            await group.save();

            const io = req.app.get('io');
            if (io) {
                io.to(`user:${userId}`).emit('removed_from_group', { groupId: group._id });
                io.to(`group:${group._id}`).emit('member_removed', { groupId: group._id, userId });
            }
        }
        res.json({ message: 'User banned successfully' });
    } catch(err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── ADD MEMBER ───
router.put('/:groupId/add-member', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isAdmin = group.admins.includes(req.user.id);
    if (!isAdmin && group.settings.whoCanAddMembers === 'admins') {
      return res.status(403).json({ message: 'Only admins can add members in this group' });
    }

    const { userId } = req.body;
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    group.members.push(userId);
    await group.save();

    const newMember = await User.findById(userId).select('displayName profilePicture');

    await Message.create({
      sender: req.user.id, groupId: group._id,
      content: `${req.user.displayName || 'Admin'} added ${newMember?.displayName || 'a member'}`,
      type: 'text', isSystem: true, status: 'sent'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('group_created', await Group.findById(group._id).populate('members', 'displayName profilePicture status lastSeen'));
      io.to(`group:${group._id}`).emit('member_added', { groupId: group._id, user: newMember });
    }

    res.json({ message: 'Member added' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── REMOVE MEMBER ───
router.put('/:groupId/remove-member', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    const { userId } = req.body;
    const removedUser = await User.findById(userId).select('displayName');

    group.members = group.members.filter(m => m.toString() !== userId);
    group.admins = group.admins.filter(a => a.toString() !== userId);
    await group.save();

    await Message.create({
      sender: req.user.id, groupId: group._id,
      content: `${req.user.displayName || 'Admin'} removed ${removedUser?.displayName || 'a member'}`,
      type: 'text', isSystem: true, status: 'sent'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('removed_from_group', { groupId: group._id });
      io.to(`group:${group._id}`).emit('member_removed', { groupId: group._id, userId });
    }

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── MAKE ADMIN ───
router.put('/:groupId/make-admin', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can promote members' });
    }

    const { userId } = req.body;
    if (group.admins.length >= 3) {
      return res.status(400).json({ message: 'A maximum of 3 admins is allowed' });
    }
    if (group.admins.includes(userId)) {
      return res.status(400).json({ message: 'User is already an admin' });
    }

    group.admins.push(userId);
    await group.save();

    const promoted = await User.findById(userId).select('displayName');
    await Message.create({
      sender: req.user.id, groupId: group._id,
      content: `${promoted?.displayName || 'A member'} is now an admin`,
      type: 'text', isSystem: true, status: 'sent'
    });

    const io = req.app.get('io');
    if (io) io.to(`group:${group._id}`).emit('admin_changed', { groupId: group._id, userId, action: 'promoted' });

    res.json({ message: 'Admin added' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── REMOVE ADMIN ───
router.put('/:groupId/remove-admin', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can demote members' });
    }

    const { userId } = req.body;
    group.admins = group.admins.filter(a => a.toString() !== userId);
    await group.save();

    const demoted = await User.findById(userId).select('displayName');
    await Message.create({
      sender: req.user.id, groupId: group._id,
      content: `${demoted?.displayName || 'A member'} is no longer an admin`,
      type: 'text', isSystem: true, status: 'sent'
    });

    const io = req.app.get('io');
    if (io) io.to(`group:${group._id}`).emit('admin_changed', { groupId: group._id, userId, action: 'demoted' });

    res.json({ message: 'Admin removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── LEAVE GROUP ───
router.put('/:groupId/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.members = group.members.filter(m => m.toString() !== req.user.id);
    group.admins = group.admins.filter(a => a.toString() !== req.user.id);

    await Message.create({
      sender: req.user.id, groupId: group._id,
      content: `${req.user.displayName || 'A member'} left the group`,
      type: 'text', isSystem: true, status: 'sent'
    });

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(req.params.groupId);
      return res.json({ message: 'Group deleted (no members left)' });
    }

    await group.save();

    const io = req.app.get('io');
    if (io) io.to(`group:${req.params.groupId}`).emit('member_left', { groupId: req.params.groupId, userId: req.user.id });

    res.json({ message: 'Left group' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── DELETE GROUP (Admin only) ───
router.delete('/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can delete groups' });
    }

    const io = req.app.get('io');
    if (io) {
      group.members.forEach(m => {
        io.to(`user:${m}`).emit('group_deleted', { groupId: group._id });
      });
    }

    await Message.deleteMany({ groupId: group._id });
    await Group.findByIdAndDelete(req.params.groupId);

    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GENERATE INVITE LINK ───
router.post('/:groupId/invite-link', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can generate invite links' });
    }

    group.inviteCode = crypto.randomBytes(16).toString('hex');
    group.inviteLinkActive = true;
    await group.save();

    res.json({ inviteCode: group.inviteCode, inviteLink: `${req.protocol}://${req.get('host')}/api/groups/join/${group.inviteCode}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── REVOKE INVITE LINK ───
router.delete('/:groupId/invite-link', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only admins can revoke invite links' });
    }

    group.inviteCode = undefined;
    group.inviteLinkActive = false;
    await group.save();

    res.json({ message: 'Invite link revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── JOIN VIA INVITE CODE ───
router.post('/join/:inviteCode', protect, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.inviteCode, inviteLinkActive: true });
    if (!group) return res.status(404).json({ message: 'Invalid or expired invite link' });

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already a member' });
    }

    group.members.push(req.user.id);
    await group.save();

    await Message.create({
      sender: req.user.id, groupId: group._id,
      content: `${req.user.displayName || 'A user'} joined via invite link`,
      type: 'text', isSystem: true, status: 'sent'
    });

    const populated = await Group.findById(group._id)
      .populate('members', 'displayName profilePicture status lastSeen');

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('group_created', populated);
      io.to(`group:${group._id}`).emit('member_added', { groupId: group._id, user: { _id: req.user.id, displayName: req.user.displayName } });
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── MUTE / UNMUTE GROUP ───
router.put('/:groupId/mute', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const { duration } = req.body; // 'off', '8h', '1w', 'always'
    let until = null;
    if (duration === '8h') until = new Date(Date.now() + 8 * 60 * 60 * 1000);
    else if (duration === '1w') until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    else if (duration === 'always') until = new Date('2099-12-31');

    if (duration === 'off') {
      group.muteSettings.delete(req.user.id);
    } else {
      group.muteSettings.set(req.user.id, { muted: true, until });
    }
    group.markModified('muteSettings');
    await group.save();

    res.json({ muted: duration !== 'off', until });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Message star/pin logic moved to messages.js for unification

// ─── GET STARRED MESSAGES ───
router.get('/:groupId/starred', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      groupId: req.params.groupId,
      starredBy: req.user.id
    }).populate('sender', 'displayName').sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET STARRED MESSAGES ───
router.get('/:groupId/starred', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      groupId: req.params.groupId,
      starredBy: req.user.id
    }).populate('sender', 'displayName profilePicture');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET PINNED MESSAGES ───
router.get('/:groupId/pinned', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate({
      path: 'pinnedMessages',
      populate: { path: 'sender', select: 'displayName profilePicture' }
    });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group.pinnedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── REPORT MESSAGE ───
router.post('/:groupId/report', protect, async (req, res) => {
  try {
    const { messageId, reason } = req.body;
    await Report.create({
      reporterId: req.user.id,
      reportedMessageId: messageId,
      groupId: req.params.groupId,
      reason: reason || 'Inappropriate content'
    });
    res.json({ message: 'Message reported' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── SCHEDULE MESSAGE ───
router.post('/:groupId/schedule', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) return res.status(403).json({ message: 'Only admins can schedule messages' });

    const { content, executeAt } = req.body;
    if (!content || !executeAt) return res.status(400).json({ message: 'Missing content or execution time' });

    await ScheduledMessage.create({
      senderId: req.user.id,
      groupId: group._id,
      content,
      executeAt: new Date(executeAt)
    });

    res.json({ message: 'Message scheduled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── ADMIN MUTE USER (Group Chat Ban) ───
router.put('/:groupId/mute-member', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.includes(req.user.id)) return res.status(403).json({ message: 'Only admins can mute members' });

    const { userId, duration } = req.body; // duration in minutes
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const until = duration ? new Date(Date.now() + duration * 60 * 1000) : new Date('2099-12-31');
    
    if (!group.muteSettings) group.muteSettings = new Map();
    group.muteSettings.set(userId, { muted: true, until });
    group.markModified('muteSettings');
    await group.save();

    res.json({ message: 'Member muted successfully', until });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
