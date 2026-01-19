// Siagechat - Main Application Script with WebRTC
// State management
let isActive = false;
let isGuest = false;
let webrtcManager = null;
let selectedCountry = 'DE';
let selectedGender = 'male';

// DOM Elements - will be initialized in DOMContentLoaded
let stopButtons = [];
let nextButtons = [];
let btnGuest;
let btnNext; // Single next button reference
let localVideo, remoteVideo, localOverlay, remoteLoader, noPartner;
let chatInput, chatMessages, btnSend;
let countryModal, genderModal, countryBtn, genderBtn, onlineCount;
let userManagement; // Add global userManagement instance

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM Content Loaded - Initializing...');

    // NOW select DOM elements
    stopButtons = document.querySelectorAll('.btn-stop, #btnStop');
    nextButtons = document.querySelectorAll('.btn-next, #btnNext');
    btnNext = document.querySelector('.btn-next, #btnNext'); // Single next button
    btnGuest = document.querySelector('.btn-guest');
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    localOverlay = document.querySelector('.local-overlay');
    // Fallback for remote loader class mismatch
    remoteLoader = document.querySelector('.remote-loader') || document.querySelector('.video-overlay');
    noPartner = document.getElementById('noPartner');
    chatInput = document.getElementById('chatInput');
    countryModal = document.getElementById('countryModal');
    genderModal = document.getElementById('genderModal');
    countryBtn = document.querySelector('.country');
    genderBtn = document.querySelector('.gender');
    onlineCount = document.getElementById('onlineCount');
    chatMessages = document.getElementById('chatMessages');
    btnSend = document.getElementById('btnSend');

    // Validate critical elements
    console.log('DOM Elements check:');
    console.log('localVideo:', localVideo);
    console.log('remoteVideo:', remoteVideo);
    console.log('localOverlay:', localOverlay);
    console.log('remoteLoader:', remoteLoader);
    console.log('btnStop count:', stopButtons.length);
    console.log('btnNext count:', nextButtons.length);

    if (!localVideo || !remoteVideo || !localOverlay || !remoteLoader) {
        console.error('❌ Critical DOM elements missing!');
        const missing = [];
        if (!localVideo) missing.push('localVideo');
        if (!remoteVideo) missing.push('remoteVideo');
        if (!localOverlay) missing.push('localOverlay');
        if (!remoteLoader) missing.push('remoteLoader');

        console.error('Missing elements:', missing);
        alert('Fehler: Kritische Elemente fehlen (' + missing.join(', ') + '). Bitte Cache leeren und Seite neu laden.');
        return;
    }

    // Setup Event Listeners IMMEDIATELY so buttons work even if network hangs
    setupEventListeners();
    setupSwipeGestures();
    animateOnlineCount();

    console.log('✅ All critical DOM elements found');
    // Initialize authentication
    await authManager.init();
    authManager.checkMockUser();

    // Initialize User Management
    if (authManager.supabase) {
        userManagement = new UserManagement(authManager.supabase);
    }

    // Initialize WebRTC Manager (with timeout)
    try {
        webrtcManager = new WebRTCManager(SIAGECHAT_CONFIG.signalingServer);

        // Race condition: Timeout after 3 seconds if server doesn't respond
        const initPromise = webrtcManager.init();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 3000)
        );

        await Promise.race([initPromise, timeoutPromise]);

        console.log('✅ WebRTC Manager initialized');

        // Setup WebRTC callbacks
        setupWebRTCCallbacks();

    } catch (error) {
        console.error('❌ Failed to initialize WebRTC:', error);
        showNotification('⚠️ Verbindung wird im Hintergrund aufgebaut...');
        // We still allow operation; socket might connect later
        setupWebRTCCallbacks(); // Setup callbacks anyway just in case
    }
});

