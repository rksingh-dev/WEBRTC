// Generate random room name if needed
if (!location.hash) {
    location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  }
  const roomHash = location.hash.substring(1);
  
  // TODO: Replace with your own channel ID
  const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
  // Room name needs to be prefixed with 'observable-'
  const roomName = 'observable-' + roomHash;
  
  // Optimized configuration with fewer, more reliable STUN/TURN servers
  const configuration = {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302'
        ]
      },
      {
        urls: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com'
      }
    ],
    iceCandidatePoolSize: 5
  };
  
  let room;
  let localStream;
  const peers = {};
  const pendingCandidates = {};
  let isPolite = false;
  
  
  function onSuccess() {};
  function onError(error) {
    console.error('Error:', error);
  };
  
  // Initialize room and set up event handlers
  function initializeRoom() {
    room = drone.subscribe(roomName);
    
    room.on('open', error => {
      if (error) {
        return console.error(error);
      }
      console.log('Connected to room');
    });
  
    room.on('members', members => {
      console.log('MEMBERS', members);
      // Determine if we're the polite peer (the one who joins second)
      isPolite = members.length > 1;
      console.log('Is polite peer:', isPolite);
      
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
        // Store any pending candidates
        pendingCandidates[client.id] = [];
        
        const offerCollision = 
          (pc.signalingState !== 'stable' && !isPolite) ||
          pc.signalingState === 'have-local-offer';
    
        if (offerCollision) {
          console.log('Offer collision detected, rolling back...');
          Promise.all([
            pc.setLocalDescription({type: 'rollback'}),
            pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
          ]).then(() => {
            return pc.createAnswer();
          }).then(answer => {
            return pc.setLocalDescription(answer);
          }).then(() => {
            sendMessage({
              type: 'answer',
              sdp: pc.localDescription,
              to: client.id
            });
          }).catch(error => {
            console.error('Error handling offer collision:', error);
            onError(error);
          });
        } else {
          pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
            .then(() => {
              console.log('Remote description set successfully');
              // Add any pending candidates
              if (pendingCandidates[client.id]) {
                pendingCandidates[client.id].forEach(candidate => {
                  pc.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error('Error adding pending candidate:', e));
                });
                pendingCandidates[client.id] = [];
              }
              return pc.createAnswer();
            })
            .then(answer => {
              console.log('Answer created successfully');
              return pc.setLocalDescription(answer);
            })
            .then(() => {
              console.log('Local description set successfully');
              sendMessage({
                type: 'answer',
                sdp: pc.localDescription,
                to: client.id
              });
            })
            .catch(error => {
              console.error('Error during offer/answer exchange:', error);
              onError(error);
            });
        }
      } else if (message.type === 'answer') {
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
          .then(() => {
            console.log('Answer set successfully');
            // Add any pending candidates
            if (pendingCandidates[client.id]) {
              pendingCandidates[client.id].forEach(candidate => {
                pc.addIceCandidate(new RTCIceCandidate(candidate))
                  .catch(e => console.error('Error adding pending candidate:', e));
              });
              pendingCandidates[client.id] = [];
            }
          })
          .catch(error => {
            console.error('Error setting answer:', error);
            onError(error);
          });
      } else if (message.type === 'candidate') {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          // If we have a remote description, add the candidate
          pc.addIceCandidate(new RTCIceCandidate(message.candidate))
            .then(() => console.log('ICE candidate added successfully'))
            .catch(error => {
              console.error('Error adding ICE candidate:', error);
              onError(error);
            });
        } else {
          // Otherwise, store it for later
          if (!pendingCandidates[client.id]) {
            pendingCandidates[client.id] = [];
          }
          pendingCandidates[client.id].push(message.candidate);
          console.log('Stored pending ICE candidate');
        }
      }
    });
  }
  
  function createPeerConnection(memberId) {
    const pc = new RTCPeerConnection(configuration);
    peers[memberId] = pc;
  
    // Add connection state change handler
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.log('Connection failed, attempting to restart ICE...');
        pc.restartIce();
      }
    };
  
    // Add ICE connection state change handler
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.log('ICE connection failed, attempting to restart...');
        pc.restartIce();
      }
    };
  
    // Add signaling state change handler
    pc.onsignalingstatechange = () => {
      console.log('Signaling state:', pc.signalingState);
    };
  
    // Add negotiation needed handler
    pc.onnegotiationneeded = async () => {
      try {
        if (!isPolite) {
          console.log('Creating offer due to negotiation needed');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendMessage({
            type: 'offer',
            sdp: pc.localDescription,
            to: memberId
          });
        }
      } catch (error) {
        console.error('Error during negotiation:', error);
        onError(error);
      }
    };
  
    pc.onicecandidate = event => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        sendMessage({
          type: 'candidate',
          candidate: event.candidate,
          to: memberId
        });
      }
    };
  
    pc.ontrack = event => {
      console.log('Received remote track');
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
  
    // Only create offer if we're the impolite peer (first to join)
    if (!isPolite) {
      pc.createOffer()
        .then(offer => {
          console.log('Offer created successfully');
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          console.log('Local description set successfully');
          sendMessage({
            type: 'offer',
            sdp: pc.localDescription,
            to: memberId
          });
        })
        .catch(error => {
          console.error('Error creating/sending offer:', error);
          onError(error);
        });
    }
  
    return pc;
  }
  
  function addVideoElement(memberId, stream) {
    const videoContainer = document.getElementById('remoteVideos');
    const video = document.createElement('video');
    video.id = `video-${memberId}`;
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;
    videoContainer.appendChild(video);
  }
  
  function removeVideoElement(memberId) {
    const video = document.getElementById(`video-${memberId}`);
    if (video) {
      video.remove();
    }
  }
  
  function sendMessage(message) {
    drone.publish({
      room: roomName,
      message
    });
  }
  
  // Initialize when drone connection is open
  drone.on('open', error => {
    if (error) {
      return console.error(error);
    }
    initializeRoom();
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
  }, error => {
    console.error('Error accessing media devices:', error);
    onError(error);
  });
