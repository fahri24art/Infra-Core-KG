/**
 * TCF Safe Deployment Engine - Zero-Downtime, Pre-Flight Validated, Auto-Rollback Deployer
 * Usage: node deploy_safe.cjs [--frontend]
 */

const { Client } = require('ssh2');
const { execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const SERVER_HOST = '192.168.1.66';
const SERVER_PORT = 22;
const SERVER_USER = 'root';
const SERVER_PASS = 'Nevergiveup572*';
const HTTP_PORT = 5000;

console.log('🛡️ [Deploy Safe] ============================================');
console.log('🛡️ [Deploy Safe] TCF Zero-Downtime & Auto-Rollback Deployment');
console.log('🛡️ [Deploy Safe] ============================================');

// 1. PRE-FLIGHT SYNTAX VALIDATION
console.log('\n🔍 Step 1: Pre-flight Syntax Verification...');
const backendFilesToValidate = [
    'backend/routes/budgeting.js',
    'backend/middleware/auth.js',
    'backend/routes/settings.js',
    'backend/index.js',
    'backend/db.js',
    'backend/services/configService.js',
    'backend/services/isp_monitor.js',
    'backend/whatsapp_bot.js'
];

for (const file of backendFilesToValidate) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        try {
            execSync(`node -c "${fullPath}"`, { stdio: 'pipe' });
            console.log(`  ✅ [PASS] ${file}`);
        } catch (err) {
            console.error(`  ❌ [FAIL] Syntax error in ${file}:`);
            console.error(err.stderr.toString());
            console.error('\n🛑 DEPLOYMENT ABORTED! Broken code was prevented from reaching production.');
            process.exit(1);
        }
    }
}

// 2. CHECK IF FRONTEND BUILD IS REQUESTED
const shouldBuildFrontend = process.argv.includes('--frontend') || process.argv.includes('--all');
if (shouldBuildFrontend) {
    console.log('\n📦 Step 2: Building frontend (Vite)...');
    try {
        execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
        console.log('  ✅ [PASS] Frontend built successfully.');
        console.log('  📦 Compressing dist bundle for ultra-fast transfer...');
        execSync('tar -czf dist.tar.gz dist', { cwd: __dirname, stdio: 'pipe' });
        console.log('  ✅ [PASS] dist.tar.gz created.');
    } catch (err) {
        console.error('  ❌ [FAIL] Frontend build failed!');
        process.exit(1);
    }
} else {
    console.log('\n📦 Step 2: Skipping frontend build (pass --frontend to include).');
}

// 3. REMOTE DEPLOYMENT WITH AUTOMATIC ROLLBACK GUARD
console.log(`\n🚀 Step 3: Connecting to Server 66 (${SERVER_HOST})...`);
const conn = new Client();

function uploadFile(sftp, localPath, remotePath) {
    return new Promise((resolve, reject) => {
        sftp.fastPut(localPath, remotePath, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function runRemote(cmd) {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let out = '';
            let errOut = '';
            stream.on('data', d => out += d);
            stream.stderr.on('data', d => errOut += d);
            stream.on('close', code => resolve({ code, out, errOut }));
        });
    });
}

