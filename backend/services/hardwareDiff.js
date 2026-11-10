const axios = require('axios');

/**
 * Helper to parse RAM value into a clean integer (Gigabytes)
 * Handles: 4, 8, "4 GB", "8GB", "8192 MB", "4096MB", etc.
 */
function parseRamGb(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return Math.round(val);
    if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
        if (isNaN(num)) return null;
        if (/mb/i.test(cleaned) && num > 100) {
            return Math.round(num / 1024);
        }
        return Math.round(num);
    }
    return null;
}

/**
 * Helper to extract disk list and total non-removable storage capacity (in GB)
 * Filters out:
 * - Empty / 0 GB / unformatted drives (e.g. D: with 0 GB)
 * - Removable USB Flash Disks (Cruzer, Kingston, etc.)
 * - External USB Hard Drives & Portable SSDs (e.g. WD Elements, Seagate)
 * - Transient secondary drive letters on Laptops (where all external storage plugs in as D:, E:, etc.)
 */
function extractStorageInfo(specs, asset = null) {
    if (!specs) return { totalGb: 0, disks: [], systemDriveGb: 0 };
    let disks = [];
    let totalGb = 0;
    let systemDriveGb = 0;

    // Detect if the asset is a laptop / notebook
    const assetStr = typeof asset === 'string' ? asset : (asset ? `${asset.name || ''} ${asset.category || ''} ${asset.model || ''}` : '');
    const isLaptop = /laptop|nb|notebook|aspire|thinkpad|ideapad|latitude|vostro|pavilion|zenbook|vivobook|yoga|macbook/i.test(assetStr);

    if (Array.isArray(specs.storage)) {
        for (const s of specs.storage) {
            const rawName = s.name || s.model || s.drive || '';
            const name = rawName.trim();
            const size = parseFloat(s.size || s.size_gb || s.capacity_gb || 0);

            // 1. Skip completely invalid, empty, or <= 2 GB drives (empty optical drive, unformatted partition, transient mount)
            if (!name || isNaN(size) || size <= 2) {
                continue;
            }

            // 2. Identify USB / Removable / External drives
            const isUsbDevice = /usb|cruzer|flash\s*drive|external|portable|removable|card\s*reader|sd\s*card|virtual|vhd|iso|dvd|cd-rom/i.test(name) ||
                                (s.interface && /usb/i.test(s.interface)) ||
                                (s.media_type && /removable|external/i.test(s.media_type)) ||
                                s.is_removable === true;

            const isSecondaryDriveLetter = /^[D-Z]:?$/i.test(name);
            const isSystemDrive = /^[C]:?$/i.test(name);

            // On laptops, any drive letter other than C: is an external accessory (external HDD, USB stick, SD card)
            // On desktops, single drive letters D-Z without physical model or marked USB are also removable/external
            const isRemovable = isUsbDevice || (isLaptop && isSecondaryDriveLetter) || isSecondaryDriveLetter;

            if (isSystemDrive) {
                systemDriveGb = Math.round(size);
            }

            disks.push({
                name,
                size: Math.round(size),
                isThumbDrive: isRemovable,
                isRemovable,
                isSystemDrive
            });

            // Only count verified internal storage towards total storage
            if (!isRemovable) {
                totalGb += Math.round(size);
            }
        }
    } else if (typeof specs.storage_summary === 'string') {
        // Fallback for string summary: only grab C: drive if present
        const cMatch = specs.storage_summary.match(/C:\s*\([^\)]*of\s*(\d+)/i);
        if (cMatch) {
            systemDriveGb = parseInt(cMatch[1], 10);
            totalGb = systemDriveGb;
        } else {
            const matches = specs.storage_summary.match(/\d+/g);
            if (matches) {
                totalGb = matches.reduce((acc, m) => acc + parseInt(m, 10), 0);
            }
        }
    } else if (specs.disk_size) {
        totalGb = Math.round(parseFloat(specs.disk_size) || 0);
    }

    if (totalGb === 0 && systemDriveGb > 0) {
        totalGb = systemDriveGb;
    }

    return { totalGb, disks, systemDriveGb };
}

/**
 * Compare old specs vs incoming new specs to detect hardware upgrades, changes, or drifts
 */
