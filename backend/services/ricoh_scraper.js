const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getDb } = require('../db');

const EXECUTABLE_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable'
];

async function getBrowser() {
    let executablePath = null;
    for (const executable of EXECUTABLE_PATHS) {
        if (fs.existsSync(executable)) {
            executablePath = executable;
            break;
        }
    }
    if (!executablePath) throw new Error("No browser executable found!");
    return await puppeteer.launch({
        executablePath,
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });
}

function delay(time) { return new Promise(resolve => setTimeout(resolve, time)); }

async function scrapeAndSyncDevice(ip, printerName, username = 'admin', password = '', org = 'TCF-SG') {
    const db = getDb(org || 'TCF-SG');
    console.log(`[SCRAPER] Starting scrape for ${ip} (${printerName}, org: ${org || 'TCF-SG'})...`);
    const browser = await getBrowser();
    const downloadBase = path.resolve(__dirname, 'downloads');
    const downloadPath = path.join(downloadBase, ip.replace(/[^a-zA-Z0-9]/g, '_'));
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }

    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);
        page.on('dialog', async dialog => {
            console.log(`[SCRAPER] Dialog popped up: ${dialog.message()}`);
            await dialog.accept();
        });
        
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
        });

        // Step 1: Go to Main Frame
        await page.goto(`http://${ip}/web/guest/en/websys/webArch/mainFrame.cgi`, { waitUntil: 'networkidle2', timeout: 60000 });
        console.log(`[SCRAPER] Main page loaded.`);
        
        let headerFrame = null;
        for (let i = 0; i < 15; i++) {
            headerFrame = page.frames().find(f => f.name() === 'header');
            if (headerFrame) break;
            await delay(1000);
        }

        if (headerFrame) {
            console.log(`[SCRAPER] Found header frame. Waiting for auth buttons...`);
            let isLoggedIn = false;
            
            try {
                // Wait for either login or logout button to appear
                await headerFrame.waitForFunction(() => {
                    return document.querySelector('a[href*="authForm.cgi"]') || document.querySelector('a[href*="logout.cgi"]');
                }, { timeout: 10000 });
                
                const hasLogout = await headerFrame.$('a[href*="logout.cgi"]');
                if (hasLogout) {
                    console.log(`[SCRAPER] Already logged in (Logout button found). Proceeding...`);
                    isLoggedIn = true;
                } else {
                    const hasLogin = await headerFrame.$('a[href*="authForm.cgi"]');
                    if (hasLogin) {
                        console.log(`[SCRAPER] Found login button. Clicking...`);
                        await headerFrame.evaluate(() => {
                            document.querySelector('a[href*="authForm.cgi"]').click();
                        });
                        await delay(3000);
                    }
                }
            } catch (e) {
                console.log(`[SCRAPER] Auth buttons not found in header.`);
            }

            if (!isLoggedIn) {
                // Step 2: Login form
                let loginFrame = null;
                let loginSelector = null;
                for (let i = 0; i < 15; i++) {
                    for (const frame of page.frames()) {
                        if (await frame.$('input[name="loginid_work"]')) {
                            loginFrame = frame;
                            loginSelector = 'input[name="loginid_work"]';
                            break;
                        } else if (await frame.$('input[name="userid_work"]')) {
                            loginFrame = frame;
                            loginSelector = 'input[name="userid_work"]';
                            break;
                        }
                    }
                    if (loginFrame) break;
                    await delay(1000);
                }

                if (loginFrame) {
                    console.log(`[SCRAPER] Found login form. Typing credentials...`);
                    await loginFrame.type(loginSelector, username);
                    if (password) await loginFrame.type('input[name="password_work"]', password);
                    await loginFrame.evaluate(() => {
                        const btn = document.querySelector('input[type="submit"][value="Login"]');
                        if (btn) btn.click();
                    });
                    await delay(5000); // wait for login to process
                    console.log(`[SCRAPER] Logged into ${ip}.`);
                } else {
                    console.log(`[SCRAPER] Login form frame not found.`);
                }
            }
        } else {
            console.log(`[SCRAPER ERROR] Header frame never loaded!`);
        }

        // Step 3: Handle security warning OK button
        let workFrame = page.frames().find(f => f.name() === 'work');
        if (workFrame) {
            try {
                const okBtn = await workFrame.$('input[value="OK"]');
                if (okBtn) {
                    console.log(`[SCRAPER] Security warning found. Clicking OK...`);
                    await workFrame.evaluate(() => {
                        const btn = document.querySelector('input[value="OK"]');
                        if (btn) btn.click();
                    });
                    await delay(3000);
                }
            } catch(e) {}
        }
        
        // Step 4: Navigate to Counter page
        console.log(`[SCRAPER] Navigating to Counter page...`);
        await page.goto(`http://${ip}/web/entry/en/websys/status/getUserCounter.cgi`, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(3000); // give it time to load the frame

        let targetFrame = null;
        for (let i = 0; i < 15; i++) {
            targetFrame = page.frames().find(f => f.name() === 'work') || page;
            const downloadBtn = await targetFrame.$('input[value="Download"]');
            if (downloadBtn) break;
            await delay(1000);
        }
        
        try {
            const downloadBtn = await targetFrame.$('input[value="Download"]');
            
            if (downloadBtn) {
                console.log(`[SCRAPER] Found Download CSV button. Clicking...`);
                fs.readdirSync(downloadPath).forEach(f => {
                    if (fs.lstatSync(path.join(downloadPath, f)).isFile()) {
                        fs.unlinkSync(path.join(downloadPath, f));
                    }
                });
                
                await targetFrame.evaluate(() => {
                    const btn = document.querySelector('input[value="Download"]');
                    if (btn) btn.click();
                });
                
                console.log(`[SCRAPER] Waiting for download...`);
                let csvFile = null;
                for (let i = 0; i < 20; i++) {
                    await delay(1000);
                    const files = fs.readdirSync(downloadPath);
                    const file = files.find(f => f.endsWith('.csv'));
                    if (file) {
                        const isDownloading = files.some(f => f.endsWith('.crdownload'));
                        if (!isDownloading) {
                            csvFile = path.join(downloadPath, file);
                            break;
                        }
                    }
                }

                if (csvFile) {
                    console.log(`[SCRAPER] Downloaded CSV: ${csvFile}`);
                    const csvData = fs.readFileSync(csvFile, 'utf8');
                    
                    const lines = csvData.split('\n').filter(l => l.trim().length > 0);
                    if (lines.length > 0) {
                        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
                        const userIdx = headers.findIndex(h => h.includes('User') && !h.includes('Name'));
                        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
                        const cleanHeaders = headers.map(h => h.replace(/\s+/g, ''));

                        // Accurately distinguish Printer PC prints from Copier/Photocopies
                        const printerBwIdx = cleanHeaders.findIndex(h => h.includes('Black&WhiteTotal(Printer)'));
                        const printerColorIdx = cleanHeaders.findIndex(h => h.includes('ColorTotal(Printer)') && !h.includes('Single') && !h.includes('Two'));
                        const copierBwIdx = cleanHeaders.findIndex(h => h.includes('Black&WhiteTotal(Copier'));
                        const copierColorIdx = cleanHeaders.findIndex(h => h.includes('FullColorTotal(Copier'));
                        const bwTotalIdx = cleanHeaders.findIndex(h => h.includes('B&W(TotalPrints)'));
                        const colorTotalIdx = cleanHeaders.findIndex(h => h.includes('Color(TotalPrints)') && !h.includes('Single'));
                        
                        let results = [];
                        for (let i = 1; i < lines.length; i++) {
                            const rowLine = lines[i].trim();
                            if (!rowLine) continue;
                            
                            // Regex to split by comma but ignore commas inside quotes, then strip surrounding quotes
                            const cols = rowLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                            
                            if (cols.length > userIdx) {
                                let userCode = cols[userIdx] || '';
                                userCode = userCode.replace(/\[|\]/g, '').trim();
                                const deviceName = nameIdx > -1 ? (cols[nameIdx] || '').trim() : (cols[1] || '').trim();
                                
                                const sumTotalBW = bwTotalIdx > -1 ? (parseInt(cols[bwTotalIdx] || '0') || 0) : 0;
                                const sumTotalColor = colorTotalIdx > -1 ? (parseInt(cols[colorTotalIdx] || '0') || 0) : 0;
                                const sumCopierBW = copierBwIdx > -1 ? (parseInt(cols[copierBwIdx] || '0') || 0) : 0;
                                const sumCopierColor = copierColorIdx > -1 ? (parseInt(cols[copierColorIdx] || '0') || 0) : 0;
                                
                                // Printer prints: use dedicated Printer columns, or fallback to Total - Copier
                                let sumPrinterBW = 0;
                                if (printerBwIdx > -1) {
                                    sumPrinterBW = parseInt(cols[printerBwIdx] || '0') || 0;
                                } else {
                                    sumPrinterBW = Math.max(0, sumTotalBW - sumCopierBW);
                                }
                                
                                let sumPrinterColor = 0;
                                if (printerColorIdx > -1) {
                                    sumPrinterColor = parseInt(cols[printerColorIdx] || '0') || 0;
                                } else {
                                    sumPrinterColor = Math.max(0, sumTotalColor - sumCopierColor);
                                }
                                
                                if (userCode) {
                                    results.push({ 
                                        userCode, 
                                        name: deviceName,
                                        sumBW: sumPrinterBW, 
                                        sumColor: sumPrinterColor, 
                                        sumCopierBW, 
                                        sumCopierColor 
                                    });
                                }
                            }
                        }
                        
                        console.log(`[SCRAPER] Parsed ${results.length} rows from CSV`);

                        if (results.length > 0) {
                            console.log(`[SCRAPER] Syncing to database... (first row userCode: ${results[0].userCode})`);
                            for (const row of results) {
                                // Auto-align device PIN in ricoh_device_quotas if device exists with missing or mismatched PIN
                                if (row.name && row.userCode) {
                                    const normalizedName = row.name.replace(/^ITC-/i, 'ICT-');
                                    await db('ricoh_device_quotas')
                                        .where(function() {
                                            this.whereRaw('LOWER(computer_name) = ?', [row.name.toLowerCase()])
                                                .orWhereRaw('LOWER(computer_name) = ?', [normalizedName.toLowerCase()]);
                                        })
                                        .where(function() {
                                            this.whereNull('user_code')
                                                .orWhere('user_code', '')
                                                .orWhere('user_code', '!=', row.userCode);
                                        })
                                        .update({ user_code: row.userCode });
                                }
                                // 1. Check user counters per printer
                                let counterRow = await db('ricoh_user_counters').where({ printer_ip: ip, user_code: row.userCode }).first();
                                let diffBW = 0;
                                let diffColor = 0;
                                let diffCopierBW = 0;
                                let diffCopierColor = 0;
                                
                                if (counterRow) {
                                    diffBW = row.sumBW - counterRow.lifetime_bw;
                                    diffColor = row.sumColor - counterRow.lifetime_color;
                                    diffCopierBW = row.sumCopierBW - counterRow.lifetime_copier_bw;
                                    diffCopierColor = row.sumCopierColor - counterRow.lifetime_copier_color;
                                    
                                    // Prevent negative diffs in case printer counter was reset on device
                                    if (diffBW < 0) diffBW = 0;
                                    if (diffColor < 0) diffColor = 0;
                                    if (diffCopierBW < 0) diffCopierBW = 0;
                                    if (diffCopierColor < 0) diffCopierColor = 0;

                                    // Spike guard: If abnormal spike occurs (>500 BW, >200 Color, >200 Copier in a single 5-min poll)
                                    // Re-baseline without inflating current_usage or daily_usage
                                    if (diffBW > 500 || diffColor > 200 || diffCopierBW > 200) {
                                        console.warn(`[SCRAPER SPIKE BLOCKED] User ${row.userCode} on ${ip} had abnormal jump: +${diffBW} BW, +${diffColor} Color, +${diffCopierBW} Copier. Re-baselining safely.`);
                                        diffBW = 0;
                                        diffColor = 0;
                                        diffCopierBW = 0;
                                        diffCopierColor = 0;
                                    }
                                    
                                    await db('ricoh_user_counters').where({ printer_ip: ip, user_code: row.userCode }).update({
                                        lifetime_bw: row.sumBW,
                                        lifetime_color: row.sumColor,
                                        lifetime_copier_bw: row.sumCopierBW,
                                        lifetime_copier_color: row.sumCopierColor,
                                        updated_at: db.fn.now()
                                    });
                                } else {
                                    // Baseline registration: establish baseline without dumping historical lifetime pages
                                    await db('ricoh_user_counters').insert({
                                        printer_ip: ip,
                                        user_code: row.userCode,
                                        lifetime_bw: row.sumBW,
                                        lifetime_color: row.sumColor,
                                        lifetime_copier_bw: row.sumCopierBW,
                                        lifetime_copier_color: row.sumCopierColor,
                                        updated_at: db.fn.now()
                                    });
                                    diffBW = 0;
                                    diffColor = 0;
                                    diffCopierBW = 0;
                                    diffCopierColor = 0;
                                }

                                // 2. Update all PCs associated with this user code
                                if (diffBW > 0 || diffColor > 0 || diffCopierBW > 0 || diffCopierColor > 0) {
                                    const totalDiff = diffBW + diffColor + diffCopierBW + diffCopierColor;
                                    const dbUsers = await db('ricoh_device_quotas').where('user_code', row.userCode);
                                    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                                    
                                    for (const dbUser of dbUsers) {
                                        // Update device quota (clean separation of print vs photocopy)
                                        await db('ricoh_device_quotas')
                                            .where('id', dbUser.id)
                                            .update({
                                                current_usage_bw: db.raw('current_usage_bw + ?', [diffBW]),
                                                current_usage_color: db.raw('current_usage_color + ?', [diffColor]),
                                                current_usage_copier_bw: db.raw('current_usage_copier_bw + ?', [diffCopierBW]),
                                                current_usage_copier_color: db.raw('current_usage_copier_color + ?', [diffCopierColor]),
                                                current_usage: db.raw('current_usage + ?', [totalDiff])
                                            });
                                            
                                        // Update daily usage tracking
                                        const dailyUsage = await db('ricoh_daily_usage')
                                            .where({ date: todayStr, user_code: row.userCode, computer_name: dbUser.computer_name })
                                            .first();
                                            
                                        if (dailyUsage) {
                                            await db('ricoh_daily_usage')
                                                .where('id', dailyUsage.id)
                                                .update({
                                                    bw_usage: db.raw('bw_usage + ?', [diffBW]),
                                                    color_usage: db.raw('color_usage + ?', [diffColor]),
                                                    copier_bw_usage: db.raw('copier_bw_usage + ?', [diffCopierBW]),
                                                    copier_color_usage: db.raw('copier_color_usage + ?', [diffCopierColor]),
                                                    total_usage: db.raw('total_usage + ?', [totalDiff])
                                                });
                                        } else {
                                            await db('ricoh_daily_usage').insert({
                                                date: todayStr,
                                                computer_name: dbUser.computer_name,
                                                user_code: row.userCode,
                                                department_id: dbUser.department_id,
                                                bw_usage: diffBW,
                                                color_usage: diffColor,
                                                copier_bw_usage: diffCopierBW,
                                                copier_color_usage: diffCopierColor,
                                                total_usage: totalDiff
                                            });
                                        }
                                            
                                        // Fetch user name from inventory for logging
                                        let userName = '';
                                        try {
                                            const assetInfo = await db('assets')
                                                .leftJoin('users', 'assets.user_id', 'users.id')
                                                .leftJoin('hr_employees as hr', 'assets.hr_employee_id', 'hr.id')
                                                .where('assets.name', dbUser.computer_name)
                                                .select('assets.contact', 'users.name as user_name', 'hr.name as hr_name')
                                                .first();
                                                
                                            if (assetInfo) {
                                                userName = assetInfo.hr_name || assetInfo.user_name || (assetInfo.contact ? assetInfo.contact.split('@')[0] : '');
                                            }
                                        } catch (err) {}
                                        
                                        const displayName = userName ? `${dbUser.computer_name} (${userName})` : dbUser.computer_name;
                                        
                                        if (diffBW > 0) await db('ricoh_system_logs').insert({ event_type: 'PRINT', message: `PRINT by ${displayName} printed ${diffBW} BW page(s) on ${printerName || ip}.` });
                                        if (diffColor > 0) await db('ricoh_system_logs').insert({ event_type: 'PRINT', message: `PRINT by ${displayName} printed ${diffColor} COLOR page(s) on ${printerName || ip}.` });
                                        if (diffCopierBW > 0) await db('ricoh_system_logs').insert({ event_type: 'COPIER', message: `COPIER by ${displayName} copied ${diffCopierBW} BW page(s) on ${printerName || ip}.` });
                                        if (diffCopierColor > 0) await db('ricoh_system_logs').insert({ event_type: 'COPIER', message: `COPIER by ${displayName} copied ${diffCopierColor} COLOR page(s) on ${printerName || ip}.` });
                                    }
                                    
                                    console.log(`[SCRAPER] Updated ${row.userCode} quotas across ${dbUsers.length} PC(s): +${diffBW} BW, +${diffColor} Color`);
                                }
                            }
                            console.log(`[SCRAPER] Database sync complete.`);
                        }
                    }
                } else {
                    console.log(`[SCRAPER ERROR] CSV file not found after download!`);
                }
            } else {
                console.log(`[SCRAPER ERROR] Download button not found!`);
                await page.screenshot({ path: path.join(__dirname, 'error_screenshot.png') });
            }
        } catch (e) {
            console.log(`[SCRAPER ERROR] Exception:`, e.message);
        }

        // Step 4.5: Navigate to Job History
        try {
            console.log(`[SCRAPER] Navigating to Job History...`);
            await page.goto(`http://${ip}/web/entry/en/webprinter/jobHistory.cgi`, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(3000); // wait for iframe data to load
            
            let targetFrame = page.frames().find(f => f.name() === 'work') || page;
            const html = await targetFrame.evaluate(() => document.body.innerHTML);
            
            const $ = cheerio.load(html);
            const jobs = [];

            $('table.reportListCommon tr').each((i, row) => {
                const cells = $(row).find('td.listData');
                if (cells.length >= 7) {
                    const id = $(cells[0]).text().trim();
                    const userName = $(cells[1]).text().trim();
                    const userId = $(cells[2]).text().trim().replace(/---/g, '');
                    const fileName = $(cells[3]).text().trim();
                    const status = $(cells[4]).text().trim();
                    const datetimeRaw = $(cells[5]).text().replace(/\s+/g, ' ').trim();
                    const pages = $(cells[6]).text().trim();
                    
                    jobs.push({
                        job_id: parseInt(id),
                        user_name: userName,
                        user_id: userId,
                        document_name: fileName,
                        status: status,
                        timestamp: datetimeRaw,
                        pages: parseInt(pages),
                        printer_ip: ip
                    });
                }
            });
            
            console.log(`[SCRAPER] Extracted ${jobs.length} jobs from history.`);
            
            // Insert into database
            let insertedCount = 0;
            for (const job of jobs) {
                try {
                    // Using raw insert with ON CONFLICT DO NOTHING
                    const result = await db.raw(`
                        INSERT INTO ricoh_print_jobs 
                        (job_id, user_name, user_id, document_name, status, timestamp, pages, printer_ip) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (job_id, timestamp, document_name) DO NOTHING
                        RETURNING id
                    `, [job.job_id, job.user_name, job.user_id, job.document_name, job.status, job.timestamp, job.pages, job.printer_ip]);
                    
                    if (result.rows && result.rows.length > 0) {
                        insertedCount++;
                    }
                } catch (dbErr) {
                    // Ignore duplicate constraint errors or log them quietly
                    if (dbErr.code !== '23505') {
                        console.error(`[SCRAPER] DB Insert error for job ${job.job_id}:`, dbErr.message);
                    }
                }
            }
            console.log(`[SCRAPER] Successfully inserted ${insertedCount} new jobs into database.`);
        } catch(e) {
            console.log(`[SCRAPER] Error extracting Job History:`, e.message);
        }

        // Step 5: Explicitly Logout to prevent locking the device
        try {
            console.log(`[SCRAPER] Attempting to logout...`);
            let headerFrame = page.frames().find(f => f.name() === 'header');
            if (headerFrame) {
                const hasLogout = await headerFrame.$('a[href*="logout.cgi"]');
                if (hasLogout) {
                    await headerFrame.evaluate(() => {
                        const btn = document.querySelector('a[href*="logout.cgi"]');
                        if (btn) btn.click();
                    });
                    await delay(3000);
                    console.log(`[SCRAPER] Logged out successfully.`);
                }
            }
        } catch (e) {
            console.log(`[SCRAPER] Error during logout:`, e.message);
        }

    } catch (err) {
        console.error(`[SCRAPER ERROR] Failed on ${ip}:`, err.message);
    } finally {
        await browser.close();
    }
}

