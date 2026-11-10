require('dotenv').config();
const db = require('./db.js'); // Assuming db.js exports knex

async function testJoin() {
    try {
        const jobs = await db('ricoh_print_jobs')
            .leftJoin('assets', function() {
                this.on(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw('LOWER(TRIM(assets.name))'))
                    .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw('LOWER(TRIM(assets.contact))'))
                    .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw("LOWER(TRIM(SPLIT_PART(assets.contact, '@', 1)))"))
                    .orOn(db.raw("LOWER(TRIM(SPLIT_PART(ricoh_print_jobs.user_name, '@', 1)))"), '=', db.raw("LOWER(TRIM(assets.contact))"))
                    .orOn(db.raw("LOWER(TRIM(SPLIT_PART(ricoh_print_jobs.user_name, '@', 2)))"), '=', db.raw("LOWER(TRIM(assets.name))"))
                    .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw("LOWER(TRIM(assets.windows_login))"))
                    .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw("LOWER(TRIM(SPLIT_PART(assets.windows_login, ?, 2)))", ['\\']))
            })
            .select(
                'ricoh_print_jobs.*', 
                'assets.id as asset_id',
                'assets.user_id as employee_id',
                'assets.contact as inventory_contact',
                'assets.name as asset_computer_name'
            )
            .where('ricoh_print_jobs.user_name', 'ilike', '%Deli0098%')
            .limit(5);
            
        console.log(jobs.map(j => ({ user_name: j.user_name, asset: j.asset_computer_name })));

        const jobs2 = await db('ricoh_print_jobs')
            .leftJoin('assets', function() {
                this.on(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw("LOWER(TRIM(SPLIT_PART(assets.windows_login, '\\\\', 2)))"))
            })
            .select('ricoh_print_jobs.user_name', 'assets.name as asset_name', 'assets.windows_login')
            .limit(10);
            
        console.log("\\nResults with \\\\ literal:");
        console.log(jobs2);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

testJoin();
