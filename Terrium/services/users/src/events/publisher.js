const amqplib = require('amqplib');
const logger = require('../utils/logger');

let channel = null;

const connectRabbitMQ = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqplib.connect(process.env.AMQP_URL || 'amqp://localhost');
      channel = await conn.createChannel();
      await channel.assertExchange('users', 'topic', { durable: true });
      logger.info('✅ Conectado a RabbitMQ (users)');
      return;
    } catch (err) {
      logger.warn(`RabbitMQ no disponible, reintentando (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  logger.error('No se pudo conectar a RabbitMQ después de varios intentos');
};

const publish = async (exchange, routingKey, payload) => {
  if (!channel) {
    logger.warn('RabbitMQ channel no disponible, omitiendo evento');
    return;
  }
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
  logger.info(`📤 Evento publicado: ${exchange}.${routingKey}`);
};

module.exports = { connectRabbitMQ, publish };
