// Main App JavaScript for Index Page

// Global State
let currentUser = null;
let userMeetings = [];

// DOM Elements
const logoLoader = document.getElementById('logoLoader');
const guestView = document.getElementById('guestView');
const userDashboard = document.getElementById('userDashboard');
const navGuest = document.getElementById('nav-guest');
const navUser = document.getElementById('nav-user');
const navbarToggle = document.getElementById('navbarToggle');
const navbarNav = document.getElementById('navbarNav');
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');
const signOutBtn = document.getElementById('signOutBtn');
const createMeetingBtn = document.getElementById('createMeetingBtn');
const createMeetingModal = document.getElementById('createMeetingModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const createMeetingForm = document.getElementById('createMeetingForm');
const meetingTabs = document.querySelectorAll('.meeting-tab');
const profileForm = document.getElementById('profileForm');
const resetProfileBtn = document.getElementById('resetProfileBtn');
const profileNameInput = document.getElementById('profileName');
const profileEmailInput = document.getElementById('profileEmail');
const avatarUrlInput = document.getElementById('avatarUrl');
const profileTimezoneSelect = document.getElementById('profileTimezone');
const profileBioInput = document.getElementById('profileBio');
const settingsForm = document.getElementById('settingsForm');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const settingThemeToggle = document.getElementById('settingTheme');
const settingNotificationsToggle = document.getElementById('settingNotifications');
const settingWaitingRoomToggle = document.getElementById('settingWaitingRoom');
const settingRecordingToggle = document.getElementById('settingRecording');
const navLogoutBtn = document.getElementById('navLogoutBtn');

// Initialize App
async function initializeApp() {
    showLoader();
    
    try {
        // Check authentication status
        const user = await AuthService.getCurrentUser();
        
        if (user) {
            currentUser = user;
            await loadUserDashboard();
        } else {
            showGuestView();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showGuestView();
    } finally {
        hideLoader();
    }
}

// Show Guest View
function showGuestView() {
    guestView.style.display = 'block';
    userDashboard.style.display = 'none';
    navGuest.style.display = 'flex';
    navUser.style.display = 'none';
    closeMobileNav();
    document.body.classList.remove('dashboard-dark');
}

// Load User Dashboard
async function loadUserDashboard() {
    guestView.style.display = 'none';
    userDashboard.style.display = 'block';
    navGuest.style.display = 'none';
    navUser.style.display = 'flex';
    
    // Set user info
    const userName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    document.getElementById('userName').textContent = userName;
    document.getElementById('dashboardUserName').textContent = userName;
    
    // Set user avatar
    const userAvatar = document.getElementById('userAvatar');
    if (currentUser.user_metadata?.avatar_url) {
        userAvatar.src = currentUser.user_metadata.avatar_url;
        userAvatar.alt = userName;
    } else {
        // Generate initials avatar
        const initials = userName.charAt(0).toUpperCase();
        userAvatar.style.display = 'flex';
        userAvatar.style.justifyContent = 'center';
        userAvatar.style.color = 'white';
        userAvatar.style.fontWeight = '700';
        userAvatar.textContent = initials;
    }

    await loadProfileAndSettings();
    initializeDashboardInteractivity();

    // Load user meetings
    await loadUserMeetings();
}

async function loadUserMeetings() {
    try {
        const { data, error } = await DatabaseService.getUserMeetings(currentUser.id);
        
        if (error) throw error;
        
        userMeetings = data || [];
        renderMeetings();
    } catch (error) {
        console.error('Error loading meetings:', error);
        showNotification('Failed to load meetings', 'error');
    }
}

// ==================== PROFILE & SETTINGS ====================

const TIMEZONE_OPTIONS = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-08:00)' },
    { value: 'America/Denver', label: 'Mountain Time (UTC-07:00)' },
    { value: 'America/Chicago', label: 'Central Time (UTC-06:00)' },
    { value: 'America/New_York', label: 'Eastern Time (UTC-05:00)' },
    { value: 'Europe/London', label: 'London (UTC+00:00)' },
    { value: 'Europe/Berlin', label: 'Central Europe (UTC+01:00)' },
    { value: 'Asia/Kolkata', label: 'India (UTC+05:30)' },
    { value: 'Asia/Singapore', label: 'Singapore (UTC+08:00)' },
    { value: 'Australia/Sydney', label: 'Sydney (UTC+10:00)' }
];

const DEFAULT_SETTINGS = {
    theme: false,
    notifications: true,
    waitingRoom: true,
    recording: false
};

