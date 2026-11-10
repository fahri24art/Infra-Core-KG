require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./db');

function isExactPermutation(str1, str2) {
    if (!str1 || !str2) return false;
    const words1 = str1.toLowerCase().trim().split(/\s+/).sort();
    const words2 = str2.toLowerCase().trim().split(/\s+/).sort();
    return words1.join(' ') === words2.join(' ');
}

async function fixUsers() {
    try {
        const orgs = ['TCF-SG', 'TCF-KG'];
        for (const org of orgs) {
            console.log(`--- Fixing for ${org} ---`);
            await db.runWithOrg(org, async () => {
                const users = await db('users');
                const hrEmployees = await db('hr_employees');

                let whatsappUpdatedCount = 0;
                let newlyLinkedCount = 0;
                let deletedDuplicateCount = 0;

                // 1. First Pass: Link by exact name permutation if unlinked
                for (const user of users) {
                    if (!user.hr_employee_id) {
                        const matchedHr = hrEmployees.find(hr => isExactPermutation(user.name, hr.name));
                        if (matchedHr) {
                            await db('users').where({ id: user.id }).update({ hr_employee_id: matchedHr.id, name: matchedHr.name });
                            console.log(`Linked & Renamed (Permutation): ${user.name} -> ${matchedHr.name} (HR ID: ${matchedHr.id})`);
                            user.hr_employee_id = matchedHr.id;
                            user.name = matchedHr.name;
                            newlyLinkedCount++;
                        }
                    }
                }

                // 2. Second Pass: Find groups of users with the SAME hr_employee_id
                const linkedUsers = users.filter(u => u.hr_employee_id);
                const groupedByHr = {};
                for (const u of linkedUsers) {
                    if (!groupedByHr[u.hr_employee_id]) groupedByHr[u.hr_employee_id] = [];
                    groupedByHr[u.hr_employee_id].push(u);
                }

                for (const [hrId, group] of Object.entries(groupedByHr)) {
                    const hrEmp = hrEmployees.find(hr => String(hr.id) === String(hrId));
                    if (!hrEmp) continue;

                    // If duplicate
                    if (group.length > 1) {
                        // Sort so that we prefer keeping the one that has a whatsapp, or the one with the lowest ID
                        group.sort((a, b) => {
                            if (a.whatsapp && !b.whatsapp) return -1;
                            if (!a.whatsapp && b.whatsapp) return 1;
                            return a.id - b.id;
                        });

                        const primaryUser = group[0];
                        const duplicateUsers = group.slice(1);

                        console.log(`Found duplicates for HR ID ${hrId} (${hrEmp.name}). Keeping ID ${primaryUser.id}. Deleting ${duplicateUsers.map(u => u.id).join(', ')}`);

                        for (const dup of duplicateUsers) {
                            // Move tickets
                            await db('tickets').where({ user_id: dup.id }).update({ user_id: primaryUser.id });
                            // Move assets
                            await db('assets').where({ user_id: dup.id }).update({ user_id: primaryUser.id });
                            // Move ticket_responses
                            await db('ticket_responses').where({ user_id: dup.id }).update({ user_id: primaryUser.id });
                            // Move communication_logs (sender_id) if exists
                            try {
                                const hasCol = await db.schema.hasColumn('communication_logs', 'sender_id');
                                if (hasCol) {
                                    await db('communication_logs').where({ sender_id: dup.id }).update({ sender_id: primaryUser.id });
                                }
                            } catch (e) {}

                            // Delete duplicate
                            await db('users').where({ id: dup.id }).del();
                            console.log(`Deleted duplicate user ${dup.id} (${dup.name}) and moved their records.`);
                            deletedDuplicateCount++;
                        }

                        // update the primary user's whatsapp/name if needed
                        const updates = {};
                        if (!primaryUser.whatsapp && hrEmp.phone) {
                            updates.whatsapp = hrEmp.phone;
                        }
                        if (primaryUser.name !== hrEmp.name) {
                            updates.name = hrEmp.name;
                        }
                        if (Object.keys(updates).length > 0) {
                            await db('users').where({ id: primaryUser.id }).update(updates);
                            if (updates.whatsapp) whatsappUpdatedCount++;
                        }

                    } else {
                        // Single user linked
                        const user = group[0];
                        const updates = {};
                        if (!user.whatsapp && hrEmp.phone) {
                            updates.whatsapp = hrEmp.phone;
                        }
                        if (user.name !== hrEmp.name) {
                            updates.name = hrEmp.name;
                        }
                        if (Object.keys(updates).length > 0) {
                            await db('users').where({ id: user.id }).update(updates);
                            if (updates.whatsapp) whatsappUpdatedCount++;
                        }
                    }
                }

                console.log(`Fix complete for ${org}. Newly linked: ${newlyLinkedCount}. WhatsApp added/updated: ${whatsappUpdatedCount}. Duplicates removed: ${deletedDuplicateCount}.`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

fixUsers();
