const express = require('express');

const CR_MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ensuredCrDbs = new WeakSet();

async function ensureCrTable(db) {
    if (!db || ensuredCrDbs.has(db)) return;
    const exists = await db.schema.hasTable('budget_cost_reductions');
    if (!exists) {
        await db.schema.createTable('budget_cost_reductions', (t) => {
            t.string('id', 64).primary();
            t.integer('year').notNullable().defaultTo(2027);
            t.string('plant', 16).notNullable().defaultTo('SG');
            t.string('cr_code', 32).defaultTo('CR-01');
            t.string('category', 48).notNullable().defaultTo('PHOTOCOPY_PRINT');
            t.string('title', 255).notNullable();
            t.string('target_dept', 255).defaultTo('All Dept');
            t.text('problem_statement').defaultTo('');
            t.text('action_plan').defaultTo('');
            t.string('pic', 128).defaultTo('ICT');
            t.string('priority', 24).defaultTo('HIGH');
            t.string('status', 24).defaultTo('PROPOSED');
            t.decimal('baseline_monthly', 15, 2).defaultTo(0);
            t.decimal('target_monthly', 15, 2).defaultTo(0);
            t.integer('active_months').defaultTo(12);
            t.string('start_month', 12).defaultTo('jan');
            t.string('end_month', 12).defaultTo('dec');
            t.decimal('investment_cost', 15, 2).defaultTo(0);
            t.text('monthly_baseline').defaultTo('{}');
            t.text('monthly_actual').defaultTo('{}');
            t.string('kpi_metric', 255).defaultTo('');
            t.text('notes').defaultTo('');
            t.timestamps(true, true);
        });
    }
    ensuredCrDbs.add(db);
}

function getActiveMonthKeys(startM = 'jan', endM = 'dec', activeCount = 12) {
    const sIdx = CR_MONTH_KEYS.indexOf(String(startM || 'jan').toLowerCase());
    const eIdx = CR_MONTH_KEYS.indexOf(String(endM || 'dec').toLowerCase());
    if (sIdx !== -1 && eIdx !== -1 && sIdx <= eIdx) {
        return CR_MONTH_KEYS.slice(sIdx, eIdx + 1);
    }
    const n = Math.max(1, Math.min(12, parseInt(activeCount, 10) || 12));
    return CR_MONTH_KEYS.slice(0, n);
}

function buildMonthlyMapFromScalar(val, startM, endM, activeCount) {
    const keys = getActiveMonthKeys(startM, endM, activeCount);
    const out = {};
    CR_MONTH_KEYS.forEach((m) => {
        out[m] = keys.includes(m) ? Math.round(Number(val) || 0) : 0;
    });
    return out;
}

