
const puppeteer = require('puppeteer-core');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function inspect(ip, userCode) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(30000);
        await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
        await delay(2000);

        // Login
        let headerFrame = page.frames().find(f => f.name() === 'header');
        if (headerFrame) {
            try {
                const hasLogin = await headerFrame.$('a[href*="authForm.cgi"]');
                if (hasLogin) {
                    await headerFrame.evaluate(() => document.querySelector('a[href*="authForm.cgi"]').click());
                    await delay(2500);
                    let loginFrame = null, loginSel = null;
                    for (const f of page.frames()) {
                        if (await f.$('input[name="loginid_work"]')) { loginFrame = f; loginSel = 'input[name="loginid_work"]'; break; }
                        else if (await f.$('input[name="userid_work"]')) { loginFrame = f; loginSel = 'input[name="userid_work"]'; break; }
                    }
                    if (loginFrame) {
                        await loginFrame.type(loginSel, 'admin');
                        await loginFrame.evaluate(() => document.querySelector('input[type="submit"][value="Login"]').click());
                        await delay(4000);
                    }
                }
            } catch(e) {
                console.log("Login err:", e.message);
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
        
        for (let i = 0; i < 15; i++) {
            const ready = await workFrame.evaluate(() => !!(window.g_objListEntry && window.g_objListEntry.entryHash && Object.keys(window.g_objListEntry.entryHash).length > 0));
            if (ready) break;
            await delay(1000);
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

        console.log("Found targetEntry:", targetEntry);

        // Edit
        await workFrame.evaluate((id) => {
            window.g_objAdrsSelectEntry.selectIdList = [id];
            window.Edit();
        }, targetEntry.id);
        await delay(3000);

        // Select AUTH
        await workFrame.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            const auth = cbs.find(c => c.value === 'AUTH');
            if (auth && !auth.checked) auth.click();
            const btns = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'));
            const next = btns.find(b => b.value === 'Go to Next');
            if (next) next.click();
        });
        await delay(3000);

        // Read all checkboxes and radio buttons in Step 1
        const inputs = await workFrame.evaluate(() => {
            return Array.from(document.querySelectorAll('input')).map(inp => ({
                name: inp.name,
                type: inp.type,
                value: inp.value,
                checked: inp.checked,
                disabled: inp.disabled,
                text: inp.parentElement ? inp.parentElement.innerText.trim() : ''
            })).filter(x => x.type === 'checkbox' || x.type === 'radio');
        });

        console.log("STEP 1 INPUTS:", JSON.stringify(inputs, null, 2));

        // Explicit logout
        headerFrame = page.frames().find(f => f.name() === 'header');
        if (headerFrame) {
            await headerFrame.evaluate(() => {
                const logout = document.querySelector('a[href*="logout.cgi"]');
                if (logout) logout.click();
            });
            await delay(1500);
            console.log("Explicitly logged out.");
        }
    } finally {
        await browser.close();
    }
}

inspect('192.168.2.11', '9895').catch(e => console.error(e));
