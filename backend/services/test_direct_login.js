const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function test() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    
    const page = await browser.newPage();
    console.log("Navigating directly to login page...");
    await page.goto('http://192.168.2.11/web/guest/en/websys/login/authForm.cgi', { waitUntil: 'networkidle2' });
    
    // Check if input userid_work exists
    const hasUserId = await page.$('input[name="loginid_work"]') || await page.$('input[name="userid_work"]');
    if (hasUserId) {
        console.log("Found login inputs directly!");
    } else {
        console.log("Login inputs not found.");
    }
    
    await browser.close();
}

test().catch(console.error);
