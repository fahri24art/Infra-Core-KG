const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function getDb(req) {
    if (req && req.db) return req.db;
    try {
        if (!process.env.POSTGRES_HOST) {
            require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
        }
        if (process.env.POSTGRES_HOST) {
            return require('../db');
        }
    } catch (e) {
        console.warn('[Budgeting] DB not available:', e.message);
    }
    return null;
}

function getAllDbs(req) {
    const dbs = [];
    try {
        const dbModule = require('../db');
        if (dbModule && typeof dbModule.getDb === 'function') {
            const sg = dbModule.getDb('TCF-SG');
            const kg = dbModule.getDb('TCF-KG');
            if (sg) dbs.push(sg);
            if (kg && kg !== sg) dbs.push(kg);
        }
    } catch (e) {
        console.warn('[Budgeting] Failed getting multi-tenant connections:', e.message);
    }
    if (dbs.length === 0) {
        const fallback = getDb(req);
        if (fallback) dbs.push(fallback);
    }
    return dbs;
}

const STORE_PATH = path.join(__dirname, '..', 'data', 'budget_store.json');
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Helper to read store
function readStore() {
    try {
        if (!fs.existsSync(STORE_PATH)) {
            return { items_2026: [], items_2027: [], departments: [], coa_dict: {}, form_meta: {}, software_licenses: [], department_requests: [], activity_plans: [] };
        }
        const data = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        if (!parsed.software_licenses) parsed.software_licenses = [];
        if (!parsed.department_requests) parsed.department_requests = [];
        if (!parsed.activity_plans) parsed.activity_plans = [];
        return parsed;
    } catch (e) {
        console.error('[Budgeting] Failed to read store:', e.message);
        return { items_2026: [], items_2027: [], departments: [], coa_dict: {}, form_meta: {}, software_licenses: [], department_requests: [], activity_plans: [] };
    }
}

// Helper to save store
function saveStore(store) {
    try {
        store.updated_at = new Date().toISOString();
        fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('[Budgeting] Failed to save store:', e.message);
        return false;
    }
}

// Helper to get all available years
function getAvailableYears(store) {
    const years = [];
    Object.keys(store).forEach(k => {
        if (k.startsWith('items_')) {
            const yr = parseInt(k.replace('items_', ''));
            if (!isNaN(yr)) years.push(yr);
        }
    });
    years.sort((a, b) => a - b);
    return years;
}

