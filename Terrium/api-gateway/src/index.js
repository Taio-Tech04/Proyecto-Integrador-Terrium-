require('dotenv').config();
const http = require('http');
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
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

  // Socket.io — proxy de eventos hacia el servicio Analytics
  const io = new SocketServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (clientSocket) => {
    logger.info(`WS Gateway: cliente conectado ${clientSocket.id}`);
    const { io: ioClient } = require('socket.io-client');
    const upstream = ioClient(config.ANALYTICS_URL, { transports: ['websocket', 'polling'] });
    upstream.on('heatmap:update', (data) => clientSocket.emit('heatmap:update', data));
    upstream.on('connect_error', (err) => logger.warn(`Upstream WS error: ${err.message}`));
    clientSocket.on('disconnect', () => upstream.disconnect());
  });

  // Middleware
  app.set('trust proxy', 1); // Nginx es el proxy en frente
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/', rateLimiter);
  app.use('/health', healthRouter);

  // Proxy REST
  const proxyOptions = (target) => ({
    target,
    changeOrigin: true,
    on: {
      // fixRequestBody re-adjunta el body al proxy request
      // Necesario en http-proxy-middleware v3 cuando express.json() ya leyó el body
      proxyReq: fixRequestBody,
      error: (err, req, res) => {
        logger.error(`Proxy error: ${err.message}`);
        res.status(502).json({ error: 'Servicio no disponible temporalmente' });
      }
    }
  });

  // Rutas públicas
  // NOTA: Express stripea el prefijo antes del proxy, así que pathRewrite 
  // solo necesita agregar el prefijo del servicio destino
  app.get('/api/subscriptions/plans',
    createProxyMiddleware({ ...proxyOptions(config.USERS_URL), pathRewrite: { '^/': '/subscriptions/' } }));
  app.use('/api/auth',
    createProxyMiddleware({ ...proxyOptions(config.USERS_URL), pathRewrite: { '^/': '/auth/' } }));

  // Rutas protegidas
  app.use('/api/subscriptions', authMiddleware,
    createProxyMiddleware({ ...proxyOptions(config.USERS_URL), pathRewrite: { '^/': '/subscriptions/' } }));
  app.use('/api/listings', authMiddleware,
    createProxyMiddleware({ ...proxyOptions(config.LISTINGS_URL), pathRewrite: { '^/': '/' } }));
  app.use('/api/valuations', authMiddleware,
    createProxyMiddleware({ ...proxyOptions(config.VALUATIONS_URL), pathRewrite: { '^/': '/' } }));
  app.use('/api/analytics', authMiddleware,
    createProxyMiddleware({ ...proxyOptions(config.ANALYTICS_URL), pathRewrite: { '^/': '/' } }));
  app.use('/api/notifications', authMiddleware,
    createProxyMiddleware({ ...proxyOptions(config.NOTIFICATIONS_URL), pathRewrite: { '^/': '/' } }));
  app.use('/api/users', authMiddleware,
    createProxyMiddleware({ ...proxyOptions(config.USERS_URL), pathRewrite: { '^/': '/users/' } }));

  // GraphQL
  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  app.use('/graphql', cors(), express.json(), expressMiddleware(apolloServer, {
    context: async ({ req }) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      let user = null;
      if (token) {
        try { const jwt = require('jsonwebtoken'); user = jwt.verify(token, config.JWT_SECRET); } catch (_) {}
      }
      return { user };
    }
  }));

  app.get('/', (req, res) => res.json({ name: 'Terrium API Gateway', version: '1.0.0', docs: '/graphql', health: '/health' }));

  // 404 handler
  app.use(( /** @type {any} */ req, /** @type {import('express').Response} */ res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // Error handler (4 parámetros requeridos por Express para que lo reconozca como error handler)
  // noinspection JSUnusedLocalSymbols
  app.use((/** @type {any} */ err, /** @type {any} */ _req, /** @type {import('express').Response} */ res, /** @type {import('express').NextFunction} */ _next) => {
    logger.error(err instanceof Error ? err.stack : String(err));
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  server.listen(config.PORT, () => {
    logger.info(`API Gateway: http://localhost:${config.PORT}`);
    logger.info(`GraphQL:     http://localhost:${config.PORT}/graphql`);
    logger.info(`WebSocket:   ws://localhost:${config.PORT}/socket.io`);
  });
}

bootstrap().catch((err) => { logger.error(err); process.exit(1); });
