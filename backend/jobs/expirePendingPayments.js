const { runPaymentReservationExpirySweep } = require('../services/paymentReservationService');
const { logError } = require('../utils/safeErrorLog');

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const PAYMENT_EXPIRY_INTERVAL_MS = toPositiveInt(
  process.env.PAYMENT_EXPIRY_INTERVAL_MS,
  60 * 1000
);

let initialized = false;
let interval = null;

const runAndLog = async () => {
  try {
    const result = await runPaymentReservationExpirySweep();
    if (!result.skipped && (result.checked || result.failed)) {
      console.log('[payment-expiry] Sweep complete:', result);
    }
  } catch (error) {
    logError('[payment-expiry] Sweep failed:', error);
  }
};

const startPendingPaymentExpiryJob = () => {
  if (initialized) return;
  initialized = true;

  setTimeout(runAndLog, 5000).unref?.();
  interval = setInterval(runAndLog, PAYMENT_EXPIRY_INTERVAL_MS);
  interval.unref?.();
};

module.exports = {
  runNow: runAndLog,
  startPendingPaymentExpiryJob,
};
