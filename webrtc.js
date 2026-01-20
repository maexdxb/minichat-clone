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
        this.partnerSupabaseId = null;
        this.currentFacingMode = 'user';

        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        };

        this.onPartnerFound = null;
        this.onPartnerDisconnected = null;
        this.onRemoteStream = null;
        this.onChatMessage = null;
        this.onOnlineCount = null;
    }

    async init() {
        console.log('🔌 Connecting to signaling server:', this.signalingServerUrl);

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
                reject(err);
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
        this.socket.on('partner-found', (data) => this.handleMatchFound(data, 'partner-found'));
        this.socket.on('match-found', (data) => this.handleMatchFound(data, 'match-found'));

        this.socket.on('partner-disconnected', () => {
            console.log('💔 Partner disconnected');
            this.closePeerConnection();
            this.isConnected = false;
            if (this.onPartnerDisconnected) this.onPartnerDisconnected();
        });

        this.socket.on('webrtc-offer', async (data) => await this.handleOffer(data.offer));
        this.socket.on('webrtc-answer', async (data) => await this.handleAnswer(data.answer));
        this.socket.on('webrtc-ice-candidate', async (data) => await this.handleIceCandidate(data.candidate));
        this.socket.on('chat-message', (data) => {
            if (this.onChatMessage) this.onChatMessage(data.message);
        });
        this.socket.on('online-count', (count) => {
            if (this.onOnlineCount) this.onOnlineCount(count);
        });
    }

    async handleMatchFound(data, eventName) {
        console.log(`🎉 MATCH FOUND (${eventName})!`, data);
        this.partnerSupabaseId = data.partnerSupabaseId;
        window.CURRENT_PARTNER_ID = data.partnerSupabaseId;
        this.isSearching = false;
        this.isConnected = true;
        if (data.initiator) await this.createOffer();
        if (this.onPartnerFound) this.onPartnerFound(data.partnerId);
    }

    async startLocalStream() {
        try {
            console.log('📹 Requesting camera access...');
            const constraints = {
                video: { facingMode: this.currentFacingMode === 'environment' ? { ideal: 'environment' } : 'user' },
                audio: true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.localStream = stream;
            return this.localStream;
        } catch (error) {
            console.error('❌ startLocalStream failed:', error);
            throw error;
        }
    }

    async switchCamera() {
        this.currentFacingMode = (this.currentFacingMode === 'environment') ? 'user' : 'environment';
        const newStream = await this.startLocalStream();
        if (this.peerConnection) {
            const videoSender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
            if (videoSender) await videoSender.replaceTrack(newStream.getVideoTracks()[0]);
        }
        return newStream;
    }

    createPeerConnection() {
        if (this.peerConnection) return;
        this.peerConnection = new RTCPeerConnection(this.config);
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));
        }
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
        };
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) this.socket.emit('webrtc-ice-candidate', { candidate: event.candidate });
        };
    }

    async createOffer() {
        this.createPeerConnection();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.socket.emit('webrtc-offer', { offer });
    }

    async handleOffer(offer) {
        this.createPeerConnection();
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.socket.emit('webrtc-answer', { answer });
    }

    async handleAnswer(answer) {
        if (this.peerConnection) await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async handleIceCandidate(candidate) {
        if (this.peerConnection) await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    startSearch(userId) {
        if (this.socket) {
            this.isSearching = true;
            const searchData = { country: 'all', gender: 'all', supabaseId: userId };
            this.socket.emit('find-partner', searchData);
            console.log('🔎 Search started...');
        }
    }

    sendMessage(message) {
        if (this.socket && this.isConnected) this.socket.emit('chat-message', { message });
    }

    skip() {
        window.CURRENT_PARTNER_ID = null;
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
}
