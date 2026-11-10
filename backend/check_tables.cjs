require('dotenv').config({path: '.env'});
const db = require('./backend/db');
db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then(res => console.log(res.rows.map(r=>r.table_name))).catch(console.error).finally(() => process.exit());
