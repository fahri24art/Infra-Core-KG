require('dotenv').config();
const db = require('./db'); // This imports Knex

async function fixTypes() {
    try {
        console.log('Fixing types...');
        
        // Update SOP
        const sopCount = await db('raw_documents')
            .where('title', 'ilike', '%SOP%')
            .orWhere('description', 'ilike', '%SOP%')
            .update({ type: 'SOP' });
        console.log(`Updated ${sopCount} to SOP`);

        // Update IK
        const ikCount = await db('raw_documents')
            .where('title', 'ilike', '%IK %')
            .orWhere('title', 'ilike', '%-IK-%')
            .orWhere('description', 'ilike', '%IK %')
            .update({ type: 'IK' });
        console.log(`Updated ${ikCount} to IK`);

        // Update Form
        const formCount = await db('raw_documents')
            .where('title', 'ilike', '%Form%')
            .orWhere('title', 'ilike', '%-FM-%')
            .update({ type: 'Form' });
        console.log(`Updated ${formCount} to Form`);

        // Update Audit
        const auditCount = await db('raw_documents')
            .where('title', 'ilike', '%Audit%')
            .update({ type: 'Audit' });
        console.log(`Updated ${auditCount} to Audit`);

        // Update Other
        const otherCount = await db('raw_documents')
            .where('type', 'Mentahan')
            .update({ type: 'Other' });
        console.log(`Updated ${otherCount} to Other`);

        console.log('Done!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixTypes();
