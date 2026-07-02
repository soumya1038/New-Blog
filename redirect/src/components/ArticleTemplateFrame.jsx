import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CUSTOM_ARTICLE_TEMPLATE_ID,
  DEFAULT_ARTICLE_TEMPLATE_ID,
  generateArticleTemplateHTML,
  normalizeCustomTemplate
} from '../utils/articleTemplates';

const resolveViewportStudioDevice = (width) => {
  const normalizedWidth = Number(width || 0);
  if (normalizedWidth > 0 && normalizedWidth < 768) return 'mobile';
  if (normalizedWidth > 0 && normalizedWidth < 1180) return 'tablet';
  return 'desktop';
};

const ArticleTemplateFrame = ({
  article,
  templateId,
  customTemplate,
  className = ''
}) => {
  const iframeRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const syncRafRef = useRef(null);
  const [frameHeight, setFrameHeight] = useState(560);
  const [autoThemeMode, setAutoThemeMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [viewportStudioDevice, setViewportStudioDevice] = useState(() =>
    typeof window !== 'undefined' ? resolveViewportStudioDevice(window.innerWidth) : 'desktop'
  );

  const requestedTemplateId = templateId || article?.templateId || DEFAULT_ARTICLE_TEMPLATE_ID;
  const resolvedTemplateId =
    requestedTemplateId === CUSTOM_ARTICLE_TEMPLATE_ID
      ? requestedTemplateId
      : DEFAULT_ARTICLE_TEMPLATE_ID;
  const isCustomTemplate = resolvedTemplateId === CUSTOM_ARTICLE_TEMPLATE_ID;

  const clampFrameHeight = useCallback((height) => {
    if (!Number.isFinite(height) || height <= 0) return;
    setFrameHeight((prev) => {
      const next = Math.min(Math.max(Math.ceil(height) + (isCustomTemplate ? 0 : 4), 240), 36000);
      return Math.abs(prev - next) > 1 ? next : prev;
    });
  }, [isCustomTemplate]);

  const resolvedTemplateThemeMode = autoThemeMode;
  const resolvedRuntimeCustomTemplate = useMemo(() => {
    const sourceTemplate =
      customTemplate !== undefined ? customTemplate : (article?.customTemplate || null);
    if (!sourceTemplate) return null;
    return normalizeCustomTemplate(sourceTemplate);
  }, [article, customTemplate]);
  const htmlContent = useMemo(
    () =>
      generateArticleTemplateHTML(
        article,
        resolvedTemplateId,
        resolvedRuntimeCustomTemplate,
        resolvedTemplateThemeMode,
        { runtimeStudioDevice: viewportStudioDevice }
      ),
    [article, resolvedTemplateId, resolvedRuntimeCustomTemplate, resolvedTemplateThemeMode, viewportStudioDevice]
  );

  const syncHeight = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame || !frame.contentWindow) return;

    try {
      const doc = frame.contentWindow.document;
      if (!doc) return;

      const rootNode = doc.querySelector('.template-root');
      const rootHeight = rootNode
        ? Math.ceil(rootNode.getBoundingClientRect().height + (isCustomTemplate ? 0 : 56))
        : 0;
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
  }, [clampFrameHeight, isCustomTemplate]);

  const refreshViewportStudioDevice = useCallback(() => {
    const viewportWidth = typeof window !== 'undefined' ? Number(window.innerWidth || 0) : 0;
    const frameWidth = Number(iframeRef.current?.getBoundingClientRect?.().width || 0);
    const width = viewportWidth > 0 ? viewportWidth : frameWidth;
    const nextDevice = resolveViewportStudioDevice(width);
    setViewportStudioDevice((prev) => (prev === nextDevice ? prev : nextDevice));
  }, []);

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
    refreshViewportStudioDevice();
    return () => window.clearTimeout(timeout);
  }, [htmlContent, scheduleSyncHeight, refreshViewportStudioDevice]);

  useEffect(() => {
    let rafId = null;
    const handleResize = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        refreshViewportStudioDevice();
      });
      scheduleSyncHeight();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [scheduleSyncHeight, refreshViewportStudioDevice]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ResizeObserver) return undefined;

    const observedNode = iframeRef.current?.parentElement || iframeRef.current;
    if (!observedNode) return undefined;

    const observer = new window.ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        refreshViewportStudioDevice();
        scheduleSyncHeight();
      });
    });

    observer.observe(observedNode);
    resizeObserverRef.current = observer;

    return () => {
      observer.disconnect();
      if (resizeObserverRef.current === observer) {
        resizeObserverRef.current = null;
      }
    };
  }, [refreshViewportStudioDevice, scheduleSyncHeight]);

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
    refreshViewportStudioDevice();
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
