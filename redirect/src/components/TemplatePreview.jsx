import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaTimes,
  FaExpand,
  FaCompress,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaPalette,
  FaMoon,
  FaSun,
  FaSyncAlt
} from 'react-icons/fa';
import {
  articleTemplates,
  generateArticleTemplateHTML,
  DEFAULT_ARTICLE_TEMPLATE_ID,
  CUSTOM_ARTICLE_TEMPLATE_ID,
  createDefaultCustomTemplate,
  normalizeCustomTemplate,
  getArticleTemplateById,
  recommendArticleTemplate
} from '../utils/articleTemplates';
import CustomTemplateStudioPanel from './CustomTemplateStudioPanel';

const TemplatePreview = ({
  article,
  onClose,
  selectedTemplateId = DEFAULT_ARTICLE_TEMPLATE_ID,
  customTemplate,
  onApplyTemplate,
  suggestedTemplateId,
  suggestedReason
}) => {
  const defaultTemplateIndex = Math.max(
    0,
    articleTemplates.findIndex((template) => template.id === selectedTemplateId)
  );

  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(defaultTemplateIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoThemeMode, setAutoThemeMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [previewThemeMode, setPreviewThemeMode] = useState('auto');
  const [mobileStudioTab, setMobileStudioTab] = useState('preview');
  const [customDraft, setCustomDraft] = useState(
    normalizeCustomTemplate(customTemplate || createDefaultCustomTemplate())
  );
  const toolbarActionsRef = useRef(null);
  const templateStripRef = useRef(null);

  useEffect(() => {
    const nextIndex = articleTemplates.findIndex((template) => template.id === selectedTemplateId);
    if (nextIndex >= 0) {
      setCurrentTemplateIndex(nextIndex);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    setCustomDraft(normalizeCustomTemplate(customTemplate || createDefaultCustomTemplate()));
  }, [customTemplate]);

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
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }

      if (event.key === 'ArrowLeft') {
        setCurrentTemplateIndex((prev) => (prev === 0 ? articleTemplates.length - 1 : prev - 1));
      }

      if (event.key === 'ArrowRight') {
        setCurrentTemplateIndex((prev) => (prev === articleTemplates.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, onClose]);

  const currentTemplate = articleTemplates[currentTemplateIndex] || articleTemplates[0];
  const selectedTemplateMeta = getArticleTemplateById(selectedTemplateId);
  const isCustomTemplate = currentTemplate.id === CUSTOM_ARTICLE_TEMPLATE_ID;

  useEffect(() => {
    if (isCustomTemplate && !isFullscreen) {
      setMobileStudioTab('preview');
    }
  }, [isCustomTemplate, isFullscreen, currentTemplate.id]);

  const articleData = useMemo(
    () => ({
      title: article?.title || 'Untitled Article',
      content: article?.content || 'No content yet. Start writing your story.',
      author: article?.author || { username: 'Editorial Desk' },
      coverImage: article?.coverImage || '',
      metaDescription: article?.metaDescription || '',
      tags: article?.tags || [],
      category: article?.category || 'General',
      videoUrls: article?.videoUrls || [],
      galleryImages: article?.galleryImages || [],
      createdAt: article?.createdAt || new Date().toISOString()
    }),
    [article]
  );

  const effectiveThemeMode = previewThemeMode === 'auto' ? autoThemeMode : previewThemeMode;

  const derivedRecommendation = useMemo(
    () => recommendArticleTemplate(articleData),
    [articleData]
  );

  const activeSuggestedTemplateId = suggestedTemplateId || derivedRecommendation.templateId;
  const activeSuggestedReason = suggestedReason || derivedRecommendation.reason;
  const suggestedTemplateMeta = getArticleTemplateById(activeSuggestedTemplateId);

  const htmlContent = useMemo(
    () =>
      generateArticleTemplateHTML(
        articleData,
        currentTemplate.id,
        isCustomTemplate ? customDraft : null,
        effectiveThemeMode
      ),
    [articleData, currentTemplate.id, isCustomTemplate, customDraft, effectiveThemeMode]
  );

  const applySelection = () => {
    if (!onApplyTemplate) return;
    onApplyTemplate(
      currentTemplate.id,
      currentTemplate.id === CUSTOM_ARTICLE_TEMPLATE_ID ? customDraft : null
    );
  };

  const handlePrevTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev === 0 ? articleTemplates.length - 1 : prev - 1));
  };

  const handleNextTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev === articleTemplates.length - 1 ? 0 : prev + 1));
  };

  const handleTemplateStripWheel = (event) => {
    const strip = templateStripRef.current;
    if (!strip) return;

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    strip.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  const handleToolbarWheel = (event) => {
    const strip = toolbarActionsRef.current;
    if (!strip) return;

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    strip.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  return (
    <div className={`fixed inset-0 z-[9999] bg-slate-950/95 ${isFullscreen ? '' : 'p-3 sm:p-5'}`}>
      {!isFullscreen && (
        <div className="absolute top-0 left-0 right-0 z-20 border-b border-slate-700 bg-slate-900/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-2 sm:px-4 sm:py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300 sm:text-xs">Template Preview Studio</p>
              <h3 className="truncate text-sm font-semibold text-slate-100 sm:text-lg">{currentTemplate.name}</h3>
              <p className="hidden truncate text-xs text-slate-400 md:block">{currentTemplate.description}</p>
            </div>

            <div
              ref={toolbarActionsRef}
              onWheel={handleToolbarWheel}
              className="flex w-full min-w-0 items-center gap-1 overflow-x-auto pb-1 sm:w-auto sm:justify-end"
              title="Use mouse wheel here to scroll toolbar horizontally"
            >
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 sm:px-3 sm:py-2">
                <span className="hidden text-xs font-semibold uppercase tracking-[0.1em] text-slate-300 sm:inline">Theme</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewThemeMode('auto')}
                    className={`inline-flex items-center gap-1 rounded-md border p-1.5 text-xs font-semibold transition sm:px-2 sm:py-1 ${
                      previewThemeMode === 'auto'
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                        : 'border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                    aria-pressed={previewThemeMode === 'auto'}
                    title="Auto theme preview"
                  >
                    <FaSyncAlt />
                    <span className="hidden md:inline">Auto</span>
                  </button>
                  <button
                    onClick={() => setPreviewThemeMode('light')}
                    className={`inline-flex items-center gap-1 rounded-md border p-1.5 text-xs font-semibold transition sm:px-2 sm:py-1 ${
                      previewThemeMode === 'light'
                        ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                        : 'border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                    aria-pressed={previewThemeMode === 'light'}
                    title="Light theme preview"
                  >
                    <FaSun />
                    <span className="hidden md:inline">Light</span>
                  </button>
                  <button
                    onClick={() => setPreviewThemeMode('dark')}
                    className={`inline-flex items-center gap-1 rounded-md border p-1.5 text-xs font-semibold transition sm:px-2 sm:py-1 ${
                      previewThemeMode === 'dark'
                        ? 'border-indigo-300 bg-indigo-400/20 text-indigo-100'
                        : 'border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                    aria-pressed={previewThemeMode === 'dark'}
                    title="Dark theme preview"
                  >
                    <FaMoon />
                    <span className="hidden md:inline">Dark</span>
                  </button>
                </div>
                <span className="hidden rounded-md border border-cyan-500/60 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-200 lg:inline">
                  Preview: {effectiveThemeMode === 'dark' ? 'Dark' : 'Light'}
                </span>
              </div>
              <button
                onClick={handlePrevTemplate}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 p-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 sm:gap-2 sm:px-3 sm:py-2"
                title="Previous template"
              >
                <FaChevronLeft />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                onClick={handleNextTemplate}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 p-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 sm:gap-2 sm:px-3 sm:py-2"
                title="Next template"
              >
                <span className="hidden sm:inline">Next</span>
                <FaChevronRight />
              </button>
              <button
                onClick={applySelection}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 p-2 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:gap-2 sm:px-3 sm:py-2"
                title="Use this template"
              >
                <FaCheckCircle />
                <span className="hidden sm:inline">Use This Template</span>
              </button>
              <button
                onClick={() => setIsFullscreen(true)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-sky-600 p-2 text-sm font-semibold text-white transition hover:bg-sky-500 sm:gap-2 sm:px-3 sm:py-2"
                title="Open fullscreen preview"
              >
                <FaExpand />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
              <button
                onClick={onClose}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-600 p-2 text-sm font-semibold text-white transition hover:bg-rose-500 sm:gap-2 sm:px-3 sm:py-2"
                title="Close template preview"
              >
                <FaTimes />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="fixed right-4 top-4 z-30 flex gap-2">
          <button
            onClick={() => setIsFullscreen(false)}
            className="rounded-full bg-sky-600/90 p-3 text-white transition hover:bg-sky-500"
            title="Exit fullscreen"
          >
            <FaCompress size={18} />
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-rose-600/90 p-3 text-white transition hover:bg-rose-500"
            title="Close preview"
          >
            <FaTimes size={18} />
          </button>
        </div>
      )}

      <div className={`${isFullscreen ? 'h-full pt-0' : 'h-full pt-24 pb-16'}`}>
        {isCustomTemplate && !isFullscreen && (
          <div className="mb-2 flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileStudioTab('preview')}
              className={`inline-flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                mobileStudioTab === 'preview'
                  ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100'
                  : 'border-slate-600 bg-slate-800 text-slate-200'
              }`}
            >
              Template Preview
            </button>
            <button
              onClick={() => setMobileStudioTab('builder')}
              className={`inline-flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                mobileStudioTab === 'builder'
                  ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
                  : 'border-slate-600 bg-slate-800 text-slate-200'
              }`}
            >
              Studio Controls
            </button>
          </div>
        )}

        <div className={`h-full min-h-0 ${isCustomTemplate && !isFullscreen ? 'grid grid-cols-1 gap-3 lg:grid-cols-[400px_minmax(0,1fr)]' : ''}`}>
          {isCustomTemplate && !isFullscreen && (
            <div
              className={`${
                mobileStudioTab === 'builder' ? 'block' : 'hidden'
              } h-[calc(100dvh-250px)] min-h-0 overflow-hidden lg:block lg:h-full`}
            >
              <CustomTemplateStudioPanel
                customDraft={customDraft}
                onChange={(nextDraft) => setCustomDraft(normalizeCustomTemplate(nextDraft))}
              />
            </div>
          )}

          <div
            className={`relative rounded-2xl border border-slate-700 bg-white ${
              isCustomTemplate && !isFullscreen
                ? `${mobileStudioTab === 'preview' ? 'block' : 'hidden'} h-[calc(100dvh-250px)] min-h-0 lg:block lg:h-full`
                : 'h-full'
            }`}
          >
            {!isFullscreen && (
              <div className="absolute left-3 top-3 z-10 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-100">
                {currentTemplateIndex + 1} / {articleTemplates.length}
              </div>
            )}
            {!isFullscreen && activeSuggestedTemplateId && (
              <div className="absolute left-3 top-11 z-10 max-w-[70%] rounded-full border border-emerald-300/70 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                Suggested: {suggestedTemplateMeta?.name || 'Smart Pick'}{activeSuggestedReason ? ` | ${activeSuggestedReason}` : ''}
              </div>
            )}
            {!isFullscreen && (
              <div className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-cyan-200">
                <FaPalette className="mr-1 inline" />
                Selected: {selectedTemplateMeta.name}
              </div>
            )}
            <iframe
              srcDoc={htmlContent}
              className="h-full w-full rounded-2xl"
              title="Article Template Preview"
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          </div>
        </div>
      </div>

      {!isFullscreen && (
        <div className="absolute bottom-2 left-0 right-0 z-20 px-3">
          <div
            ref={templateStripRef}
            onWheel={handleTemplateStripWheel}
            className="mx-auto flex max-w-[1400px] gap-2 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/90 p-2"
            title="Use mouse wheel here to scroll templates horizontally"
          >
            {articleTemplates.map((template, index) => {
              const active = index === currentTemplateIndex;
              const isSuggested = template.id === activeSuggestedTemplateId;
              return (
                <button
                  key={template.id}
                  onClick={() => setCurrentTemplateIndex(index)}
                  className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    active
                      ? 'border-cyan-300 bg-cyan-500 text-slate-900'
                      : isSuggested
                      ? 'border-emerald-300 bg-emerald-600/25 text-emerald-100 hover:bg-emerald-600/35'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {template.name}{isSuggested ? ' - Suggested' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;


