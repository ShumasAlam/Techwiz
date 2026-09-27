const User = require('../models/User');
const Product = require('../models/Product');
const Market = require('../models/Market');
const Farmer = require('../models/Farmer');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const StockSubscription = require('../models/StockSubscription');
const Category = require('../models/Category');
const { ensureDefaultCategories } = require('./categoryController');

const getSnapshot = async (req, res) => {
  try {
    await ensureDefaultCategories();

    const [users, markets, farmers, products, reviews, orders, notifications, stockSubscriptions, categories] = await Promise.all([
      User.find({}).select('-password').lean(),
      Market.find({}).lean(),
      Farmer.find({}).lean(),
      Product.find({}).lean(),
      Review.find({}).sort({ createdAt: -1 }).lean(),
      Order.find({}).sort({ createdAt: -1 }).lean(),
      Notification.find({}).sort({ createdDate: -1, createdAt: -1 }).lean(),
      StockSubscription.find({}).lean(),
      Category.find({ isActive: true }).sort({ name: 1 }).lean()
    ]);

    const normalizedUsers = users.map(u => ({
      id: u.id || u._id.toString(),
      name: u.name || u.profile?.name || u.username,
      email: u.email,
      role: u.role,
      phone: u.phone || u.profile?.contactNumber || '',
      address: u.address || u.profile?.address?.street || '',
      farmerId: u.farmerId || (u.role === 'farmer' ? u.id : undefined),
      favorites: u.favorites || [],
      compareList: u.compareList || [],
      cart: u.cart || [],
      preferences: u.preferences || { theme: 'light', notificationsEnabled: true },
      status: u.status || (u.isActive ? 'active' : 'suspended')
    }));

    const normalizedMarkets = markets.map(m => ({
      id: m.id || m._id.toString(),
      name: m.name,
      day: m.day,
      date: m.date || 'Weekly',
      hours: m.hours || (m.openingTime ? `${m.openingTime} — ${m.closingTime}` : ''),
      openingTime: m.openingTime || '',
      closingTime: m.closingTime || '',
      address: typeof m.address === 'string' ? m.address : `${m.address?.street || ''}, ${m.address?.city || ''}`.trim().replace(/^,|,$/g, ''),
      distance: m.distance || '',
      stalls: m.stalls || m.totalFarmers || 0,
      lat: m.lat || m.location?.latitude || m.location?.coordinates?.[1] || 0,
      lng: m.lng || m.location?.longitude || m.location?.coordinates?.[0] || 0,
      description: m.description || ''
    }));

    const normalizedFarmers = farmers.map(f => ({
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
      liveLocation: f.liveLocation || '',
      lat: f.lat || 0,
      lng: f.lng || 0,
      status: f.status || 'approved',
      bio: f.bio || '',
      specialties: f.specialties || [],
      pickup: f.pickup || []
    }));

    const normalizedProducts = products.map(p => ({
      id: p.id || p._id.toString(),
      farmerId: p.farmerId,
      marketIds: p.marketIds || (p.marketId ? [p.marketId] : []),
      name: p.name,
      category: p.category,
      subcategory: p.subcategory || '',
      comparisonGroup: p.comparisonGroup || '',
      price: p.price,
      unit: p.unit || 'kg',
      stock: p.stock !== undefined ? p.stock : (p.stockQuantity || 0),
      available: p.available !== undefined ? p.available : (p.isAvailable !== false),
      image: p.image || '',
      badge: p.badge || '',
      description: p.description || '',
      rating: p.rating || p.averageRating || 0,
      reviews: p.reviews || p.totalReviews || 0,
      harvestDaysAgo: p.harvestDaysAgo || 0,
      lastUpdatedMinutesAgo: p.lastUpdatedMinutesAgo || 0,
      distanceKm: p.distanceKm || 0,
      pickupWindow: p.pickupWindow || '',
      recentlyRestocked: Boolean(p.recentlyRestocked),
      seasonal: Boolean(p.seasonal),
      popular: Boolean(p.popular),
      freshToday: Boolean(p.freshToday),
      stockedThisMorning: Boolean(p.stockedThisMorning),
      expiresInHours: p.expiresInHours || 0,
      freshWindow: Boolean(p.freshWindow)
    }));

    const normalizedReviews = reviews.map(r => ({
      id: r.id || r._id.toString(),
      productId: r.productId,
      farmerId: r.farmerId,
      orderId: r.orderId,
      customerId: r.customerId,
      customer: r.customer,
      rating: r.rating,
      comment: r.comment,
      response: r.response || r.farmerResponse || '',
      date: r.date || new Date(r.createdAt).toLocaleDateString('en-GB')
    }));

    const normalizedOrders = orders.map(o => ({
      id: o.id || o._id.toString(),
      customerId: o.customerId,
      farmerId: o.farmerId,
      marketId: o.marketId,
      pickupDate: o.pickupDate,
      pickupSlot: o.pickupSlot,
      status: o.status || o.orderStatus || 'placed',
      createdAt: o.createdAt || new Date(o.createdDate).toLocaleDateString('en-GB'),
      total: o.total !== undefined ? o.total : (o.totalAmount || 0),
      items: o.items || []
    }));

    const normalizedNotifications = notifications.map(n => ({
      id: n.id || n._id.toString(),
      userId: n.userId,
      type: n.type,
      text: n.text,
      unread: n.unread !== false,
      createdAt: n.createdAt,
      orderId: n.orderId,
      productId: n.productId
    }));

    res.json({
      users: normalizedUsers,
      markets: normalizedMarkets,
      farmers: normalizedFarmers,
      products: normalizedProducts,
      reviews: normalizedReviews,
      orders: normalizedOrders,
      notifications: normalizedNotifications,
      stockSubscriptions: stockSubscriptions.map(s => ({ userId: s.userId, productId: s.productId })),
      categories: categories.map(c => ({ id: c.id, name: c.name, slug: c.slug }))
    });
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    res.status(500).json({ message: 'Error retrieving database snapshot', error: error.message });
  }
};

module.exports = { getSnapshot };
