const puppeteer = require('puppeteer-core');

async function test() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    
    const page = await browser.newPage();
    console.log("Navigating directly to counter page...");
    await page.goto('http://192.168.2.11/web/entry/en/websys/status/getUserCounter.cgi', { waitUntil: 'networkidle2' });
    
    await page.screenshot({ path: 'C:\\Users\\Administrator.DESKTOP-4O314L4\\.gemini\\antigravity\\brain\\6aefbde1-c309-4241-aad1-5ee235ef1090\\debug_counter.png' });
    console.log("Screenshot saved.");
    await browser.close();
}

test().catch(console.error);
