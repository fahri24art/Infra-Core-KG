/**
 * ICT KPI Time & Ticket Classification Engine
 * - Calendar minutes calculated strictly from 1st of each month (00:00:00 WIB / Asia/Jakarta)
 * - Separates Management Meeting KPIs (Server Global, ISP iForte & Comtronic/Comnet, Helpdesk HW/SW)
 *   from Local Infrastructure KPIs (AP, Ricoh, Switch/Router/Local Network).
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const SERVER_GLOBAL_PATTERNS = [
    'compro-website',
    'factoryhub',
    'factory hub',
    'helpdesk center',
    'hris center',
    'idem prod',
    'idempiere center',
    'shopfloor center',
    'vendor center',
];

const INTERNET_IFORTE_PATTERNS = ['iforte', 'isp iforte'];
const INTERNET_COMNET_PATTERNS = ['comtronic', 'comnet', 'isp comtronic', 'isp comnet'];

/**
 * Get WIB (UTC+7) calendar boundaries for a given year and 1-based month (1..12).
 * Past month: full month minutes (days * 1440)
 * Current active month: elapsed minutes from 1st 00:00 WIB up to `now`
 * Future month: totalMinutes = 0, isFuture = true
 */
function getMonthWindowWIB(year, month, nowDate = new Date()) {
    const startMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - WIB_OFFSET_MS;
    const nextStartMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - WIB_OFFSET_MS;
    const nowMs = nowDate.getTime();
    const fullMonthMinutes = Math.round((nextStartMs - startMs) / 60000);

    if (nowMs < startMs) {
        return {
            month,
            startMs,
            endMs: startMs,
            fullMonthMinutes,
            totalMinutes: 0,
            isFuture: true,
            isCurrent: false,
            isPast: false,
        };
    }

    if (nowMs >= nextStartMs) {
        return {
            month,
            startMs,
            endMs: nextStartMs,
            fullMonthMinutes,
            totalMinutes: fullMonthMinutes,
            isFuture: false,
            isCurrent: false,
            isPast: true,
        };
    }

    const elapsedMinutes = Math.max(1, Math.floor((nowMs - startMs) / 60000));
    return {
        month,
        startMs,
        endMs: nowMs,
        fullMonthMinutes,
        totalMinutes: elapsedMinutes,
        isFuture: false,
        isCurrent: true,
        isPast: false,
    };
}

/**
 * Extract target name after ':' in alert subject.
 */
function extractMonitorTarget(subject = '') {
    const idx = subject.lastIndexOf(':');
    return (idx >= 0 ? subject.slice(idx + 1) : subject).trim().toLowerCase();
}

/**
 * Classify a ticket row into:
 * - 'helpdesk' (user IT Helpdesk HW/SW ticket)
 * - 'ignore_hw_agent' (agent component alert, not downtime)
 * - 'ignore_test' (test alert)
 * - 'internet_iforte' | 'internet_comnet'
 * - 'server_global'
 * - 'local_ricoh' | 'local_ap' | 'local_network'
 */
function classifyTicketCategory(ticket) {
    const num = String(ticket.number || '');
    const sub = String(ticket.subject || '');
    const src = String(ticket.source || '');
    const subLower = sub.toLowerCase();

    if (/komponen berkurang|dicopot/i.test(subLower) || /-HW-4\d+/i.test(num)) {
        return 'ignore_hw_agent';
    }

    const isAutoIncident =
        /-IR-/i.test(num) ||
        /^ICT-2026\d{4}-/i.test(num) ||
        /\[(AUTO-ALERT|LATENCY-ALERT|INFRA-GUARD)\]/i.test(sub) ||
        src === 'Infra Guard';

    if (!isAutoIncident) {
        return 'helpdesk';
    }

    if (subLower.includes('uji coba')) {
        return 'ignore_test';
    }

    const target = extractMonitorTarget(sub);

    if (INTERNET_IFORTE_PATTERNS.some((k) => target.includes(k) || subLower.includes(k))) {
        return 'internet_iforte';
    }
    if (INTERNET_COMNET_PATTERNS.some((k) => target.includes(k) || subLower.includes(k))) {
        return 'internet_comnet';
    }

    if (
        !target.includes('(local)') &&
        SERVER_GLOBAL_PATTERNS.some((k) => target === k || target.startsWith(k))
    ) {
        return 'server_global';
    }

    if (target.includes('photocopy') || target.includes('ricoh')) {
        return 'local_ricoh';
    }

    if (target.startsWith('ap-') || target.startsWith('ap_') || target.includes('-ap')) {
        return 'local_ap';
    }

    return 'local_network';
}

