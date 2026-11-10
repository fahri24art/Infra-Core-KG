
const puppeteer = require('puppeteer-core');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function setCopierPermission(ip, userCode, allow) {
    console.log(`[TEST] Setting Copier permission on ${ip} for PIN ${userCode} -> allow=${allow}...`);
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
        await delay(5000);

        // Find entry by PIN (data[4])
        const targetEntry = await workFrame.evaluate((pin) => {
            if (!window.g_objListEntry || !window.g_objListEntry.entryHash) return null;
            for (const [id, data] of Object.entries(window.g_objListEntry.entryHash)) {
                if (data && String(data[4]) === String(pin)) {
                    return { id: Number(id), name: data[3] };
                }
            }
            return null;
        }, userCode);

        if (!targetEntry) {
            console.error(`[TEST] Entry for PIN ${userCode} NOT FOUND on ${ip}!`);
            return false;
        }

        console.log(`[TEST] Located entry: ${targetEntry.name} (ID: ${targetEntry.id})`);

        // Step 1: Open Wizard Edit
        await workFrame.evaluate((id) => {
            window.g_objAdrsSelectEntry.selectIdList = [id];
            window.Edit();
        }, targetEntry.id);
        await delay(3000);

        // Step 2: In "Change Registration", select "User Authentication" and Go to Next
        const authSelected = await workFrame.evaluate(() => {
            const authCb = document.querySelector('input[value="AUTH"]');
            if (authCb) {
                authCb.checked = true;
                const nextBtn = document.querySelector('input[value="Go to Next"]');
                if (nextBtn) nextBtn.click();
                return true;
            }
            return false;
        });
        console.log(`[TEST] Auth selected & clicked Go to Next: ${authSelected}`);
        await delay(4000);

        // Step 3: Toggle Copier checkboxes
        const toggleResult = await workFrame.evaluate((allowCopier) => {
            const copyVals = ['COPY_FC', 'COPY_TC', 'COPY_MC', 'COPY_BW'];
            let changed = 0;
            copyVals.forEach(val => {
                const cb = document.querySelector(`input[name="availableFuncIn"][value="${val}"]`);
                if (cb && cb.checked !== allowCopier) {
                    cb.click();
                    changed++;
                }
            });

            // Click OK / Save button
            const okBtn = document.querySelector('input[type="button"][value="OK"]') ||
                          document.querySelector('input[value="OK"]');
            if (okBtn) {
                okBtn.click();
                return { success: true, changed, submitted: true };
            }
            return { success: true, changed, submitted: false };
        }, allow);

        console.log(`[TEST] Toggle result:`, JSON.stringify(toggleResult));
        await delay(4000);
        console.log(`[TEST] Successfully pushed hardware permission on ${ip} for PIN ${userCode}!`);
        return true;
    } finally {
        await browser.close();
    }
}

async function run() {
    await setCopierPermission('192.168.2.11', '9895', false);
    await setCopierPermission('192.168.2.10', '9895', false);
}
run().catch(e => console.error("RUN ERROR:", e));
