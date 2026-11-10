
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function debugWizard() {
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

    // Select entry 81
    await workFrame.evaluate(() => {
        window.g_objAdrsSelectEntry.selectIdList = [81];
        window.Edit();
    });
    await delay(3000);

    // Take screenshot 1: Change Registration modal
    await page.screenshot({ path: '/tmp/wiz_1_modal.png' });
    console.log("Screenshot 1 saved.");

    // Check AUTH checkbox via click()
    const clickedAuth = await workFrame.evaluate(() => {
        const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const auth = cbs.find(c => c.value === 'AUTH');
        if (auth) {
            auth.click();
            return { found: true, checked: auth.checked };
        }
        return { found: false, allVals: cbs.map(c => c.value) };
    });
    console.log("Clicked AUTH:", JSON.stringify(clickedAuth));

    await page.screenshot({ path: '/tmp/wiz_2_auth_checked.png' });

    // Click Go to Next
    const clickedNext = await workFrame.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
        const next = btns.find(b => b.value === 'Go to Next');
        if (next) {
            next.click();
            return { found: true, val: next.value };
        }
        return { found: false };
    });
    console.log("Clicked Next:", JSON.stringify(clickedNext));
    await delay(3000);

    await page.screenshot({ path: '/tmp/wiz_3_after_next.png' });
    console.log("Screenshot 3 saved.");

    // Now look for COPY_BW
    const copyStatus = await workFrame.evaluate(() => {
        const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        const copyBw = cbs.find(c => c.value === 'COPY_BW');
        if (copyBw) {
            return { found: true, checked: copyBw.checked };
        }
        return { found: false, allVals: cbs.map(c => c.value) };
    });
    console.log("Copy BW status on Step 2:", JSON.stringify(copyStatus));

    // If found, uncheck it and click OK
    if (copyStatus.found) {
        const uncheckResult = await workFrame.evaluate(() => {
            const copyVals = ['COPY_FC', 'COPY_TC', 'COPY_MC', 'COPY_BW'];
            let modified = [];
            copyVals.forEach(v => {
                const cb = document.querySelector(`input[value="${v}"]`);
                if (cb && cb.checked) {
                    cb.click();
                    modified.push(v);
                }
            });
            // Click OK
            const okBtn = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]')).find(b => b.value === 'OK');
            if (okBtn) {
                okBtn.click();
                return { modified, okClicked: true };
            }
            return { modified, okClicked: false };
        });
        console.log("Unchecked & submitted:", JSON.stringify(uncheckResult));
        await delay(4000);
        await page.screenshot({ path: '/tmp/wiz_4_after_ok.png' });
        console.log("Screenshot 4 saved.");
    }

    await browser.close();
}

debugWizard().catch(e => console.error("DEBUG ERROR:", e));