let currentProfileData = null;
let currentSettings = { ...DEFAULT_SETTINGS };
let dashboardInteractivityInitialized = false;

function populateTimezoneOptions(selectedValue = 'UTC') {
    if (!profileTimezoneSelect) return;
    profileTimezoneSelect.innerHTML = '';
    TIMEZONE_OPTIONS.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        if (option.value === selectedValue) {
            opt.selected = true;
        }
        profileTimezoneSelect.appendChild(opt);
    });
}

function getStoredSettings() {
    try {
        const stored = localStorage.getItem('swtmeet_settings');
        if (!stored) return null;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (error) {
        console.warn('Failed to parse stored settings', error);
        return null;
    }
}

function storeSettings(settings) {
    try {
        localStorage.setItem('swtmeet_settings', JSON.stringify(settings));
    } catch (error) {
        console.warn('Failed to persist settings locally', error);
    }
}

function applyTheme(isDarkMode) {
    document.body.classList.toggle('dashboard-dark', Boolean(isDarkMode));
}

function applySettingsToForm(settings) {
    if (!settingsForm) return;
    settingThemeToggle.checked = !!settings.theme;
    settingNotificationsToggle.checked = !!settings.notifications;
    settingWaitingRoomToggle.checked = !!settings.waitingRoom;
    settingRecordingToggle.checked = !!settings.recording;
    applyTheme(settings.theme);
}

async function loadProfileAndSettings() {
    if (!currentUser) return;

    let profileRecord = null;

    try {
        const { data, error } = await DatabaseService.getUserProfile(currentUser.id);

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        profileRecord = data || null;

        if (!profileRecord) {
            const fallbackName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
            const { data: createdProfile, error: createError } = await DatabaseService.createUserProfile(
                currentUser.id,
                currentUser.email,
                fallbackName,
                currentUser.user_metadata?.avatar_url || null
            );

            if (createError) {
                console.error('Error creating profile record:', createError);
            }

            profileRecord = createdProfile?.[0] || null;
        }
    } catch (error) {
        console.error('Failed to load profile data:', error);
        showNotification('Unable to load full profile. Using defaults.', 'error');
        profileRecord = null;
    }

    currentProfileData = profileRecord;
    populateProfileForm();

    const settingsFromProfile = currentProfileData?.settings && typeof currentProfileData.settings === 'object'
        ? currentProfileData.settings
        : null;

    const mergedSettings = settingsFromProfile || getStoredSettings() || DEFAULT_SETTINGS;
    currentSettings = { ...DEFAULT_SETTINGS, ...mergedSettings };
    applySettingsToForm(currentSettings);
    storeSettings(currentSettings);
}

function populateProfileForm() {
    if (!profileForm || !currentUser) return;

    const fullName = currentProfileData?.full_name || currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    const email = currentUser.email;
    const avatar = currentProfileData?.avatar_url || currentUser.user_metadata?.avatar_url || '';
    const timezone = currentProfileData?.timezone || currentUser.user_metadata?.timezone || 'UTC';
    const bio = currentProfileData?.bio || currentUser.user_metadata?.bio || '';

    profileNameInput.value = fullName;
    profileEmailInput.value = email;
    avatarUrlInput.value = avatar;
    profileBioInput.value = bio;
    populateTimezoneOptions(timezone);
}

function initializeDashboardInteractivity() {
    if (dashboardInteractivityInitialized) return;

    document.querySelectorAll('.toggle-section').forEach(button => {
        const section = button.closest('.dashboard-section');
        if (!section) return;
        const targetSelector = button.getAttribute('data-target');
        const target = targetSelector ? document.querySelector(targetSelector) : null;

        if (section.classList.contains('open') && target) {
            target.style.maxHeight = `${target.scrollHeight}px`;
        }

        button.addEventListener('click', () => {
            const willOpen = !section.classList.contains('open');
            section.classList.toggle('open', willOpen);
            button.setAttribute('aria-expanded', String(willOpen));
            if (target) {
                target.style.maxHeight = willOpen ? `${target.scrollHeight}px` : '0px';
            }
        });
    });

    profileForm?.addEventListener('submit', handleProfileSubmit);
    resetProfileBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        populateProfileForm();
        showNotification('Profile reverted to saved values', 'info');
    });

    settingsForm?.addEventListener('submit', handleSettingsSubmit);
    resetSettingsBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        currentSettings = { ...DEFAULT_SETTINGS };
        applySettingsToForm(currentSettings);
        storeSettings(currentSettings);
        showNotification('Settings restored to defaults', 'info');
    });

    settingThemeToggle?.addEventListener('change', () => {
        applyTheme(settingThemeToggle.checked);
    });

    dashboardInteractivityInitialized = true;
}

