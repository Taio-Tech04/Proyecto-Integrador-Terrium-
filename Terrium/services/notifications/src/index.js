require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const notificationRoutes = require('./routes/notification.routes');
const { connectDB } = require('./db/connection');
const { startConsumer } = require('./events/subscriber');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(morgan('dev'));
app.use(express.json());
app.use('/', notificationRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notifications' }));
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => { logger.error(err.stack); res.status(500).json({ error: 'Error interno' }); });

async function start() {
  await connectDB();
  await startConsumer();
  app.listen(PORT, () => logger.info(`🔔 Notifications Service corriendo en puerto ${PORT}`));
}
start().catch((err) => { logger.error(err); process.exit(1); });

