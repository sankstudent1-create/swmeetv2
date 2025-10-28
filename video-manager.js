// ==================== VIDEO GRID MANAGER ====================
// Clean, simple video grid management from scratch

// Global state
const videoManager = {
    videoGrid: null,
    localVideo: null,
    remoteVideos: new Map(), // participantId -> video element
    screenShareActive: false,
    screenShareVideo: null
};

// ==================== INITIALIZATION ====================

function initializeVideoManager() {
    videoManager.videoGrid = document.getElementById('video-grid');
    
    if (!videoManager.videoGrid) {
        console.error('Video grid not found');
        return;
    }
    
    console.log('Video manager initialized');
}

// ==================== LOCAL VIDEO (SELF VIEW) ====================

function displayLocalVideo(stream) {
    // Remove existing self-view if any
    const existingSelfView = document.getElementById('self-view');
    if (existingSelfView) {
        existingSelfView.remove();
    }
    
    // Create self-view container
    const container = document.createElement('div');
    container.id = 'self-view';
    container.className = 'video-participant';
    
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true; // Mute own audio
    video.playsInline = true;
    
    // Create name label
    const nameLabel = document.createElement('span');
    nameLabel.className = 'participant-name';
    nameLabel.textContent = 'You';
    
    // Assemble
    container.appendChild(video);
    container.appendChild(nameLabel);
    
    // Add to grid
    videoManager.videoGrid.appendChild(container);
    videoManager.localVideo = container;
    
    console.log('✅ Local video displayed');
    
    // Refresh smart layout
    if (window.SmartLayout) {
        setTimeout(() => window.SmartLayout.refresh(), 100);
    }
}

// ==================== REMOTE VIDEO ====================

function displayRemoteVideo(participantId, stream, participantName = 'Participant') {
    // Check if already exists
    if (videoManager.remoteVideos.has(participantId)) {
        console.log('Remote video already exists for:', participantId);
        return;
    }
    
    // Create container
    const container = document.createElement('div');
    container.className = 'video-participant remote-participant';
    container.dataset.participantId = participantId;
    
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    // Force video to play to avoid frozen/black video
    video.onloadedmetadata = () => {
        video.play().catch(e => {
            console.warn('Video autoplay blocked for', participantName, ', retrying:', e);
            setTimeout(() => video.play().catch(console.error), 100);
        });
    };
    
    // Create name label
    const nameLabel = document.createElement('span');
    nameLabel.className = 'participant-name';
    nameLabel.textContent = participantName;
    
    // Assemble
    container.appendChild(video);
    container.appendChild(nameLabel);
    
    // Add to grid (before self-view if it exists and is in the DOM)
    const selfView = document.getElementById('self-view');
    if (selfView && selfView.parentNode === videoManager.videoGrid) {
        videoManager.videoGrid.insertBefore(container, selfView);
    } else {
        videoManager.videoGrid.appendChild(container);
    }
    
    // Store reference
    videoManager.remoteVideos.set(participantId, container);
    
    console.log('✅ Remote video displayed for:', participantName);
    
    // Refresh smart layout
    if (window.SmartLayout) {
        setTimeout(() => window.SmartLayout.refresh(), 100);
    }
}

// ==================== REMOVE VIDEO ====================

function removeRemoteVideo(participantId) {
    const container = videoManager.remoteVideos.get(participantId);
    
    if (container) {
        // Stop video
        const video = container.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        // Remove from DOM
        container.remove();
        
        // Remove from map
        videoManager.remoteVideos.delete(participantId);
        
        console.log('✅ Removed video for:', participantId);
        
        // Refresh smart layout
        if (window.SmartLayout) {
            setTimeout(() => window.SmartLayout.refresh(), 100);
        }
    }
}

// ==================== SCREEN SHARE ====================

