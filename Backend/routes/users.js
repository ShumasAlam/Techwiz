const express = require('express');
const router = express.Router();
const { toggleFavorite, getFavorites } = require('../controllers/userController');
const { getNotifications, markAllRead } = require('../controllers/notificationController');

router.patch('/:userId/favorites', toggleFavorite);
router.get('/:userId/favorites', getFavorites);
router.get('/:userId/notifications', getNotifications);
router.patch('/:userId/notifications/read-all', markAllRead);

module.exports = router;
