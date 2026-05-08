const twilio = require('twilio');
const logger = require('../utils/logger');
const { NODE_ENV, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = require('../config/env');

/**
 * @param {string} mobileNumber
 * @returns {string} E.164 or empty if invalid
 */
function formatToE164(mobileNumber) {
  const s = String(mobileNumber || '').trim();
  if (!s) return '';
  if (s.startsWith('+')) {
    const rest = s.slice(1).replace(/\D/g, '');
    return rest ? `+${rest}` : '';
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return '';
}

function isTwilioConfigured() {
  return Boolean(
    TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER
  );
}

/**
 * Send an SMS. In development without Twilio env, logs and returns without sending.
 * @throws {Error} In production when Twilio is not configured or the API fails.
 */
async function sendSms(mobileNumber, body) {
  const to = formatToE164(mobileNumber);
  if (!to || to.replace(/\D/g, '').length < 10) {
    throw new Error('Invalid phone number for SMS');
  }

  if (!isTwilioConfigured()) {
    if (NODE_ENV === 'production') {
      throw new Error(
        'SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.'
      );
    }
    logger.warn(`[Twilio not configured] SMS to ${to}: ${body}`);
    return { skipped: true };
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body,
    from: TWILIO_PHONE_NUMBER,
    to,
  });
  logger.info(`Twilio SMS sent to ${to}`);
  return { sent: true };
}

module.exports = {
  formatToE164,
  isTwilioConfigured,
  sendSms,
};
