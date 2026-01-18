// Siagechat Configuration
const SIAGECHAT_CONFIG = {
    // Signaling Server URL
    // Same as frontend URL since server serves both
    signalingServer: window.location.origin,

    // Supabase Configuration (Optional - for Google Login)
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },

    // Feature flags
    features: {
        guestMode: true,  // Allow users to chat without login
        googleLogin: true  // Enable Google OAuth login
    }
};

// Backward compatibility
const SUPABASE_CONFIG = SIAGECHAT_CONFIG.supabase;
