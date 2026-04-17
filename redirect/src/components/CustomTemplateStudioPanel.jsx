import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaArrowsAlt,
  FaBorderAll,
  FaChevronDown,
  FaChevronUp,
  FaFont,
  FaGripLines,
  FaMinusCircle,
  FaPlusCircle,
  FaRulerCombined,
  FaSlidersH,
  FaSwatchbook,
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

const buildAlignIcon = (align) => {
  if (align === 'center') return <FaAlignCenter />;
  if (align === 'right') return <FaAlignRight />;
  return <FaAlignLeft />;
};

const CustomTemplateStudioPanel = ({ customDraft, onChange }) => {
  const stageRef = useRef(null);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [interaction, setInteraction] = useState(null);
  const [showAdvancedStyles, setShowAdvancedStyles] = useState(false);

  const normalizedDraft = useMemo(() => normalizeCustomTemplate(customDraft), [customDraft]);
  const studio = normalizedDraft.studio;
  const blocks = Array.isArray(studio?.blocks) ? studio.blocks : [];

  useEffect(() => {
    if (!blocks.length) {
      setSelectedBlockId('');
      return;
    }

    if (!selectedBlockId || !blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(blocks[0].id);
    }
  }, [blocks, selectedBlockId]);

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) || null;

  const commitDraft = (nextDraft) => {
    if (!onChange) return;
    onChange(normalizeCustomTemplate(nextDraft));
  };

  const updateTemplateField = (field, value) => {
    commitDraft({ ...normalizedDraft, [field]: value });
  };

  const updateStudioField = (field, value) => {
    commitDraft({
      ...normalizedDraft,
      studio: {
        ...studio,
        [field]: value
      }
    });
  };

  const updateBlock = (blockId, patch) => {
    const nextBlocks = blocks.map((block) => {
      if (block.id !== blockId) return block;
      return {
        ...block,
        ...patch
      };
    });

    commitDraft({
      ...normalizedDraft,
      studio: {
        ...studio,
        blocks: nextBlocks
      }
    });
  };

  const removeSelectedBlock = () => {
    if (!selectedBlock) return;
    const filtered = blocks.filter((block) => block.id !== selectedBlock.id);
    if (!filtered.length) return;

    commitDraft({
      ...normalizedDraft,
      studio: {
        ...studio,
        blocks: filtered
      }
    });

    setSelectedBlockId(filtered[0].id);
  };

  const addBlock = (type) => {
    const next = createCustomStudioBlock(type);
    const maxRowEnd = blocks.reduce((max, block) => Math.max(max, block.rowStart + block.rowSpan - 1), 1);
    const rows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;

    const placed = {
      ...next,
      rowStart: toInt(maxRowEnd + 1, 1, Math.max(1, rows - next.rowSpan + 1), next.rowStart)
    };

    const updatedBlocks = [...blocks, placed];

    commitDraft({
      ...normalizedDraft,
      studio: {
        ...studio,
        blocks: updatedBlocks
      }
    });

    setSelectedBlockId(placed.id);
  };

  useEffect(() => {
    if (!interaction) return;

    const handleMove = (event) => {
      const stage = stageRef.current;
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const colWidth = rect.width / GRID_COLUMNS;
      const rowHeight = rect.height / (studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows);
      const deltaCols = Math.round((event.clientX - interaction.startX) / colWidth);
      const deltaRows = Math.round((event.clientY - interaction.startY) / rowHeight);

      const rows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
      const start = interaction.initial;

      if (interaction.mode === 'drag') {
        const nextColStart = toInt(
          start.colStart + deltaCols,
          1,
          Math.max(1, GRID_COLUMNS - start.colSpan + 1),
          start.colStart
        );
        const nextRowStart = toInt(
          start.rowStart + deltaRows,
          1,
          Math.max(1, rows - start.rowSpan + 1),
          start.rowStart
        );

        updateBlock(interaction.blockId, {
          colStart: nextColStart,
          rowStart: nextRowStart
        });
      }

      if (interaction.mode === 'resize') {
        const nextColSpan = toInt(
          start.colSpan + deltaCols,
          1,
          Math.max(1, GRID_COLUMNS - start.colStart + 1),
          start.colSpan
        );
        const nextRowSpan = toInt(
          start.rowSpan + deltaRows,
          1,
          Math.max(1, rows - start.rowStart + 1),
          start.rowSpan
        );

        updateBlock(interaction.blockId, {
          colSpan: nextColSpan,
          rowSpan: nextRowSpan
        });
      }
    };

    const handleUp = () => {
      setInteraction(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [interaction, studio?.rows]);

  const stageRows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
  const stageHeight = Math.max(320, stageRows * 15);

  return (
    <aside className="h-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/95 p-4">
      <div className="mb-4 flex items-center gap-2 text-slate-100">
        <FaVectorSquare className="text-cyan-300" />
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em]">Custom Studio Playground</h4>
      </div>

      <div className="space-y-4 text-sm">
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
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            <FaArrowsAlt />
            Drag & Resize Layout
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
              <span className="mt-1 block text-[11px] text-slate-400">{stageRows}</span>
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
              <span className="mt-1 block text-[11px] text-slate-400">{studio?.rowHeight || 32}px</span>
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
            {blocks.map((block) => {
              const left = ((block.colStart - 1) / GRID_COLUMNS) * 100;
              const width = (block.colSpan / GRID_COLUMNS) * 100;
              const top = ((block.rowStart - 1) / stageRows) * 100;
              const height = (block.rowSpan / stageRows) * 100;
              const isActive = selectedBlockId === block.id;

              return (
                <button
                  key={block.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setSelectedBlockId(block.id);
                    setInteraction({
                      mode: 'drag',
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
                  className={`absolute overflow-hidden rounded-md border px-2 py-1 text-left text-[11px] transition ${
                    isActive
                      ? 'z-20 border-cyan-300 ring-1 ring-cyan-300/90'
                      : 'z-10 border-slate-400/40 hover:border-cyan-400/60'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    top: `${top}%`,
                    height: `${height}%`,
                    backgroundColor: block.shellBackgroundColor || block.backgroundColor,
                    color: block.textColor
                  }}
                >
                  <span className="block truncate font-semibold">{block.label}</span>
                  <span className="block truncate opacity-80">{block.colSpan}x{block.rowSpan}</span>
                  <span
                    className="absolute bottom-1 right-1 inline-flex h-4 w-4 cursor-se-resize items-center justify-center rounded-sm border border-current/40 bg-black/25"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedBlockId(block.id);
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

        {selectedBlock && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
                <FaRulerCombined />
                Selected Block
              </div>
              <button
                type="button"
                onClick={removeSelectedBlock}
                className="inline-flex items-center gap-1 rounded-md border border-rose-500/60 bg-rose-500/15 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/25"
              >
                <FaMinusCircle /> Remove
              </button>
            </div>

            <p className="mb-2 text-[11px] text-slate-400">
              Drag blocks on the canvas for quick layout changes. Use these values only for precise tuning.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-300">
                Label
                <input
                  type="text"
                  value={selectedBlock.label}
                  onChange={(event) => updateBlock(selectedBlock.id, { label: event.target.value.slice(0, 36) })}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-300">
                Type
                <select
                  value={selectedBlock.type}
                  onChange={(event) => updateBlock(selectedBlock.id, { type: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                >
                  {CUSTOM_TEMPLATE_BLOCK_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-300">
                Column Start
                <input
                  type="number"
                  min={1}
                  max={GRID_COLUMNS}
                  value={selectedBlock.colStart}
                  onChange={(event) => updateBlock(selectedBlock.id, {
                    colStart: toInt(event.target.value, 1, Math.max(1, GRID_COLUMNS - selectedBlock.colSpan + 1), selectedBlock.colStart)
                  })}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-300">
                Column Span
                <input
                  type="number"
                  min={1}
                  max={GRID_COLUMNS}
                  value={selectedBlock.colSpan}
                  onChange={(event) => updateBlock(selectedBlock.id, {
                    colSpan: toInt(event.target.value, 1, Math.max(1, GRID_COLUMNS - selectedBlock.colStart + 1), selectedBlock.colSpan)
                  })}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                />
              </label>

              <label className="text-xs text-slate-300">
                Row Start
                <input
                  type="number"
                  min={1}
                  max={stageRows}
                  value={selectedBlock.rowStart}
                  onChange={(event) => updateBlock(selectedBlock.id, {
                    rowStart: toInt(event.target.value, 1, Math.max(1, stageRows - selectedBlock.rowSpan + 1), selectedBlock.rowStart)
                  })}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-300">
                Row Span
                <input
                  type="number"
                  min={1}
                  max={stageRows}
                  value={selectedBlock.rowSpan}
                  onChange={(event) => updateBlock(selectedBlock.id, {
                    rowSpan: toInt(event.target.value, 1, Math.max(1, stageRows - selectedBlock.rowStart + 1), selectedBlock.rowSpan)
                  })}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedStyles((prev) => !prev)}
              className="mt-3 inline-flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-200 hover:bg-slate-700"
            >
              <span className="inline-flex items-center gap-2">
                <FaSlidersH />
                Advanced Style Controls
              </span>
              {showAdvancedStyles ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {showAdvancedStyles && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <label className="text-slate-300">
                    <span className="inline-flex items-center gap-1"><FaFont /> Font Scale</span>
                    <input
                      type="range"
                      min={0.72}
                      max={1.9}
                      step={0.02}
                      value={selectedBlock.fontScale}
                      onChange={(event) => updateBlock(selectedBlock.id, { fontScale: clamp(event.target.value, 0.72, 1.9, selectedBlock.fontScale) })}
                      className="mt-1 w-full"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">{selectedBlock.fontScale.toFixed(2)}x</span>
                  </label>

                  <label className="text-slate-300">
                    <span className="inline-flex items-center gap-1"><FaBorderAll /> Border Width</span>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={selectedBlock.borderWidth}
                      onChange={(event) => updateBlock(selectedBlock.id, { borderWidth: toInt(event.target.value, 0, 8, selectedBlock.borderWidth) })}
                      className="mt-1 w-full"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">{selectedBlock.borderWidth}px</span>
                  </label>

                  <label className="text-slate-300">
                    Border Radius
                    <input
                      type="range"
                      min={0}
                      max={44}
                      step={1}
                      value={selectedBlock.borderRadius}
                      onChange={(event) => updateBlock(selectedBlock.id, { borderRadius: toInt(event.target.value, 0, 44, selectedBlock.borderRadius) })}
                      className="mt-1 w-full"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">{selectedBlock.borderRadius}px</span>
                  </label>

                  <label className="text-slate-300">
                    Padding
                    <input
                      type="range"
                      min={6}
                      max={36}
                      step={1}
                      value={selectedBlock.padding}
                      onChange={(event) => updateBlock(selectedBlock.id, { padding: toInt(event.target.value, 6, 36, selectedBlock.padding) })}
                      className="mt-1 w-full"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">{selectedBlock.padding}px</span>
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-300">
                    Border Style
                    <select
                      value={selectedBlock.borderStyle}
                      onChange={(event) => updateBlock(selectedBlock.id, { borderStyle: event.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                    >
                      {CUSTOM_TEMPLATE_BORDER_STYLE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs text-slate-300">
                    Underline Style
                    <select
                      value={selectedBlock.underlineStyle}
                      onChange={(event) => updateBlock(selectedBlock.id, { underlineStyle: event.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                    >
                      {CUSTOM_TEMPLATE_UNDERLINE_STYLE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs text-slate-300">
                    Text Align
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

                  <label className="text-xs text-slate-300">
                    Shell Shadow
                    <div className="mt-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-2">
                      <label className="flex items-center gap-2 text-[11px] text-slate-300">
                        <input
                          type="checkbox"
                          checked={selectedBlock.shellShadowEnabled !== false}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, {
                              shellShadowEnabled: event.target.checked
                            })
                          }
                        />
                        Enable
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={3}
                        step={1}
                        value={selectedBlock.shellShadowLevel ?? selectedBlock.shadowLevel ?? 0}
                        disabled={selectedBlock.shellShadowEnabled === false}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, {
                            shellShadowLevel: toInt(event.target.value, 0, 3, selectedBlock.shellShadowLevel ?? selectedBlock.shadowLevel ?? 0),
                            shadowLevel: toInt(event.target.value, 0, 3, selectedBlock.shadowLevel ?? 0)
                          })
                        }
                        className="mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Level {selectedBlock.shellShadowLevel ?? selectedBlock.shadowLevel ?? 0}
                      </span>
                    </div>
                  </label>

                  <label className="text-xs text-slate-300">
                    Content Shadow
                    <div className="mt-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-2">
                      <label className="flex items-center gap-2 text-[11px] text-slate-300">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedBlock.contentShadowEnabled)}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, {
                              contentShadowEnabled: event.target.checked
                            })
                          }
                        />
                        Enable
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={3}
                        step={1}
                        value={selectedBlock.contentShadowLevel ?? 0}
                        disabled={!selectedBlock.contentShadowEnabled}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, {
                            contentShadowLevel: toInt(event.target.value, 0, 3, selectedBlock.contentShadowLevel ?? 0)
                          })
                        }
                        className="mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">Level {selectedBlock.contentShadowLevel ?? 0}</span>
                    </div>
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <label>
                    <span className="inline-flex items-center gap-1"><FaSwatchbook /> Block Shell</span>
                    <input
                      type="color"
                      value={selectedBlock.shellBackgroundColor || selectedBlock.backgroundColor}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, {
                          shellBackgroundColor: event.target.value
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900"
                    />
                  </label>
                  <label>
                    Content Background
                    <input
                      type="color"
                      value={selectedBlock.contentBackgroundColor || selectedBlock.backgroundColor}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, {
                          contentBackgroundColor: event.target.value,
                          backgroundColor: event.target.value
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900"
                    />
                  </label>
                  <label>
                    Text
                    <input
                      type="color"
                      value={selectedBlock.textColor}
                      onChange={(event) => updateBlock(selectedBlock.id, { textColor: event.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900"
                    />
                  </label>
                  <label>
                    Border
                    <input
                      type="color"
                      value={selectedBlock.borderColor}
                      onChange={(event) => updateBlock(selectedBlock.id, { borderColor: event.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900"
                    />
                  </label>
                  <label>
                    Underline
                    <input
                      type="color"
                      value={selectedBlock.underlineColor}
                      onChange={(event) => updateBlock(selectedBlock.id, { underlineColor: event.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-slate-600 bg-slate-900"
                    />
                  </label>
                </div>
              </>
            )}

            <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={selectedBlock.visible !== false}
                onChange={(event) => updateBlock(selectedBlock.id, { visible: event.target.checked })}
              />
              Show this block in final template
            </label>
          </div>
        )}
      </div>
    </aside>
  );
};

export default CustomTemplateStudioPanel;
