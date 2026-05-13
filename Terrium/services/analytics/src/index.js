require('dotenv').config();
const http = require('http');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { Server } = require('socket.io');
const cron = require('node-cron');
const analyticsRoutes = require('./routes/analytics.routes');
const { connectDB, query } = require('./db/connection');
const logger = require('./utils/logger');
const { startSyncJob } = require('./jobs/cabaSync');
const { CABA_COORDS } = require('./utils/constants');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3003;


// Socket.io
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000
});

io.on('connection', (socket) => {
  logger.info(`WS Analytics: cliente ${socket.id}`);
  socket.on('disconnect', () => logger.info(`WS Analytics: desconectado ${socket.id}`));
});

app.set('io', io);

// Broadcast heatmap cada 30 segundos
async function broadcastHeatmap() {
  try {
    if (io.engine.clientsCount === 0) return;
    const { rows } = await query(
      `SELECT DISTINCT ON (neighborhood) neighborhood, avg_price_usd_m2
       FROM market_metrics ORDER BY neighborhood, year DESC, month DESC`
    );
    const points = [];
    rows.forEach((r) => {
      const coords = CABA_COORDS[r.neighborhood] || { lat: -34.6, lng: -58.45 };
      const intensity = Math.min(parseFloat(r.avg_price_usd_m2) / 5500, 1);
      points.push({ lat: coords.lat, lng: coords.lng, intensity, neighborhood: r.neighborhood, avgPriceUsdM2: parseFloat(r.avg_price_usd_m2) });
      for (let i = 0; i < 5; i++) {
        points.push({
          lat: coords.lat + (Math.random() * 0.012 - 0.006),
          lng: coords.lng + (Math.random() * 0.012 - 0.006),
          intensity: intensity * (0.7 + Math.random() * 0.3),
          neighborhood: r.neighborhood,
          avgPriceUsdM2: parseFloat(r.avg_price_usd_m2)
        });
      }
    });
    io.emit('heatmap:update', points);
  } catch (err) {
    logger.error('broadcastHeatmap:', err.message);
  }
}

cron.schedule('*/30 * * * * *', broadcastHeatmap);

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/', analyticsRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'analytics', wsClients: io.engine.clientsCount }));
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, _req, res, _next) => { logger.error(err instanceof Error ? err.stack : String(err)); res.status(500).json({ error: 'Error interno' }); });

async function start() {
  await connectDB();
  startSyncJob();
  server.listen(PORT, () => logger.info(`Analytics Service: puerto ${PORT}`));
}
start().catch((err) => { logger.error(err); process.exit(1); });
