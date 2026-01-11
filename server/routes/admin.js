const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const sanitize = require('mongo-sanitize');

// Admin middleware
const isAdmin = (req, res, next) => {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
    const userEmail = req.headers['x-user-email'] || req.body.email;

    if (!adminEmails.includes(userEmail)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    next();
};

// Get dashboard stats
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const [totalUsers, onlineUsers, pendingReports, bannedUsers, totalPosts] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isOnline: true }),
            Report.countDocuments({ resolved: false }),
            User.countDocuments({ bannedUntil: { $gt: new Date() } }),
            Post.countDocuments()
        ]);

        res.json({
            totalUsers,
            onlineUsers,
            pendingReports,
            bannedUsers,
            totalPosts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all reports
router.get('/reports', isAdmin, async (req, res) => {
    try {
        const { resolved } = req.query;
        const filter = resolved === 'true' ? {} : { resolved: false };

        const reports = await Report.find(filter)
            .sort({ timestamp: -1 })
            .populate('targetUser', 'displayName email reportCount bannedUntil')
            .populate('reporter', 'displayName email')
            .lean();

        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ban user
router.post('/ban/:userId', isAdmin, async (req, res) => {
    try {
        const { duration } = req.body; // hours
        const userId = sanitize(req.params.userId);

        await User.updateOne(
            { _id: userId },
            {
                bannedUntil: new Date(Date.now() + duration * 60 * 60 * 1000),
                reportCount: 0
            }
        );

        res.json({ success: true, message: `Banned for ${duration} hours` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unban user
router.post('/unban/:userId', isAdmin, async (req, res) => {
    try {
        const userId = sanitize(req.params.userId);

        await User.updateOne(
            { _id: userId },
            { bannedUntil: null }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete post
router.delete('/posts/:postId', isAdmin, async (req, res) => {
    try {
        const postId = sanitize(req.params.postId);

        // Delete comments first
        await Comment.deleteMany({ post: postId });

        // Delete post
        await Post.deleteOne({ _id: postId });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete comment
router.delete('/comments/:commentId', isAdmin, async (req, res) => {
    try {
        const commentId = sanitize(req.params.commentId);

        const comment = await Comment.findById(commentId);
        if (comment) {
            await Post.updateOne(
                { _id: comment.post },
                { $inc: { commentCount: -1 } }
            );
            await Comment.deleteOne({ _id: commentId });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dismiss report
router.post('/reports/:reportId/dismiss', isAdmin, async (req, res) => {
    try {
        const reportId = sanitize(req.params.reportId);

        await Report.updateOne(
            { _id: reportId },
            { resolved: true, action: 'dismissed' }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (for management)
router.get('/users', isAdmin, async (req, res) => {
    try {
        const { search } = req.query;

        let filter = {};
        if (search) {
            filter = {
                $or: [
                    { displayName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const users = await User.find(filter)
            .select('displayName email photoUrl reportCount bannedUntil isOnline lastSeen')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
