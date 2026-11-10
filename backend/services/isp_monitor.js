/**
 * TCF Smart Multi-ISP Health & SLA Monitor
 * Memantau masing-masing ISP secara spesifik (ISP 1: COMNET & ISP 2: iFORTE di Plant SG)
 * dan mengirimkan notifikasi WhatsApp terperinci melalui IPC (/send-message) tanpa mengganggu
 * sesi koneksi WhatsApp Bot utama.
 */

const { exec } = require('child_process');
const axios = require('axios');
const db = require('../db');

const ISP_PROVIDERS = [
    {
        id: 'comnet',
        name: 'ISP 1: COMNET (Comtronic)',
        shortName: 'COMNET',
        plant: 'Plant SG - Sadang',
        interfaceName: 'vlan240-ncix-comnet',
        gatewayIp: '103.24.148.241',
        probeIp: '1.1.1.1', // Static route di MikroTik main table -> 103.24.148.241%vlan240-ncix-comnet
        partnerId: 'iforte'
    },
    {
        id: 'iforte',
        name: 'ISP 2: iFORTE Fiber',
        shortName: 'iFORTE',
        plant: 'Plant SG - Sadang',
        interfaceName: 'ether1-ISP2-iForte',
        gatewayIp: '103.182.225.153',
        probeIp: '8.8.8.8', // Static route di MikroTik main table -> 103.182.225.153%ether1-ISP2-iForte
        partnerId: 'comnet'
    }
];

const ispState = {
    comnet: { degraded: false, lastReason: null, since: null },
    iforte: { degraded: false, lastReason: null, since: null }
};

