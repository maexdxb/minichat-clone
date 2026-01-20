// User Management Module
class UserManagement {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Check if user is banned
    async checkUserStatus(userId) {
        try {
            // Disable cache to ensure fresh status
            const { data, error } = await this.supabase
                .from('user_management')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('⚠️ checkUserStatus DB Error:', error);
                // If it's just "row not found", user is new/clean -> Allow
                if (error.code === 'PGRST116') return { allowed: true };
                // Other errors -> Allow (fail-safe) but log loudly
                return { allowed: true };
            }

            console.log('🛡️ User Status Check:', data ? data.status : 'No Data');

            if (!data) {
                return { allowed: true };
            }

            // Check if permanently banned
            if (data.status === 'perm_banned') {
                return {
                    allowed: false,
                    reason: data.ban_reason || 'Dein Account wurde permanent gesperrt.',
                    type: 'permanent',
                    evidence: data.ban_evidence
                };
            }

            // Check if temporarily banned
            if (data.status === 'temp_banned') {
                const banUntil = new Date(data.ban_until);
                const now = new Date();

                if (now < banUntil) {
                    const hoursLeft = Math.ceil((banUntil - now) / (1000 * 60 * 60));
                    return {
                        allowed: false,
                        reason: data.ban_reason || 'Dein Account wurde temporär gesperrt.',
                        type: 'temporary',
                        until: banUntil,
                        hoursLeft: hoursLeft,
                        evidence: data.ban_evidence // Send evidence to client
                    };
                } else {
                    // Ban expired, unban user
                    await this.unbanUser(userId);
                    return { allowed: true };
                }
            }

            return { allowed: true };

        } catch (error) {
            console.error('Error in checkUserStatus:', error);
            return { allowed: true }; // Fail-safe
        }
    }

    // Helper to get email for ban
    async _getEmailForBan(userId) {
        const { data } = await this.supabase
            .from('user_management')
            .select('email')
            .eq('user_id', userId)
            .single();
        return data?.email || `banned_${userId}@unknown.com`;
    }

    // Ban user temporarily
    async banUserTemporary(userId, hours, reason, adminId, evidence = null) {
        const email = await this._getEmailForBan(userId);
        const banUntil = new Date();
        banUntil.setHours(banUntil.getHours() + hours);

        const { error } = await this.supabase
            .from('user_management')
            .upsert({
                user_id: userId,
                email: email, // Required constraint
                status: 'temp_banned',
                ban_reason: reason,
                ban_until: banUntil.toISOString(),
                ban_evidence: evidence,
                banned_at: new Date().toISOString(),
                banned_by: adminId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('Error banning user:', error);
            return { success: false, error };
        }

        return { success: true };
    }

    // Ban user permanently
    async banUserPermanent(userId, reason, adminId, evidence = null) {
        const email = await this._getEmailForBan(userId);
        const { error } = await this.supabase
            .from('user_management')
            .upsert({
                user_id: userId,
                email: email, // Required constraint
                status: 'perm_banned',
                ban_reason: reason,
                ban_until: null,
                ban_evidence: evidence,
                banned_at: new Date().toISOString(),
                banned_by: adminId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('Error banning user:', error);
            return { success: false, error };
        }

        return { success: true };
    }

    // Unban user
    async unbanUser(userId) {
        const { error } = await this.supabase
            .from('user_management')
            .update({
                status: 'active',
                ban_reason: null,
                ban_until: null,
                ban_evidence: null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) {
            console.error('Error unbanning user:', error);
            return { success: false, error };
        }

        return { success: true };
    }

    // Check if user is admin
    async isAdmin(userId) {
        const { data, error } = await this.supabase
            .from('admins')
            .select('*')
            .eq('user_id', userId)
            .single();

        return !error && data !== null;
    }

    // Get all users (admin only)
    async getAllUsers() {
        const { data, error } = await this.supabase
            .from('user_management')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error getting users:', error);
            return [];
        }

        return data;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManagement;
}
