const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

const normalizeHttpUrl = (value = '', { maxLength = 500, allowBareDomain = true } = {}) => {
  const trimmed = String(value || '').trim().slice(0, maxLength);
  if (!trimmed) return '';

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) || !allowBareDomain
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!HTTP_PROTOCOLS.has(parsed.protocol)) return '';
    if (!parsed.hostname || /[\s\\]/.test(parsed.hostname)) return '';
    return parsed.href.slice(0, maxLength);
  } catch {
    return '';
  }
};

const normalizeUrlList = (values = [], options = {}) =>
  (Array.isArray(values) ? values : [])
    .map((value) => normalizeHttpUrl(value, options))
    .filter(Boolean);

module.exports = {
  normalizeHttpUrl,
  normalizeUrlList,
};
