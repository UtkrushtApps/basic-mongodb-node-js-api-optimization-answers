const http = require('http');
const dotenv = require('dotenv');
const app = require('./app');
const connectDB = require('./config/db');

dotenv.config();

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
