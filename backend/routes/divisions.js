const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/divisions - List all divisions
router.get('/', async (req, res) => {
    try {
        const divisions = await db('divisions')
            .leftJoin('departments', 'divisions.department_id', 'departments.id')
            .select('divisions.*', 'departments.name as department_name')
            .orderBy('divisions.name');
        res.json(divisions);
    } catch (err) {
        console.error('Error fetching divisions:', err);
        res.status(500).json({ error: 'Failed to fetch divisions' });
    }
});

// POST /api/divisions - Create new division
router.post('/', async (req, res) => {
    const { name, department_id, description } = req.body;
    try {
        if (!name || !department_id) return res.status(400).json({ error: 'Name and Department ID are required' });

        const [id] = await db('divisions').insert({
            name,
            department_id,
            description: description || '',
            created_at: new Date(),
            updated_at: new Date()
        }).returning('id');

        const insertedId = typeof id === 'object' ? id.id : id;
        const newDiv = await db('divisions').where({ id: insertedId }).first();
        res.status(201).json(newDiv);
    } catch (err) {
        console.error('Error creating division:', err);
        res.status(500).json({ error: 'Failed to create division' });
    }
});

// PUT /api/divisions/:id - Update division
router.put('/:id', async (req, res) => {
    const { name, department_id, description } = req.body;
    try {
        await db('divisions').where({ id: req.params.id }).update({
            name,
            department_id,
            description,
            updated_at: new Date()
        });
        const updated = await db('divisions').where({ id: req.params.id }).first();
        res.json(updated);
    } catch (err) {
        console.error('Error updating division:', err);
        res.status(500).json({ error: 'Failed to update division' });
    }
});

// DELETE /api/divisions/:id - Delete division
router.delete('/:id', async (req, res) => {
    try {
        await db('divisions').where({ id: req.params.id }).del();
        res.json({ message: 'Division deleted successfully' });
    } catch (err) {
        console.error('Error deleting division:', err);
        res.status(500).json({ error: 'Failed to delete division' });
    }
});

module.exports = router;
