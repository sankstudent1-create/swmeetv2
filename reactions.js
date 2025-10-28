// Reactions System - Floating Emoji Animations
// Add this to meeting.html: <script src="reactions.js"></script>

// ==================== CONFIGURATION ====================

const REACTIONS = {
    thumbsup: '👍',
    clap: '👏',
    heart: '❤️',
    laugh: '😂',
    surprised: '😮',
    party: '🎉'
};

const REACTION_DURATION = 3000; // 3 seconds
const REACTION_RISE_DISTANCE = 150; // pixels

// ==================== GLOBAL STATE ====================

let reactionsChannel = null;

// ==================== SETUP ====================

function setupReactions() {
    console.log('Setting up reactions system...');
    
    // Create Supabase Realtime channel for reactions
    reactionsChannel = supabaseClient
        .channel(`reactions:${meetingId}`)
        .on('broadcast', { event: 'reaction' }, ({ payload }) => {
            console.log('Received reaction:', payload);
            displayReaction(payload.emoji, payload.userName);
        })
        .subscribe((status) => {
            console.log('Reactions channel status:', status);
        });
}

// ==================== SEND REACTION ====================

window.sendReaction = async function(emoji) {
    if (!reactionsChannel) {
        console.error('Reactions channel not initialized');
        return;
    }
    
    const userName = window.currentUser?.user_metadata?.full_name || 
                     window.currentUser?.email?.split('@')[0] || 
                     window.participants?.find(p => p.id === window.currentParticipantId)?.guest_name ||
                     'Guest';
    
    // Send reaction to all participants
    await reactionsChannel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {
            emoji: emoji,
            userName: userName,
            participantId: window.currentParticipantId,
            timestamp: Date.now()
        }
    });
    
    // Display locally
    displayReaction(emoji, userName);
    
    console.log('Sent reaction:', emoji);
};

// ==================== DISPLAY REACTION ====================

function displayReaction(emoji, userName) {
    // Create reaction element
    const reaction = document.createElement('div');
    reaction.className = 'floating-reaction';
    reaction.textContent = emoji;
    
    // Random horizontal position
    const randomX = Math.random() * 80 + 10; // 10% to 90%
    reaction.style.left = `${randomX}%`;
    
    // Add to video grid
    const videoGrid = document.getElementById('video-grid');
    if (videoGrid) {
        videoGrid.appendChild(reaction);
        
        // Trigger animation
        setTimeout(() => {
            reaction.classList.add('animate');
        }, 10);
        
        // Remove after animation
        setTimeout(() => {
            reaction.remove();
        }, REACTION_DURATION);
    }
    
    // Show notification
    if (window.showNotification) {
        window.showNotification(`${userName} reacted ${emoji}`, 'info');
    }
}

// ==================== TOGGLE REACTIONS MENU ====================

window.toggleReactionsMenu = function() {
    const menu = document.getElementById('reactionsMenu');
    if (!menu) return;
    
    const isVisible = menu.style.display === 'flex';
    menu.style.display = isVisible ? 'none' : 'flex';
    
    // Close menu when clicking outside
    if (!isVisible) {
        setTimeout(() => {
            document.addEventListener('click', closeReactionsMenuOnClickOutside);
        }, 100);
    }
};

function closeReactionsMenuOnClickOutside(event) {
    const menu = document.getElementById('reactionsMenu');
    const button = document.getElementById('toggle-reactions');
    
    if (menu && !menu.contains(event.target) && !button.contains(event.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeReactionsMenuOnClickOutside);
    }
}

// ==================== CLEANUP ====================

function cleanupReactions() {
    if (reactionsChannel) {
        reactionsChannel.unsubscribe();
        reactionsChannel = null;
    }
}

// ==================== EXPORT ====================

window.Reactions = {
    setupReactions,
    cleanupReactions,
    sendReaction,
    toggleReactionsMenu
};

console.log('Reactions module loaded');
