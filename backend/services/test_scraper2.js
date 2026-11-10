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

async function test() {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Instead of dealing with frames manually, we can use elementHandles or iterate all frames
    await page.goto('http://192.168.2.11/web/guest/en/websys/webArch/mainFrame.cgi', { waitUntil: 'networkidle2' });
    
    console.log("Frames found:", page.frames().map(f => f.name()));
    
    // Let's find the frame that contains the login button
    let loginFrame = null;
    for (const frame of page.frames()) {
        const hasLogin = await frame.$('a[href*="authForm.cgi"]');
        if (hasLogin) {
            loginFrame = frame;
            break;
        }
    }
    
    if (loginFrame) {
        console.log("Found login button in frame:", loginFrame.name());
        await loginFrame.click('a[href*="authForm.cgi"]');
        await page.waitForTimeout(3000);
        
        // Now find the login fields
        for (const frame of page.frames()) {
            const hasUser = await frame.$('input[name="loginid_work"], input[name="userid_work"]');
            if (hasUser) {
                console.log("Found login inputs in frame:", frame.name());
                
                // Ricoh usually uses loginid_work, not userid_work for the login form!
                const isLoginId = await frame.$('input[name="loginid_work"]');
                const selector = isLoginId ? 'input[name="loginid_work"]' : 'input[name="userid_work"]';
                
                await frame.type(selector, 'admin');
                // password blank
                await frame.click('input[type="submit"][value="Login"]');
                console.log("Clicked login.");
                break;
            }
        }
    }
    
    await page.waitForTimeout(5000);
    console.log("Post login frames:", page.frames().map(f => f.name()));
    
    await browser.close();
}

test().catch(console.error);
