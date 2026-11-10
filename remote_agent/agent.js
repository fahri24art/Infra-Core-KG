const axios = require('axios');
const si = require('systeminformation');
const robot = require('robotjs');
const screenshot = require('screenshot-desktop');
const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const AGENT_UUID = require('crypto').randomUUID();
const HOSTNAME = require('os').hostname();

console.log('[AGENT] Starting TCF Remote Desktop Agent v7.05.GOLD');
console.log(`[AGENT] UUID: ${AGENT_UUID}`);
console.log(`[AGENT] Hostname: ${HOSTNAME}`);
console.log(`[AGENT] Server: ${SERVER_URL}`);

let peerConnection = null;
let dataChannel = null;
let screenInterval = null;

// Initialize WebRTC Peer Connection
function createPeerConnection() {
    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    peerConnection = new RTCPeerConnection(config);

    // Data channel for mouse/keyboard input
    dataChannel = peerConnection.createDataChannel('control', {
        ordered: true
    });

    dataChannel.onopen = () => {
        console.log('[AGENT] Data channel opened');
    };

    dataChannel.onmessage = (event) => {
        handleControlMessage(JSON.parse(event.data));
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendIceCandidate(event.candidate, 'agent');
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('[AGENT] Connection state:', peerConnection.connectionState);
    };

    return peerConnection;
}

// Handle mouse/keyboard input from viewer
function handleControlMessage(message) {
    try {
        if (message.type === 'mouse') {
            const { x, y, button, action } = message;
            robot.moveMouse(x, y);
            
            if (action === 'click') {
                robot.mouseClick(button);
            } else if (action === 'doubleClick') {
                robot.mouseClick('left', true);
            }
        } else if (message.type === 'keyboard') {
            const { key, modifier } = message;
            if (modifier) {
                robot.keyToggle(modifier, 'down');
            }
            robot.keyTap(key);
            if (modifier) {
                robot.keyToggle(modifier, 'up');
            }
        }
    } catch (err) {
        console.error('[AGENT] Control error:', err);
    }
}

// Capture screen and send via data channel
async function captureScreen() {
    try {
        const img = await screenshot();
        // Convert to base64 and send
        const base64 = img.toString('base64');
        
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({
                type: 'frame',
                data: base64
            }));
        }
    } catch (err) {
        console.error('[AGENT] Screen capture error:', err);
    }
}

// Send ICE candidate to signaling server
async function sendIceCandidate(candidate, type) {
    try {
        await axios.post(`${SERVER_URL}/api/webrtc/ice/${AGENT_UUID}`, {
            candidate,
            type
        });
    } catch (err) {
        console.error('[AGENT] ICE send error:', err);
    }
}

// Poll for ICE candidates
async function pollIceCandidates(type) {
    setInterval(async () => {
        try {
            const res = await axios.get(`${SERVER_URL}/api/webrtc/ice/${AGENT_UUID}?type=${type}`);
            const candidates = res.data.candidates || [];
            
            for (const candidate of candidates) {
                await peerConnection.addIceCandidate(new RTCSessionDescription(candidate));
            }
        } catch (err) {
            // Ignore errors during polling
        }
    }, 1000);
}

// Create and send offer
async function createOffer() {
    try {
        peerConnection = createPeerConnection();
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Send offer to signaling server
        await axios.post(`${SERVER_URL}/api/webrtc/offer`, {
            uuid: AGENT_UUID,
            offer: offer.sdp
        });
        
        console.log('[AGENT] Offer sent, waiting for viewer...');
        
        // Poll for answer
        pollForAnswer();
        pollIceCandidates('viewer');
        
    } catch (err) {
        console.error('[AGENT] Offer error:', err);
    }
}

// Poll for answer from viewer
async function pollForAnswer() {
    const interval = setInterval(async () => {
        try {
            const res = await axios.get(`${SERVER_URL}/api/webrtc/answer/${AGENT_UUID}`);
            const { answer, status } = res.data;
            
            if (status === 'connected' && answer) {
                clearInterval(interval);
                await peerConnection.setRemoteDescription(new RTCSessionDescription({
                    type: 'answer',
                    sdp: answer
                }));
                
                console.log('[AGENT] Connected! Starting screen capture...');
                screenInterval = setInterval(captureScreen, 100); // 10 FPS
            }
        } catch (err) {
            // Ignore polling errors
        }
    }, 1000);
}

// Register agent with server
async function registerAgent() {
    try {
        const specs = await si.osInfo();
        
        await axios.post(`${SERVER_URL}/api/network/agents/register`, {
            uuid: AGENT_UUID,
            hostname: HOSTNAME,
            ip_address: await getLocalIP(),
            os: specs.platform,
            specs: {
                os: `${specs.platform} ${specs.release}`,
                arch: specs.arch,
                hostname: specs.hostname
            }
        });
        
        console.log('[AGENT] Registered successfully');
        
        // Start remote desktop session
        createOffer();
        
    } catch (err) {
        console.error('[AGENT] Registration error:', err);
        console.log('[AGENT] Retrying in 5 seconds...');
        setTimeout(registerAgent, 5000);
    }
}

// Get local IP address
async function getLocalIP() {
    try {
        const interfaces = require('os').networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    } catch (err) {
        console.error('[AGENT] IP detection error:', err);
    }
    return '127.0.0.1';
}

// Heartbeat to keep agent online
setInterval(async () => {
    try {
        await axios.post(`${SERVER_URL}/api/network/agents/register`, {
            uuid: AGENT_UUID,
            hostname: HOSTNAME,
            ip_address: await getLocalIP(),
            agent_status: 'Online'
        });
    } catch (err) {
        console.error('[AGENT] Heartbeat error:', err);
    }
}, 30000); // Every 30 seconds

// Start agent
registerAgent();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('[AGENT] Shutting down...');
    if (screenInterval) clearInterval(screenInterval);
    if (peerConnection) peerConnection.close();
    process.exit(0);
});
