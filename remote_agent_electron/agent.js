const axios = require('axios');
const si = require('systeminformation');
const os = require('os');

class RemoteAgent {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.uuid = this.getOrCreateUUID();
        this.hostname = os.hostname();
        this.running = false;
        this.heartbeatInterval = null;
        this.networkInterval = null;
        this.totalBytes = 0;
        this.startTime = Date.now();
    }

    getOrCreateUUID() {
        const Store = require('electron-store');
        const store = new Store();
        if (!store.has('agentUUID')) {
            store.set('agentUUID', require('crypto').randomUUID());
        }
        return store.get('agentUUID');
    }

    async register() {
        try {
            const specs = await this.getSystemSpecs();
            const ip = await this.getLocalIP();

            await axios.post(`${this.serverUrl}/api/network/agents/register`, {
                uuid: this.uuid,
                hostname: this.hostname,
                ip_address: ip,
                os: specs.os,
                specs: specs
            });

            console.log('[Agent] Registered successfully');
            return true;
        } catch (err) {
            console.error('[Agent] Registration error:', err.message);
            return false;
        }
    }

    async getSystemSpecs() {
        try {
            const [osInfo, cpu, mem, disk] = await Promise.all([
                si.osInfo(),
                si.cpu(),
                si.mem(),
                si.fsSize()
            ]);

            return {
                os: `${osInfo.platform} ${osInfo.release}`,
                arch: osInfo.arch,
                hostname: osInfo.hostname,
                cpu: cpu.manufacturer,
                cores: cpu.cores,
                memory: Math.round(mem.total / 1024 / 1024 / 1024),
                disk: Math.round(disk[0]?.size / 1024 / 1024 / 1024 || 0)
            };
        } catch (err) {
            console.error('[Agent] Specs error:', err);
            return {};
        }
    }

    async getLocalIP() {
        try {
            const interfaces = os.networkInterfaces();
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        return iface.address;
                    }
                }
            }
        } catch (err) {
            console.error('[Agent] IP error:', err);
        }
        return '127.0.0.1';
    }

    async getNetworkStats() {
        try {
            const networkInterfaces = await si.networkInterfaces();
            let totalRx = 0;
            let totalTx = 0;

            for (const iface of networkInterfaces) {
                if (iface.operstate === 'up' && !iface.internal) {
                    totalRx += iface.rx_bytes || 0;
                    totalTx += iface.tx_bytes || 0;
                }
            }

            return {
                rx_bytes: totalRx,
                tx_bytes: totalTx,
                total: totalRx + totalTx
            };
        } catch (err) {
            console.error('[Agent] Network stats error:', err);
            return { rx_bytes: 0, tx_bytes: 0, total: 0 };
        }
    }

    async getDeviceUsage() {
        try {
            const [cpuLoad, memLoad] = await Promise.all([
                si.currentLoad(),
                si.mem()
            ]);

            const uptime = Math.floor((Date.now() - this.startTime) / 1000);

            return {
                cpu_usage: Math.round(cpuLoad.currentLoad * 100),
                memory_usage: Math.round((memLoad.active / memLoad.total) * 100),
                memory_used_gb: Math.round(memLoad.active / 1024 / 1024 / 1024),
                uptime_seconds: uptime,
                processes: cpuLoad.currentLoadSystem
            };
        } catch (err) {
            console.error('[Agent] Usage error:', err);
            return {};
        }
    }

    async sendHeartbeat() {
        try {
            const ip = await this.getLocalIP();
            const usage = await this.getDeviceUsage();

            await axios.post(`${this.serverUrl}/api/network/agents/register`, {
                uuid: this.uuid,
                hostname: this.hostname,
                ip_address: ip,
                agent_status: 'Online',
                usage: usage
            });
        } catch (err) {
            console.error('[Agent] Heartbeat error:', err.message);
        }
    }

    async sendNetworkData() {
        try {
            const stats = await this.getNetworkStats();
            const today = new Date().toISOString().split('T')[0];

            await axios.post(`${this.serverUrl}/api/network/agents/network-data`, {
                uuid: this.uuid,
                date: today,
                rx_bytes: stats.rx_bytes,
                tx_bytes: stats.tx_bytes,
                total_bytes: stats.total
            });

            this.totalBytes = stats.total;
        } catch (err) {
            // Endpoint might not exist yet, ignore
        }
    }

    start() {
        if (this.running) return;
        
        this.running = true;
        console.log('[Agent] Starting...');

        // Initial registration
        this.register();

        // Heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000);

        // Network data every 60 seconds
        this.networkInterval = setInterval(() => {
            this.sendNetworkData();
        }, 60000);

        console.log('[Agent] Started successfully');
    }

    stop() {
        if (!this.running) return;
        
        this.running = false;
        console.log('[Agent] Stopping...');

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.networkInterval) {
            clearInterval(this.networkInterval);
        }

        console.log('[Agent] Stopped');
    }

    getStatus() {
        return this.running;
    }

    getTotalDataUsage() {
        return Math.round(this.totalBytes / 1024 / 1024); // MB
    }
}

module.exports = RemoteAgent;
