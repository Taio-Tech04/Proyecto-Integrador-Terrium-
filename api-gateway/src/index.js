require('dotenv').config();
const http = require('http');
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Server: SocketServer } = require('socket.io');

const config = require('./config');
const logger = require('./utils/logger');
const authMiddleware = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimit');
const { typeDefs } = require('./graphql/typeDefs');
const { resolvers } = require('./graphql/resolvers');
const healthRouter = require('./routes/health');

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  // ── Socket.io (proxy WebSocket hacia Analytics) ──────────────────────────
  const io = new SocketServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
  });

  // Cuando llega un cliente, conectamos al analytics service y re-emitimos
  io.on('connection', (clientSocket) => {
    logger.info(`🔌 WS Gateway: cliente conectado ${clientSocket.id}`);

    const { io: ioClient } = require('socket.io-client');
    const upstream = ioClient(config.ANALYTICS_URL, { transports: ['websocket', 'polling'] });

    upstream.on('heatmap:update', (data) => clientSocket.emit('heatmap:update', data));
    upstream.on('connect_error', (err) => logger.warn(`Upstream WS error: ${err.message}`));

    clientSocket.on('disconnect', () => { upstream.disconnect(); });
  });

  // ── Seguridad y utilities ──────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Rate limiting ──────────────────────────────────────────────────────────
  app.use('/api/', rateLimiter);

  // ── Health check ──────────────────────────────────────────────────────────
  app.use('/health', healthRouter);

  // ── Proxies REST ──────────────────────────────────────────────────────────
  const proxyOptions = (target) => ({
    target,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        logger.error(`Proxy error: ${err.message}`);
        res.status(502).json({ error: 'Servicio no disponible temporalmente' });
      }
    }
  });

  // Ruta de suscripciones (pública para ver planes, protegida para upgrade)
  app.get('/api/subscriptions/plans', createProxyMiddleware({ ...proxyOptions(config.USERS_URL), pathRewrite: { '^/api/subscriptions': '/subscriptions' } }));
  app.use('/api/subscriptions', authMiddleware, createProxyMiddleware({ ...proxyOptions(config.USERS_URL), pathRewrite: { '^/api/subscriptions': '/subscriptions' } }));

  // Rutas públicas (sin auth)
  app.use('/api/auth', createProxyMiddleware({ ...proxyOptions(config.USERS_URL), pathRewrite: { '^/api/auth': '/auth' } }));

  // Rutas protegidas
  app.use('/api/listings', authMiddleware, createProxyMiddleware({ ...proxyOptions(config.LISTINGS_URL), pathRewrite: { '^/api/listings': '/' } }));
  app.use('/api/valuations', authMiddleware, createProxyMiddleware({ ...proxyOptions(config.VALUATIONS_URL), pathRewrite: { '^/api/valuations': '/' } }));
  app.use('/api/analytics', authMiddleware, createProxyMiddleware({ ...proxyOptions(config.ANALYTICS_URL), pathRewrite: { '^/api/analytics': '/' } }));
  app.use('/api/notifications', authMiddleware, createProxyMiddleware({ ...proxyOptions(config.NOTIFICATIONS_URL), pathRewrite: { '^/api/notifications': '/' } }));
  app.use('/api/users', authMiddleware, createProxyMiddleware({ ...proxyOptions(config.USERS_URL), pathRewrite: { '^/api/users': '/users' } }));

  // ── GraphQL ─────────────────────────────────────────────────────────────
  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        let user = null;
        if (token) {
          try {
            const jwt = require('jsonwebtoken');
            user = jwt.verify(token, config.JWT_SECRET);
          } catch (_) {}
        }
        return { user };
      }
    })
  );

  // ── Ruta raíz ──────────────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      name: 'Terrium API Gateway',
      version: '1.0.0',
      docs: '/graphql',
      health: '/health',
      websocket: 'ws://HOST/socket.io'
    });
  });

  // ── 404 ─────────────────────────────────────────────────────────────────
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // ── Error handler ────────────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  server.listen(config.PORT, () => {
    logger.info(`🚀 Terrium API Gateway corriendo en http://localhost:${config.PORT}`);
    logger.info(`📊 GraphQL Playground: http://localhost:${config.PORT}/graphql`);
    logger.info(`🔌 WebSocket: ws://localhost:${config.PORT}/socket.io`);
  });
}

bootstrap().catch((err) => {
  console.error('Error al iniciar el gateway:', err);
  process.exit(1);
});

