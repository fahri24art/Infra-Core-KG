const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        // Let's authenticate first since it's /ict/admin/documents
        await page.goto('http://192.168.1.66:5000/login/admin', { waitUntil: 'networkidle2' });
        
        try {
            await page.type('input[type="text"]', 'admin');
            await page.type('input[type="password"]', 'admin');
            await page.click('button[type="submit"], input[type="submit"], button:not([type="button"])');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(e => console.log('Navigation wait timeout, proceeding anyway'));
        } catch(e) {
            console.log('Login form not found or failed, maybe already logged in or different selector');
        }

        await page.goto('http://192.168.1.66:5000/ict/admin/documents', { waitUntil: 'networkidle2' });
        
        // wait for table to load
        await new Promise(r => setTimeout(r, 2000));
        
        const text = await page.evaluate(() => {
            return document.body.innerText;
        });
        console.log(text);
        
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
