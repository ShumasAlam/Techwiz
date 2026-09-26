const express = require('express');
const router = express.Router();
const { publishAnnouncement } = require('../controllers/notificationController');

router.post('/', publishAnnouncement);

module.exports = router;
