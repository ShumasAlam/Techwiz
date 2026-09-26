const express = require('express');
const router = express.Router();
const { getSnapshot } = require('../controllers/snapshotController');

router.get('/', getSnapshot);

module.exports = router;
