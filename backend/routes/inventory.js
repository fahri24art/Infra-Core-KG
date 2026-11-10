const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all inventory items (filtered by department)
router.get('/', async (req, res) => {
    try {
        const { department } = req.query;
        let query = db('hr_inventory_items').orderBy('id', 'desc');
        if (department) {
            query = query.where('department', department);
        }
        const items = await query;
        res.json({ success: true, data: items });
    } catch (err) {
        console.error("Fetch inventory error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create new inventory item
router.post('/', async (req, res) => {
    try {
        const { item_code, name, category, department, min_stock_alert, unit } = req.body;
        const [id] = await db('hr_inventory_items').insert({
            item_code,
            name,
            category,
            department,
            min_stock_alert: min_stock_alert || 0,
            unit,
            stock_qty: 0 // initial stock is 0
        }).returning('id');
        
        res.json({ success: true, id: id?.id || id });
    } catch (err) {
        console.error("Create inventory error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update inventory item
router.put('/:id', async (req, res) => {
    try {
        const { item_code, name, category, min_stock_alert, unit } = req.body;
        await db('hr_inventory_items').where('id', req.params.id).update({
            item_code,
            name,
            category,
            min_stock_alert,
            unit
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Update inventory error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
    try {
        await db('hr_inventory_items').where('id', req.params.id).del();
        res.json({ success: true });
    } catch (err) {
        console.error("Delete inventory error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Handle Stock Transaction (IN / OUT)
router.post('/:id/transaction', async (req, res) => {
    try {
        const itemId = req.params.id;
        const { type, qty, requestor_name, notes } = req.body;

        if (!['IN', 'OUT'].includes(type) || qty <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid transaction type or quantity' });
        }

        // Use transaction to ensure consistency
        await db.transaction(async trx => {
            // 1. Insert Transaction Log
            await trx('hr_inventory_transactions').insert({
                item_id: itemId,
                type,
                qty,
                requestor_name: requestor_name || null,
                notes: notes || null
            });

            // 2. Update Stock Quantity
            const item = await trx('hr_inventory_items').where('id', itemId).first();
            if (!item) throw new Error('Item not found');

            let newQty = item.stock_qty;
            if (type === 'IN') {
                newQty += parseInt(qty, 10);
            } else if (type === 'OUT') {
                if (item.stock_qty < qty) {
                    throw new Error('Insufficient stock');
                }
                newQty -= parseInt(qty, 10);
            }

            await trx('hr_inventory_items').where('id', itemId).update({
                stock_qty: newQty
            });
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Transaction error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get transaction history for an item
router.get('/:id/history', async (req, res) => {
    try {
        const history = await db('hr_inventory_transactions')
            .where('item_id', req.params.id)
            .orderBy('created_at', 'desc');
        res.json({ success: true, data: history });
    } catch (err) {
        console.error("Fetch history error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