function compareHardwareSpecs(currentSpecs = {}, incomingSpecs = {}, asset = null) {
    const changes = [];
    let isUpgrade = false;
    let isDowngrade = false;

    // 1. RAM Comparison
    const oldRam = parseRamGb(currentSpecs.ram);
    const newRam = parseRamGb(incomingSpecs.ram);
    if (oldRam !== null && newRam !== null && oldRam > 0 && newRam > 0) {
        if (newRam > oldRam) {
            changes.push(`RAM di-upgrade: ${oldRam} GB ➔ ${newRam} GB (+${newRam - oldRam} GB)`);
            isUpgrade = true;
        } else if (newRam < oldRam) {
            changes.push(`⚠️ RAM berkurang/dicopot: ${oldRam} GB ➔ ${newRam} GB (-${oldRam - newRam} GB)`);
            isDowngrade = true;
        }
    }

    // 2. Storage Comparison
    const oldStorage = extractStorageInfo(currentSpecs, asset);
    const newStorage = extractStorageInfo(incomingSpecs, asset);

    // Prioritize Primary System Drive (C:) - The true indicator of a computer's internal storage
    if (oldStorage.systemDriveGb > 0 && newStorage.systemDriveGb > 0) {
        const cDiff = newStorage.systemDriveGb - oldStorage.systemDriveGb;
        // Ignore minor partition or OS rounding variations (<= 25 GB)
        if (cDiff > 25) {
            changes.push(`Kapasitas System SSD/HDD (C:) di-upgrade: ${oldStorage.systemDriveGb} GB ➔ ${newStorage.systemDriveGb} GB (+${cDiff} GB)`);
            isUpgrade = true;
        } else if (cDiff < -25) {
            changes.push(`⚠️ Kapasitas System SSD/HDD (C:) berkurang: ${oldStorage.systemDriveGb} GB ➔ ${newStorage.systemDriveGb} GB (${cDiff} GB)`);
            isDowngrade = true;
        }
    } else if (oldStorage.totalGb > 0 && newStorage.totalGb > 0) {
        const diffGb = newStorage.totalGb - oldStorage.totalGb;
        // Ignore minor partition rounding variations (<= 25 GB)
        if (diffGb > 25) {
            changes.push(`Kapasitas Storage/Disk internal bertambah: ${oldStorage.totalGb} GB ➔ ${newStorage.totalGb} GB (+${diffGb} GB)`);
            isUpgrade = true;
        } else if (diffGb < -25) {
            changes.push(`⚠️ Kapasitas Storage/Disk internal berkurang: ${oldStorage.totalGb} GB ➔ ${newStorage.totalGb} GB (${diffGb} GB)`);
            isDowngrade = true;
        }
    }

    // Check if new physical internal disk models were installed (never check removable/thumb drives/transient drive letters)
    if (newStorage.disks.length > 0 && oldStorage.disks.length > 0) {
        const isPhysicalInternalDisk = (d) => !d.isRemovable && !/^[A-Z]:?$/i.test(d.name) && d.size > 20;

        const oldInternalDisks = oldStorage.disks.filter(isPhysicalInternalDisk).map(d => d.name.toLowerCase());
        const newlyAddedDisks = newStorage.disks.filter(d => isPhysicalInternalDisk(d) && !oldInternalDisks.includes(d.name.toLowerCase()));
        
        if (newlyAddedDisks.length > 0 && !changes.some(c => c.includes('Kapasitas'))) {
            changes.push(`Internal Disk/SSD baru terpasang: ${newlyAddedDisks.map(d => `${d.name} (${d.size} GB)`).join(', ')}`);
            isUpgrade = true;
        }
    }

    // 3. Processor / CPU Comparison
    if (currentSpecs.cpu && incomingSpecs.cpu) {
        const oldCpu = currentSpecs.cpu.replace(/\s+/g, ' ').trim();
        const newCpu = incomingSpecs.cpu.replace(/\s+/g, ' ').trim();
        if (oldCpu && newCpu && oldCpu.toLowerCase() !== newCpu.toLowerCase()) {
            changes.push(`Processor (CPU) diganti: "${oldCpu}" ➔ "${newCpu}"`);
            isUpgrade = true;
        }
    }

    // 4. Graphics Card / GPU Comparison
    if (currentSpecs.gpu && incomingSpecs.gpu) {
        const oldGpu = currentSpecs.gpu.replace(/\s+/g, ' ').trim();
        const newGpu = incomingSpecs.gpu.replace(/\s+/g, ' ').trim();
        if (oldGpu && newGpu && oldGpu.toLowerCase() !== newGpu.toLowerCase()) {
            changes.push(`GPU / Kartu Grafis diperbarui: "${oldGpu}" ➔ "${newGpu}"`);
        }
    }

    // 5. Motherboard / Model Comparison
    if (currentSpecs.model && incomingSpecs.model) {
        const oldModel = currentSpecs.model.replace(/\s+/g, ' ').trim();
        const newModel = incomingSpecs.model.replace(/\s+/g, ' ').trim();
        const ignoreList = ['default string', 'system product name', 'to be filled by o.e.m.', 'none', '-'];
        
        if (oldModel && newModel && oldModel.toLowerCase() !== newModel.toLowerCase() &&
            !ignoreList.includes(oldModel.toLowerCase()) && !ignoreList.includes(newModel.toLowerCase())) {
            changes.push(`Model / Motherboard diganti: "${oldModel}" ➔ "${newModel}"`);
        }
    }

    // 6. Operating System Comparison
    if (currentSpecs.os && incomingSpecs.os) {
        const oldOs = currentSpecs.os.trim();
        const newOs = incomingSpecs.os.trim();
        if (oldOs && newOs && oldOs.toLowerCase() !== newOs.toLowerCase()) {
            changes.push(`Sistem Operasi (OS) diperbarui: "${oldOs}" ➔ "${newOs}"`);
            isUpgrade = true;
        }
    }

    return {
        hasChanges: changes.length > 0,
        changes,
        isUpgrade,
        isDowngrade,
        actionType: isDowngrade ? 'Hardware Alert' : (isUpgrade ? 'Hardware Upgrade' : 'Hardware Modification')
    };
}

