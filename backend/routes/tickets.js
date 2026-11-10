const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads/requisitions');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

function isSystemTicket(t) {
    if (!t) return false;
    const num = String(t.number || t.id || '');
    const subj = String(t.subject || '');
    const desc = String(t.description || '');
    const src = String(t.source || '').toLowerCase();
    const cat = String(t.category || '').toLowerCase();
    
    if (num.includes('-IR-') || num.includes('-HW-') || num.startsWith('ICT-2026') || num.includes('IR-') || num.includes('HW-')) return true;
    if (subj.startsWith('[AUTO-ALERT]') || subj.startsWith('[AUTO-LOG]') || subj.toLowerCase().includes('uptime kuma') || subj.toLowerCase().includes('wireguard') || subj.toLowerCase().includes('hardware upgrade')) return true;
    if (desc.toLowerCase().startsWith('uptime kuma') || desc.toLowerCase().includes('wireguard mendeteksi') || desc.toLowerCase().includes('tcf agent mendeteksi')) return true;
    if (src === 'system' || src === 'monitoring' || cat === 'monitoring' || cat === 'hardware upgrade') return true;
    return false;
}

// GET /api/network/tickets - List all tickets from database
router.get('/', async (req, res) => {
    try {
        const { type } = req.query; // 'user' | 'system' | 'all'
        const limit = Number(req.query.limit) || 300;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');
        let query = db('tickets')
            .leftJoin('users', 'tickets.user_id', 'users.id')
            .leftJoin('assets as linked_asset', 'tickets.asset_id', 'linked_asset.id')
            .select(
                'tickets.id as internal_id',
                'tickets.number as id',
                'tickets.subject',
                'tickets.category',
                'tickets.description',
                'tickets.status',
                'tickets.priority',
                'tickets.source',
                'tickets.asset_id',
                'linked_asset.name as linked_asset_name',
                'tickets.user_id',
                'users.name as user_name',
                'users.department as user_department',
                'users.whatsapp as email',
                'tickets.created_at',
                'tickets.updated_at'
            )
            .orderBy('tickets.created_at', 'desc');

        if (req.query.asset_id) {
            query = query.where('tickets.asset_id', req.query.asset_id);
        }
        if (req.query.user_id) {
            query = query.where('tickets.user_id', req.query.user_id);
        }

        const rows = await query.limit(limit);

        const formattedTickets = await Promise.all(rows.map(async r => {
            let displaySubject = r.subject || 'No Subject';
            if (r.category && r.description) {
                displaySubject = `[${r.category}] - ${r.description}`;
            }
            
            let lastReplyDate = null;
            if (r.status === 'Closed') {
                const lastReply = await db('ticket_responses')
                    .where('ticket_id', r.internal_id)
                    .where('type', 'public')
                    .orderBy('created_at', 'desc')
                    .first();
                if (lastReply && lastReply.message) {
                    displaySubject += ` | Penyelesaian: ${lastReply.message.replace(/<[^>]*>?/gm, '')}`;
                    lastReplyDate = lastReply.created_at;
                }
            }

            if (displaySubject.length > 100) displaySubject = displaySubject.substring(0, 100) + '...';

            let finalAssetId = r.asset_id;
            let finalAssetName = r.linked_asset_name;

            // FALLBACK to user's assigned device if not linked explicitly (WhatsApp tickets)
            if (!finalAssetId && r.user_id) {
                const userAsset = await db('assets')
                    .where('user_id', r.user_id)
                    .orderBy('id', 'desc')
                    .first();
                if (userAsset) {
                    finalAssetId = userAsset.id;
                    finalAssetName = userAsset.name;
                }
            }

            const isSys = isSystemTicket(r);

            return {
                id: r.id,
                subject: displaySubject,
                raw_subject: r.subject,
                raw_description: r.description,
                category: r.category || (isSys ? 'Monitoring' : 'General'),
                priority: r.priority || 'Normal',
                source: r.source || (isSys ? 'System' : 'WhatsApp'),
                ticket_type: isSys ? 'system' : 'user',
                email: r.email,
                department: isSys ? 'System Monitor' : 'Infrastructure',
                status: r.status,
                user_name: isSys ? (r.user_name || 'System Auto-Alert') : (r.user_name || 'User'),
                asset_id: finalAssetId,
                asset_name: finalAssetName,
                created_at: r.created_at,
                updated_at: r.updated_at,
                last_reply_date: lastReplyDate
            };
        }));

        let filtered = formattedTickets;
        if (type === 'user') {
            filtered = formattedTickets.filter(t => t.ticket_type === 'user');
        } else if (type === 'system') {
            filtered = formattedTickets.filter(t => t.ticket_type === 'system');
        }

        return res.json(filtered);
    } catch (err) {
        console.error('Error fetching tickets:', err);
        res.status(500).json({ error: 'Failed to fetch tickets', details: err.message, stack: err.stack });
    }
});

