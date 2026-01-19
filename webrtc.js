class WebRTCManager {
    constructor(signalingServerUrl) {
        console.log("🛠️ WebRTCManager Constructor called with:", signalingServerUrl);
        if (!signalingServerUrl) console.error("❌ NO SIGNALING SERVER URL PROVIDED!");

        this.socket = null;
        this.signalingServerUrl = signalingServerUrl;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isConnected = false;
        this.isSearching = false;
        this.partnerSupabaseId = null; // Store partner's ID

        // Configuration
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                // Add TURN if available
            ]
        };

        // Callbacks
        this.onPartnerFound = null;
        this.onPartnerDisconnected = null;
        this.onRemoteStream = null;
        this.onChatMessage = null;
        this.onOnlineCount = null;
    }

    // Connect to signaling server
    async init() {
        console.log('🔌 Connecting to signaling server:', this.signalingServerUrl);

        // Load socket.io ONLY if not present
        if (typeof io === 'undefined') {
            await this.loadScript('https://cdn.socket.io/4.7.2/socket.io.min.js');
        }

        this.socket = io(this.signalingServerUrl, {
            transports: ['websocket', 'polling']
        });

        return new Promise((resolve, reject) => {
            this.socket.on('connect', () => {
                console.log('✅ Connected to Signaling Server! ID:', this.socket.id);
                resolve();
            });

            this.socket.on('connect_error', (err) => {
                console.error('Socket error:', err);
                // Don't reject, keep trying
            });

            this.setupSocketListeners();
        });
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupSocketListeners() {
        // Match found (New)
        this.socket.on('partner-found', (data) => this.handleMatchFound(data, 'partner-found'));

        // Match found (Legacy/Fallback)
        this.socket.on('match-found', (data) => this.handleMatchFound(data, 'match-found'));

        // Partner disconnected
        this.socket.on('partner-disconnected', () => {
            console.log('💔 Partner disconnected');
            this.closePeerConnection();
            this.isConnected = false;
            if (this.onPartnerDisconnected) {
                this.onPartnerDisconnected();
            }
            // Auto-search again? Handled by script.js usually
        });

        // WebRTC Signals
        this.socket.on('webrtc-offer', async (data) => {
            await this.handleOffer(data.offer);
        });

        this.socket.on('webrtc-answer', async (data) => {
            await this.handleAnswer(data.answer);
        });

        this.socket.on('webrtc-ice-candidate', async (data) => {
            await this.handleIceCandidate(data.candidate);
        });

        // Chat
        this.socket.on('chat-message', (data) => {
            if (this.onChatMessage) this.onChatMessage(data.message);
        });

        // Online count
        this.socket.on('online-count', (count) => {
            if (this.onOnlineCount) this.onOnlineCount(count);
        });
    }

    async handleMatchFound(data, eventName) {
        console.log(`🎉 MATCH FOUND (${eventName})!`, data);

        // Store Partner ID globally for reports
        this.partnerSupabaseId = data.partnerSupabaseId;
        // Brute force global store
        window.CURRENT_PARTNER_ID = data.partnerSupabaseId;
        console.log('Set CURRENT_PARTNER_ID to:', window.CURRENT_PARTNER_ID);

        this.isSearching = false;
        this.isConnected = true;

        if (data.initiator) {
            await this.createOffer();
        }

        if (this.onPartnerFound) {
            this.onPartnerFound(data.partnerId);
        }
    }

    // Start local video stream - ROBUST VERSION
    async startLocalStream() {
        try {
            console.log('📹 Requesting camera access...');

            // 1. Check if navigator.mediaDevices exists
            if (!navigator.mediaDevices && !navigator.webkitGetUserMedia) {
                throw new Error("WebRTC wird von diesem Browser nicht unterstützt.");
            }

            // Responsive constraints: Desktop vs Mobile
            const isMobile = window.innerWidth <= 768;
            const constraints = {
                video: isMobile ? {
                    facingMode: "user"
                } : {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                },
                audio: true
            };

            let stream = null;

            // 2. Try Standard API
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (err) {
                    console.warn('Standard getUserMedia failed, trying fallback constraints...', err);
                    // Fallback: Low res
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                }
            }
            // 3. Try Legacy API (WebKit/Moz)
            else {
                const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                if (!getUserMedia) throw new Error("Keine Kamera-API gefunden.");

                stream = await new Promise((resolve, reject) => {
                    getUserMedia.call(navigator, constraints, resolve, reject);
                });
            }

            if (!stream) throw new Error("Kamera Stream ist leer.");

            this.localStream = stream;
            console.log('✅ Local stream started:', stream.id);
            return this.localStream;

        } catch (error) {
            console.error('❌ startLocalStream failed:', error);
            throw new Error(`Kamera Zugriff verweigert: ${error.name} - ${error.message}`);
        }
    }

    // Peer Connection Management
    createPeerConnection() {
        if (this.peerConnection) return; // Already exists

        console.log('🔗 Creating RTCPeerConnection');
        this.peerConnection = new RTCPeerConnection(this.config);

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('📡 Remote track received');
            this.remoteStream = event.streams[0];
            if (this.onRemoteStream) {
                this.onRemoteStream(this.remoteStream);
            }
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('webrtc-ice-candidate', { candidate: event.candidate });
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
        };
    }

    // Signaling Methods
    async createOffer() {
        try {
            this.createPeerConnection();
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.socket.emit('webrtc-offer', { offer });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    async handleOffer(offer) {
        try {
            this.createPeerConnection();
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.socket.emit('webrtc-answer', { answer });
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    async handleAnswer(answer) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async handleIceCandidate(candidate) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('Error adding ICE:', error);
        }
    }

    // Controls
    startSearch() {
        if (this.socket) {
            this.isSearching = true;

            const searchData = {
                country: 'all',
                gender: 'all'
            };

            // Emit BOTH events to be safe with server versions
            this.socket.emit('find-partner', searchData);
            this.socket.emit('start-search', searchData);

            console.log('🔎 Search started (sent both find-partner and start-search)...');
        }
    }

    sendMessage(message) {
        if (this.socket && this.isConnected) {
            this.socket.emit('chat-message', { message });
        }
    }

    skip() {
        window.CURRENT_PARTNER_ID = null; // Reset report ID
        this.closePeerConnection();
        this.isConnected = false;
        if (this.socket) this.socket.emit('skip-partner');
    }

    stop() {
        this.isSearching = false;
        this.isConnected = false;
        this.closePeerConnection();
        this.stopLocalStream();
        if (this.socket) this.socket.emit('stop-search');
    }

    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    closePeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.remoteStream = null;
    }

    disconnect() {
        this.stop();
        if (this.socket) this.socket.disconnect();
    }
}
