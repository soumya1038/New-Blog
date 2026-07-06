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
  FaShareAlt,
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
  CUSTOM_TEMPLATE_SHAPE_PRESET_OPTIONS,
  CUSTOM_TEMPLATE_GRID_LIMITS,
  canUseCustomTemplateShapeForBlockType,
  getCustomTemplateShapeClipPath,
  createCustomStudioBlock,
  normalizeCustomTemplate
} from '../utils/articleTemplates';

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
const isShapeEligibleBlockType = (type) => canUseCustomTemplateShapeForBlockType(type);

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

const SHAPE_GRID_MIN = 1;
const SHAPE_GRID_MAX = 18;

const shapeCellToken = (row, col) => `${row}:${col}`;

const parseShapeCellToken = (token) => {
  const match = String(token || '').trim().match(/^(\d+):(\d+)$/);
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
};

const sortShapeMaskCells = (cells) =>
  [...cells].sort((left, right) => {
    const a = parseShapeCellToken(left);
    const b = parseShapeCellToken(right);
    if (!a || !b) return String(left).localeCompare(String(right));
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

const buildFullShapeMaskCells = (cols, rows) => {
  const normalizedCols = toInt(cols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedRows = toInt(rows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const result = [];
  for (let row = 0; row < normalizedRows; row += 1) {
    for (let col = 0; col < normalizedCols; col += 1) {
      result.push(shapeCellToken(row, col));
    }
  }
  return result;
};

const normalizeShapeMaskCells = (cells, cols, rows, fallback = []) => {
  const normalizedCols = toInt(cols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedRows = toInt(rows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const source = Array.isArray(cells) ? cells : fallback;
  const set = new Set();

  source.forEach((token) => {
    const parsed = parseShapeCellToken(token);
    if (!parsed) return;
    if (parsed.row < 0 || parsed.row >= normalizedRows) return;
    if (parsed.col < 0 || parsed.col >= normalizedCols) return;
    set.add(shapeCellToken(parsed.row, parsed.col));
  });

  return sortShapeMaskCells([...set]);
};

const remapShapeMaskCells = (cells, oldCols, oldRows, nextCols, nextRows) => {
  const normalizedOldCols = toInt(oldCols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedOldRows = toInt(oldRows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedNextCols = toInt(nextCols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedNextRows = toInt(nextRows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const current = normalizeShapeMaskCells(cells, normalizedOldCols, normalizedOldRows, []);
  if (!current.length) return buildFullShapeMaskCells(normalizedNextCols, normalizedNextRows);

  const next = new Set();
  current.forEach((token) => {
    const parsed = parseShapeCellToken(token);
    if (!parsed) return;
    const mappedCol = toInt(
      Math.floor(((parsed.col + 0.5) / normalizedOldCols) * normalizedNextCols),
      0,
      normalizedNextCols - 1,
      0
    );
    const mappedRow = toInt(
      Math.floor(((parsed.row + 0.5) / normalizedOldRows) * normalizedNextRows),
      0,
      normalizedNextRows - 1,
      0
    );
    next.add(shapeCellToken(mappedRow, mappedCol));
  });

  return sortShapeMaskCells([...next]);
};

const buildRowProfilesFromMask = (maskCells, cols, rows) => {
  const normalizedCols = toInt(cols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedRows = toInt(rows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedMask = normalizeShapeMaskCells(
    maskCells,
    normalizedCols,
    normalizedRows,
    buildFullShapeMaskCells(normalizedCols, normalizedRows)
  );
  const maskSet = new Set(normalizedMask);
  const left = Array.from({ length: normalizedRows }, () => null);
  const right = Array.from({ length: normalizedRows }, () => null);

  for (let row = 0; row < normalizedRows; row += 1) {
    let min = normalizedCols;
    let max = -1;
    for (let col = 0; col < normalizedCols; col += 1) {
      if (!maskSet.has(shapeCellToken(row, col))) continue;
      min = Math.min(min, col);
      max = Math.max(max, col);
    }

    if (max >= min) {
      left[row] = min;
      right[row] = max;
    }
  }

  return { left, right };
};

const buildColumnProfilesFromMask = (maskCells, cols, rows) => {
  const normalizedCols = toInt(cols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedRows = toInt(rows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedMask = normalizeShapeMaskCells(
    maskCells,
    normalizedCols,
    normalizedRows,
    buildFullShapeMaskCells(normalizedCols, normalizedRows)
  );
  const maskSet = new Set(normalizedMask);
  const top = Array.from({ length: normalizedCols }, () => null);
  const bottom = Array.from({ length: normalizedCols }, () => null);

  for (let col = 0; col < normalizedCols; col += 1) {
    let min = normalizedRows;
    let max = -1;
    for (let row = 0; row < normalizedRows; row += 1) {
      if (!maskSet.has(shapeCellToken(row, col))) continue;
      min = Math.min(min, row);
      max = Math.max(max, row);
    }

    if (max >= min) {
      top[col] = min;
      bottom[col] = max;
    }
  }

  return { top, bottom };
};

const buildMaskFromProfiles = (leftProfile, rightProfile, topProfile, bottomProfile, cols, rows) => {
  const normalizedCols = toInt(cols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const normalizedRows = toInt(rows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
  const tokens = [];

  for (let row = 0; row < normalizedRows; row += 1) {
    const rowLeft = leftProfile?.[row];
    const rowRight = rightProfile?.[row];
    if (rowLeft === null || rowLeft === undefined || rowRight === null || rowRight === undefined) continue;
    const left = toInt(rowLeft, 0, normalizedCols - 1, 0);
    const right = toInt(rowRight, 0, normalizedCols - 1, normalizedCols - 1);
    const start = Math.min(left, right);
    const end = Math.max(left, right);
    for (let col = start; col <= end; col += 1) {
      const colTop = topProfile?.[col];
      const colBottom = bottomProfile?.[col];
      if (colTop === null || colTop === undefined || colBottom === null || colBottom === undefined) continue;
      const top = toInt(colTop, 0, normalizedRows - 1, 0);
      const bottom = toInt(colBottom, 0, normalizedRows - 1, normalizedRows - 1);
      const topBound = Math.min(top, bottom);
      const bottomBound = Math.max(top, bottom);
      if (row < topBound || row > bottomBound) continue;
      tokens.push(shapeCellToken(row, col));
    }
  }

  return sortShapeMaskCells(tokens);
};

const CustomTemplateStudioPanel = ({
  customDraft,
  onChange,
  customPresets = [],
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onDuplicatePreset,
  onExportPreset,
  onTogglePresetShare,
  canSharePresets = false,
  presetSyncing = false,
  activeDevice: activeDeviceProp = 'desktop',
  onActiveDeviceChange,
  showCanvasShapeEditor = true
}) => {
  const stageRef = useRef(null);
  const [activeDevice, setActiveDevice] = useState(
    ['desktop', 'tablet', 'mobile'].includes(String(activeDeviceProp || '').trim())
      ? String(activeDeviceProp).trim()
      : 'desktop'
  );
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [interaction, setInteraction] = useState(null);
  const [shapeEdgeSession, setShapeEdgeSession] = useState(null);
  const [canvasShapeEditing, setCanvasShapeEditing] = useState(false);
  const [showAdvancedStyles, setShowAdvancedStyles] = useState(false);

  const normalizedDraft = useMemo(() => normalizeCustomTemplate(customDraft), [customDraft]);
  const studios = normalizedDraft.studios || {
    desktop: normalizedDraft.studio,
    tablet: clone(normalizedDraft.studio),
    mobile: clone(normalizedDraft.studio)
  };
  const studio = studios[activeDevice] || studios.desktop;
  const blocks = Array.isArray(studio?.blocks) ? studio.blocks : [];
  const contentPageIndexByBlockId = useMemo(() => {
    const map = new Map();
    blocks
      .filter((block) => block.type === 'content')
      .sort((left, right) => left.rowStart - right.rowStart || left.colStart - right.colStart)
      .forEach((block, index) => {
        map.set(block.id, index + 1);
      });
    return map;
  }, [blocks]);
  const getDisplayBlockLabel = (block) => {
    if (!block) return '';
    if (block.type === 'content') {
      return `Main Content Page ${contentPageIndexByBlockId.get(block.id) || 1}`;
    }
    if (block.type === 'product-tags') return 'Product Tag Anchor';
    return block.label;
  };
  const stageColumns = toInt(
    studio?.columns,
    CUSTOM_TEMPLATE_GRID_LIMITS.minColumns || 8,
    CUSTOM_TEMPLATE_GRID_LIMITS.maxColumns || 48,
    CUSTOM_TEMPLATE_GRID_LIMITS.columns
  );
  const stageRows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
  const stageHeight = Math.max(320, stageRows * 15);

  useEffect(() => {
    const normalizedDevice = ['desktop', 'tablet', 'mobile'].includes(String(activeDeviceProp || '').trim())
      ? String(activeDeviceProp).trim()
      : 'desktop';
    setActiveDevice((prev) => (prev === normalizedDevice ? prev : normalizedDevice));
  }, [activeDeviceProp]);

  useEffect(() => {
    if (typeof onActiveDeviceChange === 'function') {
      onActiveDeviceChange(activeDevice);
    }
  }, [activeDevice, onActiveDeviceChange]);

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
  const selectedBlockSupportsShapeCanvas = Boolean(
    selectedBlock
    && isShapeEligibleBlockType(selectedBlock.type)
    && !isMediaBlockType(selectedBlock.type)
  );
  const canvasShapeGridCols = toInt(selectedBlock?.colSpan ?? 1, 1, stageColumns, 1);
  const canvasShapeGridRows = toInt(selectedBlock?.rowSpan ?? 1, 1, stageRows, 1);
  const selectedCanvasShapeMask = useMemo(() => {
    if (!selectedBlock || !selectedBlockSupportsShapeCanvas) return [];
    const sourceShapeCols = toInt(
      selectedBlock.shapeGridCols ?? selectedBlock.colSpan ?? 1,
      SHAPE_GRID_MIN,
      SHAPE_GRID_MAX,
      Math.max(1, selectedBlock.colSpan || 1)
    );
    const sourceShapeRows = toInt(
      selectedBlock.shapeGridRows ?? selectedBlock.rowSpan ?? 1,
      SHAPE_GRID_MIN,
      SHAPE_GRID_MAX,
      Math.max(1, selectedBlock.rowSpan || 1)
    );
    const remapped = remapShapeMaskCells(
      selectedBlock.shapeMaskCells,
      sourceShapeCols,
      sourceShapeRows,
      canvasShapeGridCols,
      canvasShapeGridRows
    );
    return normalizeShapeMaskCells(remapped, canvasShapeGridCols, canvasShapeGridRows, buildFullShapeMaskCells(canvasShapeGridCols, canvasShapeGridRows));
  }, [
    selectedBlock,
    selectedBlockSupportsShapeCanvas,
    canvasShapeGridCols,
    canvasShapeGridRows
  ]);
  const selectedCanvasShapeMaskSet = useMemo(() => new Set(selectedCanvasShapeMask), [selectedCanvasShapeMask]);
  const selectedCanvasRowProfiles = useMemo(
    () => buildRowProfilesFromMask(selectedCanvasShapeMask, canvasShapeGridCols, canvasShapeGridRows),
    [selectedCanvasShapeMask, canvasShapeGridCols, canvasShapeGridRows]
  );
  const selectedCanvasColumnProfiles = useMemo(
    () => buildColumnProfilesFromMask(selectedCanvasShapeMask, canvasShapeGridCols, canvasShapeGridRows),
    [selectedCanvasShapeMask, canvasShapeGridCols, canvasShapeGridRows]
  );

  useEffect(() => {
    if (!shapeEdgeSession) return;
    const currentBlockId = selectedBlock?.id || null;
    if (shapeEdgeSession.blockId !== currentBlockId) {
      setShapeEdgeSession(null);
    }
  }, [shapeEdgeSession, selectedBlock]);

  useEffect(() => {
    if (!canvasShapeEditing) return;
    if (!showCanvasShapeEditor || !selectedBlockSupportsShapeCanvas || selectedBlocks.length !== 1) {
      setCanvasShapeEditing(false);
    }
  }, [canvasShapeEditing, selectedBlockSupportsShapeCanvas, selectedBlocks.length, showCanvasShapeEditor]);

  useEffect(() => {
    if (!canvasShapeEditing) {
      if (shapeEdgeSession) setShapeEdgeSession(null);
    }
  }, [canvasShapeEditing, shapeEdgeSession]);

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
      colStart: toInt(next.colStart, 1, Math.max(1, stageColumns - next.colSpan + 1), next.colStart),
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
      colStart: toInt(block.colStart + 1, 1, Math.max(1, stageColumns - block.colSpan + 1), block.colStart),
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
              colStart: toInt(minStart, 1, Math.max(1, stageColumns - block.colSpan + 1), block.colStart)
            };
          }
          if (mode === 'right') {
            return {
              colStart: toInt(maxEnd - block.colSpan + 1, 1, Math.max(1, stageColumns - block.colSpan + 1), block.colStart)
            };
          }
          const centeredStart = Math.round(center - block.colSpan / 2 + 0.5);
          return {
            colStart: toInt(centeredStart, 1, Math.max(1, stageColumns - block.colSpan + 1), block.colStart)
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

  const syncShapeMaskToBlockSpan = (block, nextColSpan, nextRowSpan) => {
    if (!block || block.shapePreset !== 'cells' || !isShapeEligibleBlockType(block.type)) return {};
    const oldCols = toInt(block.shapeGridCols ?? block.colSpan ?? 1, SHAPE_GRID_MIN, SHAPE_GRID_MAX, Math.max(1, block.colSpan || 1));
    const oldRows = toInt(block.shapeGridRows ?? block.rowSpan ?? 1, SHAPE_GRID_MIN, SHAPE_GRID_MAX, Math.max(1, block.rowSpan || 1));
    const targetCols = toInt(nextColSpan ?? block.colSpan ?? oldCols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, oldCols);
    const targetRows = toInt(nextRowSpan ?? block.rowSpan ?? oldRows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, oldRows);
    const remappedMask = remapShapeMaskCells(block.shapeMaskCells, oldCols, oldRows, targetCols, targetRows);
    return {
      shapeGridCols: targetCols,
      shapeGridRows: targetRows,
      shapeMaskCells: normalizeShapeMaskCells(
        remappedMask,
        targetCols,
        targetRows,
        buildFullShapeMaskCells(targetCols, targetRows)
      )
    };
  };

  const updateSelectedBlockShapeMask = (nextCells, nextCols, nextRows) => {
    if (!selectedBlock) return;
    const maskCols = toInt(nextCols ?? selectedBlock.shapeGridCols ?? 6, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
    const maskRows = toInt(nextRows ?? selectedBlock.shapeGridRows ?? 6, SHAPE_GRID_MIN, SHAPE_GRID_MAX, 6);
    const fallback = buildFullShapeMaskCells(maskCols, maskRows);
    const normalizedMask = normalizeShapeMaskCells(nextCells, maskCols, maskRows, fallback);

    updateBlock(selectedBlock.id, {
      shapePreset: 'cells',
      shapeGridCols: maskCols,
      shapeGridRows: maskRows,
      shapeMaskCells: normalizedMask.length ? normalizedMask : fallback
    });
  };

  const beginCanvasShapeEdgeDrag = (event, axis, index, edge) => {
    if (!selectedBlock || !selectedBlockSupportsShapeCanvas || !canvasShapeEditing) return;
    event.preventDefault();
    event.stopPropagation();
    const blockNode = event.currentTarget.closest('[data-canvas-block-id]');
    if (!blockNode) return;
    const blockRect = blockNode.getBoundingClientRect();
    if (!blockRect.width || !blockRect.height) return;

    const snapshot = {
      left: selectedCanvasRowProfiles.left.slice(),
      right: selectedCanvasRowProfiles.right.slice(),
      top: selectedCanvasColumnProfiles.top.slice(),
      bottom: selectedCanvasColumnProfiles.bottom.slice()
    };

    setShapeEdgeSession({
      blockId: selectedBlock.id,
      axis: axis === 'col' ? 'col' : 'row',
      index: axis === 'col'
        ? toInt(index, 0, Math.max(0, canvasShapeGridCols - 1), 0)
        : toInt(index, 0, Math.max(0, canvasShapeGridRows - 1), 0),
      edge:
        edge === 'right' || edge === 'left' || edge === 'top' || edge === 'bottom'
          ? edge
          : 'left',
      blockRect: {
        left: blockRect.left,
        top: blockRect.top,
        width: blockRect.width,
        height: blockRect.height
      },
      startProfiles: snapshot
    });
  };

  const applyCanvasShapeEdgeDrag = (clientX, clientY) => {
    if (!shapeEdgeSession || !selectedBlock || shapeEdgeSession.blockId !== selectedBlock.id) return;
    const { blockRect, startProfiles } = shapeEdgeSession;
    if (!blockRect?.width || !blockRect?.height) return;

    const relativeX = clientX - blockRect.left;
    const relativeY = clientY - blockRect.top;
    const nextCol = toInt(
      Math.floor((relativeX / blockRect.width) * canvasShapeGridCols),
      0,
      Math.max(0, canvasShapeGridCols - 1),
      shapeEdgeSession.edge === 'left' ? 0 : Math.max(0, canvasShapeGridCols - 1)
    );
    const nextRow = toInt(
      Math.floor((relativeY / blockRect.height) * canvasShapeGridRows),
      0,
      Math.max(0, canvasShapeGridRows - 1),
      shapeEdgeSession.axis === 'row' ? shapeEdgeSession.index : 0
    );

    const nextLeft = (startProfiles?.left || []).slice();
    const nextRight = (startProfiles?.right || []).slice();
    const nextTop = (startProfiles?.top || []).slice();
    const nextBottom = (startProfiles?.bottom || []).slice();

    if (shapeEdgeSession.axis === 'row') {
      const fromRow = Math.min(shapeEdgeSession.index, nextRow);
      const toRow = Math.max(shapeEdgeSession.index, nextRow);
      for (let row = fromRow; row <= toRow; row += 1) {
        let rowLeft = nextLeft[row];
        let rowRight = nextRight[row];
        if (rowLeft === null || rowLeft === undefined || rowRight === null || rowRight === undefined) {
          rowLeft = 0;
          rowRight = Math.max(0, canvasShapeGridCols - 1);
        }

        if (shapeEdgeSession.edge === 'left') {
          nextLeft[row] = toInt(nextCol, 0, rowRight, rowLeft);
        } else if (shapeEdgeSession.edge === 'right') {
          nextRight[row] = toInt(nextCol, rowLeft, Math.max(0, canvasShapeGridCols - 1), rowRight);
        }
      }
    } else {
      const fromCol = Math.min(shapeEdgeSession.index, nextCol);
      const toCol = Math.max(shapeEdgeSession.index, nextCol);
      for (let col = fromCol; col <= toCol; col += 1) {
        let colTop = nextTop[col];
        let colBottom = nextBottom[col];
        if (colTop === null || colTop === undefined || colBottom === null || colBottom === undefined) {
          colTop = 0;
          colBottom = Math.max(0, canvasShapeGridRows - 1);
        }

        if (shapeEdgeSession.edge === 'top') {
          nextTop[col] = toInt(nextRow, 0, colBottom, colTop);
        } else if (shapeEdgeSession.edge === 'bottom') {
          nextBottom[col] = toInt(nextRow, colTop, Math.max(0, canvasShapeGridRows - 1), colBottom);
        }
      }
    }

    const nextMask = buildMaskFromProfiles(
      nextLeft,
      nextRight,
      nextTop,
      nextBottom,
      canvasShapeGridCols,
      canvasShapeGridRows
    );
    const fallback = buildFullShapeMaskCells(canvasShapeGridCols, canvasShapeGridRows);
    updateSelectedBlockShapeMask(nextMask.length ? nextMask : fallback, canvasShapeGridCols, canvasShapeGridRows);
  };

  const toggleCanvasShapeEditingMode = () => {
    if (!selectedBlock || !selectedBlockSupportsShapeCanvas) return;

    if (!canvasShapeEditing) {
      const nextCols = toInt(selectedBlock.colSpan, SHAPE_GRID_MIN, SHAPE_GRID_MAX, selectedBlock.colSpan);
      const nextRows = toInt(selectedBlock.rowSpan, SHAPE_GRID_MIN, SHAPE_GRID_MAX, selectedBlock.rowSpan);
      const fullMask = buildFullShapeMaskCells(nextCols, nextRows);
      const preserveExistingShape =
        (selectedBlock.shapePreset || 'rect') === 'cells'
        && Array.isArray(selectedBlock.shapeMaskCells)
        && selectedBlock.shapeMaskCells.length > 0;
      const syncedMask = preserveExistingShape
        ? remapShapeMaskCells(
            selectedBlock.shapeMaskCells,
            toInt(selectedBlock.shapeGridCols ?? nextCols, SHAPE_GRID_MIN, SHAPE_GRID_MAX, nextCols),
            toInt(selectedBlock.shapeGridRows ?? nextRows, SHAPE_GRID_MIN, SHAPE_GRID_MAX, nextRows),
            nextCols,
            nextRows
          )
        : fullMask;
      const rowProfiles = buildRowProfilesFromMask(syncedMask, nextCols, nextRows);
      const colProfiles = buildColumnProfilesFromMask(syncedMask, nextCols, nextRows);
      const stabilizedMask = buildMaskFromProfiles(
        rowProfiles.left,
        rowProfiles.right,
        colProfiles.top,
        colProfiles.bottom,
        nextCols,
        nextRows
      );
      updateBlock(selectedBlock.id, {
        shapePreset: 'cells',
        shapeGridCols: nextCols,
        shapeGridRows: nextRows,
        shapeMaskCells: normalizeShapeMaskCells(
          stabilizedMask.length ? stabilizedMask : fullMask,
          nextCols,
          nextRows,
          fullMask
        )
      });
    }

    setShapeEdgeSession(null);
    setCanvasShapeEditing((prev) => !prev);
  };

  const copyDesktopToActiveDevice = () => {
    if (activeDevice === 'desktop') return;
    commitActiveStudio(clone(studios.desktop));
  };

  useEffect(() => {
    if (!shapeEdgeSession) return undefined;

    const handleMouseMove = (event) => {
      applyCanvasShapeEdgeDrag(event.clientX, event.clientY);
    };

    const handleMouseUp = () => {
      setShapeEdgeSession(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [shapeEdgeSession, applyCanvasShapeEdgeDrag]);

  useEffect(() => {
    if (!interaction) return;

    const handleMove = (event) => {
      const stage = stageRef.current;
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const rows = studio?.rows || CUSTOM_TEMPLATE_GRID_LIMITS.minRows;
      const colWidth = rect.width / stageColumns;
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
              Math.max(1, stageColumns - initial.colSpan + 1),
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
        const edge = interaction.resizeEdge || 'se';
        const nextBlocks = blocks.map((block) => {
          if (block.id !== interaction.blockId || block.locked) return block;

          let nextColStart = start.colStart;
          let nextRowStart = start.rowStart;
          let nextColSpan = start.colSpan;
          let nextRowSpan = start.rowSpan;

          if (edge.includes('e')) {
            nextColSpan = toInt(
              start.colSpan + deltaCols,
              1,
              Math.max(1, stageColumns - start.colStart + 1),
              block.colSpan
            );
          }

          if (edge.includes('s')) {
            nextRowSpan = toInt(
              start.rowSpan + deltaRows,
              1,
              Math.max(1, rows - start.rowStart + 1),
              block.rowSpan
            );
          }

          if (edge.includes('w')) {
            const maxStart = start.colStart + start.colSpan - 1;
            nextColStart = toInt(start.colStart + deltaCols, 1, maxStart, start.colStart);
            nextColSpan = toInt(
              start.colSpan + (start.colStart - nextColStart),
              1,
              Math.max(1, stageColumns - nextColStart + 1),
              start.colSpan
            );
          }

          if (edge.includes('n')) {
            const maxStart = start.rowStart + start.rowSpan - 1;
            nextRowStart = toInt(start.rowStart + deltaRows, 1, maxStart, start.rowStart);
            nextRowSpan = toInt(
              start.rowSpan + (start.rowStart - nextRowStart),
              1,
              Math.max(1, rows - nextRowStart + 1),
              start.rowSpan
            );
          }

          return {
            ...block,
            colStart: nextColStart,
            rowStart: nextRowStart,
            colSpan: nextColSpan,
            rowSpan: nextRowSpan,
            ...syncShapeMaskToBlockSpan(block, nextColSpan, nextRowSpan)
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
  }, [blocks, interaction, stageColumns, studio]);

  const sortedBlocksForCanvas = useMemo(
    () => [...blocks].sort((left, right) => Number(left.zIndex || 1) - Number(right.zIndex || 1)),
    [blocks]
  );

  const layoutWarnings = useMemo(() => {
    if (!blocks.length) return [];

    const warnings = [];
    const rows = stageRows;

    const overflowBlocks = blocks.filter(
      (block) => block.colStart + block.colSpan - 1 > stageColumns || block.rowStart + block.rowSpan - 1 > rows
    );
    if (overflowBlocks.length) {
      warnings.push(`${overflowBlocks.length} block(s) overflow grid bounds on ${activeDevice}.`);
    }

    const occupied = new Map();
    let overlapCount = 0;

    blocks.forEach((block) => {
      if (block.visible === false) return;
      const rowEnd = Math.min(rows, block.rowStart + block.rowSpan - 1);
      const colEnd = Math.min(stageColumns, block.colStart + block.colSpan - 1);

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
  }, [activeDevice, blocks, stageColumns, stageRows]);

  const matchingPreset = useMemo(() => {
    const name = String(normalizedDraft.name || '').trim().toLowerCase();
    if (!name) return null;
    return customPresets.find((preset) => String(preset?.name || '').trim().toLowerCase() === name) || null;
  }, [customPresets, normalizedDraft.name]);

  return (
    <aside className="h-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/95 p-3 sm:p-4">
      <div className="mb-4 flex items-center gap-2 text-slate-100">
        <FaVectorSquare className="text-cyan-300" />
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em]">Custom Studio Playground</h4>
      </div>

      <div className="space-y-3 text-sm sm:space-y-4">
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
          {presetSyncing && (
            <p className="mb-2 text-[11px] text-slate-400">Syncing presets from your account...</p>
          )}

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
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                          preset.visibility === 'public'
                            ? 'border border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                            : 'border border-slate-500/80 bg-slate-800 text-slate-300'
                        }`}
                      >
                        {preset.visibility === 'public' ? 'Public' : 'Private'}
                      </span>
                      <div className="flex items-center gap-1">
                        {canSharePresets && (
                          <button
                            type="button"
                            onClick={() => onTogglePresetShare && onTogglePresetShare(preset)}
                            className="rounded border border-slate-500/70 bg-slate-800 px-1.5 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                            title={preset.visibility === 'public' ? 'Make private' : 'Share publicly'}
                          >
                            <FaShareAlt />
                          </button>
                        )}
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-2 text-slate-300 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-slate-300">
              <input type="checkbox" checked={normalizedDraft.showDropCap} onChange={(event) => updateTemplateField('showDropCap', event.target.checked)} />
              Drop Cap
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-slate-300">
              <input type="checkbox" checked={normalizedDraft.showProgress} onChange={(event) => updateTemplateField('showProgress', event.target.checked)} />
              Progress Bar
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            <span className="inline-flex items-center gap-2">
              <FaArrowsAlt />
              Drag & Resize Layout ({activeDevice})
            </span>
            {showCanvasShapeEditor && selectedBlockSupportsShapeCanvas && selectedBlocks.length === 1 && (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleCanvasShapeEditingMode}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                    canvasShapeEditing
                      ? 'border-violet-300 bg-violet-500/25 text-violet-100'
                      : 'border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <FaVectorSquare />
                  {canvasShapeEditing ? 'Exit Canvas Shape' : 'Canvas Shape Edit'}
                </button>
                {canvasShapeEditing && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-cyan-300/60 bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-100">
                    <FaArrowsAlt /> Edge Drag Active
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-300">
            Grid is auto-managed for {activeDevice}: {stageColumns} columns, {stageRows} rows.
            Use drag and resize handles to design layout.
          </div>

          {showCanvasShapeEditor && canvasShapeEditing && selectedBlockSupportsShapeCanvas && (
            <p className="mb-2 rounded-md border border-violet-400/40 bg-violet-500/10 px-2 py-2 text-[11px] text-violet-100">
              Drag border handles directly on the selected block to sculpt shape with 90-degree corners. No paint/erase is required.
            </p>
          )}

          <div
            ref={stageRef}
            className="relative w-full overflow-hidden rounded-lg border border-slate-600 bg-slate-900"
            style={{
              height: stageHeight,
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.14) 1px, transparent 1px)',
              backgroundSize: `${100 / stageColumns}% ${100 / stageRows}%`
            }}
          >
            {sortedBlocksForCanvas.map((block) => {
              const left = ((block.colStart - 1) / stageColumns) * 100;
              const width = (block.colSpan / stageColumns) * 100;
              const top = ((block.rowStart - 1) / stageRows) * 100;
              const height = (block.rowSpan / stageRows) * 100;
              const isActive = selectedBlockIds.includes(block.id);
              const shapeClipPath = isShapeEligibleBlockType(block.type)
                ? getCustomTemplateShapeClipPath(
                    block.shapePreset,
                    block.shapeNotch,
                    block.shapeOffset,
                    block.shapeGridCols,
                    block.shapeGridRows,
                    block.shapeMaskCells
                  )
                : 'none';
              const useSteppedShape = shapeClipPath && shapeClipPath !== 'none';
              const showCanvasShapeOverlay =
                showCanvasShapeEditor
                && canvasShapeEditing
                && selectedBlock?.id === block.id
                && selectedBlockSupportsShapeCanvas
                && (block.shapePreset || 'rect') === 'cells';
              const isProductTagAnchor = block.type === 'product-tags';

              return (
                <button
                  key={block.id}
                  type="button"
                  data-canvas-block-id={block.id}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    if (showCanvasShapeEditor && canvasShapeEditing && selectedBlock?.id === block.id && selectedBlockSupportsShapeCanvas) {
                      setSelectedBlockIds([block.id]);
                      return;
                    }
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
                  className={`absolute border text-left text-[11px] transition ${
                    isProductTagAnchor ? 'overflow-visible border-dashed px-1.5 py-1' : 'overflow-hidden px-2 py-1'
                  } ${
                    isActive ? 'border-cyan-300 ring-1 ring-cyan-300/90' : 'border-slate-400/40 hover:border-cyan-400/60'
                  } ${block.locked ? 'opacity-75' : ''}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    top: `${top}%`,
                    height: `${height}%`,
                    zIndex: Number(block.zIndex || 1),
                    backgroundColor: isProductTagAnchor ? 'transparent' : block.shellBackgroundColor || block.backgroundColor,
                    color: block.textColor,
                    boxShadow: isProductTagAnchor ? 'none' : undefined,
                    borderRadius: useSteppedShape ? '0px' : `${toInt(block.borderRadius ?? 8, 0, 44, 8)}px`,
                    clipPath: useSteppedShape ? shapeClipPath : undefined
                  }}
                >
                  {showCanvasShapeOverlay && (
                    <div
                      className="absolute inset-0 z-10 grid gap-[1px] bg-transparent"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(1, block.colSpan)}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${Math.max(1, block.rowSpan)}, minmax(0, 1fr))`
                      }}
                    >
                      {Array.from({ length: Math.max(1, block.colSpan) * Math.max(1, block.rowSpan) }).map((_, index) => {
                        const localRow = Math.floor(index / Math.max(1, block.colSpan));
                        const localCol = index % Math.max(1, block.colSpan);
                        const token = shapeCellToken(localRow, localCol);
                        const active = selectedCanvasShapeMaskSet.has(token);
                        return (
                          <span
                            key={token}
                            className={`block h-full w-full border border-slate-800/25 ${
                              active ? 'bg-violet-400/35' : 'bg-slate-900/25'
                            }`}
                          />
                        );
                      })}
                      {selectedBlock?.id === block.id && (
                        <>
                          {Array.from({ length: Math.max(1, block.rowSpan) }).map((_, rowIndex) => {
                            const leftEdge = selectedCanvasRowProfiles.left[rowIndex];
                            const rightEdge = selectedCanvasRowProfiles.right[rowIndex];
                            if (leftEdge === null || leftEdge === undefined || rightEdge === null || rightEdge === undefined) return null;
                            const top = ((rowIndex + 0.5) / Math.max(1, block.rowSpan)) * 100;
                            const leftX = ((leftEdge + 0.5) / Math.max(1, block.colSpan)) * 100;
                            const rightX = ((rightEdge + 0.5) / Math.max(1, block.colSpan)) * 100;
                            return (
                              <React.Fragment key={`edge-row-${rowIndex}`}>
                                <span
                                  onMouseDown={(event) => beginCanvasShapeEdgeDrag(event, 'row', rowIndex, 'left')}
                                  className="absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border border-cyan-100 bg-cyan-400/90"
                                  style={{ left: `${leftX}%`, top: `${top}%` }}
                                  title={`Drag left edge for row ${rowIndex + 1}`}
                                />
                                <span
                                  onMouseDown={(event) => beginCanvasShapeEdgeDrag(event, 'row', rowIndex, 'right')}
                                  className="absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border border-cyan-100 bg-cyan-400/90"
                                  style={{ left: `${rightX}%`, top: `${top}%` }}
                                  title={`Drag right edge for row ${rowIndex + 1}`}
                                />
                              </React.Fragment>
                            );
                          })}
                          {Array.from({ length: Math.max(1, block.colSpan) }).map((_, colIndex) => {
                            const topEdge = selectedCanvasColumnProfiles.top[colIndex];
                            const bottomEdge = selectedCanvasColumnProfiles.bottom[colIndex];
                            if (topEdge === null || topEdge === undefined || bottomEdge === null || bottomEdge === undefined) return null;
                            const left = ((colIndex + 0.5) / Math.max(1, block.colSpan)) * 100;
                            const topY = ((topEdge + 0.5) / Math.max(1, block.rowSpan)) * 100;
                            const bottomY = ((bottomEdge + 0.5) / Math.max(1, block.rowSpan)) * 100;
                            return (
                              <React.Fragment key={`edge-col-${colIndex}`}>
                                <span
                                  onMouseDown={(event) => beginCanvasShapeEdgeDrag(event, 'col', colIndex, 'top')}
                                  className="absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize rounded-full border border-cyan-100 bg-cyan-400/90"
                                  style={{ left: `${left}%`, top: `${topY}%` }}
                                  title={`Drag top edge for column ${colIndex + 1}`}
                                />
                                <span
                                  onMouseDown={(event) => beginCanvasShapeEdgeDrag(event, 'col', colIndex, 'bottom')}
                                  className="absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize rounded-full border border-cyan-100 bg-cyan-400/90"
                                  style={{ left: `${left}%`, top: `${bottomY}%` }}
                                  title={`Drag bottom edge for column ${colIndex + 1}`}
                                />
                              </React.Fragment>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                  <span className="relative z-20 block truncate font-semibold">{getDisplayBlockLabel(block)}</span>
                  <span className="relative z-20 block truncate opacity-80">{block.colSpan}x{block.rowSpan}</span>
                  <span className="relative z-20 mt-1 inline-flex items-center gap-1 text-[10px] opacity-80">
                    <FaLayerGroup /> z{block.zIndex || 1}
                    {block.locked ? <><FaLock /> locked</> : null}
                  </span>
                  {!block.locked && !(showCanvasShapeEditor && canvasShapeEditing && selectedBlock?.id === block.id) && (
                    <>
                      <span
                        className="absolute left-1/2 top-0 z-20 inline-flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-n-resize items-center justify-center rounded-sm border border-current/40 bg-black/25"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedBlockIds([block.id]);
                          setInteraction({
                            mode: 'resize',
                            resizeEdge: 'n',
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
                      />
                      <span
                        className="absolute right-0 top-1/2 z-20 inline-flex h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-e-resize items-center justify-center rounded-sm border border-current/40 bg-black/25"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedBlockIds([block.id]);
                          setInteraction({
                            mode: 'resize',
                            resizeEdge: 'e',
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
                      />
                      <span
                        className="absolute bottom-0 left-1/2 z-20 inline-flex h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-s-resize items-center justify-center rounded-sm border border-current/40 bg-black/25"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedBlockIds([block.id]);
                          setInteraction({
                            mode: 'resize',
                            resizeEdge: 's',
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
                      />
                      <span
                        className="absolute left-0 top-1/2 z-20 inline-flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-w-resize items-center justify-center rounded-sm border border-current/40 bg-black/25"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedBlockIds([block.id]);
                          setInteraction({
                            mode: 'resize',
                            resizeEdge: 'w',
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
                      />
                    </>
                  )}
                  {!(showCanvasShapeEditor && canvasShapeEditing && selectedBlock?.id === block.id) && (
                    <span
                      className={`absolute bottom-1 right-1 z-20 inline-flex h-4 w-4 items-center justify-center rounded-sm border border-current/40 bg-black/25 ${
                        block.locked ? 'cursor-not-allowed opacity-40' : 'cursor-se-resize'
                      }`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (block.locked) return;
                        setSelectedBlockIds([block.id]);
                        setInteraction({
                          mode: 'resize',
                          resizeEdge: 'se',
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
                  )}
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
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
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
            <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
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
              <div className="flex flex-wrap items-center justify-end gap-1">
                <button type="button" onClick={() => reorderZIndex('front')} className="inline-flex items-center gap-1 rounded-md border border-slate-500/70 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"><FaArrowUp /> Front</button>
                <button type="button" onClick={() => reorderZIndex('back')} className="inline-flex items-center gap-1 rounded-md border border-slate-500/70 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"><FaArrowDown /> Back</button>
                <button type="button" onClick={removeSelectedBlocks} className="inline-flex items-center gap-1 rounded-md border border-rose-500/60 bg-rose-500/15 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/25"><FaMinusCircle /> Remove</button>
              </div>
            </div>
            <p className="mb-3 text-xs font-semibold text-slate-100">{getDisplayBlockLabel(selectedBlock)}</p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-300">Label
                <input type="text" value={selectedBlock.label} onChange={(event) => updateBlock(selectedBlock.id, { label: event.target.value.slice(0, 36) })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
              </label>
              <label className="text-xs text-slate-300">Type
                <select
                  value={selectedBlock.type}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    const nextPatch = { type: nextType };
                    if (!isShapeEligibleBlockType(nextType)) {
                      nextPatch.shapePreset = 'rect';
                      nextPatch.shapeMaskCells = [];
                    }
                    updateBlock(selectedBlock.id, nextPatch);
                  }}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                >
                  {CUSTOM_TEMPLATE_BLOCK_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-300">Column Start
                <input type="number" min={1} max={stageColumns} value={selectedBlock.colStart} onChange={(event) => updateBlock(selectedBlock.id, { colStart: toInt(event.target.value, 1, Math.max(1, stageColumns - selectedBlock.colSpan + 1), selectedBlock.colStart) })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
              </label>
              <label className="text-xs text-slate-300">Column Span
                <input
                  type="number"
                  min={1}
                  max={stageColumns}
                  value={selectedBlock.colSpan}
                  onChange={(event) => {
                    const nextColSpan = toInt(
                      event.target.value,
                      1,
                      Math.max(1, stageColumns - selectedBlock.colStart + 1),
                      selectedBlock.colSpan
                    );
                    updateBlock(selectedBlock.id, {
                      colSpan: nextColSpan,
                      ...syncShapeMaskToBlockSpan(selectedBlock, nextColSpan, selectedBlock.rowSpan)
                    });
                  }}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-300">Row Start
                <input type="number" min={1} max={stageRows} value={selectedBlock.rowStart} onChange={(event) => updateBlock(selectedBlock.id, { rowStart: toInt(event.target.value, 1, Math.max(1, stageRows - selectedBlock.rowSpan + 1), selectedBlock.rowStart) })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100" />
              </label>
              <label className="text-xs text-slate-300">Row Span
                <input
                  type="number"
                  min={1}
                  max={stageRows}
                  value={selectedBlock.rowSpan}
                  onChange={(event) => {
                    const nextRowSpan = toInt(
                      event.target.value,
                      1,
                      Math.max(1, stageRows - selectedBlock.rowStart + 1),
                      selectedBlock.rowSpan
                    );
                    updateBlock(selectedBlock.id, {
                      rowSpan: nextRowSpan,
                      ...syncShapeMaskToBlockSpan(selectedBlock, selectedBlock.colSpan, nextRowSpan)
                    });
                  }}
                  className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
                />
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

            {!showAdvancedStyles && isShapeEligibleBlockType(selectedBlock.type) && (
              <p className="mt-2 rounded-md border border-violet-500/35 bg-violet-500/10 px-2 py-2 text-[11px] text-violet-100">
                Choose a block shape here, then use `Canvas Shape Edit` to sculpt it by dragging border handles.
              </p>
            )}

            {showAdvancedStyles && (
              <>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <label className="text-slate-300"><span className="inline-flex items-center gap-1"><FaFont /> Font Scale</span>
                    <input type="range" min={0.72} max={1.9} step={0.02} value={selectedBlock.fontScale} onChange={(event) => updateBlock(selectedBlock.id, { fontScale: clamp(event.target.value, 0.72, 1.9, selectedBlock.fontScale) })} className="mt-1 w-full" />
                  </label>
                  <label className="text-slate-300"><span className="inline-flex items-center gap-1"><FaBorderAll /> Border Width</span>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={selectedBlock.borderWidth}
                      disabled={selectedBlock.borderEnabled === false}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, {
                          borderWidth: toInt(event.target.value, 0, 8, selectedBlock.borderWidth),
                          borderEnabled: true
                        })
                      }
                      className="mt-1 w-full"
                    />
                  </label>
                  <label className="text-slate-300">Border Radius
                    <input type="range" min={0} max={44} step={1} value={selectedBlock.borderRadius} onChange={(event) => updateBlock(selectedBlock.id, { borderRadius: toInt(event.target.value, 0, 44, selectedBlock.borderRadius) })} className="mt-1 w-full" />
                  </label>
                  <label className="text-slate-300">Padding
                    <input type="range" min={6} max={36} step={1} value={selectedBlock.padding} onChange={(event) => updateBlock(selectedBlock.id, { padding: toInt(event.target.value, 6, 36, selectedBlock.padding) })} className="mt-1 w-full" />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <label>Border Style
                    <select value={selectedBlock.borderStyle} onChange={(event) => updateBlock(selectedBlock.id, { borderStyle: event.target.value })} className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100">
                      {CUSTOM_TEMPLATE_BORDER_STYLE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-end">
                    <span className="mt-1 inline-flex w-full items-center justify-between gap-2 rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-xs text-slate-200">
                      <span>Enable Border</span>
                      <input
                        type="checkbox"
                        checked={selectedBlock.borderEnabled !== false}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, {
                            borderEnabled: event.target.checked
                          })
                        }
                      />
                    </span>
                  </label>
                  <label className="flex items-end">
                    <button
                      type="button"
                      onClick={() => updateBlock(selectedBlock.id, { borderRadius: 0 })}
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
                    >
                      Square Corners (90deg)
                    </button>
                  </label>
                  <label>Block Shape
                    <select
                      value={selectedBlock.shapePreset || 'rect'}
                      disabled={!isShapeEligibleBlockType(selectedBlock.type)}
                      onChange={(event) => {
                        const nextPreset = event.target.value;
                        if (nextPreset === 'cells') {
                          const nextCols = toInt(
                            selectedBlock.shapeGridCols ?? Math.max(4, selectedBlock.colSpan),
                            SHAPE_GRID_MIN,
                            SHAPE_GRID_MAX,
                            6
                          );
                          const nextRows = toInt(
                            selectedBlock.shapeGridRows ?? Math.max(4, selectedBlock.rowSpan),
                            SHAPE_GRID_MIN,
                            SHAPE_GRID_MAX,
                            6
                          );
                          const fallback = buildFullShapeMaskCells(nextCols, nextRows);
                          const nextMask = normalizeShapeMaskCells(selectedBlock.shapeMaskCells, nextCols, nextRows, fallback);
                          updateBlock(selectedBlock.id, {
                            shapePreset: nextPreset,
                            shapeGridCols: nextCols,
                            shapeGridRows: nextRows,
                            shapeMaskCells: nextMask.length ? nextMask : fallback
                          });
                          return;
                        }
                        updateBlock(selectedBlock.id, { shapePreset: nextPreset });
                      }}
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {CUSTOM_TEMPLATE_SHAPE_PRESET_OPTIONS.map((option) => (
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
                  {isShapeEligibleBlockType(selectedBlock.type) && ['step-lr', 'step-rl'].includes(selectedBlock.shapePreset || 'rect') && (
                    <>
                      <label><span className="inline-flex items-center gap-1"><FaVectorSquare /> Shape Notch</span>
                        <input
                          type="range"
                          min={10}
                          max={38}
                          step={1}
                          value={selectedBlock.shapeNotch ?? 24}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, { shapeNotch: toInt(event.target.value, 10, 38, selectedBlock.shapeNotch ?? 24) })
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                      <label><span className="inline-flex items-center gap-1"><FaArrowsAlt /> Shape Offset</span>
                        <input
                          type="range"
                          min={28}
                          max={72}
                          step={1}
                          value={selectedBlock.shapeOffset ?? 45}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, { shapeOffset: toInt(event.target.value, 28, 72, selectedBlock.shapeOffset ?? 45) })
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                    </>
                  )}
                  {isShapeEligibleBlockType(selectedBlock.type) && (selectedBlock.shapePreset || 'rect') === 'cells' && (
                    <p className="col-span-1 rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-2 text-[11px] text-violet-100 sm:col-span-2">
                      {showCanvasShapeEditor
                        ? 'Use `Canvas Shape Edit` and drag block border handles directly to sculpt this block.'
                        : 'Advanced shape editing is currently hidden for this release.'}
                    </p>
                  )}
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

                {!isShapeEligibleBlockType(selectedBlock.type) && (
                  <p className="mt-3 rounded-md border border-slate-600 bg-slate-900/70 px-2 py-2 text-[11px] text-slate-300">
                    This block stays rectangular to keep its rendered content stable.
                  </p>
                )}

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
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
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
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

                {selectedBlock.type === 'content' && (
                  <p className="mt-3 rounded-md border border-cyan-500/50 bg-cyan-500/10 px-2 py-2 text-[11px] text-cyan-100">
                    {getDisplayBlockLabel(selectedBlock)} displays its article segment. Multiple Main Content blocks auto-split in visual order.
                  </p>
                )}

                {selectedBlock.type === 'product-tags' && (
                  <p className="mt-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-2 text-[11px] text-emerald-100">
                    Tagged products automatically appear at this anchor. If no products are tagged, the public article hides this anchor.
                  </p>
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
