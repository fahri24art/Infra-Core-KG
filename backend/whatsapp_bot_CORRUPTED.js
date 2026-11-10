// Polyfill crypto for Node.js 18+
const crypto = require('crypto');
if (!global.crypto) {
    global.crypto = crypto;
}

const express = require('express');
const router = express.Router();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');
const db = require('./db');

// Global LID to phone number mapping
global.lidToPhoneMap = new Map();

// Custom pino stream to capture sender_pn from protocol logs
const { levels } = pino;
let streamCallCount = 0;
const customStream = {
    write: (data) => {
        streamCallCount++;
        if (streamCallCount <= 5) {
            console.log('[WA_Bot] Stream called, data type:', typeof data, 'isBuffer:', Buffer.isBuffer(data));
        }
        
        let logLine;
        if (typeof data === 'string') {
            logLine = data;
        } else if (Buffer.isBuffer(data)) {
            logLine = data.toString();
        } else {
            logLine = JSON.stringify(data);
        }
        
        // Check if this is a recv log with sender_pn
        const senderPnMatch = logLine.match(/"sender_pn":"([^"]+)"/);
        const fromMatch = logLine.match(/"from":"([^"]+@lid)"/);
        if (senderPnMatch && fromMatch) {
            const senderPn = senderPnMatch[1];
            const from = fromMatch[1];
            const lidId = from.replace('@lid', '');
            if (!global.lidToPhoneMap.has(lidId)) {
                global.lidToPhoneMap.set(lidId, senderPn);
                console.log('[WA_Bot] Mapped LID', lidId, 'to phone', senderPn);
            }
        }
        // Still output to stderr
        process.stderr.write(logLine + '\n');
    }
};

let ostPool = null;
try {
    ostPool = require('./config/osticket_db');
    console.log('[WA_Bot] osTicket DB loaded');
} catch (err) {
    console.warn('[WA_Bot] osTicket DB not available:', err.message);
}

global.waStatus = { status: 'OFFLINE', qr: null, updatedAt: new Date(), mode: 'real' };
let sock = null;

// Reconnection tracking to prevent spam
let reconnectAttempts = 0;
let lastReconnectTime = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_COOLDOWN = 60000; // 60 seconds cooldown between reconnects

const ticketRateLimit = new Map();
const ticketWorkflow = new Map(); // Track ticket workflow state: { ticketNumber, technicianConfirmed, technicianNumber, userApprovalTimer, slaDeadline }
const messageQueue = new Map(); // Queue messages to send when WhatsApp connects: { to, message }
const RATE_LIMIT_MS = 10 * 60 * 1000;

const userStates = new Map();

const ICT_CATEGORIES = [
    { 
        id: 1, 
        name: 'Network',
        tutorial: '🔧 *TROUBLESHOOTING - Network*\n\nLangkah:\n1. Cek kabel LAN dan koneksi ke router\n2. Restart router/modem (tunggu 30 detik)\n3. Cek IP dan ping ke gateway (192.168.1.1)\n\nContact IT jika masih tidak konek.'
    },
    { 
        id: 2, 
        name: 'Perangkat (Laptop/PC)',
        tutorial: '� *TROUBLESHOOTING - Perangkat*\n\nLangkah:\n1. Force restart perangkat (tahan power 10 detik)\n2. Cek adaptor/baterai dan indikator power\n3. Masuk BIOS (F2/F12) jika boot error\n\nContact IT jika masih bermasalah.'
    },
    { 
        id: 3, 
        name: 'Printer',
        tutorial: '� *TROUBLESHOOTING - Printer*\n\nLangkah:\n1. Cek kabel power dan koneksi ke komputer\n2. Cek kertas dan tinta/toner\n3. Restart printer dan reinstall driver\n\nContact IT jika masih error.'
    },
    { 
        id: 4, 
        name: 'CCTV',
        tutorial: '� *TROUBLESHOOTING - CCTV*\n\nLangkah:\n1. Cek kabel power camera\n2. Cek koneksi LAN ke DVR/NVR\n3. Restart DVR/NVR (matikan 30 detik)\n\nContact IT jika masih blank.'
    },
    { 
        id: 5, 
        name: 'Software/Aplikasi',
        tutorial: '� *TROUBLESHOOTING - Software*\n\nLangkah:\n1. Force close aplikasi dan reopen\n2. Restart komputer\n3. Reinstall aplikasi jika error persist\n\nContact IT jika masih bermasalah.'
    },
    { 
        id: 6, 
        name: 'Email/Outlook',
        tutorial: '� *TROUBLESHOOTING - Email*\n\nLangkah:\n1. Cek koneksi internet dan password\n2. Restart Outlook dan cek webmail\n3. Reconfigure account di Control Panel\n\nContact IT jika masih error.'
    },
    { 
        id: 7, 
        name: 'Lainnya',
        tutorial: '� *TROUBLESHOOTING - Umum*\n\nLangkah:\n1. Restart perangkat terkait\n2. Cek koneksi dasar (power/network)\n3. Jelaskan detail masalah ke IT support\n\nTunggu teknisi untuk pemeriksaan.'
    }
];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const logger = pino({ level: 'debug' });

const authDir = path.join(__dirname, 'whatsapp_auth');
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });
}

