const db = require('./db');
async function run() {
  const jobs = await db('ricoh_print_jobs').where('user_name', 'ilike', '%DELL%').limit(5);
  console.log('jobs:', jobs);
  
  const joined = await db('ricoh_print_jobs')
      .leftJoin('assets', function() {
        this.on(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw('LOWER(TRIM(assets.name))'))
            .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw('LOWER(TRIM(assets.contact))'))
            .orOn(db.raw('LOWER(TRIM(ricoh_print_jobs.user_name))'), '=', db.raw("LOWER(TRIM(SPLIT_PART(assets.contact, '@', 1)))"))
            .orOn(db.raw("LOWER(TRIM(SPLIT_PART(ricoh_print_jobs.user_name, '@', 1)))"), '=', db.raw("LOWER(TRIM(assets.contact))"))
            .orOn(db.raw("LOWER(TRIM(SPLIT_PART(ricoh_print_jobs.user_name, '@', 2)))"), '=', db.raw("LOWER(TRIM(assets.name))"));
      })
      .leftJoin('users', 'assets.user_id', 'users.id')
      .select('ricoh_print_jobs.user_name', 'assets.name as asset_name', 'assets.contact', 'users.name as employee_name')
      .where('ricoh_print_jobs.user_name', 'ilike', '%DELL%')
      .limit(5);
  console.log('joined jobs:', joined);
  process.exit();
}
run();
