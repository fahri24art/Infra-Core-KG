const express = require('express');
const router = express.Router();
const db = require('../db'); // Assuming db is exported from somewhere, usually index.js passes it or it is required. Wait, how do other routes get db? I should check.

// Let me export a function that takes db as an argument, similar to typical express routers.
module.exports = function(db) {
    
    // ==========================================
    // 1. SOFTWARE LICENSES
    // ==========================================
    router.get('/licenses', async (req, res) => {
        try {
            const licenses = await db('software_licenses').select('*').orderBy('created_at', 'desc');
            res.json(licenses);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch licenses' });
        }
    });

    router.post('/licenses', async (req, res) => {
        try {
            const [id] = await db('software_licenses').insert(req.body).returning('id');
            res.status(201).json({ id, ...req.body });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to add license' });
        }
    });

    router.delete('/licenses/:id', async (req, res) => {
        try {
            await db('software_licenses').where('id', req.params.id).del();
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete license' });
        }
    });

    // ==========================================
    // 2. CONSUMABLES (STOCK)
    // ==========================================
    router.get('/consumables', async (req, res) => {
        try {
            const consumables = await db('consumables').select('*').orderBy('item_name', 'asc');
            res.json(consumables);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch consumables' });
        }
    });

    router.post('/consumables', async (req, res) => {
        try {
            const [id] = await db('consumables').insert(req.body).returning('id');
            res.status(201).json({ id, ...req.body });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to add consumable' });
        }
    });

    router.post('/consumables/transaction', async (req, res) => {
        const { consumable_id, action_type, quantity, user_id, ticket_id, remarks } = req.body;
        try {
            await db.transaction(async trx => {
                // Log transaction
                await trx('consumable_logs').insert({
                    consumable_id, action_type, quantity, user_id, ticket_id, remarks
                });

                // Update stock
                const modifier = action_type === 'IN' ? quantity : -quantity;
                await trx('consumables')
                    .where('id', consumable_id)
                    .increment('current_stock', modifier);
            });
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Transaction failed' });
        }
    });

    // ==========================================
    // 3. CONTRACTS
    // ==========================================
    router.get('/contracts', async (req, res) => {
        try {
            const contracts = await db('contracts').select('*').orderBy('end_date', 'asc');
            res.json(contracts);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch contracts' });
        }
    });

    router.post('/contracts', async (req, res) => {
        try {
            const [id] = await db('contracts').insert(req.body).returning('id');
            res.status(201).json({ id, ...req.body });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to add contract' });
        }
    });

    router.delete('/contracts/:id', async (req, res) => {
        try {
            await db('contracts').where('id', req.params.id).del();
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete contract' });
        }
    });

    // ==========================================
    // 4. KNOWLEDGE BASE
    // ==========================================
    router.get('/knowledge_base', async (req, res) => {
        try {
            const articles = await db('knowledge_base').select('*').orderBy('created_at', 'desc');
            res.json(articles);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch KB articles' });
        }
    });

    router.post('/knowledge_base', async (req, res) => {
        try {
            const [id] = await db('knowledge_base').insert(req.body).returning('id');
            res.status(201).json({ id, ...req.body });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to add article' });
        }
    });

    return router;
};
