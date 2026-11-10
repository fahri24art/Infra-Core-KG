/****************************************************************************************
 * ==================================================================================== *
 *                       ⚠️⚠️⚠️ CRITICAL SYSTEM FILE ⚠️⚠️⚠️                           *
 * ==================================================================================== *
 * 
 *  DANGER: DO NOT MODIFY WA CONNECTION LOGIC UNLESS YOU KNOW WHAT YOU ARE DOING!
 * 
 *  This file contains the anti-spam, auto-reconnect, and session management logic
 *  for the WhatsApp Bot. Meta/WhatsApp is extremely strict. ANY infinite loops
 *  or rapid reconnects caused by modifications here WILL result in the associated 
 *  IP address and Phone Number being PERMANENTLY BANNED.
 * 
 *  - Do NOT remove the HTTP 401/403 shutdown logic.
 *  - Do NOT modify the retry intervals (Math.pow delays).
 *  - If integrating new modules, DO NOT spawn new instances. Use the `/send-message` API.
 * 
 * ==================================================================================== *
 ****************************************************************************************/

const crypto = require('crypto');
if (!global.crypto) {
    global.crypto = crypto;
}

const express = require('express');
const router = express.Router();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const db = require('./db');
const { logComm } = require('./services/comm_logger');

// osTicket integration removed

const logger = pino({ level: 'info' });
let sock;
const authDir = process.env.WA_AUTH_DIR || path.join(__dirname, 'whatsapp_auth');

if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
}

const userStates = new Map();
const pendingClosures = new Map();
const warnedTickets = new Set(); // Stores tickets that have already been warned for SLA
const isClosedStatus = (s) => ['closed', 'selesai', 'resolved', 'tutup', 'cancelled'].includes(String(s || '').trim().toLowerCase());

// Message Deduplication Queue
const processedMessages = new Set();
const processedMessagesQueue = [];
function addProcessedMessage(id) {
    if (!id) return;
    processedMessages.add(id);
    processedMessagesQueue.push(id);
    if (processedMessagesQueue.length > 200) {
        const old = processedMessagesQueue.shift();
        processedMessages.delete(old);
    }
}

global.waStatus = { status: 'INITIALIZING', qr: null, updatedAt: new Date(), mode: 'real' };

let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 8;
let reconnectTimeoutId = null;
// Minimum delay 15 detik mencegah rapid reconnect yang bisa bikin nomor kena ban
const BASE_RETRY_DELAY_MS = 15000;

const ICT_TIER1 = [
    { id: 1, name: 'Permintaan Baru (Requisition)' },
    { id: 2, name: 'Perbaikan / Masalah Perangkat' },
    { id: 3, name: 'Laporan Kerusakan Sistem / Jaringan (Incident)' },
    { id: 4, name: 'Lain-lain / Pertanyaan Umum' }
];

const ICT_TIER2 = {
    1: [
        { id: 1, name: 'Hardware (PC/Laptop/Printer)' },
        { id: 2, name: 'Aksesoris & Consumables (Mouse/Keyboard/Tinta)' },
        { id: 3, name: 'Akun & Jaringan (Email/WiFi/Akses)' },
        { id: 4, name: 'Software & Sistem (Akses Modul/Report)' },
        { id: 5, name: 'Lainnya' }
    ],
    2: [
        { id: 1, name: 'PC / Laptop Lemot atau Error' },
        { id: 2, name: 'Printer / Mesin Fotocopy Macet' },
        { id: 3, name: 'Checksheet / Maintenance Rutin' },
        { id: 4, name: 'Lainnya' }
    ],
    3: [
        { id: 1, name: 'Jaringan / Internet Mati Total' },
        { id: 2, name: 'Server / Akses Sistem Down' },
        { id: 3, name: 'CCTV Mati / Minta Rekaman' },
        { id: 4, name: 'Lainnya' }
    ]
};

async function getForwardingNumbers(org = 'TCF-SG') {
    return await db.runWithOrg(org, async () => {
        try {
            // Cek target di tab Notification Routing terlebih dahulu
            let ictTarget = await db('settings').where({ section: 'notifications', key: 'ict_target' }).first();
            if (ictTarget) ictTarget = JSON.parse(ictTarget.value);

            // Fallback ke konfigurasi lama
            const supervisorSetting = await db('settings').where({ section: 'tickets', key: 'wa_supervisor' }).first();
            const technicianSetting = await db('settings').where({ section: 'tickets', key: 'wa_technician' }).first();
            const lidSetting = await db('settings').where({ section: 'tickets', key: 'technician_lid' }).first();
            return {
                supervisorNumber: supervisorSetting ? JSON.parse(supervisorSetting.value) : null,
                technicianNumber: ictTarget || (technicianSetting ? JSON.parse(technicianSetting.value) : '6282135353242'),
                technicianLid: lidSetting ? lidSetting.value : null
            };
        } catch (e) {
            return { supervisorNumber: null, technicianNumber: '6282135353242', technicianLid: null };
        }
    });
}

async function isTechnician(number, org = 'TCF-SG') {
    const { supervisorNumber, technicianNumber, technicianLid } = await getForwardingNumbers(org);
    const cleanNumber = number.replace(/\D/g, '');
    const cleanTech = String(technicianNumber).replace(/\D/g, '');
    const cleanLid = technicianLid ? String(technicianLid).replace(/\D/g, '') : '';
    const cleanSpv = supervisorNumber ? String(supervisorNumber).replace(/\D/g, '') : '';
    
    console.log(`[WA_Bot] isTechnician check (${org}): Inbound: ${cleanNumber}, Tech: ${cleanTech}, LID: ${cleanLid}, Spv: ${cleanSpv}`);
    
    const isMatch = cleanNumber === cleanTech || cleanNumber === cleanLid || cleanNumber === cleanSpv;
    return isMatch;
}

async function sendWAMessage(to, text, ticketNumber = null, shouldLog = true) {
    if (process.env.WA_IPC_MODE === 'api') {
        try {
            // Forward to the external bot runner
            const axios = require('axios');
            await axios.post('http://127.0.0.1:5002/send-message', { to, message: text, ticketNumber, shouldLog });
            return true;
        } catch (e) {
            console.error('[WA_IPC] Failed to send to ICT bot runner:', e.message);
            return false;
        }
    }
    if (!sock || global.waStatus.status !== 'CONNECTED') {
        console.warn('[WA_Bot] Cannot send: Bot not connected');
        return false;
    }
    try {
        const jid = to.includes('@') ? to : to + '@s.whatsapp.net';
        console.log(`[WA_Bot] Sending to ${jid}: ${text.substring(0, 50)}...`);
        
        // Add human-like typing/sending delay (1.5s - 3s)
        const delayMs = Math.floor(Math.random() * 1500) + 1500;
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(resolve => setTimeout(resolve, delayMs));

        await sock.sendMessage(jid, { text });
        
        // Log outgoing message only if related to ticket/reg
        if (shouldLog) {
            let orgContext = 'TCF-SG';
            const cleanNumber = to.replace(/\D/g, '');
            if (ticketNumber && ticketNumber.startsWith('ICT-KG-')) {
                orgContext = 'TCF-KG';
            } else if (userStates.has(cleanNumber) && userStates.get(cleanNumber).org === 'TCF-KG') {
                orgContext = 'TCF-KG';
            } else {
                const userInKG = await db.runWithOrg('TCF-KG', async () => await db('users').where('whatsapp', 'like', `%${cleanNumber}%`).first());
                if (userInKG) {
                    orgContext = 'TCF-KG';
                }
            }

            await logComm({
                platform: 'whatsapp',
                type: 'outgoing',
                sender: 'System Bot',
                recipient: jid,
                message: text,
                ticketNumber: ticketNumber,
                status: 'sent',
                department: 'ict',
                org: orgContext
            });
        }
        
        // Also write to whatsapp_logs
        try {
            await db('whatsapp_logs').insert({
                sender_number: 'BOT',
                sender_name: 'System Bot',
                message_text: text.substring(0, 500),
                direction: 'OUT',
                timestamp: Date.now()
            });
        } catch (wlErr) { /* non-critical */ }

        return true;
    } catch (e) {
        console.error('[WA_Bot] Send error:', e);
        return false;
    }
}

