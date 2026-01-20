// Authentication Module with Supabase
class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.initialized = false;
        this.isInitializing = false; // Lock
        this.heartbeatInterval = null;
    }

    // Initialize Supabase client
    async init() {
        if (this.initialized || this.isInitializing) return;
        this.isInitializing = true;
        try {
            console.log('🔐 Initializing AuthManager...');

            if (typeof SUPABASE_CONFIG === 'undefined' || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
                console.error('❌ Supabase config missing');
                return;
            }

            if (typeof supabase === 'undefined') {
                console.error('❌ Supabase SDK not loaded');
                return;
            }

            const { createClient } = supabase;
            this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (session) {
                console.log('✅ User logged in:', session.user.email);
                this.currentUser = session.user;
                this.updateUIForLoggedInUser();
                this.startHeartbeat();
            } else {
                console.log('ℹ️ No active session');
            }

            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('🔄 Auth state:', event);

                if (session) {
                    this.currentUser = session.user;
                    this.updateUIForLoggedInUser();
                    this.startHeartbeat();
                } else {
                    this.currentUser = null;
                    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
                    this.updateUIForLoggedOutUser();
                }
            });

            // Initialize UserManagement for ban checks
            if (typeof UserManagement !== 'undefined') {
                window.userManagement = new UserManagement(this.supabase);
                console.log('✅ UserManagement initialized');
            }

            this.initialized = true;

        } catch (error) {
            console.error('❌ Auth Init Error:', error);
            alert('Authentifizierungs-Fehler: ' + error.message);
        }
    }

    // Sign in with Google
    async signInWithGoogle() {
        if (!this.supabase) {
            alert('Fehler: Datenbank nicht verbunden.');
            return;
        }

        try {
            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: { access_type: 'offline', prompt: 'consent' }
                }
            });

            if (error) throw error;

        } catch (error) {
            console.error('❌ Login Error:', error);
            alert('Google Login fehlgeschlagen: ' + error.message);
        }
    }

    // Sign out
    async signOut() {
        if (!this.supabase) return;
        try {
            await this.supabase.auth.signOut();
            if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    isLoggedIn() { return !!this.currentUser; }

    updateUIForLoggedInUser() {
        const btnLogin = document.getElementById('btnLogin');
        // btnLogout removed, checking userMenu instead
        const userMenu = document.getElementById('userMenu');
        const userAvatar = document.getElementById('userAvatar');

        if (btnLogin) btnLogin.style.display = 'none';

        if (userMenu && this.currentUser) {
            userMenu.style.display = 'flex'; // This now shows Avatar + Burger
            if (userAvatar) {
                userAvatar.src = this.currentUser.user_metadata.avatar_url || 'https://www.gravatar.com/avatar/?d=mp';
            }
        }
    }

    updateUIForLoggedOutUser() {
        const btnLogin = document.getElementById('btnLogin');
        const userMenu = document.getElementById('userMenu');
        const settingsMenu = document.getElementById('settingsDropdown');

        if (btnLogin) btnLogin.style.display = 'flex';
        // Hide entire user menu group (Avatar + Burger)
        if (userMenu) userMenu.style.display = 'none';
        if (settingsMenu) settingsMenu.style.display = 'none';
    }

    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

        // Immediate update on login
        this.updateLastSeen();

        // Every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.updateLastSeen();
        }, 30000);
    }

    async updateLastSeen() {
        if (!this.currentUser) return;

        try {
            await this.supabase
                .from('user_management')
                .upsert({
                    user_id: this.currentUser.id,
                    email: this.currentUser.email,
                    display_name: this.currentUser.user_metadata.full_name || this.currentUser.email.split('@')[0],
                    last_seen: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id', ignoreDuplicates: false });
        } catch (error) {
            console.error('Failed to update last seen:', error);
        }
    }
}

const authManager = new AuthManager();
window.authManager = authManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => authManager.init());
} else {
    authManager.init();
}
