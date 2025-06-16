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
  const peers = {};
  
  
  function onSuccess() {};
  function onError(error) {
    console.error(error);
  };
  
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
    // We're connected to the room and received an array of 'members'
    // connected to the room (including us). Signaling server is ready.
    room.on('members', members => {
      console.log('MEMBERS', members);
      // Create peer connections for all existing members
      members.forEach(member => {
        if (member.id !== drone.clientId) {
          createPeerConnection(member.id);
        }
      });
    });
  
    room.on('member_join', member => {
      console.log('MEMBER JOINED', member);
      createPeerConnection(member.id);
    });
  
    room.on('member_leave', member => {
      console.log('MEMBER LEFT', member);
      if (peers[member.id]) {
        peers[member.id].close();
        delete peers[member.id];
        removeVideoElement(member.id);
      }
    });
  });
  
  // Send signaling data via Scaledrone
  function sendMessage(message) {
    drone.publish({
      room: roomName,
      message
    });
  }
  
  function createPeerConnection(memberId) {
    const pc = new RTCPeerConnection(configuration);
    peers[memberId] = pc;
  
    pc.onicecandidate = event => {
      if (event.candidate) {
        sendMessage({
          type: 'candidate',
          candidate: event.candidate,
          to: memberId
        });
      }
    };
  
    pc.ontrack = event => {
      const stream = event.streams[0];
      if (!document.getElementById(`video-${memberId}`)) {
        addVideoElement(memberId, stream);
      }
    };
  
    // If we have local stream, add it to the peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
  
    // Create and send offer
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        sendMessage({
          type: 'offer',
          sdp: pc.localDescription,
          to: memberId
        });
      })
      .catch(onError);
  
    return pc;
  }
  
  function addVideoElement(memberId, stream) {
    const videoContainer = document.getElementById('remoteVideos');
    const video = document.createElement('video');
    video.id = `video-${memberId}`;
    video.autoplay = true;
    video.srcObject = stream;
    videoContainer.appendChild(video);
  }
  
  function removeVideoElement(memberId) {
    const video = document.getElementById(`video-${memberId}`);
    if (video) {
      video.remove();
    }
  }
  
  // Handle incoming messages
  room.on('data', (message, client) => {
    if (client.id === drone.clientId) {
      return;
    }
  
    const pc = peers[client.id];
    if (!pc) {
      return;
    }
  
    if (message.type === 'offer') {
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
          sendMessage({
            type: 'answer',
            sdp: pc.localDescription,
            to: client.id
          });
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
  
  // Get local media stream
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  }).then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    
    // Add tracks to existing peer connections
    Object.values(peers).forEach(pc => {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    });
  }, onError);
