require('dotenv').config();
const db = require('./db');

async function main() {
    try {
        await db.runWithOrg('TCF-SG', async () => {
            const hasDiv = await db.schema.hasColumn('users', 'division');
            if (!hasDiv) {
                await db.schema.alterTable('users', table => {
                    table.string('division').nullable();
                });
                console.log('Added division to TCF-SG users');
            } else {
                console.log('Division already exists in TCF-SG');
            }
        });

        await db.runWithOrg('TCF-KG', async () => {
            const hasDiv = await db.schema.hasColumn('users', 'division');
            if (!hasDiv) {
                await db.schema.alterTable('users', table => {
                    table.string('division').nullable();
                });
                console.log('Added division to TCF-KG users');
            } else {
                console.log('Division already exists in TCF-KG');
            }
        });

        console.log('Done!');
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
