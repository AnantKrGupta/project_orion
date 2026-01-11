const express = require('express');
const router = express.Router();
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const sanitize = require('mongo-sanitize');

// Get friend list
router.get('/', async (req, res) => {
    try {
        const { email } = req.query;

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const friendships = await Friendship.find({
            $or: [{ user1: user._id }, { user2: user._id }],
            status: 'accepted'
        });

        // Get friend IDs
        const friendIds = friendships.map(f =>
            f.user1.equals(user._id) ? f.user2 : f.user1
        );

        // Get friend details with friendship ID for removal
        const friends = await User.find({ _id: { $in: friendIds } })
            .select('email displayName photoUrl isOnline lastSeen')
            .lean();

        // Add friendship IDs to each friend
        friends.forEach(friend => {
            const friendship = friendships.find(f =>
                f.user1.equals(friend._id) || f.user2.equals(friend._id)
            );
            friend.friendshipId = friendship._id;
        });

        // Sort: online first, then by last seen
        friends.sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return new Date(b.lastSeen) - new Date(a.lastSeen);
        });

        res.json(friends);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send friend request
router.post('/request', async (req, res) => {
    try {
        const { email, friendEmail } = req.body;

        const user = await User.findOne({ email: sanitize(email) });
        const friend = await User.findOne({ email: sanitize(friendEmail) });

        if (!user || !friend) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already friends or pending
        const existing = await Friendship.findOne({
            $or: [
                { user1: user._id, user2: friend._id },
                { user1: friend._id, user2: user._id }
            ]
        });

        if (existing) {
            return res.status(400).json({ error: 'Friend request already exists' });
        }

        // Create pending friendship
        const friendship = await Friendship.create({
            user1: user._id,
            user2: friend._id,
            initiatedBy: user._id,
            status: 'pending'
        });

        // Send real-time notification to friend
        const { io, emailToSocket } = req;
        console.log('📬 Sending friend request notification to:', friendEmail);
        console.log('📬 emailToSocket map size:', emailToSocket ? emailToSocket.size : 'undefined');

        if (io && emailToSocket) {
            const friendSocketId = emailToSocket.get(friendEmail);
            console.log('📬 Friend socket ID:', friendSocketId);

            if (friendSocketId) {
                io.to(friendSocketId).emit('friend_request_received', {
                    friendshipId: friendship._id,
                    fromEmail: email,
                    fromName: user.displayName
                });
                console.log('✅ Friend request notification sent!');
            } else {
                console.log('❌ Friend not connected via socket');
            }
        }

        res.status(201).json(friendship);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept friend request
router.post('/accept/:id', async (req, res) => {
    try {
        const { email } = req.body;
        const friendshipId = sanitize(req.params.id);

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const friendship = await Friendship.findById(friendshipId);
        if (!friendship) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        // Only the recipient can accept
        if (!friendship.user2.equals(user._id)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        friendship.status = 'accepted';
        friendship.acceptedAt = new Date();
        await friendship.save();

        // Notify the sender that request was accepted
        const sender = await User.findById(friendship.user1);
        if (sender) {
            const { io, emailToSocket } = req;
            if (io && emailToSocket) {
                const senderSocketId = emailToSocket.get(sender.email);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('friend_request_accepted', {
                        friendEmail: email,
                        friendName: user.displayName
                    });
                }
            }
        }

        res.json(friendship);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Decline friend request
router.post('/decline/:id', async (req, res) => {
    try {
        const { email } = req.body;
        const friendshipId = sanitize(req.params.id);

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const friendship = await Friendship.findById(friendshipId);
        if (!friendship) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        // Only the recipient can decline
        if (!friendship.user2.equals(user._id)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Friendship.deleteOne({ _id: friendshipId });

        // Notify the sender that request was declined
        const sender = await User.findById(friendship.user1);
        if (sender) {
            const { io, emailToSocket } = req;
            if (io && emailToSocket) {
                const senderSocketId = emailToSocket.get(sender.email);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('friend_request_declined', {
                        friendEmail: email,
                        friendName: user.displayName
                    });
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove friend (bidirectional - removes for both users)
router.delete('/:id', async (req, res) => {
    try {
        const { email } = req.body;
        const friendshipId = sanitize(req.params.id);

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const friendship = await Friendship.findById(friendshipId);
        if (!friendship) {
            return res.status(404).json({ error: 'Friendship not found' });
        }

        // Only participants can remove
        if (!friendship.user1.equals(user._id) && !friendship.user2.equals(user._id)) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Get the other user to notify them
        const otherUserId = friendship.user1.equals(user._id) ? friendship.user2 : friendship.user1;
        const otherUser = await User.findById(otherUserId);

        await Friendship.deleteOne({ _id: friendshipId });

        // Notify the other user that they were removed
        if (otherUser) {
            const { io, emailToSocket } = req;
            if (io && emailToSocket) {
                const otherSocketId = emailToSocket.get(otherUser.email);
                if (otherSocketId) {
                    io.to(otherSocketId).emit('friend_removed', {
                        friendEmail: email,
                        friendName: user.displayName
                    });
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending requests
router.get('/pending', async (req, res) => {
    try {
        const { email } = req.query;

        const user = await User.findOne({ email: sanitize(email) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const pending = await Friendship.find({
            user2: user._id,
            status: 'pending'
        }).populate('user1', 'displayName photoUrl');

        res.json(pending);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
