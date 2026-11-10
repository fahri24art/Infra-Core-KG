const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const db = require('../../db');

const GLPI_CONFIG = {
    ssh: {
        host: '192.168.1.66',
        port: 22,
        username: 'tcf',
        password: 'nevergiveup'
    },
    db: {
        host: '127.0.0.1',
        user: 'root',
        password: 'nevergiveup',
        database: 'glpidb'
    }
};

class GLPISyncService {
    constructor() {
        this.sshClient = new Client();
    }

    async syncAll() {
        console.log('[GLPI] Starting Full Sync...');
        return new Promise((resolve, reject) => {
            this.sshClient.on('ready', () => {
                console.log('[GLPI] SSH Tunnel Established');
                this.sshClient.forwardOut('127.0.0.1', 12345, '127.0.0.1', 3306, async (err, stream) => {
                    if (err) {
                        this.sshClient.end();
                        return reject(err);
                    }

                    let connection;
                    try {
                        connection = await mysql.createConnection({
                            ...GLPI_CONFIG.db,
                            stream
                        });

                        await this.syncUsers(connection);
                        await this.syncDepartments(connection);

                        // Sync all asset types
                        await this.syncComputers(connection);
                        await this.syncPrinters(connection);
                        await this.syncMonitors(connection);
                        await this.syncPhones(connection);

                        console.log('[GLPI] Sync Complete');
                        resolve({ success: true });
                    } catch (error) {
                        console.error('[GLPI] Sync Failed:', error);
                        reject(error);
                    } finally {
                        if (connection) await connection.end();
                        this.sshClient.end();
                    }
                });
            }).on('error', (err) => {
                console.error('[GLPI] SSH Connection Error:', err);
                reject(err);
            }).connect(GLPI_CONFIG.ssh);
        });
    }

