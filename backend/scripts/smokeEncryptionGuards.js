const assert = require('assert');
const CryptoJS = require('crypto-js');

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-that-is-at-least-32-chars';

const { decrypt, encrypt, isCurrentEncryption } = require('../utils/encryption');

const plaintext = 'private-message-123';
const first = encrypt(plaintext);
const second = encrypt(plaintext);

assert.equal(isCurrentEncryption(first), true, 'new ciphertext uses the current envelope');
assert.notEqual(first, plaintext, 'ciphertext does not expose plaintext');
assert.notEqual(first, second, 'random IV creates distinct ciphertext');
assert.equal(decrypt(first), plaintext, 'current ciphertext decrypts');
assert.equal(decrypt(CryptoJS.AES.encrypt(plaintext, process.env.ENCRYPTION_KEY).toString()), plaintext, 'legacy ciphertext decrypts');
assert.equal(decrypt('ordinary plaintext'), 'ordinary plaintext', 'legacy plaintext remains readable');

const envelopeParts = first.slice('enc:v2:'.length).split(':');
const tamperedCiphertext = Buffer.from(envelopeParts[2], 'base64url');
tamperedCiphertext[0] ^= 1;
const tampered = `enc:v2:${envelopeParts[0]}:${envelopeParts[1]}:${tamperedCiphertext.toString('base64url')}`;
assert.throws(() => decrypt(tampered), /authenticate|encrypted value/i, 'tampering is rejected');

console.log('encryption guard smoke ok');
