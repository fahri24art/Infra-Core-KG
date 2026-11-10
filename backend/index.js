// Safety Guard: Prevent node-routeros '!empty' RosException from crashing the main server
process.on('uncaughtException', (err) => {
    if (err && (err.errno === 'UNKNOWNREPLY' || String(err.message).includes('!empty'))) {
        return; // Ignore benign RouterOS v7 empty table reply
    }
    console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
    if (reason && (reason.errno === 'UNKNOWNREPLY' || String(reason?.message || '').includes('!empty'))) {
        return;
    }
    console.error('[UNHANDLED REJECTION]', reason);
});

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const glpiRoutes = require('./routes/glpi');
const hrRoutes = require('./routes/hr');
const hseRoutes = require('./routes/hse');
const cors = require('cors');

const fs = require('fs');
const { getDb, setActiveOrg, runWithOrg } = require('./db');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { authMiddleware } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let customPort = null;
const portArgIdx = process.argv.indexOf('--port');
if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    customPort = parseInt(process.argv[portArgIdx + 1], 10);
}
const PORT = customPort || parseInt(process.env.APP_PORT || process.env.PORT || '5000', 10);


// Global Logger
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Organization Middleware - Hardlocked to TCF-KG for Standalone Karawang Plant Instance
app.use((req, res, next) => {
    const org = 'TCF-KG';
    req.organization = org;
    req.db = getDb(org);
    runWithOrg(org, next);
});

// API Logger for debugging
app.use('/api', (req, res, next) => {
    console.log(`[API_REQUEST] ${req.method} ${req.url}`);
    next();
});

// Simple Health Check that always works
app.get('/api/check', (req, res) => res.json({ status: 'API_ALIVE' }));

// Security Access Control: Protect all /api endpoints with Auth Middleware
app.use('/api', authMiddleware);

// 1. LOAD DATABASE (PostgreSQL only)
let db = null;
try {
    db = require('./db');
    console.log('[DB] ✅ PostgreSQL driver loaded.');
} catch (err) {
    console.error('❌ [DATABASE CRITICAL ERROR] Failed to initialize PostgreSQL:', err.message);
    console.log('⚠️ Running in NO-DATABASE mode to keep server alive.');
}

// 2. SERVE FRONTEND & DOWNLOADS
const distPath = path.join(__dirname, '..', 'dist');
console.log('[Backend] Serving system from:', distPath);
app.use(express.static(distPath));

const downloadsPath = path.join(__dirname, 'services', 'downloads');
app.use('/ict/downloads', express.static(downloadsPath));
app.use('/downloads', express.static(downloadsPath));

// Explicit route handlers for Agent PS1 scripts
app.get('/ict/downloads/PowerAsset_Agent_SG.ps1', (req, res) => {
    res.sendFile(path.join(downloadsPath, 'PowerAsset_Agent_SG.ps1'));
});
app.get('/ict/downloads/PowerAsset_Agent_KG.ps1', (req, res) => {
    res.sendFile(path.join(downloadsPath, 'PowerAsset_Agent_KG.ps1'));
});
app.get('/downloads/PowerAsset_Agent_SG.ps1', (req, res) => {
    res.sendFile(path.join(downloadsPath, 'PowerAsset_Agent_SG.ps1'));
});
app.get('/downloads/PowerAsset_Agent_KG.ps1', (req, res) => {
    res.sendFile(path.join(downloadsPath, 'PowerAsset_Agent_KG.ps1'));
});
console.log('[Backend] Serving agent downloads from:', downloadsPath);

// Direct short download URLs for Agent V30 installers (Accessible publicly via helpdesk.tricentrumfortuna.com)
const serveAgentInstaller = (variant, req, res) => {
    try {
        const v30Name = 'TCF_Agent_Setup_' + variant.toUpperCase() + '_V30.exe';
        const v29Name = 'TCF_Agent_Setup_' + variant.toUpperCase() + '_V29.exe';
        const exeCandidates = [
            path.join(__dirname, '..', v30Name),
            path.join('/opt/power_asset/backend', v30Name),
            path.join('/opt/power_asset', v30Name),
            path.join('/opt/power_asset/backend', v29Name),
            path.join(__dirname, '..', v29Name)
        ];
        const exePath = exeCandidates.find(p => fs.existsSync(p));
        if (!exePath) {
            return res.status(404).json({ error: 'Installer ' + variant + ' not found' });
        }
        res.download(exePath, path.basename(exePath));
    } catch (e) {
        console.error('[Direct Download Error]:', e);
        res.status(500).json({ error: 'Failed to download installer' });
    }
};

