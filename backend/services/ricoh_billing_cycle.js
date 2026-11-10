const cron = require('node-cron');
const { getDb } = require('../db');

/**
 * Calculates current active billing cycle (21st to 21st).
 * If today is >= 21: cycle starts on 21st of this month, ends on 20th of next month.
 * If today is < 21: cycle starts on 21st of previous month, ends on 20th of this month.
 */
function getCurrentBillingCycle(refDate = new Date()) {
    const d = new Date(refDate);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed: 0 = Jan, 9 = Oct
    const day = d.getDate();

    let startYear = year;
    let startMonth = month;
    let endYear = year;
    let endMonth = month + 1;

    if (day >= 21) {
        startYear = year;
        startMonth = month;
        if (month === 11) {
            endYear = year + 1;
            endMonth = 0;
        } else {
            endYear = year;
            endMonth = month + 1;
        }
    } else {
        if (month === 0) {
            startYear = year - 1;
            startMonth = 11;
        } else {
            startYear = year;
            startMonth = month - 1;
        }
        endYear = year;
        endMonth = month;
    }

    const startMonthStr = String(startMonth + 1).padStart(2, '0');
    const endMonthStr = String(endMonth + 1).padStart(2, '0');
    
    const startDate = `${startYear}-${startMonthStr}-21`;
    const endDate = `${endYear}-${endMonthStr}-20`;
    // Billing month label corresponds to the month when counter is collected/billed on the 21st
    const billingMonth = `${endYear}-${endMonthStr}`;

    // Calculate days remaining until next 21st reset
    const nextResetDate = new Date(endYear, endMonth, 21, 0, 0, 0);
    const diffMs = nextResetDate.getTime() - d.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const label = `21 ${monthsIndo[startMonth]} ${startYear} s/d 20 ${monthsIndo[endMonth]} ${endYear}`;

    return {
        startDate,
        endDate,
        billingMonth,
        daysRemaining,
        label,
        nextResetDate: nextResetDate.toISOString()
    };
}

/**
 * Calculates previous completed billing cycle.
 */
function getPreviousBillingCycle(refDate = new Date()) {
    const current = getCurrentBillingCycle(refDate);
    // Reference date 30 days prior to current start date
    const prevRef = new Date(current.startDate);
    prevRef.setDate(prevRef.getDate() - 5);
    return getCurrentBillingCycle(prevRef);
}

/**
 * Performs archiving of daily usage into ricoh_monthly_usage
 * and resets all active quotas in ricoh_device_quotas.
 */
