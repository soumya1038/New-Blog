#!/usr/bin/env node

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
const controllerSources = [
  read('controllers/articleController.js'),
  read('controllers/blogController.js'),
  read('controllers/shortController.js'),
];

for (const source of controllerSources) {
  assert.match(source, /sanitizeStatusesForViewer\(visibleStatuses, [^)]+\)/);
  assert.doesNotMatch(source, /select:\s*['"][^'"]*statuses followers/);
  assert.match(source, /QUERY_MAX_TIME_MS/);
}

const relationshipSource = read('utils/contentAuthorRelationships.js');
assert.match(relationshipSource, /followers:\s*viewer\._id/);
assert.match(relationshipSource, /blockedUsers:\s*viewer\._id/);
assert.match(relationshipSource, /\$size:\s*\{\s*\$ifNull:\s*\['\$followers'/);

const slugSource = read('utils/slugUtils.js');
assert.match(slugSource, /if \(maxTimeMS\) populatedQuery\.maxTimeMS\(maxTimeMS\)/);

console.log('content status privacy and list load guard smoke ok');
