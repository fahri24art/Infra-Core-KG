const express = require('express');
const router = express.Router();
const db = require('../db');

// --- 1. ROOM MASTER DATA ---

// Get all rooms
router.get('/', async (req, res) => {
    try {
        const rooms = await db('hr_meeting_rooms').orderBy('id', 'asc');
        
        // Parse JSON facilities
        const parsedRooms = rooms.map(room => ({
            ...room,
            facilities: typeof room.facilities === 'string' ? JSON.parse(room.facilities) : (room.facilities || [])
        }));
        
        res.json({ success: true, data: parsedRooms });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create new room (Admin only)
router.post('/', async (req, res) => {
    try {
        const payload = {
            name: req.body.name,
            capacity: req.body.capacity || 10,
            facilities: typeof req.body.facilities === 'object' ? JSON.stringify(req.body.facilities) : (req.body.facilities || '[]'),
            is_active: req.body.is_active !== undefined ? req.body.is_active : true,
            color_theme: req.body.color_theme || '#3B82F6'
        };
        const [id] = await db('hr_meeting_rooms').insert(payload).returning('id');
        res.status(201).json({ success: true, id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update room
router.put('/:id', async (req, res) => {
    try {
        const payload = {
            name: req.body.name,
            capacity: req.body.capacity,
            facilities: typeof req.body.facilities === 'object' ? JSON.stringify(req.body.facilities) : (req.body.facilities || '[]'),
            is_active: req.body.is_active,
            color_theme: req.body.color_theme,
            updated_at: new Date()
        };
        await db('hr_meeting_rooms').where({ id: req.params.id }).update(payload);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 2. ROOM BOOKINGS ---

// Get all bookings (with query params for date range)
router.get('/bookings', async (req, res) => {
    try {
        let query = db('hr_room_bookings')
            .join('hr_meeting_rooms', 'hr_room_bookings.room_id', 'hr_meeting_rooms.id')
            .select(
                'hr_room_bookings.*', 
                'hr_meeting_rooms.name as room_name',
                'hr_meeting_rooms.color_theme'
            )
            .orderBy('hr_room_bookings.start_time', 'asc');
            
        if (req.query.start && req.query.end) {
            query = query.whereBetween('hr_room_bookings.start_time', [req.query.start, req.query.end]);
        }
        
        const bookings = await query;
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create new booking (with conflict check)
router.post('/bookings', async (req, res) => {
    try {
        const { room_id, title, booker_name, booker_contact, start_time, end_time } = req.body;
        
        // Conflict check logic
        const conflictingBookings = await db('hr_room_bookings')
            .where('room_id', room_id)
            .where('status', '!=', 'CANCELLED')
            .andWhere(function() {
                this.where(function() {
                    this.where('start_time', '<', end_time)
                        .andWhere('end_time', '>', start_time);
                });
            });
            
        if (conflictingBookings.length > 0) {
            return res.status(409).json({ success: false, error: 'Room is already booked for this time slot.' });
        }
        
        const payload = {
            room_id, title, booker_name, booker_contact, start_time, end_time,
            status: 'SCHEDULED'
        };
        const [id] = await db('hr_room_bookings').insert(payload).returning('id');
        
        // Also create empty MOM template
        await db('hr_meeting_moms').insert({
            booking_id: id.id || id,
            discussion: '',
            action_items: '[]',
            attendees: '[]',
            attachments: '[]'
        });
        
        res.status(201).json({ success: true, id: id.id || id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update booking status
router.put('/bookings/:id/status', async (req, res) => {
    try {
        await db('hr_room_bookings').where({ id: req.params.id }).update({ 
            status: req.body.status,
            updated_at: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update booking time (Overtime / Extension)
router.put('/bookings/:id/time', async (req, res) => {
    try {
        await db('hr_room_bookings').where({ id: req.params.id }).update({ 
            end_time: req.body.end_time,
            updated_at: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 3. MEETING MOMS ---

// Get MOM for a booking
router.get('/bookings/:id/mom', async (req, res) => {
    try {
        const mom = await db('hr_meeting_moms').where({ booking_id: req.params.id }).first();
        if (!mom) {
            return res.status(404).json({ success: false, error: 'MOM not found' });
        }
        
        mom.action_items = typeof mom.action_items === 'string' ? JSON.parse(mom.action_items) : (mom.action_items || []);
        mom.attendees = typeof mom.attendees === 'string' ? JSON.parse(mom.attendees) : (mom.attendees || []);
        mom.attachments = typeof mom.attachments === 'string' ? JSON.parse(mom.attachments) : (mom.attachments || []);
        res.json({ success: true, data: mom });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update MOM
router.put('/moms/:id', async (req, res) => {
    try {
        const payload = {
            discussion: req.body.discussion,
            action_items: typeof req.body.action_items === 'object' ? JSON.stringify(req.body.action_items) : (req.body.action_items || '[]'),
            attendees: typeof req.body.attendees === 'object' ? JSON.stringify(req.body.attendees) : (req.body.attendees || '[]'),
            attachments: typeof req.body.attachments === 'object' ? JSON.stringify(req.body.attachments) : (req.body.attachments || '[]'),
            updated_at: new Date()
        };
        await db('hr_meeting_moms').where({ id: req.params.id }).update(payload);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Knowledge Search
router.get('/knowledge-search', async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q) return res.json({ success: true, data: [] });
        
        const results = await db('hr_meeting_moms')
            .join('hr_room_bookings', 'hr_meeting_moms.booking_id', 'hr_room_bookings.id')
            .join('hr_meeting_rooms', 'hr_room_bookings.room_id', 'hr_meeting_rooms.id')
            .select(
                'hr_meeting_moms.*',
                'hr_room_bookings.title',
                'hr_room_bookings.start_time',
                'hr_room_bookings.booker_name',
                'hr_meeting_rooms.name as room_name'
            )
            .whereRaw('hr_meeting_moms.discussion ILIKE ?', [`%${q}%`])
            .orWhereRaw('CAST(hr_meeting_moms.action_items AS TEXT) ILIKE ?', [`%${q}%`])
            .orWhereRaw('hr_room_bookings.title ILIKE ?', [`%${q}%`])
            .orWhereRaw('hr_room_bookings.booker_name ILIKE ?', [`%${q}%`])
            .orderBy('hr_room_bookings.start_time', 'desc')
            .limit(20);
            
        const mapped = results.map(m => ({
            ...m,
            action_items: typeof m.action_items === 'string' ? JSON.parse(m.action_items) : (m.action_items || [])
        }));
        
        res.json({ success: true, data: mapped });
    } catch (err) {
        console.error('Knowledge search error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
