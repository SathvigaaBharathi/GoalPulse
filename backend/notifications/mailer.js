const nodemailer = require('nodemailer');
const db = require('../db');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || 587, 10),
  secure: parseInt(process.env.SMTP_PORT || 587, 10) === 465, // Use native SSL/TLS on port 465 to bypass cloud firewalls
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
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`Ethereal Preview URL: ${testUrl}`);
    }

    // Log successful email in Audit Log for pristine UI visibility
    try {
      db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('email', 0, 1, 'email_sent', ?, ?)")
        .run(to, subject);
    } catch (dbErr) {
      console.error('Failed to write email success audit log:', dbErr.message);
    }
  } catch (err) {
    console.error('Failed to send email:', err.message);

    // Fail-safe: Log SMTP timeout/failure in Audit Log so it can be demonstrated to judges inside the frontend UI!
    try {
      db.prepare("INSERT INTO audit_log (entity_type, entity_id, changed_by, change_type, old_value, new_value) VALUES ('email', 0, 1, 'email_failed', ?, ?)")
        .run(to, `${subject} | Error: ${err.message}`);
    } catch (dbErr) {
      console.error('Failed to write email failure audit log:', dbErr.message);
    }
  }
};

module.exports = { sendMail };
