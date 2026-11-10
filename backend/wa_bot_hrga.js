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
const authDir = process.env.WA_AUTH_DIR_HRGA || path.join(__dirname, 'whatsapp_auth_hrga');

if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
}

const userStates = new Map();
const pendingClosures = new Map();
const warnedTickets = new Set(); // Stores tickets that have already been warned for SLA

global.hrgaWaStatus = { status: 'INITIALIZING', qr: null, updatedAt: new Date(), mode: 'real' };

let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 5;
let reconnectTimeoutId = null;

const HRGA_CATEGORIES = [
    { id: 1, name: 'Kendaraan' },
    { id: 2, name: 'Fasilitas Gedung' },
    { id: 3, name: 'Fasilitas Kantor' },
    { id: 4, name: 'Keamanan & K3' }
];

async function getForwardingNumbers() {
    try {
        // Cek target di tab Notification Routing terlebih dahulu
        let hrgaTarget = await db('settings').where({ section: 'notifications', key: 'hrga_target' }).first();
        if (hrgaTarget) hrgaTarget = JSON.parse(hrgaTarget.value);

        // Fallback ke konfigurasi lama
        const supervisorSetting = await db('settings').where({ section: 'tickets', key: 'wa_supervisor' }).first();
        const technicianSetting = await db('settings').where({ section: 'tickets', key: 'wa_technician' }).first();
        const lidSetting = await db('settings').where({ section: 'tickets', key: 'technician_lid' }).first();
        return {
            supervisorNumber: supervisorSetting ? JSON.parse(supervisorSetting.value) : null,
            technicianNumber: hrgaTarget || (technicianSetting ? JSON.parse(technicianSetting.value) : '6282135353242'),
            technicianLid: lidSetting ? lidSetting.value : null
        };
    } catch (e) {
        return { supervisorNumber: null, technicianNumber: '6282135353242', technicianLid: null };
    }
}

async function isTechnician(number) {
    const { supervisorNumber, technicianNumber, technicianLid } = await getForwardingNumbers();
    const cleanNumber = number.replace(/\D/g, '');
    const cleanTech = String(technicianNumber).replace(/\D/g, '');
    const cleanLid = technicianLid ? String(technicianLid).replace(/\D/g, '') : '';
    const cleanSpv = supervisorNumber ? String(supervisorNumber).replace(/\D/g, '') : '';
    
    console.log(`[WA_Bot_HRGA] isTechnician check: Inbound: ${cleanNumber}, Tech: ${cleanTech}, LID: ${cleanLid}, Spv: ${cleanSpv}`);
    
    const isMatch = cleanNumber === cleanTech || cleanNumber === cleanLid || cleanNumber === cleanSpv;
    return isMatch;
}

async function sendWAMessage(to, text, ticketNumber = null, shouldLog = true) {
    if (process.env.WA_IPC_MODE === 'api') {
        try {
            // Forward to the external bot runner
            const axios = require('axios');
            await axios.post('http://127.0.0.1:5003/send-message', { to, message: text, ticketNumber, shouldLog });
            return true;
        } catch (e) {
            console.error('[WA_IPC] Failed to send to HRGA bot runner:', e.message);
            return false;
        }
    }
    if (!sock || global.hrgaWaStatus.status !== 'CONNECTED') {
        console.warn('[WA_Bot_HRGA] Cannot send: Bot not connected');
        return false;
    }
    try {
        const jid = to.includes('@') ? to : to + '@s.whatsapp.net';
        console.log(`[WA_Bot_HRGA] Sending to ${jid}: ${text.substring(0, 50)}...`);
        
        // Add human-like typing/sending delay (1.5s - 3s)
        const delayMs = Math.floor(Math.random() * 1500) + 1500;
        await new Promise(resolve => setTimeout(resolve, delayMs));

        await sock.sendMessage(jid, { text });
        
        // Log outgoing message only if related to ticket/reg
        if (shouldLog) {
            await logComm({
                department: 'hrga',
                platform: 'whatsapp',
                type: 'outgoing',
                sender: 'System Bot',
                recipient: jid,
                message: text,
                ticketNumber: ticketNumber,
                status: 'sent'
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
        console.error('[WA_Bot_HRGA] Send error:', e);
        return false;
    }
}

async function closeTicketInDB(ticketNumber) {
    let success = false;
    warnedTickets.add(ticketNumber);
    if (ostPool) {
        try {
            await ostPool.query('UPDATE ost_ticket SET status_id = 3, updated = NOW() WHERE number = ?', [ticketNumber]);
            success = true;
        } catch (e) {
            console.error('[WA_Bot_HRGA] osTicket Close error:', e);
        }
    }
    try {
        await db('tickets').where('number', ticketNumber).update({ status: 'Closed', updated_at: db.fn.now() });
        success = true;
    } catch (e) {
        console.error('[WA_Bot_HRGA] Local DB Close error:', e);
    }
    return success;
}

async function logoutWhatsApp() {
    console.log('[WA_Bot_HRGA] Triggering explicit logout/session reset...');
    
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
            console.error('[WA_Bot_HRGA] Error ending socket on logout:', e);
        }
        sock = null;
    }
    
    global.hrgaWaStatus.status = 'LOGGED_OUT';
    global.hrgaWaStatus.qr = null;
    global.hrgaWaStatus.updatedAt = new Date();
    
    // Clear the auth folder
    try {
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
            console.log('[WA_Bot_HRGA] Auth folder deleted successfully.');
        }
    } catch (e) {
        console.error('[WA_Bot_HRGA] Failed to delete auth folder:', e);
    }
    
    // Do not automatically regenerate QR code on logout. Wait for manual trigger.
    // connectionRetryCount = 0;
    // await initWhatsApp();
}

