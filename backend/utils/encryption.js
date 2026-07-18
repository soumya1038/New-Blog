const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const { logError } = require('./safeErrorLog');

const SECRET_KEY = process.env.ENCRYPTION_KEY || process.env.SECRET_KEY;
const ENVELOPE_PREFIX = 'enc:v2:';
const AAD = Buffer.from('lekhon:encrypted-value:v2', 'utf8');

if (!SECRET_KEY || SECRET_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be set to a strong value of at least 32 characters');
}

const KEY = crypto.createHash('sha256').update(SECRET_KEY, 'utf8').digest();

const encode = value => Buffer.from(value).toString('base64url');
const decode = value => Buffer.from(value, 'base64url');

const encrypt = text => {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    cipher.setAAD(AAD);
    const ciphertext = Buffer.concat([
      cipher.update(String(text), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${ENVELOPE_PREFIX}${encode(iv)}:${encode(tag)}:${encode(ciphertext)}`;
  } catch (error) {
    logError('Encryption error:', error);
    throw new Error('Unable to encrypt sensitive data');
  }
};

const decryptV2 = envelope => {
  const parts = envelope.slice(ENVELOPE_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted value envelope');

  const [ivValue, tagValue, ciphertextValue] = parts;
  const iv = decode(ivValue);
  const tag = decode(tagValue);
  const ciphertext = decode(ciphertextValue);
  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error('Invalid encrypted value envelope');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

const decryptLegacy = ciphertext => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted || ciphertext;
};

const isLegacyEncryption = value => String(value || '').startsWith('U2FsdGVkX1');

const decrypt = ciphertext => {
  if (!ciphertext) return ciphertext;
  const value = String(ciphertext);
  if (value.startsWith(ENVELOPE_PREFIX)) return decryptV2(value);

  try {
    const decrypted = decryptLegacy(value);
    if (isLegacyEncryption(value) && decrypted === value) {
      throw new Error('Unable to decrypt legacy encrypted value');
    }
    return decrypted;
  } catch (error) {
    if (isLegacyEncryption(value)) throw error;
    return value;
  }
};

const isCurrentEncryption = value => String(value || '').startsWith(ENVELOPE_PREFIX);

module.exports = {
  decrypt,
  encrypt,
  isCurrentEncryption,
  isLegacyEncryption,
};
