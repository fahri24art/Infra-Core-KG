const { RouterOSAPI } = require('node-routeros');
const http = require('http');

class MikroTikService {
    constructor() {
        this.config = null;
    }

    async fetchRemote(url) {
        return new Promise((resolve, reject) => {
            const req = http.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error("Failed to parse remote JSON"));
                    }
                });
            });
            req.on('error', (err) => reject(err));
            req.setTimeout(3000, () => {
                req.destroy();
                reject(new Error("Remote fetch timeout"));
            });
        });
    }

    setConfig(config) {
        this.config = {
            host: config.mikrotik_ip,
            port: parseInt(config.mikrotik_port) || 8728,
            user: config.mikrotik_user,
            password: config.mikrotik_password
        };
    }

    async getClient() {
        if (!this.config || !this.config.host) throw new Error("MikroTik not configured");
        const client = new RouterOSAPI({
            ...this.config,
            timeout: 5,
            keepalive: false
        });
        client.on('error', (err) => {
            console.error('MikroTik Client Error:', err.message);
        });
        await client.connect();
        return client;
    }

    async writeWithTimeout(client, cmd, timeoutMs = 5000) {
        return Promise.race([
            client.write(cmd),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${cmd[0]}`)), timeoutMs))
        ]);
    }

    async getDashboardData() {
        try {
            console.log("[MikroTik] Fetching real-time data from InfraGuard Server 3 (192.168.1.3:8000)...");
            const remoteData = await this.fetchRemote('http://192.168.1.3:8000/api/network/dashboard');
            if (remoteData && remoteData.system) {
                return remoteData;
            }
        } catch (e) {
            console.warn("[MikroTik] Remote fetch from InfraGuard Server 3 (192.168.1.3:8000) failed, falling back to local connection:", e.message);
        }

        let client;
        try {
            client = await this.getClient();
        } catch (e) {
            console.error("MikroTik Connection Failed:", e.message);
            return this.getOfflineData();
        }

        try {
            // Run system and interfaces in parallel, users as a separate attempt
            const [system, identity, interfaces] = await Promise.all([
                this.writeWithTimeout(client, ['/system/resource/print']),
                this.writeWithTimeout(client, ['/system/identity/print']),
                this.writeWithTimeout(client, ['/interface/print'])
            ]);

            // Traffic bits
            const trafficPromises = interfaces
                .filter(i => i.running === 'true' && (i.type === 'ether' || i.type === 'vlan' || i.type === 'bridge'))
                .map(async (i) => {
                    try {
                        const [monitor] = await this.writeWithTimeout(client, [
                            '/interface/monitor-traffic',
                            '=interface=' + i.name,
                            '=once=yes'
                        ], 2000);
                        return { name: i.name, ...monitor };
                    } catch (e) {
                        return { name: i.name, 'rx-bits-per-second': 0, 'tx-bits-per-second': 0 };
                    }
                });

            const traffic = await Promise.all(trafficPromises);

            // User counts (fast or fail)
            let userStats = { hotspotCount: 0, pppCount: 0 };
            try {
                const [h, p] = await Promise.all([
                    this.writeWithTimeout(client, ['/ip/hotspot/active/print'], 2000),
                    this.writeWithTimeout(client, ['/ppp/active/print'], 2000)
                ]);
                userStats.hotspotCount = h.length;
                userStats.pppCount = p.length;
            } catch (e) {
                console.warn("User stats fetch slow/failed, skipping");
            }

            client.close();

            // Identify and sum WAN traffic (iForte, Comnet, etc.)
            const wanRegex = /isp|iforte|comnet|comtronic|wan/i;
            const wanInterfaces = traffic.filter(t => wanRegex.test(t.name));

            const wanStats = {
                'rx-bits-per-second': wanInterfaces.reduce((sum, t) => sum + parseInt(t['rx-bits-per-second'] || 0), 0),
                'tx-bits-per-second': wanInterfaces.reduce((sum, t) => sum + parseInt(t['tx-bits-per-second'] || 0), 0),
                'sources': wanInterfaces.map(w => w.name)
            };

            // If no WAN identified, fall back to ether1 or first
            if (wanInterfaces.length === 0) {
                const fallback = traffic.find(t => t.name === 'ether1') || traffic[0] || { 'rx-bits-per-second': 0, 'tx-bits-per-second': 0 };
                wanStats['rx-bits-per-second'] = parseInt(fallback['rx-bits-per-second'] || 0);
                wanStats['tx-bits-per-second'] = parseInt(fallback['tx-bits-per-second'] || 0);
                wanStats['sources'] = [fallback.name || 'unknown'];
            }

            return {
                system: {
                    cpu: system[0]['cpu-load'],
                    memory: { free: system[0]['free-memory'], total: system[0]['total-memory'] },
                    uptime: system[0].uptime,
                    identity: identity[0].name
                },
                traffic: {
                    wan: {
                        rx: parseInt(wanStats['rx-bits-per-second']),
                        tx: parseInt(wanStats['tx-bits-per-second']),
                        sources: wanStats.sources
                    },
                    interfaces: interfaces.map(i => {
                        const t = traffic.find(tr => tr.name === i.name);
                        return {
                            name: i.name,
                            rx: t ? parseInt(t['rx-bits-per-second']) : 0,
                            tx: t ? parseInt(t['tx-bits-per-second']) : 0
                        };
                    })
                },
                users: userStats
            };
        } catch (e) {
            if (client) client.close();
            console.error("MikroTik Data Fetch Error:", e.message);
            return this.getOfflineData();
        }
    }

    getOfflineData() {
        return {
            system: { cpu: 0, memory: { free: 0, total: 0 }, uptime: 'offline', identity: 'MicroTik-Offline' },
            traffic: { wan: { rx: 0, tx: 0, sources: [] }, interfaces: [] },
            users: { hotspotCount: 0, pppCount: 0 }
        };
    }

    async getInterfaces() {
        const client = await this.getClient();
        try {
            const res = await this.writeWithTimeout(client, ['/interface/print']);
            client.close();
            return res;
        } catch (e) { client.close(); throw e; }
    }

    async getFirewallRules(chain = 'all') {
        const client = await this.getClient();
        try {
            const [f, n, m] = await Promise.all([
                this.writeWithTimeout(client, ['/ip/firewall/filter/print']),
                this.writeWithTimeout(client, ['/ip/firewall/nat/print']),
                this.writeWithTimeout(client, ['/ip/firewall/mangle/print'])
            ]);
            client.close();
            return {
                filter: f.map(r => ({ ...r, type: 'filter', id: r['.id'] })),
                nat: n.map(r => ({ ...r, type: 'nat', id: r['.id'] })),
                mangle: m.map(r => ({ ...r, type: 'mangle', id: r['.id'] }))
            };
        } catch (e) { client.close(); throw e; }
    }

    async manageFirewall(action, type, data) {
        const client = await this.getClient();
        const menuPath = `/ip/firewall/${type}`;
        try {
            let res;
            if (action === 'add') {
                const cmd = [menuPath + '/add'];
                for (const [key, value] of Object.entries(data)) cmd.push(`=${key}=${value}`);
                res = await client.write(cmd);
            } else if (action === 'remove') res = await client.write([menuPath + '/remove', '=.id=' + data.id]);
            else if (action === 'enable') res = await client.write([menuPath + '/enable', '=.id=' + data.id]);
            else if (action === 'disable') res = await client.write([menuPath + '/disable', '=.id=' + data.id]);
            client.close();
            return res;
        } catch (e) { client.close(); throw e; }
    }
}

module.exports = new MikroTikService();
