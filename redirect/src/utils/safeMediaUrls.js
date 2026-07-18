const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const VIMEO_HOSTS = new Set([
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
]);

const SAFE_VIDEO_EXTENSION = /\.(mp4|webm|ogg|mov)(?:$|[?#])/i;
const YOUTUBE_ID = /^[a-zA-Z0-9_-]{6,64}$/;
const VIMEO_ID = /^\d{5,20}$/;

export const SAFE_EMBED_IFRAME_ALLOW = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
export const SAFE_EMBED_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation';
export const SAFE_EMBED_REFERRER_POLICY = 'strict-origin-when-cross-origin';

const parseHttpsUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
};

export const getSafeHttpUrl = (value, { allowBareDomain = false } = {}) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) || !allowBareDomain
    ? raw
    : `https://${raw}`;

  try {
    const parsed = new URL(candidate);
    if (!['https:', 'http:'].includes(parsed.protocol)) return '';
    if (!parsed.hostname || /[\s\\]/.test(parsed.hostname)) return '';
    return parsed.href;
  } catch {
    return '';
  }
};

export const getSafeImageUrl = (value, { allowBareDomain = false } = {}) => {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 2048) return '';
  if (/[\u0000-\u001f\u007f"'<>\\]/.test(raw)) return '';
  if (raw.startsWith('//')) return '';

  if (raw.startsWith('/')) {
    try {
      const parsed = new URL(raw, 'https://lekhon.local');
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return '';
    }
  }

  const safeUrl = getSafeHttpUrl(raw, { allowBareDomain });
  if (!safeUrl) return '';

  return safeUrl;
};

const getYouTubeId = (parsed) => {
  if (!parsed || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return '';

  if (parsed.hostname.toLowerCase().endsWith('youtu.be')) {
    return parsed.pathname.split('/').filter(Boolean)[0] || '';
  }

  if (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')) {
    return parsed.pathname.split('/').filter(Boolean)[1] || '';
  }

  return parsed.searchParams.get('v') || '';
};

const getVimeoId = (parsed) => {
  if (!parsed || !VIMEO_HOSTS.has(parsed.hostname.toLowerCase())) return '';

  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parsed.hostname.toLowerCase() === 'player.vimeo.com' && parts[0] === 'video') {
    return parts[1] || '';
  }

  return parts.find(part => VIMEO_ID.test(part)) || '';
};

export const getSafeVideoEmbedUrl = (value) => {
  const parsed = parseHttpsUrl(value);
  if (!parsed) return '';

  const youtubeId = getYouTubeId(parsed);
  if (YOUTUBE_ID.test(youtubeId)) {
    return `https://www.youtube.com/embed/${youtubeId}`;
  }

  const vimeoId = getVimeoId(parsed);
  if (VIMEO_ID.test(vimeoId)) {
    return `https://player.vimeo.com/video/${vimeoId}`;
  }

  return '';
};

export const getSafeDirectVideoUrl = (value) => {
  const parsed = parseHttpsUrl(value);
  if (!parsed || !SAFE_VIDEO_EXTENSION.test(parsed.pathname)) return '';
  return parsed.href;
};

export const getSafeVideoRenderInfo = (value) => {
  const embedSrc = getSafeVideoEmbedUrl(value);
  if (embedSrc) return { type: 'embed', src: embedSrc };

  const videoSrc = getSafeDirectVideoUrl(value);
  if (videoSrc) return { type: 'video', src: videoSrc };

  return null;
};

export const getSafeVideoTitle = (value) => {
  const parsed = parseHttpsUrl(value);
  if (!parsed) return 'Video';

  const youtubeId = getYouTubeId(parsed);
  if (YOUTUBE_ID.test(youtubeId)) return `YouTube ${youtubeId.slice(0, 8)}`;

  const vimeoId = getVimeoId(parsed);
  if (VIMEO_ID.test(vimeoId)) return `Vimeo ${vimeoId}`;

  return getSafeDirectVideoUrl(value) ? 'Video' : null;
};
