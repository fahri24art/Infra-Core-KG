
const puppeteer = require('puppeteer-core');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function setCopierPermission(ip, userCode, allow) {
    console.log(`[CLEAN SYNC] Setting Copier permission on ${ip} for PIN ${userCode} -> allow=${allow}...`);
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(30000);
        await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
        await delay(1500);

        // Login
        let headerFrame = page.frames().find(f => f.name() === 'header');
        if (headerFrame) {
            const hasLogin = await headerFrame.$('a[href*="authForm.cgi"]');
            if (hasLogin) {
                await headerFrame.evaluate(() => document.querySelector('a[href*="authForm.cgi"]').click());
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
                    await loginFrame.evaluate(() => document.querySelector('input[type="submit"][value="Login"]').click());
                    await delay(4000);
                }
            }
        }

        let workFrame = page.frames().find(f => f.name() === 'work');
        try {
            const okBtn = await workFrame.$('input[value="OK"]');
            if (okBtn) {
                await workFrame.evaluate(() => document.querySelector('input[value="OK"]').click());
                await delay(2000);
            }
        } catch(e) {}

        workFrame = page.frames().find(f => f.name() === 'work');
        await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'networkidle2' });
        
        // Wait up to 15s for entryHash to be populated
        console.log(`[CLEAN SYNC] Waiting for entryHash...`);
        let hashReady = false;
        for (let i = 0; i < 15; i++) {
            hashReady = await workFrame.evaluate(() => {
                return !!(window.g_objListEntry && window.g_objListEntry.entryHash && Object.keys(window.g_objListEntry.entryHash).length > 0);
            });
            if (hashReady) break;
            await delay(1000);
        }
        console.log(`[CLEAN SYNC] entryHash ready: ${hashReady}`);

        if (!hashReady) {
            const text = await workFrame.evaluate(() => document.body ? document.body.innerText : '');
            console.log(`[CLEAN SYNC ERROR] Body text:`, text.replace(/\s+/g, ' ').slice(0, 200));
            return false;
        }

        // Locate entry by PIN
        const targetEntry = await workFrame.evaluate((pin) => {
            if (!window.g_objListEntry || !window.g_objListEntry.entryHash) return null;
            for (const [id, data] of Object.entries(window.g_objListEntry.entryHash)) {
                if (data && String(data[4]).replace(/[\[\]]/g, '').trim() === String(pin).trim()) {
                    return { id: Number(id), name: data[3] };
                }
            }
            return null;
        }, userCode);

        if (!targetEntry) {
            console.error(`[CLEAN SYNC] PIN ${userCode} not found in Address Book of ${ip}`);
            return false;
        }

        console.log(`[CLEAN SYNC] Found entry ${targetEntry.name} (ID: ${targetEntry.id})`);

        // 1. Open Wizard
        await workFrame.evaluate((id) => {
            window.g_objAdrsSelectEntry.selectIdList = [id];
            window.Edit();
        }, targetEntry.id);
        await delay(3000);

        // 2. Change Registration modal: check AUTH and click Go to Next
        await workFrame.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            const auth = cbs.find(c => c.value === 'AUTH');
            if (auth && !auth.checked) auth.click();
            const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
            const next = btns.find(b => b.value === 'Go to Next');
            if (next) next.click();
        });
        await delay(3000);

        // 3. Step 1 User Authentication: toggle Copier checkboxes (allow = true -> check them) and click Go to Next
        const step1Result = await workFrame.evaluate((allowCopier) => {
            const copyVals = ['COPY_FC', 'COPY_TC', 'COPY_MC', 'COPY_BW'];
            let changed = [];
            copyVals.forEach(v => {
                const cb = document.querySelector(`input[value="${v}"]`);
                if (cb && cb.checked !== allowCopier) {
                    cb.click();
                    changed.push(v);
                }
            });
            const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
            const next = btns.find(b => b.value === 'Go to Next');
            if (next) next.click();
            return { changed, nextClicked: !!next };
        }, allow);
        console.log(`[CLEAN SYNC] Step 1 (User Auth) result:`, JSON.stringify(step1Result));
        await delay(3000);

        // 4. Step 2 Confirm Registration: click OK
        const step2Result = await workFrame.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
            const ok = btns.find(b => b.value === 'OK');
            if (ok) {
                ok.click();
                return { okClicked: true };
            }
            return { okClicked: false };
        });
        console.log(`[CLEAN SYNC] Step 2 (Confirm) result:`, JSON.stringify(step2Result));
        await delay(3000);

        // 5. Explicitly LOGOUT to avoid SESSIONFULL
        headerFrame = page.frames().find(f => f.name() === 'header');
        if (headerFrame) {
            await headerFrame.evaluate(() => {
                const logout = document.querySelector('a[href*="logout.cgi"]');
                if (logout) logout.click();
            });
            await delay(1500);
            console.log(`[CLEAN SYNC] Explicitly logged out from ${ip}.`);
        }

        console.log(`[CLEAN SYNC] SUCCESS: Hardware Copier permission set to ${allow ? 'ALLOWED' : 'BLOCKED'} for PIN ${userCode} on ${ip}!`);
        return true;
    } finally {
        await browser.close();
    }
}

async function run() {
    await setCopierPermission('192.168.2.11', '9895', false);
}
run().catch(e => console.error("RUN ERROR:", e));
