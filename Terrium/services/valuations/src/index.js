require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const valuationRoutes = require('./routes/valuation.routes');
const { connectDB } = require('./db/connection');
const logger = require('./utils/logger');
const registerHandlers = require('../../shared/utils/handlers');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(morgan('dev'));
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'valuations' }));
app.use('/', valuationRoutes);
registerHandlers(app, logger);

async function start() {
  await connectDB();
  app.listen(PORT, () => logger.info(`💰 Valuations Service corriendo en puerto ${PORT}`));
}
start().catch((err) => { logger.error(err); process.exit(1); });
