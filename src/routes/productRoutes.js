const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();

// List products with caching & pagination
router.get('/', cacheMiddleware(30), getProducts);

// Product detail with slightly longer cache TTL
router.get('/:id', cacheMiddleware(60), getProductById);

// CRUD operations (no caching; these clear cache behind the scenes)
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
