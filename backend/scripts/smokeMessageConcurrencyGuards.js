#!/usr/bin/env node

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const controllerSource = fs.readFileSync(
  path.join(__dirname, '..', 'controllers', 'messageController.js'),
  'utf8'
);
const fileRouteSource = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'fileRoutes.js'),
  'utf8'
);

assert.match(controllerSource, /MESSAGE_QUERY_MAX_TIME_MS/);
assert.doesNotMatch(controllerSource, /\.save\s*\(/);
assert.match(controllerSource, /Message\.findOneAndUpdate[\s\S]*\$filter/);
assert.match(controllerSource, /\$pull:\s*\{\s*reactions:/);
assert.match(controllerSource, /\$pull:\s*\{\s*pinnedBy:[\s\S]*\$lte:\s*now/);
assert.match(controllerSource, /group:\s*groupId,[\s\S]*deletedForEveryone:[\s\S]*deletedBy:/);
assert.match(fileRouteSource, /messageQueryMaxTimeMs/);
assert.match(fileRouteSource, /Group\.exists[\s\S]*\.maxTimeMS\(messageQueryMaxTimeMs\)/);

console.log('message concurrency and query deadline smoke ok');
