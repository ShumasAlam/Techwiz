const express = require('express');
const router = express.Router();
const {
  getReviews,
  createReview,
  respondToReview,
  deleteReview,
  getProductReviews,
  getFarmerReviews
} = require('../controllers/reviewController');

router.get('/', getReviews);
router.post('/', createReview);
router.put('/:id/respond', respondToReview);
router.patch('/:id/respond', respondToReview);
router.delete('/:id', deleteReview);
router.get('/product/:productId', getProductReviews);
router.get('/farmer/:farmerId', getFarmerReviews);

module.exports = router;
