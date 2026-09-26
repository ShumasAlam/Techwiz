const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({}).sort({ createdAt: -1 }).lean();
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createReview = async (req, res) => {
  try {
    const payload = req.body;
    const { orderId, productId, customerId, rating, comment, customer } = payload;

    const order = await Order.findOne({ $or: [{ id: orderId }, { _id: orderId }] });
    if (!order || order.status !== 'completed') {
      return res.status(400).json({ message: 'Reviews require a completed order containing this product.' });
    }

    const existing = await Review.findOne({ orderId, productId, customerId });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this item.' });
    }

    if (!rating || rating < 1 || rating > 5 || !comment?.trim()) {
      return res.status(400).json({ message: 'Choose a rating and enter a comment.' });
    }

    const reviewId = 'r-' + Date.now().toString(36);
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const review = new Review({
      id: reviewId,
      productId,
      farmerId: order.farmerId,
      orderId,
      customerId,
      customer: customer || 'Customer',
      rating: Number(rating),
      comment: comment.trim(),
      date
    });

    await review.save();

    // Update product rating and reviews count
    const product = await Product.findOne({ $or: [{ id: productId }, { _id: productId }] });
    if (product) {
      const allProductReviews = await Review.find({ productId });
      const avg = allProductReviews.reduce((sum, r) => sum + r.rating, 0) / allProductReviews.length;
      product.rating = Number(avg.toFixed(1));
      product.averageRating = product.rating;
      product.reviews = allProductReviews.length;
      product.totalReviews = allProductReviews.length;
      await product.save();
    }

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: error.message || 'Server error creating review' });
  }
};

const respondToReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { response, farmerResponse } = req.body;
    const replyText = (response || farmerResponse || '').trim();

    if (!replyText) {
      return res.status(400).json({ message: 'Enter a reply to a review on your product.' });
    }

    const review = await Review.findOne({ $or: [{ id: reviewId }, { _id: reviewId }] });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.response = replyText;
    review.farmerResponse = replyText;
    await review.save();

    res.json(review);
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    await Review.findOneAndDelete({ $or: [{ id: reviewId }, { _id: reviewId }] });
    res.json({ message: 'Review deleted successfully', success: true });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFarmerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ farmerId: req.params.farmerId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('Get farmer reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getReviews,
  createReview,
  respondToReview,
  deleteReview,
  getProductReviews,
  getFarmerReviews
};
