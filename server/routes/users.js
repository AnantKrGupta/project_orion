const express = require('express');
const router = express.Router();
const User = require('../models/User');
const sanitize = require('mongo-sanitize');
const validator = require('validator');

// Get user profile
router.get('/:email', async (req, res) => {
    try {
        const email = sanitize(req.params.email);

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        const user = await User.findOne({ email }).select('-rateLimits');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin emails that bypass @thapar.edu restriction
const ADMIN_EMAILS = ['anantkrgupta02@gmail.com'];

// Create or update user profile
router.post('/', async (req, res) => {
    try {
        const { email, displayName, photoUrl, bio } = req.body;

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        // Check if email is allowed (thapar.edu or admin)
        const isAllowed = email.endsWith('@thapar.edu') || ADMIN_EMAILS.includes(email.toLowerCase());
        if (!isAllowed) {
            return res.status(403).json({ error: 'Only @thapar.edu emails allowed' });
        }

        if (!displayName || displayName.trim().length < 2 || displayName.trim().length > 15) {
            return res.status(400).json({ error: 'Display name required (2-15 chars)' });
        }

        const sanitizedDisplayName = sanitize(displayName.trim());
        const sanitizedEmail = sanitize(email.toLowerCase());

        // Check if displayName is already taken by another user
        const existingUser = await User.findOne({
            displayName: { $regex: new RegExp(`^${sanitizedDisplayName}$`, 'i') },
            email: { $ne: sanitizedEmail }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'This username is already taken' });
        }

        const sanitizedData = {
            email: sanitizedEmail,
            displayName: sanitizedDisplayName,
            photoUrl: sanitize(photoUrl || ''),
            bio: sanitize((bio || '').slice(0, 150))
        };

        const user = await User.findOneAndUpdate(
            { email: sanitizedData.email },
            sanitizedData,
            { upsert: true, new: true }
        );

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update online status
router.patch('/status', async (req, res) => {
    try {
        const { email, isOnline } = req.body;

        await User.updateOne(
            { email: sanitize(email) },
            {
                isOnline,
                lastSeen: isOnline ? undefined : new Date()
            }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user account (hard delete - comprehensive cleanup)
router.delete('/:email', async (req, res) => {
    try {
        const email = sanitize(req.params.email);

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = user._id;

        // Import models
        const Post = require('../models/Post');
        const Comment = require('../models/Comment');
        const Friendship = require('../models/Friendship');

        console.log(`🗑️ Starting account deletion for: ${email}`);

        // 1. Get all comments by this user to update commentCount on posts
        const userComments = await Comment.find({ author: userId }).select('post');
        const affectedPostIds = [...new Set(userComments.map(c => c.post.toString()))];

        // 2. Decrement commentCount on all affected posts
        if (affectedPostIds.length > 0) {
            // Count comments per post
            const commentCounts = {};
            userComments.forEach(c => {
                const postId = c.post.toString();
                commentCounts[postId] = (commentCounts[postId] || 0) + 1;
            });

            // Update each post's commentCount
            for (const [postId, count] of Object.entries(commentCounts)) {
                await Post.updateOne(
                    { _id: postId },
                    { $inc: { commentCount: -count } }
                );
            }
            console.log(`   - Updated commentCount on ${affectedPostIds.length} posts`);
        }

        // 3. Delete user's posts (their comments get orphaned, so delete them too)
        const userPosts = await Post.find({ author: userId }).select('_id');
        const userPostIds = userPosts.map(p => p._id);

        // Delete all comments on user's posts
        const commentsOnUserPosts = await Comment.deleteMany({ post: { $in: userPostIds } });
        console.log(`   - Deleted ${commentsOnUserPosts.deletedCount} comments on user's posts`);

        // Delete user's posts
        const deletedPosts = await Post.deleteMany({ author: userId });
        console.log(`   - Deleted ${deletedPosts.deletedCount} posts by user`);

        // 4. Delete user's comments on other posts
        const deletedComments = await Comment.deleteMany({ author: userId });
        console.log(`   - Deleted ${deletedComments.deletedCount} comments by user`);

        // 5. Remove user from hearts/brokenHearts arrays on all posts
        await Post.updateMany(
            {},
            { $pull: { hearts: userId, brokenHearts: userId } }
        );
        console.log(`   - Removed user from hearts/brokenHearts on posts`);

        // 6. Remove user from likes/dislikes arrays on all comments
        await Comment.updateMany(
            {},
            { $pull: { likes: userId, dislikes: userId } }
        );
        console.log(`   - Removed user from likes/dislikes on comments`);

        // 7. Delete all friendships
        const deletedFriendships = await Friendship.deleteMany({
            $or: [{ user1: userId }, { user2: userId }]
        });
        console.log(`   - Deleted ${deletedFriendships.deletedCount} friendships`);

        // 8. Finally delete the user document
        await User.deleteOne({ _id: userId });
        console.log(`✅ Account deleted successfully: ${email}`);

        res.json({ success: true, message: 'Account deleted completely' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

