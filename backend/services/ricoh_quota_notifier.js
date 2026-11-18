/**
 * Ricoh Quota Warning & WhatsApp Notification Service
 * Monitors active devices for quota usage reaching warning threshold (sisa <= 20 lembar / 10%) and 100% (habis / terkunci).
 * Automatically alerts users via WhatsApp using existing bot gateway.
 */

const { getDb } = require('../db');
const axios = require('axios');
const configService = require('./configService');

const WA_API_URL = process.env.WA_API_URL || 'http://127.0.0.1:5002/send-message';
const HELPDESK_GROUP = 'GROUP:Tehnisi Helpdesk TCFSG';

const ensuredSupervisorDbs = new WeakSet();
async function ensureSupervisorColumns(db) {
    if (!db || ensuredSupervisorDbs.has(db)) return;
    try {
        const hasCol = await db.schema.hasColumn('ricoh_device_quotas', 'supervisor_hr_id');
        if (!hasCol) {
            await db.schema.table('ricoh_device_quotas', function (table) {
                table.integer('supervisor_hr_id').nullable();
                table.string('supervisor_name', 150).nullable();
                table.string('supervisor_whatsapp', 40).nullable();
                table.string('wa_notify_mode', 32).defaultTo('auto');
            });
        }
        ensuredSupervisorDbs.add(db);
    } catch (e) {
        console.warn('[QUOTA NOTIFIER] ensureSupervisorColumns warning:', e.message);
    }
}

async function isWaQuotaNotificationsEnabled() {
    try {
        const val = await configService.get('ricoh', 'wa_quota_notifications_enabled', true);
        return val !== false && val !== 'false' && val !== 0 && val !== '0';
    } catch (e) {
        return true;
    }
}