async function initWhatsApp(isManual = false) {
    console.log('[WA_Bot_HRGA] Starting...');
    
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
        global.hrgaWaStatus.status = 'LOGGED_OUT';
        return;
    }
    
    // Clear any pending reconnect timeouts
    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }
    
    if (sock) {
        console.log('[WA_Bot_HRGA] Closing existing WhatsApp socket before reconnecting...');
        try {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.ev.removeAllListeners('messages.upsert');
            sock.ev.removeAllListeners('messaging-history.set');
            sock.end();
        } catch (e) {
            console.error('[WA_Bot_HRGA] Error ending old socket:', e);
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
        markOnlineOnConnect: true, // FIX: true prevents WA Web from thinking session is inactive and logging out
        linkPreview: false,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 2000, // Increased delay to prevent rapid spam
        keepAliveIntervalMs: 25000,
        defaultQueryTimeoutMs: undefined,
        getMessage: async (key) => {
            return { conversation: 'hello' };
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        global.hrgaWaStatus.updatedAt = new Date();
        
        if (qr) {
            global.hrgaWaStatus.status = 'WAITING_QR';
            global.hrgaWaStatus.qr = qr;
        }
        if (connection === 'open') {
            global.hrgaWaStatus.status = 'CONNECTED';
            global.hrgaWaStatus.qr = null;
            connectionRetryCount = 0; // reset retry counter
            console.log('[WA_Bot] ✅ Connected to WhatsApp HRGA - messages.upsert listener is ACTIVE');
            
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
            // 401 = Logged Out, 403 = Forbidden, 440 = Connection Replaced, 500 = Bad Session
            const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;
            const isConflict = statusCode === 440;
            const isUnrecoverable = isLoggedOut;
            const shouldReconnect = !isLoggedOut && !isConflict; // JANGAN reconnect otomatis kalau ditendang oleh sesi lain (440) biar gak ke-banned
            
            console.log(`[WA_Bot_HRGA] Connection closed. StatusCode: ${statusCode}. Reconnecting: ${shouldReconnect}`);
            
            if (isConflict) {
                console.error(`[WA_Bot_HRGA] 🚨 CRITICAL: CONFLICT (440)! Sesi digunakan oleh proses lain. Mematikan auto-reconnect untuk mencegah pemblokiran nomor WA!`);
                global.hrgaWaStatus.status = 'ERROR';
                global.hrgaWaStatus.error = 'Sesi tabrakan dengan proses lain. Silakan matikan proses ganda dan restart manual dari dashboard.';
            }
            
            if (shouldClearSession) {
                console.log(`[WA_Bot_HRGA] ⚠️ Session corrupt/logged-out (Code: ${statusCode}). Clearing auth folder...`);
                global.hrgaWaStatus.status = 'LOGGED_OUT';
                global.hrgaWaStatus.qr = null;
                try {
                    fs.rmSync(authDir, { recursive: true, force: true });
                    const backupDir = authDir + '_backup';
                    if (fs.existsSync(backupDir)) {
                        fs.rmSync(backupDir, { recursive: true, force: true });
                    }
                    fs.mkdirSync(authDir, { recursive: true });
                } catch (e) {
                    console.error('[WA_Bot_HRGA] Error clearing auth folder:', e);
                }
            } else {
                global.hrgaWaStatus.status = 'DISCONNECTED';
            }

            if (shouldReconnect) {
                if (connectionRetryCount < MAX_RETRY_COUNT) {
                    connectionRetryCount++;
                    const delay = Math.min(5000 * Math.pow(2, connectionRetryCount - 1), 60000); // 5s, 10s, 20s, 40s, 60s
                    console.log(`[WA_Bot_HRGA] Reconnecting in ${delay / 1000}s (Attempt ${connectionRetryCount}/${MAX_RETRY_COUNT})...`);
                    global.hrgaWaStatus.status = 'RECONNECTING';
                    reconnectTimeoutId = setTimeout(initWhatsApp, delay);
                } else {
                    console.error(`[WA_Bot_HRGA] Reconnection failed after ${MAX_RETRY_COUNT} attempts. Stopping auto-reconnect.`);
                    global.hrgaWaStatus.status = 'ERROR';
                    global.hrgaWaStatus.error = 'Max reconnection attempts reached. Please restart bot manually.';
                }
            }
        }
    });

    sock.ev.on('messaging-history.set', async ({ messages }) => {
        console.log(`[WA_Bot_HRGA] Syncing history: ${messages.length} messages`);
        for (const msg of messages) {
            try {
                if (!msg.message || msg.key.fromMe) continue;
                const jid = msg.key.remoteJid;
                if (jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@g.us')) {
                    continue;
                }
                const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
                if (!text) continue;

                const ticketMatch = text.match(/#(\d{6,8})/) || text.match(/#ticket\s+(\d{6,8})/i) || text.match(/#close\s+(\d{6,8})/i);
                const ticketNumber = ticketMatch ? ticketMatch[1] : null;

                if (ticketNumber) {
                    await logComm({
                department: 'hrga',
                        platform: 'whatsapp',
                        type: 'incoming',
                        sender: jid,
                        recipient: 'System/Bot',
                        message: text,
                        ticketNumber: ticketNumber,
                        status: 'synced'
                    });
                }
            } catch (e) {
                // Ignore sync errors for individual messages
            }
        }
    });

    sock.ev.on('messages.upsert', async (rawEvent) => {
        try {
        const { messages, type } = rawEvent;
        console.log(`[WA_Bot_HRGA] messages.upsert triggered: type=${type}, count=${messages?.length || 0}`);
        
        if (type !== 'notify') return;
        
        for (const msg of messages) {
            try {
                if (!msg.message || msg.key.fromMe) continue;
                const rawJid = msg.key.remoteJid;
                console.log('[WA_Bot_HRGA] DEBUG RAW MSG:', JSON.stringify(msg));
                
                // === FILTER PESAN LAMA: Abaikan pesan yang lebih dari 90 detik lalu ===
                const msgTimestamp = msg.messageTimestamp ? Number(msg.messageTimestamp) : 0;
                const nowSec = Math.floor(Date.now() / 1000);
                if (msgTimestamp && (nowSec - msgTimestamp) > 90) {
                    console.log(`[WA_Bot_HRGA] Skipping old message (age: ${nowSec - msgTimestamp}s)`);
                    continue;
                }
                
                // Ignore status updates, broadcast channels, and group chats
                if (!rawJid || rawJid === 'status@broadcast' || rawJid.endsWith('@broadcast') || rawJid.endsWith('@g.us')) {
                    continue;
                }

                // Prioritize the phone number JID if available to bypass LID delivery restrictions (Error 463)
                const jid = msg.key.remoteJidAlt || rawJid;
                const participant = rawJid; // Keep original LID for tracking
                const senderNumber = jid.replace(/\D/g, '');
                const senderName = msg.pushName || 'User';
                const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '').trim();
                const lowText = text.toLowerCase();

                console.log(`[WA_Bot_HRGA] 📩 Incoming from ${senderNumber} (${senderName}): "${text.substring(0, 80)}"`);

                // === FIX: ALWAYS log every incoming WA message to whatsapp_logs ===
                try {
                    await db('whatsapp_logs').insert({
                        sender_number: senderNumber,
                        sender_name: senderName,
                        message_text: text,
                        direction: 'IN',
                        timestamp: Date.now()
                    });
                } catch (wlErr) {
                    console.error('[WA_Bot_HRGA] whatsapp_logs insert error:', wlErr.message);
                }

                // Extract potential ticket number (e.g., #ICT-03-0001 or 7-digit number)
                const ticketMatch = text.match(/#([A-Z]{2,5}-\d{2}-\d{4})/) || text.match(/#(\d{6,8})/) || text.match(/#ticket\s+(\d{6,8})/i) || text.match(/#close\s+(.*)/i);
                const ticketNumber = ticketMatch ? ticketMatch[1] : null;

                // 0. Check User Registration (check both LID and phone number to match existing database entries)
                const rawLid = rawJid.replace(/\D/g, '');
                const rawPn = msg.key.remoteJidAlt ? msg.key.remoteJidAlt.replace(/\D/g, '') : '';
                let existingUser = await db('users').where('whatsapp', rawLid).first();
                if (!existingUser && rawPn) {
                    existingUser = await db('users').where('whatsapp', rawPn).first();
                }

                let userState = userStates.get(senderNumber);

                // Handle 5-minute timeout
                if (userState && Date.now() - userState.timestamp > 5 * 60 * 1000) {
                    console.log(`[WA_Bot_HRGA] Session timeout for ${senderNumber}`);
                    userStates.delete(senderNumber);
                    userState = null;
                }

                // === FIX: ALWAYS log to communication_logs (removed overly-restrictive filter) ===
                const isCommRelated = !!ticketNumber || !!userState || lowText === '#ticket' || lowText.startsWith('#close') || !existingUser;
                if (isCommRelated) {
                    await logComm({
                department: 'hrga',
                        platform: 'whatsapp',
                        type: 'incoming',
                        sender: participant,
                        recipient: 'System/Bot',
                        message: text,
                        ticketNumber: ticketNumber,
                        status: 'received'
                    });
                }

                console.log(`[WA_Bot_HRGA] Inbound: ${senderNumber}, Registered: ${!!existingUser}, State: ${userState?.state || 'none'}`);

                const isTech = await isTechnician(senderNumber);
                if (!existingUser && !isTech && (!userState || !userState.state.startsWith('REG_'))) {
                    userStates.set(senderNumber, { state: 'REG_ASK_NAME', timestamp: Date.now() });
                    await sendWAMessage(jid, '👋 *SELAMAT DATANG DI HRGA TCF*\n\nNomor Anda belum terdaftar di sistem kami. Mohon lengkapi data berikut:\n\nSilakan balas dengan *NAMA LENGKAP* Anda:');
                    continue;
                }

                // Handle Registration States
                if (userState?.state === 'REG_ASK_NAME') {
                    userStates.set(senderNumber, { state: 'REG_ASK_EMPLOYEE_ID', name: text, timestamp: Date.now() });
                    await sendWAMessage(jid, `Halo *${text}*, selanjutnya silakan balas dengan *ID KARYAWAN* Anda:`);
                    continue;
                }

                if (userState?.state === 'REG_ASK_EMPLOYEE_ID') {
                    userStates.set(senderNumber, { state: 'REG_ASK_DEPT', name: userState.name, employee_id: text, timestamp: Date.now() });
                    await sendWAMessage(jid, `Selanjutnya silakan balas dengan *DEPARTEMEN* Anda:`);
                    continue;
                }

                if (userState?.state === 'REG_ASK_DEPT') {
                    userStates.set(senderNumber, { state: 'REG_ASK_EMAIL', name: userState.name, employee_id: userState.employee_id, department: text, timestamp: Date.now() });
                    await sendWAMessage(jid, `Terakhir, silakan balas dengan *EMAIL* Anda:`);
                    continue;
                }

                if (userState?.state === 'REG_ASK_EMAIL') {
                    const userName = userState.name;
                    const employeeId = userState.employee_id;
                    const userDept = userState.department;
                    const userEmail = text;
                    try {
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
                        userStates.delete(senderNumber);
                        await sendWAMessage(jid, `✅ *REGISTRASI BERHASIL*\n\nTerima kasih *${userName}* (${employeeId} - ${userDept}).\nEmail: ${userEmail}\n\nSekarang Anda bisa menggunakan layanan HRGA TCF.\n\nKetik *#ticket* untuk membuat laporan kendala.`);
                    } catch (err) {
                        console.error('[WA_Bot_HRGA] Reg Error:', err);
                        await sendWAMessage(jid, '❌ Terjadi kesalahan saat pendaftaran. Mohon coba lagi nanti.');
                    }
                    continue;
                }

                // 1. Handle #ticket
                if (lowText === '#ticket') {
                    // Check rate limit (10 Mins)
                    try {
                        const localUser = await db('users').where('whatsapp', senderNumber).orWhere('whatsapp', 'like', `%${senderNumber.replace(/\D/g, '')}%`).first();
                        if (localUser) {
                            const lastTicket = await db('tickets')
                                .where('user_id', localUser.id)
                                .orderBy('created_at', 'desc')
                                .first();
                            
                            if (lastTicket) {
                                const diffMins = (Date.now() - new Date(lastTicket.created_at).getTime()) / (1000 * 60);
                                if (diffMins < 10) {
                                    const minsLeft = Math.ceil(10 - diffMins);
                                    await sendWAMessage(jid, `⚠️ *ANTI-SPAM PROTECT*\n\nAnda baru saja membuat tiket *#${lastTicket.number}*.\nSilakan tunggu *${minsLeft} menit* lagi sebelum membuat tiket baru demi kelancaran antrean.`);
                                    continue; // Stop the flow
                                }
                            }
                        }
                    } catch (e) { console.error('Rate limit check error:', e) }

                    userStates.set(senderNumber, { state: 'ASK_CAT', timestamp: Date.now() });
                    let list = '📌 *PILIH KATEGORI MASALAH*\n\n';
                    HRGA_CATEGORIES.forEach(c => list += `${c.id}. ${c.name}\n`);
                    await sendWAMessage(jid, list + '\nBalas dengan nomor kategori (1-4).');
                    continue;
                }

                // 2. Handle #close <num> <note> (Technician Only)
                if (lowText.startsWith('#close')) {
                    if (!(await isTechnician(senderNumber))) {
                        await sendWAMessage(jid, '❌ Hanya teknisi yang bisa menutup tiket.');
                        continue;
                    }
                    const parts = text.split(/\s+/);
                    const ticketNum = parts[1];
                    const note = parts.slice(2).join(' ') || 'Selesai dikerjakan.';
                    
                    console.log(`[WA_Bot_HRGA] #close command - Full text: "${text}"`);
                    console.log(`[WA_Bot_HRGA] #close command - Parsed ticketNum: "${ticketNum}"`);
                    console.log(`[WA_Bot_HRGA] #close command - Parts:`, parts);
                    
                    if (!ticketNum) {
                        await sendWAMessage(jid, '❌ Gunakan format: #close <nomor_ticket> [catatan]');
                        continue;
                    }

                    // Check if already pending
                    if (pendingClosures.has(ticketNum)) {
                        await sendWAMessage(jid, `⏳ *MENUNGGU RESPON*\n\nTiket #${ticketNum} sedang dalam masa tunggu (1 Jam) untuk sanggahan user pembuat tiket.\nSilakan bersabar menanti respon dari user.`);
                        continue;
                    }

                    // Check if already completely closed
                    try {
                        const existingDbTicket = await db('tickets').where('number', ticketNum).first();
                        if (existingDbTicket && ['closed', 'selesai', 'resolved', 'tutup'].includes(String(existingDbTicket.status || '').toLowerCase())) {
                            await sendWAMessage(jid, `🛑 *SUDAH CLOSED*\n\nTiket #${ticketNum} sudah di-*closing* secara permanen. Tidak perlu di-close ulang ya bro.`);
                            continue;
                        }
                    } catch (e) { console.error('Close check db error:', e) }

                    // Close immediately
                    await closeTicketInDB(ticketNum);
                    console.log(`[WA_Bot_HRGA] Auto-closed ticket ${ticketNum}`);
                    
                    // Attempt to find user JID from osTicket
                    let targetUserJid = null;
                    if (ostPool) {
                        try {
                            // First try: Get from current ticket's email
                            let query = `
                                SELECT e.address 
                                FROM ost_ticket t 
                                JOIN ost_user u ON t.user_id = u.id 
                                JOIN ost_user_email e ON u.id = e.user_id 
                                WHERE t.number = ?
                                ORDER BY t.ticket_id DESC
                                LIMIT 1
                            `;
                            let [rows] = await ostPool.query(query, [ticketNum]);
                            console.log(`[WA_Bot_HRGA] Query result for ticket #${ticketNum}:`, rows);
                            
                            if (rows.length > 0 && rows[0].address) {
                                let addr = rows[0].address;
                                let phone = addr.split('@')[0];
                                
                                // Determine JID type (LID vs standard)
                                if (!phone.startsWith('62') || phone.length >= 14) {
                                    targetUserJid = phone + '@lid';
                                } else {
                                    targetUserJid = phone + '@s.whatsapp.net';
                                }
                                
                                console.log(`[WA_Bot_HRGA] Resolved User JID from email: ${targetUserJid}`);
                            } else {
                                // Second try: Get from user's previous tickets
                                console.log(`[WA_Bot_HRGA] No email found for ticket #${ticketNum}, trying to get from user's previous tickets...`);
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
                                        if (!phone.startsWith('62') || phone.length >= 14) {
                                            targetUserJid = phone + '@lid';
                                        } else {
                                            targetUserJid = phone + '@s.whatsapp.net';
                                        }
                                        console.log(`[WA_Bot_HRGA] Resolved User JID from user's other email: ${targetUserJid}`);
                                    }
                                }
                            }
                        } catch (err) {
                            console.error(`[WA_Bot_HRGA] Error resolving user JID from osTicket:`, err);
                        }
                    }

                    // Fallback to local DB if osTicket resolution failed
                    if (!targetUserJid) {
                        try {
                            const localTicket = await db('tickets').where('number', ticketNum).first();
                            if (localTicket) {
                                const localUser = await db('users').where('id', localTicket.user_id).first();
                                if (localUser && localUser.whatsapp) {
                                    const lp = String(localUser.whatsapp).replace(/\D/g, '');
                                    targetUserJid = (!lp.startsWith('62') || lp.length >= 14) ? lp + '@lid' : lp + '@s.whatsapp.net';
                                    console.log(`[WA_Bot_HRGA] Resolved User JID from Local DB: ${targetUserJid}`);
                                }
                            }
                        } catch (err) {
                            console.error(`[WA_Bot_HRGA] Error resolving user JID from Local DB:`, err);
                        }
                    }

                    await sendWAMessage(jid, `✅ Konfirmasi penutupan dikirim ke pembuat tiket #${ticketNum}. Tiket telah resmi ditutup.`);
                    
                    if (targetUserJid) {
                        await sendWAMessage(targetUserJid, `✅ *TICKET SELESAI*\n\nTiket #${ticketNum} telah diselesaikan teknisi.\n📝 *Catatan:* ${note}\n\nTerima kasih telah menggunakan layanan ICT Power Asset.`);
                    } else {
                        console.warn(`[WA_Bot_HRGA] Could not find reporter JID for ticket #${ticketNum} (found: ${targetUserJid})`);
                        // Fallback: Notify through original sender if it was the only one found (but usually it's the tech, so we skip)
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
                        const { technicianNumber } = await getForwardingNumbers();
                        await sendWAMessage(technicianNumber, `⚠️ *USER KEBERATAN*\n\nUser melaporkan tiket #${data.ticketNum} belum selesai. Mohon diperiksa.`);
                        continue;
                    }
                }

                // 4. Handle states
                const state = userStates.get(senderNumber);
                if (state) {
                    if (state.state === 'ASK_CAT') {
                        const cat = HRGA_CATEGORIES.find(c => c.id == text);
                        if (cat) {
                            userStates.set(senderNumber, { state: 'ASK_DESC', cat: cat.name, timestamp: Date.now() });
                            await sendWAMessage(jid, `📝 Deskripsikan masalah untuk *${cat.name}*:`);
                        } else {
                            await sendWAMessage(jid, '❌ Kategori tidak valid. Pilih 1-4.');
                        }
                        continue;
                    }
                    if (state.state === 'ASK_DESC') {
                        const category = state.cat;
                        const description = text;
                        const finalName = existingUser?.name || senderName;
                        const finalDept = existingUser?.department || 'N/A';
                        
                        // Create ticket logic here
                        const ticketNum = await createTicket(finalName, senderNumber, `${category}: ${description}`);
                        userStates.delete(senderNumber);
                        
                        // Mock AI Troubleshooting Tips based on category
                        let troubleshootText = "";
                        switch (category) {
                            case 'Kendaraan': troubleshootText = '1. Jangan gunakan kendaraan jika kondisi rem/mesin membahayakan.\n2. Cek apakah ada indikator error menyala di dashboard.\n3. Catat nomor polisi kendaraan.'; break;
                            case 'Fasilitas Gedung': troubleshootText = '1. Amankan area sekitar jika ada potensi bahaya (contoh: genangan air, kabel terkelupas).\n2. Foto detail kerusakan.\n3. Laporkan lokasi persis kerusakan.'; break;
                            case 'Keamanan & K3': troubleshootText = '1. Laporkan segera jika terkait alat pemadam (APAR).\n2. Pastikan area tetap aman dan steril.\n3. Dokumentasikan dengan foto.'; break;
                            default: troubleshootText = '1. Foto/screenshot kendala yang terjadi.\n2. Jelaskan detail masalah secara kronologis ke Tim HRGA.'; break;
                        }
                        
                        const userMessage = `🎫 *TICKET DIBUAT*\n\nHalo *${finalName}*,\n\n📋 Nomor: *#${ticketNum}*\n📂 Kategori: *${category}*\n📝 Masalah: ${description}\n\n---\n🤖 *TROUBLESHOOTING - ${category}*\n\nLangkah Awal:\n${troubleshootText}\n\n⏳ Tunggu teknisi untuk pemeriksaan.\nTim IT akan segera memeriksa secara fisik/offline. Terima kasih!`;

                        await sendWAMessage(jid, userMessage);
                        
                        const { technicianNumber } = await getForwardingNumbers();
                        
                        const techMessage = `🛠️ *TUGAS BARU: PERLU TINDAKAN*\n━━━━━━━━━━━━━━━\n🆔 TICKET: *#${ticketNum}*\n📂 Kategori: *${category}*\n👤 USER: *${finalName}*\n📱 Departement: *${finalDept}*\n📝 MASALAH:\n"${description}"\n━━━━━━━━━━━━━━━\n⏱️ RESPON SLA: *2 Jam*\n🚀 _Segera tindak lanjuti, semangat!_`;
                        await sendWAMessage(technicianNumber, techMessage);
                        continue;
                    }
                }

                // 5. Default Fallback (Registered User & No Active Flow)
                if (!userState) {
                    if (isTech) {
                        await sendWAMessage(jid, `🤖 *HRGA HELPDESK TECHNICIAN MENU*\n\nHalo *${existingUser.name}*!\n\nAnda terdaftar sebagai *Teknisi* di sistem kami.\n\n📌 Ketik *#close <nomor_tiket> [catatan]* : Untuk menutup tiket yang sudah selesai dikerjakan.\nContoh: *#close HR-GA-03-0005 Selesai perbaikan*\n\n_System HRGA TCF - Technician Workspace._`, null, false);
                    } else {
                        // Send fallback message but DO NOT log it to communication_logs
                        await sendWAMessage(jid, `🤖 *HRGA HELPDESK ASSISTANT*\n\nHalo *${existingUser.name}*!\n\nSepertinya Anda ingin menghubungi bantuan HRGA.\n\n📌 Ketik *#ticket* : Untuk membuat laporan kendala baru.\n\n_System HRGA TCF - Reliable Facility Management._`, null, false);
                    }
                }

            } catch (msgErr) { 
                console.error('[WA_Bot_HRGA] Error processing individual message:', msgErr); 
            }
        }
        } catch (evErr) {
            console.error('[WA_Bot_HRGA] Critical error in messages.upsert handler:', evErr);
        }
    });
    console.log('[WA_Bot_HRGA] ✅ All event listeners registered successfully.');
}

