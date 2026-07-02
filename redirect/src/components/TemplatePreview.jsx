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
  FaSyncAlt,
  FaDesktop,
  FaTabletAlt,
  FaMobileAlt
} from 'react-icons/fa';
import {
  articleTemplates,
  generateArticleTemplateHTML,
  CUSTOM_ARTICLE_TEMPLATE_ID,
  createDefaultCustomTemplate,
  normalizeCustomTemplate,
  getArticleTemplateById
} from '../utils/articleTemplates';
import CustomTemplateStudioPanel from './CustomTemplateStudioPanel';
import {
  listMyTemplatePresets,
  createTemplatePreset,
  updateTemplatePreset,
  deleteTemplatePreset,
  toggleTemplatePresetShare
} from '../services/templatePresets';

const CUSTOM_TEMPLATE_NAME_STORAGE_KEY = 'lekhon:custom-template-saved-names';
const CUSTOM_TEMPLATE_PRESETS_STORAGE_KEY = 'lekhon:custom-template-presets:v1';
const CUSTOM_STUDIO_PREVIEW_TEMPLATES = articleTemplates.filter(
  (template) => template.id === CUSTOM_ARTICLE_TEMPLATE_ID
);

const hasAuthToken = () =>
  typeof window !== 'undefined' && Boolean(window.localStorage.getItem('token'));

const normalizePresetRecord = (preset) => {
  const id = String(preset?.id || preset?._id || '').trim();
  const name = String(preset?.name || '').trim();
  if (!id || !name || typeof preset?.template !== 'object' || !preset.template) return null;

  return {
    id,
    name,
    template: normalizeCustomTemplate(preset.template),
    visibility: preset?.visibility === 'public' ? 'public' : 'private',
    createdAt: preset?.createdAt || new Date().toISOString(),
    updatedAt: preset?.updatedAt || new Date().toISOString()
  };
};

