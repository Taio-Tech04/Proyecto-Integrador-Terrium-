require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const passport = require('passport');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const { connectDB } = require('./db/connection');
const { connectRabbitMQ } = require('./events/publisher');
const logger = require('./utils/logger');
const registerHandlers = require('../../shared/utils/handlers');
const { configureGoogleOAuth } = require('./config/googleOAuth');

const app = express();
const PORT = process.env.PORT || 3005;

// Inicializar estrategia Google OAuth (solo si las credenciales están configuradas)
configureGoogleOAuth();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Health check — antes de rutas para garantizar que siempre sea accesible
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'users' }));

// Rutas
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/subscriptions', subscriptionRoutes);


// 404 + Error handler
registerHandlers(app, logger, 'Error interno del servidor');

async function start() {
  await connectDB();
  // RabbitMQ se conecta en segundo plano, no bloquea el arranque
  connectRabbitMQ().catch((err) => logger.warn('RabbitMQ no disponible al iniciar:', err.message));
  app.listen(PORT, () => logger.info(`👤 Users Service corriendo en puerto ${PORT}`));
}

start().catch((err) => {
  logger.error('Error al iniciar Users Service:', err);
  process.exit(1);
});
