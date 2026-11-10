const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/departments - List all departments
router.get('/', async (req, res) => {
    try {
        const departments = await db('departments').select('*').orderBy('name');
        res.json(departments);
    } catch (err) {
        console.error('Error fetching departments:', err);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// POST /api/departments - Create new department
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    try {
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const [id] = await db('departments').insert({
            name,
            description: description || '',
            created_at: new Date(),
            updated_at: new Date()
        }).returning('id');

        const insertedId = typeof id === 'object' ? id.id : id;
        const newDept = await db('departments').where({ id: insertedId }).first();
        res.status(201).json(newDept);
    } catch (err) {
        console.error('Error creating department:', err);
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Department already exists' });
        }
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// PUT /api/departments/:id - Update department
router.put('/:id', async (req, res) => {
    const { name, description } = req.body;
    try {
        await db('departments').where({ id: req.params.id }).update({
            name,
            description,
            updated_at: new Date()
        });
        const updated = await db('departments').where({ id: req.params.id }).first();
        res.json(updated);
    } catch (err) {
        console.error('Error updating department:', err);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

// DELETE /api/departments/:id - Delete department
router.delete('/:id', async (req, res) => {
    try {
        await db('departments').where({ id: req.params.id }).del();
        res.json({ message: 'Department deleted successfully' });
    } catch (err) {
        console.error('Error deleting department:', err);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

module.exports = router;