async function getGroupJidByName(groupName) {
    if (!sock) return null;
    try {
        const groups = await sock.groupFetchAllParticipating();
        for (const [id, group] of Object.entries(groups)) {
            if (group.subject === groupName) return id;
        }
    } catch (e) {
        console.error('[WA_Bot] Error fetching groups:', e);
    }
    return null;
}

async function closeTicketInDB(ticketNumber, org = 'TCF-SG') {
    let success = false;
    warnedTickets.add(ticketNumber);
    if (org === 'TCF-SG' && typeof ostPool !== 'undefined' && ostPool) {
        try {
            await ostPool.query('UPDATE ost_ticket SET status_id = 3, updated = NOW() WHERE number = ?', [ticketNumber]);
            success = true;
        } catch (e) {
            console.error('[WA_Bot] osTicket Close error:', e);
        }
    }
    return await db.runWithOrg(org, async () => {
        try {
            await db('tickets').where('number', ticketNumber).update({ status: 'Closed', updated_at: db.fn.now() });
            success = true;
        } catch (e) {
            console.error('[WA_Bot] Local DB Close error:', e);
        }
        return success;
    });
}

async function logoutWhatsApp() {
    console.log('[WA_Bot] Triggering explicit logout/session reset...');
    
    // Clear any pending reconnect timeouts
    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }

    if (sock) {
        try {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.ev.removeAllListeners('messages.upsert');
            sock.ev.removeAllListeners('messaging-history.set');
            sock.end();
        } catch (e) {
            console.error('[WA_Bot] Error ending socket on logout:', e);
        }
        sock = null;
    }
    
    global.waStatus.status = 'LOGGED_OUT';
    global.waStatus.qr = null;
    global.waStatus.updatedAt = new Date();
    
    // Clear the auth folder
    try {
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
            console.log('[WA_Bot] Auth folder deleted successfully.');
        }
    } catch (e) {
        console.error('[WA_Bot] Failed to delete auth folder:', e);
    }
    
    // Do not automatically regenerate QR code on logout. Wait for manual trigger.
    // connectionRetryCount = 0;
    // await initWhatsApp();
}

