const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const sanitize = require('mongo-sanitize');

// Like comment
router.post('/:id/like', async (req, res) => {
    try {
        const { email } = req.body;
        const commentId = sanitize(req.params.id);

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = user._id;
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const hasLiked = comment.likes.includes(userId);

        if (hasLiked) {
            await Comment.updateOne(
                { _id: commentId },
                { $pull: { likes: userId } }
            );
        } else {
            await Comment.updateOne(
                { _id: commentId },
                {
                    $addToSet: { likes: userId },
                    $pull: { dislikes: userId }
                }
            );
        }

        const updated = await Comment.findById(commentId);
        res.json({
            likes: updated.likes.length,
            dislikes: updated.dislikes.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dislike comment
router.post('/:id/dislike', async (req, res) => {
    try {
        const { email } = req.body;
        const commentId = sanitize(req.params.id);

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = user._id;
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const hasDisliked = comment.dislikes.includes(userId);

        if (hasDisliked) {
            await Comment.updateOne(
                { _id: commentId },
                { $pull: { dislikes: userId } }
            );
        } else {
            await Comment.updateOne(
                { _id: commentId },
                {
                    $addToSet: { dislikes: userId },
                    $pull: { likes: userId }
                }
            );
        }

        const updated = await Comment.findById(commentId);
        res.json({
            likes: updated.likes.length,
            dislikes: updated.dislikes.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete own comment
router.delete('/:id', async (req, res) => {
    try {
        const { email } = req.body;
        const commentId = sanitize(req.params.id);

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (!comment.author.equals(user._id)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Comment.deleteOne({ _id: commentId });
        await Post.updateOne(
            { _id: comment.post },
            { $inc: { commentCount: -1 } }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
