const express = require('express');
const router = express.Router();
const {
  toggleFavorite,
  getFavorites,
  getCompareList,
  toggleCompare,
  clearCompare,
  getPreferences,
  updatePreferences
} = require('../controllers/userController');
const {
  getNotifications,
  markAllRead
} = require('../controllers/notificationController');

// Favorites
router.patch('/:userId/favorites', toggleFavorite);
router.get('/:userId/favorites', getFavorites);

// Compare List (Item 4)
router.get('/:userId/compare', getCompareList);
router.post('/:userId/compare', toggleCompare);
router.delete('/:userId/compare', clearCompare);

// Preferences & Settings (Item 8)
router.get('/:userId/preferences', getPreferences);
router.put('/:userId/preferences', updatePreferences);

// Notifications
router.get('/:userId/notifications', getNotifications);
router.patch('/:userId/notifications/read-all', markAllRead);

module.exports = router;