async function initWhatsApp(isManual = false) {
    console.log('[WA_Bot] Starting...');
    
    const backupDir = authDir + '_backup';
    
    // Auto-Restore logic: if main auth doesn't exist or is corrupted (0 bytes), check backup
    const credsPath = path.join(authDir, 'creds.json');
    let hasAuth = fs.existsSync(credsPath);
    
    if (hasAuth) {
        // Check if it's 0 bytes (corrupted by power loss)
        const stats = fs.statSync(credsPath);
        if (stats.size === 0) {
            console.log('[WA_Bot] creds.json is 0 bytes (corrupted). Deleting to attempt restore from backup...');
            fs.rmSync(authDir, { recursive: true, force: true });
            hasAuth = false;
        }
    }

    if (!hasAuth && fs.existsSync(path.join(backupDir, 'creds.json'))) {
        console.log('[WA_Bot] Main auth missing/corrupt, but backup found! Restoring from backup...');
        fs.mkdirSync(authDir, { recursive: true });
        fs.cpSync(backupDir, authDir, { recursive: true });
        hasAuth = true;
    }

    if (!hasAuth && !isManual) {
        console.log('[WA_Bot] No existing auth found. Skipping auto-start to prevent QR spam. Please start manually from dashboard.');
        global.waStatus.status = 'LOGGED_OUT';
        return;
    }
    
    // Clear any pending reconnect timeouts
    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }
    
    if (sock) {
        console.log('[WA_Bot] Closing existing WhatsApp socket before reconnecting...');
        try {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.ev.removeAllListeners('messages.upsert');
            sock.ev.removeAllListeners('messaging-history.set');
            sock.end();
        } catch (e) {
            console.error('[WA_Bot] Error ending old socket:', e);
        }
        sock = null;
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    const { Browsers } = require('@whiskeysockets/baileys');

    sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        linkPreview: false,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 2000,
        keepAliveIntervalMs: 25000,
        defaultQueryTimeoutMs: undefined,
        getMessage: async (key) => {
            return { conversation: 'hello' };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        global.waStatus.updatedAt = new Date();
        
        if (qr) {
            global.waStatus.status = 'WAITING_QR';
            global.waStatus.qr = qr;
        }
        if (connection === 'open') {
            global.waStatus.status = 'CONNECTED';
            global.waStatus.qr = null;
            connectionRetryCount = 0; // reset retry counter
            console.log('[WA_Bot] ✅ Connected to WhatsApp - messages.upsert listener is ACTIVE');
            
            // Auto-Backup session on successful connection
            try {
                const backupDir = authDir + '_backup';
                if (fs.existsSync(backupDir)) {
                    fs.rmSync(backupDir, { recursive: true, force: true });
                }
                fs.cpSync(authDir, backupDir, { recursive: true });
                console.log('[WA_Bot] Session auto-backed up successfully.');
            } catch (err) {
                console.error('[WA_Bot] Auto-backup failed:', err);
            }
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;

            // 401 = Logged Out (perlu QR scan ulang)
            // 403 = Forbidden / rate limited
            // 500 = Bad session (corrupt)
            // 440 = Connection Replaced (proses lain login dengan nomor yg sama) → JANGAN hapus sesi, cukup reconnect
            // 408 = Timeout → reconnect saja
            // FIX: Hanya hapus sesi jika benar-benar Logged Out (401). BadSession (500) terkadang bisa recover tanpa hapus sesi.
            const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;
            const isConflict = statusCode === 440;
            const shouldClearSession = isLoggedOut;
            const shouldReconnect = !isLoggedOut && !isConflict; // JANGAN reconnect otomatis kalau ditendang oleh sesi lain (440) biar gak ke-banned
            
            console.log(`[WA_Bot] Connection closed. StatusCode: ${statusCode}. ClearSession: ${shouldClearSession}. Reconnect: ${shouldReconnect}`);
            
            if (isConflict) {
                console.error(`[WA_Bot] 🚨 CRITICAL: CONFLICT (440)! Sesi digunakan oleh proses lain. Mematikan auto-reconnect untuk mencegah pemblokiran nomor WA!`);
                global.waStatus.status = 'ERROR';
                global.waStatus.error = 'Sesi tabrakan dengan proses lain. Silakan matikan proses ganda dan restart manual dari dashboard.';
            }
            
            if (shouldClearSession) {
                console.log(`[WA_Bot] ⚠️ Session corrupt/logged-out (Code: ${statusCode}). Clearing auth folder...`);
                global.waStatus.status = 'LOGGED_OUT';
                global.waStatus.qr = null;
                try {
                    fs.rmSync(authDir, { recursive: true, force: true });
                    const backupDir = authDir + '_backup';
                    if (fs.existsSync(backupDir)) {
                        fs.rmSync(backupDir, { recursive: true, force: true });
                    }
                    fs.mkdirSync(authDir, { recursive: true });
                } catch (e) {
                    console.error('[WA_Bot] Error clearing auth folder:', e);
                }
            } else {
                global.waStatus.status = 'DISCONNECTED';
            }

            if (shouldReconnect) {
                if (connectionRetryCount < MAX_RETRY_COUNT) {
                    connectionRetryCount++;
                    // Delay eksponensial: 15s, 30s, 60s, max 5 menit
                    const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, connectionRetryCount - 1), 5 * 60 * 1000);
                    console.log(`[WA_Bot] Reconnecting in ${delay / 1000}s (Attempt ${connectionRetryCount}/${MAX_RETRY_COUNT})...`);
                    global.waStatus.status = 'RECONNECTING';
                    reconnectTimeoutId = setTimeout(initWhatsApp, delay);
                } else {
                    console.error(`[WA_Bot] Reconnection failed after ${MAX_RETRY_COUNT} attempts. Stopping auto-reconnect.`);
                    global.waStatus.status = 'ERROR';
                    global.waStatus.error = 'Max reconnection attempts reached. Please restart bot from Admin Panel.';
                }
            }
        }
    });

    sock.ev.on('messaging-history.set', ({ messages }) => {
        // Hanya log jumlah saja, tidak perlu loop - mencegah resource drain saat sync awal
        console.log(`[WA_Bot] History sync received: ${messages.length} messages (skipped, real-time only)`);
    });

    sock.ev.on('messages.upsert', async (rawEvent) => {
        try {
        const { messages, type } = rawEvent;
        console.log(`[WA_Bot] messages.upsert triggered: type=${type}, count=${messages?.length || 0}`);
        
        if (type !== 'notify') return;
        
        for (const msg of messages) {
            try {
                if (!msg.message || msg.key.fromMe) continue;
                
                // === MESSAGE DEDUPLICATION ===
                const msgId = msg.key.id;
                if (msgId && processedMessages.has(msgId)) {
                    console.log(`[WA_Bot] Skipping duplicate message ID: ${msgId}`);
                    continue;
                }
                addProcessedMessage(msgId);
                
                const rawJid = msg.key.remoteJid;

                // === FILTER PESAN LAMA: Abaikan pesan yang lebih dari 90 detik lalu ===
                // Ini mencegah bot merespons history saat pertama kali connect
                const msgTimestamp = msg.messageTimestamp ? Number(msg.messageTimestamp) : 0;
                const nowSec = Math.floor(Date.now() / 1000);
                if (msgTimestamp && (nowSec - msgTimestamp) > 90) {
                    console.log(`[WA_Bot] Skipping old message (age: ${nowSec - msgTimestamp}s)`);
                    continue;
                }
                const isGroup = rawJid && rawJid.endsWith('@g.us');
                // Ignore status updates, broadcast channels
                if (!rawJid || rawJid === 'status@broadcast' || rawJid.endsWith('@broadcast')) {
                    continue;
                }

                const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '').trim();
                const lowText = text.toLowerCase();
                
                console.log(`[WA_DEBUG] isGroup=${isGroup}, rawJid=${rawJid}, text=${text}, msgType=${Object.keys(msg.message || {})[0]}`);

                // Only allow primary bot to handle group messages to prevent duplicate responses
                if (isGroup) {
                    const isPrimaryBot = !process.env.WA_AUTH_DIR || process.env.WA_AUTH_DIR.endsWith('whatsapp_auth_1') || process.env.WA_AUTH_DIR === './backend/whatsapp_auth_1';
                    if (!isPrimaryBot) {
                        continue;
                    }
                }

                // If in group, ONLY process #close commands and guide users who type #ticket
                if (isGroup) {
                    if (lowText === '#ticket') {
                        await sendWAMessage(jid, '❌ Pembuatan tiket hanya bisa dilakukan melalui pesan pribadi (Japri) ke nomor Bot ini. Silakan chat langsung ke bot.');
                        continue;
                    }
                    if (!lowText.startsWith('#close')) {
                        continue;
                    }
                }

                // Prioritize the phone number JID if available to bypass LID delivery restrictions (Error 463)
                // For groups, participant holds the sender's JID
                const jid = msg.key.remoteJidAlt || rawJid; // The chat ID to reply to
                const senderJid = isGroup ? (msg.key.participant || rawJid) : jid;
                const senderNumber = senderJid.replace(/\D/g, '');
                const senderName = msg.pushName || 'User';

                console.log(`[WA_Bot] 📩 Incoming from ${senderNumber} (${senderName}): "${text.substring(0, 80)}"`);

                // Extract potential ticket number (e.g., #ICT-TCFSG-03-00105 or IR/MR format)
                const ticketMatch = text.match(/#([A-Z0-9-]{7,30})/) || text.match(/#(\d{5,8})/) || text.match(/#ticket\s+([A-Z0-9-]{5,30})/i) || text.match(/#close\s+(.*)/i);
                const ticketNumber = ticketMatch ? ticketMatch[1] : null;

                // 0. Check User Registration (check both LID and phone number to match existing database entries)
                const rawLid = rawJid.replace(/\D/g, '');
                const rawPn = msg.key.remoteJidAlt ? msg.key.remoteJidAlt.replace(/\D/g, '') : '';
                
                let existingUser = null;
                let userOrg = null;
                
                for (const org of ['TCF-SG', 'TCF-KG']) {
                    await db.runWithOrg(org, async () => {
                        let u = await db('users').where('whatsapp', rawLid).first();
                        if (!u && rawPn) {
                            u = await db('users').where('whatsapp', rawPn).first();
                        }
                        if (!u) {
                            const cleanSender = senderNumber.replace(/\D/g, '');
                            let localFormat = cleanSender;
                            if (cleanSender.startsWith('62')) {
                                localFormat = '0' + cleanSender.substring(2);
                            }
                            const shortFormat = cleanSender.startsWith('62') ? cleanSender.substring(2) : (cleanSender.startsWith('0') ? cleanSender.substring(1) : cleanSender);
                            
                            u = await db('users')
                                .where('whatsapp', senderNumber)
                                .orWhere('whatsapp', 'like', `%${cleanSender}%`)
                                .orWhere('whatsapp', 'like', `%${localFormat}%`)
                                .orWhere('whatsapp', 'like', `%${shortFormat}%`)
                                .first();
                        }
                        if (u) {
                            existingUser = u;
                            userOrg = org;
                        }
                    });
                    if (existingUser) break;
                }

                // === FIX: ALWAYS log every incoming WA message to communication_logs ===
                try {
                    await logComm({
                        platform: isGroup ? 'whatsapp-group' : 'whatsapp',
                        type: 'incoming',
                        sender: isGroup ? `${rawJid}|${senderNumber}` : senderNumber,
                        recipient: 'System/Bot',
                        message: text,
                        ticketNumber: ticketNumber,
                        status: 'received',
                        department: 'ict',
                        org: userOrg || 'TCF-SG'
                    });
                } catch (wlErr) {
                    console.error('[WA_Bot] communication_logs insert error:', wlErr.message);
                }
                
                let isTech = false;
                let techOrg = null;
                
                // First check by phone number/LID
                for (const org of ['TCF-SG', 'TCF-KG']) {
                    if (await isTechnician(senderNumber, org)) {
                        isTech = true;
                        techOrg = org;
                        break;
                    }
                }
                
                // If in a group, anyone sending #close in the technician group is authorized
                if (isGroup && lowText.startsWith('#close')) {
                    const sgGroupId = await getGroupJidByName('Tehnisi Helpdesk TCFSG');
                    const kgGroupId = await getGroupJidByName('Tehnisi Helpdesk TCFKG');
                    if (jid === sgGroupId) {
                        isTech = true;
                        techOrg = 'TCF-SG';
                    } else if (jid === kgGroupId) {
                        isTech = true;
                        techOrg = 'TCF-KG';
                    }
                }
                
                if (isTech && !userOrg) userOrg = techOrg;

                let userState = userStates.get(senderNumber);

                // Handle 60-minute timeout
                if (userState && Date.now() - userState.timestamp > 60 * 60 * 1000) {
                    console.log(`[WA_Bot] Session timeout for ${senderNumber}`);
                    userStates.delete(senderNumber);
                    userState = null;
                }

                console.log(`[WA_Bot] Inbound: ${senderNumber}, Registered: ${!!existingUser} (${userOrg}), Tech: ${isTech} (${techOrg}), State: ${userState?.state || 'none'}`);

                if (!existingUser && !isTech && (!userState || !userState.state.startsWith('REG_'))) {
                    userStates.set(senderNumber, { state: 'REG_ASK_ORG', timestamp: Date.now() });
                    await sendWAMessage(jid, '👋 *SELAMAT DATANG DI ICT HELPDESK*\n\nNomor Anda belum terdaftar di sistem kami. Mohon pilih lokasi operasional pabrik Anda:\n\n*[1] TCF-SG (Sadang)*\n*[2] TCF-KG (Karawang)*\n\nBalas dengan angka 1 atau 2:');
                    continue;
                }

                // Handle Registration States
                if (userState?.state === 'REG_ASK_ORG') {
                    if (text === '1' || lowText.includes('sadang') || lowText.includes('sg')) {
                        userStates.set(senderNumber, { state: 'REG_ASK_NAME', org: 'TCF-SG', timestamp: Date.now() });
                        await sendWAMessage(jid, `Lokasi terpilih: *TCF-SG (Sadang)*\n\nSelanjutnya, silakan balas dengan *NAMA LENGKAP* Anda:`);
                    } else if (text === '2' || lowText.includes('karawang') || lowText.includes('kg')) {
                        userStates.set(senderNumber, { state: 'REG_ASK_NAME', org: 'TCF-KG', timestamp: Date.now() });
                        await sendWAMessage(jid, `Lokasi terpilih: *TCF-KG (Karawang)*\n\nSelanjutnya, silakan balas dengan *NAMA LENGKAP* Anda:`);
                    } else {
                        await sendWAMessage(jid, `❌ Pilihan tidak valid.\n\nSilakan balas dengan angka:\n*[1]* untuk TCF-SG (Sadang)\n*[2]* untuk TCF-KG (Karawang)`);
                    }
                    continue;
                }

                if (userState?.state === 'REG_ASK_NAME') {
                    userStates.set(senderNumber, { state: 'REG_ASK_EMPLOYEE_ID', org: userState.org || 'TCF-SG', name: text, timestamp: Date.now() });
                    await sendWAMessage(jid, `Halo *${text}*, selanjutnya silakan balas dengan *ID KARYAWAN* Anda:`);
                    continue;
                }

                if (userState?.state === 'REG_ASK_EMPLOYEE_ID') {
                    userStates.set(senderNumber, { state: 'REG_ASK_DEPT', org: userState.org, name: userState.name, employee_id: text, timestamp: Date.now() });
                    await sendWAMessage(jid, `Selanjutnya silakan balas dengan *DEPARTEMEN* Anda:`);
                    continue;
                }

                if (userState?.state === 'REG_ASK_DEPT') {
                    userStates.set(senderNumber, { state: 'REG_ASK_EMAIL', org: userState.org, name: userState.name, employee_id: userState.employee_id, department: text, timestamp: Date.now() });
                    await sendWAMessage(jid, `Terakhir, silakan balas dengan *EMAIL* Anda:`);
                    continue;
                }

                if (userState?.state === 'REG_ASK_EMAIL') {
                    const userName = userState.name;
                    const employeeId = userState.employee_id;
                    const userDept = userState.department;
                    const userEmail = text;
                    const selectedOrg = userState.org || 'TCF-SG';
                    try {
                        await db.runWithOrg(selectedOrg, async () => {
                            const existing = await db('users')
                                .where('email', userEmail)
                                .orWhere('employee_id', employeeId)
                                .first();

                            if (existing) {
                                await db('users').where('id', existing.id).update({
                                    name: userName,
                                    employee_id: employeeId,
                                    email: userEmail,
                                    whatsapp: senderNumber,
                                    department: userDept,
                                    updated_at: db.fn.now()
                                });
                            } else {
                                await db('users').insert({
                                    name: userName,
                                    employee_id: employeeId,
                                    email: userEmail,
                                    whatsapp: senderNumber,
                                    department: userDept,
                                    role: 'user',
                                    created_at: db.fn.now(),
                                    updated_at: db.fn.now()
                                });
                            }
                        });
                        
                        userStates.delete(senderNumber);
                        await sendWAMessage(jid, `✅ *REGISTRASI BERHASIL*\n\nTerima kasih *${userName}* (${employeeId} - ${userDept}).\nLokasi: *${selectedOrg}*\n\nSekarang Anda bisa menggunakan layanan ICT HELPDESK.\n\nKetik *#ticket* untuk membuat laporan kendala.`);
                    } catch (err) {
                        console.error('[WA_Bot] Reg Error:', err);
                        await sendWAMessage(jid, '❌ Terjadi kesalahan saat pendaftaran. Mohon coba lagi nanti.');
                    }
                    continue;
                }

                // 1. Handle #ticket
                if (lowText === '#ticket') {
                    const orgContext = userOrg || 'TCF-SG';
                    let rateLimited = false;
                    let minsLeft = 0;
                    let lastTicketNum = '';
                    
                    try {
                        await db.runWithOrg(orgContext, async () => {
                            const localUser = await db('users').where('whatsapp', senderNumber).orWhere('whatsapp', 'like', `%${senderNumber.replace(/\D/g, '')}%`).first();
                            if (localUser) {
                                const lastTicket = await db('tickets')
                                    .where('user_id', localUser.id)
                                    .orderBy('created_at', 'desc')
                                    .first();
                                
                                if (lastTicket) {
                                    const diffMins = (Date.now() - new Date(lastTicket.created_at).getTime()) / (1000 * 60);
                                    if (diffMins < 10) {
                                        rateLimited = true;
                                        minsLeft = Math.ceil(10 - diffMins);
                                        lastTicketNum = lastTicket.number;
                                    }
                                }
                            }
                        });
                    } catch (e) { console.error('Rate limit check error:', e) }
                    
                    if (rateLimited) {
                        await sendWAMessage(jid, `⚠️ *ANTI-SPAM PROTECT*\n\nAnda baru saja membuat tiket *#${lastTicketNum}*.\nSilakan tunggu *${minsLeft} menit* lagi sebelum membuat tiket baru demi kelancaran antrean.`);
                        continue;
                    }

                    userStates.set(senderNumber, { state: 'ASK_TIER1', org: orgContext, timestamp: Date.now() });
                    let list = '📌 *PILIH KATEGORI TIKET*\n\n';
                    ICT_TIER1.forEach(c => list += `${c.id}️⃣ ${c.name}\n`);
                    await sendWAMessage(jid, list + '\nBalas dengan nomor kategori (1-4).');
                    continue;
                }

                // 2. Handle #close <num> <note> (Technician Only)
                if (lowText.startsWith('#close')) {
                    if (!isTech) {
                        await sendWAMessage(jid, '❌ Hanya teknisi yang bisa menutup tiket.');
                        continue;
                    }
                    const parts = text.split(/\s+/);
                    let ticketNum = parts[1] ? parts[1].toUpperCase() : '';
                    if (ticketNum.startsWith('#')) {
                        ticketNum = ticketNum.substring(1);
                    }
                    const note = parts.slice(2).join(' ') || 'Selesai dikerjakan.';
                    
                    if (!ticketNum) {
                        await sendWAMessage(jid, '❌ Gunakan format: #close <nomor_ticket> [catatan]');
                        continue;
                    }

                    if (/^\d{1,8}$/.test(ticketNum)) {
                        const padded4 = ticketNum.padStart(4, '0');
                        const padded6 = ticketNum.padStart(6, '0');
                        let possibleFullTicket = null;
                        let isAlreadyClosedCheck = false;
                        for (const org of ['TCF-SG', 'TCF-KG']) {
                            try {
                                await db.runWithOrg(org, async () => {
                                    const t = await db('tickets')
                                        .where('number', 'like', `%-${padded4}`)
                                        .orWhere('number', 'like', `%-${padded6}`)
                                        .orderBy('created_at', 'desc').first();
                                    if (t) {
                                        possibleFullTicket = t.number;
                                        if (isClosedStatus(t.status)) {
                                            isAlreadyClosedCheck = true;
                                        }
                                    }
                                });
                            } catch (e) {
                                console.error('Error finding ticket by number:', e.message);
                            }
                            if (possibleFullTicket) break;
                        }
                        
                        if (possibleFullTicket) {
                            ticketNum = possibleFullTicket;
                            if (isAlreadyClosedCheck) {
                                await sendWAMessage(jid, `🛑 *SUDAH CLOSED*\n\nTiket #${ticketNum} sudah di-*closing* secara permanen. Tidak perlu di-close ulang ya bro.`);
                                continue;
                            }
                        } else {
                            await sendWAMessage(jid, `❌ Tiket dengan akhiran ${padded} tidak ditemukan.`);
                            continue;
                        }
                    }

                    const orgContext = ticketNum.includes('-KG-') || ticketNum.includes('TCFKG') ? 'TCF-KG' : 'TCF-SG';

                    // Check if already pending
                    if (pendingClosures.has(ticketNum)) {
                        await sendWAMessage(jid, `⏳ *MENUNGGU RESPON*\n\nTiket #${ticketNum} sedang dalam masa tunggu (1 Jam) untuk sanggahan user pembuat tiket.\nSilakan bersabar menanti respon dari user.`);
                        continue;
                    }

                    // Check if already completely closed
                    let isAlreadyClosed = false;
                    try {
                        await db.runWithOrg(orgContext, async () => {
                            const existingDbTicket = await db('tickets').whereRaw('UPPER(number) = ?', [ticketNum]).first();
                            if (existingDbTicket && isClosedStatus(existingDbTicket.status)) {
                                isAlreadyClosed = true;
                            }
                        });
                    } catch (e) { console.error('Close check db error:', e) }

                    if (isAlreadyClosed) {
                        await sendWAMessage(jid, `🛑 *SUDAH CLOSED*\n\nTiket #${ticketNum} sudah di-*closing* secara permanen. Tidak perlu di-close ulang ya bro.`);
                        continue;
                    }

                    // Close immediately
                    await closeTicketInDB(ticketNum, orgContext);
                    console.log(`[WA_Bot] Auto-closed ticket ${ticketNum} in ${orgContext}`);
                    
                    // Attempt to find user JID
                    let targetUserJid = null;
                    if (orgContext === 'TCF-SG' && typeof ostPool !== 'undefined' && ostPool) {
                        try {
                            let query = `
                                SELECT e.address 
                                FROM ost_ticket t 
                                JOIN ost_user_email e ON t.user_email_id = e.id 
                                WHERE t.number = ?
                                ORDER BY t.ticket_id DESC
                                LIMIT 1
                            `;
                            let [rows] = await ostPool.query(query, [ticketNum]);
                            if (rows.length > 0 && rows[0].address) {
                                let addr = rows[0].address;
                                let phone = addr.split('@')[0];
                                if (!/^\d+$/.test(phone)) {
                                    targetUserJid = null; // Let it fallback to local DB
                                } else if (!phone.startsWith('62') || phone.length >= 14) {
                                    targetUserJid = phone + '@lid';
                                } else {
                                    targetUserJid = phone + '@s.whatsapp.net';
                                }
                            } else {
                                query = `
                                    SELECT u.id, u.name
                                    FROM ost_ticket t 
                                    JOIN ost_user u ON t.user_id = u.id 
                                    WHERE t.number = ?
                                    LIMIT 1
                                `;
                                [rows] = await ostPool.query(query, [ticketNum]);
                                if (rows.length > 0) {
                                    const userId = rows[0].id;
                                    query = `
                                        SELECT e.address 
                                        FROM ost_user_email e 
                                        WHERE e.user_id = ? 
                                        AND e.address IS NOT NULL 
                                        AND e.address != ''
                                        LIMIT 1
                                    `;
                                    const [emailRows] = await ostPool.query(query, [userId]);
                                    if (emailRows.length > 0) {
                                        let addr = emailRows[0].address;
                                        let phone = addr.split('@')[0];
                                        if (!/^\d+$/.test(phone)) {
                                            targetUserJid = null; // Let it fallback to local DB
                                        } else if (!phone.startsWith('62') || phone.length >= 14) {
                                            targetUserJid = phone + '@lid';
                                        } else {
                                            targetUserJid = phone + '@s.whatsapp.net';
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error(`[WA_Bot] Error resolving user JID from osTicket:`, err);
                        }
                    }

                    // Fallback to local DB
                    if (!targetUserJid) {
                        try {
                            await db.runWithOrg(orgContext, async () => {
                                const localTicket = await db('tickets').whereRaw('UPPER(number) = ?', [ticketNum]).first();
                                if (localTicket) {
                                    const localUser = await db('users').where('id', localTicket.user_id).first();
                                    if (localUser && localUser.whatsapp) {
                                        let lp = String(localUser.whatsapp).replace(/\D/g, '');
                                        if (lp.startsWith('0')) lp = '62' + lp.substring(1);
                                        targetUserJid = (!lp.startsWith('62') || lp.length >= 14) ? lp + '@lid' : lp + '@s.whatsapp.net';
                                    }
                                }
                            });
                        } catch (err) {
                            console.error(`[WA_Bot] Error resolving user JID from Local DB:`, err);
                        }
                    }

                    const targetUserLog = targetUserJid ? targetUserJid.split('@')[0] : 'TIDAK DITEMUKAN';
                    await sendWAMessage(jid, `✅ Konfirmasi penutupan dikirim ke pembuat tiket #${ticketNum} (Target: ${targetUserLog}). Tiket telah resmi ditutup.`);
                    
                    if (targetUserJid) {
                        await sendWAMessage(targetUserJid, `✅ *TICKET SELESAI*\n\nTiket #${ticketNum} telah diselesaikan teknisi.\n📝 *Catatan:* ${note}\n\nTerima kasih telah menggunakan layanan ICT Helpdesk.`);
                    }
                    continue;
                }

                // 3. Handle "BELUM SELESAI"
                if (lowText.includes('belum selesai')) {
                    let foundKey = null;
                    for (const [key, val] of pendingClosures.entries()) {
                        if (val.userJid === jid || (key === val.ticketNum && val.userJid === null)) {
                            foundKey = key;
                            break;
                        }
                    }

                    if (foundKey) {
                        const data = pendingClosures.get(foundKey);
                        clearTimeout(data.timeoutId);
                        pendingClosures.delete(foundKey);
                        await sendWAMessage(jid, '✅ Laporan diterima. Tiket tetap terbuka dan teknisi telah dikabari.');
                        
                        await db.runWithOrg(data.org, async () => {
                            const localTicket = await db('tickets').where('number', data.ticketNum).first();
                            if (localTicket && localTicket.status === 'Resolved') {
                                await db('tickets').where('number', data.ticketNum).update({ status: 'Diproses', updated_at: db.fn.now() });
                                const orgContext = data.org || 'TCF-SG';
                                const { technicianNumber } = await getForwardingNumbers(orgContext);
                                const groupName = orgContext === 'TCF-KG' ? 'Tehnisi Helpdesk TCFKG' : 'Tehnisi Helpdesk TCFSG';
                                let targetJid = await getGroupJidByName(groupName) || technicianNumber;
                                
                                await sendWAMessage(targetJid, `⚠️ *USER KEBERATAN*\n\nUser melaporkan tiket #${data.ticketNum} belum selesai. Mohon diperiksa.`);
                            }
                        });
                        continue;
                    }
                }

                // 4. Handle states
                const state = userStates.get(senderNumber);
                if (state) {
                    if (state.state === 'ASK_TIER1') {
                        const tier1 = ICT_TIER1.find(c => c.id == text);
                        if (tier1) {
                            if (tier1.id === 4) {
                                // Lain-lain -> langsung tanya deskripsi
                                userStates.set(senderNumber, { state: 'ASK_DESC', org: state.org, cat: tier1.name, timestamp: Date.now() });
                                await sendWAMessage(jid, `📝 Deskripsikan pertanyaan/kebutuhan Anda untuk *${tier1.name}*:`);
                            } else {
                                userStates.set(senderNumber, { state: 'ASK_TIER2', org: state.org, tier1: tier1, timestamp: Date.now() });
                                let list = `📌 *PILIH JENIS ${tier1.name.toUpperCase()}*\n\n`;
                                ICT_TIER2[tier1.id].forEach(c => list += `${c.id}. ${c.name}\n`);
                                await sendWAMessage(jid, list + `\nBalas dengan nomor pilihan (1-${ICT_TIER2[tier1.id].length}).`);
                            }
                        } else {
                            await sendWAMessage(jid, '❌ Kategori tidak valid. Pilih 1-4.');
                        }
                        continue;
                    }
                    if (state.state === 'ASK_TIER2') {
                        const tier1 = state.tier1;
                        const tier2 = ICT_TIER2[tier1.id].find(c => c.id == text);
                        if (tier2) {
                            const fullCategory = `${tier1.name} - ${tier2.name}`;
                            if (tier1.id === 2) {
                                // Perbaikan -> minta ID Aset
                                userStates.set(senderNumber, { state: 'ASK_ASSET', org: state.org, cat: fullCategory, timestamp: Date.now() });
                                await sendWAMessage(jid, `Anda memilih *${fullCategory}*.\n\n💻 Silakan ketik *Nomor Label Aset* yang bermasalah (Contoh: TCFSG-ICT-PC-001).\n\nKetik *SKIP* jika tidak tahu.`);
                            } else {
                                userStates.set(senderNumber, { state: 'ASK_DESC', org: state.org, cat: fullCategory, timestamp: Date.now() });
                                await sendWAMessage(jid, `📝 Deskripsikan masalah untuk *${fullCategory}*:`);
                            }
                        } else {
                            await sendWAMessage(jid, `❌ Pilihan tidak valid. Pilih 1-${ICT_TIER2[tier1.id].length}.`);
                        }
                        continue;
                    }
                    if (state.state === 'ASK_ASSET') {
                        const assetId = text.trim();
                        userStates.set(senderNumber, { state: 'ASK_DESC', org: state.org, cat: state.cat, asset_id: assetId.toUpperCase() === 'SKIP' ? null : assetId, timestamp: Date.now() });
                        await sendWAMessage(jid, `✅ Aset dicatat.\n\n📝 Sekarang, deskripsikan detail masalah/kerusakannya:`);
                        continue;
                    }
                    if (state.state === 'ASK_DESC') {
                        const category = state.cat;
                        const description = text;
                        const asset_id = state.asset_id;
                        const orgContext = state.org || 'TCF-SG';
                        const finalName = existingUser?.name || senderName;
                        const finalDept = existingUser?.department || 'N/A';
                        
                        // Create ticket logic here
                        const ticketNum = await createTicket(finalName, senderNumber, `${category}: ${description}`, orgContext, asset_id);
                        if (!ticketNum) {
                            await sendWAMessage(jid, '❌ Maaf, terjadi kesalahan saat menyimpan tiket ke database. Silakan coba ulangi atau hubungi IT.');
                            userStates.delete(senderNumber);
                            continue;
                        }
                        userStates.delete(senderNumber);
                        
                        let troubleshootText = "1. Tunggu teknisi untuk melakukan pengecekan.\n2. Siapkan informasi detail jika diminta.";
                        if (category.includes('Hardware') || category.includes('PC')) troubleshootText = '1. Pastikan kabel daya (power cord) sudah terkoneksi.\n2. Jangan paksakan nyala jika tercium bau hangus.\n3. (Bagi peminta hardware baru) Pastikan Form Pengajuan sudah ditandatangani.';
                        else if (category.includes('Jaringan') || category.includes('Internet')) troubleshootText = '1. Coba putuskan koneksi (Forget WiFi) lalu hubungkan ulang.\n2. Cek apakah website lain bisa dibuka.';
                        else if (category.includes('Printer')) troubleshootText = '1. Jangan paksa tarik kertas jika paper jam.\n2. Cek apakah tinta atau kertas benar-benar habis.';
                        else if (category.includes('Akun')) troubleshootText = '1. Cek folder Spam jika request email.\n2. Pastikan Anda punya otorisasi untuk request ini.';
                        
                        let assetNote = asset_id ? `\n💻 Asset ID: *${asset_id}*` : '';
                        const userMessage = `🎫 *TICKET DIBUAT*\n\nHalo *${finalName}*,\n\n📋 Nomor: *#${ticketNum}*\n📂 Kategori: *${category}*${assetNote}\n🏢 Lokasi: *${orgContext}*\n📝 Masalah: ${description}\n\n---\n🤖 *TROUBLESHOOTING*\n\n${troubleshootText}\n\n⏳ Tim IT akan segera memproses laporan Anda. Terima kasih!`;

                        await sendWAMessage(jid, userMessage);
                        
                        const { technicianNumber } = await getForwardingNumbers(orgContext);
                        const groupName = orgContext === 'TCF-KG' ? 'Tehnisi Helpdesk TCFKG' : 'Tehnisi Helpdesk TCFSG';
                        let targetJid = await getGroupJidByName(groupName) || technicianNumber;
                        
                        const techMessage = `🛠️ *TUGAS BARU: PERLU TINDAKAN*\n━━━━━━━━━━━━━━━\n🆔 TICKET: *#${ticketNum}*\n📂 Kategori: *${category}*\n🏢 Lokasi: *${orgContext}*\n👤 USER: *${finalName}*\n📱 Departement: *${finalDept}*\n📝 MASALAH:\n"${description}"\n━━━━━━━━━━━━━━━\n⏱️ RESPON SLA: *2 Jam*\n🚀 _Segera tindak lanjuti, semangat!_`;
                        
                        if (targetJid) {
                            await sendWAMessage(targetJid, techMessage);
                        } else {
                            console.error(`[WA_Bot] WARNING: No technician group or number found for ${orgContext}`);
                            await sendWAMessage(jid, '⚠️ Tiket berhasil dibuat, tetapi sistem gagal menemukan kontak teknisi. Mohon hubungi IT secara langsung.');
                        }
                        // CC to ICT - TCF removed per user request
                        continue;
                    }
                }

                // 5. Default Fallback (Registered User & No Active Flow)
                if (!userState) {
                    if (isTech) {
                        await sendWAMessage(jid, `🤖 *ICT HELPDESK TECHNICIAN MENU*\n\nHalo *${existingUser?.name || senderName}*!\n\nAnda terdaftar sebagai *Teknisi* di sistem kami.\n\n📌 Ketik *#close <nomor_tiket> [catatan]* : Untuk menutup tiket yang sudah selesai dikerjakan.\nContoh: *#close ICT-TCFSG-03-0005 Selesai perbaikan kabel LAN*\n\n_System ICT Helpdesk - Technician Workspace._`, null, false);
                    } else {
                        // Send fallback message but DO NOT log it to communication_logs
                        await sendWAMessage(jid, `🤖 *ICT HELPDESK ASSISTANT*\n\nHalo *${existingUser?.name || senderName}*!\n\nSepertinya Anda ingin menghubungi bantuan ICT.\n\n📌 Ketik *#ticket* : Untuk membuat laporan kendala baru.\n\n_System ICT Helpdesk - Reliable Support for Modern Infrastructure._`, null, false);
                    }
                }

            } catch (msgErr) { 
                console.error('[WA_Bot] Error processing individual message:', msgErr); 
            }
        }
        } catch (evErr) {
            console.error('[WA_Bot] Critical error in messages.upsert handler:', evErr);
        }
    });
    console.log('[WA_Bot] ✅ All event listeners registered successfully.');
}

async function getGroupJidByName(name) {
    if (!sock) return null;
    try {
        const groups = await sock.groupFetchAllParticipating();
        for (const id in groups) {
            if (groups[id].subject && groups[id].subject.includes(name)) {
                return id;
            }
            // Fallback for ICT - TCF
            if (name === 'ICT - TCF' && groups[id].subject) {
                const sub = groups[id].subject.toUpperCase();
                if (sub.includes('ICT') && sub.includes('TCF') && !sub.includes('HELPDESK')) {
                    return id;
                }
            }
        }
        console.log(`[WA_Bot] getGroupJidByName('${name}') failed.`);
    } catch (e) { console.error('Error finding group JID:', e); }
    return null;
}

async function generateTicketNumber(org = 'TCF-SG') {
    const prefix = org === 'TCF-KG' ? 'ICT-TCFKG-03-' : 'ICT-TCFSG-03-';
    return await db.runWithOrg(org, async () => {
        try {
            const rows = await db('tickets')
                .where('number', 'like', `${prefix}%`)
                .select('number');
            
            let maxSeq = 0;
            const regex = new RegExp(`^${prefix}(\\d+)$`);
            for (const r of rows) {
                if (!r.number) continue;
                if (r.number.includes('-IR-') || r.number.includes('-MR-') || r.number.includes('-R-')) continue;
                const match = r.number.match(regex);
                if (match) {
                    const seq = parseInt(match[1], 10);
                    if (seq > maxSeq) {
                        maxSeq = seq;
                    }
                }
            }
            
            const nextSeq = maxSeq > 0 ? maxSeq + 1 : 1;
            return prefix + String(nextSeq).padStart(5, '0');
        } catch (e) {
            console.error('Error generating ticket number:', e);
            return prefix + String(Math.floor(1000 + Math.random() * 9000)).padStart(5, '0');
        }
    });
}

async function createTicket(userName, phoneNumber, message, org = 'TCF-SG', asset_id = null) {
    console.log(`[WA_Bot] Creating ticket for: ${userName} (${phoneNumber}) in ${org}`);
    
    let ticketNumber = await generateTicketNumber(org);

    // Local DB sync
    await db.runWithOrg(org, async () => {
        try {
            let localUserId = null;
            const existingUser = await db('users').where('whatsapp', phoneNumber).first();
            if (existingUser) {
                localUserId = existingUser.id;
            } else {
                await db('users').insert({ name: userName, whatsapp: phoneNumber, role: 'user', created_at: db.fn.now(), updated_at: db.fn.now() });
                const newUser = await db('users').where('whatsapp', phoneNumber).first();
                localUserId = newUser ? newUser.id : null;
            }
            
            // Sanitize asset_id (must be an integer)
            let sanitizedAssetId = null;
            if (asset_id && !isNaN(parseInt(asset_id, 10))) {
                sanitizedAssetId = parseInt(asset_id, 10);
            }
            
            const catMatch = message.match(/^([^:]+):/);
            const category = catMatch ? catMatch[1].trim() : 'Lainnya';
            const subject = `[${category}] - ${message}`;
            await db('tickets').insert({ 
                number: ticketNumber, 
                user_id: localUserId, 
                subject, 
                description: message, 
                status: 'Diajukan', 
                priority: 'Medium', 
                source: 'Phone',
                category: category,
                asset_id: sanitizedAssetId,
                created_at: db.fn.now(), 
                updated_at: db.fn.now() 
            });
            console.log(`[WA_Bot] ✅ Ticket #${ticketNumber} saved to local DB (${org}) for user ${localUserId}`);
        } catch (dbE) { 
            console.error('[WA_Bot] Local DB Error on createTicket:', dbE.message); 
            ticketNumber = null;
        }
    });

    return ticketNumber;
}

router.get('/wa-status', (req, res) => res.json(global.waStatus));

router.get('/groups', async (req, res) => {
    if (!sock) return res.status(500).json({ error: 'WhatsApp not initialized' });
    try {
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups).map(g => ({ id: g.id, subject: g.subject }));
        res.json({ success: true, groups: groupList });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/wa-pair', async (req, res) => {
    try {
        let { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required' });
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        if (!sock) return res.status(400).json({ error: 'WhatsApp socket not ready' });
        
        console.log(`[WA_Bot] Requesting pairing code for ${phone}...`);
        const code = await sock.requestPairingCode(phone);
        res.json({ code });
    } catch (err) {
        console.error('[WA_Bot] Pairing code error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to reset session (Logout and delete auth folder)
router.post('/wa-logout', async (req, res) => {
    try {
        console.log('[WA_Bot] /wa-logout called by API');
        await logoutWhatsApp();
        res.json({ success: true, message: 'WhatsApp session reset successfully. Please scan new QR code.' });
    } catch (err) {
        console.error('[WA_Bot] Error resetting session:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to force restart the connection
router.post('/wa-restart', async (req, res) => {
    try {
        console.log('[WA_Bot] /wa-restart called by API');
        // Clear any pending timeouts
        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
        }
        
        if (sock) {
            try {
                sock.ev.removeAllListeners('connection.update');
                sock.ev.removeAllListeners('creds.update');
                sock.ev.removeAllListeners('messages.upsert');
                sock.end();
            } catch (e) {
                console.error('[WA_Bot] Error ending socket on restart:', e);
            }
            sock = null;
        }
        
        global.waStatus.status = 'RECONNECTING';
        global.waStatus.qr = null;
        global.waStatus.updatedAt = new Date();
        
        // Reinitialize
        connectionRetryCount = 0;
        await initWhatsApp(true);
        
        res.json({ success: true, message: 'WhatsApp connection restarting...' });
    } catch (err) {
        console.error('[WA_Bot] Error restarting session:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint for requesting pairing code
router.post('/wa-pair', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required' });
        
        if (!sock) {
            console.log('[WA_Bot] Init socket for pairing code');
            await initWhatsApp(true);
            await new Promise(resolve => setTimeout(resolve, 3000)); // wait for socket to initialize
        }
        
        if (sock && !sock.authState?.creds?.me) {
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
            const code = await sock.requestPairingCode(cleanPhone);
            res.json({ success: true, code });
        } else {
            res.status(400).json({ error: 'Bot already logged in or socket not ready' });
        }
    } catch (err) {
        console.error('[WA_Bot] Error requesting pairing code:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint for other apps (like Infra Guard) to send WA messages via ICT bot
router.post('/send-message', async (req, res) => {
    try {
        const { to, message, ticketNumber } = req.body;
        if (!to || !message) {
            return res.status(400).json({ error: 'Missing "to" or "message" fields' });
        }
        if (global.waStatus.status !== 'CONNECTED' || !sock) {
            return res.status(503).json({ error: 'WhatsApp Bot is not connected' });
        }
        
        // Format phone number
        let formattedTo = to.toString();
        
        // Resolve dynamic targets
        if (formattedTo === 'ANDON') {
            const setting = await db('settings').where({ section: 'notifications', key: 'andon_target' }).first();
            if (setting) {
                formattedTo = JSON.parse(setting.value);
                if (!formattedTo) formattedTo = '6282135353242';
            } else {
                formattedTo = '6282135353242';
            }
        } else if (formattedTo === 'INFRAGUARD') {
            const setting = await db('settings').where({ section: 'notifications', key: 'infraguard_target' }).first();
            if (setting) {
                formattedTo = JSON.parse(setting.value);
                if (!formattedTo) formattedTo = '6282135353242';
            } else {
                formattedTo = '6282135353242';
            }
        } else if (formattedTo.startsWith('GROUP:')) {
            const groupName = formattedTo.substring(6).trim();
            const groupJid = await getGroupJidByName(groupName);
            if (groupJid) {
                formattedTo = groupJid;
            } else {
                throw new Error(`Group ${groupName} not found by bot`);
            }
        }

        // Jika to target group id (e.g. 12036... @g.us), jangan di-strip non-digits
        if (formattedTo.includes('@g.us')) {
            // Already a valid Group JID
        } else {
            formattedTo = formattedTo.replace(/\D/g, '');
            if (formattedTo.startsWith('0')) formattedTo = '62' + formattedTo.substring(1);
            if (!formattedTo.endsWith('@s.whatsapp.net')) {
                formattedTo = formattedTo + '@s.whatsapp.net';
            }
        }
        
        await sendWAMessage(formattedTo, message, ticketNumber);
        res.json({ success: true, message: 'Message queued for sending' });
    } catch (err) {
        console.error('[WA_Bot] Error sending API message:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// SLA MONITORING CRON JOB
// Runs every 5 minutes to check for tickets heavily delayed
// ---------------------------------------------------------
setInterval(async () => {
    try {
        if (!sock || global.waStatus.status !== 'CONNECTED') return;

        const CLOSED_STATUSES = ['closed', 'selesai', 'resolved', 'tutup', 'cancelled'];
        const now = Date.now();

        // Check tickets across both organizations
        for (const org of ['TCF-SG', 'TCF-KG']) {
            await db.runWithOrg(org, async () => {
                // Fetch all unresolved tickets (Only Helpdesk tickets, ignore Auto-Alerts)
                const openTickets = await db('tickets')
                    .whereNotIn(db.raw('LOWER(status)'), CLOSED_STATUSES)
                    .where('number', 'like', 'ICT-TCF%');

                for (const ticket of openTickets) {
                    if (!ticket.number) continue;
                    if (ticket.number.includes('-IR-') || ticket.number.includes('-MR-') || ticket.number.includes('-R-')) continue;
                    // Calculate minutes passed since creation
                    const passedMins = (now - new Date(ticket.created_at).getTime()) / (1000 * 60);

                    // If ticket is between 1h 45m and 2h old, and hasn't been warned yet
                    if (passedMins >= 105 && passedMins < 120 && !warnedTickets.has(ticket.number)) {
                        warnedTickets.add(ticket.number);
                        
                        // Get User Name
                        const userName = await db('users').where('id', ticket.user_id).first().then(u => u?.name || 'User');
                        
                        const groupName = (ticket.organization || org) === 'TCF-KG' ? 'Tehnisi Helpdesk TCFKG' : 'Tehnisi Helpdesk TCFSG';
                        let targetJid = await getGroupJidByName(groupName);

                        const alertMsg = `⚠️ *WARNING: TIKET MENGENDAP* ⚠️\n\nTiket #${ticket.number} (${userName}) sudah hampir 2 Jam belum direspon!\nSegera tindak lanjuti agar tidak melampaui batas SLA.`;
                        
                        if (targetJid) {
                            await sendWAMessage(targetJid, alertMsg, ticket.number); // Log to DB with ticket context
                        }
                        
                        console.log(`[WA_Bot] Sent SLA Warning for ticket #${ticket.number} (${org})`);
                    }
                }
            });
        }
    } catch (e) {
        console.error('[WA_Bot] Error in SLA cron job:', e);
    }
}, 5 * 60 * 1000); // Check every 5 minutes

// ---------------------------------------------------------
// CENTRAL SYSTEM HEALTH & ISP MONITORING CRON JOB
// Runs every 10 minutes
// ---------------------------------------------------------
const { exec } = require('child_process');
const axios = require('axios');

let alertsState = {
    igDown: false,
    paDown: false,
    ispDegraded: false,
    cpuHigh: false
};

setInterval(async () => {
    try {
        if (!sock || global.waStatus.status !== 'CONNECTED') return;

        const settingsRows = await db('settings').where({ section: 'monitoring' });
        const config = {};
        for (const row of settingsRows) {
            try { config[row.key] = JSON.parse(row.value); } catch(e) { config[row.key] = row.value; }
        }

        const enablePA = config.enable_pa !== false;
        const targetGroupPA = config.pa_target_group || 'ICT - TCF';
        const enableIG = config.enable_ig !== false;
        const targetGroupIG = config.ig_target_group || 'Tehnisi Helpdesk TCFKG';
        const cpuThreshold = config.cpu_threshold || 85;
        const enableISP = config.enable_isp !== false;
        const targetGroupISP = config.isp_target_group || 'ICT - TCF';
        const ispLatencyThreshold = config.isp_latency_threshold || 150;

        let groups = {};
        function addAlert(group, text, isResolved=false) {
            if (!groups[group]) groups[group] = { current: [], resolved: [] };
            if (isResolved) groups[group].resolved.push(text);
            else groups[group].current.push(text);
        }

        // 1. (Removed Power Asset UP/DOWN Check - Handled by Uptime Kuma)

        // 2. Check Mikrotik CPU Load via Infra Guard
        if (enableIG) {
            try {
                const igRes = await axios.get('http://192.168.1.3/dashboard', { timeout: 10000 });
                if (igRes.data?.network?.data) {
                    const cpu = igRes.data.network.data.cpu;
                    if (cpu > cpuThreshold) {
                        if (!alertsState.cpuHigh) {
                            alertsState.cpuHigh = true;
                            addAlert(targetGroupIG, `⚠️ *Mikrotik Alert*: CPU Load is critically high (${cpu}% - Limit: ${cpuThreshold}%)`);
                        }
                    } else if (alertsState.cpuHigh) {
                        alertsState.cpuHigh = false;
                        addAlert(targetGroupIG, `✅ *Mikrotik Alert*: CPU Load returned to normal (${cpu}%)`, true);
                    }
                }
            } catch (e) {
                // Ignore connection errors (UP/DOWN handled by Uptime Kuma)
            }
        }

        const dispatchAlerts = async () => {
            for (const [groupName, alerts] of Object.entries(groups)) {
                if (alerts.current.length === 0 && alerts.resolved.length === 0) continue;
                let msg = `🔔 *SYSTEM ALERT* 🔔\n\n`;
                if (alerts.current.length > 0) msg += `*NEW ALERTS:*\n${alerts.current.join('\n')}\n\n`;
                if (alerts.resolved.length > 0) msg += `*RESOLVED:*\n${alerts.resolved.join('\n')}\n\n`;
                msg += `_(Monitoring Modul Sistem)_`;

                const jid = await getGroupJidByName(groupName) || '120363043498526316@g.us';
                if (jid) {
                    await sendWAMessage(jid, msg.trim(), null, false);
                }
            }
        };

        // 3. Check ISP / Bandwidth (Handled by Smart Dual-ISP Monitor in services/isp_monitor.js)
        // Legacy generic ping disabled to prevent duplicate/unlabeled ISP alerts
        await dispatchAlerts();

} catch (e) {
        console.error('[WA_Bot] Error in Health cron job:', e);
    }
}, 10 * 60 * 1000); // Check every 10 minutes

// ---------------------------------------------------------
// WEEKLY MAINTENANCE CHECKSHEET REMINDER
// Runs every Monday at 08:00 AM
// ---------------------------------------------------------
const cron = require('node-cron');

cron.schedule('0 8 * * 1', async () => {
    try {
        if (!sock || global.waStatus.status !== 'CONNECTED') return;

        // Fetch settings from DB
        const settings = await db('settings').where('section', 'monitoring');
        const getSetting = (key) => settings.find(s => s.key === key)?.value;

        const isEnabled = getSetting('enable_maintenance') === '1' || getSetting('enable_maintenance') === 'true';
        let targetGroupStr = getSetting('maintenance_target_group');
        
        if (!isEnabled || !targetGroupStr) return;
        
        try { targetGroupStr = JSON.parse(targetGroupStr); } catch(e) {}
        if (!targetGroupStr) return;

        const jid = await getGroupJidByName(targetGroupStr);
        if (!jid) return;

        const link = "http://192.168.1.66:5000/ict/maintenance";
        const msg = `🛠️ *JADWAL PREVENTIVE MAINTENANCE MINGGUAN* 🛠️\n\nSelamat Pagi Tim IT,\n\nMohon untuk segera melaksanakan jadwal pengecekan fisik (hardware) dan pembersihan junk/cache pada perangkat PC/Laptop *End-User* untuk minggu ini.\n\nSilakan isi Checksheet Digital melalui link berikut (Wajib Login):\n🔗 ${link}\n\n_Zero Downtime is our priority!_\n- *Power Asset Automation*`;

        await sendWAMessage(jid, msg, 'MAINTENANCE_CRON', false);
        console.log('[WA_Bot] Sent weekly maintenance checksheet to group:', targetGroupStr);

    } catch (err) {
        console.error('[WA_Bot] Error sending weekly maintenance:', err);
    }
});

// TEST ROUTE FOR WEEKLY MAINTENANCE
router.post('/test-maintenance', async (req, res) => {
    try {
        if (!sock || global.waStatus.status !== 'CONNECTED') {
            return res.status(500).json({ error: 'WA bot not connected' });
        }

        const settings = await db('settings').where('section', 'monitoring');
        const getSetting = (key) => settings.find(s => s.key === key)?.value;

        const isEnabled = getSetting('enable_maintenance') === '1' || getSetting('enable_maintenance') === 'true';
        let targetGroupStr = getSetting('maintenance_target_group');
        
        if (!isEnabled || !targetGroupStr) {
            return res.status(400).json({ error: 'Maintenance monitoring not enabled or target group not set in settings' });
        }
        
        try { targetGroupStr = JSON.parse(targetGroupStr); } catch(e) {}

        const jid = await getGroupJidByName(targetGroupStr);
        if (!jid) {
            return res.status(404).json({ error: 'Group JID not found for group: ' + targetGroupStr });
        }

        const link = "http://192.168.1.66:5000/ict/maintenance";
        const msg = `🛠️ *JADWAL PREVENTIVE MAINTENANCE MINGGUAN* 🛠️\n\nSelamat Pagi Tim IT,\n\nMohon untuk segera melaksanakan jadwal pengecekan fisik (hardware) dan pembersihan junk/cache pada perangkat PC/Laptop *End-User* untuk minggu ini.\n\nSilakan isi Checksheet Digital melalui link berikut (Wajib Login):\n🔗 ${link}\n\n_Zero Downtime is our priority!_\n- *Power Asset Automation*`;

        await sendWAMessage(jid, msg, 'MAINTENANCE_CRON_TEST', false);
        return res.json({ success: true, message: 'Maintenance message test sent successfully to ' + targetGroupStr });
    } catch (err) {
        console.error('[WA_Bot] Error testing maintenance alert:', err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = { initWhatsApp, logoutWhatsApp, router };

if (require.main === module) {
    initWhatsApp();
    const botApp = express();
    botApp.use(express.json());
    botApp.use('/', router);
    const apiPort = process.env.PORT || 5002;
    botApp.listen(apiPort, '0.0.0.0', () => console.log('WA Bot API on ' + apiPort));
}
