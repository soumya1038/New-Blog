#!/usr/bin/env node

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-that-is-at-least-32-chars';

const assert = require('assert/strict');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const cloudinary = require('../utils/cloudinary');
const { getDownloadUrl } = require('../controllers/paymentController');

const ids = {
  order: new mongoose.Types.ObjectId(),
  buyer: new mongoose.Types.ObjectId(),
  otherBuyer: new mongoose.Types.ObjectId(),
  product: new mongoose.Types.ObjectId(),
  otherProduct: new mongoose.Types.ObjectId(),
};

const originals = {
  orderFindOne: Order.findOne,
  orderUpdateOne: Order.updateOne,
  productFindById: Product.findById,
  privateDownloadUrl: cloudinary.utils.private_download_url,
};

const state = {};

const resetState = ({
  order = makeOrder(),
  product = makeProduct(),
  updateResult = { modifiedCount: 1 },
} = {}) => {
  state.order = order;
  state.product = product;
  state.updateResult = updateResult;
  state.orderFindCalls = [];
  state.productFindCalls = [];
  state.productSelects = [];
  state.updateCalls = [];
  state.signedCalls = [];
};

const makeOrder = (overrides = {}) => ({
  _id: ids.order,
  buyerId: ids.buyer,
  status: 'paid',
  items: [{ productId: ids.product, type: 'digital' }],
  downloads: [],
  ...overrides,
});

const makeProduct = (overrides = {}) => ({
  _id: ids.product,
  title: 'Downloadable Pack',
  digital: {
    filePublicId: 'lekhon/digital-files/downloadable-pack',
    fileFormat: 'pdf',
    maxDownloads: 2,
  },
  ...overrides,
});

