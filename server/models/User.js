const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    displayName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 15
    },
    photoUrl: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        maxlength: 150,
        default: ''
    },
    reportCount: {
        type: Number,
        default: 0
    },
    bannedUntil: {
        type: Date,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    rateLimits: {
        postsToday: {
            count: { type: Number, default: 0 },
            lastReset: { type: Date, default: Date.now }
        },
        commentsThisHour: {
            count: { type: Number, default: 0 },
            lastReset: { type: Date, default: Date.now }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ displayName: 1 });

module.exports = mongoose.model('User', userSchema);
