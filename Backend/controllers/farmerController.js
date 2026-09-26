const mongoose = require('mongoose');
const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

const getFarmers = async (req, res) => {
  try {
    const { featured } = req.query;
    const filter = {};
    if (featured === 'true') {
      filter.featured = true;
    }

    const farmers = await Farmer.find(filter).sort({ featured: -1, rating: -1, name: 1 }).lean();
    const normalized = farmers.map(f => ({
      id: f.id || f._id.toString(),
      userId: f.userId,
      name: f.name,
      owner: f.owner,
      initials: f.initials || f.name.slice(0, 2).toUpperCase(),
      marketIds: f.marketIds || [],
      rating: f.rating || 0,
      reviews: f.reviews || 0,
      years: f.years || 0,
      featured: Boolean(f.featured),
      status: f.status || 'approved',
      bio: f.bio || '',
      specialties: f.specialties || [],
      pickup: f.pickup || []
    }));
    res.json(normalized);
  } catch (error) {
    console.error('Get farmers error:', error);
    res.status(500).json({ message: 'Server error retrieving farmers' });
  }
};

const getFarmerById = async (req, res) => {
  try {
    const farmer = await Farmer.findOne(byId(req.params.id)).lean();
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    res.json({
      id: farmer.id || farmer._id.toString(),
      featured: Boolean(farmer.featured),
      ...farmer
    });
  } catch (error) {
    console.error('Get farmer error:', error);
    res.status(500).json({ message: 'Server error retrieving farmer' });
  }
};

const updateFarmerProfile = async (req, res) => {
  try {
    const farmerId = req.params.id || req.user?.farmerId || req.user?.id;
    const farmer = await Farmer.findOne({ $or: [{ id: farmerId }, { userId: req.user?.id }] });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    Object.assign(farmer, req.body);
    await farmer.save();
    res.json(farmer);
  } catch (error) {
    console.error('Update farmer profile error:', error);
    res.status(500).json({ message: 'Server error updating farmer profile' });
  }
};

const toggleFeatured = async (req, res) => {
  try {
    const farmer = await Farmer.findOne(byId(req.params.id));
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    farmer.featured = req.body.featured !== undefined ? req.body.featured : !farmer.featured;
    await farmer.save();
    res.json({
      id: farmer.id,
      name: farmer.name,
      featured: farmer.featured,
      message: `Farmer ${farmer.name} is now ${farmer.featured ? 'featured on homepage' : 'unfeatured'}`
    });
  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({ message: 'Server error toggling featured status' });
  }
};

const getFarmerOrders = async (req, res) => {
  try {
    const farmerId = req.user?.farmerId || req.user?.id;
    const orders = await Order.find({ farmerId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get farmer orders error:', error);
    res.status(500).json({ message: 'Server error retrieving farmer orders' });
  }
};

module.exports = {
  getFarmers,
  getFarmerById,
  getFarmerProfile: getFarmerById,
  updateFarmerProfile,
  toggleFeatured,
  getFarmerOrders
};
