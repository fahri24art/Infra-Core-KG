const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('--- 1. Testing GET /api/budgeting/department-requests ---');
    const deptRes = await request({
        host: '192.168.1.66',
        port: 5000,
        path: '/api/budgeting/department-requests?year=ALL&plant=ALL',
        method: 'GET'
    });
    console.log('Status:', deptRes.status);
    console.log('Total Department Requests returned:', deptRes.data?.total);
    console.log('Summary:', deptRes.data?.summary);
    if (deptRes.data?.requests?.length > 0) {
        console.log('Sample request item:', {
            req_no: deptRes.data.requests[0].req_no,
            item_name: deptRes.data.requests[0].item_name,
            target_year: deptRes.data.requests[0].target_year,
            plant: deptRes.data.requests[0].plant,
            status: deptRes.data.requests[0].status
        });
    }

    console.log('\n--- 2. Testing GET /api/budgeting/items?year=2027 ---');
    const itemsRes = await request({
        host: '192.168.1.66',
        port: 5000,
        path: '/api/budgeting/items?year=2027',
        method: 'GET'
    });
    console.log('Status:', itemsRes.status);
    console.log('Total 2027 items returned:', itemsRes.data?.totalCount);
    console.log('Total Amount:', itemsRes.data?.totalAmount);

    console.log('\n--- 3. Testing POST /api/budgeting/items (Add test item to 2027) ---');
    const testItem = {
        year: 2027,
        item_name: 'TEST ITEM AUTOMATION VERIFIKASI POSTGRES',
        plant: 'SG',
        category: 'CAPEX',
        department: 'ICT',
        qty: 2,
        unit_price: 15000000,
        monthly: { jan: 15000000, feb: 15000000 },
        notes: 'Verifikasi penyimpanan database'
    };
    const postRes = await request({
        host: '192.168.1.66',
        port: 5000,
        path: '/api/budgeting/items',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, testItem);
    console.log('POST Status:', postRes.status);
    console.log('Created Item ID:', postRes.data?.item?.id);
    console.log('Calculated Total Amount:', postRes.data?.item?.total_amount);

    const createdId = postRes.data?.item?.id;

    if (createdId) {
        console.log('\n--- 4. Testing GET /api/budgeting/items (Verify persistence in DB) ---');
        const verifyRes = await request({
            host: '192.168.1.66',
            port: 5000,
            path: `/api/budgeting/items?year=2027&search=${encodeURIComponent('TEST ITEM AUTOMATION VERIFIKASI')}`,
            method: 'GET'
        });
        console.log('Search Status:', verifyRes.status);
        console.log('Found items count:', verifyRes.data?.totalCount);
        const found = verifyRes.data?.items?.find(it => it.id === createdId);
        console.log('Found in DB:', found ? '✅ YES, PERSISTED IN POSTGRESQL!' : '❌ NOT FOUND');

        console.log('\n--- 5. Clean up test item ---');
        const delRes = await request({
            host: '192.168.1.66',
            port: 5000,
            path: `/api/budgeting/items/${createdId}`,
            method: 'DELETE'
        });
        console.log('Delete status:', delRes.status, delRes.data);
    }

    console.log('\n--- ALL VERIFICATIONS COMPLETED ---');
}

runTests().catch(console.error);
