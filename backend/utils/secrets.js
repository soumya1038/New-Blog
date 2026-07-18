const MIN_SECRET_LENGTH = 32;

const getTrimmedEnv = (key) => String(process.env[key] || '').trim();

const getDedicatedSecret = ({ key, fallbackKey = 'JWT_SECRET' }) => {
  const primary = getTrimmedEnv(key);
  const fallbackAllowed = process.env.NODE_ENV !== 'production';
  const fallback = fallbackAllowed ? getTrimmedEnv(fallbackKey) : '';
  const secret = primary || fallback;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    const required = fallbackAllowed ? `${key} or ${fallbackKey}` : key;
    throw new Error(`${required} must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  return secret;
};

module.exports = {
  getDedicatedSecret,
};
