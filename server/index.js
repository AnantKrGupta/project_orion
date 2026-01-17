require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');

// Import routes
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const friendRoutes = require('./routes/friends');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/uploads');

// Import models
const User = require('./models/User');

const app = express();
const server = createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'https://poptalk.me',
    'https://www.poptalk.me'
];

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '20mb' }));

// Note: API Routes are set up after socket.io initialization below

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST']
    }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thapar-chat')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Matching queue and state
const waitingQueue = [];
const activeRooms = new Map(); // socketId -> { roomId, partnerSocketId }
const socketToUser = new Map(); // socketId -> { email, displayName }
const emailToSocket = new Map(); // email -> socketId

// Middleware to attach io and emailToSocket to requests
app.use((req, res, next) => {
    req.io = io;
    req.emailToSocket = emailToSocket;
    next();
});

// API Routes (now with access to io)
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Socket.io events
io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Broadcast online count
    io.emit('online_count', io.engine.clientsCount);



    // Register user (for socket tracking - NO DB calls for max scalability)
    socket.on('register', (data) => {
        const { email, displayName } = data;
        socketToUser.set(socket.id, { email, displayName });
        emailToSocket.set(email, socket.id);
        console.log(`📝 Registered: ${displayName} (${io.engine.clientsCount} online)`);
    });

    // Join matching queue
    socket.on('join_queue', async (data) => {
        const { displayName, email, publicKey } = data;

        socketToUser.set(socket.id, { email, displayName });

        // Update user's online status (user already exists from account creation)
        try {
            await User.updateOne(
                { email },
                { isOnline: true, lastSeen: new Date() }
            );
        } catch (err) {
            console.error('Error updating online status:', err);
        }

        // Check if someone is waiting
        if (waitingQueue.length > 0) {
            const partner = waitingQueue.shift();

            // Create room
            const roomId = `room_${Date.now()}`;

            // Both sockets join the room
            socket.join(roomId);

            // Get partner socket and join room
            const partnerSocket = io.sockets.sockets.get(partner.socketId);
            if (partnerSocket) {
                partnerSocket.join(roomId);
                console.log(`✅ Partner ${partner.displayName} joined room ${roomId}`);
            } else {
                console.log(`❌ Partner socket not found: ${partner.socketId}`);
                // Put back in queue
                waitingQueue.unshift(partner);
                return;
            }

            console.log(`✅ ${displayName} joined room ${roomId}`);

            activeRooms.set(socket.id, { roomId, partnerSocketId: partner.socketId });
            activeRooms.set(partner.socketId, { roomId, partnerSocketId: socket.id });

            // Notify both users
            socket.emit('match_found', {
                partnerName: partner.displayName,
                partnerPublicKey: partner.publicKey,
                partnerEmail: partner.email
            });

            partnerSocket.emit('match_found', {
                partnerName: displayName,
                partnerPublicKey: publicKey,
                partnerEmail: email
            });

            console.log(`🎉 Match: ${displayName} <-> ${partner.displayName} in ${roomId}`);
        } else {
            // Add to queue
            waitingQueue.push({
                socketId: socket.id,
                displayName,
                email,
                publicKey
            });
            console.log(`⏳ ${displayName} waiting for match`);
        }
    });

    // Leave queue
    socket.on('leave_queue', () => {
        const index = waitingQueue.findIndex(u => u.socketId === socket.id);
        if (index > -1) {
            waitingQueue.splice(index, 1);
        }
    });

    // Send message
    socket.on('send_message', (data) => {
        let room = activeRooms.get(socket.id);

        // Robustness: If room not found but provided in data, use it (Friend Chat recovery)
        if (!room && data.roomId) {
            const user = socketToUser.get(socket.id);
            // Basic security: ensure user's email is part of the room ID
            if (user && data.roomId.includes(user.email)) {
                socket.join(data.roomId);
                // We don't know partnerSocketId easily here, but that's okay for messaging
                activeRooms.set(socket.id, { roomId: data.roomId, partnerSocketId: null });
                room = { roomId: data.roomId };
                console.log(`🔄 User ${user.email} recovered connection to room ${data.roomId}`);
            }
        }

        console.log(`📨 Message from ${socket.id}, room:`, room ? room.roomId : 'NO ROOM');
        if (room) {
            // For friend chat, we encrypt separately/handled by client, just forward
            socket.to(room.roomId).emit('receive_message', data);
            console.log(`✅ Message forwarded to room ${room.roomId}`);
        } else {
            console.log(`❌ No room found for ${socket.id}`);
        }
    });

    // Typing indicator
    socket.on('typing', () => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.roomId).emit('partner_typing');
        }
    });

    socket.on('stop_typing', () => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.roomId).emit('partner_stop_typing');
        }
    });

    // Friend request during chat
    socket.on('vibe_request', () => {
        const room = activeRooms.get(socket.id);
        if (room) {
            const user = socketToUser.get(socket.id);
            socket.to(room.roomId).emit('vibe_request_received', {
                from: socket.id,
                displayName: user?.displayName
            });
        }
    });

    socket.on('vibe_response', (accepted) => {
        const room = activeRooms.get(socket.id);
        if (room) {
            const user = socketToUser.get(socket.id);
            io.to(room.partnerSocketId).emit('vibe_response_received', {
                accepted,
                displayName: user?.displayName
            });
        }
    });

    // Skip partner
    socket.on('skip', () => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.roomId).emit('partner_disconnected');

            // Clean up room
            socket.leave(room.roomId);
            io.sockets.sockets.get(room.partnerSocketId)?.leave(room.roomId);

            activeRooms.delete(socket.id);
            activeRooms.delete(room.partnerSocketId);
        }
    });

    // Leave chat (user navigated away from chat page)
    socket.on('leave_chat', () => {
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.roomId).emit('partner_disconnected');

            // Clean up room
            socket.leave(room.roomId);
            io.sockets.sockets.get(room.partnerSocketId)?.leave(room.roomId);

            activeRooms.delete(socket.id);
            activeRooms.delete(room.partnerSocketId);
        }
    });

    // Friend chat request
    socket.on('friend_chat_request', ({ friendEmail }) => {
        const friendSocket = emailToSocket.get(friendEmail);
        const user = socketToUser.get(socket.id);

        if (friendSocket && user) {
            io.to(friendSocket).emit('friend_chat_request', {
                from: user.email,
                displayName: user.displayName
            });
        }
    });

    socket.on('friend_chat_accept', ({ friendEmail, publicKey }) => {
        console.log('🤝 friend_chat_accept from:', socket.id, 'for friendEmail:', friendEmail);

        const friendSocket = emailToSocket.get(friendEmail);
        const user = socketToUser.get(socket.id);

        console.log('🤝 friendSocket:', friendSocket, 'user:', user?.email);

        if (friendSocket && user) {
            const roomId = `friend_${[user.email, friendEmail].sort().join('_')}`;
            console.log('🤝 Creating friend room:', roomId);

            // Join BOTH sockets to the room
            socket.join(roomId);
            const partnerSocketObj = io.sockets.sockets.get(friendSocket);
            if (partnerSocketObj) {
                partnerSocketObj.join(roomId);
                console.log('🤝 Both users joined room:', roomId);
            } else {
                console.log('❌ Partner socket not found:', friendSocket);
            }

            // Set activeRooms for BOTH users
            activeRooms.set(socket.id, { roomId, partnerSocketId: friendSocket });
            activeRooms.set(friendSocket, { roomId, partnerSocketId: socket.id });
            console.log('🤝 activeRooms set for both users');

            // Emit friend_chat_started to BOTH users
            io.to(friendSocket).emit('friend_chat_started', {
                roomId,
                displayName: user.displayName,
                email: user.email,
                publicKey
            });

            socket.emit('friend_chat_started', {
                roomId,
                displayName: socketToUser.get(friendSocket)?.displayName,
                email: friendEmail
            });
            console.log('🤝 friend_chat_started emitted to both users');
        } else {
            console.log('❌ friend_chat_accept failed - friendSocket:', friendSocket, 'user:', user);
        }
    });

    // Friend chat decline
    socket.on('friend_chat_decline', ({ friendEmail }) => {
        const friendSocket = emailToSocket.get(friendEmail);
        const user = socketToUser.get(socket.id);

        if (friendSocket && user) {
            io.to(friendSocket).emit('friend_chat_declined', {
                email: user.email,
                displayName: user.displayName
            });
        }
    });

    // Friend chat key exchange
    socket.on('friend_chat_key_exchange', ({ roomId, publicKey }) => {
        // Robustness: ensure joined
        const user = socketToUser.get(socket.id);
        if (user && roomId.includes(user.email)) {
            socket.join(roomId);
            if (!activeRooms.has(socket.id)) {
                activeRooms.set(socket.id, { roomId, partnerSocketId: null });
            }
        }

        // Send the public key to the partner in the room
        socket.to(roomId).emit('friend_chat_key_received', {
            publicKey
        });
        console.log(`🔑 Key exchange in room ${roomId}`);
    });

    // Disconnect
    socket.on('disconnect', async () => {
        console.log(`🔌 User disconnected: ${socket.id}`);

        // Remove from queue
        const index = waitingQueue.findIndex(u => u.socketId === socket.id);
        if (index > -1) {
            waitingQueue.splice(index, 1);
        }

        // Notify partner
        const room = activeRooms.get(socket.id);
        if (room) {
            socket.to(room.roomId).emit('partner_disconnected');
            activeRooms.delete(socket.id);
            activeRooms.delete(room.partnerSocketId);
        }

        // Clean up memory maps (NO DB calls for max scalability)
        const user = socketToUser.get(socket.id);
        if (user?.email) {
            emailToSocket.delete(user.email);
        }
        socketToUser.delete(socket.id);

        // Update online count
        io.emit('online_count', io.engine.clientsCount);
        console.log(`🔌 Disconnected: ${user?.email || socket.id} (${io.engine.clientsCount} online)`);
    });
});

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', online: io.engine.clientsCount });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
