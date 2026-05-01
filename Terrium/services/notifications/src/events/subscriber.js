const amqplib = require('amqplib');
const { sendEmail } = require('../services/email.service');
const logger = require('../utils/logger');

const startConsumer = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqplib.connect(process.env.AMQP_URL || 'amqp://localhost');
      const channel = await conn.createChannel();

      await channel.assertExchange('users', 'topic', { durable: true });
      const { queue: usersQ } = await channel.assertQueue('notifications.users', { durable: true });
      await channel.bindQueue(usersQ, 'users', 'user.registered');
      await channel.bindQueue(usersQ, 'users', 'subscription.upgraded');

      channel.consume(usersQ, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          logger.info(`📨 Evento recibido: ${routingKey}`);

          if (routingKey === 'user.registered') {
            await sendEmail(event.email, '¡Bienvenido a Terrium!', 'welcome', {
              name: event.name, userId: event.userId
            });
          } else if (routingKey === 'subscription.upgraded') {
            await sendEmail(event.email || 'usuario@terrium.ar', `Tu suscripción ${event.tier} está activa`, 'subscription', {
              tier: event.tier, userId: event.userId
            });
          }
          channel.ack(msg);
        } catch (err) {
          logger.error('Error procesando evento:', err);
          channel.nack(msg, false, false);
        }
      });

      logger.info('✅ Conectado a RabbitMQ como consumidor (notifications)');
      return;
    } catch (err) {
      logger.warn(`RabbitMQ no disponible, reintentando (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  logger.error('No se pudo conectar a RabbitMQ (notifications)');
};

module.exports = { startConsumer };

