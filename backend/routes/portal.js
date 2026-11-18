const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/portal/my-assets/:userId
router.get('/my-assets/:userId', async (req, res) => {
    try {
        const user = await db('users').where({ id: req.params.userId }).first();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const assets = await db('assets')
            .leftJoin('ricoh_device_quotas', function() {
                this.on('ricoh_device_quotas.asset_id', '=', 'assets.id')
                    .orOn('ricoh_device_quotas.computer_name', '=', 'assets.name');
            })
            .where(function() {
                this.where('assets.user_id', user.id);
                if (user.hr_employee_id) {
                    this.orWhere('assets.hr_employee_id', user.hr_employee_id);
                }
            })
            .select(
                'assets.*',
                'ricoh_device_quotas.id as ricoh_quota_id',
                'ricoh_device_quotas.monthly_quota_bw',
                'ricoh_device_quotas.current_usage_bw',
                'ricoh_device_quotas.monthly_quota_color',
                'ricoh_device_quotas.current_usage_color',
                'ricoh_device_quotas.monthly_quota_copier',
                'ricoh_device_quotas.monthly_quota_copier_bw',
                'ricoh_device_quotas.monthly_quota_copier_color',
                'ricoh_device_quotas.current_usage_copier_bw',
                'ricoh_device_quotas.current_usage_copier_color',
                'ricoh_device_quotas.user_code as ricoh_user_code',
                'ricoh_device_quotas.status as ricoh_status',
                'ricoh_device_quotas.copier_status as ricoh_copier_status',
                'ricoh_device_quotas.copier_bw_status as ricoh_copier_bw_status',
                'ricoh_device_quotas.copier_color_status as ricoh_copier_color_status'
            )
            .orderBy('assets.name', 'asc');

        // Fallback: If no assets mapped in assets table, check ricoh_device_quotas directly
        if (assets.length === 0) {
            const cleanUserName = (user.name || user.username || '').trim();
            if (cleanUserName) {
                const directQuotas = await db('ricoh_device_quotas')
                    .where('computer_name', 'ilike', `%${cleanUserName}%`)
                    .select('*');
                for (const r of directQuotas) {
                    assets.push({
                        id: r.asset_id || `ricoh-${r.id}`,
                        name: r.computer_name,
                        category: 'Laptop/PC',
                        type: 'PC',
                        ricoh_quota_id: r.id,
                        monthly_quota_bw: r.monthly_quota_bw,
                        current_usage_bw: r.current_usage_bw,
                        monthly_quota_color: r.monthly_quota_color,
                        current_usage_color: r.current_usage_color,
                        monthly_quota_copier: r.monthly_quota_copier,
                        monthly_quota_copier_bw: r.monthly_quota_copier_bw,
                        monthly_quota_copier_color: r.monthly_quota_copier_color,
                        current_usage_copier_bw: r.current_usage_copier_bw,
                        current_usage_copier_color: r.current_usage_copier_color,
                        ricoh_user_code: r.user_code,
                        ricoh_status: r.status,
                        ricoh_copier_status: r.copier_status,
                        ricoh_copier_bw_status: r.copier_bw_status,
                        ricoh_copier_color_status: r.copier_color_status
                    });
                }
            }
        }

        res.json(assets);
    } catch (err) {
        console.error('Error fetching user assets:', err);
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

// GET /api/portal/my-tickets/:userId
router.get('/my-tickets/:userId', async (req, res) => {
    try {
        const user = await db('users').where({ id: req.params.userId }).first();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const rows = await db('tickets')
            .where('user_id', user.id)
            .select(
                'id as internal_id',
                'number as id',
                'subject',
                'description',
                'category',
                'status',
                'created_at',
                'updated_at'
            )
            .orderBy('created_at', 'desc');

        res.json(rows);
    } catch (err) {
        console.error('Error fetching user tickets from local DB:', err);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// POST /api/portal/create-ticket
router.post('/create-ticket', async (req, res) => {
    try {
        const { target_dept, user_id, asset_id, subject, description, priority } = req.body;
        const user = await db('users').where({ id: user_id }).first();
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate sequential ticket number
        const org = req.organization || req.headers['x-organization'] || '';
        const isKG = org.toUpperCase().includes('KG');
        const ictPrefix = isKG ? 'ICT-TCFKG-03-' : 'ICT-TCFSG-03-';
        const prefix = target_dept === 'HRGA' ? 'HR-GA-03-' : ictPrefix;
        
        const rows = await db('tickets')
            .where('number', 'like', `${prefix}%`)
            .select('number');
            
        let maxNumber = 0;
        const regex = new RegExp(`^${prefix.replace(/-/g, '\\-')}(\\d+)$`);
        for (const r of rows) {
            if (!r.number) continue;
            if (r.number.includes('-IR-') || r.number.includes('-MR-') || r.number.includes('-R-')) continue;
            const match = r.number.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNumber) maxNumber = num;
            }
        }
        const ticketNumber = prefix + String(maxNumber + 1).padStart(5, '0');
        
        const category = target_dept === 'HRGA' ? 'Facility Issue' : 'Network Issue';

        await db('tickets').insert({
            number: ticketNumber,
            user_id: user.id,
            asset_id: asset_id || null,
            category: category,
            subject: subject,
            description: description,
            priority: priority || 'Normal',
            status: 'Diajukan',
            source: 'Web',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        // Try sending WA Notification to Admin
        try {
            const { sendNewTicketNotification } = require('../whatsapp_bot');
            const adminPhone = '6281234567890'; // Replace with actual admin config if needed
            sendNewTicketNotification(ticketNumber, user.name, category, subject).catch(e => console.error('[Tickets] WA notify error:', e));
        } catch(e) {
            console.error('[Tickets] Error calling sendNewTicketNotification:', e);
        }

        res.status(201).json({ id: ticketNumber, subject, status: 'New', created_at: new Date() });
    } catch (err) {
        console.error('Error creating ticket:', err);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

// GET /api/portal/my-approvals/:userId
router.get('/my-approvals/:userId', async (req, res) => {
    try {
        const user = await db('users').where('id', req.params.userId).first();
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Get all maintenance records and joined asset/user data
        const records = await db('maintenance_records')
            .join('assets', 'maintenance_records.asset_id', 'assets.id')
            .leftJoin('users as asset_user', 'assets.user_id', 'asset_user.id')
            .whereNotNull('maintenance_records.checksheet_data')
            .select(
                'maintenance_records.*',
                'assets.name as asset_name',
                'assets.category as asset_category',
                'assets.inventory_number',
                'asset_user.id as asset_user_id',
                'asset_user.department as asset_department',
                'asset_user.name as asset_user_name'
            )
            .orderBy('maintenance_records.created_at', 'desc');

        const pendingApprovals = [];

        for (const record of records) {
            let data = {};
            try {
                data = typeof record.checksheet_data === 'string' ? JSON.parse(record.checksheet_data) : record.checksheet_data;
            } catch (e) {
                continue;
            }

            // Scenario 1: Needs User Approval (I am the user of this asset)
            if (record.asset_user_id === user.id) {
                if (data.sign_technician && !data.sign_user) {
                    pendingApprovals.push({
                        ...record,
                        checksheet_data: data,
                        required_role: 'User'
                    });
                    continue; // Already added as user
                }
            }

            // Scenario 2: Needs Manager Approval (I am the manager of this asset's department)
            if ((user.role === 'admin' || user.role === 'manager' || user.department === 'IT') && record.asset_department === user.department) {
                if (data.sign_user && !data.sign_manager) {
                    pendingApprovals.push({
                        ...record,
                        checksheet_data: data,
                        required_role: 'Manager'
                    });
                }
            }
        }

        res.json(pendingApprovals);
    } catch (err) {
        console.error('Error fetching approvals:', err);
        res.status(500).json({ error: 'Failed to fetch approvals' });
    }
});

// GET /api/portal/public-assets-status - Minimal non-sensitive asset telemetry for Public Dashboard
router.get('/public-assets-status', async (req, res) => {
    try {
        const assets = await db('assets')
            .select('name', 'agent_status', 'ip_address', 'last_agent_sync')
            .orderBy('name', 'asc');
        res.json(assets);
    } catch (err) {
        console.error('Error fetching public asset status:', err);
        res.status(500).json({ error: 'Failed to fetch asset status' });
    }
});

module.exports = router;
