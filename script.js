// Siagechat - Main Application Script with WebRTC v85

// Global State
let isActive = false;
let isGuest = false;

// CRITICAL: Initialize Manager immediately if possible
let webrtcManager = null;

try {
    if (typeof WebRTCManager !== 'undefined' && typeof SIAGECHAT_CONFIG !== 'undefined') {
        console.log('🏗️ Instantiating WebRTCManager early...');
        webrtcManager = new WebRTCManager(SIAGECHAT_CONFIG.signalingServer);
        window.webrtcManager = webrtcManager;
    } else {
        console.error('❌ WebRTCManager or Config missing at global scope!');
    }
} catch (e) {
    console.error('❌ Error instantiating WebRTCManager:', e);
}

let selectedCountry = 'DE';
let selectedGender = 'male';

// DOM Elements
let stopButtons = [];
let nextButtons = [];
let btnGuest;
let btnNext;
let localVideo, remoteVideo, localOverlay, remoteLoader;
let chatInput, chatMessages, btnSend;
let countryModal, genderModal, countryBtn, genderBtn, onlineCount;
let userManagement;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM Content Loaded - Initializing v85...');

    // Select DOM elements
    stopButtons = document.querySelectorAll('.btn-stop, #btnStop');
    nextButtons = document.querySelectorAll('.btn-next, #btnNext');
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    localOverlay = document.querySelector('.local-overlay');
    remoteLoader = document.querySelector('.remote-loader') || document.querySelector('.video-overlay');
    chatInput = document.getElementById('chatInput');
    onlineCount = document.getElementById('onlineCount');
    chatMessages = document.getElementById('chatMessages');
    btnSend = document.getElementById('btnSend');

    // Init Auth
    if (window.authManager) await authManager.init();

    // Check critical elements
    if (!localVideo || !remoteVideo) {
        alert('CRITICAL ERROR: Video elements not found!');
        return;
    }

    // Initialize WebRTC Manager (if not already)
    if (!webrtcManager) {
        console.log('⚠️ WebRTCManager was null, trying to create again...');
        try {
            webrtcManager = new WebRTCManager(SIAGECHAT_CONFIG.signalingServer);
            window.webrtcManager = webrtcManager;
        } catch (e) {
            alert('FATAL: Could not create WebRTC Manager: ' + e.message);
            return;
        }
    }

    try {
        // Init Connection
        console.log('🔌 Connecting WebRTC Manager...');
        await webrtcManager.init();

        console.log('✅ WebRTC Manager initialized & connected');

        // Enable Mobile Start Button
        const mobileBtn = document.getElementById('mobileStartBtn');
        if (mobileBtn) {
            mobileBtn.disabled = false;
            mobileBtn.textContent = "START";
            mobileBtn.style.opacity = "1";
        }

        setupWebRTCCallbacks();
        setupEventListeners();
        setupSwipeGestures();

        // Check Ban (async)
        performBanCheck();

    } catch (error) {
        console.error('❌ Initialization failed:', error);
        alert('Verbindungsfehler: ' + error.message);

        // Safety: Enable button anyway to try again
        const mobileBtn = document.getElementById('mobileStartBtn');
        if (mobileBtn) {
            mobileBtn.disabled = false;
            mobileBtn.textContent = "START (Rescue)";
            mobileBtn.style.opacity = "1";
        }
    }
});

function setupWebRTCCallbacks() {
    if (!webrtcManager) return;

    webrtcManager.onPartnerFound = (partnerId) => {
        console.log('🤝 Partner found:', partnerId);
        updateUIState('connected');
        if (window.swipeHandler) window.swipeHandler.enable();
    };

    webrtcManager.onPartnerDisconnected = () => {
        console.log('👋 Partner left');
        updateUIState('searching');
        if (isActive) webrtcManager.startSearch();
    };

    webrtcManager.onRemoteStream = (stream) => {
        console.log('📺 Received remote stream');
        if (remoteVideo) {
            remoteVideo.srcObject = stream;
            // remoteVideo.play().catch(e => console.error('Auto-play failed', e));
        }
        const loader = document.querySelector('.remote-loader');
        if (loader) loader.style.display = 'none';
    };

    webrtcManager.onChatMessage = (msg) => {
        displayMessage(msg, 'partner');
    };

    webrtcManager.onOnlineCount = (count) => {
        if (onlineCount) onlineCount.textContent = count;
    };
}

