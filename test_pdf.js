import { generatePCPdf } from './src/utils/generatePCPdf.js';

const asset = {
    category: 'PC',
    department: 'ICT',
    user_name: 'Test',
    code: '123'
};

const form = {
    checksheet_data: {
        conditionBody: { date: '2025-01-01', note: 'Test', mark: 'v' }
    },
    year: 2025,
    maintenance_date: '2025-01-01'
};

class FakeWindow {
    constructor() {
        this.document = {
            open: () => console.log('doc open'),
            write: (str) => console.log('doc write', str.substring(0, 50)),
            close: () => console.log('doc close')
        };
    }
}

global.Image = class {
    constructor() {
        setTimeout(() => this.onload(), 10);
    }
};

global.window = {};
global.document = { createElement: () => ({}) };

// Mock addImage in jspdf prototype
import jsPDF from 'jspdf';
const originalAddImage = jsPDF.prototype.addImage;
jsPDF.prototype.addImage = function(...args) {
    console.log('Mocked addImage called');
};

async function test() {
    try {
        const win = new FakeWindow();
        await generatePCPdf(asset, form, 'view', 'perbaikan', win);
        console.log('Success!');
    } catch(err) {
        console.error('Error in PDF Generation:', err);
    }
}

test();
