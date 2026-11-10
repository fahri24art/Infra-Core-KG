const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Multer for document storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname);
        cb(null, 'doc-' + uniqueSuffix + ext)
    }
});
const upload = multer({ storage: storage });

// GET all documents
router.get('/', async (req, res) => {
    try {
        const docs = await db('audit_documents').orderBy('created_at', 'desc');
        res.json(docs);
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// POST upload new document
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, type, description, uploaded_by } = req.body;

        const [newDoc] = await db('audit_documents').insert({
            title: title || req.file.originalname,
            type: type || 'Other',
            description: description || '',
            filename: req.file.filename,
            original_filename: req.file.originalname,
            uploaded_by: uploaded_by || 'System',
            created_at: new Date(),
            updated_at: new Date()
        }).returning('*');

        res.json({ success: true, document: newDoc });
    } catch (err) {
        console.error('Error uploading document:', err);
        // If DB insert fails, remove the uploaded physical file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to save document record' });
    }
});

// DELETE document
router.delete('/:id', async (req, res) => {
    try {
        const doc = await db('audit_documents').where({ id: req.params.id }).first();
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete physical file
        const filePath = path.join(uploadDir, doc.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete DB record
        await db('audit_documents').where({ id: req.params.id }).del();
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

module.exports = router;
