/**
 * Ricoh Copier Auto-Lockout Service
 * Monitors photocopy quotas and automatically restricts/enables Copier function for user PINs.
 */

const { getDb } = require('../db');
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const EXECUTABLE_PATHS = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

function getBrowserExecutable() {
    for (const p of EXECUTABLE_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Checks all devices against their monthly_quota_copier_bw & monthly_quota_copier_color
 * and applies granular physical locks/unlocks (COPY_BW vs COPY_FC/TC/MC)
 */
async function checkAndEnforceCopierQuotas(org = (process.env.PLANT_CODE || 'TCF-KG')) {
    try {
        const db = getDb(org);
        const devices = await db('ricoh_device_quotas')
            .where('status', 'active')
            .select(
                'id', 'computer_name', 'user_code',
                'current_usage_copier_bw', 'current_usage_copier_color',
                'monthly_quota_copier', 'monthly_quota_copier_bw', 'monthly_quota_copier_color',
                'copier_status', 'copier_bw_status', 'copier_color_status'
            );

        for (const dev of devices) {
            const usageBw = Number(dev.current_usage_copier_bw || 0);
            const usageColor = Number(dev.current_usage_copier_color || 0);
            const fallbackTotal = Number(dev.monthly_quota_copier || 200);
            const quotaBw = dev.monthly_quota_copier_bw != null ? Number(dev.monthly_quota_copier_bw) : Math.round(fallbackTotal * 0.8);
            const quotaColor = dev.monthly_quota_copier_color != null ? Number(dev.monthly_quota_copier_color) : Math.max(0, fallbackTotal - quotaBw);

            const bwExceeded = quotaBw > 0 ? usageBw >= quotaBw : usageBw > 0;
            const colorExceeded = quotaColor > 0 ? usageColor >= quotaColor : usageColor > 0;

            const oldBwStatus = dev.copier_bw_status || (dev.copier_status === 'locked' ? 'locked' : 'active');
            const oldColorStatus = dev.copier_color_status || (dev.copier_status === 'locked' ? 'locked' : 'active');

            const newBwStatus = bwExceeded ? 'locked' : 'active';
            const newColorStatus = colorExceeded ? 'locked' : 'active';
            const newOverallStatus = (bwExceeded && colorExceeded) ? 'locked' : ((bwExceeded || colorExceeded) ? 'partial' : 'active');

            const bwChanged = newBwStatus !== oldBwStatus;
            const colorChanged = newColorStatus !== oldColorStatus;

            if (bwChanged || colorChanged || (dev.copier_status !== newOverallStatus && (bwExceeded || colorExceeded))) {
                const newlyLockedBw = bwChanged && newBwStatus === 'locked';
                const newlyLockedColor = colorChanged && newColorStatus === 'locked';

                console.log(`[COPIER LOCK] [${org}] Updating ${dev.computer_name} (PIN: ${dev.user_code}) -> Copy B/W: ${usageBw}/${quotaBw} (${newBwStatus}), Copy Color: ${usageColor}/${quotaColor} (${newColorStatus})`);

                if (dev.user_code) {
                    syncCopierPermissionToPrinters(dev.user_code, {
                        allowBw: !bwExceeded,
                        allowColor: !colorExceeded
                    }, org).catch(e => {
                        console.warn(`[COPIER SYNC] Hardware sync error for PIN ${dev.user_code}:`, e.message);
                    });
                }

                await db('ricoh_device_quotas').where('id', dev.id).update({
                    copier_bw_status: newBwStatus,
                    copier_color_status: newColorStatus,
                    copier_status: newOverallStatus
                });

                try {
                    const events = [];
                    if (newlyLockedBw) events.push(`Copy B/W Locked (${usageBw}/${quotaBw})`);
                    if (newlyLockedColor) events.push(`Copy Color Locked (${usageColor}/${quotaColor})`);
                    if (bwChanged && newBwStatus === 'active') events.push(`Copy B/W Unlocked (${usageBw}/${quotaBw})`);
                    if (colorChanged && newColorStatus === 'active') events.push(`Copy Color Unlocked (${usageColor}/${quotaColor})`);
                    if (events.length > 0) {
                        await db('ricoh_system_logs').insert({
                            event_type: (newlyLockedBw || newlyLockedColor) ? 'COPIER_LOCKED' : 'COPIER_UNLOCKED',
                            message: `${dev.computer_name} (PIN ${dev.user_code}): ${events.join(' | ')}`
                        });
                    }
                } catch (e) {}

                if (newlyLockedBw || newlyLockedColor) {
                    try {
                        const { getDeviceQuotaStatuses, sendQuotaWarning } = require('./ricoh_quota_notifier');
                        const quotaStatuses = await getDeviceQuotaStatuses(org);
                        const targetDev = quotaStatuses.find(d => d.id === dev.id);
                        if (targetDev) {
                            targetDev.current_threshold = 100;
                            await sendQuotaWarning(targetDev, org);
                        }
                    } catch (notifErr) {
                        console.error('[COPIER LOCK] Failed to send WA alert:', notifErr.message);
                    }
                }
            }
        }
    } catch (err) {
        console.error('[COPIER LOCK] Error in checkAndEnforceCopierQuotas:', err.message);
    }
}

/**
 * Pushes Copier function permission (granular B/W vs Color enable/disable) for a PIN to Ricoh printers
 */
async function syncCopierPermissionToPrinters(userCode, permissions = true, org = (process.env.PLANT_CODE || 'TCF-KG')) {
    const perms = typeof permissions === 'object' && permissions !== null
        ? { allowBw: permissions.allowBw !== false, allowColor: permissions.allowColor !== false }
        : { allowBw: Boolean(permissions), allowColor: Boolean(permissions) };

    const printerIps = org === 'TCF-KG' ? ['192.168.27.11', '192.168.27.12'] : ['192.168.2.11', '192.168.2.10'];
    console.log(`[COPIER SYNC] [${org}] Pushing Copier Permission (B/W=${perms.allowBw ? 'ON' : 'OFF'}, Color=${perms.allowColor ? 'ON' : 'OFF'}) for PIN: ${userCode} across printers ${printerIps.join(', ')}...`);

    const exe = getBrowserExecutable();
    if (!exe) {
        console.log(`[COPIER SYNC] Chrome executable not available. Hardware sync skipped.`);
        return false;
    }

    let overallSuccess = false;
    for (const ip of printerIps) {
        try {
            const success = await setPrinterUserCopierPermission(ip, userCode, perms, exe);
            if (success) {
                overallSuccess = true;
            }
        } catch (err) {
            console.error(`[COPIER SYNC ERROR] Failed for printer ${ip} PIN ${userCode}:`, err.message);
        }
    }
    return overallSuccess;
}

async function loadAllAddressBookEntries(workFrame) {
    let lastLen = 0;
    let stableTicks = 0;
    for (let i = 0; i < 20; i++) {
        await delay(1000);
        const len = await workFrame.evaluate(() => {
            return window.g_objListEntry && window.g_objListEntry.entryHash
                ? Object.keys(window.g_objListEntry.entryHash).length
                : 0;
        }).catch(() => 0);
        if (len > 0 && len === lastLen) {
            stableTicks++;
            if (stableTicks >= 2) break;
        } else {
            stableTicks = 0;
            lastLen = len;
        }
    }
    return await workFrame.evaluate(() => {
        if (!window.g_objListEntry || !window.g_objListEntry.entryHash) return [];
        return Object.entries(window.g_objListEntry.entryHash).map(([id, data]) => ({
            id: Number(id),
            index: data?.[2],
            name: String(data?.[3] || '').trim(),
            pin: String(data?.[4] || '').replace(/[\[\]]/g, '').trim()
        }));
    });
}

async function openPrinterSession(ip, executablePath) {
    const browser = await puppeteer.launch({
        executablePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
    await delay(1500);

    const headerFrame = page.frames().find(f => f.name() === 'header');
    if (headerFrame) {
        const hasLogin = await headerFrame.$('a[href*="authForm.cgi"]');
        if (hasLogin) {
            await headerFrame.evaluate(() => {
                const a = document.querySelector('a[href*="authForm.cgi"]');
                if (a) a.click();
            });
            await delay(2000);

            let loginFrame = null;
            let loginSel = null;
            for (const f of page.frames()) {
                if (await f.$('input[name="loginid_work"]')) {
                    loginFrame = f;
                    loginSel = 'input[name="loginid_work"]';
                    break;
                } else if (await f.$('input[name="userid_work"]')) {
                    loginFrame = f;
                    loginSel = 'input[name="userid_work"]';
                    break;
                }
            }

            if (loginFrame) {
                await loginFrame.type(loginSel, 'admin');
                await loginFrame.evaluate(() => {
                    const btn = document.querySelector('input[type="submit"][value="Login"]');
                    if (btn) btn.click();
                });
                await delay(4000);
            }
        }
    }

    let workFrame = null;
    for (let i = 0; i < 10; i++) {
        workFrame = page.frames().find(f => f.name() === 'work');
        if (workFrame) break;
        await delay(1000);
    }

    if (workFrame) {
        try {
            const okBtn = await workFrame.$('input[value="OK"]');
            if (okBtn) {
                await workFrame.evaluate(() => {
                    const btn = document.querySelector('input[value="OK"]');
                    if (btn) btn.click();
                });
                await delay(2000);
            }
        } catch (e) {}
    }

    for (let i = 0; i < 10; i++) {
        workFrame = page.frames().find(f => f.name() === 'work');
        if (workFrame) break;
        await delay(1000);
    }

    return { browser, page, workFrame };
}

async function closePrinterSession(page, browser) {
    if (page) {
        try {
            const headerFrame = page.frames().find(f => f.name() === 'header');
            if (headerFrame) {
                await headerFrame.evaluate(() => {
                    const logout = document.querySelector('a[href*="logout.cgi"]');
                    if (logout) logout.click();
                });
                await delay(1000);
            }
        } catch (e) {}
    }
    if (browser) {
        try { await browser.close(); } catch (e) {}
    }
}

async function applyEntryAuthPermissions(workFrame, ip, entryId, { allowCopyBw, allowCopyColor, allowPrintBw = true, allowPrintColor = true, skipIfUnchanged = false }) {
    await workFrame.evaluate((id) => {
        if (window.g_objAdrsSelectEntry && window.Edit) {
            window.g_objAdrsSelectEntry.selectIdList = [id];
            window.Edit();
        }
    }, entryId);
    await delay(2500);

    await workFrame.evaluate(() => {
        const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const auth = cbs.find(c => c.value === 'AUTH');
        if (auth && !auth.checked) auth.click();
        const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
        const next = btns.find(b => b.value === 'Go to Next');
        if (next) next.click();
    });
    await delay(2500);

    const step1Result = await workFrame.evaluate((p) => {
        let changed = 0;
        const setBox = (val, desired) => {
            const cb = document.querySelector(`input[value="${val}"]`);
            if (cb && cb.checked !== desired) {
                cb.click();
                changed++;
            }
        };
        setBox('COPY_BW', p.allowCopyBw);
        ['COPY_FC', 'COPY_TC', 'COPY_MC'].forEach(v => setBox(v, p.allowCopyColor));
        if (p.updatePrint) {
            setBox('PRT_BW', p.allowPrintBw);
            setBox('PRT_FC', p.allowPrintColor);
        }

        const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
        if (p.skipIfUnchanged && changed === 0) {
            const cancelBtn = btns.find(b => b.value === 'Cancel');
            if (cancelBtn) cancelBtn.click();
            return { changed: 0, committed: false, skipped: true };
        }
        const next = btns.find(b => b.value === 'Go to Next');
        if (next) next.click();
        return { changed, committed: true, skipped: false };
    }, { allowCopyBw, allowCopyColor, allowPrintBw, allowPrintColor, updatePrint: true, skipIfUnchanged });

    if (step1Result.skipped) {
        await delay(1000);
        await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await loadAllAddressBookEntries(workFrame);
        return { changed: 0, committed: false };
    }

    await delay(2000);
    const step2Result = await workFrame.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
        const ok = btns.find(b => b.value === 'OK');
        if (ok) { ok.click(); return true; }
        return false;
    });
    await delay(2000);
    await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await loadAllAddressBookEntries(workFrame);
    return { changed: step1Result.changed, committed: step2Result };
}

/**
 * Automates logging into Ricoh Web Image Monitor and modifying user permission (granular COPY_BW vs COPY_FC/TC/MC)
 */
async function setPrinterUserCopierPermission(ip, userCode, permissions, executablePath) {
    const perms = typeof permissions === 'object' && permissions !== null
        ? { allowBw: permissions.allowBw !== false, allowColor: permissions.allowColor !== false }
        : { allowBw: Boolean(permissions), allowColor: Boolean(permissions) };
    let browser = null;
    let page = null;
    try {
        const session = await openPrinterSession(ip, executablePath);
        browser = session.browser;
        page = session.page;
        const workFrame = session.workFrame;

        if (!workFrame) {
            console.error(`[COPIER SYNC ERROR] work frame not found on ${ip}`);
            return false;
        }

        await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const entries = await loadAllAddressBookEntries(workFrame);
        const targetEntry = entries.find(e => e.pin === String(userCode).trim());

        if (!targetEntry) {
            console.log(`[COPIER SYNC] PIN ${userCode} not registered in Address Book of ${ip}`);
            return true;
        }

        console.log(`[COPIER SYNC] Located entry on ${ip} for PIN ${userCode}: ${targetEntry.name} (ID: ${targetEntry.id})`);

        const res = await applyEntryAuthPermissions(workFrame, ip, targetEntry.id, {
            allowCopyBw: perms.allowBw,
            allowCopyColor: perms.allowColor,
            allowPrintBw: true,
            allowPrintColor: true,
            skipIfUnchanged: false
        });

        console.log(`[COPIER SYNC] Successfully updated Copier permission on ${ip} for PIN ${userCode} -> B/W=${perms.allowBw ? 'ALLOWED' : 'BLOCKED'}, Color=${perms.allowColor ? 'ALLOWED' : 'BLOCKED'} (Committed: ${res.committed})`);
        return true;
    } finally {
        await closePrinterSession(page, browser);
    }
}

/**
 * Blocks Photocopy & Print on all Ricoh Address Book PINs that are NOT registered as active in ricoh_device_quotas.
 */
async function lockUnregisteredRicohPins(org = (process.env.PLANT_CODE || 'TCF-KG')) {
    const db = getDb(org);
    const activeQuotas = await db('ricoh_device_quotas').where('status', 'active').select('user_code');
    const allowedPins = new Set(activeQuotas.map(q => String(q.user_code || '').trim()).filter(Boolean));
    if (allowedPins.size === 0) {
        console.warn(`[ROGUE PIN GUARD] [${org}] Aborted: 0 active PINs in ricoh_device_quotas.`);
        return { success: false, reason: 'No active PINs in DB' };
    }

    const exe = getBrowserExecutable();
    if (!exe) {
        console.log(`[ROGUE PIN GUARD] Chrome executable not available.`);
        return { success: false, reason: 'Chrome not available' };
    }

    const printerIps = org === 'TCF-KG' ? ['192.168.27.11', '192.168.27.12'] : ['192.168.2.11', '192.168.2.10'];
    const summary = [];

    for (const ip of printerIps) {
        let browser = null;
        let page = null;
        const printerResult = { ip, totalEntries: 0, unregisteredFound: 0, newlyBlocked: [], alreadyBlocked: [], errors: [] };
        try {
            const session = await openPrinterSession(ip, exe);
            browser = session.browser;
            page = session.page;
            const workFrame = session.workFrame;

            if (!workFrame) {
                printerResult.errors.push('work frame not found (possible SESSIONFULL)');
                summary.push(printerResult);
                continue;
            }

            await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const entries = await loadAllAddressBookEntries(workFrame);
            printerResult.totalEntries = entries.length;

            if (entries.length === 0) {
                printerResult.errors.push('Address book returned 0 entries (possible SESSIONFULL)');
                summary.push(printerResult);
                continue;
            }

            const rogueEntries = entries.filter(e => e.pin && !allowedPins.has(e.pin));
            printerResult.unregisteredFound = rogueEntries.length;

            for (const entry of rogueEntries) {
                try {
                    const res = await applyEntryAuthPermissions(workFrame, ip, entry.id, {
                        allowCopyBw: false,
                        allowCopyColor: false,
                        allowPrintBw: false,
                        allowPrintColor: false,
                        skipIfUnchanged: true
                    });
                    if (res.changed > 0) {
                        printerResult.newlyBlocked.push({ pin: entry.pin, name: entry.name });
                        console.log(`[ROGUE PIN GUARD] [${org}] BLOCKED unregistered PIN ${entry.pin} (${entry.name}) on ${ip}`);
                        await db('ricoh_system_logs').insert({
                            event_type: 'ROGUE_PIN_BLOCKED',
                            message: `Blocked unregistered PIN ${entry.pin} (${entry.name}) on ${ip} (Copy & Print disabled)`
                        }).catch(() => {});
                    } else {
                        printerResult.alreadyBlocked.push({ pin: entry.pin, name: entry.name });
                    }
                } catch (entryErr) {
                    printerResult.errors.push(`PIN ${entry.pin}: ${entryErr.message}`);
                    await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
                    await loadAllAddressBookEntries(workFrame).catch(() => {});
                }
            }
        } catch (err) {
            printerResult.errors.push(err.message);
        } finally {
            await closePrinterSession(page, browser);
        }
        summary.push(printerResult);
    }

    return { success: true, org, allowedPinsCount: allowedPins.size, summary };
}

const lastRogueSweepByOrg = {};
const runningRogueSweepByOrg = {};
async function maybeLockUnregisteredPins(org = (process.env.PLANT_CODE || 'TCF-KG'), intervalMs = 30 * 60 * 1000) {
    const now = Date.now();
    if (runningRogueSweepByOrg[org]) return null;
    if (lastRogueSweepByOrg[org] && (now - lastRogueSweepByOrg[org]) < intervalMs) {
        return null;
    }
    runningRogueSweepByOrg[org] = true;
    lastRogueSweepByOrg[org] = now;
    try {
        return await lockUnregisteredRicohPins(org);
    } finally {
        runningRogueSweepByOrg[org] = false;
    }
}

/**
 * Unlocks all copiers (used by monthly billing cycle reset)
 */
async function unlockAllCopiers(org = (process.env.PLANT_CODE || 'TCF-KG')) {
    try {
        const db = getDb(org);
        const previouslyLocked = await db('ricoh_device_quotas')
            .where('copier_status', '!=', 'active')
            .orWhere('copier_bw_status', 'locked')
            .orWhere('copier_color_status', 'locked')
            .select('user_code');

        await db('ricoh_device_quotas').update({
            copier_status: 'active',
            copier_bw_status: 'active',
            copier_color_status: 'active'
        });
        console.log('[COPIER LOCK] All device copier B/W & Color statuses reset to "active".');

        for (const dev of previouslyLocked) {
            if (dev.user_code) {
                syncCopierPermissionToPrinters(dev.user_code, { allowBw: true, allowColor: true }, org).catch(() => {});
            }
        }
    } catch (err) {
        console.error('[COPIER LOCK] Error in unlockAllCopiers:', err.message);
    }
}

module.exports = {
    checkAndEnforceCopierQuotas,
    syncCopierPermissionToPrinters,
    unlockAllCopiers,
    lockUnregisteredRicohPins,
    maybeLockUnregisteredPins
};
