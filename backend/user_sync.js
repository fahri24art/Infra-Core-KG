const db = require('./db');

async function syncSingleUser(userId, org) {
    if (!userId) return;
    try {
        await db.runWithOrg(org, async () => {
            const user = await db('users').where({ id: userId }).first();
            if (!user || user.hr_employee_id) return; // Already linked or not found

            const hrEmployees = await db('hr_employees');
            let match = null;

            // 1. Match by employee_id (NIK)
            if (user.employee_id) {
                match = hrEmployees.find(hr => hr.nik && hr.nik.trim() === user.employee_id.trim());
            }

            // 2. Match by phone (whatsapp)
            if (!match && user.whatsapp) {
                const uPhone = user.whatsapp.replace(/[^0-9]/g, '');
                match = hrEmployees.find(hr => {
                    if (!hr.phone) return false;
                    const hrPhone = hr.phone.replace(/[^0-9]/g, '');
                    if (uPhone.length >= 9 && hrPhone.length >= 9) {
                        return uPhone.slice(-9) === hrPhone.slice(-9);
                    }
                    return uPhone === hrPhone;
                });
            }

            // 3. Match by name
            if (!match && user.name) {
                const uName = user.name.toLowerCase().trim();
                match = hrEmployees.find(hr => hr.name && hr.name.toLowerCase().trim() === uName);
            }

            if (match) {
                await db('users').where({ id: user.id }).update({ hr_employee_id: match.id });
                console.log(`[UserSync] Linked user '${user.name}' to HR '${match.name}'`);
            }
        });
    } catch (e) {
        console.error('[UserSync] Error:', e);
    }
}

module.exports = { syncSingleUser };
