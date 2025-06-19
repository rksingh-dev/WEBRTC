// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);

// TODO: Replace with your own channel ID
const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + roomHash;
const configuration = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};

let room;
let localStream;
let peerConnections = {}; // Store multiple peer connections
let connectedPeers = new Set(); // Track connected peers
const maxUsers = 3;

// Media state tracking
let isCameraOn = true;
let isMicOn = true;

// Get video elements
const localVideo = document.getElementById('localVideo');
const localVideoOff = document.getElementById('localVideoOff');
const remoteVideo1 = document.getElementById('remoteVideo1');
const remoteVideo2 = document.getElementById('remoteVideo2');
const remoteVideos = [remoteVideo1, remoteVideo2];
const connectionStatus = document.getElementById('connectionStatus');

// Get control elements
const cameraBtn = document.getElementById('cameraBtn');
const micBtn = document.getElementById('micBtn');

function onSuccess() {}

function onError(error) {
  console.error(error);
  updateConnectionStatus('Error: ' + error.message, 'status-disconnected');
}

function updateConnectionStatus(message, statusClass) {
  connectionStatus.textContent = message;
  connectionStatus.className = `connection-status ${statusClass}`;
}

// Media control functions
function toggleCamera() {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      isCameraOn = videoTrack.enabled;
      
      // Update UI
      cameraBtn.classList.toggle('off', !isCameraOn);
      cameraBtn.textContent = isCameraOn ? '📹' : '📹';
      localVideoOff.style.display = isCameraOn ? 'none' : 'flex';
      
      // Update button title
      cameraBtn.title = isCameraOn ? 'Turn Camera Off' : 'Turn Camera On';
    }
  }
}

function toggleMicrophone() {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      isMicOn = audioTrack.enabled;
      
      // Update UI
      micBtn.classList.toggle('off', !isMicOn);
      micBtn.textContent = isMicOn ? '🎤' : '🔇';
      
      // Update button title
      micBtn.title = isMicOn ? 'Mute Microphone' : 'Unmute Microphone';
    }
  }
}

// Event listeners for controls
cameraBtn.addEventListener('click', toggleCamera);
micBtn.addEventListener('click', toggleMicrophone);

drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
  
  room = drone.subscribe(roomName);
  
  room.on('open', error => {
    if (error) {
      onError(error);
    }
  });

  // Handle room members
  room.on('members', members => {
    console.log('MEMBERS', members);
    
    if (members.length > maxUsers) {
      updateConnectionStatus('Room is full (max 3 users)', 'status-disconnected');
      return;
    }
    
    updateConnectionStatus(`Connected users: ${members.length}/${maxUsers}`, 'status-connected');
    
    // Create peer connections for other members
    members.forEach(member => {
      if (member.id !== drone.clientId && !peerConnections[member.id]) {
        createPeerConnection(member.id, true);
      }
    });
  });

  // Handle new members joining
  room.on('member_join', member => {
    console.log('Member joined:', member);
    
    const totalMembers = Object.keys(peerConnections).length + 1; // +1 for self
    if (totalMembers >= maxUsers) {
      updateConnectionStatus('Room is full (max 3 users)', 'status-disconnected');
      return;
    }
    
    updateConnectionStatus(`Connected users: ${totalMembers + 1}/${maxUsers}`, 'status-connected');
    createPeerConnection(member.id, false);
  });

  // Handle members leaving
  room.on('member_leave', member => {
    console.log('Member left:', member);
    
    if (peerConnections[member.id]) {
      peerConnections[member.id].close();
      delete peerConnections[member.id];
      connectedPeers.delete(member.id);
      
      // Clear the video element
      const videoIndex = Array.from(connectedPeers).indexOf(member.id);
      if (videoIndex >= 0 && videoIndex < remoteVideos.length) {
        remoteVideos[videoIndex].srcObject = null;
      }
      
      updateConnectionStatus(`Connected users: ${Object.keys(peerConnections).length + 1}/${maxUsers}`, 'status-connected');
    }
  });

  // Listen to signaling data from Scaledrone
  room.on('data', (data, client) => {
    // Message was sent by us
    if (client.id === drone.clientId) {
      return;
    }

    const message = data.message;
    const fromId = message.from;
    
    // Ignore messages not meant for us
    if (message.to && message.to !== drone.clientId) {
      return;
    }

    const pc = peerConnections[fromId];
    if (!pc) {
      console.warn('No peer connection for:', fromId);
      return;
    }

    if (message.type === 'offer') {
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
          sendMessage({
            type: 'answer',
            sdp: pc.localDescription
          }, fromId);
        })
        .catch(onError);
    } else if (message.type === 'answer') {
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
        .catch(onError);
    } else if (message.type === 'candidate') {
      pc.addIceCandidate(new RTCIceCandidate(message.candidate))
        .catch(onError);
    }
  });
});

// Send signaling data via Scaledrone
function sendMessage(message, targetId = null) {
  const messageData = {
    room: roomName,
    message: {
      ...message,
      from: drone.clientId,
      to: targetId
    }
  };
  drone.publish(messageData);
}

function createPeerConnection(peerId, isOfferer) {
  const pc = new RTCPeerConnection(configuration);
  peerConnections[peerId] = pc;

  // Handle ICE candidates
  pc.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({
        type: 'candidate',
        candidate: event.candidate
      }, peerId);
    }
  };

  // Handle incoming streams
  pc.ontrack = event => {
    const stream = event.streams[0];
    console.log('Received remote stream from:', peerId);
    
    // Find available video element
    const peerIds = Array.from(connectedPeers);
    let videoIndex = peerIds.indexOf(peerId);
    
    if (videoIndex === -1) {
      connectedPeers.add(peerId);
      videoIndex = Array.from(connectedPeers).indexOf(peerId);
    }
    
    if (videoIndex < remoteVideos.length) {
      const videoElement = remoteVideos[videoIndex];
      if (!videoElement.srcObject || videoElement.srcObject.id !== stream.id) {
        videoElement.srcObject = stream;
      }
    }
  };

  // Add local stream to peer connection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  // Handle negotiation
  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          sendMessage({
            type: 'offer',
            sdp: pc.localDescription
          }, peerId);
        })
        .catch(onError);
    };
  }

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    console.log(`Connection state with ${peerId}:`, pc.connectionState);
    
    if (pc.connectionState === 'connected') {
      connectedPeers.add(peerId);
    } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      connectedPeers.delete(peerId);
    }
    
    updateConnectionStatus(`Connected users: ${connectedPeers.size + 1}/${maxUsers}`, 'status-connected');
  };

  return pc;
}

// Initialize local media
navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true,
}).then(stream => {
  localStream = stream;
  localVideo.srcObject = stream;
  
  // Add tracks to existing peer connections
  Object.values(peerConnections).forEach(pc => {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
  });
  
  // Initialize control button states
  cameraBtn.title = 'Turn Camera Off';
  micBtn.title = 'Mute Microphone';
  
  updateConnectionStatus('Camera and microphone ready', 'status-connected');
}).catch(error => {
  console.error('Error accessing media devices:', error);
  updateConnectionStatus('Camera/microphone access denied', 'status-disconnected');
});