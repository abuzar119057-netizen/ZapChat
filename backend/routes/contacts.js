const express = require('express');
const Contact = require('../models/Contact');
const User = require('../models/User');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all contacts for the logged-in user
// @route   GET /api/contacts
router.get('/', protect, async (req, res) => {
  try {
    const contacts = await Contact.find({ user: req.user.id }).populate('contact', 'displayName email profilePicture status lastSeen about phone role');
    
    // Enrich contacts with unread count and last message
    const enrichedContacts = await Promise.all(contacts.map(async (c) => {
      const contactId = c.contact._id;
      const unreadCount = await Message.countDocuments({ sender: contactId, recipient: req.user.id, status: { $ne: 'read' } });
      const lastMessage = await Message.findOne({ $or: [{ sender: req.user.id, recipient: contactId }, { sender: contactId, recipient: req.user.id }] })
        .sort({ createdAt: -1 }).select('content createdAt sender type');
      return { ...c.toObject(), unreadCount, lastMessage };
    }));

    // NEW: Fetch ALL users in the system to act as a global directory on the Chats tab.
    // (Requested by user to show "real data" of all users automatically).
    const allOtherUsers = await User.find({ _id: { $ne: req.user.id } }).select('displayName email profilePicture status lastSeen about phone role');
    const contactIds = new Set(contacts.filter(c => c.contact).map(c => c.contact._id.toString()));
    const missingUsers = allOtherUsers.filter(u => !contactIds.has(u._id.toString()));
    
    let chatOnlyContacts = [];
    if (missingUsers.length > 0) {
      chatOnlyContacts = await Promise.all(missingUsers.map(async (u) => {
        const unreadCount = await Message.countDocuments({ sender: u._id, recipient: req.user.id, status: { $ne: 'read' } });
        const lastMessage = await Message.findOne({ $or: [{ sender: req.user.id, recipient: u._id }, { sender: u._id, recipient: req.user.id }] })
          .sort({ createdAt: -1 }).select('content createdAt sender type');
        
        return { 
          _id: u._id, 
          contact: {
            ...u.toObject(),
            displayName: u.displayName,
          }, 
          unreadCount, 
          lastMessage, 
          isChatOnly: true 
        };
      }));
    }

    const finalContacts = [...enrichedContacts, ...chatOnlyContacts];
    const pendingRequests = await Contact.find({ contact: req.user.id, status: 'pending' }).populate('user', 'displayName email profilePicture');
    res.json({ contacts: finalContacts, pendingRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get active/online contacts for stories
// @route   GET /api/contacts/active
router.get('/active', protect, async (req, res) => {
  try {
    const contacts = await Contact.find({ user: req.user.id })
      .populate('contact', 'displayName profilePicture status lastSeen about phone');
    
    // Filter to only those with 'online' status, or recent activity
    const activeContacts = contacts
      .map(c => c.contact)
      .filter(u => u && u.status === 'online');
      
    res.json(activeContacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Search users to add as contacts
// @route   GET /api/contacts/search?q=query
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    let query = { _id: { $ne: req.user.id } };

    if (q) {
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { displayName: { $regex: escapedQ, $options: 'i' } },
        { email: { $regex: escapedQ, $options: 'i' } },
        { phone: { $regex: escapedQ, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('displayName email profilePicture about phone role')
      .limit(50); // Added limit for safety

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add a new contact
// @route   POST /api/contacts
router.post('/', protect, async (req, res) => {
  try {
    const { contactId } = req.body;
    
    if (contactId === req.user.id) {
        return res.status(400).json({ message: 'Cannot add yourself' });
    }

    const contactUser = await User.findById(contactId);
    if (!contactUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingContact = await Contact.findOne({ user: req.user.id, contact: contactId });
    if (existingContact) {
      return res.status(400).json({ message: 'Contact already exists or pending' });
    }

    const newContact = await Contact.create({
      user: req.user.id,
      contact: contactId,
      status: 'accepted' // Set to accepted immediately for instant functionality
    });

    // Also create reciprocal contact for two-way chat immediately
    await Contact.updateOne(
        { user: contactId, contact: req.user.id },
        { status: 'accepted' },
        { upsert: true }
    );

    res.status(201).json(newContact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update contact status (accept/block)
// @route   PUT /api/contacts/:id
router.put('/:id', protect, async (req, res) => {
    try {
        const { status } = req.body; // 'accepted' or 'blocked'
        const contactReq = await Contact.findById(req.params.id);

        if (!contactReq) {
            return res.status(404).json({ message: 'Contact request not found' });
        }

        if (contactReq.contact.toString() !== req.user.id && contactReq.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        contactReq.status = status;
        await contactReq.save();

        if (status === 'accepted') {
            // Create reciprocal contact
            await Contact.updateOne(
                { user: contactReq.contact, contact: contactReq.user },
                { status: 'accepted' },
                { upsert: true }
            );
        }

        res.json(contactReq);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