const TemplatePreview = ({
  article,
  onClose,
  selectedTemplateId = CUSTOM_ARTICLE_TEMPLATE_ID,
  customTemplate,
  onApplyTemplate
}) => {
  const previewTemplates = CUSTOM_STUDIO_PREVIEW_TEMPLATES;
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoThemeMode, setAutoThemeMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [previewThemeMode, setPreviewThemeMode] = useState('auto');
  const [previewStudioDevice, setPreviewStudioDevice] = useState('desktop');
  const [mobileStudioTab, setMobileStudioTab] = useState('preview');
  const [showCustomSaveModal, setShowCustomSaveModal] = useState(false);
  const [customTemplateNameInput, setCustomTemplateNameInput] = useState('');
  const [savedCustomTemplateNames, setSavedCustomTemplateNames] = useState([]);
  const [customPresets, setCustomPresets] = useState([]);
  const [isPresetSyncing, setIsPresetSyncing] = useState(false);
  const [customDraft, setCustomDraft] = useState(
    normalizeCustomTemplate(customTemplate || createDefaultCustomTemplate())
  );
  const toolbarActionsRef = useRef(null);
  const templateStripRef = useRef(null);

  useEffect(() => {
    setCurrentTemplateIndex(0);
  }, [selectedTemplateId]);

  useEffect(() => {
    setCustomDraft(normalizeCustomTemplate(customTemplate || createDefaultCustomTemplate()));
  }, [customTemplate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    const loadLocalFallback = () => {
      try {
        const raw = window.localStorage.getItem(CUSTOM_TEMPLATE_NAME_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const normalized = parsed
              .map((item) => String(item || '').trim())
              .filter(Boolean)
              .slice(0, 120);
            if (isMounted) setSavedCustomTemplateNames(normalized);
          }
        }
      } catch (error) {
        // Ignore local storage read issues.
      }

      try {
        const rawPresets = window.localStorage.getItem(CUSTOM_TEMPLATE_PRESETS_STORAGE_KEY);
        if (!rawPresets) return;
        const parsedPresets = JSON.parse(rawPresets);
        if (!Array.isArray(parsedPresets)) return;

        const normalizedPresets = parsedPresets
          .map((preset) => normalizePresetRecord(preset))
          .filter(Boolean)
          .slice(0, 120);

        if (isMounted) setCustomPresets(normalizedPresets);
      } catch (error) {
        // Ignore local storage read issues.
      }
    };

    const hydratePresets = async () => {
      loadLocalFallback();

      if (!hasAuthToken()) return;

      setIsPresetSyncing(true);
      try {
        const serverPresets = await listMyTemplatePresets();
        const normalized = serverPresets
          .map((preset) => normalizePresetRecord(preset))
          .filter(Boolean)
          .slice(0, 120);

        if (!isMounted) return;

        setCustomPresets(normalized);
        const presetNames = normalized.map((preset) => preset.name);
        setSavedCustomTemplateNames((current) => [...new Set([...current, ...presetNames])].slice(0, 120));
        window.localStorage.setItem(CUSTOM_TEMPLATE_PRESETS_STORAGE_KEY, JSON.stringify(normalized));
      } catch (error) {
        // Ignore API failures and keep local fallback data.
      } finally {
        if (isMounted) setIsPresetSyncing(false);
      }
    };

    hydratePresets();

    return () => {
      isMounted = false;
    };
  }, []);

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
        setCurrentTemplateIndex((prev) => (prev === 0 ? previewTemplates.length - 1 : prev - 1));
      }

      if (event.key === 'ArrowRight') {
        setCurrentTemplateIndex((prev) => (prev === previewTemplates.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, onClose, previewTemplates.length]);

  const currentTemplate = previewTemplates[currentTemplateIndex] || getArticleTemplateById(CUSTOM_ARTICLE_TEMPLATE_ID);
  const selectedTemplateMeta = currentTemplate;
  const isCustomTemplate = currentTemplate.id === CUSTOM_ARTICLE_TEMPLATE_ID;
  const hasTemplateChoices = previewTemplates.length > 1;

  useEffect(() => {
    if (isCustomTemplate && !isFullscreen) {
      setMobileStudioTab('preview');
    }
  }, [isCustomTemplate, isFullscreen, currentTemplate.id]);

  useEffect(() => {
    if (!isCustomTemplate) {
      setPreviewStudioDevice('desktop');
    }
  }, [isCustomTemplate]);

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
      linkedProduct: article?.linkedProduct || null,
      linkedProducts: article?.linkedProducts || [],
      externalProductLinks: article?.externalProductLinks || [],
      isTemplatePreview: true,
      createdAt: article?.createdAt || new Date().toISOString()
    }),
    [article]
  );

  const effectiveThemeMode = previewThemeMode === 'auto' ? autoThemeMode : previewThemeMode;

  const resolvedPreviewCustomTemplate = useMemo(() => {
    if (!isCustomTemplate) return null;
    return normalizeCustomTemplate(customDraft);
  }, [isCustomTemplate, customDraft]);

  const htmlContent = useMemo(
    () =>
      generateArticleTemplateHTML(
        articleData,
        currentTemplate.id,
        isCustomTemplate ? resolvedPreviewCustomTemplate : null,
        effectiveThemeMode,
        isCustomTemplate ? { runtimeStudioDevice: previewStudioDevice } : null
      ),
    [
      articleData,
      currentTemplate.id,
      isCustomTemplate,
      resolvedPreviewCustomTemplate,
      effectiveThemeMode,
      previewStudioDevice
    ]
  );

  const takenTemplateNameSet = useMemo(() => {
    const systemNames = articleTemplates
      .map((template) => String(template?.name || '').trim().toLowerCase())
      .filter(Boolean);
    const userNames = savedCustomTemplateNames
      .map((name) => String(name || '').trim().toLowerCase())
      .filter(Boolean);
    const presetNames = customPresets
      .map((preset) => String(preset?.name || '').trim().toLowerCase())
      .filter(Boolean);
    return new Set([...systemNames, ...userNames, ...presetNames]);
  }, [savedCustomTemplateNames, customPresets]);

  const trimmedCustomTemplateName = customTemplateNameInput.trim();
  const customTemplateNameExists = Boolean(
    trimmedCustomTemplateName
    && savedCustomTemplateNames
      .map((name) => String(name || '').trim().toLowerCase())
      .includes(trimmedCustomTemplateName.toLowerCase())
  ) || customPresets.some(
    (preset) => String(preset?.name || '').trim().toLowerCase() === trimmedCustomTemplateName.toLowerCase()
  );
  const customTemplateNameIsReservedSystemName =
    Boolean(trimmedCustomTemplateName)
    && takenTemplateNameSet.has(trimmedCustomTemplateName.toLowerCase())
    && !customTemplateNameExists;
  const customTemplateNameCanSave =
    Boolean(trimmedCustomTemplateName)
    && !customTemplateNameIsReservedSystemName;
  const activeCustomName = String(customDraft?.name || '').trim();
  const activeCustomTemplateExists = Boolean(
    activeCustomName
    && (savedCustomTemplateNames
      .map((name) => String(name || '').trim().toLowerCase())
      .includes(activeCustomName.toLowerCase())
      || customPresets.some(
        (preset) => String(preset?.name || '').trim().toLowerCase() === activeCustomName.toLowerCase()
      ))
  );
  const isEditingAppliedCustomTemplate = Boolean(
    isCustomTemplate
    && activeCustomName
    && String(customTemplate?.name || '').trim().toLowerCase() === activeCustomName.toLowerCase()
  );
  const useTemplateButtonLabel = isCustomTemplate && (activeCustomTemplateExists || isEditingAppliedCustomTemplate)
    ? 'Update Template'
    : 'Use This Template';
  const previewFrameMaxWidth = !isCustomTemplate
    ? null
    : previewStudioDevice === 'mobile'
    ? '430px'
    : previewStudioDevice === 'tablet'
    ? '920px'
    : null;

  const applySelection = () => {
    if (!onApplyTemplate) return;
    const normalizedDraft = normalizeCustomTemplate(customDraft);
    onApplyTemplate(
      currentTemplate.id,
      currentTemplate.id === CUSTOM_ARTICLE_TEMPLATE_ID ? normalizedDraft : null
    );
  };

  const persistCustomTemplateName = (name) => {
    const candidate = String(name || '').trim();
    if (!candidate || typeof window === 'undefined') return;

    try {
      const nextNames = [...new Set([...savedCustomTemplateNames, candidate])].slice(0, 120);
      window.localStorage.setItem(CUSTOM_TEMPLATE_NAME_STORAGE_KEY, JSON.stringify(nextNames));
      setSavedCustomTemplateNames(nextNames);
    } catch (error) {
      // Ignore local storage write issues.
    }
  };

  const persistCustomPresets = (nextPresets) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(CUSTOM_TEMPLATE_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
    } catch (error) {
      // Ignore local storage write issues.
    }
  };

  const upsertCustomPreset = async (templateInput) => {
    const nextTemplate = normalizeCustomTemplate(templateInput);
    const normalizedName = String(nextTemplate.name || '').trim();
    if (!normalizedName) return null;

    const now = new Date().toISOString();
    const existing = customPresets.find(
      (preset) => String(preset?.name || '').trim().toLowerCase() === normalizedName.toLowerCase()
    );

    const persistLocalOnly = () => {
      let nextPresets;
      let savedPreset;
      if (existing) {
        savedPreset = {
          ...existing,
          name: normalizedName,
          template: nextTemplate,
          updatedAt: now
        };
        nextPresets = customPresets.map((preset) => (preset.id === existing.id ? savedPreset : preset));
      } else {
        savedPreset = {
          id: `preset-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          name: normalizedName,
          template: nextTemplate,
          visibility: 'private',
          createdAt: now,
          updatedAt: now
        };
        nextPresets = [...customPresets, savedPreset].slice(0, 120);
      }

      setCustomPresets(nextPresets);
      persistCustomPresets(nextPresets);
      persistCustomTemplateName(normalizedName);
      return savedPreset;
    };

    if (!hasAuthToken()) {
      return persistLocalOnly();
    }

    try {
      let savedFromApi = null;
      if (existing) {
        savedFromApi = await updateTemplatePreset(existing.id, {
          name: normalizedName,
          template: nextTemplate
        });
      } else {
        savedFromApi = await createTemplatePreset({
          name: normalizedName,
          template: nextTemplate
        });
      }

      const normalizedSaved = normalizePresetRecord(savedFromApi);
      if (!normalizedSaved) {
        return persistLocalOnly();
      }

      const nextPresets = existing
        ? customPresets.map((preset) => (preset.id === existing.id ? normalizedSaved : preset))
        : [...customPresets, normalizedSaved].slice(0, 120);

      setCustomPresets(nextPresets);
      persistCustomPresets(nextPresets);
      persistCustomTemplateName(normalizedName);
      return normalizedSaved;
    } catch (error) {
      return persistLocalOnly();
    }
  };

  const handleApplyCustomPreset = (preset) => {
    if (!preset?.template) return;
    const nextDraft = normalizeCustomTemplate(preset.template);
    setCustomDraft(nextDraft);
    setCurrentTemplateIndex(0);
  };

  const handleSaveCustomPresetFromStudio = async (templateInput) => {
    const sourceTemplate = normalizeCustomTemplate(templateInput || customDraft);
    const nextName = String(sourceTemplate.name || '').trim();
    if (!nextName) return;
    const nextDraft = normalizeCustomTemplate({
      ...sourceTemplate,
      name: nextName
    });
    setCustomDraft(nextDraft);
    await upsertCustomPreset(nextDraft);
  };

  const handleDeleteCustomPreset = async (presetId) => {
    if (hasAuthToken()) {
      try {
        await deleteTemplatePreset(presetId);
      } catch (error) {
        // Keep local deletion behavior even if API deletion fails.
      }
    }

    const nextPresets = customPresets.filter((preset) => String(preset.id) !== String(presetId));
    setCustomPresets(nextPresets);
    persistCustomPresets(nextPresets);
  };

  const handleDuplicateCustomPreset = async (preset) => {
    if (!preset?.template) return;
    const baseName = String(preset.name || 'Custom Preset').trim() || 'Custom Preset';
    let candidate = `${baseName} Copy`;
    let step = 2;
    while (takenTemplateNameSet.has(candidate.toLowerCase())) {
      candidate = `${baseName} Copy ${step}`;
      step += 1;
    }

    const duplicatedTemplate = normalizeCustomTemplate({
      ...preset.template,
      name: candidate
    });

    await upsertCustomPreset(duplicatedTemplate);
  };

  const handleExportCustomPreset = async (preset) => {
    if (!preset?.template) return;
    const payload = JSON.stringify(
      {
        id: preset.id,
        name: preset.name,
        template: preset.template,
        exportedAt: new Date().toISOString()
      },
      null,
      2
    );

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(payload);
      } catch (error) {
        // Clipboard may be blocked; ignore silently.
      }
    }
  };

  const handleToggleCustomPresetShare = async (preset) => {
    if (!preset?.id) return;

    const nextVisibility = preset.visibility === 'public' ? 'private' : 'public';
    if (!hasAuthToken()) return;

    try {
      const updated = await toggleTemplatePresetShare(preset.id, nextVisibility);
      const normalizedUpdated = normalizePresetRecord(updated);
      if (!normalizedUpdated) return;

      const nextPresets = customPresets.map((item) =>
        String(item.id) === String(preset.id) ? normalizedUpdated : item
      );
      setCustomPresets(nextPresets);
      persistCustomPresets(nextPresets);
    } catch (error) {
      // Keep current state when API request fails.
    }
  };

  const handleUseTemplate = () => {
    if (!isCustomTemplate) {
      applySelection();
      return;
    }

    setCustomTemplateNameInput(customDraft.name || '');
    setShowCustomSaveModal(true);
  };

  const handleSaveCustomTemplateName = async () => {
    if (!customTemplateNameCanSave) return;
    const nextCustomDraft = normalizeCustomTemplate({
      ...customDraft,
      name: trimmedCustomTemplateName
    });
    setCustomDraft(nextCustomDraft);
    await upsertCustomPreset(nextCustomDraft);
    setShowCustomSaveModal(false);
    if (!onApplyTemplate) return;
    onApplyTemplate(currentTemplate.id, nextCustomDraft);
  };

  const handleCancelCustomTemplateSave = () => {
    setShowCustomSaveModal(false);
    applySelection();
  };

  const handlePrevTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev === 0 ? previewTemplates.length - 1 : prev - 1));
  };

  const handleNextTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev === previewTemplates.length - 1 ? 0 : prev + 1));
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
              {isCustomTemplate && (
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 sm:px-3 sm:py-2">
                  <span className="hidden text-xs font-semibold uppercase tracking-[0.1em] text-slate-300 sm:inline">Device</span>
                  {[
                    { id: 'desktop', icon: <FaDesktop />, label: 'Desktop' },
                    { id: 'tablet', icon: <FaTabletAlt />, label: 'Tablet' },
                    { id: 'mobile', icon: <FaMobileAlt />, label: 'Mobile' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setPreviewStudioDevice(option.id)}
                      className={`inline-flex items-center gap-1 rounded-md border p-1.5 text-xs font-semibold transition sm:px-2 sm:py-1 ${
                        previewStudioDevice === option.id
                          ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
                          : 'border-slate-500 bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                      aria-pressed={previewStudioDevice === option.id}
                      title={`${option.label} layout preview`}
                    >
                      {option.icon}
                      <span className="hidden md:inline">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {hasTemplateChoices && (
                <>
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
                </>
              )}
              <button
                onClick={handleUseTemplate}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 p-2 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:gap-2 sm:px-3 sm:py-2"
                title="Use this template"
              >
                <FaCheckCircle />
                <span className="hidden sm:inline">{useTemplateButtonLabel}</span>
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

      <div className={`${isFullscreen ? 'h-full pt-0' : 'h-full pt-28 pb-16 sm:pt-24'}`}>
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
              } h-[calc(100dvh-260px)] min-h-0 overflow-hidden sm:h-[calc(100dvh-248px)] lg:block lg:h-full`}
            >
              <CustomTemplateStudioPanel
                customDraft={customDraft}
                onChange={(nextDraft) => setCustomDraft(normalizeCustomTemplate(nextDraft))}
                customPresets={customPresets}
                onApplyPreset={handleApplyCustomPreset}
                onSavePreset={handleSaveCustomPresetFromStudio}
                onDeletePreset={handleDeleteCustomPreset}
                onDuplicatePreset={handleDuplicateCustomPreset}
                onExportPreset={handleExportCustomPreset}
                onTogglePresetShare={handleToggleCustomPresetShare}
                canSharePresets={hasAuthToken()}
                presetSyncing={isPresetSyncing}
                activeDevice={previewStudioDevice}
                onActiveDeviceChange={setPreviewStudioDevice}
                showCanvasShapeEditor={false}
              />
            </div>
          )}

          <div
            className={`relative rounded-2xl border border-slate-700 bg-white ${
              isCustomTemplate && !isFullscreen
                ? `${mobileStudioTab === 'preview' ? 'block' : 'hidden'} h-[calc(100dvh-260px)] min-h-0 sm:h-[calc(100dvh-248px)] lg:block lg:h-full`
                : 'h-full'
            }`}
          >
            {!isFullscreen && (
              <div className="absolute left-3 top-3 z-10 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-100">
                {currentTemplateIndex + 1} / {previewTemplates.length}
              </div>
            )}
            {!isFullscreen && (
              <div className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-cyan-200">
                <FaPalette className="mr-1 inline" />
                Selected: {selectedTemplateMeta?.name || 'Template'}
              </div>
            )}
            <div className="h-full w-full overflow-auto p-1">
              <div
                className={`h-full ${previewFrameMaxWidth ? 'mx-auto' : ''}`}
                style={previewFrameMaxWidth ? { maxWidth: previewFrameMaxWidth } : undefined}
              >
                <iframe
                  key={`${currentTemplate.id}-${effectiveThemeMode}-${previewStudioDevice}`}
                  srcDoc={htmlContent}
                  className="h-full w-full rounded-2xl"
                  title="Article Template Preview"
                  sandbox="allow-same-origin allow-scripts allow-popups"
                />
              </div>
            </div>
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
            {previewTemplates.map((template, index) => {
              const active = index === currentTemplateIndex;
              return (
                <button
                  key={template.id}
                  onClick={() => setCurrentTemplateIndex(index)}
                  className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    active
                      ? 'border-cyan-300 bg-cyan-500 text-slate-900'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {template.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCustomSaveModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h4 className="text-lg font-semibold text-slate-100">Save Custom Template Name</h4>
            <p className="mt-1 text-sm text-slate-400">
              Save this template name for reuse. If the name already exists, it will be updated.
            </p>

            <label className="mt-4 block text-sm text-slate-300">
              Template Name
              <input
                autoFocus
                type="text"
                placeholder="Enter template name"
                value={customTemplateNameInput}
                onChange={(event) => setCustomTemplateNameInput(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </label>

            {customTemplateNameIsReservedSystemName && (
              <p className="mt-2 text-xs font-semibold text-rose-300">
                This name is reserved by a built-in template. Please choose another name.
              </p>
            )}

            {customTemplateNameExists && customTemplateNameCanSave && (
              <p className="mt-2 text-xs font-semibold text-amber-300">
                Existing template found. Saving will update it.
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelCustomTemplateSave}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomTemplateName}
                disabled={!customTemplateNameCanSave}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  customTemplateNameCanSave
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'cursor-not-allowed bg-emerald-900/40 text-emerald-200/60'
                }`}
              >
                {customTemplateNameExists ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;


