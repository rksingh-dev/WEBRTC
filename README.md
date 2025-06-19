# WebRTC 3-User Video Chat Application

A peer-to-peer video chat application built with WebRTC and Scaledrone signaling service that supports up to 3 simultaneous users in a single room. This application allows three users to have a real-time video call directly through their web browsers.

## Features

- Real-time video and audio communication for up to 3 users
- Peer-to-peer connections (no server-side video processing)
- Modern, responsive user interface with grid layout
- Automatic room creation with unique URLs
- Connection status indicators
- Smooth animations and hover effects
- Mobile-friendly responsive design
- Works on modern web browsers
- No installation required

## How It Works

1. The first user opens the application and gets a unique room URL
2. They share this URL with up to 2 other users
3. When users join, peer-to-peer connections are established between all participants
4. Each user can see themselves and the other 2 participants in a grid layout
5. The room automatically prevents more than 3 users from joining

## Technical Implementation

- **WebRTC**: Handles peer-to-peer video/audio streaming
- **Scaledrone**: Provides signaling service for connection establishment
- **Multiple Peer Connections**: Each user maintains connections with all other users
- **Grid Layout**: Responsive CSS Grid for optimal video arrangement
- **Connection Management**: Handles user joining/leaving dynamically

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Webcam and microphone access
- Internet connection

## Usage

1. Open the application in your browser
2. Allow camera and microphone permissions when prompted
3. Share the URL with up to 2 friends
4. Start your 3-way video call!

## Browser Compatibility

- Chrome 56+
- Firefox 44+
- Safari 11+
- Edge 79+

## Limitations

- Maximum of 3 users per room
- Requires modern browser with WebRTC support
- Performance may vary based on network conditions and device capabilities

## Acknowledgments

- WebRTC for the peer-to-peer communication technology
- Scaledrone for the signaling service
- Google's STUN server for NAT traversal

## Support

If you encounter any issues or have questions, please open an issue in the repository.

## Future Improvements

- Add support for more participants (4-6 users)
- Implement chat functionality
- Add screen sharing capability
- Improve error handling and reconnection logic
- Add user interface for room management
- Implement user names/avatars
- Add mute/unmute controls
- Add video quality settings