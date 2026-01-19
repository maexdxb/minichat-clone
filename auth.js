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
            console.log('🔐 Initializing AuthManager...');

            // Check config integrity
            if (typeof SUPABASE_CONFIG === 'undefined' || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
                console.error('❌ Supabase config missing in config.js');
                alert('Konfigurationsfehler: Supabase URL/Key fehlt in config.js');
                return;
            }

            if (SUPABASE_CONFIG.anonKey.startsWith('sb_publishable')) {
                console.warn('⚠️ Warning: The provided Anon Key looks like a Publishable Key, not a JWT. This might fail.');
            }

            // Check if global supabase object exists (from CDN)
            if (typeof supabase === 'undefined') {
                console.error('❌ Supabase SDK not loaded. Check script tags.');
                alert('Systemfehler: Supabase SDK konnte nicht geladen werden.');
                return;
            }

            // Initialize
            const { createClient } = supabase;
            this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

            // Check session
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) {
                console.error('⚠️ Error checking session:', error);
                // Don't fail hard on session check, maybe just network
            }

            if (session) {
                console.log('✅ User already logged in:', session.user.email);
                this.currentUser = session.user;
                this.updateUIForLoggedInUser();
                this.startHeartbeat();
            } else {
                console.log('ℹ️ No active session.');
            }

            // Listen for auth changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('🔄 Auth state changed:', event);

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

        } catch (error) {
            console.error('❌ Critical Auth Error:', error);
            alert('Authentifizierungs-Fehler: ' + error.message);
        }
    }

    // Sign in with Google
    async signInWithGoogle() {
        console.log('👉 signInWithGoogle called');

        if (!this.supabase) {
            alert('Fehler: Verbindung zur Datenbank nicht hergestellt. Bitte Seite neu laden.');
            return;
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });

            if (error) throw error;
            console.log('🚀 Redirecting to Google Login...', data);

        } catch (error) {
            console.error('❌ Google Sign-In Error:', error);
            alert('Google Login fehlgeschlagen: ' + error.message);
        }
    }

    // Sign out
    async signOut() {
        if (!this.supabase) return;

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            console.log('👋 Signed out successfully');
            // UI update handled by onAuthStateChange
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Abmelden fehlgeschlagen.');
        }
    }

    // Check if user is logged in
    isLoggedIn() {
        return !!this.currentUser;
    }

    // UI Updates
    updateUIForLoggedInUser() {
        const btnLogin = document.getElementById('btnLogin');
        const btnLogout = document.getElementById('btnLogout');
        const userMenu = document.getElementById('userMenu');
        const userAvatar = document.getElementById('userAvatar');

        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'flex'; // Show logout icon

        if (userMenu && this.currentUser) {
            userMenu.style.display = 'flex';
            if (userAvatar) {
                userAvatar.src = this.currentUser.user_metadata.avatar_url || 'https://www.gravatar.com/avatar/?d=mp';
            }
        }
    }

    updateUIForLoggedOutUser() {
        const btnLogin = document.getElementById('btnLogin');
        const btnLogout = document.getElementById('btnLogout');
        const userMenu = document.getElementById('userMenu');

        if (btnLogin) btnLogin.style.display = 'flex';
        if (btnLogout) btnLogout.style.display = 'none';
        if (userMenu) userMenu.style.display = 'none';
    }

    // Heartbeat to keep presence alive (if needed for online count)
    startHeartbeat() {
        // Optional: Update 'last_seen' in DB
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

        this.heartbeatInterval = setInterval(async () => {
            if (!this.currentUser) return;
            // Implementation depends on DB structure (e.g. updating a 'users' table)
        }, 60000);
    }
}

// Initialize and export
const authManager = new AuthManager();
window.authManager = authManager;

// Init when DOM is ready (or immediately if deferred)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => authManager.init());
} else {
    authManager.init();
}