function displayScreenShare(stream, participantName = 'You') {
    // Validate stream
    if (!stream || !stream.getVideoTracks || stream.getVideoTracks().length === 0) {
        console.warn('⚠️ Invalid screen share stream, ignoring');
        return;
    }
    
    // Remove existing screen share
    if (videoManager.screenShareVideo) {
        videoManager.screenShareVideo.remove();
    }
    
    // Create screen share container
    const container = document.createElement('div');
    container.id = 'screen-share-display';
    container.className = 'video-participant screen-share';
    
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    // Check if this is self-view (mute own screen share) or remote (allow audio)
    const isSelfView = participantName === 'You';
    video.muted = isSelfView; // Mute ONLY self-view to prevent echo, allow audio for others
    
    // Log audio status
    const hasAudio = stream.getAudioTracks().length > 0;
    if (hasAudio && !isSelfView) {
        console.log('🔊 Screen share with audio from:', participantName);
    } else if (!hasAudio) {
        console.log('🔇 Screen share without audio from:', participantName);
    }
    
    // Force video to play to avoid black screen
    video.onloadedmetadata = () => {
        video.play().catch(e => {
            console.warn('Screen share autoplay blocked, trying again:', e);
            // Retry after a short delay
            setTimeout(() => video.play().catch(console.error), 100);
        });
    };
    
    // Create label
    const label = document.createElement('span');
    label.className = 'participant-name';
    label.textContent = `📺 ${participantName}'s Screen`;
    
    // Assemble
    container.appendChild(video);
    container.appendChild(label);
    
    // Add to grid (at the beginning)
    videoManager.videoGrid.insertBefore(container, videoManager.videoGrid.firstChild);
    videoManager.screenShareVideo = container;
    videoManager.screenShareActive = true;
    
    console.log('✅ Screen share displayed for:', participantName);
    
    // Refresh smart layout
    if (window.SmartLayout) {
        setTimeout(() => window.SmartLayout.refresh(), 100);
    }
}

function removeScreenShare() {
    if (videoManager.screenShareVideo) {
        // Stop video
        const video = videoManager.screenShareVideo.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        // Remove from DOM
        videoManager.screenShareVideo.remove();
        videoManager.screenShareVideo = null;
        videoManager.screenShareActive = false;
        
        console.log('✅ Screen share removed');
        
        // Refresh smart layout
        if (window.SmartLayout) {
            setTimeout(() => window.SmartLayout.refresh(), 100);
        }
    }
}

// ==================== UPDATE VIDEO STREAM ====================

function updateVideoStream(participantId, newStream) {
    const container = videoManager.remoteVideos.get(participantId);
    
    if (container) {
        const video = container.querySelector('video');
        if (video) {
            video.srcObject = newStream;
            console.log('✅ Updated video stream for:', participantId);
        }
    }
}

// ==================== SCREEN SHARE BROADCASTING ====================

let screenShareStream = null;
let screenShareSenders = {}; // Track screen share senders per peer

