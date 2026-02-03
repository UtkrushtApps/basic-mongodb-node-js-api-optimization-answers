const mongoose = require('mongoose');

/**
 * Establish a connection to MongoDB using Mongoose.
 * Uses MONGO_URI from environment variables or falls back to local instance.
 */
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/product-catalog';

    // Use strict query to avoid unintentional query behavior
    mongoose.set('strictQuery', true);

    await mongoose.connect(uri, {
      // Options left largely default for modern Mongoose versions
      // They are kept minimal and rely on sane defaults.
    });

    // eslint-disable-next-line no-console
    console.log('✅ MongoDB connected');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

module.exports = connectDB;
