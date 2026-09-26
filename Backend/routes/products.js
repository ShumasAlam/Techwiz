const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFarmerProducts
} = require('../controllers/productController');

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

router.get('/', getProducts);

router.get('/:id', getProductById);

router.post('/', auth, authorize('farmer'), upload.single('image'), createProduct);

router.put('/:id', auth, authorize('farmer', 'admin'), upload.single('image'), updateProduct);

router.delete('/:id', auth, authorize('farmer', 'admin'), deleteProduct);

router.get('/farmer/my-products', auth, authorize('farmer'), getFarmerProducts);

module.exports = router;