async function startScreenShareBroadcast() {
    try {
        // Check if device/browser exposes getDisplayMedia
        const supportsDisplayMedia = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');

        if (!supportsDisplayMedia) {
            if (window.showNotification) {
                window.showNotification('Screen sharing is not supported on this browser. Try updating your browser or using the latest Chrome/Safari.', 'error');
            }
            throw new Error('Screen sharing not supported on this device/browser');
        }

        // Detect platform for tailored constraints
        const userAgent = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);

        const videoConstraints = (() => {
            if (isIOS) {
                // Safari on iOS only supports tab/application capture with basic width/height
                return {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                };
            }
            if (isAndroid) {
                return {
                    preferCurrentTab: true,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                };
            }
            return {
                cursor: "always",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            };
        })();

        const audioConstraints = (() => {
            if (isIOS) {
                return false; // iOS Safari does not expose system audio yet
            }
            if (isAndroid) {
                return {
                    echoCancellation: true,
                    noiseSuppression: true
                };
            }
            return {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            };
        })();

        // Get screen share stream with platform-appropriate constraints
        screenShareStream = await navigator.mediaDevices.getDisplayMedia({
            video: videoConstraints,
            audio: audioConstraints
        });

        if (isIOS && window.showNotification) {
            window.showNotification('Sharing from iOS Safari: audio capture is not yet supported. Video will still be shared.', 'info');
        }
        
        // Display locally
        displayScreenShare(screenShareStream, 'You');
        
        // Get ALL tracks (video + audio)
        const screenVideoTrack = screenShareStream.getVideoTracks()[0];
        const screenAudioTracks = screenShareStream.getAudioTracks();
        
        // Log what we got
        console.log('📺 Screen share tracks:', {
            video: !!screenVideoTrack,
            audio: screenAudioTracks.length,
            streamId: screenShareStream.id
        });
        
        if (screenAudioTracks.length > 0) {
            console.log('🔊 Screen share audio enabled');
        } else {
            console.log('🔇 Screen share without audio (user didn\'t share audio or not supported)');
        }
        
        // Mark the stream as screen share for detection
        screenShareStream._isScreenShare = true;
        
        // Store screen share stream ID globally for detection
        if (!window.screenShareStreamIds) {
            window.screenShareStreamIds = new Set();
        }
        window.screenShareStreamIds.add(screenShareStream.id);
        
        if (window.webrtcPeerConnections) {
            let addedCount = 0;
            const renegotiationPromises = [];
            
            // Add tracks to all peers and trigger renegotiation
            for (const [peerId, pc] of Object.entries(window.webrtcPeerConnections)) {
                try {
                    // Add screen VIDEO track
                    const videoSender = pc.addTrack(screenVideoTrack, screenShareStream);
                    
                    // Store senders for later removal
                    if (!screenShareSenders[peerId]) {
                        screenShareSenders[peerId] = [];
                    }
                    screenShareSenders[peerId].push(videoSender);
                    
                    // Add screen AUDIO tracks if available
                    screenAudioTracks.forEach(audioTrack => {
                        const audioSender = pc.addTrack(audioTrack, screenShareStream);
                        screenShareSenders[peerId].push(audioSender);
                        console.log(`🔊 Screen audio track added to peer: ${peerId}`);
                    });
                    
                    addedCount++;
                    console.log(`✅ Screen share tracks added to peer: ${peerId} (Video: ✅, Audio: ${screenAudioTracks.length > 0 ? '✅' : '❌'})`);
                    
                    // CRITICAL: Trigger renegotiation by creating a new offer
                    // This is required when adding tracks to existing connections
                    const renegPromise = (async () => {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            
                            // Send the new offer via Supabase Realtime
                            if (window.WebRTC && window.WebRTC.signalingChannel) {
                                window.WebRTC.signalingChannel.send({
                                    type: 'broadcast',
                                    event: 'offer',
                                    payload: {
                                        from: window.currentParticipantId,
                                        to: peerId,
                                        offer: offer,
                                        isScreenShare: true,  // CRITICAL: Flag this as screen share
                                        screenShareStreamId: screenShareStream.id  // Send stream ID
                                    }
                                });
                                console.log(`🔄 Renegotiation offer sent to ${peerId} for screen share (Stream ID: ${screenShareStream.id})`);
                            } else {
                                console.error(`❌ No signaling channel available - WebRTC not initialized`);
                            }
                        } catch (renegErr) {
                            console.error(`❌ Renegotiation failed for ${peerId}:`, renegErr);
                        }
                    })();
                    renegotiationPromises.push(renegPromise);
                    
                } catch (err) {
                    console.error(`❌ Failed to add screen to ${peerId}:`, err);
                }
            }
            
            console.log(`📺 Broadcasting screen to ${addedCount} participants with stream ID: ${screenShareStream.id}`);
            
            // Wait for all renegotiations to complete
            await Promise.allSettled(renegotiationPromises);
            console.log(`✅ All renegotiation offers sent for screen share`);
        }
        
        // Store screen share state globally for late joiners
        window.currentScreenShare = {
            stream: screenShareStream,
            videoTrack: screenVideoTrack,
            audioTracks: screenAudioTracks,
            participantId: window.currentParticipantId,
            active: true,
            hasAudio: screenAudioTracks.length > 0
        };
        
        // Also expose senders globally for webrtc-signaling
        window.screenShareSenders = screenShareSenders;
        
        // Handle when user stops sharing (video track ends)
        screenVideoTrack.onended = () => {
            console.log('📺 Screen share ended by user');
            stopScreenShareBroadcast();
        };
        
        // Also handle audio track ending (if audio was shared)
        screenAudioTracks.forEach(audioTrack => {
            audioTrack.onended = () => {
                console.log('🔊 Screen share audio ended');
            };
        });
        
        return screenShareStream;
        
    } catch (error) {
        console.error('❌ Screen share error:', error);
        throw error;
    }
}