function normalizeCrRecord(r) {
    let mb = {};
    let ma = {};
    try {
        mb = typeof r.monthly_baseline === 'string' ? JSON.parse(r.monthly_baseline || '{}') : (r.monthly_baseline || {});
    } catch (e) { mb = {}; }
    try {
        ma = typeof r.monthly_actual === 'string' ? JSON.parse(r.monthly_actual || '{}') : (r.monthly_actual || {});
    } catch (e) { ma = {}; }

    const baseMo = Number(r.baseline_monthly) || 0;
    const tgtMo = Number(r.target_monthly) || 0;
    const activeMonths = Math.max(1, Math.min(12, parseInt(r.active_months, 10) || 12));
    const startM = r.start_month || 'jan';
    const endM = r.end_month || 'dec';
    const inv = Number(r.investment_cost) || 0;

    const fullBaseline = {};
    const fullActual = {};
    const activeKeys = getActiveMonthKeys(startM, endM, activeMonths);
    CR_MONTH_KEYS.forEach((m) => {
        fullBaseline[m] = mb[m] != null ? Number(mb[m]) || 0 : (activeKeys.includes(m) ? baseMo : 0);
        fullActual[m] = ma[m] != null && ma[m] !== '' && !isNaN(Number(ma[m])) ? Number(ma[m]) : null;
    });

    const savingMo = Math.max(0, baseMo - tgtMo);
    const baselineAnnual = CR_MONTH_KEYS.reduce((s, m) => s + (fullBaseline[m] || 0), 0) || (baseMo * activeMonths);
    const targetAnnual = tgtMo * activeMonths;
    const savingAnnual = Math.max(0, baselineAnnual - targetAnnual);
    const reductionPct = baselineAnnual > 0 ? Number(((savingAnnual / baselineAnnual) * 100).toFixed(1)) : 0;

    let actualSavingYtd = 0;
    let actualRecordedMonths = 0;
    CR_MONTH_KEYS.forEach((m) => {
        if (fullActual[m] != null) {
            actualSavingYtd += ((fullBaseline[m] || baseMo) - fullActual[m]);
            actualRecordedMonths++;
        }
    });

    return {
        ...r,
        year: parseInt(r.year, 10) || 2027,
        plant: r.plant || 'SG',
        baseline_monthly: baseMo,
        target_monthly: tgtMo,
        active_months: activeMonths,
        investment_cost: inv,
        saving_monthly: savingMo,
        baseline_annual: baselineAnnual,
        target_annual: targetAnnual,
        saving_annual: savingAnnual,
        net_saving_annual: savingAnnual - inv,
        reduction_pct: reductionPct,
        monthly_baseline: fullBaseline,
        monthly_actual: fullActual,
        actual_saving_ytd: Math.round(actualSavingYtd),
        actual_recorded_months: actualRecordedMonths
    };
}