    async syncUsers(connection) {
        console.log('[GLPI] Syncing Users...');
        const [rows] = await connection.execute(`
            SELECT u.id, u.name, u.realname, u.firstname, e.email 
            FROM glpi_users u 
            LEFT JOIN glpi_useremails e ON e.users_id = u.id AND e.is_default = 1
            WHERE u.is_deleted = 0
        `);

        for (const user of rows) {
            const displayName = user.realname ? `${user.firstname} ${user.realname}` : user.name;
            const targetEmail = user.email || `${user.name}@example.com`;

            try {
                // 1. Try to find by Email first (Strongest match)
                let existing = await db('users').where('email', targetEmail).first();

                // 2. If not found by email, try by name
                if (!existing) {
                    existing = await db('users').where('name', displayName).first();
                }

                if (existing) {
                    // Update existing user
                    // Check if we need to update to avoid redundant writes
                    if (existing.name !== displayName || existing.email !== targetEmail) {
                        try {
                            await db('users').where('id', existing.id).update({
                                name: displayName,
                                email: targetEmail,
                                updated_at: new Date()
                            });
                        } catch (updateErr) {
                            console.warn(`[GLPI] Update failed for ${displayName} (ID: ${existing.id}): ${updateErr.message}`);
                        }
                    }
                } else {
                    // Insert new user
                    await db('users').insert({
                        name: displayName,
                        email: targetEmail,
                        role: 'User',
                        department: 'General',
                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }
            } catch (e) {
                console.warn(`[GLPI] User sync error for ${displayName}: ${e.message}`);
                // Continue to next user, don't break the whole sync
            }
        }
        console.log(`[GLPI] Synced ${rows.length} users`);
    }

    async syncDepartments(connection) {
        // Skip for now to focus on assets
    }

    async getLocalUserId(connection, glpiUserId) {
        if (!glpiUserId || glpiUserId === 0) return { id: null, name: 'Unassigned' };
        try {
            const [u] = await connection.execute(`SELECT name, realname, firstname FROM glpi_users WHERE id = ?`, [glpiUserId]);
            if (u.length > 0) {
                const userName = u[0].realname ? `${u[0].firstname} ${u[0].realname}` : u[0].name;
                const localUser = await db('users').where('name', userName).first();
                return { id: localUser ? localUser.id : null, name: userName };
            }
        } catch (e) {
            console.warn('User lookup error', e.message);
        }
        return { id: null, name: 'Unassigned' };
    }

    async syncComputers(connection) {
        console.log('[GLPI] Syncing Computers...');
        try {
            // Fetch ALL computers (full inventory - no Ricoh filter)
            const [computers] = await connection.execute(`
                SELECT 
                    c.id, c.name, c.serial, c.otherserial as inventory_number, 
                    c.users_id, c.locations_id, c.is_deleted, c.uuid,
                    c.users_id_tech,
                    c.date_mod as last_update,
                    m.name as manufacturer, cmod.name as model,
                    ct.name as type_name,
                    st.name as status,
                    loc.completename as location_name,
                    ut.realname as tech_realname, ut.firstname as tech_firstname,
                    ent.completename as entity_name,
                    g.name as group_name
                FROM glpi_computers c
                LEFT JOIN glpi_manufacturers m ON c.manufacturers_id = m.id
                LEFT JOIN glpi_computermodels cmod ON c.computermodels_id = cmod.id
                LEFT JOIN glpi_computertypes ct ON c.computertypes_id = ct.id
                LEFT JOIN glpi_states st ON c.states_id = st.id
                LEFT JOIN glpi_locations loc ON c.locations_id = loc.id
                LEFT JOIN glpi_users ut ON c.users_id_tech = ut.id
                LEFT JOIN glpi_entities ent ON c.entities_id = ent.id
                LEFT JOIN glpi_groups_items gi ON c.id = gi.items_id AND gi.itemtype = 'Computer'
                LEFT JOIN glpi_groups g ON gi.groups_id = g.id
                WHERE c.is_deleted = 0
            `);

            // Get which computers have Ricoh driver installed
            const [ricohRows] = await connection.execute(`
                SELECT DISTINCT c.name
                FROM glpi_computers c
                JOIN glpi_items_softwareversions isv ON isv.items_id = c.id AND isv.itemtype = 'Computer'
                JOIN glpi_softwareversions sv ON isv.softwareversions_id = sv.id
                JOIN glpi_softwares s ON sv.softwares_id = s.id
                WHERE c.is_deleted = 0 AND s.name LIKE '%ricoh%'
            `);
            const ricohComputerNames = new Set(ricohRows.map(r => r.name));

            console.log(`[GLPI] Found ${computers.length} computers`);

            for (const comp of computers) {
                const specs = await this.getComputerSpecs(connection, comp.id);
                const user = await this.getLocalUserId(connection, comp.users_id);

                // Extended details mapped to specs
                specs.source = 'GLPI Import';
                specs.has_ricoh_driver = ricohComputerNames.has(comp.name);
                specs.detailed_location = comp.location_name;
                specs.technician = comp.tech_realname ? `${comp.tech_firstname || ''} ${comp.tech_realname}`.trim() : null;
                specs.department = comp.group_name;
                specs.division = comp.entity_name;
                specs.uuid = comp.uuid;
                specs.last_update_source = 'GLPI Native Inventory';
                specs.last_boot = null;

                let status = 'Active';
                if (comp.status?.toLowerCase().includes('repair') || comp.status?.toLowerCase().includes('broken')) status = 'In Repair';
                if (comp.is_deleted === 1) status = 'Retired';

                let type = 'Desktop';
                if (comp.type_name === 'Notebook' || comp.type_name === 'Laptop') type = 'Laptop';

                await this.upsertAsset({
                    name: comp.name,
                    category: 'Desktop',
                    type: type,
                    manufacturer: comp.manufacturer || 'Unknown',
                    model: comp.model || 'Generic',
                    serial_number: comp.serial || `SN-COMP-${comp.id}`,
                    inventory_number: comp.inventory_number || `INV-COMP-${comp.id}`,
                    location: comp.location_name ? comp.location_name.split(' > ').pop() : 'Office',
                    status: status,
                    contact: user.name,
                    user_id: user.id,
                    specs: JSON.stringify(specs)
                });
            }

            console.log(`[GLPI] Synced ${computers.length} computers (${ricohComputerNames.size} have Ricoh driver)`);
        } catch (e) {
            console.error('[GLPI] Error in syncComputers:', e);
            throw e;
        }
    }

    async syncPrinters(connection) {
        console.log('[GLPI] Syncing Printers...');
        try {
            const [rows] = await connection.execute(`
                SELECT p.id, p.name, p.serial, p.otherserial, p.users_id, m.name as manufacturer, st.name as status
                FROM glpi_printers p
                LEFT JOIN glpi_manufacturers m ON p.manufacturers_id = m.id
                LEFT JOIN glpi_states st ON p.states_id = st.id
                WHERE p.is_deleted = 0
            `);

            for (const item of rows) {
                const user = await this.getLocalUserId(connection, item.users_id);
                await this.upsertAsset({
                    name: item.name,
                    category: 'Printer',
                    type: 'Printer',
                    manufacturer: item.manufacturer || 'Unknown',
                    model: 'Standard Printer',
                    serial_number: item.serial || `SN-PRT-${item.id}`,
                    inventory_number: item.otherserial || `INV-PRT-${item.id}`,
                    location: 'Office',
                    status: 'Active',
                    contact: user.name,
                    user_id: user.id,
                    specs: '{}'
                });
            }
            console.log(`[GLPI] Synced ${rows.length} printers`);
        } catch (e) {
            console.error('[GLPI] Error in syncPrinters:', e);
        }
    }

    async syncMonitors(connection) {
        console.log('[GLPI] Syncing Monitors...');
        try {
            const [rows] = await connection.execute(`
                SELECT m.id, m.name, m.serial, m.otherserial, m.users_id, manuf.name as manufacturer, st.name as status
                FROM glpi_monitors m
                LEFT JOIN glpi_manufacturers manuf ON m.manufacturers_id = manuf.id
                LEFT JOIN glpi_states st ON m.states_id = st.id
                WHERE m.is_deleted = 0
            `);

            for (const item of rows) {
                const user = await this.getLocalUserId(connection, item.users_id);
                await this.upsertAsset({
                    name: item.name,
                    category: 'Monitor',
                    type: 'Monitor',
                    manufacturer: item.manufacturer || 'Unknown',
                    model: 'Standard Display',
                    serial_number: item.serial || `SN-MON-${item.id}`,
                    inventory_number: item.otherserial || `INV-MON-${item.id}`,
                    location: 'Office',
                    status: 'Active',
                    contact: user.name,
                    user_id: user.id,
                    specs: '{}'
                });
            }
            console.log(`[GLPI] Synced ${rows.length} monitors`);
        } catch (e) {
            console.error('[GLPI] Error in syncMonitors:', e);
        }
    }

    async syncPhones(connection) {
        console.log('[GLPI] Syncing Phones...');
        try {
            const [rows] = await connection.execute(`
                SELECT p.id, p.name, p.serial, p.otherserial, p.users_id, m.name as manufacturer, st.name as status
                FROM glpi_phones p
                LEFT JOIN glpi_manufacturers m ON p.manufacturers_id = m.id
                LEFT JOIN glpi_states st ON p.states_id = st.id
                WHERE p.is_deleted = 0
            `);

            for (const item of rows) {
                const user = await this.getLocalUserId(connection, item.users_id);
                await this.upsertAsset({
                    name: item.name || 'Mobile Phone',
                    category: 'Phone',
                    type: 'Mobile',
                    manufacturer: item.manufacturer || 'Unknown',
                    model: 'Standard Phone',
                    serial_number: item.serial || `SN-PH-${item.id}`,
                    inventory_number: item.otherserial || `INV-PH-${item.id}`,
                    location: 'Office',
                    status: 'Active',
                    contact: user.name,
                    user_id: user.id,
                    specs: '{}'
                });
            }
            console.log(`[GLPI] Synced ${rows.length} phones`);
        } catch (e) {
            console.warn('[GLPI] Phone sync skipped:', e.message);
        }
    }

    async upsertAsset(data) {
        const existing = await db('assets').where('inventory_number', data.inventory_number).first();
        if (existing) {
            await db('assets').where('id', existing.id).update({
                ...data,
                updated_at: new Date()
            });
        } else {
            await db('assets').insert({
                ...data,
                created_at: new Date(),
                updated_at: new Date()
            });
        }
    }

    async getComputerSpecs(connection, computerId) {
        const specs = {};
        try {
            // OS + Version
            const [os] = await connection.execute(`
                SELECT os.name, osv.name as version
                FROM glpi_items_operatingsystems ios
                JOIN glpi_operatingsystems os ON ios.operatingsystems_id = os.id
                LEFT JOIN glpi_operatingsystemversions osv ON ios.operatingsystemversions_id = osv.id
                WHERE ios.items_id = ? AND ios.itemtype = 'Computer' LIMIT 1`, [computerId]);
            if (os.length) {
                specs.os = os[0].name;
                specs.os_version = os[0].version || null;
            }

            // CPU (designation, frequency, cores)
            const [cpu] = await connection.execute(`
                SELECT dp.designation, idp.frequency, idp.nbcores, idp.nbthreads
                FROM glpi_items_deviceprocessors idp
                JOIN glpi_deviceprocessors dp ON idp.deviceprocessors_id = dp.id
                WHERE idp.items_id = ? AND idp.itemtype = 'Computer' LIMIT 1`, [computerId]);
            if (cpu.length) {
                specs.cpu = cpu[0].designation;
                specs.cpu_freq_mhz = cpu[0].frequency || null;
                specs.cpu_cores = cpu[0].nbcores || null;
                specs.cpu_threads = cpu[0].nbthreads || null;
            }

            // RAM (total + per-slot details)
            const [ram] = await connection.execute(`
                SELECT idm.size, dm.designation
                FROM glpi_items_devicememories idm
                JOIN glpi_devicememories dm ON idm.devicememories_id = dm.id
                WHERE idm.items_id = ? AND idm.itemtype = 'Computer'`, [computerId]);
            if (ram.length) {
                const totalRam = ram.reduce((s, r) => s + (r.size || 0), 0);
                specs.ram = `${Math.round(totalRam)} MB`;
                specs.ram_total_mb = Math.round(totalRam);
                specs.ram_slots = ram.map(r => ({ size_mb: r.size, type: r.designation || 'Unknown' }));
            }

            // Storage
            const [disk] = await connection.execute(`
                SELECT idd.capacity, dd.designation
                FROM glpi_items_deviceharddrives idd
                JOIN glpi_deviceharddrives dd ON idd.deviceharddrives_id = dd.id
                WHERE idd.items_id = ? AND idd.itemtype = 'Computer'`, [computerId]);
            if (disk.length) {
                specs.storage = disk.map(d => ({
                    model: d.designation || 'Unknown',
                    capacity_mb: d.capacity || 0,
                    capacity_gb: d.capacity ? Math.round(d.capacity / 1024) : 0
                }));
                specs.storage_summary = disk.map(d => `${d.designation || 'HDD'} (${Math.round((d.capacity || 0) / 1024)} GB)`).join(', ');
            }

            // GPU / VGA
            const [gpu] = await connection.execute(`
                SELECT dg.designation
                FROM glpi_items_devicegraphiccards idg
                JOIN glpi_devicegraphiccards dg ON idg.devicegraphiccards_id = dg.id
                WHERE idg.items_id = ? AND idg.itemtype = 'Computer'`, [computerId]);
            if (gpu.length) {
                specs.gpu = gpu.map(g => g.designation || 'Unknown').join(', ');
            }

            // MAC Address
            const [nic] = await connection.execute(`
                SELECT idn.mac
                FROM glpi_items_devicenetworkcards idn
                WHERE idn.items_id = ? AND idn.itemtype = 'Computer'`, [computerId]);
            if (nic.length) {
                specs.mac_addresses = nic.map(n => n.mac).filter(Boolean);
            }

            // IP Address (via networkports)
            const [ip] = await connection.execute(`
                SELECT ipa.name
                FROM glpi_ipaddresses ipa
                JOIN glpi_networkports np ON np.id = ipa.items_id AND ipa.itemtype = 'NetworkPort'
                WHERE np.items_id = ? AND np.itemtype = 'Computer' AND ipa.name != '127.0.0.1'
                LIMIT 3`, [computerId]);
            if (ip.length) {
                specs.ip = ip[0].name;
                specs.ip_addresses = ip.map(i => i.name);
            }

            // Software & Drivers (top 60 - filter system GUIDs)
            const [sw] = await connection.execute(`
                SELECT s.name, sv.name as version
                FROM glpi_items_softwareversions isv
                JOIN glpi_softwareversions sv ON isv.softwareversions_id = sv.id
                JOIN glpi_softwares s ON sv.softwares_id = s.id
                WHERE isv.items_id = ? AND isv.itemtype = 'Computer'
                ORDER BY s.name ASC
                LIMIT 200`, [computerId]);

            // Filter: exclude UUID-looking names (Windows internal components)
            const filtered = sw.filter(s => !/^\{[0-9A-F-]{36}\}$/i.test(s.name) && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s.name));
            specs.software = filtered.map(s => ({ name: s.name, version: s.version || null }));
            specs.software_count = filtered.length;

        } catch (e) { console.warn('Spec error for computerId=' + computerId + ':', e.message); }

        return specs;
    }
}

module.exports = new GLPISyncService();
