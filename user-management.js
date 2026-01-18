// User Management Module
class UserManagement {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Check if user is banned
    async checkUserStatus(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_management')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Error checking user status:', error);
                return { allowed: true }; // Allow if error (fail-safe)
            }

            if (!data) {
                return { allowed: true }; // User not in DB yet
            }

            // Check if permanently banned
            if (data.status === 'perm_banned') {
                return {
                    allowed: false,
                    reason: data.ban_reason || 'Dein Account wurde permanent gesperrt.',
                    type: 'permanent'
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
                        hoursLeft: hoursLeft
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

    // Ban user temporarily
    async banUserTemporary(userId, hours, reason, adminId) {
        const banUntil = new Date();
        banUntil.setHours(banUntil.getHours() + hours);

        const { error } = await this.supabase
            .from('user_management')
            .update({
                status: 'temp_banned',
                ban_reason: reason,
                ban_until: banUntil.toISOString(),
                banned_at: new Date().toISOString(),
                banned_by: adminId,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) {
            console.error('Error banning user:', error);
            return { success: false, error };
        }

        return { success: true };
    }

    // Ban user permanently
    async banUserPermanent(userId, reason, adminId) {
        const { error } = await this.supabase
            .from('user_management')
            .update({
                status: 'perm_banned',
                ban_reason: reason,
                ban_until: null,
                banned_at: new Date().toISOString(),
                banned_by: adminId,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

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
