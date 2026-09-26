const Market = require('../models/Market');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');

const getMarkets = async (req, res) => {
  try {
    const markets = await Market.find({}).sort({ name: 1 }).lean();
    const normalized = markets.map(m => ({
      id: m.id || m._id.toString(),
      name: m.name,
      day: m.day,
      date: m.date || 'Weekly',
      hours: m.hours || (m.openingTime ? `${m.openingTime} — ${m.closingTime}` : ''),
      openingTime: m.openingTime || '',
      closingTime: m.closingTime || '',
      address: typeof m.address === 'string' ? m.address : `${m.address?.street || ''}, ${m.address?.city || ''}`.trim().replace(/^,|,$/g, ''),
      distance: m.distance || '',
      stalls: m.stalls || 0,
      lat: m.lat || m.location?.latitude || 0,
      lng: m.lng || m.location?.longitude || 0,
      description: m.description || ''
    }));
    res.json(normalized);
  } catch (error) {
    console.error('Get markets error:', error);
    res.status(500).json({ message: 'Server error retrieving markets' });
  }
};

const getMarketById = async (req, res) => {
  try {
    const market = await Market.findOne({ $or: [{ id: req.params.id }, { _id: req.params.id }] }).lean();
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }
    res.json({
      id: market.id || market._id.toString(),
      ...market
    });
  } catch (error) {
    console.error('Get market error:', error);
    res.status(500).json({ message: 'Server error retrieving market' });
  }
};

const getNearbyMarkets = async (req, res) => {
  try {
    const { lat, lng, latitude, longitude } = req.query;
    const targetLat = parseFloat(lat || latitude);
    const targetLng = parseFloat(lng || longitude);

    const markets = await Market.find({}).lean();
    res.json(markets);
  } catch (error) {
    console.error('Get nearby markets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createOrUpdateMarket = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.name?.trim() || !payload.day?.trim()) {
      return res.status(400).json({ message: 'Enter market details and valid opening/closing schedule.' });
    }

    const marketId = payload.id || req.params.id || ('m-' + Date.now().toString(36));
    let market = await Market.findOne({ $or: [{ id: marketId }, { _id: payload.id || req.params.id }] });

    const hours = payload.hours || (payload.openingTime && payload.closingTime ? `${payload.openingTime} — ${payload.closingTime}` : '');

    if (market) {
      Object.assign(market, payload, { hours });
      await market.save();
    } else {
      market = new Market({
        id: marketId,
        name: payload.name,
        day: payload.day,
        date: payload.date || 'Weekly',
        hours,
        openingTime: payload.openingTime || '',
        closingTime: payload.closingTime || '',
        address: payload.address,
        distance: payload.distance || '',
        stalls: payload.stalls || 0,
        lat: Number(payload.lat) || 0,
        lng: Number(payload.lng) || 0,
        description: payload.description || 'Local market pickup point.',
        image: payload.image || (req.file ? `/uploads/${req.file.filename}` : '')
      });
      await market.save();
    }

    res.status(market.isNew ? 201 : 200).json(market);
  } catch (error) {
    console.error('Save market error:', error);
    res.status(500).json({ message: error.message || 'Server error saving market' });
  }
};

const deleteMarket = async (req, res) => {
  try {
    const marketId = req.params.id;
    const activeOrders = await Order.find({
      marketId,
      status: { $nin: ['completed', 'cancelled', 'declined'] }
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({ message: 'Complete or cancel active pickups before deleting this market.' });
    }

    await Market.findOneAndDelete({ $or: [{ id: marketId }, { _id: marketId }] });

    await Product.updateMany({ marketIds: marketId }, { $pull: { marketIds: marketId } });
    await Farmer.updateMany({ marketIds: marketId }, { $pull: { marketIds: marketId } });

    res.json({ message: 'Market deleted successfully', success: true });
  } catch (error) {
    console.error('Delete market error:', error);
    res.status(500).json({ message: 'Server error deleting market' });
  }
};

module.exports = {
  getMarkets,
  getMarketById,
  getNearbyMarkets,
  createMarket: createOrUpdateMarket,
  updateMarket: createOrUpdateMarket,
  deleteMarket
};
