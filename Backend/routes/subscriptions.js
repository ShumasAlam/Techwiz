const express = require('express');
const router = express.Router();
const { notifyMe, getSubscriptions } = require('../controllers/subscriptionController');

router.post('/', notifyMe);
router.get('/', getSubscriptions);

module.exports = router;
