# WebRTC Video Chat Application

A simple, peer-to-peer video chat application built with WebRTC and Scaledrone signaling service. This application allows two users to have a real-time video call directly through their web browsers.

## Features

- Real-time video and audio communication
- Peer-to-peer connection (no server-side video processing)
- Simple and clean user interface
- Automatic room creation with unique URLs
- Works on modern web browsers
- No installation required

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Webcam and microphone access
- Internet connection
- Scaledrone account (for signaling service)

## Setup

1. Clone this repository:
```bash
git clone [your-repository-url]
```

2. Sign up for a free Scaledrone account at [https://www.scaledrone.com/](https://www.scaledrone.com/)

3. Get your channel ID from Scaledrone and replace it in `script.js`:
```javascript
const drone = new ScaleDrone('YOUR_CHANNEL_ID');
```

4. Host the files on a web server (local or remote)

## Usage

1. Open the application in your web browser
2. Allow camera and microphone access when prompted
3. Share the URL with the person you want to video chat with
4. The other person opens the URL and allows camera/microphone access
5. The video call will start automatically

## Technical Details

### Technologies Used

- WebRTC for peer-to-peer communication
- Scaledrone for signaling
- HTML5 for video elements
- CSS for styling
- JavaScript for application logic

### Architecture

- **Signaling**: Uses Scaledrone as the signaling server to exchange connection information
- **STUN Server**: Uses Google's STUN server for NAT traversal
- **Peer Connection**: Establishes direct peer-to-peer connection between browsers
- **Media Streams**: Handles local and remote video/audio streams

### File Structure

```
├── index.html          # Main HTML file with UI
├── script.js           # WebRTC and application logic
└── README.md          # This documentation
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Limitations

- Currently supports only 2 participants
- Requires HTTPS for production use
- Requires modern browser with WebRTC support
- Requires camera and microphone access

## Security Considerations

- All video/audio data is transmitted peer-to-peer
- No video data is stored on any server
- Uses secure WebRTC protocols
- Requires HTTPS for production deployment

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- WebRTC for the peer-to-peer communication technology
- Scaledrone for the signaling service
- Google's STUN server for NAT traversal

## Support

If you encounter any issues or have questions, please open an issue in the repository.

## Future Improvements

- Add support for multiple participants
- Implement chat functionality
- Add screen sharing capability
- Improve error handling and reconnection logic
- Add user interface for room management
