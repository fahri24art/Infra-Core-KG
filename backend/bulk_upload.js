const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const TARGET_DIR = 'f:\\TCF Project Infra\\SOP ICT\\excel SOP ICT TCFSG';
const API_URL = 'http://192.168.1.66:5000/api/raw-documents/upload';

async function uploadFile(filePath, category) {
    const fileName = path.basename(filePath);
    
    // We can use the category (folder name) in the description
    const title = fileName.replace(/\.[^/.]+$/, ""); // remove extension
    const description = category ? `Imported from ${category}` : 'Bulk import';

    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    form.append('file', fs.createReadStream(filePath));

    try {
        console.log(`Uploading: ${fileName}...`);
        const res = await axios.post(API_URL, form, {
            headers: {
                ...form.getHeaders()
            }
        });
        console.log(`SUCCESS: ${fileName}`);
    } catch (err) {
        console.error(`FAILED: ${fileName} - ${err.message}`);
        if(err.response) {
            console.error(err.response.data);
        }
    }
}

async function walkDir(dir, baseCategory = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            await walkDir(fullPath, file);
        } else {
            // Only upload files, skip hidden or temp files
            if (!file.startsWith('~') && !file.startsWith('.')) {
                await uploadFile(fullPath, baseCategory);
            }
        }
    }
}

async function main() {
    console.log('Starting bulk upload...');
    await walkDir(TARGET_DIR);
    console.log('Bulk upload complete!');
}

main();