/**
 * Merge overlapping [start, end] millisecond intervals so simultaneous outages
 * on multiple monitors in the same group are not double-counted.
 */
function mergeIntervals(intervals) {
    if (!intervals || intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const curr = sorted[i];
        if (curr[0] <= last[1]) {
            last[1] = Math.max(last[1], curr[1]);
        } else {
            merged.push(curr);
        }
    }
    return merged;
}

/**
 * Resolve effective [startMs, endMs] of an incident ticket.
 * Open tickets created inside an active month run up to `nowMs`;
 * legacy unclosed tickets from past months without an update cap at `updated_at`
 * to prevent infinite synthetic downtime from missed recovery webhooks.
 */
function resolveTicketInterval(ticket, nowDate = new Date()) {
    const createdMs = new Date(ticket.created_at).getTime();
    const updatedMs = new Date(ticket.updated_at || ticket.created_at).getTime();
    if (Number.isNaN(createdMs)) return null;

    const status = String(ticket.status || '').toLowerCase();
    const isClosed = status === 'closed' || status === 'resolved' || status === 'selesai';

    if (isClosed) {
        const end = Math.max(createdMs, Number.isNaN(updatedMs) ? createdMs : updatedMs);
        return [createdMs, end];
    }

    // Open / New ticket: check if created in current WIB month
    const nowWib = new Date(nowDate.getTime() + WIB_OFFSET_MS);
    const curStartMs =
        Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), 1, 0, 0, 0, 0) - WIB_OFFSET_MS;
    if (createdMs >= curStartMs) {
        return [createdMs, Math.max(createdMs, nowDate.getTime())];
    }

    // Old unclosed ticket from previous month -> bound to updatedMs (or +5m min ping window if identical)
    const fallbackEnd = updatedMs > createdMs ? updatedMs : createdMs;
    return [createdMs, fallbackEnd];
}

/**
 * Compute 12-month uptime statistics from incident tickets for a given category predicate.
 */
function computeMonthlyUptimeFromTickets({
    tickets = [],
    year,
    categoryPredicate,
    excludedSet = new Set(),
    nowDate = new Date(),
}) {
    const matchedTickets = tickets.filter((t) => {
        const cat = classifyTicketCategory(t);
        return categoryPredicate(cat, t);
    });

    const monthly = [];
    for (let m = 1; m <= 12; m++) {
        const win = getMonthWindowWIB(year, m, nowDate);
        if (win.isFuture) {
            monthly.push({
                month: m,
                total_minutes: 0,
                downtime_minutes: 0,
                uptime_minutes: 0,
                percentage: '0.00',
                incident_count: 0,
                incidents: [],
                isFuture: true,
                isCurrent: false,
            });
            continue;
        }

        const activeIntervals = [];
        const incidents = [];

        for (const t of matchedTickets) {
            const iv = resolveTicketInterval(t, nowDate);
            if (!iv) continue;
            const clipStart = Math.max(iv[0], win.startMs);
            const clipEnd = Math.min(iv[1], win.endMs);
            if (clipEnd < clipStart) continue;

            // Only include tickets that start in or intersect this month meaningfully
            if (iv[1] < win.startMs || iv[0] > win.endMs) continue;

            const durMin = Math.round((clipEnd - clipStart) / 60000);
            const isExcluded = excludedSet.has(String(t.number || t.id));

            incidents.push({
                id: t.id,
                number: t.number,
                subject: t.subject,
                target: extractMonitorTarget(t.subject),
                status: t.status,
                created_at: t.created_at,
                updated_at: t.updated_at,
                clipped_minutes: durMin,
                excluded: isExcluded,
            });

            if (!isExcluded && durMin > 0) {
                activeIntervals.push([clipStart, clipEnd]);
            }
        }

        const merged = mergeIntervals(activeIntervals);
        const rawDownMs = merged.reduce((sum, [s, e]) => sum + Math.max(0, e - s), 0);
        const downtimeMinutes = Math.min(win.totalMinutes, Math.round(rawDownMs / 60000));
        const uptimeMinutes = Math.max(0, win.totalMinutes - downtimeMinutes);
        const pct =
            win.totalMinutes > 0
                ? ((uptimeMinutes / win.totalMinutes) * 100).toFixed(2)
                : '0.00';

        monthly.push({
            month: m,
            total_minutes: win.totalMinutes,
            downtime_minutes: downtimeMinutes,
            uptime_minutes: uptimeMinutes,
            percentage: pct,
            incident_count: incidents.filter((x) => !x.excluded).length,
            incidents,
            isFuture: false,
            isCurrent: win.isCurrent,
            source: 'tickets_realtime',
        });
    }

    return monthly;
}