async function generateTicketNumber() {
    try {
        const rows = await db('tickets')
            .where('number', 'like', 'HR-GA-03-%')
            .select('number');
            
        let maxSeq = 0;
        const regex = /^HR-GA-03-(\d+)$/;
        for (const r of rows) {
            if (!r.number) continue;
            const match = r.number.match(regex);
            if (match) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq) maxSeq = seq;
            }
        }
        const nextSeq = maxSeq > 0 ? maxSeq + 1 : 1;
        return "HR-GA-03-" + String(nextSeq).padStart(5, '0');
    } catch (e) {
        console.error('[WA_Bot_HRGA] Error generating ticket number:', e);
        return "HR-GA-03-" + String(Math.floor(1000 + Math.random() * 9000)).padStart(5, '0');
    }
}

async function createTicket(userName, phoneNumber, message) {
    console.log(`[WA_Bot_HRGA] Creating ticket for: ${userName} (${phoneNumber})`);
    
    const ticketNumber = await generateTicketNumber();
    const subject = `WhatsApp Ticket - ${userName}`;

    // Local DB sync
    try {
        let localUserId = null;
        const existingUser = await db('users').where('whatsapp', phoneNumber).first();
        if (existingUser) localUserId = existingUser.id;
        else {
            const [newId] = await db('users').insert({ name: userName, whatsapp: phoneNumber, role: 'user', created_at: db.fn.now(), updated_at: db.fn.now() });
            localUserId = newId;
        }
        // Extract category from message (format: "Category: description")
        const catMatch = message.match(/^([^:]+):/);
        const category = catMatch ? catMatch[1].trim() : 'Lainnya';
        await db('tickets').insert({ 
            number: ticketNumber, 
            user_id: localUserId, 
            subject, 
            description: message, 
            status: 'New', 
            priority: 'Medium', 
            source: 'Phone',     // FIX: Mark WA tickets as Phone source
            category: category,  // FIX: Save category
            created_at: db.fn.now(), 
            updated_at: db.fn.now() 
        });
        console.log(`[WA_Bot_HRGA] ✅ Ticket #${ticketNumber} saved to local DB for user ${localUserId}`);
    } catch (dbE) { 
        console.error('[WA_Bot_HRGA] Local DB Error on createTicket:', dbE.message); 
    }

    return ticketNumber;
}

