const express = require('express');
const router = express.Router();
const db = require('../db');
const { syncAssetEverywhere } = require('../services/asset_sync');

// GET /api/assets - List all assets
router.get('/', async (req, res) => {
    try {
        const assets = await db('assets')
            .leftJoin('users', 'assets.user_id', 'users.id')
            .leftJoin('hr_employees as hr1', 'users.hr_employee_id', 'hr1.id')
            .leftJoin('hr_employees as hr2', 'assets.hr_employee_id', 'hr2.id')
            .select(
                'assets.*',
                db.raw('COALESCE(hr2.name, hr1.name, users.name) as user_name'),
                db.raw('COALESCE(hr2.department, hr1.department, users.department) as user_department'),
                db.raw("COALESCE(NULLIF(assets.type, ''), assets.category) as type"),
                db.raw("COALESCE(NULLIF(assets.category, ''), assets.type) as category")
            )
            .orderBy('assets.id', 'desc');
        res.json(assets);
    } catch (err) {
        console.error('Error fetching assets:', err);
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

// ==========================================
// ASSET UPGRADE REQUESTS
// ==========================================

// GET /api/assets/upgrades - List all upgrade requests
router.get('/upgrades', async (req, res) => {
    try {
        const upgrades = await db('asset_upgrade_requests')
            .leftJoin('assets', 'asset_upgrade_requests.asset_id', 'assets.id')
            .select(
                'asset_upgrade_requests.*',
                'assets.name as asset_name',
                'assets.inventory_number as asset_inventory_number'
            )
            .orderBy('asset_upgrade_requests.created_at', 'desc');
        res.json(upgrades);
    } catch (err) {
        console.error('Error fetching upgrade requests:', err);
        res.status(500).json({ error: 'Failed to fetch upgrade requests' });
    }
});

// GET /api/assets/upgrades/:id - Get single upgrade request
router.get('/upgrades/:id', async (req, res) => {
    try {
        const upgrade = await db('asset_upgrade_requests')
            .leftJoin('assets', 'asset_upgrade_requests.asset_id', 'assets.id')
            .select(
                'asset_upgrade_requests.*',
                'assets.name as asset_name',
                'assets.inventory_number as asset_inventory_number'
            )
            .where('asset_upgrade_requests.id', req.params.id)
            .first();

        if (!upgrade) {
            return res.status(404).json({ error: 'Upgrade request not found' });
        }
        res.json(upgrade);
    } catch (err) {
        console.error('Error fetching upgrade request:', err);
        res.status(500).json({ error: 'Failed to fetch upgrade request' });
    }
});

// POST /api/assets/upgrades - Create new upgrade request
router.post('/upgrades', async (req, res) => {
    try {
        const { 
            asset_id, inventory_number, user_name, department, job_title, manager_name, 
            current_specs, purchase_year, justification, requested_specs, priority, technician_notes, estimated_cost, existingTicket 
        } = req.body;

        // Verify valid asset_id against assets table to prevent foreign key errors
        let validAssetId = null;
        if (asset_id) {
            const parsedId = parseInt(asset_id, 10);
            if (!isNaN(parsedId)) {
                const found = await db('assets').where({ id: parsedId }).first();
                if (found) validAssetId = found.id;
            }
        }
        if (!validAssetId && inventory_number) {
            const foundByInv = await db('assets').where({ inventory_number }).first();
            if (foundByInv) validAssetId = foundByInv.id;
        }

        const pYear = purchase_year ? (parseInt(purchase_year, 10) || null) : null;
        let cost = 0;
        if (estimated_cost) {
            const num = parseInt(String(estimated_cost).replace(/\D/g, ''), 10);
            if (!isNaN(num)) cost = num;
        }

        const finalJustification = justification?.trim() || 'Permintaan Upgrade / Perbaikan Perangkat';
        const finalRequestedSpecs = requested_specs?.trim() || justification?.trim() || 'Perbaikan / Upgrade Hardware';

        const [insertedRow] = await db('asset_upgrade_requests').insert({
            asset_id: validAssetId,
            user_name: user_name || 'Staff',
            department: department || 'General',
            job_title: job_title || 'Staff',
            manager_name: manager_name || null,
            current_specs: current_specs || null,
            purchase_year: pYear,
            justification: finalJustification,
            requested_specs: finalRequestedSpecs,
            priority: priority || 'Normal',
            estimated_cost: cost,
            status: 'Pending Manager',
            created_at: new Date(),
            updated_at: new Date()
        }).returning('*');

        const newRequestId = insertedRow?.id || insertedRow;

        // Handle ticket number
        let finalTicketNum = existingTicket ? String(existingTicket).trim() : '';

        if (!finalTicketNum) {
            const assetObj = validAssetId ? await db('assets').where({ id: validAssetId }).first() : null;
            const assetName = assetObj ? (assetObj.inventory_number || assetObj.name || `Asset #${validAssetId}`) : (inventory_number || 'Perangkat');
            const assetOrg = assetObj?.organization === 'TCF-KG' ? 'TCF-KG' : 'TCF-SG';
            const plantCode = assetOrg === 'TCF-KG' ? 'TCFKG' : 'TCFSG';
            const now = new Date();
            const ymd = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
            const prefix = `ICT-${plantCode}-UPG-${ymd}-`;
            
            const rows = await db('tickets').where('number', 'like', `${prefix}%`).select('number');
            let maxSeq = 0;
            const regex = new RegExp(`^${prefix}(\\d+)$`);
            for (const r of rows) {
                if (!r.number) continue;
                const match = r.number.match(regex);
                if (match) {
                    const s = parseInt(match[1], 10);
                    if (s > maxSeq) maxSeq = s;
                }
            }
            finalTicketNum = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
    
            await db('tickets').insert({
                number: finalTicketNum,
                subject: `Permintaan Upgrade: ${assetName}`,
                description: `**Alasan:**\n${finalJustification}\n\n**Spesifikasi yang diminta:**\n${finalRequestedSpecs}`,
                category: 'Hardware',
                status: 'Diajukan',
                priority: priority || 'Normal',
                source: 'Web',
                asset_id: validAssetId,
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        const newRequest = await db('asset_upgrade_requests').where({ id: newRequestId }).first();
        res.status(201).json({ ...newRequest, ticketNumber: finalTicketNum });
    } catch (err) {
        console.error('Error creating upgrade request:', err);
        res.status(500).json({ error: err.message || 'Failed to create upgrade request' });
    }
});

// PUT /api/assets/upgrades/:id - Update upgrade request (Approvals)
router.put('/upgrades/:id', async (req, res) => {
    try {
        const updateData = { ...req.body, updated_at: new Date() };
        await db('asset_upgrade_requests').where({ id: req.params.id }).update(updateData);
        const updatedRequest = await db('asset_upgrade_requests').where({ id: req.params.id }).first();
        res.json(updatedRequest);
    } catch (err) {
        console.error('Error updating upgrade request:', err);
        res.status(500).json({ error: 'Failed to update upgrade request' });
    }
});

// ==========================================
// ASSETS CRUD
// ==========================================

// GET /api/assets/:id - Get single asset with user details
router.get('/:id', async (req, res) => {
    try {
        const asset = await db('assets')
            .leftJoin('users', 'assets.user_id', 'users.id')
            .leftJoin('hr_employees as hr1', 'users.hr_employee_id', 'hr1.id')
            .leftJoin('hr_employees as hr2', 'assets.hr_employee_id', 'hr2.id')
            .select(
                'assets.*',
                db.raw('COALESCE(assets.hr_employee_id, users.hr_employee_id) as hr_employee_id'),
                db.raw('COALESCE(hr2.name, hr1.name, users.name) as user_name'),
                db.raw('COALESCE(hr2.department, hr1.department, users.department) as user_department'),
                'users.email as user_email'
            )
            .where('assets.id', req.params.id)
            .first();

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        res.json(asset);
    } catch (err) {
        console.error('Error fetching asset:', err);
        res.status(500).json({ error: 'Failed to fetch asset' });
    }
});

// POST /api/assets - Create asset
router.post('/', async (req, res) => {
    try {
        const { name, serial_number, inventory_number, location, status, category, contact, manufacturer, model, specs, user_id, hr_employee_id, purchase_date } = req.body;
        
        let parsedDate = null;
        if (purchase_date && purchase_date.trim() !== '') {
            parsedDate = purchase_date;
        }

        // Determine if it already exists by name or serial_number
        let existingAsset = null;
        if (serial_number) existingAsset = await db('assets').where('serial_number', serial_number).first();
        if (!existingAsset && name) existingAsset = await db('assets').where('name', name).first();

        let newAssetId;
        if (existingAsset) {
            await db('assets').where({ id: existingAsset.id }).update({
                inventory_number, location, status, category, contact, manufacturer, model,
                specs: specs ? JSON.stringify(specs) : null,
                user_id: user_id || null, hr_employee_id: hr_employee_id || null,
                purchase_date: parsedDate, updated_at: new Date()
            });
            newAssetId = existingAsset.id;
        } else {
            const [id] = await db('assets').insert({
                name, serial_number, inventory_number, location,
                status: status || 'Active', category: category || 'Computer',
                contact, manufacturer, model,
                specs: specs ? JSON.stringify(specs) : null,
                user_id: user_id || null, hr_employee_id: hr_employee_id || null,
                purchase_date: parsedDate, created_at: new Date(), updated_at: new Date()
            });
            newAssetId = id;
        }
        const newAsset = await db('assets').where({ id: newAssetId }).first();

        // Centralized auto-sync across Ricoh (with auto PIN), Maintenance Hub, and monitoring
        if (newAsset) {
            await syncAssetEverywhere(newAsset, db);
        }

        res.status(201).json(newAsset);
    } catch (err) {
        console.error('Error creating asset:', err);
        res.status(500).json({ error: 'Failed to create asset' });
    }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', async (req, res) => {
    try {
        const { name, serial_number, inventory_number, location, status, category, type, contact, manufacturer, model, specs, user_id, hr_employee_id, purchase_date } = req.body;
        
        let parsedDate = null;
        if (purchase_date && purchase_date.trim() !== '') {
            parsedDate = purchase_date;
        }

        let resolvedUserId = user_id || null;
        let resolvedHrEmployeeId = hr_employee_id ? parseInt(hr_employee_id, 10) : null;
        if (isNaN(resolvedHrEmployeeId)) resolvedHrEmployeeId = null;

        if (resolvedHrEmployeeId) {
            const matchingUser = await db('users').where('hr_employee_id', resolvedHrEmployeeId).first();
            if (matchingUser) {
                resolvedUserId = matchingUser.id;
            }
        } else if (resolvedUserId) {
            const matchingUser = await db('users').where('id', resolvedUserId).first();
            if (matchingUser && matchingUser.hr_employee_id) {
                resolvedHrEmployeeId = matchingUser.hr_employee_id;
            }
        }

        const updatePayload = {
            name,
            serial_number,
            inventory_number,
            location,
            status,
            category: category || type,
            type: type || category,
            contact,
            manufacturer,
            model,
            user_id: resolvedUserId,
            hr_employee_id: resolvedHrEmployeeId,
            purchase_date: parsedDate,
            updated_at: new Date()
        };
        if (specs !== undefined) {
            updatePayload.specs = specs ? JSON.stringify(specs) : null;
        }

        await db('assets').where({ id: req.params.id }).update(updatePayload);
        const updatedAsset = await db('assets').where({ id: req.params.id }).first();

        // Centralized auto-sync across Ricoh (with auto PIN), Maintenance Hub, and monitoring
        if (updatedAsset) {
            await syncAssetEverywhere(updatedAsset, db);
        }

        res.json(updatedAsset);
    } catch (err) {
        console.error('Error updating asset:', err);
        res.status(500).json({ error: 'Failed to update asset' });
    }
});

// DELETE /api/assets/:id - Delete asset
router.delete('/:id', async (req, res) => {
    try {
        const assetToDelete = await db('assets').where({ id: req.params.id }).first();
        if (assetToDelete) {
            try {
                // If device is deleted from Asset Management, also clean up from Ricoh quotas and maintenance plans
                await db('ricoh_device_quotas')
                    .where('asset_id', assetToDelete.id)
                    .orWhere('computer_name', assetToDelete.name)
                    .del();
                await db('maintenance_plans').where('asset_id', assetToDelete.id).del();
            } catch (cleanupErr) {
                console.error('Failed to cleanup linked records for deleted asset:', cleanupErr);
            }
        }

        await db('assets').where({ id: req.params.id }).del();
        res.json({ message: 'Asset deleted successfully' });
    } catch (err) {
        console.error('Error deleting asset:', err);
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});


// GET /api/network/assets/:id/tickets - Fetch tickets for an asset over the last 6 months
router.get('/:id/tickets', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');
        
        const asset = await db('assets').where('id', id).first();
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        
        // Fetch all tickets linked to this asset's user, or explicitly linked to this asset.
        let query = db('tickets')
            .leftJoin('ticket_responses', 'tickets.id', 'ticket_responses.ticket_id')
            .leftJoin('users', 'tickets.user_id', 'users.id')
            .where(builder => {
                builder.where('tickets.asset_id', id);
                if (asset.user_id) {
                    builder.orWhere('tickets.user_id', asset.user_id);
                }
            })
            .select(
                'tickets.id',
                'tickets.number',
                'tickets.subject',
                'tickets.description',
                'tickets.status',
                'tickets.priority',
                'tickets.created_at',
                'tickets.updated_at',
                'users.name as user_name',
                db.raw('GROUP_CONCAT(ticket_responses.message, " | ") as closing_notes')
            )
            .groupBy('tickets.id', 'users.name')
            .orderBy('tickets.created_at', 'desc');
            
        const tickets = await query;
        res.json(tickets);
    } catch (err) {
        console.error('Error fetching asset tickets:', err);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// GET /api/network/assets/:id/maintenance - Fetch maintenance records for an asset
router.get('/:id/maintenance', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');
        
        const records = await db('maintenance_records')
            .leftJoin('maintenance_plans', 'maintenance_records.plan_id', 'maintenance_plans.id')
            .where('maintenance_records.asset_id', id)
            .select(
                'maintenance_records.*',
                'maintenance_plans.name as plan_name',
                'maintenance_plans.type as plan_type'
            )
            .orderBy('maintenance_records.executed_at', 'desc');
            
        res.json(records);
    } catch (err) {
        console.error('Error fetching asset maintenance records:', err);
        res.status(500).json({ error: 'Failed to fetch maintenance records' });
    }
});

// GET /api/network/assets/:id/history - Fetch lifecycle, upgrade & drift history
router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');
        
        let assetId = parseInt(id, 10);
        if (isNaN(assetId)) {
            const matched = await db('assets').where('uuid', id).orWhere('name', id).first();
            if (matched) assetId = matched.id;
            else return res.json([]);
        }

        const history = await db('asset_history')
            .where('asset_id', assetId)
            .orderBy('created_at', 'desc');

        const formatted = history.map(h => ({
            id: h.id,
            asset_id: h.asset_id,
            action: h.action,
            details: h.details,
            diff_data: h.diff_data,
            performed_by: h.performed_by,
            created_at: h.created_at,
            timestamp: h.created_at,
            date: h.created_at,
            type: h.action,
            description: h.details,
            user: h.performed_by
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Error fetching asset history from assets route:', err);
        res.status(500).json({ error: 'Failed to fetch asset history' });
    }
});

// POST /api/network/assets/:id/history - Manually record maintenance / service event
router.post('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, details, performed_by } = req.body;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');

        let assetId = parseInt(id, 10);
        if (isNaN(assetId)) {
            const matched = await db('assets').where('uuid', id).orWhere('name', id).first();
            if (matched) assetId = matched.id;
            else return res.status(404).json({ error: 'Asset not found' });
        }

        const [newId] = await db('asset_history').insert({
            asset_id: assetId,
            action: action || 'Manual Service',
            details: details || '',
            performed_by: performed_by || req.user?.name || 'ICT Technician',
            created_at: new Date()
        }).returning('id');

        res.json({ success: true, id: newId });
    } catch (err) {
        console.error('Error adding manual asset history:', err);
        res.status(500).json({ error: 'Failed to record asset history' });
    }
});

// GET /api/network/assets/:id/security-alerts - Fetch correlated Wazuh alerts for asset
router.get('/:id/security-alerts', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');

        let asset = null;
        if (!isNaN(Number(id))) {
            asset = await db('assets').where('id', Number(id)).first();
        }
        if (!asset) {
            asset = await db('assets').where('uuid', id).orWhere('name', id).first();
        }
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Query security_alerts from network_monitor_db
        let alerts = [];
        try {
            alerts = await db('security_alert_wazuh')
                .where(function() {
                    this.where('agent_name', asset.name)
                        .orWhere('agent_ip', asset.ip_address || '0.0.0.0')
                        .orWhere('agent_name', asset.asset_tag || '');
                })
                .orderBy('timestamp', 'desc')
                .limit(25);
        } catch (dbErr) {
            console.warn('[Assets Security Alerts] Query error:', dbErr.message);
        }

        res.json({
            asset_id: asset.id,
            asset_name: asset.name,
            threats_found: asset.threats_found || 0,
            antivirus_name: asset.antivirus_name || 'Windows Defender',
            antivirus_status: asset.antivirus_status || 'Active',
            last_scan_at: asset.last_scan_at,
            alerts: alerts
        });
    } catch (err) {
        console.error('Error fetching security alerts for asset:', err);
        res.status(500).json({ error: 'Failed to fetch security alerts' });
    }
});

// POST /api/network/assets/:id/clear-threats - Mark threats as resolved
router.post('/:id/clear-threats', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');

        let asset = null;
        if (!isNaN(Number(id))) {
            asset = await db('assets').where('id', Number(id)).first();
        }
        if (!asset) {
            asset = await db('assets').where('uuid', id).orWhere('name', id).first();
        }
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        await db('assets').where('id', asset.id).update({
            threats_found: 0,
            last_scan_at: new Date()
        });

        // Record history
        await db('asset_history').insert({
            asset_id: asset.id,
            action: 'Security Remediation',
            details: 'Status ancaman virus & alert keamanan direset (Dinyatakan Bersih / Aman oleh Teknisi)',
            performed_by: req.user?.name || 'ICT Security Administrator',
            created_at: new Date()
        }).catch(() => {});

        res.json({ success: true, message: 'Status ancaman berhasil direset (Aman).' });
    } catch (err) {
        console.error('Error clearing threats:', err);
        res.status(500).json({ error: 'Failed to clear threats' });
    }
});