/**
 * Automatically open/close ISP incident tickets in `tickets` when Infra Guard detects
 * COMNET / iFORTE outage or recovery, so ISP KPI stays 100% synchronized with Infra Guard.
 */
async function recordInfraGuardIspTicket(db, { shortName, name, interfaceName, gatewayIp, degraded, reason, metricsSummary }) {
    try {
        const subjectPattern = `[INFRA-GUARD] Jaringan/ISP Terputus: ISP ${shortName}`;
        const openTicket = await db('tickets')
            .where('subject', subjectPattern)
            .whereIn('status', ['New', 'Open', 'Pending', 'In Progress'])
            .orderBy('created_at', 'desc')
            .first();

        if (degraded) {
            if (!openTicket) {
                const prefix = 'ICT-TCFSG-03-IR-';
                const rows = await db('tickets').where('number', 'like', `${prefix}%`).select('number');
                let maxSeq = 300000;
                const regex = new RegExp(`^${prefix}(\\d{6})$`);
                for (const r of rows) {
                    const match = r.number && r.number.match(regex);
                    if (match) {
                        const seq = parseInt(match[1], 10);
                        if (seq > maxSeq) maxSeq = seq;
                    }
                }
                const ticketNumber = prefix + String(maxSeq + 1).padStart(6, '0');
                await db('tickets').insert({
                    number: ticketNumber,
                    user_id: 1,
                    asset_id: null,
                    source: 'Infra Guard',
                    category: 'Network / ISP',
                    subject: subjectPattern,
                    description: `Infra Guard Smart Dual-ISP Monitor mendeteksi gangguan pada ${name} (${interfaceName} / GW ${gatewayIp}).\n\nPenyebab: ${reason}\nMetrik: ${metricsSummary || '-'}`,
                    priority: 'Critical',
                    status: 'New',
                    created_at: new Date(),
                    updated_at: new Date(),
                });
                console.log(`[InfraGuard Ticket] Created ISP outage ticket ${ticketNumber}: ${subjectPattern}`);
            }
        } else if (openTicket) {
            await db('ticket_responses').insert({
                ticket_id: openTicket.id,
                user_id: 1,
                message: `Infra Guard mendeteksi koneksi ${name} telah KEMBALI NORMAL (UP).\n\n${metricsSummary || ''}\n\n[Sistem] Tiket otomatis ditutup (Closed).`,
                type: 'public',
                created_at: new Date(),
            });
            await db('tickets')
                .where('id', openTicket.id)
                .update({ status: 'Closed', updated_at: new Date() });
            console.log(`[InfraGuard Ticket] Auto-closed ISP ticket ${openTicket.number}`);
        }
    } catch (err) {
        console.error('[InfraGuard Ticket] Error recording ISP ticket:', err.message);
    }
}

module.exports = {
    getMonthWindowWIB,
    classifyTicketCategory,
    extractMonitorTarget,
    mergeIntervals,
    resolveTicketInterval,
    computeMonthlyUptimeFromTickets,
    recordInfraGuardIspTicket,
};