function setupEventListeners() {
    // Controls
    stopButtons.forEach(btn => btn.addEventListener('click', stopChat));

    nextButtons.forEach(btn => btn.addEventListener('click', () => {
        if (!isActive) startChat();
        else skipPartner();
    }));

    // Chat
    if (btnSend) btnSend.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // Login button (if present)
    const btnLogin = document.querySelector('.btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', () => authManager.signInWithGoogle());
    }

    // Mobile Text Update
    if (window.innerWidth <= 768) {
        const searchText = document.querySelector('.search-text');
        if (searchText) searchText.textContent = 'WISCHE FÜR WEITER';
    }

    // Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // modal outside click
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            closeModals();
        }
    };
}

// ---------------- GLOBAL ACTIONS ----------------

// Make startChat global and robust
window.startChat = async function () {
    console.log('▶️ START CHAT REQUESTED');

    if (!webrtcManager) {
        alert('Systemfehler: WebRTC Manager nicht geladen!');
        return;
    }

    // ENFORCE LOGIN
    if (!authManager || !authManager.isLoggedIn()) {
        alert('Bitte melde dich zuerst an!');
        if (authManager) authManager.signInWithGoogle();
        return;
    }

    try {
        isActive = true;
        updateUIState('searching');

        // Request Camera
        const stream = await webrtcManager.startLocalStream();
        if (localVideo) {
            localVideo.srcObject = stream;
            localVideo.muted = true; // Always mute local
        }

        // Hide local overlay
        if (localOverlay) localOverlay.style.display = 'none';

        // Connect
        webrtcManager.startSearch();

    } catch (error) {
        console.error('❌ Start Chat Error:', error);
        isActive = false;
        updateUIState('idle');
        alert('Kamera-Fehler: ' + error.message);
    }
};

window.stopChat = function () {
    console.log('⏹️ STOP CHAT');
    isActive = false;
    if (webrtcManager) webrtcManager.stop();

    if (localVideo) {
        localVideo.srcObject = null;
        localVideo.load();
    }
    if (remoteVideo) {
        remoteVideo.srcObject = null;
        remoteVideo.load();
    }

    if (localOverlay) localOverlay.style.display = 'flex';
    updateUIState('idle');
};

window.skipPartner = function () {
    console.log('⏭️ SKIP');
    if (webrtcManager) webrtcManager.skip();
    updateUIState('searching');

    // Check ban occasionally
    performBanCheck();
};

function sendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (text && webrtcManager && webrtcManager.isConnected) {
        webrtcManager.sendMessage(text);
        displayMessage(text, 'you');
        chatInput.value = '';
    }
}

function displayMessage(text, sender) {
    // Not implemented in UI yet fully, but function stub needed
    console.log(`MSG [${sender}]: ${text}`);
    if (chatMessages) {
        // ... append logic
    }
}

function updateUIState(state) {
    // stopButtons, nextButtons are arrays
    if (state === 'searching') {
        stopButtons.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
        // Show loader
        if (remoteLoader) remoteLoader.style.display = 'flex';
        const st = document.querySelector('.search-text');
        if (st) st.textContent = (window.innerWidth <= 768) ? 'SUCHE...' : 'SUCHE PARTNER...';

    } else if (state === 'connected') {
        stopButtons.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
        if (remoteLoader) remoteLoader.style.display = 'none';

    } else { // idle
        stopButtons.forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
        if (remoteLoader) remoteLoader.style.display = 'flex';
        const st = document.querySelector('.search-text');
        if (st) st.textContent = (window.innerWidth <= 768) ? 'WISCHE FÜR START' : 'KLICKE AUF WEITER';
    }
}

function performBanCheck() {
    if (window.userManagement && authManager.currentUser) {
        userManagement.checkUserStatus(authManager.currentUser.id);
    }
}

// Helpers for Modals
window.openModal = function (id) {
    const m = document.getElementById(id + 'Modal');
    if (m) m.style.display = 'flex';
};
window.closeModals = function () {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
};

// Report Modal
window.openReportModal = function () {
    if (window.openReportModalLogic) window.openReportModalLogic(); // from report.js
    else {
        // Fallback if report.js not loaded
        document.getElementById('reportModal').style.display = 'flex';
    }
}

// Swipe Setup
function setupSwipeGestures() {
    const stage = document.querySelector('.chat-container') || document.querySelector('.video-grid');
    if (stage && typeof SwipeHandler !== 'undefined') {
        window.swipeHandler = new SwipeHandler(stage, {
            onSwipeLeft: () => {
                if (!isActive) window.startChat();
                else window.skipPartner();
            },
            onSwipeRight: () => window.stopChat()
        });
    }
}