async function computeRicohBaseline(db) {
    const rateBw = 100;
    const rateColor = 1400;
    const rentFee = 1900000;
    const freeBw = 1000;
    const freeColor = 100;

    const fallback = {
        hasData: false,
        monthsAnalyzed: [],
        rateBw,
        rateColor,
        rentFee,
        avgPrintBw: 0,
        avgPrintColor: 0,
        avgCopyBw: 0,
        avgCopyColor: 0,
        avgTotalSheets: 0,
        avgCostPrintBw: 0,
        avgCostCopyBw: 0,
        avgCostColorAll: 0,
        avgGrossClickCost: 0,
        avgTotalWithRent: 0,
        topDepartments: []
    };
    if (!db) return fallback;

    try {
        const hasUsage = await db.schema.hasTable('ricoh_monthly_usage');
        if (!hasUsage) return fallback;

        const monthRows = await db('ricoh_monthly_usage')
            .select('month')
            .sum({ print_bw: 'bw_usage', print_col: 'color_usage', copy_bw: 'copier_bw_usage', copy_col: 'copier_color_usage' })
            .groupBy('month')
            .orderBy('month', 'desc')
            .limit(6);

        if (!monthRows || monthRows.length === 0) return fallback;

        const currentYm = new Date().toISOString().slice(0, 7);
        let fullMonths = monthRows.filter(m => m.month !== currentYm);
        if (fullMonths.length === 0) fullMonths = monthRows;
        const sample = fullMonths.slice(0, 3);
        const n = sample.length;

        const sumPrintBw = sample.reduce((s, r) => s + (Number(r.print_bw) || 0), 0);
        const sumPrintCol = sample.reduce((s, r) => s + (Number(r.print_col) || 0), 0);
        const sumCopyBw = sample.reduce((s, r) => s + (Number(r.copy_bw) || 0), 0);
        const sumCopyCol = sample.reduce((s, r) => s + (Number(r.copy_col) || 0), 0);

        const avgPrintBw = Math.round(sumPrintBw / n);
        const avgPrintColor = Math.round(sumPrintCol / n);
        const avgCopyBw = Math.round(sumCopyBw / n);
        const avgCopyColor = Math.round(sumCopyCol / n);
        const avgTotalSheets = avgPrintBw + avgPrintColor + avgCopyBw + avgCopyColor;

        const avgCostPrintBw = avgPrintBw * rateBw;
        const avgCostCopyBw = avgCopyBw * rateBw;
        const avgCostColorAll = (avgPrintColor + avgCopyColor) * rateColor;
        const avgGrossClickCost = avgCostPrintBw + avgCostCopyBw + avgCostColorAll;
        const avgTotalWithRent = rentFee
            + Math.max(0, (avgPrintBw + avgCopyBw) - freeBw) * rateBw
            + Math.max(0, (avgPrintColor + avgCopyColor) - freeColor) * rateColor;

        const selectedMonthKeys = sample.map(s => s.month);
        const deptRows = await db('ricoh_monthly_usage as m')
            .leftJoin('ricoh_departments as rd', 'm.department_id', 'rd.id')
            .whereIn('m.month', selectedMonthKeys)
            .select(db.raw("COALESCE(rd.name, 'General') as department"))
            .sum({ print_bw: 'm.bw_usage', print_col: 'm.color_usage', copy_bw: 'm.copier_bw_usage', copy_col: 'm.copier_color_usage' })
            .groupBy('department');

        const topDepartments = (deptRows || [])
            .map(d => {
                const pBw = Number(d.print_bw) || 0;
                const pCol = Number(d.print_col) || 0;
                const cBw = Number(d.copy_bw) || 0;
                const cCol = Number(d.copy_col) || 0;
                const tot = pBw + pCol + cBw + cCol;
                const estCost = ((pBw + cBw) * rateBw) + ((pCol + cCol) * rateColor);
                return {
                    department: d.department,
                    avgMonthlySheets: Math.round(tot / n),
                    avgCopyBw: Math.round(cBw / n),
                    avgColorAll: Math.round((pCol + cCol) / n),
                    avgMonthlyCost: Math.round(estCost / n)
                };
            })
            .sort((a, b) => b.avgMonthlyCost - a.avgMonthlyCost)
            .slice(0, 6);

        return {
            hasData: true,
            monthsAnalyzed: selectedMonthKeys.sort(),
            rateBw,
            rateColor,
            rentFee,
            avgPrintBw,
            avgPrintColor,
            avgCopyBw,
            avgCopyColor,
            avgTotalSheets,
            avgCostPrintBw,
            avgCostCopyBw,
            avgCostColorAll,
            avgGrossClickCost,
            avgTotalWithRent,
            topDepartments
        };
    } catch (err) {
        console.warn('[Budgeting CR] computeRicohBaseline warning:', err.message);
        return fallback;
    }
}

