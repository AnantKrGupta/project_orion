const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const sanitize = require('mongo-sanitize');

// Get feed (latest 50 posts)
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('author', 'displayName photoUrl')
            .lean();

        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create post
router.post('/', async (req, res) => {
    try {
        const { email, text, images } = req.body;

        if (!text || text.length > 500) {
            return res.status(400).json({ error: 'Text required (max 500 chars)' });
        }

        if (images && images.length > 2) {
            return res.status(400).json({ error: 'Max 2 images allowed' });
        }

        // Find user
        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check ban
        if (user.bannedUntil && user.bannedUntil > new Date()) {
            return res.status(403).json({
                error: 'You are banned',
                until: user.bannedUntil
            });
        }

        // Check rate limit (3 posts per day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (user.rateLimits.postsToday.lastReset < today) {
            user.rateLimits.postsToday = { count: 0, lastReset: today };
        }

        if (user.rateLimits.postsToday.count >= 3) {
            return res.status(429).json({ error: 'Post limit reached (3 per day)' });
        }

        // Create post
        const post = await Post.create({
            author: user._id,
            text: sanitize(text.trim()),
            images: (images || []).map(url => sanitize(url))
        });

        // Update rate limit
        user.rateLimits.postsToday.count += 1;
        await user.save();

        const populatedPost = await Post.findById(post._id)
            .populate('author', 'displayName photoUrl');

        res.status(201).json(populatedPost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// React to post (heart or broken heart)
router.post('/:id/react', async (req, res) => {
    try {
        const { email, type } = req.body;
        const postId = sanitize(req.params.id);

        if (!['heart', 'brokenHeart'].includes(type)) {
            return res.status(400).json({ error: 'Invalid reaction type' });
        }

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = user._id;
        const field = type === 'heart' ? 'hearts' : 'brokenHearts';
        const otherField = type === 'heart' ? 'brokenHearts' : 'hearts';

        // Toggle reaction
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const hasReacted = post[field].includes(userId);

        if (hasReacted) {
            // Remove reaction
            await Post.updateOne(
                { _id: postId },
                { $pull: { [field]: userId } }
            );
        } else {
            // Add reaction, remove other if exists
            await Post.updateOne(
                { _id: postId },
                {
                    $addToSet: { [field]: userId },
                    $pull: { [otherField]: userId }
                }
            );
        }

        const updatedPost = await Post.findById(postId);
        res.json({
            hearts: updatedPost.hearts.length,
            brokenHearts: updatedPost.brokenHearts.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get comments for a post
router.get('/:id/comments', async (req, res) => {
    try {
        const postId = sanitize(req.params.id);

        const comments = await Comment.find({ post: postId })
            .sort({ createdAt: -1 })
            .populate('author', 'displayName photoUrl')
            .lean();

        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add comment to post
router.post('/:id/comments', async (req, res) => {
    try {
        const { email, text } = req.body;
        const postId = sanitize(req.params.id);

        if (!text || text.length > 300) {
            return res.status(400).json({ error: 'Text required (max 300 chars)' });
        }

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check ban
        if (user.bannedUntil && user.bannedUntil > new Date()) {
            return res.status(403).json({
                error: 'You are banned',
                until: user.bannedUntil
            });
        }

        // Check rate limit (6 comments per hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        if (user.rateLimits.commentsThisHour.lastReset < oneHourAgo) {
            user.rateLimits.commentsThisHour = { count: 0, lastReset: new Date() };
        }

        if (user.rateLimits.commentsThisHour.count >= 6) {
            return res.status(429).json({ error: 'Comment limit reached (6 per hour)' });
        }

        // Create comment
        const comment = await Comment.create({
            post: postId,
            author: user._id,
            text: sanitize(text.trim())
        });

        // Update post comment count
        await Post.updateOne(
            { _id: postId },
            { $inc: { commentCount: 1 } }
        );

        // Update rate limit
        user.rateLimits.commentsThisHour.count += 1;
        await user.save();

        const populatedComment = await Comment.findById(comment._id)
            .populate('author', 'displayName photoUrl');

        res.status(201).json(populatedComment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
