const express = require('express');
const Contact = require('../models/Contact');
const User = require('../models/User');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all contacts and active chats for the logged-in user (WhatsApp Style)
// @route   GET /api/contacts
router.get('/', protect, async (req, res) => {
  try {
    // 1. Get explicit saved contacts for req.user
    const contacts = await Contact.find({ user: req.user.id })
      .populate('contact', 'displayName email profilePicture status lastSeen about phone role');
    
    // Filter out null contacts and hide admin users from regular user lists
    const validContacts = contacts.filter(c => {
      if (!c.contact) return false;
      if (req.user.role !== 'admin' && c.contact.role === 'admin') return false;
      return true;
    });

    const enrichedContacts = await Promise.all(validContacts.map(async (c) => {
      const contactId = c.contact._id;
      const unreadCount = await Message.countDocuments({ sender: contactId, recipient: req.user.id, status: { $ne: 'read' } });
      const lastMessage = await Message.findOne({ $or: [{ sender: req.user.id, recipient: contactId }, { sender: contactId, recipient: req.user.id }] })
        .sort({ createdAt: -1 }).select('content createdAt sender type');
      return { ...c.toObject(), unreadCount, lastMessage };
    }));

    // 2. WhatsApp Style: Find partners with existing message chat history (not in saved contacts yet)
    const existingContactIds = new Set(validContacts.map(c => c.contact._id.toString()));
    
    const messagePartners = await Message.find({
      $or: [{ sender: req.user.id }, { recipient: req.user.id }]
    }).select('sender recipient');

    const partnerIds = new Set();
    messagePartners.forEach(m => {
      if (m.sender && m.sender.toString() !== req.user.id.toString()) partnerIds.add(m.sender.toString());
      if (m.recipient && m.recipient.toString() !== req.user.id.toString()) partnerIds.add(m.recipient.toString());
    });

    const chatOnlyPartnerIds = Array.from(partnerIds).filter(id => !existingContactIds.has(id));

    let chatOnlyContacts = [];
    if (chatOnlyPartnerIds.length > 0) {
      const partnerQuery = { _id: { $in: chatOnlyPartnerIds } };
      if (req.user.role !== 'admin') {
        partnerQuery.role = { $ne: 'admin' };
      }
      
      const partnerUsers = await User.find(partnerQuery)
        .select('displayName email profilePicture status lastSeen about phone role');

      chatOnlyContacts = await Promise.all(partnerUsers.map(async (u) => {
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
      .populate('contact', 'displayName profilePicture status lastSeen about phone role');
    
    const activeContacts = contacts
      .map(c => c.contact)
      .filter(u => u && u.status === 'online' && (req.user.role === 'admin' || u.role !== 'admin'));
      
    res.json(activeContacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Search users to add as contacts (WhatsApp style: requires query)
// @route   GET /api/contacts/search?q=query
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json([]);
    }

    const escapedQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = { 
      _id: { $ne: req.user.id },
      $or: [
        { displayName: { $regex: escapedQ, $options: 'i' } },
        { email: { $regex: escapedQ, $options: 'i' } },
        { phone: { $regex: escapedQ, $options: 'i' } }
      ]
    };

    if (req.user.role !== 'admin') {
      query.role = { $ne: 'admin' };
    }

    const users = await User.find(query)
      .select('displayName email profilePicture about phone role')
      .limit(30);

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
