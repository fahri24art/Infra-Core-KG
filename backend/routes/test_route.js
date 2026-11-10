const express = require('express');
const router = express.Router();
router.get('/test', (req, res) => res.json({status: 'TEST_ROUTE_OK'}));
module.exports = router;
