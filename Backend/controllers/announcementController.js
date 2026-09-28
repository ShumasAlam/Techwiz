const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

// Get active announcements for public display
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    res.json(announcements.map(a => ({
      id: a.id || a._id.toString(),
      title: a.title,
      content: a.content || '',
      image: a.image || '',
      link: a.link || '',
      date: a.date || new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      updatedAt: a.updatedAtText || '',
      isActive: a.isActive
    })));
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Server error retrieving announcements', error: error.message });
  }
};

// Get all announcements for admin management
const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 }).lean();
    res.json(announcements.map(a => ({
      id: a.id || a._id.toString(),
      title: a.title,
      content: a.content || '',
      image: a.image || '',
      link: a.link || '',
      date: a.date || new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      updatedAt: a.updatedAtText || '',
      isActive: a.isActive
    })));
  } catch (error) {
    console.error('Get all announcements error:', error);
    res.status(500).json({ message: 'Server error retrieving announcements', error: error.message });
  }
};

// Create a new announcement (Admin)
const createAnnouncement = async (req, res) => {
  try {
    const { title, text, content, image, link } = req.body;
    const announcementTitle = (title || text || '').trim();

    if (!announcementTitle) {
      return res.status(400).json({ message: 'Announcement title or text is required' });
    }

    const id = 'a-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    const announcement = new Announcement({
      id,
      title: announcementTitle,
      content: content || '',
      image: image || '',
      link: link || '',
      date: dateStr,
      isActive: true
    });

    await announcement.save();

    // Broadcast notification to customers
    try {
      const customers = await User.find({ role: 'customer' }).lean();
      const notifications = customers.map(user => ({
        id: 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        userId: user.id || user._id.toString(),
        type: 'announcement',
        text: announcementTitle,
        unread: true,
        createdAt: new Date().toLocaleString('en-GB')
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      console.warn('Failed to broadcast notifications for announcement:', notifErr.message);
    }

    res.status(201).json({
      message: 'Announcement published successfully',
      announcement: {
        id: announcement.id,
        title: announcement.title,
        image: announcement.image,
        link: announcement.link,
        date: announcement.date,
        isActive: announcement.isActive
      }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Server error creating announcement', error: error.message });
  }
};

// Update an existing announcement (Admin)
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, text, content, image, link, isActive } = req.body;

    const announcement = await Announcement.findOne(byId(id));
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    if (title !== undefined) announcement.title = title.trim();
    if (text !== undefined && !title) announcement.title = text.trim();
    if (content !== undefined) announcement.content = content.trim();
    if (image !== undefined) announcement.image = image;
    if (link !== undefined) announcement.link = link;
    if (isActive !== undefined) announcement.isActive = Boolean(isActive);

    announcement.updatedAtText = 'Updated ' + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    announcement.updatedAt = new Date();

    await announcement.save();

    res.json({
      message: 'Announcement updated successfully',
      announcement: {
        id: announcement.id,
        title: announcement.title,
        image: announcement.image,
        link: announcement.link,
        date: announcement.date,
        updatedAt: announcement.updatedAtText,
        isActive: announcement.isActive
      }
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: 'Server error updating announcement', error: error.message });
  }
};

// Delete an announcement (Admin)
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Announcement.findOneAndDelete(byId(id));

    if (!result) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully', success: true, id });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Server error deleting announcement', error: error.message });
  }
};

module.exports = {
  getAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
