const xlsx = require('xlsx');
const wb = xlsx.readFile('f:\\TCF Project Infra\\APP_Power_Asset\\TCFSG-SOP-ICT-03 Prosedur Permintaan Fasilitas ICT.xlsx');
console.log('Sheets:', wb.SheetNames);
if (wb.SheetNames.includes('Isi after')) {
    const sheet = wb.Sheets['Isi after'];
    console.log(xlsx.utils.sheet_to_json(sheet, { defval: "" }));
} else {
    const sheet = wb.Sheets[wb.SheetNames[0]];
    console.log(xlsx.utils.sheet_to_json(sheet, { defval: "" }));
}
