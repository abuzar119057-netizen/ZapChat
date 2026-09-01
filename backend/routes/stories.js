const express = require('express');
const Story = require('../models/Story');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/stories
 * @desc    Upload a new status story
 */
router.post('/', protect, async (req, res) => {
    try {
        const { fileId, mediaType, caption, bgColor, fontColor, fontSize, fontFamily } = req.body;

        if (!fileId || !mediaType) {
            return res.status(400).json({ message: 'mediaType and fileId are required' });
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Status expires in 24 hours

        const story = await Story.create({
            user: req.user.id,
            mediaType,
            fileId,
            caption,
            bgColor,
            fontColor,
            fontSize,
            fontFamily,
            expiresAt
        });

        const populatedStory = await story.populate('user', 'displayName profilePicture');
        res.status(201).json(populatedStory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @route   GET /api/stories
 * @desc    Get stories from ALL users (global directory model)
 *          This app shows all users to all other users, so stories are also global.
 */
router.get('/', protect, async (req, res) => {
    try {
        // Global directory: fetch ALL active stories from every user in the system.
        // This matches the contacts.js behavior that already shows all users in the chat list.
        const stories = await Story.find({
            expiresAt: { $gt: new Date() }
        })
        .populate('user', 'displayName profilePicture role')
        .populate('viewers', 'displayName profilePicture')
        .populate('reactions.user', 'displayName profilePicture')
        .sort({ createdAt: -1 });

        // Group stories by user for frontend display
        const groupedStories = stories.reduce((acc, story) => {
            if (!story.user) return acc; // skip if user was deleted
            const userId = story.user._id.toString();
            if (!acc[userId]) {
                acc[userId] = {
                    user: story.user,
                    stories: []
                };
            }
            acc[userId].stories.push(story);
            return acc;
        }, {});

        res.json(Object.values(groupedStories));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @route   GET /api/stories/:id
 * @desc    Get a single story with fully populated viewers & reactions (fresh from DB)
 */
router.get('/:id', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id)
            .populate('user', 'displayName profilePicture role')
            .populate('viewers', 'displayName profilePicture')
            .populate('reactions.user', 'displayName profilePicture');

        if (!story) return res.status(404).json({ message: 'Story not found' });
        res.json(story);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @route   POST /api/stories/:id/view
 * @desc    View a story — records viewer and emits real-time event to story owner
 */
router.post('/:id/view', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: 'Story not found' });

        // Don't count owner's own views
        if (story.user.toString() === req.user.id) {
            return res.json({ message: 'Owner view not counted' });
        }

        await Story.findByIdAndUpdate(req.params.id, {
            $addToSet: { viewers: req.user.id }
        });

        // Emit real-time socket event to story owner so their viewers list updates live
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${story.user}`).emit('story_viewed', {
                storyId: story._id.toString(),
                viewer: {
                    _id: req.user.id,
                    displayName: req.user.displayName,
                    profilePicture: req.user.profilePicture || ''
                }
            });
        }

        res.json({ message: 'Story viewed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @route   DELETE /api/stories/:id
 * @desc    Delete a story
 */
router.delete('/:id', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: 'Story not found' });

        if (story.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

         await story.deleteOne();
         res.json({ message: 'Story removed' });
     } catch (error) {
         res.status(500).json({ message: error.message });
     }
 });
 
 /**
  * @route   POST /api/stories/:id/react
  * @desc    React to a story
  */
 router.post('/:id/react', protect, async (req, res) => {
     try {
         const { emoji } = req.body;
         if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

         const story = await Story.findById(req.params.id);
         if (!story) return res.status(404).json({ message: 'Story not found' });

         // Find existing reaction from this user and update it, or add new one
         const existingIdx = story.reactions.findIndex(r => r.user.toString() === req.user.id);
         if (existingIdx > -1) {
             story.reactions[existingIdx].emoji = emoji;
         } else {
             story.reactions.push({ user: req.user.id, emoji });
         }

         story.markModified('reactions');
         await story.save();

         // Send real-time socket event to the story owner
         const io = req.app.get('io');
         if (io) {
             io.to(`user:${story.user}`).emit('story_reaction', {
                 storyId: story._id,
                 user: {
                     _id: req.user.id,
                     displayName: req.user.displayName,
                     profilePicture: req.user.profilePicture
                 },
                 emoji
             });
         }

         res.json({ message: 'Reaction saved successfully', reactions: story.reactions });
     } catch (error) {
         res.status(500).json({ message: error.message });
     }
 });

/**
 * @route   DELETE /api/stories/:id/react
 * @desc    Remove reaction from a story
 */
router.delete('/:id/react', protect, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: 'Story not found' });

        // Filter out user's reaction
        story.reactions = story.reactions.filter(r => r.user.toString() !== req.user.id);

        story.markModified('reactions');
        await story.save();

        // Send real-time socket event to the story owner to remove the reaction
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${story.user}`).emit('story_reaction_removed', {
                storyId: story._id,
                userId: req.user.id
            });
        }

        res.json({ message: 'Reaction removed successfully', reactions: story.reactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
 
module.exports = router;
