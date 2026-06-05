require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const notificationRoutes = require('./routes/notification.routes');
const { connectDB } = require('./db/connection');
const { startConsumer } = require('./events/subscriber');
const logger = require('./utils/logger');
const registerHandlers = require('../../shared/utils/handlers');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(morgan('dev'));
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notifications' }));
app.use('/', notificationRoutes);
registerHandlers(app, logger);

async function start() {
  await connectDB();
  // RabbitMQ consumer en segundo plano, no bloquea el arranque
  startConsumer().catch((err) => logger.warn('RabbitMQ consumer no disponible al iniciar:', err.message));
  app.listen(PORT, () => logger.info(`🔔 Notifications Service corriendo en puerto ${PORT}`));
}
start().catch((err) => { logger.error(err); process.exit(1); });
