const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

function formatWibTime(timeInput) {
    let date;
    if (timeInput) {
        let s = String(timeInput).trim();
        // If Uptime Kuma sends UTC like '2026-10-16 02:01:28' without timezone suffix, append 'Z' so JS treats it as UTC
        if (!s.endsWith('Z') && !s.includes('+')) {
            s = s.replace(' ', 'T') + 'Z';
        }
        date = new Date(s);
        if (isNaN(date.getTime())) date = new Date();
    } else {
        date = new Date();
    }
    return date.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }) + ' WIB';
}

router.post('/webhook', async (req, res) => {
    try {
        const { monitor, msg, heartbeat } = req.body;
        const to = req.query.to || req.body.to;
        
        // If this is a test notification from Uptime Kuma, monitor might be undefined
        const monitorName = monitor ? monitor.name : 'Tes Sistem Uptime Kuma';
        // msg might be "Down", "Up", "Pending", "OK", "Resolved"
        let isDown = msg && msg.toLowerCase().includes('down');
        let isUp = msg && (msg.toLowerCase().includes('up') || msg.toLowerCase().includes('ok') || msg.toLowerCase().includes('resolved'));
        
        if (heartbeat && heartbeat.status !== undefined) {
            isDown = heartbeat.status === 0;
            isUp = heartbeat.status === 1;
        }

        // Detect if this is a High Latency / Timeout issue (> 20.000 ms) vs Total Hard Outage
        const rawMsgLower = (msg || '').toLowerCase();
        const pingVal = heartbeat && heartbeat.ping ? Number(heartbeat.ping) : null;
        const isLatencyIssue = isDown && (
            (pingVal && pingVal >= 20000) ||
            rawMsgLower.includes('timeout') ||
            rawMsgLower.includes('timed out') ||
            rawMsgLower.includes('etimedout') ||
            rawMsgLower.includes('esockettimedout')
        );

        // 1. Handle Tickets in Power Asset
        const alertSubject = isLatencyIssue 
            ? `[LATENCY-ALERT] Respon Lambat / Timeout: ${monitorName}`
            : `[AUTO-ALERT] Jaringan/Server Terputus: ${monitorName}`;
        
        const existingTicket = await db('tickets')
            .where(function() {
                this.where('subject', alertSubject)
                    .orWhere('subject', `[AUTO-ALERT] Jaringan/Server Terputus: ${monitorName}`)
                    .orWhere('subject', `[LATENCY-ALERT] Respon Lambat / Timeout: ${monitorName}`);
            })
            .whereIn('status', ['New', 'Open', 'Pending', 'In Progress'])
            .orderBy('created_at', 'desc')
            .first();

        let currentTicketNumber = existingTicket ? existingTicket.number : null;

        if (isDown) {
            if (!existingTicket) {
                try {
                    // Generate ticket number: ICT-TCFSG-03-IR-300001 or ICT-TCFKG-03-IR-300001 (Incident Report)
                    const isKG = req.organization === 'TCF-KG' || req.query.org === 'TCF-KG' || (monitorName && monitorName.toUpperCase().includes('KG'));
                    const plantCode = isKG ? 'TCFKG' : 'TCFSG';
                    const prefix = `ICT-${plantCode}-03-IR-`;
                    const rows = await db('tickets').where('number', 'like', `${prefix}%`).select('number');
                    let maxSeq = 300000;
                    const regex = new RegExp(`^${prefix}(\\d{6})$`);
                    for (const r of rows) {
                        if (!r.number) continue;
                        const match = r.number.match(regex);
                        if (match) {
                            const seq = parseInt(match[1], 10);
                            if (seq > maxSeq) maxSeq = seq;
                        }
                    }
                    const ticketNumber = prefix + String(maxSeq + 1).padStart(6, '0');
                    
                    let tagsStr = '';
                    if (monitor && monitor.tags && monitor.tags.length > 0) {
                        tagsStr = monitor.tags.map(t => t.value ? `${t.name}: ${t.value}` : t.name).join(', ');
                    }
                    
                    const cleanMsg = msg ? msg.replace(/[^\x00-\x7F]/g, '').trim() : '';
                    const formattedTime = formatWibTime(heartbeat?.time);
                    const incidentType = isLatencyIssue ? 'LATENSI SANGAT TINGGI / TIMEOUT (>20 Detik)' : 'TERPUTUS / DOWN TOTAL';
                    const description = `Uptime Kuma mendeteksi bahwa layanan ${monitorName} mengalami insiden: ${incidentType}.\n\n${tagsStr ? 'Area/Tags: ' + tagsStr + '\n' : ''}Status detail: ${cleanMsg}\n${pingVal ? 'Response Time / Ping: ' + pingVal + ' ms\n' : ''}Waktu kejadian: ${formattedTime}`;

                    await db('tickets').insert({
                        number: ticketNumber,
                        user_id: 1, 
                        asset_id: null, 
                        subject: alertSubject, 
                        description, 
                        priority: isLatencyIssue ? 'High' : 'Critical', 
                        status: 'New', 
                        created_at: new Date(), 
                        updated_at: new Date()
                    });
                    currentTicketNumber = ticketNumber;
                    console.log(`[Uptime Kuma Webhook] Created Ticket: ${ticketNumber} (${alertSubject})`);
                } catch(e) {
                    console.error('[Uptime Kuma Webhook] Failed to create ticket:', e);
                }
            } else {
                console.log(`[Uptime Kuma Webhook] Ticket already exists for ${monitorName}, skipping duplicate DOWN alert.`);
            }
        } else if (isUp) {
            const openAlertTickets = await db('tickets')
                .where(function() {
                    this.where('subject', `[AUTO-ALERT] Jaringan/Server Terputus: ${monitorName}`)
                        .orWhere('subject', `[LATENCY-ALERT] Respon Lambat / Timeout: ${monitorName}`)
                        .orWhere('subject', 'like', `%${monitorName}%`);
                })
                .whereIn('status', ['New', 'Open', 'Pending', 'In Progress']);

            if (openAlertTickets && openAlertTickets.length > 0) {
                try {
                    const cleanMsg = msg ? msg.replace(/[^\x00-\x7F]/g, '').trim() : 'Service is UP';
                    const formattedTime = formatWibTime(heartbeat?.time);
                    const closeMsg = `Uptime Kuma mendeteksi bahwa layanan ${monitorName} telah KEMBALI NORMAL (UP).\n\nStatus detail: ${cleanMsg}\n${pingVal ? 'Response Time: ' + pingVal + ' ms\n' : ''}Waktu kejadian: ${formattedTime}\n\n[Sistem] Tiket otomatis ditutup (Closed).`;
                    
                    for (const t of openAlertTickets) {
                        await db('ticket_responses').insert({
                            ticket_id: t.id,
                            user_id: 1,
                            message: closeMsg,
                            type: 'public',
                            created_at: new Date()
                        });
                        
                        await db('tickets').where('id', t.id).update({
                            status: 'Closed',
                            updated_at: new Date()
                        });
                        console.log(`[Uptime Kuma Webhook] Auto-closed Ticket: ${t.number}`);
                    }
                } catch(e) {
                    console.error('[Uptime Kuma Webhook] Failed to close tickets:', e);
                }
            }
        }

        // 2. Forward to WA Bot
        if (to) {
            let tagsStr = '';
            if (monitor && monitor.tags && monitor.tags.length > 0) {
                tagsStr = monitor.tags.map(t => t.value ? `${t.name}: ${t.value}` : t.name).join(', ');
            }
            const formattedTime = formatWibTime(heartbeat?.time);
            
            // Clean up redundant '[Monitor Name] [🔴 Down]' from Uptime Kuma msg
            let detailMsg = msg ? msg.replace(/\[.*?\]\s*\[.*?\]\s*/g, '').trim() : '';
            if (!detailMsg) detailMsg = isDown ? 'Service Disconnected' : '200 - OK';

            let headerTitle;
            let statusText;
            let footerNote;

            if (isUp) {
                headerTitle = '🚀 *SYSTEM RECOVERED | TCF INFRA* 🚀';
                statusText = `🟢 NORMAL (${detailMsg}${pingVal ? ` - Respon: ${pingVal} ms` : ''})`;
                footerNote = '✨ _Layanan telah pulih & tiket otomatis diselesaikan._';
            } else if (isLatencyIssue) {
                headerTitle = '🐢 *LATENCY & TIMEOUT WARNING | TCF INFRA* 🐢';
                statusText = `⚠️ RESPON SANGAT LAMBAT / TIMEOUT (> 20.000 ms)\n🔍 *Penyebab*  : ${detailMsg}${pingVal ? ` (Latensi: ${pingVal} ms)` : ''}`;
                footerNote = '⚠️ _Layanan masih berjalan tapi respon melambat melebihi batas 20 detik (indikasi jaringan/server overload)._';
            } else if (isDown) {
                headerTitle = '⚡ *CRITICAL ALERT | SERVICE DOWN* ⚡';
                statusText = `🔴 MATI TOTAL / TERPUTUS\n🔍 *Penyebab*  : ${detailMsg}`;
                footerNote = '🚨 _Layanan tidak dapat dihubungi sama sekali (server mati/koneksi putus total). Tim ICT segera investigasi!_';
            } else {
                headerTitle = '⚠️ *SYSTEM NOTIFICATION | TCF* ⚠️';
                statusText = `ℹ️ ${detailMsg}`;
                footerNote = 'ℹ️ _Notifikasi pemantauan sistem otomatis._';
            }

            let waMsg = `${headerTitle}\n━━━━━━━━━━━━━━━━━━━━━\n`;
            if (currentTicketNumber) {
                waMsg += `📋 *Tiket*     : *#${currentTicketNumber}*\n`;
            }
            waMsg += `🖥️ *Monitor* : *${monitorName}*\n`;
            if (tagsStr) {
                waMsg += `🏷️ *Area*    : ${tagsStr}\n`;
            }
            waMsg += `📊 *Kondisi*  : ${statusText}\n`;
            waMsg += `⏰ *Waktu*    : ${formattedTime}\n`;
            waMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
            waMsg += footerNote;

            const recipients = to.split(',');
            for (const recipient of recipients) {
                try {
                    await axios.post('http://127.0.0.1:5002/send-message', { to: recipient.trim(), message: waMsg }, { timeout: 5000 });
                } catch(e) {
                    console.warn(`[Uptime Kuma Webhook] Failed to forward to WA (${recipient}):`, e.message);
                }
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Uptime Kuma Webhook Error]:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
