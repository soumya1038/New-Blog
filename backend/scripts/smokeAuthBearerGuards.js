#!/usr/bin/env node

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-that-is-at-least-32-chars';

const assert = require('assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  adminAuth,
  adminOrCoAdminAuth,
  optionalAuth,
  protect,
} = require('../middleware/auth');

const originals = {
  jwtVerify: jwt.verify,
  userFindById: User.findById,
};

const state = {
  jwtCalls: 0,
  userFindCalls: 0,
  nextCalls: 0,
};

const resetState = () => {
  state.jwtCalls = 0;
  state.userFindCalls = 0;
  state.nextCalls = 0;
};

const makeReq = (authorization) => ({
  headers: authorization === undefined ? {} : { authorization },
});

const makeRes = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const invoke = async (middleware, authorization) => {
  const req = makeReq(authorization);
  const res = makeRes();
  await middleware(req, res, () => {
    state.nextCalls += 1;
  });
  return { req, res };
};

jwt.verify = (token) => {
  state.jwtCalls += 1;
  assert.equal(token, 'aaa.bbb.ccc');
  return {
    id: '64f000000000000000000001',
    tokenType: 'access',
    authVersion: 2,
  };
};

User.findById = (userId) => {
  state.userFindCalls += 1;
  assert.equal(String(userId), '64f000000000000000000001');
  return {
    select() {
      return {
        maxTimeMS() {
          return Promise.resolve({
            _id: userId,
            role: 'admin',
            authVersion: 2,
            isActive: true,
            isSeller: true,
          });
        },
      };
    },
  };
};

const assertProtectedRejectsBeforeJwt = async (authorization, label) => {
  resetState();
  const { res } = await invoke(protect, authorization);
  assert.equal(res.statusCode, 401, label);
  assert.equal(state.jwtCalls, 0, `${label}: jwt.verify not called`);
  assert.equal(state.userFindCalls, 0, `${label}: user lookup not called`);
  assert.equal(state.nextCalls, 0, `${label}: next not called`);
};

const run = async () => {
  await assertProtectedRejectsBeforeJwt(undefined, 'missing bearer is rejected');
  await assertProtectedRejectsBeforeJwt('Bearer aaa.bbb', 'two-part token is rejected');
  await assertProtectedRejectsBeforeJwt('Bearer aaa.bbb.ccc ddd', 'token with whitespace is rejected');
  await assertProtectedRejectsBeforeJwt('Bearer aaa.bbb.ccc\r\nx', 'token with control line break is rejected');
  await assertProtectedRejectsBeforeJwt(`Bearer ${'a'.repeat(9000)}.bbb.ccc`, 'overlong token is rejected');

  resetState();
  const protectedResult = await invoke(protect, 'Bearer aaa.bbb.ccc');
  assert.equal(protectedResult.res.statusCode, 200, 'compact token reaches protected path');
  assert.equal(state.jwtCalls, 1, 'compact token calls jwt.verify');
  assert.equal(state.userFindCalls, 1, 'compact token loads user');
  assert.equal(state.nextCalls, 1, 'compact token calls next');

  const originalVerify = jwt.verify;
  jwt.verify = () => ({
    id: '64f000000000000000000001',
    tokenType: 'access',
    authVersion: 1,
  });
  resetState();
  const staleResult = await invoke(protect, 'Bearer aaa.bbb.ccc');
  assert.equal(staleResult.res.statusCode, 401, 'stale credential version is rejected');
  assert.equal(state.nextCalls, 0, 'stale credential version does not call next');
  jwt.verify = originalVerify;

  resetState();
  const optionalResult = await invoke(optionalAuth, 'Bearer aaa.bbb.ccc ddd');
  assert.equal(optionalResult.res.statusCode, 200, 'optional auth tolerates malformed token');
  assert.equal(optionalResult.req.user, undefined, 'optional auth does not attach user for malformed token');
  assert.equal(state.jwtCalls, 0, 'optional malformed token does not call jwt.verify');
  assert.equal(state.nextCalls, 1, 'optional malformed token calls next');

  resetState();
  await invoke(adminAuth, 'Bearer aaa.bbb.ccc');
  assert.equal(state.nextCalls, 1, 'admin auth accepts compact token for admin user');

  resetState();
  await invoke(adminOrCoAdminAuth, 'Bearer aaa.bbb.ccc');
  assert.equal(state.nextCalls, 1, 'admin/coadmin auth accepts compact token for admin user');

  console.log('auth bearer guard smoke ok');
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    jwt.verify = originals.jwtVerify;
    User.findById = originals.userFindById;
  });
