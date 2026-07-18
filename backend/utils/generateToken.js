const jwt = require('jsonwebtoken');

// Generate a versioned access token so credential changes can revoke old sessions.
const generateToken = (userOrId, authVersion) => {
  const id = userOrId?._id || userOrId;
  const versionValue = authVersion ?? userOrId?.authVersion ?? 0;
  const version = Number.isInteger(Number(versionValue)) && Number(versionValue) >= 0
    ? Number(versionValue)
    : 0;

  return jwt.sign(
    {
      id,
      tokenType: 'access',
      authVersion: version,
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
};

module.exports = generateToken;
