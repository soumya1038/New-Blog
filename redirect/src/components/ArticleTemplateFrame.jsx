import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ARTICLE_TEMPLATE_ID,
  generateArticleTemplateHTML
} from '../utils/articleTemplates';

const ArticleTemplateFrame = ({
  article,
  templateId,
  customTemplate,
  className = ''
}) => {
  const iframeRef = useRef(null);
  const syncRafRef = useRef(null);
  const [frameHeight, setFrameHeight] = useState(560);
  const [autoThemeMode, setAutoThemeMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const clampFrameHeight = useCallback((height) => {
    if (!Number.isFinite(height) || height <= 0) return;
    setFrameHeight((prev) => {
      const next = Math.min(Math.max(Math.ceil(height) + 4, 240), 36000);
      return Math.abs(prev - next) > 1 ? next : prev;
    });
  }, []);

  const resolvedTemplateThemeMode = autoThemeMode;

  const htmlContent = useMemo(
    () =>
      generateArticleTemplateHTML(
        article,
        templateId || article?.templateId || DEFAULT_ARTICLE_TEMPLATE_ID,
        customTemplate !== undefined ? customTemplate : (article?.customTemplate || null),
        resolvedTemplateThemeMode
      ),
    [article, templateId, customTemplate, resolvedTemplateThemeMode]
  );

  const syncHeight = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame || !frame.contentWindow) return;

    try {
      const doc = frame.contentWindow.document;
      if (!doc) return;

      const rootNode = doc.querySelector('.template-root');
      const rootHeight = rootNode ? Math.ceil(rootNode.getBoundingClientRect().height + 56) : 0;
      const scrollHeight = Math.max(
        doc.body?.scrollHeight || 0,
        doc.body?.offsetHeight || 0,
        doc.documentElement?.scrollHeight || 0,
        doc.documentElement?.offsetHeight || 0
      );
      const nextHeight = rootHeight > 0 ? rootHeight : scrollHeight;

      if (nextHeight > 0) {
        clampFrameHeight(nextHeight);
      }
    } catch (error) {
      // Ignore cross-document read failures.
    }
  }, [clampFrameHeight]);

  const scheduleSyncHeight = useCallback(() => {
    if (syncRafRef.current !== null) return;
    syncRafRef.current = window.requestAnimationFrame(() => {
      syncRafRef.current = null;
      syncHeight();
    });
  }, [syncHeight]);

  useEffect(() => {
    const syncTheme = () => {
      setAutoThemeMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(scheduleSyncHeight, 80);
    return () => window.clearTimeout(timeout);
  }, [htmlContent, scheduleSyncHeight]);

  useEffect(() => {
    const handleResize = () => {
      scheduleSyncHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [scheduleSyncHeight]);

  useEffect(() => {
    const onMessage = (event) => {
      const payload = event.data;
      if (!payload || payload.type !== 'article-template:height') return;
      if (typeof payload.height === 'number') {
        clampFrameHeight(payload.height);
        scheduleSyncHeight();
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [clampFrameHeight, scheduleSyncHeight]);

  useEffect(() => {
    return () => {
      if (syncRafRef.current !== null) {
        window.cancelAnimationFrame(syncRafRef.current);
        syncRafRef.current = null;
      }
    };
  }, []);

  const handleLoad = () => {
    scheduleSyncHeight();
    window.setTimeout(scheduleSyncHeight, 140);
    window.setTimeout(scheduleSyncHeight, 420);
  };

  return (
    <iframe
      ref={iframeRef}
      srcDoc={htmlContent}
      title="Article Template"
      sandbox="allow-same-origin allow-scripts allow-popups"
      onLoad={handleLoad}
      className={`w-full border-0 ${className}`}
      style={{
        height: `${frameHeight}px`,
        minHeight: '240px',
        transition: 'height 220ms ease-out',
        overflow: 'hidden'
      }}
      scrolling="no"
    />
  );
};

export default ArticleTemplateFrame;
