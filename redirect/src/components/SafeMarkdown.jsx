import React from 'react';
import ReactMarkdown from 'react-markdown';

const SAFE_URL_MAX_LENGTH = 2048;
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:']);

const cleanUrlText = (value) =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, SAFE_URL_MAX_LENGTH);

const getOrigin = () => (
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://lekhon.local'
);

export const getSafeMarkdownUrl = (value, property = 'href') => {
  const raw = cleanUrlText(value);
  if (!raw || raw.startsWith('//') || /[\\]/.test(raw)) return '';
  if (raw.startsWith('#')) return raw;

  const isImage = property === 'src';
  const allowedProtocols = isImage ? SAFE_IMAGE_PROTOCOLS : SAFE_LINK_PROTOCOLS;

  if (raw.startsWith('/')) {
    try {
      const origin = getOrigin();
      const parsed = new URL(raw, origin);
      if (parsed.origin !== origin) return '';
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return '';
    }
  }

  try {
    const parsed = new URL(raw);
    if (!allowedProtocols.has(parsed.protocol)) return '';
    if (parsed.protocol === 'mailto:') return isImage ? '' : parsed.href.slice(0, SAFE_URL_MAX_LENGTH);
    if (!parsed.hostname || /[\s\\]/.test(parsed.hostname)) return '';
    return parsed.href.slice(0, SAFE_URL_MAX_LENGTH);
  } catch {
    return '';
  }
};

export const safeMarkdownUrlTransform = (value, key) => getSafeMarkdownUrl(value, key);

const isExternalHref = (href) => {
  try {
    const origin = getOrigin();
    const parsed = new URL(href, origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return parsed.origin !== origin;
  } catch {
    return false;
  }
};

const defaultComponents = {
  a({ node, href, children, ...props }) {
    const safeHref = getSafeMarkdownUrl(href, 'href');
    if (!safeHref) return <span>{children}</span>;

    const external = isExternalHref(safeHref);
    return (
      <a
        {...props}
        href={safeHref}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        referrerPolicy={external ? 'strict-origin-when-cross-origin' : undefined}
      >
        {children}
      </a>
    );
  },
  img({ node, src, alt, ...props }) {
    const safeSrc = getSafeMarkdownUrl(src, 'src');
    if (!safeSrc) return null;

    return (
      <img
        {...props}
        src={safeSrc}
        alt={String(alt || '').slice(0, 240)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  },
};

const SafeMarkdown = ({ components, children, ...props }) => (
  <ReactMarkdown
    {...props}
    skipHtml
    urlTransform={safeMarkdownUrlTransform}
    components={{ ...defaultComponents, ...(components || {}) }}
  >
    {children}
  </ReactMarkdown>
);

export default SafeMarkdown;
