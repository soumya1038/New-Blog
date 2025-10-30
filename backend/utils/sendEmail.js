const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
  try {
    // Create transporter using Brevo (Sendinblue) SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_API_KEY
      }
    });

    // Send email
    await transporter.sendMail({
      from: `"Modern Blog" <${process.env.BREVO_FROM_EMAIL}>`,
      to,
      subject,
      html
    });

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
