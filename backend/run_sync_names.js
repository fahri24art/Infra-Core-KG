require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./db');

async function runSync() {
    try {
        const orgs = ['TCF-SG', 'TCF-KG'];
        for (const org of orgs) {
            console.log(`--- Syncing for ${org} ---`);
            await db.runWithOrg(org, async () => {
                const users = await db('users');
                const hrEmployees = await db('hr_employees');

                let updatedCount = 0;
                let linkedCount = 0;

                for (const user of users) {
                    let matchedHr = null;

                    // If already linked, find that HR employee
                    if (user.hr_employee_id) {
                        matchedHr = hrEmployees.find(hr => hr.id === user.hr_employee_id);
                    } else {
                        // Try to match by phone number
                        if (user.whatsapp) {
                            const cleanUserWa = String(user.whatsapp).replace(/\D/g, '');
                            const last8 = cleanUserWa.length > 8 ? cleanUserWa.slice(-8) : cleanUserWa;
                            matchedHr = hrEmployees.find(hr => {
                                if (!hr.phone) return false;
                                const cleanHrWa = String(hr.phone).replace(/\D/g, '');
                                return cleanHrWa.endsWith(last8);
                            });
                        }
                        
                        // If not matched by phone, try exact name match
                        if (!matchedHr && user.name) {
                            matchedHr = hrEmployees.find(hr => hr.name && hr.name.toLowerCase().trim() === user.name.toLowerCase().trim());
                        }
                    }

                    if (matchedHr) {
                        const updateData = {};
                        let shouldUpdate = false;

                        if (!user.hr_employee_id) {
                            updateData.hr_employee_id = matchedHr.id;
                            shouldUpdate = true;
                            linkedCount++;
                        }

                        // If user's name is different or shorter than HR name (meaning HR name has full name)
                        if (matchedHr.name && matchedHr.name !== user.name) {
                            updateData.name = matchedHr.name;
                            shouldUpdate = true;
                        }

                        if (shouldUpdate) {
                            await db('users').where({ id: user.id }).update(updateData);
                            console.log(`Updated user ${user.name} -> ${matchedHr.name}`);
                            updatedCount++;
                        }
                    }
                }
                console.log(`Sync complete for ${org}. Newly linked: ${linkedCount}. Total updated names/links: ${updatedCount}.`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

runSync();
