const express = require('express');
const multer = require('multer');
const { getGfsBucket } = require('../config/db');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');
const { Readable } = require('stream');

const router = express.Router();

// Memory storage for small to medium files to stream directly to GridFS (Up to 500MB)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// @desc    Upload a file
// @route   POST /api/files/upload
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Feature: File type validation and virus scanning checks would be implemented here.
        // For MVP, we proceed to save.

        const gfsBucket = getGfsBucket();
        if (!gfsBucket) {
            return res.status(500).json({ message: 'Database file storage not initialized' });
        }

        const readableStream = new Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null);

        const uploadStream = gfsBucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
            metadata: {
                uploaderId: req.user.id
            }
        });

        readableStream.pipe(uploadStream);

        uploadStream.on('error', (error) => {
            console.error('[Upload Stream Error]:', error);
            res.status(500).json({ message: error.message });
        });

        uploadStream.on('finish', () => {
            res.status(201).json({
                fileId: uploadStream.id,
                filename: req.file.originalname,
                contentType: req.file.mimetype,
                size: req.file.size
            });
        });

    } catch (error) {
        console.error('[Upload Route Error]:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Download a file
// @route   GET /api/files/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.id);
        const gfsBucket = getGfsBucket();

        const files = await gfsBucket.find({ _id: fileId }).toArray();
        
        if (!files || files.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const file = files[0];
        res.set('Content-Type', file.contentType);
        res.set('Content-Disposition', `inline; filename="${file.filename}"`);
        
        const downloadStream = gfsBucket.openDownloadStream(fileId);
        downloadStream.pipe(res);
        
        downloadStream.on('error', (err) => {
             res.status(500).json({ message: err.message });
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