async function stopScreenShareBroadcast() {
    try {
        // Remove screen share display
        removeScreenShare();
        
        // Remove stream ID from known screen shares
        if (window.screenShareStreamIds && screenShareStream) {
            window.screenShareStreamIds.delete(screenShareStream.id);
        }
        
        // Remove screen share tracks (video + audio) from all peer connections (keep camera)
        if (window.webrtcPeerConnections) {
            let removedCount = 0;
            
            // Remove tracks from all peers and trigger renegotiation
            for (const [peerId, pc] of Object.entries(window.webrtcPeerConnections)) {
                const senders = screenShareSenders[peerId];
                
                if (senders) {
                    try {
                        // senders is now an array (can contain video + audio senders)
                        const sendersArray = Array.isArray(senders) ? senders : [senders];
                        
                        sendersArray.forEach(sender => {
                            pc.removeTrack(sender);
                        });
                        
                        delete screenShareSenders[peerId];
                        removedCount++;
                        console.log(`✅ Removed screen share tracks from peer: ${peerId} (${sendersArray.length} tracks)`);
                        
                        // CRITICAL: Trigger renegotiation after removing track
                        (async () => {
                            try {
                                const offer = await pc.createOffer();
                                await pc.setLocalDescription(offer);
                                
                                // Send the new offer via Supabase Realtime
                                if (window.signalingChannel) {
                                    await window.signalingChannel.send({
                                        type: 'broadcast',
                                        event: 'offer',
                                        payload: {
                                            from: window.currentParticipantId,
                                            to: peerId,
                                            offer: offer
                                        }
                                    });
                                    console.log(`🔄 Renegotiation offer sent to ${peerId} after screen stop`);
                                }
                            } catch (renegErr) {
                                console.error(`❌ Renegotiation failed for ${peerId}:`, renegErr);
                            }
                        })();
                        
                    } catch (err) {
                        console.error(`❌ Failed to remove screen from ${peerId}:`, err);
                    }
                }
            }
            
            console.log(`📹 Removed screen from ${removedCount} participants`);
        }
        
        // Stop screen share stream
        if (screenShareStream) {
            screenShareStream.getTracks().forEach(track => track.stop());
            screenShareStream = null;
        }
        
        // Clear global screen share state
        if (window.currentScreenShare) {
            window.currentScreenShare.active = false;
            window.currentScreenShare = null;
        }
        
    } catch (error) {
        console.error('❌ Stop screen share error:', error);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function getVideoCount() {
    return {
        local: videoManager.localVideo ? 1 : 0,
        remote: videoManager.remoteVideos.size,
        screenShare: videoManager.screenShareActive ? 1 : 0,
        total: (videoManager.localVideo ? 1 : 0) + videoManager.remoteVideos.size + (videoManager.screenShareActive ? 1 : 0)
    };
}

function clearAllVideos() {
    // Remove all remote videos
    videoManager.remoteVideos.forEach((container, participantId) => {
        removeRemoteVideo(participantId);
    });
    
    // Remove screen share
    removeScreenShare();
    
    // Remove local video
    if (videoManager.localVideo) {
        videoManager.localVideo.remove();
        videoManager.localVideo = null;
    }
    
    console.log('✅ All videos cleared');
}

// ==================== EXPORT ====================

window.VideoManager = {
    init: initializeVideoManager,
    displayLocal: displayLocalVideo,
    displayRemote: displayRemoteVideo,
    removeRemote: removeRemoteVideo,
    displayScreenShare: displayScreenShare,
    removeScreenShare: removeScreenShare,
    updateStream: updateVideoStream,
    startScreenShare: startScreenShareBroadcast,
    stopScreenShare: stopScreenShareBroadcast,
    getCount: getVideoCount,
    clearAll: clearAllVideos,
    screenShareSenders: screenShareSenders // Expose for webrtc-signaling
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVideoManager);
} else {
    initializeVideoManager();
}

console.log('✅ Video Manager module loaded');
