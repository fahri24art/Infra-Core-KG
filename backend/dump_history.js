const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function checkJobHistory() {
    const browser = await puppeteer.launch({ 
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'] 
    });
    
    try {
        const page = await browser.newPage();
        await page.goto(`http://192.168.2.11/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2', timeout: 30000 });
        
        let headerFrame = page.frames().find(f => f.name() === 'header');
        if (headerFrame) {
            const loginBtn = await headerFrame.$('a[href*="authForm.cgi"]');
            if (loginBtn) { await loginBtn.click(); await new Promise(r => setTimeout(r, 2000)); }
        }
        
        let loginFrame = page.frames().find(f => f.$('input[name="loginid_work"]'));
        if (loginFrame) {
            await loginFrame.type('input[name="loginid_work"]', 'admin');
            await loginFrame.click('input[type="submit"][value="Login"]');
            await new Promise(r => setTimeout(r, 3000));
        }

        await page.goto(`http://192.168.2.11/web/entry/en/webprinter/jobHistory.cgi`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));
        
        let targetFrame = page.frames().find(f => f.name() === 'work') || page;
        const html = await targetFrame.evaluate(() => document.body.innerHTML);
        fs.writeFileSync('job_history_dump.html', html);
        console.log('Saved to job_history_dump.html');
        
    } catch(e) {
        console.log(e);
    } finally {
        await browser.close();
    }
}
checkJobHistory();
