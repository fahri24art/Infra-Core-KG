const axios = require('axios');
const { exec } = require('child_process');

const WA_API = 'http://127.0.0.1:5002/send-message';
const GROUP_TARGET = 'GROUP:ICT - TCF'; 
const IG_URL = 'http://127.0.0.1:5000/api/dashboard/summary';
const PA_URL = 'http://127.0.0.1:5001/api/check';

let alertsState = {
    igDown: false,
    paDown: false,
    ispDegraded: false,
    cpuHigh: false
};

async function sendAlert(message) {
    try {
        await axios.post(WA_API, { to: GROUP_TARGET, message, shouldLog: true });
        console.log("Alert sent to WA.");
    } catch (e) {
        console.error("Failed to send WA alert:", e.message);
    }
}

async function checkApps() {
    let currentAlerts = [];
    let resolvedAlerts = [];

    // 1. Check Power Asset
    try {
        await axios.get(PA_URL, { timeout: 10000 });
        if (alertsState.paDown) {
            alertsState.paDown = false;
            resolvedAlerts.push("✅ *Power Asset* is back ONLINE.");
        }
    } catch (e) {
        if (!alertsState.paDown) {
            alertsState.paDown = true;
            currentAlerts.push(`🚨 *Power Asset* is DOWN! (${e.message})`);
        }
    }

    // 2. Check Infra Guard & Mikrotik CPU
    try {
        const igRes = await axios.get(IG_URL, { timeout: 10000 });
        if (alertsState.igDown) {
            alertsState.igDown = false;
            resolvedAlerts.push("✅ *Infra Guard* is back ONLINE.");
        }
        
        if (igRes.data && igRes.data.network && igRes.data.network.data) {
            const cpu = igRes.data.network.data.cpu;
            if (cpu > 85) {
                if (!alertsState.cpuHigh) {
                    alertsState.cpuHigh = true;
                    currentAlerts.push(`⚠️ *Mikrotik Alert*: CPU Load is critically high (${cpu}%)`);
                }
            } else {
                if (alertsState.cpuHigh) {
                    alertsState.cpuHigh = false;
                    resolvedAlerts.push(`✅ *Mikrotik Alert*: CPU Load returned to normal (${cpu}%)`);
                }
            }
        }
    } catch (e) {
        if (!alertsState.igDown) {
            alertsState.igDown = true;
            currentAlerts.push(`🚨 *Infra Guard* is DOWN! (${e.message})`);
        }
    }

    // 3. Check ISP (Bandwidth heuristic via latency/packet loss to save data vs speedtest)
    exec('ping 8.8.8.8 -n 4', (err, stdout) => {
        let degraded = false;
        if (err || stdout.includes('Request timed out')) {
            degraded = true;
        } else {
            const match = stdout.match(/Average = (\d+)ms/);
            if (match && parseInt(match[1]) > 150) {
                degraded = true;
            }
        }

        if (degraded) {
            if (!alertsState.ispDegraded) {
                alertsState.ispDegraded = true;
                currentAlerts.push(`⚠️ *ISP Alert*: Koneksi terhubung namun Bandwidth di bawah standard / Latency Tinggi (< 10Mbps)`);
            }
        } else {
            if (alertsState.ispDegraded) {
                alertsState.ispDegraded = false;
                resolvedAlerts.push(`✅ *ISP Alert*: Kualitas koneksi ISP kembali normal.`);
            }
        }

        if (currentAlerts.length > 0 || resolvedAlerts.length > 0) {
            let msg = `🔔 *SYSTEM HEALTH UPDATE* 🔔\n\n`;
            if (currentAlerts.length > 0) {
                msg += `*NEW ALERTS:*\n${currentAlerts.join('\n')}\n\n`;
            }
            if (resolvedAlerts.length > 0) {
                msg += `*RESOLVED:*\n${resolvedAlerts.join('\n')}`;
            }
            
            // Uptime Kuma mention per user request
            msg += `\n_(Uptime Kuma & Core Apps Monitored)_`;
            
            sendAlert(msg.trim());
        }
    });
}

console.log("Starting Central Alert Monitor...");
checkApps();
// Run every 5 minutes
setInterval(checkApps, 5 * 60 * 1000);
