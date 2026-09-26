const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getMarkets,
  getMarketById,
  createMarket,
  updateMarket,
  deleteMarket,
  getNearbyMarkets
} = require('../controllers/marketController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Images only (jpeg, jpg, png, gif, webp)'));
  }
});

router.get('/', getMarkets);
router.get('/nearby', getNearbyMarkets);
router.get('/:id', getMarketById);
router.post('/', upload.single('image'), createMarket);
router.put('/:id', upload.single('image'), updateMarket);
router.delete('/:id', deleteMarket);

module.exports = router;
