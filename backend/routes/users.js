const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users - List all users
router.get('/', async (req, res) => {
    try {
        const orgContext = req.organization || req.query.organization || req.headers['x-organization'] || 'TCF-SG';
        const fetchAll = req.query.all === 'true';
        let allUsers = [];

        if (fetchAll) {
            for (const org of ['TCF-SG', 'TCF-KG']) {
                await db.runWithOrg(org, async () => {
                    const users = await db('users')
                        .leftJoin('hr_employees', 'users.hr_employee_id', 'hr_employees.id')
                        .select('users.id', 'users.username', 'users.name', 'users.employee_id', 'users.email', 'users.whatsapp', 'users.role', 'users.department', 'users.division', 'users.created_at', 'users.hr_employee_id', 'hr_employees.nik as hr_nik', 'hr_employees.position as hr_position')
                        .orderBy('users.name');
                    users.forEach(u => u.organization = org);
                    allUsers = allUsers.concat(users);
                });
            }
        } else {
            await db.runWithOrg(orgContext, async () => {
                const users = await db('users')
                    .leftJoin('hr_employees', 'users.hr_employee_id', 'hr_employees.id')
                    .select('users.id', 'users.username', 'users.name', 'users.employee_id', 'users.email', 'users.whatsapp', 'users.role', 'users.department', 'users.division', 'users.created_at', 'users.hr_employee_id', 'hr_employees.nik as hr_nik', 'hr_employees.position as hr_position')
                    .orderBy('users.name');
                users.forEach(u => u.organization = orgContext);
                allUsers = users;
            });
        }
        res.json(allUsers);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// GET /api/users/:id - Get specific user profile
router.get('/:id', async (req, res) => {
    try {
        let foundUser = null;
        for (const org of ['TCF-SG', 'TCF-KG']) {
            await db.runWithOrg(org, async () => {
                const user = await db('users')
                    .leftJoin('hr_employees', 'users.hr_employee_id', 'hr_employees.id')
                    .select('users.*', 'hr_employees.nik as hr_nik', 'hr_employees.position as hr_position', 'hr_employees.department as hr_department', 'hr_employees.phone as hr_phone', 'hr_employees.photo_url as hr_photo_url')
                    .where('users.id', req.params.id)
                    .first();
                if (user) {
                    user.organization = org;
                    foundUser = user;
                }
            });
            if (foundUser) break;
        }
        
        if (!foundUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Remove password hash from response
        delete foundUser.password;
        res.json(foundUser);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
    const { username, name, email, employee_id, password, role, department, division, whatsapp, organization, hr_employee_id } = req.body;
    const orgContext = organization || req.organization || req.headers['x-organization'] || 'TCF-SG';
    try {
        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        await db.runWithOrg(orgContext, async () => {
            let assignedHrId = hr_employee_id || null;
            if (!assignedHrId) {
                let hr = null;
                if (employee_id && employee_id.trim()) {
                    hr = await db('hr_employees').where('nik', employee_id.trim()).first();
                }
                if (!hr && name && name.trim()) {
                    hr = await db('hr_employees').whereRaw('LOWER(name) = ?', [name.toLowerCase().trim()]).first();
                }
                if (hr) {
                    assignedHrId = hr.id;
                } else {
                    const cleanNik = (employee_id && employee_id.trim()) || `USR-${Date.now().toString().slice(-6)}`;
                    try {
                        const [newHr] = await db('hr_employees').insert({
                            nik: cleanNik,
                            name: name.trim(),
                            department: department || 'General',
                            phone: whatsapp || null,
                            status: 'Active',
                            created_at: new Date(),
                            updated_at: new Date()
                        }).returning('id');
                        assignedHrId = typeof newHr === 'object' ? newHr.id : newHr;
                    } catch (hrErr) {
                        console.warn('[USERS] Auto-insert hr_employee warning:', hrErr.message);
                    }
                }
            }

            const [id] = await db('users').insert({
                username: username ? username : null,
                name,
                email: email ? email : null,
                employee_id: employee_id ? employee_id : null,
                hr_employee_id: assignedHrId,
                password,
                whatsapp: whatsapp ? whatsapp : null,
                role: role || 'user',
                department: department || '',
                division: division || '',
                created_at: new Date(),
                updated_at: new Date()
            }).returning('id');

            const insertedId = typeof id === 'object' ? id.id : id;
            const newUser = await db('users').where({ id: insertedId }).first();
            if (newUser) newUser.organization = orgContext;
            res.status(201).json(newUser);
        });
    } catch (err) {
        console.error('Error creating user:', err);
        if (err.code === 'SQLITE_CONSTRAINT' || err.code === '23505') {
            let field = 'Email';
            if (err.detail && err.detail.includes('username')) field = 'Username';
            else if (err.detail && err.detail.includes('whatsapp')) field = 'WhatsApp Number';
            else if (err.detail && err.detail.includes('email')) field = 'Email';
            else if (err.detail && err.detail.includes('employee_id')) field = 'Employee ID';
            return res.status(409).json({ error: `${field} is already registered.` });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
    const { username, name, email, employee_id, password, role, department, division, whatsapp, organization, current_organization, hr_employee_id } = req.body;
    const orgContext = current_organization || req.organization || req.headers['x-organization'] || 'TCF-SG';
    try {
        await db.runWithOrg(orgContext, async () => {
            const updateData = {
                username: username !== undefined ? (username || null) : undefined,
                name,
                email,
                employee_id,
                hr_employee_id: hr_employee_id !== undefined ? (hr_employee_id || null) : undefined,
                role,
                whatsapp,
                department: department !== undefined ? department : undefined,
                division: division !== undefined ? division : undefined,
                updated_at: new Date()
            };
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
            if (password) updateData.password = password;

            if (organization && organization !== orgContext) {
                // Moving organization
                const oldUser = await db('users').where({ id: req.params.id }).first();
                if (oldUser) {
                    // Mark old user whatsapp as moved to preserve ticket relation but avoid bot conflict
                    await db('users').where({ id: req.params.id }).update({
                        whatsapp: oldUser.whatsapp ? oldUser.whatsapp + '_moved_' + Date.now() : null,
                        updated_at: db.fn.now()
                    });
                    
                    // Insert to new org
                    await db.runWithOrg(organization, async () => {
                        const [newId] = await db('users').insert({
                            username: updateData.username !== undefined ? updateData.username : oldUser.username,
                            name: updateData.name || oldUser.name,
                            email: updateData.email || oldUser.email,
                            employee_id: updateData.employee_id !== undefined ? updateData.employee_id : oldUser.employee_id,
                            hr_employee_id: updateData.hr_employee_id !== undefined ? updateData.hr_employee_id : oldUser.hr_employee_id,
                            password: updateData.password || oldUser.password,
                            whatsapp: updateData.whatsapp || oldUser.whatsapp,
                            role: updateData.role || oldUser.role,
                            department: updateData.department || oldUser.department,
                            division: updateData.division !== undefined ? updateData.division : oldUser.division,
                            created_at: db.fn.now(),
                            updated_at: db.fn.now()
                        }).returning('id');
                        
                        const insertedId = typeof newId === 'object' ? newId.id : newId;
                        const newUser = await db('users').where({ id: insertedId }).first();
                        if (newUser) newUser.organization = organization;
                        res.json(newUser);
                    });
                    return;
                } else {
                    res.status(404).json({ error: 'User not found in current organization' });
                    return;
                }
            }
            // Normal update
            await db('users').where({ id: req.params.id }).update(updateData);
                const updatedUser = await db('users').where({ id: req.params.id }).first();

                // Auto-sync department, name, phone to hr_employees
                if (updatedUser && updatedUser.hr_employee_id) {
                    const hrUpdates = {};
                    if (updateData.department !== undefined) hrUpdates.department = updateData.department;
                    if (updateData.name !== undefined) hrUpdates.name = updateData.name;
                    if (updateData.whatsapp !== undefined) hrUpdates.phone = updateData.whatsapp;
                    if (Object.keys(hrUpdates).length > 0) {
                        hrUpdates.updated_at = new Date();
                        try {
                            await db('hr_employees').where({ id: updatedUser.hr_employee_id }).update(hrUpdates);
                        } catch (hrErr) {
                            console.warn('[USERS_ROUTE] Could not sync hr_employee:', hrErr.message);
                        }
                    }
                }

                if (updatedUser) updatedUser.organization = orgContext;
                res.json(updatedUser);
        });
    } catch (err) {
        console.error('Error updating user:', err);
        if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT') {
            if (err.detail && err.detail.includes('username')) {
                return res.status(409).json({ error: 'Username is already taken by another user.' });
            }
            if (err.detail && err.detail.includes('email')) {
                return res.status(409).json({ error: 'Email is already registered.' });
            }
            return res.status(409).json({ error: 'Username or Email already exists.' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    const orgContext = req.organization || req.query.organization || req.headers['x-organization'] || 'TCF-SG';
    try {
        await db.runWithOrg(orgContext, async () => {
            const user = await db('users').where({ id: req.params.id }).first();
            if (!user) {
                return res.status(404).json({ error: 'User not found in ' + orgContext });
            }
            // Safely unlink assets referencing this user
            try {
                await db('assets').where({ user_id: req.params.id }).update({ user_id: null });
            } catch (e) {}

            // If user has hr_employee_id, also clean up
            if (user.hr_employee_id) {
                try {
                    await db('hr_employees').where({ id: user.hr_employee_id }).del();
                } catch (e) {}
            }

            await db('users').where({ id: req.params.id }).del();
            res.json({ message: 'User deleted successfully' });
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user: ' + (err.detail || err.message) });
    }
});

module.exports = router;
