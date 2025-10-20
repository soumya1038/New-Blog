const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-change-in-production';

const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

const decrypt = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { encrypt, decrypt };
