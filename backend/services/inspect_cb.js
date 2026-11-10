
const puppeteer = require('puppeteer-core');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function inspect(ip, pin) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    try {
        const page = await browser.newPage();
        await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
        await delay(2000);

        let headerFrame = page.frames().find(f => f.name() === 'header');
        if (headerFrame) {
            const hasLogin = await headerFrame.$('a[href*="authForm.cgi"]');
            if (hasLogin) {
                await headerFrame.evaluate(() => {
                    const a = document.querySelector('a[href*="authForm.cgi"]');
                    if (a) a.click();
                });
                await delay(2500);
                let loginFrame = null, loginSel = null;
                for (const f of page.frames()) {
                    if (await f.$('input[name="loginid_work"]')) { loginFrame = f; loginSel = 'input[name="loginid_work"]'; break; }
                    else if (await f.$('input[name="userid_work"]')) { loginFrame = f; loginSel = 'input[name="userid_work"]'; break; }
                }
                if (loginFrame) {
                    await loginFrame.type(loginSel, 'admin');
                    await loginFrame.evaluate(() => document.querySelector('input[type="submit"][value="Login"]').click());
                    await delay(5000);
                }
            }
        }

        let workFrame = null;
        for (let i = 0; i < 10; i++) {
            workFrame = page.frames().find(f => f.name() === 'work');
            if (workFrame) break;
            await delay(1000);
        }

        try {
            const okBtn = await workFrame.$('input[value="OK"]');
            if (okBtn) {
                await workFrame.evaluate(() => document.querySelector('input[value="OK"]').click());
                await delay(2000);
            }
        } catch(e) {}

        workFrame = page.frames().find(f => f.name() === 'work');
        await workFrame.goto(`http://${ip}/web/entry/en/address/adrsList.cgi`, { waitUntil: 'networkidle2' });
        
        for (let i = 0; i < 15; i++) {
            const ready = await workFrame.evaluate(() => !!(window.g_objListEntry && window.g_objListEntry.entryHash && Object.keys(window.g_objListEntry.entryHash).length > 0));
            if (ready) break;
            await delay(1000);
        }

        await workFrame.evaluate(() => {
            window.g_objAdrsSelectEntry.selectIdList = [81];
            window.Edit();
        });
        await delay(3000);

        await workFrame.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            const auth = cbs.find(c => c.value === 'AUTH');
            if (auth && !auth.checked) auth.click();
            const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
            const next = btns.find(b => b.value === 'Go to Next');
            if (next) next.click();
        });
        await delay(3000);

        const cbStates = await workFrame.evaluate(() => {
            return Array.from(document.querySelectorAll('input[type="checkbox"]')).map(cb => ({
                name: cb.name,
                value: cb.value,
                checked: cb.checked,
                parentText: cb.parentElement ? cb.parentElement.innerText.trim() : ''
            }));
        });
        console.log('CHECKBOXES_STATE:', JSON.stringify(cbStates, null, 2));

        // Explicit logout
        headerFrame = page.frames().find(f => f.name() === 'header');
        if (headerFrame) {
            await headerFrame.evaluate(() => {
                const logout = document.querySelector('a[href*="logout.cgi"]');
                if (logout) logout.click();
            });
            await delay(1000);
            console.log('Explicitly logged out.');
        }
    } finally {
        await browser.close();
    }
}
inspect('192.168.2.11', '9895').catch(e => console.error(e));
