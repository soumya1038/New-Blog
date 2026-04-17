import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaArrowDown,
  FaArrowUp,
  FaArrowsAlt,
  FaBorderAll,
  FaChevronDown,
  FaChevronUp,
  FaClone,
  FaDesktop,
  FaDownload,
  FaExclamationTriangle,
  FaFont,
  FaGripLines,
  FaLayerGroup,
  FaLock,
  FaLockOpen,
  FaMinusCircle,
  FaMobileAlt,
  FaPlusCircle,
  FaRulerCombined,
  FaSave,
  FaSlidersH,
  FaSwatchbook,
  FaTabletAlt,
  FaTrash,
  FaVectorSquare
} from 'react-icons/fa';
import {
  ARTICLE_TEMPLATE_FONT_OPTIONS,
  ARTICLE_TEMPLATE_LAYOUT_OPTIONS,
  CUSTOM_TEMPLATE_BLOCK_OPTIONS,
  CUSTOM_TEMPLATE_BORDER_STYLE_OPTIONS,
  CUSTOM_TEMPLATE_UNDERLINE_STYLE_OPTIONS,
  CUSTOM_TEMPLATE_TEXT_ALIGN_OPTIONS,
  CUSTOM_TEMPLATE_PAGINATION_MODE_OPTIONS,
  CUSTOM_TEMPLATE_DEVICE_OPTIONS,
  CUSTOM_TEMPLATE_IMAGE_FIT_OPTIONS,
  CUSTOM_TEMPLATE_CAPTION_STYLE_OPTIONS,
  CUSTOM_TEMPLATE_VIDEO_LAYOUT_OPTIONS,
  CUSTOM_TEMPLATE_PAGE_PLACEMENT_OPTIONS,
  CUSTOM_TEMPLATE_BORDER_PRESET_OPTIONS,
  CUSTOM_TEMPLATE_HIGHLIGHT_PRESET_OPTIONS,
  CUSTOM_TEMPLATE_GRID_LIMITS,
  createCustomStudioBlock,
  normalizeCustomTemplate
} from '../utils/articleTemplates';

const GRID_COLUMNS = CUSTOM_TEMPLATE_GRID_LIMITS.columns;

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const toInt = (value, min, max, fallback) => Math.round(clamp(value, min, max, fallback));

const clone = (value) => JSON.parse(JSON.stringify(value));

const buildAlignIcon = (align) => {
  if (align === 'center') return <FaAlignCenter />;
  if (align === 'right') return <FaAlignRight />;
  return <FaAlignLeft />;
};

const isMediaBlockType = (type) => ['image', 'gallery', 'collage', 'video'].includes(type);

const borderPresetPatch = (presetId) => {
  switch (presetId) {
    case 'editorial':
      return { borderStyle: 'solid', borderWidth: 2, borderRadius: 6 };
    case 'stitched':
      return { borderStyle: 'dashed', borderWidth: 2, borderRadius: 16 };
    case 'ribbon':
      return { borderStyle: 'double', borderWidth: 3, borderRadius: 10 };
    default:
      return {};
  }
};

const highlightPresetPatch = (presetId, accentColor, accentSoftColor) => {
  switch (presetId) {
    case 'marker':
      return { underlineStyle: 'highlight', underlineColor: accentSoftColor };
    case 'spotlight':
      return { underlineStyle: 'solid', underlineColor: accentColor };
    case 'quote-badge':
      return { underlineStyle: 'wavy', underlineColor: accentColor };
    default:
      return { underlineStyle: 'none' };
  }
};

const compactSelection = (values) => {
  const next = [];
  values.forEach((value) => {
    const candidate = String(value || '').trim();
    if (candidate && !next.includes(candidate)) next.push(candidate);
  });
  return next;
};

