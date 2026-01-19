// Siagechat Configuration
const SIAGECHAT_CONFIG = {
    // Signaling Server URL
    // Points to Render.com deployment
    signalingServer: 'https://minichat-clone.onrender.com',

    // Supabase Configuration (Optional - for Google Login)
    supabase: {
        url: 'https://jpvvlmqcqxmreffjhfvm.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwdnZsbXFjcXhtcmVmZmpoZnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0OTQ0MjMsImV4cCI6MjA1MzA3MDQyM30.xPJxedu'
    },

    // Feature flags
    features: {
        guestMode: false,  // Disabled - Google Login required!
        googleLogin: true  // Enable Google OAuth login
    }
};

// Backward compatibility
const SUPABASE_CONFIG = SIAGECHAT_CONFIG.supabase;
