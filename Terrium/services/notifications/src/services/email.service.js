const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const { query } = require('../db/connection');
const logger = require('../utils/logger');

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

    await query(
      `INSERT INTO notifications (user_id, type, subject, body, status, sent_at) VALUES ($1, $2, $3, $4, 'ENVIADO', NOW())`,
      [context.userId || null, templateName, subject, html]
    );
    logger.info(`📧 Email enviado a ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Error enviando email a ${to}:`, err.message);
  }
};

module.exports = { sendEmail };