async function handleProfileSubmit(event) {
    event.preventDefault();
    if (!currentUser) return;

    const fullName = profileNameInput.value.trim();
    const avatarUrl = avatarUrlInput.value.trim() || null;
    const timezone = profileTimezoneSelect.value;
    const bio = profileBioInput.value.trim();

    if (!fullName) {
        showNotification('Name is required', 'error');
        return;
    }

    showLoader();

    try {
        const metadataPayload = {
            full_name: fullName,
            avatar_url: avatarUrl,
            timezone,
            bio
        };

        const profilePayload = {
            full_name: fullName,
            avatar_url: avatarUrl,
            timezone,
            bio,
            updated_at: new Date().toISOString()
        };

        const [metadataResult, profileResult] = await Promise.all([
            AuthService.updateUserMetadata(metadataPayload),
            DatabaseService.updateUserProfile(currentUser.id, profilePayload)
        ]);

        if (metadataResult.error) throw metadataResult.error;
        if (profileResult.error) throw profileResult.error;

        const updatedProfileRow = profileResult.data?.[0];
        currentProfileData = updatedProfileRow ? updatedProfileRow : { ...(currentProfileData || {}), ...profilePayload };

        if (metadataResult.data?.user) {
            currentUser = metadataResult.data.user;
        } else {
            currentUser.user_metadata = {
                ...currentUser.user_metadata,
                ...metadataPayload
            };
        }

        document.getElementById('userName').textContent = fullName;
        document.getElementById('dashboardUserName').textContent = fullName;

        populateProfileForm();
        showNotification('Profile updated successfully', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile', 'error');
    } finally {
        hideLoader();
    }
}

async function handleSettingsSubmit(event) {
    event.preventDefault();
    if (!currentUser) return;

    const updatedSettings = {
        theme: settingThemeToggle.checked,
        notifications: settingNotificationsToggle.checked,
        waitingRoom: settingWaitingRoomToggle.checked,
        recording: settingRecordingToggle.checked
    };

    showLoader();

    try {
        const { error } = await DatabaseService.updateUserSettings(currentUser.id, updatedSettings);
        if (error) throw error;

        currentSettings = { ...updatedSettings };
        if (currentProfileData) {
            currentProfileData = { ...currentProfileData, settings: { ...updatedSettings } };
        }

        applySettingsToForm(currentSettings);
        storeSettings(currentSettings);
        showNotification('Preferences saved', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save preferences', 'error');
    } finally {
        hideLoader();
    }
}

// Render Meetings
function renderMeetings() {
    const now = new Date();
    
    // Categorize meetings
    const upcoming = userMeetings.filter(m => m.status === 'scheduled' && new Date(m.scheduled_time) > now);
    const active = userMeetings.filter(m => m.status === 'active');
    const ended = userMeetings.filter(m => m.status === 'ended' || (m.status === 'scheduled' && new Date(m.scheduled_time) < now));
    
    // Render each category
    renderMeetingList('upcoming', upcoming);
    renderMeetingList('active', active);
    renderMeetingList('ended', ended);
}

// Render Meeting List
function renderMeetingList(type, meetings) {
    const loadingEl = document.getElementById(`${type}Loading`);
    const emptyEl = document.getElementById(`${type}Empty`);
    const listEl = document.getElementById(`${type}MeetingsList`);
    
    // Hide loading
    loadingEl.style.display = 'none';
    
    if (meetings.length === 0) {
        emptyEl.style.display = 'flex';
        listEl.innerHTML = '';
    } else {
        emptyEl.style.display = 'none';
        listEl.innerHTML = meetings.map(meeting => createMeetingCard(meeting, type)).join('');
    }
}

// Create Meeting Card HTML
function createMeetingCard(meeting, type) {
    const scheduledDate = meeting.scheduled_time ? new Date(meeting.scheduled_time) : null;
    const dateStr = scheduledDate ? scheduledDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    }) : 'Not scheduled';
    const timeStr = scheduledDate ? scheduledDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    }) : '';
    
    const statusLabel = type === 'active' ? 'Live Now' : type === 'upcoming' ? 'Scheduled' : 'Ended';
    
    return `
        <div class="meeting-card ${type}">
            <div class="meeting-card-header">
                <div>
                    <h3 class="meeting-card-title">${meeting.title}</h3>
                </div>
                <span class="meeting-card-status ${type}">
                    ${type === 'active' ? '<span class="status-dot"></span>' : ''}
                    ${statusLabel}
                </span>
            </div>
            <div class="meeting-card-info">
                <div class="meeting-card-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
                    </svg>
                    ${dateStr}
                </div>
                ${timeStr ? `
                <div class="meeting-card-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    ${timeStr}
                </div>
                ` : ''}
                <div class="meeting-card-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    ${meeting.duration} min
                </div>
            </div>
            ${meeting.description ? `<p class="meeting-card-description">${meeting.description}</p>` : ''}
            <div class="meeting-card-actions">
                ${type === 'active' || type === 'upcoming' ? `
                    <button class="btn-meeting-action btn-join-now" onclick="joinMeeting('${meeting.id}')">
                        ${type === 'active' ? 'Join Now' : 'Start Meeting'}
                    </button>
                ` : ''}
                <button class="btn-meeting-action btn-copy-link" onclick="copyMeetingLink('${meeting.id}')">
                    Copy Link
                </button>
                <button class="btn-meeting-action btn-view-details" onclick="viewMeetingDetails('${meeting.id}')">
                    Details
                </button>
            </div>
        </div>
    `;
}

