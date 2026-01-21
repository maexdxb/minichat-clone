// Siagechat - Main Application Script with WebRTC v85

// Global State
let isActive = false;
let isGuest = false;

// CRITICAL: Initialize Manager immediately if possible
let webrtcManager = null;

try {
    if (typeof WebRTCManager !== 'undefined' && typeof SIAGECHAT_CONFIG !== 'undefined') {
        console.log('ðŸ—ï¸ Instantiating WebRTCManager early...');
        webrtcManager = new WebRTCManager(SIAGECHAT_CONFIG.signalingServer);
        window.webrtcManager = webrtcManager;
    } else {
        console.error('âŒ WebRTCManager or Config missing at global scope!');
    }
} catch (e) {
    console.error('âŒ Error instantiating WebRTCManager:', e);
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
    console.log('ðŸš€ DOM Content Loaded - Initializing v85...');

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
        console.log('âš ï¸ WebRTCManager was null, trying to create again...');
        try {
            webrtcManager = new WebRTCManager(SIAGECHAT_CONFIG.signalingServer);
            window.webrtcManager = webrtcManager;
        } catch (e) {
            alert('FATAL: Could not create WebRTC Manager: ' + e.message);
            return;
        }
    }

    try {
        // Setup callbacks BEFORE connecting to catch 'online-count'
        setupWebRTCCallbacks();

        // Init Connection
        console.log('ðŸ”Œ Connecting WebRTC Manager...');
        await webrtcManager.init();

        console.log('âœ… WebRTC Manager initialized & connected');

        // Enable Mobile Start Button
        const mobileBtn = document.getElementById('mobileStartBtn');
        if (mobileBtn) {
            mobileBtn.disabled = false;
            mobileBtn.textContent = "START";
            mobileBtn.style.opacity = "1";
        }

        setupEventListeners();
        setupSwipeGestures();

        // Check Ban (async)
        performBanCheck();

        // Auto-enable Camera Preview (Desktop/Supported)
        // User requested: See camera before searching
        if (window.innerWidth > 768) {
            window.enableCameraPreview();
        }

    } catch (error) {
        console.error('âŒ Initialization failed:', error);
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
        console.log('ðŸ¤ Partner found:', partnerId);
        updateUIState('connected');
        if (window.swipeHandler && typeof window.swipeHandler.enable === 'function') {
            window.swipeHandler.enable();
        }
    };

    webrtcManager.onPartnerDisconnected = async () => {
        console.log('ðŸ‘‹ Partner left');
        updateUIState('searching');

        if (isActive) {
            // FIX: Check ban status before auto-reconnecting
            // Prevents banned users from continuing via auto-search
            if (window.userManagement && authManager.currentUser) {
                // Disable cache/optimistic checks? userManagement.checkUserStatus hits DB.
                const status = await window.userManagement.checkUserStatus(authManager.currentUser.id);

                if (!status.allowed) {
                    console.log('ðŸš« User banned during auto-search loop');
                    isActive = false;
                    webrtcManager.stop();
                    showBanModal(status);
                    updateUIState('idle');
                    return;
                }
            }

            const myId = authManager.currentUser ? authManager.currentUser.id : null;
            webrtcManager.startSearch(myId);
        }
    };

    webrtcManager.onRemoteStream = (stream) => {
        console.log('ðŸ“º Received remote stream');
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

    // HACK: Force Safari to re-read theme-color on interaction
    // Fixes issue where bars turn white after "Start"
    document.addEventListener('click', () => {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = '#000000';
    });

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
        if (searchText) searchText.textContent = 'WISCHE FÃœR WEITER';
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

    // Camera Switch (Double Tap/Click)
    const localVid = document.getElementById('localVideo');
    if (localVid) {
        let lastTap = 0;
        let isSwitching = false;

        localVid.addEventListener('click', async (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;

            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();

                if (isSwitching) return;
                isSwitching = true;

                console.log('ðŸ”„ Double tap detected: Switching Camera');
                try {
                    if (window.webrtcManager) {
                        const stream = await window.webrtcManager.switchCamera();
                        if (localVid) localVid.srcObject = stream;
                    }
                } catch (err) {
                    // Ignore
                } finally {
                    setTimeout(() => { isSwitching = false; }, 1000);
                }
            }
            lastTap = currentTime;
        });


    }
}

// ---------------- GLOBAL ACTIONS ----------------

// Make startChat global and robust
window.startChat = async function () {
    console.log('â–¶ï¸ START CHAT REQUESTED');

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

    // CHECK BAN STATUS BEFORE STARTING (with fallback)
    if (authManager.currentUser) {
        // ... (Ban check logic remains same, condensed for replacement)
        let isBanned = false;
        if (window.userManagement) {
            const status = await window.userManagement.checkUserStatus(authManager.currentUser.id);
            if (!status.allowed) isBanned = true;
        } else if (authManager.supabase) {
            const { data } = await authManager.supabase.from('user_management').select('status').eq('user_id', authManager.currentUser.id).single();
            if (data && (data.status === 'perm_banned' || data.status === 'temp_banned')) isBanned = true;
        }

        if (isBanned) {
            showBanModal({ reason: 'Gesperrt' });
            return;
        }
    }

    try {
        isActive = true;
        updateUIState('searching');

        // Request Camera (if not already active from preview)
        if (!localVideo.srcObject) {
            console.log('ðŸ“· Starting camera for chat...');
            const stream = await webrtcManager.startLocalStream();
            if (localVideo) {
                localVideo.srcObject = stream;
                localVideo.muted = true;
            }
            if (localOverlay) localOverlay.style.display = 'none';
        }

        // Connect
        const myId = authManager.currentUser ? authManager.currentUser.id : null;
        webrtcManager.startSearch(myId);

    } catch (error) {
        console.error('âŒ Start Chat Error:', error);
        isActive = false;
        updateUIState('idle');
        alert('Kamera-Fehler: ' + error.message);
    }
};

