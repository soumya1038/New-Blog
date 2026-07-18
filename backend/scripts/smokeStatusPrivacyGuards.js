#!/usr/bin/env node

const assert = require('assert/strict');
const StatusView = require('../models/StatusView');
const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');
const { deleteCloudinaryPublicIds } = require('../utils/cloudinaryCleanup');
const { sanitizeStatusForViewer } = require('../utils/userVisibility');

const status = {
  _id: 'status-1',
  mediaType: 'image',
  mediaPublicId: 'private/status-1',
  mediaFormat: 'jpg',
  mediaResourceType: 'image',
  mediaDeliveryType: 'authenticated',
  image: 'https://example.com/raw-image.jpg',
  video: '',
  seenBy: [{ user: 'viewer-1' }, { user: 'viewer-2' }],
  seenByCount: 3,
};

const ownerPayload = sanitizeStatusForViewer(status, { isOwner: true });
assert.equal(ownerPayload.seenByCount, 3);
assert.equal(ownerPayload.hasMedia, true);
assert.equal(ownerPayload.mediaProtected, true);
assert.equal(ownerPayload.image, '');
assert.equal('seenBy' in ownerPayload, false);
assert.equal('mediaPublicId' in ownerPayload, false);
assert.equal('mediaFormat' in ownerPayload, false);

const viewerPayload = sanitizeStatusForViewer(status, { isOwner: false });
assert.equal('seenByCount' in viewerPayload, false);
assert.equal('seenBy' in viewerPayload, false);
assert.equal(viewerPayload.mediaProtected, true);

const indexes = StatusView.schema.indexes();
assert.ok(indexes.some(([keys, options]) => (
  keys.statusOwnerId === 1 && keys.statusId === 1 && keys.viewerId === 1 && options.unique === true
)));
assert.ok(indexes.some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0));

assert.ok(User.schema.indexes().some(([keys, options]) => (
  keys['statuses._id'] === 1 && options.name === 'status_media_lookup_idx'
)));

const run = async () => {
  const originalDestroy = cloudinary.uploader.destroy;
  cloudinary.uploader.destroy = async () => {
    throw new Error('simulated provider failure');
  };
  try {
    await assert.rejects(
      deleteCloudinaryPublicIds(['account/media'], { throwOnError: true }),
      /simulated provider failure/
    );
  } finally {
    cloudinary.uploader.destroy = originalDestroy;
  }

  console.log('status privacy guard smoke ok');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
