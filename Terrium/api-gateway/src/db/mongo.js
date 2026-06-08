const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://terrium:terrium_secret@mongodb:27017/terrium_favorites?authSource=admin';

async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URL);
    logger.info('MongoDB conectado (favoritos)');
  } catch (err) {
    logger.warn(`MongoDB no disponible: ${err.message} — favoritos desactivados`);
  }
}

module.exports = { connectMongo };
