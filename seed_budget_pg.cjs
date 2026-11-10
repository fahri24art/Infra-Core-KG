const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function seed() {
    const storePath = path.join(__dirname, 'backend', 'data', 'budget_store.json');
    if (!fs.existsSync(storePath)) {
        console.error('budget_store.json not found!');
        process.exit(1);
    }
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

    const client = new Client({
        host: '192.168.1.66',
        port: 5432,
        user: 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: 'network_monitor_db'
    });

    try {
        await client.connect();
        console.log('[PG] Connected directly to PostgreSQL network_monitor_db');

        // Check if budget_items has data
        const resItems = await client.query('SELECT COUNT(*) FROM budget_items');
        console.log('[PG] Current budget_items count:', resItems.rows[0].count);

        if (parseInt(resItems.rows[0].count, 10) === 0) {
            console.log('[PG] Seeding budget_items from store...');
            const allItems = [];
            Object.keys(store).forEach(k => {
                if (k.startsWith('items_')) {
                    const list = store[k] || [];
                    list.forEach(it => {
                        allItems.push(it);
                    });
                }
            });

            console.log(`[PG] Inserting ${allItems.length} budget items...`);
            for (const it of allItems) {
                const q = `
                    INSERT INTO budget_items (
                        id, year, department, plant, form, form_title, doc_no,
                        category, category_badge, sub_category, coa_code, coa_name,
                        item_name, type_asset, usage_2025, unit_price, qty,
                        total_amount, monthly, notes, is_custom, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7,
                        $8, $9, $10, $11, $12,
                        $13, $14, $15, $16, $17,
                        $18, $19, $20, $21, NOW(), NOW()
                    ) ON CONFLICT (id) DO UPDATE SET
                        total_amount = EXCLUDED.total_amount,
                        monthly = EXCLUDED.monthly,
                        updated_at = NOW();
                `;
                await client.query(q, [
                    it.id,
                    it.year || 2026,
                    it.department || 'ICT',
                    it.plant || 'SG',
                    it.form || 'I-1',
                    it.form_title || '',
                    it.doc_no || '',
                    it.category || 'CAPEX',
                    it.category_badge || 'Capex',
                    it.sub_category || '',
                    it.coa_code || '',
                    it.coa_name || '',
                    it.item_name || 'Item',
                    it.type_asset || '',
                    Number(it.usage_2025) || 0,
                    Number(it.unit_price) || 0,
                    Number(it.qty) || 1,
                    Number(it.total_amount) || 0,
                    JSON.stringify(it.monthly || {}),
                    it.notes || '',
                    !!it.is_custom
                ]);
            }
            console.log('[PG] ✅ All budget items seeded!');
        }

        // Seed Department Requests
        const resReq = await client.query('SELECT COUNT(*) FROM budget_department_requests');
        console.log('[PG] Current budget_department_requests count:', resReq.rows[0].count);

        if (parseInt(resReq.rows[0].count, 10) === 0 && store.department_requests && store.department_requests.length > 0) {
            console.log(`[PG] Seeding ${store.department_requests.length} department requests...`);
            for (const r of store.department_requests) {
                const q = `
                    INSERT INTO budget_department_requests (
                        id, req_no, date, plant, department, requester_name, requester_title,
                        category, item_name, qty, unit, estimated_unit_price, estimated_total_cost,
                        target_year, target_month, target_form, technical_specs, justification,
                        status, reviewed_by, review_notes, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7,
                        $8, $9, $10, $11, $12, $13,
                        $14, $15, $16, $17, $18,
                        $19, $20, $21, NOW(), NOW()
                    ) ON CONFLICT (id) DO NOTHING;
                `;
                await client.query(q, [
                    r.id,
                    r.req_no,
                    r.date || new Date().toISOString().slice(0, 10),
                    r.plant || 'SG',
                    r.department || 'ICT',
                    r.requester_name || '-',
                    r.requester_title || 'Staff',
                    r.category || 'NEW_DEVICE',
                    r.item_name || 'Item',
                    Number(r.qty) || 1,
                    r.unit || 'Unit',
                    Number(r.estimated_unit_price) || 0,
                    Number(r.estimated_total_cost) || 0,
                    parseInt(r.target_year) || 2027,
                    r.target_month || 'jan',
                    r.target_form || 'I-1',
                    r.technical_specs || '',
                    r.justification || '',
                    r.status || 'SUBMITTED',
                    r.reviewed_by || null,
                    r.review_notes || ''
                ]);
            }
            console.log('[PG] ✅ Department requests seeded!');
        }

        // Seed Software Licenses
        const resSoft = await client.query('SELECT COUNT(*) FROM budget_software_licenses');
        console.log('[PG] Current budget_software_licenses count:', resSoft.rows[0].count);
        if (parseInt(resSoft.rows[0].count, 10) === 0 && store.software_licenses && store.software_licenses.length > 0) {
            console.log(`[PG] Seeding ${store.software_licenses.length} software licenses...`);
            for (const s of store.software_licenses) {
                const q = `
                    INSERT INTO budget_software_licenses (
                        id, name, category, plant, department, vendor, license_type,
                        total_seats, used_seats, annual_cost, renewal_date, expiration_date,
                        amc_included, status, budget_form, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7,
                        $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
                    ) ON CONFLICT (id) DO NOTHING;
                `;
                await client.query(q, [
                    s.id,
                    s.name,
                    s.category || 'Productivity',
                    s.plant || 'SG',
                    s.department || 'ICT',
                    s.vendor || '',
                    s.license_type || 'Subscription',
                    s.total_seats || 1,
                    s.used_seats || 1,
                    Number(s.annual_cost) || 0,
                    s.renewal_date || null,
                    s.expiration_date || null,
                    s.amc_included !== false,
                    s.status || 'ACTIVE',
                    s.budget_form || 'F1'
                ]);
            }
            console.log('[PG] ✅ Software licenses seeded!');
        }

        await client.end();
        console.log('[PG] Migration completed successfully.');
    } catch (e) {
        console.error('[PG Error]:', e);
        if (client) await client.end();
        process.exit(1);
    }
}

seed();
