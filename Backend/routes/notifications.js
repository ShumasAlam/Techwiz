const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markRead,
  markAllRead,
  createNotification
} = require('../controllers/notificationController');

router.get('/', getNotifications);
router.post('/', createNotification);
router.patch('/:id', markRead);
router.put('/:id', markRead);

module.exports = router;
