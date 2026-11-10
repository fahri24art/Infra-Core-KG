require('dotenv').config();
const axios = require('axios');
const os = require('os');
const db = require('./db');

async function generateReportText(org) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Server Health
    const uptimeHours = (os.uptime() / 3600).toFixed(1);
    const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(1);
    const freeMem = (os.freemem() / (1024 ** 3)).toFixed(1);
    const usedMemPercent = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
    const cpuLoad = os.loadavg()[0].toFixed(2);
    
    // DB Stats
    let openTickets = 0;
    let closedTickets = 0;
    
    try {
        await db.runWithOrg(org, async () => {
            const openRes = await db('tickets').whereNot('status', 'Closed').count('id as count').first();
            openTickets = openRes?.count || 0;
            
            // Get closed tickets in the last 24 hours
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const closedRes = await db('tickets').where('status', 'Closed').andWhere('updated_at', '>=', yesterday).count('id as count').first();
            closedTickets = closedRes?.count || 0;
        });
    } catch (e) {
        console.error(`[CRON] Error getting ticket stats for ${org}:`, e.message);
    }
    
    const orgLabel = org === 'TCF-KG' ? 'Karawang (KG)' : 'Sadang (SG)';

    return `📈 *MORNING HEALTH REPORT - ${orgLabel}*
🗓️ ${dateStr}

🤖 *Server Status*
- ⏱️ Uptime: ${uptimeHours} Jam
- 🧠 RAM Used: ${usedMemPercent}% (${freeMem}GB free of ${totalMem}GB)
- 🧮 CPU Load: ${cpuLoad}

🎟️ *Ticket Summary*
- 🔴 Open/Pending: *${openTickets}* Tiket
- 🟢 Closed (24j): *${closedTickets}* Tiket

*Mohon balas pesan ini dengan "Ok" atau "Copy" agar koneksi sistem kita tetap sehat!*
_Powered by TCF PowerAsset IT System_`;
}

async function sendDailyReport() {
    console.log('[CRON] Generating and sending Daily Health Report...');
    
    // SG Report
    try {
        const msgSG = await generateReportText('TCF-SG');
        await axios.post('http://127.0.0.1:5000/api/send-message', { 
            to: 'GROUP:Tehnisi Helpdesk TCFSG', 
            message: msgSG,
            shouldLog: false
        });
        console.log('[CRON] SG Report sent');
    } catch (e) {
        console.error('[CRON] Failed to send SG Report:', e.response?.data || e.message);
    }
    
    // KG Report
    try {
        const msgKG = await generateReportText('TCF-KG');
        await axios.post('http://127.0.0.1:5000/api/send-message', { 
            to: 'GROUP:Tehnisi Helpdesk TCFKG', 
            message: msgKG,
            shouldLog: false
        });
        console.log('[CRON] KG Report sent');
    } catch (e) {
        console.error('[CRON] Failed to send KG Report:', e.response?.data || e.message);
    }
}

// Check if running as script for testing
if (require.main === module) {
    sendDailyReport().then(() => process.exit(0));
}

module.exports = { sendDailyReport };