async function attemptReconnect() {
    reconnectAttempts++;
    lastReconnectTime = Date.now();
    console.log(`[WA_Bot] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    global.waStatus.status = 'RECONNECTING';
    global.waStatus.message = `Reconnecting... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`;
    global.waStatus.updatedAt = new Date();
    await initWhatsApp();
}

async function generateAITutorial(category, description) {
    if (!GEMINI_API_KEY) {
        return null;
    }

    const prompt = `Kamu adalah asisten IT helpdesk yang ramah. Berikan tutorial troubleshooting yang spesifik dan relevan untuk masalah berikut:

Kategori Masalah: ${category}
Deskripsi Masalah: ${description}

PENTING:
1. Tutorial HARUS spesifik untuk kategori "${category}" dan masalah "${description}"
2. Jangan berikan tutorial generik atau tidak relevan
3. Setiap langkah harus langsung terkait dengan masalah yang dijelaskan
4. Gunakan istilah teknis yang tepat untuk kategori tersebut
5. Berikan solusi yang serius dan akurat untuk masalah
6. Tone bisa friendly/casual tapi instruksi harus serius dan bermanfaat

Format jawaban:
🔧 *TROUBLESHOOTING - ${category}*

Langkah:
1. [langkah pertama - spesifik dan langsung]
2. [langkah kedua - relevan dengan masalah]
3. [langkah ketiga - solusi teknis]

Catatan: Gunakan bahasa Indonesia, maksimal 3 langkah, friendly tapi solusi serius dan akurat.`;

    try {
        const data = JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                            const tutorial = response.candidates[0].content.parts[0].text;
                            resolve(tutorial);
                        } else {
                            resolve(null);
                        }
                    } catch (err) {
                        console.error('[WA_Bot] Error parsing AI response:', err);
                        resolve(null);
                    }
                });
            });

            req.on('error', (err) => {
                console.error('[WA_Bot] AI API error:', err);
                resolve(null);
            });

            req.write(data);
            req.end();
        });
    } catch (err) {
        console.error('[WA_Bot] Error calling AI:', err);
        return null;
    }
}

async function initWhatsApp() {
    console.log('[WA_Bot] Initializing WhatsApp...');
    
    try {
        // TEMPORARILY HARDCODED TO 'real' TO BYPASS MODE DETECTION ISSUES
        let mode = 'real';
        console.log('[WA_Bot] Mode hardcoded to:', mode);

        global.waStatus.mode = mode;

        if (mode === 'mock') {
            console.log('[WA_Bot] Mock mode enabled, skipping real initialization');
            global.waStatus.status = 'CONNECTED';
            global.waStatus.message = 'Mock WhatsApp Active';
            return;
        }

        if (mode === 'wuzapi') {
            console.log('[WA_Bot] WUZAPI mode enabled, internal Baileys bot disabled');
            global.waStatus.status = 'WUZAPI_DISABLED';
            global.waStatus.message = 'Internal Baileys bot disabled (external WAHA integration)';
            return;
        }

        console.log('[WA_Bot] Starting WhatsApp with Baileys...');
        
        // Ensure auth directory exists (might have been cleared after logout)
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
            console.log('[WA_Bot] Auth directory recreated');
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        
        // Use proxy only if configured in environment
        const proxyUrl = process.env.WA_PROXY_URL;
        let agent = null;
        
        if (proxyUrl) {
            console.log('[WA_Bot] Using proxy:', proxyUrl);
            agent = new HttpsProxyAgent(proxyUrl);
        } else {
            console.log('[WA_Bot] No proxy configured, connecting directly');
        }
        
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`[WA_Bot] Using WA v${version.join('.')}, isLatest: ${isLatest}`);
        
        sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'debug' }, customStream),
            browser: ['TCF-App-' + Date.now(), 'Chrome', '111.0.0.0'],
            timeout: 300000,
            connectTimeoutMs: 300000,
            keepAliveIntervalMs: 60000,
            retryRequestDelayMs: 10000,
            maxMsgRetryCount: 30,
            defaultQueryTimeoutMs: 120000,
            fireInitQueries: true,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            getMessage: true,
            agent: agent,
            fetchAgent: agent,
            shouldIgnoreJid: (jid) => {
                // Ignore status broadcasts to prevent reconnect loops
                return jid === 'status@broadcast';
            }
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            console.log('[WA_Bot] Connection update:', update);
            
            if (qr) {
                console.log('[WA_Bot] QR Code received');
                // Reset reconnect attempts - user hasn't scanned yet, not a failure
                reconnectAttempts = 0;
                lastReconnectTime = 0;
                global.waStatus.status = 'WAITING_QR';
                global.waStatus.qr = qr;
                global.waStatus.updatedAt = new Date();
                global.waStatus.message = 'Scan QR Code ini di aplikasi WhatsApp Anda';
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('[WA_Bot] Connection closed. Reconnecting:', shouldReconnect);
                console.log('[WA_Bot] Disconnect reason:', lastDisconnect?.error?.message);
                
                if (shouldReconnect) {
                    const now = Date.now();
                    const timeSinceLastReconnect = now - lastReconnectTime;
                    
                    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                        console.log('[WA_Bot] Max reconnect attempts reached. Clearing auth and stopping.');
                        // Clear auth folder to force fresh QR on next restart
                        if (fs.existsSync(authDir)) {
                            fs.rmSync(authDir, { recursive: true, force: true });
                            console.log('[WA_Bot] Auth folder cleared');
                        }
                        // Also clear old /tmp auth folder if exists
                        if (fs.existsSync('/tmp/whatsapp_auth')) {
                            fs.rmSync('/tmp/whatsapp_auth', { recursive: true, force: true });
                            console.log('[WA_Bot] Old /tmp auth folder cleared');
                        }
                        reconnectAttempts = 0;
                        global.waStatus.status = 'DISCONNECTED';
                        global.waStatus.message = 'Session cleared. Please restart to scan new QR.';
                        global.waStatus.error = lastDisconnect?.error?.message || null;
                        global.waStatus.updatedAt = new Date();
                        return;
                    }
                    
                    if (timeSinceLastReconnect < RECONNECT_COOLDOWN) {
                        const cooldownRemaining = Math.ceil((RECONNECT_COOLDOWN - timeSinceLastReconnect) / 1000);
                        console.log(`[WA_Bot] Cooldown active. Waiting ${cooldownRemaining}s before reconnect...`);
                        setTimeout(() => {
                            console.log('[WA_Bot] Cooldown expired. Attempting reconnect...');
                            attemptReconnect();
                        }, RECONNECT_COOLDOWN - timeSinceLastReconnect);
                        global.waStatus.status = 'DISCONNECTED';
                        global.waStatus.message = `Cooldown: ${cooldownRemaining}s before reconnect`;
                        global.waStatus.error = lastDisconnect?.error?.message || null;
                        global.waStatus.updatedAt = new Date();
                        return;
                    }
                    
                    attemptReconnect();
                } else {
                    // User logged out - clear auth folder and reset
                    console.log('[WA_Bot] User logged out. Clearing auth folder...');
                    if (fs.existsSync(authDir)) {
                        fs.rmSync(authDir, { recursive: true, force: true });
                        console.log('[WA_Bot] Auth folder cleared after logout');
                    }
                    // Also clear old /tmp auth folder if exists
                    if (fs.existsSync('/tmp/whatsapp_auth')) {
                        fs.rmSync('/tmp/whatsapp_auth', { recursive: true, force: true });
                        console.log('[WA_Bot] Old /tmp auth folder cleared');
                    }
                    reconnectAttempts = 0;
                    global.waStatus.status = 'DISCONNECTED';
                    global.waStatus.message = 'Logged out. Auth cleared. Click Restart to scan new QR.';
                    global.waStatus.error = lastDisconnect?.error?.message || null;
                    global.waStatus.updatedAt = new Date();
                }
            } else if (connection === 'open') {
                console.log('[WA_Bot] Connection opened');
                reconnectAttempts = 0; // Reset reconnect attempts on successful connection
                global.waStatus.status = 'CONNECTED';
                global.waStatus.qr = null;
                global.waStatus.message = 'Connected to WhatsApp';
                global.waStatus.updatedAt = new Date();
                
                // Process queued messages
                if (messageQueue.size > 0) {
                    console.log(`[WA_Bot] Processing ${messageQueue.size} queued messages...`);
                    (async () => {
                        for (const [queueId, msg] of messageQueue.entries()) {
                            try {
                                await sendWAMessage(msg.to, msg.message);
                                messageQueue.delete(queueId);
                                console.log(`[WA_Bot] Queued message ${queueId} sent successfully`);
                            } catch (err) {
                                console.error(`[WA_Bot] Failed to send queued message ${queueId}:`, err);
                            }
                        }
                    })();
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        console.log('[WA_Bot] Setting up messages.upsert event listener...');
        
        // Capture sender_pn from low-level protocol events
        sock.ev.on('connection.update', (update) => {
            if (update.qr) {
                console.log('[WA_Bot] QR Code received');
            }
        });
        
        // Wait for socket to be ready, then intercept
        setTimeout(() => {
            if (sock.ws) {
                const originalEmit = sock.ws.emit;
                sock.ws.emit = function(event, data) {
                    if (event === 'CB' && data) {
                        try {
                            const dataStr = JSON.stringify(data);
                            const senderPnMatch = dataStr.match(/"sender_pn":"([^"]+)"/);
                            const fromMatch = dataStr.match(/"from":"([^"]+@lid)"/);
                            if (senderPnMatch && fromMatch) {
                                const senderPn = senderPnMatch[1];
                                const from = fromMatch[1];
                                const lidId = from.replace('@lid', '');
                                if (!global.lidToPhoneMap.has(lidId)) {
                                    global.lidToPhoneMap.set(lidId, senderPn);
                                    console.log('[WA_Bot] Mapped LID', lidId, 'to phone', senderPn);
                                }
                            }
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                    return originalEmit.call(this, event, data);
                };
                console.log('[WA_Bot] WebSocket interceptor installed');
            } else {
                console.log('[WA_Bot] WebSocket not available for interception');
            }
        }, 2000);
        
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            console.log('[WA_Bot] ============================================');
            console.log('[WA_Bot] messages.upsert triggered!');
            console.log('[WA_Bot] Type:', type);
            console.log('[WA_Bot] Messages count:', messages.length);
            console.log('[WA_Bot] Timestamp:', new Date().toISOString());
            
            // Process both 'notify' and 'append' types
            if (type !== 'notify' && type !== 'append') {
                console.log('[WA_Bot] Skipping message, type is not notify or append. Type was:', type);
                return;
            }

            for (const msg of messages) {
                try {
                    console.log('[WA_Bot] Processing message, msg.key:', msg.key);
                    if (!msg.message) {
                        console.log('[WA_Bot] Skipping message, no message content');
                        continue;
                    }
                
                // Skip messages from bot itself (fromMe: true) to prevent loops
                if (msg.key.fromMe) {
                    console.log('[WA_Bot] Skipping message from bot itself (fromMe: true)');
                    continue;
                }
                
                // Get the raw JID first
                const rawJid = msg.key.remoteJid;
                console.log('[WA_Bot] Raw JID:', rawJid);
                
                // Extract sender number from JID for database lookup
                let senderNumber = rawJid.replace(/@[a-z.]+$/i, ''); // Remove any suffix (@s.whatsapp.net, @lid, etc)
                console.log('[WA_Bot] After removing suffix:', senderNumber);
                senderNumber = senderNumber.replace(/[^0-9]/g, ''); // Keep only digits
                console.log('[WA_Bot] After removing non-digits:', senderNumber);
                if (senderNumber.startsWith('0')) {
                    senderNumber = '62' + senderNumber.substring(1); // Convert 08xxx to 628xxx
                    console.log('[WA_Bot] After converting 0 to 62:', senderNumber);
                }
                console.log('[WA_Bot] Final senderNumber for DB lookup:', senderNumber);
                
                // IMPORTANT: For sending messages, we MUST use the exact JID the user used to message us.
                // If they used @lid, we MUST reply to @lid. Attempting to map to @s.whatsapp.net 
                // causes WhatsApp Error 463 (Feature Not Allowed) because the channel is LID-based.
                const jid = rawJid;
                console.log('[WA_Bot] Using original JID for reply:', jid);
                
                // Skip status broadcasts
                if (jid === 'status@broadcast') {
                    console.log('[WA_Bot] Skipping status broadcast message');
                    continue;
                }
                
                const messageContent = msg.message.conversation || 
                                     msg.message.extendedTextMessage?.text || 
                                     '';
                
                console.log('[WA_Bot] Message content:', messageContent);
                const senderName = msg.pushName || 'Unknown';
                console.log('[WA_Bot] Final senderNumber:', senderNumber);
                
                // LOG TO DATABASE (INCOMING)
                try {
                    await db('whatsapp_logs').insert({
                        sender_number: senderNumber,
                        sender_name: senderName,
                        message_text: messageContent,
                        direction: 'IN',
                        timestamp: new Date()
                    });
                } catch (logErr) {
                    console.error('[WA_Bot] DB Log Error (IN):', logErr.message);
                }
                
                console.log('[WA_Bot] Checking for #ticket command in:', messageContent);
                if (messageContent.toLowerCase().includes('#ticket')) {
                    console.log(`[WA_Bot] ===========================================`);
                    console.log(`[WA_Bot] #ticket DETECTED from ${senderName} (${senderNumber})`);
                    console.log(`[WA_Bot] JID: ${jid}`);
                    console.log(`[WA_Bot] ===========================================`);
                    
                    // Check if user exists in database
                    let userExists = false;
                    let user = null;
                    try {
                        console.log(`[WA_Bot] Querying database for whatsapp: ${senderNumber}`);
                        user = await db('users').where({ whatsapp: senderNumber }).first();
                        if (user) {
                            userExists = true;
                            console.log(`[WA_Bot] User EXISTS in database: ${user.name}`);
                        } else {
                            console.log(`[WA_Bot] User NOT FOUND in database for number: ${senderNumber}`);
                        }
                    } catch (err) {
                        console.error('[WA_Bot] Error checking user existence:', err);
                    }
                    
                    // If user doesn't exist, ask for registration info
                    if (!userExists) {
                        console.log(`[WA_Bot] User not found, asking for registration info`);
                        userStates.set(senderNumber, { 
                            state: 'register_name', 
                            senderName,
                            whatsapp: senderNumber 
                        });
                        
                        try {
                            console.log(`[WA_Bot] >>> ATTEMPTING TO SEND REGISTRATION MESSAGE`);
                            console.log(`[WA_Bot] To JID: ${jid}`);
                            console.log(`[WA_Bot] Socket connected: ${sock?.user ? 'YES' : 'NO'}`);
                            console.log(`[WA_Bot] Socket user: ${sock?.user?.id || 'N/A'}`);
                            
                            const messageText = `SELAMAT DATANG!\n\nHalo ${senderName},\n\nSepertinya ini pertama kali Anda membuat ticket.\n\nMohon isi data diri Anda untuk registrasi:\n\n1. Nama Lengkap\n2. Department\n\nFormat:\nNama: [nama Anda]\nDepartment: [department Anda]\n\nContoh:\nNama: Budi Santoso\nDepartment: IT`;
                            
                            console.log(`[WA_Bot] Message content preview:`, messageText.substring(0, 50) + '...');
                            
                            const result = await sock.sendMessage(jid, { text: messageText });
                            
                            console.log(`[WA_Bot] >>> MESSAGE SENT SUCCESSFULLY!`);
                            console.log(`[WA_Bot] Result:`, JSON.stringify(result, null, 2));
                        } catch (sendErr) {
                            console.error('[WA_Bot] >>> FAILED TO SEND MESSAGE:');
                            console.error('[WA_Bot] Error:', sendErr);
                            console.error('[WA_Bot] Stack:', sendErr.stack);
                        }
                        continue;
                    }
                    
                    const lastTicketTime = ticketRateLimit.get(senderNumber);
                    const now = Date.now();
                    if (lastTicketTime && (now - lastTicketTime) < RATE_LIMIT_MS) {
                        const remainingTime = Math.ceil((RATE_LIMIT_MS - (now - lastTicketTime)) / 60000);
                        await sock.sendMessage(jid, {
                            text: `⏳ *RATE LIMIT*\n\nHalo ${senderName},\n\nAnda sudah membuat ticket baru-baru ini. Silakan tunggu ${remainingTime} menit lagi sebelum membuat ticket baru. Terima kasih!`
                        });
                        console.log(`[WA_Bot] Rate limited for ${senderNumber}`);
                        continue;
                    }
                    
                    userStates.set(senderNumber, { state: 'category', senderName });
                    
                    let categoryList = '🔧 *PILIH KATEGORI MASALAH*\n\n';
                    ICT_CATEGORIES.forEach(cat => {
                        categoryList += `${cat.id}. ${cat.name}\n`;
                    });
                    categoryList += '\nBalas dengan nomor kategori (1-7)';
                    
                    await sock.sendMessage(jid, {
                        text: categoryList
                    });
                    
                    console.log(`[WA_Bot] Asked ${senderName} for category selection`);
                    continue;
                }
                
                if (messageContent.toLowerCase().startsWith('#close')) {
                    console.log(`[WA_Bot] #close request from ${senderName} (${senderNumber})`);
                    
                    // Check if sender is technician
                    // Passing the full msg object for deeper identification if needed
                    const isTech = await isTechnician(senderNumber, msg);
                    if (!isTech) {
                        await sock.sendMessage(jid, {
                            text: '❌ Maaf, hanya teknisi yang dapat menutup ticket.\nSilakan hubungi teknisi untuk penutupan ticket.'
                        });
                        console.log(`[WA_Bot] ${senderName} (JID: ${jid}) is not a technician, denying close request`);
                        continue;
                    }
                    
                    const parts = messageContent.trim().split(/\s+/);
                    const ticketNumber = parts[1];
                    
                    if (!ticketNumber) {
                        await sock.sendMessage(jid, {
                            text: '❌ Format salah. Gunakan: #close <nomor_ticket> [keterangan]\n\nContoh: #close 1000025 permasalah ada pada print server, sudah di perbaiki spooler nya'
                        });
                        continue;
                    }
                    
                    // Extract resolution note (everything after ticket number)
                    let resolutionNote = '';
                    if (parts.length > 2) {
                        resolutionNote = parts.slice(2).join(' ');
                        console.log(`[WA_Bot] Resolution note: ${resolutionNote}`);
                    }
                    
                    // Check if ticket exists in workflow (for WhatsApp-created tickets)
                    const workflow = ticketWorkflow.get(ticketNumber);
                    
                    if (!workflow) {
                        // Ticket not in workflow - close directly and notify from app database
                        console.log(`[WA_Bot] Ticket #${ticketNumber} not in workflow, closing directly...`);
                        try {
                            // Close ticket
                            const closed = await closeTicket(ticketNumber);
                            if (closed) {
                                console.log(`[WA_Bot] Ticket ${ticketNumber} closed directly (not in workflow)`);
                                
                                // Update resolution note in database if provided
                                if (resolutionNote) {
                                    try {
                                        await db('tickets').where({ number: ticketNumber }).update({ 
                                            resolution_note: resolutionNote,
                                            updated_at: new Date()
                                        });
                                        console.log(`[WA_Bot] Resolution note saved to database for ticket ${ticketNumber}`);
                                    } catch (updateErr) {
                                        console.error('[WA_Bot] Error updating resolution note:', updateErr);
                                    }
                                }
                                
                                // Get user WhatsApp from app database
                                let userWhatsApp = null;
                                try {
                                    const ticketRows = await db('tickets').where({ number: ticketNumber }).first();
                                    if (ticketRows && ticketRows.user_id) {
                                        const userRows = await db('users').where({ id: ticketRows.user_id }).first();
                                        if (userRows && userRows.whatsapp) {
                                            userWhatsApp = userRows.whatsapp;
                                            console.log(`[WA_Bot] User WhatsApp from app database: ${userWhatsApp}`);
                                        }
                                    }
                                } catch (dbErr) {
                                    console.error('[WA_Bot] Error getting user WhatsApp from app database:', dbErr);
                                }
                                
                                // Build notification message with resolution note
                                let userNotificationMessage = `✅ *TICKET DITUTUP OLEH TEKNISI*\n\nTicket #${ticketNumber} telah diselesaikan oleh teknisi.\n\n`;
                                if (resolutionNote) {
                                    userNotificationMessage += `📝 *Penjelasan Teknisi:*\n${resolutionNote}\n\n`;
                                }
                                userNotificationMessage += `Masalah sudah selesai di atasi. Jika sudah selesai, jangan balas pesan ini.\nTapi jika masih bermasalah, silahkan kirim pesan untuk melaporkan kembali.`;
                                
                                // Notify user if WhatsApp number found
                                if (userWhatsApp) {
                                    await sendWAMessage(userWhatsApp, userNotificationMessage);
                                    console.log(`[WA_Bot] User notification sent to ${userWhatsApp}`);
                                } else {
                                    console.log(`[WA_Bot] User WhatsApp not found in app database, skipping user notification`);
                                }
                                
                                // Supervisor notification removed - only user gets notified when ticket is closed
                                
                                // Notify technician
                                await sock.sendMessage(jid, {
                                    text: `✅ *TICKET DITUTUP*\n\nTicket #${ticketNumber} berhasil ditutup.\n\nNotifikasi telah dikirim ke user.\n\nTerima kasih!`
                                });
                            } else {
                                await sock.sendMessage(jid, {
                                    text: `❌ Ticket #${ticketNumber} tidak ditemukan.`
                                });
                            }
                        } catch (err) {
                            console.error('[WA_Bot] Error closing ticket directly:', err);
                            await sock.sendMessage(jid, {
                                text: `❌ Gagal menutup ticket #${ticketNumber}. Silakan coba lagi.`
                            });
                        }
                        continue;
                    }
                    
                    // Ticket is in workflow - close directly and notify
                    await closeTicket(ticketNumber);
                    
                    // Update resolution note in database if provided
                    if (resolutionNote) {
                        try {
                            await db('tickets').where({ number: ticketNumber }).update({ 
                                resolution_note: resolutionNote,
                                updated_at: new Date()
                            });
                            console.log(`[WA_Bot] Resolution note saved to database for ticket ${ticketNumber}`);
                        } catch (updateErr) {
                            console.error('[WA_Bot] Error updating resolution note:', updateErr);
                        }
                    }
                    
                    // Notify user
                    let userJid = workflow.senderNumber;
                    console.log(`[WA_Bot] workflow.senderNumber:`, userJid);
                    console.log(`[WA_Bot] workflow object:`, JSON.stringify(workflow));
                    // Ensure userJid is a string
                    if (typeof userJid !== 'string') {
                        userJid = String(userJid);
                    }
                    console.log(`[WA_Bot] userJid after string conversion:`, userJid);
                    if (userJid && userJid.trim() !== '') {
                        console.log(`[WA_Bot] Sending notification to user:`, userJid);
                        if (!userJid.includes('@')) {
                            const cleanJid = userJid.replace(/[^0-9]/g, '');
                            // If the number is a 15-digit number starting with 2, it's an LID
                            if (cleanJid.length > 14 && cleanJid.startsWith('2')) {
                                userJid = cleanJid + '@lid';
                            } else {
                                userJid = cleanJid + '@s.whatsapp.net';
                            }
                        }
                        
                        // Build user notification message with resolution note
                        let userNotificationMessage = `✅ *TICKET DITUTUP OLEH TEKNISI*\n\nTicket #${ticketNumber} telah diselesaikan oleh teknisi.\n\n`;
                        if (resolutionNote) {
                            userNotificationMessage += `� *Penjelasan Teknisi:*\n${resolutionNote}\n\n`;
                        }
                        userNotificationMessage += `� Kategori: ${workflow.category}\n�� Masalah: ${workflow.description}\n\n`;
                        userNotificationMessage += `Masalah sudah selesai di atasi. Jika sudah selesai, jangan balas pesan ini.\nTapi jika masih bermasalah, silahkan kirim pesan untuk melaporkan kembali.`;
                        
                        await sock.sendMessage(userJid, {
                            text: userNotificationMessage
                        });
                        console.log(`[WA_Bot] User notification sent successfully`);
                    } else {
                        console.log(`[WA_Bot] userJid is empty, skipping user notification`);
                    }
                    
                    // Supervisor notification removed - only user gets notified when ticket is closed
                    
                    // Notify technician
                    await sock.sendMessage(jid, {
                        text: `✅ *TICKET DITUTUP*\n\nTicket #${ticketNumber} berhasil ditutup.\n\nNotifikasi telah dikirim ke user.\n\nTerima kasih!`
                    });
                    
                    // Remove from workflow
                    ticketWorkflow.delete(ticketNumber);
                    
                    console.log(`[WA_Bot] Ticket ${ticketNumber} closed by technician ${senderName}`);
                    continue;
                }
                
                // Handle technician confirmation with "OK"
                if (messageContent.toLowerCase().trim() === 'ok') {
                    const isTech = await isTechnician(senderNumber, msg);
                    if (isTech) {
                        // Find ticket that needs technician confirmation
                        for (const [ticketNum, workflow] of ticketWorkflow.entries()) {
                            if (!workflow.technicianConfirmed && workflow.technicianNumber) {
                                const cleanTech = workflow.technicianNumber.replace(/[^0-9]/g, '');
                                const cleanSender = senderNumber.replace(/[^0-9]/g, '');
                                if (cleanTech === cleanSender) {
                                    // Technician confirmed
                                    workflow.technicianConfirmed = true;
                                    workflow.technicianConfirmedAt = Date.now();
                                    ticketWorkflow.set(ticketNum, workflow);
                                    
                                    // Update status to In Progress
                                    await updateTicketStatus(ticketNum, 'In Progress');
                                    
                                    await sock.sendMessage(jid, {
                                        text: `✅ *KONFIRMASI DITERIMA*\n\nTicket #${ticketNum} status diubah ke "In Progress".\n\nSilakan selesaikan penanganan dan gunakan #close ${ticketNum} setelah selesai.`
                                    });
                                    
                                    console.log(`[WA_Bot] Technician ${senderName} confirmed ticket ${ticketNum}`);
                                    break;
                                }
                            }
                        }
                    }
                    continue;
                }
                
                // Handle user creation flow (Category/Description) - PRIORITIZED
                const userState = userStates.get(senderNumber);
                if (userState) {
                    // Handle registration state
                    if (userState.state === 'register_name') {
                        console.log(`[WA_Bot] Processing registration for ${senderNumber}`);
                        
                        // Parse name and department from message
                        let userName = '';
                        let userDepartment = '';
                        
                        const lines = messageContent.split('\n');
                        for (const line of lines) {
                            const lowerLine = line.toLowerCase();
                            // Check for name variations
                            if (lowerLine.includes('nama:') || lowerLine.includes('name:')) {
                                const parts = line.split(/[:]/);
                                if (parts.length > 1) {
                                    userName = parts[1].trim();
                                }
                            }
                            // Check for department variations (including typo "departement")
                            if (lowerLine.includes('department:') || lowerLine.includes('departement:') || lowerLine.includes('dept:')) {
                                const parts = line.split(/[:]/);
                                if (parts.length > 1) {
                                    userDepartment = parts[1].trim();
                                }
                            }
                        }
                        
                        // Fallback: if format not followed, try simple parsing
                        if (!userName || !userDepartment) {
                            const parts = messageContent.split(/[,\/\n]/);
                            if (parts.length >= 2) {
                                userName = parts[0].trim() || userState.senderName;
                                userDepartment = parts[1].trim() || '';
                            }
                        }
                        
                        // Final fallback
                        if (!userName) userName = userState.senderName;
                        if (!userDepartment) userDepartment = 'General';
                        
                        console.log(`[WA_Bot] Registration info - Name: ${userName}, Department: ${userDepartment}, WhatsApp: ${userState.whatsapp}`);
                        
                        try {
                            // Check if email already exists
                            const tempEmail = `${userState.whatsapp}@whatsapp.temp`;
                            const existingEmail = await db('users').where('email', tempEmail).first();
                            
                            if (existingEmail) {
                                // Update existing user with new info
                                await db('users').where('id', existingEmail.id).update({
                                    name: userName,
                                    department: userDepartment,
                                    whatsapp: userState.whatsapp
                                });
                                console.log(`[WA_Bot] User updated successfully: ${userName}`);
                            } else {
                                // Insert new user into database
                                await db('users').insert({
                                    name: userName,
                                    email: tempEmail,
                                    password: '', // No password for WhatsApp users
                                    role: 'user',
                                    department: userDepartment,
                                    whatsapp: userState.whatsapp
                                });
                                console.log(`[WA_Bot] User registered successfully: ${userName}`);
                            }
                            
                            await sock.sendMessage(jid, {
                                text: `✅ *REGISTRASI BERHASIL*\n\nSelamat datang, ${userName}!\n\nData Anda telah terdaftar:\n👤 Nama: ${userName}\n🏢 Department: ${userDepartment}\n📱 WhatsApp: ${userState.whatsapp}\n\n*CARA MEMBUAT TICKET:*\n\n1️⃣ Kirim: #ticket\n2️⃣ Pilih kategori masalah (1-7)\n3️⃣ Jelaskan detail masalah\n4️⃣ Ticket akan dibuat otomatis\n\nSegera coba dengan kirim: *#ticket*`
                            });
                            
                            // Clear registration state
                            userStates.delete(senderNumber);
                            
                        } catch (err) {
                            console.error('[WA_Bot] Error registering user:', err);
                            await sock.sendMessage(jid, {
                                text: `❌ *REGISTRASI GAGAL*\n\nTerjadi kesalahan saat registrasi. Silakan coba lagi dengan format:\n\nNama: [Nama Anda]\nDepartment: [Department Anda]`
                            });
                            userStates.delete(senderNumber);
                        }
                        
                        continue;
                    }
                    
                    if (userState.state === 'category') {
                        const categoryNumber = parseInt(messageContent.trim());
                        const category = ICT_CATEGORIES.find(c => c.id === categoryNumber);
                        
                        if (!category) {
                            await sock.sendMessage(jid, {
                                text: '❌ Pilihan tidak valid. Silakan pilih nomor 1-7.'
                            });
                            continue;
                        }
                        
                        userStates.set(senderNumber, { state: 'description', category: category, senderName: userState.senderName });
                        
                        await sock.sendMessage(jid, {
                            text: `✅ Kategori: ${category.name}\n\nSilakan jelaskan masalah Anda dengan detail.`
                        });
                        
                        console.log(`[WA_Bot] ${senderNumber} selected category: ${category.name}`);
                        continue;
                    }
                    
                    if (userState.state === 'description') {
                        const category = userState.category;
                        const description = messageContent.trim();
                        
                        try {
                            const ticketNumber = await createTicket(senderName, senderNumber, `[#${category.name}] ${description}`);
                            
                            ticketRateLimit.set(senderNumber, Date.now());
                            userStates.delete(senderNumber);
                            
                            const tutorial = category.tutorial || `📋 *Tutorial Umum*\n\n1. Restart perangkat terkait\n2. Cek koneksi dasar (power/network)\n3. Jelaskan detail masalah ke IT support\n4. Screenshot error jika ada\n5. Tunggu teknisi untuk pemeriksaan offline`;
                            
                            await sock.sendMessage(jid, {
                                text: `🎫 *TICKET DIBUAT*\n\nHalo ${senderName},\n\n📋 Nomor: ${ticketNumber}\n📂 Kategori: ${category.name}\n📝 Masalah: ${description}\n\n---\n${tutorial}\n\n---\n\nTim IT akan segera memeriksa secara fisik/offline. Terima kasih!`
                            });
                            
                            console.log(`[WA_Bot] Ticket ${ticketNumber} created for ${senderNumber} with category ${category.name}`);
                            
                            // Forward ticket to supervisor and technician
                            console.log('[WA_Bot] About to call forwardTicketToContacts...');
                            await forwardTicketToContacts(ticketNumber, category.name, description, senderName, senderNumber);
                            console.log('[WA_Bot] forwardTicketToContacts call completed');
                        } catch (err) {
                            console.error('[WA_Bot] Error creating ticket:', err);
                            await sock.sendMessage(jid, {
                                text: '❌ Maaf, terjadi kesalahan saat membuat ticket. Silakan coba lagi nanti.'
                            });
                            userStates.delete(senderNumber);
                        }
                        continue;
                    }
                }

                // Handle user approval for ticket closing
                const normalizedMsg = messageContent.toLowerCase().trim();
                if (normalizedMsg === '1' || normalizedMsg === 'sudah terselesaikan') {
                    // Check if user has pending approval
                    let approvalHandled = false;
                    for (const [ticketNum, workflow] of ticketWorkflow.entries()) {
                        if (workflow.userApprovalTimer && !workflow.userApproved) {
                            const cleanSender = workflow.senderNumber.replace(/[^0-9]/g, '');
                            const cleanUser = senderNumber.replace(/[^0-9]/g, '');
                            if (cleanSender === cleanUser) {
                                // User approved
                                clearTimeout(workflow.userApprovalTimer);
                                workflow.userApproved = true;
                                workflow.userApprovedAt = Date.now();
                                ticketWorkflow.set(ticketNum, workflow);
                                
                                // Close ticket
                                await closeTicket(ticketNum);
                                
                                // Supervisor notification removed
                                
                                await sock.sendMessage(jid, {
                                    text: `✅ *TICKET DITUTUP*\n\nTicket #${ticketNum} berhasil ditutup.\n\nTerima kasih telah menggunakan layanan IT Helpdesk!`
                                });
                                
                                console.log(`[WA_Bot] User ${senderName} approved closing of ticket ${ticketNum}`);
                                approvalHandled = true;
                                break;
                            }
                        }
                    }
                    if (approvalHandled) continue;
                }
                
                // Handle user rejection (ticket still problematic)
                if (normalizedMsg === '2' || normalizedMsg === 'masih bermasalah') {
                    // Check if user has pending approval
                    let rejectionHandled = false;
                    for (const [ticketNum, workflow] of ticketWorkflow.entries()) {
                        if (workflow.userApprovalTimer && !workflow.userApproved) {
                            const cleanSender = workflow.senderNumber.replace(/[^0-9]/g, '');
                            const cleanUser = senderNumber.replace(/[^0-9]/g, '');
                            if (cleanSender === cleanUser) {
                                // User rejected - ask for explanation
                                clearTimeout(workflow.userApprovalTimer);
                                workflow.awaitingExplanation = true;
                                ticketWorkflow.set(ticketNum, workflow);
                                
                                await sock.sendMessage(jid, {
                                    text: `⚠️ *MENUNGGU PENJELASAN*\n\nMohon jelaskan masalah apa yang masih terjadi agar teknisi dapat menindaklanjuti kembali.\n\nSilakan ketik penjelasan masalah Anda:`
                                });
                                
                                console.log(`[WA_Bot] User ${senderName} selected "masih bermasalah" for ticket ${ticketNum}`);
                                rejectionHandled = true;
                                break;
                            }
                        }
                    }
                    if (rejectionHandled) continue;
                }
                
                // Handle user explanation after selecting "masih bermasalah"
                for (const [ticketNum, workflow] of ticketWorkflow.entries()) {
                    if (workflow.awaitingExplanation) {
                        const cleanSender = workflow.senderNumber.replace(/[^0-9]/g, '');
                        const cleanUser = senderNumber.replace(/[^0-9]/g, '');
                        if (cleanSender === cleanUser) {
                            // User provided explanation
                            const explanation = messageContent;
                            workflow.awaitingExplanation = false;
                            ticketWorkflow.set(ticketNum, workflow);
                            
                            // Reopen ticket
                            await updateTicketStatus(ticketNum, 'Open');
                            
                            // Notify technician with explanation
                            if (workflow.technicianNumber) {
                                await sendWAMessage(workflow.technicianNumber,
                                    `⚠️ *TICKET DIBUKA KEMBALI - USER REJECTED*\n\n` +
                                    `Ticket #${ticketNum} dibuka kembali karena user masih mengalami masalah.\n` +
                                    `📂 Kategori: ${workflow.category}\n` +
                                    `📝 Masalah: ${workflow.description}\n` +
                                    `👤 Pelapor: ${workflow.senderName}\n` +
                                    `💬 Penjelasan user: ${explanation}\n\n` +
                                    `Mohon segera ditindaklanjuti kembali.`
                                );
                            }
                            
                            await sock.sendMessage(jid, {
                                text: `⚠️ *TICKET DIBUKA KEMBALI*\n\nTicket #${ticketNum} dibuka kembali.\n\nTeknisi akan segera menindaklanjuti kembali. Terima kasih atas penjelasannya!`
                            });
                            
                            // Remove from workflow
                            ticketWorkflow.delete(ticketNum);
                            
                            console.log(`[WA_Bot] User ${senderName} provided explanation for ticket ${ticketNum}: ${explanation}`);
                            break;
                        }
                    }
                }
                // End of state handlers
                
                // Default response for unknown messages - only if user is not in a state
                if (!userState) {
                    await sock.sendMessage(jid, {
                        text: `👋 *Halo ${senderName}!*\n\n` +
                            `Sepertinya pesan tidak dikenali.\n\n` +
                            `Untuk membuat permintaan support, silakan ketik:\n` +
                            `📌 *#ticket*\n\n` +
                            `Contoh:\n` +
                            `#ticket\n\n` +
                            `Terima kasih! 😊`
                    });
                    console.log(`[WA_Bot] Sent default response to ${senderName} for unknown message`);
                }
                
                if (ostPool) {
                    try {
                        const [tickets] = await ostPool.query(`
                            SELECT t.ticket_id, t.number, u.id as user_id
                            FROM ost_ticket t
                            JOIN ost_user u ON t.user_id = u.id
                            JOIN ost_user_email e ON t.user_email_id = e.id
                            WHERE e.address LIKE ?
                            ORDER BY t.created DESC
                            LIMIT 1
                        `, [`${senderNumber}%`]);
                        
                        if (tickets.length > 0) {
                            const ticket = tickets[0];
                            console.log(`[WA_Bot] Reply to existing ticket #${ticket.number} from ${senderName}`);
                            
                            await addTicketReply(ticket.ticket_id, ticket.user_id, senderName, messageContent);
                            await ostPool.query(`UPDATE ost_ticket SET updated = NOW() WHERE ticket_id = ?`, [ticket.ticketId]);
                        }
                    } catch (err) {
                        console.error('[WA_Bot] Error adding reply to ticket:', err);
                    }
                }
            } catch (err) {
                console.error('[WA_Bot] Error processing message:', err);
                console.error('[WA_Bot] Error stack:', err.stack);
            }
        }
    });

    startTicketMaintenance();
        startSLAMonitoring();

    } catch (error) {
        console.error('[WA_Bot] Error initializing:', error);
        global.waStatus.status = 'ERROR';
        global.waStatus.message = 'Failed to initialize WhatsApp';
        global.waStatus.error = error.message;
        global.waStatus.updatedAt = new Date();
    }
}

