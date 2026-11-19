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

const INFRA_MODULE_DEFS = [
    // NETWORK
    { id: 'net_isp', group: 'network', groupLabel: 'Network', title: 'ISP / Internet WAN (iForte & Comtronic)', subtitle: 'ISP iForte, ISP Comtronic / Comnet WAN Links' },
    { id: 'net_ap', group: 'network', groupLabel: 'Network', title: 'Access Point (Wi-Fi Pabrik & Kantor)', subtitle: 'AP-OfficeLt1/2, AP-PPIC, AP-Mess, AGV-AP, AP-MC-Sharing, Progresif' },
    { id: 'net_core', group: 'network', groupLabel: 'Network', title: 'Core Switch, Router & LAN', subtitle: 'Switch Center 1/2, Router MikroTik, DNS/GW, Network Core' },
    // SERVER (Global & Local)
    { id: 'srv_idempiere', group: 'server', groupLabel: 'Server', title: 'ERP iDempiere (Prod & Center)', subtitle: 'idem Prod, Idempiere Center' },
    { id: 'srv_shopfloor', group: 'server', groupLabel: 'Server', title: 'Shopfloor & Production MES', subtitle: 'Shopfloor Center, Shopfloor Center Production' },
    { id: 'srv_hris', group: 'server', groupLabel: 'Server', title: 'HRIS & Attendance Server', subtitle: 'HRIS Center, Absensi / HR Portal' },
    { id: 'srv_vendor', group: 'server', groupLabel: 'Server', title: 'Vendor Portal Server', subtitle: 'Vendor Center' },
    { id: 'srv_factoryhub', group: 'server', groupLabel: 'Server', title: 'FactoryHub Portal', subtitle: 'FactoryHub, Factory Hub (Local)' },
    { id: 'srv_portal_local', group: 'server', groupLabel: 'Server', title: 'Web Compro, Helpdesk & Local Server', subtitle: 'Compro-Website, Helpdesk Center, Server-Local, Infra-Guard (Local)' },
    // TOOLS
    { id: 'tools_ricoh', group: 'tools', groupLabel: 'Tools', title: 'Mesin Fotokopi / Printer Ricoh', subtitle: 'MC-PhotoCopy Office Atas, PPIC & Umum' },
    { id: 'tools_other', group: 'tools', groupLabel: 'Tools', title: 'CCTV / NVR & Perangkat Tools Lain', subtitle: 'NVR CCTV, Fingerprint, Scanner, Andon Display', optional: true },
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
        /^ICT-20\d{2}\d{4}-/i.test(num) ||
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
 * Fine-grained classification for Infrastructure Telemetry & SLA grouped into Network / Server / Tools
 */
function classifyInfraDetail(ticket) {
    const baseCat = classifyTicketCategory(ticket);
    if (baseCat === 'helpdesk' || baseCat === 'ignore_hw_agent' || baseCat === 'ignore_test') {
        return null;
    }

    const sub = String(ticket.subject || '');
    const target = extractMonitorTarget(sub);
    const alertKind = /\[LATENCY-ALERT\]/i.test(sub) ? 'latency' : 'down';

    // 1. TOOLS
    if (baseCat === 'local_ricoh' || target.includes('photocopy') || target.includes('ricoh') || target.includes('printer')) {
        return { domainGroup: 'tools', moduleId: 'tools_ricoh', alertKind };
    }
    if (target.includes('cctv') || target.includes('nvr') || target.includes('finger') || target.includes('andon') || target.includes('scanner')) {
        return { domainGroup: 'tools', moduleId: 'tools_other', alertKind };
    }

    // 2. NETWORK
    if (baseCat === 'internet_iforte' || baseCat === 'internet_comnet') {
        return { domainGroup: 'network', moduleId: 'net_isp', alertKind };
    }
    if (baseCat === 'local_ap' || target.includes('wifi') || target.includes('unifi')) {
        return { domainGroup: 'network', moduleId: 'net_ap', alertKind };
    }

    // 3. SERVER (Global + Local app servers)
    if (target.includes('idem') || target.includes('idempiere')) {
        return { domainGroup: 'server', moduleId: 'srv_idempiere', alertKind };
    }
    if (target.includes('shopfloor')) {
        return { domainGroup: 'server', moduleId: 'srv_shopfloor', alertKind };
    }
    if (target.includes('hris') || target.includes('absen')) {
        return { domainGroup: 'server', moduleId: 'srv_hris', alertKind };
    }
    if (target.includes('vendor')) {
        return { domainGroup: 'server', moduleId: 'srv_vendor', alertKind };
    }
    if (target.includes('factoryhub') || target.includes('factory hub')) {
        return { domainGroup: 'server', moduleId: 'srv_factoryhub', alertKind };
    }
    if (
        baseCat === 'server_global' ||
        target.includes('compro') ||
        target.includes('helpdesk') ||
        target.includes('server') ||
        target.includes('infra-guard') ||
        target.includes('infraguard') ||
        target.includes('power asset') ||
        target.includes('proxmox') ||
        target.includes('nas')
    ) {
        return { domainGroup: 'server', moduleId: 'srv_portal_local', alertKind };
    }

    // 4. Default remaining infrastructure -> Core Network
    return { domainGroup: 'network', moduleId: 'net_core', alertKind };
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
                alert_kind: /\[LATENCY-ALERT\]/i.test(String(t.subject || '')) ? 'latency' : 'down',
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
        const activeIncidents = incidents.filter((x) => !x.excluded);
        const downCount = activeIncidents.filter((x) => x.alert_kind === 'down').length;
        const latencyCount = activeIncidents.filter((x) => x.alert_kind === 'latency').length;
        const mttrMinutes = activeIncidents.length > 0 ? Math.round(downtimeMinutes / activeIncidents.length) : 0;

        monthly.push({
            month: m,
            total_minutes: win.totalMinutes,
            downtime_minutes: downtimeMinutes,
            uptime_minutes: uptimeMinutes,
            percentage: pct,
            incident_count: activeIncidents.length,
            down_count: downCount,
            latency_count: latencyCount,
            mttr_minutes: mttrMinutes,
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
    INFRA_MODULE_DEFS,
    getMonthWindowWIB,
    classifyTicketCategory,
    classifyInfraDetail,
    extractMonitorTarget,
    mergeIntervals,
    resolveTicketInterval,
    computeMonthlyUptimeFromTickets,
    recordInfraGuardIspTicket,
};