// Join Meeting
window.joinMeeting = async function(meetingId) {
    showLoader();
    try {
        // Verify meeting exists
        const { data: meeting, error } = await DatabaseService.getMeeting(meetingId);
        
        if (error) throw error;
        
        if (!meeting) {
            throw new Error('Meeting not found');
        }
        
        // Check if meeting requires password
        if (meeting.password) {
            const password = prompt('This meeting requires a password:');
            if (!password) {
                hideLoader();
                return;
            }
            // TODO: Verify password
        }
        
        // Add user as participant
        if (currentUser) {
            await DatabaseService.addParticipant(meetingId, currentUser.id, 
                meeting.host_id === currentUser.id ? 'host' : 'participant'
            );
        }
        
        // Redirect to meeting page
        window.location.href = `meeting.html?id=${meetingId}`;
    } catch (error) {
        hideLoader();
        console.error('Error joining meeting:', error);
        showNotification(error.message || 'Failed to join meeting', 'error');
    }
};

// Copy Meeting Link
window.copyMeetingLink = async function(meetingId) {
    const meetingUrl = `${window.location.origin}/meeting.html?id=${meetingId}`;
    
    try {
        await navigator.clipboard.writeText(meetingUrl);
        showNotification('Meeting link copied to clipboard!', 'success');
    } catch (error) {
        console.error('Error copying link:', error);
        showNotification('Failed to copy link', 'error');
    }
};

// View Meeting Details
window.viewMeetingDetails = function(meetingId) {
    // TODO: Show meeting details modal
    console.log('View details for meeting:', meetingId);
    showNotification('Meeting details coming soon!', 'info');
};

// Guest Join Meeting
document.getElementById('guestJoinBtn')?.addEventListener('click', async () => {
    const meetingCode = document.getElementById('guestMeetingCode').value.trim();
    
    if (!meetingCode) {
        showNotification('Please enter a meeting code', 'error');
        return;
    }
    
    showLoader();
    try {
        // Verify meeting exists
        const { data: meeting, error } = await DatabaseService.getMeeting(meetingCode);
        
        if (error || !meeting) {
            throw new Error('Meeting not found');
        }
        
        // Redirect to meeting page (as guest)
        window.location.href = `meeting.html?id=${meetingCode}`;
    } catch (error) {
        hideLoader();
        console.error('Error joining meeting:', error);
        showNotification(error.message || 'Invalid meeting code', 'error');
    }
});

// User Join Meeting
document.getElementById('userJoinBtn')?.addEventListener('click', async () => {
    const meetingCode = document.getElementById('userMeetingCode').value.trim();
    
    if (!meetingCode) {
        showNotification('Please enter a meeting code', 'error');
        return;
    }
    
    await joinMeeting(meetingCode);
});

// User Menu Toggle
userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (userDropdown && !userDropdown.contains(e.target) && e.target !== userMenuBtn) {
        userDropdown.classList.remove('show');
    }
    if (navbarNav && navbarToggle && !navbarNav.contains(e.target) && e.target !== navbarToggle) {
        closeMobileNav();
    }
});

