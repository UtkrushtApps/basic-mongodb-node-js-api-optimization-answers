const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Embedded review schema. Kept lean (no nested arrays) to avoid huge documents.
 */
const reviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

/**
 * Product schema optimized for typical catalog use cases.
 * - Indexes on category, price, and activity status for filtering
 * - Text index for search on name/description
 * - Summary fields (rating, numReviews, thumbnailUrl) for list views
 */
const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      // Long description; we avoid loading this for list views
    },
    shortDescription: {
      type: String,
      trim: true,
      // Lightweight summary sent in list endpoints instead of full description
    },
    category: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    imageUrl: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
      // Prefer sending this in list responses instead of full-size image URL
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index used when filtering/sorting by category and price
productSchema.index({ category: 1, price: 1 });

// Common catalog use case: active products by category
productSchema.index({ isActive: 1, category: 1 });

// Text index to accelerate basic search queries on name/description
productSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
