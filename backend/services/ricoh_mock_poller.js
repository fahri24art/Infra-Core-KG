const db = require('../db');

// Track the simulated job ID internally
let lastJobId = 1000;

const MOCK_FILES = [
    "Quotation FSA - Jun.xlsx",
    "05. PO-SBC 2026-003728 ASI-TCF (D37D) OVER.pdf",
    "05. PO-SBC 2026-003725 ASI-TCF (SRVC PART MKM) OVER.pdf",
    "05. PO-SBC 2026-003724 ASI-TCF (BLANKING ADM) OVER 1.pdf",
    "05. PO-SBC 2026-003722 ASI-TCF (NON G-PART) OVER.pdf",
    "05. PO-SBC 2026-003721 ASI-TCF (D03B) OVER.pdf",
    "05. PO-SBC 2026-003718 ASI-TCF (G-PART) OVER.pdf",
    "05. PO-SBC 2026-003717 ASI-TCF (MV3) OVER.pdf",
    "05. PO-SBC 2026-002892 ASI-TCF (NON G-PART) TAHAP 2.pdf",
    "05. PO-SBC 2026-002854 ASI-TCF (G-PART) TAHAP 2.pdf",
    "links.pdf",
    "Invoice_Q3.pdf",
    "Report_Weekly.xlsx",
    "Memo_Internal.docx"
];

// Track recent jobs to simulate double prints
const recentJobs = [];

async function fetchRicohJobHistory(deviceIp, knownComputers) {
    const newJobs = [];

    // 40% chance to generate a job every cycle
    if (Math.random() < 0.4 && knownComputers.length > 0) {
        const randomComputer = knownComputers[Math.floor(Math.random() * knownComputers.length)];
        const isColor = Math.random() > 0.5;
        const pages = Math.floor(Math.random() * 5) + 1;
        const isPhotocopy = Math.random() > 0.8; // Reduce photocopy chance to show more filenames

        lastJobId++;
        
        let fileName = null;
        if (!isPhotocopy) {
            // 20% chance to simulate a "double print" if we have recent jobs
            if (Math.random() < 0.2 && recentJobs.length > 0) {
                const recent = recentJobs[Math.floor(Math.random() * recentJobs.length)];
                fileName = recent.fileName;
                // use the same computer to make it a true duplicate
                randomComputer.computer_name = recent.computer_name;
                randomComputer.user_code = recent.user_code;
            } else {
                fileName = MOCK_FILES[Math.floor(Math.random() * MOCK_FILES.length)];
                recentJobs.push({ fileName, computer_name: randomComputer.computer_name, user_code: randomComputer.user_code });
                if (recentJobs.length > 10) recentJobs.shift();
            }
        }

        if (isPhotocopy) {
            newJobs.push({
                jobId: lastJobId,
                hostName: null,
                userCode: randomComputer.user_code || "---",
                ipAddress: null,
                type: isColor ? 'COLOR' : 'BW',
                jobType: 'PHOTOCOPY',
                pages: pages,
                fileName: "Photocopy Job",
                status: "Print Complete",
                timestamp: new Date().toISOString()
            });
        } else {
            newJobs.push({
                jobId: lastJobId,
                hostName: randomComputer.computer_name,
                userCode: randomComputer.user_code || "---",
                ipAddress: randomComputer.ip_address,
                type: isColor ? 'COLOR' : 'BW',
                jobType: 'PRINT',
                pages: pages,
                fileName: fileName,
                status: "Print Complete",
                timestamp: new Date().toISOString()
            });
        }
    }

    return newJobs;
}

// Keep track of already synced PIN configurations
const syncedState = {};

