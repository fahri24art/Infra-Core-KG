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
 * Checks all devices against their monthly_quota_copier and applies locks/unlocks
 */
async function checkAndEnforceCopierQuotas(org = 'TCF-SG') {
    try {
        const db = getDb(org);
        const devices = await db('ricoh_device_quotas')
            .where('status', 'active')
            .select('id', 'computer_name', 'user_code', 'current_usage_copier_bw', 'current_usage_copier_color', 'monthly_quota_copier', 'copier_status');

        for (const dev of devices) {
            const usageCopier = Number(dev.current_usage_copier_bw || 0) + Number(dev.current_usage_copier_color || 0);
            const quotaCopier = Number(dev.monthly_quota_copier || 200);

            // Condition 1: Quota Exceeded -> Lock
            if (usageCopier >= quotaCopier && dev.copier_status !== 'locked') {
                console.log(`[COPIER LOCK] [${org}] ⛔ Quota Exceeded for ${dev.computer_name} (PIN: ${dev.user_code}). Used: ${usageCopier}/${quotaCopier}. Locking copier...`);
                if (dev.user_code) {
                    await syncCopierPermissionToPrinters(dev.user_code, false, org);
                }
                await db('ricoh_device_quotas').where('id', dev.id).update({ copier_status: 'locked' });
                
                try {
                    await db('ricoh_system_logs').insert({
                        event_type: 'COPIER_LOCKED',
                        message: `Photocopy Auto-Locked: ${dev.computer_name} (PIN ${dev.user_code}) reached limit (${usageCopier}/${quotaCopier} pages).`
                    });
                } catch(e) {}

                // Dispatch WhatsApp alert to user immediately
                try {
                    const { getDeviceQuotaStatuses, sendQuotaWarning } = require('./ricoh_quota_notifier');
                    const quotaStatuses = await getDeviceQuotaStatuses(org);
                    const targetDev = quotaStatuses.find(d => d.id === dev.id);
                    if (targetDev) {
                        targetDev.current_threshold = 100;
                        await sendQuotaWarning(targetDev, org);
                    }
                } catch(notifErr) {
                    console.error('[COPIER LOCK] Failed to send WA alert:', notifErr.message);
                }
            }
            // Condition 2: Quota Under Limit but marked locked (Admin raised quota or reset) -> Auto-Unlock
            else if (usageCopier < quotaCopier && dev.copier_status === 'locked') {
                console.log(`[COPIER UNLOCK] [${org}] 🟢 Quota restored for ${dev.computer_name} (PIN: ${dev.user_code}). Used: ${usageCopier}/${quotaCopier}. Unlocking copier...`);
                
                await db('ricoh_device_quotas').where('id', dev.id).update({ copier_status: 'active' });
                try {
                    await db('ricoh_system_logs').insert({
                        event_type: 'COPIER_UNLOCKED',
                        message: `Photocopy Auto-Unlocked: ${dev.computer_name} (PIN ${dev.user_code}) is within quota (${usageCopier}/${quotaCopier} pages).`
                    });
                } catch(e) {}

                if (dev.user_code) {
                    syncCopierPermissionToPrinters(dev.user_code, true, org).catch(e => {
                        console.warn(`[COPIER UNLOCK] Hardware sync error for PIN ${dev.user_code}:`, e.message);
                    });
                }
            }
        }
    } catch (err) {
        console.error('[COPIER LOCK] Error in checkAndEnforceCopierQuotas:', err.message);
    }
}

/**
 * Pushes Copier function permission (enable/disable) for a PIN to Ricoh printers
 */
async function syncCopierPermissionToPrinters(userCode, allowCopier = true, org = 'TCF-SG') {
    const printerIps = org === 'TCF-KG' ? ['192.168.27.11', '192.168.27.12'] : ['192.168.2.11', '192.168.2.10'];
    console.log(`[COPIER SYNC] [${org}] Pushing Copier Permission (${allowCopier ? 'ENABLED' : 'DISABLED'}) for PIN: ${userCode} across printers ${printerIps.join(', ')}...`);

    const exe = getBrowserExecutable();
    if (!exe) {
        console.log(`[COPIER SYNC] Chrome executable not available. Hardware sync skipped.`);
        return false;
    }

    let overallSuccess = false;
    for (const ip of printerIps) {
        try {
            const success = await setPrinterUserCopierPermission(ip, userCode, allowCopier, exe);
            if (success) {
                overallSuccess = true;
            }
        } catch (err) {
            console.error(`[COPIER SYNC ERROR] Failed for printer ${ip} PIN ${userCode}:`, err.message);
        }
    }
    return overallSuccess;
}

/**
 * Automates logging into Ricoh Web Image Monitor and modifying user permission
 */
