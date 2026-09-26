const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Market = require('../models/Market');
const Farmer = require('../models/Farmer');
const Notification = require('../models/Notification');

const createOrder = async (req, res) => {
  try {
    const payload = req.body;
    const { customerId, marketId, pickupDate, pickupSlot, items } = payload;

    const market = await Market.findOne({ $or: [{ id: marketId }, { _id: marketId }] });
    if (!market || !pickupDate || !pickupSlot || !items?.length) {
      return res.status(400).json({ message: 'Choose a valid market and pickup window.' });
    }

    const groups = new Map();
    for (const line of items) {
      const product = await Product.findOne({ $or: [{ id: line.productId }, { _id: line.productId }] });
      if (!product || line.quantity < 1 || product.stock < line.quantity || !product.available) {
        return res.status(400).json({ message: `${product?.name || 'An item'} is no longer available in the requested quantity.` });
      }

      const farmer = await Farmer.findOne({ $or: [{ id: product.farmerId }, { userId: product.farmerId }] });
      if (farmer && farmer.status !== 'approved') {
        return res.status(400).json({ message: `${farmer.name} is not accepting reservations yet.` });
      }

      const farmerKey = farmer?.id || product.farmerId;
      const group = groups.get(farmerKey) || [];
      group.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: line.quantity
      });
      groups.set(farmerKey, group);
    }

    const createdAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const createdOrders = [];

    for (const [farmerId, groupItems] of groups.entries()) {
      const orderId = 'ML-' + Math.floor(1000 + Math.random() * 9000);
      const total = groupItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Deduct stock
      for (const line of groupItems) {
        const product = await Product.findOne({ id: line.productId });
        if (product) {
          product.stock -= line.quantity;
          product.stockQuantity = product.stock;
          product.available = product.stock > 0;
          product.isAvailable = product.stock > 0;
          await product.save();
        }
      }

      const order = new Order({
        id: orderId,
        customerId: customerId || req.user?.id,
        farmerId,
        marketId: market.id || marketId,
        pickupDate,
        pickupSlot,
        createdAt,
        status: 'placed',
        orderStatus: 'placed',
        total,
        totalAmount: total,
        items: groupItems
      });

      await order.save();
      createdOrders.push(order);

      // Create reminder notification
      await Notification.create({
        id: 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        userId: customerId || req.user?.id,
        type: 'reminder',
        text: `Pickup reminder: collect ${order.id} at ${market.name} on ${pickupDate}, ${pickupSlot}. Pay at pickup.`,
        orderId: order.id,
        unread: true
      });
    }

    res.status(201).json(createdOrders.length === 1 ? createdOrders[0] : createdOrders);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message || 'Server error creating order' });
  }
};