async function performBillingCycleReset(customCycle = null, org = 'TCF-SG') {
    const db = getDb(org || 'TCF-SG');
    const cycle = customCycle || getPreviousBillingCycle();
    console.log(`[RICOH BILLING] [${org}] Starting Billing Cycle Reset for period: ${cycle.startDate} to ${cycle.endDate} (Billing Month: ${cycle.billingMonth})...`);

    try {
        // 1. Aggregate usage from ricoh_daily_usage for the cycle
        const dailySummary = await db('ricoh_daily_usage')
            .where('date', '>=', cycle.startDate)
            .andWhere('date', '<=', cycle.endDate)
            .groupBy('computer_name', 'user_code', 'department_id')
            .select(
                'computer_name',
                'user_code',
                'department_id',
                db.raw('COALESCE(SUM(bw_usage), 0)::integer as bw_usage'),
                db.raw('COALESCE(SUM(color_usage), 0)::integer as color_usage'),
                db.raw('COALESCE(SUM(copier_bw_usage), 0)::integer as copier_bw_usage'),
                db.raw('COALESCE(SUM(copier_color_usage), 0)::integer as copier_color_usage')
            );

        console.log(`[RICOH BILLING] Aggregated ${dailySummary.length} device records from daily usage.`);

        // 2. Insert or update into ricoh_monthly_usage
        let archivedCount = 0;
        for (const record of dailySummary) {
            const total = Number(record.bw_usage) + Number(record.color_usage) + Number(record.copier_bw_usage) + Number(record.copier_color_usage);
            if (total <= 0) continue;

            const existing = await db('ricoh_monthly_usage')
                .where({
                    month: cycle.billingMonth,
                    computer_name: record.computer_name
                })
                .first();

            if (existing) {
                await db('ricoh_monthly_usage')
                    .where('id', existing.id)
                    .update({
                        user_code: record.user_code,
                        department_id: record.department_id,
                        bw_usage: record.bw_usage,
                        color_usage: record.color_usage,
                        copier_bw_usage: record.copier_bw_usage,
                        copier_color_usage: record.copier_color_usage,
                        created_at: db.fn.now()
                    });
            } else {
                await db('ricoh_monthly_usage').insert({
                    month: cycle.billingMonth,
                    computer_name: record.computer_name,
                    user_code: record.user_code,
                    department_id: record.department_id,
                    bw_usage: record.bw_usage,
                    color_usage: record.color_usage,
                    copier_bw_usage: record.copier_bw_usage,
                    copier_color_usage: record.copier_color_usage,
                    created_at: db.fn.now()
                });
            }
            archivedCount++;
        }

        console.log(`[RICOH BILLING] Archived ${archivedCount} records into ricoh_monthly_usage for ${cycle.billingMonth}.`);

        // 3. Reset active quotas and unlock copiers in ricoh_device_quotas
        await db('ricoh_device_quotas').update({
            current_usage_bw: 0,
            current_usage_color: 0,
            current_usage_copier_bw: 0,
            current_usage_copier_color: 0,
            current_usage: 0,
            copier_status: 'active',
            last_reset: db.fn.now()
        });

        try {
            const { unlockAllCopiers } = require('./ricoh_copier_lock');
            await unlockAllCopiers(org || 'TCF-SG');
        } catch (copierErr) {
            console.error(`[RICOH BILLING] Copier unlock error on reset (${org}):`, copierErr.message);
        }

        // 4. Log the event
        const logMsg = `Billing Cycle Reset (21st) [${org}]: Period ${cycle.startDate} s/d ${cycle.endDate} archived (${archivedCount} devices). All device quotas reset to 0 and copiers unlocked.`;
        await db('ricoh_system_logs').insert({
            event_type: 'BILLING_RESET',
            message: logMsg
        });

        console.log(`[RICOH BILLING] [${org}] ✅ Quota reset successfully completed: ${logMsg}`);

        return {
            success: true,
            org,
            cycle,
            archivedCount,
            message: logMsg
        };
    } catch (err) {
        console.error(`[RICOH BILLING ERROR] [${org}] Failed to perform billing cycle reset:`, err);
        throw err;
    }
}

/**
 * Initialize automated node-cron schedule.
 * Runs at 00:01 WIB on the 21st of every month across all plants.
 */
function initBillingCycleCron() {
    // '1 0 21 * *' = at 00:01 on day-of-month 21
    cron.schedule('1 0 21 * *', async () => {
        console.log(`\n⏰ [CRON TRIGGER] 21st of the month reached! Executing Ricoh Billing Cycle Reset for SG & KG...`);
        for (const org of ['TCF-SG', 'TCF-KG']) {
            try {
                await performBillingCycleReset(null, org);
            } catch (e) {
                console.error(`[CRON ERROR] Billing cycle reset failed for ${org}:`, e.message);
            }
        }
    }, {
        timezone: 'Asia/Jakarta'
    });

    const currentCycle = getCurrentBillingCycle();
    console.log(`[RICOH BILLING] Automated 21st Reset Cron Scheduled (00:01 WIB every 21st).`);
    console.log(`[RICOH BILLING] Active Cycle: ${currentCycle.label} (${currentCycle.daysRemaining} days remaining).`);
}

module.exports = {
    getCurrentBillingCycle,
    getPreviousBillingCycle,
    performBillingCycleReset,
    initBillingCycleCron
};
