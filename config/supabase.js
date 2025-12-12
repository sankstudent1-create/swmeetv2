// Supabase Configuration
const SUPABASE_URL = 'https://yaspakwgnfcsqfhitnxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhc3Bha3dnbmZjc3FmaGl0bnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzcxNDAsImV4cCI6MjA4MTExMzE0MH0.I_4BM5diYLO1cTkZuHR9nb10-s6SvsrSrSnitBvMgiY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth Helper Functions
const AuthService = {
    // Get current user
    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.error('Error getting user:', error);
            return null;
        }
        return user;
    },

    // Get session
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return null;
        }
        return session;
    },

    // Sign up with email
    async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });
        return { data, error };
    },

    // Sign in with email
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    // Sign in with OAuth (Google, Facebook, GitHub)
    async signInWithOAuth(provider) {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });
        return { data, error };
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    // Update user metadata (full name, avatar, etc.)
    async updateUserMetadata(metadata) {
        const { data, error } = await supabase.auth.updateUser({
            data: metadata
        });
        return { data, error };
    },

    // Listen to auth state changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};

// Database Helper Functions
const DatabaseService = {
    // Create user profile
    async createUserProfile(userId, email, fullName, avatarUrl = null) {
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    id: userId,
                    email: email,
                    full_name: fullName,
                    avatar_url: avatarUrl,
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        return { data, error };
    },

    // Get user profile
    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },

    // Update user profile
    async updateUserProfile(userId, updates) {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select();
        return { data, error };
    },

    // Update user settings JSON
    async updateUserSettings(userId, settings) {
        const { data, error } = await supabase
            .from('users')
            .update({
                settings,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select();
        return { data, error };
    },

    // Create meeting
    async createMeeting(hostId, meetingData) {
        const meetingId = generateMeetingId();
        const { data, error } = await supabase
            .from('meetings')
            .insert([
                {
                    id: meetingId,
                    host_id: hostId,
                    title: meetingData.title,
                    description: meetingData.description,
                    scheduled_time: meetingData.scheduledTime,
                    duration: meetingData.duration || 60,
                    password: meetingData.password || null,
                    waiting_room_enabled: meetingData.waitingRoomEnabled || false,
                    recording_enabled: meetingData.recordingEnabled || false,
                    max_participants: meetingData.maxParticipants || 100,
                    status: 'scheduled',
                    settings: meetingData.settings || {},
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        return { data, error };
    },

    // Get meeting by ID
    async getMeeting(meetingId) {
        const { data, error } = await supabase
            .from('meetings')
            .select(`
                *,
                host:users!meetings_host_id_fkey(id, full_name, email, avatar_url)
            `)
            .eq('id', meetingId)
            .single();
        return { data, error };
    },

    // Get user's meetings
    async getUserMeetings(userId) {
        const { data, error } = await supabase
            .from('meetings')
            .select('*')
            .eq('host_id', userId)
            .order('created_at', { ascending: false });
        return { data, error };
    },

    // Update meeting status
    async updateMeetingStatus(meetingId, status) {
        const { data, error } = await supabase
            .from('meetings')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', meetingId)
            .select();
        return { data, error };
    },

    // Add participant to meeting
    async addParticipant(meetingId, userId, role = 'participant') {
        const { data, error } = await supabase
            .from('participants')
            .insert([
                {
                    meeting_id: meetingId,
                    user_id: userId,
                    role: role,
                    status: 'waiting',
                    joined_at: new Date().toISOString()
                }
            ])
            .select();
        return { data, error };
    },

    // Get meeting participants
    async getMeetingParticipants(meetingId) {
        const { data, error } = await supabase
            .from('participants')
            .select(`
                *,
                user:users(id, full_name, email, avatar_url)
            `)
            .eq('meeting_id', meetingId);
        return { data, error };
    },

    // Update participant status
    async updateParticipantStatus(participantId, status) {
        const { data, error } = await supabase
            .from('participants')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', participantId)
            .select();
        return { data, error };
    },

    // Save meeting settings
    async saveMeetingSettings(meetingId, settings) {
        const { data, error } = await supabase
            .from('meetings')
            .update({ settings, updated_at: new Date().toISOString() })
            .eq('id', meetingId)
            .select();
        return { data, error };
    },

    // Subscribe to meeting changes
    subscribeMeetingChanges(meetingId, callback) {
        return supabase
            .channel(`meeting:${meetingId}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'meetings', filter: `id=eq.${meetingId}` },
                callback
            )
            .subscribe();
    },

    // Subscribe to participant changes
    subscribeParticipantChanges(meetingId, callback) {
        return supabase
            .channel(`participants:${meetingId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'participants', filter: `meeting_id=eq.${meetingId}` },
                callback
            )
            .subscribe();
    }
};

// Utility Functions
function generateMeetingId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Export services
window.AuthService = AuthService;
window.DatabaseService = DatabaseService;
window.supabaseClient = supabase;