const createBatchOrders = async (req, res) => {
  try {
    const payload = req.body;
    const { customerId, marketId, pickupDate, pickupSlot, items } = payload;

    const market = await Market.findOne({ $or: [{ id: marketId }, { _id: marketId }] });
    if (!market || !pickupDate || !pickupSlot || !items?.length) {
      return res.status(400).json({ message: 'Choose a valid market and pickup window.' });
    }

    const groups = new Map();
    for (const line of items) {
      const product = await Product.findOne({ $or: [{ id: line.productId }, { _id: line.productId }] });
      if (!product || line.quantity < 1 || product.stock < line.quantity || !product.available) {
        return res.status(400).json({ message: `${product?.name || 'An item'} is no longer available in the requested quantity.` });
      }

      const farmer = await Farmer.findOne({ $or: [{ id: product.farmerId }, { userId: product.farmerId }] });
      const farmerKey = farmer?.id || product.farmerId;
      const group = groups.get(farmerKey) || [];
      group.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: line.quantity
      });
      groups.set(farmerKey, group);
    }

    const createdAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const createdOrders = [];

    for (const [farmerId, groupItems] of groups.entries()) {
      const orderId = 'ML-' + Math.floor(1000 + Math.random() * 9000);
      const total = groupItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Deduct stock
      for (const line of groupItems) {
        const product = await Product.findOne({ id: line.productId });
        if (product) {
          product.stock -= line.quantity;
          product.stockQuantity = product.stock;
          product.available = product.stock > 0;
          product.isAvailable = product.stock > 0;
          await product.save();
        }
      }

      const order = new Order({
        id: orderId,
        customerId: customerId || req.user?.id,
        farmerId,
        marketId: market.id || marketId,
        pickupDate,
        pickupSlot,
        createdAt,
        status: 'placed',
        orderStatus: 'placed',
        total,
        totalAmount: total,
        items: groupItems
      });

      await order.save();
      createdOrders.push(order);

      // Create reminder notification
      await Notification.create({
        id: 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        userId: customerId || req.user?.id,
        type: 'reminder',
        text: `Pickup reminder: collect ${order.id} at ${market.name} on ${pickupDate}, ${pickupSlot}. Pay at pickup.`,
        orderId: order.id,
        unread: true
      });
    }

    res.status(201).json(createdOrders);
  } catch (error) {
    console.error('Batch order creation error:', error);
    res.status(500).json({ message: error.message || 'Server error creating batch orders' });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdDate: -1, createdAt: -1 }).lean();
    const normalized = orders.map(o => ({
      id: o.id || o._id.toString(),
      customerId: o.customerId,
      farmerId: o.farmerId,
      marketId: o.marketId,
      pickupDate: o.pickupDate,
      pickupSlot: o.pickupSlot,
      status: o.status || o.orderStatus || 'placed',
      createdAt: o.createdAt || '',
      total: o.total !== undefined ? o.total : (o.totalAmount || 0),
      items: o.items || []
    }));
    res.json(normalized);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error retrieving orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ $or: [{ id: req.params.id }, { _id: req.params.id }] }).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({
      id: order.id || order._id.toString(),
      ...order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error retrieving order' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, orderStatus } = req.body;
    const newStatus = status || orderStatus;
    const order = await Order.findOne({ $or: [{ id: req.params.id }, { _id: req.params.id }] });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const transitions = {
      placed: ['accepted', 'declined', 'cancelled'],
      accepted: ['preparing', 'ready', 'ready_for_pickup', 'cancelled'],
      preparing: ['ready', 'ready_for_pickup', 'cancelled'],
      ready: ['completed'],
      ready_for_pickup: ['completed']
    };

    if (!transitions[order.status]?.includes(newStatus) && !transitions[order.orderStatus]?.includes(newStatus)) {
      return res.status(400).json({ message: 'This order can no longer be changed to that status.' });
    }

    if (['declined', 'cancelled'].includes(newStatus)) {
      // Restore stock
      for (const item of order.items) {
        const product = await Product.findOne({ id: item.productId });
        if (product) {
          product.stock += item.quantity;
          product.stockQuantity = product.stock;
          product.available = true;
          product.isAvailable = true;
          await product.save();
        }
      }
    }

    order.status = newStatus;
    order.orderStatus = newStatus;
    await order.save();

    if (['accepted', 'ready', 'ready_for_pickup'].includes(newStatus)) {
      await Notification.create({
        id: 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        userId: order.customerId,
        type: newStatus === 'accepted' ? 'accepted' : 'ready',
        text: `Order ${order.id} ${newStatus === 'accepted' ? 'was accepted by your farmer.' : 'is ready for pickup.'}`,
        orderId: order.id,
        unread: true
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: error.message || 'Server error updating order' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ $or: [{ id: req.params.id }, { _id: req.params.id }] });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    for (const item of order.items) {
      const product = await Product.findOne({ id: item.productId });
      if (product) {
        product.stock += item.quantity;
        product.stockQuantity = product.stock;
        product.available = true;
        product.isAvailable = true;
        await product.save();
      }
    }

    order.status = 'cancelled';
    order.orderStatus = 'cancelled';
    order.cancellationReason = req.body.reason || 'Cancelled';
    order.cancelledAt = new Date();
    await order.save();

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error cancelling order' });
  }
};

module.exports = {
  createOrder,
  createBatchOrders,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
};
