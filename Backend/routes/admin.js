const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  updateFarmerStatus,
  updateUserStatus,
  getAllUsers
} = require('../controllers/adminController');

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.patch('/farmers/:id', updateFarmerStatus);
router.put('/farmers/:id', updateFarmerStatus);
router.patch('/users/:id', updateUserStatus);
router.put('/users/:id', updateUserStatus);

module.exports = router;