module.exports = function createCrRouter({ getDb, readStore, saveStore }) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const { year = 2027, plant = 'ALL', category = 'ALL', status = 'ALL', search = '' } = req.query;
            const targetYear = parseInt(year, 10) || 2027;
            const db = getDb(req);

            let rawItems = [];
            let ricohBaseline = null;

            if (db) {
                try {
                    await ensureCrTable(db);
                    let q = db('budget_cost_reductions').where({ year: targetYear });
                    if (plant && plant !== 'ALL') {
                        q = q.where(function () {
                            this.where({ plant }).orWhere({ plant: 'ALL' });
                        });
                    }
                    if (category && category !== 'ALL') q = q.where({ category });
                    if (status && status !== 'ALL') q = q.where({ status });
                    if (search) {
                        const s = `%${search.toLowerCase()}%`;
                        q = q.where(function () {
                            this.whereRaw('LOWER(title) LIKE ?', [s])
                                .orWhereRaw('LOWER(cr_code) LIKE ?', [s])
                                .orWhereRaw('LOWER(target_dept) LIKE ?', [s])
                                .orWhereRaw('LOWER(problem_statement) LIKE ?', [s])
                                .orWhereRaw('LOWER(action_plan) LIKE ?', [s])
                                .orWhereRaw('LOWER(pic) LIKE ?', [s]);
                        });
                    }
                    rawItems = await q.orderBy([{ column: 'cr_code', order: 'asc' }, { column: 'created_at', order: 'asc' }]);
                    ricohBaseline = await computeRicohBaseline(db);
                } catch (dbErr) {
                    console.warn('[Budgeting CR] DB GET error, using store fallback:', dbErr.message);
                }
            }

            if (!db || (!rawItems.length && !ricohBaseline)) {
                const store = readStore();
                const list = (store.cost_reductions || []).filter(item => {
                    if ((parseInt(item.year, 10) || 2027) !== targetYear) return false;
                    if (plant && plant !== 'ALL' && item.plant !== plant && item.plant !== 'ALL') return false;
                    if (category && category !== 'ALL' && item.category !== category) return false;
                    if (status && status !== 'ALL' && item.status !== status) return false;
                    if (search) {
                        const q = search.toLowerCase();
                        const hay = `${item.cr_code} ${item.title} ${item.target_dept} ${item.problem_statement} ${item.action_plan} ${item.pic}`.toLowerCase();
                        if (!hay.includes(q)) return false;
                    }
                    return true;
                });
                if (!rawItems.length) rawItems = list;
            }

            const items = rawItems.map(normalizeCrRecord);
            const totalBaselineAnnual = items.reduce((s, x) => s + x.baseline_annual, 0);
            const totalTargetAnnual = items.reduce((s, x) => s + x.target_annual, 0);
            const totalSavingAnnual = items.reduce((s, x) => s + x.saving_annual, 0);
            const totalSavingMonthly = items.reduce((s, x) => s + x.saving_monthly, 0);
            const totalInvestment = items.reduce((s, x) => s + x.investment_cost, 0);
            const actualSavingYtd = items.reduce((s, x) => s + x.actual_saving_ytd, 0);

            res.json({
                items,
                summary: {
                    total_items: items.length,
                    total_baseline_annual: totalBaselineAnnual,
                    total_target_annual: totalTargetAnnual,
                    total_saving_monthly: totalSavingMonthly,
                    total_saving_annual: totalSavingAnnual,
                    total_investment: totalInvestment,
                    net_saving_annual: totalSavingAnnual - totalInvestment,
                    avg_reduction_pct: totalBaselineAnnual > 0 ? Number(((totalSavingAnnual / totalBaselineAnnual) * 100).toFixed(1)) : 0,
                    actual_saving_ytd: actualSavingYtd,
                    achieved_count: items.filter(x => x.status === 'ACHIEVED').length,
                    in_progress_count: items.filter(x => x.status === 'IN_PROGRESS' || x.status === 'APPROVED').length
                },
                ricohBaseline: ricohBaseline || { hasData: false }
            });
        } catch (err) {
            console.error('[Budgeting CR] GET / error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const b = req.body || {};
            const year = parseInt(b.year, 10) || 2027;
            const plant = b.plant || 'SG';
            const id = b.id || `CR-${year}-${plant}-${Date.now().toString().slice(-5)}`;
            const activeMonths = Math.max(1, Math.min(12, parseInt(b.active_months, 10) || 12));
            const startMonth = b.start_month || 'jan';
            const endMonth = b.end_month || 'dec';
            const baseMo = Number(b.baseline_monthly) || 0;
            const monthlyBaseline = b.monthly_baseline && Object.keys(b.monthly_baseline).length > 0
                ? b.monthly_baseline
                : buildMonthlyMapFromScalar(baseMo, startMonth, endMonth, activeMonths);
            const monthlyActual = b.monthly_actual || {};

            const record = {
                id,
                year,
                plant,
                cr_code: b.cr_code || `CR-${String(Math.floor(Math.random() * 90) + 10)}`,
                category: b.category || 'PHOTOCOPY_PRINT',
                title: b.title || 'Inisiatif Cost Reduction ICT',
                target_dept: b.target_dept || 'All Dept',
                problem_statement: b.problem_statement || '',
                action_plan: b.action_plan || '',
                pic: b.pic || 'ICT',
                priority: b.priority || 'HIGH',
                status: b.status || 'PROPOSED',
                baseline_monthly: baseMo,
                target_monthly: Number(b.target_monthly) || 0,
                active_months: activeMonths,
                start_month: startMonth,
                end_month: endMonth,
                investment_cost: Number(b.investment_cost) || 0,
                monthly_baseline: JSON.stringify(monthlyBaseline),
                monthly_actual: JSON.stringify(monthlyActual),
                kpi_metric: b.kpi_metric || '',
                notes: b.notes || '',
                created_at: new Date(),
                updated_at: new Date()
            };

            const db = getDb(req);
            if (db) {
                await ensureCrTable(db);
                await db('budget_cost_reductions').insert(record);
            }

            const store = readStore();
            if (!store.cost_reductions) store.cost_reductions = [];
            store.cost_reductions.push({ ...record, monthly_baseline: monthlyBaseline, monthly_actual: monthlyActual });
            saveStore(store);

            res.status(201).json({ success: true, item: normalizeCrRecord({ ...record, monthly_baseline: monthlyBaseline, monthly_actual: monthlyActual }) });
        } catch (err) {
            console.error('[Budgeting CR] POST / error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const b = req.body || {};
            const db = getDb(req);

            const updatePayload = { updated_at: new Date() };
            const fields = ['year', 'plant', 'cr_code', 'category', 'title', 'target_dept', 'problem_statement', 'action_plan', 'pic', 'priority', 'status', 'baseline_monthly', 'target_monthly', 'active_months', 'start_month', 'end_month', 'investment_cost', 'kpi_metric', 'notes'];
            fields.forEach(f => {
                if (b[f] !== undefined) updatePayload[f] = b[f];
            });
            if (b.monthly_baseline !== undefined) {
                updatePayload.monthly_baseline = typeof b.monthly_baseline === 'string' ? b.monthly_baseline : JSON.stringify(b.monthly_baseline);
            } else if (b.baseline_monthly !== undefined) {
                updatePayload.monthly_baseline = JSON.stringify(buildMonthlyMapFromScalar(b.baseline_monthly, b.start_month || 'jan', b.end_month || 'dec', b.active_months || 12));
            }
            if (b.monthly_actual !== undefined) {
                updatePayload.monthly_actual = typeof b.monthly_actual === 'string' ? b.monthly_actual : JSON.stringify(b.monthly_actual);
            }

            let updatedRow = null;
            if (db) {
                await ensureCrTable(db);
                const existing = await db('budget_cost_reductions').where({ id }).first();
                if (existing) {
                    await db('budget_cost_reductions').where({ id }).update(updatePayload);
                    updatedRow = await db('budget_cost_reductions').where({ id }).first();
                }
            }

            const store = readStore();
            if (store.cost_reductions) {
                const idx = store.cost_reductions.findIndex(x => x.id === id);
                if (idx !== -1) {
                    store.cost_reductions[idx] = { ...store.cost_reductions[idx], ...updatePayload };
                    if (!updatedRow) updatedRow = store.cost_reductions[idx];
                    saveStore(store);
                }
            }

            if (!updatedRow) return res.status(404).json({ error: 'CR item not found' });
            res.json({ success: true, item: normalizeCrRecord(updatedRow) });
        } catch (err) {
            console.error('[Budgeting CR] PUT /:id error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDb(req);
            if (db) {
                await ensureCrTable(db);
                await db('budget_cost_reductions').where({ id }).del();
            }
            const store = readStore();
            if (store.cost_reductions) {
                store.cost_reductions = store.cost_reductions.filter(x => x.id !== id);
                saveStore(store);
            }
            res.json({ success: true });
        } catch (err) {
            console.error('[Budgeting CR] DELETE /:id error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/seed-ricoh-2027', async (req, res) => {
        try {
            const year = parseInt(req.body?.year, 10) || 2027;
            const plant = req.body?.plant || 'SG';
            const db = getDb(req);
            const baseline = await computeRicohBaseline(db);

            const baseColor = baseline.hasData && baseline.avgCostColorAll > 0 ? baseline.avgCostColorAll : 6634600;
            const baseCopyBw = baseline.hasData && baseline.avgCostCopyBw > 0 ? baseline.avgCostCopyBw : 1527500;
            const basePrintBw = baseline.hasData && baseline.avgCostPrintBw > 0 ? baseline.avgCostPrintBw : 2693300;
            const baseRent = baseline.rentFee || 1900000;
            const monthsNote = baseline.hasData ? `Basis data aktual Ricoh (${baseline.monthsAnalyzed.join(', ')})` : 'Basis estimasi rata-rata historis Ricoh';

            const templates = [
                {
                    id: `CR-${year}-${plant}-RICOH-01`,
                    year,
                    plant,
                    cr_code: 'CR-01',
                    category: 'PHOTOCOPY_PRINT',
                    title: 'Konversi Default Printer Grayscale & Lock Hak Color by Exception',
                    target_dept: 'PPIC, Engineering R&D, QMR, HRGA',
                    problem_statement: `Biaya klik Color Rp 1.400/lbr (14x lipat B/W Rp 100/lbr), menyumbang ~60% total biaya klik mesin Ricoh. Banyak dokumen internal masih tercetak Color secara default. (${monthsNote})`,
                    action_plan: '1) Set default printer driver PC ke Black & White (Grayscale). 2) Batasi hak Print/Copy Color di Address Book Ricoh khusus user wajib warna. 3) Pangkas kuota Color 2027 & aktifkan WA alert 80%/100%.',
                    pic: 'ICT Infrastructure & Dept Head',
                    priority: 'CRITICAL',
                    status: 'PROPOSED',
                    baseline_monthly: baseColor,
                    target_monthly: Math.round(baseColor * 0.55),
                    active_months: 12,
                    start_month: 'jan',
                    end_month: 'dec',
                    investment_cost: 0,
                    kpi_metric: 'Penurunan volume klik Color >= 45% vs baseline 2026',
                    notes: `${monthsNote}. Rata-rata klik Color: ${baseline.avgPrintColor + baseline.avgCopyColor} lbr/bln.`
                },
                {
                    id: `CR-${year}-${plant}-RICOH-02`,
                    year,
                    plant,
                    cr_code: 'CR-02',
                    category: 'PHOTOCOPY_PRINT',
                    title: 'Digitalisasi Checksheet/WI, Scan-to-Folder & Wajib Duplex (Kurangi Photocopy B/W)',
                    target_dept: 'Produksi, QC, Engineering PE',
                    problem_statement: `Penggunaan Photocopy B/W sangat tinggi (~${baseline.avgCopyBw.toLocaleString('id-ID')} lbr/bln) karena penggandaan form harian, WI, dan checksheet manual di lantai produksi & QC.`,
                    action_plan: '1) Alihkan distribusi form/WI ke Scan-to-PDF / shared folder atau tablet shopfloor. 2) Terapkan cetak bolak-balik (Duplex / 2-in-1) untuk dokumen internal. 3) Evaluasi bulanan per dept di PDF Manajemen.',
                    pic: 'ICT + Leader Produksi & QC',
                    priority: 'HIGH',
                    status: 'PROPOSED',
                    baseline_monthly: baseCopyBw,
                    target_monthly: Math.round(baseCopyBw * 0.65),
                    active_months: 12,
                    start_month: 'jan',
                    end_month: 'dec',
                    investment_cost: 0,
                    kpi_metric: 'Penurunan lembar Photocopy B/W >= 35% vs baseline 2026',
                    notes: `${monthsNote}. Fokus pengurangan copy B/W di Produksi, QC, & Eng PE.`
                },
                {
                    id: `CR-${year}-${plant}-RICOH-03`,
                    year,
                    plant,
                    cr_code: 'CR-03',
                    category: 'PHOTOCOPY_PRINT',
                    title: 'Enforce Hard Quota Lock, Right-Sizing Kuota 2027 & Blokir PIN Liar Ricoh',
                    target_dept: 'All Departemen (Fokus PPIC, QC, Produksi)',
                    problem_statement: `Ditemukan PIN tidak terdaftar di Address Book mesin Ricoh serta kuota Print B/W user belum selaras dengan kebutuhan aktual (~${baseline.avgPrintBw.toLocaleString('id-ID')} lbr/bln).`,
                    action_plan: `1) Auto-block seluruh PIN tidak terdaftar di aplikasi pada mesin Ricoh (${plant === 'KG' ? '192.168.27.11 & 192.168.27.12' : '192.168.2.10 & 192.168.2.11'}). 2) Hard auto-lock otomatis saat kuota tercapai 100%. 3) Right-sizing kuota awal 2027 berdasarkan rata-rata 4 bulan terakhir.`,
                    pic: 'ICT Infrastructure',
                    priority: 'HIGH',
                    status: 'IN_PROGRESS',
                    baseline_monthly: basePrintBw,
                    target_monthly: Math.round(basePrintBw * 0.85),
                    active_months: 12,
                    start_month: 'jan',
                    end_month: 'dec',
                    investment_cost: 0,
                    kpi_metric: '0 PIN liar aktif & reduksi pemborosan Print B/W >= 15%',
                    notes: `${monthsNote}. Proteksi PIN liar & auto-lock kuota terintegrasi di Power Asset.`
                },
                {
                    id: `CR-${year}-${plant}-RICOH-04`,
                    year,
                    plant,
                    cr_code: 'CR-04',
                    category: 'PHOTOCOPY_PRINT',
                    title: 'Re-Negosiasi Kontrak Vendor Sewa & Free Click 2027 (PT. Sakura Jaya Solusi)',
                    target_dept: 'Purchasing & ICT',
                    problem_statement: 'Biaya sewa minimum Rp 1.900.000/bln hanya mencakup free 1.000 B/W & 100 Color sementara volume aktual stabil tinggi (~45.000+ lembar/bln).',
                    action_plan: '1) Ajukan re-negosiasi kontrak 2027 dengan bukti rekap historis dari aplikasi. 2) Minta diskon paket sewa atau tambahan kuota Free Color/BW (atau penurunan tarif klik Color).',
                    pic: 'Purchasing & ICT',
                    priority: 'MEDIUM',
                    status: 'PROPOSED',
                    baseline_monthly: baseRent,
                    target_monthly: Math.round(baseRent * 0.85),
                    active_months: 12,
                    start_month: 'jan',
                    end_month: 'dec',
                    investment_cost: 0,
                    kpi_metric: 'Efisiensi biaya kontrak sewa / tambahan free click minimal 15%',
                    notes: `${monthsNote}. Digunakan sebagai bahan negosiasi renewal kontrak 2027.`
                }
            ];

            if (db) {
                await ensureCrTable(db);
                for (const tpl of templates) {
                    const mb = buildMonthlyMapFromScalar(tpl.baseline_monthly, tpl.start_month, tpl.end_month, tpl.active_months);
                    await db('budget_cost_reductions').insert({
                        ...tpl,
                        monthly_baseline: JSON.stringify(mb),
                        monthly_actual: JSON.stringify({}),
                        created_at: new Date(),
                        updated_at: new Date()
                    }).onConflict('id').ignore();
                }
            }

            const store = readStore();
            if (!store.cost_reductions) store.cost_reductions = [];
            templates.forEach(tpl => {
                if (!store.cost_reductions.some(x => x.id === tpl.id)) {
                    const mb = buildMonthlyMapFromScalar(tpl.baseline_monthly, tpl.start_month, tpl.end_month, tpl.active_months);
                    store.cost_reductions.push({ ...tpl, monthly_baseline: mb, monthly_actual: {} });
                }
            });
            saveStore(store);

            res.json({
                success: true,
                message: `Berhasil memuat ${templates.length} template CR Photocopy ${year} berbasis data Ricoh aktual!`
            });
        } catch (err) {
            console.error('[Budgeting CR] POST /seed-ricoh-2027 error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

