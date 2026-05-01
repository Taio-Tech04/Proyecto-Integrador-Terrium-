require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const { connectDB } = require('./db/connection');
const { connectRabbitMQ } = require('./events/publisher');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/subscriptions', subscriptionRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'users' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function start() {
  await connectDB();
  await connectRabbitMQ();
  app.listen(PORT, () => logger.info(`👤 Users Service corriendo en puerto ${PORT}`));
}

start().catch((err) => {
  logger.error('Error al iniciar Users Service:', err);
  process.exit(1);
});

