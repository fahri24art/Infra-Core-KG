const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const uploadDir = path.join(__dirname, 'public/uploads');

async function parseAll() {
    const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.pdf'));
    for (const file of files) {
        try {
            const dataBuffer = fs.readFileSync(path.join(uploadDir, file));
            const data = await pdf(dataBuffer);
            const text = data.text;
            const matches = text.match(/TCFSG-(FM|SOP|IK)-ICT-\d+-\d+|TCFSG-(FM|SOP|IK)-ICT-\d+/g);
            if (matches) {
                console.log(`File: ${file} => Document Numbers:`, [...new Set(matches)]);
            } else {
                console.log(`File: ${file} => No TCFSG numbers found`);
            }
        } catch (e) {
            console.log(`Error parsing ${file}: ${e.message}`);
        }
    }
}
parseAll();
