const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    type: {
        type: String,
        enum: ['audio', 'video'],
        required: true
    },
    status: {
        type: String,
        enum: ['missed', 'completed', 'declined', 'ongoing'],
        default: 'completed'
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }
}, { timestamps: true });

module.exports = mongoose.model('Call', callSchema);
