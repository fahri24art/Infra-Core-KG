const puppeteer = require('puppeteer-core');
const fs = require('fs');

const EXECUTABLE_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

async function getBrowser() {
    let executablePath = null;
    for (const path of EXECUTABLE_PATHS) {
        if (fs.existsSync(path)) {
            executablePath = path;
            break;
        }
    }
    return await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
}

function delay(time) { return new Promise(resolve => setTimeout(resolve, time)); }

async function scrapeHeaders() {
    const browser = await getBrowser();
    try {
        const page = await browser.newPage();
        await page.goto(`http://192.168.2.11/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
        
        let headerFrame = page.frames().find(f => f.name() === 'header');
        if (headerFrame && await headerFrame.$('a[href*="authForm.cgi"]')) {
            await headerFrame.click('a[href*="authForm.cgi"]');
            await delay(2000);
        }
        
        for (const frame of page.frames()) {
            if (await frame.$('input[name="loginid_work"]')) {
                await frame.type('input[name="loginid_work"]', 'admin');
                await frame.click('input[type="submit"][value="Login"]');
                await delay(3000);
                break;
            }
        }

        let workFrame = page.frames().find(f => f.name() === 'work');
        if (workFrame && await workFrame.$('input[value="OK"]')) {
            await workFrame.click('input[value="OK"]');
            await delay(2000);
        }
        
        await page.goto(`http://192.168.2.11/web/entry/en/websys/status/getUserCounter.cgi`, { waitUntil: 'networkidle2' });
        await delay(2000);

        let targetFrame = page.frames().find(f => f.name() === 'work') || page;
        
        const html = await targetFrame.evaluate(() => {
            const tables = document.querySelectorAll('table.adTable, table.common_table');
            if (tables.length > 0) return tables[0].innerHTML.substring(0, 2000);
            return "No table found";
        });
        
        console.log("HTML Start:", html);

    } finally {
        await browser.close();
    }
}

scrapeHeaders().catch(console.error);
