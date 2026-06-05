require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const listingRoutes = require('./routes/listing.routes');
const { connectDB } = require('./db/connection');
const { connectRabbitMQ } = require('./events/publisher');
const logger = require('./utils/logger');
const registerHandlers = require('../../shared/utils/handlers');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'listings' }));
app.use('/', listingRoutes);
registerHandlers(app, logger);

async function start() {
  await connectDB();
  // RabbitMQ en segundo plano, no bloquea el arranque
  connectRabbitMQ().catch((err) => logger.warn('RabbitMQ no disponible al iniciar:', err.message));
  app.listen(PORT, () => logger.info(`🏠 Listings Service corriendo en puerto ${PORT}`));
}

start().catch((err) => { logger.error(err); process.exit(1); });
