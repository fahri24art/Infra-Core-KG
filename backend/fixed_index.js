const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const db = require('./db');
const path = require('path');
const assetsRouter = require('./routes/assets');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(cors());

// =========================================================================
// Proxy Configuration (Must come BEFORE express.json() for POST bodies)
// =========================================================================

// 1. Bridge API
app.use('/api/bridge', createProxyMiddleware({
    target: 'http://127.0.0.1:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/bridge': '/api' },
}));

// 2. GLPI
app.use('/glpi', createProxyMiddleware({
    target: 'https://aset.tricentrumfortuna.com',
    changeOrigin: true,
    secure: false,
}));

// 3. Python Security API Path Filtered Proxy
// These must be proxied BEFORE express.json() to preserve POST bodies and without stripping paths
app.use(createProxyMiddleware({
    target: 'http://127.0.0.1:8001',
    changeOrigin: true,
    secure: false,
    pathFilter: (path, req) => {
        return (path.startsWith('/api/system') ||
            path.startsWith('/api/agents') ||
            path.startsWith('/api/security') ||
            path.startsWith('/api/network/devices')) && !path.includes('/intelligence');
    },
}));

// Now we can use body parser for LOCAL routes
app.use(express.json());

app.get('/api/debug/db-path', (req, res) => {
    const dbPath = path.resolve(require('./knexfile').development.connection.filename);
    res.json({ dbPath, cwd: process.cwd(), time: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #020617; color: white; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <h1 style="color: #3b82f6; font-size: 3rem; margin-bottom: 10px;">🛰️ PowerGuard Node Engine</h1>
            <p style="color: #94a3b8; font-size: 1.2rem;">Core Backend Service Active on Port 8000</p>
            <div style="margin-top: 40px; padding: 40px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 32px; backdrop-filter: blur(10px); max-width: 500px;">
                <p style="margin-bottom: 20px; font-weight: 500;">Select Access Protocol:</p>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <a href="http://${req.hostname}:3000" style="background: #3b82f6; color: white; text-decoration: none; padding: 15px 30px; border-radius: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">PA Dashboard (Port 3000)</a>
                    <a href="http://${req.hostname}:3001" style="background: #0891b2; color: white; text-decoration: none; padding: 15px 30px; border-radius: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Infra Guard (Port 3001)</a>
                </div>
            </div>
            <p style="margin-top: 40px; font-size: 0.8rem; color: #475569;">© 2025 PT. TRI CENTRUM FORTUNA | Unified Command Interface</p>
        </div>
    `);
});

// Log all requests
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
});

const PORT = process.env.PORT || 8000;

// basic health check
process.on('uncaughtException', (err) => {
    try {
        const fs = require('fs');
        const logPath = path.join(__dirname, 'crash.log');
        fs.writeFileSync(logPath, `[${new Date().toISOString()}] Uncaught Exception: ${err.message}\n${err.stack}\n`, { flag: 'a' });
    } catch (writeErr) {
        console.error('Failed to write to crash.log:', writeErr.message);
    }

    if (err.message && (
        err.message.includes('Tried to process unknown reply') ||
        err.message.includes('Stream closed') ||
        err.message.includes('Socket Error')
    )) {
        console.error('Handled non-critical MikroTik error:', err.message);
        return;
    }

    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    require('fs').writeFileSync('crash.log', `Unhandled Rejection: ${reason}\n`, { flag: 'a' });
    if (reason && reason.message && (
        reason.message.includes('Tried to process unknown reply') ||
        reason.message.includes('Stream closed') ||
        reason.message.includes('Socket Error')
    )) {
        console.error('Handled non-critical MikroTik rejection:', reason.message);
        return;
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', branding: 'Core_Master_API' });
});

// Routes with legacy and new /network prefix support
app.use(['/api/assets', '/api/network/assets'], assetsRouter);
app.use(['/api/maintenance', '/api/network/maintenance'], require('./routes/maintenance'));
app.use(['/api/portal', '/api/network/portal'], require('./routes/portal'));
app.use(['/api/tickets', '/api/network/tickets'], require('./routes/tickets'));
app.use(['/api/auth', '/api/network/auth'], require('./routes/auth'));
app.use(['/api/users', '/api/network/users'], require('./routes/users'));
app.use(['/api/departments', '/api/network/departments'], require('./routes/departments'));
app.use(['/api/divisions', '/api/network/divisions'], require('./routes/divisions'));
app.use(['/api/agents', '/api/network/agents'], require('./routes/agents'));
app.use(['/api/settings', '/api/network/settings'], require('./routes/settings'));
app.use(['/api/security', '/api/network/security'], require('./routes/security_intel'));

// Infra Guard Mock Data Routes
app.use('/api/mock', require('./routes/mock_security'));

// MikroTik specific network routes
app.use('/api/network', require('./routes/network'));

// Stats Endpoint (Dashboard Highlights)
app.get(['/api/stats', '/api/network/stats'], async (req, res) => {
    try {
        const assetsCount = await db('assets').count('id as count').first();
        const assetsMaintenance = await db('assets').where('status', 'Maintenance').count('id as count').first();

        const ticketsAll = await db('tickets').select('status');
        const ticketsStats = {
            open: ticketsAll.filter(t => t.status === 'Open' || t.status === 'New').length,
            inProgress: ticketsAll.filter(t => t.status === 'In Progress').length,
            pending: ticketsAll.filter(t => t.status === 'Pending').length,
            resolved: ticketsAll.filter(t => t.status === 'Resolved' || t.status === 'Closed').length
        };

        const usersCount = await db('users').count('id as count').first();

        res.json({
            assets: {
                total: assetsCount.count || 0,
                inUse: assetsCount.count || 0,
                inStock: 0,
                underMaintenance: assetsMaintenance.count || 0
            },
            tickets: ticketsStats,
            users: { total: usersCount.count || 0 }
        });
    } catch (err) {
        console.error('Stats Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// List Users (Dropdown)
app.get('/api/users', async (req, res) => {
    try {
        const users = await db('users').select('id', 'name').orderBy('name', 'asc');
        res.json(users);
    } catch (err) {
        console.error('Users Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 4. Fallback Proxy (For anything else starting with /api)
app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:8001',
    changeOrigin: true,
    secure: false,
}));

// Serve static files
const clientBuildPath = path.join(__dirname, '../dist');
app.use(express.static(clientBuildPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('screen-data', ({ roomId, image }) => {
        socket.to(roomId).emit('screen-data', image); // Relay to frontend
    });

    socket.on('remote-control', ({ roomId, event }) => {
        socket.to(roomId).emit('remote-control', event); // Relay to agent
    });

    socket.on('agent-command', ({ roomId, action }) => {
        socket.to(roomId).emit(action); // Relay command to agent
    });

    socket.on('disconnect', () => console.log('Client disconnected', socket.id));
});

// recorder logic remains...
const mikrotik = require('./services/mikrotik');
const startTrafficRecorder = async () => {
    console.log('[Recorder] Starting traffic history recorder...');
    const record = async () => {
        try {
            const settings = await db('settings').where({ section: 'network' }).select('*');
            const config = {};
            settings.forEach(s => {
                try { config[s.key] = JSON.parse(s.value); } catch (e) { config[s.key] = s.value; }
            });

            if (!config.mikrotik_ip || !config.mikrotik_user) return;

            mikrotik.setConfig(config);
            const data = await mikrotik.getDashboardData();

            const iforte = data.traffic.interfaces.find(i => i.name.toLowerCase().includes('iforte')) || { rx: 0, tx: 0 };
            const comnet = data.traffic.interfaces.find(i => i.name.toLowerCase().includes('comtronic') || i.name.toLowerCase().includes('comnet')) || { rx: 0, tx: 0 };

            const isUpValue = (data.system && data.system.uptime !== 'offline') ? 1 : 0;
            await db('traffic_history').insert({
                rx: data.traffic.wan.rx,
                tx: data.traffic.wan.tx,
                rx_iforte: iforte.rx,
                tx_iforte: iforte.tx,
                rx_comnet: comnet.rx,
                tx_comnet: comnet.tx,
                is_up: isUpValue,
                server_up: isUpValue,
                is_up_iforte: (iforte.rx > 0 || iforte.tx > 0) ? 1 : 0,
                is_up_comnet: (comnet.rx > 0 || comnet.tx > 0) ? 1 : 0,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('[Recorder] Error:', err.message);
        }
    };

    record();
    setInterval(record, 5 * 60 * 1000);
};

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Power_Asset] Backend running on port ${PORT}`);
});

startTrafficRecorder();
