const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Market = require('../models/Market');
const Review = require('../models/Review');
const Farmer = require('../models/Farmer');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

const getDashboardStats = async (req, res) => {
  try {
    const totalFarmers = await Farmer.countDocuments({});
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalMarkets = await Market.countDocuments({});
    const totalOrders = await Order.countDocuments({});
    
    const pendingFarmerApprovals = await Farmer.countDocuments({ status: 'pending' });

    const completedOrders = await Order.find({ $or: [{ status: 'completed' }, { orderStatus: 'completed' }] });
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);

    const recentOrders = await Order.find()
      .sort({ createdDate: -1, createdAt: -1 })
      .limit(10);

    res.json({
      totalFarmers,
      totalCustomers,
      totalMarkets,
      totalOrders,
      pendingFarmerApprovals,
      totalRevenue,
      recentOrders
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateFarmerStatus = async (req, res) => {
  try {
    const { status, featured } = req.body;
    const farmerId = req.params.id;

    const farmer = await Farmer.findOne(byId(farmerId));
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (status) farmer.status = status;
    if (featured !== undefined) farmer.featured = Boolean(featured);
    await farmer.save();

    // Also update associated user if exists
    if (farmer.userId && status) {
      await User.findOneAndUpdate(
        byId(farmer.userId),
        { status: status === 'approved' ? 'approved' : status }
      );
    }

    res.json(farmer);
  } catch (error) {
    console.error('Update farmer status error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const toggleFarmerFeatured = async (req, res) => {
  try {
    const farmerId = req.params.id;
    const farmer = await Farmer.findOne(byId(farmerId));
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    farmer.featured = req.body.featured !== undefined ? Boolean(req.body.featured) : !farmer.featured;
    await farmer.save();

    res.json({
      id: farmer.id,
      name: farmer.name,
      featured: farmer.featured,
      message: `Farmer ${farmer.name} is now ${farmer.featured ? 'featured on homepage' : 'unfeatured'}`
    });
  } catch (error) {
    console.error('Toggle farmer featured error:', error);
    res.status(500).json({ message: 'Server error toggling featured status' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;

    const user = await User.findOne(byId(userId));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    user.isActive = status !== 'suspended';
    await user.save();

    res.json(user);
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  updateFarmerStatus,
  toggleFarmerFeatured,
  updateUserStatus,
  getAllUsers
};