// Setup WebRTC Callbacks
function setupWebRTCCallbacks() {
    // Partner found
    webrtcManager.onPartnerFound = (partnerId) => {
        console.log('🎉 Partner gefunden:', partnerId);
        console.log('Current state - remoteLoader:', remoteLoader.style.display);
        console.log('Current state - remoteVideo:', remoteVideo.style.display);

        // Hide NO SIGNAL
        const searchText = document.querySelector('.search-text');
        if (searchText) {
            searchText.textContent = 'VERBINDE...';
        }

        showNotification('Partner gefunden! Verbinde... 🎉');
    };

    // Partner disconnected
    webrtcManager.onPartnerDisconnected = () => {
        console.log('💔 Partner getrennt');
        remoteVideo.srcObject = null;
        remoteVideo.style.display = 'none';
        remoteLoader.style.display = 'flex';

        // Remove idle class - now searching
        const remoteLoaderEl = document.querySelector('.remote-loader');
        if (remoteLoaderEl) {
            remoteLoaderEl.classList.remove('idle');
        }

        // Update loader text
        const searchText = document.querySelector('.search-text');
        if (searchText) {
            searchText.textContent = 'NEUER PARTNER WIRD GESUCHT';
        }

        // Auto-search for new partner instead of showing "no partner"
        showNotification('Partner hat getrennt. Klicke auf Weiter.');

        // Removed auto-search as per user request
        if (noPartner) {
            noPartner.style.display = 'flex';
        }
        remoteLoader.style.display = 'none';

        // Show Next Button prominence?
        // nextButtons.forEach(btn => btn.classList.add('pulse'));


        toggleReportButton(false);
    };

    // Remote stream received
    webrtcManager.onRemoteStream = (stream) => {
        console.log('📹 Remote Stream empfangen');

        // Hide NO SIGNAL loader
        remoteLoader.style.display = 'none';

        // Show remote video
        remoteVideo.srcObject = stream;
        remoteVideo.style.display = 'block';
        toggleReportButton(true);
        noPartner.style.display = 'none';

        console.log('✅ Remote video should now be visible');
    };

    // Searching for partner
    webrtcManager.onSearching = () => {
        console.log('🔍 Suche Partner...');
        remoteLoader.style.display = 'flex';
        remoteVideo.style.display = 'none';
        noPartner.style.display = 'none';

        // Remove idle class - now searching
        const remoteLoaderEl = document.querySelector('.remote-loader');
        if (remoteLoaderEl) {
            remoteLoaderEl.classList.remove('idle');
        }

        // Update loader text
        const searchText = document.querySelector('.search-text');
        if (searchText) {
            searchText.textContent = 'NEUER PARTNER WIRD GESUCHT';
        }
    };

    // Chat message received
    webrtcManager.onChatMessage = (message) => {
        showNotification(`Partner: ${message}`);
    };

    // Online count update
    webrtcManager.onOnlineCount = (count) => {
        if (onlineCount) {
            onlineCount.textContent = count.toLocaleString('de-DE');
        }
    };
}

// Event Listeners
function setupEventListeners() {
    console.log('🔌 Setting up event listeners...');

    stopButtons.forEach(btn => btn.addEventListener('click', stopChat));

    // Next button always works - starts chat if inactive, skips if active
    if (btnNext) {
        btnNext.addEventListener('click', skipPartner);
        console.log('✅ Listener attached to btnNext');
    }

    // Add listeners to ALL next buttons
    nextButtons.forEach(btn => {
        btn.addEventListener('click', skipPartner);
    });

    // Global click debugger
    document.body.addEventListener('click', (e) => {
        console.log('Body click target:', e.target.tagName, e.target.className);
    });

    // Initial button states
    stopButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });

    // Next button is always enabled
    nextButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
    });

    countryBtn.addEventListener('click', () => openModal('country'));
    genderBtn.addEventListener('click', () => openModal('gender'));

    // Guest login button
    if (btnGuest) {
        btnGuest.addEventListener('click', () => continueAsGuest());
    }

    // Login button
    const btnLogin = document.querySelector('.btn-login');
    if (btnLogin) {
        btnLogin.addEventListener('click', () => authManager.signInWithGoogle());
    }

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Country selection
    document.querySelectorAll('.country-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const country = e.currentTarget.dataset.country;
            selectCountry(country);
            closeModals();
        });
    });

    // Gender selection
    document.querySelectorAll('.gender-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const gender = e.currentTarget.dataset.gender;
            selectGender(gender);
            closeModals();
        });
    });

    // Chat input
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && isActive) {
            sendMessage(chatInput.value);
            chatInput.value = '';
        }
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    // Retry button
    document.querySelector('.btn-retry')?.addEventListener('click', findPartner);
}

