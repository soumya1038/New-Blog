#!/usr/bin/env node

const assert = require('assert/strict');

process.env.NODE_ENV = 'production';
delete process.env.REDIS_URL;

const { scheduleJob } = require('../jobs/autoCompleteOrders');

scheduleJob()
  .then(() => {
    throw new Error('Production scheduler unexpectedly accepted missing Redis');
  })
  .catch((error) => {
    assert.match(String(error?.message || error), /requires Redis in production/);
    console.log('scheduler fail-closed smoke ok');
  });
