
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function dumpHtml() {
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

    // Dump scripts and table from workFrame
    const content = await workFrame.content();
    fs.writeFileSync('/tmp/adrsList.html', content);
    console.log("adrsList.html saved! Length:", content.length);

    await browser.close();
}
dumpHtml().catch(e => console.error(e));
