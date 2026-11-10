require('dotenv').config();
const db = require('./db');

async function syncUsers() {
    const orgs = ['TCF-SG', 'TCF-KG'];
    for (const org of orgs) {
        console.log(`--- Syncing ${org} ---`);
        await db.runWithOrg(org, async () => {
            const users = await db('users').whereNull('hr_employee_id');
            const hrEmployees = await db('hr_employees');
            
            const hrDict = {};
            for (const hr of hrEmployees) {
                if (hr.name) {
                    hrDict[hr.name.toLowerCase().trim()] = hr.id;
                }
            }

            let updatedCount = 0;
            for (const user of users) {
                if (!user.name) continue;
                const matchId = hrDict[user.name.toLowerCase().trim()];
                if (matchId) {
                    await db('users').where({ id: user.id }).update({ hr_employee_id: matchId });
                    updatedCount++;
                    console.log(`  [+] Linked user '${user.name}' (ID: ${user.id}) to HR Employee (ID: ${matchId})`);
                }
            }
            console.log(`--- Finished ${org}: ${updatedCount} users linked ---\n`);
        });
    }
    process.exit(0);
}

syncUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
