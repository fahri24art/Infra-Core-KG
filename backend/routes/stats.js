const express = require('express');
const router = express.Router();
const db = require('../db');
const ostPool = require('../config/osticket_db');

router.get('/', async (req, res) => {
    try {
        const assetsCount = await db('assets').count('id as count').first();
        const assetsMaintenance = await db('assets').where('status', 'Maintenance').count('id as count').first();

        let openTickets = 0;
        let resolvedTickets = 0;
        let staffCount = 0;

        const org = req.query.organization || req.headers['x-organization'] || req.organization || 'TCF-SG';

        if (org === 'TCF-KG') {
            const openRes = await db('tickets').whereIn('status', ['Open', 'New', 'Pending']).count('id as count').first();
            const closedRes = await db('tickets').whereIn('status', ['Closed', 'Resolved']).count('id as count').first();
            openTickets = parseInt(openRes?.count) || 0;
            resolvedTickets = parseInt(closedRes?.count) || 0;
            const staffRes = await db('users').where('role', 'admin').count('id as count').first();
            staffCount = parseInt(staffRes?.count) || 0;
        } else if (ostPool) {
            try {
                const [[ticketStats]] = await ostPool.query(`
                    SELECT 
                        SUM(CASE WHEN s.state = 'open' THEN 1 ELSE 0 END) as open_tickets,
                        SUM(CASE WHEN s.state = 'closed' THEN 1 ELSE 0 END) as resolved_tickets
                    FROM ost_ticket t
                    JOIN ost_ticket_status s ON t.status_id = s.id
                `);
                openTickets = parseInt(ticketStats.open_tickets) || 0;
                resolvedTickets = parseInt(ticketStats.resolved_tickets) || 0;

                const [[staffStats]] = await ostPool.query(`SELECT COUNT(staff_id) as count FROM ost_staff WHERE isactive = 1`);
                staffCount = parseInt(staffStats.count) || 0;
            } catch (ostErr) {
                console.error("Error fetching osticket stats:", ostErr);
            }
        }

        const usersCount = await db('users').count('id as count').first();

        res.json({
            assets: {
                total: parseInt(assetsCount?.count) || 0,
                inUse: parseInt(assetsCount?.count) || 0,
                inStock: 0,
                underMaintenance: parseInt(assetsMaintenance?.count) || 0
            },
            tickets: {
                open: openTickets,
                resolved: resolvedTickets
            },
            users: { 
                total: staffCount > 0 ? staffCount : (parseInt(usersCount?.count) || 0) 
            }
        });
    } catch (err) {
        console.error('Stats Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/categories', async (req, res) => {
    try {
        // Get ticket categories from database
        const categoryMap = {};
        try {
            const tickets = await db('tickets').select('category');
            tickets.forEach(ticket => {
                const cat = ticket.category || 'Uncategorized';
                categoryMap[cat] = (categoryMap[cat] || 0) + 1;
            });
        } catch (err) {
            console.log('Error fetching ticket categories:', err);
        }

        const categoryData = Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
        categoryData.forEach((item, index) => {
            item.color = colors[index % colors.length];
        });

        res.json(categoryData);
    } catch (err) {
        console.error('Categories error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/sources', async (req, res) => {
    try {
        // Get ticket sources breakdown by category and department
        const breakdown = {
            bySource: {},
            byCategoryAndSource: {},
            byDepartmentAndSource: {}
        };

        try {
            const tickets = await db('tickets')
                .leftJoin('users', 'tickets.user_id', 'users.id')
                .select('tickets.source', 'tickets.category', 'users.department');

            // By source
            tickets.forEach(ticket => {
                const source = ticket.source || 'Email';
                breakdown.bySource[source] = (breakdown.bySource[source] || 0) + 1;
            });

            // By category and source
            tickets.forEach(ticket => {
                const category = ticket.category || 'General';
                const source = ticket.source || 'Email';
                const key = `${category}|${source}`;
                breakdown.byCategoryAndSource[key] = (breakdown.byCategoryAndSource[key] || 0) + 1;
            });

            // By department and source
            tickets.forEach(ticket => {
                const department = ticket.department || 'Unknown';
                const source = ticket.source || 'Email';
                const key = `${department}|${source}`;
                breakdown.byDepartmentAndSource[key] = (breakdown.byDepartmentAndSource[key] || 0) + 1;
            });
        } catch (err) {
            console.log('Error fetching ticket sources:', err);
        }

        res.json(breakdown);
    } catch (err) {
        console.error('Sources error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/dashboard', async (req, res) => {
    try {
        const period = req.query.period || 'month';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        let dateFilter = '';
        let intervalSql = '30 DAY';
        
        if (startDate && endDate) {
            dateFilter = `BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
        } else {
            if (period === 'day') intervalSql = '1 DAY';
            else if (period === 'week') intervalSql = '7 DAY';
            else if (period === 'year') intervalSql = '365 DAY';
            dateFilter = `>= DATE_SUB(NOW(), INTERVAL ${intervalSql})`;
        }
        
        let activityData = { created: [], closed: [], overdue: [] };
        let deptStats = [];
        let topSolvers = [];
        let totalOverdue = 0;

        const org = req.query.organization || req.headers['x-organization'] || req.organization || 'TCF-SG';

        if (org === 'TCF-KG') {
            // TCF-KG does not have osTicket dashboard stats currently
            return res.json({
                activity: activityData,
                departments: deptStats,
                total: 0,
                top_solvers: topSolvers,
                total_overdue: 0
            });
        }

        if (ostPool) {
            const formatDate = (d) => {
                try {
                    return typeof d === 'string' ? d.split('T')[0] : d.toISOString().split('T')[0];
                } catch(e) {
                    return String(d);
                }
            };
            
            const [createdRows] = await ostPool.query(`
                SELECT DATE(created) as date, COUNT(*) as count 
                FROM ost_ticket 
                WHERE created ${dateFilter}
                GROUP BY DATE(created)
                ORDER BY date ASC
            `);
            const [closedRows] = await ostPool.query(`
                SELECT DATE(closed) as date, COUNT(*) as count 
                FROM ost_ticket 
                WHERE closed ${dateFilter}
                AND closed IS NOT NULL 
                AND status_id IN (SELECT id FROM ost_ticket_status WHERE state = 'closed')
                GROUP BY DATE(closed)
                ORDER BY date ASC
            `);
            const [overdueRowsDaily] = await ostPool.query(`
                SELECT DATE(created) as date, COUNT(*) as count 
                FROM ost_ticket 
                WHERE isoverdue = 1 AND created ${dateFilter}
                GROUP BY DATE(created)
                ORDER BY date ASC
            `);
            
            const [[overdueResult]] = await ostPool.query(`
                SELECT COUNT(*) as count FROM ost_ticket WHERE isoverdue = 1 AND created ${dateFilter}
            `);
            totalOverdue = overdueResult.count || 0;
            
            activityData.created = createdRows.map(r => ({ date: formatDate(r.date), count: r.count }));
            activityData.closed = closedRows.map(r => ({ date: formatDate(r.date), count: r.count }));
            activityData.overdue = overdueRowsDaily.map(r => ({ date: formatDate(r.date), count: r.count }));
            
            const [deptRows] = await ostPool.query(`
                SELECT 
                    d.name as department,
                    SUM(CASE WHEN t.status_id IN (SELECT id FROM ost_ticket_status WHERE state = 'open') THEN 1 ELSE 0 END) as opened,
                    SUM(CASE WHEN t.status_id IN (SELECT id FROM ost_ticket_status WHERE state = 'closed') THEN 1 ELSE 0 END) as resolved,
                    SUM(CASE WHEN t.isoverdue = 1 THEN 1 ELSE 0 END) as overdue
                FROM ost_ticket t
                JOIN ost_department d ON t.dept_id = d.id
                WHERE t.created ${dateFilter}
                GROUP BY d.id
            `);
            
            deptStats = deptRows.map(r => ({
                department: r.department,
                opened: Number(r.opened) || 0,
                resolved: Number(r.resolved) || 0,
                overdue: Number(r.overdue) || 0
            }));
            
            const [solverRows] = await ostPool.query(`
                SELECT 
                    s.firstname, s.lastname,
                    COUNT(t.ticket_id) as count
                FROM ost_ticket t
                JOIN ost_staff s ON t.staff_id = s.staff_id
                WHERE t.status_id IN (SELECT id FROM ost_ticket_status WHERE state = 'closed')
                AND t.closed ${dateFilter}
                GROUP BY t.staff_id
                ORDER BY count DESC
                LIMIT 5
            `);
            
            topSolvers = solverRows.map(r => ({
                name: `${r.firstname} ${r.lastname}`.trim(),
                count: Number(r.count)
            }));
        }

        res.json({
            activity: activityData,
            departments: deptStats,
            total: deptStats.length,
            top_solvers: topSolvers,
            total_overdue: totalOverdue
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
