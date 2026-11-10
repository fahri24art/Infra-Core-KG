
const puppeteer = require('puppeteer-core');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function check() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    const page = await browser.newPage();
    const ip = '192.168.2.11';
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
    await delay(4000);

    const hash = await workFrame.evaluate(() => {
        if (!window.g_objListEntry || !window.g_objListEntry.entryHash) return 'NO HASH';
        return window.g_objListEntry.entryHash[81] || 'NO ENTRY 81';
    });
    console.log("Entry 81 in entryHash:", JSON.stringify(hash));

    // Also search which entry has 9895
    const found = await workFrame.evaluate(() => {
        if (!window.g_objListEntry || !window.g_objListEntry.entryHash) return [];
        let res = [];
        for (const [id, data] of Object.entries(window.g_objListEntry.entryHash)) {
            if (JSON.stringify(data).includes('9895') || JSON.stringify(data).includes('GSASLJS')) {
                res.push({ id, data });
            }
        }
        return res;
    });
    console.log("Entries matching 9895 or GSASLJS:", JSON.stringify(found, null, 2));

    await browser.close();
}
check().catch(e => console.error(e));