async function closeTicket(ticketNumber) {
    try {
        const [statusRows] = await ostPool.query(`SELECT id FROM ost_ticket_status WHERE name = ? LIMIT 1`, ['Closed']);
        let statusId = 3; // Fallback to Closed status
        if (statusRows.length > 0) {
            statusId = statusRows[0].id;
        }
        
        await ostPool.query(`UPDATE ost_ticket SET status_id = ?, updated = NOW() WHERE number = ?`, [statusId, ticketNumber]);
        console.log(`[WA_Bot] Ticket ${ticketNumber} closed`);
        return true;
    } catch (err) {
        console.error('[WA_Bot] Error closing ticket:', err);
        return false;
    }
}

async function updateTicketStatus(ticketNumber, statusName) {
    try {
        if (ostPool) {
            await ostPool.request('POST', '/tickets/' + ticketNumber, {
                status: { name: statusName }
            });
            console.log(`[WA_Bot] Ticket ${ticketNumber} status updated to ${statusName}`);
            return true;
        } else {
            console.log('[WA_Bot] osTicket pool not available, skipping status update');
            return false;
        }
    } catch (err) {
        console.error('[WA_Bot] Error updating ticket status:', err);
        return false;
    }
}

async function isTechnician(phoneNumber, msg = null) {
    try {
        const { supervisorNumber, technicianNumber, technicianLid } = await getForwardingNumbers();
        if (!phoneNumber) return false;
        
        const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
        const cleanTech = technicianNumber ? String(technicianNumber).replace(/[^0-9]/g, '') : '';
        const cleanTechLid = technicianLid ? String(technicianLid).replace(/[^0-9]/g, '') : '';
        const cleanSpv = supervisorNumber ? String(supervisorNumber).replace(/[^0-9]/g, '') : '';
        
        console.log(`[WA_Bot] Checking tech rights for: "${cleanPhone}"`);
        console.log(`[WA_Bot] Registered Tech: "${cleanTech}", Tech LID: "${cleanTechLid}", Supervisor: "${cleanSpv}"`);
        
        let isMatch = (cleanPhone === cleanTech || cleanPhone === cleanTechLid || cleanPhone === cleanSpv);
        
        // Final fallback: Check participant if it is a LID
        if (!isMatch && msg && msg.key.participant) {
            const participant = msg.key.participant.replace(/[^0-9]/g, '');
            console.log(`[WA_Bot] Checking participant fallback: "${participant}"`);
            isMatch = (participant === cleanTech || participant === cleanTechLid || participant === cleanSpv);
        }

        // Deep mapping attempt for LIDs starting with 21...
        if (!isMatch && cleanPhone.startsWith('21')) {
             console.log(`[WA_Bot] LID Detected (${cleanPhone}). Attempting name-based or metadata-based match...`);
             // If we have a pushName that matches a specific "trusted" name, we might log it for now
             // to help the user identify the LID to phone number mapping.
        }
        
        console.log(`[WA_Bot] Access result: ${isMatch ? '✅ GRANTED' : '❌ DENIED'}`);
        return isMatch;
    } catch (err) {
        console.error('[WA_Bot] Error checking technician:', err);
        return false;
    }
}

