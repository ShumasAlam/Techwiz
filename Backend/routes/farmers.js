const express = require('express');
const router = express.Router();
const {
  getFarmers,
  getFarmerById,
  updateFarmerProfile,
  toggleFeatured,
  getFarmerOrders
} = require('../controllers/farmerController');

router.get('/', getFarmers);
router.get('/:id', getFarmerById);
router.get('/profile/:id', getFarmerById);
router.put('/profile', updateFarmerProfile);
router.put('/:id', updateFarmerProfile);
router.patch('/:id', updateFarmerProfile);
router.patch('/:id/featured', toggleFeatured);
router.get('/orders', getFarmerOrders);

module.exports = router;
