const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/network/ricoh/devices/quotas');
        console.log(res.data.slice(0, 5));
    } catch (e) {
        console.error(e.message);
    }
}
test();