// POST /api/network/tickets/upload-requisition - Upload PDF & Create Ticket
router.post('/upload-requisition', upload.single('document'), async (req, res) => {
    try {
        const { asset_id, user_id, description } = req.body;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');
        
        let fileUrl = '';
        if (req.file) {
            // Adjust the URL based on how you serve static files
            fileUrl = `/api/uploads/requisitions/${req.file.filename}`;
        }

        // Generate Ticket Number
        const countRes = await db('tickets').count('id as count').first();
        const ticketNum = `REQ-${new Date().getFullYear()}${(countRes.count + 1).toString().padStart(4, '0')}`;

        const ticketData = {
            number: ticketNum,
            subject: 'Permintaan Upgrade Perangkat',
            description: `Dokumen requisition telah diupload.\n\nCatatan:\n${description || '-'}\n\nFile: ${fileUrl}`,
            status: 'Diajukan',
            priority: 'Normal',
            source: 'Web',
            category: 'Hardware Request',
            asset_id: asset_id || null,
            user_id: user_id || null,
            created_at: new Date(),
            updated_at: new Date()
        };

        const [id] = await db('tickets').insert(ticketData).returning('id');

        res.json({ success: true, ticket_id: id, ticket_number: ticketNum, file_url: fileUrl });
    } catch (err) {
        console.error('Error creating requisition ticket:', err);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

// GET /api/network/tickets/:id/responses - Fetch thread entries
router.get('/:id/responses', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');
        const ticket = await db('tickets').where('number', id).first();
        if (!ticket) return res.json([]);
        
        const dbResponses = await db('ticket_responses')
            .leftJoin('users', 'ticket_responses.user_id', 'users.id')
            .where('ticket_responses.ticket_id', ticket.id)
            .select(
                'ticket_responses.id',
                'ticket_responses.message',
                'ticket_responses.type',
                'ticket_responses.created_at',
                'users.name as user_name',
                'users.role as user_role'
            );
            
        const formattedDbResponses = dbResponses.map(r => ({
            id: r.id,
            user_name: r.user_name || 'Agent',
            user_role: r.user_role || 'admin',
            message: r.message,
            type: r.type || 'public',
            created_at: r.created_at,
            source: 'web'
        }));

        return res.json(formattedDbResponses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    } catch (err) {
        console.error('Error fetching ticket responses:', err);
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

// POST /api/network/tickets/:id/responses - Insert into os_thread_entry
router.post('/:id/responses', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, message, type } = req.body;
        
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const db = req.db || require('../db').getDb(req.organization || 'TCF-SG');
        const ticket = await db('tickets').where('number', id).first();
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        const [insertId] = await db('ticket_responses').insert({
            ticket_id: ticket.id,
            user_id: user_id || null,
            message: message,
            type: type || 'public',
            created_at: db.fn.now()
        });

        // Trigger WhatsApp Notification
        try {
            const { sendTicketReplyNotification } = require('../whatsapp_bot');
            const targetUser = await db('users').where('id', ticket.user_id).first();
            if (targetUser && targetUser.whatsapp) {
                const authorName = req.user ? req.user.name : 'Admin';
                sendTicketReplyNotification(targetUser.whatsapp, id, message, authorName).catch(e => console.error('[Tickets] WA notify error:', e));
            }
        } catch(e) {
            console.error('[Tickets] Error calling sendTicketReplyNotification:', e);
        }

        res.json({ success: true, id: insertId });
    } catch (err) {
        console.error('Error adding response:', err);
        res.status(500).json({ error: 'Failed to add response' });
    }
});

// PUT /api/network/tickets/:id - Update ticket status
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Update local database
        try {
            await db('tickets').where({ number: id }).update({ 
                status: status,
                updated_at: new Date()
            });
            console.log(`[Tickets] Updated local database ticket ${id} to status: ${status}`);
        } catch (dbErr) {
            console.error('[Tickets] Error updating local database:', dbErr);
        }
        

        // Send WhatsApp Notification for Completed/Closed Tickets
        if (status === 'Closed' || status === 'Resolved' || status === 'Selesai') {
            try {
                const ticket = await db('tickets').where({ number: id }).first();
                if (ticket && ticket.user_id) {
                    const user = await db('users').where({ id: ticket.user_id }).first();
                    if (user && user.whatsapp) {
                        const axios = require('axios');
                        const waJid = user.whatsapp.replace(/\D/g, '') + '@s.whatsapp.net';
                        
                        let userNotificationMessage = `✅ *TICKET DITUTUP OLEH TEKNISI*\n\nTicket #${id} telah diselesaikan oleh teknisi.\n\nMasalah sudah selesai di atasi. Jika sudah selesai, jangan balas pesan ini.\nTapi jika masih bermasalah, silahkan kirim pesan untuk melaporkan kembali.`;
                        
                        await axios.post('http://127.0.0.1:5000/api/send-message', {
                            to: waJid,
                            message: userNotificationMessage,
                            ticketNumber: id,
                            shouldLog: true
                        });
                        console.log(`[Tickets] Sent closure notification to ${waJid} via central bot router`);
                    }
                }
            } catch (waErr) {
                console.error('[Tickets] Failed to send WA notification on close:', waErr.message);
            }
        }
        
        res.json({ id, status });
    } catch (err) {
        console.error('Error updating ticket status:', err);
        res.status(500).json({ error: 'Failed to update ticket status' });
    }
});

