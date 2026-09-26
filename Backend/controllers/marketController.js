const mongoose = require('mongoose');
const Market = require('../models/Market');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

// Haversine Distance Formula in Kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

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
    const market = await Market.findOne(byId(req.params.id)).lean();
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
    const { lat, lng, latitude, longitude, radiusKm, day } = req.query;
    const userLat = parseFloat(lat || latitude);
    const userLng = parseFloat(lng || longitude);
    const maxRadius = parseFloat(radiusKm) || 50; // default 50km

    const query = {};
    if (day) {
      query.day = { $regex: new RegExp(day, 'i') };
    }

    const markets = await Market.find(query).lean();

    if (!isNaN(userLat) && !isNaN(userLng)) {
      const withDistance = markets.map(m => {
        const mLat = m.lat || m.location?.latitude || 0;
        const mLng = m.lng || m.location?.longitude || 0;
        const distanceVal = calculateDistanceKm(userLat, userLng, mLat, mLng);
        return {
          ...m,
          id: m.id || m._id.toString(),
          calculatedDistanceKm: distanceVal,
          distance: `${distanceVal} km`
        };
      })
      .filter(m => m.calculatedDistanceKm <= maxRadius)
      .sort((a, b) => a.calculatedDistanceKm - b.calculatedDistanceKm);

      return res.json(withDistance);
    }

    res.json(markets);
  } catch (error) {
    console.error('Get nearby markets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const planRoute = async (req, res) => {
  try {
    const { lat, lng, marketId } = req.body;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const market = await Market.findOne(byId(marketId)).lean();
    if (!market) {
      return res.status(404).json({ message: 'Market not found' });
    }

    const mLat = market.lat || market.location?.latitude || 0;
    const mLng = market.lng || market.location?.longitude || 0;

    let distanceKm = null;
    let estimatedTravelMinutes = null;

    if (!isNaN(userLat) && !isNaN(userLng)) {
      distanceKm = calculateDistanceKm(userLat, userLng, mLat, mLng);
      estimatedTravelMinutes = Math.round((distanceKm / 35) * 60); // approx city driving
    }

    // Get farmers at this market
    const farmers = await Farmer.find({ marketIds: market.id, status: 'approved' }).lean();

    res.json({
      market: {
        id: market.id,
        name: market.name,
        address: market.address,
        day: market.day,
        hours: market.hours || `${market.openingTime} — ${market.closingTime}`,
        lat: mLat,
        lng: mLng
      },
      directions: {
        distanceKm,
        estimatedTravelMinutes,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(market.address || `${mLat},${mLng}`)}`
      },
      farmersCount: farmers.length,
      farmers: farmers.map(f => ({ id: f.id, name: f.name, owner: f.owner, specialties: f.specialties }))
    });
  } catch (error) {
    console.error('Plan route error:', error);
    res.status(500).json({ message: 'Server error planning route' });
  }
};

const createOrUpdateMarket = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.name?.trim() && !req.params.id) {
      return res.status(400).json({ message: 'Enter market details and valid opening/closing schedule.' });
    }

    const marketId = req.params.id || payload.id || ('m-' + Date.now().toString(36));
    let market = await Market.findOne(byId(marketId));

    const hours = payload.hours || (payload.openingTime && payload.closingTime ? `${payload.openingTime} — ${payload.closingTime}` : (market?.hours || ''));

    if (market) {
      Object.assign(market, payload, { hours });
      await market.save();
      return res.status(200).json(market);
    } else {
      market = new Market({
        id: marketId,
        name: payload.name,
        day: payload.day || 'Saturday',
        date: payload.date || 'Weekly',
        hours: hours || '08:00 — 14:00',
        openingTime: payload.openingTime || '08:00',
        closingTime: payload.closingTime || '14:00',
        address: payload.address || 'Market Location',
        distance: payload.distance || '',
        stalls: payload.stalls || 0,
        lat: Number(payload.lat) || 0,
        lng: Number(payload.lng) || 0,
        description: payload.description || 'Local market pickup point.',
        image: payload.image || (req.file ? `/uploads/${req.file.filename}` : '')
      });
      await market.save();
      return res.status(201).json(market);
    }
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

    await Market.findOneAndDelete(byId(marketId));

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
  planRoute,
  createMarket: createOrUpdateMarket,
  updateMarket: createOrUpdateMarket,
  deleteMarket
};
