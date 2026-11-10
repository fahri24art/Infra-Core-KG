const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads/raw_documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Multer for raw document storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname);
        cb(null, 'raw-' + uniqueSuffix + ext)
    }
});
const upload = multer({ storage: storage });

// GET all raw documents
router.get('/', async (req, res) => {
    try {
        const docs = await db('raw_documents').orderBy('created_at', 'desc');
        res.json(docs);
    } catch (err) {
        console.error('Error fetching raw documents:', err);
        res.status(500).json({ error: 'Failed to fetch raw documents' });
    }
});

// POST upload new raw document
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, type, description, uploaded_by } = req.body;

        const [newDoc] = await db('raw_documents').insert({
            title: title || req.file.originalname,
            type: type || 'Mentahan',
            description: description || '',
            filename: 'raw_documents/' + req.file.filename,
            original_filename: req.file.originalname,
            uploaded_by: uploaded_by || 'Admin ICT',
            created_at: new Date(),
            updated_at: new Date()
        }).returning('*');

        res.json({ success: true, document: newDoc });
    } catch (err) {
        console.error('Error uploading raw document:', err);
        res.status(500).json({ error: 'Failed to upload raw document' });
    }
});

// PUT update document details
router.put('/:id', async (req, res) => {
    try {
        const { title, type, description } = req.body;
        
        await db('raw_documents')
            .where({ id: req.params.id })
            .update({
                title: title,
                type: type,
                description: description,
                updated_at: new Date()
            });
            
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating raw document:', err);
        res.status(500).json({ error: 'Failed to update raw document' });
    }
});

// DELETE document
router.delete('/:id', async (req, res) => {
    try {
        const doc = await db('raw_documents').where({ id: req.params.id }).first();
        if (doc) {
            const filePath = path.join(__dirname, '../public/uploads', doc.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            await db('raw_documents').where({ id: req.params.id }).del();
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting raw document:', err);
        res.status(500).json({ error: 'Failed to delete raw document' });
    }
});

module.exports = router;
