const amqplib = require('amqplib');
const logger = require('../utils/logger');

let channel = null;

const connectRabbitMQ = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqplib.connect(process.env.AMQP_URL || 'amqp://localhost');
      channel = await conn.createChannel();
      await channel.assertExchange('listings', 'topic', { durable: true });
      logger.info('✅ Conectado a RabbitMQ (listings)');
      return;
    } catch {
      logger.warn(`RabbitMQ no disponible, reintentando (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};

const publish = async (exchange, routingKey, payload) => {
  if (!channel) return;
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
  logger.info(`📤 Evento: ${exchange}.${routingKey}`);
};

module.exports = { connectRabbitMQ, publish };

