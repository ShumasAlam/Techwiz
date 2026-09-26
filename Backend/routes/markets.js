const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getMarkets,
  getMarketById,
  getNearbyMarkets,
  planRoute,
  createMarket,
  updateMarket,
  deleteMarket
} = require('../controllers/marketController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, 'market-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.get('/', getMarkets);
router.get('/nearby', getNearbyMarkets);
router.post('/route-plan', planRoute);
router.get('/:id', getMarketById);
router.post('/', upload.single('image'), createMarket);
router.put('/:id', upload.single('image'), updateMarket);
router.delete('/:id', deleteMarket);

module.exports = router;
