/**
 * TCF Auto-Sync Daemon
 * Continuously watches backend files and auto-deploys to Server 66 on save.
 * Pre-validates syntax with node -c before deploying.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WATCH_DIRS = [
    path.join(__dirname, 'backend', 'routes'),
    path.join(__dirname, 'backend', 'middleware'),
    path.join(__dirname, 'backend', 'services')
];

let debounceTimer = null;
let pendingFiles = new Set();

console.log('👀 [Auto-Sync Daemon] Started watching backend directories:');
WATCH_DIRS.forEach(d => {
    if (fs.existsSync(d)) {
        console.log(`  📁 ${path.relative(__dirname, d)}`);
        fs.watch(d, { recursive: true }, (eventType, filename) => {
            if (filename && (filename.endsWith('.js') || filename.endsWith('.cjs'))) {
                pendingFiles.add(path.join(d, filename));
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(triggerSync, 2000);
            }
        });
    }
});

function triggerSync() {
    console.log(`\n⚡ [Auto-Sync] Detected file changes: ${Array.from(pendingFiles).map(f => path.basename(f)).join(', ')}`);
    pendingFiles.clear();

    try {
        console.log('🚀 [Auto-Sync] Running safe deployment to Server 66...');
        execSync(`node "${path.join(__dirname, 'deploy_safe.cjs')}"`, { stdio: 'inherit' });
    } catch (err) {
        console.error('❌ [Auto-Sync] Deployment failed or blocked by safety guard.');
    }
}