// GET /api/budgeting/years - List all configured budget years
router.get('/years', async (req, res) => {
    try {
        const db = getDb(req);
        if (db) {
            try {
                const yearRows = await db('budget_items')
                    .select('year')
                    .count('id as total_items')
                    .sum('total_amount as total_amount')
                    .groupBy('year')
                    .orderBy('year', 'asc');
                if (yearRows && yearRows.length > 0) {
                    const yearDetails = yearRows.map(r => {
                        const yr = parseInt(r.year);
                        return {
                            year: yr,
                            label: yr === 2026 ? '2026 (Baseline)' : `${yr} Plan`,
                            isBaseline: yr === 2026,
                            totalItems: parseInt(r.total_items) || 0,
                            totalAmount: parseFloat(r.total_amount) || 0
                        };
                    });
                    return res.json({ years: yearDetails });
                }
            } catch (dbErr) {
                console.warn('[Budgeting] DB error on /years, falling back to store:', dbErr.message);
            }
        }

        const store = readStore();
        const years = getAvailableYears(store);
        const yearDetails = years.map(yr => {
            const list = store[`items_${yr}`] || [];
            const total = list.reduce((sum, x) => sum + (Number(x.total_amount) || 0), 0);
            return {
                year: yr,
                label: yr === 2026 ? '2026 (Baseline)' : `${yr} Plan`,
                isBaseline: yr === 2026,
                totalItems: list.length,
                totalAmount: total
            };
        });

        res.json({ years: yearDetails });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/create-year - Create a new fiscal year plan
router.post('/create-year', (req, res) => {
    try {
        const store = readStore();
        const { targetYear, sourceYear = 2026, growthRate = 5 } = req.body;

        if (!targetYear || isNaN(targetYear)) {
            return res.status(400).json({ error: 'targetYear is required and must be a number' });
        }

        const sourceList = store[`items_${sourceYear}`] || store['items_2026'] || [];
        if (sourceList.length === 0) {
            return res.status(400).json({ error: `Source year ${sourceYear} has no items to clone` });
        }

        const factor = 1 + (Number(growthRate) / 100);
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        const newItems = sourceList.map((item, idx) => {
            const newMonthly = {};
            months.forEach(m => {
                newMonthly[m] = Math.round((Number(item.monthly?.[m]) || 0) * factor);
            });
            const newTotal = Object.values(newMonthly).reduce((a, b) => a + b, 0);

            return {
                ...item,
                id: `BGT-${targetYear}-${item.plant || 'KG'}-${item.form?.replace('-', '') || 'I1'}-${idx + 1 < 1000 ? String(idx + 1).padStart(3, '0') : idx + 1}`,
                year: parseInt(targetYear),
                usage_2025: item.total_amount,
                unit_price: Math.round((Number(item.unit_price) || 0) * factor),
                total_amount: newTotal,
                monthly: newMonthly,
                growth_pct: Number(growthRate),
                is_custom: false
            };
        });

        store[`items_${targetYear}`] = newItems;
        saveStore(store);

        res.status(201).json({
            success: true,
            year: targetYear,
            totalItems: newItems.length,
            totalAmount: newItems.reduce((s, x) => s + x.total_amount, 0),
            message: `Tahun Anggaran ${targetYear} berhasil dibuat dengan basis tahun ${sourceYear} (+${growthRate}%).`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/budgeting/overview - Dynamic overview for any selected year
router.get('/overview', async (req, res) => {
    try {
        const store = readStore();
        const year = parseInt(req.query.year) || 2027;
        const orgHeader = req.headers['x-organization'] || '';
        const defaultPlant = orgHeader.includes('KG') ? 'KG' : (orgHeader.includes('SG') ? 'SG' : 'ALL');
        const plant = (req.query.plant || defaultPlant || 'ALL').toUpperCase();

        const db = getDb(req);
        let allItems = [];
        let allBaselineItems = [];

        if (db) {
            try {
                const prevYear = year - 1;
                const dbAllYear = await db('budget_items').where({ year });
                const dbPrevYear = await db('budget_items').where({ year: prevYear });
                const dbBaseline = dbPrevYear.length > 0 ? dbPrevYear : await db('budget_items').where({ year: 2026 });

                allItems = dbAllYear.map(it => ({
                    ...it,
                    total_amount: Number(it.total_amount) || 0,
                    monthly: typeof it.monthly === 'string' ? JSON.parse(it.monthly || '{}') : (it.monthly || {})
                }));
                allBaselineItems = dbBaseline.map(it => ({
                    ...it,
                    total_amount: Number(it.total_amount) || 0,
                    monthly: typeof it.monthly === 'string' ? JSON.parse(it.monthly || '{}') : (it.monthly || {})
                }));
            } catch (dbErr) {
                console.warn('[Budgeting] DB error on /overview, fallback to store:', dbErr.message);
            }
        }

        if (allItems.length === 0) {
            allItems = store[`items_${year}`] || [];
            const prevYear = year - 1;
            allBaselineItems = store[`items_${prevYear}`] || store['items_2026'] || [];
        }

        // Plant Split across all items in year
        let kgTotal = 0;
        let sgTotal = 0;
        let consolidatedTotal = 0;
        allItems.forEach(it => {
            const amt = Number(it.total_amount) || 0;
            if (it.plant === 'KG') kgTotal += amt;
            else if (it.plant === 'SG') sgTotal += amt;
            consolidatedTotal += amt;
        });

        // Filter by plant if specified (SG or KG)
        let items = allItems;
        let baselineItems = allBaselineItems;
        if (plant !== 'ALL') {
            items = items.filter(it => it.plant === plant);
            baselineItems = baselineItems.filter(it => it.plant === plant);
        }

        const totalPlanned = items.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0);
        const baselineTotal = baselineItems.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0);
        const varianceAmount = totalPlanned - baselineTotal;
        const variancePct = baselineTotal > 0 ? ((varianceAmount / baselineTotal) * 100).toFixed(1) : 0;

        // Capex vs Opex
        let capexTotal = 0;
        let opexTotal = 0;
        items.forEach(it => {
            const amt = Number(it.total_amount) || 0;
            if (it.category === 'CAPEX') {
                capexTotal += amt;
            } else {
                opexTotal += amt;
            }
        });

        // Category Breakdown
        const categoryMap = {};
        items.forEach(it => {
            const cat = it.category || 'OTHER';
            const badge = it.category_badge || cat;
            if (!categoryMap[cat]) {
                categoryMap[cat] = {
                    key: cat,
                    name: badge,
                    count: 0,
                    total: 0
                };
            }
            categoryMap[cat].count += 1;
            categoryMap[cat].total += (Number(it.total_amount) || 0);
        });

        // Monthly Breakdown
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthlySummary = {};
        months.forEach(m => { monthlySummary[m] = 0; });

        items.forEach(it => {
            if (it.monthly) {
                months.forEach(m => {
                    monthlySummary[m] += (Number(it.monthly[m]) || 0);
                });
            }
        });

        res.json({
            year,
            baselineYear: year - 1 in store ? year - 1 : 2026,
            totalPlanned,
            baselineTotal,
            varianceAmount,
            variancePct,
            capexTotal,
            opexTotal,
            kgTotal,
            sgTotal,
            consolidatedTotal,
            itemCount: items.length,
            categories: Object.values(categoryMap),
            monthlySummary,
            availableYears: getAvailableYears(store),
            updatedAt: store.updated_at
        });
    } catch (err) {
        console.error('[Budgeting] Overview error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/budgeting/matrix
router.get('/matrix', (req, res) => {
    try {
        const store = readStore();
        res.json({
            departments: store.departments || [],
            form_meta: store.form_meta || {}
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/budgeting/coa
router.get('/coa', (req, res) => {
    try {
        const store = readStore();
        res.json(store.coa_dict || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/budgeting/items - Fetch items for any year
router.get('/items', async (req, res) => {
    try {
        const year = parseInt(req.query.year) || 2027;
        const { category, form, plant, search } = req.query;
        const db = getDb(req);

        if (db) {
            try {
                let query = db('budget_items').where({ year });
                if (category && category !== 'ALL') query = query.where({ category });
                if (form && form !== 'ALL') query = query.where({ form });
                if (plant && plant !== 'ALL') query = query.where({ plant });
                if (search) {
                    const q = `%${search.toLowerCase()}%`;
                    query = query.where(function() {
                        this.whereRaw('LOWER(item_name) LIKE ?', [q])
                            .orWhereRaw('LOWER(coa_code) LIKE ?', [q])
                            .orWhereRaw('LOWER(sub_category) LIKE ?', [q]);
                    });
                }
                const rows = await query.orderBy('id', 'asc');
                if (rows && rows.length > 0) {
                    const items = rows.map(it => ({
                        ...it,
                        usage_2025: Number(it.usage_2025) || 0,
                        unit_price: Number(it.unit_price) || 0,
                        qty: Number(it.qty) || 1,
                        total_amount: Number(it.total_amount) || 0,
                        monthly: typeof it.monthly === 'string' ? JSON.parse(it.monthly || '{}') : (it.monthly || {})
                    }));
                    return res.json({
                        year,
                        totalCount: items.length,
                        totalAmount: items.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0),
                        items
                    });
                }
            } catch (dbErr) {
                console.warn('[Budgeting] DB error on /items, fallback to store:', dbErr.message);
            }
        }

        const store = readStore();
        let items = store[`items_${year}`] || [];

        if (category && category !== 'ALL') {
            items = items.filter(it => it.category === category);
        }
        if (form && form !== 'ALL') {
            items = items.filter(it => it.form === form);
        }
        if (plant && plant !== 'ALL') {
            items = items.filter(it => it.plant === plant);
        }
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(it => 
                (it.item_name && it.item_name.toLowerCase().includes(q)) ||
                (it.coa_code && it.coa_code.toLowerCase().includes(q)) ||
                (it.sub_category && it.sub_category.toLowerCase().includes(q))
            );
        }

        res.json({
            year,
            totalCount: items.length,
            totalAmount: items.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0),
            items
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/items - Add custom item to specified year
router.post('/items', async (req, res) => {
    try {
        const store = readStore();
        const body = req.body;
        const targetYear = parseInt(body.year) || 2027;

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthly = {};
        months.forEach(m => {
            monthly[m] = Number(body.monthly?.[m]) || 0;
        });

        const orgHeader = req.headers['x-organization'] || '';
        const defaultPlant = orgHeader.includes('KG') ? 'KG' : 'SG';
        const plant = (body.plant || defaultPlant).toUpperCase();
        const form = body.form || 'I-1';
        const formMeta = store.form_meta?.[form] || { title: 'Budget Item', doc_suffix: 'FM-FAT-06-10b', category: 'CAPEX', badge: 'Custom' };
        const docPrefix = plant === 'SG' ? 'TCFSG' : 'TCFKG';
        const doc_no = formMeta.doc_suffix ? `${docPrefix}-${formMeta.doc_suffix}` : (formMeta.doc_no || `${docPrefix}-FM-FAT-06`);

        const qty = Number(body.qty) || 1;
        const unit_price = Number(body.unit_price) || 0;
        const monthlySum = Object.values(monthly).reduce((a, b) => a + b, 0);
        const total_amount = monthlySum > 0 ? monthlySum : (Number(body.total_amount) || (qty * unit_price));

        const newItem = {
            id: `BGT-${targetYear}-${plant}-${form.replace('-', '')}-${Date.now().toString().slice(-4)}`,
            year: targetYear,
            department: body.department || 'ICT',
            plant,
            form,
            form_title: formMeta.title,
            doc_no,
            category: body.category || formMeta.category,
            category_badge: formMeta.badge,
            sub_category: body.sub_category || 'Custom IT Asset',
            coa_code: body.coa_code || 'I1.1231.1006',
            coa_name: store.coa_dict?.[body.coa_code] || body.coa_name || 'Office Equipment',
            item_name: body.item_name || 'Item Baru',
            type_asset: body.type_asset || '3', // 3 = Expansion
            usage_2025: Number(body.usage_2025) || 0,
            unit_price,
            qty,
            total_amount,
            monthly,
            notes: body.notes || `Ditambahkan manual untuk Tahun Anggaran ${targetYear}`,
            is_custom: true
        };

        const allDbs = getAllDbs(req);
        for (const dbConn of allDbs) {
            try {
                await dbConn('budget_items').insert({
                    id: newItem.id,
                    year: newItem.year,
                    department: newItem.department,
                    plant: newItem.plant,
                    form: newItem.form,
                    form_title: newItem.form_title,
                    doc_no: newItem.doc_no,
                    category: newItem.category,
                    category_badge: newItem.category_badge,
                    sub_category: newItem.sub_category,
                    coa_code: newItem.coa_code,
                    coa_name: newItem.coa_name,
                    item_name: newItem.item_name,
                    type_asset: newItem.type_asset,
                    usage_2025: newItem.usage_2025,
                    unit_price: newItem.unit_price,
                    qty: newItem.qty,
                    total_amount: newItem.total_amount,
                    monthly: JSON.stringify(newItem.monthly),
                    notes: newItem.notes,
                    is_custom: newItem.is_custom,
                    created_at: new Date(),
                    updated_at: new Date()
                }).onConflict('id').merge();
            } catch (dbErr) {
                console.error('[Budgeting] Failed to insert item to DB:', dbErr.message);
            }
        }

        if (!store[`items_${targetYear}`]) store[`items_${targetYear}`] = [];
        store[`items_${targetYear}`].unshift(newItem);

        // Auto-sync into budget_activity_plans (TCF Improvement Activity Plan)
        if (body.sync_to_activity_plan !== false) {
            const activeMonths = months.filter(m => (Number(newItem.monthly[m]) || 0) > 0);
            const planMonths = activeMonths.length > 0 ? activeMonths : ['jan'];
            const firstMonth = planMonths[0];
            const lastMonth = planMonths[planMonths.length - 1];
            const quarterMap = {
                jan: 'Q1', feb: 'Q1', mar: 'Q1',
                apr: 'Q2', may: 'Q2', jun: 'Q2',
                jul: 'Q3', aug: 'Q3', sep: 'Q3',
                oct: 'Q4', nov: 'Q4', dec: 'Q4'
            };
            const quarter = quarterMap[firstMonth] || 'Q1';

            let controlItem = 'Hardware & Asset';
            let catKey = 'HARDWARE_REFRESH';
            const nameLower = (newItem.item_name || '').toLowerCase();
            const subLower = (newItem.sub_category || '').toLowerCase();

            if (newItem.form === 'F1' || subLower.includes('software') || nameLower.includes('lisensi') || nameLower.includes('license') || nameLower.includes('amc')) {
                controlItem = 'Software & License';
                catKey = 'SOFTWARE_ERP';
            } else if (subLower.includes('network') || nameLower.includes('cctv') || nameLower.includes('server') || nameLower.includes('switch') || nameLower.includes('kamera') || nameLower.includes('fiber')) {
                controlItem = 'Infrastructure';
                catKey = 'NETWORK_INFRA';
            } else if (nameLower.includes('security') || nameLower.includes('firewall') || nameLower.includes('wazuh') || nameLower.includes('antivirus')) {
                controlItem = 'Cybersecurity';
                catKey = 'CYBERSECURITY';
            } else if (nameLower.includes('kanban') || nameLower.includes('andon') || nameLower.includes('mes') || nameLower.includes('robot') || nameLower.includes('plc')) {
                controlItem = 'Productivity';
                catKey = 'SMART_FACTORY';
            }

            const actId = `ACT-${targetYear}-${plant}-BGT-${Date.now().toString().slice(-4)}`;
            const isCapex = newItem.form === 'I-1' || newItem.category === 'CAPEX';
            const capexAmt = isCapex ? newItem.total_amount : 0;
            const opexAmt = !isCapex ? newItem.total_amount : 0;

            const actPlan = {
                id: actId,
                year: targetYear,
                plant,
                control_item: controlItem,
                item_no: `BGT-${newItem.id.slice(-4)}`,
                category: catKey,
                title: newItem.item_name,
                description: `Item Anggaran ${newItem.form} (${newItem.doc_no}) Dept ${newItem.department}. Sub: ${newItem.sub_category || '-'}. Catatan: ${newItem.notes || '-'}`,
                quarter,
                target_month: firstMonth,
                plan_start_month: firstMonth,
                plan_end_month: lastMonth,
                actual_start_month: null,
                actual_end_month: null,
                plan_months: planMonths,
                actual_months: [],
                budget_type: isCapex ? 'CAPEX_I1' : 'OPEX_F2',
                capex_amount: capexAmt,
                opex_amount: opexAmt,
                total_amount: newItem.total_amount,
                pic: 'Hery (ICT)',
                priority: 'HIGH',
                status: 'PLANNED',
                progress_pct: 0,
                kpi_deliverable: `Pengadaan ${newItem.item_name} pada bulan ${planMonths.map(m => m.toUpperCase()).join(', ')}`,
                milestones: [
                    { id: `M1-${actId}`, text: 'Persetujuan Anggaran FAT', done: true },
                    { id: `M2-${actId}`, text: 'Penerbitan PR & PO Purchasing', done: false },
                    { id: `M3-${actId}`, text: 'Penyelesaian & Instalasi Asset', done: false }
                ],
                is_budget_synced: true,
                budget_item_ids: [newItem.id]
            };

            for (const dbConn of allDbs) {
                try {
                    await dbConn('budget_activity_plans').insert({
                        id: actPlan.id,
                        year: actPlan.year,
                        plant: actPlan.plant,
                        control_item: actPlan.control_item,
                        item_no: actPlan.item_no,
                        category: actPlan.category,
                        title: actPlan.title,
                        description: actPlan.description,
                        quarter: actPlan.quarter,
                        target_month: actPlan.target_month,
                        plan_start_month: actPlan.plan_start_month,
                        plan_end_month: actPlan.plan_end_month,
                        actual_start_month: null,
                        actual_end_month: null,
                        plan_months: JSON.stringify(actPlan.plan_months),
                        actual_months: JSON.stringify([]),
                        budget_type: actPlan.budget_type,
                        capex_amount: actPlan.capex_amount,
                        opex_amount: actPlan.opex_amount,
                        total_amount: actPlan.total_amount,
                        pic: actPlan.pic,
                        priority: actPlan.priority,
                        status: actPlan.status,
                        progress_pct: actPlan.progress_pct,
                        kpi_deliverable: actPlan.kpi_deliverable,
                        milestones: JSON.stringify(actPlan.milestones),
                        is_budget_synced: true,
                        budget_item_ids: JSON.stringify(actPlan.budget_item_ids),
                        created_at: new Date(),
                        updated_at: new Date()
                    }).onConflict('id').merge();
                } catch (e) {
                    console.error('[Budgeting] Failed to insert activity plan from budget item:', e.message);
                }
            }

            if (!store.activity_plans) store.activity_plans = [];
            store.activity_plans.unshift(actPlan);
        }

        saveStore(store);

        res.status(201).json({ success: true, item: newItem });
    } catch (err) {
        console.error('[Budgeting] POST /items error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/budgeting/items/:id - Update item
router.put('/items/:id', async (req, res) => {
    try {
        const store = readStore();
        const { id } = req.params;
        const updates = req.body;
        const targetYear = parseInt(updates.year) || parseInt(req.query.year) || 2027;

        let yearKey = `items_${targetYear}`;
        if (!store[yearKey]) {
            // Find in any year
            for (const k of Object.keys(store)) {
                if (k.startsWith('items_') && store[k].some(it => it.id === id)) {
                    yearKey = k;
                    break;
                }
            }
        }

        const list = store[yearKey] || [];
        const idx = list.findIndex(it => it.id === id);
        const existing = idx !== -1 ? list[idx] : null;

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        let monthly = (existing && existing.monthly) ? { ...existing.monthly } : {};
        if (updates.monthly) {
            monthly = {};
            months.forEach(m => {
                monthly[m] = Number(updates.monthly[m]) || 0;
            });
        }

        const monthlySum = Object.values(monthly).reduce((a, b) => a + b, 0);
        const total_amount = updates.monthly ? monthlySum : (updates.total_amount !== undefined ? Number(updates.total_amount) : (existing ? existing.total_amount : 0));

        const updatedItem = {
            ...(existing || {}),
            ...updates,
            id,
            monthly,
            total_amount,
            updated_at: new Date().toISOString()
        };

        const allDbs = getAllDbs(req);
        const dbUpdates = {
            department: updatedItem.department,
            plant: updatedItem.plant,
            form: updatedItem.form,
            form_title: updatedItem.form_title,
            doc_no: updatedItem.doc_no,
            category: updatedItem.category,
            category_badge: updatedItem.category_badge,
            sub_category: updatedItem.sub_category,
            coa_code: updatedItem.coa_code,
            coa_name: updatedItem.coa_name,
            item_name: updatedItem.item_name,
            type_asset: updatedItem.type_asset,
            usage_2025: Number(updatedItem.usage_2025) || 0,
            unit_price: Number(updatedItem.unit_price) || 0,
            qty: Number(updatedItem.qty) || 1,
            total_amount: Number(updatedItem.total_amount) || 0,
            monthly: JSON.stringify(updatedItem.monthly),
            notes: updatedItem.notes,
            updated_at: new Date()
        };
        Object.keys(dbUpdates).forEach(k => dbUpdates[k] === undefined && delete dbUpdates[k]);

        for (const dbConn of allDbs) {
            try {
                await dbConn('budget_items').where({ id }).update(dbUpdates);
            } catch (dbErr) {
                console.error('[Budgeting] Failed to update item in DB:', dbErr.message);
            }
        }

        if (idx !== -1) {
            list[idx] = updatedItem;
        } else {
            if (!store[yearKey]) store[yearKey] = [];
            store[yearKey].unshift(updatedItem);
        }

        // Update linked activity plan if exists
        const activeMonths = months.filter(m => (Number(updatedItem.monthly?.[m]) || 0) > 0);
        if (activeMonths.length > 0) {
            for (const dbConn of allDbs) {
                try {
                    await dbConn('budget_activity_plans')
                        .whereRaw("budget_item_ids::text LIKE ?", [`%${id}%`])
                        .update({
                            plan_months: JSON.stringify(activeMonths),
                            plan_start_month: activeMonths[0],
                            plan_end_month: activeMonths[activeMonths.length - 1],
                            total_amount: updatedItem.total_amount,
                            updated_at: new Date()
                        });
                } catch (e) {}
            }
        }

        if (store.activity_plans) {
            const actIdx = store.activity_plans.findIndex(a => a.budget_item_ids && a.budget_item_ids.includes(id));
            if (actIdx !== -1) {
                store.activity_plans[actIdx].plan_months = activeMonths;
                store.activity_plans[actIdx].plan_start_month = activeMonths[0];
                store.activity_plans[actIdx].plan_end_month = activeMonths[activeMonths.length - 1];
                store.activity_plans[actIdx].total_amount = updatedItem.total_amount;
            }
        }

        saveStore(store);

        res.json({ success: true, item: updatedItem });
    } catch (err) {
        console.error('[Budgeting] PUT /items/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/budgeting/items/:id
router.delete('/items/:id', async (req, res) => {
    try {
        const store = readStore();
        const { id } = req.params;

        const allDbs = getAllDbs(req);
        for (const dbConn of allDbs) {
            try {
                await dbConn('budget_items').where({ id }).del();
                await dbConn('budget_activity_plans').whereRaw("budget_item_ids::text LIKE ?", [`%${id}%`]).del();
            } catch (dbErr) {
                console.error('[Budgeting] Failed to delete item from DB:', dbErr.message);
            }
        }

        if (store.activity_plans) {
            store.activity_plans = store.activity_plans.filter(a => !(a.budget_item_ids && a.budget_item_ids.includes(id)));
        }

        let deleted = false;
        Object.keys(store).forEach(k => {
            if (k.startsWith('items_')) {
                const initLen = store[k].length;
                store[k] = store[k].filter(it => it.id !== id);
                if (store[k].length < initLen) deleted = true;
            }
        });

        if (!deleted && !db) {
            return res.status(404).json({ error: 'Item not found' });
        }

        saveStore(store);
        res.json({ success: true, message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/simulate - Apply adjustment factor to any year
router.post('/simulate', (req, res) => {
    try {
        const store = readStore();
        const { year = 2027, sourceYear, percentage = 5, category = 'ALL', plant = 'ALL' } = req.body;
        const targetYear = parseInt(year);
        const baseYear = sourceYear ? parseInt(sourceYear) : (targetYear - 1 in store ? targetYear - 1 : 2026);

        const sourceList = store[`items_${baseYear}`] || store['items_2026'] || [];
        const factor = 1 + (Number(percentage) / 100);
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        store[`items_${targetYear}`] = sourceList.map(baseline => {
            const matchesCat = category === 'ALL' || baseline.category === category;
            const matchesPlant = plant === 'ALL' || baseline.plant === plant;
            const currentFactor = (matchesCat && matchesPlant) ? factor : 1.0;

            const newMonthly = {};
            months.forEach(m => {
                newMonthly[m] = Math.round((Number(baseline.monthly?.[m]) || 0) * currentFactor);
            });
            const newTotal = Object.values(newMonthly).reduce((a, b) => a + b, 0);

            return {
                ...baseline,
                id: baseline.id.replace(String(baseline.year), String(targetYear)),
                year: targetYear,
                usage_2025: baseline.total_amount,
                unit_price: Math.round((baseline.unit_price || 0) * currentFactor),
                total_amount: newTotal,
                monthly: newMonthly,
                growth_pct: (currentFactor - 1) * 100
            };
        });

        saveStore(store);
        res.json({
            success: true,
            message: `Proyeksi Tahun ${targetYear} diterapkan dengan faktor +${percentage}% berbasis Tahun ${baseYear}`,
            totalItems: store[`items_${targetYear}`].length,
            totalPlanned: store[`items_${targetYear}`].reduce((s, x) => s + x.total_amount, 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/budgeting/export/excel - Run python export generator for specific plant (SG or KG)
router.get('/export/excel', (req, res) => {
    try {
        const year = parseInt(req.query.year) || 2027;
        const plant = (req.query.plant || 'SG').toUpperCase();

        const fileTag = plant === 'ALL' ? 'TCF_KONSOLIDASI' : `TCF${plant}`;
        const fileName = `FORM_BUDGET_ICT_${fileTag}_Y${year}.xlsx`;
        const filePath = path.join(EXPORTS_DIR, fileName);

        // If pristine, validated COM-generated export file already exists, serve immediately (100% clean, no DrawingML corruption)
        if (fs.existsSync(filePath)) {
            return res.download(filePath, fileName);
        }

        const isWin = process.platform === 'win32';
        const pyCmd = isWin ? 'python' : 'python3';
        
        let scriptPath;
        if (fs.existsSync('/opt/power_asset/_Scripts/generate_budget_excel.py')) {
            scriptPath = '/opt/power_asset/_Scripts/generate_budget_excel.py';
        } else {
            scriptPath = path.join(__dirname, '..', '..', '_Scripts', 'generate_budget_excel.py');
        }

        const cmd = `${pyCmd} "${scriptPath}" ${year} ${plant}`;

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('[Budgeting Export Error]:', stderr || error.message);
                return res.status(500).json({ error: 'Failed to generate Excel file', details: stderr || error.message });
            }

            const fileTag = plant === 'ALL' ? 'TCF_KONSOLIDASI' : `TCF${plant}`;
            const fileName = `FORM_BUDGET_ICT_${fileTag}_Y${year}.xlsx`;
            const filePath = path.join(EXPORTS_DIR, fileName);

            if (fs.existsSync(filePath)) {
                res.download(filePath, fileName);
            } else {
                res.status(404).json({ error: 'Generated file not found', attempted: fileName });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// MASTER PLAN: HARDWARE LIFECYCLE & ISO/IK STANDARDS ASSESSMENT
// =========================================================================

function parseAssetSpecs(asset) {
    let raw = asset.specs || asset.specifications;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch (e) {
            raw = { raw_spec: raw };
        }
    }
    raw = raw || {};

    let cpu = raw.cpu || raw.processor || raw.Processor || '';
    let ram = raw.ram || raw.memory || raw.Memory || raw.ram_gb || '';
    let storage = raw.storage || raw.storage_info || raw.disks || raw.Hardisk || raw.storage_summary || '';
    let os = raw.os || raw.OperatingSystem || raw.os_version || '';

    if (raw.raw_spec && typeof raw.raw_spec === 'string') {
        const text = raw.raw_spec;
        if (!cpu) {
            const cpuMatch = text.match(/Processor\s*:\s*([^\r\n]+)/i);
            if (cpuMatch) cpu = cpuMatch[1].trim();
        }
        if (!ram) {
            const ramMatch = text.match(/(?:Memory RAM|RAM|Installed RAM|Memory)\s*:\s*([^\r\n]+)/i);
            if (ramMatch) ram = ramMatch[1].trim();
        }
        if (!storage) {
            const storMatch = text.match(/(?:Hardisk Internal|Storage|Harddisk|SSD|HDD)\s*:\s*([^\r\n]+)/i);
            if (storMatch) storage = storMatch[1].trim();
        }
        if (!os) {
            const osMatch = text.match(/(?:Operating System|OS)\s*:\s*([^\r\n]+)/i);
            if (osMatch) os = osMatch[1].trim();
        }
    }

    // Format RAM
    let ramGb = 8;
    if (typeof ram === 'number') {
        ramGb = ram;
        ram = `${ramGb} GB`;
    } else if (typeof ram === 'string' && ram.trim()) {
        const m = ram.match(/(\d+(?:\.\d+)?)\s*(?:GB|Gb|G)/i);
        if (m) {
            ramGb = Math.round(parseFloat(m[1]));
        } else {
            const mb = ram.match(/(\d+)\s*MB/i);
            if (mb) {
                ramGb = Math.round(parseInt(mb[1]) / 1024);
            } else {
                const numMatch = ram.match(/(\d+)/);
                if (numMatch) ramGb = parseInt(numMatch[1]);
            }
        }
    } else if (raw.ram_gb) {
        ramGb = Number(raw.ram_gb) || 8;
        ram = `${ramGb} GB`;
    }

    // Format storage
    let storageStr = '';
    let isSsd = true;
    let disksList = [];

    if (Array.isArray(storage)) {
        disksList = storage;
        const totalGb = storage.reduce((acc, d) => acc + (d.capacity_gb || d.size_gb || d.size || 0), 0);
        const hasSsdDisk = storage.some(d => {
            const str = `${d.name || ''} ${d.model || ''} ${d.type || ''}`.toLowerCase();
            return str.includes('ssd') || str.includes('nvme') || str.includes('solid state') || str.includes('flash') || str.includes('m.2');
        });
        const hasHddDisk = storage.some(d => {
            const str = `${d.name || ''} ${d.model || ''} ${d.type || ''}`.toLowerCase();
            return str.includes('hdd') || str.includes('hard disk') || str.includes('toshiba mq') || str.includes('wdc') || str.includes('st1000') || str.includes('st500') || str.includes('seagate');
        });

        if (hasSsdDisk) {
            isSsd = true;
        } else if (hasHddDisk) {
            isSsd = false;
        } else {
            const rawText = `${raw.storage_summary || ''} ${raw.raw_spec || ''}`.toLowerCase();
            if (rawText.includes('hdd') && !rawText.includes('ssd')) isSsd = false;
            else isSsd = true;
        }

        if (raw.storage_summary && typeof raw.storage_summary === 'string' && raw.storage_summary.trim()) {
            storageStr = `${raw.storage_summary} (${isSsd ? 'SSD' : 'HDD'})`;
        } else if (totalGb > 0) {
            storageStr = `${Math.round(totalGb)} GB (${storage.length > 1 ? 'Multi-Drive' : (isSsd ? 'SSD' : 'HDD')})`;
        } else {
            storageStr = isSsd ? 'SSD 256GB' : 'HDD 500GB';
        }
    } else if (typeof storage === 'string' && storage.trim()) {
        storageStr = storage;
        if (storage.toLowerCase().includes('hdd') && !storage.toLowerCase().includes('ssd')) {
            isSsd = false;
        } else if (storage.toLowerCase().includes('ssd') || storage.toLowerCase().includes('nvme')) {
            isSsd = true;
        }
    } else if (typeof storage === 'object' && storage) {
        storageStr = storage.model || storage.capacity || 'SSD 256GB';
    } else {
        storageStr = 'SSD 256GB';
    }

    // Calculate age from purchase_date or inventory number or raw_spec
    let purchaseYear = null;
    if (asset.purchase_date) {
        const d = new Date(asset.purchase_date);
        if (!isNaN(d.getFullYear())) purchaseYear = d.getFullYear();
    }
    if (!purchaseYear && raw.raw_spec && typeof raw.raw_spec === 'string') {
        const yrMatch = raw.raw_spec.match(/(?:Tahun|Year|\/)\s*:\s*(201\d|202\d)/i) || raw.raw_spec.match(/\/\s*(201\d|202\d)/);
        if (yrMatch) purchaseYear = parseInt(yrMatch[1]);
    }
    if (!purchaseYear && asset.inventory_number) {
        const mYear = asset.inventory_number.match(/20(1\d|2\d)/);
        if (mYear) purchaseYear = parseInt(mYear[0]);
    }
    if (!purchaseYear) purchaseYear = 2022;

    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - purchaseYear);

    // Format Peripherals
    const periph = raw.peripherals || asset.peripherals || {};
    const monitors = raw.monitors || periph.monitors || [];
    const printers = raw.printers || periph.printers || [];

    // Format Installed Software
    const installedSoftware = Array.isArray(raw.software) ? raw.software : [];

    return {
        cpu: cpu || 'Intel Core i3/i5 Standard',
        ram: ram || `${ramGb} GB`,
        ram_gb: ramGb,
        ramGb: ramGb,
        ram_text: ram || `${ramGb} GB`,
        storage: storageStr,
        storage_summary: storageStr,
        isSsd,
        is_ssd: isSsd,
        has_ssd: isSsd,
        disks: disksList,
        os: os || 'Windows 10/11 Pro',
        os_version: raw.os_version || '',
        purchaseYear,
        purchase_year: purchaseYear,
        age,
        age_years: age,
        manufacturer: raw.manufacturer || asset.manufacturer || '',
        model: raw.model || asset.model || '',
        serial_number: raw.serial_number || asset.serial_number || '',
        gpu: raw.gpu || '',
        motherboard: raw.motherboard || '',
        monitors: Array.isArray(monitors) ? monitors : [],
        printers: Array.isArray(printers) ? printers : [],
        peripherals: periph,
        installed_software: installedSoftware,
        mac_addresses: raw.mac_addresses || asset.mac_address || '',
        raw_spec_text: typeof raw.raw_spec === 'string' ? raw.raw_spec : ''
    };
}

// Curated 2027 Master Plan Mapping for Plant SG (100% Synchronized with Excel I-1 (SG) & F2 (SG))
const SG_MASTER_PLAN_2027_MAP = {
    // 1. Mini PC (Row 17 I-1 SG: 2 Unit @ Rp 7.035.000 = Rp 14.070.000 — Jan 2027)
    842: { order: 1, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 7035000, month: 'Jan 2027', excel_item: 'Mini PC (Line Produksi #1 - Sutijo IMF-ADM1)', rec: 'Penggantian Mini PC Industrial Line Produksi (User: Sutijo | Hostname: IMF-ADM1 | Core i3-7100 RAM 4GB Thn 2020) — Alokasi Jan 2027' },
    786: { order: 2, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 7035000, month: 'Jan 2027', excel_item: 'Mini PC (Line Produksi #2 - M. Taopik DESKTOP-TGN84MA)', rec: 'Penggantian Mini PC Industrial Line Produksi (User: Muhamad Taopik | Hostname: DESKTOP-TGN84MA | Pentium G3250) — Alokasi Jan 2027' },

    // 2. Komputer Staff PPIC (Row 31 I-1 SG: 4 Unit @ Rp 8.800.000 = Rp 35.200.000 — Jan, Mar, May, Jul 2027)
    820: { order: 3, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 8800000, month: 'Jan 2027', excel_item: 'Komputer Staff PPIC (Unit #1 - Aditya/Mirna ICT4532)', rec: 'Penggantian Komputer Staff PPIC (User: Aditya/Mirna | Hostname: ICT4532 | Core i3-6100 RAM 4GB) — Alokasi Jan 2027' },
    819: { order: 4, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 8800000, month: 'Mar 2027', excel_item: 'Komputer Staff PPIC (Unit #2 - Khalda Salsabila PPIC-KHALDA)', rec: 'Penggantian Komputer Staff PPIC (User: Khalda Salsabila | Hostname: PPIC-KHALDA | Core i3-6100 RAM 4GB Thn 2021) — Alokasi Mar 2027' },
    844: { order: 5, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 8800000, month: 'May 2027', excel_item: 'Komputer Staff PPIC (Unit #3 - Tia Sulistia DESKTOP-FULC7KQ)', rec: 'Penggantian Komputer Staff PPIC (User: Tia Sulistia | Hostname: DESKTOP-FULC7KQ | Core i3-3240 Gen-3 RAM 3GB) — Alokasi Mei 2027' },
    809: { order: 6, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 8800000, month: 'Jul 2027', excel_item: 'Komputer Staff PPIC (Unit #4 - Siti Muflikhah PPIC-MUFLIKHA)', rec: 'Penggantian Komputer Staff PPIC (User: Siti Muflikhah | Hostname: PPIC-MUFLIKHA | Core i3-6100 RAM 4GB Thn 2021) — Alokasi Jul 2027' },

    // 3. Komputer Staff QC (Row 32 I-1 SG: 2 Unit @ Rp 8.800.000 = Rp 17.600.000 — Feb, Apr 2027)
    834: { order: 7, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 8800000, month: 'Feb 2027', excel_item: 'Komputer Staff QC (Unit #1 - Indri Dwiastuti QC7)', rec: 'Penggantian Komputer Staff QC (User: Indri Dwiastuti | Hostname: QC7 | Pentium G3420 RAM 3GB Thn 2020) — Alokasi Feb 2027' },
    803: { order: 8, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 8800000, month: 'Apr 2027', excel_item: 'Komputer Staff QC (Unit #2 - Lingga Purnama QC-0082)', rec: 'Penggantian Komputer Staff QC (User: Lingga Purnama Anuari | Hostname: QC-0082 | Core i3-8100 Thn 2021) — Alokasi Apr 2027' },

    // 4. Komputer staff Engineering PE (Row 33 I-1 SG: 1 Unit @ Rp 8.800.000 = Rp 8.800.000 — Mar 2027)
    846: { order: 9, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 8800000, month: 'Mar 2027', excel_item: 'Komputer staff Engineering PE (Putri Nur Syifa DESKTOP-TLV30SA)', rec: 'Penggantian Komputer Staff Engineering PE (User: Putri Nur Syifa | Hostname: DESKTOP-TLV30SA | Core i3-8100 RAM 4GB Thn 2021) — Alokasi Mar 2027' },

    // 5. Laptop Staff maintenance (Row 34 I-1 SG: 1 Unit @ Rp 11.200.000 = Rp 11.200.000 — Feb 2027)
    853: { order: 10, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 11200000, month: 'Feb 2027', excel_item: 'Laptop Staff maintenance (Admin / Mustaqim DESKTOP-CI60NCO)', rec: 'Pengadaan/Peremajaan Laptop Admin & Staff Maintenance (Ref: DESKTOP-CI60NCO Celeron N4020 RAM 4GB) — Alokasi Feb 2027' },

    // 6. Laptop Section PPIC (Row 35 I-1 SG: 2 Unit @ Rp 13.600.000 = Rp 27.200.000 — May, Jul 2027)
    839: { order: 11, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 13600000, month: 'May 2027', excel_item: 'Laptop Section PPIC (Unit #1 - Brian Aprianto DESKTOP-16HR1SQ)', rec: 'Penggantian Laptop Section Head PPIC (User: Brian Aprianto | Hostname: DESKTOP-16HR1SQ | Core i5-8365U RAM 4GB sering ngelag) — Alokasi Mei 2027' },
    840: { order: 12, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 13600000, month: 'Jul 2027', excel_item: 'Laptop Section PPIC (Unit #2 - William/Damianus DESKTOP-TJ3DQN4)', rec: 'Penggantian Laptop Section Head PPIC (User: William/Damianus Aditya | Hostname: DESKTOP-TJ3DQN4 | Core i3-6006U RAM 4GB sering ngelag) — Alokasi Jul 2027' },

    // 7. Laptop Plant Head (Row 36 I-1 SG: 1 Unit @ Rp 15.000.000 = Rp 15.000.000 — Jan 2027)
    514: { order: 13, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 15000000, month: 'Jan 2027', excel_item: 'Laptop Plant Head (Pujiono TCF2-PROD1)', rec: 'Penggantian Laptop Plant Head (User: Pujiono | Hostname: TCF2-PROD1 | Core i5-1035G1 @ 1.00GHz Thn 2022 sering lambat) — Alokasi Jan 2027' },

    // 8. Laptop Section Produksi (Row 37 I-1 SG: 1 Unit @ Rp 11.200.000 = Rp 11.200.000 — Jan 2027)
    267: { order: 14, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 11200000, month: 'Jan 2027', excel_item: 'Laptop Section Produksi (Sutijo)', rec: 'Pengadaan Laptop Section Head Produksi (User: Sutijo | Mobilitas koordinasi line & pelaporan produksi) — Alokasi Jan 2027' },

    // 9. [ICT] Asus Vivobook 14 A1404VA (Row 38 I-1 SG: 1 Unit @ Rp 15.000.000 = Rp 15.000.000 — Jan 2027)
    848: { order: 15, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 15000000, month: 'Jan 2027', excel_item: '[ICT] Asus Vivobook 14 A1404VA/Core i7-1355U/16GB/1TB SSD', rec: 'Penggantian Laptop Staff ICT (Hostname: ICT-67543 Core i5-8365U RAM 4GB -> Core i7-1355U 16GB/1TB) — Alokasi Jan 2027' },

    // 10. Laptop Staff Marketing Asus Vivobook Go (Row 39 I-1 SG: 2 Unit @ Rp 13.600.000 = Rp 27.200.000 — Jan, Feb 2027)
    867: { order: 16, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 13600000, month: 'Jan 2027', excel_item: 'Laptop Staff Marketing Asus Vivobook Go (Unit #1 - Tasya DESKTOP-VOOMFRK)', rec: 'Penggantian Laptop Staff Marketing (User: Tasya Eka Putri | Hostname: DESKTOP-VOOMFRK | Core i5-8250U Thn 2021 sering bermasalah) — Alokasi Jan 2027' },
    813: { order: 17, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 13600000, month: 'Feb 2027', excel_item: 'Laptop Staff Marketing Asus Vivobook Go (Unit #2 - Sindi TCF-MKT07)', rec: 'Penggantian Laptop Staff Marketing (User: Sindi Indriyani | Hostname: TCF-MKT07 | Core i5-8250U RAM 4GB sering bermasalah) — Alokasi Feb 2027' },

    // 11. Laptop Program Wirecut Engineering (Row 40 I-1 SG: 1 Unit @ Rp 15.000.000 = Rp 15.000.000 — Jan 2027)
    815: { order: 18, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 15000000, month: 'Jan 2027', excel_item: 'Laptop Program Wirecut Engineering (ENG-1333)', rec: 'Penggantian Laptop Program Wirecut Engineering (Hostname: ENG-1333 | Core i3-6006U Gen-6 RAM 4GB) — Alokasi Jan 2027' },

    // 12. [QMR / MR] Laptop (Row 41 I-1 SG: 1 Unit @ Rp 13.500.000 = Rp 13.500.000 — Feb 2027)
    857: { order: 19, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 13500000, month: 'Feb 2027', excel_item: '[QMR / MR] Laptop (Moh. Tri Istopa DESKTOP-FPIE5DC)', rec: 'Penggantian [QMR / MR] Laptop (User: Moh. Tri Istopa | Hostname: DESKTOP-FPIE5DC | Core i3-6006U Gen-6 Thn 2021) — Alokasi Feb 2027' },

    // 13. [HR / GA] Laptop (Row 42 I-1 SG: 1 Unit @ Rp 15.000.000 = Rp 15.000.000 — Jan 2027)
    900: { order: 20, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 15000000, month: 'Jan 2027', excel_item: '[HR / GA] Laptop (Jajang Saep DESKTOP-B22113H)', rec: 'Penggantian [HR / GA] Laptop Dept Head (User: Jajang Saep | Hostname: DESKTOP-B22113H | Core i5-8265U Thn 2022) — Alokasi Jan 2027' },

    // 14. Laptop engineering (Rendy Arminda) Lenovo LOQ RTX 4050 32 Gb 1 TB (Row 43 I-1 SG: 1 Unit @ Rp 23.000.000 — Jan 2027)
    868: { order: 21, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 23000000, month: 'Jan 2027', excel_item: 'Laptop engineering (Rendy Arminda) Lenovo LOQ RTX 4050 32 Gb 1 TB', rec: 'Penggantian Laptop Division Head Engineering (User: Rendy Arminda | Hostname: NOTEBOOK ASUS Core i3-6006U -> Lenovo LOQ RTX 4050 32GB/1TB) — Alokasi Jan 2027' },

    // 15. [Purchasing Karin] Asus ASUS VIVOBOOK 14 A1404VAP (Row 44 I-1 SG: 1 Unit @ Rp 11.200.000 — Jan 2027)
    825: { order: 22, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 11200000, month: 'Jan 2027', excel_item: '[Purchasing Karin] Asus VIVOBOOK 14 (Nurul Aeni DESKTOP-QDNDH56)', rec: 'Penggantian Laptop Staff Purchasing (User: Nurul Aeni / Karin | Hostname: DESKTOP-QDNDH56 | Core i3-1005G1 RAM 4GB sering bermasalah & rusak) — Alokasi Jan 2027' },

    // 16. [PE Engineering] Laptop (Row 45 I-1 SG: 1 Unit @ Rp 15.000.000 — Jan 2027)
    883: { order: 23, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 15000000, month: 'Jan 2027', excel_item: '[PE Engineering] Laptop (Cely Cahaya Purnama TCF3-FA05)', rec: 'Penggantian Laptop Design PE Engineering (User: Cely Cahaya Purnama | Hostname: TCF3-FA05 | Core i7-6700HQ Gen-6) — Alokasi Jan 2027' },

    // 17. [QC Section Head] Laptop (Row 46 I-1 SG: 2 Unit @ Rp 13.600.000 = Rp 27.200.000 — Jan, Feb 2027)
    896: { order: 24, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 13600000, month: 'Jan 2027', excel_item: '[QC Section Head] Laptop (Unit #1 - Ihwani Setyo DESKTOP-0L7JKFP)', rec: 'Penggantian [QC Section Head] Laptop (User: Ihwani Setyo Nugroho | Hostname: DESKTOP-0L7JKFP | Core i3-10110U sudah lambat & bermasalah) — Alokasi Jan 2027' },
    836: { order: 25, status: 'REPLACE_UNIT', form: 'I-1', category: 'CAPEX', cost: 13600000, month: 'Feb 2027', excel_item: '[QC Section Head] Laptop (Unit #2 - Dian Kurniawan DESKTOP-HFO5QOR)', rec: 'Penggantian [QC Section Head] Laptop (User: Dian Kurniawan | Hostname: DESKTOP-HFO5QOR | Core i5-8250U sudah lambat & bermasalah) — Alokasi Feb 2027' },

    // 18. Upgrade RAM 8 GB (Row 20 F2 SG: 6 Unit @ Rp 1.200.000 = Rp 7.200.000 — Jan, Mar, May, Jun, Sep, Nov 2027)
    854: { order: 26, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 1200000, month: 'Jan 2027', excel_item: 'Memory 8 GB (Unit #1 - Amirullah LAPTOP-BE8NEP5N)', rec: 'Upgrade RAM ke 8GB DDR4 (User: Amirullah Maintenance | Hostname: LAPTOP-BE8NEP5N | Ryzen 3 3250U RAM 4GB — Alokasi Jan 2027)' },
    852: { order: 27, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 1200000, month: 'Mar 2027', excel_item: 'Memory 8 GB (Unit #2 - Nopian Firman DESKTOP-TFKJ7BI)', rec: 'Upgrade RAM ke 8GB DDR4 (User: Nopian Firman QC | Hostname: DESKTOP-TFKJ7BI | Core i3-10105 RAM 4GB — Alokasi Mar 2027)' },
    838: { order: 28, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 1200000, month: 'May 2027', excel_item: 'Memory 8 GB (Unit #3 - Ana Oktaviana DESKTOP-2TPI34I)', rec: 'Upgrade RAM ke 8GB DDR4 (User: Ana Oktaviana PPIC | Hostname: DESKTOP-2TPI34I | Core i5-6400 RAM 4GB — Alokasi Mei 2027)' },
    830: { order: 29, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 1200000, month: 'Jun 2027', excel_item: 'Memory 8 GB (Unit #4 - Awik Pujiyanto DESKTOP-BNG5FFU)', rec: 'Upgrade RAM ke 8GB DDR4 (User: Awik Pujiyanto PPIC | Hostname: DESKTOP-BNG5FFU | Core i5-7400 RAM 4GB — Alokasi Jun 2027)' },
    828: { order: 30, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 1200000, month: 'Sep 2027', excel_item: 'Memory 8 GB (Unit #5 - Endang DESKTOP-K5ESK70)', rec: 'Upgrade RAM ke 8GB DDR4 (User: Endang PPIC | Hostname: DESKTOP-K5ESK70 | Core i3-6100 RAM 4GB — Alokasi Sep 2027)' },
    832: { order: 31, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 1200000, month: 'Nov 2027', excel_item: 'Memory 8 GB (Unit #6 - Nurul Aeni DESKTOP-HOO7D4C)', rec: 'Upgrade RAM ke 8GB DDR4 (User: Nurul Aeni Purchasing | Hostname: DESKTOP-HOO7D4C | Core i5-6500 RAM 4GB — Alokasi Nov 2027)' },

    // 19. Upgrade RAM 16 GB Engineering (Row 21 F2 SG: 2 Unit @ Rp 2.400.000 = Rp 4.800.000 — Apr, Aug 2027)
    266: { order: 32, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 2400000, month: 'Apr 2027', excel_item: 'Memory 16 GB (Unit #1 - Gregorius Yudha DESKTOP-T9A6J9H)', rec: 'Upgrade RAM Workstation Engineering ke 16GB DDR4 (User: Gregorius Yudha PE | Hostname: DESKTOP-T9A6J9H — Alokasi Apr 2027)' },
    12:  { order: 33, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 2400000, month: 'Aug 2027', excel_item: 'Memory 16 GB (Unit #2 - Abdurrahman DESKTOP-02VP769)', rec: 'Upgrade RAM Workstation R&D ke 16GB DDR4 (User: Abdurrahman R&D | Hostname: DESKTOP-02VP769 — Alokasi Agu 2027)' },

    // 20. Upgrade Memory 64 GB Server Dell (Row 24 F2 SG: 1 Unit @ Rp 8.300.000 = Rp 8.300.000 — Mar 2027)
    878: { order: 34, status: 'UPGRADE_RAM', form: 'F2', category: 'OPEX', cost: 8300000, month: 'Mar 2027', excel_item: 'Memory 64 GB (Server Dell Adempiere TCFSG-ICT-SV-2022-05-004)', rec: 'Upgrade Memory ECC 64GB Server Dell PowerEdge ERP Adempiere & AD (Form F2 — Alokasi Mar 2027)' },

    // 21. Migrasi SSD 256 GB (Row 12 F2 SG: 6 Unit @ Rp 1.100.000 = Rp 6.600.000 — Jan, Feb, Apr, Jun, Sep, Nov 2027)
    849: { order: 35, status: 'UPGRADE_SSD', form: 'F2', category: 'OPEX', cost: 1100000, month: 'Jan 2027', excel_item: 'SSD 256 GB (Unit #1 - Sumartono CMM_431065)', rec: 'Migrasi OS Drive dari HDD 500GB ke SSD 256GB (User: Sumartono QC | Hostname: CMM_431065 — Alokasi Jan 2027)' },
    847: { order: 36, status: 'UPGRADE_SSD', form: 'F2', category: 'OPEX', cost: 1100000, month: 'Feb 2027', excel_item: 'SSD 256 GB (Unit #2 - prod7 DESKTOP-VN2VAL9)', rec: 'Migrasi OS Drive dari HDD 500GB ke SSD 256GB (User: prod7 Produksi | Hostname: DESKTOP-VN2VAL9 — Alokasi Feb 2027)' },
    843: { order: 37, status: 'UPGRADE_SSD', form: 'F2', category: 'OPEX', cost: 1100000, month: 'Apr 2027', excel_item: 'SSD 256 GB (Unit #3 - Imam Afrizal QC8)', rec: 'Migrasi OS Drive dari HDD 1TB ke SSD 256GB (User: Imam Afrizal QC | Hostname: QC8 — Alokasi Apr 2027)' },
    831: { order: 38, status: 'UPGRADE_SSD', form: 'F2', category: 'OPEX', cost: 1100000, month: 'Jun 2027', excel_item: 'SSD 256 GB (Unit #4 - Hafifah Devia DESKTOP-80JIP2H)', rec: 'Migrasi OS Drive dari HDD 1TB ke SSD 256GB (User: Hafifah Devia PPIC | Hostname: DESKTOP-80JIP2H — Alokasi Jun 2027)' },
    824: { order: 39, status: 'UPGRADE_SSD', form: 'F2', category: 'OPEX', cost: 1100000, month: 'Sep 2027', excel_item: 'SSD 256 GB (Unit #5 - Bintang Raffi DESKTOP-5Q24QFF)', rec: 'Migrasi OS Drive dari HDD 500GB ke SSD 256GB (User: Bintang Raffi Tool Making | Hostname: DESKTOP-5Q24QFF — Alokasi Sep 2027)' },
    798: { order: 40, status: 'UPGRADE_SSD', form: 'F2', category: 'OPEX', cost: 1100000, month: 'Nov 2027', excel_item: 'SSD 256 GB (Unit #6 - Sindi Indriyani MKT-004)', rec: 'Migrasi OS Drive dari HDD 1TB ke SSD 256GB (User: Sindi Indriyani Marketing | Hostname: MKT-004 — Alokasi Nov 2027)' }
};

function evaluateAssetIK(asset, specs, plant = 'SG') {
    const dept = (asset.user_department || asset.location || '').toLowerCase();
    const isCad = dept.includes('eng') || dept.includes('tool') || dept.includes('mould') || dept.includes('wirecut') || dept.includes('r&d') || dept.includes('design');
    const docStandard = plant === 'KG' ? 'TCFKG-IK-ICT-01' : 'TCFSG-IK-ICT-01';
    const isLaptop = (asset.category || asset.type || '').toLowerCase().includes('laptop') || 
                     (asset.category || asset.type || '').toLowerCase().includes('notebook') || 
                     (asset.name || '').toLowerCase().includes('note') ||
                     (asset.name || '').toLowerCase().includes('nb');

    // Build Detailed 4-Pillar Compliance Checks
    const maxAllowedAge = isCad ? 4 : 5;
    const agePassed = specs.age < maxAllowedAge;
    const ageReason = agePassed 
        ? `Usia perangkat saat ini ${specs.age} tahun, masih dalam batas aman siklus hidup standar ISO (maksimal ${maxAllowedAge} tahun).`
        : `Usia perangkat sudah ${specs.age} tahun (Tahun Perolehan ${specs.purchaseYear}), MELEWATI batas maksimal ${maxAllowedAge} tahun sesuai ${docStandard} Klausul 4.2 & TCF-SOP-ICT-04. Komponen kapasitor motherboard, fan, dan power supply berisiko fatal mendadak mati total.`;

    const minRamRequired = isCad ? 16 : 8;
    const ramPassed = specs.ramGb >= minRamRequired;
    const ramReason = ramPassed
        ? `Kapasitas RAM (${specs.ramGb} GB) sudah memenuhi standar minimum ISO untuk peran ${isCad ? 'CAD/Engineering' : 'Office/Staff'} (${minRamRequired} GB).`
        : `Kapasitas RAM (${specs.ramGb} GB) di bawah standar minimum ISO (${minRamRequired} GB). Menyebabkan sistem sering mengalami memory paging/swapping ke disk, memicu lagging parah saat membuka ERP Adempiere dan browser secara bersamaan.`;

    const cpuLower = (specs.cpu || '').toLowerCase();
    const isCpuOldGen = cpuLower.includes('i3-3') || cpuLower.includes('i5-2') || 
                        cpuLower.includes('i3-4') || cpuLower.includes('i3-6') ||
                        cpuLower.includes('i7-6') || cpuLower.includes('6700hq') ||
                        cpuLower.includes('6006u') || cpuLower.includes('g3250') ||
                        cpuLower.includes('celeron') || cpuLower.includes('pentium');
    const cpuPassed = isCad 
        ? (!cpuLower.includes('i3') && !isCpuOldGen && !cpuLower.includes('i5-8') && !cpuLower.includes('i7-6'))
        : !isCpuOldGen;
    const cpuReason = cpuPassed
        ? `Processor (${specs.cpu}) memiliki kinerja dan clock speed memadai untuk menjalankan sistem ERP dan aplikasi departemen secara stabil.`
        : `Processor (${specs.cpu}) termasuk arsitektur lawas/low-tier yang tidak lagi efisien dan tidak kompatibel secara optimal dengan update keamanan Windows 11 serta aplikasi perancangan modern.`;

    const storagePassed = specs.isSsd;
    const storageReason = storagePassed
        ? `Menggunakan media penyimpanan solid state berkecepatan tinggi (${specs.storage}). Waktu baca/tulis memenuhi standar respon ISO.`
        : `Masih menggunakan HDD mechanical tradisional. Standar ISO ${docStandard} mewajibkan SSD Solid State Drive guna mencegah bottleneck 100% disk usage dan risiko kehilangan data akibat goncangan mekanik.`;

    const complianceChecks = [
        {
            pillar: 'Siklus Umur Operasional (Hardware Lifecycle)',
            rule: `Maksimal ${maxAllowedAge} Tahun (${isCad ? 'Divisi CAD / Engineering' : 'Staff Umum & Office'})`,
            current: `${specs.age} Tahun (Perolehan ${specs.purchaseYear})`,
            passed: agePassed,
            details: ageReason
        },
        {
            pillar: 'Standar Arsitektur Processor (CPU)',
            rule: isCad ? 'Minimal Intel Core i7 / Ryzen 7 (Gen 12+)' : 'Minimal Intel Core i3 (Gen 10+) / Core i5',
            current: specs.cpu,
            passed: cpuPassed,
            details: cpuReason
        },
        {
            pillar: 'Kapasitas Memory Operasional (RAM)',
            rule: `Minimal ${minRamRequired} GB DDR4`,
            current: `${specs.ramGb} GB (${specs.ram})`,
            passed: ramPassed,
            details: ramReason
        },
        {
            pillar: 'Media Simpan & Kecepatan I/O (Storage)',
            rule: 'Wajib SSD Solid State Drive (HDD Dilarang Sebagai OS Drive)',
            current: specs.isSsd ? `SSD (${specs.storage})` : `HDD Mechanical (${specs.storage})`,
            passed: storagePassed,
            details: storageReason
        }
    ];

    const invUpper = (asset.inventory_number || '').toUpperCase();
    const assetPlant = (invUpper.includes('TCFKG') || invUpper.includes('TCF1')) ? 'KG' : 'SG';
    const effectivePlant = plant === 'ALL' ? assetPlant : plant;

    if (effectivePlant === 'SG') {
        const sgPlan = SG_MASTER_PLAN_2027_MAP[asset.id];
        if (sgPlan) {
            const fmtCost = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(sgPlan.cost);
            if (sgPlan.status === 'REPLACE_UNIT') {
                return {
                    status: 'REPLACE_UNIT',
                    status_label: 'Perlu Ganti Unit (Capex)',
                    badge_color: 'rose',
                    target_form: 'I-1',
                    category: 'CAPEX',
                    standard_rule: `${docStandard} Klausul 4.1 & 4.2: Peremajaan Aset Terjadwal Rencana Kerja 2027 (${sgPlan.excel_item})`,
                    recommendation: sgPlan.rec,
                    detailed_justification: `1. Sinkronisasi Master Plan & Budget Excel 2027:\nUnit ini terdaftar resmi dalam Rencana Pengadaan/Peremajaan Form I-1 (SG) Tahun 2027 pada item "${sgPlan.excel_item}" dengan jadwal realisasi ${sgPlan.month}.\n\n2. Kondisi Teknis Saat Ini:\nPerangkat (${specs.cpu}, RAM ${specs.ramGb} GB, Perolehan ${specs.purchaseYear}) digunakan oleh ${asset.user_name || 'User Departemen'} (${asset.user_department || 'SG'}) dan telah masuk antrean prioritas peremajaan guna menjamin kelancaran ERP Adempiere, pelaporan produksi, dan kepatuhan Windows 11 Pro.\n\n3. Kepatuhan Standar ISO/IK:\nSesuai ${docStandard} dan TCF-SOP-ICT-04, penggantian dilakukan secara bertahap sesuai prioritas beban kerja departemen.\n\n4. Alokasi Anggaran 2027:\nDianggarkan pada Formulir I-1 (SG) sebesar ${fmtCost} (${sgPlan.month}).`,
                    technical_risks: [
                        `Terdaftar pada antrean peremajaan prioritas Form I-1 (SG): ${sgPlan.excel_item}`,
                        'Spesifikasi generasi lama berisiko mengalami bottleneck saat beban kerja puncak',
                        'Potensi peningkatan biaya pemeliharaan apabila melewati siklus pakai ekonomis'
                    ],
                    estimated_cost: sgPlan.cost,
                    target_month: sgPlan.month,
                    excel_item: sgPlan.excel_item,
                    sort_order: sgPlan.order,
                    doc_standard: docStandard,
                    compliance_checks: complianceChecks
                };
            }
            if (sgPlan.status === 'UPGRADE_RAM') {
                return {
                    status: 'UPGRADE_RAM',
                    status_label: 'Perlu Upgrade RAM (Opex)',
                    badge_color: 'amber',
                    target_form: 'F2',
                    category: 'OPEX',
                    standard_rule: `${docStandard} Klausul 4.3: Upgrade Kapasitas Memory Terjadwal 2027 (${sgPlan.excel_item})`,
                    recommendation: sgPlan.rec,
                    detailed_justification: `1. Sinkronisasi Master Plan & Budget Excel 2027:\nUnit ini dialokasikan dalam Rencana Sparepart & Upgrade Form F2 (SG) Tahun 2027 pada item "${sgPlan.excel_item}" (${sgPlan.month}).\n\n2. Analisis Teknis:\nProcessor (${specs.cpu}) masih sangat layak pakai, namun kapasitas RAM saat ini (${specs.ramGb} GB) perlu ditingkatkan guna mengeliminasi memory paging/swapping saat multitasking ERP Adempiere & aplikasi kerja.\n\n3. Alokasi Anggaran 2027:\nDianggarkan pada Formulir F2 (SG) sebesar ${fmtCost} (${sgPlan.month}).`,
                    technical_risks: [
                        `Terdaftar pada alokasi upgrade Form F2 (SG): ${sgPlan.excel_item}`,
                        'Kapasitas memory saat ini memicu utilisasi RAM >85% saat beban puncak'
                    ],
                    estimated_cost: sgPlan.cost,
                    target_month: sgPlan.month,
                    excel_item: sgPlan.excel_item,
                    sort_order: sgPlan.order,
                    doc_standard: docStandard,
                    compliance_checks: complianceChecks
                };
            }
            if (sgPlan.status === 'UPGRADE_SSD') {
                return {
                    status: 'UPGRADE_SSD',
                    status_label: 'Perlu Migrasi SSD (Opex)',
                    badge_color: 'amber',
                    target_form: 'F2',
                    category: 'OPEX',
                    standard_rule: `${docStandard} Klausul 4.4: Migrasi Media Simpan SSD Terjadwal 2027 (${sgPlan.excel_item})`,
                    recommendation: sgPlan.rec,
                    detailed_justification: `1. Sinkronisasi Master Plan & Budget Excel 2027:\nUnit ini dialokasikan dalam Rencana Sparepart & Upgrade Form F2 (SG) Tahun 2027 pada item "${sgPlan.excel_item}" (${sgPlan.month}).\n\n2. Analisis Teknis:\nUnit masih menggunakan media penyimpanan HDD mekanikal yang rentan mengalami bottleneck 100% Disk Usage. Migrasi ke SSD 256GB akan meningkatkan kecepatan baca/tulis hingga 5x lipat tanpa perlu mengganti unit PC.\n\n3. Alokasi Anggaran 2027:\nDianggarkan pada Formulir F2 (SG) sebesar ${fmtCost} (${sgPlan.month}).`,
                    technical_risks: [
                        `Terdaftar pada alokasi migrasi SSD Form F2 (SG): ${sgPlan.excel_item}`,
                        'Media simpan HDD mekanikal berisiko menghambat respon sistem operasi dan aplikasi'
                    ],
                    estimated_cost: sgPlan.cost,
                    target_month: sgPlan.month,
                    excel_item: sgPlan.excel_item,
                    sort_order: sgPlan.order,
                    doc_standard: docStandard,
                    compliance_checks: complianceChecks
                };
            }
        }

        return {
            status: 'COMPLIANT',
            status_label: 'Sesuai Standar IK ISO',
            badge_color: 'emerald',
            target_form: '-',
            category: 'NORMAL',
            standard_rule: 'Memenuhi Standar Operasional & Tidak Masuk Antrean Penggantian 2027',
            recommendation: 'Perangkat beroperasi optimal dan layak pakai, cukup pemeliharaan preventif rutin (Form F1)',
            detailed_justification: `Berdasarkan evaluasi Master Plan Perangkat Tahun 2027 dan sinkronisasi Rencana Anggaran ICT (${docStandard}), unit ini dalam kondisi layak operasional dan tidak memerlukan alokasi penggantian unit (Capex I-1) maupun upgrade komponen utama (Opex F2) pada periode anggaran 2027.`,
            technical_risks: [],
            estimated_cost: 0,
            sort_order: 999,
            doc_standard: docStandard,
            compliance_checks: complianceChecks
        };
    }

    // Priority 1: Engineering Replacement
    if (isCad && (!agePassed || !cpuPassed)) {
        return {
            status: 'REPLACE_UNIT',
            status_label: 'Perlu Ganti Unit (Capex)',
            badge_color: 'rose',
            target_form: 'I-1',
            category: 'CAPEX',
            standard_rule: `${docStandard} Klausul 4.1: Standar Komputer Desain & CAD Workstation`,
            recommendation: 'Penggantian PC Workstation CAD Baru (Intel Core i7 Gen 14 / RTX 4060 / 32GB RAM / 1TB SSD NVMe)',
            detailed_justification: `1. Kondisi & Analisis Beban Kerja:\nPerangkat berada pada divisi ${asset.user_department || 'Engineering'} yang menangani perancangan dies, mould, dan drawing CAD manufaktur. Spesifikasi saat ini (${specs.cpu}, RAM ${specs.ramGb}GB, Usia ${specs.age} thn) sudah tidak sanggup memproses rendering 3D SolidWorks/ZWCAD tanpa sering mengalami aplikasi crash atau throttling.\n\n2. Kepatuhan Standar ISO/IK:\nBerdasarkan ${docStandard} Klausul 4.1 dan SOP Manajemen Aset TCF-SOP-ICT-04, unit workstation divisi teknik wajib diremajakan sebelum memasuki tahun ke-5 guna mencegah keterlambatan lead time produksi akibat crash desain.\n\n3. Analisis Risiko Teknis:\n- Risiko kegagalan hardware mendadak saat proses drafting.\n- Ketidakmampuan menjalankan pembaruan software CAD 2026 yang menuntut arsitektur GPU RTX dan CPU multi-core modern.\n\n4. Rekomendasi Alokasi Anggaran:\nPenggantian 1 unit PC Workstation CAD Spesifikasi Tinggi dialokasikan pada Formulir I-1 (Capex Investasi) senilai Rp 22.500.000.`,
            technical_risks: [
                'Bottleneck komputasi parah saat rendering 3D dan kalkulasi toolpath CNC',
                'Komponen GPU on-board tidak bersertifikasi OpenGL/DirectX 12 Ultimate',
                'Potensi downtime departemen engineering yang dapat menghambat jadwal rilis drawing dies'
            ],
            estimated_cost: 22500000,
            doc_standard: docStandard,
            compliance_checks: complianceChecks
        };
    }

    // Priority 2: General Lifecycle Replacement (>= 5 years or legacy CPU)
    if (!agePassed || isCpuOldGen) {
        const replaceType = isLaptop 
            ? 'Penggantian Laptop Baru (Intel Core i5 Gen 13 / 16GB RAM / 512GB SSD / Win 11 Pro)'
            : 'Penggantian PC Baru (Mini PC / Desktop Rakitan Core i5 / 16GB RAM / 512GB SSD)';
        const cost = isLaptop ? 10500000 : 7800000;

        return {
            status: 'REPLACE_UNIT',
            status_label: 'Perlu Ganti Unit (Capex)',
            badge_color: 'rose',
            target_form: 'I-1',
            category: 'CAPEX',
            standard_rule: `${docStandard} Klausul 4.2: Siklus Hidup Perangkat Keras Kantor Maksimum 5 Tahun`,
            recommendation: replaceType,
            detailed_justification: `1. Kondisi & Analisis Siklus Hidup:\nPerangkat telah beroperasi selama ${specs.age} tahun (Tahun Perolehan ${specs.purchaseYear}). Sesuai standar ISO 9001:2015 Risk-Based Thinking dan Klausul 4.2 ${docStandard}, batas operasional ekonomis komputer kantor adalah 5 tahun.\n\n2. Kepatuhan Standar ISO/IK:\nUnit telah melampaui masa penyusutan (depresiasi akuntansi) dan masa garansi resmi pabrikan. Penggunaan perangkat melampaui 5 tahun menimbulkan rasio perbaikan (maintenance cost) yang melebihi nilai sisa ekonomisnya.\n\n3. Analisis Risiko Teknis:\n- Arsitektur processor (${specs.cpu}) tidak mendukung instruksi keamanan modern Windows 11 dan enkripsi BitLocker.\n- Degradasi komponen fisik (kapasitor motherboard, motor kipas pendingin, dan power supply) berisiko tinggi mati total sewaktu-waktu.\n\n4. Rekomendasi Alokasi Anggaran:\nPeremajaan unit baru diusulkan pada Formulir I-1 (Capex Investasi Aset Kantor) senilai ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(cost)}.`,
            technical_risks: [
                'Komponen fisik sudah melewati batas usia keandalan (Mean Time Between Failures / MTBF)',
                'Tidak mendukung security baseline Windows 11 Enterprise dan TPM 2.0',
                'Risiko data corruption dan hilangnya produktivitas pengguna saat jam kerja aktif'
            ],
            estimated_cost: cost,
            doc_standard: docStandard,
            compliance_checks: complianceChecks
        };
    }

    // Priority 3: RAM Upgrade
    if (!ramPassed) {
        return {
            status: 'UPGRADE_RAM',
            status_label: 'Perlu Upgrade RAM (Opex)',
            badge_color: 'amber',
            target_form: 'F2',
            category: 'OPEX',
            standard_rule: `${docStandard} Klausul 4.3: Standar Minimum Memory RAM Kantor (${minRamRequired}GB)`,
            recommendation: `Upgrade RAM dari ${specs.ramGb}GB menjadi ${minRamRequired}GB DDR4`,
            detailed_justification: `1. Kondisi Memory Saat Ini:\nKapasitas RAM terpasang (${specs.ramGb} GB) berada di bawah ambang batas minimum standar ISO PT TCF (${minRamRequired} GB). Perangkat masih memiliki prosesor dan usia yang layak pakai, sehingga tidak perlu penggantian unit utuh.\n\n2. Kepatuhan Standar ISO/IK:\nSesuai ${docStandard} Klausul 4.3, efisiensi kerja ditunjang oleh pemenuhan kapasitas memory yang cukup agar tidak terjadi disk paging (penggunaan media simpan sebagai virtual RAM) yang melambatkan sistem.\n\n3. Analisis Risiko & Solusi:\nCukup dilakukan pengadaan spare part keping modul RAM DDR4 untuk dipasang pada slot ekspansi motherboard.\n\n4. Rekomendasi Alokasi Anggaran:\nDianggarkan pada Formulir F2 (Opex Suku Cadang ICT) senilai Rp ${isCad ? '2.400.000' : '1.200.000'}.`,
            technical_risks: [
                'Memory bottleneck saat membuka multiple tabs browser dan ERP Adempiere',
                'Sistem lambat merespon (freeze berkala) akibat paging memory berlebih'
            ],
            estimated_cost: isCad ? 2400000 : 1200000,
            doc_standard: docStandard,
            compliance_checks: complianceChecks
        };
    }

    // Priority 4: SSD Migration
    if (!storagePassed) {
        return {
            status: 'UPGRADE_SSD',
            status_label: 'Perlu Migrasi SSD (Opex)',
            badge_color: 'amber',
            target_form: 'F2',
            category: 'OPEX',
            standard_rule: `${docStandard} Klausul 4.4: Kebijakan Wajib SSD Untuk Mengeliminasi Bottleneck I/O`,
            recommendation: 'Migrasi Storage dari HDD ke SSD 512GB SATA/NVMe High Speed',
            detailed_justification: `1. Kondisi Media Penyimpanan:\nPerangkat saat ini masih mengandalkan Hard Disk Drive (HDD) mekanikal tradisional. Kecepatan baca/tulis HDD (<120MB/s) sangat tertinggal dibandingkan standar SSD (>500MB/s s/d 3000MB/s).\n\n2. Kepatuhan Standar ISO/IK:\n${docStandard} Klausul 4.4 mewajibkan seluruh unit komputasi operasional menggunakan SSD sebagai system drive guna mengeliminasi problem 100% Disk Usage pada sistem operasi modern.\n\n3. Analisis Risiko & Solusi:\nHDD mekanik rentan bad sector dan kegagalan head baca saat terjadi guncangan atau mati listrik mendadak. Solusi: Migrasi ke SSD 512GB dan jadikan HDD lama sebagai media backup sekunder.\n\n4. Rekomendasi Alokasi Anggaran:\nDianggarkan pada Formulir F2 (Opex Suku Cadang ICT) senilai Rp 1.100.000.`,
            technical_risks: [
                'Waktu booting dan loading program sangat lama (> 3 menit)',
                'Gejala 100% Disk Utilization konstan yang membekukan sistem operasi',
                'Risiko kerusakan mekanikal head HDD yang berpotensi menghilangkan database lokal'
            ],
            estimated_cost: 1100000,
            doc_standard: docStandard,
            compliance_checks: complianceChecks
        };
    }

    // Default: Compliant
    return {
        status: 'COMPLIANT',
        status_label: 'Sesuai Standar IK ISO',
        badge_color: 'emerald',
        target_form: '-',
        category: 'NORMAL',
        standard_rule: 'Memenuhi Seluruh Standar Spesifikasi & Lifecycle PT TCF',
        recommendation: 'Perangkat beroperasi optimal dan prima, cukup pemeliharaan preventif rutin (Form F1)',
        detailed_justification: `Seluruh 4 pilar standar spesifikasi (Processor, Kapasitas RAM, Media Simpan SSD, dan Batas Usia Operasional) terpenuhi dengan baik sesuai ${docStandard}. Unit dalam kondisi prima untuk menunjang aktivitas operasional departemen tanpa memerlukan alokasi anggaran investasi (Capex) maupun penggantian spare part (Opex) pada tahun anggaran berjalan.`,
        technical_risks: [],
        estimated_cost: 0,
        doc_standard: docStandard,
        compliance_checks: complianceChecks
    };
}

// GET /api/budgeting/master-plan/hardware
router.get('/master-plan/hardware', async (req, res) => {
    try {
        const orgHeader = req.headers['x-organization'] || '';
        const defaultPlant = orgHeader.includes('KG') ? 'KG' : 'SG';
        const plant = (req.query.plant || defaultPlant).toUpperCase();
        
        let assets = [];
        const db = getDb();
        if (db) {
            try {
                assets = await db('assets')
                    .leftJoin('users', 'assets.user_id', 'users.id')
                    .leftJoin('hr_employees as hr1', 'users.hr_employee_id', 'hr1.id')
                    .leftJoin('hr_employees as hr2', 'assets.hr_employee_id', 'hr2.id')
                    .select(
                        'assets.*',
                        db.raw('COALESCE(hr2.name, hr1.name, users.name) as user_name'),
                        db.raw('COALESCE(hr2.department, hr1.department, users.department) as user_department')
                    )
                    .orderBy('assets.id', 'desc');
            } catch (e) {
                console.error('[Master Plan] DB Query failed:', e.message);
            }
        }
        
        const validCategories = ['desktop', 'laptop', 'notebook', 'pc', 'server', 'mini pc'];
        let computerAssets = assets.filter(a => {
            const cat = (a.category || a.type || a.name || '').toLowerCase();
            return validCategories.some(vc => cat.includes(vc));
        });

        if (plant === 'SG') {
            computerAssets = computerAssets.filter(a => {
                const inv = (a.inventory_number || '').toUpperCase();
                return !inv.includes('TCFKG') && !inv.includes('TCF1');
            });
        } else if (plant === 'KG') {
            computerAssets = computerAssets.filter(a => {
                const inv = (a.inventory_number || '').toUpperCase();
                return inv.includes('TCFKG') || inv.includes('TCF1');
            });
        }

        let compliantCount = 0;
        let upgradeRamCount = 0;
        let upgradeSsdCount = 0;
        let upgradeCount = 0;
        let replaceCount = 0;
        let totalUpgradeCost = 0;
        let totalReplaceCost = 0;

        const evaluatedAssets = computerAssets.map(a => {
            const parsedSpecs = parseAssetSpecs(a);
            const assessment = evaluateAssetIK(a, parsedSpecs, plant);

            if (assessment.status === 'COMPLIANT') {
                compliantCount++;
            } else if (assessment.status === 'REPLACE_UNIT') {
                replaceCount++;
                totalReplaceCost += assessment.estimated_cost;
            } else if (assessment.status === 'UPGRADE_SSD') {
                upgradeSsdCount++;
                upgradeCount++;
                totalUpgradeCost += assessment.estimated_cost;
            } else {
                upgradeRamCount++;
                upgradeCount++;
                totalUpgradeCost += assessment.estimated_cost;
            }

            return {
                id: a.id,
                inventory_number: a.inventory_number || `AST-${a.id}`,
                name: a.name || 'Komputer / Laptop',
                category: a.category || a.type || 'Desktop',
                type: a.category || a.type || 'PC',
                user_name: a.user_name || a.contact || 'Staff TCF',
                department: a.user_department || a.location || 'General',
                location: a.location || a.user_department || 'Plant ' + ((a.inventory_number || '').includes('KG') ? 'KG' : 'SG'),
                plant: (a.inventory_number || '').includes('KG') ? 'KG' : 'SG',
                specs: parsedSpecs,
                assessment
            };
        });

        evaluatedAssets.sort((a, b) => {
            const oa = a.assessment?.sort_order ?? (a.assessment?.status === 'REPLACE_UNIT' ? 50 : a.assessment?.status?.includes('UPGRADE') ? 100 : 999);
            const ob = b.assessment?.sort_order ?? (b.assessment?.status === 'REPLACE_UNIT' ? 50 : b.assessment?.status?.includes('UPGRADE') ? 100 : 999);
            if (oa !== ob) return oa - ob;
            return b.id - a.id;
        });

        const docStd = plant === 'KG' ? 'TCFKG-IK-ICT-01' : 'TCFSG-IK-ICT-01';

        res.json({
            plant,
            summary: {
                total_evaluated: evaluatedAssets.length,
                compliant_count: compliantCount,
                upgrade_ram_count: upgradeRamCount,
                upgrade_ssd_count: upgradeSsdCount,
                replace_unit_count: replaceCount,
                estimated_capex: totalReplaceCost,
                estimated_opex_upgrade: totalUpgradeCost,
                doc_standard: docStd,
                totalDevices: evaluatedAssets.length,
                compliantCount,
                upgradeCount,
                replaceCount,
                compliancePct: evaluatedAssets.length > 0 ? Math.round((compliantCount / evaluatedAssets.length) * 100) : 100,
                totalUpgradeCost,
                totalReplaceCost,
                totalBudgetNeeds: totalUpgradeCost + totalReplaceCost
            },
            assets: evaluatedAssets
        });
    } catch (err) {
        console.error('[Master Plan Hardware Error]:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/master-plan/hardware/push-to-budget
router.post('/master-plan/hardware/push-to-budget', (req, res) => {
    try {
        const store = readStore();
        const { asset_id, year = 2027, item_name, form = 'I-1', category = 'CAPEX', cost = 0, notes = '', plant = 'SG', target_month = 'jan' } = req.body;
        
        const targetYear = parseInt(year) || 2027;
        const formMeta = store.form_meta?.[form] || { title: 'Budget Item', doc_suffix: 'FM-FAT-06-10b', badge: 'Master Plan' };
        const docPrefix = plant === 'SG' ? 'TCFSG' : 'TCFKG';
        const doc_no = formMeta.doc_suffix ? `${docPrefix}-${formMeta.doc_suffix}` : `${docPrefix}-FM-FAT-06`;

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthly = {};
        months.forEach(m => { monthly[m] = 0; });
        const cleanMonth = months.includes(target_month) ? target_month : 'jan';
        monthly[cleanMonth] = Number(cost) || 0;

        const newItem = {
            id: `BGT-${targetYear}-${plant}-${form.replace('-', '')}-MP${Date.now().toString().slice(-4)}`,
            year: targetYear,
            department: 'ICT',
            plant,
            form,
            form_title: formMeta.title,
            doc_no,
            category,
            category_badge: category === 'CAPEX' ? 'Investasi Asset' : 'Hardware Lifecycle',
            sub_category: form === 'I-1' ? 'Office Equipment (Peremajaan)' : 'Sparepart IT (Upgrade)',
            coa_code: form === 'I-1' ? 'I1.1231.1006' : 'F2.5101.2001',
            coa_name: form === 'I-1' ? 'Office Equipment' : 'Spare Part & Component',
            item_name: item_name || `Kebutuhan Lifecycle Asset #${asset_id}`,
            type_asset: form === 'I-1' ? '1' : '3', // 1 = Replacement, 3 = Expansion/Upgrade
            usage_2025: 0,
            unit_price: Number(cost) || 0,
            qty: 1,
            total_amount: Number(cost) || 0,
            monthly,
            notes: notes || `Hasil evaluasi IK ISO Lifecycle Asset #${asset_id}`,
            is_custom: true,
            from_master_plan: true,
            asset_id
        };

        if (!store[`items_${targetYear}`]) store[`items_${targetYear}`] = [];
        store[`items_${targetYear}`].unshift(newItem);
        saveStore(store);

        res.status(201).json({
            success: true,
            message: `Item "${newItem.item_name}" berhasil didaftarkan ke Rencana Anggaran Tahun ${targetYear} (${doc_no})!`,
            item: newItem
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// MASTER PLAN: SOFTWARE & LICENSE LIFECYCLE MANAGEMENT (AMC)
// =========================================================================

// GET /api/budgeting/master-plan/software
router.get('/master-plan/software', (req, res) => {
    try {
        const store = readStore();
        const plant = (req.query.plant || 'ALL').toUpperCase();
        let softwareList = store.software_licenses || [];

        if (plant !== 'ALL') {
            softwareList = softwareList.filter(s => s.plant === plant || s.plant === 'ALL');
        }

        const now = new Date();
        const enrichedList = softwareList.map(s => {
            let daysUntilRenewal = null;
            let status = s.status || 'ACTIVE';

            if (s.maintenance_payment_date && s.maintenance_payment_date !== '-') {
                const target = new Date(s.maintenance_payment_date);
                if (!isNaN(target.getTime())) {
                    const diffTime = target.getTime() - now.getTime();
                    daysUntilRenewal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (daysUntilRenewal < 0) status = 'RENEWAL_DUE';
                    else if (daysUntilRenewal <= 90) status = 'EXPIRING_SOON';
                }
            }

            return {
                ...s,
                daysUntilRenewal,
                days_to_expiry: daysUntilRenewal !== null ? daysUntilRenewal : 365,
                status: status === 'RENEWAL_DUE' ? 'EXPIRED' : status,
                computed_status: status
            };
        });

        const totalPurchaseCapex = enrichedList.reduce((acc, s) => acc + (Number(s.purchase_cost) || 0), 0);
        const totalAnnualMaintenance = enrichedList.reduce((acc, s) => acc + (Number(s.annual_maintenance_cost) || 0), 0);
        const upcomingCount = enrichedList.filter(s => s.computed_status === 'EXPIRING_SOON' || s.computed_status === 'RENEWAL_DUE').length;

        res.json({
            plant,
            summary: {
                total_software: enrichedList.length,
                total_purchase_investment: totalPurchaseCapex,
                total_annual_maintenance: totalAnnualMaintenance,
                expiring_soon_count: upcomingCount,
                totalLicenses: enrichedList.length,
                totalPurchaseCapex,
                totalAnnualMaintenance,
                upcomingCount
            },
            software: enrichedList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/master-plan/software
router.post('/master-plan/software', (req, res) => {
    try {
        const store = readStore();
        if (!store.software_licenses) store.software_licenses = [];

        const body = req.body;
        if (body.id) {
            // Update
            const idx = store.software_licenses.findIndex(s => s.id === body.id);
            if (idx !== -1) {
                store.software_licenses[idx] = { ...store.software_licenses[idx], ...body, updated_at: new Date().toISOString() };
            }
        } else {
            // Create
            const newSoft = {
                id: `SOFT-${Date.now().toString().slice(-5)}`,
                ...body,
                created_at: new Date().toISOString()
            };
            store.software_licenses.push(newSoft);
        }

        saveStore(store);
        res.status(200).json({ success: true, message: 'Data software berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/budgeting/master-plan/software/:id
router.delete('/master-plan/software/:id', (req, res) => {
    try {
        const store = readStore();
        store.software_licenses = (store.software_licenses || []).filter(s => s.id !== req.params.id);
        saveStore(store);
        res.json({ success: true, message: 'Software berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/master-plan/software/sync-to-budget
router.post('/master-plan/software/sync-to-budget', (req, res) => {
    try {
        const store = readStore();
        const { software_id, year = 2027 } = req.body;
        const targetYear = parseInt(year) || 2027;

        const soft = (store.software_licenses || []).find(s => s.id === software_id);
        if (!soft) {
            return res.status(404).json({ error: 'Software tidak ditemukan' });
        }

        const plant = soft.plant === 'ALL' ? 'SG' : soft.plant;
        const form = soft.target_form || 'F1';
        const docPrefix = plant === 'SG' ? 'TCFSG' : 'TCFKG';
        const formMeta = store.form_meta?.[form] || { title: 'Maintenance Budget', doc_suffix: 'FM-FAT-06-07a' };
        const doc_no = formMeta.doc_suffix ? `${docPrefix}-${formMeta.doc_suffix}` : `${docPrefix}-FM-FAT-06`;

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthly = {};
        months.forEach(m => { monthly[m] = 0; });
        const cleanMonth = months.includes(soft.renewal_month) ? soft.renewal_month : 'oct';
        const annualCost = Number(soft.annual_maintenance_cost) || 0;
        monthly[cleanMonth] = annualCost;

        const newItem = {
            id: `BGT-${targetYear}-${plant}-${form.replace('-', '')}-SOFT${Date.now().toString().slice(-4)}`,
            year: targetYear,
            department: soft.department || 'ICT',
            plant,
            form,
            form_title: formMeta.title,
            doc_no,
            category: form === 'I-1' ? 'CAPEX' : 'MAINTENANCE',
            category_badge: 'Software License & AMC',
            sub_category: 'Software Maintenance & Support',
            coa_code: form === 'I-1' ? 'I1.1231.1006' : 'F1.5101.1002',
            coa_name: 'Software License & Maintenance',
            item_name: `Annual Maintenance / Renewal: ${soft.name}`,
            type_asset: '2', // 2 = Rationalization / Ongoing Maintenance
            usage_2025: annualCost,
            unit_price: annualCost,
            qty: 1,
            total_amount: annualCost,
            monthly,
            notes: `Auto-Sync dari Master Plan Software: Jatuh tempo ${soft.maintenance_payment_date || cleanMonth.toUpperCase()} (${soft.vendor})`,
            is_custom: true,
            from_software_master: true,
            software_id
        };

        if (!store[`items_${targetYear}`]) store[`items_${targetYear}`] = [];
        store[`items_${targetYear}`].unshift(newItem);
        saveStore(store);

        res.status(201).json({
            success: true,
            message: `Biaya maintenance ${soft.name} (Rp ${annualCost.toLocaleString('id-ID')}) berhasil disinkronkan ke Anggaran Tahun ${targetYear} (${doc_no})!`,
            item: newItem
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// FITUR PERMINTAAN BUDGET DARI DEPARTEMEN LAIN (SOP TCFSG-SOP-ICT-03)
// Standard Document Control: TCFSG-FM-ICT-03-04 (Sadang) / TCFKG-FM-ICT-03-04 (Karawang)
// =========================================================================

// GET /api/budgeting/department-requests - List department requests with filtering
router.get('/department-requests', async (req, res) => {
    try {
        const { year, plant, department, category, status, search } = req.query;
        let db = getDb(req);
        if (!db) {
            try {
                const dbModule = require('../db');
                if (dbModule && typeof dbModule.getDb === 'function') {
                    db = dbModule.getDb(plant === 'KG' ? 'TCF-KG' : 'TCF-SG');
                }
            } catch (e) {}
        }

        if (db) {
            try {
                let query = db('budget_department_requests');
                if (plant && plant !== 'ALL') {
                    query = query.where({ plant });
                }
                if (year && year !== 'ALL') {
                    const yr = parseInt(year);
                    if (!isNaN(yr)) query = query.where({ target_year: yr });
                }
                if (department && department !== 'ALL') {
                    query = query.where({ department });
                }
                if (category && category !== 'ALL') {
                    query = query.where({ category });
                }
                if (status && status !== 'ALL') {
                    query = query.where({ status });
                }
                if (search) {
                    const q = `%${search.toLowerCase()}%`;
                    query = query.where(function() {
                        this.whereRaw('LOWER(item_name) LIKE ?', [q])
                            .orWhereRaw('LOWER(req_no) LIKE ?', [q])
                            .orWhereRaw('LOWER(id) LIKE ?', [q])
                            .orWhereRaw('LOWER(requester_name) LIKE ?', [q])
                            .orWhereRaw('LOWER(department) LIKE ?', [q])
                            .orWhereRaw('LOWER(technical_specs) LIKE ?', [q]);
                    });
                }

                const list = await query.orderBy('created_at', 'desc');
                const [{ count: allCount }] = await db('budget_department_requests').count('id as count');
                const totalAmount = list.reduce((sum, r) => sum + (Number(r.estimated_total_cost) || 0), 0);
                const approvedCount = list.filter(r => r.status === 'APPROVED_TO_BUDGET').length;
                const pendingCount = list.filter(r => r.status === 'SUBMITTED' || r.status === 'VERIFIED_ICT').length;

                return res.json({
                    requests: list,
                    total: list.length,
                    summary: {
                        total_amount: totalAmount,
                        approved_count: approvedCount,
                        pending_count: pendingCount,
                        all_count: parseInt(allCount, 10) || list.length
                    }
                });
            } catch (dbErr) {
                console.warn('[Budgeting] DB error on /department-requests, fallback to store:', dbErr.message);
            }
        }

        const store = readStore();
        let list = store.department_requests || [];

        if (plant && plant !== 'ALL') {
            list = list.filter(r => r.plant === plant);
        }
        if (year && year !== 'ALL') {
            const yr = parseInt(year);
            if (!isNaN(yr)) list = list.filter(r => r.target_year === yr);
        }
        if (department && department !== 'ALL') {
            list = list.filter(r => r.department === department);
        }
        if (category && category !== 'ALL') {
            list = list.filter(r => r.category === category);
        }
        if (status && status !== 'ALL') {
            list = list.filter(r => r.status === status);
        }
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(r => 
                (r.item_name && r.item_name.toLowerCase().includes(q)) ||
                (r.req_no && r.req_no.toLowerCase().includes(q)) ||
                (r.id && r.id.toLowerCase().includes(q)) ||
                (r.requester_name && r.requester_name.toLowerCase().includes(q)) ||
                (r.department && r.department.toLowerCase().includes(q)) ||
                (r.technical_specs && r.technical_specs.toLowerCase().includes(q))
            );
        }

        // Summary calculations
        const allList = store.department_requests || [];
        const totalAmount = list.reduce((sum, r) => sum + (Number(r.estimated_total_cost) || 0), 0);
        const approvedCount = list.filter(r => r.status === 'APPROVED_TO_BUDGET').length;
        const pendingCount = list.filter(r => r.status === 'SUBMITTED' || r.status === 'VERIFIED_ICT').length;

        res.json({
            requests: list,
            total: list.length,
            summary: {
                total_amount: totalAmount,
                approved_count: approvedCount,
                pending_count: pendingCount,
                all_count: allList.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/department-requests - Create new department budget request
router.post('/department-requests', async (req, res) => {
    try {
        const store = readStore();
        if (!store.department_requests) store.department_requests = [];

        const body = req.body;
        if (!body.item_name || !body.department) {
            return res.status(400).json({ error: 'Nama kebutuhan dan departemen wajib diisi!' });
        }

        const plant = body.plant || 'SG';
        const dateStr = body.date || new Date().toISOString().slice(0, 10);
        const ymd = dateStr.replace(/-/g, '');
        const count = store.department_requests.length + 1;
        const prefix = plant === 'KG' ? 'TCFKG' : 'TCFSG';
        const req_no = `ICT-${prefix}-REQ-${ymd}-${count.toString().padStart(3, '0')}`;
        const id = `REQ-${plant}-${Date.now().toString().slice(-6)}`;

        const qty = Number(body.qty) || 1;
        const unit_price = Number(body.estimated_unit_price) || 0;
        const estimated_total_cost = Number(body.estimated_total_cost) || (qty * unit_price);

        const newReq = {
            id,
            req_no,
            date: dateStr,
            plant,
            department: body.department,
            requester_name: body.requester_name || '-',
            requester_title: body.requester_title || body.requester_role || 'Staff',
            dept_head_name: body.dept_head_name || body.approver_name || '',
            dept_head_title: body.dept_head_title || body.approver_title || '',
            signed_attachment: body.signed_attachment || null,
            signed_attachment_name: body.signed_attachment_name || null,
            signature_user: body.signature_user || null,
            signature_dept_head: body.signature_dept_head || null,
            category: body.category || 'NEW_DEVICE', // NEW_DEVICE | REPLACEMENT | UPGRADE_HARDWARE | SOFTWARE_LICENSE | NETWORK_INFRA | OTHER
            item_name: body.item_name,
            qty,
            unit: body.unit || 'Unit',
            estimated_unit_price: unit_price,
            estimated_total_cost,
            target_year: parseInt(body.target_year) || 2027,
            target_month: body.target_month || 'jan',
            target_form: body.target_form || (body.category === 'UPGRADE_HARDWARE' ? 'F2' : body.category === 'SOFTWARE_LICENSE' ? 'F1' : 'I-1'),
            technical_specs: body.technical_specs || '',
            justification: body.justification || '',
            status: body.status || 'SUBMITTED', // SUBMITTED | VERIFIED_ICT | APPROVED_TO_BUDGET | REJECTED
            reviewed_by: body.reviewed_by || null,
            review_notes: body.review_notes || '',
            created_at: new Date().toISOString()
        };

        const dbs = getAllDbs(req);
        for (const dbConn of dbs) {
            try {
                await dbConn('budget_department_requests').insert({
                    id: newReq.id,
                    req_no: newReq.req_no,
                    date: newReq.date,
                    plant: newReq.plant,
                    department: newReq.department,
                    requester_name: newReq.requester_name,
                    requester_title: newReq.requester_title,
                    dept_head_name: newReq.dept_head_name,
                    dept_head_title: newReq.dept_head_title,
                    signed_attachment: newReq.signed_attachment,
                    signed_attachment_name: newReq.signed_attachment_name,
                    category: newReq.category,
                    item_name: newReq.item_name,
                    qty: newReq.qty,
                    unit: newReq.unit,
                    estimated_unit_price: newReq.estimated_unit_price,
                    estimated_total_cost: newReq.estimated_total_cost,
                    target_year: newReq.target_year,
                    target_month: newReq.target_month,
                    target_form: newReq.target_form,
                    technical_specs: newReq.technical_specs,
                    justification: newReq.justification,
                    status: newReq.status,
                    reviewed_by: newReq.reviewed_by,
                    review_notes: newReq.review_notes,
                    created_at: new Date(),
                    updated_at: new Date()
                }).onConflict('id').merge();
            } catch (dbErr) {
                console.error('[Budgeting] Failed to insert department request to DB:', dbErr.message);
            }
        }

        store.department_requests.unshift(newReq);
        saveStore(store);

        res.status(201).json({
            success: true,
            message: `Permintaan ${newReq.req_no} (${newReq.item_name}) berhasil didaftarkan!`,
            request: newReq
        });
    } catch (err) {
        console.error('[Budgeting] POST /department-requests error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/budgeting/department-requests/:id - Update existing request
router.put('/department-requests/:id', async (req, res) => {
    try {
        const store = readStore();
        if (!store.department_requests) store.department_requests = [];

        const idx = store.department_requests.findIndex(r => r.id === req.params.id);
        const current = idx !== -1 ? store.department_requests[idx] : null;
        const body = req.body;

        const qty = body.qty !== undefined ? Number(body.qty) : (current ? current.qty : 1);
        const unit_price = body.estimated_unit_price !== undefined ? Number(body.estimated_unit_price) : (current ? current.estimated_unit_price : 0);
        const estimated_total_cost = body.estimated_total_cost !== undefined ? Number(body.estimated_total_cost) : (qty * unit_price);

        const updated = {
            ...(current || {}),
            ...body,
            id: req.params.id,
            qty,
            estimated_unit_price: unit_price,
            estimated_total_cost,
            updated_at: new Date().toISOString()
        };

        const dbs = getAllDbs(req);
        const dbUpdates = {
            department: updated.department,
            plant: updated.plant,
            requester_name: updated.requester_name,
            requester_title: updated.requester_title,
            dept_head_name: updated.dept_head_name,
            dept_head_title: updated.dept_head_title,
            signed_attachment: updated.signed_attachment,
            signed_attachment_name: updated.signed_attachment_name,
            category: updated.category,
            item_name: updated.item_name,
            qty: updated.qty,
            unit: updated.unit,
            estimated_unit_price: updated.estimated_unit_price,
            estimated_total_cost: updated.estimated_total_cost,
            target_year: updated.target_year,
            target_month: updated.target_month,
            target_form: updated.target_form,
            technical_specs: updated.technical_specs,
            justification: updated.justification,
            status: updated.status,
            reviewed_by: updated.reviewed_by,
            review_notes: updated.review_notes,
            updated_at: new Date()
        };
        Object.keys(dbUpdates).forEach(k => dbUpdates[k] === undefined && delete dbUpdates[k]);

        for (const dbConn of dbs) {
            try {
                await dbConn('budget_department_requests').where({ id: req.params.id }).update(dbUpdates);
            } catch (dbErr) {
                console.error('[Budgeting] Failed to update department request in DB:', dbErr.message);
            }
        }

        if (idx !== -1) {
            store.department_requests[idx] = updated;
        } else {
            store.department_requests.unshift(updated);
        }
        saveStore(store);

        res.json({
            success: true,
            message: `Permintaan ${updated.req_no || req.params.id} berhasil diperbarui!`,
            request: updated
        });
    } catch (err) {
        console.error('[Budgeting] PUT /department-requests/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/budgeting/department-requests/:id - Delete a request
router.delete('/department-requests/:id', async (req, res) => {
    try {
        const store = readStore();
        if (!store.department_requests) store.department_requests = [];

        const dbs = getAllDbs(req);
        for (const dbConn of dbs) {
            try {
                await dbConn('budget_department_requests').where({ id: req.params.id }).del();
            } catch (dbErr) {
                console.error('[Budgeting] Failed to delete department request from DB:', dbErr.message);
            }
        }

        store.department_requests = store.department_requests.filter(r => r.id !== req.params.id);
        saveStore(store);

        res.json({ success: true, message: 'Permintaan budget berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/department-requests/:id/approve-to-budget - Push approved request into annual budget items
router.post('/department-requests/:id/approve-to-budget', async (req, res) => {
    try {
        const store = readStore();
        if (!store.department_requests) store.department_requests = [];

        let reqItem = store.department_requests.find(r => r.id === req.params.id);
        const db = getDb(req);

        if (!reqItem && db) {
            const dbReq = await db('budget_department_requests').where({ id: req.params.id }).first();
            if (dbReq) reqItem = dbReq;
        }

        if (!reqItem) {
            return res.status(404).json({ error: 'Permintaan budget tidak ditemukan' });
        }

        const targetYear = parseInt(req.body.year || reqItem.target_year) || 2027;
        const plant = reqItem.plant === 'ALL' ? 'SG' : (reqItem.plant || 'SG');
        const form = req.body.form || reqItem.target_form || (reqItem.category === 'UPGRADE_HARDWARE' ? 'F2' : reqItem.category === 'SOFTWARE_LICENSE' ? 'F1' : 'I-1');
        const docPrefix = plant === 'SG' ? 'TCFSG' : 'TCFKG';
        const formMeta = store.form_meta?.[form] || { title: 'Budget Plan', doc_suffix: 'FM-FAT-06' };
        const doc_no = formMeta.doc_suffix ? `${docPrefix}-${formMeta.doc_suffix}` : `${docPrefix}-FM-FAT-06`;

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthly = {};
        months.forEach(m => { monthly[m] = 0; });
        const cleanMonth = months.includes(reqItem.target_month) ? reqItem.target_month : 'jan';
        const totalCost = Number(reqItem.estimated_total_cost) || 0;
        monthly[cleanMonth] = totalCost;

        let coa_code = 'I1.1231.1006';
        let coa_name = 'Office Equipment & ICT Devices';
        let category = 'CAPEX';
        let category_badge = 'Investasi Asset';

        if (form === 'F2') {
            coa_code = 'F2.5101.1003';
            coa_name = 'Sparepart IT & Komputer';
            category = 'SPAREPART';
            category_badge = 'Sparepart IT & Komputer';
        } else if (form === 'F1') {
            coa_code = 'F1.5101.1002';
            coa_name = 'Software License & Maintenance';
            category = 'MAINTENANCE';
            category_badge = 'Perbaikan & Perawatan';
        }

        const newItem = {
            id: `BGT-${targetYear}-${plant}-${form.replace('-', '')}-REQ${Date.now().toString().slice(-4)}`,
            year: targetYear,
            department: reqItem.department,
            plant,
            form,
            form_title: formMeta.title,
            doc_no,
            category,
            category_badge,
            sub_category: reqItem.category === 'SOFTWARE_LICENSE' ? 'Software License' : 'ICT Facility Request',
            coa_code,
            coa_name,
            item_name: `[${reqItem.department}] ${reqItem.item_name}`,
            type_asset: reqItem.category === 'NEW_DEVICE' ? '1' : '2',
            usage_2025: 0,
            unit_price: Number(reqItem.estimated_unit_price) || totalCost,
            qty: Number(reqItem.qty) || 1,
            total_amount: totalCost,
            monthly,
            notes: `Auto-Sync dari Pengajuan Dept (${reqItem.req_no}): Pemohon ${reqItem.requester_name} (${reqItem.department}). SOP Ref TCFSG-SOP-ICT-03 / Form TCFSG-FM-ICT-03-04. Spek: ${reqItem.technical_specs || '-'}`,
            is_custom: true,
            from_dept_request: true,
            request_id: reqItem.id
        };

        const allDbs = getAllDbs(req);
        for (const dbConn of allDbs) {
            try {
                // Insert into budget_items
                await dbConn('budget_items').insert({
                    id: newItem.id,
                    year: newItem.year,
                    department: newItem.department,
                    plant: newItem.plant,
                    form: newItem.form,
                    form_title: newItem.form_title,
                    doc_no: newItem.doc_no,
                    category: newItem.category,
                    category_badge: newItem.category_badge,
                    sub_category: newItem.sub_category,
                    coa_code: newItem.coa_code,
                    coa_name: newItem.coa_name,
                    item_name: newItem.item_name,
                    type_asset: newItem.type_asset,
                    usage_2025: newItem.usage_2025,
                    unit_price: newItem.unit_price,
                    qty: newItem.qty,
                    total_amount: newItem.total_amount,
                    monthly: JSON.stringify(newItem.monthly),
                    notes: newItem.notes,
                    is_custom: newItem.is_custom,
                    created_at: new Date(),
                    updated_at: new Date()
                }).onConflict('id').merge();

                // Update request status across all DBs (SG & KG)
                await dbConn('budget_department_requests').where({ id: req.params.id }).update({
                    status: 'APPROVED_TO_BUDGET',
                    reviewed_by: req.body.reviewed_by || 'ICT Management',
                    updated_at: new Date()
                });
            } catch (dbErr) {
                console.error('[Budgeting] Failed to approve request to DB:', dbErr.message);
            }
        }

        if (!store[`items_${targetYear}`]) store[`items_${targetYear}`] = [];
        store[`items_${targetYear}`].unshift(newItem);

        // AUTO-SYNC TO IMPROVEMENT ACTIVITY PLAN & ROADMAP TCF
        const activeMonth = cleanMonth; // e.g. 'feb'
        const quarterMap = {
            jan: 'Q1', feb: 'Q1', mar: 'Q1',
            apr: 'Q2', may: 'Q2', jun: 'Q2',
            jul: 'Q3', aug: 'Q3', sep: 'Q3',
            oct: 'Q4', nov: 'Q4', dec: 'Q4'
        };
        const quarter = quarterMap[activeMonth] || 'Q1';

        let controlItem = 'Hardware & Asset';
        let activityCategory = 'HARDWARE_REFRESH';
        if (reqItem.category === 'NEW_DEVICE' || reqItem.category === 'REPLACEMENT') {
            controlItem = 'Hardware & Asset';
            activityCategory = 'HARDWARE_REFRESH';
        } else if (reqItem.category === 'UPGRADE_HARDWARE') {
            controlItem = 'Hardware & Asset';
            activityCategory = 'HARDWARE_REFRESH';
        } else if (reqItem.category === 'SOFTWARE_LICENSE') {
            controlItem = 'Software & License';
            activityCategory = 'SOFTWARE_ERP';
        } else if (reqItem.category === 'NETWORK_INFRA') {
            controlItem = 'Infrastructure';
            activityCategory = 'NETWORK_INFRA';
        }

        const actId = `ACT-${targetYear}-${plant}-REQ-${Date.now().toString().slice(-4)}`;
        const isCapex = form === 'I-1' || category === 'CAPEX';
        const capexAmt = isCapex ? totalCost : 0;
        const opexAmt = !isCapex ? totalCost : 0;

        const newActivityPlan = {
            id: actId,
            year: targetYear,
            plant,
            control_item: controlItem,
            item_no: `REQ-${reqItem.req_no ? reqItem.req_no.slice(-4) : Date.now().toString().slice(-3)}`,
            category: activityCategory,
            title: `[${reqItem.department}] ${reqItem.item_name}`,
            description: `Pengajuan Dept ${reqItem.department} (${reqItem.req_no || '-'}). Pemohon: ${reqItem.requester_name || '-'}. Spek: ${reqItem.technical_specs || '-'}`,
            quarter,
            target_month: activeMonth,
            plan_start_month: activeMonth,
            plan_end_month: activeMonth,
            actual_start_month: null,
            actual_end_month: null,
            plan_months: [activeMonth], // Otomatis bar kuning menyala tepat di bulan pengajuan user (misal: 'feb')
            actual_months: [],
            budget_type: isCapex ? 'CAPEX_I1' : 'OPEX_F2',
            capex_amount: capexAmt,
            opex_amount: opexAmt,
            total_amount: totalCost,
            pic: reqItem.requester_name || 'Hery (ICT)',
            priority: reqItem.priority || 'HIGH',
            status: 'PLANNED',
            progress_pct: 0,
            kpi_deliverable: `Serah terima pengadaan ke ${reqItem.department} (${reqItem.qty || 1} unit) pada bulan ${activeMonth.toUpperCase()}`,
            milestones: [
                { id: `M1-${actId}`, text: 'Approval Anggaran & Masuk Budget FAT', done: true },
                { id: `M2-${actId}`, text: 'Penerbitan PR & PO Purchasing', done: false },
                { id: `M3-${actId}`, text: 'Penerimaan & Instalasi di Dept', done: false }
            ],
            is_budget_synced: true,
            budget_item_ids: [newItem.id]
        };

        for (const dbConn of allDbs) {
            try {
                await dbConn('budget_activity_plans').insert({
                    id: newActivityPlan.id,
                    year: newActivityPlan.year,
                    plant: newActivityPlan.plant,
                    control_item: newActivityPlan.control_item,
                    item_no: newActivityPlan.item_no,
                    category: newActivityPlan.category,
                    title: newActivityPlan.title,
                    description: newActivityPlan.description,
                    quarter: newActivityPlan.quarter,
                    target_month: newActivityPlan.target_month,
                    plan_start_month: newActivityPlan.plan_start_month,
                    plan_end_month: newActivityPlan.plan_end_month,
                    actual_start_month: null,
                    actual_end_month: null,
                    plan_months: JSON.stringify(newActivityPlan.plan_months),
                    actual_months: JSON.stringify([]),
                    budget_type: newActivityPlan.budget_type,
                    capex_amount: newActivityPlan.capex_amount,
                    opex_amount: newActivityPlan.opex_amount,
                    total_amount: newActivityPlan.total_amount,
                    pic: newActivityPlan.pic,
                    priority: newActivityPlan.priority,
                    status: newActivityPlan.status,
                    progress_pct: newActivityPlan.progress_pct,
                    kpi_deliverable: newActivityPlan.kpi_deliverable,
                    milestones: JSON.stringify(newActivityPlan.milestones),
                    is_budget_synced: true,
                    budget_item_ids: JSON.stringify(newActivityPlan.budget_item_ids),
                    created_at: new Date(),
                    updated_at: new Date()
                }).onConflict('id').merge();
            } catch (actDbErr) {
                console.error('[Budgeting] Failed to insert activity plan on approve:', actDbErr.message);
            }
        }

        if (!store.activity_plans) store.activity_plans = [];
        store.activity_plans.unshift(newActivityPlan);

        // Update request status in store
        reqItem.status = 'APPROVED_TO_BUDGET';
        reqItem.budget_item_id = newItem.id;
        reqItem.activity_plan_id = newActivityPlan.id;
        reqItem.approved_year = targetYear;
        reqItem.approved_at = new Date().toISOString();
        reqItem.reviewed_by = req.body.reviewed_by || 'ICT Management';

        saveStore(store);

        res.status(201).json({
            success: true,
            message: `Permintaan ${reqItem.req_no} berhasil disetujui, masuk ke Formulir ${form} (${doc_no}) dan otomatis terbit di Activity Plan bulan ${activeMonth.toUpperCase()} Tahun ${targetYear}!`,
            item: newItem,
            activity_plan: newActivityPlan,
            request: reqItem
        });
    } catch (err) {
        console.error('[Budgeting] POST approve-to-budget error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// ICT ACTIVITY PLANS & STRATEGIC PLANT ROADMAP (2027+)
// ============================================================================

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function getMonthsRange(start, end) {
    if (!start || !end) return [];
    const sIdx = MONTH_KEYS.indexOf(start.toLowerCase());
    const eIdx = MONTH_KEYS.indexOf(end.toLowerCase());
    if (sIdx === -1 || eIdx === -1) return [];
    if (sIdx <= eIdx) {
        return MONTH_KEYS.slice(sIdx, eIdx + 1);
    } else {
        return [MONTH_KEYS[sIdx]];
    }
}

function getDefaultActivityPlans(year = 2027) {
    const yr = parseInt(year) || 2027;
    return [
        {
            id: `ACT-${yr}-KG-NET-001`,
            year: yr,
            plant: 'KG',
            control_item: 'Infrastructure',
            item_no: '1.1',
            category: 'NETWORK_INFRA',
            title: 'Implementasi Sistem Kamera CCTV IP Gedung Baru Karawang',
            description: 'Instalasi 16 unit IP Camera 4MP, NVR 32 Channel 16TB, Switch PoE Gigabit, dan penarikan kabel UTP Cat6 outdoor untuk area perimeter, workshop, loading dock, dan panel kelistrikan gedung baru.',
            quarter: 'Q2',
            target_month: 'apr',
            plan_start_month: 'apr',
            plan_end_month: 'jun',
            plan_months: ['apr', 'may', 'jun'],
            actual_start_month: 'apr',
            actual_end_month: 'may',
            actual_months: ['apr', 'may'],
            budget_type: 'CAPEX_I1',
            capex_amount: 42700000,
            opex_amount: 12300000,
            total_amount: 55000000,
            pic: 'Hery (ICT Specialist)',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress_pct: 65,
            kpi_deliverable: '16 Titik CCTV online 24/7 di PowerAsset & Pos Security, Retensi rekaman 30 hari, VLAN CCTV terisolasi.',
            milestones: [
                { id: 1, text: 'Site survey denah & penentuan 16 titik blindspot gedung baru', done: true },
                { id: 2, text: 'Pengajuan & approval form Capex I-1 dan Opex F2 ke Finance/FAT', done: true },
                { id: 3, text: 'Bidding vendor & penerbitan PO pengadaan unit kamera & NVR', done: true },
                { id: 4, text: 'Penarikan kabel UTP Cat6 & konfigurasi VLAN 50 di MikroTik', done: true },
                { id: 5, text: 'Pemasangan unit kamera, NVR & uji rekam IR night vision', done: false },
                { id: 6, text: 'Integrasi SADP PowerAsset & serah terima BAST resmi', done: false }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-ALL-NET-002`,
            year: yr,
            plant: 'ALL',
            control_item: 'Infrastructure',
            item_no: '1.2',
            category: 'NETWORK_INFRA',
            title: 'Disaster Recovery & Offsite Backup Replication Proxmox VE (SG ⇄ KG)',
            description: 'Sinkronisasi backup VM kritis (iDempiere ERP, HRIS, Database MySQL/Postgres) lintas plant via VPN IPsec Tunnel MikroTik CCR.',
            quarter: 'Q3',
            target_month: 'jul',
            plan_start_month: 'jul',
            plan_end_month: 'sep',
            plan_months: ['jul', 'aug', 'sep'],
            actual_start_month: '',
            actual_end_month: '',
            actual_months: [],
            budget_type: 'OPEX_F2',
            capex_amount: 0,
            opex_amount: 18500000,
            total_amount: 18500000,
            pic: 'System Engineer',
            priority: 'CRITICAL',
            status: 'PLANNED',
            progress_pct: 10,
            kpi_deliverable: 'RPO < 24 jam, RTO < 2 jam saat terjadi downtime data center.',
            milestones: [
                { id: 1, text: 'Desain arsitektur Proxmox Backup Server (PBS)', done: true },
                { id: 2, text: 'Pengadaan HDD Enterprise 8TB untuk NAS Sadang & Karawang', done: false },
                { id: 3, text: 'Konfigurasi schedule backup otomatis malam hari (bandwidth optimization)', done: false },
                { id: 4, text: 'Simulasi disaster recovery restore data iDempiere', done: false }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-SG-SEC-003`,
            year: yr,
            plant: 'SG',
            control_item: 'Cybersecurity',
            item_no: '2.1',
            category: 'CYBERSECURITY',
            title: 'Rollout Wazuh XDR Endpoint Agent ke Seluruh PC Kantor & Shopfloor',
            description: 'Pemasangan agent Wazuh v4.x terpusat ke server 192.168.1.3 untuk deteksi malware, file integrity monitoring (FIM), audit vulnerability, dan compliance ISO 27001.',
            quarter: 'Q1',
            target_month: 'jan',
            plan_start_month: 'jan',
            plan_end_month: 'mar',
            plan_months: ['jan', 'feb', 'mar'],
            actual_start_month: 'jan',
            actual_end_month: 'feb',
            actual_months: ['jan', 'feb'],
            budget_type: 'ZERO_BUDGET',
            capex_amount: 0,
            opex_amount: 0,
            total_amount: 0,
            pic: 'Security Admin / NetAdmin',
            priority: 'CRITICAL',
            status: 'IN_PROGRESS',
            progress_pct: 60,
            kpi_deliverable: 'Coverage 100% PC aktif (Sadang & Karawang) terdaftar di dashboard.tricentrumfortuna.com.',
            milestones: [
                { id: 1, text: 'Setup Wazuh Server & Dashboard di 192.168.1.3', done: true },
                { id: 2, text: 'Batch install agent PC Engineering & Finance', done: true },
                { id: 3, text: 'Rollout agent ke PC Shopfloor & QC', done: false },
                { id: 4, text: 'Konfigurasi alert notifikasi Telegram / WA Bot TCF', done: false }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-SG-HW-004`,
            year: yr,
            plant: 'SG',
            control_item: 'Hardware & Asset',
            item_no: '3.1',
            category: 'HARDWARE_REFRESH',
            title: 'Penggantian PC Afkir Usia > 5 Tahun Sesuai Standar IK-03-02 (Batch 1)',
            description: 'Penggantian 5 unit PC Production & PPC yang sudah berusia > 5 tahun dengan spesifikasi Core i5 Gen 13/14, RAM 16GB, SSD NVMe 512GB untuk mencegah bottleneck kerja.',
            quarter: 'Q1',
            target_month: 'feb',
            plan_start_month: 'feb',
            plan_end_month: 'apr',
            plan_months: ['feb', 'mar', 'apr'],
            actual_start_month: 'feb',
            actual_end_month: 'mar',
            actual_months: ['feb', 'mar'],
            budget_type: 'CAPEX_I1',
            capex_amount: 47500000,
            opex_amount: 0,
            total_amount: 47500000,
            pic: 'Hardware Specialist',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress_pct: 50,
            kpi_deliverable: '5 Unit PC baru deploy, data lama migrasi 100%, PC lama masuk berita acara afkir/gudang cadangan.',
            milestones: [
                { id: 1, text: 'Audit fisik dan verifikasi umur PC di PowerAsset (> 5 tahun)', done: true },
                { id: 2, text: 'Pengajuan Form I-1 Capex Investasi Penggantian Unit', done: true },
                { id: 3, text: 'Setup OS Windows 11 Enterprise & Antivirus standar TCF', done: false },
                { id: 4, text: 'Serah terima ke user dan berita acara penarikan PC lama', done: false }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-SG-SW-005`,
            year: yr,
            plant: 'SG',
            control_item: 'Software & License',
            item_no: '4.1',
            category: 'SOFTWARE_ERP',
            title: 'Perpanjangan Lisensi AMC SolidWorks Engineering & Microsoft 365 2027',
            description: 'Perpanjangan maintenance tahunan SolidWorks CAD untuk Engineering & lisensi cloud Office 365 Business seluruh departemen.',
            quarter: 'Q4',
            target_month: 'oct',
            plan_start_month: 'oct',
            plan_end_month: 'dec',
            plan_months: ['oct', 'nov', 'dec'],
            actual_start_month: '',
            actual_end_month: '',
            actual_months: [],
            budget_type: 'OPEX_F1',
            capex_amount: 0,
            opex_amount: 68000000,
            total_amount: 68000000,
            pic: 'ICT Specialist / Admin',
            priority: 'CRITICAL',
            status: 'PLANNED',
            progress_pct: 0,
            kpi_deliverable: 'Lisensi aktif sampai Q4 2028, update patch version terbaru, dukungan teknis vendor resmi.',
            milestones: [
                { id: 1, text: 'Audit utilisasi seat lisensi SolidWorks & Microsoft 365 aktif', done: false },
                { id: 2, text: 'Request penawaran harga perpanjangan resmi dari AppliCAD / Vendor', done: false },
                { id: 3, text: 'Pengajuan Form F1 Opex Pemeliharaan ke Finance', done: false },
                { id: 4, text: 'Aktivasi kunci lisensi tahunan & perpanjangan subscription cloud', done: false }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-ALL-MOR-006`,
            year: yr,
            plant: 'ALL',
            control_item: 'Moral',
            item_no: '5.1',
            category: 'GOVERNANCE_SOP',
            title: 'Review Kompetensi Matrix Karyawan ICT & Skill Matrix PowerAsset',
            description: 'Evaluasi berkala kompetensi teknis tim ICT, operator sistem, dan PIC aset departemen sesuai standar operasional PT Tri Centrum Fortuna.',
            quarter: 'Q2',
            target_month: 'jun',
            plan_start_month: 'jun',
            plan_end_month: 'dec',
            plan_months: ['jun', 'dec'],
            actual_start_month: 'jun',
            actual_end_month: 'jun',
            actual_months: ['jun'],
            budget_type: 'ZERO_BUDGET',
            capex_amount: 0,
            opex_amount: 0,
            total_amount: 0,
            pic: 'ICT Manager / HRD',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            progress_pct: 50,
            kpi_deliverable: 'Matriks kompetensi 100% terupdate semester 1 & semester 2.',
            milestones: [
                { id: 1, text: 'Review kompetensi matrix Semester 1', done: true },
                { id: 2, text: 'Review kompetensi matrix Semester 2', done: false }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-ALL-MOR-007`,
            year: yr,
            plant: 'ALL',
            control_item: 'Moral',
            item_no: '5.2',
            category: 'GOVERNANCE_SOP',
            title: 'Skill Up Karyawan: Training Sertifikasi Network MTCNA & Wazuh Security',
            description: 'Program peningkatan kapabilitas internal team ICT dan edukasi cybersecurity awareness bagi seluruh karyawan pengguna PC kantor.',
            quarter: 'Q1',
            target_month: 'jan',
            plan_start_month: 'jan',
            plan_end_month: 'dec',
            plan_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
            actual_start_month: 'jan',
            actual_end_month: 'jul',
            actual_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul'],
            budget_type: 'OPEX_F2',
            capex_amount: 0,
            opex_amount: 15000000,
            total_amount: 15000000,
            pic: 'ICT Lead Trainer',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress_pct: 60,
            kpi_deliverable: '2 Engineer tersertifikasi MTCNA, Security awareness score > 85%.',
            milestones: [
                { id: 1, text: 'Penyusunan modul security awareness TCF 2027', done: true },
                { id: 2, text: 'Pelaksanaan workshop MikroTik internal', done: true },
                { id: 3, text: 'Ujian sertifikasi MTCNA', done: false }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-ALL-MOR-008`,
            year: yr,
            plant: 'ALL',
            control_item: 'Moral',
            item_no: '5.3',
            category: 'GOVERNANCE_SOP',
            title: 'Keterlibatan Karyawan dalam Improvement Melalui SS, QCC dan Jishuken',
            description: 'Mendorong ide Kaizen, Suggestion System (SS), dan gugus kendali mutu (QCC) bidang otomatisasi digital dan efisiensi energi IT.',
            quarter: 'Q1',
            target_month: 'jan',
            plan_start_month: 'jan',
            plan_end_month: 'dec',
            plan_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
            actual_start_month: 'jan',
            actual_end_month: 'nov',
            actual_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
            budget_type: 'ZERO_BUDGET',
            capex_amount: 0,
            opex_amount: 0,
            total_amount: 0,
            pic: 'ICT Kaizen Facilitator',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            progress_pct: 90,
            kpi_deliverable: 'Minimal 12 tema SS dan 2 gugus QCC ICT terealisasi.',
            milestones: [
                { id: 1, text: 'Pengumpulan proposal SS Triwulan', done: true },
                { id: 2, text: 'Implementasi Kaizen Shopfloor', done: true }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-SG-PRD-009`,
            year: yr,
            plant: 'SG',
            control_item: 'Productivity',
            item_no: '6.1',
            category: 'SMART_FACTORY',
            title: 'Reduce Dandory Time: Otomatisasi Setting Mesin via IoT Barcode',
            description: 'Pengurangan waktu changeover / dandory melalui integrasi barcode scanner ke sistem resep mesin produksi.',
            quarter: 'Q1',
            target_month: 'jan',
            plan_start_month: 'jan',
            plan_end_month: 'dec',
            plan_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
            actual_start_month: 'jan',
            actual_end_month: 'nov',
            actual_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
            budget_type: 'OPEX_F2',
            capex_amount: 0,
            opex_amount: 8500000,
            total_amount: 8500000,
            pic: 'Automation Engineer',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress_pct: 85,
            kpi_deliverable: 'Dandory time turun 25% di lini utama stamping/welding.',
            milestones: [
                { id: 1, text: 'Pilot project di Lini 1', done: true },
                { id: 2, text: 'Rollout ke Lini 2 & 3', done: true }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-SG-PRD-010`,
            year: yr,
            plant: 'SG',
            control_item: 'Productivity',
            item_no: '6.2',
            category: 'SMART_FACTORY',
            title: 'GSPH Up: Real-time Production Counting & Andon Display',
            description: 'Peningkatan Gross Stroke Per Hour (GSPH) dengan dashboard monitoring output mesin real-time berbasis ESP32 & Node-RED.',
            quarter: 'Q1',
            target_month: 'jan',
            plan_start_month: 'jan',
            plan_end_month: 'dec',
            plan_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
            actual_start_month: 'jan',
            actual_end_month: 'nov',
            actual_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
            budget_type: 'CAPEX_I1',
            capex_amount: 14500000,
            opex_amount: 0,
            total_amount: 14500000,
            pic: 'IoT & Shopfloor Engineer',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress_pct: 90,
            kpi_deliverable: 'Display Andon 55 inch aktif di shopfloor, akurasi counting 99.8%.',
            milestones: [
                { id: 1, text: 'Pemasangan display Andon', done: true },
                { id: 2, text: 'Kalibrasi sensor counter', done: true }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-SG-PRD-011`,
            year: yr,
            plant: 'SG',
            control_item: 'Productivity',
            item_no: '6.3',
            category: 'SMART_FACTORY',
            title: 'Penerapan Kanban System Secara Parsial (Barcode Scanner & MES)',
            description: 'Digitalisasi kartu Kanban material dan transfer barang antar gudang menggunakan wireless barcode scanner dan sinkronisasi ERP.',
            quarter: 'Q1',
            target_month: 'jan',
            plan_start_month: 'jan',
            plan_end_month: 'may',
            plan_months: ['jan', 'feb', 'mar', 'apr', 'may'],
            actual_start_month: '',
            actual_end_month: '',
            actual_months: [],
            budget_type: 'CAPEX_I1',
            capex_amount: 28000000,
            opex_amount: 3500000,
            total_amount: 31500000,
            pic: 'Shopfloor Specialist',
            priority: 'HIGH',
            status: 'PLANNED',
            progress_pct: 20,
            kpi_deliverable: 'Kanban digital aktif di 3 lini perakitan, zero paper loss.',
            milestones: [
                { id: 1, text: 'Uji coba scanner 2D barcode', done: true },
                { id: 2, text: 'Pengadaan 8 unit scanner industrial', done: false }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: `ACT-${yr}-SG-PRD-012`,
            year: yr,
            plant: 'SG',
            control_item: 'Productivity',
            item_no: '6.4',
            category: 'SMART_FACTORY',
            title: 'Support Perubahan Proses Menuju Semi Automation dan Automation',
            description: 'Dukungan infrastruktur jaringan PLC, OPC-UA gateway, dan integrasi server untuk otomatisasi stasiun kerja robotik.',
            quarter: 'Q1',
            target_month: 'jan',
            plan_start_month: 'jan',
            plan_end_month: 'dec',
            plan_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
            actual_start_month: 'jan',
            actual_end_month: 'nov',
            actual_months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov'],
            budget_type: 'CAPEX_I1',
            capex_amount: 35000000,
            opex_amount: 5000000,
            total_amount: 40000000,
            pic: 'Automation & Network Specialist',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress_pct: 85,
            kpi_deliverable: 'Jaringan otomasi terisolasi VLAN 60, zero network latency impact.',
            milestones: [
                { id: 1, text: 'Instalasi switch industrial', done: true },
                { id: 2, text: 'Testing komunikasi robot-PLC-MES', done: true }
            ],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];
}

// GET /api/budgeting/activity-plans - List activity plans with filters and KPI summary
router.get('/activity-plans', async (req, res) => {
    try {
        const { year = 2027, plant, category, quarter, status, search } = req.query;
        const targetYear = parseInt(year) || 2027;
        const db = getDb(req);

        if (db) {
            try {
                // Check if any activity exists for target year
                const [{ count: yearCount }] = await db('budget_activity_plans')
                    .where({ year: targetYear })
                    .count('id as count');

                if (parseInt(yearCount, 10) === 0) {
                    // Auto-seed default activities for this year
                    const defaultList = getDefaultActivityPlans(targetYear);
                    for (const act of defaultList) {
                        await db('budget_activity_plans').insert({
                            id: act.id,
                            year: act.year,
                            plant: act.plant,
                            control_item: act.control_item || 'General',
                            item_no: act.item_no || '',
                            category: act.category,
                            title: act.title,
                            description: act.description,
                            quarter: act.quarter,
                            target_month: act.target_month,
                            plan_start_month: act.plan_start_month || 'jan',
                            plan_end_month: act.plan_end_month || 'mar',
                            actual_start_month: act.actual_start_month || null,
                            actual_end_month: act.actual_end_month || null,
                            plan_months: JSON.stringify(act.plan_months || []),
                            actual_months: JSON.stringify(act.actual_months || []),
                            budget_type: act.budget_type,
                            capex_amount: act.capex_amount,
                            opex_amount: act.opex_amount,
                            total_amount: act.total_amount,
                            pic: act.pic,
                            priority: act.priority,
                            status: act.status,
                            progress_pct: act.progress_pct,
                            kpi_deliverable: act.kpi_deliverable,
                            milestones: JSON.stringify(act.milestones),
                            is_budget_synced: act.is_budget_synced,
                            budget_item_ids: JSON.stringify(act.budget_item_ids),
                            created_at: new Date(),
                            updated_at: new Date()
                        }).onConflict('id').ignore();
                    }
                }

                let query = db('budget_activity_plans').where({ year: targetYear });

                if (plant && plant !== 'ALL') {
                    query = query.where(function() {
                        this.where({ plant }).orWhere({ plant: 'ALL' });
                    });
                }
                if (category && category !== 'ALL') {
                    query = query.where({ category });
                }
                if (quarter && quarter !== 'ALL') {
                    query = query.where({ quarter });
                }
                if (status && status !== 'ALL') {
                    query = query.where({ status });
                }
                if (search) {
                    const q = `%${search.toLowerCase()}%`;
                    query = query.where(function() {
                        this.whereRaw('LOWER(title) LIKE ?', [q])
                            .orWhereRaw('LOWER(description) LIKE ?', [q])
                            .orWhereRaw('LOWER(pic) LIKE ?', [q])
                            .orWhereRaw('LOWER(kpi_deliverable) LIKE ?', [q])
                            .orWhereRaw('LOWER(control_item) LIKE ?', [q])
                            .orWhereRaw('LOWER(item_no) LIKE ?', [q]);
                    });
                }

                const rows = await query.orderBy([
                    { column: 'control_item', order: 'asc' },
                    { column: 'item_no', order: 'asc' },
                    { column: 'created_at', order: 'asc' }
                ]);

                const activities = rows.map(r => {
                    const planStart = r.plan_start_month || 'jan';
                    const planEnd = r.plan_end_month || 'mar';
                    let pMonths = [];
                    try {
                        if (Array.isArray(r.plan_months)) pMonths = r.plan_months;
                        else if (typeof r.plan_months === 'string' && r.plan_months.trim()) pMonths = JSON.parse(r.plan_months);
                    } catch (e) { pMonths = []; }
                    if (!pMonths || pMonths.length === 0) {
                        pMonths = getMonthsRange(planStart, planEnd);
                    }

                    let aMonths = [];
                    try {
                        if (Array.isArray(r.actual_months)) aMonths = r.actual_months;
                        else if (typeof r.actual_months === 'string' && r.actual_months.trim()) aMonths = JSON.parse(r.actual_months);
                    } catch (e) { aMonths = []; }
                    if ((!aMonths || aMonths.length === 0) && r.actual_start_month && r.actual_end_month) {
                        aMonths = getMonthsRange(r.actual_start_month, r.actual_end_month);
                    }

                    return {
                        ...r,
                        control_item: r.control_item || 'General',
                        item_no: r.item_no || '',
                        plan_start_month: planStart,
                        plan_end_month: planEnd,
                        actual_start_month: r.actual_start_month || '',
                        actual_end_month: r.actual_end_month || '',
                        plan_months: pMonths,
                        actual_months: aMonths,
                        capex_amount: parseFloat(r.capex_amount) || 0,
                        opex_amount: parseFloat(r.opex_amount) || 0,
                        total_amount: parseFloat(r.total_amount) || 0,
                        progress_pct: parseInt(r.progress_pct, 10) || 0,
                        is_budget_synced: !!r.is_budget_synced,
                        milestones: typeof r.milestones === 'string' ? JSON.parse(r.milestones || '[]') : (r.milestones || []),
                        budget_item_ids: typeof r.budget_item_ids === 'string' ? JSON.parse(r.budget_item_ids || '[]') : (r.budget_item_ids || [])
                    };
                });

                const totalCapex = activities.reduce((sum, a) => sum + a.capex_amount, 0);
                const totalOpex = activities.reduce((sum, a) => sum + a.opex_amount, 0);
                const totalBudget = activities.reduce((sum, a) => sum + a.total_amount, 0);
                const completedCount = activities.filter(a => a.status === 'COMPLETED').length;
                const inProgressCount = activities.filter(a => a.status === 'IN_PROGRESS').length;
                const plannedCount = activities.filter(a => a.status === 'PLANNED').length;
                const avgProgress = activities.length > 0 
                    ? Math.round(activities.reduce((sum, a) => sum + a.progress_pct, 0) / activities.length) 
                    : 0;

                return res.json({
                    activities,
                    total: activities.length,
                    summary: {
                        total_activities: activities.length,
                        total_capex: totalCapex,
                        total_opex: totalOpex,
                        total_budget: totalBudget,
                        completed_count: completedCount,
                        in_progress_count: inProgressCount,
                        planned_count: plannedCount,
                        avg_progress: avgProgress
                    }
                });
            } catch (dbErr) {
                console.warn('[Budgeting] DB error on /activity-plans, falling back to store:', dbErr.message);
            }
        }

        // Fallback store
        const store = readStore();
        if (!store.activity_plans) store.activity_plans = [];

        const hasYear = store.activity_plans.some(a => a.year === targetYear);
        if (!hasYear) {
            const defaultList = getDefaultActivityPlans(targetYear);
            store.activity_plans.push(...defaultList);
            saveStore(store);
        }

        let list = store.activity_plans.filter(a => a.year === targetYear);
        if (plant && plant !== 'ALL') {
            list = list.filter(a => a.plant === plant || a.plant === 'ALL');
        }
        if (category && category !== 'ALL') {
            list = list.filter(a => a.category === category);
        }
        if (quarter && quarter !== 'ALL') {
            list = list.filter(a => a.quarter === quarter);
        }
        if (status && status !== 'ALL') {
            list = list.filter(a => a.status === status);
        }
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(a => 
                (a.title && a.title.toLowerCase().includes(q)) ||
                (a.description && a.description.toLowerCase().includes(q)) ||
                (a.pic && a.pic.toLowerCase().includes(q)) ||
                (a.kpi_deliverable && a.kpi_deliverable.toLowerCase().includes(q)) ||
                (a.control_item && a.control_item.toLowerCase().includes(q)) ||
                (a.item_no && a.item_no.toLowerCase().includes(q))
            );
        }

        const totalCapex = list.reduce((sum, a) => sum + (Number(a.capex_amount) || 0), 0);
        const totalOpex = list.reduce((sum, a) => sum + (Number(a.opex_amount) || 0), 0);
        const totalBudget = list.reduce((sum, a) => sum + (Number(a.total_amount) || 0), 0);
        const completedCount = list.filter(a => a.status === 'COMPLETED').length;
        const inProgressCount = list.filter(a => a.status === 'IN_PROGRESS').length;
        const plannedCount = list.filter(a => a.status === 'PLANNED').length;
        const avgProgress = list.length > 0
            ? Math.round(list.reduce((sum, a) => sum + (Number(a.progress_pct) || 0), 0) / list.length)
            : 0;

        res.json({
            activities: list,
            total: list.length,
            summary: {
                total_activities: list.length,
                total_capex: totalCapex,
                total_opex: totalOpex,
                total_budget: totalBudget,
                completed_count: completedCount,
                in_progress_count: inProgressCount,
                planned_count: plannedCount,
                avg_progress: avgProgress
            }
        });
    } catch (err) {
        console.error('[Budgeting] GET /activity-plans error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/activity-plans - Create a new activity plan
router.post('/activity-plans', async (req, res) => {
    try {
        const body = req.body;
        const year = parseInt(body.year) || 2027;
        const plant = body.plant || 'SG';
        const cat = body.category || 'NETWORK_INFRA';
        const catPrefix = cat.slice(0, 3);
        const id = body.id || `ACT-${year}-${plant}-${catPrefix}-${Date.now().toString().slice(-4)}`;

        const capex_amount = Number(body.capex_amount) || 0;
        const opex_amount = Number(body.opex_amount) || 0;
        const total_amount = body.total_amount !== undefined ? Number(body.total_amount) : (capex_amount + opex_amount);

        const plan_start_month = body.plan_start_month || body.target_month || 'jan';
        const plan_end_month = body.plan_end_month || plan_start_month || 'mar';
        const actual_start_month = body.actual_start_month || '';
        const actual_end_month = body.actual_end_month || '';

        let plan_months = Array.isArray(body.plan_months) ? body.plan_months : getMonthsRange(plan_start_month, plan_end_month);
        let actual_months = Array.isArray(body.actual_months) ? body.actual_months : (actual_start_month && actual_end_month ? getMonthsRange(actual_start_month, actual_end_month) : []);

        const newPlan = {
            id,
            year,
            plant,
            control_item: body.control_item || 'General',
            item_no: body.item_no || '',
            category: cat,
            title: body.title || 'Program Kerja Baru',
            description: body.description || '',
            quarter: body.quarter || 'Q1',
            target_month: plan_start_month,
            plan_start_month,
            plan_end_month,
            actual_start_month,
            actual_end_month,
            plan_months,
            actual_months,
            budget_type: body.budget_type || (capex_amount > 0 ? 'CAPEX_I1' : opex_amount > 0 ? 'OPEX_F2' : 'ZERO_BUDGET'),
            capex_amount,
            opex_amount,
            total_amount,
            pic: body.pic || 'Hery (ICT Specialist)',
            priority: body.priority || 'MEDIUM',
            status: body.status || 'PLANNED',
            progress_pct: Number(body.progress_pct) || 0,
            kpi_deliverable: body.kpi_deliverable || '',
            milestones: Array.isArray(body.milestones) ? body.milestones : [],
            is_budget_synced: false,
            budget_item_ids: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const db = getDb(req);
        if (db) {
            try {
                await db('budget_activity_plans').insert({
                    id: newPlan.id,
                    year: newPlan.year,
                    plant: newPlan.plant,
                    control_item: newPlan.control_item,
                    item_no: newPlan.item_no,
                    category: newPlan.category,
                    title: newPlan.title,
                    description: newPlan.description,
                    quarter: newPlan.quarter,
                    target_month: newPlan.target_month,
                    plan_start_month: newPlan.plan_start_month,
                    plan_end_month: newPlan.plan_end_month,
                    actual_start_month: newPlan.actual_start_month || null,
                    actual_end_month: newPlan.actual_end_month || null,
                    plan_months: JSON.stringify(newPlan.plan_months),
                    actual_months: JSON.stringify(newPlan.actual_months),
                    budget_type: newPlan.budget_type,
                    capex_amount: newPlan.capex_amount,
                    opex_amount: newPlan.opex_amount,
                    total_amount: newPlan.total_amount,
                    pic: newPlan.pic,
                    priority: newPlan.priority,
                    status: newPlan.status,
                    progress_pct: newPlan.progress_pct,
                    kpi_deliverable: newPlan.kpi_deliverable,
                    milestones: JSON.stringify(newPlan.milestones),
                    is_budget_synced: false,
                    budget_item_ids: JSON.stringify(newPlan.budget_item_ids),
                    created_at: new Date(),
                    updated_at: new Date()
                }).onConflict('id').merge();
            } catch (dbErr) {
                console.error('[Budgeting] DB error inserting activity plan:', dbErr.message);
            }
        }

        const store = readStore();
        if (!store.activity_plans) store.activity_plans = [];
        store.activity_plans.unshift(newPlan);
        saveStore(store);

        res.status(201).json({
            success: true,
            message: `Activity Plan "${newPlan.title}" berhasil didaftarkan ke Tahun ${year}!`,
            activity: newPlan
        });
    } catch (err) {
        console.error('[Budgeting] POST /activity-plans error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/budgeting/activity-plans/:id - Update activity plan
router.put('/activity-plans/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const db = getDb(req);

        let updatedPlan = null;
        if (db) {
            try {
                const existing = await db('budget_activity_plans').where({ id }).first();
                if (existing) {
                    const updateData = {};
                    if (body.title !== undefined) updateData.title = body.title;
                    if (body.description !== undefined) updateData.description = body.description;
                    if (body.plant !== undefined) updateData.plant = body.plant;
                    if (body.control_item !== undefined) updateData.control_item = body.control_item;
                    if (body.item_no !== undefined) updateData.item_no = body.item_no;
                    if (body.category !== undefined) updateData.category = body.category;
                    if (body.quarter !== undefined) updateData.quarter = body.quarter;
                    if (body.target_month !== undefined) updateData.target_month = body.target_month;
                    if (body.plan_start_month !== undefined) updateData.plan_start_month = body.plan_start_month;
                    if (body.plan_end_month !== undefined) updateData.plan_end_month = body.plan_end_month;
                    if (body.actual_start_month !== undefined) updateData.actual_start_month = body.actual_start_month || null;
                    if (body.actual_end_month !== undefined) updateData.actual_end_month = body.actual_end_month || null;
                    if (body.plan_months !== undefined) updateData.plan_months = JSON.stringify(body.plan_months);
                    if (body.actual_months !== undefined) updateData.actual_months = JSON.stringify(body.actual_months);
                    if (body.budget_type !== undefined) updateData.budget_type = body.budget_type;
                    if (body.capex_amount !== undefined) updateData.capex_amount = Number(body.capex_amount);
                    if (body.opex_amount !== undefined) updateData.opex_amount = Number(body.opex_amount);
                    if (body.total_amount !== undefined) {
                        updateData.total_amount = Number(body.total_amount);
                    } else if (body.capex_amount !== undefined || body.opex_amount !== undefined) {
                        updateData.total_amount = (Number(body.capex_amount) || 0) + (Number(body.opex_amount) || 0);
                    }
                    if (body.pic !== undefined) updateData.pic = body.pic;
                    if (body.priority !== undefined) updateData.priority = body.priority;
                    if (body.status !== undefined) updateData.status = body.status;
                    if (body.progress_pct !== undefined) updateData.progress_pct = Number(body.progress_pct);
                    if (body.kpi_deliverable !== undefined) updateData.kpi_deliverable = body.kpi_deliverable;
                    if (body.milestones !== undefined) updateData.milestones = JSON.stringify(body.milestones);
                    if (body.is_budget_synced !== undefined) updateData.is_budget_synced = !!body.is_budget_synced;
                    if (body.budget_item_ids !== undefined) updateData.budget_item_ids = JSON.stringify(body.budget_item_ids);
                    updateData.updated_at = new Date();

                    await db('budget_activity_plans').where({ id }).update(updateData);
                    const fresh = await db('budget_activity_plans').where({ id }).first();
                    updatedPlan = {
                        ...fresh,
                        milestones: typeof fresh.milestones === 'string' ? JSON.parse(fresh.milestones) : fresh.milestones,
                        budget_item_ids: typeof fresh.budget_item_ids === 'string' ? JSON.parse(fresh.budget_item_ids) : fresh.budget_item_ids,
                        plan_months: typeof fresh.plan_months === 'string' ? JSON.parse(fresh.plan_months) : fresh.plan_months,
                        actual_months: typeof fresh.actual_months === 'string' ? JSON.parse(fresh.actual_months) : fresh.actual_months
                    };
                }
            } catch (dbErr) {
                console.error('[Budgeting] DB error updating activity plan:', dbErr.message);
            }
        }

        const store = readStore();
        if (!store.activity_plans) store.activity_plans = [];
        const idx = store.activity_plans.findIndex(a => a.id === id);
        if (idx !== -1) {
            store.activity_plans[idx] = {
                ...store.activity_plans[idx],
                ...body,
                updated_at: new Date().toISOString()
            };
            if (!updatedPlan) updatedPlan = store.activity_plans[idx];
            saveStore(store);
        }

        if (!updatedPlan) {
            return res.status(404).json({ error: 'Activity plan tidak ditemukan' });
        }

        res.json({
            success: true,
            message: `Activity Plan "${updatedPlan.title}" berhasil diperbarui.`,
            activity: updatedPlan
        });
    } catch (err) {
        console.error('[Budgeting] PUT /activity-plans/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/activity-plans/:id/toggle-month - Click-to-toggle month in Gantt view
router.post('/activity-plans/:id/toggle-month', async (req, res) => {
    try {
        const id = req.params.id;
        const { type, month } = req.body; // type: 'plan' | 'actual', month: 'jan'..'dec'
        if (!['plan', 'actual'].includes(type) || !MONTH_KEYS.includes(month)) {
            return res.status(400).json({ error: 'type must be "plan" or "actual" and month must be valid (jan-dec)' });
        }
        const db = getDb(req);
        let plan = null;
        if (db) {
            plan = await db('budget_activity_plans').where({ id }).first();
        }
        const store = readStore();
        if (!plan && store.activity_plans) {
            plan = store.activity_plans.find(a => a.id === id);
        }
        if (!plan) return res.status(404).json({ error: 'Plan not found' });

        const field = type === 'plan' ? 'plan_months' : 'actual_months';
        let currentMonths = [];
        try {
            if (Array.isArray(plan[field])) currentMonths = plan[field];
            else if (typeof plan[field] === 'string' && plan[field].trim()) currentMonths = JSON.parse(plan[field]);
        } catch (e) { currentMonths = []; }

        if (currentMonths.includes(month)) {
            currentMonths = currentMonths.filter(m => m !== month);
        } else {
            currentMonths = [...currentMonths, month];
            currentMonths.sort((a, b) => MONTH_KEYS.indexOf(a) - MONTH_KEYS.indexOf(b));
        }

        if (db) {
            await db('budget_activity_plans').where({ id }).update({
                [field]: JSON.stringify(currentMonths),
                updated_at: new Date()
            });
        }
        if (store.activity_plans) {
            const idx = store.activity_plans.findIndex(a => a.id === id);
            if (idx !== -1) {
                store.activity_plans[idx][field] = currentMonths;
                store.activity_plans[idx].updated_at = new Date().toISOString();
                saveStore(store);
            }
        }
        res.json({ success: true, id, type, months: currentMonths });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/budgeting/activity-plans/:id - Delete activity plan
router.delete('/activity-plans/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const db = getDb(req);
        if (db) {
            try {
                await db('budget_activity_plans').where({ id }).delete();
            } catch (dbErr) {
                console.error('[Budgeting] DB error deleting activity plan:', dbErr.message);
            }
        }

        const store = readStore();
        if (store.activity_plans) {
            store.activity_plans = store.activity_plans.filter(a => a.id !== id);
            saveStore(store);
        }

        res.json({ success: true, message: 'Activity plan berhasil dihapus' });
    } catch (err) {
        console.error('[Budgeting] DELETE /activity-plans/:id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/activity-plans/:id/sync-to-budget - 1-Click Sync to Budget Items (Form I-1 / F2 / F1)
router.post('/activity-plans/:id/sync-to-budget', async (req, res) => {
    try {
        const id = req.params.id;
        const db = getDb(req);
        const store = readStore();

        let plan = null;
        if (db) {
            try {
                const row = await db('budget_activity_plans').where({ id }).first();
                if (row) {
                    plan = {
                        ...row,
                        capex_amount: parseFloat(row.capex_amount) || 0,
                        opex_amount: parseFloat(row.opex_amount) || 0,
                        total_amount: parseFloat(row.total_amount) || 0,
                        milestones: typeof row.milestones === 'string' ? JSON.parse(row.milestones) : row.milestones,
                        budget_item_ids: typeof row.budget_item_ids === 'string' ? JSON.parse(row.budget_item_ids) : row.budget_item_ids
                    };
                }
            } catch (dbErr) {
                console.warn('[Budgeting] DB read on sync-to-budget:', dbErr.message);
            }
        }

        if (!plan && store.activity_plans) {
            plan = store.activity_plans.find(a => a.id === id);
        }

        if (!plan) {
            return res.status(404).json({ error: 'Activity plan tidak ditemukan' });
        }

        const targetYear = plan.year || 2027;
        const plant = (plan.plant === 'ALL' || !plan.plant) ? 'SG' : plan.plant;
        const docPrefix = plant === 'SG' ? 'TCFSG' : 'TCFKG';
        const targetMonth = plan.target_month || (plan.quarter === 'Q1' ? 'jan' : plan.quarter === 'Q2' ? 'apr' : plan.quarter === 'Q3' ? 'jul' : 'oct');
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const cleanMonth = months.includes(targetMonth) ? targetMonth : 'apr';

        const allDbs = getAllDbs(req);
        const createdBudgetItems = [];
        const createdIds = [];

        // 1. If Capex Amount > 0 -> Create Form I-1 Item
        if (plan.capex_amount > 0) {
            const monthlyCapex = {};
            months.forEach(m => { monthlyCapex[m] = 0; });
            monthlyCapex[cleanMonth] = plan.capex_amount;

            const capexItem = {
                id: `BGT-${targetYear}-${plant}-I1-ACT${Date.now().toString().slice(-4)}`,
                year: targetYear,
                department: 'ICT',
                plant,
                form: 'I-1',
                form_title: 'Investasi Asset ICT (Capex)',
                doc_no: `${docPrefix}-FM-FAT-06`,
                category: 'CAPEX',
                category_badge: 'Investasi Asset',
                sub_category: 'Office Equipment & ICT Facility',
                coa_code: 'I1.1231.1006',
                coa_name: 'Office Equipment & ICT Devices',
                item_name: `[Activity Plan ${plan.quarter}] ${plan.title} (Capex Unit)`,
                type_asset: '3',
                usage_2025: 0,
                unit_price: plan.capex_amount,
                qty: 1,
                total_amount: plan.capex_amount,
                monthly: monthlyCapex,
                notes: `Auto-Sync dari Activity Plan: ${plan.title} (${plan.id}). PIC: ${plan.pic || '-'}. KPI: ${plan.kpi_deliverable || '-'}`,
                is_custom: true,
                from_activity_plan: true,
                activity_id: plan.id
            };

            for (const dbConn of allDbs) {
                try {
                    await dbConn('budget_items').insert({
                        id: capexItem.id,
                        year: capexItem.year,
                        department: capexItem.department,
                        plant: capexItem.plant,
                        form: capexItem.form,
                        form_title: capexItem.form_title,
                        doc_no: capexItem.doc_no,
                        category: capexItem.category,
                        category_badge: capexItem.category_badge,
                        sub_category: capexItem.sub_category,
                        coa_code: capexItem.coa_code,
                        coa_name: capexItem.coa_name,
                        item_name: capexItem.item_name,
                        type_asset: capexItem.type_asset,
                        usage_2025: capexItem.usage_2025,
                        unit_price: capexItem.unit_price,
                        qty: capexItem.qty,
                        total_amount: capexItem.total_amount,
                        monthly: JSON.stringify(capexItem.monthly),
                        notes: capexItem.notes,
                        is_custom: true,
                        created_at: new Date(),
                        updated_at: new Date()
                    }).onConflict('id').merge();
                } catch (dbErr) {
                    console.error('[Budgeting] Error inserting capex sync item:', dbErr.message);
                }
            }

            if (!store[`items_${targetYear}`]) store[`items_${targetYear}`] = [];
            store[`items_${targetYear}`].unshift(capexItem);
            createdBudgetItems.push(capexItem);
            createdIds.push(capexItem.id);
        }

        // 2. If Opex Amount > 0 -> Create Form F2 (or F1 if Software) Item
        if (plan.opex_amount > 0) {
            const monthlyOpex = {};
            months.forEach(m => { monthlyOpex[m] = 0; });
            monthlyOpex[cleanMonth] = plan.opex_amount;

            const isSoftware = plan.category === 'SOFTWARE_ERP';
            const opexForm = isSoftware ? 'F1' : 'F2';
            const opexCoa = isSoftware ? 'F1.5101.1002' : 'F2.5101.1003';
            const opexCoaName = isSoftware ? 'Software License & Maintenance' : 'Sparepart IT & Komputer';
            const opexCategory = isSoftware ? 'MAINTENANCE' : 'SPAREPART';

            const opexItem = {
                id: `BGT-${targetYear}-${plant}-${opexForm}-ACT${Date.now().toString().slice(-4)}`,
                year: targetYear,
                department: 'ICT',
                plant,
                form: opexForm,
                form_title: isSoftware ? 'Perawatan Software & Lisensi' : 'Spare Part & Komponen IT',
                doc_no: `${docPrefix}-FM-FAT-06`,
                category: opexCategory,
                category_badge: isSoftware ? 'Perbaikan & Perawatan' : 'Sparepart IT & Komputer',
                sub_category: isSoftware ? 'Software Maintenance (AMC)' : 'Material & Jasa Penarikan / Instalasi',
                coa_code: opexCoa,
                coa_name: opexCoaName,
                item_name: `[Activity Plan ${plan.quarter}] ${plan.title} (Opex/Material/Jasa)`,
                type_asset: '2',
                usage_2025: 0,
                unit_price: plan.opex_amount,
                qty: 1,
                total_amount: plan.opex_amount,
                monthly: monthlyOpex,
                notes: `Auto-Sync Opex dari Activity Plan: ${plan.title} (${plan.id}). Target Kuartal: ${plan.quarter}.`,
                is_custom: true,
                from_activity_plan: true,
                activity_id: plan.id
            };

            for (const dbConn of allDbs) {
                try {
                    await dbConn('budget_items').insert({
                        id: opexItem.id,
                        year: opexItem.year,
                        department: opexItem.department,
                        plant: opexItem.plant,
                        form: opexItem.form,
                        form_title: opexItem.form_title,
                        doc_no: opexItem.doc_no,
                        category: opexItem.category,
                        category_badge: opexItem.category_badge,
                        sub_category: opexItem.sub_category,
                        coa_code: opexItem.coa_code,
                        coa_name: opexItem.coa_name,
                        item_name: opexItem.item_name,
                        type_asset: opexItem.type_asset,
                        usage_2025: opexItem.usage_2025,
                        unit_price: opexItem.unit_price,
                        qty: opexItem.qty,
                        total_amount: opexItem.total_amount,
                        monthly: JSON.stringify(opexItem.monthly),
                        notes: opexItem.notes,
                        is_custom: true,
                        created_at: new Date(),
                        updated_at: new Date()
                    }).onConflict('id').merge();
                } catch (dbErr) {
                    console.error('[Budgeting] Error inserting opex sync item:', dbErr.message);
                }
            }

            if (!store[`items_${targetYear}`]) store[`items_${targetYear}`] = [];
            store[`items_${targetYear}`].unshift(opexItem);
            createdBudgetItems.push(opexItem);
            createdIds.push(opexItem.id);
        }

        // If zero budget, just mark as synced
        if (createdIds.length === 0) {
            createdIds.push('IN-HOUSE-ZERO-BUDGET');
        }

        // Update Activity Plan status
        for (const dbConn of allDbs) {
            try {
                await dbConn('budget_activity_plans').where({ id }).update({
                    is_budget_synced: true,
                    budget_item_ids: JSON.stringify(createdIds),
                    updated_at: new Date()
                });
            } catch (dbErr) {
                console.error('[Budgeting] Error updating activity sync status:', dbErr.message);
            }
        }

        if (store.activity_plans) {
            const idx = store.activity_plans.findIndex(a => a.id === id);
            if (idx !== -1) {
                store.activity_plans[idx].is_budget_synced = true;
                store.activity_plans[idx].budget_item_ids = createdIds;
                store.activity_plans[idx].updated_at = new Date().toISOString();
            }
        }
        saveStore(store);

        res.status(201).json({
            success: true,
            message: `Aktivitas "${plan.title}" berhasil disinkronkan ke Formulir Rencana Anggaran ${targetYear} (${createdBudgetItems.length} item anggaran dibuat)!`,
            budget_items: createdBudgetItems,
            budget_item_ids: createdIds
        });
    } catch (err) {
        console.error('[Budgeting] POST /activity-plans/:id/sync-to-budget error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/activity-plans/seed-templates - Re-seed standard TCF templates
router.post('/activity-plans/seed-templates', async (req, res) => {
    try {
        const { year = 2027 } = req.body;
        const targetYear = parseInt(year) || 2027;
        const defaultList = getDefaultActivityPlans(targetYear);
        const db = getDb(req);

        if (db) {
            for (const act of defaultList) {
                await db('budget_activity_plans').insert({
                    id: act.id,
                    year: act.year,
                    plant: act.plant,
                    control_item: act.control_item || 'General',
                    item_no: act.item_no || '',
                    category: act.category,
                    title: act.title,
                    description: act.description,
                    quarter: act.quarter,
                    target_month: act.target_month,
                    plan_start_month: act.plan_start_month || 'jan',
                    plan_end_month: act.plan_end_month || 'mar',
                    actual_start_month: act.actual_start_month || null,
                    actual_end_month: act.actual_end_month || null,
                    plan_months: JSON.stringify(act.plan_months || []),
                    actual_months: JSON.stringify(act.actual_months || []),
                    budget_type: act.budget_type,
                    capex_amount: act.capex_amount,
                    opex_amount: act.opex_amount,
                    total_amount: act.total_amount,
                    pic: act.pic,
                    priority: act.priority,
                    status: act.status,
                    progress_pct: act.progress_pct,
                    kpi_deliverable: act.kpi_deliverable,
                    milestones: JSON.stringify(act.milestones),
                    is_budget_synced: false,
                    budget_item_ids: JSON.stringify([]),
                    created_at: new Date(),
                    updated_at: new Date()
                }).onConflict('id').merge();
            }
        }

        const store = readStore();
        if (!store.activity_plans) store.activity_plans = [];
        defaultList.forEach(item => {
            const idx = store.activity_plans.findIndex(a => a.id === item.id);
            if (idx !== -1) {
                store.activity_plans[idx] = item;
            } else {
                store.activity_plans.push(item);
            }
        });
        saveStore(store);

        res.json({
            success: true,
            message: `Template standar Activity Plan tahun ${targetYear} berhasil dimuat (${defaultList.length} aktivitas)!`,
            count: defaultList.length
        });
    } catch (err) {
        console.error('[Budgeting] POST /activity-plans/seed-templates error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/budgeting/activity-plans/clone-year - Clone activities from sourceYear to targetYear
router.post('/activity-plans/clone-year', async (req, res) => {
    try {
        const { targetYear, sourceYear = 2027 } = req.body;
        if (!targetYear) {
            return res.status(400).json({ error: 'targetYear is required' });
        }

        const tYr = parseInt(targetYear);
        const sYr = parseInt(sourceYear);
        const db = getDb(req);
        const store = readStore();

        let sourceList = [];
        if (db) {
            try {
                sourceList = await db('budget_activity_plans').where({ year: sYr });
            } catch (e) {
                console.warn('[Budgeting] DB error getting source plans:', e.message);
            }
        }
        if (sourceList.length === 0 && store.activity_plans) {
            sourceList = store.activity_plans.filter(a => a.year === sYr);
        }

        if (sourceList.length === 0) {
            sourceList = getDefaultActivityPlans(sYr);
        }

        const clonedList = sourceList.map((act, idx) => {
            const rawMilestones = typeof act.milestones === 'string' ? JSON.parse(act.milestones) : (act.milestones || []);
            // reset done status for new year
            const newMilestones = rawMilestones.map(m => ({ ...m, done: false }));
            return {
                id: `ACT-${tYr}-${act.plant || 'SG'}-${act.category?.slice(0, 3) || 'NET'}-${idx + 1 < 1000 ? String(idx + 1).padStart(3, '0') : idx + 1}`,
                year: tYr,
                plant: act.plant,
                category: act.category,
                title: act.title,
                description: act.description,
                quarter: act.quarter,
                target_month: act.target_month,
                budget_type: act.budget_type,
                capex_amount: act.capex_amount,
                opex_amount: act.opex_amount,
                total_amount: act.total_amount,
                pic: act.pic,
                priority: act.priority,
                status: 'PLANNED',
                progress_pct: 0,
                kpi_deliverable: act.kpi_deliverable,
                milestones: newMilestones,
                is_budget_synced: false,
                budget_item_ids: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        });

        if (db) {
            for (const c of clonedList) {
                await db('budget_activity_plans').insert({
                    id: c.id,
                    year: c.year,
                    plant: c.plant,
                    category: c.category,
                    title: c.title,
                    description: c.description,
                    quarter: c.quarter,
                    target_month: c.target_month,
                    budget_type: c.budget_type,
                    capex_amount: c.capex_amount,
                    opex_amount: c.opex_amount,
                    total_amount: c.total_amount,
                    pic: c.pic,
                    priority: c.priority,
                    status: c.status,
                    progress_pct: c.progress_pct,
                    kpi_deliverable: c.kpi_deliverable,
                    milestones: JSON.stringify(c.milestones),
                    is_budget_synced: false,
                    budget_item_ids: JSON.stringify([]),
                    created_at: new Date(),
                    updated_at: new Date()
                }).onConflict('id').ignore();
            }
        }

        if (!store.activity_plans) store.activity_plans = [];
        store.activity_plans.push(...clonedList);
        saveStore(store);

        res.status(201).json({
            success: true,
            message: `Berhasil menggandakan ${clonedList.length} aktivitas dari Tahun ${sYr} ke Tahun Anggaran ${tYr}!`,
            cloned: clonedList
        });
    } catch (err) {
        console.error('[Budgeting] POST /activity-plans/clone-year error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.parseAssetSpecs = parseAssetSpecs;
router.evaluateAssetIK = evaluateAssetIK;
router.readStore = readStore;

module.exports = router;


