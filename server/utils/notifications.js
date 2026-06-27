const nodemailer = require('nodemailer');

// Create reusable transporter
// If SMTP credentials are provided, use them; otherwise, log to console
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  return null;
};

/**
 * Send a transaction notification email.
 * Falls back to console logging if SMTP is not configured.
 */
const sendTransactionEmail = async (recipientEmail, details) => {
  const { type, amount, description, counterpartyName, status, accountNumber } = details;

  const subject = type === 'credit'
    ? `₹${amount.toLocaleString('en-IN')} Credited to your VaultBank Account`
    : `₹${amount.toLocaleString('en-IN')} Debited from your VaultBank Account`;

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0D9668, #0B7D56); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">VaultBank</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Transaction Alert</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #E8ECF1; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="background: ${type === 'credit' ? '#ECFDF5' : '#FEF2F2'}; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #6B7280;">${type === 'credit' ? 'Amount Credited' : 'Amount Debited'}</p>
          <h2 style="margin: 4px 0 0; color: ${type === 'credit' ? '#0D9668' : '#DC2626'}; font-size: 28px;">
            ${type === 'credit' ? '+' : '-'}₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Account</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">••••${accountNumber?.slice(-4) || 'XXXX'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">${type === 'credit' ? 'From' : 'To'}</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${counterpartyName || 'VaultBank'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Description</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${description || 'Fund Transfer'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Status</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${status === 'completed' ? '#0D9668' : '#F59E0B'};">
              ${(status || 'completed').toUpperCase()}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Date & Time</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">
              ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #E8ECF1; margin: 16px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; margin: 0; text-align: center;">
          If you did not authorize this transaction, please contact VaultBank support immediately.
        </p>
      </div>
    </div>
  `;

  const transport = getTransporter();

  if (transport) {
    try {
      await transport.sendMail({
        from: `"VaultBank" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject,
        html,
      });
      console.log(`[EMAIL] Transaction notification sent to ${recipientEmail}`);
    } catch (err) {
      console.error(`[EMAIL] Failed to send to ${recipientEmail}:`, err.message);
    }
  } else {
    console.log(`[EMAIL-LOG] Would send to: ${recipientEmail}`);
    console.log(`[EMAIL-LOG] Subject: ${subject}`);
    console.log(`[EMAIL-LOG] ${type === 'credit' ? 'Credited' : 'Debited'}: ₹${amount} | ${description || 'Transfer'}`);
  }
};

/**
 * Send a mandate deduction notification.
 */
const sendMandateEmail = async (recipientEmail, details) => {
  const { merchantName, amount, accountNumber, nextDate } = details;

  const subject = `VaultBank: Auto-debit of ₹${amount.toLocaleString('en-IN')} for ${merchantName}`;

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">VaultBank</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Auto-Debit Alert</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #E8ECF1; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 14px; color: #1A1D26; margin: 0 0 16px;">
          An automatic payment has been processed from your account:
        </p>
        <div style="background: #EFF6FF; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; color: #6B7280;">Merchant: <strong>${merchantName}</strong></p>
          <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #3B82F6;">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
        <p style="font-size: 13px; color: #6B7280; margin: 0;">
          Account: ••••${accountNumber?.slice(-4) || 'XXXX'}<br/>
          ${nextDate ? `Next deduction: ${new Date(nextDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : 'This was a one-time deduction.'}
        </p>
        <hr style="border: none; border-top: 1px solid #E8ECF1; margin: 16px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; margin: 0; text-align: center;">
          You can manage your mandates from the VaultBank dashboard.
        </p>
      </div>
    </div>
  `;

  const transport = getTransporter();

  if (transport) {
    try {
      await transport.sendMail({
        from: `"VaultBank" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject,
        html,
      });
      console.log(`[EMAIL] Mandate notification sent to ${recipientEmail}`);
    } catch (err) {
      console.error(`[EMAIL] Failed to send mandate notification to ${recipientEmail}:`, err.message);
    }
  } else {
    console.log(`[EMAIL-LOG] Mandate deduction: ₹${amount} for ${merchantName} → ${recipientEmail}`);
  }
};

/**
 * SMS notification placeholder — logs to console.
 * Replace with Twilio or similar service when ready.
 */
const sendTransactionSMS = async (phone, message) => {
  if (!phone) return;
  console.log(`[SMS-LOG] To: ${phone} | Message: ${message}`);
  // Integrate Twilio here:
  // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  // await twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: phone });
};

module.exports = { sendTransactionEmail, sendTransactionSMS, sendMandateEmail };
