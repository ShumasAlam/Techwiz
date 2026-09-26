const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');

const getFarmers = async (req, res) => {
  try {
    const farmers = await Farmer.find({}).sort({ name: 1 }).lean();
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
    const farmer = await Farmer.findOne({ $or: [{ id: req.params.id }, { _id: req.params.id }] }).lean();
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    res.json({
      id: farmer.id || farmer._id.toString(),
      ...farmer
    });
  } catch (error) {
    console.error('Get farmer error:', error);
    res.status(500).json({ message: 'Server error retrieving farmer' });
  }
};

const updateFarmerProfile = async (req, res) => {
  try {
    const farmerId = req.params.id || req.user.farmerId || req.user.id;
    const farmer = await Farmer.findOne({ $or: [{ id: farmerId }, { userId: req.user.id }] });
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

const getFarmerOrders = async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.id;
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
  getFarmerOrders
};