router.get('/wa-status', (req, res) => res.json(global.hrgaWaStatus));

router.post('/wa-pair', async (req, res) => {
    try {
        let { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required' });
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        if (!sock) return res.status(400).json({ error: 'WhatsApp socket not ready' });
        
        console.log(`[WA_Bot_HRGA] Requesting pairing code for ${phone}...`);
        const code = await sock.requestPairingCode(phone);
        res.json({ code });
    } catch (err) {
        console.error('[WA_Bot_HRGA] Pairing code error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to reset session (Logout and delete auth folder)
router.post('/reset', async (req, res) => {
    try {
        console.log('[WA_Bot_HRGA] /reset called by API');
        await logoutWhatsApp();
        res.json({ success: true, message: 'WhatsApp session reset successfully. Please scan new QR code.' });
    } catch (err) {
        console.error('[WA_Bot_HRGA] Error resetting session:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to force restart the connection
router.post('/restart', async (req, res) => {
    try {
        console.log('[WA_Bot_HRGA] /restart called by API');
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
                console.error('[WA_Bot_HRGA] Error ending socket on restart:', e);
            }
            sock = null;
        }
        
        global.hrgaWaStatus.status = 'RECONNECTING';
        global.hrgaWaStatus.qr = null;
        global.hrgaWaStatus.updatedAt = new Date();
        
        // Reinitialize
        connectionRetryCount = 0;
        await initWhatsApp(true);
        
        res.json({ success: true, message: 'WhatsApp connection restarting...' });
    } catch (err) {
        console.error('[WA_Bot_HRGA] Error restarting session:', err);
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
        if (global.hrgaWaStatus.status !== 'CONNECTED' || !sock) {
            return res.status(503).json({ error: 'WhatsApp Bot is not connected' });
        }
        
        // Format phone number
        let formattedTo = to.toString().replace(/\D/g, '');
        if (formattedTo.startsWith('0')) formattedTo = '62' + formattedTo.substring(1);
        if (!formattedTo.endsWith('@s.whatsapp.net') && !formattedTo.endsWith('@g.us')) {
            formattedTo = formattedTo + '@s.whatsapp.net';
        }
        
        await sendWAMessage(formattedTo, message, ticketNumber);
        res.json({ success: true, message: 'Message queued for sending' });
    } catch (err) {
        console.error('[WA_Bot_HRGA] Error sending API message:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// SLA MONITORING & APAR/AC REMINDER CRON JOB
// Runs every 5 minutes to check for delayed tickets and scheduled maintenance
// ---------------------------------------------------------
let lastMaintenanceReminderMonth = null;

setInterval(async () => {
    try {
        if (!sock || global.hrgaWaStatus.status !== 'CONNECTED') return;

        // 1. SLA TICKETS MONITORING
        const openTickets = await db('tickets').whereNotIn(db.raw('LOWER(status)'), ['closed', 'selesai', 'resolved', 'tutup', 'cancelled']);
        const now = Date.now();
        for (const ticket of openTickets) {
            const passedMins = (now - new Date(ticket.created_at).getTime()) / (1000 * 60);
            if (passedMins >= 105 && passedMins < 120 && !warnedTickets.has(ticket.number)) {
                warnedTickets.add(ticket.number);
                const { technicianNumber } = await getForwardingNumbers();
                const userName = await db('users').where('id', ticket.user_id).first().then(u => u?.name || 'User');
                const minsLeft = 120 - Math.floor(passedMins);
                const alertMsg = `⚠️ *SLA WARNING - ${minsLeft} Menit Tersisa!*\n\n🚨 Tiket *#${ticket.number}* dari *${userName}* hampir melewati batas SLA 2 Jam.\n\nSegera lakukan tindak lanjut atau ketik #close ${ticket.number}!`;
                await sendWAMessage(technicianNumber, alertMsg, ticket.number);
            }
        }

        // 2. APAR & AC SCHEDULE REMINDER (Runs on 1st of every month at ~08:00 AM)
        const dateObj = new Date();
        const currentDay = dateObj.getDate();
        const currentMonth = dateObj.getMonth();
        const currentHour = dateObj.getHours();

        // Send reminder on the 1st day of the month between 08:00 - 08:59
        if (currentDay === 1 && currentHour === 8 && lastMaintenanceReminderMonth !== currentMonth) {
            lastMaintenanceReminderMonth = currentMonth; // Mark as sent for this month
            
            const { technicianNumber } = await getForwardingNumbers();
            const reminderMsg = `📅 *REMINDER JADWAL MAINTENANCE RUTIN HRGA*\n\nSelamat pagi tim HRGA!\n\nSaat ini sudah memasuki awal bulan. Ini adalah pengingat otomatis untuk melakukan rutinitas:\n\n🧯 *Pengecekan Rutin APAR (K3)*\n❄️ *Pengecekan Rutin AC & Fasilitas Gedung*\n\nSilakan lakukan inspeksi ke lapangan dan *wajib* melakukan konfirmasi hasil pengecekan (Aman/Rusak) ke dalam sistem web *Checksheet HRGA*.\n\nTerima kasih atas kerja kerasnya!\n\n_System HRGA TCF - Automated Reminder_`;
            
            await sendWAMessage(technicianNumber, reminderMsg);
            console.log(`[WA_Bot_HRGA] Sent Monthly APAR/AC Reminder`);
        }
    } catch (e) {
        console.error('[WA_Bot_HRGA] Error in cron job:', e);
    }
}, 5 * 60 * 1000); // Check every 5 minutes

router.post('/wa-restart', async (req, res) => {
    try {
        await initWhatsApp();
        res.json({ success: true, message: 'WhatsApp bot restart initiated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to restart WhatsApp bot' });
    }
});

router.post('/wa-logout', async (req, res) => {
    try {
        await logoutWhatsApp();
        res.json({ success: true, message: 'WhatsApp bot session reset initiated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset WhatsApp bot session' });
    }
});

module.exports = { initWhatsApp, logoutWhatsApp, router };

if (require.main === module) {
    initWhatsApp();
    const botApp = express();
    botApp.use(express.json());
    botApp.use('/', router);
    botApp.listen(5003, '0.0.0.0', () => console.log('WA Bot HRGA API on 5003'));
}
