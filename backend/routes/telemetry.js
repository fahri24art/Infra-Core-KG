const express = require('express');
const router = express.Router();
const os = require('os');
const { Client } = require('ssh2');

// Helper to get local (Server 66) metrics
function getLocalMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / totalMem) * 100;
    
    // Simple CPU load average (Windows/Linux)
    const cpus = os.cpus();
    
    return {
        server: 'Server 66 (App Host)',
        ip: '192.168.1.66',
        cpu: `${cpus.length} Cores`,
        memory: `${(usedMem / (1024*1024*1024)).toFixed(1)}GB / ${(totalMem / (1024*1024*1024)).toFixed(1)}GB (${memUsage.toFixed(1)}%)`,
        os: `${os.type()} ${os.release()}`
    };
}

// Helper to get remote (Server 3) metrics via SSH
function getRemoteMetrics() {
    return new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.exec('free -m && echo "---" && df -h / && echo "---" && top -bn1 | grep "Cpu(s)"', (err, stream) => {
                if (err) {
                    conn.end();
                    return resolve({ server: 'Server 3 (Infra Guard)', ip: '192.168.1.3', status: 'error', error: err.message });
                }
                let dataStr = '';
                stream.on('close', () => {
                    conn.end();
                    try {
                        const parts = dataStr.split('---');
                        const freeOutput = parts[0];
                        const dfOutput = parts[1];
                        const topOutput = parts[2] || '';
                        
                        // Parse Memory
                        const memLine = freeOutput.split('\n').find(l => l.startsWith('Mem:'));
                        let memStr = 'Unknown';
                        if (memLine) {
                            const m = memLine.match(/\S+/g);
                            if (m && m.length >= 3) {
                                const total = parseInt(m[1]);
                                const used = parseInt(m[2]);
                                memStr = `${(used/1024).toFixed(1)}GB / ${(total/1024).toFixed(1)}GB (${((used/total)*100).toFixed(1)}%)`;
                            }
                        }
                        
                        // Parse Disk
                        const diskLine = dfOutput.split('\n').find(l => l.includes('/dev/'));
                        let diskStr = 'Unknown';
                        if (diskLine) {
                            const d = diskLine.match(/\S+/g);
                            if (d && d.length >= 5) {
                                diskStr = `${d[2]} / ${d[1]} (${d[4]})`;
                            }
                        }
                        
                        // Parse CPU
                        let cpuStr = 'Unknown';
                        if (topOutput.includes('Cpu(s):')) {
                            const cpuMatch = topOutput.match(/([0-9.]+)\s+id/);
                            if (cpuMatch) {
                                const idle = parseFloat(cpuMatch[1]);
                                cpuStr = `${(100 - idle).toFixed(1)}% Usage`;
                            }
                        }
                        
                        resolve({
                            server: 'Server 3 (Infra Guard)',
                            ip: '192.168.1.3',
                            status: 'online',
                            cpu: cpuStr,
                            memory: memStr,
                            storage: diskStr,
                            raw: dataStr
                        });
                    } catch (e) {
                        resolve({ server: 'Server 3 (Infra Guard)', ip: '192.168.1.3', status: 'parsing error' });
                    }
                }).on('data', (data) => {
                    dataStr += data.toString();
                });
            });
        }).on('error', (err) => {
            resolve({ server: 'Server 3 (Infra Guard)', ip: '192.168.1.3', status: 'offline', error: err.message });
        }).connect({
            host: '192.168.1.3',
            port: 22,
            username: 'root',
            password: 'nevergiveup',
            readyTimeout: 3000
        });
    });
}

router.get('/', async (req, res) => {
    try {
        const local = getLocalMetrics();
        const remote = await getRemoteMetrics();
        res.json({ s66: local, s3: remote });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
