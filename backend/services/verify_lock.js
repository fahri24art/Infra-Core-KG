
const puppeteer = require('puppeteer-core');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function verify() {
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
    await delay(5000);

    // Edit 81
    await workFrame.evaluate(() => {
        window.g_objAdrsSelectEntry.selectIdList = [81];
        window.Edit();
    });
    await delay(3000);

    await workFrame.evaluate(() => {
        const authCb = document.querySelector('input[value="AUTH"]');
        if (authCb) {
            authCb.checked = true;
            document.querySelector('input[value="Go to Next"]').click();
        }
    });
    await delay(4000);

    const states = await workFrame.$$eval('input[name="availableFuncIn"]', els => els.map(e => ({
        val: e.value,
        checked: e.checked
    })));
    console.log("FINAL CHECKBOX STATES ON RICOH 2.11 FOR PIN 9895:", JSON.stringify(states, null, 2));

    await browser.close();
}
verify().catch(e => console.error(e));