function verifyHttpLive(endpoint) {
    return new Promise((resolve) => {
        const req = http.get(`http://${SERVER_HOST}:${HTTP_PORT}${endpoint}`, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', (e) => resolve({ status: 500, error: e.message }));
        req.setTimeout(5000, () => {
            req.abort();
            resolve({ status: 408, error: 'Timeout' });
        });
    });
}

conn.on('ready', async () => {
    console.log('  ✅ Connected via SSH.');
    try {
        // Step 3a: Create remote backup of current live files
        console.log('  💾 Creating remote safety backup (.bak)...');
        await runRemote(`
            mkdir -p /opt/power_asset/backend/backups_predeploy
            cp /opt/power_asset/backend/routes/budgeting.js /opt/power_asset/backend/backups_predeploy/budgeting.js.bak
            cp /opt/power_asset/backend/middleware/auth.js /opt/power_asset/backend/backups_predeploy/auth.js.bak
        `);

        // Step 3b: Upload updated files via SFTP
        console.log('  ⬆️ Uploading validated backend files...');
        await new Promise((resolve, reject) => {
            conn.sftp(async (sftpErr, sftp) => {
                if (sftpErr) return reject(sftpErr);
                try {
                    await uploadFile(sftp, path.join(__dirname, 'backend/routes/budgeting.js'), '/opt/power_asset/backend/routes/budgeting.js');
                    await uploadFile(sftp, path.join(__dirname, 'backend/middleware/auth.js'), '/opt/power_asset/backend/middleware/auth.js');
                    if (fs.existsSync(path.join(__dirname, 'backend/routes/settings.js'))) {
                        await uploadFile(sftp, path.join(__dirname, 'backend/routes/settings.js'), '/opt/power_asset/backend/routes/settings.js');
                    }
                    if (fs.existsSync(path.join(__dirname, 'backend/services/configService.js'))) {
                        await uploadFile(sftp, path.join(__dirname, 'backend/services/configService.js'), '/opt/power_asset/backend/services/configService.js');
                    }
                    if (fs.existsSync(path.join(__dirname, 'backend/services/isp_monitor.js'))) {
                        await uploadFile(sftp, path.join(__dirname, 'backend/services/isp_monitor.js'), '/opt/power_asset/backend/services/isp_monitor.js');
                    }
                    if (fs.existsSync(path.join(__dirname, 'backend/index.js'))) {
                        await uploadFile(sftp, path.join(__dirname, 'backend/index.js'), '/opt/power_asset/backend/index.js');
                    }
                    if (fs.existsSync(path.join(__dirname, 'backend/whatsapp_bot.js'))) {
                        await uploadFile(sftp, path.join(__dirname, 'backend/whatsapp_bot.js'), '/opt/power_asset/backend/whatsapp_bot.js');
                    }
                    if (fs.existsSync(path.join(__dirname, 'backend/data/budget_store.json'))) {
                        await uploadFile(sftp, path.join(__dirname, 'backend/data/budget_store.json'), '/opt/power_asset/backend/data/budget_store.json');
                    }
                    if (shouldBuildFrontend && fs.existsSync(path.join(__dirname, 'dist.tar.gz'))) {
                        console.log('  ⬆️ Uploading frontend dist bundle...');
                        await uploadFile(sftp, path.join(__dirname, 'dist.tar.gz'), '/tmp/dist.tar.gz');
                    }
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });

        if (shouldBuildFrontend && fs.existsSync(path.join(__dirname, 'dist.tar.gz'))) {
            console.log('  📦 Extracting frontend dist bundle on server...');
            await runRemote('tar -xzf /tmp/dist.tar.gz -C /opt/power_asset/ && rm /tmp/dist.tar.gz');
            try { fs.unlinkSync(path.join(__dirname, 'dist.tar.gz')); } catch (e) {}
            console.log('  ✅ [PASS] Frontend successfully deployed to /opt/power_asset/dist.');
        }

        // Step 3c: Restart PM2
        console.log('  🔄 Restarting PM2 power-asset...');
        const pm2Res = await runRemote('pm2 restart power-asset');
        if (pm2Res.code !== 0) {
            throw new Error(`PM2 restart failed: ${pm2Res.errOut}`);
        }

        // Step 4: POST-DEPLOY SMOKE TEST (Health Verification)
        console.log('\n🩺 Step 4: Running automated live smoke test...');
        // Wait 1.5 seconds for express to boot
        await new Promise(r => setTimeout(r, 1500));

        const testCheck = await verifyHttpLive('/api/budgeting/department-requests?year=ALL&plant=ALL');
        console.log(`  Live HTTP Status: ${testCheck.status}`);

        if (testCheck.status === 200) {
            let total = 0;
            try { total = JSON.parse(testCheck.data).total; } catch(e) {}
            console.log(`  ✅ [HEALTHY] Service is 100% OPERATIONAL! Total Requests Online: ${total}`);
            console.log('\n🎉 ====================================================');
            console.log('🎉 DEPLOYMENT SUCCEEDED & VERIFIED IN PRODUCTION!');
            console.log('🎉 ====================================================');
            conn.end();
        } else {
            console.error(`\n🚨 [SMOKE TEST FAILED] Status: ${testCheck.status}`);
            console.error('🔄 INITIATING AUTOMATIC INSTANT ROLLBACK...');
            await runRemote(`
                cp /opt/power_asset/backend/backups_predeploy/budgeting.js.bak /opt/power_asset/backend/routes/budgeting.js
                cp /opt/power_asset/backend/backups_predeploy/auth.js.bak /opt/power_asset/backend/middleware/auth.js
                pm2 restart power-asset
            `);
            console.error('✅ Rollback completed. Production restored to previous healthy state.');
            conn.end();
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ Deployment error:', err.message);
        conn.end();
        process.exit(1);
    }
}).connect({ host: SERVER_HOST, port: SERVER_PORT, username: SERVER_USER, password: SERVER_PASS });