// GET /api/network/assets/:id/health-score - Smart Health Score & Capex/Opex Lifecycle 2027
router.get('/:id/health-score', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');

        let asset = null;
        if (!isNaN(Number(id))) {
            asset = await db('assets').where('id', Number(id)).first();
        }
        if (!asset) {
            asset = await db('assets').where('uuid', id).orWhere('name', id).first();
        }
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        const budgetingRoute = require('./budgeting');
        const parsedSpecs = budgetingRoute.parseAssetSpecs ? budgetingRoute.parseAssetSpecs(asset) : {};
        const plant = (asset.inventory_number || '').toUpperCase().includes('TCFKG') ? 'KG' : 'SG';
        const assessment = budgetingRoute.evaluateAssetIK ? budgetingRoute.evaluateAssetIK(asset, parsedSpecs, plant) : { status: 'NORMAL' };

        // Calculate 0-100 score
        let score = 100;
        if (parsedSpecs.age >= 5) score -= 30;
        else if (parsedSpecs.age >= 4) score -= 15;

        if (parsedSpecs.ramGb < 8) score -= 25;
        else if (parsedSpecs.ramGb < 16 && (asset.user_department || '').toLowerCase().includes('eng')) score -= 20;

        if (!parsedSpecs.isSsd) score -= 20;

        const cpuLower = (parsedSpecs.cpu || '').toLowerCase();
        if (cpuLower.includes('celeron') || cpuLower.includes('pentium') || cpuLower.includes('i3-3') || cpuLower.includes('i3-4') || cpuLower.includes('i3-6')) {
            score -= 25;
        }

        if (score < 15) score = 15;
        if (score > 100) score = 100;

        let grade = 'A';
        let gradeLabel = 'Sangat Baik (Optimal)';
        if (score < 50) {
            grade = 'D';
            gradeLabel = 'Kritis (Perlu Peremajaan)';
        } else if (score < 70) {
            grade = 'C';
            gradeLabel = 'Cukup (Perlu Upgrade)';
        } else if (score < 85) {
            grade = 'B';
            gradeLabel = 'Baik (Preventive Maintenance)';
        }

        // Check if already in budget draft
        let isInBudget = false;
        let budgetEntry = null;
        try {
            const store = budgetingRoute.readStore ? budgetingRoute.readStore() : null;
            if (store && store.items_2027) {
                const found = store.items_2027.find(it => 
                    it.asset_id === asset.id || 
                    (it.notes && it.notes.includes(asset.inventory_number || 'xyz--none')) ||
                    (it.name && it.name.includes(asset.name || 'xyz--none'))
                );
                if (found) {
                    isInBudget = true;
                    budgetEntry = found;
                }
            }
        } catch (storeErr) {}

        res.json({
            asset_id: asset.id,
            asset_name: asset.name,
            inventory_number: asset.inventory_number,
            score,
            grade,
            grade_label: gradeLabel,
            specs: parsedSpecs,
            assessment,
            is_in_budget: isInBudget,
            budget_entry: budgetEntry
        });
    } catch (err) {
        console.error('Error calculating health score:', err);
        res.status(500).json({ error: 'Failed to calculate health score' });
    }
});

module.exports = router;