async function createTicket(userName, phoneNumber, message) {
    if (!ostPool) {
        const mockNumber = Math.floor(1000000 + Math.random() * 9000000);
        return mockNumber.toString();
    }

    const ticketNumber = await generateTicketNumber();
    const subject = `WhatsApp Ticket - ${userName}`;
    
    const [ticketResult] = await ostPool.query(`
        INSERT INTO ost_ticket 
        (number, status_id, dept_id, topic_id, source, created, updated)
        VALUES (?, 1, 1, 1, 'Phone', NOW(), NOW())
    `, [ticketNumber]);
    
    const ticketId = ticketResult.insertId;
    
    await ostPool.query(`
        INSERT INTO ost_ticket__cdata 
        (ticket_id, subject)
        VALUES (?, ?)
    `, [ticketId, subject]);
    
    const [userResult] = await ostPool.query(`
        INSERT INTO ost_user 
        (name, org_id, default_email_id, created, updated)
        VALUES (?, 1, 0, NOW(), NOW())
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `, [userName]);
    
    const userId = userResult.insertId;
    
    await ostPool.query(`
        INSERT INTO ost_user_email 
        (user_id, address)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `, [userId, `${phoneNumber}@phone.wa`]);
    
    await ostPool.query(`
        UPDATE ost_ticket 
        SET user_id = ?, user_email_id = LAST_INSERT_ID()
        WHERE ticket_id = ?
    `, [userId, ticketId]);
    
    const [threadResult] = await ostPool.query(`
        INSERT INTO ost_thread 
        (object_type, object_id, created)
        VALUES ('T', ?, NOW())
    `, [ticketId]);
    
    const threadId = threadResult.insertId;
    
    await ostPool.query(`
        INSERT INTO ost_thread_entry 
        (pid, thread_id, staff_id, user_id, type, poster, source, title, body, format, ip_address, created, updated)
        VALUES (0, ?, 0, ?, 'M', ?, 'Phone', '', ?, 'html', '127.0.0.1', NOW(), NOW())
    `, [threadId, userId, userName, message.replace(/#ticket/gi, '').trim()]);
    
    // Also store in local database for user notification lookup
    try {
        // Find or create user in local database
        let localUserId = null;
        const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        const existingUser = await db('users').where('whatsapp', cleanPhoneNumber).first();
        if (existingUser) {
            localUserId = existingUser.id;
        } else {
            // Create new user
            const [newUserId] = await db('users').insert({
                name: userName,
                whatsapp: cleanPhoneNumber,
                role: 'user',
                created_at: new Date(),
                updated_at: new Date()
            });
            localUserId = newUserId;
        }
        
        // Store ticket in local database
        await db('tickets').insert({
            number: ticketNumber,
            user_id: localUserId,
            subject: subject,
            description: message.replace(/#ticket/gi, '').trim(),
            status: 'New',
            priority: 'Medium',
            created_at: new Date(),
            updated_at: new Date()
        });
        
        console.log(`[WA_Bot] Ticket #${ticketNumber} stored in local database with user_id: ${localUserId}`);
    } catch (dbErr) {
        console.error('[WA_Bot] Error storing ticket in local database:', dbErr);
    }
    
    return ticketNumber;
}

async function addTicketReply(ticketId, userId, senderName, message) {
    if (!ostPool) return;
    
    const [threadRows] = await ostPool.query(`
        SELECT id FROM ost_thread 
        WHERE object_id = ? AND object_type = 'T' 
        LIMIT 1
    `, [ticketId]);
    
    if (threadRows.length === 0) {
        console.warn(`[WA_Bot] No thread found for ticket ${ticketId}`);
        return;
    }
    
    const threadId = threadRows[0].id;
    
    await ostPool.query(`
        INSERT INTO ost_thread_entry 
        (pid, thread_id, staff_id, user_id, type, poster, source, title, body, format, ip_address, created, updated)
        VALUES (0, ?, 0, ?, 'M', ?, 'Phone', '', ?, 'html', '127.0.0.1', NOW(), NOW())
    `, [threadId, userId, senderName, message]);
    
    console.log(`[WA_Bot] Reply added to ticket ${ticketId}`);
}

async function generateTicketNumber() {
    if (!ostPool) {
        return Math.floor(1000000 + Math.random() * 9000000).toString();
    }
    
    try {
        const [rows] = await ostPool.query(`
            SELECT number FROM ost_ticket 
            ORDER BY ticket_id DESC 
            LIMIT 1
        `);
        
        let lastNumber = rows.length > 0 ? parseInt(rows[0].number) : 1000000;
        if (isNaN(lastNumber)) lastNumber = 1000000;
        let newNumber = lastNumber + 1;
        
        return newNumber.toString().padStart(7, '0');
    } catch (err) {
        console.error('[WA_Bot] Error generating ticket number:', err);
        return Math.floor(1000000 + Math.random() * 9000000).toString();
    }
}

function startTicketMaintenance() {
    if (!ostPool) return;
    
    setInterval(async () => {
        try {
            console.log('[WA_Bot] Running ticket maintenance check...');
            
            const AUTO_CLOSE_HOURS = 24;
            await ostPool.query(`
                UPDATE ost_ticket t
                SET status_id = 3, updated = NOW()
                WHERE t.status_id = 1
                AND t.updated < DATE_SUB(NOW(), INTERVAL ? HOUR)
                AND NOT EXISTS (
                    SELECT 1 FROM ost_thread_entry te
                    JOIN ost_thread th ON te.thread_id = th.id
                    WHERE th.object_id = t.ticket_id
                    AND th.object_type = 'T'
                    AND te.type = 'R'
                    AND te.created > DATE_SUB(NOW(), INTERVAL ? HOUR)
                )
            `, [AUTO_CLOSE_HOURS, AUTO_CLOSE_HOURS]);
            
            console.log(`[WA_Bot] Auto-closed tickets older than ${AUTO_CLOSE_HOURS} hours`);
        } catch (err) {
            console.error('[WA_Bot] Error in ticket maintenance:', err);
        }
    }, 60 * 60 * 1000);
}

function startSLAMonitoring() {
    setInterval(async () => {
        const now = Date.now();
        for (const [ticketNumber, workflow] of ticketWorkflow.entries()) {
            // Check if technician hasn't confirmed within SLA (2 hours)
            if (!workflow.technicianConfirmed && workflow.slaDeadline && now > workflow.slaDeadline) {
                console.log(`[WA_Bot] SLA BREACH - Ticket ${ticketNumber} technician did not respond within 2 hours`);
                
                // Update status to Overdue
                await updateTicketStatus(ticketNumber, 'Overdue');
                
                // Mark ticket as overdue in workflow (don't remove from workflow)
                workflow.isOverdue = true;
                workflow.overdueNotified = true;
                ticketWorkflow.set(ticketNumber, workflow);
                
                // Supervisor notification removed
                
                // Don't remove from workflow - keep it so technician can still close the ticket
            }
        }
    }, 5 * 60 * 1000); // Check every 5 minutes
}

async function sendWAMessage(to, message) {
    console.log('[WA_Bot] sendWAMessage called with to:', to, 'message:', message);
    console.log('[WA_Bot] sock exists:', !!sock);
    console.log('[WA_Bot] WA Status:', global.waStatus.status);
    
    if (!sock || global.waStatus.status !== 'CONNECTED') {
        console.log('[WA_Bot] Not connected to WhatsApp, queuing message');
        const queueId = Date.now() + Math.random();
        messageQueue.set(queueId, { to, message });
        console.log(`[WA_Bot] Message queued (ID: ${queueId}). Will send when connected.`);
        return false;
    }

    try {
        let jid = to;
        // Ensure jid is a string
        if (typeof jid !== 'string') {
            jid = String(jid);
        }
        if (!jid.includes('@')) {
            const cleanJid = jid.replace(/[^0-9]/g, '');
            // If the number is a 15-digit number starting with 2, it's an LID
            if (cleanJid.length > 14 && cleanJid.startsWith('2')) {
                jid = cleanJid + '@lid';
            } else {
                jid = cleanJid + '@s.whatsapp.net';
            }
        }
        
        console.log('[WA_Bot] Prepared JID:', jid);
        console.log('[WA_Bot] Attempting to send message...');

        // Send message without additional options (simpler approach)
        await sock.sendMessage(jid, { text: message });
        
        console.log(`[WA_Bot] Message sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error('[WA_Bot] Error sending message:', error);
        console.error('[WA_Bot] Error stack:', error.stack);
        return false;
    }
}

async function getForwardingNumbers() {
    try {
        console.log('[WA_Bot] Fetching forwarding numbers from database...');
        const supervisorSetting = await db('settings').where({ section: 'tickets', key: 'wa_supervisor' }).first();
        const technicianSetting = await db('settings').where({ section: 'tickets', key: 'wa_technician' }).first();
        // Skip technician_lid as it's not used and causes issues with LinkedIn IDs
        
        console.log('[WA_Bot] Supervisor setting:', supervisorSetting);
        console.log('[WA_Bot] Technician setting:', technicianSetting);
        
        const supervisorNumberRaw = supervisorSetting ? supervisorSetting.value : null;
        const technicianNumberRaw = technicianSetting ? technicianSetting.value : null;
        
        let supervisorNumber = null;
        let technicianNumber = null;

        try {
            supervisorNumber = supervisorNumberRaw ? JSON.parse(supervisorNumberRaw) : null;
        } catch (e) {
            console.warn('[WA_Bot] Failed to parse supervisorNumber as JSON, using raw:', supervisorNumberRaw);
            supervisorNumber = supervisorNumberRaw;
        }

        try {
            technicianNumber = technicianNumberRaw ? JSON.parse(technicianNumberRaw) : null;
        } catch (e) {
            console.warn('[WA_Bot] Failed to parse technicianNumber as JSON, using raw:', technicianNumberRaw);
            technicianNumber = technicianNumberRaw;
        }
        
        console.log('[WA_Bot] Final supervisor number:', supervisorNumber);
        console.log('[WA_Bot] Final technician number:', technicianNumber);
        
        return { supervisorNumber, technicianNumber };
    } catch (err) {
        console.error('[WA_Bot] Error fetching forwarding numbers:', err);
        return { supervisorNumber: null, technicianNumber: null };
    }
}

async function forwardTicketToContacts(ticketNumber, category, description, senderName, senderNumber) {
    console.log('[WA_Bot] ==================================');
    console.log('[WA_Bot] Starting ticket forwarding process...');
    console.log('[WA_Bot] Ticket Number:', ticketNumber);
    console.log('[WA_Bot] Category:', category);
    console.log('[WA_Bot] Description:', description);
    console.log('[WA_Bot] Sender Name:', senderName);
    console.log('[WA_Bot] Sender Number:', senderNumber);
    console.log('[WA_Bot] WA Status:', global.waStatus.status);
    console.log('[WA_Bot] ==================================');
    
    const { supervisorNumber, technicianNumber } = await getForwardingNumbers();
    
    // Get bot's own number to prevent sending to self
    const botNumber = sock?.user?.id ? sock.user.id.replace(/[^0-9]/g, '') : null;
    console.log('[WA_Bot] Bot number:', botNumber);
    
    if (!technicianNumber) {
        console.log('[WA_Bot] No technician forwarding number configured, skipping forward');
        return;
    }
    
    // Initialize workflow state with SLA deadline (2 hours for technician response)
    const slaDeadline = Date.now() + (2 * 60 * 60 * 1000); // 2 hours from now
    ticketWorkflow.set(ticketNumber, {
        technicianConfirmed: false,
        technicianNumber: technicianNumber,
        userApproved: false,
        slaDeadline: slaDeadline,
        senderNumber: senderNumber,
        category: category,
        description: description,
        senderName: senderName
    });
    
    // Message for technician - focus on action and confirmation
    const technicianMessage = `🛠️ *TUGAS BARU: PERLU TINDAKAN*\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🆔 *TICKET:* #${ticketNumber}\n` +
        `📂 *BAGIAN:* ${category}\n` +
        `👤 *USER:* ${senderName}\n` +
        `📱 *WA:* ${senderNumber}\n` +
        `📝 *MASALAH:*\n_"${description}"_\n` +
        `�    console.log('[WA_Bot] Technician message prepared:', technicianMessage);orMessage);
            if (success) {
                console.log(`[WA_Bot] Ticket ${ticketNumber} successfully forwarded to supervisor: ${supervisorNumber}`);
            } else {
                console.log(`[WA_Bot] Failed to forward ticket ${ticketNumber} to supervisor: ${supervisorNumber}`);
            }
        }
    }
    
    if (technicianNumber) {
        // Check if technician number is the bot's own number
        const cleanTechnician = String(technicianNumber).replace(/[^0-9]/g, '');
        if (botNumber && cleanTechnician === botNumber) {
            console.log('[WA_Bot] Technician number is the bot itself, skipping forward to self');
        } else {
            console.log('[WA_Bot] Attempting to forward to technician:', technicianNumber);
            const success = await sendWAMessage(technicianNumber, technicianMessage);
            if (success) {
                console.log(`[WA_Bot] Ticket ${ticketNumber} successfully forwarded to technician: ${technicianNumber}`);
            } else {
                console.log(`[WA_Bot] Failed to forward ticket ${ticketNumber} to technician: ${technicianNumber}`);
            }
        }
    }
    
    console.log('[WA_Bot] Ticket forwarding process completed');
}

router.get('/wa-status', (req, res) => {
    res.json(global.waStatus);
});

router.get('/test-send', async (req, res) => {
    const { to, message } = req.query;
    if (!to || !message) {
        return res.status(400).json({ error: 'Missing to or message parameter' });
    }
    
    console.log('[WA_Bot] Manual test send to:', to, 'message:', message);
    const result = await sendWAMessage(to, message);
    res.json({ success: result, to, message });
});

router.post('/send-message', async (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'to and message are required' });

    const success = await sendWAMessage(to, message);
    if (success) res.json({ success: true });
    else res.status(500).json({ error: 'Failed to send message' });
});

module.exports = {
    router,
    sendWAMessage,
    initWhatsApp
};

if (require.main === module) {
    initWhatsApp();

    const BOT_PORT = process.env.WA_BOT_PORT || 5002;
    const botApp = express();
    botApp.use(express.json());
    botApp.use('/', router);
    botApp.listen(BOT_PORT, '0.0.0.0', () => {
        console.log(`[WA_Bot] Dedicated Bot API listening on port ${BOT_PORT}`);
    });
}
