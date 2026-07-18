#!/usr/bin/env node

const assert = require('assert/strict');

process.env.ENCRYPTION_KEY ||= 'security-smoke-encryption-key-32-chars';

const { paymentEntityMatchesOrder } = require('../services/paymentReservationService');
const { withProviderTimeout } = require('../utils/providerTimeouts');

const order = {
  total: 149.5,
  currency: 'INR',
  payment: { razorpayOrderId: 'order_expected' },
};

const validPayment = {
  id: 'pay_expected',
  order_id: 'order_expected',
  amount: 14950,
  currency: 'INR',
};

assert.equal(paymentEntityMatchesOrder(validPayment, order), true);
assert.equal(paymentEntityMatchesOrder({ ...validPayment, id: '' }, order), false);
assert.equal(paymentEntityMatchesOrder({ ...validPayment, order_id: 'order_other' }, order), false);
assert.equal(paymentEntityMatchesOrder({ ...validPayment, amount: 14949 }, order), false);
assert.equal(paymentEntityMatchesOrder({ ...validPayment, currency: 'USD' }, order), false);

const run = async () => {
  const resolved = await withProviderTimeout(Promise.resolve('ok'), 'provider', 100);
  assert.equal(resolved, 'ok');

  await assert.rejects(
    withProviderTimeout(new Promise(() => {}), 'provider', 10),
    (error) => error?.code === 'PROVIDER_TIMEOUT' && error?.statusCode === 503
  );

  console.log('payment and provider guard smoke ok');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
