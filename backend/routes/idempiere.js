const express = require('express');
const router = express.Router();
const db = require('../db');

// Get list of idempiere products (Searchable)
router.get('/products', async (req, res) => {
    try {
        const { search, limit = 50 } = req.query;
        let query = req.db('idempiere_products');

        if (search) {
            query = query.where(function() {
                this.where('product_name', 'ilike', `%${search}%`)
                    .orWhere('product_code', 'ilike', `%${search}%`)
                    .orWhereRaw('CAST(m_product_id AS TEXT) LIKE ?', [`%${search}%`]);
            });
        }

        const products = await query.limit(limit).orderBy('product_name', 'asc');
        res.json(products);
    } catch (error) {
        console.error('Error fetching idempiere products:', error);
        res.status(500).json({ error: 'Failed to fetch Idempiere products' });
    }
});

module.exports = router;
