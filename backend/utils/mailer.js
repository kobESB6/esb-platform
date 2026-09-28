// backend/utils/mailer.js
// Sends email through SMTP (works with any email provider).
// If SMTP isn't set up in .env, it prints the email to the terminal instead,
// so local dev never breaks.
const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

// True only when all three login settings exist.
const smtpReady = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const port = Number(SMTP_PORT) || 465;

// The "transporter" is nodemailer's connection to the mail server.
const transporter = smtpReady
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // 465 = encrypted from the start
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    console.log('\n======== EMAIL (SMTP not set up, printing instead) ========');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(text);
    console.log('==========================================================\n');
    return;
  }
  await transporter.sendMail({ from: EMAIL_FROM || SMTP_USER, to, subject, text, html });
}

module.exports = { sendEmail, smtpReady };