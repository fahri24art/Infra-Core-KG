
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function checkButtons() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    const page = await browser.newPage();
    const ip = '192.168.2.11';
    await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
    await delay(1500);

    // Login admin
    let headerFrame = page.frames().find(f => f.name() === 'header');
    if (headerFrame) {
        const hasLogin = await headerFrame.$('a[href*="authForm.cgi"]');
        if (hasLogin) {
            await headerFrame.evaluate(() => document.querySelector('a[href*="authForm.cgi"]').click());
            await delay(2000);
            let loginFrame = page.frames().find(f => f.name() === 'work');
            if (loginFrame) {
                const sel = await loginFrame.$('input[name="loginid_work"]') ? 'input[name="loginid_work"]' : 'input[name="userid_work"]';
                await loginFrame.type(sel, 'admin');
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

    // Edit 81
    await workFrame.evaluate(() => {
        window.g_objAdrsSelectEntry.selectIdList = [81];
        window.Edit();
    });
    await delay(3000);

    const f = page.frames().find(f => f.name() === 'work');
    const buttons = await f.$$eval('input[type="submit"], input[type="button"], button, a.btn', els => els.map(e => ({
        type: e.type,
        value: e.value,
        id: e.id,
        name: e.name,
        onclick: e.getAttribute('onclick'),
        outerHTML: e.outerHTML
    })));
    console.log("Buttons found on Edit form:", JSON.stringify(buttons, null, 2));

    await browser.close();
}
checkButtons().catch(e => console.error(e));
