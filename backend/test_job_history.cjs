const puppeteer = require('puppeteer-core');
const fs = require('fs');
async function run() {
    const browser = await puppeteer.launch({ executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe', headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors'] });
    const page = await browser.newPage();
    try {
        await page.goto('http://192.168.2.11/web/guest/en/websys/webArch/mainFrame.cgi', { waitUntil: 'networkidle2' });
        
        let headerFrame = null;
        for(let i=0; i<15; i++) {
            headerFrame = page.frames().find(f => f.name() === 'header');
            if (headerFrame) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (headerFrame) {
            const loginBtn = await headerFrame.$('a[href*="authForm.cgi"]');
            if (loginBtn) { await loginBtn.click(); await new Promise(r => setTimeout(r, 3000)); }
        }
        
        let loginFrame = page.frames().find(f => f.$('input[name="loginid_work"]') || f.$('input[name="userid_work"]'));
        if (!loginFrame) {
            for(const f of page.frames()) {
                if (await f.$('input[name="loginid_work"]') || await f.$('input[name="userid_work"]')) { loginFrame = f; break; }
            }
        }
        if (loginFrame) {
            let loginSelector = await loginFrame.$('input[name="loginid_work"]') ? 'input[name="loginid_work"]' : 'input[name="userid_work"]';
            await loginFrame.type(loginSelector, 'admin');
            await loginFrame.click('input[type="submit"][value="Login"]');
            await new Promise(r => setTimeout(r, 5000));
        }
        
        // Try to access Job History
        await page.goto('http://192.168.2.11/web/entry/en/websys/job/jobHistory.cgi', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000));
        
        let targetFrame = page.frames().find(f => f.name() === 'work') || page;
        const html = await targetFrame.evaluate(() => document.body.innerHTML);
        fs.writeFileSync('C:\\Users\\Administrator.DESKTOP-4O314L4\\OneDrive - PT. TRI CENTRUM FORTUNA (1)\\Documents\\TCF Project Infra\\job_history.html', html);
        console.log('Saved job_history.html');
        
    } catch(e) { console.error(e); }
    await browser.close();
}
run();