const makeReq = (params = {}) => ({
  params: {
    id: ids.order.toString(),
    productId: ids.product.toString(),
    ...params,
  },
  user: { _id: ids.buyer },
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

Order.findOne = (query) => {
  state.orderFindCalls.push(query);
  return {
    maxTimeMS(maxTimeMs) {
      state.orderFindMaxTimeMs = maxTimeMs;
      return Promise.resolve(state.order);
    },
  };
};

Order.updateOne = (query, update) => {
  state.updateCalls.push({ query, update });
  return {
    maxTimeMS(maxTimeMs) {
      state.updateMaxTimeMs = maxTimeMs;
      return Promise.resolve(state.updateResult);
    },
  };
};

Product.findById = (id) => {
  state.productFindCalls.push(id);
  return {
    select(selection) {
      state.productSelects.push(selection);
      return {
        maxTimeMS(maxTimeMs) {
          state.productFindMaxTimeMs = maxTimeMs;
          return Promise.resolve(state.product);
        },
      };
    },
  };
};

cloudinary.utils.private_download_url = (...args) => {
  state.signedCalls.push(args);
  return 'https://signed.example.test/download';
};

const invoke = async (options = {}) => {
  resetState(options);
  const res = makeRes();
  await getDownloadUrl(options.req || makeReq(), res);
  return res;
};

const assertStatus = (res, statusCode, message) => {
  assert.equal(res.statusCode, statusCode, message);
  assert.equal(Boolean(res.body?.success), statusCode < 400, `${message}: success flag`);
};

const run = async () => {
  let res = await invoke({ req: makeReq({ id: 'not-an-object-id' }) });
  assertStatus(res, 400, 'invalid object id is rejected');
  assert.equal(state.orderFindCalls.length, 0, 'invalid ids do not query orders');

  res = await invoke({ order: null });
  assertStatus(res, 404, 'missing order is rejected');
  assert.equal(state.productFindCalls.length, 0, 'missing order does not fetch product');
  assert.equal(state.orderFindCalls[0].buyerId.toString(), ids.buyer.toString(), 'order lookup is buyer-scoped');

  res = await invoke({ order: makeOrder({ status: 'pending_payment' }) });
  assertStatus(res, 403, 'unpaid order is rejected');
  assert.equal(state.productFindCalls.length, 0, 'unpaid order does not fetch product');

  res = await invoke({ order: makeOrder({ items: [{ productId: ids.product, type: 'physical' }] }) });
  assertStatus(res, 404, 'non-digital order item is rejected');
  assert.equal(state.productFindCalls.length, 0, 'non-digital item does not fetch product');

  res = await invoke({ product: makeProduct({ digital: { maxDownloads: 2 } }) });
  assertStatus(res, 404, 'missing private file id is rejected');
  assert.equal(state.updateCalls.length, 0, 'missing file does not update download counter');

  res = await invoke({
    order: makeOrder({ downloads: [{ productId: ids.product, count: 2 }] }),
  });
  assertStatus(res, 429, 'exhausted download limit is rejected');
  assert.equal(state.updateCalls.length, 0, 'exhausted limit does not update again');
  assert.equal(state.signedCalls.length, 0, 'exhausted limit does not sign a URL');

  res = await invoke({
    order: makeOrder({ downloads: [{ productId: ids.product, count: 1 }] }),
    updateResult: { modifiedCount: 0 },
  });
  assertStatus(res, 429, 'atomic update race failure is rejected');
  assert.equal(state.signedCalls.length, 0, 'race failure does not sign a URL');

  res = await invoke({ order: makeOrder({ downloads: undefined }) });
  assertStatus(res, 200, 'legacy order without downloads array can start download tracking');
  assert.equal(state.updateCalls.length, 1, 'first download creates one update');
  assert.equal(state.updateCalls[0].query.buyerId.toString(), ids.buyer.toString(), 'first download update is buyer-scoped');
  assert.deepEqual(state.updateCalls[0].query.status, { $in: ['paid', 'delivered', 'completed'] });
  assert.equal(state.updateCalls[0].query.items.$elemMatch.productId.toString(), ids.product.toString());
  assert.equal(state.updateCalls[0].query.items.$elemMatch.type, 'digital');
  assert.equal(state.updateCalls[0].query['downloads.productId'].$ne.toString(), ids.product.toString());
  assert.equal(state.updateCalls[0].update.$push.downloads.productId.toString(), ids.product.toString());
  assert.equal(state.signedCalls.length, 1, 'first download signs one URL');
  assert.equal(state.signedCalls[0][2].upload_prefix, 'https://api.cloudinary.com', 'download signer forces HTTPS Cloudinary API');
  assert.equal(state.productSelects[0], 'title digital.maxDownloads digital.fileFormat +digital.filePublicId');
  assert.equal(res.body.url, 'https://signed.example.test/download');
  assert.equal(res.body.fileName, 'Downloadable Pack');

  res = await invoke({
    order: makeOrder({ downloads: undefined }),
    product: makeProduct({ title: `  ${'A'.repeat(250)}  ` }),
  });
  assertStatus(res, 200, 'long file names are bounded in response');
  assert.equal(res.body.fileName.length, 180, 'file names are capped');

  cloudinary.utils.private_download_url = (...args) => {
    state.signedCalls.push(args);
    return 'javascript:alert(1)';
  };
  res = await invoke({ order: makeOrder({ downloads: undefined }) });
  assertStatus(res, 500, 'unsafe signed download URL is rejected');
  cloudinary.utils.private_download_url = (...args) => {
    state.signedCalls.push(args);
    return 'https://signed.example.test/download';
  };

  res = await invoke({
    order: makeOrder({ downloads: [{ productId: ids.product, count: 1 }] }),
  });
  assertStatus(res, 200, 'repeat download below limit succeeds');
  assert.equal(state.updateCalls.length, 1, 'repeat download creates one update');
  assert.equal(state.updateCalls[0].query.downloads.$elemMatch.productId.toString(), ids.product.toString());
  assert.deepEqual(state.updateCalls[0].query.downloads.$elemMatch.count, { $lt: 2 });
  assert.deepEqual(state.updateCalls[0].update.$inc, { 'downloads.$.count': 1 });
  assert.equal(state.signedCalls.length, 1, 'repeat download signs one URL');

  console.log('digital download guard smoke ok');
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    Order.findOne = originals.orderFindOne;
    Order.updateOne = originals.orderUpdateOne;
    Product.findById = originals.productFindById;
    cloudinary.utils.private_download_url = originals.privateDownloadUrl;
  });
