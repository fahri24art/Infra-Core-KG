const db = require('./db');

async function cleanup() {
    const org = 'TCF-SG';
    const trx = await db.getDb(org).transaction();
    try {
        console.log('Fetching all Semester plans...');
        const plans = await trx('maintenance_plans').where('maintenance_type', 'Semester').orderBy('id', 'asc');
        
        const grouped = {};
        plans.forEach(p => {
            const key = `${p.asset_id}_${p.year}_${p.semester}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
        });

        let deletedCount = 0;
        let updatedCount = 0;

        for (const key in grouped) {
            const group = grouped[key];
            if (group.length > 1) {
                // Keep the last one as the primary, but merge data
                const primary = group[group.length - 1];
                let mergedPlanning = {};
                let mergedActual = {};

                group.forEach(p => {
                    const pData = typeof p.planning_data === 'string' ? JSON.parse(p.planning_data || '{}') : (p.planning_data || {});
                    const aData = typeof p.actual_data === 'string' ? JSON.parse(p.actual_data || '{}') : (p.actual_data || {});
                    mergedPlanning = { ...mergedPlanning, ...pData };
                    mergedActual = { ...mergedActual, ...aData };
                });

                // Update primary
                await trx('maintenance_plans').where('id', primary.id).update({
                    planning_data: JSON.stringify(mergedPlanning),
                    actual_data: JSON.stringify(mergedActual)
                });
                updatedCount++;

                // Delete others
                const toDelete = group.slice(0, group.length - 1).map(p => p.id);
                await trx('maintenance_plans').whereIn('id', toDelete).del();
                deletedCount += toDelete.length;
            }
        }

        await trx.commit();
        console.log(`Cleanup complete! Deleted ${deletedCount} duplicates, updated ${updatedCount} primary plans.`);
    } catch (e) {
        await trx.rollback();
        console.error('Error during cleanup:', e);
    }
    process.exit(0);
}

cleanup();
