
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function inspectStep2() {
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

    // Select entry 81 (DESKTOP-GSASLJS - PIN 9895)
    console.log("Calling window.Edit()...");
    await workFrame.evaluate(() => {
        window.g_objAdrsSelectEntry.selectIdList = [81];
        window.Edit();
    });
    await delay(3000);

    // Check User Authentication checkbox (value="AUTH")
    console.log("Checking User Authentication (AUTH)...");
    const authChecked = await workFrame.evaluate(() => {
        const authCb = document.querySelector('input[value="AUTH"]');
        if (authCb) {
            authCb.checked = true;
            return true;
        }
        return false;
    });
    console.log("Auth checked:", authChecked);

    // Click "Go to Next"
    console.log("Clicking Go to Next...");
    await workFrame.evaluate(() => {
        const nextBtn = document.querySelector('input[value="Go to Next"]');
        if (nextBtn) nextBtn.click();
    });
    await delay(4000);

    // Inspect the new page/frame
    workFrame = page.frames().find(f => f.name() === 'work') || page;
    console.log("New workFrame URL:", workFrame.url());

    // Find all checkboxes related to COPY
    const copyCheckboxes = await workFrame.$$eval('input[type="checkbox"]', els => els.map(e => ({
        name: e.name,
        value: e.value,
        checked: e.checked,
        outerHTML: e.outerHTML
    })));
    console.log("Checkboxes on Step 2:", JSON.stringify(copyCheckboxes.filter(c => c.name.includes('Func') || c.value.includes('COPY') || c.value.includes('PRT')), null, 2));

    // Find buttons on Step 2
    const buttons = await workFrame.$$eval('input[type="submit"], input[type="button"], button', els => els.map(e => ({
        value: e.value,
        name: e.name,
        onclick: e.getAttribute('onclick')
    })));
    console.log("Buttons on Step 2:", JSON.stringify(buttons, null, 2));

    await page.screenshot({ path: '/tmp/ricoh_auth_step2.png', fullPage: true });
    console.log("Screenshot saved to /tmp/ricoh_auth_step2.png");

    await browser.close();
}

inspectStep2().catch(e => console.error("STEP 2 ERROR:", e));
