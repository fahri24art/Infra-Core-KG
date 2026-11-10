require('dotenv').config();
const db = require('./db');

async function syncUsers() {
    const orgs = ['TCF-SG', 'TCF-KG'];
    for (const org of orgs) {
        console.log(`--- Syncing ${org} ---`);
        await db.runWithOrg(org, async () => {
            const users = await db('users').whereNull('hr_employee_id');
            const hrEmployees = await db('hr_employees');
            
            let updatedCount = 0;
            for (const user of users) {
                let match = null;

                // 1. Match by employee_id (NIK)
                if (user.employee_id) {
                    match = hrEmployees.find(hr => hr.nik && hr.nik.trim() === user.employee_id.trim());
                }

                // 2. Match by phone (whatsapp)
                if (!match && user.whatsapp) {
                    // Clean both numbers just in case
                    const uPhone = user.whatsapp.replace(/[^0-9]/g, '');
                    match = hrEmployees.find(hr => {
                        if (!hr.phone) return false;
                        const hrPhone = hr.phone.replace(/[^0-9]/g, '');
                        // Check if they end with the same 9+ digits to handle 628 vs 08
                        if (uPhone.length >= 9 && hrPhone.length >= 9) {
                            return uPhone.slice(-9) === hrPhone.slice(-9);
                        }
                        return uPhone === hrPhone;
                    });
                }

                // 3. Match by name exactly
                if (!match && user.name) {
                    const uName = user.name.toLowerCase().trim();
                    match = hrEmployees.find(hr => hr.name && hr.name.toLowerCase().trim() === uName);
                }

                if (match) {
                    await db('users').where({ id: user.id }).update({ hr_employee_id: match.id });
                    updatedCount++;
                    console.log(`  [+] Linked user '${user.name}' (User ID: ${user.id}) to HR Employee '${match.name}' (HR ID: ${match.id})`);
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
