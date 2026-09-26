const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Farmer = require('../models/Farmer');

const JWT_SECRET = process.env.JWT_SECRET || 'marketlink-secret-key-2024';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

const byId = (id) => mongoose.isValidObjectId(id) ? { $or: [{ id }, { _id: id }] } : { id };

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

const register = async (req, res) => {
  try {
    const { name, username, email, password, role, phone, address, businessName } = req.body;

    const userEmail = email ? email.toLowerCase().trim() : '';
    const existingUser = await User.findOne({ email: userEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const userId = 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const farmerId = (role === 'farmer') ? ('f-' + Date.now().toString(36)) : undefined;

    const user = new User({
      id: userId,
      username: username || (email ? email.split('@')[0] : userId),
      name: name || username || 'User',
      email: userEmail,
      password,
      role: role || 'customer',
      phone: phone || '',
      address: address || '',
      farmerId: farmerId || null,
      favorites: [],
      status: role === 'farmer' ? 'pending' : 'active',
      isActive: true,
      profile: {
        name: name || username || 'User',
        contactNumber: phone || '',
        address: typeof address === 'object' ? address : { street: address || '' }
      }
    });

    await user.save();

    if (role === 'farmer') {
      const farmer = new Farmer({
        id: farmerId,
        userId: user.id,
        name: businessName || user.name || 'New Farm',
        owner: user.name || user.username,
        initials: (user.name || 'NF').slice(0, 2).toUpperCase(),
        marketIds: [],
        rating: 0,
        reviews: 0,
        years: 0,
        status: 'pending',
        bio: 'New to MarketLink.',
        specialties: [],
        pickup: []
      });
      await farmer.save();
    }

    const token = generateToken(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      farmerId: user.farmerId,
      favorites: user.favorites || [],
      status: user.status
    };

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    if (user.status === 'suspended' || user.isActive === false) {
      return res.status(403).json({ message: 'This account is suspended. Contact MarketLink support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    const token = generateToken(user.id || user._id.toString());

    const safeUser = {
      id: user.id || user._id.toString(),
      name: user.name || user.profile?.name || user.username,
      email: user.email,
      role: user.role,
      phone: user.phone || user.profile?.contactNumber || '',
      address: user.address || user.profile?.address?.street || '',
      farmerId: user.farmerId,
      favorites: user.favorites || [],
      status: user.status || 'active'
    };

    res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findOne(byId(req.user.id || req.user._id)).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findOne(byId(req.user.id || req.user._id));
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (updates.name) user.name = updates.name;
    if (updates.phone) user.phone = updates.phone;
    if (updates.address) user.address = updates.address;
    if (updates.favorites) user.favorites = updates.favorites;

    await user.save();
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        farmerId: user.farmerId,
        favorites: user.favorites,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
