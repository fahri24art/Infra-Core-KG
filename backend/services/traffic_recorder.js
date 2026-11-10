const db = require('../db');
const mikrotik = require('./mikrotik');

const startTrafficRecorder = async () => {
    console.log('[Recorder] Starting traffic history recorder...');
    const record = async () => {
        try {
            const settings = await db('settings').where({ section: 'network' }).select('*');
            const config = {};
            settings.forEach(s => {
                try { config[s.key] = JSON.parse(s.value); } catch (e) { config[s.key] = s.value; }
            });

            if (!config.mikrotik_ip || !config.mikrotik_user) {
                console.log('[Recorder] MikroTik IP or User not set. Skipping.');
                return;
            }

            mikrotik.setConfig(config);
            const data = await mikrotik.getDashboardData();

            const iforte = data.traffic.interfaces.find(i => i.name.toLowerCase().includes('iforte')) || { rx: 0, tx: 0 };
            const comnet = data.traffic.interfaces.find(i => i.name.toLowerCase().includes('comtronic') || i.name.toLowerCase().includes('comnet')) || { rx: 0, tx: 0 };

            const isUpValue = (data.system && data.system.uptime !== 'offline') ? 1 : 0;
            await db('traffic_history').insert({
                rx: data.traffic.wan.rx,
                tx: data.traffic.wan.tx,
                rx_iforte: iforte.rx,
                tx_iforte: iforte.tx,
                rx_comnet: comnet.rx,
                tx_comnet: comnet.tx,
                is_up: isUpValue,
                server_up: isUpValue,
                is_up_iforte: (iforte.rx > 0 || iforte.tx > 0) ? 1 : 0,
                is_up_comnet: (comnet.rx > 0 || comnet.tx > 0) ? 1 : 0,
                timestamp: new Date().toISOString()
            });
            console.log(`[Recorder] Saved traffic history for ${new Date().toISOString()}`);
        } catch (err) {
            console.error('[Recorder] Error:', err.message);
        }
    };

    record(); // Initial run
    setInterval(record, 5 * 60 * 1000); // Every 5 mins
};

module.exports = { startTrafficRecorder };
