const mongoose = require('mongoose');
const Product = require('../models/Product');
const { invalidateCache } = require('../middleware/cacheMiddleware');

/**
 * Utility: parse pagination parameters from querystring with sane defaults.
 */
function parsePagination(query) {
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;

  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  if (Number.isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (Number.isNaN(limit) || limit < 1 || limit > MAX_LIMIT) limit = DEFAULT_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Utility: build MongoDB filter object from request query params.
 */
function buildProductFilter(query) {
  const filter = { isActive: true };

  if (query.category) {
    filter.category = String(query.category).toLowerCase();
  }

  const minPrice = query.minPrice != null ? Number(query.minPrice) : undefined;
  const maxPrice = query.maxPrice != null ? Number(query.maxPrice) : undefined;

  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    filter.price = {};
    if (!Number.isNaN(minPrice)) {
      filter.price.$gte = minPrice;
    }
    if (!Number.isNaN(maxPrice)) {
      filter.price.$lte = maxPrice;
    }
  }

  if (query.tags) {
    // Expecting comma-separated list of tags
    const tags = String(query.tags)
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tags.length > 0) {
      filter.tags = { $in: tags };
    }
  }

  if (query.search) {
    // Use text index when available
    filter.$text = { $search: String(query.search) };
  }

  return filter;
}

/**
 * Utility: map a sort query parameter to a safe Mongo sort object.
 */
function parseSort(sortParam) {
  if (!sortParam) {
    return { createdAt: -1 }; // newest first
  }

  const field = String(sortParam).trim();

  const direction = field.startsWith('-') ? -1 : 1;
  const cleanField = field.replace(/^-/, '');

  // Whitelist of sortable fields
  const allowed = new Set(['price', 'createdAt', 'rating', 'name']);
  if (!allowed.has(cleanField)) {
    return { createdAt: -1 };
  }

  return { [cleanField]: direction };
}

/**
 * GET /api/products
 * List products with basic filtering, text search, sorting and pagination.
 *
 * Optimizations:
 * - Query filters mapped directly to MongoDB (no in-memory filtering)
 * - Uses projection to avoid large fields (description, reviews) in list views
 * - Uses .lean() for faster read performance on large result sets
 * - Returns paginated results with total count, not full collection
 */
async function getProducts(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = buildProductFilter(req.query);
    const sort = parseSort(req.query.sort);

    // Projection for list views: return only necessary fields
    const projection = {
      name: 1,
      slug: 1,
      shortDescription: 1,
      price: 1,
      category: 1,
      rating: 1,
      numReviews: 1,
      thumbnailUrl: 1,
      stock: 1,
      isActive: 1,
      createdAt: 1,
    };

    const [items, total] = await Promise.all([
      Product.find(filter, projection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/products/:id
 * Fetch a single product by its MongoDB ObjectId.
 * Returns full product including description and reviews for detail pages.
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const product = await Product.findById(id).lean().exec();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.json(product);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/products
 * Create a new product.
 * Basic input validation is applied for required fields.
 */
async function createProduct(req, res, next) {
  try {
    const {
      name,
      slug,
      price,
      category,
      shortDescription,
      description,
      imageUrl,
      thumbnailUrl,
      tags,
      stock,
    } = req.body || {};

    if (!name || !slug || price == null || !category) {
      return res.status(400).json({
        message: 'name, slug, price and category are required',
      });
    }

    const payload = {
      name,
      slug,
      price,
      category,
      shortDescription,
      description,
      imageUrl,
      thumbnailUrl,
      tags,
      stock,
    };

    const product = await Product.create(payload);

    // Invalidate cache so subsequent reads see the new product
    invalidateCache();

    return res.status(201).json(product);
  } catch (err) {
    // Duplicate slug or other validation errors
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Slug must be unique' });
    }
    return next(err);
  }
}

/**
 * PUT /api/products/:id
 * Update an existing product.
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const updates = req.body || {};

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    invalidateCache();

    return res.json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Slug must be unique' });
    }
    return next(err);
  }
}

/**
 * DELETE /api/products/:id
 * Remove a product permanently.
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const deleted = await Product.findByIdAndDelete(id).lean().exec();

    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }

    invalidateCache();

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