// Continue as Guest
function continueAsGuest() {
    isGuest = true;
    console.log('✅ Guest mode activated. isGuest:', isGuest);

    // Update UI - preserve online counter
    const headerRight = document.querySelector('.header-right');
    const onlineCounter = headerRight.querySelector('.online-counter');
    headerRight.innerHTML = `
        <div class="user-menu">
            <i class="fa-solid fa-user-secret" style="font-size: 1.5rem; color: #888;"></i>
            <span class="user-name">Gast</span>
        </div>
    `;
    // Re-add online counter at the beginning
    if (onlineCounter) {
        headerRight.insertBefore(onlineCounter, headerRight.firstChild);
    }

    showNotification('Als Gast angemeldet! Starte Chat... 👋');

    // Auto-start chat after 1 second (WORKING VERSION)
    setTimeout(() => {
        startChat();
    }, 1000);
}



// Stop Chat
function stopChat() {
    if (!isActive) return;

    console.log('🛑 Stopping chat...');

    // Stop WebRTC
    if (webrtcManager) {
        webrtcManager.stop();
    }

    // Stop AND REMOVE local stream
    if (localVideo.srcObject) {
        const tracks = localVideo.srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
            console.log('Stopped local track:', track.kind);
        });
        localVideo.srcObject = null;
    }

    // Stop remote stream
    if (remoteVideo.srcObject) {
        const tracks = remoteVideo.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        remoteVideo.srcObject = null;
    }

    // Stop local stream in WebRTC manager too
    if (webrtcManager) {
        webrtcManager.stopLocalStream();
    }

    // Reset UI
    localVideo.style.display = 'none';
    remoteVideo.style.display = 'none';
    localOverlay.style.display = 'flex';
    remoteLoader.style.display = 'flex';
    noPartner.style.display = 'none';
    toggleReportButton(false);

    // Show idle state - not searching
    const remoteLoaderEl = document.querySelector('.remote-loader');
    if (remoteLoaderEl) {
        remoteLoaderEl.classList.add('idle');
    }

    // Reset loader text to idle message
    const searchText = document.querySelector('.search-text');
    if (searchText) {
        searchText.textContent = 'Klicke auf Weiter für die nächste Person';
    }

    // Show Start Button again
    if (btnStart) {
        btnStart.style.display = 'flex';
        btnStart.disabled = false;
    }

    // Disable control buttons
    stopButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    nextButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });

    // Show settings again on mobile
    const settingsGroup = document.querySelector('.settings');
    if (settingsGroup) {
        settingsGroup.classList.remove('hidden-during-chat');
    }

    isActive = false;

    showNotification('Chat beendet.');
    console.log('✅ Chat stopped - camera released');
}

// Skip to next partner
async function skipPartner() {
    console.log('⏭️ skipPartner called, isActive:', isActive);

    // Check ban status before skipping
    console.log('🛡️ Checking ban status...');
    const isBanned = await performBanCheck();
    console.log('🛡️ Ban check result:', isBanned);
    if (isBanned) return;

    if (!isActive) {
        // Start chat if not active
        console.log('▶️ Chat not active, calling startChat()...');
        startChat();
        return;
    }

    console.log('⏭️ Skipping to next partner...');

    // Disconnect current partner
    if (webrtcManager) {
        webrtcManager.skip();
    }

    // Reset remote video
    if (remoteVideo.srcObject) {
        const tracks = remoteVideo.srcObject.getTracks();
        tracks.forEach(track => track.stop());
    }
    remoteVideo.srcObject = null;
    remoteVideo.style.display = 'none';
    remoteLoader.style.display = 'flex';
    noPartner.style.display = 'none';
    toggleReportButton(false);

    // Remove idle class - now searching
    const remoteLoaderEl = document.querySelector('.remote-loader');
    if (remoteLoaderEl) {
        remoteLoaderEl.classList.remove('idle');
    }

    // Update loader text
    const searchText = document.querySelector('.search-text');
    if (searchText) {
        searchText.textContent = 'NEUER PARTNER WIRD GESUCHT';
    }

    const spinner = document.querySelector('.spinner');
    if (spinner) spinner.style.display = 'block';

    showNotification('Suche neuen Partner... 🔍');

    // Search for new partner
    setTimeout(() => {
        if (isActive && webrtcManager) {
            const userData = {
                isGuest: isGuest,
                country: selectedCountry,
                gender: selectedGender
            };
            webrtcManager.findPartner(userData);
        }
    }, 300);
}

