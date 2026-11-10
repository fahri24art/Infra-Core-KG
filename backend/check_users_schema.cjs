const { Client } = require('pg');

async function check() {
    const client = new Client({
        connectionString: 'postgres://postgres:12345@192.168.1.66:5432/tcf_db_sg' // usually the conn string
    });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
check();
