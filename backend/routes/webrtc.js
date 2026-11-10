const express = require('express');
const router = express.Router();

// Store active WebRTC sessions (in production, use Redis)
const sessions = new Map();

// POST /api/webrtc/offer - Receive offer from agent
router.post('/offer', async (req, res) => {
    try {
        const { uuid, offer } = req.body;
        console.log(`[WebRTC] Offer received from agent: ${uuid}`);
        
        sessions.set(uuid, {
            offer,
            answer: null,
            iceCandidates: [],
            status: 'waiting_for_viewer'
        });
        
        res.json({ success: true, sessionId: uuid });
    } catch (err) {
        console.error('[WebRTC] Offer error:', err);
        res.status(500).json({ error: 'Failed to process offer' });
    }
});

// GET /api/webrtc/offer/:uuid - Get offer for viewer
router.get('/offer/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const session = sessions.get(uuid);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({ offer: session.offer });
    } catch (err) {
        console.error('[WebRTC] Get offer error:', err);
        res.status(500).json({ error: 'Failed to get offer' });
    }
});

// POST /api/webrtc/answer/:uuid - Receive answer from viewer
router.post('/answer/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const { answer } = req.body;
        console.log(`[WebRTC] Answer received for session: ${uuid}`);
        
        const session = sessions.get(uuid);
        if (session) {
            session.answer = answer;
            session.status = 'connected';
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('[WebRTC] Answer error:', err);
        res.status(500).json({ error: 'Failed to process answer' });
    }
});

// GET /api/webrtc/answer/:uuid - Get answer for agent
router.get('/answer/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const session = sessions.get(uuid);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({ answer: session.answer, status: session.status });
    } catch (err) {
        console.error('[WebRTC] Get answer error:', err);
        res.status(500).json({ error: 'Failed to get answer' });
    }
});

// POST /api/webrtc/ice/:uuid - ICE candidates
router.post('/ice/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const { candidate, type } = req.body; // type: 'agent' or 'viewer'
        
        const session = sessions.get(uuid);
        if (session) {
            if (!session.iceCandidates[type]) {
                session.iceCandidates[type] = [];
            }
            session.iceCandidates[type].push(candidate);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('[WebRTC] ICE error:', err);
        res.status(500).json({ error: 'Failed to process ICE candidate' });
    }
});

// GET /api/webrtc/ice/:uuid - Get ICE candidates
router.get('/ice/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const { type } = req.query; // type: 'agent' or 'viewer'
        
        const session = sessions.get(uuid);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const candidates = session.iceCandidates[type] || [];
        res.json({ candidates });
    } catch (err) {
        console.error('[WebRTC] Get ICE error:', err);
        res.status(500).json({ error: 'Failed to get ICE candidates' });
    }
});

// DELETE /api/webrtc/session/:uuid - End session
router.delete('/session/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        sessions.delete(uuid);
        console.log(`[WebRTC] Session ended: ${uuid}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[WebRTC] End session error:', err);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

module.exports = router;
