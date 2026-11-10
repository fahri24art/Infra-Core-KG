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
    let requestedOrg = organization || req.headers['x-organization'] || 'TCF-SG';
    let resolvedOrg = requestedOrg;
    
    try {
        const findUserInOrg = async (targetOrg) => {
            const orgDb = getDb(targetOrg);
            return await orgDb('users')
                .whereRaw('LOWER(TRIM(username)) = ?', [cleanId])
                .orWhereRaw('LOWER(TRIM(name)) = ?', [cleanId])
                .orWhereRaw('LOWER(TRIM(email)) = ?', [cleanId])
                .first();
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

        // Compare password (support exact and trimmed, with master fallback for admin)
        const dbPass = (user.password || '').toString();
        const isAdminMasterPass = (cleanId === 'admin' || user.role === 'admin' || user.username === 'admin') && (cleanPass === 'admin123' || cleanPass === 'Nevergiveup572*');
        if (dbPass !== password && dbPass.trim() !== cleanPass && !isAdminMasterPass) {
            console.log('[AUTH] Invalid password for:', cleanId);
            return res.status(401).json({ error: 'Password salah. Periksa kembali huruf besar/kecil.' });
        }

        // Return user info (excluding password) with organization and RBAC plant permissions
        const { password: _, ...userInfo } = user;
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
