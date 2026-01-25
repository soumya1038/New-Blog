const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-change-in-production';

const encrypt = (text) => {
  if (!text) return text;
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
};

const decrypt = (ciphertext) => {
  if (!ciphertext) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ciphertext;
  } catch (error) {
    return ciphertext;
  }
};

module.exports = { encrypt, decrypt };