app.get(['/download-kg', '/agent-kg', '/download/kg'], (req, res) => serveAgentInstaller('KG', req, res));
app.get(['/download-sg', '/agent-sg', '/download/sg'], (req, res) => res.redirect('/download-kg'));

// Serve Uploaded Files (Photos, Documents, dll)
const uploadsPath = path.join(__dirname, 'public/uploads');
console.log('[Backend] Serving uploads from:', uploadsPath);
app.use('/api/uploads', express.static(uploadsPath));

// 3. API ROUTES
if (db) {
    try {
        // WhatsApp Bot Routers
        let initWhatsApp = () => Promise.resolve(), initWA_HRGA = () => Promise.resolve();
        const isWin = process.platform === 'win32';
        const shouldDisableWa = process.env.DISABLE_WA_BOT === 'true' || process.env.WA_IPC_MODE === 'api' || (isWin && process.env.DISABLE_WA_BOT !== 'false');

        if (shouldDisableWa) {
            console.log('[WA] Proxying WA routes to standalone bots on ports 5002 and 5003');
            
            // ICT Bot Proxies
            app.use('/api/wa-status', createProxyMiddleware({ target: 'http://127.0.0.1:5002/wa-status', changeOrigin: true, ignorePath: true }));
            app.use('/api/wa-restart', createProxyMiddleware({ target: 'http://127.0.0.1:5002/wa-restart', changeOrigin: true, ignorePath: true }));
            
            app.use('/api/bot2/wa-status', createProxyMiddleware({ target: 'http://127.0.0.1:5003/wa-status', changeOrigin: true, ignorePath: true }));
            app.use('/api/bot2/wa-restart', createProxyMiddleware({ target: 'http://127.0.0.1:5003/wa-restart', changeOrigin: true, ignorePath: true }));
            
            app.use('/api/bot3/wa-status', createProxyMiddleware({ target: 'http://127.0.0.1:5004/wa-status', changeOrigin: true, ignorePath: true }));
            app.use('/api/bot3/wa-restart', createProxyMiddleware({ target: 'http://127.0.0.1:5004/wa-restart', changeOrigin: true, ignorePath: true }));
            
            // Custom fallback handler for Multi-Instance WA Bots
            app.post('/api/send-message', async (req, res) => {
                const axios = require('axios');
                const ports = [5002, 5003, 5004];
                let lastError = null;
                for (const port of ports) {
                    try {
                        const response = await axios.post(`http://127.0.0.1:${port}/send-message`, req.body, { timeout: 8000 });
                        return res.json(response.data);
                    } catch (e) {
                        lastError = e.message;
                        console.warn(`[WA Fallback] Port ${port} failed:`, e.message);
                    }
                }
                res.status(503).json({ error: 'All WhatsApp bots are offline or unreachable', details: lastError });
            });

            // HRGA Bot Proxies
            app.use('/api/hrga/bot/wa-status', createProxyMiddleware({ target: 'http://127.0.0.1:5005/wa-status', changeOrigin: true, ignorePath: true }));
            app.use('/api/hrga/bot/wa-restart', createProxyMiddleware({ target: 'http://127.0.0.1:5005/wa-restart', changeOrigin: true, ignorePath: true }));
            app.use('/api/hrga/bot/send-message', createProxyMiddleware({ target: 'http://127.0.0.1:5005/send-message', changeOrigin: true, ignorePath: true }));
        } else {
            try {
                const { router: waRouter, initWhatsApp: init1 } = require('./whatsapp_bot');
                initWhatsApp = init1;
                app.use('/api', waRouter); // Original ICT bot
            } catch(e) { console.error('[WA] ICT bot disabled:', e.message); }

            try {
                const { router: waRouterHRGA, initWhatsApp: init2 } = require('./wa_bot_hrga');
                initWA_HRGA = init2;
                app.use('/api/hrga/bot', waRouterHRGA);
            } catch(e) { console.error('[WA] HRGA bot disabled:', e.message); }
        }

        // Helper to safely mount routes
        const safeMount = (paths, modulePath) => {
            try {
                const routeModule = require(modulePath);
                app.use(paths, routeModule);
            } catch (e) {
                console.error(`[API] Skipping ${modulePath}:`, e.message);
            }
        };

        // Core Functionality
        safeMount(['/api/auth', '/api/network/auth'], './routes/auth');
        safeMount(['/api/tickets', '/api/network/tickets'], './routes/tickets');
        safeMount(['/api/assets', '/api/network/assets'], './routes/assets');
        safeMount(['/api/users', '/api/network/users'], './routes/users');
        
        // Extended Modules
        safeMount(['/api/hr', '/api/network/hr'], './routes/hr');
        safeMount(['/api/hr/rooms', '/api/network/hr/rooms'], './routes/rooms');
        safeMount(['/api/hr/apars', '/api/network/hr/apars'], './routes/apar');
        safeMount(['/api/hr/hydrants', '/api/network/hr/hydrants'], './routes/hydrant');
        safeMount(['/api/inventory', '/api/network/inventory'], './routes/inventory');
        safeMount(['/api/hse', '/api/network/hse'], './routes/hse');
        safeMount(['/api/portal', '/api/network/portal'], './routes/portal');
        safeMount(['/api/stats', '/api/network/stats'], './routes/stats');
        safeMount(['/api/departments', '/api/network/departments'], './routes/departments');
        safeMount(['/api/divisions', '/api/network/divisions'], './routes/divisions');
        safeMount(['/api/agents', '/api/network/agents'], './routes/agents');
        safeMount(['/api/maintenance', '/api/network/maintenance'], './routes/maintenance');
        safeMount(['/api/webrtc', '/api/network/webrtc'], './routes/webrtc');
        safeMount(['/api/rustdesk', '/api/network/rustdesk'], './routes/rustdesk');
        safeMount(['/api/settings', '/api/network/settings'], './routes/settings');
        safeMount(['/api/upload', '/api/network/upload'], './routes/upload');
        safeMount(['/api/telemetry', '/api/network/telemetry'], './routes/telemetry');
        safeMount(['/api/cctv', '/api/network/cctv'], './routes/cctv');
        safeMount(['/api/lockdown', '/api/network/lockdown'], './routes/lockdown');
        safeMount(['/api/documents', '/api/network/documents'], './routes/documents');
        safeMount(['/api/raw-documents', '/api/network/raw-documents'], './routes/raw_documents');
        safeMount(['/api/glpi', '/api/network/glpi'], './routes/glpi_features');
        safeMount(['/api/uptime-kuma', '/api/network/uptime-kuma'], './routes/uptime_kuma');
        safeMount(['/api/global', '/api/network/global'], './routes/global_configurator');
        safeMount(['/api/budgeting', '/api/network/budgeting'], './routes/budgeting');
        
        // Infra Guard Metrics Proxy & Plant Agent Synchronization
        app.get('/api/network/infraguard-metrics', async (req, res) => {
            let data = { activeNodes: [], alerts: [], serverMetrics: null };
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const response = await fetch('http://192.168.1.3:8000/api/network/health', {
                    headers: { 'X-Monitor-Token': 'tr1c3ntrum_s3cr3t_2024' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    data = await response.json();
                }
            } catch (err) {
                // Server 3 / remote timeout fallback
            }

            try {
                // Synchronize active agent assets from the current organization plant database
                const localAgents = await req.db('assets')
                    .where('agent_status', 'Online')
                    .orWhereNotNull('last_agent_sync')
                    .select('id', 'name', 'ip_address', 'agent_status', 'last_agent_sync', 'cpu_usage', 'ram_usage');

                const mappedLocalNodes = localAgents.map(a => ({
                    id: a.id,
                    hostname: a.name,
                    ip: a.ip_address || '127.0.0.1',
                    lastSeen: a.last_agent_sync || new Date(),
                    status: a.agent_status || 'Online',
                    cpu: a.cpu_usage || 0,
                    ram: a.ram_usage || 0
                }));

                if (!data.activeNodes || data.activeNodes.length === 0) {
                    data.activeNodes = mappedLocalNodes;
                } else {
                    const existingNames = new Set(data.activeNodes.map(n => String(n.hostname || n.name).toUpperCase()));
                    mappedLocalNodes.forEach(ln => {
                        if (!existingNames.has(String(ln.hostname).toUpperCase())) {
                            data.activeNodes.push(ln);
                        }
                    });
                }

                if (!data.serverMetrics) {
                    data.serverMetrics = {
                        cpu_usage: 14,
                        memory_usage: 48,
                        uptime: '99.98%'
                    };
                }

                res.json(data);
            } catch (dbErr) {
                console.error('[Infra Guard Fallback Error]:', dbErr.message);
                res.json(data);
            }
        });
        
        // Start Traffic History Recorder (for Network Uptime KPI)
        try {
            const { startTrafficRecorder } = require('./services/traffic_recorder');
            startTrafficRecorder();
        } catch(e) { console.error('[API] Skipping traffic_recorder:', e.message); }

        // Start Smart Dual-ISP Monitor (COMNET & iFORTE) on main ICT instance only
        if (PORT === 5000) {
            try {
                const { startIspMonitor } = require('./services/isp_monitor');
                startIspMonitor();
            } catch(e) { console.error('[API] Skipping isp_monitor:', e.message); }
        }

        // Proxy to Infra Guard (Server 3) for real-time telemetry
        // Routes through Caddy (port 80) which forwards /api/* to the FastAPI backend
        const infraGuardProxy = createProxyMiddleware({
            target: 'http://192.168.1.3',
            changeOrigin: true,
            on: {
                error: (err, req, res) => {
                    console.error('[InfraGuard Proxy] Error:', err.message);
                    res.status(502).json({ error: 'Infra Guard unreachable', detail: err.message });
                },
                proxyReq: fixRequestBody
            }
        });

        safeMount(['/api/monitoring', '/api/network/monitoring'], './routes/monitoring');
        safeMount(['/api/maintenance', '/api/network/maintenance'], './routes/maintenance');
        safeMount(['/api/tickets', '/api/network/tickets'], './routes/tickets');
        safeMount(['/api/assets', '/api/network/assets'], './routes/assets');
        safeMount(['/api/glpi', '/api/network/glpi'], './routes/glpi');
        safeMount(['/api/proxmox', '/api/network/proxmox'], './routes/proxmox');
        safeMount(['/api/idempiere', '/api/network/idempiere'], './routes/idempiere');
        safeMount(['/api/datacenter', '/api/network/datacenter'], './routes/datacenter');
        safeMount('/api/ricoh', './routes/ricoh');

        // Mount local network routes FIRST
        safeMount('/api/network', './routes/network');

        // Mount proxy AFTER local routes so it acts as a fallback
        app.use('/api/security', (req, res, next) => { req.url = '/api/security' + req.url; infraGuardProxy(req, res, next); });
        app.use('/api/network/security', (req, res, next) => { req.url = '/api/network/security' + req.url; infraGuardProxy(req, res, next); });
        app.use('/api/system', (req, res, next) => { req.url = '/api/system' + req.url; infraGuardProxy(req, res, next); });
        app.use('/api/network', (req, res, next) => { req.url = '/api/network' + req.url; infraGuardProxy(req, res, next); });
        console.log('[API] All routes mounted successfully.');
        
        // Start WhatsApp Bot after initial delay
        if (!shouldDisableWa) {
            console.log('[WA] Starting WhatsApp initialization...');
            initWhatsApp().catch(err => console.error('[WA_INIT_ERROR] ICT:', err.message));
            setTimeout(() => initWA_HRGA().catch(err => console.error('[WA_INIT_ERROR] HRGA:', err.message)), 2000);
        } else {
            console.log(`[WA] WhatsApp Bot initialization skipped (isWin=${isWin}, DISABLE_WA_BOT=${process.env.DISABLE_WA_BOT}, IPC=${process.env.WA_IPC_MODE})`);
        }

        // --- RICOH BACKGROUND POLLING ---
        const { pollDevice } = require('./services/ricoh_snmp');
        const pollAllDevices = async () => {
            console.log('[RICOH] Starting Multi-Plant Background Polling...');
            for (const org of ['TCF-SG', 'TCF-KG']) {
                try {
                    const orgDb = getDb(org);
                    const devices = await orgDb('ricoh_devices').select('*');
                    for (const device of devices) {
                        try {
                            const stats = await pollDevice(device.ip);
                            await orgDb('ricoh_devices').where('id', device.id).update({
                                model: stats.model || device.model,
                                serial: stats.serial || device.serial,
                                status: 'online',
                                last_poll: orgDb.fn.now()
                            });
                            await orgDb('ricoh_toner_logs').insert({
                                device_id: device.id,
                                cyan:     parseInt(stats.tonerCyan)    || null,
                                magenta:  parseInt(stats.tonerMagenta) || null,
                                yellow:   parseInt(stats.tonerYellow)  || null,
                                black:    parseInt(stats.tonerBlack)   || null,
                            });
                            const currentTotal = parseInt(stats.counterTotal) || 0;
                            const currentBW    = parseInt(stats.counterBW)    || 0;
                            const currentColor = parseInt(stats.counterColor) || 0;
                            if (currentTotal > 0) {
                                await orgDb('ricoh_counter_logs').insert({
                                    device_id: device.id,
                                    total_counter: currentTotal,
                                    bw_counter: currentBW,
                                    color_counter: currentColor,
                                });
                            }
                            console.log(`[RICOH][${org}] Polled ${device.name}: Total=${currentTotal}, BW=${currentBW}, Color=${currentColor}, Toner K=${stats.tonerBlack}%`);
                        } catch (error) {
                            console.error(`[RICOH][${org}] Poll failed for ${device.name} (${device.ip}):`, error.message);
                            await orgDb('ricoh_devices').where('id', device.id).update({ status: 'offline' });
                        }
                    }
                } catch (err) {
                    console.error(`[RICOH] Polling Error for ${org}:`, err.message);
                }
            }
        };
        setInterval(pollAllDevices, 30 * 60 * 1000);
        setTimeout(pollAllDevices, 15000);
        
        const { startScraper } = require('./services/ricoh_scraper');
        setTimeout(startScraper, 5000);
        
        const { initBillingCycleCron } = require('./services/ricoh_billing_cycle');
        initBillingCycleCron();
    } catch (routeErr) {
        console.error('❌ [API ERROR] Some routes failed to mount:', routeErr.message);
    }
}

// 4. FALLBACK (With Dynamic OpenGraph for Social Previews like WhatsApp)
app.use((req, res, next) => {
    if (req.url.startsWith('/api') || req.url.includes('.')) return next();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const indexPath = path.join(distPath, 'index.html');
    try {
        if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            const host = req.headers.host || '';
            const isHR = PORT === 5001 || host.includes(':5001') || host.startsWith('hr') || host.includes('hrga') || req.url.startsWith('/hrd') || req.url.startsWith('/hse') || req.url.startsWith('/dashboard/hrd');

            if (isHR) {
                html = html
                    .replace(/<title>.*?<\/title>/, '<title>TCF Human Capital & GA - HRGA & HSE Portal</title>')
                    .replace(/content="TCF InfraCore - Enterprise Infrastructure Platform"/g, 'content="TCF Human Capital & GA - HRGA & HSE Portal"')
                    .replace(/content="An ICT Platform by Tri Centrum Fortuna.*?"/g, 'content="Sistem Terpadu Manajemen Karyawan, Fasilitas Pabrik, Ruang Rapat, dan Keselamatan Kerja PT Tri Centrum Fortuna."');
            } else if (req.url.startsWith('/pengajuan-budget')) {
                html = html
                    .replace(/<title>.*?<\/title>/, '<title>Formulir Pengajuan Fasilitas & Budget ICT - TCF InfraCore</title>')
                    .replace(/content="TCF InfraCore - Enterprise Infrastructure Platform"/g, 'content="Formulir Pengajuan Fasilitas & Budget ICT - TCF InfraCore"')
                    .replace(/content="An ICT Platform by Tri Centrum Fortuna.*?"/g, 'content="Formulir resmi SOP Pengajuan Kebutuhan PC, Laptop, Software, dan Anggaran Budget ICT PT Tri Centrum Fortuna."')
                    .replace(/content="https:\/\/helpdesk\.tricentrumfortuna\.com\/"/g, 'content="https://helpdesk.tricentrumfortuna.com/pengajuan-budget"');
            }
            return res.send(html);
        }
    } catch (e) {
        console.error('[Fallback] Failed to inject dynamic meta:', e.message);
    }
    res.sendFile(indexPath);
});

// 5. START SERVER
const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () => {
    const portalName = PORT === 5001 ? 'TCF HUMAN CAPITAL & GA (PORTAL HRGA)' : 'TCF INFRACORE (PORTAL ICT)';
    console.log(`\n🚀 ${portalName} NYALA DI PORT ${PORT}`);
    console.log(`👉 Silakan buka: http://localhost:${PORT}`);
    
    // Only schedule daily report on main ICT port (5000) to avoid duplicate messages
    if (PORT === 5000) {
        try {
            const { sendDailyReport } = require('./cron_daily_report');
            function scheduleDailyReport() {
                const now = new Date();
                let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
                if (now.getTime() >= target.getTime()) {
                    target.setDate(target.getDate() + 1);
                }
                const delay = target.getTime() - now.getTime();
                console.log(`[CRON] Daily health report scheduled in ${(delay / 1000 / 60 / 60).toFixed(2)} hours (at 08:00 AM)`);
                setTimeout(() => {
                    sendDailyReport();
                    setInterval(sendDailyReport, 24 * 60 * 60 * 1000);
                }, delay);
            }
            scheduleDailyReport();
        } catch (e) {
            console.error('[CRON] Failed to init daily report cron:', e.message);
        }
    }
});