async function processJobQueue() {
    try {
        // Find all active computers with a quota
        const computers = await db('ricoh_device_quotas').where('status', 'active');
        if (computers.length === 0) return;

        // Find all online Ricoh machines
        const ricohMachines = await db('ricoh_devices').where('status', 'online');

        for (const machine of ricohMachines) {
            const deviceIp = machine.ip;

            // Sync PIN Configuration Logic (Mock)
            const stateKey = `${deviceIp}`;
            if (!syncedState[stateKey]) syncedState[stateKey] = [];
            const currentPINs = computers.map(c => `${c.computer_name}:${c.user_code || ''}`);
            const lastPINs = syncedState[stateKey];

            if (JSON.stringify(currentPINs) !== JSON.stringify(lastPINs)) {
                syncedState[stateKey] = currentPINs;
                await db('ricoh_system_logs').insert({
                    event_type: 'API_SYNC',
                    message: `Successfully synchronized ${computers.length} PIN codes to Ricoh (${deviceIp}) Address Book.`
                });
            }

            // Simulate parsing jobs
            const jobs = await fetchRicohJobHistory(deviceIp, computers);

            for (const job of jobs) {
                let targetComputer = null;

                if (job.hostName) {
                    targetComputer = computers.find(c => c.computer_name === job.hostName);
                } else if (job.userCode) {
                    targetComputer = computers.find(c => c.user_code === job.userCode);
                }

                if (!targetComputer) continue;

                const isColor = job.type === 'COLOR';
                const pages = job.pages;

                // Increment usage directly using increment() or raw query
                if (isColor) {
                    await db('ricoh_device_quotas')
                        .where('id', targetComputer.id)
                        .increment({
                            current_usage_color: pages,
                            lifetime_color: pages
                        });
                } else {
                    await db('ricoh_device_quotas')
                        .where('id', targetComputer.id)
                        .increment({
                            current_usage_bw: pages,
                            lifetime_bw: pages
                        });
                }

                // Check quota limits after updating
                const row = await db('ricoh_device_quotas').where('id', targetComputer.id).first();
                if (row) {
                    const bwExceeded = row.current_usage_bw >= row.monthly_quota_bw;
                    const colorExceeded = row.current_usage_color >= row.monthly_quota_color;

                    if ((bwExceeded || colorExceeded) && row.status === 'active') {
                        await db('ricoh_device_quotas').where('id', row.id).update({ status: 'locked' });

                        const reason = [];
                        if (bwExceeded) reason.push(`BW: ${row.current_usage_bw}/${row.monthly_quota_bw}`);
                        if (colorExceeded) reason.push(`Color: ${row.current_usage_color}/${row.monthly_quota_color}`);

                        const lockMsg = `Auto-Lock: Computer '${row.computer_name}' has been automatically locked. Reason: Exceeded quota (${reason.join(', ')}).`;
                        await db('ricoh_system_logs').insert({ event_type: 'QUOTA_EXCEEDED', message: lockMsg });
                    }
                }

                // Insert into ricoh_print_jobs
                await db('ricoh_print_jobs').insert({
                    device_ip: deviceIp,
                    job_id: job.jobId,
                    user_name: targetComputer.computer_name || targetComputer.user_code || 'Unknown',
                    user_id_col: targetComputer.user_code || '---',
                    file_name: job.fileName,
                    status: job.status,
                    created_at: job.timestamp,
                    pages: job.pages
                });

                // Log print event to system logs
                const logMsg = `Mock Poller: ${job.jobType} by '${targetComputer.computer_name}' (PIN: ${targetComputer.user_code || 'None'}) printed ${job.pages} ${job.type} page(s) on ${deviceIp}. File: ${job.fileName}`;
                await db('ricoh_system_logs').insert({ event_type: 'PRINT', message: logMsg });
            }
        }
    } catch (err) {
        console.error("[-] Error in Ricoh Mock Poller:", err.message);
    }
}

let pollerInterval = null;

const startMockPoller = () => {
    if (pollerInterval) clearInterval(pollerInterval);
    console.log("[RICOH] Mock Job Poller Started (10s interval)");
    pollerInterval = setInterval(processJobQueue, 10000);
};

module.exports = {
    startMockPoller
};
