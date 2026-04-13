import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';

const DEFAULT_SITE_NAME = 'Lekhon';
const DEFAULT_TITLE = 'Lekhon - Modern Platform';
const DEFAULT_DESCRIPTION = 'Lekhon - Modern blogging platform for blogs, articles, and short content.';
const DEFAULT_IMAGE_PATH = '/image/lekhon_url.png';

const stripMarkdown = (value = '') =>
  String(value)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const truncate = (value = '', max = 160) =>
  value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;

const getBaseUrl = () => {
  if (process.env.REACT_APP_SITE_URL) return process.env.REACT_APP_SITE_URL.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/+$/, '');
  return '';
};

const toAbsoluteUrl = (urlOrPath) => {
  if (!urlOrPath) return '';
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const base = getBaseUrl();
  if (!base) return urlOrPath;
  return `${base}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
};

const SEOHead = ({
  title,
  description,
  content,
  canonicalUrl,
  image,
  type = 'article',
  siteName = DEFAULT_SITE_NAME,
  noIndex = false
}) => {
  const computed = useMemo(() => {
    const safeTitle = title ? `${title} | ${siteName}` : DEFAULT_TITLE;
    const textSource = description || stripMarkdown(content || '') || DEFAULT_DESCRIPTION;
    const safeDescription = truncate(textSource, 160);
    const safeCanonical = toAbsoluteUrl(canonicalUrl) || undefined;
    const safeImage = toAbsoluteUrl(image || DEFAULT_IMAGE_PATH);
    const robots = noIndex ? 'noindex, nofollow' : 'index, follow';

    return {
      safeTitle,
      safeDescription,
      safeCanonical,
      safeImage,
      robots
    };
  }, [title, description, content, canonicalUrl, image, siteName, noIndex]);

  return (
    <Helmet prioritizeSeoTags>
      <title>{computed.safeTitle}</title>
      <meta name="description" content={computed.safeDescription} />
      <meta name="robots" content={computed.robots} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={computed.safeTitle} />
      <meta property="og:description" content={computed.safeDescription} />
      <meta property="og:image" content={computed.safeImage} />
      {computed.safeCanonical && <meta property="og:url" content={computed.safeCanonical} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={computed.safeTitle} />
      <meta name="twitter:description" content={computed.safeDescription} />
      <meta name="twitter:image" content={computed.safeImage} />
      {computed.safeCanonical && <link rel="canonical" href={computed.safeCanonical} />}
    </Helmet>
  );
};

export default SEOHead;