const CustomTemplateStudioPanel = ({
  customDraft,
  onChange,
  customPresets = [],
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onDuplicatePreset,
  onExportPreset
}) => {
  const stageRef = useRef(null);
  const [activeDevice, setActiveDevice] = useState('desktop');
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [interaction, setInteraction] = useState(null);
  const [showAdvancedStyles, setShowAdvancedStyles] = useState(false);

  const normalizedDraft = useMemo(() => normalizeCustomTemplate(customDraft), [customDraft]);
  const studios = normalizedDraft.studios || {
    desktop: normalizedDraft.studio,
    tablet: clone(normalizedDraft.studio),
    mobile: clone(normalizedDraft.studio)
  };
  const studio = studios[activeDevice] || studios.desktop;
  const blocks = Array.isArray(studio?.blocks) ? studio.blocks : [];

  useEffect(() => {
    if (!blocks.length) {
      setSelectedBlockIds([]);
      return;
    }

    const blockIdSet = new Set(blocks.map((block) => block.id));
    const nextSelected = compactSelection(selectedBlockIds.filter((id) => blockIdSet.has(id)));

    if (!nextSelected.length) {
      setSelectedBlockIds([blocks[0].id]);
      return;
    }

    if (nextSelected.join('|') !== selectedBlockIds.join('|')) {
      setSelectedBlockIds(nextSelected);
    }
  }, [blocks, selectedBlockIds]);

  const selectedBlocks = useMemo(() => {
    const selectedSet = new Set(selectedBlockIds);
    return blocks.filter((block) => selectedSet.has(block.id));
  }, [blocks, selectedBlockIds]);

  const selectedBlock = selectedBlocks[selectedBlocks.length - 1] || null;

  const commitDraft = (nextDraft) => {
    if (!onChange) return;
    onChange(normalizeCustomTemplate(nextDraft));
  };

  const commitActiveStudio = (nextStudio) => {
    const nextStudios = {
      ...studios,
      [activeDevice]: nextStudio
    };

    commitDraft({
      ...normalizedDraft,
      studios: nextStudios,
      studio: nextStudios.desktop || nextStudio
    });
  };

  const updateTemplateField = (field, value) => {
    commitDraft({ ...normalizedDraft, [field]: value });
  };

  const updateStudioField = (field, value) => {
    commitActiveStudio({
      ...studio,
      [field]: value
    });
  };

  const updateBlocksByIds = (ids, patch) => {
    if (!ids.length) return;
    const idSet = new Set(ids);

    const nextBlocks = blocks.map((block, index) => {
      if (!idSet.has(block.id)) return block;
      const delta = typeof patch === 'function' ? patch(block, index) : patch;
      return {
        ...block,
        ...delta
      };
    });

    commitActiveStudio({
      ...studio,
      blocks: nextBlocks
    });
  };

  const updateBlock = (blockId, patch) => {
    updateBlocksByIds([blockId], patch);
  };

  const removeSelectedBlocks = () => {
    if (!selectedBlocks.length) return;
    const selectedSet = new Set(selectedBlocks.map((block) => block.id));
    const filtered = blocks.filter((block) => !selectedSet.has(block.id));
    if (!filtered.length) return;

    commitActiveStudio({
      ...studio,
      blocks: filtered
    });

    setSelectedBlockIds([filtered[0].id]);
  };

  const addBlock = (type) => {
    const next = createCustomStudioBlock(type);
    const rows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
    const maxRowEnd = blocks.reduce((max, block) => Math.max(max, block.rowStart + block.rowSpan - 1), 1);
    const maxZ = blocks.reduce((max, block) => Math.max(max, Number(block.zIndex || 1)), 1);

    const placed = {
      ...next,
      rowStart: toInt(maxRowEnd + 1, 1, Math.max(1, rows - next.rowSpan + 1), next.rowStart),
      zIndex: maxZ + 1
    };

    commitActiveStudio({
      ...studio,
      blocks: [...blocks, placed]
    });

    setSelectedBlockIds([placed.id]);
  };

  const duplicateSelectedBlocks = () => {
    if (!selectedBlocks.length) return;
    const rows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
    const maxZ = blocks.reduce((max, block) => Math.max(max, Number(block.zIndex || 1)), 1);

    const clones = selectedBlocks.map((block, index) => ({
      ...clone(block),
      id: `${block.type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label: `${block.label.slice(0, 28)} Copy`,
      colStart: toInt(block.colStart + 1, 1, Math.max(1, GRID_COLUMNS - block.colSpan + 1), block.colStart),
      rowStart: toInt(block.rowStart + 1, 1, Math.max(1, rows - block.rowSpan + 1), block.rowStart),
      zIndex: maxZ + index + 1,
      locked: false
    }));

    commitActiveStudio({
      ...studio,
      blocks: [...blocks, ...clones]
    });

    setSelectedBlockIds(clones.map((block) => block.id));
  };

  const toggleLockSelectedBlocks = () => {
    if (!selectedBlocks.length) return;
    const shouldLock = selectedBlocks.some((block) => !block.locked);
    updateBlocksByIds(
      selectedBlocks.map((block) => block.id),
      { locked: shouldLock }
    );
  };

  const reorderZIndex = (direction) => {
    if (!selectedBlocks.length) return;

    const selectedSet = new Set(selectedBlocks.map((block) => block.id));
    const selectedOrdered = [...selectedBlocks].sort(
      (left, right) => Number(left.zIndex || 1) - Number(right.zIndex || 1)
    );
    const restOrdered = blocks
      .filter((block) => !selectedSet.has(block.id))
      .sort((left, right) => Number(left.zIndex || 1) - Number(right.zIndex || 1));

    const nextBlocks = [];

    if (direction === 'front') {
      restOrdered.forEach((block, index) => nextBlocks.push({ ...block, zIndex: index + 1 }));
      const base = restOrdered.length;
      selectedOrdered.forEach((block, index) => nextBlocks.push({ ...block, zIndex: base + index + 1 }));
    } else {
      selectedOrdered.forEach((block, index) => nextBlocks.push({ ...block, zIndex: index + 1 }));
      const base = selectedOrdered.length;
      restOrdered.forEach((block, index) => nextBlocks.push({ ...block, zIndex: base + index + 1 }));
    }

    const lookup = new Map(nextBlocks.map((block) => [block.id, block]));
    commitActiveStudio({
      ...studio,
      blocks: blocks.map((block) => lookup.get(block.id) || block)
    });
  };

  const alignSelectedBlocks = (axis, mode) => {
    if (selectedBlocks.length < 2) return;

    if (axis === 'horizontal') {
      const minStart = Math.min(...selectedBlocks.map((block) => block.colStart));
      const maxEnd = Math.max(...selectedBlocks.map((block) => block.colStart + block.colSpan - 1));
      const center = (minStart + maxEnd) / 2;

      updateBlocksByIds(
        selectedBlocks.map((block) => block.id),
        (block) => {
          if (mode === 'left') {
            return {
              colStart: toInt(minStart, 1, Math.max(1, GRID_COLUMNS - block.colSpan + 1), block.colStart)
            };
          }
          if (mode === 'right') {
            return {
              colStart: toInt(maxEnd - block.colSpan + 1, 1, Math.max(1, GRID_COLUMNS - block.colSpan + 1), block.colStart)
            };
          }
          const centeredStart = Math.round(center - block.colSpan / 2 + 0.5);
          return {
            colStart: toInt(centeredStart, 1, Math.max(1, GRID_COLUMNS - block.colSpan + 1), block.colStart)
          };
        }
      );
      return;
    }

    const rows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
    const minStart = Math.min(...selectedBlocks.map((block) => block.rowStart));
    const maxEnd = Math.max(...selectedBlocks.map((block) => block.rowStart + block.rowSpan - 1));
    const center = (minStart + maxEnd) / 2;

    updateBlocksByIds(
      selectedBlocks.map((block) => block.id),
      (block) => {
        if (mode === 'top') {
          return {
            rowStart: toInt(minStart, 1, Math.max(1, rows - block.rowSpan + 1), block.rowStart)
          };
        }
        if (mode === 'bottom') {
          return {
            rowStart: toInt(maxEnd - block.rowSpan + 1, 1, Math.max(1, rows - block.rowSpan + 1), block.rowStart)
          };
        }
        const centeredStart = Math.round(center - block.rowSpan / 2 + 0.5);
        return {
          rowStart: toInt(centeredStart, 1, Math.max(1, rows - block.rowSpan + 1), block.rowStart)
        };
      }
    );
  };

  const applySpacingPreset = (presetId) => {
    if (!selectedBlocks.length) return;
    const patch =
      presetId === 'compact'
        ? { padding: 8 }
        : presetId === 'airy'
        ? { padding: 24 }
        : { padding: 14 };

    updateBlocksByIds(
      selectedBlocks.map((block) => block.id),
      patch
    );
  };

  const applyBorderPreset = (presetId) => {
    if (!selectedBlocks.length) return;
    updateBlocksByIds(
      selectedBlocks.map((block) => block.id),
      {
        borderPreset: presetId,
        ...borderPresetPatch(presetId)
      }
    );
  };

  const applyHighlightPreset = (presetId) => {
    if (!selectedBlocks.length) return;
    updateBlocksByIds(
      selectedBlocks.map((block) => block.id),
      {
        highlightPreset: presetId,
        ...highlightPresetPatch(presetId, normalizedDraft.accentColor, normalizedDraft.accentSoftColor)
      }
    );
  };

  const copyDesktopToActiveDevice = () => {
    if (activeDevice === 'desktop') return;
    commitActiveStudio(clone(studios.desktop));
  };

  useEffect(() => {
    if (!interaction) return;

    const handleMove = (event) => {
      const stage = stageRef.current;
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const rows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
      const colWidth = rect.width / GRID_COLUMNS;
      const rowHeight = rect.height / rows;
      const deltaCols = Math.round((event.clientX - interaction.startX) / colWidth);
      const deltaRows = Math.round((event.clientY - interaction.startY) / rowHeight);

      if (interaction.mode === 'drag') {
        const initialById = interaction.initialById || {};
        const nextBlocks = blocks.map((block) => {
          const initial = initialById[block.id];
          if (!initial || block.locked) return block;

          return {
            ...block,
            colStart: toInt(
              initial.colStart + deltaCols,
              1,
              Math.max(1, GRID_COLUMNS - initial.colSpan + 1),
              block.colStart
            ),
            rowStart: toInt(
              initial.rowStart + deltaRows,
              1,
              Math.max(1, rows - initial.rowSpan + 1),
              block.rowStart
            )
          };
        });

        commitActiveStudio({
          ...studio,
          blocks: nextBlocks
        });
      }

      if (interaction.mode === 'resize' && interaction.blockId) {
        const start = interaction.initial;
        const nextBlocks = blocks.map((block) => {
          if (block.id !== interaction.blockId || block.locked) return block;
          return {
            ...block,
            colSpan: toInt(
              start.colSpan + deltaCols,
              1,
              Math.max(1, GRID_COLUMNS - start.colStart + 1),
              block.colSpan
            ),
            rowSpan: toInt(
              start.rowSpan + deltaRows,
              1,
              Math.max(1, rows - start.rowStart + 1),
              block.rowSpan
            )
          };
        });

        commitActiveStudio({
          ...studio,
          blocks: nextBlocks
        });
      }
    };

    const handleUp = () => setInteraction(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [blocks, interaction, studio]);

  const stageRows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
  const stageHeight = Math.max(320, stageRows * 15);

  const sortedBlocksForCanvas = useMemo(
    () => [...blocks].sort((left, right) => Number(left.zIndex || 1) - Number(right.zIndex || 1)),
    [blocks]
  );

  const layoutWarnings = useMemo(() => {
    if (!blocks.length) return [];

    const warnings = [];
    const rows = stageRows;

    const overflowBlocks = blocks.filter(
      (block) => block.colStart + block.colSpan - 1 > GRID_COLUMNS || block.rowStart + block.rowSpan - 1 > rows
    );
    if (overflowBlocks.length) {
      warnings.push(`${overflowBlocks.length} block(s) overflow grid bounds on ${activeDevice}.`);
    }

    const occupied = new Map();
    let overlapCount = 0;

    blocks.forEach((block) => {
      if (block.visible === false) return;
      const rowEnd = Math.min(rows, block.rowStart + block.rowSpan - 1);
      const colEnd = Math.min(GRID_COLUMNS, block.colStart + block.colSpan - 1);

      for (let row = block.rowStart; row <= rowEnd; row += 1) {
        for (let col = block.colStart; col <= colEnd; col += 1) {
          const key = `${row}:${col}`;
          if (occupied.has(key)) overlapCount += 1;
          else occupied.set(key, block.id);
        }
      }
    });

    if (overlapCount > 0) warnings.push(`Layout has overlapping zones (${overlapCount} grid-cell collisions).`);
    const tinyBlocks = blocks.filter((block) => block.colSpan * block.rowSpan <= 2);
    if (tinyBlocks.length) warnings.push(`${tinyBlocks.length} block(s) are very small and may clip content.`);

    return warnings;
  }, [activeDevice, blocks, stageRows]);

  const matchingPreset = useMemo(() => {
    const name = String(normalizedDraft.name || '').trim().toLowerCase();
    if (!name) return null;
    return customPresets.find((preset) => String(preset?.name || '').trim().toLowerCase() === name) || null;
  }, [customPresets, normalizedDraft.name]);

  return (
    <aside className="h-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/95 p-4">
      <div className="mb-4 flex items-center gap-2 text-slate-100">
        <FaVectorSquare className="text-cyan-300" />
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em]">Custom Studio Playground</h4>
      </div>

      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Reusable Presets</p>
            <button
              type="button"
              onClick={() => onSavePreset && onSavePreset(normalizedDraft)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/60 bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25"
            >
              <FaSave /> {matchingPreset ? 'Update' : 'Save'} Preset
            </button>
          </div>

          {customPresets.length ? (
            <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
              {customPresets.map((preset) => {
                const isActive =
                  String(preset?.name || '').trim().toLowerCase() ===
                  String(normalizedDraft.name || '').trim().toLowerCase();

                return (
                  <div
                    key={preset.id}
                    className={`rounded-lg border p-2 ${isActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-600 bg-slate-900/70'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onApplyPreset && onApplyPreset(preset)}
                        className="truncate text-left text-xs font-semibold text-slate-100 hover:text-cyan-200"
                        title="Load preset"
                      >
                        {preset.name}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicatePreset && onDuplicatePreset(preset)}
                          className="rounded border border-slate-500/70 bg-slate-800 px-1.5 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                          title="Duplicate"
                        >
                          <FaClone />
                        </button>
                        <button
                          type="button"
                          onClick={() => onExportPreset && onExportPreset(preset)}
                          className="rounded border border-slate-500/70 bg-slate-800 px-1.5 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                          title="Export"
                        >
                          <FaDownload />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePreset && onDeletePreset(preset.id)}
                          className="rounded border border-rose-500/60 bg-rose-500/15 px-1.5 py-1 text-[10px] text-rose-200 hover:bg-rose-500/25"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No saved custom presets yet. Save one to build your library.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="block text-slate-300">
            Template Name
            <input
              type="text"
              value={normalizedDraft.name}
              onChange={(event) => updateTemplateField('name', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
            />
          </label>

          <label className="block text-slate-300">
            Base Layout Mood
            <select
              value={normalizedDraft.layout}
              onChange={(event) => updateTemplateField('layout', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
            >
              {ARTICLE_TEMPLATE_LAYOUT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-slate-300">
              Headline Font
              <select
                value={normalizedDraft.headlineFont}
                onChange={(event) => updateTemplateField('headlineFont', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
              >
                {ARTICLE_TEMPLATE_FONT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-slate-300">
              Body Font
              <select
                value={normalizedDraft.bodyFont}
                onChange={(event) => updateTemplateField('bodyFont', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
              >
                {ARTICLE_TEMPLATE_FONT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <label className="block">Accent
              <input type="color" value={normalizedDraft.accentColor} onChange={(event) => updateTemplateField('accentColor', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-600 bg-slate-800" />
            </label>
            <label className="block">Accent Soft
              <input type="color" value={normalizedDraft.accentSoftColor} onChange={(event) => updateTemplateField('accentSoftColor', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-600 bg-slate-800" />
            </label>
            <label className="block">Background 1
              <input type="color" value={normalizedDraft.backgroundStart} onChange={(event) => updateTemplateField('backgroundStart', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-600 bg-slate-800" />
            </label>
            <label className="block">Background 2
              <input type="color" value={normalizedDraft.backgroundEnd} onChange={(event) => updateTemplateField('backgroundEnd', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-600 bg-slate-800" />
            </label>
            <label className="block">Surface
              <input type="color" value={normalizedDraft.surfaceColor} onChange={(event) => updateTemplateField('surfaceColor', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-600 bg-slate-800" />
            </label>
            <label className="block">Text
              <input type="color" value={normalizedDraft.textColor} onChange={(event) => updateTemplateField('textColor', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-600 bg-slate-800" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-slate-300">
              <input type="checkbox" checked={normalizedDraft.showDropCap} onChange={(event) => updateTemplateField('showDropCap', event.target.checked)} />
              Drop Cap
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-slate-300">
              <input type="checkbox" checked={normalizedDraft.showProgress} onChange={(event) => updateTemplateField('showProgress', event.target.checked)} />
              Progress Bar
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-slate-300">
              Pagination
              <select
                value={normalizedDraft.paginationMode || 'auto'}
                onChange={(event) => updateTemplateField('paginationMode', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
              >
                {CUSTOM_TEMPLATE_PAGINATION_MODE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-slate-300">
              Manual Pages
              <input
                type="number"
                min={2}
                max={6}
                value={normalizedDraft.manualPageCount || 2}
                disabled={(normalizedDraft.paginationMode || 'auto') !== 'manual'}
                onChange={(event) => updateTemplateField('manualPageCount', toInt(event.target.value, 2, 6, normalizedDraft.manualPageCount || 2))}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            <span className="inline-flex items-center gap-2">
              <FaDesktop /> Responsive Designer
            </span>
            {activeDevice !== 'desktop' && (
              <button
                type="button"
                onClick={copyDesktopToActiveDevice}
                className="rounded-md border border-cyan-400/60 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100 hover:bg-cyan-500/20"
              >
                Copy Desktop -> {activeDevice}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1">
            {CUSTOM_TEMPLATE_DEVICE_OPTIONS.map((option) => {
              const icon = option.id === 'desktop' ? <FaDesktop /> : option.id === 'tablet' ? <FaTabletAlt /> : <FaMobileAlt />;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveDevice(option.id)}
                  className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${
                    activeDevice === option.id
                      ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100'
                      : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {icon}
                  {option.label}
                </button>
              );
            })}
          </div>

          {layoutWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2">
              <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.1em] text-amber-200">
                <FaExclamationTriangle /> Layout Warnings
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[11px] text-amber-100/90">
                {layoutWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            <FaArrowsAlt />
            Drag & Resize Layout ({activeDevice})
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-300">
              Rows
              <input
                type="range"
                min={CUSTOM_TEMPLATE_GRID_LIMITS.minRows}
                max={CUSTOM_TEMPLATE_GRID_LIMITS.maxRows}
                value={stageRows}
                onChange={(event) => updateStudioField('rows', toInt(event.target.value, CUSTOM_TEMPLATE_GRID_LIMITS.minRows, CUSTOM_TEMPLATE_GRID_LIMITS.maxRows, stageRows))}
                className="mt-1 w-full"
              />
            </label>
            <label className="text-xs text-slate-300">
              Row Height
              <input
                type="range"
                min={24}
                max={54}
                value={studio?.rowHeight || 32}
                onChange={(event) => updateStudioField('rowHeight', toInt(event.target.value, 24, 54, 32))}
                className="mt-1 w-full"
              />
            </label>
          </div>

          <div
            ref={stageRef}
            className="relative w-full overflow-hidden rounded-lg border border-slate-600 bg-slate-900"
            style={{
              height: stageHeight,
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.14) 1px, transparent 1px)',
              backgroundSize: `${100 / GRID_COLUMNS}% ${100 / stageRows}%`
            }}
          >
            {sortedBlocksForCanvas.map((block) => {
              const left = ((block.colStart - 1) / GRID_COLUMNS) * 100;
              const width = (block.colSpan / GRID_COLUMNS) * 100;
              const top = ((block.rowStart - 1) / stageRows) * 100;
              const height = (block.rowSpan / stageRows) * 100;
              const isActive = selectedBlockIds.includes(block.id);

              return (
                <button
                  key={block.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    const isToggle = event.metaKey || event.ctrlKey || event.shiftKey;
                    if (isToggle) {
                      setSelectedBlockIds((prev) => {
                        const next = prev.includes(block.id) ? prev.filter((id) => id !== block.id) : [...prev, block.id];
                        return next.length ? next : [block.id];
                      });
                      return;
                    }

                    const preparedSelection = selectedBlockIds.includes(block.id) ? selectedBlockIds : [block.id];
                    setSelectedBlockIds(preparedSelection);
                    if (block.locked) return;

                    const initialById = {};
                    preparedSelection.forEach((id) => {
                      const target = blocks.find((item) => item.id === id);
                      if (!target || target.locked) return;
                      initialById[id] = {
                        colStart: target.colStart,
                        colSpan: target.colSpan,
                        rowStart: target.rowStart,
                        rowSpan: target.rowSpan
                      };
                    });

                    if (!Object.keys(initialById).length) return;

                    setInteraction({
                      mode: 'drag',
                      startX: event.clientX,
                      startY: event.clientY,
                      initialById
                    });
                  }}
                  className={`absolute overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] transition ${
                    isActive ? 'border-cyan-300 ring-1 ring-cyan-300/90' : 'border-slate-400/40 hover:border-cyan-400/60'
                  } ${block.locked ? 'opacity-75' : ''}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    top: `${top}%`,
                    height: `${height}%`,
                    zIndex: Number(block.zIndex || 1),
                    backgroundColor: block.shellBackgroundColor || block.backgroundColor,
                    color: block.textColor
                  }}
                >
                  <span className="block truncate font-semibold">{block.label}</span>
                  <span className="block truncate opacity-80">{block.colSpan}x{block.rowSpan}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-[10px] opacity-80">
                    <FaLayerGroup /> z{block.zIndex || 1}
                    {block.locked ? <><FaLock /> locked</> : null}
                  </span>
                  <span
                    className={`absolute bottom-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-sm border border-current/40 bg-black/25 ${
                      block.locked ? 'cursor-not-allowed opacity-40' : 'cursor-se-resize'
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (block.locked) return;
                      setSelectedBlockIds([block.id]);
                      setInteraction({
                        mode: 'resize',
                        blockId: block.id,
                        startX: event.clientX,
                        startY: event.clientY,
                        initial: {
                          colStart: block.colStart,
                          colSpan: block.colSpan,
                          rowStart: block.rowStart,
                          rowSpan: block.rowSpan
                        }
                      });
                    }}
                  >
                    <FaGripLines className="text-[9px]" />
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            Tip: Ctrl/Cmd-click blocks to multi-select for group tools.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {CUSTOM_TEMPLATE_BLOCK_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => addBlock(option.id)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                <FaPlusCircle className="text-[10px]" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {selectedBlocks.length > 1 && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-violet-200">
              <FaLayerGroup /> Group Tools ({selectedBlocks.length})
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-600 bg-slate-900 p-2">
                <p className="mb-1 text-[11px] text-slate-400">Align Horizontal</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => alignSelectedBlocks('horizontal', 'left')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Left</button>
                  <button type="button" onClick={() => alignSelectedBlocks('horizontal', 'center')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Center</button>
                  <button type="button" onClick={() => alignSelectedBlocks('horizontal', 'right')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Right</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-900 p-2">
                <p className="mb-1 text-[11px] text-slate-400">Align Vertical</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => alignSelectedBlocks('vertical', 'top')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Top</button>
                  <button type="button" onClick={() => alignSelectedBlocks('vertical', 'middle')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Middle</button>
                  <button type="button" onClick={() => alignSelectedBlocks('vertical', 'bottom')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Bottom</button>
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-600 bg-slate-900 p-2">
                <p className="mb-1 text-[11px] text-slate-400">Spacing Presets</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => applySpacingPreset('compact')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Compact</button>
                  <button type="button" onClick={() => applySpacingPreset('balanced')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Balanced</button>
                  <button type="button" onClick={() => applySpacingPreset('airy')} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Airy</button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-900 p-2">
                <p className="mb-1 text-[11px] text-slate-400">Actions</p>
                <div className="flex gap-1">
                  <button type="button" onClick={duplicateSelectedBlocks} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Duplicate</button>
                  <button type="button" onClick={toggleLockSelectedBlocks} className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700">Lock/Unlock</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedBlock && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
                <FaRulerCombined /> Selected Block
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => reorderZIndex('front')} className="inline-flex items-center gap-1 rounded-md border border-slate-500/70 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"><FaArrowUp /> Front</button>
                <button type="button" onClick={() => reorderZIndex('back')} className="inline-flex items-center gap-1 rounded-md border border-slate-500/70 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"><FaArrowDown /> Back</button>
                <button type="button" onClick={removeSelectedBlocks} className="inline-flex items-center gap-1 rounded-md border border-rose-500/60 bg-rose-500/15 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/25"><FaMinusCircle /> Remove</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-300">Label
                <input type="text" value={selectedBlock.label} onChange={(event) => updateBlock(selectedBlock.id, { label: event.target.value.slice(0, 36) })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
              </label>
              <label className="text-xs text-slate-300">Type
                <select value={selectedBlock.type} onChange={(event) => updateBlock(selectedBlock.id, { type: event.target.value })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                  {CUSTOM_TEMPLATE_BLOCK_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-300">Column Start
                <input type="number" min={1} max={GRID_COLUMNS} value={selectedBlock.colStart} onChange={(event) => updateBlock(selectedBlock.id, { colStart: toInt(event.target.value, 1, Math.max(1, GRID_COLUMNS - selectedBlock.colSpan + 1), selectedBlock.colStart) })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
              </label>
              <label className="text-xs text-slate-300">Column Span
                <input type="number" min={1} max={GRID_COLUMNS} value={selectedBlock.colSpan} onChange={(event) => updateBlock(selectedBlock.id, { colSpan: toInt(event.target.value, 1, Math.max(1, GRID_COLUMNS - selectedBlock.colStart + 1), selectedBlock.colSpan) })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
              </label>
              <label className="text-xs text-slate-300">Row Start
                <input type="number" min={1} max={stageRows} value={selectedBlock.rowStart} onChange={(event) => updateBlock(selectedBlock.id, { rowStart: toInt(event.target.value, 1, Math.max(1, stageRows - selectedBlock.rowSpan + 1), selectedBlock.rowStart) })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
              </label>
              <label className="text-xs text-slate-300">Row Span
                <input type="number" min={1} max={stageRows} value={selectedBlock.rowSpan} onChange={(event) => updateBlock(selectedBlock.id, { rowSpan: toInt(event.target.value, 1, Math.max(1, stageRows - selectedBlock.rowStart + 1), selectedBlock.rowSpan) })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedStyles((prev) => !prev)}
              className="mt-3 inline-flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-200 hover:bg-slate-700"
            >
              <span className="inline-flex items-center gap-2"><FaSlidersH /> Advanced Style Controls</span>
              {showAdvancedStyles ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {showAdvancedStyles && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <label className="text-slate-300"><span className="inline-flex items-center gap-1"><FaFont /> Font Scale</span>
                    <input type="range" min={0.72} max={1.9} step={0.02} value={selectedBlock.fontScale} onChange={(event) => updateBlock(selectedBlock.id, { fontScale: clamp(event.target.value, 0.72, 1.9, selectedBlock.fontScale) })} className="mt-1 w-full" />
                  </label>
                  <label className="text-slate-300"><span className="inline-flex items-center gap-1"><FaBorderAll /> Border Width</span>
                    <input type="range" min={0} max={8} step={1} value={selectedBlock.borderWidth} onChange={(event) => updateBlock(selectedBlock.id, { borderWidth: toInt(event.target.value, 0, 8, selectedBlock.borderWidth) })} className="mt-1 w-full" />
                  </label>
                  <label className="text-slate-300">Border Radius
                    <input type="range" min={0} max={44} step={1} value={selectedBlock.borderRadius} onChange={(event) => updateBlock(selectedBlock.id, { borderRadius: toInt(event.target.value, 0, 44, selectedBlock.borderRadius) })} className="mt-1 w-full" />
                  </label>
                  <label className="text-slate-300">Padding
                    <input type="range" min={6} max={36} step={1} value={selectedBlock.padding} onChange={(event) => updateBlock(selectedBlock.id, { padding: toInt(event.target.value, 6, 36, selectedBlock.padding) })} className="mt-1 w-full" />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <label>Border Style
                    <select value={selectedBlock.borderStyle} onChange={(event) => updateBlock(selectedBlock.id, { borderStyle: event.target.value })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                      {CUSTOM_TEMPLATE_BORDER_STYLE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>Underline Style
                    <select value={selectedBlock.underlineStyle} onChange={(event) => updateBlock(selectedBlock.id, { underlineStyle: event.target.value })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                      {CUSTOM_TEMPLATE_UNDERLINE_STYLE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>Border Preset
                    <select value={selectedBlock.borderPreset || 'custom'} onChange={(event) => applyBorderPreset(event.target.value)} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                      {CUSTOM_TEMPLATE_BORDER_PRESET_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>Highlight Preset
                    <select value={selectedBlock.highlightPreset || 'none'} onChange={(event) => applyHighlightPreset(event.target.value)} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                      {CUSTOM_TEMPLATE_HIGHLIGHT_PRESET_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>Text Align
                    <div className="mt-1 flex gap-1">
                      {CUSTOM_TEMPLATE_TEXT_ALIGN_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => updateBlock(selectedBlock.id, { textAlign: option.id })}
                          className={`inline-flex flex-1 items-center justify-center rounded-md border px-2 py-1 text-xs ${
                            selectedBlock.textAlign === option.id
                              ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100'
                              : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {buildAlignIcon(option.id)}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <label><span className="inline-flex items-center gap-1"><FaSwatchbook /> Block Shell</span>
                    <input type="color" value={selectedBlock.shellBackgroundColor || selectedBlock.backgroundColor} onChange={(event) => updateBlock(selectedBlock.id, { shellBackgroundColor: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900" />
                  </label>
                  <label>Content Background
                    <input type="color" value={selectedBlock.contentBackgroundColor || selectedBlock.backgroundColor} onChange={(event) => updateBlock(selectedBlock.id, { contentBackgroundColor: event.target.value, backgroundColor: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900" />
                  </label>
                  <label>Text
                    <input type="color" value={selectedBlock.textColor} onChange={(event) => updateBlock(selectedBlock.id, { textColor: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900" />
                  </label>
                  <label>Border
                    <input type="color" value={selectedBlock.borderColor} onChange={(event) => updateBlock(selectedBlock.id, { borderColor: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900" />
                  </label>
                  <label>Underline
                    <input type="color" value={selectedBlock.underlineColor} onChange={(event) => updateBlock(selectedBlock.id, { underlineColor: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900" />
                  </label>
                </div>

                {isMediaBlockType(selectedBlock.type) && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    {selectedBlock.type !== 'video' && (
                      <>
                        <label>Image Fit
                          <select value={selectedBlock.imageFit || 'cover'} onChange={(event) => updateBlock(selectedBlock.id, { imageFit: event.target.value })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                            {CUSTOM_TEMPLATE_IMAGE_FIT_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>Caption Style
                          <select value={selectedBlock.captionStyle || 'strip'} onChange={(event) => updateBlock(selectedBlock.id, { captionStyle: event.target.value })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                            {CUSTOM_TEMPLATE_CAPTION_STYLE_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>Focal X
                          <input type="range" min={0} max={100} step={1} value={selectedBlock.focalX ?? 50} onChange={(event) => updateBlock(selectedBlock.id, { focalX: toInt(event.target.value, 0, 100, selectedBlock.focalX ?? 50) })} className="mt-1 w-full" />
                        </label>
                        <label>Focal Y
                          <input type="range" min={0} max={100} step={1} value={selectedBlock.focalY ?? 50} onChange={(event) => updateBlock(selectedBlock.id, { focalY: toInt(event.target.value, 0, 100, selectedBlock.focalY ?? 50) })} className="mt-1 w-full" />
                        </label>
                      </>
                    )}
                    {selectedBlock.type === 'video' && (
                      <label>Video Layout
                        <select value={selectedBlock.videoLayout || 'grid'} onChange={(event) => updateBlock(selectedBlock.id, { videoLayout: event.target.value })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                          {CUSTOM_TEMPLATE_VIDEO_LAYOUT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>Page Placement
                      <select value={selectedBlock.pagePlacement || 'all'} onChange={(event) => updateBlock(selectedBlock.id, { pagePlacement: event.target.value })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                        {CUSTOM_TEMPLATE_PAGE_PLACEMENT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </>
            )}

            <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
              <input type="checkbox" checked={selectedBlock.visible !== false} onChange={(event) => updateBlock(selectedBlock.id, { visible: event.target.checked })} />
              Show this block in final template
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};

export default CustomTemplateStudioPanel;
