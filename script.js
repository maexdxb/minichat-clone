// Siagechat - Main Application Script with WebRTC
// State management
let isActive = false;
let isGuest = false;
let webrtcManager = null;
let selectedCountry = 'DE';
let selectedGender = 'male';

// DOM Elements - will be initialized in DOMContentLoaded
let btnStop, btnNext, btnGuest;
let localVideo, remoteVideo, localOverlay, remoteLoader, noPartner;
let chatInput, chatMessages, btnSend;
let countryModal, genderModal, countryBtn, genderBtn, onlineCount;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM Content Loaded - Initializing...');

    // NOW select DOM elements
    btnStop = document.querySelector('.btn-stop');
    btnNext = document.querySelector('.btn-next');
    btnGuest = document.querySelector('.btn-guest');
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    localOverlay = document.querySelector('.local-overlay');
    remoteLoader = document.querySelector('.remote-loader');
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
    console.log('btnStop:', btnStop);
    console.log('btnNext:', btnNext);

    if (!localVideo || !remoteVideo || !localOverlay || !remoteLoader) {
        console.error('❌ Critical DOM elements missing!');
        console.error('Missing elements:', {
            localVideo: !localVideo,
            remoteVideo: !remoteVideo,
            localOverlay: !localOverlay,
            remoteLoader: !remoteLoader
        });
        alert('Fehler: Kritische Elemente fehlen. Bitte Seite neu laden.');
        return;
    }

    console.log('✅ All critical DOM elements found');
    // Initialize authentication
    await authManager.init();
    authManager.checkMockUser();

    // Initialize WebRTC Manager
    try {
        webrtcManager = new WebRTCManager(SIAGECHAT_CONFIG.signalingServer);
        await webrtcManager.init();
        console.log('✅ WebRTC Manager initialized');

        // Setup WebRTC callbacks
        setupWebRTCCallbacks();

    } catch (error) {
        console.error('❌ Failed to initialize WebRTC:', error);
        showNotification('⚠️ Verbindung zum Server fehlgeschlagen. Bitte später versuchen.');
    }

    setupEventListeners();
    setupSwipeGestures();
    animateOnlineCount();
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
        showNotification('Partner hat getrennt. Suche neuen Partner... 🔍');

        // Automatically find new partner after 1 second
        setTimeout(() => {
            if (isActive && webrtcManager) {
                const userData = {
                    isGuest: isGuest,
                    country: selectedCountry,
                    gender: selectedGender
                };
                console.log('🔄 Auto-searching for new partner after disconnect');
                webrtcManager.findPartner(userData);
            }
        }, 1000);
    };

    // Remote stream received
    webrtcManager.onRemoteStream = (stream) => {
        console.log('📹 Remote Stream empfangen');

        // Hide NO SIGNAL loader
        remoteLoader.style.display = 'none';

        // Show remote video
        remoteVideo.srcObject = stream;
        remoteVideo.style.display = 'block';
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
    btnStop.addEventListener('click', stopChat);
    btnNext.addEventListener('click', skipPartner);
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

// Start Chat
async function startChat() {
    console.log('🎬 Starting chat... isActive:', isActive, 'isGuest:', isGuest);

    if (isActive) {
        console.log('Already active, skipping');
        return;
    }

    // Check if logged in (either guest or Google)
    if (!isGuest && !authManager.currentUser) {
        showNotification('⚠️ Bitte melde dich an oder fahre als Gast fort!');
        console.log('Not logged in!');
        return;
    }

    console.log('✅ User logged in, starting camera...');

    try {
        // Start local video stream - THIS REQUESTS CAMERA PERMISSION
        console.log('Requesting camera access...');
        const stream = await webrtcManager.startLocalStream();
        console.log('✅ Got camera stream:', stream);

        if (!localVideo || !localOverlay) {
            throw new Error('Video elements not found');
        }

        localVideo.srcObject = stream;
        localVideo.style.display = 'block';
        localOverlay.style.display = 'none';

        // Hide settings on mobile during chat
        const settingsGroup = document.querySelector('.settings');
        if (settingsGroup && window.innerWidth <= 768) {
            settingsGroup.classList.add('hidden-during-chat');
        }

        isActive = true;
        btnStop.disabled = false;
        btnStop.style.opacity = '1';
        btnNext.disabled = false;
        btnNext.style.opacity = '1';

        // Find partner
        const userData = {
            isGuest: isGuest,
            country: selectedCountry,
            gender: selectedGender
        };

        console.log('🔍 Waiting for user to start search...');
        // webrtcManager.findPartner(userData); // Removed auto-search

        // Update UI
        const searchText = document.querySelector('.search-text');
        if (searchText) searchText.textContent = 'Klicke "Weiter" zum Starten';

        const spinner = document.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';

        showNotification('Kamera aktiv! Klicke "Weiter" zum Starten.');

    } catch (error) {
        console.error('❌ Error starting chat:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);

        // More specific error messages
        if (error.name === 'NotAllowedError') {
            alert('Kamerazugriff wurde verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.');
        } else if (error.name === 'NotFoundError') {
            alert('Keine Kamera gefunden. Bitte stelle sicher, dass eine Kamera angeschlossen ist.');
        } else if (error.name === 'NotReadableError') {
            alert('Kamera wird bereits von einer anderen Anwendung verwendet.');
        } else {
            alert('Fehler beim Zugriff auf die Kamera: ' + error.message);
        }

        isActive = false;
    }
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

    // Show settings again on mobile
    const settingsGroup = document.querySelector('.settings');
    if (settingsGroup) {
        settingsGroup.classList.remove('hidden-during-chat');
    }

    isActive = false;

    showNotification('Chat beendet. Klicke Weiter zum Neustart.');
    console.log('✅ Chat stopped - camera released');
}

// Skip to next partner
function skipPartner() {
    if (!isActive) {
        // Start chat if not active
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

// Animate Online Count (fallback if WebRTC not connected)
function animateOnlineCount() {
    // Only animate if not receiving real updates
    setInterval(() => {
        if (!webrtcManager || !webrtcManager.socket || !webrtcManager.socket.connected) {
            const currentCount = parseInt(onlineCount.textContent.replace(/\./g, ''));
            const change = Math.floor(Math.random() * 20) - 10;
            const newCount = Math.max(100000, currentCount + change);
            onlineCount.textContent = newCount.toLocaleString('de-DE');
        }
    }, 5000);
}

// Initial button states
btnStop.disabled = true;
btnStop.style.opacity = '0.5';
btnNext.disabled = true;
btnNext.style.opacity = '0.5';

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
