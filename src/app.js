const express = require('express');
const morgan = require('morgan');
const productRoutes = require('./routes/productRoutes');

const app = express();

// Parse JSON payloads
app.use(express.json());

// Basic request logging; can be disabled in tests
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/products', productRoutes);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);

  if (res.headersSent) {
    return res.end();
  }

  const status = err.statusCode || 500;

  return res.status(status).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
