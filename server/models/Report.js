const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        enum: ['spam', 'abuse', 'inappropriate', 'harassment', 'other'],
        required: true
    },
    type: {
        type: String,
        enum: ['chat', 'post', 'comment'],
        required: true
    },
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    resolved: {
        type: Boolean,
        default: false
    },
    action: {
        type: String,
        enum: ['pending', 'banned', 'dismissed'],
        default: 'pending'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for finding pending reports
reportSchema.index({ resolved: 1, timestamp: -1 });
reportSchema.index({ targetUser: 1 });

module.exports = mongoose.model('Report', reportSchema);
