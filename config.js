// Siagechat Configuration
const SIAGECHAT_CONFIG = {
    // Signaling Server URL
    // Points to Render.com deployment
    signalingServer: 'https://minichat-clone.onrender.com',

    // Supabase Configuration (Optional - for Google Login)
    supabase: {
        url: 'https://jpuyhmdqumxdfpfhtvim.supabase.co',
        anonKey: 'sb_publishable_pmUooMDz9MY54pEbTSBtvg_-a2J2wdu'
    },

    // Feature flags
    features: {
        guestMode: false,  // Disabled - Google Login required!
        googleLogin: true  // Enable Google OAuth login
    }
};

// Backward compatibility
const SUPABASE_CONFIG = SIAGECHAT_CONFIG.supabase;
