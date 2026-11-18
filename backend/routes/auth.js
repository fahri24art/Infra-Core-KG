const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { generateToken, verifyToken, extractToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    console.log('[AUTH] Login request received:', req.body?.username || req.body?.email);
    const { username, email, password, organization } = req.body;
    const rawIdentifier = username || email;
    
    if (!rawIdentifier || !password) {
        console.log('[AUTH] Missing credentials');
        return res.status(400).json({ error: 'Username/Email dan password wajib diisi' });
    }

    const cleanId = rawIdentifier.trim().toLowerCase();
    const cleanPass = password.trim();
    
    // Initial requested organization
    let requestedOrg = organization || req.headers['x-organization'] || (process.env.PLANT_CODE || 'TCF-KG');
    let resolvedOrg = requestedOrg;
    
    try {
        const checkPasswordMatch = (candidate) => {
            const dbPass = (candidate.password || '').toString();
            const cleanDbPass = dbPass.replace(/[\.,\s\-]/g, '').trim();
            const cleanInputPass = cleanPass.replace(/[\.,\s\-]/g, '');
            return (dbPass === password) || 
                   (dbPass.trim() === cleanPass) ||
                   (cleanDbPass.length > 0 && cleanDbPass === cleanInputPass);
        };

        const findUserInOrg = async (targetOrg) => {
            const orgDb = getDb(targetOrg);
            const cleanIdNoSpace = cleanId.replace(/\s+/g, '');
            const cleanIdNoDot = cleanId.replace(/[\.,\s\-]/g, '');

            const candidates = await orgDb('users')
                .leftJoin('hr_employees', 'users.hr_employee_id', 'hr_employees.id')
                .whereRaw('LOWER(TRIM(users.username)) = ?', [cleanId])
                .orWhereRaw('LOWER(TRIM(users.name)) = ?', [cleanId])
                .orWhereRaw('LOWER(REPLACE(TRIM(users.name), \' \', \'\')) = ?', [cleanIdNoSpace])
                .orWhereRaw('LOWER(TRIM(COALESCE(users.email, \'\'))) = ?', [cleanId])
                .orWhereRaw('LOWER(REPLACE(REPLACE(TRIM(COALESCE(hr_employees.nik, \'\')), \'.\', \'\'), \',\', \'\')) = ?', [cleanIdNoDot])
                .orWhereRaw('LOWER(SPLIT_PART(TRIM(users.name), \' \', 1)) = ?', [cleanId])
                .orWhereRaw('LOWER(SPLIT_PART(TRIM(users.username), \' \', 1)) = ?', [cleanId])
                .orWhereRaw('LOWER(TRIM(users.name)) LIKE ?', [cleanId + ' %'])
                .select(
                    'users.*',
                    'hr_employees.nik as hr_nik',
                    'hr_employees.position as hr_position',
                    'hr_employees.department as hr_department',
                    'hr_employees.phone as hr_phone'
                );

            if (!candidates || candidates.length === 0) return null;
            if (candidates.length === 1) return candidates[0];

            // If multiple users match (e.g. same first name "ahmad"), pick the one whose password (NIK) matches
            const matched = candidates.find(checkPasswordMatch);
            return matched || candidates[0];
        };

        // 1. Try finding in requested organization
        let user = await findUserInOrg(requestedOrg);

        // 2. If not found in requested organization, check other plant
        if (!user) {
            const otherOrgs = ['TCF-SG', 'TCF-KG'].filter(o => o !== requestedOrg);
            for (const otherOrg of otherOrgs) {
                const altUser = await findUserInOrg(otherOrg);
                if (altUser) {
                    const isSuperAdmin = ['super_user', 'superuser', 'administrator', 'admin'].includes((altUser.role || '').toLowerCase());
                    if (isSuperAdmin) {
                        user = altUser;
                        resolvedOrg = requestedOrg;
                        console.log(`[AUTH] SuperAdmin (${altUser.role}) from ${otherOrg} crossing over to ${requestedOrg}`);
                    } else {
                        // User belongs to otherOrg! Auto-resolve to their actual plant
                        user = altUser;
                        resolvedOrg = otherOrg;
                        console.log(`[AUTH] User '${cleanId}' auto-resolved to actual plant ${otherOrg} (requested was: ${requestedOrg})`);
                    }
                    break;
                }
            }
        }

        if (!user) {
            console.log('[AUTH] User not found in DB:', cleanId);
            return res.status(401).json({ error: 'Username atau Email tidak ditemukan.' });
        }

        // Compare password (support exact, trimmed, and clean NIK without dots)
        const dbPass = (user.password || '').toString();
        const cleanDbPass = dbPass.replace(/[\.,\s\-]/g, '').trim();
        const cleanInputPass = cleanPass.replace(/[\.,\s\-]/g, '');

        const isPassMatch = (dbPass === password) || 
                            (dbPass.trim() === cleanPass) ||
                            (cleanDbPass.length > 0 && cleanDbPass === cleanInputPass);

        if (!isPassMatch) {
            console.log('[AUTH] Invalid password for:', cleanId);
            return res.status(401).json({ error: 'Password salah. Periksa kembali huruf besar/kecil.' });
        }

        // Return user info (excluding password) with organization and RBAC plant permissions
        const { password: _, ...userInfo } = user;
        userInfo.nik = user.hr_nik || user.nik || user.employee_id || '';
        userInfo.position = user.hr_position || 'Staff';
        userInfo.department = user.department || user.hr_department || 'General';
        userInfo.phone = user.whatsapp || user.hr_phone || '';
        const isSuperAdmin = ['super_user', 'superuser', 'administrator', 'admin'].includes((user.role || '').toLowerCase());
        userInfo.organization = resolvedOrg;
        userInfo.can_switch_plant = isSuperAdmin;
        userInfo.allowed_plants = isSuperAdmin ? ['TCF-SG', 'TCF-KG'] : [resolvedOrg];

        // Generate tamper-proof signed token
        const token = generateToken(userInfo, resolvedOrg);
        userInfo.token = token;

        // Set HttpOnly session cookie (Valid for 7 days, accessible across entire origin)
        res.cookie('pa_session', token, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        console.log('[AUTH] ✅ Login successful for user:', userInfo.name, 'organization:', resolvedOrg, 'can_switch_plant:', isSuperAdmin);
        res.json(userInfo);

    } catch (err) {
        console.error('[AUTH] Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/logout - Clear session cookie
router.post('/logout', (req, res) => {
    res.clearCookie('pa_session', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me - Check current authenticated user session
router.get('/me', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not logged in' });
    }
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Session expired' });
    }
    res.json(user);
});

// GET /api/auth/organizations - Get list of available organizations
router.get('/organizations', (req, res) => {
    res.json([
        { id: 'TCF-SG', name: 'Plant SG (Sadang - Purwakarta)', description: 'PT. Tri Centrum Fortuna - Sadang' },
        { id: 'TCF-KG', name: 'Plant KG (Karawang)', description: 'PT. Tri Centrum Fortuna - Karawang' }
    ]);
});

module.exports = router;
