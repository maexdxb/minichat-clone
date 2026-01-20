const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
}));

// 1. Serve static files from parent directory (frontend)
app.use(express.static(path.join(__dirname, '..')));

const io = socketIO(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
    }
});

// Waiting queue for users looking for partners
let waitingQueue = [];
// Active connections map
let activeConnections = new Map();
// Online users count
let onlineUsers = 0;

app.get('/api-status', (req, res) => {
    res.json({
        status: 'online',
        service: 'Siagechat Signaling Server',
        onlineUsers: onlineUsers,
        waitingInQueue: waitingQueue.length
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);
    onlineUsers++;

    // Broadcast updated online count
    io.emit('online-count', onlineUsers);

    // User wants to find a partner
    socket.on('find-partner', (userData) => {
        console.log(`🔍 ${socket.id} is looking for a partner`);

        // Check if this socket is already in an active connection
        if (activeConnections.has(socket.id)) {
            const currentPartner = activeConnections.get(socket.id);
            console.log(`⚠️ ${socket.id} is already connected to ${currentPartner}. Ignoring find-partner.`);
            return; // Don't allow matching if already connected
        }

        // Remove from queue if already there (prevent duplicates)
        const existingIndex = waitingQueue.findIndex(s => s.id === socket.id);
        if (existingIndex !== -1) {
            waitingQueue.splice(existingIndex, 1);
            console.log(`Removed ${socket.id} from queue (was duplicate)`);
        }

        // Store user data
        socket.userData = userData || { isGuest: true };

        // Filter out:
        // 1. Self
        // 2. Anyone already in an active connection
        const availablePartners = waitingQueue.filter(s =>
            s.id !== socket.id && !activeConnections.has(s.id)
        );

        console.log(`Available partners: ${availablePartners.length} (total queue: ${waitingQueue.length})`);

        // Check if there's someone waiting
        if (availablePartners.length > 0) {
            // Pick a RANDOM partner from available queue
            const randomIndex = Math.floor(Math.random() * availablePartners.length);
            const partner = availablePartners[randomIndex];

            // Remove partner from queue
            const partnerQueueIndex = waitingQueue.findIndex(s => s.id === partner.id);
            if (partnerQueueIndex !== -1) {
                waitingQueue.splice(partnerQueueIndex, 1);
            }

            // Create connection pair (1-to-1 only!)
            activeConnections.set(socket.id, partner.id);
            activeConnections.set(partner.id, socket.id);

            console.log(`🎉 Matched ${socket.id} with ${partner.id} (1-to-1 connection)`);
            console.log(`Active connections: ${activeConnections.size / 2} pairs`);

            // Notify both users - socket is the initiator (creates offer)
            socket.emit('partner-found', {
                partnerId: partner.id,
                partnerSupabaseId: partner.userData ? partner.userData.supabaseId : null,
                initiator: true
            });
            partner.emit('partner-found', {
                partnerId: socket.id,
                partnerSupabaseId: socket.userData ? socket.userData.supabaseId : null,
                initiator: false
            });

        } else {
            // Add to waiting queue
            waitingQueue.push(socket);
            socket.emit('searching');
            console.log(`⏳ ${socket.id} added to queue. Queue size: ${waitingQueue.length}`);
        }
    });

    // WebRTC signaling messages
    socket.on('webrtc-offer', (data) => {
        const partnerId = activeConnections.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('webrtc-offer', {
                offer: data.offer,
                from: socket.id
            });
            console.log(`📤 Offer sent from ${socket.id} to ${partnerId}`);
        }
    });

    socket.on('webrtc-answer', (data) => {
        const partnerId = activeConnections.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('webrtc-answer', {
                answer: data.answer,
                from: socket.id
            });
            console.log(`📤 Answer sent from ${socket.id} to ${partnerId}`);
        }
    });

    socket.on('webrtc-ice-candidate', (data) => {
        const partnerId = activeConnections.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('webrtc-ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        }
    });

    // Chat messages
    socket.on('chat-message', (data) => {
        const partnerId = activeConnections.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('chat-message', {
                message: data.message,
                from: socket.id
            });
        }
    });

    // User wants to skip current partner
    socket.on('skip-partner', () => {
        console.log(`⏭️ ${socket.id} wants to skip partner`);

        // Get current partner (should only be ONE)
        const currentPartnerId = activeConnections.get(socket.id);

        if (currentPartnerId) {
            const partnerSocket = io.sockets.sockets.get(currentPartnerId);

            // Notify ONLY the partner they were disconnected
            if (partnerSocket) {
                partnerSocket.emit('partner-disconnected');
                console.log(`💔 Notified ${currentPartnerId} they were disconnected`);
            }

            // Remove ONLY this 1-to-1 connection
            activeConnections.delete(socket.id);
            activeConnections.delete(currentPartnerId);

            console.log(`💔 Disconnected pair: ${socket.id} <-> ${currentPartnerId}`);
            console.log(`Remaining active connections: ${activeConnections.size / 2} pairs`);
        }

        // Remove from queue if there
        const queueIndex = waitingQueue.findIndex(s => s.id === socket.id);
        if (queueIndex !== -1) {
            waitingQueue.splice(queueIndex, 1);
        }

        // Filter out:
        // 1. Self
        // 2. Anyone already in an active connection
        const availablePartners = waitingQueue.filter(s =>
            s.id !== socket.id && !activeConnections.has(s.id)
        );

        console.log(`Available for skip: ${availablePartners.length} (queue: ${waitingQueue.length})`);

        // Automatically search for new partner
        if (availablePartners.length > 0) {
            // Pick random partner
            const randomIndex = Math.floor(Math.random() * availablePartners.length);
            const partner = availablePartners[randomIndex];

            // Remove from queue
            const partnerIndex = waitingQueue.findIndex(s => s.id === partner.id);
            if (partnerIndex !== -1) {
                waitingQueue.splice(partnerIndex, 1);
            }

            // Create NEW 1-to-1 connection
            activeConnections.set(socket.id, partner.id);
            activeConnections.set(partner.id, socket.id);

            console.log(`🎉 Matched ${socket.id} with ${partner.id} after skip (1-to-1)`);

            socket.emit('partner-found', {
                partnerId: partner.id,
                partnerSupabaseId: partner.userData ? partner.userData.supabaseId : null,
                initiator: true
            });
            partner.emit('partner-found', {
                partnerId: socket.id,
                partnerSupabaseId: socket.userData ? socket.userData.supabaseId : null,
                initiator: false
            });
        } else {
            waitingQueue.push(socket);
            socket.emit('searching');
            console.log(`⏳ ${socket.id} waiting after skip. Queue: ${waitingQueue.length}`);
        }
    });

    // Stop searching
    socket.on('stop-search', () => {
        console.log(`🛑 ${socket.id} stopped searching`);
        removeFromQueue(socket);
        disconnectPair(socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        onlineUsers--;
        io.emit('online-count', onlineUsers);

        removeFromQueue(socket);
        disconnectPair(socket);
    });
});

// Helper function to remove user from waiting queue
function removeFromQueue(socket) {
    const index = waitingQueue.findIndex(s => s.id === socket.id);
    if (index !== -1) {
        waitingQueue.splice(index, 1);
        console.log(`🗑️ Removed ${socket.id} from queue`);
    }
}

// Helper function to disconnect a pair
function disconnectPair(socket) {
    const partnerId = activeConnections.get(socket.id);

    if (partnerId) {
        // Notify partner
        io.to(partnerId).emit('partner-disconnected');

        // Remove both connections
        activeConnections.delete(socket.id);
        activeConnections.delete(partnerId);

        console.log(`💔 Disconnected pair: ${socket.id} and ${partnerId}`);
    }
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Siagechat Signaling Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
});
// Force Restart: 2026-01-21 00:38:23
