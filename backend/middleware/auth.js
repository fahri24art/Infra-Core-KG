const crypto = require('crypto');
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET || 'tcf_power_asset_sec_token_key_2026_x9K!';

// Generate signed token: base64url(payload) + '.' + base64url(hmac)
function generateToken(user, organization, expiresInDays = 7) {
    const payload = {
        id: user.id,
        username: user.username || user.name,
        name: user.name,
        role: user.role,
        organization: organization || user.organization || 'TCF-SG',
        exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
    return `${payloadB64}.${signature}`;
}

// Verify signed token
function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
    
    try {
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSig);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return null;
        }
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
        if (payload.exp && Date.now() > payload.exp) {
            return null; // Expired
        }
        return payload;
    } catch (e) {
        return null;
    }
}

// Extract token from request
function extractToken(req) {
    // 1. From Cookie: pa_session
    if (req.headers && req.headers.cookie) {
        try {
            const cookies = cookie.parse(req.headers.cookie);
            if (cookies.pa_session) return cookies.pa_session;
        } catch (e) {}
    }
    // 2. From Authorization header: Bearer <token>
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
    }
    // 3. From X-Auth-Token header
    if (req.headers['x-auth-token']) {
        return String(req.headers['x-auth-token']).trim();
    }
    // 4. From query parameter for WebSocket or specialized downloads
    if (req.query && req.query.auth_token) {
        return String(req.query.auth_token).trim();
    }
    return null;
}

// Check if request originates from localhost / internal machine
function isLocalhost(req) {
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('127.0.0.1');
}

// Allowlist check for endpoints that must function without prior user login
function isPublicRoute(req) {
    const url = req.originalUrl || req.url || '';
    const cleanUrl = url.split('?')[0];
    const method = req.method.toUpperCase();

    // 1. System health check & static downloads
    if (cleanUrl === '/api/check' || cleanUrl === '/check') return true;
    if (cleanUrl.startsWith('/ict/downloads') || cleanUrl.startsWith('/downloads')) return true;

    // 2. Authentication endpoints
    if (cleanUrl === '/api/auth/login' || cleanUrl === '/api/network/auth/login') return true;
    if (cleanUrl === '/api/auth/organizations' || cleanUrl === '/api/network/auth/organizations') return true;

    // 3. Client PC Agent routes (PowerAsset_Agent_SG.ps1 / KG.ps1)
    if (cleanUrl.includes('/agents/register')) return true;
    if (cleanUrl.includes('/agents/poll')) return true;
    if (cleanUrl.includes('/agents/command') || cleanUrl.includes('/agents/response')) return true;
    if (cleanUrl.includes('/agents/network-data')) return true;
    if (cleanUrl.includes('/agents/download')) return true;

    // 4. Localhost internal services (WA relays, cron, local bot relays)
    if (isLocalhost(req)) {
        if (cleanUrl === '/api/send-message') return true;
        if (cleanUrl.startsWith('/api/wa-') || cleanUrl.startsWith('/api/bot')) return true;
        if (cleanUrl.startsWith('/api/hrga/bot')) return true;
    }

    // 5. Public helpdesk ticket submission from employees (if unauthenticated portal)
    if (cleanUrl === '/api/network/portal/create-ticket' && method === 'POST') return true;

    // 6. Ricoh Print & User Activity Reports (for modal & Excel export)
    if (cleanUrl.startsWith('/api/ricoh/reports')) return true;

    // 7. Public Department Budgeting Request Submission & Status Tracking
    if (cleanUrl === '/api/budgeting/department-requests' || 
        cleanUrl === '/api/budgeting/department-requests/' ||
        cleanUrl === '/api/network/budgeting/department-requests' ||
        cleanUrl === '/api/network/budgeting/department-requests/') {
        if (method === 'POST' || method === 'GET') return true;
    }

    return false;
}

// Main Express auth middleware
function authMiddleware(req, res, next) {
    if (isPublicRoute(req)) {
        return next();
    }

    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Akses API ditolak: Anda harus login terlebih dahulu untuk mengakses endpoint ini.'
        });
    }

    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({
            error: 'INVALID_TOKEN',
            message: 'Sesi login telah kedaluwarsa atau tidak valid. Silakan login kembali.'
        });
    }

    req.user = user;
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    extractToken,
    authMiddleware,
    isPublicRoute
};
