const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

const getNotifications = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId || req.user?.id;
    const query = userId ? { userId } : {};
    const notifications = await Notification.find(query).sort({ createdDate: -1, createdAt: -1 }).lean();
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error retrieving notifications' });
  }
};

const markRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const notification = await Notification.findOne(byId(notificationId));
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    notification.unread = req.body.unread !== undefined ? req.body.unread : false;
    await notification.save();
    res.json(notification);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error updating notification' });
  }
};

const markAllRead = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    await Notification.updateMany({ userId }, { $set: { unread: false } });
    res.json({ message: 'All notifications marked as read', success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Server error updating notifications' });
  }
};

const createNotification = async (req, res) => {
  try {
    const { userId, type, text, orderId, productId } = req.body;
    const id = 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const notification = new Notification({
      id,
      userId,
      type: type || 'system',
      text,
      orderId,
      productId,
      unread: true,
      createdAt: new Date().toLocaleString('en-GB')
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error creating notification' });
  }
};

const publishAnnouncement = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: 'Announcement text is required' });
    }

    const customers = await User.find({ role: 'customer' });
    const notifications = [];

    for (const user of customers) {
      const id = 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      notifications.push({
        id,
        userId: user.id || user._id.toString(),
        type: 'announcement',
        text: text.trim(),
        unread: true,
        createdAt: new Date().toLocaleString('en-GB')
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ message: 'Announcement published successfully', count: notifications.length });
  } catch (error) {
    console.error('Publish announcement error:', error);
    res.status(500).json({ message: 'Server error publishing announcement' });
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  createNotification,
  publishAnnouncement
};
