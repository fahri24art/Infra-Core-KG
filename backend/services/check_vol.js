
const puppeteer = require('puppeteer-core');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function checkVolumeLimit(ip) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
    try {
        const page = await browser.newPage();
        await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2' });
        await delay(2000);

        // Check links in left frame / menu
        let treeFrame = page.frames().find(f => f.name() === 'tree');
        if (treeFrame) {
            const links = await treeFrame.evaluate(() => {
                return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }));
            });
            console.log("Tree menu links:", JSON.stringify(links.filter(l => l.text.toLowerCase().includes('limit') || l.text.toLowerCase().includes('volume') || l.text.toLowerCase().includes('quota') || l.text.toLowerCase().includes('auth') || l.text.toLowerCase().includes('counter')), null, 2));
        }

        // Check if there is Print Volume Limitation URL
        // Typically http://<ip>/web/entry/en/websys/webArch/authVolume.cgi or similar
    } finally {
        await browser.close();
    }
}
checkVolumeLimit('192.168.2.11').catch(e => console.error(e));
