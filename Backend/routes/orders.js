const express = require('express');
const router = express.Router();
const {
  createOrder,
  createBatchOrders,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');

router.post('/', createOrder);
router.post('/batch', createBatchOrders);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id', updateOrderStatus);
router.put('/:id', updateOrderStatus);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
