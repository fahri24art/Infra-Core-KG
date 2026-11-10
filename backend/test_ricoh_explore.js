const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function run() {
    const browser = await puppeteer.launch({ 
        executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe', 
        headless: 'new', 
        args: ['--no-sandbox', '--ignore-certificate-errors'] 
    });
    const page = await browser.newPage();
    
    try {
        console.log('Navigating to mainFrame...');
        await page.goto('http://192.168.2.11/web/guest/en/websys/webArch/mainFrame.cgi', { waitUntil: 'networkidle2' });
        
        console.log('Dumping frames...');
        for(const f of page.frames()) {
            const name = f.name() || 'unnamed';
            const html = await f.evaluate(() => document.body.innerHTML);
            fs.writeFileSync(`frame_${name}.html`, html);
            console.log(`Saved frame_${name}.html`);
        }
        
        console.log('Dumping frames...');
        for(const f of page.frames()) {
            const name = f.name() || 'unnamed';
            const html = await f.evaluate(() => document.body.innerHTML);
            fs.writeFileSync(`frame_${name}.html`, html);
            console.log(`Saved frame_${name}.html`);
        }
        
    } catch(e) { 
        console.error(e); 
    }
    await browser.close();
}
run();