// Find Partner
function findPartner() {
    if (!isActive) return;

    const userData = {
        isGuest: isGuest,
        country: selectedCountry,
        gender: selectedGender
    };

    webrtcManager.findPartner(userData);

    remoteLoader.style.display = 'flex';
    noPartner.style.display = 'none';
    remoteVideo.style.display = 'none';
}

// Modal Functions
function openModal(type) {
    if (type === 'country') {
        countryModal.style.display = 'flex';
    } else if (type === 'gender') {
        genderModal.style.display = 'flex';
    }
}

function closeModals() {
    countryModal.style.display = 'none';
    genderModal.style.display = 'none';
}

// Selection Functions
function selectCountry(country) {
    selectedCountry = country;
    const flagImg = countryBtn.querySelector('img');
    flagImg.src = `https://flagsapi.com/${country}/flat/64.png`;
}

function selectGender(gender) {
    selectedGender = gender;
    const icon = genderBtn.querySelector('i');

    if (gender === 'male') {
        icon.className = 'fa-solid fa-mars';
    } else if (gender === 'female') {
        icon.className = 'fa-solid fa-venus';
    } else {
        icon.className = 'fa-solid fa-user';
    }
}

// Chat Functions
function sendMessage(message) {
    if (!message.trim() || !isActive) return;

    webrtcManager.sendMessage(message);
    console.log('Message sent:', message);
}

// Notification
function showNotification(text) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = text;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Update Online Count from Database
async function updateOnlineCount() {
    try {
        if (!authManager || !authManager.supabase) return;

        const { data, error } = await authManager.supabase.rpc('get_active_user_count');

        if (error) {
            console.warn('Could not fetch online count:', error);
            return;
        }

        // Update UI
        if (onlineCount && data !== null) {
            // Ensure at least 1 user (me) is shown if logged in
            let count = data;
            if (authManager.isLoggedIn() && count < 1) count = 1;

            onlineCount.textContent = count.toLocaleString('de-DE');
            console.log('📊 Active users:', count);
        }
    } catch (err) {
        console.error('Error updating count:', err);
    }
}

// Animate Online Count (now actually polls DB)
function animateOnlineCount() {
    // Initial fetch
    setTimeout(updateOnlineCount, 1000);

    // Poll every 30 seconds
    setInterval(() => {
        updateOnlineCount();
    }, 30000);
}



// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (webrtcManager) {
        webrtcManager.disconnect();
    }
});

// Setup Swipe Gestures for Mobile
function setupSwipeGestures() {
    const videoStage = document.querySelector('.video-stage');

    if (videoStage) {
        new SwipeHandler(videoStage, {
            onSwipeLeft: () => {
                // Swipe LEFT = Next partner (inverted)
                if (isActive) {
                    console.log('👈 Swipe left detected - Next partner');

                    // Show swipe animation
                    showSwipeAnimation('left');

                    // Show notification
                    showNotification('Suche nächsten Partner... 👈');

                    // Skip to next partner
                    setTimeout(() => {
                        skipPartner();
                    }, 300);
                }
            },
            onSwipeRight: () => {
                // Swipe RIGHT = Stop (inverted)
                if (isActive) {
                    console.log('👉 Swipe right detected - Stop');

                    // Show swipe animation
                    showSwipeAnimation('right');

                    // Show pause screen
                    setTimeout(() => {
                        showPauseScreen();
                        stopChat();
                    }, 300);
                }
            }
        });

        console.log('✅ Swipe gestures enabled');
    }
}

// Show Swipe Animation
function showSwipeAnimation(direction) {
    const videoStage = document.querySelector('.video-stage');
    const overlay = document.createElement('div');
    overlay.className = `swipe-overlay swipe-${direction}`;

    if (direction === 'left') {
        // Left = Next (inverted)
        overlay.innerHTML = '<i class="fa-solid fa-arrow-left"></i><span>Nächster</span>';
    } else {
        // Right = Stop (inverted)
        overlay.innerHTML = '<i class="fa-solid fa-stop"></i><span>Stopp</span>';
    }

    videoStage.appendChild(overlay);

    // Trigger animation
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);

    // Remove after animation
    setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }, 500);
}

