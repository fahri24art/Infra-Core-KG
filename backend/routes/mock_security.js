const express = require('express');
const router = express.Router();

// Mock Data: Threat Logs
const THREAT_LOGS = [
    { id: 101, timestamp: '2023-10-27 10:42:05', severity: 'Critical', type: 'Malware', source: '192.168.1.45', destination: '8.8.8.8', action: 'Blocked', rule: 'Block-Botnet' },
    { id: 102, timestamp: '2023-10-27 10:41:12', severity: 'High', type: 'Exploit', source: '112.45.67.89', destination: '192.168.1.200', action: 'Blocked', rule: 'IPS-WebServer' },
    { id: 103, timestamp: '2023-10-27 10:35:44', severity: 'Medium', type: 'Port Scan', source: '192.168.1.110', destination: '192.168.1.1', action: 'Alert', rule: 'Detect-Scan' },
    { id: 104, timestamp: '2023-10-27 10:30:22', severity: 'Low', type: 'Policy Violation', source: '192.168.1.55', destination: 'facebook.com', action: 'Blocked', rule: 'Block-Social' },
    { id: 105, timestamp: '2023-10-27 10:15:33', severity: 'High', type: 'C&C Callback', source: '192.168.1.99', destination: 'bad-domain.com', action: 'Blocked', rule: 'Botnet-C2' },
];

// Mock Data: Firewall Rules
const FIREWALL_RULES = [
    { id: 1, name: 'Block-Botnet', source: 'Any', destination: 'Any', service: 'Any', action: 'Deny', status: 'Active', hits: 1542 },
    { id: 2, name: 'Allow-DNS', source: 'LAN-Subnet', destination: 'DNS-Servers', service: 'DNS', action: 'Allow', status: 'Active', hits: 54220 },
    { id: 3, name: 'Allow-Web-Access', source: 'LAN-Subnet', destination: 'Any', service: 'HTTP/HTTPS', action: 'Allow', status: 'Active', hits: 89011 },
    { id: 4, name: 'Block-Social', source: 'Staff-VLAN', destination: 'Social-Media', service: 'HTTPS', action: 'Deny', status: 'Active', hits: 321 },
    { id: 5, name: 'IPS-WebServer', source: 'Any', destination: 'DMZ-Web', service: 'HTTPS', action: 'Protect', status: 'Active', hits: 45 },
];

// Mock Data: Objects
const NETWORK_OBJECTS = [
    { id: 1, name: 'LAN-Subnet', type: 'Subnet', value: '192.168.1.0/24', description: 'Office Local Network' },
    { id: 2, name: 'DMZ-Web', type: 'Host', value: '192.168.2.10', description: 'Public Web Server' },
    { id: 3, name: 'DNS-Servers', type: 'Group', value: '8.8.8.8, 1.1.1.1', description: 'Public DNS' },
    { id: 4, name: 'Social-Media', type: 'FQDN', value: '*.facebook.com, *.twitter.com', description: 'Social Platforms' },
];

router.get('/security/logs', (req, res) => {
    res.json(THREAT_LOGS);
});

router.get('/policy/rules', (req, res) => {
    res.json(FIREWALL_RULES);
});

router.get('/objects/hosts', (req, res) => {
    res.json(NETWORK_OBJECTS);
});

router.get('/stats', (req, res) => {
    res.json({
        assets: { total: 154, inUse: 120, inStock: 30, underMaintenance: 4 },
        tickets: { open: 12, inProgress: 5, pending: 2, resolved: 45 },
        users: { total: 25 }
    });
});

router.get('/assets', (req, res) => {
    res.json([
        { id: 1, name: 'Firewall-Core-01', ip: '192.168.1.1', agent_status: 'Online', type: 'Appliance' },
        { id: 2, name: 'Switch-Dist-01', ip: '192.168.1.2', agent_status: 'Online', type: 'Switch' },
        { id: 3, name: 'Server-AD-01', ip: '192.168.1.10', agent_status: 'Online', type: 'Server' },
        { id: 4, name: 'Server-App-01', ip: '192.168.1.11', agent_status: 'Offline', type: 'Server' },
    ]);
});

module.exports = router;
