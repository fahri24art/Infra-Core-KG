require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function seed() {
    try {
        const storePath = path.join(__dirname, 'data', 'budget_store.json');
        if (!fs.existsSync(storePath)) {
            console.error('budget_store.json not found at:', storePath);
            process.exit(1);
        }
        const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

        console.log('[Seed] Connected via db.js proxy');

        // Check budget_items
        const [{ count: itemsCount }] = await db('budget_items').count('id as count');
        console.log('[Seed] Current budget_items in DB:', itemsCount);

        if (parseInt(itemsCount, 10) === 0) {
            const allItems = [];
            Object.keys(store).forEach(k => {
                if (k.startsWith('items_')) {
                    const list = store[k] || [];
                    list.forEach(it => allItems.push(it));
                }
            });

            console.log(`[Seed] Inserting ${allItems.length} budget items...`);
            // Insert in batches of 50
            for (let i = 0; i < allItems.length; i += 50) {
                const batch = allItems.slice(i, i + 50).map(it => ({
                    id: it.id,
                    year: it.year || 2026,
                    department: it.department || 'ICT',
                    plant: it.plant || 'SG',
                    form: it.form || 'I-1',
                    form_title: it.form_title || '',
                    doc_no: it.doc_no || '',
                    category: it.category || 'CAPEX',
                    category_badge: it.category_badge || 'Capex',
                    sub_category: it.sub_category || '',
                    coa_code: it.coa_code || '',
                    coa_name: it.coa_name || '',
                    item_name: it.item_name || 'Item',
                    type_asset: it.type_asset || '',
                    usage_2025: Number(it.usage_2025) || 0,
                    unit_price: Number(it.unit_price) || 0,
                    qty: Number(it.qty) || 1,
                    total_amount: Number(it.total_amount) || 0,
                    monthly: JSON.stringify(it.monthly || {}),
                    notes: it.notes || '',
                    is_custom: !!it.is_custom,
                    created_at: new Date(),
                    updated_at: new Date()
                }));
                await db('budget_items').insert(batch).onConflict('id').ignore();
            }
            console.log('[Seed] ✅ budget_items seeded successfully!');
        }

        // Check department requests
        const [{ count: reqCount }] = await db('budget_department_requests').count('id as count');
        console.log('[Seed] Current budget_department_requests in DB:', reqCount);

        if (parseInt(reqCount, 10) === 0 && store.department_requests && store.department_requests.length > 0) {
            console.log(`[Seed] Inserting ${store.department_requests.length} department requests...`);
            const batch = store.department_requests.map(r => ({
                id: r.id,
                req_no: r.req_no,
                date: r.date || new Date().toISOString().slice(0, 10),
                plant: r.plant || 'SG',
                department: r.department || 'ICT',
                requester_name: r.requester_name || '-',
                requester_title: r.requester_title || 'Staff',
                category: r.category || 'NEW_DEVICE',
                item_name: r.item_name || 'Item',
                qty: Number(r.qty) || 1,
                unit: r.unit || 'Unit',
                estimated_unit_price: Number(r.estimated_unit_price) || 0,
                estimated_total_cost: Number(r.estimated_total_cost) || 0,
                target_year: parseInt(r.target_year) || 2027,
                target_month: r.target_month || 'jan',
                target_form: r.target_form || 'I-1',
                technical_specs: r.technical_specs || '',
                justification: r.justification || '',
                status: r.status || 'SUBMITTED',
                reviewed_by: r.reviewed_by || null,
                review_notes: r.review_notes || '',
                created_at: new Date(),
                updated_at: new Date()
            }));
            await db('budget_department_requests').insert(batch).onConflict('id').ignore();
            console.log('[Seed] ✅ budget_department_requests seeded successfully!');
        }

        // Check software licenses
        const [{ count: softCount }] = await db('budget_software_licenses').count('id as count');
        console.log('[Seed] Current budget_software_licenses in DB:', softCount);

        if (parseInt(softCount, 10) === 0 && store.software_licenses && store.software_licenses.length > 0) {
            console.log(`[Seed] Inserting ${store.software_licenses.length} software licenses...`);
            const batch = store.software_licenses.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category || 'Productivity',
                plant: s.plant || 'SG',
                department: s.department || 'ICT',
                vendor: s.vendor || '',
                license_type: s.license_type || 'Subscription',
                total_seats: s.total_seats || 1,
                used_seats: s.used_seats || 1,
                annual_cost: Number(s.annual_cost) || 0,
                renewal_date: s.renewal_date || null,
                expiration_date: s.expiration_date || null,
                amc_included: s.amc_included !== false,
                status: s.status || 'ACTIVE',
                budget_form: s.budget_form || 'F1',
                created_at: new Date(),
                updated_at: new Date()
            }));
            await db('budget_software_licenses').insert(batch).onConflict('id').ignore();
            console.log('[Seed] ✅ budget_software_licenses seeded successfully!');
        }

        console.log('[Seed] All done!');
        process.exit(0);
    } catch (e) {
        console.error('[Seed Error]:', e);
        process.exit(1);
    }
}

seed();
