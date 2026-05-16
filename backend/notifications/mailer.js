const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'password'
  }
});

const sendMail = async ({ to, subject, text }) => {
  if (process.env.EMAIL_ENABLED !== 'true') {
    console.log('--- EMAIL SIMULATION ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);
    console.log('------------------------');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: '"GoalPulse" <noreply@goalpulse.demo>',
      to,
      subject,
      text
    });
    console.log(`Email sent: ${info.messageId}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
};

module.exports = { sendMail };
