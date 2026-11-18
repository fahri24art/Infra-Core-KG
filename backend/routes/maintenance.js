const express = require('express');
const router = express.Router();
const db = require('../db');
const { getMonthWindowWIB } = require('../utils/kpiTime');

const parseJsonSafe = (val) => {
    if (!val) return {};
    if (typeof val === 'object') return { ...val };
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }
    return {};
};

const isMonitorAsset = (asset) => ((asset?.category || '').toLowerCase() === 'monitor');

const isCctvAsset = (asset) => {
    const cat = (asset?.category || '').toLowerCase();
    return cat.includes('cctv') || cat.includes('camera');
};

const isKpiQualifiedAsset = (asset) => !isMonitorAsset(asset) && !isCctvAsset(asset);

const deriveWeekKeyFromDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    const wib = new Date((Number.isNaN(d.getTime()) ? Date.now() : d.getTime()) + 7 * 3600 * 1000);
    const m = wib.getUTCMonth() + 1;
    const w = Math.min(4, Math.max(1, Math.ceil(wib.getUTCDate() / 7)));
    return `${m}_${w}`;
};

// GET /api/maintenance/stats - Dashboard summary (IT KPI only; CCTV separated)
router.get('/stats', async (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    try {
        const assets = await db('assets').select('id', 'category', 'type', 'name');

        const pcAssets = assets.filter(a => {
            const typ = (a.type || a.category || '').toLowerCase();
            return typ === 'desktop' || typ === 'pc' || typ === 'computer';
        });

        const laptopAssets = assets.filter(a => {
            const typ = (a.type || a.category || '').toLowerCase();
            return typ === 'laptop' || typ === 'notebook';
        });

        // KPI excludes Monitor (bundled with PC) and CCTV (non-KPI security surveillance)
        const qualifiedAssets = assets.filter(isKpiQualifiedAsset);
        const qualifiedAssetIds = qualifiedAssets.map(a => a.id);
        const totalQualified = qualifiedAssetIds.length;

        const completedRecords = qualifiedAssetIds.length > 0
            ? await db('maintenance_records')
                .where('year', year)
                .where('status', 'Completed')
                .whereIn('asset_id', qualifiedAssetIds)
                .select('asset_id')
            : [];

        const completedUniqueIds = new Set(completedRecords.map(r => r.asset_id));
        const doneCount = completedUniqueIds.size;

        // Separate CCTV stats (Non-KPI)
        const cctvAssets = assets.filter(isCctvAsset);
        const cctvIds = cctvAssets.map(a => a.id);
        const cctvRecords = cctvIds.length > 0
            ? await db('maintenance_records')
                .where('year', year)
                .where('status', 'Completed')
                .whereIn('asset_id', cctvIds)
                .select('asset_id')
            : [];
        const cctvDoneCount = new Set(cctvRecords.map(r => r.asset_id)).size;

        res.json({
            devices: {
                pc: pcAssets.length,
                laptop: laptopAssets.length,
                total: pcAssets.length + laptopAssets.length
            },
            completion: {
                done: doneCount,
                pending: Math.max(0, totalQualified - doneCount),
                total: totalQualified,
                percentage: totalQualified > 0 ? (doneCount / totalQualified * 100).toFixed(1) : 0
            },
            cctv: {
                total: cctvAssets.length,
                done: cctvDoneCount,
                pending: Math.max(0, cctvAssets.length - cctvDoneCount),
                percentage: cctvAssets.length > 0 ? (cctvDoneCount / cctvAssets.length * 100).toFixed(1) : 0
            }
        });
    } catch (err) {
        console.error('Error fetching maintenance stats:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/maintenance/monthly-kpi - Aggregate target vs actual per month (IT KPI only)
router.get('/monthly-kpi', async (req, res) => {
    const year = Number(req.query.year || new Date().getFullYear());
    const activeDb = req.db || db;
    try {
        // Fetch total KPI-qualified assets (exclude Monitor and CCTV)
        const assets = await activeDb('assets').select('id', 'category', 'type', 'name');
        const qualifiedAssets = assets.filter(isKpiQualifiedAsset);
        const qualifiedAssetIds = new Set(qualifiedAssets.map(a => a.id));

        // 1. Fetch all plans for the year
        const plans = await activeDb('maintenance_plans')
            .where({ year: String(year), maintenance_type: 'Semester' })
            .select('asset_id', 'planning_data', 'semester');

        // 2. Fetch all completed records for the year
        const records = await activeDb('maintenance_records')
            .whereRaw('CAST(year AS TEXT) = ?', [year.toString()])
            .where('status', 'Completed')
            .select('asset_id', 'week_key', 'maintenance_date', 'status');

        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const win = getMonthWindowWIB(year, m);
            return {
                month: m,
                target: 0,
                actual: 0,
                isFuture: win.isFuture,
                isCurrent: win.isCurrent,
            };
        });

        // Process Targets (Only count KPI-qualified assets, excluding Monitor and CCTV)
        plans.forEach(p => {
            if (!qualifiedAssetIds.has(p.asset_id)) return;
            try {
                const pData = parseJsonSafe(p.planning_data);
                const monthsInPlan = new Set();
                Object.keys(pData).forEach(key => {
                    let month = parseInt(key.split('_')[0], 10);
                    if (p.semester === 2 && month >= 1 && month <= 6) {
                        month += 6;
                    }
                    if (month >= 1 && month <= 12) {
                        monthsInPlan.add(month);
                    }
                });
                monthsInPlan.forEach(m => {
                    monthlyData[m - 1].target++;
                });
            } catch (e) { }
        });

        // Process Actuals (Count unique completed assets per month based on maintenance_date in WIB)
        const uniqueMonthAssets = Array.from({ length: 12 }, () => new Set());

        records.forEach(r => {
            if (qualifiedAssetIds.has(r.asset_id)) {
                const mDate = new Date(new Date(r.maintenance_date).getTime() + 7 * 3600 * 1000);
                const absMonth = mDate.getUTCMonth(); // 0-11
                if (absMonth >= 0 && absMonth <= 11) {
                    uniqueMonthAssets[absMonth].add(r.asset_id);
                }
            }
        });

        uniqueMonthAssets.forEach((set, i) => {
            monthlyData[i].actual = set.size;
        });

        // Set baseline 'Total Perangkat' default to qualifiedAssets.length
        monthlyData.forEach(m => {
            m['Total Perangkat'] = qualifiedAssets.length;
        });

        // Apply non-zero manual overrides (never let stale 0 wipe real DB records)
        const overrides = await activeDb('kpi_overrides').where({ type: 'maintenance', year });
        overrides.forEach(ov => {
            const mIdx = ov.month - 1;
            const numVal = Number(ov.value);
            if (mIdx >= 0 && mIdx < 12 && !monthlyData[mIdx].isFuture && !Number.isNaN(numVal)) {
                if (ov.metric === 'actual' && numVal === 0 && monthlyData[mIdx].actual > 0) return;
                if (ov.metric === 'target' && numVal === 0 && monthlyData[mIdx].target > 0) return;
                if (numVal > 0 || ov.metric === 'Total Perangkat') {
                    monthlyData[mIdx][ov.metric] = numVal;
                }
            }
        });

        res.json({
            totalAssetsQualified: qualifiedAssets.length,
            monthly: monthlyData.map(m => {
                const totalAssetsUsed = m['Total Perangkat'] || qualifiedAssets.length;
                return {
                    month: m.month,
                    'Total Perangkat': totalAssetsUsed,
                    target: m.isFuture ? 0 : m.target,
                    actual: m.isFuture ? 0 : m.actual,
                    isFuture: m.isFuture,
                    isCurrent: m.isCurrent,
                    percentage: !m.isFuture && m.target > 0 ? ((m.actual / m.target) * 100).toFixed(2) : "0.00"
                };
            })
        });
    } catch (err) {
        console.error('Error fetching monthly KPI:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/maintenance - List all maintenance plans (for Reports)
router.get('/', async (req, res) => {
    try {
        const plans = await db('maintenance_plans')
            .join('assets', 'maintenance_plans.asset_id', 'assets.id')
            .leftJoin('users', 'assets.user_id', 'users.id')
            .leftJoin('hr_employees as hr1', 'users.hr_employee_id', 'hr1.id')
            .leftJoin('hr_employees as hr2', 'assets.hr_employee_id', 'hr2.id')
            .select(
                'maintenance_plans.id',
                'maintenance_plans.asset_id',
                'maintenance_plans.year',
                'maintenance_plans.semester',
                'maintenance_plans.planning_data',
                'maintenance_plans.actual_data',
                'maintenance_plans.maintenance_type',
                'assets.name as asset_name',
                'assets.inventory_number',
                db.raw('COALESCE(hr2.name, hr1.name, users.name) as user_name'),
                db.raw("COALESCE(NULLIF(TRIM(assets.department), ''), NULLIF(NULLIF(TRIM(hr2.department), ''), 'General'), NULLIF(NULLIF(TRIM(hr1.department), ''), 'General'), NULLIF(NULLIF(TRIM(users.department), ''), 'General'), NULLIF(NULLIF(TRIM(assets.location), ''), 'Unknown')) as user_department"),
                'assets.location'
            )
            .orderBy('maintenance_plans.year', 'desc')
            .orderBy('maintenance_plans.semester', 'asc');
        
        // Transform JSON data to match expected format
        const transformedPlans = plans.map(plan => {
            const planningData = typeof plan.planning_data === 'string' 
                ? JSON.parse(plan.planning_data) 
                : (plan.planning_data || {});
            
            return {
                id: plan.id,
                asset_id: plan.asset_id,
                year: plan.year,
                semester: plan.semester,
                name: planningData.name || `Maintenance ${plan.asset_id}`,
                frequency_months: planningData.frequency_months || 6,
                next_due: planningData.next_due || null,
                asset_name: plan.asset_name,
                inventory_number: plan.inventory_number,
                user_name: plan.user_name,
                user_department: plan.user_department,
                location: plan.location,
                planning_data: typeof plan.planning_data === 'string' ? JSON.parse(plan.planning_data || '{}') : plan.planning_data,
                actual_data: typeof plan.actual_data === 'string' ? JSON.parse(plan.actual_data || '{}') : plan.actual_data,
                maintenance_type: plan.maintenance_type
            };
        });
        
        res.json(transformedPlans);
    } catch (err) {
        console.error('Error fetching maintenance reports:', err);
        res.status(500).json({ error: 'Failed to fetch maintenance reports' });
    }
});

// GET /api/maintenance/schedule?year=2025&semester=1&type=Semester
router.get('/schedule', async (req, res) => {
    const { year, semester, type = 'Semester', scope = 'all' } = req.query;
    try {
        const assets = await db('assets')
            .leftJoin('users', 'assets.user_id', 'users.id')
            .leftJoin('hr_employees as hr1', 'users.hr_employee_id', 'hr1.id')
            .leftJoin('hr_employees as hr2', 'assets.hr_employee_id', 'hr2.id')
            .select(
                'assets.id', 
                'assets.name', 
                'assets.inventory_number', 
                'assets.category', 
                'assets.manufacturer', 
                db.raw('COALESCE(hr2.name, hr1.name, users.name) as user_name'),
                db.raw("COALESCE(NULLIF(TRIM(assets.department), ''), NULLIF(NULLIF(TRIM(hr2.department), ''), 'General'), NULLIF(NULLIF(TRIM(hr1.department), ''), 'General'), NULLIF(NULLIF(TRIM(users.department), ''), 'General'), NULLIF(NULLIF(TRIM(assets.location), ''), 'Unknown')) as user_department"), 
                'assets.contact', 
                'assets.location'
            );

        // Hierarchy: Daily < Weekly < Monthly < Semester
        const tiers = ['Daily', 'Weekly', 'Monthly', 'Semester'];
        const currentTierIdx = tiers.indexOf(type);
        const allowedTiers = currentTierIdx === -1 ? [type] : tiers.slice(currentTierIdx);

        // Fetch existing plans for this period and allowed types (this tier and higher)
        const plansQuery = db('maintenance_plans').where({ year }).whereIn('maintenance_type', allowedTiers);
        if (semester && semester !== 'all') {
            plansQuery.where('semester', semester);
        }
        let plansRaw = await plansQuery.select('*');

        // Automatically ensure any un-planned qualified assets have maintenance plans
        const unPlannedAssets = assets.filter(a => {
            if (isMonitorAsset(a)) return false;
            return !plansRaw.some(p => p.asset_id === a.id);
        });

        if (unPlannedAssets.length > 0) {
            const semesterWeeks = 24;
            const autoPlans = [];
            unPlannedAssets.forEach((asset, index) => {
                const targetWeek = (asset.id || index) % semesterWeeks;
                const monthIdx = Math.floor(targetWeek / 4) + 1; // 1-6
                const weekIdx = (targetWeek % 4) + 1; // 1-4
                const key = `${monthIdx}_${weekIdx}`;
                const s2Key = `${monthIdx + 6}_${weekIdx}`;

                autoPlans.push({
                    asset_id: asset.id,
                    year: parseInt(year, 10) || new Date().getFullYear(),
                    semester: 1,
                    maintenance_type: 'Semester',
                    planning_data: JSON.stringify({ [key]: true }),
                    actual_data: JSON.stringify({}),
                    created_at: new Date(),
                    updated_at: new Date()
                });
                autoPlans.push({
                    asset_id: asset.id,
                    year: parseInt(year, 10) || new Date().getFullYear(),
                    semester: 2,
                    maintenance_type: 'Semester',
                    planning_data: JSON.stringify({ [s2Key]: true }),
                    actual_data: JSON.stringify({}),
                    created_at: new Date(),
                    updated_at: new Date()
                });
            });
            try {
                await db('maintenance_plans').insert(autoPlans);
                const reFetched = await db('maintenance_plans').where({ year }).whereIn('maintenance_type', allowedTiers);
                if (semester && semester !== 'all') {
                    plansRaw = reFetched.filter(p => Number(p.semester) === Number(semester));
                } else {
                    plansRaw = reFetched;
                }
            } catch (autoPlanErr) {
                console.error('[Maintenance] Failed to auto-generate missing plans:', autoPlanErr.message);
            }
        }

        // Fetch ALL records for this year so completed checksheets saved under any tier (Daily/Weekly/Monthly/Semester) remain visible
        const recordsRaw = await db('maintenance_records')
            .where('year', year)
            .select('*');

        const semNum = (semester && semester !== 'all') ? Number(semester) : null;
        const isKeyInSemester = (wk) => {
            if (!wk || !semNum) return true;
            const m = parseInt(String(wk).split('_')[0], 10);
            if (Number.isNaN(m)) return true;
            return semNum === 1 ? (m >= 1 && m <= 6) : (m >= 7 && m <= 12);
        };

        // Map plans and records to assets
        const schedule = assets
            .filter(asset => {
                if (isMonitorAsset(asset)) return false;
                if (scope === 'it' || scope === 'kpi') return !isCctvAsset(asset);
                if (scope === 'cctv') return isCctvAsset(asset);
                return true;
            })
            .map(asset => {
                // Merge multiple plans into one for this asset (Hierarchical)
                const assetPlans = plansRaw.filter(p => p.asset_id === asset.id);
                let mergedPlan = null;
                if (assetPlans.length > 0) {
                    assetPlans.sort((a, b) => tiers.indexOf(a.maintenance_type) - tiers.indexOf(b.maintenance_type));
                    mergedPlan = { ...assetPlans[assetPlans.length - 1] };

                    let combinedPlanning = {};
                    let combinedActual = {};
                    assetPlans.forEach(p => {
                        const pData = parseJsonSafe(p.planning_data);
                        Object.keys(pData).forEach(k => {
                            if (pData[k]) combinedPlanning[k] = true;
                        });
                        const aData = parseJsonSafe(p.actual_data);
                        Object.keys(aData).forEach(k => {
                            // Guard against stale cross-semester keys (e.g. 1_1 inside Semester 2 actual_data)
                            if (aData[k] && isKeyInSemester(k)) {
                                combinedActual[k] = true;
                            }
                        });
                    });
                    mergedPlan.planning_data = combinedPlanning;
                    mergedPlan.actual_data = combinedActual;
                }

                const assetRecords = recordsRaw.filter(r => r.asset_id === asset.id);

                // Sort ascending by tier + date so allowed/higher-tier records take priority in recordsMap
                const recordsMap = {};
                assetRecords
                    .sort((a, b) => {
                        const aAllowed = allowedTiers.includes(a.maintenance_type) ? 1 : 0;
                        const bAllowed = allowedTiers.includes(b.maintenance_type) ? 1 : 0;
                        if (aAllowed !== bAllowed) return aAllowed - bAllowed;
                        return tiers.indexOf(a.maintenance_type) - tiers.indexOf(b.maintenance_type);
                    })
                    .forEach(r => {
                        if (r.week_key) {
                            recordsMap[r.week_key] = r;
                            // Authoritatively sync completed maintenance_records into actual_data for UI visibility
                            if ((r.status === 'Completed' || r.condition_after) && isKeyInSemester(r.week_key)) {
                                if (!mergedPlan) {
                                    mergedPlan = {
                                        id: null,
                                        asset_id: asset.id,
                                        year: Number(year),
                                        semester: semNum || 1,
                                        planning_data: {},
                                        actual_data: {}
                                    };
                                }
                                mergedPlan.actual_data[r.week_key] = true;
                            }
                        }
                    });

                return {
                    asset: {
                        ...asset,
                        is_cctv: isCctvAsset(asset)
                    },
                    plan: mergedPlan,
                    records: recordsMap
                };
            });

        res.json(schedule);
    } catch (err) {
        console.error('Error fetching schedule:', err);
        res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});

// POST /api/maintenance/generate - Generate maintenance plans (6-month cycle)
router.post('/generate', async (req, res) => {
    const { year } = req.body;
    try {
        const assets = await db('assets').select('id', 'category', 'name').orderBy('id');

        // 1. Fetch existing plans to preserve those with actual_data
        const existingPlans = await db('maintenance_plans')
            .where({ year, maintenance_type: 'Semester' })
            .select('*');

        const plansToKeep = existingPlans.filter(p => {
            if (!p.actual_data) return false;
            if (typeof p.actual_data === 'object') {
                return Object.keys(p.actual_data).length > 0;
            }
            if (typeof p.actual_data === 'string') {
                return p.actual_data !== '{}' && p.actual_data.trim() !== '';
            }
            return false;
        });
        const planIdsToKeep = plansToKeep.map(p => p.id);

        // Clear existing Semester plans for the entire year ONLY if they don't have actual_data
        if (planIdsToKeep.length > 0) {
            await db('maintenance_plans')
                .where({ year, maintenance_type: 'Semester' })
                .whereNotIn('id', planIdsToKeep)
                .del();
        } else {
            await db('maintenance_plans')
                .where({ year, maintenance_type: 'Semester' })
                .del();
        }

        // Map preserved plans by asset_id and semester to skip generation
        const existingPlanMap = {};
        plansToKeep.forEach(p => {
            if (!existingPlanMap[p.asset_id]) existingPlanMap[p.asset_id] = {};
            existingPlanMap[p.asset_id][p.semester] = true;
        });

        const semesterWeeks = 24; // 6 months = 24 weeks
        const maxPerWeek = 5;
        const newPlans = [];

        // 1. Filter Assets (Qualified for preventive maintenance)
        const qualifiedAssets = assets.filter(asset => {
            const cat = (asset.category || '').toLowerCase();
            return cat !== 'monitor';
        });

        console.log(`[Maintenance] Scheduling ${qualifiedAssets.length} assets over 24-week semesters.`);

        // 2. Distribute qualified assets (Round-Robin across 24 weeks for balanced load)

        qualifiedAssets.forEach((asset, index) => {
            // Distribute assets evenly: Asset 0 -> W0, Asset 1 -> W1, ..., Asset 24 -> W0
            const targetWeek = index % semesterWeeks;

            const monthIdx = Math.floor(targetWeek / 4) + 1; // 1-6
            const weekIdx = (targetWeek % 4) + 1; // 1-4
            const key = `${monthIdx}_${weekIdx}`;

            // Add Semester 1 Plan
            if (!existingPlanMap[asset.id]?.[1]) {
                newPlans.push({
                    asset_id: asset.id,
                    year,
                    semester: 1,
                    maintenance_type: 'Semester',
                    planning_data: JSON.stringify({ [key]: true }),
                    actual_data: JSON.stringify({}),
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }

            // Add Semester 2 Plan (Mirroring)
            if (!existingPlanMap[asset.id]?.[2]) {
                const s2MonthIdx = monthIdx + 6;
                const s2Key = `${s2MonthIdx}_${weekIdx}`;
                newPlans.push({
                    asset_id: asset.id,
                    year,
                    semester: 2,
                    maintenance_type: 'Semester',
                    planning_data: JSON.stringify({ [s2Key]: true }),
                    actual_data: JSON.stringify({}),
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }
        });

        // 3. Batch Insert
        const chunkSize = 50;
        for (let i = 0; i < newPlans.length; i += chunkSize) {
            await db('maintenance_plans').insert(newPlans.slice(i, i + chunkSize));
        }

        res.json({
            success: true,
            message: `Generated ${newPlans.length} plans for ${year}.`,
            details: {
                totalAssets: qualifiedAssets.length,
                semesterCapacity: semesterWeeks * maxPerWeek,
                ratio: (qualifiedAssets.length / semesterWeeks).toFixed(1)
            }
        });
    } catch (err) {
        console.error('Error generating plans:', err);
        res.status(500).json({ error: 'Failed to generate plans' });
    }
});

// PUT /api/maintenance/plan/:id - Update planning data (checkboxes)
router.put('/plan/:id', async (req, res) => {
    const { planning_data, actual_data } = req.body;
    try {
        await db('maintenance_plans')
            .where({ id: req.params.id })
            .update({
                planning_data: planning_data ? JSON.stringify(planning_data) : undefined,
                actual_data: actual_data ? JSON.stringify(actual_data) : undefined,
                updated_at: new Date()
            });
        res.json({ message: 'Plan updated' });
    } catch (err) {
        console.error('Error updating plan:', err);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

// Helper to sync completed week_key into maintenance_plans.actual_data reliably
async function syncPlanActualData(trx, { plan_id, asset_id, year, week_key }) {
    if (!week_key || !asset_id || !year) return;
    const weekMonth = parseInt(String(week_key).split('_')[0], 10);
    const targetSemester = (!Number.isNaN(weekMonth) && weekMonth >= 7) ? 2 : 1;

    let plan = null;
    if (plan_id && !Number.isNaN(Number(plan_id))) {
        plan = await trx('maintenance_plans').where({ id: Number(plan_id), asset_id: Number(asset_id) }).first();
    }
    if (!plan) {
        plan = await trx('maintenance_plans')
            .where({ asset_id: Number(asset_id), year: Number(year), semester: targetSemester, maintenance_type: 'Semester' })
            .first();
    }

    if (plan) {
        const actualData = parseJsonSafe(plan.actual_data);
        actualData[week_key] = true;
        await trx('maintenance_plans').where({ id: plan.id }).update({
            actual_data: JSON.stringify(actualData),
            updated_at: new Date()
        });
    } else {
        await trx('maintenance_plans').insert({
            asset_id: Number(asset_id),
            year: Number(year),
            semester: targetSemester,
            maintenance_type: 'Semester',
            planning_data: JSON.stringify({ [week_key]: true }),
            actual_data: JSON.stringify({ [week_key]: true }),
            created_at: new Date(),
            updated_at: new Date()
        });
    }
}

// POST /api/maintenance/record/upsert - Update or Create record (for quick status/condition changes)
router.post('/record/upsert', async (req, res) => {
    const trx = await db.transaction();
    try {
        const { asset_id, week_key, year, condition_before, condition_after, status, maintenance_date, pic_name, department, maintenance_type = 'Semester', checked_by, checked_at, approved_by, approved_at, plan_id } = req.body;
        const parsedAssetId = parseInt(asset_id, 10);
        if (Number.isNaN(parsedAssetId)) {
            await trx.rollback();
            return res.status(400).json({ error: 'Invalid asset_id' });
        }
        const resolvedYear = year ? Number(year) : new Date(maintenance_date || Date.now()).getFullYear();
        const resolvedWeekKey = week_key || deriveWeekKeyFromDate(maintenance_date);

        // Check if record exists
        let record = await trx('maintenance_records')
            .where({ asset_id: parsedAssetId, week_key: resolvedWeekKey, year: resolvedYear, maintenance_type })
            .first();

        let id;
        if (record) {
            await trx('maintenance_records')
                .where({ id: record.id })
                .update({
                    condition_before: condition_before !== undefined ? condition_before : record.condition_before,
                    condition_after: condition_after !== undefined ? condition_after : record.condition_after,
                    status: status !== undefined ? status : record.status,
                    checked_by: checked_by !== undefined ? checked_by : record.checked_by,
                    checked_at: checked_at !== undefined ? checked_at : record.checked_at,
                    approved_by: approved_by !== undefined ? approved_by : record.approved_by,
                    approved_at: approved_at !== undefined ? approved_at : record.approved_at,
                    updated_at: new Date()
                });
            id = record.id;
        } else {
            const insertResult = await trx('maintenance_records').insert({
                asset_id: parsedAssetId,
                week_key: resolvedWeekKey,
                year: resolvedYear,
                maintenance_date: maintenance_date || new Date(),
                maintenance_type: maintenance_type,
                pic_name: pic_name || 'System',
                department: department || 'IT',
                condition_before: condition_before || '',
                condition_after: condition_after || '',
                status: status || 'Pending',
                checked_by: checked_by || null,
                checked_at: checked_at || null,
                approved_by: approved_by || null,
                approved_at: approved_at || null,
                checksheet_data: JSON.stringify({}),
                created_at: new Date(),
                updated_at: new Date()
            }).returning('id');
            id = insertResult[0]?.id || insertResult[0];
        }

        if (status === 'Completed' || (condition_after && condition_after !== '-')) {
            await syncPlanActualData(trx, { plan_id, asset_id: parsedAssetId, year: resolvedYear, week_key: resolvedWeekKey });
        }

        await trx.commit();
        res.json({ id, message: 'Record updated' });
    } catch (err) {
        await trx.rollback();
        console.error('Error upserting record:', err);
        res.status(500).json({ error: 'Failed to update record' });
    }
});

// POST /api/maintenance/record - Create record & Update Plan
router.post('/record', async (req, res) => {
    const trx = await db.transaction();
    try {
        const { asset_id, maintenance_date, pic_name, department, condition_before, condition_after, status = 'Completed', checksheet_data, plan_id, week_key, maintenance_type = 'Semester', checked_by, checked_at, approved_by, approved_at, year: reqYear } = req.body;

        const parsedAssetId = parseInt(asset_id, 10);
        if (Number.isNaN(parsedAssetId)) {
            await trx.rollback();
            return res.status(400).json({ error: 'Invalid asset_id' });
        }

        const year = reqYear ? Number(reqYear) : new Date(maintenance_date || Date.now()).getFullYear();
        const resolvedWeekKey = week_key || deriveWeekKeyFromDate(maintenance_date);

        // Check if record exists
        let record = await trx('maintenance_records')
            .where({ asset_id: parsedAssetId, week_key: resolvedWeekKey, year, maintenance_type })
            .first();

        let id;
        if (record) {
            await trx('maintenance_records')
                .where({ id: record.id })
                .update({
                    maintenance_date: maintenance_date || record.maintenance_date,
                    pic_name: pic_name || record.pic_name,
                    department: department || record.department,
                    condition_before: condition_before !== undefined ? condition_before : record.condition_before,
                    condition_after: condition_after !== undefined ? condition_after : record.condition_after,
                    status: status || 'Completed',
                    checksheet_data: JSON.stringify(checksheet_data || {}),
                    checked_by: checked_by !== undefined ? checked_by : record.checked_by,
                    checked_at: checked_at !== undefined ? checked_at : record.checked_at,
                    approved_by: approved_by !== undefined ? approved_by : record.approved_by,
                    approved_at: approved_at !== undefined ? approved_at : record.approved_at,
                    updated_at: new Date()
                });
            id = record.id;
        } else {
            const insertResult = await trx('maintenance_records').insert({
                asset_id: parsedAssetId,
                maintenance_date: maintenance_date || new Date(),
                maintenance_type,
                pic_name: pic_name || 'System',
                department: department || 'IT',
                condition_before: condition_before || '',
                condition_after: condition_after || '',
                status: status || 'Completed',
                checked_by: checked_by || null,
                checked_at: checked_at || null,
                approved_by: approved_by || null,
                approved_at: approved_at || null,
                checksheet_data: JSON.stringify(checksheet_data || {}),
                week_key: resolvedWeekKey,
                year,
                created_at: new Date(),
                updated_at: new Date()
            }).returning('id');
            id = insertResult[0]?.id || insertResult[0];
        }

        // Always update Plan actual_data when checksheet is submitted (even if plan_id wasn't passed or was from Monthly/Weekly/Daily)
        await syncPlanActualData(trx, { plan_id, asset_id: parsedAssetId, year, week_key: resolvedWeekKey });

        await trx.commit();
        res.status(201).json({ id, week_key: resolvedWeekKey, year, message: 'Maintenance record saved & Plan updated' });
    } catch (err) {
        await trx.rollback();
        console.error('Error saving record:', err);
        res.status(500).json({ error: 'Failed to save record', details: err.message, stack: err.stack });
    }
});

// GET /api/maintenance/record - Fetch specific record
router.get('/record', async (req, res) => {
    const { asset_id, week_key, year, maintenance_type = 'Semester' } = req.query;
    const parsedAssetId = parseInt(asset_id, 10);
    if (Number.isNaN(parsedAssetId) || !week_key) {
        return res.json(null);
    }
    try {
        const tiers = ['Daily', 'Weekly', 'Monthly', 'Semester'];
        const currentTierIdx = tiers.indexOf(maintenance_type);
        const allowedTiers = currentTierIdx === -1 ? [maintenance_type] : tiers.slice(currentTierIdx);

        const rows = await db('maintenance_records')
            .where({ asset_id: parsedAssetId, week_key, year });

        let record = rows
            .filter(r => allowedTiers.includes(r.maintenance_type))
            .sort((a, b) => tiers.indexOf(b.maintenance_type) - tiers.indexOf(a.maintenance_type))[0];

        // Fallback across tiers so checksheets saved under Daily/Weekly/Monthly are still retrievable
        if (!record && rows.length > 0) {
            record = rows.sort((a, b) => tiers.indexOf(b.maintenance_type) - tiers.indexOf(a.maintenance_type))[0];
        }

        res.json(record || null);
    } catch (err) {
        console.error('Error fetching record:', err);
        res.status(500).json({ error: 'Failed to fetch record' });
    }
});

// GET /api/maintenance/asset/:assetId - Fetch all records for specific asset
router.get('/asset/:assetId', async (req, res) => {
    try {
        const { assetId } = req.params;
        const records = await db('maintenance_records')
            .where('asset_id', assetId)
            .orderBy('maintenance_date', 'desc')
            .orderBy('created_at', 'desc');
        res.json(records);
    } catch (err) {
        console.error('Error fetching asset maintenance records:', err);
        res.status(500).json({ error: 'Failed to fetch asset maintenance records' });
    }
});

module.exports = router;

