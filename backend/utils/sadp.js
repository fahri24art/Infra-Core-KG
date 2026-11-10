const dgram = require('dgram');

function scanSADP(timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        const multicastAddress = '239.255.255.250';
        const multicastPort = 37020;
        const devices = new Map(); // Use Map to prevent duplicates by MAC or IP

        socket.on('error', (err) => {
            socket.close();
            reject(err);
        });

        socket.on('message', (msg, rinfo) => {
            const xml = msg.toString('utf8');
            // Basic regex parsing for SADP XML response
            const extract = (tag) => {
                const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
                return match ? match[1] : null;
            };

            const type = extract('Types') || extract('Type');
            // We only care about ProbeMatch responses
            if (xml.includes('ProbeMatch')) {
                const ip = extract('IPv4Address');
                const mac = extract('MAC');
                const serial = extract('DeviceSN');
                const model = extract('DeviceDescription') || extract('Model');
                const softwareVersion = extract('SoftwareVersion');
                
                if (mac || ip) {
                    const key = mac || ip;
                    devices.set(key, {
                        ip,
                        mac,
                        serial,
                        model,
                        softwareVersion,
                        raw: xml
                    });
                }
            }
        });

        socket.on('listening', () => {
            // Send the probe
            const probeXml = `<?xml version="1.0" encoding="utf-8"?><Probe><Uuid>D77BE4F9-3B08-410A-824A-7359CA7B2B62</Uuid><Types>inquiry</Types></Probe>`;
            const message = Buffer.from(probeXml);
            
            socket.send(message, 0, message.length, multicastPort, multicastAddress, (err) => {
                if (err) {
                    console.error('SADP Probe send error:', err);
                }
            });
        });

        socket.bind(() => {
            // Wait for responses
            setTimeout(() => {
                socket.close();
                resolve(Array.from(devices.values()));
            }, timeoutMs);
        });
    });
}

module.exports = { scanSADP };
