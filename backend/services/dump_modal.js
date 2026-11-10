
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function dumpModal() {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    const ip = '192.168.2.11';

    console.log("Loading mainFrame...");
    await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
    await delay(1500);

    // Login
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

    let workFrame = page.frames().find(f => f.name() === 'work');
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

    workFrame = page.frames().find(f => f.name() === 'work');
    console.log("Navigating to adrsList.cgi...");
    await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'networkidle2' });
    await delay(5000);

    // Select ID 81 (DESKTOP-GSASLJS)
    console.log("Selecting entry 81 and calling Edit()...");
    await workFrame.evaluate(() => {
        if (window.g_objAdrsSelectEntry && window.Edit) {
            window.g_objAdrsSelectEntry.selectIdList = [81];
            window.Edit();
        }
    });
    await delay(4000);

    // Now inspect all frames and forms inside workFrame or page
    for (const f of page.frames()) {
        const url = f.url();
        console.log("Frame URL:", url);
        const checkboxes = await f.$$eval('input[type="checkbox"]', els => els.map(e => ({
            name: e.name,
            value: e.value,
            checked: e.checked,
            id: e.id,
            outerHTML: e.outerHTML
        })));
        if (checkboxes.length > 0) {
            console.log(`Checkboxes in frame ${url}:`, JSON.stringify(checkboxes, null, 2));
        }

        const inputs = await f.$$eval('input', els => els.map(e => ({
            name: e.name,
            type: e.type,
            value: e.value
        })));
        console.log(`Inputs summary in frame ${url}: count=${inputs.length}`);
    }

    // Save screenshot
    await page.screenshot({ path: '/tmp/ricoh_edit_81.png', fullPage: true });
    console.log("Saved /tmp/ricoh_edit_81.png");

    await browser.close();
}

dumpModal().catch(e => console.error("DUMP ERROR:", e));