const RICOH_DEVICES = [
    { ip: '192.168.2.11', name: 'MC-02-OFFICE_Atas', org: 'TCF-SG' },
    { ip: '192.168.2.10', name: 'MC-01-PPIC', org: 'TCF-SG' },
    { ip: '192.168.27.11', name: 'KG-1', org: 'TCF-KG' },
    { ip: '192.168.27.12', name: 'KG-2', org: 'TCF-KG' }
];

let scraperInterval = null;

const startScraper = () => {
    if (scraperInterval) clearInterval(scraperInterval);
    console.log(`[RICOH] Real-Time Puppeteer Scraper Started (${RICOH_DEVICES.length} devices across SG & KG, 5 min interval)`);
    
    const runAll = async () => {
        for (const device of RICOH_DEVICES) {
            try {
                // Hard timeout wrapper to prevent any infinite hangs
                const hardTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('HARD_TIMEOUT: Scraper took more than 5 minutes')), 5 * 60 * 1000));
                await Promise.race([
                    scrapeAndSyncDevice(device.ip, device.name, 'admin', '', device.org || 'TCF-SG'),
                    hardTimeout
                ]);
            } catch (err) {
                console.error(`[SCRAPER ERROR] Failed to process ${device.name} (${device.ip}, ${device.org}):`, err.message);
                // Also attempt to kill zombie chrome process if hard timeout occurs
                if (err.message.includes('HARD_TIMEOUT')) {
                    require('child_process').exec('pkill -f chrome');
                    require('child_process').exec('pkill -f chromium');
                }
            }
        }
        
        // Auto-enforce photocopy quotas and dispatch quota warnings for both SG and KG plants
        for (const org of ['TCF-SG', 'TCF-KG']) {
            try {
                const { checkAndEnforceCopierQuotas } = require('./ricoh_copier_lock');
                await checkAndEnforceCopierQuotas(org);
            } catch (enforceErr) {
                console.error(`[SCRAPER] Error enforcing copier quotas (${org}):`, enforceErr.message);
            }

            try {
                const { checkAndDispatchAllQuotaWarnings } = require('./ricoh_quota_notifier');
                await checkAndDispatchAllQuotaWarnings(org);
            } catch (notifErr) {
                console.error(`[SCRAPER] Error dispatching quota notifications (${org}):`, notifErr.message);
            }
        }
        
        scraperInterval = setTimeout(runAll, 5 * 60 * 1000);
    };

    runAll();
};

module.exports = { startScraper, scrapeAndSyncDevice };

if (require.main === module) {
    startScraper();
}
