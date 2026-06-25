const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const { query } = require('../db/connection');
const logger = require('../utils/logger');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT) || 2525,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const sendEmail = async (to, subject, templateName, context) => {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
    const templateSource = fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, 'utf8')
      : `<p>{{message}}</p>`;
    const template = Handlebars.compile(templateSource);
    const html = template(context);

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@terrium.ar',
      to, subject, html
    });

    // user_id es FK uuid a usuario: si el evento no trae un UUID válido, persistimos null
    const userId = UUID_RE.test(context.userId || '') ? context.userId : null;
    await query(
      `INSERT INTO notificacion (user_id, type, subject, body, status, sent_at) VALUES ($1, $2, $3, $4, 'ENVIADO', NOW())`,
      [userId, templateName, subject, html]
    );
    logger.info(`📧 Email enviado a ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Error enviando email a ${to}:`, err.message);
  }
};

module.exports = { sendEmail };
