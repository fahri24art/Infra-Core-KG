const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const db = require('../db');

// POST /api/network/glpi/sync
router.post('/sync', async (req, res) => {
    console.log('[GLPI_SYNC] Sync is being run to restore assets.');

    const config = {
        db: {
            host: '127.0.0.1',
            user: 'root',
            password: 'Nevergiveup572*',
            database: 'glpidb'
        }
    };

    console.log('[GLPI_SYNC] Initiating direct connection to GLPI MySQL Database at ' + config.db.host);
    
    let mysqlDb;
    try {
        mysqlDb = await mysql.createConnection(config.db);
        console.log('[GLPI_SYNC] Database connected. Fetching assets...');
        
        // Fetch computers with hardware specs and users
        const [rows] = await mysqlDb.execute(`
            SELECT c.id, c.entities_id, c.name, c.serial, c.otherserial as inventory_number, c.contact, c.uuid, ct.name as type_name, 
                   u.realname as user_realname, u.firstname as user_firstname, u.name as user_username,
                   c.date_mod as last_update,
                   st.name as status_name,
                   m.name as manufacturer_name,
                   cmod.name as model_name,
                   loc.completename as location_name
            FROM glpi_computers c
            LEFT JOIN glpi_computertypes ct ON c.computertypes_id = ct.id
            LEFT JOIN glpi_users u ON c.users_id = u.id
            LEFT JOIN glpi_states st ON c.states_id = st.id
            LEFT JOIN glpi_manufacturers m ON c.manufacturers_id = m.id
            LEFT JOIN glpi_computermodels cmod ON c.computermodels_id = cmod.id
            LEFT JOIN glpi_locations loc ON c.locations_id = loc.id
            WHERE c.is_deleted = 0
        `);

        // Fetch network ports for all computers with IP addresses
        const [networkRows] = await mysqlDb.execute(`
            SELECT np.items_id as computer_id, np.name as interface_name, np.mac
            FROM glpi_networkports np
            WHERE np.itemtype = 'Computer' AND np.is_deleted = 0
        `);

        // Fetch IP addresses linked to network ports
        const [ipRows] = await mysqlDb.execute(`
            SELECT nn.items_id as networkport_id, ia.name as ip_address
            FROM glpi_networknames nn
            JOIN glpi_ipaddresses ia ON nn.items_id = ia.id
            WHERE nn.itemtype = 'NetworkPort'
        `);

        // Fetch CPU information
        const [cpuRows] = await mysqlDb.execute(`
            SELECT idp.items_id as computer_id, d.designation as cpu_name
            FROM glpi_items_deviceprocessors idp
            JOIN glpi_deviceprocessors d ON idp.deviceprocessors_id = d.id
            WHERE idp.itemtype = 'Computer' AND idp.is_deleted = 0
        `);

        // Fetch GPU information
        const [gpuRows] = await mysqlDb.execute(`
            SELECT idg.items_id as computer_id, d.designation as gpu_name
            FROM glpi_items_devicegraphiccards idg
            JOIN glpi_devicegraphiccards d ON idg.devicegraphiccards_id = d.id
            WHERE idg.itemtype = 'Computer' AND idg.is_deleted = 0
        `);

        // Fetch RAM information
        const [ramRows] = await mysqlDb.execute(`
            SELECT idm.items_id as computer_id, d.designation as ram_name
            FROM glpi_items_devicememories idm
            JOIN glpi_devicememories d ON idm.devicememories_id = d.id
            WHERE idm.itemtype = 'Computer' AND idm.is_deleted = 0
        `);

        // Fetch OS information
        const [osRows] = await mysqlDb.execute(`
            SELECT ios.items_id as computer_id, os.name as os_name, osv.name as os_version
            FROM glpi_items_operatingsystems ios
            JOIN glpi_operatingsystems os ON ios.operatingsystems_id = os.id
            LEFT JOIN glpi_operatingsystemversions osv ON ios.operatingsystemversions_id = osv.id
            WHERE ios.itemtype = 'Computer' AND ios.is_deleted = 0
        `);

        // Fetch Disk information
        const [diskRows] = await mysqlDb.execute(`
            SELECT idd.items_id as computer_id, dd.designation as disk_model, idd.capacity as capacity_mb
            FROM glpi_items_deviceharddrives idd
            JOIN glpi_deviceharddrives dd ON idd.deviceharddrives_id = dd.id
            WHERE idd.itemtype = 'Computer' AND idd.is_deleted = 0
        `);

        // Also get which computers have Ricoh driver installed
        const [ricohRows] = await mysqlDb.execute(`
            SELECT DISTINCT c.name
            FROM glpi_computers c
            JOIN glpi_items_softwareversions isv ON isv.items_id = c.id AND isv.itemtype = 'Computer'
            JOIN glpi_softwareversions sv ON isv.softwareversions_id = sv.id
            JOIN glpi_softwares s ON sv.softwares_id = s.id
            WHERE c.is_deleted = 0 AND s.name LIKE '%ricoh%'
        `);
        const ricohComputerNames = new Set(ricohRows.map(r => r.name));

        console.log(`[GLPI_SYNC] Found ${rows.length} computers, ${networkRows.length} network ports, ${ipRows.length} IP addresses, ${cpuRows.length} CPUs, ${gpuRows.length} GPUs, ${ramRows.length} RAM modules, ${diskRows.length} disks. Synchronizing to local SQLite/PostgreSQL...`);
        
        // Fetch all local assets into memory to check for MAC addresses efficiently
        const allLocalAssets = await db('assets').select('*');
        
        let newCount = 0;
        let updateCount = 0;

        for (const row of rows) {
            const serialNumber = row.serial || null;
            const inventoryNumber = row.inventory_number || null;
            const hasRicohDriver = ricohComputerNames.has(row.name);
            
            // Gather hardware specs for this computer
            const networkPorts = networkRows.filter(n => n.computer_id === row.id);
            const cpus = cpuRows.filter(c => c.computer_id === row.id);
            const gpus = gpuRows.filter(g => g.computer_id === row.id);
            const rams = ramRows.filter(r => r.computer_id === row.id);
            const disks = diskRows.filter(d => d.computer_id === row.id);
            const osList = osRows.filter(o => o.computer_id === row.id);

            // Build specs object
            const specs = {
                source: 'GLPI Import',
                has_ricoh_driver: hasRicohDriver,
                last_update_source: 'GLPI Database Sync'
            };
            
            // Add CPU info
            if (cpus.length > 0) {
                specs.cpu = cpus.map(c => c.cpu_name).join(', ');
            }
            
            // Add GPU info
            if (gpus.length > 0) {
                specs.gpu = gpus.map(g => g.gpu_name).join(', ');
            }
            
            // Add RAM info
            if (rams.length > 0) {
                specs.ram = rams.map(r => r.ram_name).join(', ');
            }
            
            // Add Storage info
            if (disks.length > 0) {
                specs.storage = disks.map(d => ({
                    model: d.disk_model,
                    capacity_mb: d.capacity_mb,
                    capacity_gb: d.capacity_mb ? Math.round(d.capacity_mb / 1024) : 0
                }));
                specs.storage_summary = disks.map(d => `${d.disk_model || 'HDD'} (${Math.round((d.capacity_mb || 0) / 1024)} GB)`).join(', ');
            }

            // Add OS info
            if (osList.length > 0) {
                specs.os = osList[0].os_name;
                specs.os_version = osList[0].os_version;
            }
            
            // Add Network info
            if (networkPorts.length > 0) {
                const macAddresses = networkPorts
                    .filter(n => n.mac)
                    .map(n => n.mac);
                
                // Get IP addresses for this computer's network ports
                const networkPortIds = networkPorts.map(n => n.computer_id);
                const computerIPs = ipRows.filter(ip => networkPortIds.includes(ip.networkport_id));
                const ipAddresses = computerIPs.map(ip => ip.ip_address);
                
                if (ipAddresses.length > 0) {
                    specs.ip = ipAddresses[0];
                    specs.ip_addresses = ipAddresses;
                }
                if (macAddresses.length > 0) {
                    specs.mac_addresses = macAddresses;
                }
            }
            
            // First, try to find by inventory_number or serial_number
            let existingAsset = null;
            
            if (inventoryNumber && inventoryNumber !== '-') {
                existingAsset = allLocalAssets.find(a => a.inventory_number === inventoryNumber);
            }
            
            if (!existingAsset && serialNumber && serialNumber !== '-') {
                existingAsset = allLocalAssets.find(a => a.serial_number === serialNumber);
            }

            if (!existingAsset && specs.mac_addresses && specs.mac_addresses.length > 0) {
                existingAsset = allLocalAssets.find(a => {
                    try {
                        const localSpecs = typeof a.specs === 'string' ? JSON.parse(a.specs) : (a.specs || {});
                        const localMacs = localSpecs.mac_addresses || [];
                        return specs.mac_addresses.some(m => localMacs.includes(m));
                    } catch (e) {
                        return false;
                    }
                });
            }

            if (!existingAsset) {
                existingAsset = allLocalAssets.find(a => a.name === row.name);
            }
            
            const typeNameStr = (row.type_name || '').toLowerCase();
            const compNameStr = (row.name || '').toLowerCase();
            
            let derivedType = 'Desktop';
            if (typeNameStr.includes('notebook') || typeNameStr.includes('laptop') || typeNameStr.includes('convertible') || compNameStr.includes('laptop')) {
                derivedType = 'Laptop';
            } else if (typeNameStr.includes('server') || compNameStr.includes('server') || typeNameStr.includes('qemu') || typeNameStr.includes('vm') || typeNameStr.includes('virtual')) {
                derivedType = 'Server';
            } else if (typeNameStr.includes('mobile') || typeNameStr.includes('phone') || typeNameStr.includes('infinix')) {
                derivedType = 'Mobile';
            }

            let employeeName = row.contact || '';
            if (row.user_realname || row.user_firstname) {
                employeeName = `${row.user_firstname || ''} ${row.user_realname || ''}`.trim();
            } else if (row.user_username) {
                employeeName = row.user_username;
            }

            // Merge GLPI specs with existing specs if they exist
            let finalSpecs = { ...specs };
            if (existingAsset && existingAsset.specs) {
                try {
                    const currentSpecs = typeof existingAsset.specs === 'string' ? JSON.parse(existingAsset.specs) : existingAsset.specs;
                    finalSpecs = {
                        ...currentSpecs, // Keep existing (software, RustDesk, agent_status, etc)
                        ...specs         // Overwrite with GLPI hardware updates
                    };
                } catch(e) {}
            }

            // Check if existing asset is managed by Agent
            const isManagedByAgent = existingAsset && (existingAsset.last_agent_sync != null || existingAsset.uuid != null || existingAsset.agent_status === 'Online' || (existingAsset.specs && existingAsset.specs.includes('agent_version')));

            const assetData = {};
            
            // Administrative fields from GLPI (Always Overwrite)
            assetData.inventory_number = inventoryNumber;
            assetData.location = row.location_name ? row.location_name.split(' > ').pop() : 'Office';
            assetData.contact = employeeName;
            assetData.status = row.status_name || 'Active';
            assetData.updated_at = row.last_update ? new Date(row.last_update) : new Date();

            if (!isManagedByAgent) {
                // If NOT managed by Agent, GLPI is the source of truth for Hardware fields too
                assetData.name = row.name || 'Unnamed Asset';
                assetData.serial_number = serialNumber;
                assetData.category = derivedType;
                assetData.type = derivedType;
                assetData.manufacturer = row.manufacturer_name || 'Unknown';
                assetData.model = row.model_name || 'Generic';
                assetData.agent_status = existingAsset ? existingAsset.agent_status : 'Offline';
                assetData.uuid = row.uuid || null;
                assetData.specs = JSON.stringify(finalSpecs);
            }

            if (existingAsset) {
                // Update
                await db('assets').where('id', existingAsset.id).update(assetData);
                updateCount++;
            } else {
                // Insert
                await db('assets').insert({
                    ...assetData,
                    created_at: new Date()
                });
                newCount++;
            }
        }

        console.log('[GLPI_SYNC] Syncing Users...');
        const [userRows] = await mysqlDb.execute(`
            SELECT u.id as glpi_id, u.name as login, u.realname as last_name, u.firstname as first_name, 
                   u.phone, u.mobile as cell_phone, u.is_active,
                   t.name as title, c.name as category, l.completename as location,
                   sup.realname as sup_last, sup.firstname as sup_first,
                   e.email
            FROM glpi_users u
            LEFT JOIN glpi_usertitles t ON u.usertitles_id = t.id
            LEFT JOIN glpi_usercategories c ON u.usercategories_id = c.id
            LEFT JOIN glpi_locations l ON u.locations_id = l.id
            LEFT JOIN glpi_users sup ON u.users_id_supervisor = sup.id
            LEFT JOIN glpi_useremails e ON e.users_id = u.id AND e.is_default = 1
            WHERE u.is_deleted = 0
        `);

        let userNewCount = 0;
        let userUpdateCount = 0;

        for (const u of userRows) {
            let existingUser = await db('users').where('glpi_id', u.glpi_id).first();
            if (!existingUser && u.email) {
                existingUser = await db('users').where('email', u.email).first();
            }
            if (!existingUser && u.login) {
                existingUser = await db('users').where('name', u.login).first();
            }

            const supName = (u.sup_first || u.sup_last) ? `${u.sup_first || ''} ${u.sup_last || ''}`.trim() : null;

            const userData = {
                name: u.login || '',
                first_name: u.first_name || '',
                last_name: u.last_name || '',
                email: u.email || '',
                title: u.title || '',
                category: u.category || '',
                location: u.location ? u.location.split(' > ').pop() : '',
                supervisor: supName,
                phone: u.phone || '',
                cell_phone: u.cell_phone || '',
                is_active: u.is_active === 1,
                glpi_id: u.glpi_id,
                updated_at: new Date()
            };

            if (existingUser) {
                await db('users').where('id', existingUser.id).update(userData);
                userUpdateCount++;
            } else {
                await db('users').insert({
                    ...userData,
                    role: 'user',
                    password: '',
                    created_at: new Date()
                });
                userNewCount++;
            }
        }

        await mysqlDb.end();
        res.json({ 
            success: true, 
            message: `Sinkronisasi selesai. Assets (Baru: ${newCount}, Update: ${updateCount}). Users (Baru: ${userNewCount}, Update: ${userUpdateCount}).`,
            stats: { new: newCount, updated: updateCount, total: rows.length, users_new: userNewCount, users_updated: userUpdateCount }
        });

    } catch (dbErr) {
        console.error('[GLPI_SYNC] MySQL Error:', dbErr);
        if (mysqlDb) try { await mysqlDb.end(); } catch(e){}
        res.status(500).json({ error: 'Failed to synchronize with GLPI MySQL Database: ' + dbErr.message });
    }
});