// Show Pause Screen
function showPauseScreen() {
    const videoStage = document.querySelector('.video-stage');

    // Create pause overlay
    const pauseOverlay = document.createElement('div');
    pauseOverlay.className = 'pause-screen';
    pauseOverlay.innerHTML = `
        <div class="pause-content">
            <i class="fa-solid fa-pause"></i>
            <h2>Chat pausiert</h2>
            <p>Wische nach links um fortzufahren</p>
        </div>
    `;

    videoStage.appendChild(pauseOverlay);

    // Fade in
    setTimeout(() => {
        pauseOverlay.classList.add('active');
    }, 10);

    // Setup resume gesture
    const resumeHandler = new SwipeHandler(pauseOverlay, {
        onSwipeLeft: () => {
            // Remove pause screen (swipe left to resume - inverted)
            pauseOverlay.classList.remove('active');
            setTimeout(() => {
                pauseOverlay.remove();

                // Show settings again before restart
                const settingsGroup = document.querySelector('.settings');
                if (settingsGroup) {
                    settingsGroup.classList.remove('hidden-during-chat');
                }

                // Restart chat
                startChat();
            }, 300);
        }
    });
}

// Helper to toggle report button
function toggleReportButton(show) {
    const btn = document.getElementById('btnReport');
    if (btn) {
        btn.style.display = show ? 'flex' : 'none';
    }
}
// Ban Check Helper (Safe Version)
async function performBanCheck() {
    console.log('🛡️ Checking ban status...');
    if (!userManagement || !authManager.currentUser) {
        console.log('ℹ️ No user/manager, skipping ban check');
        return false;
    }

    try {
        // Race condition: Timeout after 2 seconds
        const checkPromise = userManagement.checkUserStatus(authManager.currentUser.id);
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ allowed: true, timeout: true }), 2000));

        const status = await Promise.race([checkPromise, timeoutPromise]);

        if (status.timeout) {
            console.warn('⚠️ Ban check timed out - allowing access');
        }

        if (!status.allowed) {
            console.warn('User is banned:', status.reason);
            // Show ban message
            alert(`⛔️ DU BIST GESPERRT!\n\nGrund: ${status.reason}\n${status.hoursLeft ? 'Dauer: noch ' + status.hoursLeft + ' Stunden' : ''}`);

            // Ensure UI is reset
            if (isActive) stopChat();
            return true; // Is banned
        }
    } catch (e) {
        console.error('Error in ban check:', e);
    }

    return false; // Not banned
}

// Start Chat Function (Reverted to Stable Version)
async function startChat() {
    console.log('🎬 Starting chat...');

    // Check ban status first (with timeout protection)
    if (await performBanCheck()) return;

    // Request permissions first
    try {
        // 1. Get Local Stream via Manager
        const stream = await webrtcManager.startLocalStream();

        // 2. Show local video
        localVideo.srcObject = stream;
        localVideo.style.display = 'block';
        localOverlay.style.display = 'none';

        isActive = true;

        // Update UI
        stopButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
        nextButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });

        if (btnStart) {
            btnStart.style.display = 'none'; // Hide start button
        }

        // 3. Find Partner
        if (webrtcManager) {
            const userData = {
                isGuest: isGuest,
                country: selectedCountry,
                gender: selectedGender
            };
            // Start searching
            webrtcManager.findPartner(userData);
        }

        // Show Remote Loader (Waiting for partner)
        remoteLoader.style.display = 'flex';
        noPartner.style.display = 'none';

        // Remove idle class
        remoteLoader.classList.remove('idle');
        const searchText = document.querySelector('.search-text');
        if (searchText) searchText.textContent = 'NEUER PARTNER WIRD GESUCHT';

        showNotification('Kamera aktiviert. Suche Partner...');

        // Hide settings on mobile
        const settingsGroup = document.querySelector('.settings');
        if (settingsGroup) {
            settingsGroup.classList.add('hidden-during-chat');
        }

    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Fehler: Könnte nicht auf Kamera/Mikrofon zugreifen: ' + error.message);
        isActive = false;
    }
}