function runPing(targetIp, count = 4, timeoutSec = 3) {
    const isWin = process.platform === 'win32';
    const cmd = isWin
        ? `ping -n ${count} -w ${timeoutSec * 1000} ${targetIp}`
        : `ping -c ${count} -W ${timeoutSec} ${targetIp}`;

    return new Promise((resolve) => {
        exec(cmd, (err, stdout = '') => {
            let lossPct = 100;
            let avgLatency = null;

            // Parse packet loss (Linux: "0% packet loss", Windows: "(0% loss)")
            const lossMatch = stdout.match(/(\d+(?:\.\d+)?)%\s*(?:packet\s*)?loss/i);
            if (lossMatch) {
                lossPct = parseFloat(lossMatch[1]);
            } else if (!err) {
                lossPct = 0;
            }

            // Parse average latency
            // Linux: rtt min/avg/max/mdev = 13.412/14.125/15.012/0.512 ms
            const linuxRtt = stdout.match(/(?:rtt|round-trip)\s+min\/avg\/max\/(?:mdev|stddev)\s*=\s*[\d.]+\/([\d.]+)\//i);
            // Windows: Average = 14ms
            const winRtt = stdout.match(/Average\s*=\s*([\d.]+)\s*ms/i);

            if (linuxRtt) {
                avgLatency = parseFloat(linuxRtt[1]);
            } else if (winRtt) {
                avgLatency = parseFloat(winRtt[1]);
            }

            resolve({
                reachable: lossPct < 100 && avgLatency !== null,
                lossPct,
                avgLatency
            });
        });
    });
}

async function fetchInfraGuardTraffic() {
    const result = {
        comnet: { rxMbps: null, txMbps: null, linkStatus: 'unknown' },
        iforte: { rxMbps: null, txMbps: null, linkStatus: 'unknown' }
    };

    try {
        const res = await axios.get('http://192.168.1.3/api/network/interfaces', { timeout: 6000 });
        const data = res.data || {};
        const wan = data.traffic?.wan || {};

        if (wan.comnet) {
            result.comnet.rxMbps = Number(((wan.comnet.rx || 0) / 1e6).toFixed(2));
            result.comnet.txMbps = Number(((wan.comnet.tx || 0) / 1e6).toFixed(2));
        }
        if (wan.iforte) {
            result.iforte.rxMbps = Number(((wan.iforte.rx || 0) / 1e6).toFixed(2));
            result.iforte.txMbps = Number(((wan.iforte.tx || 0) / 1e6).toFixed(2));
        }

        if (Array.isArray(data.interfaces)) {
            const comnetIf = data.interfaces.find(i => (i.name || '').toLowerCase().includes('comnet') || (i.name || '').toLowerCase().includes('comtronic'));
            const iforteIf = data.interfaces.find(i => (i.name || '').toLowerCase().includes('iforte'));
            if (comnetIf) result.comnet.linkStatus = comnetIf.status || 'up';
            if (iforteIf) result.iforte.linkStatus = iforteIf.status || 'up';
        }
    } catch (e) {
        // Fallback jika endpoint Infra Guard sedang sibuk
    }

    return result;
}

async function probeSingleIsp(isp, latencyThreshold, trafficMap) {
    let probe = await runPing(isp.probeIp, 4, 2);

    const isProblem = (!probe.reachable) || (probe.lossPct >= 50) || (probe.avgLatency !== null && probe.avgLatency > latencyThreshold);

    // Anti-False-Positive: Jika terdeteksi gangguan pada ping pertama, tunggu 6 detik lalu re-verify sekali lagi
    if (isProblem) {
        await new Promise(r => setTimeout(r, 6000));
        probe = await runPing(isp.probeIp, 4, 2);
    }

    const gwProbe = (!probe.reachable) ? await runPing(isp.gatewayIp, 2, 2) : { reachable: true };
    const t = trafficMap[isp.id] || { rxMbps: null, txMbps: null, linkStatus: 'unknown' };

    let degraded = false;
    let reason = 'Normal';

    if (!probe.reachable || probe.lossPct === 100) {
        degraded = true;
        if (t.linkStatus === 'down' || !gwProbe.reachable) {
            reason = `Link / Gateway ISP Putus (Loss: 100% | GW ${isp.gatewayIp} Unreachable)`;
        } else {
            reason = `Koneksi Upstream Putus / RTO (Loss: 100% | Link Modem Terhubung)`;
        }
    } else if (probe.lossPct >= 50) {
        degraded = true;
        reason = `Packet Loss Tinggi (${probe.lossPct}% Loss | Avg Latency: ${probe.avgLatency?.toFixed(1) || '-'}ms)`;
    } else if (probe.avgLatency !== null && probe.avgLatency > latencyThreshold) {
        degraded = true;
        reason = `Latency Tinggi / Bandwidth Degraded (Avg: ${probe.avgLatency.toFixed(1)}ms > Batas ${latencyThreshold}ms)`;
    }

    return {
        ...isp,
        degraded,
        reason,
        lossPct: probe.lossPct,
        avgLatency: probe.avgLatency,
        rxMbps: t.rxMbps,
        txMbps: t.txMbps,
        linkStatus: t.linkStatus
    };
}

function formatTraffic(rxMbps, txMbps) {
    if (rxMbps === null || txMbps === null) return 'N/A';
    return `RX ${rxMbps.toFixed(2)} Mbps / TX ${txMbps.toFixed(2)} Mbps`;
}

async function sendWaAlertMessage(targetGroup, message) {
    const ports = [5002, 5003, 5004];
    for (const port of ports) {
        try {
            // Coba kirim via nama group terlebih dahulu
            await axios.post(`http://127.0.0.1:${port}/send-message`, {
                to: `GROUP:${targetGroup}`,
                message
            }, { timeout: 8000 });
            return true;
        } catch (err) {
            // Fallback ke default JID group Tehnisi Helpdesk TCFSG (sama seperti di whatsapp_bot.js)
            try {
                await axios.post(`http://127.0.0.1:${port}/send-message`, {
                    to: '120363043498526316@g.us',
                    message
                }, { timeout: 8000 });
                return true;
            } catch (fallbackErr) {
                continue;
            }
        }
    }
    return false;
}

async function checkAllIsps() {
    try {
        const settingsRows = await db('settings').where({ section: 'monitoring' });
        const config = {};
        for (const row of settingsRows) {
            try { config[row.key] = JSON.parse(row.value); } catch (e) { config[row.key] = row.value; }
        }

        // Gunakan enable_isp_v2 (atau fallback true jika belum diset)
        const enableISP = config.enable_isp_v2 !== undefined ? (config.enable_isp_v2 !== false && config.enable_isp_v2 !== 'false') : true;
        if (!enableISP) return;

        const targetGroupISP = config.isp_target_group || 'Tehnisi Helpdesk TCFSG';
        const ispLatencyThreshold = parseInt(config.isp_latency_threshold) || 150;

        const trafficMap = await fetchInfraGuardTraffic();
        const results = {};

        for (const isp of ISP_PROVIDERS) {
            results[isp.id] = await probeSingleIsp(isp, ispLatencyThreshold, trafficMap);
        }

        const newAlerts = [];
        const resolvedAlerts = [];

        for (const isp of ISP_PROVIDERS) {
            const res = results[isp.id];
            const partner = results[isp.partnerId];
            const state = ispState[isp.id];

            if (res.degraded) {
                if (!state.degraded) {
                    state.degraded = true;
                    state.lastReason = res.reason;
                    state.since = new Date();

                    let partnerStatusText = '';
                    if (partner) {
                        if (!partner.degraded) {
                            partnerStatusText = `\n  🛡️ *Status Backup (${partner.shortName})*: ✅ NORMAL (Latency: ${partner.avgLatency !== null ? partner.avgLatency.toFixed(1) + 'ms' : 'OK'} | Traffic: ${formatTraffic(partner.rxMbps, partner.txMbps)} — Auto-Failover Aktif)`;
                        } else {
                            partnerStatusText = `\n  🚨 *Status Partner (${partner.shortName})*: ⚠️ IKUT GANGGUAN (${partner.reason})`;
                        }
                    }

                    newAlerts.push(
                        `⚠️ *ISP Alert [${res.plant} — ${res.name}]*\n` +
                        `  • *Masalah*: ${res.reason}\n` +
                        `  • *Interface*: \`${res.interfaceName}\` (GW: ${res.gatewayIp})\n` +
                        `  • *Traffic Link*: ${formatTraffic(res.rxMbps, res.txMbps)}` +
                        partnerStatusText
                    );
                }
            } else if (state.degraded) {
                state.degraded = false;
                const prevReason = state.lastReason;
                state.lastReason = null;
                state.since = null;

                resolvedAlerts.push(
                    `✅ *ISP Alert [${res.plant} — ${res.name}]*\n` +
                    `  • *Status*: Kualitas koneksi kembali NORMAL\n` +
                    `  • *Metrik*: Latency ${res.avgLatency !== null ? res.avgLatency.toFixed(1) + 'ms' : 'Normal'} | Loss ${res.lossPct}%\n` +
                    `  • *Traffic Link*: ${formatTraffic(res.rxMbps, res.txMbps)}` +
                    (prevReason ? `\n  • *Gangguan Sebelumnya*: ${prevReason}` : '')
                );
            }
        }

        if (newAlerts.length > 0 || resolvedAlerts.length > 0) {
            let msg = `🔔 *SYSTEM ALERT* 🔔\n\n`;
            if (newAlerts.length > 0) {
                msg += `*NEW ALERTS:*\n${newAlerts.join('\n\n')}\n\n`;
            }
            if (resolvedAlerts.length > 0) {
                msg += `*RESOLVED:*\n${resolvedAlerts.join('\n\n')}\n\n`;
            }
            msg += `_(Monitoring Modul Sistem — Dual-ISP SG)_`;

            const sent = await sendWaAlertMessage(targetGroupISP, msg.trim());
            console.log(`[ISP_Monitor] Alert dispatched (sent=${sent}): new=${newAlerts.length}, resolved=${resolvedAlerts.length}`);
        }
    } catch (err) {
        console.error('[ISP_Monitor] Error during ISP health check:', err.message);
    }
}

let monitorInterval = null;
function startIspMonitor() {
    if (monitorInterval) return;
    console.log('[ISP_Monitor] Starting Smart Dual-ISP Monitor (COMNET & iFORTE)...');
    // Jalankan pengecekan pertama 30 detik setelah boot, lalu setiap 5 menit
    setTimeout(checkAllIsps, 30 * 1000);
    monitorInterval = setInterval(checkAllIsps, 5 * 60 * 1000);
}

module.exports = { startIspMonitor, checkAllIsps };