async function setPrinterUserCopierPermission(ip, userCode, allowCopier, executablePath) {
    let browser = null;
    let page = null;
    try {
        browser = await puppeteer.launch({
            executablePath,
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
        });

        page = await browser.newPage();
        page.setDefaultTimeout(30000);

        // 1. Navigate to main page
        await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
        await delay(1500);

        // 2. Perform Login if needed
        let headerFrame = page.frames().find(f => f.name() === 'header');
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

        // 3. Wait for work frame to be ready
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
            } catch(e) {}
        }

        // Re-acquire work frame in case navigation happened
        for (let i = 0; i < 10; i++) {
            workFrame = page.frames().find(f => f.name() === 'work');
            if (workFrame) break;
            await delay(1000);
        }

        if (!workFrame) {
            console.error(`[COPIER SYNC ERROR] work frame not found on ${ip}`);
            return false;
        }

        await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'networkidle2' });
        
        // Wait up to 15s for entryHash to be ready
        let hashReady = false;
        for (let i = 0; i < 15; i++) {
            hashReady = await workFrame.evaluate(() => {
                return !!(window.g_objListEntry && window.g_objListEntry.entryHash && Object.keys(window.g_objListEntry.entryHash).length > 0);
            });
            if (hashReady) break;
            await delay(1000);
        }

        if (!hashReady) {
            console.log(`[COPIER SYNC] entryHash not ready on ${ip} (possible SESSIONFULL or empty list)`);
            return false;
        }

        // Locate entry by PIN (data[4] in Ricoh address book)
        const targetEntry = await workFrame.evaluate((pin) => {
            if (!window.g_objListEntry || !window.g_objListEntry.entryHash) return null;
            for (const [id, data] of Object.entries(window.g_objListEntry.entryHash)) {
                if (data && String(data[4]).replace(/[\\[\\]]/g, '').trim() === String(pin).trim()) {
                    return { id: Number(id), index: data[2], name: data[3] };
                }
            }
            return null;
        }, userCode);

        if (!targetEntry) {
            console.log(`[COPIER SYNC] PIN ${userCode} not registered in Address Book of ${ip}`);
            return true; // Not an error, just not on this machine
        }

        console.log(`[COPIER SYNC] Located entry on ${ip} for PIN ${userCode}: ${targetEntry.name} (ID: ${targetEntry.id})`);
        
        // Step 1: Select entry and trigger Wizard Edit
        await workFrame.evaluate((id) => {
            if (window.g_objAdrsSelectEntry && window.Edit) {
                window.g_objAdrsSelectEntry.selectIdList = [id];
                window.Edit();
            }
        }, targetEntry.id);
        await delay(3000);

        // Step 2: In "Change Registration", select User Authentication (AUTH) and click "Go to Next"
        await workFrame.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            const auth = cbs.find(c => c.value === 'AUTH');
            if (auth && !auth.checked) auth.click();
            const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
            const next = btns.find(b => b.value === 'Go to Next');
            if (next) next.click();
        });
        await delay(3000);

        // Step 3: Step 1 (User Authentication) -> Toggle Copier checkboxes and click "Go to Next"
        const step1Result = await workFrame.evaluate((allow) => {
            const copyVals = ['COPY_FC', 'COPY_TC', 'COPY_MC', 'COPY_BW'];
            let changed = 0;
            copyVals.forEach(v => {
                const cb = document.querySelector(`input[value="${v}"]`);
                if (cb && cb.checked !== allow) {
                    cb.click();
                    changed++;
                }
            });
            const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
            const next = btns.find(b => b.value === 'Go to Next');
            if (next) next.click();
            return { changed, nextClicked: !!next };
        }, allowCopier);
        await delay(3000);

        // Step 4: Step 2 (Confirm Registration) -> Click "OK" to commit to hardware
        const step2Result = await workFrame.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
            const ok = btns.find(b => b.value === 'OK');
            if (ok) {
                ok.click();
                return true;
            }
            return false;
        });
        await delay(3000);

        console.log(`[COPIER SYNC] Successfully updated Copier permission on ${ip} for PIN ${userCode} -> ${allowCopier ? 'ALLOWED' : 'BLOCKED'} (Committed: ${step2Result})`);
        return true;
    } finally {
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
            } catch(e) {}
        }
        if (browser) await browser.close();
    }
}

/**
 * Unlocks all copiers (used by monthly billing cycle reset)
 */
async function unlockAllCopiers(org = 'TCF-SG') {
    try {
        const db = getDb(org);
        await db('ricoh_device_quotas').update({ copier_status: 'active' });
        console.log('[COPIER LOCK] All device copier statuses reset to "active".');
    } catch (err) {
        console.error('[COPIER LOCK] Error in unlockAllCopiers:', err.message);
    }
}

module.exports = {
    checkAndEnforceCopierQuotas,
    syncCopierPermissionToPrinters,
    unlockAllCopiers
};
