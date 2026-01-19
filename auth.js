// Authentication Module with Supabase
class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.initialized = false;
    }

    // Initialize Supabase client
    async init() {
        try {
            // Check if config is set
            if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
                console.warn('⚠️ Supabase not configured. Please update config.js with your credentials.');
                this.useMockAuth();
                return;
            }

            // Initialize Supabase client
            const { createClient } = supabase;
            this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();

            if (session) {
                this.currentUser = session.user;
                this.updateUIForLoggedInUser();
                this.startHeartbeat();
            }

            // Listen for auth state changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event);

                if (session) {
                    this.currentUser = session.user;
                    this.updateUIForLoggedInUser();
                    this.startHeartbeat();
                } else {
                    this.currentUser = null;
                    this.updateUIForLoggedOutUser();
                }
            });

            this.initialized = true;
            console.log('✅ Supabase initialized successfully');

        } catch (error) {
            console.error('❌ Error initializing Supabase:', error);
            this.useMockAuth();
        }
    }

    // Mock authentication for demo purposes
    useMockAuth() {
        console.log('🎭 Using mock authentication (Supabase not configured)');
        this.initialized = true;
    }

    // Sign in with Google
    async signInWithGoogle() {
        try {
            if (!this.supabase) {
                // Mock login for demo
                this.mockLogin();
                return;
            }

            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });

            if (error) throw error;

            console.log('✅ Google sign-in initiated');

        } catch (error) {
            console.error('❌ Error signing in with Google:', error);
            alert('Fehler beim Anmelden mit Google: ' + error.message);
        }
    }

    // Mock login for demo
    mockLogin() {
        const mockUser = {
            id: 'mock-user-' + Date.now(),
            email: 'demo@example.com',
            user_metadata: {
                full_name: 'Demo User',
                avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo'
            }
        };

        this.currentUser = mockUser;
        this.updateUIForLoggedInUser();

        // Store in localStorage for persistence
        localStorage.setItem('mockUser', JSON.stringify(mockUser));

        alert('✅ Demo-Login erfolgreich!\n\nHinweis: Dies ist ein Mock-Login. Konfiguriere Supabase in config.js für echte Google-Authentifizierung.');
    }

    // Sign out
    async signOut() {
        try {
            if (this.supabase) {
                const { error } = await this.supabase.auth.signOut();
                if (error) throw error;
            } else {
                // Mock logout
                localStorage.removeItem('mockUser');
            }

            this.currentUser = null;
            this.updateUIForLoggedOutUser();

            console.log('✅ Signed out successfully');

        } catch (error) {
            console.error('❌ Error signing out:', error);
            alert('Fehler beim Abmelden: ' + error.message);
        }
    }

    // Update UI for logged in user
    updateUIForLoggedInUser() {
        const btnLogin = document.querySelector('.btn-login');
        const headerRight = document.querySelector('.header-right');

        if (!btnLogin || !headerRight) return;

        // Get user info
        const userName = this.currentUser.user_metadata?.full_name ||
            this.currentUser.email?.split('@')[0] ||
            'User';
        const avatarUrl = this.currentUser.user_metadata?.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.currentUser.id}`;

        // Preserve online counter
        const onlineCounter = headerRight.querySelector('.online-counter');

        // Replace login button with user menu
        headerRight.innerHTML = `
            <div class="user-menu">
                <img src="${avatarUrl}" alt="${userName}" class="user-avatar">
                <span class="user-name">${userName}</span>
                <button class="btn-logout" title="Abmelden">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;

        // Re-add online counter
        if (onlineCounter) {
            headerRight.insertBefore(onlineCounter, headerRight.firstChild);
        }

        // Add logout event listener
        const btnLogout = document.querySelector('.btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => this.signOut());
        }

        // Show notification
        showNotification(`Willkommen zurück, ${userName}! 👋`);

        // Auto-start removed as per user request
        // if (typeof startChat === 'function') {
        //     console.log('🚀 Auto-starting chat for logged-in user...');
        //     setTimeout(() => startChat(), 500);
        // }
    }

    // Update UI for logged out user
    updateUIForLoggedOutUser() {
        const headerRight = document.querySelector('.header-right');

        if (!headerRight) return;

        // Preserve online counter
        const onlineCounter = headerRight.querySelector('.online-counter');

        headerRight.innerHTML = `
            <button class="btn-login"><i class="fa-solid fa-user"></i> Mit Google anmelden</button>
        `;

        // Re-add online counter
        if (onlineCounter) {
            headerRight.insertBefore(onlineCounter, headerRight.firstChild);
        }

        // Re-attach event listeners

        const btnLogin = document.querySelector('.btn-login');
        if (btnLogin) {
            btnLogin.addEventListener('click', () => this.signInWithGoogle());
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Check for mock user on page load
    checkMockUser() {
        const mockUser = localStorage.getItem('mockUser');
        if (mockUser && !this.currentUser) {
            this.currentUser = JSON.parse(mockUser);
            this.updateUIForLoggedInUser();
        }
    }

    // Sync user to database for admin panel
    async syncUserToDB(user) {
        if (!user || !this.supabase) return;

        try {
            const updates = {
                user_id: user.id,
                email: user.email,
                display_name: user.user_metadata?.full_name || user.email,
                last_seen: new Date().toISOString(), // Update last seen
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('user_management')
                .upsert(updates, { onConflict: 'user_id' });

            if (error) {
                console.error('❌ Sync to DB failed:', error.message);
                if (error.code === '42501' || error.message.includes('row-level security')) {
                    console.warn('⚠️ RLS Policy Error: Please run FIX-DB.md');
                }
            } else {
                console.log('✅ User synced to DB (Heartbeat)');
            }
        } catch (err) {
            console.error('Sync error:', err);
        }
    }

    // Start heartbeat to update online status
    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

        // Initial sync
        if (this.currentUser) this.syncUserToDB(this.currentUser);

        // Sync every 60 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.currentUser) {
                this.syncUserToDB(this.currentUser);
            }
        }, 60000);
    }
}

// Create global auth manager instance
const authManager = new AuthManager();