// GET /api/network/tickets/resolution-kpi?period=month
router.get('/resolution-kpi', async (req, res) => {
    try {
        const { organization, startDate, endDate, ticketType } = req.query;
        const db = req.db || require('../db').getDb(organization || 'TCF-SG');

        const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
        const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        let query = db('tickets')
            .where('created_at', '>=', start.toISOString())
            .where('created_at', '<=', end.toISOString());

        const tickets = await query.select('id', 'number', 'subject', 'description', 'status', 'source', 'category', 'created_at', 'updated_at');

        let targetTickets = tickets;
        if (ticketType === 'user') {
            targetTickets = tickets.filter(t => !isSystemTicket(t));
        } else if (ticketType === 'system') {
            targetTickets = tickets.filter(t => isSystemTicket(t));
        }

        const mapByDate = {};
        targetTickets.forEach(t => {
            const dayStr = new Date(t.created_at).toISOString().split('T')[0];
            if (!mapByDate[dayStr]) {
                mapByDate[dayStr] = { total: 0, resolved: 0, overdue: 0 };
            }
            mapByDate[dayStr].total += 1;
            const stat = (t.status || '').toLowerCase();
            if (['closed', 'selesai', 'resolved'].includes(stat)) {
                mapByDate[dayStr].resolved += 1;
            } else {
                const ageHours = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
                if (ageHours > 2) {
                    mapByDate[dayStr].overdue += 1;
                }
            }
        });

        const result = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const curr = new Date(start);
        curr.setHours(0, 0, 0, 0);
        const limitEnd = new Date(end);
        limitEnd.setHours(23, 59, 59, 999);

        while (curr <= limitEnd) {
            const yyyy = curr.getFullYear();
            const mm = String(curr.getMonth() + 1).padStart(2, '0');
            const dd = String(curr.getDate()).padStart(2, '0');
            const dayKey = `${yyyy}-${mm}-${dd}`;
            const label = `${curr.getDate()} ${monthNames[curr.getMonth()]}`;

            const entry = mapByDate[dayKey] || { total: 0, resolved: 0, overdue: 0 };
            result.push({
                label: label,
                date: dayKey,
                total_tickets: entry.total,
                resolved_tickets: entry.resolved,
                overdue_tickets: entry.overdue
            });

            curr.setDate(curr.getDate() + 1);
        }

        res.json(result);
    } catch (e) {
        console.error('Error fetching resolution KPI:', e);
        res.status(500).json({ error: 'Failed to fetch resolution KPI' });
    }
});