// Sign Out
async function handleSignOut() {
    showLoader();
    try {
        await AuthService.signOut();
        currentUser = null;
        userMeetings = [];
        showGuestView();
        showNotification('Signed out successfully', 'success');
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('Failed to sign out', 'error');
    } finally {
        hideLoader();
    }
}

signOutBtn?.addEventListener('click', handleSignOut);
navLogoutBtn?.addEventListener('click', handleSignOut);

// Create Meeting Modal
createMeetingBtn?.addEventListener('click', () => {
    createMeetingModal.classList.add('show');
    
    // Set default date/time to now
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    
    document.getElementById('meetingDate').value = dateStr;
    document.getElementById('meetingTime').value = timeStr;
});

// Close Modal
closeModalBtn?.addEventListener('click', () => {
    createMeetingModal.classList.remove('show');
});

cancelModalBtn?.addEventListener('click', () => {
    createMeetingModal.classList.remove('show');
});

// Close modal on outside click
createMeetingModal?.addEventListener('click', (e) => {
    if (e.target === createMeetingModal) {
        createMeetingModal.classList.remove('show');
    }
});

// Create Meeting Form Submit
createMeetingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    showLoader();
    
    try {
        const title = document.getElementById('meetingTitle').value;
        const description = document.getElementById('meetingDescription').value;
        const date = document.getElementById('meetingDate').value;
        const time = document.getElementById('meetingTime').value;
        const duration = parseInt(document.getElementById('meetingDuration').value);
        const password = document.getElementById('meetingPassword').value;
        const waitingRoomEnabled = document.getElementById('waitingRoomEnabled').checked;
        const recordingEnabled = document.getElementById('recordingEnabled').checked;
        
        // Combine date and time
        const scheduledTime = date && time ? new Date(`${date}T${time}`).toISOString() : new Date().toISOString();
        
        const meetingData = {
            title,
            description,
            scheduledTime,
            duration,
            password: password || null,
            waitingRoomEnabled,
            recordingEnabled,
            settings: {
                waitingRoom: waitingRoomEnabled,
                recording: recordingEnabled
            }
        };
        
        const { data, error } = await DatabaseService.createMeeting(currentUser.id, meetingData);
        
        if (error) throw error;
        
        // Close modal
        createMeetingModal.classList.remove('show');
        createMeetingForm.reset();
        
        // Reload meetings
        await loadUserMeetings();
        
        showNotification('Meeting created successfully!', 'success');
        
        // Ask if user wants to start now
        if (confirm('Meeting created! Do you want to start it now?')) {
            await joinMeeting(data[0].id);
        }
    } catch (error) {
        console.error('Error creating meeting:', error);
        showNotification(error.message || 'Failed to create meeting', 'error');
    } finally {
        hideLoader();
    }
});

// Meeting Tabs
meetingTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        meetingTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding meetings list
        document.querySelectorAll('.meetings-list').forEach(list => {
            list.classList.remove('active');
        });
        document.getElementById(`${tabName}Meetings`).classList.add('active');
    });
});

// Loader Functions
function showLoader() {
    logoLoader.classList.add('active');
}

function hideLoader() {
    logoLoader.classList.remove('active');
}

// Notification Function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// Listen for auth state changes
AuthService.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        loadUserDashboard();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        userMeetings = [];
        showGuestView();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp);

// ==================== NAVIGATION (MOBILE) ====================

function toggleMobileNav() {
    if (!navbarNav || !navbarToggle) return;
    const isOpen = navbarNav.classList.toggle('open');
    navbarToggle.classList.toggle('active', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
    navbarNav.style.maxHeight = isOpen ? `${navbarNav.scrollHeight}px` : '0px';
}

function closeMobileNav() {
    if (!navbarNav || !navbarToggle) return;
    navbarNav.classList.remove('open');
    navbarToggle.classList.remove('active');
    document.body.classList.remove('nav-open');
    navbarNav.style.maxHeight = '0px';
}

navbarToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleMobileNav();
});

const navInteractiveSelectors = '.navbar-nav .nav-link, .navbar-nav .nav-button-secondary, .navbar-nav .nav-button-primary';

document.querySelectorAll(navInteractiveSelectors).forEach(element => {
    element.addEventListener('click', () => {
        closeMobileNav();
    });
});

document.querySelectorAll('.dropdown-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-section');
        const section = document.getElementById(targetId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeMobileNav();
        if (navbarNav) {
            navbarNav.style.maxHeight = '';
        }
    }
});