// NEW: Camera Preview Function
window.enableCameraPreview = async function () {
    console.log('ðŸ‘ï¸ Enabling Camera Preview...');
    if (!webrtcManager) return;

    try {
        const stream = await webrtcManager.startLocalStream();
        if (localVideo) {
            localVideo.srcObject = stream;
            localVideo.muted = true;
        }
        if (localOverlay) localOverlay.style.display = 'none';
        console.log('âœ… Camera Preview Active');
    } catch (e) {
        console.error('Preview Error:', e);
        // Don't alert here, let explicit start handle errors
    }
};

window.startMobilePreview = function () {
    document.getElementById('start-overlay').style.display = 'none';
    window.enableCameraPreview();
    // Do NOT start chat yet, just preview as requested
};

window.stopChat = function () {
    console.log('â¹ï¸ STOP CHAT');
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

window.skipPartner = async function () {
    console.log('â­ï¸ SKIP REQUESTED');

    // STRICT BAN CHECK BEFORE SKIPPING
    if (authManager.currentUser) {
        console.log('ðŸ” [SKIP] Checking ban status for:', authManager.currentUser.id);
        let isBanned = false;
        let banData = null;

        // Try UserManagement first
        if (window.userManagement) {
            console.log('âœ… [SKIP] Using UserManagement for ban check');
            const status = await window.userManagement.checkUserStatus(authManager.currentUser.id);
            console.log('ðŸ“Š [SKIP] Ban check result:', status);
            if (!status.allowed) {
                isBanned = true;
                banData = status;
            }
        }

        // Fallback to direct Supabase check if needed
        if (!isBanned && authManager.supabase) {
            console.log('âš ï¸ [SKIP] Fallback: Direct Supabase ban check');
            const { data } = await authManager.supabase
                .from('user_management')
                .select('status, ban_reason')
                .eq('user_id', authManager.currentUser.id)
                .single();

            console.log('ðŸ“Š [SKIP] Direct DB result:', data);
            if (data && (data.status === 'perm_banned' || data.status === 'temp_banned')) {
                isBanned = true;
                banData = { reason: data.ban_reason };
            }
        }

        if (isBanned) {
            console.log('ðŸš« [SKIP] User is BANNED, blocking skip');
            showBanModal(banData || { reason: 'Gesperrt' });
            if (webrtcManager) webrtcManager.stop(); // Stop current connection
            isActive = false;
            updateUIState('idle');
            return; // STOP execution
        }
        console.log('âœ… [SKIP] User is allowed to skip');
    }

    // Only if allowed:
    if (webrtcManager) webrtcManager.skip();
    updateUIState('searching');
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
        if (st) st.textContent = (window.innerWidth <= 768) ? 'WISCHE FÃœR START' : 'KLICKE AUF WEITER';
    }
}

async function performBanCheck() {
    if (window.userManagement && authManager.currentUser) {
        const status = await window.userManagement.checkUserStatus(authManager.currentUser.id);
        if (!status.allowed) {
            showBanModal(status);
        }
    }
}

function showBanModal(banStatus) {
    const modal = document.getElementById('banModal');
    const reasonText = document.getElementById('ban-reason-text');
    const durationText = document.getElementById('ban-duration-text');
    const evidenceImg = document.getElementById('ban-evidence-img');

    if (reasonText) reasonText.textContent = banStatus.reason || 'VerstoÃŸ gegen Regeln';

    if (durationText) {
        if (banStatus.type === 'permanent') {
            durationText.textContent = 'Permanent';
        } else if (banStatus.hoursLeft) {
            durationText.textContent = `${banStatus.hoursLeft} Stunden`;
        }
    }

    if (evidenceImg && banStatus.evidence) {
        evidenceImg.src = banStatus.evidence;
        evidenceImg.style.display = 'block';
    } else if (evidenceImg) {
        evidenceImg.style.display = 'none';
    }

    if (modal) modal.style.display = 'flex';
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
    // Target ONLY the remote video wrapper to prevent swiping on local video
    const remoteVid = document.getElementById('remoteVideo');
    const stage = remoteVid ? remoteVid.parentElement : document.querySelector('.chat-container');

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

// INITIALIZE LIQUID ETHER EFFECT
document.addEventListener('DOMContentLoaded', () => {
    const liquidElements = document.querySelectorAll('.liquid-background');
    liquidElements.forEach(container => {
        new LiquidEther(container, {
            colors: ['#ff00cc', '#e694b9', '#91738d'], // Neon Pink Palette matching the site
            mouseForce: 20,
            cursorSize: 100,
            isViscous: true,
            viscous: 30,
            iterationsViscous: 32,
            iterationsPoisson: 32,
            dt: 0.014,
            resolution: 0.5,
            BFECC: true,
            autoDemo: true,
            autoSpeed: 0.5,
            autoIntensity: 2.2,
            autoResumeDelay: 3000,
            dissipation: 0.96
        });
    });
});