// GET /api/network/tickets/analytics/dashboard
router.get('/analytics/dashboard', async (req, res) => {
    try {
        const { organization, startDate, endDate, ticketType } = req.query;
        const db = req.db || require('../db').getDb(organization || 'TCF-SG');

        let query = db('tickets');
        if (startDate) query = query.where('created_at', '>=', `${startDate} 00:00:00`);
        if (endDate) query = query.where('created_at', '<=', `${endDate} 23:59:59`);

        const allTickets = await query.select('id', 'number', 'subject', 'description', 'status', 'source', 'priority', 'category');

        let totalUser = 0;
        let totalSystem = 0;
        allTickets.forEach(t => {
            if (isSystemTicket(t)) totalSystem++;
            else totalUser++;
        });

        let targetTickets = allTickets;
        if (ticketType === 'user') {
            targetTickets = allTickets.filter(t => !isSystemTicket(t));
        } else if (ticketType === 'system') {
            targetTickets = allTickets.filter(t => isSystemTicket(t));
        }

        const counts = { 
            All: 0, 
            Diajukan: 0, 
            Diproses: 0, 
            Selesai: 0, 
            Ditolak: 0, 
            Open: 0, 
            Pending: 0, 
            Resolved: 0, 
            Closed: 0 
        };
        const channelMap = {};
        const priorityMap = {};
        const categoryMap = {};

        targetTickets.forEach(t => {
            counts.All++;
            const rawStat = t.status || 'Diajukan';
            
            if (rawStat === 'Diajukan' || rawStat === 'New') {
                counts.Diajukan++;
                counts.Open++;
            } else if (rawStat === 'Diproses' || rawStat === 'In Progress' || rawStat === 'Pending') {
                counts.Diproses++;
                counts.Pending++;
            } else if (rawStat === 'Selesai' || rawStat === 'Closed' || rawStat === 'Resolved') {
                counts.Selesai++;
                counts.Closed++;
            } else if (rawStat === 'Ditolak' || rawStat === 'Rejected') {
                counts.Ditolak++;
            } else {
                counts.Diajukan++;
                counts.Open++;
            }
            
            const isSys = isSystemTicket(t);
            const src = t.source || (isSys ? 'System' : 'WhatsApp');
            channelMap[src] = (channelMap[src] || 0) + 1;

            const prio = t.priority || 'Normal';
            priorityMap[prio] = (priorityMap[prio] || 0) + 1;

            const cat = t.category || (isSys ? 'Monitoring Alert' : 'General');
            categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });

        const channels = Object.keys(channelMap).map(name => ({ name, value: channelMap[name] }));
        const priorities = Object.keys(priorityMap).map(name => ({ name, value: priorityMap[name] }));
        const types = Object.keys(categoryMap).map(name => ({ name, value: categoryMap[name] }));

        res.json({
            counts,
            channels,
            priorities,
            types,
            summary: {
                total: allTickets.length,
                user: totalUser,
                system: totalSystem
            },
            firstReplies: channels, // Mock first replies using channels to prevent UI errors
            stats: { departments: [], topics: types, agents: [] }
        });
    } catch (e) {
        console.error('Error in tickets analytics:', e);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// GET /api/network/tickets/monthly-kpi - Fetch ticket metrics grouped by month
router.get('/monthly-kpi', async (req, res) => {
    const year = Number(req.query.year || new Date().getFullYear());
    try {
        const db = req.db || require('../db').getDb(req.query.organization || 'TCF-SG');
        
        const tickets = await db('tickets')
            .whereRaw(db.client.config.client === 'pg' ? "to_char(created_at, 'YYYY') = ?" : "strftime('%Y', created_at) = ?", [year.toString()])
            .select('created_at', 'status');
            
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({ 
            month: i + 1, 
            total_tickets: 0, 
            resolved_tickets: 0 
        }));
        
        tickets.forEach(t => {
            const date = new Date(t.created_at);
            const m = date.getMonth(); // 0-11
            if (m >= 0 && m < 12) {
                monthlyData[m].total_tickets += 1;
                // Consider Closed or Resolved as resolved
                if (t.status === 'Resolved' || t.status === 'Closed' || t.status === 'Selesai') {
                    monthlyData[m].resolved_tickets += 1;
                }
            }
        });

        // Apply KPI overrides if any exist for tickets
        try {
            const overrides = await db('kpi_overrides').where({ type: 'tickets', year });
            overrides.forEach(ov => {
                const mIdx = ov.month - 1;
                if (mIdx >= 0 && mIdx < 12) {
                    monthlyData[mIdx][ov.metric] = isNaN(ov.value) ? ov.value : Number(ov.value);
                }
            });
        } catch (overrideErr) {
            // Ignore if table doesn't exist or other err
        }
        
        // Calculate resolution percentage
        monthlyData.forEach(m => {
            m.percentage = m.total_tickets > 0 ? ((m.resolved_tickets / m.total_tickets) * 100).toFixed(2) : "0.00";
        });
        
        res.json({ year, monthly: monthlyData });
    } catch (err) {
        console.error('Error fetching ticket KPI:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
