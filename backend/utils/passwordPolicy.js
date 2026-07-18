const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;

const normalizePasswordInput = (value) =>
  typeof value === 'string' ? value : '';

const getPasswordValidationError = (value, label = 'Password') => {
  const password = normalizePasswordInput(value);
  if (!password) return `${label} is required`;
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `${label} must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `${label} must be at most ${PASSWORD_MAX_LENGTH} characters`;
  }
  return '';
};

const isPasswordComparable = (value) => {
  const password = normalizePasswordInput(value);
  return Boolean(password) && password.length <= PASSWORD_MAX_LENGTH;
};

module.exports = {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  getPasswordValidationError,
  isPasswordComparable,
  normalizePasswordInput,
};