async function getWaNotificationConfig() {
    const enabled = await isWaQuotaNotificationsEnabled();
    let recipientMode = 'user_only';
    let exhaustedOnly = false;
    try {
        const modeVal = await configService.get('ricoh', 'wa_quota_recipient_mode', 'user_only');
        if (['user_only', 'supervisor_only', 'both'].includes(String(modeVal))) {
            recipientMode = String(modeVal);
        }
        const exVal = await configService.get('ricoh', 'wa_quota_exhausted_only', false);
        exhaustedOnly = exVal === true || exVal === 'true' || exVal === 1 || exVal === '1';
    } catch (e) {}
    return { enabled, recipientMode, exhaustedOnly };
}

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
async function getDeviceQuotaStatuses(org = (process.env.PLANT_CODE || 'TCF-KG')) {
    const db = getDb(org);
    await ensureSupervisorColumns(db);
    const billingCycle = getCurrentBillingCycle();

    const devices = await db('ricoh_device_quotas')
        .leftJoin('assets', 'assets.id', db.raw('COALESCE(ricoh_device_quotas.asset_id, (SELECT a2.id FROM assets a2 WHERE a2.name = ricoh_device_quotas.computer_name LIMIT 1))'))
        .leftJoin('users', 'assets.user_id', 'users.id')
        .leftJoin('hr_employees', function() {
            this.on('assets.hr_employee_id', '=', 'hr_employees.id')
                .orOn('users.hr_employee_id', '=', 'hr_employees.id');
        })
        .leftJoin('hr_employees as sup_hr', 'ricoh_device_quotas.supervisor_hr_id', 'sup_hr.id')
        .leftJoin('ricoh_departments', 'ricoh_device_quotas.department_id', 'ricoh_departments.id')
        .select(
            'ricoh_device_quotas.id',
            'ricoh_device_quotas.computer_name',
            'ricoh_device_quotas.ip_address',
            'ricoh_device_quotas.user_code',
            'ricoh_device_quotas.status',
            'ricoh_device_quotas.copier_status',
            'ricoh_device_quotas.copier_bw_status',
            'ricoh_device_quotas.copier_color_status',
            'ricoh_device_quotas.monthly_quota_bw',
            'ricoh_device_quotas.current_usage_bw',
            'ricoh_device_quotas.monthly_quota_color',
            'ricoh_device_quotas.current_usage_color',
            'ricoh_device_quotas.monthly_quota_copier',
            'ricoh_device_quotas.monthly_quota_copier_bw',
            'ricoh_device_quotas.monthly_quota_copier_color',
            'ricoh_device_quotas.current_usage_copier_bw',
            'ricoh_device_quotas.current_usage_copier_color',
            'ricoh_device_quotas.supervisor_hr_id',
            'ricoh_device_quotas.supervisor_name',
            'ricoh_device_quotas.supervisor_whatsapp',
            'ricoh_device_quotas.wa_notify_mode',
            'sup_hr.name as supervisor_hr_name',
            'sup_hr.position as supervisor_hr_position',
            'sup_hr.phone as supervisor_hr_phone',
            'assets.id as asset_id',
            'assets.name as asset_name',
            'assets.location as asset_location',
            'assets.contact as asset_contact',
            'users.id as user_id',
            'users.username as resolved_username',
            'hr_employees.nik as resolved_nik',
            db.raw('COALESCE(hr_employees.name, users.name, assets.contact, \'User\') as resolved_user_name'),
            db.raw('COALESCE(hr_employees.phone, users.whatsapp) as resolved_whatsapp'),
            db.raw('COALESCE(hr_employees.department, users.department, ricoh_departments.name, assets.location, \'General\') as department_name')
        );

    // Fetch already notified thresholds for current billing cycle
    const sentLogs = await db('ricoh_quota_notifications')
        .where('billing_cycle', billingCycle)
        .select('device_id', 'threshold_level');

    const notifiedSet = new Set(sentLogs.map(l => `${l.device_id}_${l.threshold_level}`));

    return devices.map(d => {
        const quotaBw = d.monthly_quota_bw != null ? Number(d.monthly_quota_bw) : 1000;
        const usageBw = Number(d.current_usage_bw) || 0;
        const quotaColor = d.monthly_quota_color != null ? Number(d.monthly_quota_color) : 500;
        const usageColor = Number(d.current_usage_color) || 0;

        const fallbackCopierTotal = d.monthly_quota_copier != null ? Number(d.monthly_quota_copier) : 200;
        const quotaCopierBw = d.monthly_quota_copier_bw != null ? Number(d.monthly_quota_copier_bw) : Math.round(fallbackCopierTotal * 0.8);
        const quotaCopierColor = d.monthly_quota_copier_color != null ? Number(d.monthly_quota_copier_color) : Math.max(0, fallbackCopierTotal - quotaCopierBw);
        const usageCopierBw = Number(d.current_usage_copier_bw) || 0;
        const usageCopierColor = Number(d.current_usage_copier_color) || 0;

        const quotaCopier = quotaCopierBw + quotaCopierColor;
        const usageCopier = usageCopierBw + usageCopierColor;

        const remainingBw = Math.max(0, quotaBw - usageBw);
        const remainingColor = Math.max(0, quotaColor - usageColor);
        const remainingCopierBw = Math.max(0, quotaCopierBw - usageCopierBw);
        const remainingCopierColor = Math.max(0, quotaCopierColor - usageCopierColor);
        const remainingCopier = Math.max(0, quotaCopier - usageCopier);

        const bwPct = quotaBw > 0 ? Math.round((usageBw / quotaBw) * 100) : (usageBw > 0 ? 100 : 0);
        const colorPct = quotaColor > 0 ? Math.round((usageColor / quotaColor) * 100) : (usageColor > 0 ? 100 : 0);
        const copierBwPct = quotaCopierBw > 0 ? Math.round((usageCopierBw / quotaCopierBw) * 100) : (usageCopierBw > 0 ? 100 : 0);
        const copierColorPct = quotaCopierColor > 0 ? Math.round((usageCopierColor / quotaCopierColor) * 100) : (usageCopierColor > 0 ? 100 : 0);
        const copierPct = quotaCopier > 0 ? Math.round((usageCopier / quotaCopier) * 100) : (usageCopier > 0 ? 100 : 0);
        const maxPct = Math.max(bwPct, colorPct, copierBwPct, copierColorPct);

        // Warning threshold per category:
        // Minimal 20 lembar atau 10% dari kuota total
        const warnLimitBw = quotaBw > 0 ? Math.min(20, Math.max(1, Math.round(quotaBw * 0.10))) : 0;
        const warnLimitColor = quotaColor > 0 ? Math.min(20, Math.max(1, Math.round(quotaColor * 0.10))) : 0;
        const warnLimitCopier = quotaCopier > 0 ? Math.min(20, Math.max(1, Math.round(quotaCopier * 0.10))) : 0;

        const isExhausted = (quotaCopierBw > 0 ? usageCopierBw >= quotaCopierBw : usageCopierBw > 0) ||
                            (quotaCopierColor > 0 ? usageCopierColor >= quotaCopierColor : usageCopierColor > 0) ||
                            (quotaBw > 0 ? usageBw >= quotaBw : usageBw > 0) ||
                            (quotaColor > 0 ? usageColor >= quotaColor : usageColor > 0) ||
                            d.copier_bw_status === 'locked' ||
                            d.copier_color_status === 'locked' ||
                            d.copier_status === 'locked' || 
                            d.status === 'locked';

        // Peringatan HANYA dikirim saat kuota mencapai 99%
        const isWarning = !isExhausted && maxPct >= 99;

        let currentThreshold = 0;
        if (isExhausted) {
            currentThreshold = 100;
        } else if (isWarning) {
            currentThreshold = 99;
        }

        const isNotified = currentThreshold > 0 ? notifiedSet.has(`${d.id}_${currentThreshold}`) : false;
        const waClean = normalizeWhatsappNumber(d.resolved_whatsapp);
        const supWaClean = normalizeWhatsappNumber(d.supervisor_hr_phone || d.supervisor_whatsapp);
        const supName = d.supervisor_hr_name || d.supervisor_name || null;

        return {
            ...d,
            display_user: d.resolved_user_name || d.asset_contact || 'Unassigned',
            whatsapp_number: waClean,
            has_whatsapp: !!waClean,
            supervisor_display_name: supName,
            supervisor_position: d.supervisor_hr_position || null,
            supervisor_whatsapp_clean: supWaClean,
            has_supervisor_whatsapp: !!supWaClean,
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
            usage_copier_bw: usageCopierBw,
            quota_copier_bw: quotaCopierBw,
            remaining_copier_bw: remainingCopierBw,
            copier_bw_pct: copierBwPct,
            usage_copier_color: usageCopierColor,
            quota_copier_color: quotaCopierColor,
            remaining_copier_color: remainingCopierColor,
            copier_color_pct: copierColorPct,
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
async function sendQuotaWarning(deviceData, org = (process.env.PLANT_CODE || 'TCF-KG'), isTest = false) {
    const waConfig = await getWaNotificationConfig();
    if (!isTest && !waConfig.enabled) {
        console.log(`[QUOTA NOTIFIER] WA Quota notifications paused/disabled. Skipping alert for ${deviceData?.computer_name || 'device'}.`);
        return { success: false, paused: true, status: 'PAUSED', message: 'Notifikasi WA kuota sedang dinonaktifkan.' };
    }
    const db = getDb(org);
    let {
        id: device_id,
        computer_name,
        display_user,
        department_name,
        user_code,
        usage_bw, quota_bw, remaining_bw, bw_pct,
        usage_color, quota_color, remaining_color, color_pct,
        usage_copier_bw, quota_copier_bw, remaining_copier_bw,
        usage_copier_color, quota_copier_color, remaining_copier_color,
        usage_copier, quota_copier, remaining_copier, copier_pct,
        max_pct, current_threshold, billing_cycle,
        whatsapp_number,
        supervisor_display_name,
        supervisor_position,
        supervisor_whatsapp_clean,
        wa_notify_mode,
        resolved_username,
        resolved_nik
    } = deviceData;

    if (!isTest && (!current_threshold || current_threshold < 99)) {
        return { status: 'SKIPPED', message: 'Usage is within safe quota limits (under 99%).' };
    }
    if (!isTest && waConfig.exhaustedOnly && current_threshold < 100) {
        return { status: 'SKIPPED', message: 'Mode hanya kirim notifikasi saat kuota habis (100%).' };
    }

    // Fallback lookup for exact portal username & NIK password if asset wasn't linked via hr_employee_id
    if ((!resolved_username || !resolved_nik) && display_user && display_user !== 'Unassigned' && display_user !== 'User') {
        try {
            const matchedUser = await db('users')
                .leftJoin('hr_employees', 'users.hr_employee_id', 'hr_employees.id')
                .whereRaw('LOWER(TRIM(users.name)) = LOWER(TRIM(?))', [display_user])
                .orWhereRaw('LOWER(TRIM(hr_employees.name)) = LOWER(TRIM(?))', [display_user])
                .select('users.username', 'hr_employees.nik as hr_nik')
                .first();
            if (matchedUser) {
                if (!resolved_username && matchedUser.username) resolved_username = matchedUser.username;
                if (!resolved_nik && matchedUser.hr_nik) resolved_nik = matchedUser.hr_nik;
            }
            if (!resolved_nik) {
                const matchedEmp = await db('hr_employees')
                    .whereRaw('LOWER(TRIM(name)) = LOWER(TRIM(?))', [display_user])
                    .select('nik')
                    .first();
                if (matchedEmp && matchedEmp.nik) resolved_nik = matchedEmp.nik;
            }
        } catch (lookupErr) {
            console.warn('[QUOTA NOTIFIER] Fallback credential lookup error:', lookupErr.message);
        }
    }

    let titlePrefix = '⚠️ *[PERINGATAN KUOTA RICOH TCF]* ⚠️';
    if (current_threshold >= 100) {
        titlePrefix = '⛔ *[PERINGATAN: KUOTA RICOH HABIS & TERKUNCI]* ⛔';
    } else if (isTest) {
        titlePrefix = '📊 *[INFORMASI STATUS & KUOTA RICOH TCF]* 📊';
    }

    const fallbackShortUser = (display_user || 'user').trim().split(/\s+/)[0].toLowerCase();
    const loginUsername = (resolved_username || fallbackShortUser).trim();
    const cleanNikPassword = resolved_nik ? String(resolved_nik).replace(/[^0-9a-zA-Z]/g, '') : '';
    const passwordInfo = cleanNikPassword ? `\`${cleanNikPassword}\` _(NIK tanpa titik)_` : `NIK Anda (tanpa titik)`;

    const message = (
        `${titlePrefix}\n\n` +
        `Halo *${display_user}*,\n` +
        `Berikut adalah status informasi kuota cetak printer & fotokopi mesin Ricoh pada perangkat kerja Anda:\n\n` +
        `🏢 *Departemen*: ${department_name}\n` +
        `🖥️ *Perangkat*: \`${computer_name}\`\n` +
        `🔑 *PIN (User Code)*: \`${user_code || '-'}\`\n\n` +
        `📊 *STATUS RINCIAN KUOTA BULAN INI:*\n` +
        `• 📄 *Print B&W*: *${usage_bw} / ${quota_bw}* lbr _(Sisa: *${remaining_bw}* lbr)_\n` +
        `• 🎨 *Print Color*: *${usage_color} / ${quota_color}* lbr _(Sisa: *${remaining_color}* lbr)_\n` +
        `• 📋 *Copy B&W*: *${usage_copier_bw ?? usage_copier} / ${quota_copier_bw ?? quota_copier}* lbr _(Sisa: *${remaining_copier_bw ?? remaining_copier}* lbr)_\n` +
        `• 🌈 *Copy Color*: *${usage_copier_color ?? 0} / ${quota_copier_color ?? 0}* lbr _(Sisa: *${remaining_copier_color ?? 0}* lbr)_\n\n` +
        (current_threshold >= 100 
            ? `⚠️ *Pemberitahuan:* Kuota Anda telah habis. Akses cetak/fotokopi terkunci otomatis di mesin fisik.\n\n`
            : (max_pct >= 90 
                ? `⚠️ *Pemberitahuan:* Kuota pemakaian Anda telah mencapai ${max_pct}%. Mohon gunakan sisa kuota untuk keperluan penting atau ajukan penambahan.\n\n`
                : `✅ *Status:* Kuota Anda saat ini dalam kondisi aman (${max_pct}% terpakai).\n\n`)) +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔗 *FORM PENGAJUAN TAMBAHAN KUOTA:*\n` +
        `Jika membutuhkan penambahan kuota, silakan klik tautan resmi Support Center ICT di bawah ini:\n\n` +
        `👉 https://helpdesk.tricentrumfortuna.com/support\n\n` +
        `🔐 *INFO LOGIN PORTAL:*\n` +
        `• *Username:* \`${loginUsername}\`\n` +
        `• *Password:* ${passwordInfo}\n` +
        `_(Setelah login, data pemohon, NIK, departemen, dan perangkat Anda langsung otomatis terisi tanpa perlu ketik manual!)_\n\n` +
        `📅 *Catatan:* Siklus kuota berjalan hingga tanggal 20 setiap bulannya.\n\n` +
        `_Pusat Layanan Support Center & Asset ICT PT. Tri Centrum Fortuna_`
    );

    const effectiveMode = (wa_notify_mode && ['user_only', 'supervisor_only', 'both'].includes(String(wa_notify_mode)))
        ? String(wa_notify_mode)
        : waConfig.recipientMode;

    const supervisorMessage = (
        `${titlePrefix}\n\n` +
        `Yth. *${supervisor_display_name || 'Atasan'}*${supervisor_position ? ` (${supervisor_position})` : ''},\n` +
        `Menginformasikan status kuota cetak printer & fotokopi Ricoh untuk anggota tim Anda berikut ini:\n\n` +
        `👤 *Pengguna*: *${display_user}*\n` +
        `🏢 *Departemen*: ${department_name}\n` +
        `🖥️ *Perangkat*: \`${computer_name}\`\n` +
        `🔑 *PIN (User Code)*: \`${user_code || '-'}\`\n\n` +
        `📊 *STATUS RINCIAN KUOTA BULAN INI:*\n` +
        `• 📄 *Print B&W*: *${usage_bw} / ${quota_bw}* lbr _(Sisa: *${remaining_bw}* lbr)_\n` +
        `• 🎨 *Print Color*: *${usage_color} / ${quota_color}* lbr _(Sisa: *${remaining_color}* lbr)_\n` +
        `• 📋 *Copy B&W*: *${usage_copier_bw ?? usage_copier} / ${quota_copier_bw ?? quota_copier}* lbr _(Sisa: *${remaining_copier_bw ?? remaining_copier}* lbr)_\n` +
        `• 🌈 *Copy Color*: *${usage_copier_color ?? 0} / ${quota_copier_color ?? 0}* lbr _(Sisa: *${remaining_copier_color ?? 0}* lbr)_\n\n` +
        (current_threshold >= 100
            ? `⚠️ *Pemberitahuan:* Kuota pengguna telah *HABIS*. Akses cetak/fotokopi terkunci otomatis di mesin fisik sampai ada penambahan kuota atau pergantian siklus.\n\n`
            : (max_pct >= 90
                ? `⚠️ *Pemberitahuan:* Pemakaian kuota sudah mencapai *${max_pct}%*.\n\n`
                : `✅ *Status:* Kuota saat ini dalam kondisi aman (${max_pct}% terpakai).\n\n`)) +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔗 Jika disetujui untuk penambahan kuota, pengajuan resmi dapat dilakukan melalui portal:\n` +
        `👉 https://helpdesk.tricentrumfortuna.com/support\n\n` +
        `📅 *Catatan:* Siklus kuota berjalan hingga tanggal 20 setiap bulannya.\n\n` +
        `_Pusat Layanan Support Center & Asset ICT PT. Tri Centrum Fortuna_`
    );

    const deliveries = [];
    if (effectiveMode === 'supervisor_only') {
        if (supervisor_whatsapp_clean) {
            deliveries.push({ to: supervisor_whatsapp_clean, text: supervisorMessage, status: isTest ? 'TEST_SUPERVISOR' : 'SENT_TO_SUPERVISOR' });
        } else {
            deliveries.push({ to: HELPDESK_GROUP, text: supervisorMessage, status: 'NO_SUPERVISOR_SENT_TO_HELPDESK' });
        }
    } else if (effectiveMode === 'both') {
        if (whatsapp_number) deliveries.push({ to: whatsapp_number, text: message, status: isTest ? 'TEST_SENT' : 'SENT' });
        if (supervisor_whatsapp_clean) deliveries.push({ to: supervisor_whatsapp_clean, text: supervisorMessage, status: isTest ? 'TEST_SUPERVISOR' : 'SENT_TO_SUPERVISOR' });
        if (deliveries.length === 0) deliveries.push({ to: HELPDESK_GROUP, text: message, status: 'NO_WA_SENT_TO_HELPDESK' });
    } else {
        deliveries.push({
            to: whatsapp_number || HELPDESK_GROUP,
            text: message,
            status: whatsapp_number ? (isTest ? 'TEST_SENT' : 'SENT') : 'NO_WA_SENT_TO_HELPDESK'
        });
    }

    try {
        for (const dItem of deliveries) {
            console.log(`[QUOTA NOTIFIER] Dispatching WA alert (${effectiveMode}) to ${dItem.to} for ${computer_name} (Threshold: ${current_threshold}, isTest: ${isTest})...`);
            await axios.post(WA_API_URL, {
                to: dItem.to,
                message: dItem.text,
                shouldLog: false
            }, { timeout: 8000 });
        }

        const primaryTarget = deliveries.map(d => d.to).join(', ');
        const primaryStatus = deliveries[0]?.status || 'SENT';
        const primaryText = deliveries[0]?.text || message;

        try {
            await db('ricoh_quota_notifications')
                .insert({
                    device_id,
                    computer_name,
                    user_name: display_user,
                    whatsapp_target: String(primaryTarget).slice(0, 100),
                    threshold_level: isTest ? 999 : current_threshold,
                    billing_cycle,
                    message_text: primaryText,
                    status: String(primaryStatus).slice(0, 50)
                })
                .onConflict(['device_id', 'threshold_level', 'billing_cycle'])
                .ignore();
        } catch (dbErr) {
            console.error(`[QUOTA NOTIFIER DB ERROR] Could not log notification for ${computer_name}:`, dbErr.message);
        }

        console.log(`[QUOTA NOTIFIER] ✅ WA sent successfully to ${primaryTarget} for ${computer_name}`);
        return { success: true, recipient: primaryTarget, status: primaryStatus, mode: effectiveMode, message_sent: primaryText };
    } catch (err) {
        console.error(`[QUOTA NOTIFIER ERROR] Failed sending WA for ${computer_name}:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Checks all devices and dispatches warning notifications for unnotified thresholds
 */
async function checkAndDispatchAllQuotaWarnings(org = (process.env.PLANT_CODE || 'TCF-KG')) {
    try {
        const waConfig = await getWaNotificationConfig();
        if (!waConfig.enabled) {
            console.log(`[QUOTA NOTIFIER] [${org}] WA Quota notifications paused/disabled via settings. Skipping auto-dispatch.`);
            return { total_evaluated: 0, candidate_count: 0, paused: true, results: [] };
        }
        console.log('[QUOTA NOTIFIER] Evaluating all devices for quota warnings (thresholds 99% and 100%)...');
        const devices = await getDeviceQuotaStatuses(org);
        const candidates = devices.filter(d => {
            if (!d.current_threshold || d.current_threshold < 99) return false;
            if (waConfig.exhaustedOnly && d.current_threshold < 100) return false;
            return !d.is_notified_for_current_threshold;
        });

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
    ensureSupervisorColumns,
    isWaQuotaNotificationsEnabled,
    getWaNotificationConfig,
    getCurrentBillingCycle,
    normalizeWhatsappNumber,
    getDeviceQuotaStatuses,
    sendQuotaWarning,
    checkAndDispatchAllQuotaWarnings
};
