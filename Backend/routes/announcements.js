const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');

// Public: get active announcements
router.get('/', getAnnouncements);

// Admin: get all announcements (including inactive)
router.get('/admin', getAllAnnouncements);

// Admin: create a new announcement
router.post('/', createAnnouncement);

// Admin: update an announcement
router.put('/:id', updateAnnouncement);

// Admin: delete an announcement
router.delete('/:id', deleteAnnouncement);

module.exports = router;
