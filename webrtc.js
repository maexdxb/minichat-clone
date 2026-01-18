// WebRTC Manager for Siagechat
class WebRTCManager {
    constructor(serverUrl) {
        this.serverUrl = serverUrl || 'http://localhost:3000';
        this.socket = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isConnected = false;
        this.isSearching = false;

        // ICE servers (STUN + TURN for NAT traversal)
        this.iceServers = {
            iceServers: [
                // Google STUN servers
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },

                // Free TURN servers (Metered)
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        };

        // Callbacks
        this.onPartnerFound = null;
        this.onPartnerDisconnected = null;
        this.onRemoteStream = null;
        this.onSearching = null;
        this.onChatMessage = null;
        this.onOnlineCount = null;
    }

    // Initialize Socket.io connection
    async init() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.serverUrl, {
                    transports: ['polling', 'websocket'], // Polling first for Ngrok compatibility
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionAttempts: 5
                });

                this.socket.on('connect', () => {
                    console.log('✅ Connected to signaling server');
                    this.setupSocketListeners();
                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ Connection error:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ Failed to initialize WebRTC:', error);
                reject(error);
            }
        });
    }

    // Setup Socket.io event listeners
    setupSocketListeners() {
        // Partner found
        this.socket.on('partner-found', async (data) => {
            console.log('🎉 Partner found!', data);
            this.isSearching = false;
            this.isConnected = true;

            // Create peer connection
            await this.createPeerConnection();

            // Only create offer if we are the initiator
            if (data.initiator) {
                console.log('📤 I am initiator - creating offer');
                await this.createOffer();
            } else {
                console.log('⏳ Waiting for offer from partner');
            }

            if (this.onPartnerFound) {
                this.onPartnerFound(data.partnerId);
            }
        });

        // Searching for partner
        this.socket.on('searching', () => {
            console.log('🔍 Searching for partner...');
            this.isSearching = true;

            if (this.onSearching) {
                this.onSearching();
            }
        });

        // Partner disconnected
        this.socket.on('partner-disconnected', () => {
            console.log('💔 Partner disconnected');
            this.isConnected = false;
            this.closePeerConnection();

            if (this.onPartnerDisconnected) {
                this.onPartnerDisconnected();
            }
        });

        // WebRTC Offer received
        this.socket.on('webrtc-offer', async (data) => {
            console.log('📥 Received offer from', data.from);
            await this.createPeerConnection();
            await this.handleOffer(data.offer);
        });

        // WebRTC Answer received
        this.socket.on('webrtc-answer', async (data) => {
            console.log('📥 Received answer from', data.from);
            await this.handleAnswer(data.answer);
        });

        // ICE Candidate received
        this.socket.on('webrtc-ice-candidate', async (data) => {
            await this.handleIceCandidate(data.candidate);
        });

        // Chat message received
        this.socket.on('chat-message', (data) => {
            if (this.onChatMessage) {
                this.onChatMessage(data.message);
            }
        });

        // Online count update
        this.socket.on('online-count', (count) => {
            if (this.onOnlineCount) {
                this.onOnlineCount(count);
            }
        });
    }

    // Start local video stream
    async startLocalStream() {
        try {
            console.log('📹 Requesting camera and microphone...');
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });

            console.log('✅ Local stream started');
            console.log('Video tracks:', this.localStream.getVideoTracks());
            console.log('Audio tracks:', this.localStream.getAudioTracks());
            return this.localStream;

        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                constraint: error.constraint
            });
            throw error;
        }
    }

    // Find a random partner
    findPartner(userData = { isGuest: true }) {
        if (!this.socket || !this.socket.connected) {
            console.error('❌ Not connected to server');
            return;
        }

        console.log('🔍 Finding partner...');
        this.socket.emit('find-partner', userData);
    }

    // Create WebRTC peer connection
    async createPeerConnection() {
        try {
            this.peerConnection = new RTCPeerConnection(this.iceServers);

            // Add local stream tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('webrtc-ice-candidate', {
                        candidate: event.candidate
                    });
                }
            };

            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                console.log('📹 Received remote stream');
                console.log('Stream tracks:', event.streams[0].getTracks());
                this.remoteStream = event.streams[0];

                if (this.onRemoteStream) {
                    console.log('Calling onRemoteStream callback...');
                    this.onRemoteStream(this.remoteStream);
                } else {
                    console.warn('⚠️ No onRemoteStream callback set!');
                }
            };

            // Connection state change
            this.peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', this.peerConnection.connectionState);
            };

            console.log('✅ Peer connection created');

        } catch (error) {
            console.error('❌ Error creating peer connection:', error);
            throw error;
        }
    }

    // Create and send offer
    async createOffer() {
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            this.socket.emit('webrtc-offer', { offer });
            console.log('📤 Offer sent');

        } catch (error) {
            console.error('❌ Error creating offer:', error);
        }
    }

    // Handle received offer
    async handleOffer(offer) {
        try {
            console.log('📥 Handling offer...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            this.socket.emit('webrtc-answer', { answer });
            console.log('📤 Answer sent');

        } catch (error) {
            console.error('❌ Error handling offer:', error);
        }
    }

    // Handle received answer
    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('✅ Answer processed');

        } catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    }

    // Handle ICE candidate
    async handleIceCandidate(candidate) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }

    // Send chat message
    sendMessage(message) {
        if (this.socket && this.isConnected) {
            this.socket.emit('chat-message', { message });
        }
    }

    // Skip to next partner
    skipPartner() {
        if (this.socket) {
            this.socket.emit('skip-partner');
            this.closePeerConnection();
        }
    }

    // Stop searching/chatting
    stop() {
        if (this.socket) {
            this.socket.emit('stop-search');
        }
        this.closePeerConnection();
        this.isSearching = false;
        this.isConnected = false;
    }

    // Skip to next partner
    skip() {
        console.log('⏭️ Skipping partner...');

        // Close current peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Notify server
        if (this.socket && this.socket.connected) {
            this.socket.emit('skip-partner');
        }

        this.isConnected = false;
        this.isSearching = false;
    }

    // Close peer connection
    closePeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.remoteStream = null;
    }

    // Stop local stream
    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    // Disconnect from server
    disconnect() {
        this.stop();
        this.stopLocalStream();

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCManager;
}
