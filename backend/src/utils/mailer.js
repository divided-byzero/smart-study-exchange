const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    console.warn('⚠️  SMTP not configured — OTP codes will be logged to console instead of emailed.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(toEmail, otp) {
  const t = getTransporter();

  if (!t) {
    // Dev fallback so the flow is still testable without SMTP configured.
    console.log(`📧 [DEV MODE] OTP for ${toEmail}: ${otp}`);
    return;
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || '"Smart Study Exchange" <no-reply@smartstudyexchange.app>',
    to: toEmail,
    subject: 'Verify your Smart Study Exchange account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Verify your email</h2>
        <p>Your one-time verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

module.exports = { generateOtp, sendOtpEmail };
