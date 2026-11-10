/**
 * Ricoh Quota Warning & WhatsApp Notification Service
 * Monitors active devices for quota usage reaching warning threshold (sisa <= 20 lembar / 10%) and 100% (habis / terkunci).
 * Automatically alerts users via WhatsApp using existing bot gateway.
 */

const { getDb } = require('../db');
const axios = require('axios');

const WA_API_URL = process.env.WA_API_URL || 'http://127.0.0.1:5002/send-message';
const HELPDESK_GROUP = 'GROUP:Tehnisi Helpdesk TCFSG';

/**
 * Returns billing cycle string (e.g. '2026-11' for Oct 21 - Nov 20)
 */
function getCurrentBillingCycle() {
    const now = new Date();
    const day = now.getDate();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    // If day >= 21, the active cycle ends on 20th of next month
    if (day >= 21) {
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Normalizes Indonesian phone/whatsapp numbers to format 628xxxxxxxxxx
 */
function normalizeWhatsappNumber(raw) {
    if (!raw) return null;
    let clean = String(raw).replace(/[^0-9]/g, '');
    if (clean.startsWith('08')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    }
    if (clean.length < 10) return null;
    return clean;
}

/**
 * Fetches all devices with their calculated usage percentages, remaining quota, and linked user/WA info
 */
async function getDeviceQuotaStatuses(org = 'TCF-SG') {
    const db = getDb(org);
    const billingCycle = getCurrentBillingCycle();

    const devices = await db('ricoh_device_quotas')
        .leftJoin('assets', 'assets.id', db.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
        .leftJoin('users', 'assets.user_id', 'users.id')
        .leftJoin('hr_employees', function() {
            this.on('assets.hr_employee_id', '=', 'hr_employees.id')
                .orOn('users.hr_employee_id', '=', 'hr_employees.id');
        })
        .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
        .select(
            'ricoh_device_quotas.id',
            'ricoh_device_quotas.computer_name',
            'ricoh_device_quotas.ip_address',
            'ricoh_device_quotas.user_code',
            'ricoh_device_quotas.status',
            'ricoh_device_quotas.copier_status',
            'ricoh_device_quotas.monthly_quota_bw',
            'ricoh_device_quotas.current_usage_bw',
            'ricoh_device_quotas.monthly_quota_color',
            'ricoh_device_quotas.current_usage_color',
            'ricoh_device_quotas.monthly_quota_copier',
            'ricoh_device_quotas.current_usage_copier_bw',
            'ricoh_device_quotas.current_usage_copier_color',
            'assets.id as asset_id',
            'assets.name as asset_name',
            'assets.location as asset_location',
            'assets.contact as asset_contact',
            'users.id as user_id',
            db.raw('COALESCE(hr_employees.name, users.name, assets.contact, \'User\') as resolved_user_name'),
            db.raw('COALESCE(hr_employees.phone, users.whatsapp) as resolved_whatsapp'),
            db.raw('COALESCE(ricoh_departments.name, hr_employees.department, users.department, assets.location, \'General\') as department_name')
        );

    // Fetch already notified thresholds for current billing cycle
    const sentLogs = await db('ricoh_quota_notifications')
        .where('billing_cycle', billingCycle)
        .select('device_id', 'threshold_level');

    const notifiedSet = new Set(sentLogs.map(l => `${l.device_id}_${l.threshold_level}`));

    return devices.map(d => {
        const quotaBw = Number(d.monthly_quota_bw) || 1000;
        const usageBw = Number(d.current_usage_bw) || 0;
        const quotaColor = Number(d.monthly_quota_color) || 500;
        const usageColor = Number(d.current_usage_color) || 0;
        const quotaCopier = Number(d.monthly_quota_copier) || 200;
        const usageCopier = Number(d.current_usage_copier_bw || 0) + Number(d.current_usage_copier_color || 0);

        const remainingBw = Math.max(0, quotaBw - usageBw);
        const remainingColor = Math.max(0, quotaColor - usageColor);
        const remainingCopier = Math.max(0, quotaCopier - usageCopier);

        const bwPct = Math.round((usageBw / quotaBw) * 100);
        const colorPct = Math.round((usageColor / quotaColor) * 100);
        const copierPct = Math.round((usageCopier / quotaCopier) * 100);
        const maxPct = Math.max(bwPct, colorPct, copierPct);

        // Warning threshold per category:
        // Minimal 20 lembar atau 10% dari kuota total
        const warnLimitBw = Math.min(20, Math.max(1, Math.round(quotaBw * 0.10)));
        const warnLimitColor = Math.min(20, Math.max(1, Math.round(quotaColor * 0.10)));
        const warnLimitCopier = Math.min(20, Math.max(1, Math.round(quotaCopier * 0.10)));

        const isExhausted = usageCopier >= quotaCopier || 
                            (quotaBw > 0 && usageBw >= quotaBw) || 
                            (quotaColor > 0 && usageColor >= quotaColor) ||
                            d.copier_status === 'locked' || 
                            d.status === 'locked';

        const isWarning = !isExhausted && (
            (remainingCopier <= warnLimitCopier && quotaCopier > 0) ||
            (remainingBw <= warnLimitBw && quotaBw > 0) ||
            (remainingColor <= warnLimitColor && quotaColor > 0) ||
            maxPct >= 90
        );

        let currentThreshold = 0;
        if (isExhausted) {
            currentThreshold = 100;
        } else if (isWarning) {
            currentThreshold = 90;
        }

        const isNotified = currentThreshold > 0 ? notifiedSet.has(`${d.id}_${currentThreshold}`) : false;
        const waClean = normalizeWhatsappNumber(d.resolved_whatsapp);

        return {
            ...d,
            display_user: d.resolved_user_name || d.asset_contact || 'Unassigned',
            whatsapp_number: waClean,
            has_whatsapp: !!waClean,
            usage_bw: usageBw,
            quota_bw: quotaBw,
            remaining_bw: remainingBw,
            warn_limit_bw: warnLimitBw,
            bw_pct: bwPct,
            usage_color: usageColor,
            quota_color: quotaColor,
            remaining_color: remainingColor,
            warn_limit_color: warnLimitColor,
            color_pct: colorPct,
            usage_copier: usageCopier,
            quota_copier: quotaCopier,
            remaining_copier: remainingCopier,
            warn_limit_copier: warnLimitCopier,
            copier_pct: copierPct,
            max_pct: maxPct,
            current_threshold: currentThreshold,
            is_notified_for_current_threshold: isNotified,
            billing_cycle: billingCycle
        };
    });
}

/**
 * Sends a single WhatsApp quota warning
 */
async function sendQuotaWarning(deviceData, org = 'TCF-SG') {
    const db = getDb(org);
    const {
        id: device_id,
        computer_name,
        display_user,
        department_name,
        user_code,
        usage_bw, quota_bw, remaining_bw, bw_pct,
        usage_color, quota_color, remaining_color, color_pct,
        usage_copier, quota_copier, remaining_copier, copier_pct,
        max_pct, current_threshold, billing_cycle,
        whatsapp_number
    } = deviceData;

    if (!current_threshold || current_threshold < 90) {
        return { status: 'SKIPPED', message: 'Usage is within safe quota limits.' };
    }

    const titlePrefix = current_threshold >= 100 
        ? '⛔ *[PERINGATAN KUOTA RICOH - KUOTA HABIS & TERKUNCI]* ⛔'
        : '⚠️ *[PERINGATAN KUOTA RICOH - SISA KUOTA MENIPIS]* ⚠️';

    const message = (
        `${titlePrefix}\n\n` +
        `Halo *${display_user}*,\n` +
        `🏢 *Departemen*: ${department_name}\n` +
        `🖥️ *Perangkat*: \`${computer_name}\`\n` +
        `🔑 *PIN (User Code)*: \`${user_code || '-'}\`\n\n` +
        `📊 *Status Pemakaian Kuota Bulan Ini:*\n` +
        `• 📄 Print B&W: *${usage_bw} / ${quota_bw}* lembar (Sisa: *${remaining_bw}* lembar)\n` +
        `• 🎨 Print Color: *${usage_color} / ${quota_color}* lembar (Sisa: *${remaining_color}* lembar)\n` +
        `• 📋 Fotokopi: *${usage_copier} / ${quota_copier}* lembar (Sisa: *${remaining_copier}* lembar)\n\n` +
        (current_threshold >= 100 
            ? `⚠️ *Status:* *KUOTA TELAH HABIS / TERKUNCI*\n_Akses fotokopi/cetak otomatis diblokir di mesin fisik. Silakan hubungi Tim ICT Helpdesk jika memerlukan kuota tambahan._\n\n`
            : `⚠️ *Status:* *SISA KUOTA MENIPIS*\n_Sisa kuota Anda tersisa sedikit (kurang dari 10% / 20 lembar). Mohon gunakan cetakan hanya untuk operasional penting agar tidak terblokir otomatis._\n\n`) +
        `📅 *Catatan:* Kuota akan direset otomatis pada tanggal 21 bulan depan.\n\n` +
        `_Sistem Manajemen Power Asset ICT TCFSG_`
    );

    const recipient = whatsapp_number || HELPDESK_GROUP;
    const sendStatus = whatsapp_number ? 'SENT' : 'NO_WA_SENT_TO_HELPDESK';

    try {
        console.log(`[QUOTA NOTIFIER] Dispatching WA alert to ${recipient} for ${computer_name} (Threshold: ${current_threshold})...`);
        await axios.post(WA_API_URL, {
            to: recipient,
            message: message,
            shouldLog: false
        }, { timeout: 8000 });

        // Record log to prevent duplicate notifications
        try {
            await db('ricoh_quota_notifications')
                .insert({
                    device_id,
                    computer_name,
                    user_name: display_user,
                    whatsapp_target: String(recipient).slice(0, 100),
                    threshold_level: current_threshold,
                    billing_cycle,
                    message_text: message,
                    status: String(sendStatus || 'SENT').slice(0, 50)
                })
                .onConflict(['device_id', 'threshold_level', 'billing_cycle'])
                .ignore();
        } catch (dbErr) {
            console.error(`[QUOTA NOTIFIER DB ERROR] Could not log notification for ${computer_name}:`, dbErr.message);
        }

        console.log(`[QUOTA NOTIFIER] ✅ WA sent successfully to ${recipient} for ${computer_name}`);
        return { success: true, recipient, status: sendStatus };
    } catch (err) {
        console.error(`[QUOTA NOTIFIER ERROR] Failed sending to ${recipient}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Checks all devices and dispatches warning notifications for unnotified thresholds
 */
async function checkAndDispatchAllQuotaWarnings(org = 'TCF-SG') {
    try {
        console.log('[QUOTA NOTIFIER] Evaluating all devices for quota warnings (thresholds 90% and 100%)...');
        const devices = await getDeviceQuotaStatuses(org);
        const candidates = devices.filter(d => d.current_threshold >= 90 && !d.is_notified_for_current_threshold);

        console.log(`[QUOTA NOTIFIER] Found ${candidates.length} candidate devices needing notifications.`);
        const results = [];

        for (const candidate of candidates) {
            const res = await sendQuotaWarning(candidate, org);
            results.push({
                computer_name: candidate.computer_name,
                user: candidate.display_user,
                threshold: candidate.current_threshold,
                result: res
            });
            // Small pause between WA messages to avoid rate limits
            await new Promise(r => setTimeout(r, 1000));
        }

        return { total_evaluated: devices.length, candidate_count: candidates.length, results };
    } catch (err) {
        console.error('[QUOTA NOTIFIER] Global error:', err.message);
        return { total_evaluated: 0, candidate_count: 0, error: err.message };
    }
}

module.exports = {
    getCurrentBillingCycle,
    normalizeWhatsappNumber,
    getDeviceQuotaStatuses,
    sendQuotaWarning,
    checkAndDispatchAllQuotaWarnings
};
