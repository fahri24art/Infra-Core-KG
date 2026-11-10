const fs = require('fs');
const actions = JSON.parse(fs.readFileSync('actions.json', 'utf8'));
const insertedNumbers = actions.inserts.map(item => item.inventory_number);
const sql = "DELETE FROM assets WHERE inventory_number IN (" + insertedNumbers.map(n => "'" + n + "'").join(', ') + ");";
fs.writeFileSync('F:/TCF Project Infra/delete_bad_assets.sql', sql);
console.log('SQL generated for ' + insertedNumbers.length + ' assets.');
