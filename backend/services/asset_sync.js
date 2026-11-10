/**
 * asset_sync.js
 * Centralized automatic synchronization service for Assets across:
 * 1. Fixed Asset Catalog & Fleet
 * 2. Ricoh Photocopy / Printing Quota Center (with automatic unique PIN generation)
 * 3. Maintenance Hub (Automatic schedule plan generation for current year)
 * 4. Infra Guard & Telemetry monitoring
 */

/**
 * Generate a unique 4-digit numeric PIN not currently in use in ricoh_device_quotas
 */
async function generateUniquePin(db) {
    try {
        const existingQuotas = await db('ricoh_device_quotas').whereNotNull('user_code').select('user_code');
        const usedCodes = new Set(existingQuotas.map(q => String(q.user_code || '').trim()));
        
        for (let attempts = 0; attempts < 1000; attempts++) {
            const pin = Math.floor(1000 + Math.random() * 9000).toString();
            if (!usedCodes.has(pin)) {
                return pin;
            }
        }
    } catch (e) {
        console.error('[PIN_GEN] Error checking existing codes:', e.message);
    }
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Map department / location string to ricoh_departments ID
 */
function resolveDepartmentId(deptStr, locStr, contactStr, nameStr, deptMap) {
    const clean = (val) => (val || '').toString().toLowerCase().trim();
    const d = clean(deptStr);
    const loc = clean(locStr);
    const contact = clean(contactStr);
    const name = clean(nameStr);

    // Priority 1: Official HR Department / Linked User Department (Highest Source of Truth)
    if (d && d !== 'general' && d !== 'nan' && d !== 'departemen') {
        if (d.includes('market') || d.includes('sales')) return deptMap['marketing'] || 1;
        if (d.includes('hr') || d.includes('ga') || d.includes('hrd')) return deptMap['hrga'] || 2;
        if (d.includes('qmr')) return deptMap['qmr'] || 3;
        if (d.includes('purchas') || d.includes('procure') || d.includes('store')) return deptMap['purchasing'] || 4;
        if (d.includes('production engineering') || d.includes('pe')) return deptMap['engineering pe'] || 5;
        if (d.includes('r&d') || d.includes('rnd') || d.includes('research')) return deptMap['engineering r&d'] || 6;
        if (d.includes('tool') || d.includes('tstm') || d.includes('mold')) return deptMap['engineering tstm'] || 7;
        if (d.includes('maint') || d.includes('mtc')) return deptMap['maintenance'] || 8;
        if (d.includes('qc') || d.includes('quality') || d.includes('cmm')) return deptMap['qc'] || 9;
        if (d.includes('ict') || d.includes('it') || d.includes('edp')) return deptMap['ict'] || 10;
        if (d.includes('ppic')) return deptMap['ppic'] || 11;
        if (d.includes('prod') || d.includes('manufactur') || d.includes('shopfloor') || d.includes('fa')) return deptMap['produksi'] || 12;
    }

    // Priority 2: Contact / PIC Identity clues
    const personStr = `${contact} ${name}`.toLowerCase();
    if (personStr.includes('pe febry') || personStr.includes('febry')) return deptMap['engineering pe'] || 5;
    if (personStr.includes('recka') || personStr.includes('dian oktarika') || personStr.includes('jajang saep') || personStr.includes('naufal rifqi')) return deptMap['hrga'] || 2;
    if (personStr.includes('ppic') || personStr.includes('deli0098') || personStr.includes('khalda') || personStr.includes('awik') || personStr.includes('saiko') || personStr.includes('indra gunawan')) return deptMap['ppic'] || 11;
    if (personStr.includes('purnomo') || personStr.includes('amirullah') || personStr.includes('suprayitno')) return deptMap['maintenance'] || 8;
    if (personStr.includes('sumartono') || personStr.includes('cmm') || personStr.includes('ihwani') || personStr.includes('agung premana') || personStr.includes('taufik')) return deptMap['qc'] || 9;
    if (personStr.includes('yordan')) return deptMap['engineering pe'] || 5;
    if (personStr.includes('putra rian') || personStr.includes('sutijo') || personStr.includes('feri cipto') || personStr.includes('eko susanto') || personStr.includes('vikri')) return deptMap['produksi'] || 12;
    if (personStr.includes('tasya') || personStr.includes('sindi') || personStr.includes('felix') || personStr.includes('dhani') || personStr.includes('market')) return deptMap['marketing'] || 1;
    if (personStr.includes('tika wullan') || personStr.includes('qmr')) return deptMap['qmr'] || 3;
    if (personStr.includes('nurul aeni') || personStr.includes('karin aprilda') || personStr.includes('purchas') || personStr.includes('pur')) return deptMap['purchasing'] || 4;

    // Priority 3: Asset Location
    if (loc && loc !== 'general' && loc !== 'office' && loc !== 'unknown' && loc !== 'tcf-sg') {
        if (loc.includes('market') || loc.includes('sales')) return deptMap['marketing'] || 1;
        if (loc.includes('hr') || loc.includes('ga') || loc.includes('hrd')) return deptMap['hrga'] || 2;
        if (loc.includes('qmr')) return deptMap['qmr'] || 3;
        if (loc.includes('purchas') || loc.includes('procure') || loc.includes('store')) return deptMap['purchasing'] || 4;
        if (loc.includes('production engineering') || loc.includes('pe')) return deptMap['engineering pe'] || 5;
        if (loc.includes('r&d') || loc.includes('rnd') || loc.includes('research')) return deptMap['engineering r&d'] || 6;
        if (loc.includes('tool') || loc.includes('tstm') || loc.includes('mold')) return deptMap['engineering tstm'] || 7;
        if (loc.includes('maint') || loc.includes('mtc')) return deptMap['maintenance'] || 8;
        if (loc.includes('qc') || loc.includes('quality') || loc.includes('cmm')) return deptMap['qc'] || 9;
        if (loc.includes('ict') || loc.includes('it') || loc.includes('edp')) return deptMap['ict'] || 10;
        if (loc.includes('ppic')) return deptMap['ppic'] || 11;
        if (loc.includes('prod') || loc.includes('manufactur') || loc.includes('shopfloor') || loc.includes('fa')) return deptMap['produksi'] || 12;
    }

    // Priority 4: Device Hostname prefix
    if (name.startsWith('ppic') || name.includes('-ppic')) return deptMap['ppic'] || 11;
    if (name.startsWith('mkt') || name.includes('-mkt')) return deptMap['marketing'] || 1;
    if (name.startsWith('pur') || name.includes('-pur')) return deptMap['purchasing'] || 4;
    if (name.startsWith('mtc') || name.includes('-mtc')) return deptMap['maintenance'] || 8;
    if (name.startsWith('qc') || name.includes('-qc') || name.includes('cmm')) return deptMap['qc'] || 9;
    if (name.includes('prod')) return deptMap['produksi'] || 12;
    if (name.startsWith('design') || name.startsWith('eng')) return deptMap['engineering tstm'] || 7;

    // Genuine ICT machines
    if (personStr.includes('fahrurodin') || personStr.includes('mulyana') || personStr.includes('roni sugiarto') || personStr.includes('tcfsg administrator') || name.includes('desktop-4o314l4') || name.includes('desktop-d8168qd') || name.includes('desktop-e7412uc') || name.includes('pc-pc rakitan') || name.includes('desktop-tq8i4r5') || name.includes('ict-67543')) {
        return deptMap['ict'] || 10;
    }

    return deptMap['produksi'] || 12;
}

/**
 * Fully synchronizes an asset across all subsystems
 * @param {Object} asset - Asset record from DB
 * @param {Function} db - Knex database connection instance for the current plant
 */
async function syncAssetEverywhere(asset, db) {
    if (!asset || !asset.id) return;

    try {
        // 1. NORMALIZE TYPE & CATEGORY
        let category = asset.category;
        let type = asset.type;

        if (!type || type.trim() === '') {
            const catLower = String(category || '').toLowerCase();
            if (['desktop', 'pc'].includes(catLower)) type = 'Desktop';
            else if (['laptop', 'notebook'].includes(catLower)) type = 'Laptop';
            else if (catLower.includes('printer')) type = 'Printer';
            else if (catLower.includes('monitor')) type = 'Monitor';
            else if (catLower.includes('server')) type = 'Server';
            else if (catLower.includes('cctv')) type = 'CCTV';
            else if (['phone', 'mobile'].includes(catLower)) type = 'Mobile';
            else type = category || 'Computer';

            await db('assets').where('id', asset.id).update({ type });
            asset.type = type;
        }

        if (!category || category.trim() === '') {
            category = type || 'Computer';
            await db('assets').where('id', asset.id).update({ category });
            asset.category = category;
        }

        // 2. RICOH PHOTOCOPY & PRINTING QUOTA SYNC (WITH AUTO PIN)
        const isComputer = ['Desktop', 'Laptop', 'Computer', 'Notebook'].some(c => 
            String(asset.category || '').toLowerCase().includes(c.toLowerCase()) || 
            String(asset.type || '').toLowerCase().includes(c.toLowerCase())
        );

        if (isComputer && asset.name && asset.name.trim() !== '') {
            try {
                // Fetch Ricoh departments map
                const ricohDepts = await db('ricoh_departments').select('id', 'name').catch(() => []);
                const deptMap = {};
                for (const d of ricohDepts) {
                    if (d.name) deptMap[d.name.toLowerCase().trim()] = d.id;
                }

                // Resolve user department & PIC Name
                let userDept = '';
                let picName = '';
                if (asset.hr_employee_id) {
                    const hr = await db('hr_employees').where('id', asset.hr_employee_id).first().catch(() => null);
                    if (hr && hr.department) userDept = hr.department;
                    if (hr && hr.name) picName = hr.name;
                }
                if (!userDept && asset.user_id) {
                    const u = await db('users').where('id', asset.user_id).first().catch(() => null);
                    if (u && u.department) userDept = u.department;
                    if (u && u.name) picName = u.name;
                }
                if (!userDept && asset.location) userDept = asset.location;

                const resolvedDeptId = resolveDepartmentId(userDept, asset.location, `${asset.contact || ''} ${picName}`, asset.name, deptMap);

                // Check existing quota entry
                const existingQuota = await db('ricoh_device_quotas').where('computer_name', asset.name).first();

                let pin = existingQuota?.user_code;
                if (!pin || pin.trim() === '') {
                    pin = await generateUniquePin(db);
                }

                if (!existingQuota) {
                    await db('ricoh_device_quotas').insert({
                        computer_name: asset.name,
                        ip_address: asset.ip_address || '',
                        monthly_quota: 1500,
                        current_usage: 0,
                        monthly_quota_bw: 1000,
                        current_usage_bw: 0,
                        monthly_quota_color: 500,
                        current_usage_color: 0,
                        current_usage_copier_bw: 0,
                        current_usage_copier_color: 0,
                        lifetime_bw: 0,
                        lifetime_color: 0,
                        lifetime_copier_bw: 0,
                        lifetime_copier_color: 0,
                        monthly_quota_copier: 200,
                        copier_status: 'active',
                        user_code: pin,
                        status: 'active',
                        asset_id: asset.id,
                        department_id: resolvedDeptId,
                        last_reset: new Date()
                    });
                    console.log(`[SYNC] Created Ricoh quota for ${asset.name} with auto-PIN: ${pin}`);
                } else {
                    const updatePayload = {
                        asset_id: asset.id,
                        ip_address: asset.ip_address || existingQuota.ip_address || ''
                    };
                    if (!existingQuota.user_code || existingQuota.user_code.trim() === '') {
                        updatePayload.user_code = pin;
                        console.log(`[SYNC] Auto-generated PIN for existing ${asset.name}: ${pin}`);
                    }
                    // Permanent lock: only assign department if existing quota does not have one yet
                    if (!existingQuota.department_id && resolvedDeptId) {
                        updatePayload.department_id = resolvedDeptId;
                    }
                    await db('ricoh_device_quotas').where('id', existingQuota.id).update(updatePayload);
                }
            } catch (quotaErr) {
                console.error('[SYNC] Ricoh quota sync error:', quotaErr.message);
            }
        }

        // 3. MAINTENANCE HUB PLAN SYNC
        const isMaintenanceEligible = String(asset.category || '').toLowerCase() !== 'monitor';
        if (isMaintenanceEligible) {
            try {
                const currentYear = new Date().getFullYear();
                const existingPlans = await db('maintenance_plans')
                    .where({ asset_id: asset.id, year: currentYear, maintenance_type: 'Semester' })
                    .select('semester');

                const hasSem1 = existingPlans.some(p => p.semester === 1);
                const hasSem2 = existingPlans.some(p => p.semester === 2);

                if (!hasSem1 || !hasSem2) {
                    const allAssets = await db('assets').select('id').orderBy('id');
                    const assetIndex = allAssets.findIndex(a => a.id === asset.id);
                    const targetWeek = (assetIndex >= 0 ? assetIndex : asset.id) % 24;
                    const monthIdx = Math.floor(targetWeek / 4) + 1; // 1-6
                    const weekIdx = (targetWeek % 4) + 1; // 1-4
                    const keySem1 = `${monthIdx}_${weekIdx}`;
                    const keySem2 = `${monthIdx + 6}_${weekIdx}`;

                    if (!hasSem1) {
                        await db('maintenance_plans').insert({
                            asset_id: asset.id,
                            year: currentYear,
                            semester: 1,
                            maintenance_type: 'Semester',
                            planning_data: JSON.stringify({ [keySem1]: true }),
                            actual_data: JSON.stringify({}),
                            created_at: new Date(),
                            updated_at: new Date()
                        });
                    }

                    if (!hasSem2) {
                        await db('maintenance_plans').insert({
                            asset_id: asset.id,
                            year: currentYear,
                            semester: 2,
                            maintenance_type: 'Semester',
                            planning_data: JSON.stringify({ [keySem2]: true }),
                            actual_data: JSON.stringify({}),
                            created_at: new Date(),
                            updated_at: new Date()
                        });
                    }
                    console.log(`[SYNC] Maintenance plans auto-generated for ${asset.name}`);
                }
            } catch (maintErr) {
                console.error('[SYNC] Maintenance plan sync error:', maintErr.message);
            }
        }

        // 4. UNIFIED INFRAGUARD AGENTS TABLE & WAZUH SECURITY CORRELATION
        if (isComputer && asset.name) {
            try {
                let parsedSpecs = {};
                try {
                    parsedSpecs = typeof asset.specs === 'object' ? (asset.specs || {}) : JSON.parse(asset.specs || '{}');
                } catch (e) {}

                const uniqueMacOrId = (asset.uuid && asset.uuid.trim() !== '') ? asset.uuid.trim() : `mac-${asset.id}`;
                const osStr = parsedSpecs.os || 'Windows 10/11 Pro';
                const userStr = (asset.contact && asset.contact.trim() !== '') ? asset.contact.trim() : (asset.windows_login || 'User');

                await db.raw(`
                    INSERT INTO agents (id, hostname, ip_address, mac_address, os_info, username, cpu_usage, ram_usage, disk_usage, last_seen, status, version)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (mac_address) DO UPDATE SET
                        hostname = EXCLUDED.hostname,
                        ip_address = EXCLUDED.ip_address,
                        os_info = EXCLUDED.os_info,
                        username = EXCLUDED.username,
                        cpu_usage = EXCLUDED.cpu_usage,
                        ram_usage = EXCLUDED.ram_usage,
                        disk_usage = EXCLUDED.disk_usage,
                        last_seen = EXCLUDED.last_seen,
                        status = EXCLUDED.status,
                        version = EXCLUDED.version
                `, [
                    uniqueMacOrId,
                    asset.name,
                    asset.ip_address || '0.0.0.0',
                    uniqueMacOrId,
                    osStr,
                    userStr,
                    Number(asset.cpu_usage || 0),
                    Number(asset.ram_usage || 0),
                    Number(asset.disk_usage || 0),
                    asset.last_agent_sync || new Date(),
                    asset.agent_status || 'Online',
                    'v30.0'
                ]);

                // Correlate with Wazuh high-severity alerts in the unified database
                const wazuhRes = await db.raw(`
                    SELECT COUNT(*)::int AS cnt
                    FROM security_alert_wazuh
                    WHERE (UPPER(agent_name) LIKE UPPER(?) OR agent_ip = ?)
                      AND rule_level >= 7
                      AND status != 'Resolved'
                `, [`%${asset.name}%`, asset.ip_address || '']).catch(() => null);

                const activeWazuhThreats = wazuhRes?.rows?.[0]?.cnt || 0;
                if (activeWazuhThreats > 0 && Number(asset.threats_found || 0) < activeWazuhThreats) {
                    await db('assets').where('id', asset.id).update({
                        threats_found: activeWazuhThreats,
                        antivirus_status: 'Warning (Wazuh Alert)'
                    });
                }
            } catch (igSyncErr) {
                console.error('[SYNC] InfraGuard unified table sync error:', igSyncErr.message);
            }
        }

    } catch (err) {
        console.error(`[SYNC] Overall sync error for asset ${asset?.id}:`, err.message);
    }
}

/**
 * Ensures all assets in the active database have complete synchronization across
 * Ricoh (auto-PINs) and Maintenance Hub (schedule plans).
 */
async function syncAllPlantAssets(db) {
    try {
        const assets = await db('assets').select('*');
        for (const asset of assets) {
            await syncAssetEverywhere(asset, db);
        }
    } catch (err) {
        console.error('[SYNC] syncAllPlantAssets error:', err.message);
    }
}

module.exports = {
    generateUniquePin,
    resolveDepartmentId,
    syncAssetEverywhere,
    syncAllPlantAssets
};
