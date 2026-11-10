const express = require('express');
const router = express.Router();
const db = require('../db');

// --- CATEGORIES ---
router.get('/categories', async (req, res) => {
    try {
        const data = await db('app_asset_categories').select('*').orderBy('id');
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.post('/categories', async (req, res) => {
    try {
        const { name, icon, description, form_schema, is_active } = req.body;
        const [id] = await db('app_asset_categories').insert({
            name, icon, description, 
            form_schema: typeof form_schema === 'string' ? form_schema : JSON.stringify(form_schema || {}),
            is_active
        }).returning('id');
        res.status(201).json({ id: typeof id === 'object' ? id.id : id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

router.put('/categories/:id', async (req, res) => {
    try {
        const { name, icon, description, form_schema, is_active } = req.body;
        await db('app_asset_categories').where({ id: req.params.id }).update({
            name, icon, description,
            form_schema: typeof form_schema === 'string' ? form_schema : JSON.stringify(form_schema || {}),
            is_active,
            updated_at: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

router.delete('/categories/:id', async (req, res) => {
    try {
        await db('app_asset_categories').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// --- STO PERIODS ---
router.get('/sto-periods', async (req, res) => {
    try {
        const data = await db('app_sto_periods').select('*').orderBy('id', 'desc');
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch STO periods' });
    }
});

router.post('/sto-periods', async (req, res) => {
    try {
        const { name, start_date, end_date, status, config } = req.body;
        const [id] = await db('app_sto_periods').insert({
            name, start_date, end_date, status,
            config: typeof config === 'string' ? config : JSON.stringify(config || {})
        }).returning('id');
        res.status(201).json({ id: typeof id === 'object' ? id.id : id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create STO period' });
    }
});

router.put('/sto-periods/:id', async (req, res) => {
    try {
        const { name, start_date, end_date, status, config } = req.body;
        await db('app_sto_periods').where({ id: req.params.id }).update({
            name, start_date, end_date, status,
            config: typeof config === 'string' ? config : JSON.stringify(config || {}),
            updated_at: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update STO period' });
    }
});

router.delete('/sto-periods/:id', async (req, res) => {
    try {
        await db('app_sto_periods').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete STO period' });
    }
});

// --- NODE TYPES ---
router.get('/node-types', async (req, res) => {
    try {
        const data = await db('app_node_types').select('*').orderBy('id');
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch node types' });
    }
});

router.post('/node-types', async (req, res) => {
    try {
        const { name, description } = req.body;
        const [id] = await db('app_node_types').insert({
            name, description
        }).returning('id');
        res.status(201).json({ id: typeof id === 'object' ? id.id : id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create node type' });
    }
});

router.put('/node-types/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        await db('app_node_types').where({ id: req.params.id }).update({
            name, description,
            updated_at: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update node type' });
    }
});

router.delete('/node-types/:id', async (req, res) => {
    try {
        await db('app_node_types').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete node type' });
    }
});
// --- DROPDOWN OPTIONS ---
router.get('/dropdowns', async (req, res) => {
    try {
        let query = db('app_dropdown_options').select('*').orderBy('category').orderBy('sort_order');
        if (req.query.category) {
            query = query.where('category', req.query.category);
        }
        const data = await query;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dropdowns' });
    }
});

router.post('/dropdowns', async (req, res) => {
    try {
        const { category, value, label, is_active, sort_order } = req.body;
        const [id] = await db('app_dropdown_options').insert({
            category, value, label, is_active, sort_order
        }).returning('id');
        res.status(201).json({ id: typeof id === 'object' ? id.id : id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create dropdown option' });
    }
});

router.put('/dropdowns/:id', async (req, res) => {
    try {
        const { category, value, label, is_active, sort_order } = req.body;
        await db('app_dropdown_options').where({ id: req.params.id }).update({
            category, value, label, is_active, sort_order,
            updated_at: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update dropdown option' });
    }
});

router.delete('/dropdowns/:id', async (req, res) => {
    try {
        await db('app_dropdown_options').where({ id: req.params.id }).del();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete dropdown option' });
    }
});

module.exports = router;
