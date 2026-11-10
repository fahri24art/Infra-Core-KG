const puppeteer = require('puppeteer-core');
const fs = require('fs');

const EXECUTABLE_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

async function run() {
    let executablePath = null;
    for (const path of EXECUTABLE_PATHS) {
        if (fs.existsSync(path)) {
            executablePath = path;
            break;
        }
    }

    if (!executablePath) {
        console.error("No browser executable found!");
        return;
    }

    console.log("Using browser:", executablePath);

    const browser = await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });

    const page = await browser.newPage();
    console.log("Navigating to 192.168.2.11...");
    
    // Some older Ricoh machines use http://, some use https://
    await page.goto('http://192.168.2.11/web/guest/en/websys/webArch/mainFrame.cgi', { waitUntil: 'networkidle2' });
    console.log("Page loaded. Title:", await page.title());

    await browser.close();
    console.log("Done.");
}

run().catch(console.error);