// GET /api/network/glpi/computer/:name
router.get('/computer/:name', async (req, res) => {
    const computerName = req.params.name;
    const config = {
        db: {
            host: '127.0.0.1',
            user: 'root',
            password: 'Nevergiveup572*',
            database: 'glpidb'
        }
    };

    let mysqlDb;
    try {
        mysqlDb = await mysql.createConnection(config.db);
        
        // Find computer
        const [computers] = await mysqlDb.execute(`
            SELECT id, name, uuid, serial, contact 
            FROM glpi_computers 
            WHERE is_deleted = 0 AND (name = ? OR uuid = ? OR serial = ? OR otherserial = ?)
            LIMIT 1
        `, [computerName, computerName, computerName, computerName]);

        if (computers.length === 0) {
            await mysqlDb.end();
            return res.json({ success: false, message: 'Computer not found in GLPI' });
        }

        const compId = computers[0].id;

        // Fetch Software
        const [software] = await mysqlDb.execute(`
            SELECT s.name as software_name, sv.name as version, s.is_update
            FROM glpi_items_softwareversions isv
            JOIN glpi_softwareversions sv ON isv.softwareversions_id = sv.id
            JOIN glpi_softwares s ON sv.softwares_id = s.id
            WHERE isv.items_id = ? AND isv.itemtype = 'Computer' AND isv.is_deleted = 0
            ORDER BY s.name ASC
        `, [compId]);

        // Fetch Volumes (Disks)
        const [disks] = await mysqlDb.execute(`
            SELECT name as drive, totalsize as total_mb, freesize as free_mb, filesystems_id
            FROM glpi_items_disks
            WHERE items_id = ? AND itemtype = 'Computer' AND is_deleted = 0
        `, [compId]);


        // Fetch CPU
        const [cpus] = await mysqlDb.execute(`
            SELECT d.designation as name, idp.frequency as speed
            FROM glpi_items_deviceprocessors idp
            JOIN glpi_deviceprocessors d ON idp.deviceprocessors_id = d.id
            WHERE idp.items_id = ? AND idp.itemtype = 'Computer' AND idp.is_deleted = 0
        `, [compId]);

        // Fetch RAM
        const [rams] = await mysqlDb.execute(`
            SELECT d.designation as type, idm.size as size_mb
            FROM glpi_items_devicememories idm
            JOIN glpi_devicememories d ON idm.devicememories_id = d.id
            WHERE idm.items_id = ? AND idm.itemtype = 'Computer' AND idm.is_deleted = 0
        `, [compId]);
        
        // Fetch Network Ports
        const [networks] = await mysqlDb.execute(`
            SELECT name, mac
            FROM glpi_networkports
            WHERE items_id = ? AND itemtype = 'Computer' AND is_deleted = 0
        `, [compId]);

        await mysqlDb.end();
        
        res.json({
            success: true,
            data: {
                computer: computers[0],
                software: software,
                volumes: disks,
                components: {
                    cpus: cpus,
                    rams: rams,
                    networks: networks
                }
            }
        });

    } catch (dbErr) {
        console.error('[GLPI_API] Error:', dbErr);
        if (mysqlDb) try { await mysqlDb.end(); } catch(e){}
        res.status(500).json({ success: false, error: dbErr.message });
    }
});

module.exports = router;