/**
 * Main routine executed when an asset sends updated telemetry:
 * 1. Diffs hardware specs
 * 2. Writes record to asset_history
 * 3. Generates System Ticket in tickets table (ICT-TCFSG-03-HW-XXXXXX)
 * 4. Pushes WhatsApp alert to ICT Team
 */
async function processHardwareUpgrade({ db, asset, incomingSpecs = {}, currentSpecs = {}, rawBody = {} }) {
    if (!asset || !asset.id) return { changed: false };

    const diff = compareHardwareSpecs(currentSpecs, incomingSpecs, asset);
    if (!diff.hasChanges) {
        return { changed: false };
    }

    console.log(`[HARDWARE-DIFF] 🚀 Changes detected for ${asset.name} (ID: ${asset.id}):`, diff.changes);

    const now = new Date();
    const rawDate = new Date();
    const tzDate = new Date(rawDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const formattedTime = `${tzDate.getFullYear()}-${String(tzDate.getMonth()+1).padStart(2,'0')}-${String(tzDate.getDate()).padStart(2,'0')} ${String(tzDate.getHours()).padStart(2,'0')}:${String(tzDate.getMinutes()).padStart(2,'0')}:${String(tzDate.getSeconds()).padStart(2,'0')} WIB`;

    // 1. Insert into asset_history
    let historyId = null;
    const historyDetails = diff.changes.join('\n');
    try {
        const [hist] = await db('asset_history').insert({
            asset_id: asset.id,
            action: diff.actionType,
            details: historyDetails,
            diff_data: JSON.stringify({
                old: {
                    ram: currentSpecs.ram,
                    storage: currentSpecs.storage,
                    cpu: currentSpecs.cpu,
                    model: currentSpecs.model,
                    os: currentSpecs.os
                },
                new: {
                    ram: incomingSpecs.ram,
                    storage: incomingSpecs.storage,
                    cpu: incomingSpecs.cpu,
                    model: incomingSpecs.model,
                    os: incomingSpecs.os
                },
                changes: diff.changes
            }),
            performed_by: 'TCF Agent Sync',
            created_at: now
        }).returning('id');
        historyId = typeof hist === 'object' ? (hist.id || hist) : hist;
        console.log(`[HARDWARE-DIFF] ✅ Saved asset_history ID: ${historyId}`);
    } catch (e) {
        console.error('[HARDWARE-DIFF] ❌ Error inserting asset_history:', e);
    }

    // 2. Generate System Ticket
    let ticketNumber = null;
    try {
        const isKG = (asset.location && asset.location.toUpperCase().includes('KG')) || 
                     (asset.name && asset.name.toUpperCase().includes('KG')) ||
                     (asset.organization && asset.organization.toUpperCase().includes('KG'));
        const plantCode = isKG ? 'TCFKG' : 'TCFSG';
        const prefix = `ICT-${plantCode}-03-HW-`;
        const rows = await db('tickets').where('number', 'like', `${prefix}%`).select('number');
        let maxSeq = 400000;
        const regex = new RegExp(`^${prefix}(\\d{6})$`);
        for (const r of rows) {
            if (!r.number) continue;
            const match = r.number.match(regex);
            if (match) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq) maxSeq = seq;
            }
        }
        ticketNumber = prefix + String(maxSeq + 1).padStart(6, '0');

        const ticketSubject = diff.isDowngrade
            ? `[AUTO-ALERT] Komponen Berkurang/Dicopot: ${asset.name}`
            : `[AUTO-LOG] Hardware Upgrade Terdeteksi: ${asset.name}`;

        const ticketDescription = `TCF Agent mendeteksi perubahan spesifikasi fisik pada perangkat ${asset.name} (${asset.inventory_number || '-'}).\n\nDetail Perubahan:\n${diff.changes.map(c => '• ' + c).join('\n')}\n\nWaktu Terdeteksi: ${formattedTime}`;

        const [tId] = await db('tickets').insert({
            number: ticketNumber,
            subject: ticketSubject,
            description: ticketDescription,
            category: 'Hardware Upgrade',
            source: 'System',
            priority: diff.isDowngrade ? 'High' : 'Normal',
            status: diff.isDowngrade ? 'Open' : 'Closed',
            asset_id: asset.id,
            user_id: asset.user_id || null,
            created_at: now,
            updated_at: now
        }).returning('id');

        const finalTicketId = typeof tId === 'object' ? (tId.id || tId) : tId;

        // Auto-close resolution notes if it is a standard upgrade
        if (!diff.isDowngrade && finalTicketId) {
            await db('ticket_responses').insert({
                ticket_id: finalTicketId,
                user_id: 1,
                message: `Pembaruan hardware telah tersinkronisasi otomatis oleh TCF Agent. Spesifikasi terbaru telah diperbarui di database inventaris dan tercatat pada Form Standar ISO TCFSG-FM-ICT-03-03 (History Perangkat ICT).`,
                type: 'public',
                created_at: now
            });
        }
        console.log(`[HARDWARE-DIFF] ✅ Generated System Ticket: ${ticketNumber} (${diff.isDowngrade ? 'OPEN' : 'CLOSED'})`);
    } catch (e) {
        console.error('[HARDWARE-DIFF] ❌ Error creating ticket:', e);
    }

    // 3. Send WhatsApp Notification
    try {
        const settings = await db('settings').where('section', 'monitoring');
        const getSetting = (k) => settings.find(s => s.key === k)?.value;
        let targetGroup = getSetting('pa_target_group') || getSetting('maintenance_target_group') || 'Tehnisi Helpdesk TCFSG';
        try { targetGroup = JSON.parse(targetGroup); } catch(e) {}

        // Format target
        let waTarget = targetGroup;
        if (!waTarget.includes('@') && !waTarget.startsWith('GROUP:')) {
            waTarget = `GROUP:${waTarget}`;
        }

        // Get user name
        let userDisplayName = asset.contact || '-';
        if (asset.user_id) {
            const u = await db('users').where('id', asset.user_id).first();
            if (u && u.name) userDisplayName = `${u.name} (${u.department || 'Staff'})`;
        }

        const statusText = diff.isDowngrade
            ? '🚨 *PERINGATAN: POTENSI KOMPONEN BERKURANG / DICOPOT*'
            : '✅ *HARDWARE UPGRADE TERDETEKSI & TERVERIFIKASI*';

        const waMsg = `${diff.isDowngrade ? '⚠️ *[PERINGATAN PERANGKAT ICT]* ⚠️' : '🔔 *[HARDWARE UPGRADE NOTIFICATION]*'}\n\n` +
            `*Perangkat:* ${asset.name} (${asset.inventory_number || '-'})\n` +
            `*User / Pemegang:* ${userDisplayName}\n` +
            `*Waktu:* ${formattedTime}\n` +
            (ticketNumber ? `*Tiket Sistem:* #${ticketNumber}\n` : '') +
            `*Status:* ${statusText}\n\n` +
            `*Rincian Perubahan Hardware:*\n` +
            `${diff.changes.map(c => '• ' + c).join('\n')}\n\n` +
            (diff.isDowngrade
                ? `_Harap segera periksa kondisi fisik perangkat tersebut di lokasi!_\n`
                : `_Catatan riwayat telah otomatis dicatat ke Form ISO TCFSG-FM-ICT-03-03 (History Perangkat)._\n`) +
            `- *Power Asset Automation*`;

        await axios.post('http://127.0.0.1:5002/send-message', {
            to: waTarget,
            message: waMsg
        }, { timeout: 6000 });
        console.log(`[HARDWARE-DIFF] 📱 WhatsApp alert sent to: ${waTarget}`);
    } catch (waErr) {
        console.warn(`[HARDWARE-DIFF] ⚠️ Failed to send WhatsApp notification:`, waErr.message);
    }

    return {
        changed: true,
        diff,
        ticketNumber,
        historyId
    };
}

module.exports = {
    parseRamGb,
    extractStorageInfo,
    compareHardwareSpecs,
    processHardwareUpgrade
};
