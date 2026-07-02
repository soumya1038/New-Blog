
const CUSTOM_TEMPLATE_ID = 'custom-studio';
const DEFAULT_TEMPLATE_ID = CUSTOM_TEMPLATE_ID;

const TEMPLATE_THEME_OPTIONS = [
  { id: 'auto', label: 'Auto (Navbar)' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
];

const TEMPLATE_THEME_VALUES = TEMPLATE_THEME_OPTIONS.map((option) => option.id);

const FONT_MAP = {
  heritage: {
    label: 'Heritage Serif',
    title: '"Newsreader", "Playfair Display", Georgia, serif',
    body: '"Source Serif 4", "Spectral", Georgia, serif'
  },
  modern: {
    label: 'Modern Sans',
    title: '"Manrope", "IBM Plex Sans", "Segoe UI", sans-serif',
    body: '"IBM Plex Sans", "Libre Franklin", "Segoe UI", sans-serif'
  },
  mixed: {
    label: 'Mixed Editorial',
    title: '"Fraunces", "Newsreader", Georgia, serif',
    body: '"Manrope", "IBM Plex Sans", sans-serif'
  },
  classic: {
    label: 'Classic Print',
    title: '"Times New Roman", "Newsreader", Georgia, serif',
    body: '"Times New Roman", "Source Serif 4", serif'
  },
  literary: {
    label: 'Literary Journal',
    title: '"Playfair Display", "Newsreader", Georgia, serif',
    body: '"Lora", "Source Serif 4", Georgia, serif'
  },
  sans: {
    label: 'Analyst Sans',
    title: '"Libre Franklin", "IBM Plex Sans", "Segoe UI", sans-serif',
    body: '"Inter", "IBM Plex Sans", "Segoe UI", sans-serif'
  }
};

const TEMPLATE_LAYOUT_OPTIONS = [
  { id: 'split', label: 'Split Editorial' },
  { id: 'column', label: 'Literary Column' },
  { id: 'spotlight', label: 'Cinematic Spotlight' },
  { id: 'immersive', label: 'Immersive Narrative' },
  { id: 'newspaper', label: 'Broadsheet Grid' },
  { id: 'notebook', label: 'Notebook Dialogue' },
  { id: 'briefing', label: 'News Briefing' }
];

const LAYOUT_TO_STYLE = {
  split: 'split',
  column: 'column',
  spotlight: 'spotlight',
  immersive: 'immersive',
  newspaper: 'newspaper',
  notebook: 'notebook',
  briefing: 'briefing'
};

const CUSTOM_STUDIO_DEFAULT_COLUMNS = 12;
const CUSTOM_STUDIO_MIN_COLUMNS = 8;
const CUSTOM_STUDIO_MAX_COLUMNS = 48;
const CUSTOM_STUDIO_DEFAULT_ROWS = 28;
const CUSTOM_STUDIO_MIN_ROWS = 18;
const CUSTOM_STUDIO_MAX_ROWS = 60;
const CUSTOM_STUDIO_DEFAULT_ROW_HEIGHT = 32;

const CUSTOM_STUDIO_BLOCK_TYPES = [
  { id: 'title', label: 'Title Block' },
  { id: 'meta', label: 'Story Meta' },
  { id: 'image', label: 'Hero Image' },
  { id: 'gallery', label: 'Gallery Strip' },
  { id: 'collage', label: 'Collage Board' },
  { id: 'content', label: 'Main Content' },
  { id: 'product-tags', label: 'Product Tag Anchor' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'tags', label: 'Tags' },
  { id: 'video', label: 'Video Panel' },
  { id: 'quote', label: 'Pull Quote' }
];

const CUSTOM_STUDIO_BLOCK_TYPE_IDS = CUSTOM_STUDIO_BLOCK_TYPES.map((item) => item.id);

const CUSTOM_STUDIO_BORDER_STYLES = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'double', label: 'Double' }
];

const CUSTOM_STUDIO_UNDERLINE_STYLES = [
  { id: 'none', label: 'None' },
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'wavy', label: 'Wavy' },
  { id: 'highlight', label: 'Highlight' }
];

const CUSTOM_STUDIO_TEXT_ALIGN_OPTIONS = [
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Right' }
];

const CUSTOM_TEMPLATE_PAGINATION_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'manual', label: 'Manual' },
  { id: 'off', label: 'Off' }
];

const CUSTOM_TEMPLATE_DEVICE_OPTIONS_LIST = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'mobile', label: 'Mobile' }
];

const CUSTOM_STUDIO_IMAGE_FIT_OPTIONS = [
  { id: 'cover', label: 'Cover' },
  { id: 'contain', label: 'Contain' }
];

const CUSTOM_STUDIO_CAPTION_STYLE_OPTIONS = [
  { id: 'strip', label: 'Strip' },
  { id: 'boxed', label: 'Boxed' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'hidden', label: 'Hidden' }
];

const CUSTOM_STUDIO_VIDEO_LAYOUT_OPTIONS = [
  { id: 'grid', label: 'Grid' },
  { id: 'split', label: 'Split' },
  { id: 'single', label: 'Single' }
];

const CUSTOM_STUDIO_PAGE_PLACEMENT_OPTIONS = [
  { id: 'all', label: 'All Pages' },
  { id: 'first', label: 'First Page' },
  { id: 'middle', label: 'Middle Pages' },
  { id: 'last', label: 'Last Page' }
];

const CUSTOM_STUDIO_BORDER_PRESET_OPTIONS = [
  { id: 'custom', label: 'Custom' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'stitched', label: 'Stitched' },
  { id: 'ribbon', label: 'Ribbon' }
];

const CUSTOM_STUDIO_HIGHLIGHT_PRESET_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'marker', label: 'Marker' },
  { id: 'spotlight', label: 'Spotlight' },
  { id: 'quote-badge', label: 'Quote Badge' }
];

const CUSTOM_STUDIO_SHAPE_PRESET_OPTIONS = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'step-lr', label: 'Stepped (Left -> Right)' },
  { id: 'step-rl', label: 'Stepped (Right -> Left)' },
  { id: 'cells', label: 'Cell Paint (Custom)' }
];

const CUSTOM_STUDIO_SHAPE_PRESET_IDS = CUSTOM_STUDIO_SHAPE_PRESET_OPTIONS.map((item) => item.id);
const CUSTOM_STUDIO_SHAPE_ELIGIBLE_TYPES = ['title', 'meta', 'content', 'highlights', 'tags', 'quote'];
const CUSTOM_STUDIO_SHAPE_GRID_MIN = 1;
const CUSTOM_STUDIO_SHAPE_GRID_MAX = 18;

const CUSTOM_STUDIO_BLOCK_TYPE_LABELS = CUSTOM_STUDIO_BLOCK_TYPES.reduce((map, item) => {
  map[item.id] = item.label;
  return map;
}, {});

const isCustomStudioShapeEligibleTypeInternal = (blockType) =>
  CUSTOM_STUDIO_SHAPE_ELIGIBLE_TYPES.includes(cleanText(blockType, '').toLowerCase());

const shapeCellToken = (row, col) => `${row}:${col}`;

const parseShapeCellToken = (token) => {
  const raw = String(token || '').trim();
  const match = raw.match(/^(\d+):(\d+)$/);
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
};

const buildFullCustomStudioShapeMaskCells = (cols, rows) => {
  const normalizedCols = clampInt(cols, CUSTOM_STUDIO_SHAPE_GRID_MIN, CUSTOM_STUDIO_SHAPE_GRID_MAX, 6);
  const normalizedRows = clampInt(rows, CUSTOM_STUDIO_SHAPE_GRID_MIN, CUSTOM_STUDIO_SHAPE_GRID_MAX, 6);
  const result = [];
  for (let row = 0; row < normalizedRows; row += 1) {
    for (let col = 0; col < normalizedCols; col += 1) {
      result.push(shapeCellToken(row, col));
    }
  }
  return result;
};

const sortCustomStudioShapeMaskCells = (cells) =>
  [...cells].sort((left, right) => {
    const parsedLeft = parseShapeCellToken(left);
    const parsedRight = parseShapeCellToken(right);
    if (!parsedLeft || !parsedRight) return String(left).localeCompare(String(right));
    if (parsedLeft.row !== parsedRight.row) return parsedLeft.row - parsedRight.row;
    return parsedLeft.col - parsedRight.col;
  });

const normalizeCustomStudioShapeMaskCells = (cells, cols, rows, fallbackCells = []) => {
  const normalizedCols = clampInt(cols, CUSTOM_STUDIO_SHAPE_GRID_MIN, CUSTOM_STUDIO_SHAPE_GRID_MAX, 6);
  const normalizedRows = clampInt(rows, CUSTOM_STUDIO_SHAPE_GRID_MIN, CUSTOM_STUDIO_SHAPE_GRID_MAX, 6);
  const source = Array.isArray(cells) ? cells : fallbackCells;
  const seen = new Set();

  source.forEach((token) => {
    const parsed = parseShapeCellToken(token);
    if (!parsed) return;
    if (parsed.row < 0 || parsed.row >= normalizedRows) return;
    if (parsed.col < 0 || parsed.col >= normalizedCols) return;
    seen.add(shapeCellToken(parsed.row, parsed.col));
  });

  return sortCustomStudioShapeMaskCells([...seen]);
};

const simplifyOrthogonalPolygon = (points) => {
  if (!Array.isArray(points) || points.length < 4) return points;
  const normalized = points.slice();
  if (normalized.length > 1) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (first.x === last.x && first.y === last.y) normalized.pop();
  }
  if (normalized.length < 3) return points;

  const simplified = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const prev = normalized[(index - 1 + normalized.length) % normalized.length];
    const current = normalized[index];
    const next = normalized[(index + 1) % normalized.length];
    const collinear = (prev.x === current.x && current.x === next.x) || (prev.y === current.y && current.y === next.y);
    if (!collinear) simplified.push(current);
  }

  if (simplified.length < 3) return points;
  return [...simplified, simplified[0]];
};

const polygonAreaAbs = (points) => {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area / 2);
};

const buildCustomStudioShapeClipPathFromMask = (cols, rows, maskCells) => {
  const normalizedCols = clampInt(cols, CUSTOM_STUDIO_SHAPE_GRID_MIN, CUSTOM_STUDIO_SHAPE_GRID_MAX, 6);
  const normalizedRows = clampInt(rows, CUSTOM_STUDIO_SHAPE_GRID_MIN, CUSTOM_STUDIO_SHAPE_GRID_MAX, 6);
  const normalizedMask = normalizeCustomStudioShapeMaskCells(maskCells, normalizedCols, normalizedRows);
  if (!normalizedMask.length) return 'none';

  const maskSet = new Set(normalizedMask);
  const hasCell = (row, col) => maskSet.has(shapeCellToken(row, col));
  const makePointKey = (x, y) => `${x},${y}`;
  const edges = [];

  normalizedMask.forEach((token) => {
    const parsed = parseShapeCellToken(token);
    if (!parsed) return;
    const { row, col } = parsed;

    if (!hasCell(row - 1, col)) {
      edges.push({ from: makePointKey(col, row), to: makePointKey(col + 1, row) });
    }
    if (!hasCell(row, col + 1)) {
      edges.push({ from: makePointKey(col + 1, row), to: makePointKey(col + 1, row + 1) });
    }
    if (!hasCell(row + 1, col)) {
      edges.push({ from: makePointKey(col + 1, row + 1), to: makePointKey(col, row + 1) });
    }
    if (!hasCell(row, col - 1)) {
      edges.push({ from: makePointKey(col, row + 1), to: makePointKey(col, row) });
    }
  });

  if (!edges.length) return 'none';

  const outgoing = new Map();
  edges.forEach((edge, index) => {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    outgoing.get(edge.from).push({ ...edge, index });
  });

  const visited = new Set();
  const loops = [];
  const edgeVisitedKey = (index) => `edge:${index}`;

  edges.forEach((edge, edgeIndex) => {
    const edgeKey = edgeVisitedKey(edgeIndex);
    if (visited.has(edgeKey)) return;

    const start = edge.from;
    let currentFrom = edge.from;
    let currentTo = edge.to;
    let guard = 0;
    const loop = [start, currentTo];
    visited.add(edgeKey);

    while (currentTo !== start && guard < 10000) {
      guard += 1;
      const candidates = (outgoing.get(currentTo) || []).filter(
        (candidate) => !visited.has(edgeVisitedKey(candidate.index))
      );
      if (!candidates.length) break;

      let nextEdge = candidates[0];
      if (candidates.length > 1) {
        const nonReverse = candidates.find((candidate) => candidate.to !== currentFrom);
        if (nonReverse) nextEdge = nonReverse;
      }

      visited.add(edgeVisitedKey(nextEdge.index));
      currentFrom = nextEdge.from;
      currentTo = nextEdge.to;
      loop.push(currentTo);
    }

    if (loop.length >= 4 && loop[loop.length - 1] === start) {
      const points = loop
        .map((pointToken) => {
          const [xText, yText] = pointToken.split(',');
          return { x: Number(xText), y: Number(yText) };
        })
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
      if (points.length >= 4) loops.push(simplifyOrthogonalPolygon(points));
    }
  });

  if (!loops.length) return 'none';
  const selectedLoop = loops.sort((left, right) => polygonAreaAbs(right) - polygonAreaAbs(left))[0];
  if (!selectedLoop || selectedLoop.length < 4) return 'none';

  const points = selectedLoop.map((point) => {
    const x = ((point.x / normalizedCols) * 100).toFixed(3).replace(/\.?0+$/, '');
    const y = ((point.y / normalizedRows) * 100).toFixed(3).replace(/\.?0+$/, '');
    return `${x}% ${y}%`;
  });

  return `polygon(${points.join(', ')})`;
};

const resolveCustomStudioShapeClipPath = (
  shapePreset,
  shapeNotch,
  shapeOffset,
  shapeGridCols = 6,
  shapeGridRows = 6,
  shapeMaskCells = []
) => {
  const preset = cleanEnum(cleanText(shapePreset, 'rect'), CUSTOM_STUDIO_SHAPE_PRESET_IDS, 'rect');
  if (preset === 'rect') return 'none';
  if (preset === 'cells') {
    const cols = clampInt(shapeGridCols, CUSTOM_STUDIO_SHAPE_GRID_MIN, CUSTOM_STUDIO_SHAPE_GRID_MAX, 6);
    const rows = clampInt(shapeGridRows, CUSTOM_STUDIO_SHAPE_GRID_MIN, CUSTOM_STUDIO_SHAPE_GRID_MAX, 6);
    const fallbackMask = buildFullCustomStudioShapeMaskCells(cols, rows);
    const normalizedMask = normalizeCustomStudioShapeMaskCells(shapeMaskCells, cols, rows, fallbackMask);
    return buildCustomStudioShapeClipPathFromMask(cols, rows, normalizedMask.length ? normalizedMask : fallbackMask);
  }

  const notch = clampInt(shapeNotch, 10, 38, 24);
  const topStepDepth = clampInt(Math.round(notch * 0.85), 8, 34, 20);
  const middleNotchX = clampInt(100 - (notch + 14), 50, 88, 62);
  const middleStepDepth = clampInt(shapeOffset, 28, 72, 45);

  if (preset === 'step-rl') {
    const mirroredTopNotchX = clampInt(100 - notch, 62, 92, 76);
    const mirroredMiddleNotchX = clampInt(100 - middleNotchX, 12, 50, 38);
    return `polygon(0 0, ${mirroredTopNotchX}% 0, ${mirroredTopNotchX}% ${topStepDepth}%, 100% ${topStepDepth}%, 100% 100%, ${mirroredMiddleNotchX}% 100%, ${mirroredMiddleNotchX}% ${middleStepDepth}%, 0 ${middleStepDepth}%)`;
  }

  return `polygon(${notch}% 0, 100% 0, 100% ${middleStepDepth}%, ${middleNotchX}% ${middleStepDepth}%, ${middleNotchX}% 100%, 0 100%, 0 ${topStepDepth}%, ${notch}% ${topStepDepth}%)`;
};

const TEMPLATE_PRESETS = [
  {
    id: 'metropolitan-ledger',
    name: 'Metropolitan Ledger',
    description: 'City front-page composition with a strong side rail.',
    layout: 'newspaper',
    style: 'newspaper',
    font: 'heritage',
    badge: 'Metro Desk',
    palette: {
      bg: '#f2ede4',
      bgAlt: '#dfcfbb',
      surface: '#fffaf2',
      surfaceMuted: '#f3eadf',
      text: '#1d1712',
      muted: '#62564a',
      accent: '#8f4b31',
      accentSoft: '#e6c4b0',
      border: '#d7c2ad',
      ink: '#271b13'
    }
  },
  {
    id: 'morning-bulletin',
    name: 'Morning Bulletin',
    description: 'Fast-scanning briefing layout for breaking coverage.',
    layout: 'briefing',
    style: 'briefing',
    font: 'sans',
    badge: 'Breaking Wire',
    palette: {
      bg: '#edf4ff',
      bgAlt: '#d5e4ff',
      surface: '#ffffff',
      surfaceMuted: '#eef4ff',
      text: '#0f1c33',
      muted: '#4d5f81',
      accent: '#1f60e3',
      accentSoft: '#c4d7ff',
      border: '#c6d6f1',
      ink: '#112446'
    }
  },
  {
    id: 'harbor-review',
    name: 'Harbor Review',
    description: 'Calm editorial split with generous reading rhythm.',
    layout: 'split',
    style: 'split',
    font: 'mixed',
    badge: 'Feature Review',
    palette: {
      bg: '#e6f1eb',
      bgAlt: '#d2e0d8',
      surface: '#f8fcf9',
      surfaceMuted: '#edf6f1',
      text: '#152925',
      muted: '#4d6660',
      accent: '#28726b',
      accentSoft: '#bfddd7',
      border: '#b6d0c8',
      ink: '#1c3630'
    }
  },
  {
    id: 'atlas-feature',
    name: 'Atlas Feature',
    description: 'Magazine-like immersive package with visual drama.',
    layout: 'immersive',
    style: 'immersive',
    font: 'mixed',
    badge: 'Global Feature',
    palette: {
      bg: '#f3ece4',
      bgAlt: '#e2d4c4',
      surface: '#fffbf6',
      surfaceMuted: '#f3e9de',
      text: '#241b15',
      muted: '#6c5d52',
      accent: '#9a5630',
      accentSoft: '#e7c9b5',
      border: '#dcc6b5',
      ink: '#2f1f17'
    }
  },
  {
    id: 'ember-essay',
    name: 'Ember Essay',
    description: 'Warm long-form single-column opinion canvas.',
    layout: 'column',
    style: 'column',
    font: 'literary',
    badge: 'Opinion',
    palette: {
      bg: '#fbf2e8',
      bgAlt: '#efdccd',
      surface: '#fffaf3',
      surfaceMuted: '#f8ebdf',
      text: '#2a1e17',
      muted: '#725a4e',
      accent: '#bd6332',
      accentSoft: '#f1cfb8',
      border: '#e2c8b4',
      ink: '#35241c'
    }
  },
  {
    id: 'eclipse-report',
    name: 'Eclipse Report',
    description: 'Dark cinematic investigative template with high contrast.',
    layout: 'spotlight',
    style: 'spotlight',
    font: 'modern',
    badge: 'Investigations',
    palette: {
      bg: '#0b1522',
      bgAlt: '#111f31',
      surface: '#17273a',
      surfaceMuted: '#1f3248',
      text: '#e5edf8',
      muted: '#afc0d5',
      accent: '#f2a04f',
      accentSoft: '#5f4a35',
      border: '#31455d',
      ink: '#f3c787'
    }
  },
  {
    id: 'meadow-letter',
    name: 'Meadow Letter',
    description: 'Organic notebook-inspired storytelling layout.',
    layout: 'notebook',
    style: 'notebook',
    font: 'literary',
    badge: 'Human Stories',
    palette: {
      bg: '#edf4e7',
      bgAlt: '#dbe8d0',
      surface: '#f9fcf5',
      surfaceMuted: '#edf5e7',
      text: '#1e2c1a',
      muted: '#5f6f58',
      accent: '#4f7d4d',
      accentSoft: '#c8dfbe',
      border: '#c3d7bb',
      ink: '#2c4026'
    }
  },
  {
    id: 'wireframe-journal',
    name: 'Wireframe Journal',
    description: 'Tech-forward journal with modular briefing blocks.',
    layout: 'briefing',
    style: 'briefing',
    font: 'modern',
    badge: 'Technology',
    palette: {
      bg: '#ecf1ff',
      bgAlt: '#dce4ff',
      surface: '#f8faff',
      surfaceMuted: '#ecf1ff',
      text: '#14213d',
      muted: '#58688e',
      accent: '#3f63e8',
      accentSoft: '#c7d5ff',
      border: '#c8d4f7',
      ink: '#1a2e55'
    }
  },
  {
    id: 'sunrise-weekend',
    name: 'Sunrise Weekend',
    description: 'Soft weekend spotlight with lifestyle feel.',
    layout: 'spotlight',
    style: 'spotlight',
    font: 'mixed',
    badge: 'Weekend Edition',
    palette: {
      bg: '#fff5e7',
      bgAlt: '#ffe2c0',
      surface: '#fffaf2',
      surfaceMuted: '#fff0df',
      text: '#2c2015',
      muted: '#7d6557',
      accent: '#d67231',
      accentSoft: '#ffd6b5',
      border: '#efcca8',
      ink: '#3a2819'
    }
  },
  {
    id: 'iron-column',
    name: 'Iron Column',
    description: 'Policy and business broadsheet with strict hierarchy.',
    layout: 'newspaper',
    style: 'newspaper',
    font: 'classic',
    badge: 'Policy Desk',
    palette: {
      bg: '#ececec',
      bgAlt: '#dcdcdc',
      surface: '#fafafa',
      surfaceMuted: '#efefef',
      text: '#1f1f1f',
      muted: '#5c5c5c',
      accent: '#7c2f2f',
      accentSoft: '#d8b7b7',
      border: '#c8c8c8',
      ink: '#2a1515'
    }
  },
  {
    id: 'granite-digest',
    name: 'Granite Digest',
    description: 'Data-heavy analytical format with briefing highlights.',
    layout: 'briefing',
    style: 'briefing',
    font: 'sans',
    badge: 'Data Desk',
    palette: {
      bg: '#eaf0f3',
      bgAlt: '#d8e1e7',
      surface: '#f8fbfd',
      surfaceMuted: '#ebf1f5',
      text: '#1a2630',
      muted: '#60707c',
      accent: '#3d6c82',
      accentSoft: '#c7dbe4',
      border: '#c8d5dc',
      ink: '#1f3642'
    }
  },
  {
    id: 'civic-observer',
    name: 'Civic Observer',
    description: 'Public-affairs split template with bold pull quotes.',
    layout: 'split',
    style: 'split',
    font: 'heritage',
    badge: 'Civic Desk',
    palette: {
      bg: '#f1f5f7',
      bgAlt: '#dce4ea',
      surface: '#fbfdff',
      surfaceMuted: '#edf3f8',
      text: '#16242f',
      muted: '#556775',
      accent: '#2f6380',
      accentSoft: '#c1d6e2',
      border: '#c7d6de',
      ink: '#1f3745'
    }
  },
  {
    id: 'atelier-notes',
    name: 'Atelier Notes',
    description: 'Elegant long-form notebook with soft parchment motion.',
    layout: 'notebook',
    style: 'notebook',
    font: 'literary',
    badge: 'Studio Journal',
    palette: {
      bg: '#f8f1e8',
      bgAlt: '#eadbc9',
      surface: '#fffaf3',
      surfaceMuted: '#f5ebdf',
      text: '#2a2118',
      muted: '#6b5c4d',
      accent: '#a16038',
      accentSoft: '#ebceb8',
      border: '#dcc6b1',
      ink: '#332317'
    }
  },
  {
    id: 'nightwire-deep',
    name: 'Nightwire Deep',
    description: 'Nocturnal longread spotlight for investigative pieces.',
    layout: 'immersive',
    style: 'immersive',
    font: 'mixed',
    badge: 'Deep Read',
    palette: {
      bg: '#071019',
      bgAlt: '#0f1a27',
      surface: '#132334',
      surfaceMuted: '#1d3044',
      text: '#dce8f8',
      muted: '#a6b7ca',
      accent: '#67b8ff',
      accentSoft: '#334b61',
      border: '#274055',
      ink: '#8fcbff'
    }
  },
  {
    id: 'city-gazette',
    name: 'City Gazette',
    description: 'Balanced city newspaper layout with classic hierarchy.',
    layout: 'newspaper',
    style: 'ledger-grid',
    font: 'classic',
    badge: 'City Desk',
    palette: {
      bg: '#f4f3ef',
      bgAlt: '#e4e1da',
      surface: '#fffdfa',
      surfaceMuted: '#f1eee7',
      text: '#1e1f21',
      muted: '#5f6368',
      accent: '#a64e2f',
      accentSoft: '#e8c7b8',
      border: '#d3cec4',
      ink: '#272220'
    }
  },
  {
    id: 'daily-chronicle',
    name: 'Daily Chronicle',
    description: 'Front-page print style inspired by modern dailies.',
    layout: 'newspaper',
    style: 'ledger-grid',
    font: 'heritage',
    badge: 'Morning Print',
    palette: {
      bg: '#f8f5ef',
      bgAlt: '#e8dfd0',
      surface: '#fffdf8',
      surfaceMuted: '#f3ebdf',
      text: '#211a15',
      muted: '#6a5d52',
      accent: '#bf5d34',
      accentSoft: '#efd2c0',
      border: '#d8c9b7',
      ink: '#2d2118'
    }
  },
  {
    id: 'vintage-press',
    name: 'Vintage Press',
    description: 'Sepia-toned broadsheet with archival character.',
    layout: 'newspaper',
    style: 'ledger-grid',
    font: 'classic',
    badge: 'Archive Edition',
    palette: {
      bg: '#efe5d5',
      bgAlt: '#dcc8ad',
      surface: '#f8f0e2',
      surfaceMuted: '#eadcc8',
      text: '#2b2017',
      muted: '#75604d',
      accent: '#8a512b',
      accentSoft: '#dcbba2',
      border: '#cdb59a',
      ink: '#342317'
    }
  },
  {
    id: 'business-pulse',
    name: 'Business Pulse',
    description: 'Corporate briefing format for market and policy stories.',
    layout: 'briefing',
    style: 'data-board',
    font: 'sans',
    badge: 'Markets',
    palette: {
      bg: '#edf3fb',
      bgAlt: '#dce6f6',
      surface: '#f9fcff',
      surfaceMuted: '#edf3fa',
      text: '#1b2735',
      muted: '#5a6d81',
      accent: '#295f9b',
      accentSoft: '#c8daef',
      border: '#c7d4e6',
      ink: '#1c3551'
    }
  },
  {
    id: 'science-ledger',
    name: 'Science Ledger',
    description: 'Data-forward reporting layout with crisp scientific tone.',
    layout: 'briefing',
    style: 'data-board',
    font: 'modern',
    badge: 'Research Desk',
    palette: {
      bg: '#ecf5f4',
      bgAlt: '#d7e8e5',
      surface: '#f8fdfc',
      surfaceMuted: '#ebf5f3',
      text: '#193033',
      muted: '#5e7578',
      accent: '#2d7f86',
      accentSoft: '#c2e2df',
      border: '#bfd8d5',
      ink: '#1f4549'
    }
  },
  {
    id: 'modern-feature',
    name: 'Modern Feature',
    description: 'Editorial feature template with clean, spacious rhythm.',
    layout: 'split',
    style: 'feature-mosaic',
    font: 'mixed',
    badge: 'Feature Story',
    palette: {
      bg: '#f2f2f2',
      bgAlt: '#e2e2e2',
      surface: '#ffffff',
      surfaceMuted: '#f4f4f4',
      text: '#1c1f24',
      muted: '#606773',
      accent: '#3d5a94',
      accentSoft: '#d1ddf2',
      border: '#d2d8e3',
      ink: '#1f2a41'
    }
  },
  {
    id: 'coastal-magazine',
    name: 'Coastal Magazine',
    description: 'Lifestyle spotlight with airy coastal palette.',
    layout: 'spotlight',
    style: 'feature-mosaic',
    font: 'literary',
    badge: 'Lifestyle',
    palette: {
      bg: '#eff6f5',
      bgAlt: '#dcebe8',
      surface: '#fbfffe',
      surfaceMuted: '#edf7f5',
      text: '#173034',
      muted: '#5c767a',
      accent: '#2f8c91',
      accentSoft: '#c6e5e2',
      border: '#bedad7',
      ink: '#1f4e52'
    }
  },
  {
    id: 'travel-atlas',
    name: 'Travel Atlas',
    description: 'Immersive visual narrative for travel and culture writing.',
    layout: 'immersive',
    style: 'visual-journey',
    font: 'mixed',
    badge: 'Travel Desk',
    palette: {
      bg: '#f4efe7',
      bgAlt: '#e3d6c5',
      surface: '#fdf9f2',
      surfaceMuted: '#f1e8dc',
      text: '#251e16',
      muted: '#6f6256',
      accent: '#9c6a3d',
      accentSoft: '#e5ccb1',
      border: '#d9c4ae',
      ink: '#332519'
    }
  },
  {
    id: 'minimal-brief',
    name: 'Minimal Brief',
    description: 'Minimal long-form reading canvas with subtle detailing.',
    layout: 'column',
    style: 'mono-column',
    font: 'sans',
    badge: 'Minimal',
    palette: {
      bg: '#f8f8f8',
      bgAlt: '#ececec',
      surface: '#ffffff',
      surfaceMuted: '#f3f3f3',
      text: '#1f2023',
      muted: '#696d74',
      accent: '#51545c',
      accentSoft: '#d9dbe0',
      border: '#d6d8dd',
      ink: '#1c1f27'
    }
  },
  {
    id: 'editorial-zine',
    name: 'Editorial Zine',
    description: 'Bold magazine zine with expressive typography accents.',
    layout: 'column',
    style: 'zine-board',
    font: 'modern',
    badge: 'Zine Edition',
    palette: {
      bg: '#f7f1f1',
      bgAlt: '#ebdfdf',
      surface: '#fffaf9',
      surfaceMuted: '#f5eceb',
      text: '#241a1a',
      muted: '#705d5d',
      accent: '#b44343',
      accentSoft: '#f0c8c8',
      border: '#dec0c0',
      ink: '#341e1e'
    }
  },
  {
    id: 'portrait-weekly',
    name: 'Portrait Weekly',
    description: 'Human-story template with profile-friendly split layout.',
    layout: 'split',
    style: 'feature-mosaic',
    font: 'literary',
    badge: 'Profiles',
    palette: {
      bg: '#f6f2ec',
      bgAlt: '#e7ddd2',
      surface: '#fffaf4',
      surfaceMuted: '#f2ebe2',
      text: '#241d18',
      muted: '#6b5e53',
      accent: '#8a5f44',
      accentSoft: '#e3ceb9',
      border: '#d6c4b1',
      ink: '#322319'
    }
  },
  {
    id: 'photo-chronicle',
    name: 'Photo Chronicle',
    description: 'Immersive storytelling template tailored for visual essays.',
    layout: 'immersive',
    style: 'visual-journey',
    font: 'modern',
    badge: 'Photo Story',
    palette: {
      bg: '#eef1f5',
      bgAlt: '#dbe2eb',
      surface: '#f8fbff',
      surfaceMuted: '#ebf1f8',
      text: '#1c2430',
      muted: '#5f6f84',
      accent: '#446b9a',
      accentSoft: '#c8d8eb',
      border: '#c4d1e0',
      ink: '#213a57'
    }
  },
  {
    id: 'heritage-broadsheet',
    name: 'Heritage Broadsheet',
    description: 'Traditional broadsheet inspired by old city papers.',
    layout: 'newspaper',
    style: 'ledger-grid',
    font: 'heritage',
    badge: 'Heritage Edition',
    palette: {
      bg: '#f1e8da',
      bgAlt: '#deccb6',
      surface: '#fbf2e4',
      surfaceMuted: '#ecdfcc',
      text: '#2a2016',
      muted: '#75604d',
      accent: '#8f4f2d',
      accentSoft: '#dfc1a7',
      border: '#ccb59a',
      ink: '#352417'
    }
  },
  {
    id: 'urban-notes',
    name: 'Urban Notes',
    description: 'Notebook-style city culture template with side observations.',
    layout: 'notebook',
    style: 'journal-cards',
    font: 'sans',
    badge: 'Urban Notebook',
    palette: {
      bg: '#f1f4f2',
      bgAlt: '#dee5e0',
      surface: '#fbfdfb',
      surfaceMuted: '#edf2ee',
      text: '#1e2923',
      muted: '#617067',
      accent: '#3f6a56',
      accentSoft: '#c3d8cc',
      border: '#bfd0c5',
      ink: '#254233'
    }
  },
  {
    id: 'copper-review',
    name: 'Copper Review',
    description: 'Warm editorial split with soft premium copper accents.',
    layout: 'split',
    style: 'feature-mosaic',
    font: 'literary',
    badge: 'Sunday Review',
    palette: {
      bg: '#f7efe8',
      bgAlt: '#e8d8cb',
      surface: '#fff9f4',
      surfaceMuted: '#f4e9df',
      text: '#291f18',
      muted: '#6f5d52',
      accent: '#a56a45',
      accentSoft: '#e9ccb8',
      border: '#dbc3b2',
      ink: '#352519'
    }
  },
  {
    id: 'noir-bulletin',
    name: 'Noir Bulletin',
    description: 'Dark newsroom briefing template for late-night analysis.',
    layout: 'briefing',
    style: 'noir-wire',
    font: 'modern',
    badge: 'Night Bulletin',
    palette: {
      bg: '#0f1218',
      bgAlt: '#181d27',
      surface: '#1d2431',
      surfaceMuted: '#253041',
      text: '#e8ecf4',
      muted: '#b0bdcf',
      accent: '#7aa2ff',
      accentSoft: '#314162',
      border: '#3a4b66',
      ink: '#c4d8ff'
    }
  },
  {
    id: 'indigo-observer',
    name: 'Indigo Observer',
    description: 'Global affairs split template with indigo-led palette.',
    layout: 'split',
    style: 'feature-mosaic',
    font: 'modern',
    badge: 'Global Observer',
    palette: {
      bg: '#eef0fb',
      bgAlt: '#dde2f7',
      surface: '#f9faff',
      surfaceMuted: '#edf0fb',
      text: '#1d2240',
      muted: '#5f678d',
      accent: '#4f5dcf',
      accentSoft: '#cfd5f6',
      border: '#c6cdee',
      ink: '#2a3475'
    }
  },
  {
    id: 'paperlight-journal',
    name: 'Paperlight Journal',
    description: 'Elegant minimalist longread inspired by magazine spreads.',
    layout: 'column',
    style: 'mono-column',
    font: 'literary',
    badge: 'Paperlight',
    palette: {
      bg: '#f9f6f2',
      bgAlt: '#ebe3d8',
      surface: '#fffdf9',
      surfaceMuted: '#f5eee5',
      text: '#231d17',
      muted: '#6b6056',
      accent: '#8a6a50',
      accentSoft: '#e3d3c3',
      border: '#d8cabc',
      ink: '#31241b'
    }
  },
  {
    id: 'marble-times',
    name: 'Marble Times',
    description: 'Structured monochrome paper with strong section hierarchy.',
    layout: 'newspaper',
    style: 'ledger-grid',
    font: 'classic',
    badge: 'Daily Times',
    palette: {
      bg: '#f1f1f1',
      bgAlt: '#e1e1e1',
      surface: '#fafafa',
      surfaceMuted: '#ededed',
      text: '#202124',
      muted: '#5d6065',
      accent: '#4b4f56',
      accentSoft: '#cfd2d8',
      border: '#c8cbd1',
      ink: '#1f2328'
    }
  },
  {
    id: 'canvas-weekend',
    name: 'Canvas Weekend',
    description: 'Magazine-style weekend canvas with bold visual lead.',
    layout: 'spotlight',
    style: 'feature-mosaic',
    font: 'mixed',
    badge: 'Weekend Canvas',
    palette: {
      bg: '#f7f2ea',
      bgAlt: '#e8dccf',
      surface: '#fffaf4',
      surfaceMuted: '#f3e8dc',
      text: '#281f18',
      muted: '#6d5f53',
      accent: '#c06f3e',
      accentSoft: '#f0d0b9',
      border: '#ddc5b2',
      ink: '#352418'
    }
  },  {
    id: CUSTOM_TEMPLATE_ID,
    name: 'Custom Studio',
    description: 'Build your own organic article template.',
    layout: 'split',
    style: 'split',
    font: 'heritage',
    badge: 'Custom Layout',
    isCustom: true,
    palette: {
      bg: '#f4efe8',
      bgAlt: '#e8dfd3',
      surface: '#fffaf2',
      surfaceMuted: '#f4eee6',
      text: '#1f1a16',
      muted: '#675d54',
      accent: '#9b4f2f',
      accentSoft: '#ebc8b6',
      border: '#d9c9b8',
      ink: '#2a1f17'
    }
  }
];

const CURATED_TEMPLATE_IDS = [CUSTOM_TEMPLATE_ID];

const CURATED_TEMPLATE_ID_SET = new Set(CURATED_TEMPLATE_IDS);

const HEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const cleanText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const cleanHex = (value, fallback) => {
  const candidate = cleanText(value, fallback);
  return HEX.test(candidate) ? candidate : fallback;
};

const cleanEnum = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const clampInt = (value, min, max, fallback) =>
  Math.round(clampNumber(value, min, max, fallback));

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => {
        if (typeof tag === 'string') return cleanText(tag);
        if (tag && typeof tag === 'object') return cleanText(tag.name || tag.label || '');
        return '';
      })
      .filter(Boolean)
      .slice(0, 12);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => cleanText(tag))
      .filter(Boolean)
      .slice(0, 12);
  }

  return [];
};

const parseVideos = (videoUrls) => {
  if (Array.isArray(videoUrls)) return videoUrls.map((url) => cleanText(url)).filter(Boolean).slice(0, 6);

  if (typeof videoUrls === 'string') {
    const candidate = videoUrls.trim();
    if (!candidate) return [];

    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed.map((url) => cleanText(url)).filter(Boolean).slice(0, 6);
    } catch (error) {
      return candidate
        .split(/[\n,]/)
        .map((url) => cleanText(url))
        .filter(Boolean)
        .slice(0, 6);
    }
  }

  return [];
};

const parseGalleryImages = (galleryImages) => {
  if (Array.isArray(galleryImages)) return galleryImages.map((url) => cleanText(url)).filter(Boolean).slice(0, 12);

  if (typeof galleryImages === 'string') {
    const candidate = galleryImages.trim();
    if (!candidate) return [];

    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed.map((url) => cleanText(url)).filter(Boolean).slice(0, 12);
    } catch (error) {
      return candidate
        .split(/[\n,]/)
        .map((url) => cleanText(url))
        .filter(Boolean)
        .slice(0, 12);
    }
  }

  return [];
};

const normalizePresetPalette = (palette = {}) => ({
  bg: cleanHex(palette.bg || palette.bg1, '#f4efe8'),
  bgAlt: cleanHex(palette.bgAlt || palette.bg2, '#e8dfd3'),
  surface: cleanHex(palette.surface, '#fffaf2'),
  surfaceMuted: cleanHex(palette.surfaceMuted || palette.surface, '#f4eee6'),
  text: cleanHex(palette.text, '#1f1a16'),
  muted: cleanHex(palette.muted, '#675d54'),
  accent: cleanHex(palette.accent || palette.primary, '#9b4f2f'),
  accentSoft: cleanHex(palette.accentSoft || palette.soft, '#ebc8b6'),
  border: cleanHex(palette.border, '#d9c9b8'),
  ink: cleanHex(palette.ink || palette.text, '#2a1f17')
});

const normalizeTemplateThemeMode = (value, fallback = 'auto') => {
  if (typeof value !== 'string') return fallback;
  const cleaned = cleanText(value).toLowerCase();
  return TEMPLATE_THEME_VALUES.includes(cleaned) ? cleaned : fallback;
};

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex) => {
  const clean = cleanHex(hex, '').replace('#', '');
  if (!clean) return null;
  const normalized = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean;
  if (normalized.length !== 6) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
};

const rgbToHex = ({ r, g, b }) =>
  '#' +
  [clampChannel(r), clampChannel(g), clampChannel(b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');

const mixHex = (fromHex, toHex, ratio = 0.5) => {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  if (!from || !to) return cleanHex(fromHex, toHex);

  return rgbToHex({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio
  });
};

const luminanceFromHex = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const normalize = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b);
};

const isPaletteDark = (palette) => luminanceFromHex(palette.bg) < 0.42;

const deriveDarkPalette = (palette) =>
  normalizePresetPalette({
    bg: mixHex(palette.bg, '#0a111b', 0.78),
    bgAlt: mixHex(palette.bgAlt, '#141f2e', 0.75),
    surface: mixHex(palette.surface, '#172334', 0.72),
    surfaceMuted: mixHex(palette.surfaceMuted, '#1f3248', 0.68),
    text: mixHex(palette.text, '#e8effa', 0.9),
    muted: mixHex(palette.muted, '#b1c0d2', 0.82),
    accent: mixHex(palette.accent, '#7bb7ff', 0.24),
    accentSoft: mixHex(palette.accentSoft, '#314a63', 0.72),
    border: mixHex(palette.border, '#33495f', 0.72),
    ink: mixHex(palette.ink, '#f3d1ac', 0.45)
  });

const deriveLightPalette = (palette) =>
  normalizePresetPalette({
    bg: mixHex(palette.bg, '#f7f1e8', 0.86),
    bgAlt: mixHex(palette.bgAlt, '#ebdfcf', 0.84),
    surface: mixHex(palette.surface, '#fffaf3', 0.87),
    surfaceMuted: mixHex(palette.surfaceMuted, '#f4ebe0', 0.84),
    text: mixHex(palette.text, '#1f1a16', 0.88),
    muted: mixHex(palette.muted, '#675d54', 0.84),
    accent: mixHex(palette.accent, '#9b4f2f', 0.54),
    accentSoft: mixHex(palette.accentSoft, '#e6c4b0', 0.78),
    border: mixHex(palette.border, '#d9c9b8', 0.78),
    ink: mixHex(palette.ink, '#2a1f17', 0.68)
  });

const TEMPLATE_DARK_PALETTE_OVERRIDES = {
  'metropolitan-ledger': {
    bg: '#14100d',
    bgAlt: '#221a14',
    surface: '#2a2018',
    surfaceMuted: '#34271d',
    text: '#efe2d3',
    muted: '#c2b09e',
    accent: '#d0875a',
    accentSoft: '#4c3527',
    border: '#503a2c',
    ink: '#ffd8b8'
  },
  'morning-bulletin': {
    bg: '#101724',
    bgAlt: '#182337',
    surface: '#1d2b43',
    surfaceMuted: '#243550',
    text: '#e8f0ff',
    muted: '#b4c5e4',
    accent: '#7fa5ff',
    accentSoft: '#2f4370',
    border: '#3a5380',
    ink: '#d8e5ff'
  },
  'harbor-review': {
    bg: '#111a17',
    bgAlt: '#192723',
    surface: '#1f2f2a',
    surfaceMuted: '#263a34',
    text: '#e3f0eb',
    muted: '#acc2b9',
    accent: '#6fb7ad',
    accentSoft: '#2e4f49',
    border: '#3a5e56',
    ink: '#c2efe4'
  },
  'atlas-feature': {
    bg: '#10141c',
    bgAlt: '#1a2230',
    surface: '#1b2433',
    surfaceMuted: '#253246',
    text: '#e7edf6',
    muted: '#b1bece',
    accent: '#e09a68',
    accentSoft: '#3f362f',
    border: '#39485d',
    ink: '#ffd6af'
  },
  'ember-essay': {
    bg: '#19130f',
    bgAlt: '#241b16',
    surface: '#261d17',
    surfaceMuted: '#31261e',
    text: '#f1e8df',
    muted: '#c6b5a6',
    accent: '#e58b55',
    accentSoft: '#4c3729',
    border: '#4b3a2f',
    ink: '#ffd7b8'
  },
  'eclipse-report': {
    bg: '#0a1521',
    bgAlt: '#111f30',
    surface: '#162738',
    surfaceMuted: '#20324a',
    text: '#e8eef8',
    muted: '#b6c5d8',
    accent: '#f3a85a',
    accentSoft: '#5f4a35',
    border: '#334a61',
    ink: '#f5d6aa'
  },
  'meadow-letter': {
    bg: '#121914',
    bgAlt: '#1b261f',
    surface: '#1d2a22',
    surfaceMuted: '#26362b',
    text: '#e4efe4',
    muted: '#a8bda9',
    accent: '#81c17c',
    accentSoft: '#2d4932',
    border: '#365442',
    ink: '#bde5be'
  },
  'wireframe-journal': {
    bg: '#101521',
    bgAlt: '#172033',
    surface: '#1a263f',
    surfaceMuted: '#233454',
    text: '#e7eeff',
    muted: '#b2c1e6',
    accent: '#7e9cff',
    accentSoft: '#2e3f78',
    border: '#38508e',
    ink: '#bcd0ff'
  },
  'sunrise-weekend': {
    bg: '#1d1410',
    bgAlt: '#2a1d16',
    surface: '#2d2119',
    surfaceMuted: '#382a1f',
    text: '#f7ece0',
    muted: '#cbb8a8',
    accent: '#f19a57',
    accentSoft: '#553b2a',
    border: '#5b4330',
    ink: '#ffd7b4'
  },
  'iron-column': {
    bg: '#171717',
    bgAlt: '#232323',
    surface: '#252525',
    surfaceMuted: '#2f2f2f',
    text: '#eeeeee',
    muted: '#bdbdbd',
    accent: '#cf7a7a',
    accentSoft: '#4e3333',
    border: '#4a4a4a',
    ink: '#ffd3d3'
  },
  'granite-digest': {
    bg: '#11171d',
    bgAlt: '#19232c',
    surface: '#1c2a33',
    surfaceMuted: '#243742',
    text: '#e4edf3',
    muted: '#adc0cb',
    accent: '#7fb6cf',
    accentSoft: '#2d4857',
    border: '#355060',
    ink: '#c7e7f5'
  },
  'civic-observer': {
    bg: '#101922',
    bgAlt: '#182632',
    surface: '#1a2c39',
    surfaceMuted: '#233847',
    text: '#e7f1f8',
    muted: '#b1c3cf',
    accent: '#6ea8c6',
    accentSoft: '#2d4d5f',
    border: '#3a5a6e',
    ink: '#cce8f7'
  },
  'atelier-notes': {
    bg: '#1a1410',
    bgAlt: '#251d17',
    surface: '#2a221c',
    surfaceMuted: '#342b22',
    text: '#f1e8de',
    muted: '#c3b2a2',
    accent: '#d0875e',
    accentSoft: '#50392b',
    border: '#4f3c31',
    ink: '#ffd8bd'
  },
  'nightwire-deep': {
    bg: '#070f18',
    bgAlt: '#101a29',
    surface: '#132335',
    surfaceMuted: '#1d3045',
    text: '#dce8f8',
    muted: '#a6b7ca',
    accent: '#67b8ff',
    accentSoft: '#334b61',
    border: '#274055',
    ink: '#8fcbff'
  }
};

const TEMPLATE_LIGHT_PALETTE_OVERRIDES = {
  'eclipse-report': {
    bg: '#f3ede4',
    bgAlt: '#e5d7c8',
    surface: '#fffaf2',
    surfaceMuted: '#f4ece2',
    text: '#2a2017',
    muted: '#705f52',
    accent: '#b36f2f',
    accentSoft: '#e8c9a8',
    border: '#dcc8b5',
    ink: '#332319'
  },
  'nightwire-deep': {
    bg: '#eef3fb',
    bgAlt: '#dbe5f3',
    surface: '#f8fbff',
    surfaceMuted: '#ecf3fb',
    text: '#1b2738',
    muted: '#5f7288',
    accent: '#3f78b5',
    accentSoft: '#c7d8ea',
    border: '#c1d0e0',
    ink: '#1f3550'
  }
};

const resolveThemePalettes = (palette, templateId) => {
  const normalized = normalizePresetPalette(palette);
  const darkOverride = templateId ? TEMPLATE_DARK_PALETTE_OVERRIDES[templateId] : null;
  const lightOverride = templateId ? TEMPLATE_LIGHT_PALETTE_OVERRIDES[templateId] : null;

  if (isPaletteDark(normalized)) {
    return {
      light: lightOverride ? normalizePresetPalette(lightOverride) : deriveLightPalette(normalized),
      dark: darkOverride ? normalizePresetPalette(darkOverride) : normalized
    };
  }

  return {
    light: lightOverride ? normalizePresetPalette(lightOverride) : normalized,
    dark: darkOverride ? normalizePresetPalette(darkOverride) : deriveDarkPalette(normalized)
  };
};

const summaryFromContent = (content) => {
  const plain = cleanText(content)
    .replace(/[#>*`\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return 'This story is ready for publication.';
  return plain.slice(0, 220) + (plain.length > 220 ? '...' : '');
};

const markdownLineToPlain = (line) =>
  line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s+/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
    .trim();

const plainParagraphsFromContent = (content) =>
  cleanText(content)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(markdownLineToPlain)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .slice(0, 30);

const extractHighlights = (metaDescription, paragraphs, tags) => {
  const seeds = [];

  if (cleanText(metaDescription)) {
    seeds.push(
      ...cleanText(metaDescription)
        .split(/(?<=[.!?])\s+/)
        .map((item) => cleanText(item))
        .filter(Boolean)
    );
  }

  paragraphs.slice(0, 8).forEach((paragraph) => {
    seeds.push(
      ...paragraph
        .split(/(?<=[.!?])\s+/)
        .map((item) => cleanText(item))
        .filter(Boolean)
    );
  });

  tags.slice(0, 4).forEach((tag) => {
    seeds.push(`Focus on ${tag}.`);
  });

  const unique = [];
  const seen = new Set();

  seeds.forEach((sentence) => {
    const normalized = sentence.toLowerCase();
    if (sentence.length < 28 || seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(sentence);
  });

  return unique.slice(0, 4);
};

const estimateReadingMinutes = (content) => {
  const words = cleanText(content)
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
};

const parseProductArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const normalizeProductTagsForTemplate = (article = {}) => {
  const productRefs = parseProductArray(article.linkedProducts);
  const normalizedProducts = [];
  const unresolvedProductIds = [];
  const seenProducts = new Set();

  const addProductRef = (product) => {
    if (!product) return;

    if (typeof product === 'object') {
      const key = product._id || product.id || product.slug || product.title;
      if (!key || seenProducts.has(String(key))) return;
      seenProducts.add(String(key));
      normalizedProducts.push(product);
      return;
    }

    const id = String(product).trim();
    if (id && !unresolvedProductIds.includes(id)) unresolvedProductIds.push(id);
  };

  productRefs.forEach(addProductRef);
  addProductRef(article.linkedProduct);

  const resolvedIds = new Set(
    normalizedProducts
      .map((product) => String(product?._id || product?.id || '').trim())
      .filter(Boolean)
  );
  const unresolvedCount = unresolvedProductIds.filter((id) => !resolvedIds.has(id)).length;
  const externalLinks = parseProductArray(article.externalProductLinks)
    .filter((link) => link && typeof link === 'object' && String(link.url || '').trim());

  return {
    products: normalizedProducts,
    externalLinks,
    unresolvedCount,
    total: normalizedProducts.length + externalLinks.length + unresolvedCount
  };
};

const productPriceLabel = (product) => {
  if (!product || typeof product !== 'object') return '';
  if (product.isFree) return 'Free';
  if (product.price === undefined || product.price === null || product.price === '') return '';
  const numericPrice = Number(product.price);
  const displayPrice = Number.isFinite(numericPrice)
    ? numericPrice.toLocaleString('en-IN')
    : String(product.price);
  return `${product.currency || 'INR'} ${displayPrice}`;
};

const productHref = (product) => {
  const key = cleanText(product?.slug || product?._id || product?.id, '');
  return key ? `/marketplace/${encodeURIComponent(key)}` : '/marketplace';
};

const safeExternalHref = (url) => {
  const candidate = cleanText(url, '');
  return /^https?:\/\//i.test(candidate) ? candidate : '#';
};

const createDefaultCustomStudioBlockMap = () => ({
  title: {
    colStart: 1,
    colSpan: 8,
    rowStart: 1,
    rowSpan: 4,
    fontScale: 1.2,
    textAlign: 'left',
    shellBackgroundColor: '#f3ece4',
    contentBackgroundColor: '#fffaf2',
    backgroundColor: '#fffaf2',
    textColor: '#1f1a16',
    borderColor: '#d9c9b8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 18,
    padding: 18,
    shellShadowEnabled: true,
    shellShadowLevel: 1,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 1,
    underlineStyle: 'solid',
    underlineColor: '#9b4f2f'
  },
  meta: {
    colStart: 9,
    colSpan: 4,
    rowStart: 1,
    rowSpan: 4,
    fontScale: 0.96,
    textAlign: 'left',
    shellBackgroundColor: '#eef2f6',
    contentBackgroundColor: '#f4eee6',
    backgroundColor: '#f4eee6',
    textColor: '#675d54',
    borderColor: '#d9c9b8',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    shellShadowEnabled: false,
    shellShadowLevel: 0,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 0,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  image: {
    colStart: 1,
    colSpan: 7,
    rowStart: 5,
    rowSpan: 8,
    fontScale: 1,
    textAlign: 'center',
    shellBackgroundColor: '#ece8e1',
    contentBackgroundColor: '#f4eee6',
    backgroundColor: '#f4eee6',
    textColor: '#675d54',
    borderColor: '#d9c9b8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 18,
    padding: 12,
    shellShadowEnabled: true,
    shellShadowLevel: 1,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 1,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  gallery: {
    colStart: 1,
    colSpan: 7,
    rowStart: 5,
    rowSpan: 8,
    fontScale: 1,
    textAlign: 'center',
    shellBackgroundColor: '#ece8e1',
    contentBackgroundColor: '#f4eee6',
    backgroundColor: '#f4eee6',
    textColor: '#675d54',
    borderColor: '#d9c9b8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 18,
    padding: 12,
    shellShadowEnabled: true,
    shellShadowLevel: 1,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 1,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  collage: {
    colStart: 1,
    colSpan: 7,
    rowStart: 5,
    rowSpan: 8,
    fontScale: 1,
    textAlign: 'center',
    shellBackgroundColor: '#ece8e1',
    contentBackgroundColor: '#f4eee6',
    backgroundColor: '#f4eee6',
    textColor: '#675d54',
    borderColor: '#d9c9b8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 18,
    padding: 12,
    shellShadowEnabled: true,
    shellShadowLevel: 1,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 1,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  content: {
    colStart: 8,
    colSpan: 5,
    rowStart: 5,
    rowSpan: 14,
    fontScale: 1,
    textAlign: 'left',
    shellBackgroundColor: '#f1ece5',
    contentBackgroundColor: '#fffaf2',
    backgroundColor: '#fffaf2',
    textColor: '#1f1a16',
    borderColor: '#d9c9b8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 18,
    padding: 14,
    shellShadowEnabled: true,
    shellShadowLevel: 1,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 1,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  highlights: {
    colStart: 1,
    colSpan: 4,
    rowStart: 13,
    rowSpan: 6,
    fontScale: 0.98,
    textAlign: 'left',
    shellBackgroundColor: '#f5e5d8',
    contentBackgroundColor: '#fff5eb',
    backgroundColor: '#fff5eb',
    textColor: '#5a463a',
    borderColor: '#e1cfbf',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 16,
    padding: 14,
    shellShadowEnabled: false,
    shellShadowLevel: 0,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 0,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  tags: {
    colStart: 5,
    colSpan: 3,
    rowStart: 13,
    rowSpan: 6,
    fontScale: 0.96,
    textAlign: 'left',
    shellBackgroundColor: '#efe4d8',
    contentBackgroundColor: '#f7efe6',
    backgroundColor: '#f7efe6',
    textColor: '#5f4f43',
    borderColor: '#d9c9b8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 16,
    padding: 14,
    shellShadowEnabled: false,
    shellShadowLevel: 0,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 0,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  'product-tags': {
    colStart: 10,
    colSpan: 3,
    rowStart: 27,
    rowSpan: 2,
    fontScale: 0.92,
    textAlign: 'center',
    shellBackgroundColor: '#efe4d8',
    contentBackgroundColor: '#fffaf2',
    backgroundColor: '#fffaf2',
    textColor: '#4c3f36',
    borderColor: '#cdbba9',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 10,
    shellShadowEnabled: false,
    shellShadowLevel: 0,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 0,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  video: {
    colStart: 1,
    colSpan: 6,
    rowStart: 19,
    rowSpan: 8,
    fontScale: 0.96,
    textAlign: 'left',
    shellBackgroundColor: '#efe3d7',
    contentBackgroundColor: '#f8f0e6',
    backgroundColor: '#f8f0e6',
    textColor: '#5d4a3f',
    borderColor: '#d9c9b8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 16,
    padding: 12,
    shellShadowEnabled: true,
    shellShadowLevel: 1,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 1,
    underlineStyle: 'none',
    underlineColor: '#9b4f2f'
  },
  quote: {
    colStart: 7,
    colSpan: 6,
    rowStart: 19,
    rowSpan: 8,
    fontScale: 1.08,
    textAlign: 'left',
    shellBackgroundColor: '#f6e1d2',
    contentBackgroundColor: '#fff1e5',
    backgroundColor: '#fff1e5',
    textColor: '#5c4539',
    borderColor: '#e1c7b3',
    borderWidth: 1,
    borderStyle: 'double',
    borderRadius: 16,
    padding: 16,
    shellShadowEnabled: false,
    shellShadowLevel: 0,
    contentShadowEnabled: false,
    contentShadowLevel: 0,
    shadowLevel: 0,
    underlineStyle: 'highlight',
    underlineColor: '#ebc8b6'
  }
});

const createDefaultCustomStudioBlocks = () => {
  const defaults = createDefaultCustomStudioBlockMap();
  const baseOrder = ['title', 'meta', 'image', 'content', 'highlights', 'tags', 'video', 'quote'];

  return baseOrder.map((type, index) => ({
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    type,
    label: CUSTOM_STUDIO_BLOCK_TYPE_LABELS[type] || type,
    visible: true,
    borderEnabled: true,
    locked: false,
    zIndex: index + 1,
    imageFit: 'cover',
    focalX: 50,
    focalY: 50,
    captionStyle: ['image', 'gallery', 'collage'].includes(type) ? 'hidden' : 'strip',
    videoLayout: 'grid',
    pagePlacement: 'all',
    borderPreset: 'custom',
    highlightPreset: 'none',
    shapePreset: 'rect',
    shapeNotch: 24,
    shapeOffset: 45,
    shapeGridCols: 6,
    shapeGridRows: 6,
    shapeMaskCells: [],
    ...defaults[type]
  }));
};

const createDefaultCustomStudio = () => ({
  columns: CUSTOM_STUDIO_DEFAULT_COLUMNS,
  rows: CUSTOM_STUDIO_DEFAULT_ROWS,
  rowHeight: CUSTOM_STUDIO_DEFAULT_ROW_HEIGHT,
  blocks: createDefaultCustomStudioBlocks()
});

const cloneStudio = (studio) =>
  JSON.parse(JSON.stringify(studio || createDefaultCustomStudio()));

const createDefaultCustomStudios = () => {
  const desktop = createDefaultCustomStudio();
  const tablet = cloneStudio(desktop);
  const mobile = cloneStudio(desktop);

  tablet.rows = clampInt(tablet.rows - 4, CUSTOM_STUDIO_MIN_ROWS, CUSTOM_STUDIO_MAX_ROWS, tablet.rows);
  mobile.rows = clampInt(mobile.rows - 6, CUSTOM_STUDIO_MIN_ROWS, CUSTOM_STUDIO_MAX_ROWS, mobile.rows);

  const mobileColumns = clampInt(mobile.columns, CUSTOM_STUDIO_MIN_COLUMNS, CUSTOM_STUDIO_MAX_COLUMNS, CUSTOM_STUDIO_DEFAULT_COLUMNS);
  const mobileMinSpan = Math.max(4, Math.ceil(mobileColumns / 3));
  mobile.blocks = (mobile.blocks || []).map((block) => ({
    ...block,
    colStart: clampInt(block.colStart, 1, Math.max(1, Math.floor(mobileColumns / 2)), 1),
    colSpan: clampInt(Math.max(mobileMinSpan, Math.min(mobileColumns, block.colSpan + 2)), 1, mobileColumns, mobileColumns)
  }));

  return { desktop, tablet, mobile };
};

export const createCustomStudioBlock = (type) => {
  const fallbackType = CUSTOM_STUDIO_BLOCK_TYPE_IDS.includes(type) ? type : 'content';
  const defaults = createDefaultCustomStudioBlockMap()[fallbackType];
  return {
    id: `${fallbackType}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: fallbackType,
    label: CUSTOM_STUDIO_BLOCK_TYPE_LABELS[fallbackType] || fallbackType,
    visible: true,
    borderEnabled: true,
    locked: false,
    zIndex: 1,
    imageFit: 'cover',
    focalX: 50,
    focalY: 50,
    captionStyle: ['image', 'gallery', 'collage'].includes(fallbackType) ? 'hidden' : 'strip',
    videoLayout: 'grid',
    pagePlacement: 'all',
    borderPreset: 'custom',
    highlightPreset: 'none',
    shapePreset: 'rect',
    shapeNotch: 24,
    shapeOffset: 45,
    shapeGridCols: 6,
    shapeGridRows: 6,
    shapeMaskCells: [],
    ...defaults
  };
};

const normalizeCustomStudioBlock = (block, fallbackBlock, index, columns = CUSTOM_STUDIO_DEFAULT_COLUMNS) => {
  const fallback = fallbackBlock || createCustomStudioBlock('content');
  const blockType = cleanEnum(
    cleanText(block?.type, fallback.type),
    CUSTOM_STUDIO_BLOCK_TYPE_IDS,
    fallback.type
  );
  const shapeEligible = isCustomStudioShapeEligibleTypeInternal(blockType);
  const fallbackShapePreset = cleanEnum(
    cleanText(fallback?.shapePreset, 'rect'),
    CUSTOM_STUDIO_SHAPE_PRESET_IDS,
    'rect'
  );
  const normalizedShapePreset = cleanEnum(
    cleanText(block?.shapePreset, fallbackShapePreset),
    CUSTOM_STUDIO_SHAPE_PRESET_IDS,
    fallbackShapePreset
  );
  const shapeGridCols = clampInt(
    block?.shapeGridCols,
    CUSTOM_STUDIO_SHAPE_GRID_MIN,
    CUSTOM_STUDIO_SHAPE_GRID_MAX,
    fallback?.shapeGridCols !== undefined ? fallback.shapeGridCols : 6
  );
  const shapeGridRows = clampInt(
    block?.shapeGridRows,
    CUSTOM_STUDIO_SHAPE_GRID_MIN,
    CUSTOM_STUDIO_SHAPE_GRID_MAX,
    fallback?.shapeGridRows !== undefined ? fallback.shapeGridRows : 6
  );
  const fallbackShapeMaskCells = normalizeCustomStudioShapeMaskCells(
    fallback?.shapeMaskCells,
    shapeGridCols,
    shapeGridRows,
    buildFullCustomStudioShapeMaskCells(shapeGridCols, shapeGridRows)
  );
  const normalizedShapeMaskCells = normalizeCustomStudioShapeMaskCells(
    block?.shapeMaskCells,
    shapeGridCols,
    shapeGridRows,
    fallbackShapeMaskCells
  );
  const legacyBackground = cleanHex(
    block?.backgroundColor,
    fallback.contentBackgroundColor || fallback.backgroundColor
  );
  const legacyShadowLevel = clampInt(
    block?.shadowLevel,
    0,
    3,
    fallback.shellShadowLevel !== undefined ? fallback.shellShadowLevel : fallback.shadowLevel
  );

  return {
    id: cleanText(block?.id, `block-${index + 1}`),
    type: blockType,
    label: cleanText(block?.label, CUSTOM_STUDIO_BLOCK_TYPE_LABELS[blockType] || fallback.label).slice(0, 36),
    visible: block?.visible !== undefined ? Boolean(block.visible) : Boolean(fallback.visible),
    borderEnabled:
      block?.borderEnabled !== undefined
        ? Boolean(block.borderEnabled)
        : fallback?.borderEnabled !== undefined
        ? Boolean(fallback.borderEnabled)
        : clampInt(block?.borderWidth, 0, 8, fallback.borderWidth) > 0,
    colStart: clampInt(block?.colStart, 1, columns, fallback.colStart),
    colSpan: clampInt(block?.colSpan, 1, columns, fallback.colSpan),
    rowStart: clampInt(block?.rowStart, 1, CUSTOM_STUDIO_MAX_ROWS, fallback.rowStart),
    rowSpan: clampInt(block?.rowSpan, 1, CUSTOM_STUDIO_MAX_ROWS, fallback.rowSpan),
    fontScale: clampNumber(block?.fontScale, 0.72, 1.9, fallback.fontScale),
    textAlign: cleanEnum(
      cleanText(block?.textAlign, fallback.textAlign),
      CUSTOM_STUDIO_TEXT_ALIGN_OPTIONS.map((item) => item.id),
      fallback.textAlign
    ),
    shellBackgroundColor: cleanHex(
      block?.shellBackgroundColor,
      fallback.shellBackgroundColor || legacyBackground
    ),
    contentBackgroundColor: cleanHex(
      block?.contentBackgroundColor,
      fallback.contentBackgroundColor || legacyBackground
    ),
    backgroundColor: cleanHex(
      block?.contentBackgroundColor || block?.backgroundColor,
      fallback.contentBackgroundColor || fallback.backgroundColor
    ),
    textColor: cleanHex(block?.textColor, fallback.textColor),
    borderColor: cleanHex(block?.borderColor, fallback.borderColor),
    borderWidth: clampInt(block?.borderWidth, 0, 8, fallback.borderWidth),
    borderStyle: cleanEnum(
      cleanText(block?.borderStyle, fallback.borderStyle),
      CUSTOM_STUDIO_BORDER_STYLES.map((item) => item.id),
      fallback.borderStyle
    ),
    borderRadius: clampInt(block?.borderRadius, 0, 44, fallback.borderRadius),
    padding: clampInt(block?.padding, 6, 36, fallback.padding),
    shellShadowEnabled:
      block?.shellShadowEnabled !== undefined
        ? Boolean(block.shellShadowEnabled)
        : fallback.shellShadowEnabled !== undefined
        ? Boolean(fallback.shellShadowEnabled)
        : legacyShadowLevel > 0,
    shellShadowLevel: clampInt(
      block?.shellShadowLevel,
      0,
      3,
      fallback.shellShadowLevel !== undefined ? fallback.shellShadowLevel : legacyShadowLevel
    ),
    contentShadowEnabled:
      block?.contentShadowEnabled !== undefined
        ? Boolean(block.contentShadowEnabled)
        : fallback.contentShadowEnabled !== undefined
        ? Boolean(fallback.contentShadowEnabled)
        : false,
    contentShadowLevel: clampInt(
      block?.contentShadowLevel,
      0,
      3,
      fallback.contentShadowLevel !== undefined ? fallback.contentShadowLevel : 0
    ),
    shadowLevel: clampInt(
      block?.shellShadowLevel !== undefined ? block.shellShadowLevel : block?.shadowLevel,
      0,
      3,
      fallback.shellShadowLevel !== undefined ? fallback.shellShadowLevel : legacyShadowLevel
    ),
    underlineStyle: cleanEnum(
      cleanText(block?.underlineStyle, fallback.underlineStyle),
      CUSTOM_STUDIO_UNDERLINE_STYLES.map((item) => item.id),
      fallback.underlineStyle
    ),
    underlineColor: cleanHex(block?.underlineColor, fallback.underlineColor),
    locked:
      block?.locked !== undefined
        ? Boolean(block.locked)
        : fallback?.locked !== undefined
        ? Boolean(fallback.locked)
        : false,
    zIndex: clampInt(block?.zIndex, 1, 120, fallback?.zIndex !== undefined ? fallback.zIndex : index + 1),
    imageFit: cleanEnum(
      cleanText(block?.imageFit, fallback?.imageFit || 'cover'),
      CUSTOM_STUDIO_IMAGE_FIT_OPTIONS.map((item) => item.id),
      fallback?.imageFit || 'cover'
    ),
    focalX: clampInt(block?.focalX, 0, 100, fallback?.focalX !== undefined ? fallback.focalX : 50),
    focalY: clampInt(block?.focalY, 0, 100, fallback?.focalY !== undefined ? fallback.focalY : 50),
    captionStyle: cleanEnum(
      cleanText(block?.captionStyle, fallback?.captionStyle || 'strip'),
      CUSTOM_STUDIO_CAPTION_STYLE_OPTIONS.map((item) => item.id),
      fallback?.captionStyle || 'strip'
    ),
    videoLayout: cleanEnum(
      cleanText(block?.videoLayout, fallback?.videoLayout || 'grid'),
      CUSTOM_STUDIO_VIDEO_LAYOUT_OPTIONS.map((item) => item.id),
      fallback?.videoLayout || 'grid'
    ),
    pagePlacement: cleanEnum(
      cleanText(block?.pagePlacement, fallback?.pagePlacement || 'all'),
      CUSTOM_STUDIO_PAGE_PLACEMENT_OPTIONS.map((item) => item.id),
      fallback?.pagePlacement || 'all'
    ),
    borderPreset: cleanEnum(
      cleanText(block?.borderPreset, fallback?.borderPreset || 'custom'),
      CUSTOM_STUDIO_BORDER_PRESET_OPTIONS.map((item) => item.id),
      fallback?.borderPreset || 'custom'
    ),
    highlightPreset: cleanEnum(
      cleanText(block?.highlightPreset, fallback?.highlightPreset || 'none'),
      CUSTOM_STUDIO_HIGHLIGHT_PRESET_OPTIONS.map((item) => item.id),
      fallback?.highlightPreset || 'none'
    ),
    shapePreset: shapeEligible ? normalizedShapePreset : 'rect',
    shapeNotch: clampInt(block?.shapeNotch, 10, 38, fallback?.shapeNotch !== undefined ? fallback.shapeNotch : 24),
    shapeOffset: clampInt(block?.shapeOffset, 28, 72, fallback?.shapeOffset !== undefined ? fallback.shapeOffset : 45),
    shapeGridCols,
    shapeGridRows,
    shapeMaskCells:
      shapeEligible && normalizedShapePreset === 'cells'
        ? normalizedShapeMaskCells.length
          ? normalizedShapeMaskCells
          : buildFullCustomStudioShapeMaskCells(shapeGridCols, shapeGridRows)
        : normalizedShapeMaskCells
  };
};

const normalizeCustomStudio = (studio, defaultStudio) => {
  const fallback = defaultStudio || createDefaultCustomStudio();
  const columns = clampInt(
    studio?.columns,
    CUSTOM_STUDIO_MIN_COLUMNS,
    CUSTOM_STUDIO_MAX_COLUMNS,
    clampInt(fallback.columns, CUSTOM_STUDIO_MIN_COLUMNS, CUSTOM_STUDIO_MAX_COLUMNS, CUSTOM_STUDIO_DEFAULT_COLUMNS)
  );
  const rows = clampInt(studio?.rows, CUSTOM_STUDIO_MIN_ROWS, CUSTOM_STUDIO_MAX_ROWS, fallback.rows);
  const rowHeight = clampInt(studio?.rowHeight, 24, 54, fallback.rowHeight);

  const fallbackByType = {};
  fallback.blocks.forEach((block) => {
    fallbackByType[block.type] = block;
  });

  let blocks = Array.isArray(studio?.blocks)
    ? studio.blocks
        .slice(0, 24)
        .map((block, index) =>
          normalizeCustomStudioBlock(block, fallbackByType[block?.type] || fallback.blocks[index], index, columns)
        )
        .filter(Boolean)
    : [];

  if (!blocks.length) {
    blocks = fallback.blocks.map((block, index) => normalizeCustomStudioBlock(block, block, index, columns));
  }

  return {
    columns,
    rows,
    rowHeight,
    blocks
  };
};

const normalizeCustomStudios = (studios, fallbackStudios) => {
  const fallback = fallbackStudios || createDefaultCustomStudios();
  const source = studios && typeof studios === 'object' ? studios : {};

  return {
    desktop: normalizeCustomStudio(source.desktop, fallback.desktop),
    tablet: normalizeCustomStudio(source.tablet || source.desktop, fallback.tablet),
    mobile: normalizeCustomStudio(source.mobile || source.tablet || source.desktop, fallback.mobile)
  };
};

const resolveRuntimeStudioDevice = (studios) => {
  if (!studios || typeof studios !== 'object') return 'desktop';
  if (typeof window === 'undefined') return 'desktop';

  const width = Number(window.innerWidth || 0);
  if (width > 0 && width < 768 && studios.mobile) return 'mobile';
  if (width > 0 && width < 1180 && studios.tablet) return 'tablet';
  return 'desktop';
};

export const createDefaultCustomTemplate = () => {
  const studios = createDefaultCustomStudios();
  return {
    name: 'My Signature Layout',
    layout: 'split',
    headlineFont: 'heritage',
    bodyFont: 'modern',
    accentColor: '#9b4f2f',
    accentSoftColor: '#ebc8b6',
    backgroundStart: '#f4efe8',
    backgroundEnd: '#e8dfd3',
    surfaceColor: '#fffaf2',
    textColor: '#1f1a16',
    mutedColor: '#675d54',
    borderColor: '#d9c9b8',
    showDropCap: true,
    showProgress: true,
    paginationMode: 'auto',
    manualPageCount: 2,
    studio: studios.desktop,
    studios
  };
};

export const normalizeCustomTemplate = (customTemplate) => {
  const defaults = createDefaultCustomTemplate();
  if (!customTemplate || typeof customTemplate !== 'object') return defaults;

  const fontKeys = Object.keys(FONT_MAP);
  const layoutKeys = TEMPLATE_LAYOUT_OPTIONS.map((option) => option.id);

  const studioSource =
    customTemplate.studios && typeof customTemplate.studios === 'object'
      ? customTemplate.studios
      : customTemplate.studio
      ? {
          desktop: customTemplate.studio,
          tablet: customTemplate.studio,
          mobile: customTemplate.studio
        }
      : defaults.studios;

  const normalizedStudios = normalizeCustomStudios(studioSource, defaults.studios);
  const normalizedDesktopStudio = normalizeCustomStudio(
    customTemplate.studio || normalizedStudios.desktop,
    normalizedStudios.desktop
  );

  return {
    name: cleanText(customTemplate.name, defaults.name).slice(0, 56),
    layout: cleanEnum(customTemplate.layout, layoutKeys, defaults.layout),
    headlineFont: cleanEnum(customTemplate.headlineFont, fontKeys, defaults.headlineFont),
    bodyFont: cleanEnum(customTemplate.bodyFont, fontKeys, defaults.bodyFont),
    accentColor: cleanHex(customTemplate.accentColor, defaults.accentColor),
    accentSoftColor: cleanHex(customTemplate.accentSoftColor, defaults.accentSoftColor),
    backgroundStart: cleanHex(customTemplate.backgroundStart, defaults.backgroundStart),
    backgroundEnd: cleanHex(customTemplate.backgroundEnd, defaults.backgroundEnd),
    surfaceColor: cleanHex(customTemplate.surfaceColor, defaults.surfaceColor),
    textColor: cleanHex(customTemplate.textColor, defaults.textColor),
    mutedColor: cleanHex(customTemplate.mutedColor, defaults.mutedColor),
    borderColor: cleanHex(customTemplate.borderColor, defaults.borderColor),
    showDropCap: customTemplate.showDropCap !== undefined ? Boolean(customTemplate.showDropCap) : defaults.showDropCap,
    showProgress: customTemplate.showProgress !== undefined ? Boolean(customTemplate.showProgress) : defaults.showProgress,
    paginationMode: cleanEnum(
      cleanText(customTemplate.paginationMode, defaults.paginationMode),
      CUSTOM_TEMPLATE_PAGINATION_OPTIONS.map((option) => option.id),
      defaults.paginationMode
    ),
    manualPageCount: clampInt(customTemplate.manualPageCount, 2, 6, defaults.manualPageCount),
    studio: normalizedDesktopStudio,
    studios: {
      ...normalizedStudios,
      desktop: normalizedDesktopStudio
    }
  };
};

export const normalizeArticleTemplateData = (article = {}) => {
  const author = article.author && typeof article.author === 'object' ? article.author : { username: article.author };
  const content = cleanText(article.content, 'Write your story to see this layout in action.');
  const tags = parseTags(article.tags);
  const paragraphs = plainParagraphsFromContent(content);
  const metaDescription = cleanText(article.metaDescription, summaryFromContent(content));
  const coverImage = cleanText(article.coverImage, '');
  const galleryImages = parseGalleryImages(article.galleryImages).filter((url, index, list) => url !== coverImage && list.indexOf(url) === index);
  const readingMinutes = estimateReadingMinutes(content);
  const productTags = normalizeProductTagsForTemplate(article);

  return {
    title: cleanText(article.title, 'Untitled Story'),
    content,
    metaDescription,
    category: cleanText(article.category, 'General'),
    authorName: cleanText(author?.username || author?.fullName, 'Editorial Desk'),
    coverImage,
    galleryImages,
    tags,
    videoUrls: parseVideos(article.videoUrls),
    createdAt: article.createdAt || new Date().toISOString(),
    paragraphs,
    highlights: extractHighlights(metaDescription, paragraphs, tags),
    readingMinutes,
    templateThemeMode: normalizeTemplateThemeMode(article.templateThemeMode, 'auto'),
    isLongRead: readingMinutes >= 8 || paragraphs.length >= 18,
    linkedProduct: article.linkedProduct || null,
    linkedProducts: productTags.products,
    externalProductLinks: productTags.externalLinks,
    unresolvedProductTagCount: productTags.unresolvedCount,
    productTagCount: productTags.total,
    isTemplatePreview: Boolean(article.isTemplatePreview)
  };
};

const INLINE = {
  code: /`([^`]+)`/g,
  bold: /\*\*([^*]+)\*\*/g,
  italic: /\*([^*]+)\*/g,
  highlight: /==([^=]+)==/g,
  link: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
};

const inlineMarkdown = (line) =>
  escapeHtml(line)
    .replace(INLINE.code, '<code>$1</code>')
    .replace(INLINE.bold, '<strong>$1</strong>')
    .replace(INLINE.italic, '<em>$1</em>')
    .replace(INLINE.highlight, '<mark>$1</mark>')
    .replace(INLINE.link, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

const createInlineMediaSchedule = (paragraphCount, mediaCount, preferEarlyBreak = false) => {
  if (!paragraphCount || !mediaCount || paragraphCount < 4) return [];

  const slots = Math.min(mediaCount, paragraphCount >= 20 ? 4 : paragraphCount >= 12 ? 3 : 2);
  const start = preferEarlyBreak ? 2 : 3;
  const maxTarget = Math.max(start, paragraphCount - 1);
  const span = Math.max(maxTarget - start, 1);
  const step = Math.max(2, Math.floor(span / Math.max(slots, 1)));

  const schedule = [];
  let cursor = start;

  for (let index = 0; index < slots; index += 1) {
    cursor = Math.min(maxTarget, index === 0 ? start : cursor + step);
    while (schedule.includes(cursor) && cursor < maxTarget) {
      cursor += 1;
    }
    schedule.push(cursor);
  }

  return schedule;
};

const renderInlineMedia = (url, index) =>
  '<figure class="inline-media reveal"><img src="' +
  escapeHtml(url) +
  '" alt="Story visual ' +
  (index + 1) +
  '" loading="lazy" /><figcaption>Story visual ' +
  (index + 1) +
  '</figcaption></figure>';

const renderContent = (content, showDropCap = true, inlineMedia = [], options = {}) => {
  const lines = cleanText(content).replace(/\r\n/g, '\n').split('\n');
  const paragraphCount = lines.reduce((count, rawLine) => {
    const line = rawLine.trim();
    if (!line) return count;
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^---+$/.test(line)) return count;
    return count + 1;
  }, 0);

  const safeMedia = Array.isArray(inlineMedia) ? inlineMedia.map((url) => cleanText(url)).filter(Boolean) : [];
  const maxInlineMedia = Math.min(safeMedia.length, options.maxInlineMedia || 4);
  const mediaSchedule = createInlineMediaSchedule(paragraphCount, maxInlineMedia, Boolean(options.preferEarlyBreak));

  let html = '';
  let paragraphIndex = 0;
  let unorderedOpen = false;
  let orderedOpen = false;
  let nextMediaIndex = 0;

  const closeLists = () => {
    if (unorderedOpen) {
      html += '</ul>';
      unorderedOpen = false;
    }

    if (orderedOpen) {
      html += '</ol>';
      orderedOpen = false;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      closeLists();
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!unorderedOpen) {
        closeLists();
        html += '<ul class="story-list">';
        unorderedOpen = true;
      }
      html += '<li>' + inlineMarkdown(line.replace(/^[-*]\s+/, '')) + '</li>';
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (!orderedOpen) {
        closeLists();
        html += '<ol class="story-list ordered">';
        orderedOpen = true;
      }
      html += '<li>' + inlineMarkdown(line.replace(/^\d+\.\s+/, '')) + '</li>';
      return;
    }

    closeLists();

    if (/^###\s+/.test(line)) {
      html += '<h3>' + inlineMarkdown(line.replace(/^###\s+/, '')) + '</h3>';
      return;
    }

    if (/^##\s+/.test(line)) {
      html += '<h2>' + inlineMarkdown(line.replace(/^##\s+/, '')) + '</h2>';
      return;
    }

    if (/^#\s+/.test(line)) {
      html += '<h1>' + inlineMarkdown(line.replace(/^#\s+/, '')) + '</h1>';
      return;
    }

    if (/^>\s+/.test(line)) {
      html += '<blockquote>' + inlineMarkdown(line.replace(/^>\s+/, '')) + '</blockquote>';
      return;
    }

    if (/^---+$/.test(line)) {
      html += '<hr class="story-divider" />';
      return;
    }

    paragraphIndex += 1;
    const className = paragraphIndex === 1 && showDropCap ? ' class="lead"' : '';
    html += '<p' + className + '>' + inlineMarkdown(line) + '</p>';

    if (mediaSchedule.includes(paragraphIndex) && nextMediaIndex < maxInlineMedia) {
      html += renderInlineMedia(safeMedia[nextMediaIndex], nextMediaIndex);
      nextMediaIndex += 1;
    }
  });

  closeLists();
  return html || '<p class="lead">Write your story to see this layout in action.</p>';
};

const embedUrl = (url) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (host.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (host.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch (error) {
    return null;
  }

  return null;
};

const renderVideos = (videoUrls) => {
  if (!videoUrls.length) return '';

  const cards = videoUrls
    .map((url) => {
      const embedded = embedUrl(url);
      if (embedded) {
        return `<div class="video-card reveal"><iframe src="${escapeHtml(embedded)}" title="Embedded video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }

      return `<div class="video-card reveal"><video controls preload="metadata"><source src="${escapeHtml(url)}" /></video></div>`;
    })
    .join('');

  return `<section class="video-shell frame-card"><div class="section-top"><h2>Related Visuals</h2><p>Watch companion clips for this story.</p></div><div class="video-grid">${cards}</div></section>`;
};

const PRESET_MAP = TEMPLATE_PRESETS.reduce((accumulator, template) => {
  accumulator[template.id] = template;
  return accumulator;
}, {});

const VISIBLE_TEMPLATE_PRESETS = TEMPLATE_PRESETS.filter((template) => CURATED_TEMPLATE_ID_SET.has(template.id));

const TEMPLATE_SELECTION_POOL = CURATED_TEMPLATE_IDS.filter(
  (templateId) => templateId !== CUSTOM_TEMPLATE_ID && Boolean(PRESET_MAP[templateId])
);

const CATEGORY_KEYWORDS = {
  business: ['business', 'finance', 'economy', 'market', 'startup', 'stock', 'trade', 'policy'],
  fashion: ['fashion', 'style', 'beauty', 'lifestyle', 'design', 'trend', 'culture'],
  technology: ['technology', 'tech', 'ai', 'software', 'digital', 'science', 'innovation'],
  travel: ['travel', 'tourism', 'destination', 'journey', 'culture', 'heritage'],
  politics: ['politics', 'election', 'government', 'policy', 'civic', 'public'],
  breaking: ['breaking', 'urgent', 'alert', 'exclusive', 'crisis', 'report'],
  minimal: ['opinion', 'essay', 'notes', 'journal', 'letter', 'analysis']
};

const TEMPLATE_CATEGORY_AFFINITY = {
  'city-gazette': ['politics', 'business', 'breaking'],
  'daily-chronicle': ['politics', 'breaking', 'business'],
  'vintage-press': ['breaking', 'politics', 'culture'],
  'business-pulse': ['business', 'technology'],
  'marble-times': ['business', 'politics'],
  'minimal-brief': ['minimal', 'technology'],
  'science-ledger': ['technology', 'business'],
  'copper-review': ['fashion', 'culture'],
  'heritage-broadsheet': ['politics', 'culture', 'travel'],
  'modern-feature': ['technology', 'fashion', 'culture'],
  'canvas-weekend': ['fashion', 'lifestyle', 'culture'],
  'editorial-zine': ['fashion', 'lifestyle', 'breaking'],
  'urban-notes': ['minimal', 'culture', 'lifestyle'],
  'paperlight-journal': ['minimal', 'travel', 'culture'],
  'travel-atlas': ['travel', 'culture'],
  'photo-chronicle': ['travel', 'fashion', 'lifestyle'],
  'noir-bulletin': ['breaking', 'technology', 'business']
};

const countMatches = (text, keywords) => {
  const lower = cleanText(text).toLowerCase();
  if (!lower || !Array.isArray(keywords) || !keywords.length) return 0;
  return keywords.reduce((count, keyword) => (lower.includes(keyword) ? count + 1 : count), 0);
};

const inferCategorySignals = (title, category, tags, metaDescription) => {
  const bag = [title, category, Array.isArray(tags) ? tags.join(' ') : tags, metaDescription].join(' ').toLowerCase();
  const signals = {};

  Object.entries(CATEGORY_KEYWORDS).forEach(([key, keywords]) => {
    signals[key] = countMatches(bag, keywords);
  });

  return signals;
};

const inferContentOrigin = (article) => {
  if (!article || typeof article !== 'object') return 'manual';

  const direct = cleanText(article.contentOrigin || article.sourceType || '').toLowerCase();
  if (direct === 'ai' || direct === 'manual') return direct;

  if (article.isAIGenerated || article.aiGenerated || article.generatedByAI) return 'ai';
  return 'manual';
};

const countMarkdownBlocks = (content) => {
  const lines = cleanText(content).split('\n').map((line) => line.trim());
  const headingCount = lines.filter((line) => /^#{1,3}\s+/.test(line)).length;
  const listCount = lines.filter((line) => /^([-*]\s+|\d+\.\s+)/.test(line)).length;
  const quoteCount = lines.filter((line) => /^>\s+/.test(line)).length;
  return { headingCount, listCount, quoteCount };
};

const initTemplateScores = (templateIds) =>
  templateIds.map((templateId) => ({
    templateId,
    score: 0,
    reasons: []
  }));

const bumpTemplateScore = (scoreMap, templateId, points, reason) => {
  const target = scoreMap.find((entry) => entry.templateId === templateId);
  if (!target) return;
  target.score += points;
  if (reason) {
    target.reasons.push({ points, reason });
  }
};

export const recommendArticleTemplate = (article = {}, options = {}) => {
  const normalized = normalizeArticleTemplateData(article);
  const templateIds = Array.isArray(options.templateIds) && options.templateIds.length
    ? options.templateIds.filter((templateId) => templateId !== CUSTOM_TEMPLATE_ID && Boolean(PRESET_MAP[templateId]))
    : TEMPLATE_SELECTION_POOL;

  if (!templateIds.length) {
    return {
      templateId: DEFAULT_TEMPLATE_ID,
      templateName: PRESET_MAP[DEFAULT_TEMPLATE_ID]?.name || 'City Gazette',
      confidence: 0.4,
      reason: 'Default editorial layout selected.',
      topCandidates: [],
      signals: {}
    };
  }

  const scoreMap = initTemplateScores(templateIds);
  const contentLower = normalized.content.toLowerCase();
  const titleLower = normalized.title.toLowerCase();
  const imageCount = (normalized.coverImage ? 1 : 0) + normalized.galleryImages.length;
  const videoCount = normalized.videoUrls.length;
  const paragraphCount = normalized.paragraphs.length;
  const readingMinutes = normalized.readingMinutes;
  const origin = inferContentOrigin(article);
  const { headingCount, listCount } = countMarkdownBlocks(normalized.content);
  const categorySignals = inferCategorySignals(
    normalized.title,
    normalized.category,
    normalized.tags,
    normalized.metaDescription
  );

  templateIds.forEach((templateId) => {
    bumpTemplateScore(scoreMap, templateId, 2, 'Baseline editorial fit');

    const affinity = TEMPLATE_CATEGORY_AFFINITY[templateId] || [];
    affinity.forEach((key) => {
      const signal = categorySignals[key] || 0;
      if (signal > 0) {
        bumpTemplateScore(scoreMap, templateId, Math.min(6, signal * 2), `Matches ${key} context`);
      }
    });
  });

  if (imageCount >= 3) {
    ['photo-chronicle', 'travel-atlas', 'canvas-weekend', 'modern-feature', 'copper-review'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 6, 'Strong visual coverage (multiple images)')
    );
  } else if (imageCount === 2) {
    ['modern-feature', 'copper-review', 'urban-notes', 'editorial-zine'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 4, 'Balanced image storytelling')
    );
  } else if (imageCount <= 1) {
    ['minimal-brief', 'paperlight-journal', 'city-gazette', 'daily-chronicle', 'marble-times'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 4, 'Text-forward article structure')
    );
  }

  if (videoCount >= 2) {
    ['science-ledger', 'business-pulse', 'noir-bulletin'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 5, 'Video-rich article supports briefing layouts')
    );
  } else if (videoCount === 1) {
    ['science-ledger', 'business-pulse', 'modern-feature'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 3, 'Includes companion video context')
    );
  }

  if (readingMinutes >= 9 || paragraphCount >= 16) {
    ['paperlight-journal', 'travel-atlas', 'city-gazette', 'daily-chronicle', 'heritage-broadsheet'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 5, 'Long-form content depth')
    );
  } else if (readingMinutes <= 3 || paragraphCount <= 5) {
    ['editorial-zine', 'modern-feature', 'minimal-brief', 'canvas-weekend'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 4, 'Compact article length')
    );
  }

  if (headingCount + listCount >= 5) {
    ['business-pulse', 'science-ledger', 'marble-times', 'city-gazette'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 4, 'Structured content with sections/lists')
    );
  }

  if (origin === 'ai') {
    ['science-ledger', 'business-pulse', 'modern-feature', 'minimal-brief'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 2, 'AI-generated content benefits from clean structure')
    );
  } else {
    ['paperlight-journal', 'urban-notes', 'copper-review'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 2, 'Human-written narrative style')
    );
  }

  if (countMatches(titleLower, CATEGORY_KEYWORDS.breaking) > 0 || countMatches(contentLower, CATEGORY_KEYWORDS.breaking) > 1) {
    ['noir-bulletin', 'vintage-press', 'daily-chronicle', 'city-gazette'].forEach((templateId) =>
      bumpTemplateScore(scoreMap, templateId, 5, 'Breaking-news tone detected')
    );
  }

  scoreMap.sort((left, right) => right.score - left.score || left.templateId.localeCompare(right.templateId));
  const top = scoreMap[0];
  const runnerUp = scoreMap[1];
  const bestTemplate = PRESET_MAP[top.templateId] || PRESET_MAP[DEFAULT_TEMPLATE_ID];
  const topReasons = (top.reasons || [])
    .sort((left, right) => right.points - left.points)
    .slice(0, 3)
    .map((entry) => entry.reason);

  const confidenceDelta = Math.max(0, top.score - (runnerUp?.score || 0));
  const confidence = Number(
    Math.min(0.96, Math.max(0.35, top.score / 40 + confidenceDelta / 18)).toFixed(2)
  );

  return {
    templateId: bestTemplate?.id || DEFAULT_TEMPLATE_ID,
    templateName: bestTemplate?.name || PRESET_MAP[DEFAULT_TEMPLATE_ID]?.name || 'City Gazette',
    confidence,
    reason: topReasons.join(' | ') || 'Balanced editorial fit',
    topCandidates: scoreMap.slice(0, 3).map((entry) => ({
      templateId: entry.templateId,
      templateName: PRESET_MAP[entry.templateId]?.name || entry.templateId,
      score: entry.score,
      reason: (entry.reasons || [])
        .sort((left, right) => right.points - left.points)
        .slice(0, 1)
        .map((item) => item.reason)[0] || 'General fit'
    })),
    signals: {
      imageCount,
      videoCount,
      paragraphCount,
      readingMinutes,
      headingCount,
      listCount,
      origin,
      categorySignals
    }
  };
};

const resolveTemplatePreset = (templateId) => {
  const requestedTemplateId = cleanText(templateId, DEFAULT_TEMPLATE_ID);
  if (requestedTemplateId !== CUSTOM_TEMPLATE_ID) {
    return PRESET_MAP[DEFAULT_TEMPLATE_ID];
  }
  return PRESET_MAP[CUSTOM_TEMPLATE_ID] || PRESET_MAP[DEFAULT_TEMPLATE_ID];
};

const runtimeTemplate = (templateId, customTemplate, runtimeOptions = null) => {
  const preset = resolveTemplatePreset(templateId);

  if (preset.id !== CUSTOM_TEMPLATE_ID) {
    const font = FONT_MAP[preset.font] || FONT_MAP.heritage;
    return {
      ...preset,
      runtimeName: preset.name,
      resolvedLayout: cleanEnum(preset.layout, TEMPLATE_LAYOUT_OPTIONS.map((item) => item.id), 'split'),
      style: preset.style || LAYOUT_TO_STYLE[preset.layout] || 'split',
      titleFont: font.title,
      bodyFont: font.body,
      showDropCap: true,
      showProgress: true,
      palette: normalizePresetPalette(preset.palette)
    };
  }

  const custom = normalizeCustomTemplate(customTemplate);
  const headline = FONT_MAP[custom.headlineFont] || FONT_MAP.heritage;
  const body = FONT_MAP[custom.bodyFont] || FONT_MAP.modern;
  const runtimeStudios = normalizeCustomStudios(custom.studios, createDefaultCustomStudios());
  const forcedRuntimeDevice = cleanEnum(
    cleanText(runtimeOptions?.runtimeStudioDevice, ''),
    ['desktop', 'tablet', 'mobile'],
    ''
  );
  const runtimeDevice = forcedRuntimeDevice || resolveRuntimeStudioDevice(runtimeStudios);
  const runtimeStudio = runtimeStudios[runtimeDevice] || runtimeStudios.desktop || custom.studio;

  return {
    ...preset,
    runtimeName: custom.name || preset.name,
    resolvedLayout: custom.layout,
    style: 'custom-canvas',
    titleFont: headline.title,
    bodyFont: body.body,
    showDropCap: custom.showDropCap,
    showProgress: custom.showProgress,
    paginationMode: custom.paginationMode,
    manualPageCount: custom.manualPageCount,
    studio: runtimeStudio,
    studios: runtimeStudios,
    runtimeStudioDevice: runtimeDevice,
    palette: normalizePresetPalette({
      bg: custom.backgroundStart,
      bgAlt: custom.backgroundEnd,
      surface: custom.surfaceColor,
      surfaceMuted: custom.surfaceColor,
      text: custom.textColor,
      muted: custom.mutedColor,
      accent: custom.accentColor,
      accentSoft: custom.accentSoftColor,
      border: custom.borderColor,
      ink: custom.textColor
    })
  };
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown Date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const renderTagPills = (tags) => {
  if (!tags.length) return '<p class="tag-empty">Add topic tags to improve discovery.</p>';
  return tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('');
};

const renderCover = (article, className = '') => {
  if (article.coverImage) {
    return `<figure class="cover frame-card reveal ${className}"><img src="${escapeHtml(article.coverImage)}" alt="Article cover" loading="lazy" /><figcaption>${escapeHtml(article.category)} | Visual Brief</figcaption></figure>`;
  }

  return `<div class="cover-fallback frame-card reveal ${className}"><p>Cover image not provided</p></div>`;
};

const renderMetaPanel = (article) => `
  <section class="panel reveal">
    <h3>Story Info</h3>
    <ul class="meta-list">
      <li><span>Author</span><strong>${escapeHtml(article.authorName)}</strong></li>
      <li><span>Published</span><strong>${escapeHtml(formatDate(article.createdAt))}</strong></li>
      <li><span>Reading Time</span><strong>${article.readingMinutes} min</strong></li>
      <li><span>Category</span><strong>${escapeHtml(article.category)}</strong></li>
    </ul>
  </section>
`;

const renderHighlightsPanel = (article) => {
  if (!article.highlights.length) return '';

  return `
    <section class="panel reveal">
      <h3>Highlights</h3>
      <ul class="point-list">
        ${article.highlights.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
    </section>
  `;
};

const renderTagsPanel = (article) => `
  <section class="panel reveal">
    <h3>Tags</h3>
    <div class="tag-wrap">${renderTagPills(article.tags)}</div>
  </section>
`;

const renderHeroMeta = (article, template) => `
  <div class="meta-row">
    <span>${escapeHtml(template.runtimeName)}</span>
    <span class="dot">|</span>
    <span>By ${escapeHtml(article.authorName)}</span>
    <span class="dot">|</span>
    <span>${escapeHtml(formatDate(article.createdAt))}</span>
    <span class="dot">|</span>
    <span>${article.readingMinutes} min read</span>
  </div>
`;

const buildReaderSummary = (article) => {
  const pool = [];

  if (cleanText(article.metaDescription)) {
    pool.push(cleanText(article.metaDescription));
  }

  (article.highlights || []).forEach((item) => {
    const line = cleanText(item);
    if (line) pool.push(line);
  });

  (article.paragraphs || []).slice(0, 8).forEach((paragraph) => {
    const line = cleanText(paragraph);
    if (line.length >= 36) pool.push(line);
  });

  const unique = [];
  const seen = new Set();

  pool.forEach((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(line);
  });

  return unique.slice(0, 6);
};

const renderReaderExperience = (article, contentHtml, storyClass = '') => {
  const summaryLines = buildReaderSummary(article);

  return `
    <section class="reader-shell frame-card" id="reader-shell">
      <div class="reader-toolbar">
        <div class="reader-toolbar-main">
          <button type="button" class="reader-btn" id="reader-play-btn">Play</button>
          <button type="button" class="reader-btn" id="reader-mute-btn">Mute</button>
          <label class="reader-volume-wrap" for="reader-volume">
            Volume
            <input id="reader-volume" type="range" min="0" max="1" step="0.01" value="1" />
          </label>
        </div>
        <button type="button" class="reader-btn reader-btn-primary" id="reader-summary-btn">Summary</button>
      </div>
      <p class="reader-status" id="reader-status">Reading full article</p>
      <div class="reader-content" id="reader-content">
        <article class="story ${storyClass}" id="reader-story">${contentHtml}</article>
        <nav class="story-pagination-nav" id="story-pagination-nav" aria-label="Article page navigation" hidden>
          <button type="button" class="story-page-btn" id="story-page-prev" aria-label="Previous page" aria-controls="reader-story">
            <span class="story-page-btn-icon story-page-btn-icon-left" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" role="presentation">
                <path d="M8.3685 12L13.1162 3.03212L14.8838 3.9679L10.6315 12L14.8838 20.0321L13.1162 20.9679L8.3685 12Z" fill="currentColor"></path>
              </svg>
            </span>
          </button>
          <span class="story-pagination-status" id="story-page-status" role="status" aria-live="polite">1 / 1</span>
          <button type="button" class="story-page-btn" id="story-page-next" aria-label="Next page" aria-controls="reader-story">
            <span class="story-page-btn-icon story-page-btn-icon-right" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" role="presentation">
                <path d="M15.6315 12L10.8838 3.03212L9.11622 3.9679L13.3685 12L9.11622 20.0321L10.8838 20.9679L15.6315 12Z" fill="currentColor"></path>
              </svg>
            </span>
          </button>
        </nav>
        <section class="reader-summary" id="reader-summary" aria-hidden="true">
          <h3>Story Summary</h3>
          ${
            summaryLines.length
              ? summaryLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')
              : `<p>${escapeHtml(article.metaDescription || 'Summary will appear here once content is available.')}</p>`
          }
        </section>
      </div>
    </section>
  `;
};

const renderSplitLayout = (article, template, contentHtml) => `
  <header class="hero frame-card reveal">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  ${renderCover(article)}
  <div class="layout-grid split-grid">
    ${renderReaderExperience(article, contentHtml)}
    <aside class="rail">
      ${renderMetaPanel(article)}
      ${renderHighlightsPanel(article)}
      ${renderTagsPanel(article)}
    </aside>
  </div>
`;

const renderColumnLayout = (article, template, contentHtml) => `
  <header class="hero frame-card reveal hero-centered">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <div class="column-stack">
    ${renderCover(article, 'column-cover')}
    ${renderReaderExperience(article, contentHtml)}
    <section class="pull-quote frame-card reveal">
      <p>"${escapeHtml(article.highlights[0] || article.metaDescription)}"</p>
    </section>
    <section class="tag-band frame-card reveal">
      <h3>Filed Under</h3>
      <div class="tag-wrap">${renderTagPills(article.tags)}</div>
    </section>
  </div>
`;

const renderSpotlightLayout = (article, template, contentHtml) => `
  <section class="spotlight frame-card reveal">
    <div class="spotlight-media" data-parallax>
      ${
        article.coverImage
          ? `<img src="${escapeHtml(article.coverImage)}" alt="Article cover" loading="lazy" />`
          : '<div class="spotlight-placeholder">No Cover Image</div>'
      }
      <div class="spotlight-overlay"></div>
    </div>
    <div class="spotlight-copy">
      <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
      <h1 class="headline">${escapeHtml(article.title)}</h1>
      <p class="deck">${escapeHtml(article.metaDescription)}</p>
      ${renderHeroMeta(article, template)}
    </div>
  </section>
  <div class="layout-grid spotlight-grid">
    ${renderReaderExperience(article, contentHtml)}
    <aside class="rail">
      ${renderMetaPanel(article)}
      ${renderHighlightsPanel(article)}
      ${renderTagsPanel(article)}
    </aside>
  </div>
`;

const renderImmersiveLayout = (article, template, contentHtml) => `
  <header class="hero frame-card reveal immersive-head">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <div class="immersive-strip">
    <section class="panel reveal quote-panel">
      <h3>Editor Note</h3>
      <p>"${escapeHtml(article.highlights[0] || article.metaDescription)}"</p>
    </section>
    ${renderCover(article, 'immersive-cover')}
  </div>
  ${renderReaderExperience(article, contentHtml)}
  ${
    article.highlights.length
      ? `<section class="highlight-band frame-card reveal"><h3>Key Moments</h3><div class="highlight-grid">${article.highlights
          .map((point) => `<p>${escapeHtml(point)}</p>`)
          .join('')}</div></section>`
      : ''
  }
  <section class="tag-band frame-card reveal">
    <h3>Topic Threads</h3>
    <div class="tag-wrap">${renderTagPills(article.tags)}</div>
  </section>
`;

const renderNewspaperLayout = (article, template, contentHtml) => `
  <header class="newspaper-head frame-card reveal">
    <div class="newspaper-top">
      <p>${escapeHtml(template.badge)}</p>
      <p>${escapeHtml(formatDate(article.createdAt))}</p>
    </div>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  ${renderCover(article, 'news-cover')}
  <div class="layout-grid newspaper-grid">
    ${renderReaderExperience(article, contentHtml, 'newspaper-story')}
    <aside class="rail">
      ${renderMetaPanel(article)}
      ${renderHighlightsPanel(article)}
      ${renderTagsPanel(article)}
    </aside>
  </div>
`;

const renderNotebookLayout = (article, template, contentHtml) => `
  <header class="hero frame-card reveal notebook-hero">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <div class="layout-grid notebook-grid">
    ${renderReaderExperience(article, contentHtml, 'notebook-page')}
    <aside class="rail notebook-rail">
      <section class="note-card panel reveal">
        <h3>Observation</h3>
        <p>${escapeHtml(article.highlights[0] || article.metaDescription)}</p>
      </section>
      <section class="note-card panel reveal">
        <h3>In Dialogue</h3>
        <p>${escapeHtml(article.highlights[1] || article.paragraphs[0] || 'Invite your readers to discuss this article.')}</p>
      </section>
      ${renderTagsPanel(article)}
    </aside>
  </div>
  ${renderCover(article, 'notebook-cover')}
`;

const renderBriefingLayout = (article, template, contentHtml) => `
  <header class="briefing-head frame-card reveal">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <div class="layout-grid briefing-grid">
    ${renderReaderExperience(article, contentHtml)}
    <aside class="rail briefing-rail">
      <section class="panel reveal">
        <h3>At A Glance</h3>
        <ul class="point-list">
          ${article.highlights.slice(0, 4).map((point) => `<li>${escapeHtml(point)}</li>`).join('') || '<li>No highlights yet.</li>'}
        </ul>
      </section>
      ${renderMetaPanel(article)}
      ${renderTagsPanel(article)}
    </aside>
  </div>
  ${renderCover(article, 'briefing-cover')}
`;

const renderLedgerGridLayout = (article, template, contentHtml) => `
  <header class="ledger-mast frame-card reveal">
    <div class="ledger-top">
      <p>${escapeHtml(template.badge)}</p>
      <p>${escapeHtml(formatDate(article.createdAt))}</p>
    </div>
    <h1 class="ledger-title">${escapeHtml(article.title)}</h1>
    <p class="ledger-deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <section class="ledger-brief-strip">
    <article class="ledger-brief-card frame-card reveal">
      <h3>Lead Focus</h3>
      <p>${escapeHtml(article.highlights[0] || article.metaDescription)}</p>
    </article>
    <article class="ledger-brief-card frame-card reveal">
      <h3>Reporter</h3>
      <p>${escapeHtml(article.authorName)}</p>
    </article>
    <article class="ledger-brief-card frame-card reveal">
      <h3>Reading Time</h3>
      <p>${article.readingMinutes} min read</p>
    </article>
  </section>
  ${renderCover(article, 'ledger-cover')}
  <div class="layout-grid ledger-structure">
    ${renderReaderExperience(article, contentHtml, 'ledger-story newspaper-story')}
    <aside class="rail ledger-rail">
      ${renderMetaPanel(article)}
      ${renderHighlightsPanel(article)}
      ${renderTagsPanel(article)}
    </aside>
  </div>
`;

const renderDataBoardLayout = (article, template, contentHtml) => `
  <header class="board-mast frame-card reveal">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <section class="board-kpis">
    <article class="board-kpi frame-card reveal">
      <h3>Read Time</h3>
      <p>${article.readingMinutes} min</p>
    </article>
    <article class="board-kpi frame-card reveal">
      <h3>Category</h3>
      <p>${escapeHtml(article.category)}</p>
    </article>
    <article class="board-kpi frame-card reveal">
      <h3>Published</h3>
      <p>${escapeHtml(formatDate(article.createdAt))}</p>
    </article>
    <article class="board-kpi frame-card reveal">
      <h3>Highlights</h3>
      <p>${Math.max(article.highlights.length, 1)} key points</p>
    </article>
  </section>
  <div class="layout-grid board-structure">
    ${renderReaderExperience(article, contentHtml, 'board-story')}
    <aside class="rail board-rail">
      <section class="panel reveal board-panel">
        <h3>Key Signals</h3>
        <ul class="point-list">
          ${article.highlights.slice(0, 4).map((point) => `<li>${escapeHtml(point)}</li>`).join('') || '<li>No highlights yet.</li>'}
        </ul>
      </section>
      ${renderMetaPanel(article)}
      ${renderTagsPanel(article)}
    </aside>
  </div>
  ${renderCover(article, 'board-cover')}
`;

const renderFeatureMosaicLayout = (article, template, contentHtml) => `
  <section class="mosaic-hero frame-card reveal">
    <div class="mosaic-media" data-parallax>
      ${
        article.coverImage
          ? `<img src="${escapeHtml(article.coverImage)}" alt="Article cover" loading="lazy" />`
          : '<div class="spotlight-placeholder">No Cover Image</div>'
      }
      <div class="spotlight-overlay"></div>
    </div>
    <div class="mosaic-copy">
      <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
      <h1 class="headline">${escapeHtml(article.title)}</h1>
      <p class="deck">${escapeHtml(article.metaDescription)}</p>
      ${renderHeroMeta(article, template)}
      <div class="mosaic-chip-wrap">${renderTagPills(article.tags.slice(0, 6))}</div>
    </div>
  </section>
  <div class="layout-grid mosaic-structure">
    ${renderReaderExperience(article, contentHtml, 'mosaic-story')}
    <aside class="rail mosaic-rail">
      <section class="panel reveal mosaic-quote">
        <h3>Pull Quote</h3>
        <p>"${escapeHtml(article.highlights[0] || article.metaDescription)}"</p>
      </section>
      ${renderMetaPanel(article)}
      ${renderHighlightsPanel(article)}
    </aside>
  </div>
`;

const renderVisualJourneyLayout = (article, template, contentHtml) => `
  <header class="journey-head frame-card reveal">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <section class="journey-lead-grid">
    ${renderCover(article, 'journey-cover')}
    <article class="journey-note frame-card reveal">
      <h3>Scene Setter</h3>
      <p>${escapeHtml(article.highlights[0] || article.metaDescription)}</p>
      <ul class="point-list">
        ${article.highlights.slice(1, 4).map((point) => `<li>${escapeHtml(point)}</li>`).join('') || '<li>Develop this story with key context and supporting evidence.</li>'}
      </ul>
    </article>
  </section>
  ${renderReaderExperience(article, contentHtml, 'journey-story')}
  <section class="journey-meta-grid">
    ${renderMetaPanel(article)}
    ${renderHighlightsPanel(article)}
    ${renderTagsPanel(article)}
  </section>
`;

const renderMonoColumnLayout = (article, template, contentHtml) => `
  <header class="mono-mast frame-card reveal hero-centered">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <div class="mono-reader-wrap">
    ${renderReaderExperience(article, contentHtml, 'mono-story')}
  </div>
  <section class="mono-footer-grid">
    <article class="mono-foot-card frame-card reveal">
      <h3>Quick Summary</h3>
      <p>${escapeHtml(article.highlights[0] || article.metaDescription)}</p>
    </article>
    <article class="mono-foot-card frame-card reveal">
      <h3>Filed Under</h3>
      <div class="tag-wrap">${renderTagPills(article.tags)}</div>
    </article>
    <article class="mono-foot-card frame-card reveal">
      <h3>Byline</h3>
      <p>By ${escapeHtml(article.authorName)} | ${escapeHtml(formatDate(article.createdAt))}</p>
    </article>
  </section>
`;

const renderZineBoardLayout = (article, template, contentHtml) => `
  <header class="zine-mast frame-card reveal">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="zine-title">${escapeHtml(article.title)}</h1>
    <p class="zine-deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <section class="zine-cards">
    ${renderCover(article, 'zine-cover')}
    <article class="zine-card frame-card reveal">
      <h3>Key Beats</h3>
      <ul class="point-list">
        ${article.highlights.slice(0, 4).map((point) => `<li>${escapeHtml(point)}</li>`).join('') || '<li>No highlights yet.</li>'}
      </ul>
    </article>
    <article class="zine-card frame-card reveal">
      <h3>Category Focus</h3>
      <p>${escapeHtml(article.category)}</p>
      <p>Curated by ${escapeHtml(article.authorName)}</p>
      <div class="tag-wrap">${renderTagPills(article.tags.slice(0, 6))}</div>
    </article>
  </section>
  ${renderReaderExperience(article, contentHtml, 'zine-story')}
`;

const renderJournalCardsLayout = (article, template, contentHtml) => `
  <header class="journal-mast frame-card reveal notebook-hero">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="headline">${escapeHtml(article.title)}</h1>
    <p class="deck">${escapeHtml(article.metaDescription)}</p>
    ${renderHeroMeta(article, template)}
  </header>
  <div class="layout-grid journal-structure">
    <section class="journal-main">
      ${renderReaderExperience(article, contentHtml, 'journal-story notebook-page')}
      ${renderCover(article, 'journal-cover')}
    </section>
    <aside class="rail journal-rail">
      <section class="journal-note frame-card reveal">
        <h3>Observation</h3>
        <p>${escapeHtml(article.highlights[0] || article.metaDescription)}</p>
      </section>
      <section class="journal-note frame-card reveal">
        <h3>In Dialogue</h3>
        <p>${escapeHtml(article.highlights[1] || article.paragraphs[0] || 'Invite your readers to discuss this article.')}</p>
      </section>
      ${renderTagsPanel(article)}
    </aside>
  </div>
`;

const renderNoirWireLayout = (article, template, contentHtml) => `
  <header class="wire-mast frame-card reveal">
    <p class="eyebrow">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
    <h1 class="wire-title">${escapeHtml(article.title)}</h1>
    <p class="wire-deck">${escapeHtml(article.metaDescription)}</p>
    <div class="wire-chip-row">
      <span>${escapeHtml(article.category)}</span>
      <span>${article.readingMinutes} min read</span>
      <span>${escapeHtml(formatDate(article.createdAt))}</span>
    </div>
  </header>
  <div class="layout-grid wire-structure">
    ${renderReaderExperience(article, contentHtml, 'wire-story')}
    <aside class="rail wire-rail">
      <section class="panel reveal wire-panel">
        <h3>Signal Lines</h3>
        <ul class="point-list">
          ${article.highlights.slice(0, 5).map((point) => `<li>${escapeHtml(point)}</li>`).join('') || '<li>No highlights yet.</li>'}
        </ul>
      </section>
      ${renderMetaPanel(article)}
      ${renderTagsPanel(article)}
    </aside>
  </div>
  ${renderCover(article, 'wire-cover')}
`;

const renderCustomStudioMeta = (article, template) => `
  <ul class="custom-studio-meta">
    <li><span>Desk</span><strong>${escapeHtml(template.badge)}</strong></li>
    <li><span>Author</span><strong>${escapeHtml(article.authorName)}</strong></li>
    <li><span>Published</span><strong>${escapeHtml(formatDate(article.createdAt))}</strong></li>
    <li><span>Read Time</span><strong>${article.readingMinutes} min</strong></li>
    <li><span>Category</span><strong>${escapeHtml(article.category)}</strong></li>
  </ul>
`;

const renderCustomStudioHighlights = (article) => `
  <div class="custom-studio-list-wrap">
    <h3>Highlights</h3>
    <ul class="custom-studio-list">
      ${
        article.highlights.length
          ? article.highlights.slice(0, 8).map((point) => `<li>${escapeHtml(point)}</li>`).join('')
          : '<li>No highlights generated yet.</li>'
      }
    </ul>
  </div>
`;

const renderCustomStudioTags = (article) => `
  <div class="custom-studio-tags-wrap">
    <h3>Tags</h3>
    <div class="tag-wrap">${renderTagPills(article.tags)}</div>
  </div>
`;

const renderCustomStudioQuote = (article) => `
  <blockquote class="custom-studio-quote">
    <p>${escapeHtml(article.highlights[0] || article.metaDescription || 'Every story deserves a signature layout.')}</p>
    <cite>${escapeHtml(article.authorName)}</cite>
  </blockquote>
`;

const buildCustomMediaCaption = (article, block) => {
  const captionStyle = cleanEnum(
    cleanText(block?.captionStyle, 'strip'),
    CUSTOM_STUDIO_CAPTION_STYLE_OPTIONS.map((item) => item.id),
    'strip'
  );
  if (captionStyle === 'hidden') return '';
  const captionText = cleanText(block?.captionText, '').slice(0, 200);
  const articleDeck = cleanText(article?.metaDescription, '').slice(0, 200);
  const articleTitle = cleanText(article?.title, '').slice(0, 200);
  const articleHighlight = cleanText(
    Array.isArray(article?.highlights) ? article.highlights[0] : '',
    ''
  ).slice(0, 200);
  const toComparableCaptionText = (value) =>
    cleanText(value, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const captionComparable = toComparableCaptionText(captionText);
  const deckComparable = toComparableCaptionText(articleDeck);
  const titleComparable = toComparableCaptionText(articleTitle);
  const highlightComparable = toComparableCaptionText(articleHighlight);
  const isComparableDuplicate = (left, right) =>
    left
    && right
    && (
      left === right
      || (left.length > 24 && left.includes(right))
      || (right.length > 24 && right.includes(left))
    );
  const isDuplicateCaption =
    captionComparable
    && (
      isComparableDuplicate(captionComparable, deckComparable)
      || isComparableDuplicate(captionComparable, titleComparable)
      || isComparableDuplicate(captionComparable, highlightComparable)
    );
  if (isDuplicateCaption) {
    return '';
  }
  if (!captionText) return '';
  return `<figcaption class="custom-studio-caption custom-studio-caption-${captionStyle}">${escapeHtml(captionText)}</figcaption>`;
};

const renderCustomStudioImage = (article, block) => {
  const imageSource = cleanText(article.coverImage, article.galleryImages[0] || '');
  const imageFit = cleanEnum(
    cleanText(block?.imageFit, 'cover'),
    CUSTOM_STUDIO_IMAGE_FIT_OPTIONS.map((item) => item.id),
    'cover'
  );
  const focalX = clampInt(block?.focalX, 0, 100, 50);
  const focalY = clampInt(block?.focalY, 0, 100, 50);

  if (imageSource) {
    return `
      <figure class="custom-studio-image">
        <img
          src="${escapeHtml(imageSource)}"
          alt="Article visual"
          loading="lazy"
          style="object-fit:${imageFit};object-position:${focalX}% ${focalY}%;"
        />
        ${buildCustomMediaCaption(article, block)}
      </figure>
    `;
  }
  return '<div class="custom-studio-image-fallback"><p>Cover image not provided</p></div>';
};

const collectGallerySources = (article) =>
  [article.coverImage, ...(article.galleryImages || [])]
    .map((item) => cleanText(item))
    .filter((item, index, list) => item && list.indexOf(item) === index);

const renderCustomStudioGallery = (article, block) => {
  const gallery = collectGallerySources(article).slice(0, 6);
  const imageFit = cleanEnum(
    cleanText(block?.imageFit, 'cover'),
    CUSTOM_STUDIO_IMAGE_FIT_OPTIONS.map((item) => item.id),
    'cover'
  );
  const focalX = clampInt(block?.focalX, 0, 100, 50);
  const focalY = clampInt(block?.focalY, 0, 100, 50);

  if (!gallery.length) {
    return '<div class="custom-studio-image-fallback"><p>Add gallery images for strip mode</p></div>';
  }

  return `
    <figure class="custom-studio-gallery">
      <div class="custom-studio-gallery-track">
        ${gallery
          .map(
            (src, index) => `
              <img
                src="${escapeHtml(src)}"
                alt="Gallery visual ${index + 1}"
                loading="lazy"
                style="object-fit:${imageFit};object-position:${focalX}% ${focalY}%;"
              />`
          )
          .join('')}
      </div>
      ${buildCustomMediaCaption(article, block)}
    </figure>
  `;
};

const renderCustomStudioCollage = (article, block) => {
  const gallery = collectGallerySources(article).slice(0, 4);
  const imageFit = cleanEnum(
    cleanText(block?.imageFit, 'cover'),
    CUSTOM_STUDIO_IMAGE_FIT_OPTIONS.map((item) => item.id),
    'cover'
  );
  const focalX = clampInt(block?.focalX, 0, 100, 50);
  const focalY = clampInt(block?.focalY, 0, 100, 50);

  if (!gallery.length) {
    return '<div class="custom-studio-image-fallback"><p>Add images for collage mode</p></div>';
  }

  return `
    <figure class="custom-studio-collage">
      ${gallery
        .map(
          (src, index) => `
            <div class="custom-studio-collage-cell custom-studio-collage-cell-${index + 1}">
              <img
                src="${escapeHtml(src)}"
                alt="Collage visual ${index + 1}"
                loading="lazy"
                style="object-fit:${imageFit};object-position:${focalX}% ${focalY}%;"
              />
            </div>`
        )
        .join('')}
      ${buildCustomMediaCaption(article, block)}
    </figure>
  `;
};

const renderCustomStudioVideo = (article, block) => {
  if (!article.videoUrls.length) {
    return '<div class="custom-studio-video-fallback"><h3>Video Brief</h3><p>Add one or more video URLs to fill this section.</p></div>';
  }

  const layoutMode = cleanEnum(
    cleanText(block?.videoLayout, 'grid'),
    CUSTOM_STUDIO_VIDEO_LAYOUT_OPTIONS.map((item) => item.id),
    'grid'
  );
  const maxVideos = layoutMode === 'single' ? 1 : layoutMode === 'split' ? 2 : 4;
  const embeds = article.videoUrls
    .slice(0, maxVideos)
    .map((url) => {
      const embedded = embedUrl(url);
      if (embedded) {
        return `<div class="custom-studio-video-card"><iframe src="${escapeHtml(embedded)}" title="Embedded video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }
      return `<div class="custom-studio-video-card"><video controls preload="metadata"><source src="${escapeHtml(url)}" /></video></div>`;
    })
    .join('');

  return `<div class="custom-studio-video-grid layout-${layoutMode}">${embeds}</div>`;
};

const renderCustomStudioProductTagAnchor = (article, showPlaceholder = false) => {
  const productTags = normalizeProductTagsForTemplate(article);
  const { products, externalLinks, unresolvedCount, total } = productTags;

  if (!total) {
    return showPlaceholder
      ? '<div class="custom-product-tag-placeholder"><strong>Product Tag Anchor</strong><span>Tagged products will appear here.</span></div>'
      : '';
  }

  const firstProduct = products[0] || null;
  const firstExternal = externalLinks[0] || null;
  const firstImage =
    firstProduct?.transparentThumbnail
    || firstProduct?.thumbnail
    || firstExternal?.thumbnail
    || '';
  const summaryLabel = `${total} product${total === 1 ? '' : 's'}`;
  const productRows = products
    .map((product) => {
      const image = product.transparentThumbnail || product.thumbnail || '/image/lekhon_url.png';
      const price = productPriceLabel(product);
      return `
        <a class="custom-product-tag-row" href="${escapeHtml(productHref(product))}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(product.title || 'Tagged product')}" loading="lazy" />
          <span class="custom-product-tag-row-copy">
            <strong>${escapeHtml(product.title || 'Tagged product')}</strong>
            ${price ? `<span>${escapeHtml(price)}</span>` : ''}
          </span>
        </a>
      `;
    })
    .join('');
  const externalRows = externalLinks
    .map((link) => `
      <a class="custom-product-tag-row" href="${escapeHtml(safeExternalHref(link.url))}" target="_blank" rel="noopener noreferrer">
        ${
          link.thumbnail
            ? `<img src="${escapeHtml(link.thumbnail)}" alt="${escapeHtml(link.title || 'External product')}" loading="lazy" />`
            : '<span class="custom-product-tag-external-icon">Open</span>'
        }
        <span class="custom-product-tag-row-copy">
          <strong>${escapeHtml(link.title || 'External product')}</strong>
          <span>${escapeHtml(link.priceLabel || link.platform || 'External')}</span>
        </span>
      </a>
    `)
    .join('');
  const unresolvedRow = unresolvedCount > 0
    ? `<div class="custom-product-tag-row custom-product-tag-row-muted"><span class="custom-product-tag-external-icon">+</span><span class="custom-product-tag-row-copy"><strong>${unresolvedCount} linked product${unresolvedCount === 1 ? '' : 's'}</strong><span>Product details load after publishing.</span></span></div>`
    : '';

  return `
    <div class="custom-product-tag-anchor" aria-label="Tagged products">
      <details class="custom-product-tag-overlay">
        <summary class="custom-product-tag-summary">
          ${
            firstImage
              ? `<img class="custom-product-tag-image" src="${escapeHtml(firstImage)}" alt="${escapeHtml(firstProduct?.title || firstExternal?.title || 'Tagged product')}" loading="lazy" />`
              : ''
          }
          <span class="custom-product-tag-chip">${summaryLabel}</span>
        </summary>
        <div class="custom-product-tag-panel">
          ${productRows}
          ${externalRows}
          ${unresolvedRow}
        </div>
      </details>
    </div>
  `;
};

const splitContentIntoStudioSegments = (content, segmentCount) => {
  const normalizedCount = clampInt(segmentCount, 1, 8, 1);
  const raw = cleanText(content).replace(/\r\n/g, '\n').trim();
  if (!raw) {
    return Array.from({ length: normalizedCount }, (_, index) =>
      index === 0 ? 'Write your story to see this layout in action.' : ''
    );
  }

  const blocks = raw
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return Array.from({ length: normalizedCount }, (_, index) =>
      index === 0 ? raw : ''
    );
  }

  return Array.from({ length: normalizedCount }, (_, index) => {
    const from = Math.floor((index * blocks.length) / normalizedCount);
    const to = Math.floor(((index + 1) * blocks.length) / normalizedCount);
    const slice = blocks.slice(from, Math.max(to, from + 1));
    return slice.join('\n\n').trim();
  });
};

const renderCustomStudioStorySlice = (contentHtml, partIndex, partCount) => `
  <section class="reader-shell frame-card custom-studio-slice-shell">
    <p class="reader-status custom-studio-slice-status">
      ${partCount > 1 ? `Reading segment ${partIndex + 1} of ${partCount}` : 'Reading full article'}
    </p>
    <div class="reader-content custom-studio-slice-content">
      <article class="story custom-studio-story custom-studio-story-fragment">${contentHtml}</article>
    </div>
  </section>
`;

const renderCustomStudioContentByType = (block, article, template, contentHtml, runtime = {}) => {
  switch (block.type) {
    case 'title':
      return `
        <div class="custom-studio-title-wrap">
          <span class="custom-studio-article-logo" aria-hidden="true">
            <img class="custom-studio-article-logo-img custom-studio-article-logo-dark" src="/image/article_logo_dark.png" alt="" loading="lazy" />
            <img class="custom-studio-article-logo-img custom-studio-article-logo-light" src="/image/article_logo_light.png" alt="" loading="lazy" />
          </span>
          <p class="custom-studio-kicker">${escapeHtml(template.badge)} | ${escapeHtml(article.category)}</p>
          <h1 class="custom-studio-headline">${escapeHtml(article.title)}</h1>
          <p class="custom-studio-deck">${escapeHtml(article.metaDescription)}</p>
          ${renderHeroMeta(article, template)}
        </div>
      `;
    case 'meta':
      return renderCustomStudioMeta(article, template);
    case 'image':
      return renderCustomStudioImage(article, block);
    case 'gallery':
      return renderCustomStudioGallery(article, block);
    case 'collage':
      return renderCustomStudioCollage(article, block);
    case 'content': {
      const blockContentHtml = runtime.contentHtmlByBlockId?.[block.id] || contentHtml;
      const primaryContentBlockId = runtime.primaryContentBlockId || null;
      const isPrimaryContentBlock = !primaryContentBlockId || primaryContentBlockId === block.id;
      if (isPrimaryContentBlock) {
        return renderReaderExperience(article, blockContentHtml, 'custom-studio-story');
      }

      const partIndex = runtime.contentPartIndexByBlockId?.[block.id] || 0;
      const partCount = runtime.contentPartCount || 1;
      return renderCustomStudioStorySlice(blockContentHtml, partIndex, partCount);
    }
    case 'highlights':
      return renderCustomStudioHighlights(article);
    case 'tags':
      return renderCustomStudioTags(article);
    case 'product-tags':
      return renderCustomStudioProductTagAnchor(article, Boolean(runtime.showProductAnchorPlaceholder));
    case 'video':
      return renderCustomStudioVideo(article, block);
    case 'quote':
      return renderCustomStudioQuote(article);
    default:
      return `<div class="custom-studio-block-fallback"><p>${escapeHtml(article.metaDescription)}</p></div>`;
  }
};

const renderCustomCanvasLayout = (article, template, contentHtml) => {
  const runtimeDevice = cleanEnum(
    cleanText(template?.runtimeStudioDevice, 'desktop'),
    ['desktop', 'tablet', 'mobile'],
    'desktop'
  );
  const runtimeStudios = normalizeCustomStudios(
    template?.studios,
    createDefaultCustomStudios()
  );
  const normalizedTemplate = normalizeCustomTemplate({
    name: template.runtimeName,
    layout: template.resolvedLayout,
    headlineFont: 'heritage',
    bodyFont: 'modern',
    accentColor: template.palette.accent,
    accentSoftColor: template.palette.accentSoft,
    backgroundStart: template.palette.bg,
    backgroundEnd: template.palette.bgAlt,
    surfaceColor: template.palette.surface,
    textColor: template.palette.text,
    mutedColor: template.palette.muted,
    borderColor: template.palette.border,
    showDropCap: template.showDropCap,
    showProgress: template.showProgress,
    studios: runtimeStudios
  });

  const studio =
    normalizedTemplate?.studios?.[runtimeDevice]
    || template?.studio
    || normalizedTemplate.studio
    || createDefaultCustomStudio();
  const columnCount = clampInt(
    studio.columns,
    CUSTOM_STUDIO_MIN_COLUMNS,
    CUSTOM_STUDIO_MAX_COLUMNS,
    CUSTOM_STUDIO_DEFAULT_COLUMNS
  );
  const rowCount = clampInt(studio.rows, CUSTOM_STUDIO_MIN_ROWS, CUSTOM_STUDIO_MAX_ROWS, CUSTOM_STUDIO_DEFAULT_ROWS);
  const rowHeight = clampInt(studio.rowHeight, 24, 54, CUSTOM_STUDIO_DEFAULT_ROW_HEIGHT);
  const showProductAnchorPlaceholder = Boolean(article.isTemplatePreview);
  const hasProductTags = Number(article.productTagCount || 0) > 0;
  const visibleBlocks = (studio.blocks || [])
    .filter((block) => {
      if (block.visible === false) return false;
      if (block.type !== 'product-tags') return true;
      return hasProductTags || showProductAnchorPlaceholder;
    })
    .sort((left, right) => left.rowStart - right.rowStart || left.colStart - right.colStart);

  const contentBlocks = visibleBlocks.filter((block) => block.type === 'content');
  const studioSegments = splitContentIntoStudioSegments(article.content, Math.max(contentBlocks.length, 1));
  const contentHtmlByBlockId = {};
  const contentPartIndexByBlockId = {};

  if (contentBlocks.length) {
    contentBlocks.forEach((block, index) => {
      const segmentRaw = studioSegments[index] || '';
      const segmentHtml = renderContent(segmentRaw, template.showDropCap && index === 0, [], {
        preferEarlyBreak: false,
        maxInlineMedia: 0
      });
      contentHtmlByBlockId[block.id] = segmentHtml;
      contentPartIndexByBlockId[block.id] = index;
    });
  }

  const blockHtml = visibleBlocks
    .map((block) => {
      const colStart = clampInt(block.colStart, 1, columnCount, 1);
      const maxSpan = columnCount - colStart + 1;
      const colSpan = clampInt(block.colSpan, 1, maxSpan, Math.min(4, maxSpan));
      const rowStart = clampInt(block.rowStart, 1, CUSTOM_STUDIO_MAX_ROWS, 1);
      const rowSpan = clampInt(block.rowSpan, 1, CUSTOM_STUDIO_MAX_ROWS, 4);

      const underlineClass = `underline-${block.underlineStyle || 'none'}`;
      const alignClass = `align-${block.textAlign || 'left'}`;
      const shellShadowLevel = clampInt(
        block.shellShadowLevel !== undefined ? block.shellShadowLevel : block.shadowLevel,
        0,
        3,
        0
      );
      const contentShadowLevel = clampInt(block.contentShadowLevel, 0, 3, 0);
      const shellShadowEnabled = block.shellShadowEnabled !== undefined ? Boolean(block.shellShadowEnabled) : shellShadowLevel > 0;
      const contentShadowEnabled = block.contentShadowEnabled !== undefined ? Boolean(block.contentShadowEnabled) : false;
      const shellShadow = shellShadowEnabled && shellShadowLevel > 0
        ? `0 ${4 + shellShadowLevel * 5}px ${12 + shellShadowLevel * 8}px rgba(15, 23, 42, ${(0.1 + shellShadowLevel * 0.08).toFixed(2)})`
        : 'none';
      const contentShadow = contentShadowEnabled && contentShadowLevel > 0
        ? `0 ${3 + contentShadowLevel * 4}px ${10 + contentShadowLevel * 7}px rgba(15, 23, 42, ${(0.08 + contentShadowLevel * 0.07).toFixed(2)})`
        : 'none';
      const shapePreset = isCustomStudioShapeEligibleTypeInternal(block.type)
        ? cleanEnum(cleanText(block.shapePreset, 'rect'), CUSTOM_STUDIO_SHAPE_PRESET_IDS, 'rect')
        : 'rect';
      const shapeClipPath = resolveCustomStudioShapeClipPath(
        shapePreset,
        block.shapeNotch,
        block.shapeOffset,
        block.shapeGridCols,
        block.shapeGridRows,
        block.shapeMaskCells
      );

      return `
        <section
          class="custom-studio-block custom-studio-type-${block.type} ${underlineClass} ${alignClass}"
          data-page-placement="${escapeHtml(cleanText(block.pagePlacement, 'all').toLowerCase())}"
          data-shape="${shapePreset}"
          style="
            grid-column: ${colStart} / span ${colSpan};
            grid-row: ${rowStart} / span ${rowSpan};
            z-index: ${clampInt(block.zIndex, 1, 120, 1)};
            --studio-block-shell-bg: ${block.shellBackgroundColor || block.backgroundColor};
            --studio-block-content-bg: ${block.contentBackgroundColor || block.backgroundColor};
            --studio-block-text: ${block.textColor};
            --studio-block-border: ${block.borderColor};
            --studio-block-border-width: ${block.borderEnabled === false ? 0 : block.borderWidth}px;
            --studio-block-border-style: ${block.borderStyle};
            --studio-block-radius: ${block.borderRadius}px;
            --studio-block-padding: ${block.padding}px;
            --studio-block-font-scale: ${block.fontScale};
            --studio-block-underline: ${block.underlineColor};
            --studio-shell-shadow: ${shellShadow};
            --studio-content-shadow: ${contentShadow};
            --studio-block-shape-clip: ${shapeClipPath};
          "
        >
          <div class="custom-studio-block-inner">
            ${renderCustomStudioContentByType(block, article, template, contentHtml, {
              contentHtmlByBlockId,
              primaryContentBlockId: contentBlocks[0]?.id || null,
              contentPartIndexByBlockId,
              contentPartCount: contentBlocks.length,
              showProductAnchorPlaceholder
            })}
          </div>
        </section>
      `;
    })
    .join('');

  return `
    <section class="custom-canvas-shell frame-card reveal custom-canvas-device-${runtimeDevice}">
      <div
        class="custom-canvas-page"
        data-runtime-device="${runtimeDevice}"
        style="--studio-grid-columns: ${columnCount}; --studio-grid-rows: ${rowCount}; --studio-row-height: ${rowHeight}px;"
      >
        ${blockHtml}
      </div>
    </section>
  `;
};

const renderTemplateLayout = (article, template, contentHtml) => {
  switch (template.style) {
    case 'custom-canvas':
      return renderCustomCanvasLayout(article, template, contentHtml);
    case 'ledger-grid':
      return renderLedgerGridLayout(article, template, contentHtml);
    case 'data-board':
      return renderDataBoardLayout(article, template, contentHtml);
    case 'feature-mosaic':
      return renderFeatureMosaicLayout(article, template, contentHtml);
    case 'visual-journey':
      return renderVisualJourneyLayout(article, template, contentHtml);
    case 'mono-column':
      return renderMonoColumnLayout(article, template, contentHtml);
    case 'zine-board':
      return renderZineBoardLayout(article, template, contentHtml);
    case 'journal-cards':
      return renderJournalCardsLayout(article, template, contentHtml);
    case 'noir-wire':
      return renderNoirWireLayout(article, template, contentHtml);
    case 'column':
      return renderColumnLayout(article, template, contentHtml);
    case 'spotlight':
      return renderSpotlightLayout(article, template, contentHtml);
    case 'immersive':
      return renderImmersiveLayout(article, template, contentHtml);
    case 'newspaper':
      return renderNewspaperLayout(article, template, contentHtml);
    case 'notebook':
      return renderNotebookLayout(article, template, contentHtml);
    case 'briefing':
      return renderBriefingLayout(article, template, contentHtml);
    case 'split':
    default:
      return renderSplitLayout(article, template, contentHtml);
  }
};

const renderTemplateHtml = (article, template) => {
  const inlineMediaPool =
    article.galleryImages.length
      ? article.galleryImages
      : article.isLongRead && article.coverImage
      ? [article.coverImage]
      : [];

  const contentHtml = renderContent(article.content, template.showDropCap, inlineMediaPool, {
    preferEarlyBreak: ['split', 'newspaper', 'notebook', 'briefing'].includes(template.style),
    maxInlineMedia: template.style === 'column' ? 2 : article.isLongRead ? 4 : 3
  });
  const longReadClass = article.isLongRead ? 'longread' : 'standard-read';
  const shouldPaginateStory =
    article.readingMinutes >= 8
    || article.paragraphs.length >= 14
    || article.galleryImages.length >= 3
    || article.videoUrls.length >= 2;
  const targetStoryPagesAuto =
    article.readingMinutes >= 14
    || article.paragraphs.length >= 24
    || article.galleryImages.length >= 5
    || article.videoUrls.length >= 3
      ? 3
      : shouldPaginateStory
      ? 2
      : 1;
  const paginationMode = cleanEnum(
    cleanText(template.paginationMode, 'auto').toLowerCase(),
    CUSTOM_TEMPLATE_PAGINATION_OPTIONS.map((option) => option.id),
    'auto'
  );
  const manualPageCount = clampInt(template.manualPageCount, 2, 6, 2);
  const paginationEnabled = paginationMode === 'off' ? false : paginationMode === 'manual' ? true : shouldPaginateStory;
  const targetStoryPages = paginationMode === 'manual' ? manualPageCount : targetStoryPagesAuto;
  const paginationConfig = {
    enabled: paginationEnabled,
    targetPages: targetStoryPages,
    hasRichMedia: article.galleryImages.length >= 3 || article.videoUrls.length >= 2,
    forceManual: paginationMode === 'manual'
  };
  const resolvedThemeMode = normalizeTemplateThemeMode(article.templateThemeMode, 'auto');
  const paletteModes = resolveThemePalettes(template.palette, template.id);
  const activePalette = resolvedThemeMode === 'dark' ? paletteModes.dark : paletteModes.light;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(article.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Newsreader:opsz,wght@6..72,300..800&family=Source+Serif+4:wght@400;500;600;700&family=Manrope:wght@400;500;700;800&family=IBM+Plex+Sans:wght@400;500;700&family=Lora:wght@400;500;700&family=Playfair+Display:wght@400;500;700;800&family=Spectral:wght@400;500;600;700&family=Libre+Franklin:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --bg: ${activePalette.bg};
      --bg-alt: ${activePalette.bgAlt};
      --surface: ${activePalette.surface};
      --surface-muted: ${activePalette.surfaceMuted};
      --text: ${activePalette.text};
      --muted: ${activePalette.muted};
      --accent: ${activePalette.accent};
      --accent-soft: ${activePalette.accentSoft};
      --border: ${activePalette.border};
      --ink: ${activePalette.ink};
      --title-font: ${template.titleFont};
      --body-font: ${template.bodyFont};
      --shadow: 0 20px 42px rgba(0, 0, 0, 0.14);
    }

    body.theme-light {
      --bg: ${paletteModes.light.bg};
      --bg-alt: ${paletteModes.light.bgAlt};
      --surface: ${paletteModes.light.surface};
      --surface-muted: ${paletteModes.light.surfaceMuted};
      --text: ${paletteModes.light.text};
      --muted: ${paletteModes.light.muted};
      --accent: ${paletteModes.light.accent};
      --accent-soft: ${paletteModes.light.accentSoft};
      --border: ${paletteModes.light.border};
      --ink: ${paletteModes.light.ink};
    }

    body.theme-dark {
      --bg: ${paletteModes.dark.bg};
      --bg-alt: ${paletteModes.dark.bgAlt};
      --surface: ${paletteModes.dark.surface};
      --surface-muted: ${paletteModes.dark.surfaceMuted};
      --text: ${paletteModes.dark.text};
      --muted: ${paletteModes.dark.muted};
      --accent: ${paletteModes.dark.accent};
      --accent-soft: ${paletteModes.dark.accentSoft};
      --border: ${paletteModes.dark.border};
      --ink: ${paletteModes.dark.ink};
    }

    @media (prefers-color-scheme: dark) {
      body.theme-auto {
        --bg: ${paletteModes.dark.bg};
        --bg-alt: ${paletteModes.dark.bgAlt};
        --surface: ${paletteModes.dark.surface};
        --surface-muted: ${paletteModes.dark.surfaceMuted};
        --text: ${paletteModes.dark.text};
        --muted: ${paletteModes.dark.muted};
        --accent: ${paletteModes.dark.accent};
        --accent-soft: ${paletteModes.dark.accentSoft};
        --border: ${paletteModes.dark.border};
        --ink: ${paletteModes.dark.ink};
      }
    }

    * { box-sizing: border-box; }

    html,
    body {
      margin: 0;
      padding: 0;
      height: auto;
      min-height: 0;
    }

    body {
      font-family: var(--body-font);
      color: var(--text);
      line-height: 1.72;
      background:
        radial-gradient(1000px 540px at 5% -10%, var(--accent-soft), transparent 65%),
        radial-gradient(920px 540px at 95% -20%, var(--bg-alt), transparent 66%),
        linear-gradient(145deg, var(--bg), var(--bg-alt));
      padding-bottom: 44px;
    }
    .progress-top {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 90;
      height: 4px;
      background: rgba(0, 0, 0, 0.15);
      display: ${template.showProgress ? 'block' : 'none'};
    }

    .progress-top > span {
      display: block;
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, var(--accent), var(--ink));
    }

    .progress-serif {
      position: fixed;
      left: 14px;
      top: 18vh;
      width: 2px;
      height: 240px;
      background: rgba(0, 0, 0, 0.18);
      z-index: 75;
      display: ${template.showProgress ? 'block' : 'none'};
    }

    .progress-serif > span {
      display: block;
      width: 100%;
      height: 0;
      background: var(--accent);
    }

    .template-root {
      width: min(1380px, 98vw);
      margin: 0 auto;
      padding: clamp(10px, 1.8vw, 22px) clamp(8px, 1.5vw, 16px) 30px;
      display: grid;
      gap: 12px;
      position: relative;
      z-index: 1;
    }

    .frame-card {
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      border-radius: 18px;
    }

    body.template-custom-studio {
      padding-bottom: 0;
      background:
        radial-gradient(circle at 10% 8%, color-mix(in srgb, var(--accent) 16%, transparent 84%), transparent 32rem),
        linear-gradient(180deg, color-mix(in srgb, var(--bg) 92%, var(--surface) 8%), var(--bg-alt));
    }

    body.template-custom-studio .template-root {
      width: min(100%, 1680px);
      max-width: none;
      margin: 0 auto;
      padding: clamp(12px, 2vw, 30px) clamp(18px, 4.6vw, 72px) clamp(26px, 5vw, 70px);
      gap: clamp(14px, 2vw, 28px);
    }

    body.template-custom-studio .progress-top,
    body.template-custom-studio .progress-serif {
      display: none !important;
    }

    .hero {
      padding: clamp(22px, 4vw, 44px);
      display: grid;
      gap: 12px;
    }

    .hero-centered {
      text-align: center;
      justify-items: center;
    }

    .eyebrow {
      margin: 0;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .headline {
      margin: 0;
      font-family: var(--title-font);
      font-size: clamp(2rem, 5.2vw, 4.2rem);
      line-height: 1.03;
      letter-spacing: -0.02em;
      color: var(--ink);
    }

    .deck {
      margin: 0;
      max-width: 74ch;
      color: var(--muted);
      font-size: clamp(1rem, 1.8vw, 1.22rem);
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.72rem;
      font-weight: 600;
    }

    .dot { color: var(--accent); }

    .cover {
      margin: 0;
      overflow: hidden;
      padding: 0;
    }

    .cover img {
      width: 100%;
      max-height: min(64vh, 540px);
      object-fit: cover;
      display: block;
    }

    .cover figcaption {
      margin: 0;
      padding: 11px 15px;
      font-size: 0.8rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-top: 1px solid var(--border);
      background: var(--surface-muted);
    }

    .cover-fallback {
      min-height: 180px;
      display: grid;
      place-items: center;
      font-size: 0.9rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: repeating-linear-gradient(
        45deg,
        var(--surface),
        var(--surface) 12px,
        var(--surface-muted) 12px,
        var(--surface-muted) 24px
      );
      border-radius: 18px;
    }

    .layout-grid {
      display: grid;
      gap: 18px;
      align-items: start;
    }

    .split-grid,
    .newspaper-grid,
    .spotlight-grid,
    .notebook-grid {
      grid-template-columns: minmax(0, 1.34fr) minmax(190px, 0.66fr);
    }

    .briefing-grid {
      grid-template-columns: minmax(0, 1.38fr) minmax(200px, 0.62fr);
    }

    .rail {
      position: sticky;
      top: 14px;
      display: grid;
      gap: 10px;
      align-content: start;
      max-height: calc(100vh - 24px);
      overflow: auto;
      padding-right: 2px;
    }

    .briefing-rail {
      gap: 12px;
    }

    .panel {
      padding: 14px;
      border-radius: 14px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
    }

    .panel h3,
    .tag-band h3,
    .pull-quote h3,
    .video-shell h2,
    .section-top h2 {
      margin: 0 0 10px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--accent);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .meta-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }

    .meta-list li {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.86rem;
      color: var(--muted);
      border-bottom: 1px dashed rgba(0, 0, 0, 0.12);
      padding-bottom: 4px;
    }

    .meta-list li strong {
      color: var(--ink);
      font-weight: 600;
      text-align: right;
    }

    .point-list {
      margin: 0;
      padding-left: 1rem;
      display: grid;
      gap: 9px;
      font-size: 0.93rem;
      color: var(--text);
    }

    .point-list li::marker {
      color: var(--accent);
    }

    .tag-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tag-pill {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--ink);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .tag-empty {
      margin: 0;
      color: var(--muted);
      font-size: 0.87rem;
    }

    .story {
      padding: clamp(18px, 3vw, 34px);
      overflow-wrap: anywhere;
    }

    .story.is-paginated {
      padding: 2px;
      display: block;
    }

    .story-page {
      position: relative;
      min-height: 260px;
      padding: clamp(18px, 3vw, 34px);
      border-radius: 12px;
      border: 1px solid var(--border);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.22)),
        var(--surface);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
      display: none;
    }

    .story-page.is-active {
      display: block;
    }

    .story-page > :first-child {
      margin-top: 0;
    }

    .story-pagination-nav {
      margin: 10px 6px 6px;
      display: grid;
      grid-template-columns: 44px 1fr 44px;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid #d4c5b5;
      background: #ece6de;
    }

    .story-pagination-nav.is-next-only {
      grid-template-columns: minmax(0, 1fr) 44px;
    }

    .story-pagination-nav.is-prev-only {
      grid-template-columns: 44px minmax(0, 1fr);
    }

    .story-pagination-nav.is-next-only .story-pagination-status {
      grid-column: 1;
      justify-self: center;
    }

    .story-pagination-nav.is-next-only #story-page-next {
      grid-column: 2;
      justify-self: end;
    }

    .story-pagination-nav.is-prev-only .story-pagination-status {
      grid-column: 2;
      justify-self: center;
    }

    .story-pagination-nav.is-prev-only #story-page-prev {
      grid-column: 1;
      justify-self: start;
    }

    .story-page-btn {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid #d4c5b5;
      background: #f7f2eb;
      color: #2d241b;
      font-size: 1.04rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
    }

    .story-page-btn.is-hidden {
      visibility: hidden;
      pointer-events: none;
      opacity: 0;
    }

    .story-page-btn[hidden] {
      display: none !important;
    }

    .story-page-btn#story-page-prev {
      justify-self: start;
    }

    .story-page-btn#story-page-next {
      justify-self: end;
    }

    .story-page-btn-icon {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .story-page-btn-icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .story-page-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.04);
    }

    .story-page-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }

    .story-pagination-status {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #6e5b4a;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
      min-width: 92px;
      text-align: center;
      justify-self: center;
    }

    .reader-shell {
      padding: 14px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--surface);
      box-shadow: var(--shadow);
      align-self: start;
    }

    .reader-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      padding: 6px 6px 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 10px;
    }

    .reader-toolbar-main {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .reader-btn {
      border: 1px solid var(--border);
      background: var(--surface-muted);
      color: var(--ink);
      padding: 8px 12px;
      border-radius: 999px;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s ease, filter 0.2s ease;
    }

    .reader-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.04);
    }

    .reader-btn-primary {
      background: linear-gradient(120deg, var(--accent), var(--ink));
      color: #fff;
      border: none;
    }

    .reader-btn-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
      filter: none !important;
    }

    .reader-volume-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface-muted);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .reader-volume-wrap input {
      width: 90px;
      accent-color: var(--accent);
    }

    .reader-status {
      margin: 0 8px 10px;
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .reader-content {
      display: grid;
      gap: 0;
      min-height: 0;
    }

    .reader-summary {
      padding: clamp(18px, 3vw, 30px);
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface-muted);
      gap: 10px;
    }

    .reader-summary h3 {
      margin: 0;
      font-size: 0.86rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--accent);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .reader-summary p {
      margin: 0;
      font-size: clamp(0.98rem, 1.24vw, 1.08rem);
      color: var(--text);
      line-height: 1.64;
    }

    .reader-shell .reader-summary {
      display: none;
    }

    .reader-shell.is-summary-mode .reader-summary {
      display: grid;
    }

    .reader-shell.is-summary-mode .story {
      display: none;
    }

    .layout-grid.summary-mode-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .layout-grid.summary-mode-grid .rail {
      display: none;
    }

    #reader-story[hidden],
    .reader-summary[hidden] {
      display: none !important;
    }

    .story h1,
    .story h2,
    .story h3 {
      margin: 1.2em 0 0.35em;
      font-family: var(--title-font);
      line-height: 1.15;
      color: var(--ink);
    }

    .story p,
    .story li,
    .story blockquote {
      margin: 0 0 1em;
      font-size: clamp(1rem, 1.18vw, 1.12rem);
      line-height: 1.78;
    }

    .story .lead::first-letter {
      float: left;
      font-size: 3.15em;
      line-height: 0.86;
      margin: 0.07em 0.14em 0 0;
      padding: 0.06em 0.12em;
      border-radius: 8px;
      color: var(--accent);
      background: var(--accent-soft);
      font-family: var(--title-font);
      font-weight: 700;
    }

    .story-list {
      margin: 0 0 1.1em;
      padding-left: 1.2rem;
      display: grid;
      gap: 0.4rem;
    }

    .story-list.ordered {
      list-style: decimal;
    }

    .story blockquote {
      border-left: 4px solid var(--accent);
      background: var(--surface-muted);
      border-radius: 8px;
      padding: 0.5em 1em;
      color: var(--ink);
      font-style: italic;
    }

    .story code {
      padding: 0.12em 0.35em;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface-muted);
      font-size: 0.88em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .story a {
      color: var(--accent);
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
    }

    .story strong {
      color: var(--ink);
      font-weight: 700;
    }

    .story mark {
      color: var(--ink);
      background: linear-gradient(120deg, var(--accent-soft), rgba(255, 255, 255, 0.38));
      padding: 0.08em 0.2em;
      border-radius: 0.2em;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    .story-divider {
      border: 0;
      height: 1px;
      background: var(--border);
      margin: 1.7rem 0;
    }

    .story .inline-media {
      margin: 1.5rem 0 1.8rem;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--surface-muted);
      break-inside: avoid;
    }

    .story .inline-media img {
      display: block;
      width: 100%;
      max-height: min(62vh, 430px);
      object-fit: cover;
    }

    .story .inline-media figcaption {
      margin: 0;
      padding: 10px 12px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      border-top: 1px solid var(--border);
      background: var(--surface);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .style-newspaper .story h2 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.24em;
    }

    .style-briefing .story h2 {
      border-left: 4px solid var(--accent);
      padding: 0.24em 0.6em;
      background: var(--surface-muted);
      border-radius: 0 8px 8px 0;
    }

    .style-notebook .story h2 {
      padding-left: 0.8rem;
      position: relative;
    }

    .style-notebook .story h2::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.15em;
      bottom: 0.15em;
      width: 3px;
      border-radius: 999px;
      background: var(--accent);
    }

    .style-spotlight .story blockquote {
      background: linear-gradient(135deg, var(--surface-muted), var(--surface));
    }

    .style-split .story h2,
    .style-immersive .story h2 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.22em;
    }

    .template-metropolitan-ledger .newspaper-head,
    .template-iron-column .newspaper-head {
      border-top: 5px double var(--accent);
    }

    .template-metropolitan-ledger .headline {
      text-transform: uppercase;
      letter-spacing: -0.03em;
      font-size: clamp(2.3rem, 5vw, 4.6rem);
    }

    .template-metropolitan-ledger .newspaper-head {
      box-shadow: var(--shadow), inset 0 0 0 1px rgba(0, 0, 0, 0.06);
      background: linear-gradient(170deg, var(--surface), var(--surface-muted));
    }

    .template-metropolitan-ledger .story p:first-of-type {
      font-size: clamp(1.08rem, 1.26vw, 1.22rem);
      color: var(--ink);
    }

    .template-morning-bulletin .briefing-head,
    .template-wireframe-journal .briefing-head,
    .template-granite-digest .briefing-head {
      border-left: 5px solid var(--accent);
      background: linear-gradient(140deg, var(--surface), var(--surface-muted));
    }

    .template-morning-bulletin .headline,
    .template-wireframe-journal .headline,
    .template-granite-digest .headline {
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      font-weight: 800;
      letter-spacing: -0.018em;
    }

    .template-morning-bulletin .reader-toolbar {
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px;
      margin-bottom: 12px;
    }

    .template-morning-bulletin .story h2 {
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      letter-spacing: 0.02em;
    }

    .template-harbor-review .hero,
    .template-civic-observer .hero {
      background: linear-gradient(155deg, var(--surface), var(--surface-muted));
    }

    .template-harbor-review .hero {
      border-left: 6px solid var(--accent);
    }

    .template-harbor-review .story h2 {
      font-family: "Fraunces", "Newsreader", Georgia, serif;
      letter-spacing: -0.012em;
    }

    .template-harbor-review .tag-pill {
      background: var(--accent-soft);
      border-color: transparent;
    }

    .template-harbor-review .story blockquote,
    .template-civic-observer .story blockquote {
      border-left-width: 5px;
      border-radius: 0 12px 12px 0;
    }

    .template-atlas-feature .hero,
    .template-nightwire-deep .immersive-head {
      background: linear-gradient(145deg, var(--surface), var(--surface-muted));
      overflow: hidden;
      position: relative;
    }

    .template-atlas-feature .hero::after,
    .template-nightwire-deep .immersive-head::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 85% 0%, var(--accent-soft), transparent 42%);
      pointer-events: none;
      opacity: 0.45;
    }

    .template-ember-essay .column-stack {
      max-width: min(920px, 100%);
    }

    .template-ember-essay .story p,
    .template-atelier-notes .story p,
    .template-meadow-letter .story p {
      font-size: clamp(1.04rem, 1.2vw, 1.2rem);
      line-height: 1.82;
    }

    .template-eclipse-report .reader-shell,
    .template-nightwire-deep .reader-shell {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-eclipse-report .reader-btn-primary,
    .template-nightwire-deep .reader-btn-primary {
      color: #111;
    }

    .template-eclipse-report .story blockquote,
    .template-nightwire-deep .story blockquote {
      background: rgba(255, 255, 255, 0.04);
      border-left-color: var(--ink);
    }

    .template-meadow-letter .notebook-page,
    .template-atelier-notes .notebook-page {
      background:
        repeating-linear-gradient(
          to bottom,
          var(--surface),
          var(--surface) 31px,
          var(--surface-muted) 32px,
          var(--surface-muted) 33px
        );
    }

    .template-meadow-letter .note-card,
    .template-atelier-notes .note-card {
      border-left: 3px solid var(--accent);
    }

    .template-sunrise-weekend .spotlight-overlay {
      background: linear-gradient(120deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.42));
    }

    .template-sunrise-weekend .headline {
      font-family: "Fraunces", "Newsreader", Georgia, serif;
    }

    .template-iron-column .headline {
      font-family: "Times New Roman", "Newsreader", Georgia, serif;
      letter-spacing: -0.016em;
    }

    .template-granite-digest .panel h3,
    .template-wireframe-journal .panel h3 {
      letter-spacing: 0.16em;
    }

    .template-atlas-feature .spotlight {
      border-radius: 20px;
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
      box-shadow: 0 20px 44px rgba(43, 29, 20, 0.14);
    }

    .template-atlas-feature .spotlight-copy {
      align-content: start;
      background: linear-gradient(180deg, rgba(255, 249, 241, 0.98), rgba(244, 232, 220, 0.9));
      gap: 14px;
    }

    .template-atlas-feature .headline {
      font-size: clamp(2.2rem, 4.5vw, 3.8rem);
      line-height: 1.04;
      letter-spacing: -0.018em;
    }

    .template-atlas-feature .deck {
      max-width: 60ch;
      font-size: clamp(1rem, 1.45vw, 1.16rem);
      color: var(--ink);
    }

    .template-atlas-feature .story h2 {
      font-family: "Fraunces", "Newsreader", Georgia, serif;
      border-left: 4px solid var(--accent);
      padding-left: 0.6rem;
      border-bottom: 0;
      margin-top: 1.45em;
    }

    .template-atlas-feature .story blockquote {
      border-left-width: 5px;
      border-radius: 0 12px 12px 0;
      background: linear-gradient(135deg, rgba(231, 201, 181, 0.38), rgba(255, 250, 243, 0.95));
    }

    .template-ember-essay .hero {
      border-top: 3px solid var(--accent);
      background: linear-gradient(180deg, var(--surface), rgba(245, 231, 217, 0.72));
    }

    .template-ember-essay .headline {
      font-size: clamp(2.15rem, 4.1vw, 3.5rem);
      letter-spacing: -0.016em;
    }

    .template-ember-essay .story {
      padding: clamp(22px, 3.5vw, 44px);
    }

    .template-ember-essay .story h2 {
      font-family: "Playfair Display", "Newsreader", Georgia, serif;
      font-size: clamp(1.5rem, 2.45vw, 2.06rem);
      line-height: 1.16;
      border-bottom: 0;
      margin-top: 1.65em;
      position: relative;
      padding-bottom: 0.22em;
    }

    .template-ember-essay .story h2::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: min(160px, 42%);
      height: 2px;
      background: linear-gradient(90deg, var(--accent), transparent);
      border-radius: 999px;
    }

    .template-ember-essay .story mark {
      background: linear-gradient(115deg, rgba(241, 207, 184, 0.92), rgba(255, 246, 236, 0.9));
    }

    .template-eclipse-report .spotlight {
      box-shadow: 0 28px 58px rgba(0, 0, 0, 0.42);
    }

    .template-eclipse-report .spotlight-copy {
      align-content: start;
      background: linear-gradient(180deg, rgba(255, 248, 238, 0.98), rgba(245, 232, 218, 0.92));
    }

    .template-eclipse-report .eyebrow {
      color: #9d6237;
    }

    .template-eclipse-report .headline {
      color: #2d2218;
      font-size: clamp(2.1rem, 4.2vw, 3.5rem);
    }

    .template-eclipse-report .deck {
      color: #6f5d50;
    }

    .template-eclipse-report .reader-toolbar {
      background: #f4ebe0;
      border: 1px solid #d2bea9;
      border-radius: 12px;
      padding: 8px;
      margin-bottom: 12px;
    }

    .template-eclipse-report .reader-btn {
      background: #fffaf2;
      border-color: #ccb49d;
      color: #2f2419;
    }

    .template-eclipse-report .reader-btn-primary {
      background: #b36f2f;
      color: #fff9f2;
      border-color: transparent;
    }

    .template-eclipse-report .story h2 {
      color: #8a552c;
      border-bottom-color: #ccb49d;
    }

    .template-eclipse-report .story p,
    .template-eclipse-report .story li,
    .template-eclipse-report .story blockquote {
      color: #2f2419;
    }

    .template-eclipse-report .story mark {
      background: rgba(179, 111, 47, 0.22);
      color: #2d2118;
    }

    .template-meadow-letter .notebook-hero {
      background:
        radial-gradient(circle at 90% 8%, rgba(200, 223, 190, 0.58), transparent 46%),
        linear-gradient(165deg, var(--surface), var(--surface-muted));
      border-top: 3px solid var(--accent);
    }

    .template-meadow-letter .headline {
      font-size: clamp(2.1rem, 4vw, 3.45rem);
      letter-spacing: -0.015em;
    }

    .template-meadow-letter .notebook-page {
      box-shadow: inset 40px 0 0 rgba(79, 125, 77, 0.08);
    }

    .template-meadow-letter .story h2 {
      font-family: "Playfair Display", "Newsreader", Georgia, serif;
      color: var(--ink);
      border-bottom: 0;
      padding-left: 0.85rem;
    }

    .template-meadow-letter .story h2::before {
      width: 4px;
    }

    .template-meadow-letter .note-card {
      background: linear-gradient(180deg, rgba(244, 250, 238, 0.92), rgba(232, 243, 224, 0.88));
      border-color: rgba(111, 168, 106, 0.38);
      border-left: 3px solid rgba(94, 150, 90, 0.55);
      box-shadow: 0 10px 22px rgba(44, 64, 38, 0.1);
    }

    .template-meadow-letter .note-card h3 {
      color: #4d7d4a;
    }

    .template-meadow-letter .note-card p {
      color: #334731;
    }

    .template-wireframe-journal .briefing-head {
      border-left: 0;
      border-top: 4px solid var(--accent);
      background:
        linear-gradient(140deg, var(--surface), var(--surface-muted)),
        linear-gradient(90deg, rgba(63, 99, 232, 0.08) 1px, transparent 1px);
      background-size: auto, 28px 28px;
    }

    .template-wireframe-journal .eyebrow {
      letter-spacing: 0.18em;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
    }

    .template-wireframe-journal .headline {
      font-size: clamp(2rem, 4vw, 3.25rem);
      line-height: 1.05;
    }

    .template-wireframe-journal .reader-shell {
      box-shadow: 0 16px 32px rgba(26, 46, 85, 0.14);
    }

    .template-wireframe-journal .story h2 {
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      border: 1px solid var(--border);
      border-left: 4px solid var(--accent);
      background: var(--surface-muted);
      border-radius: 8px;
      padding: 0.52rem 0.72rem;
      margin: 1.35em 0 0.65em;
    }

    .template-wireframe-journal .point-list li {
      border: 1px dashed var(--border);
      border-radius: 8px;
      padding: 0.45rem 0.58rem;
      margin-bottom: 0.4rem;
      background: var(--surface);
    }

    .template-sunrise-weekend .spotlight {
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(137, 78, 39, 0.16);
    }

    .template-sunrise-weekend .spotlight-copy {
      align-content: start;
      background: linear-gradient(180deg, rgba(255, 249, 239, 0.98), rgba(255, 240, 222, 0.88));
    }

    .template-sunrise-weekend .headline {
      font-size: clamp(2.15rem, 4.3vw, 3.6rem);
      line-height: 1.05;
    }

    .template-sunrise-weekend .deck {
      color: #5f4b40;
    }

    .template-sunrise-weekend .reader-shell {
      background: linear-gradient(180deg, #fffaf2, #fff2e2);
      border-color: #efcca8;
    }

    .template-sunrise-weekend .panel {
      background: linear-gradient(180deg, rgba(255, 249, 239, 0.98), rgba(255, 238, 218, 0.9));
      border-color: #efcca8;
    }

    .template-sunrise-weekend .story h2 {
      border-left: 4px solid var(--accent);
      border-bottom: 0;
      padding-left: 0.62rem;
    }

    .template-sunrise-weekend .story mark {
      background: linear-gradient(120deg, rgba(255, 214, 181, 0.9), rgba(255, 246, 233, 0.9));
    }

    .template-iron-column .newspaper-head {
      border-top: 6px double var(--accent);
      border-bottom: 2px solid var(--accent);
      background:
        linear-gradient(170deg, #fafafa, #efefef),
        linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px 28px);
      background-size: auto, 28px 100%;
    }

    .template-iron-column .headline {
      text-transform: uppercase;
      font-size: clamp(2.1rem, 4.3vw, 3.85rem);
      letter-spacing: -0.01em;
    }

    .template-iron-column .newspaper-top {
      color: var(--accent);
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      font-weight: 800;
    }

    .template-iron-column .story h2 {
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      font-size: 0.98rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 2px solid var(--border);
      padding-bottom: 0.36rem;
      margin-top: 1.5em;
    }

    .template-iron-column .story p {
      font-size: clamp(1rem, 1.13vw, 1.08rem);
      line-height: 1.74;
    }

    .template-iron-column .tag-pill {
      border-radius: 4px;
    }

    .template-granite-digest .briefing-head {
      border-left: 0;
      border-top: 4px solid var(--accent);
      background:
        linear-gradient(155deg, var(--surface), var(--surface-muted)),
        linear-gradient(90deg, rgba(61, 108, 130, 0.08) 1px, transparent 1px);
      background-size: auto, 24px 24px;
    }

    .template-granite-digest .headline {
      font-size: clamp(2rem, 3.8vw, 3.2rem);
      line-height: 1.06;
    }

    .template-granite-digest .reader-shell {
      background: linear-gradient(180deg, #f9fcfe, #edf3f7);
      border-color: #c5d6df;
    }

    .template-granite-digest .panel {
      background: linear-gradient(180deg, rgba(248, 252, 253, 0.98), rgba(233, 241, 246, 0.9));
      border-radius: 12px;
      border-color: #c4d5df;
    }

    .template-granite-digest .story h2 {
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-size: 0.98rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-left: 4px solid var(--accent);
      border-bottom: 0;
      background: var(--surface-muted);
      border-radius: 0 8px 8px 0;
      padding: 0.5rem 0.68rem;
      margin: 1.4em 0 0.66em;
    }

    .template-civic-observer .hero {
      border-top: 3px solid var(--accent);
      background: linear-gradient(160deg, var(--surface), rgba(237, 243, 248, 0.94));
    }

    .template-civic-observer .headline {
      font-size: clamp(2.15rem, 4.2vw, 3.7rem);
      line-height: 1.06;
    }

    .template-civic-observer .panel {
      background: linear-gradient(180deg, rgba(251, 253, 255, 0.98), rgba(236, 244, 250, 0.9));
      border-radius: 12px;
    }

    .template-civic-observer .story h2 {
      font-family: "Newsreader", "Source Serif 4", Georgia, serif;
      font-size: clamp(1.38rem, 2.2vw, 1.78rem);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.24em;
    }

    .template-civic-observer .tag-pill {
      background: rgba(193, 214, 226, 0.58);
    }

    .template-atelier-notes .notebook-hero {
      border-top: 3px solid var(--accent);
      background:
        radial-gradient(circle at 8% 0%, rgba(235, 206, 184, 0.55), transparent 44%),
        linear-gradient(170deg, var(--surface), var(--surface-muted));
    }

    .template-atelier-notes .headline {
      font-size: clamp(2.15rem, 4vw, 3.55rem);
      letter-spacing: -0.016em;
    }

    .template-atelier-notes .notebook-page {
      box-shadow: inset 44px 0 0 rgba(161, 96, 56, 0.08);
    }

    .template-atelier-notes .story h2 {
      font-family: "Playfair Display", "Newsreader", Georgia, serif;
      border-bottom: 0;
      border-left: 4px solid var(--accent);
      padding-left: 0.66rem;
      margin-top: 1.5em;
    }

    .template-atelier-notes .note-card {
      background: linear-gradient(180deg, rgba(255, 249, 242, 0.97), rgba(245, 235, 223, 0.9));
      border-left: 3px solid rgba(167, 102, 62, 0.5);
      box-shadow: 0 12px 24px rgba(51, 35, 23, 0.14);
    }

    .template-atelier-notes .story mark {
      background: linear-gradient(120deg, rgba(235, 206, 184, 0.92), rgba(255, 247, 239, 0.9));
    }

    .template-nightwire-deep .immersive-head {
      box-shadow: 0 24px 52px rgba(0, 0, 0, 0.44);
    }

    .template-nightwire-deep .eyebrow {
      color: var(--accent);
    }

    .template-nightwire-deep .headline {
      color: var(--ink);
      font-size: clamp(2.2rem, 4.3vw, 3.7rem);
      line-height: 1.04;
    }

    .template-nightwire-deep .deck {
      color: var(--muted);
    }

    .template-nightwire-deep .quote-panel,
    .template-nightwire-deep .highlight-band,
    .template-nightwire-deep .tag-band {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      border-color: var(--border);
    }

    .template-nightwire-deep .reader-btn {
      background: var(--surface-muted);
      border-color: var(--border);
      color: var(--ink);
    }

    .template-nightwire-deep .reader-btn-primary {
      background: var(--accent);
      color: #ffffff;
      border-color: transparent;
    }

    .template-nightwire-deep .story h2 {
      color: var(--ink);
      border-bottom-color: var(--border);
    }

    .template-nightwire-deep .story p,
    .template-nightwire-deep .story li,
    .template-nightwire-deep .story blockquote {
      color: var(--text);
    }

    .template-nightwire-deep .story mark {
      background: rgba(63, 120, 181, 0.22);
      color: var(--ink);
    }

    .template-nightwire-deep .tag-pill {
      background: rgba(63, 120, 181, 0.12);
      border-color: var(--border);
      color: var(--ink);
    }


    .template-city-gazette .newspaper-head,
    .template-daily-chronicle .newspaper-head,
    .template-heritage-broadsheet .newspaper-head,
    .template-marble-times .newspaper-head {
      border-top: 6px double var(--accent);
      background: linear-gradient(170deg, var(--surface), var(--surface-muted));
    }

    .template-city-gazette .headline,
    .template-daily-chronicle .headline,
    .template-marble-times .headline {
      text-transform: uppercase;
      letter-spacing: -0.018em;
    }

    .template-vintage-press .newspaper-head {
      border-top: 6px double var(--accent);
      background:
        linear-gradient(170deg, var(--surface), var(--surface-muted)),
        repeating-linear-gradient(90deg, rgba(138, 81, 43, 0.06) 0 1px, transparent 1px 26px);
      background-size: auto, 26px 100%;
    }

    .template-vintage-press .story {
      font-family: "Source Serif 4", "Spectral", Georgia, serif;
    }

    .template-business-pulse .briefing-head,
    .template-science-ledger .briefing-head,
    .template-noir-bulletin .briefing-head {
      border-left: 0;
      border-top: 4px solid var(--accent);
      background: linear-gradient(145deg, var(--surface), var(--surface-muted));
    }

    .template-business-pulse .story h2,
    .template-science-ledger .story h2,
    .template-noir-bulletin .story h2 {
      border-bottom: 0;
      border-left: 4px solid var(--accent);
      background: var(--surface-muted);
      border-radius: 0 8px 8px 0;
      padding: 0.5rem 0.7rem;
    }

    .template-business-pulse .panel h3,
    .template-science-ledger .panel h3 {
      letter-spacing: 0.14em;
    }

    .template-modern-feature .hero,
    .template-portrait-weekly .hero,
    .template-copper-review .hero,
    .template-indigo-observer .hero {
      border-top: 3px solid var(--accent);
      background: linear-gradient(160deg, var(--surface), var(--surface-muted));
    }

    .template-modern-feature .headline,
    .template-copper-review .headline,
    .template-indigo-observer .headline {
      font-size: clamp(2.1rem, 4.2vw, 3.65rem);
      line-height: 1.05;
    }

    .template-modern-feature .tag-pill,
    .template-portrait-weekly .tag-pill,
    .template-copper-review .tag-pill,
    .template-indigo-observer .tag-pill {
      background: var(--accent-soft);
      border-color: transparent;
    }

    .template-coastal-magazine .spotlight,
    .template-canvas-weekend .spotlight {
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 22px 44px rgba(0, 0, 0, 0.18);
    }

    .template-coastal-magazine .spotlight-copy,
    .template-canvas-weekend .spotlight-copy {
      align-content: start;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), var(--surface-muted));
    }

    .template-coastal-magazine .eyebrow,
    .template-canvas-weekend .eyebrow {
      letter-spacing: 0.18em;
    }

    .template-travel-atlas .immersive-head,
    .template-photo-chronicle .immersive-head {
      background: linear-gradient(150deg, var(--surface), var(--surface-muted));
      position: relative;
      overflow: hidden;
    }

    .template-travel-atlas .immersive-head::after,
    .template-photo-chronicle .immersive-head::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 86% 6%, var(--accent-soft), transparent 45%);
      opacity: 0.6;
      pointer-events: none;
    }

    .template-photo-chronicle .highlight-band {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-minimal-brief .hero,
    .template-paperlight-journal .hero,
    .template-editorial-zine .hero {
      border-top: 3px solid var(--accent);
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-minimal-brief .story,
    .template-paperlight-journal .story {
      max-width: min(860px, 100%);
      margin-inline: auto;
      padding-top: clamp(24px, 4vw, 40px);
      padding-bottom: clamp(24px, 4vw, 40px);
    }

    .template-minimal-brief .story h2,
    .template-paperlight-journal .story h2 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.24em;
    }

    .template-editorial-zine .headline {
      letter-spacing: -0.024em;
      text-transform: uppercase;
    }

    .template-editorial-zine .story h2 {
      border-bottom: 0;
      border-left: 4px solid var(--accent);
      padding-left: 0.65rem;
    }

    .template-editorial-zine .story mark {
      background: linear-gradient(120deg, var(--accent-soft), rgba(255, 255, 255, 0.36));
    }

    .template-urban-notes .notebook-page,
    .template-atelier-notes .notebook-page,
    .template-meadow-letter .notebook-page {
      background:
        repeating-linear-gradient(
          to bottom,
          var(--surface),
          var(--surface) 31px,
          var(--surface-muted) 32px,
          var(--surface-muted) 33px
        );
    }

    .template-urban-notes .note-card {
      border-left: 3px solid var(--accent);
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-urban-notes .story h2 {
      border-bottom: 0;
      padding-left: 0.8rem;
      position: relative;
    }

    .template-urban-notes .story h2::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.18em;
      bottom: 0.18em;
      width: 3px;
      border-radius: 999px;
      background: var(--accent);
    }

    .template-noir-bulletin .reader-shell {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      border-color: var(--border);
    }

    .template-noir-bulletin .reader-btn-primary {
      background: linear-gradient(120deg, var(--accent), var(--ink));
      color: #0f1218;
      border-color: transparent;
    }

    .template-noir-bulletin .point-list li {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.45rem 0.58rem;
      background: var(--surface);
      list-style-position: inside;
    }

    .template-indigo-observer .story h2 {
      border-bottom-color: var(--accent);
    }

    .template-city-gazette .newspaper-top,
    .template-daily-chronicle .newspaper-top,
    .template-heritage-broadsheet .newspaper-top,
    .template-marble-times .newspaper-top {
      letter-spacing: 0.14em;
      font-weight: 800;
    }

    .template-city-gazette .story h2,
    .template-daily-chronicle .story h2,
    .template-marble-times .story h2 {
      font-family: "Times New Roman", "Newsreader", Georgia, serif;
      border-bottom: 2px solid var(--border);
      padding-bottom: 0.3rem;
    }

    .template-daily-chronicle .story p:first-of-type,
    .template-heritage-broadsheet .story p:first-of-type,
    .template-vintage-press .story p:first-of-type {
      font-size: clamp(1.06rem, 1.28vw, 1.2rem);
      color: var(--ink);
    }

    .template-vintage-press .story mark {
      background: linear-gradient(120deg, rgba(220, 187, 162, 0.78), rgba(248, 240, 226, 0.9));
    }

    .template-business-pulse .headline,
    .template-science-ledger .headline,
    .template-noir-bulletin .headline {
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 800;
      letter-spacing: -0.015em;
    }

    .template-business-pulse .panel,
    .template-science-ledger .panel {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      border-radius: 12px;
    }

    .template-business-pulse .meta-list li strong,
    .template-science-ledger .meta-list li strong {
      color: var(--ink);
    }

    .template-science-ledger .point-list li {
      border: 1px dashed var(--border);
      border-radius: 8px;
      padding: 0.44rem 0.6rem;
      list-style-position: inside;
    }

    .template-modern-feature .hero,
    .template-portrait-weekly .hero,
    .template-copper-review .hero,
    .template-indigo-observer .hero {
      border-radius: 20px;
    }

    .template-modern-feature .deck,
    .template-portrait-weekly .deck,
    .template-copper-review .deck,
    .template-indigo-observer .deck {
      max-width: 62ch;
    }

    .template-modern-feature .story blockquote,
    .template-portrait-weekly .story blockquote,
    .template-copper-review .story blockquote,
    .template-indigo-observer .story blockquote {
      border-left-width: 5px;
      border-radius: 0 12px 12px 0;
    }

    .template-coastal-magazine .headline,
    .template-canvas-weekend .headline {
      font-size: clamp(2.2rem, 4.35vw, 3.8rem);
      line-height: 1.03;
    }

    .template-coastal-magazine .deck,
    .template-canvas-weekend .deck {
      max-width: 52ch;
      color: var(--ink);
    }

    .template-coastal-magazine .reader-shell,
    .template-canvas-weekend .reader-shell {
      border-color: var(--border);
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-travel-atlas .headline,
    .template-photo-chronicle .headline {
      font-size: clamp(2.2rem, 4.4vw, 3.9rem);
      line-height: 1.02;
    }

    .template-travel-atlas .quote-panel p,
    .template-photo-chronicle .quote-panel p {
      font-size: clamp(1.2rem, 2.1vw, 1.6rem);
      color: var(--ink);
    }

    .template-travel-atlas .highlight-grid p,
    .template-photo-chronicle .highlight-grid p {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-minimal-brief .headline,
    .template-paperlight-journal .headline {
      letter-spacing: -0.012em;
      font-size: clamp(2.05rem, 4.05vw, 3.25rem);
    }

    .template-minimal-brief .deck,
    .template-paperlight-journal .deck {
      max-width: 58ch;
      color: var(--muted);
    }

    .template-minimal-brief .story p,
    .template-paperlight-journal .story p {
      font-size: clamp(1.04rem, 1.2vw, 1.18rem);
      line-height: 1.84;
    }

    .template-editorial-zine .story p {
      font-size: clamp(1rem, 1.16vw, 1.12rem);
      line-height: 1.76;
    }

    .template-editorial-zine .panel h3 {
      color: var(--accent);
      letter-spacing: 0.16em;
    }

    .template-urban-notes .notebook-hero {
      background:
        radial-gradient(circle at 90% 8%, rgba(195, 216, 204, 0.52), transparent 44%),
        linear-gradient(165deg, var(--surface), var(--surface-muted));
      border-top: 3px solid var(--accent);
    }

    .template-urban-notes .headline {
      font-size: clamp(2.05rem, 3.95vw, 3.35rem);
    }

    .template-urban-notes .note-card h3 {
      color: var(--accent);
    }

    .template-noir-bulletin .reader-btn {
      border-color: var(--border);
      background: rgba(255, 255, 255, 0.03);
    }

    .template-noir-bulletin .reader-status {
      color: var(--muted);
    }

    .template-noir-bulletin .tag-pill {
      background: rgba(122, 162, 255, 0.12);
      border-color: rgba(122, 162, 255, 0.28);
    }

    .template-indigo-observer .story h2 {
      border-left: 4px solid var(--accent);
      border-bottom: 0;
      border-radius: 0 8px 8px 0;
      background: rgba(79, 93, 207, 0.09);
      padding: 0.52rem 0.7rem;
    }

    .template-paperlight-journal .story h2 {
      font-family: "Playfair Display", "Newsreader", Georgia, serif;
    }

    .template-marble-times .headline {
      font-size: clamp(2.05rem, 4.18vw, 3.6rem);
      color: var(--ink);
    }

    .template-marble-times .newspaper-head {
      border-bottom: 2px solid var(--accent);
    }

    .template-marble-times .story p {
      color: var(--text);
    }

    .template-canvas-weekend .story h2 {
      border-left: 4px solid var(--accent);
      border-bottom: 0;
      padding-left: 0.66rem;
    }

    .template-canvas-weekend .story mark {
      background: linear-gradient(120deg, rgba(240, 208, 185, 0.85), rgba(255, 245, 235, 0.88));
    }

    .template-minimal-brief.longread .story,
    .template-paperlight-journal.longread .story,
    .template-editorial-zine.longread .story {
      max-width: min(980px, 100%);
      padding-inline: clamp(18px, 3.3vw, 34px);
    }

    /* Focused visual pass: template-by-template tuning with correct layout selectors */

    .template-city-gazette .ledger-mast {
      border-top: 6px double #a64e2f;
      border-bottom: 1px solid var(--border);
      background:
        linear-gradient(170deg, var(--surface), var(--surface-muted)),
        repeating-linear-gradient(90deg, rgba(166, 78, 47, 0.08) 0 1px, transparent 1px 30px);
    }

    .template-city-gazette .ledger-title {
      font-size: clamp(2.35rem, 5vw, 4.45rem);
      text-transform: uppercase;
      letter-spacing: -0.028em;
    }

    .template-city-gazette .ledger-story h2 {
      font-family: "Times New Roman", "Newsreader", Georgia, serif;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 2px solid var(--border);
      padding-bottom: 0.32rem;
    }

    .template-city-gazette .ledger-brief-card {
      border-radius: 8px;
    }

    .template-daily-chronicle .ledger-mast {
      border-top: 4px solid #bf5d34;
      border-bottom: 2px solid #bf5d34;
      background: linear-gradient(170deg, var(--surface), var(--surface-muted));
    }

    .template-daily-chronicle .ledger-top {
      letter-spacing: 0.18em;
    }

    .template-daily-chronicle .ledger-title {
      font-size: clamp(2.3rem, 4.85vw, 4.2rem);
      line-height: 0.98;
      letter-spacing: -0.02em;
    }

    .template-daily-chronicle .ledger-brief-card {
      border-left: 4px solid var(--accent);
      border-radius: 10px;
    }

    .template-daily-chronicle .ledger-story p:first-of-type {
      font-size: clamp(1.08rem, 1.28vw, 1.22rem);
      color: var(--ink);
    }

    .template-vintage-press .ledger-mast {
      border-top: 6px double #8a512b;
      background:
        linear-gradient(175deg, var(--surface), var(--surface-muted)),
        repeating-linear-gradient(0deg, rgba(138, 81, 43, 0.045) 0 1px, transparent 1px 36px);
      box-shadow: var(--shadow), inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    }

    .template-vintage-press .ledger-title {
      font-family: "Times New Roman", "Newsreader", Georgia, serif;
      letter-spacing: -0.018em;
    }

    .template-vintage-press .ledger-story p {
      font-family: "Source Serif 4", "Spectral", Georgia, serif;
      color: var(--text);
    }

    .template-vintage-press .ledger-story h2 {
      border-bottom: 1px solid rgba(138, 81, 43, 0.35);
      padding-bottom: 0.3rem;
      font-variant: small-caps;
      letter-spacing: 0.04em;
    }

    .template-vintage-press .ledger-story .lead::first-letter {
      background: var(--accent-soft);
      color: var(--ink);
    }

    .template-heritage-broadsheet .ledger-mast {
      border-top: 6px double #8f4f2d;
      border-bottom: 1px solid #c8ae90;
      background:
        linear-gradient(170deg, var(--surface), var(--surface-muted)),
        radial-gradient(circle at 92% 8%, var(--accent-soft), transparent 44%);
    }

    .template-heritage-broadsheet .ledger-title {
      font-size: clamp(2.26rem, 4.82vw, 4.18rem);
      letter-spacing: -0.024em;
    }

    .template-heritage-broadsheet .ledger-brief-card {
      border-radius: 6px;
      border-color: #ccb59a;
    }

    .template-heritage-broadsheet .ledger-story h2 {
      font-family: "Playfair Display", "Newsreader", Georgia, serif;
      border-bottom: 1px solid #ccb59a;
      padding-bottom: 0.28rem;
    }

    .template-marble-times .ledger-mast {
      border-top: 5px solid #4b4f56;
      border-bottom: 2px solid #4b4f56;
      background:
        linear-gradient(170deg, var(--surface), var(--surface-muted)),
        repeating-linear-gradient(90deg, rgba(75, 79, 86, 0.07) 0 1px, transparent 1px 26px);
    }

    .template-marble-times .ledger-top,
    .template-marble-times .ledger-brief-card h3 {
      color: #4b4f56;
    }

    .template-marble-times .ledger-title {
      font-size: clamp(2.2rem, 4.75vw, 4.05rem);
      letter-spacing: -0.02em;
    }

    .template-marble-times .ledger-brief-card {
      border-radius: 4px;
      box-shadow: none;
    }

    .template-marble-times .ledger-story h2 {
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      font-size: 0.94rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 2px solid #b6bac2;
      padding-bottom: 0.34rem;
    }

    .template-business-pulse .board-mast {
      border-left: 0;
      border-top: 4px solid #295f9b;
      background:
        linear-gradient(150deg, var(--surface), var(--surface-muted)),
        linear-gradient(90deg, rgba(41, 95, 155, 0.11) 1px, transparent 1px);
      background-size: auto, 22px 22px;
    }

    .template-business-pulse .board-kpi {
      border-top: 3px solid #295f9b;
      border-radius: 10px;
      box-shadow: 0 8px 16px rgba(28, 53, 81, 0.08);
    }

    .template-business-pulse .board-kpi p {
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .template-business-pulse .board-story h2 {
      background: rgba(41, 95, 155, 0.09);
      border-left-color: #295f9b;
    }

    .template-science-ledger .board-mast {
      border-left: 0;
      border-top: 4px solid #2d7f86;
      background:
        linear-gradient(150deg, var(--surface), var(--surface-muted)),
        radial-gradient(rgba(45, 127, 134, 0.16) 0.8px, transparent 0.8px);
      background-size: auto, 16px 16px;
    }

    .template-science-ledger .board-kpi {
      border-radius: 8px;
      background:
        linear-gradient(180deg, var(--surface), var(--surface-muted)),
        linear-gradient(90deg, rgba(45, 127, 134, 0.08) 1px, transparent 1px);
      background-size: auto, 18px 18px;
    }

    .template-science-ledger .board-kpi p {
      font-family: "JetBrains Mono", "IBM Plex Sans", monospace;
      font-size: 1.02rem;
      font-weight: 700;
    }

    .template-science-ledger .board-story h2 {
      border-left-color: #2d7f86;
      background: rgba(45, 127, 134, 0.1);
    }

    .template-modern-feature .mosaic-hero {
      grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
      border-radius: 20px;
      box-shadow: 0 20px 34px rgba(31, 42, 65, 0.14);
    }

    .template-modern-feature .mosaic-copy {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-modern-feature .headline {
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      font-size: clamp(2.15rem, 4.26vw, 3.55rem);
      line-height: 1.04;
    }

    .template-modern-feature .mosaic-story h2 {
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 0.95rem;
    }

    .template-coastal-magazine .mosaic-hero {
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 22px 42px rgba(31, 78, 82, 0.16);
    }

    .template-coastal-magazine .mosaic-media img {
      transform: scale(1.06);
      filter: saturate(1.08) contrast(1.04);
    }

    .template-coastal-magazine .mosaic-copy {
      background:
        radial-gradient(circle at 100% 0%, var(--accent-soft), transparent 42%),
        linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-coastal-magazine .mosaic-story h2 {
      border-left-color: #2f8c91;
    }

    .template-portrait-weekly .mosaic-hero {
      border-radius: 18px;
      grid-template-columns: minmax(0, 0.96fr) minmax(0, 1.04fr);
    }

    .template-portrait-weekly .mosaic-media {
      min-height: 360px;
    }

    .template-portrait-weekly .mosaic-copy {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-portrait-weekly .headline {
      font-family: "Playfair Display", "Newsreader", Georgia, serif;
      font-size: clamp(2.2rem, 4.4vw, 3.66rem);
    }

    .template-copper-review .mosaic-hero {
      border-radius: 20px;
      box-shadow: 0 22px 42px rgba(88, 53, 35, 0.16);
    }

    .template-copper-review .mosaic-copy {
      background:
        radial-gradient(circle at 92% 0%, var(--accent-soft), transparent 45%),
        linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-copper-review .mosaic-quote {
      border-left-color: #a56a45;
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-copper-review .mosaic-story mark {
      background: rgba(165, 106, 69, 0.2);
    }

    .template-indigo-observer .mosaic-hero {
      border-radius: 18px;
      box-shadow: 0 20px 40px rgba(42, 52, 117, 0.16);
    }

    .template-indigo-observer .mosaic-copy {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-indigo-observer .mosaic-story h2 {
      background: rgba(79, 93, 207, 0.11);
      border-left-color: #4f5dcf;
    }

    .template-indigo-observer .mosaic-chip-wrap .tag-pill {
      background: rgba(79, 93, 207, 0.13);
      border-color: rgba(79, 93, 207, 0.24);
      color: #2a3475;
    }

    .template-canvas-weekend .mosaic-hero {
      border-radius: 22px;
      box-shadow: 0 22px 44px rgba(97, 56, 33, 0.16);
    }

    .template-canvas-weekend .mosaic-copy {
      background:
        radial-gradient(circle at 94% 0%, var(--accent-soft), transparent 42%),
        linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-canvas-weekend .mosaic-story h2 {
      border-left-color: #c06f3e;
      background: rgba(192, 111, 62, 0.12);
    }

    .template-travel-atlas .journey-head {
      border-top: 3px solid #9c6a3d;
      background:
        radial-gradient(circle at 92% 8%, var(--accent-soft), transparent 44%),
        linear-gradient(160deg, var(--surface), var(--surface-muted));
    }

    .template-travel-atlas .journey-cover {
      border-radius: 16px;
      transform: rotate(-0.45deg);
      box-shadow: 0 18px 30px rgba(51, 37, 25, 0.14);
    }

    .template-travel-atlas .journey-note {
      border-left: 4px solid #9c6a3d;
      border-radius: 10px 14px 14px 10px;
    }

    .template-travel-atlas .journey-story h2 {
      border-left-color: #9c6a3d;
    }

    .template-photo-chronicle .journey-head {
      border-top: 3px solid #446b9a;
      background:
        radial-gradient(circle at 94% 8%, var(--accent-soft), transparent 44%),
        linear-gradient(160deg, var(--surface), var(--surface-muted));
    }

    .template-photo-chronicle .journey-cover {
      border-radius: 18px;
      box-shadow: 0 18px 34px rgba(33, 58, 87, 0.15);
    }

    .template-photo-chronicle .journey-note {
      border-left: 4px solid #446b9a;
      border-radius: 10px 14px 14px 10px;
    }

    .template-photo-chronicle .journey-story h2 {
      border-left-color: #446b9a;
    }

    .template-minimal-brief .mono-mast {
      border-top: 2px solid #51545c;
      border-radius: 12px;
      background: var(--surface);
      box-shadow: 0 10px 18px rgba(28, 31, 39, 0.08);
    }

    .template-minimal-brief .mono-story {
      max-width: 70ch;
    }

    .template-minimal-brief .mono-story h2 {
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      font-size: 0.98rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-bottom: 1px solid #d6d8dd;
    }

    .template-minimal-brief .mono-footer-grid {
      gap: 8px;
    }

    .template-minimal-brief .mono-foot-card {
      border-radius: 8px;
      box-shadow: none;
    }

    .template-paperlight-journal .mono-mast {
      border-top: 3px solid #8a6a50;
      border-radius: 14px;
      background:
        linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-paperlight-journal .mono-story {
      max-width: 74ch;
      background:
        repeating-linear-gradient(
          to bottom,
          rgba(255, 253, 249, 0),
          rgba(255, 253, 249, 0) 33px,
          rgba(138, 106, 80, 0.06) 34px,
          rgba(138, 106, 80, 0.06) 35px
        );
      border-radius: 8px;
    }

    .template-paperlight-journal .mono-story h2 {
      font-family: "Playfair Display", "Newsreader", Georgia, serif;
      border-bottom: 1px solid #d8cabc;
    }

    .template-paperlight-journal .mono-foot-card {
      background: linear-gradient(180deg, rgba(255, 253, 249, 0.96), rgba(245, 238, 229, 0.92));
    }

    .template-editorial-zine .zine-mast {
      border-width: 3px;
      border-color: #b44343;
      background:
        linear-gradient(145deg, var(--surface), var(--surface-muted)),
        repeating-linear-gradient(-45deg, rgba(180, 67, 67, 0.1) 0 8px, transparent 8px 16px);
    }

    .template-editorial-zine .zine-title {
      font-size: clamp(2.15rem, 4.38vw, 3.58rem);
      letter-spacing: -0.02em;
    }

    .template-editorial-zine .zine-card {
      border-radius: 10px;
      border-color: #dec0c0;
    }

    .template-editorial-zine .zine-story h2 {
      background: rgba(180, 67, 67, 0.1);
      border-left-color: #b44343;
    }

    .template-editorial-zine .zine-story mark {
      background: rgba(180, 67, 67, 0.2);
    }

    .template-urban-notes .journal-mast {
      border-top: 3px solid #3f6a56;
      background:
        radial-gradient(circle at 92% 8%, rgba(195, 216, 204, 0.62), transparent 44%),
        linear-gradient(165deg, var(--surface), var(--surface-muted));
    }

    .template-urban-notes .journal-note:nth-child(1) {
      transform: rotate(-0.35deg);
    }

    .template-urban-notes .journal-note:nth-child(2) {
      transform: rotate(0.28deg);
    }

    .template-urban-notes .journal-note {
      border-left-color: #3f6a56;
      background:
        linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .template-urban-notes .journal-story h2::before {
      background: #3f6a56;
    }

    .template-noir-bulletin .wire-mast {
      border-top: 3px solid #7aa2ff;
      border-bottom: 1px solid rgba(122, 162, 255, 0.38);
      box-shadow: 0 22px 42px rgba(8, 12, 19, 0.5);
    }

    .template-noir-bulletin .wire-chip-row span {
      background: rgba(122, 162, 255, 0.14);
      border-color: rgba(122, 162, 255, 0.36);
      color: #d7e5ff;
    }

    .template-noir-bulletin .wire-story h2 {
      background: rgba(122, 162, 255, 0.18);
      border-left-color: #7aa2ff;
    }

    .template-noir-bulletin .wire-panel {
      border-radius: 10px;
      box-shadow: inset 0 0 0 1px rgba(122, 162, 255, 0.12);
    }

    .template-noir-bulletin .wire-cover {
      filter: saturate(0.9) contrast(1.08);
    }

    body.theme-dark .template-city-gazette .newspaper-head,
    body.theme-dark .template-daily-chronicle .newspaper-head,
    body.theme-dark .template-heritage-broadsheet .newspaper-head,
    body.theme-dark .template-marble-times .newspaper-head {
      background: linear-gradient(170deg, rgba(34, 35, 38, 0.98), rgba(44, 46, 52, 0.94));
      border-top-color: var(--accent);
    }

    body.theme-dark .template-vintage-press .newspaper-head {
      background:
        linear-gradient(170deg, rgba(52, 40, 30, 0.98), rgba(63, 47, 35, 0.94)),
        repeating-linear-gradient(90deg, rgba(220, 187, 162, 0.12) 0 1px, transparent 1px 26px);
    }

    body.theme-dark .template-business-pulse .briefing-head,
    body.theme-dark .template-science-ledger .briefing-head {
      background: linear-gradient(155deg, rgba(26, 41, 58, 0.98), rgba(34, 53, 73, 0.94));
      border-top-color: var(--accent);
    }

    body.theme-dark .template-business-pulse .panel,
    body.theme-dark .template-science-ledger .panel {
      background: linear-gradient(180deg, rgba(26, 41, 58, 0.98), rgba(34, 53, 73, 0.92));
      border-color: #4a607c;
    }

    body.theme-dark .template-business-pulse .story p,
    body.theme-dark .template-science-ledger .story p,
    body.theme-dark .template-business-pulse .story li,
    body.theme-dark .template-science-ledger .story li {
      color: #e3edf8;
    }

    body.theme-dark .template-modern-feature .hero,
    body.theme-dark .template-portrait-weekly .hero,
    body.theme-dark .template-copper-review .hero,
    body.theme-dark .template-indigo-observer .hero {
      background: linear-gradient(160deg, rgba(28, 34, 49, 0.98), rgba(37, 46, 66, 0.94));
    }

    body.theme-dark .template-coastal-magazine .spotlight-copy,
    body.theme-dark .template-canvas-weekend .spotlight-copy {
      background: linear-gradient(180deg, rgba(27, 40, 44, 0.97), rgba(36, 54, 59, 0.94));
    }

    body.theme-dark .template-coastal-magazine .headline,
    body.theme-dark .template-canvas-weekend .headline {
      color: #eaf6f6;
    }

    body.theme-dark .template-travel-atlas .immersive-head,
    body.theme-dark .template-photo-chronicle .immersive-head {
      background: linear-gradient(150deg, rgba(32, 40, 53, 0.98), rgba(41, 52, 70, 0.94));
    }

    body.theme-dark .template-travel-atlas .quote-panel,
    body.theme-dark .template-photo-chronicle .quote-panel,
    body.theme-dark .template-travel-atlas .highlight-band,
    body.theme-dark .template-photo-chronicle .highlight-band,
    body.theme-dark .template-travel-atlas .tag-band,
    body.theme-dark .template-photo-chronicle .tag-band {
      background: linear-gradient(180deg, rgba(24, 35, 49, 0.98), rgba(33, 47, 66, 0.92));
      border-color: #455b79;
    }

    body.theme-dark .template-minimal-brief .hero,
    body.theme-dark .template-paperlight-journal .hero,
    body.theme-dark .template-editorial-zine .hero {
      background: linear-gradient(180deg, rgba(35, 36, 41, 0.98), rgba(45, 47, 54, 0.94));
    }

    body.theme-dark .template-minimal-brief .story p,
    body.theme-dark .template-paperlight-journal .story p,
    body.theme-dark .template-editorial-zine .story p {
      color: #e9edf5;
    }

    body.theme-dark .template-urban-notes .notebook-page {
      background:
        repeating-linear-gradient(
          to bottom,
          rgba(32, 42, 38, 0.98),
          rgba(32, 42, 38, 0.98) 31px,
          rgba(41, 53, 48, 0.98) 32px,
          rgba(41, 53, 48, 0.98) 33px
        );
      box-shadow: inset 40px 0 0 rgba(108, 162, 136, 0.14);
    }

    body.theme-dark .template-urban-notes .note-card {
      background: linear-gradient(180deg, rgba(33, 45, 40, 0.98), rgba(42, 57, 51, 0.92));
      border-color: #4b665a;
    }

    body.theme-dark .template-noir-bulletin .briefing-head {
      background: linear-gradient(145deg, rgba(26, 33, 46, 0.98), rgba(34, 43, 59, 0.94));
    }

    body.theme-dark .template-noir-bulletin .panel,
    body.theme-dark .template-noir-bulletin .reader-shell {
      background: linear-gradient(180deg, rgba(24, 30, 42, 0.98), rgba(32, 40, 55, 0.93));
      border-color: #4a5d80;
    }

    body.theme-dark .template-noir-bulletin .reader-btn {
      border-color: #53688f;
      color: #dbe7ff;
    }

    body.theme-dark .template-noir-bulletin .reader-btn-primary {
      color: #0f1420;
    }

    body.theme-dark .template-indigo-observer .story h2 {
      background: rgba(118, 131, 240, 0.24);
      color: #dbe2ff;
      border-left-color: #7683f0;
    }

    body.theme-dark .template-paperlight-journal .story h2,
    body.theme-dark .template-marble-times .story h2 {
      color: #e6ecf6;
    }

    body.theme-dark .template-canvas-weekend .story p,
    body.theme-dark .template-canvas-weekend .story li,
    body.theme-dark .template-canvas-weekend .story blockquote {
      color: #f4e9df;
    }

    body.theme-dark .frame-card {
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.46);
    }

    body.theme-dark .reader-toolbar,
    body.theme-dark .reader-volume-wrap {
      background: rgba(255, 255, 255, 0.04);
    }

    body.theme-dark .reader-btn {
      background: rgba(255, 255, 255, 0.07);
      border-color: var(--border);
      color: var(--text);
    }

    body.theme-dark .reader-btn-primary {
      background: var(--accent);
      color: #111;
      border-color: transparent;
    }

    body.theme-dark .story mark {
      background: rgba(255, 255, 255, 0.12);
      color: var(--ink);
    }

    body.theme-dark .story code {
      background: rgba(255, 255, 255, 0.09);
      border-color: var(--border);
      color: #f6f9ff;
    }

    body.theme-dark .story a {
      color: var(--ink);
      text-decoration-color: var(--accent);
    }

    body.theme-dark .point-list li,
    body.theme-dark .tag-pill {
      background: rgba(255, 255, 255, 0.05);
    }

    body.theme-dark .cover figcaption {
      background: rgba(0, 0, 0, 0.45);
      color: #f4f7ff;
    }

    body.theme-dark .story-page {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
        var(--surface);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    }

    body.theme-dark .template-metropolitan-ledger .newspaper-head {
      background: linear-gradient(170deg, rgba(41, 31, 24, 0.98), rgba(51, 38, 29, 0.94));
    }

    body.theme-dark .template-metropolitan-ledger .headline {
      color: #ffe3cc;
    }

    body.theme-dark .template-metropolitan-ledger .deck {
      color: #d9c4b0;
    }

    body.theme-dark .template-morning-bulletin .briefing-head {
      background: linear-gradient(145deg, rgba(29, 43, 67, 0.98), rgba(37, 55, 84, 0.94));
      border-left-color: #7fa5ff;
    }

    body.theme-dark .template-morning-bulletin .story h2 {
      background: rgba(127, 165, 255, 0.2);
      color: #d8e6ff;
      border-left-color: #7fa5ff;
    }

    body.theme-dark .template-harbor-review .hero {
      background: linear-gradient(160deg, rgba(33, 49, 43, 0.98), rgba(40, 60, 52, 0.94));
    }

    body.theme-dark .template-harbor-review .story h2 {
      color: #bde9df;
    }

    body.theme-dark .template-harbor-review .tag-pill {
      background: rgba(111, 183, 173, 0.2);
      border-color: #4d7a73;
      color: #dff6f1;
    }

    body.theme-dark .template-atlas-feature .spotlight-copy {
      background: linear-gradient(180deg, rgba(27, 36, 51, 0.97), rgba(37, 50, 70, 0.94));
    }

    body.theme-dark .template-atlas-feature .story blockquote {
      background: linear-gradient(135deg, rgba(224, 154, 104, 0.16), rgba(255, 255, 255, 0.05));
    }

    body.theme-dark .template-ember-essay .hero {
      background: linear-gradient(180deg, rgba(38, 29, 23, 0.96), rgba(49, 38, 30, 0.94));
    }

    body.theme-dark .template-ember-essay .story h2::after {
      background: linear-gradient(90deg, var(--accent), rgba(255, 255, 255, 0.06));
    }

    body.theme-dark .template-eclipse-report .spotlight-copy {
      background: linear-gradient(180deg, rgba(11, 22, 35, 0.95), rgba(20, 34, 50, 0.92));
      border-color: var(--border);
    }

    body.theme-dark .template-eclipse-report .eyebrow {
      color: #ffbe74;
    }

    body.theme-dark .template-eclipse-report .headline {
      color: #f4f9ff;
    }

    body.theme-dark .template-eclipse-report .deck {
      color: #cfdeee;
    }

    body.theme-dark .template-eclipse-report .reader-toolbar {
      background: #101f30;
      border-color: #35506a;
    }

    body.theme-dark .template-eclipse-report .reader-btn {
      background: #172a3d;
      border-color: #3a5571;
      color: #deebfa;
    }

    body.theme-dark .template-eclipse-report .reader-btn-primary {
      background: #f2a04f;
      color: #122031;
      border-color: transparent;
    }

    body.theme-dark .template-eclipse-report .story h2 {
      color: #ffdcb0;
      border-bottom-color: #35506a;
    }

    body.theme-dark .template-eclipse-report .story p,
    body.theme-dark .template-eclipse-report .story li,
    body.theme-dark .template-eclipse-report .story blockquote {
      color: #e8f2ff;
    }

    body.theme-dark .template-eclipse-report .reader-shell {
      background: linear-gradient(180deg, rgba(16, 29, 44, 0.98), rgba(23, 40, 58, 0.94));
      border-color: #405b75;
    }

    body.theme-dark .template-eclipse-report .reader-status {
      color: #bfd0e4;
    }

    body.theme-dark .template-eclipse-report .story strong {
      color: #f6fbff;
    }

    body.theme-dark .template-eclipse-report .story a {
      color: #ffd7ab;
    }

    body.theme-dark .template-eclipse-report .story mark {
      background: rgba(242, 160, 79, 0.28);
      color: #fff7e9;
    }

    body.theme-dark .template-meadow-letter .notebook-page {
      background:
        repeating-linear-gradient(
          to bottom,
          rgba(29, 42, 34, 0.98),
          rgba(29, 42, 34, 0.98) 31px,
          rgba(38, 54, 43, 0.98) 32px,
          rgba(38, 54, 43, 0.98) 33px
        );
      box-shadow: inset 40px 0 0 rgba(129, 193, 124, 0.12);
    }

    body.theme-dark .template-meadow-letter .note-card {
      background: linear-gradient(180deg, rgba(32, 50, 40, 0.98), rgba(40, 62, 50, 0.94)) !important;
      border-color: #42624d !important;
      border-left: 3px solid rgba(126, 183, 121, 0.56);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.28);
    }

    body.theme-dark .template-meadow-letter .note-card h3 {
      color: #9ed8a1;
    }

    body.theme-dark .template-meadow-letter .note-card p {
      color: #e3efe3;
    }

    body.theme-dark .template-wireframe-journal .briefing-head {
      background:
        linear-gradient(145deg, rgba(26, 38, 63, 0.98), rgba(35, 52, 84, 0.94)),
        linear-gradient(90deg, rgba(126, 156, 255, 0.16) 1px, transparent 1px);
      background-size: auto, 28px 28px;
    }

    body.theme-dark .template-wireframe-journal .point-list li {
      border-color: rgba(126, 156, 255, 0.32);
      background: rgba(255, 255, 255, 0.04);
    }

    body.theme-dark .template-sunrise-weekend .spotlight-copy {
      background: linear-gradient(180deg, rgba(45, 33, 25, 0.96), rgba(56, 42, 31, 0.94)) !important;
    }

    body.theme-dark .template-sunrise-weekend .deck {
      color: #dfcbb8;
    }

    body.theme-dark .template-sunrise-weekend .headline {
      color: #ffe6cc;
    }

    body.theme-dark .template-sunrise-weekend .meta-row {
      color: #d9c1ae;
    }

    body.theme-dark .template-sunrise-weekend .reader-shell {
      background: linear-gradient(180deg, rgba(42, 30, 22, 0.98), rgba(55, 40, 28, 0.95)) !important;
      border-color: #6d503b !important;
    }

    body.theme-dark .template-sunrise-weekend .reader-toolbar {
      background: rgba(255, 208, 166, 0.08);
      border-bottom-color: #7a5a43;
    }

    body.theme-dark .template-sunrise-weekend .reader-btn {
      background: rgba(255, 255, 255, 0.06);
      border-color: #7a5a43;
      color: #f8e8db;
    }

    body.theme-dark .template-sunrise-weekend .reader-btn-primary {
      background: #f19a57;
      color: #2c1d14;
      border-color: transparent;
    }

    body.theme-dark .template-sunrise-weekend .reader-status {
      color: #e3cfba;
    }

    body.theme-dark .template-sunrise-weekend .story h2 {
      color: #ffd5b1;
      border-left-color: #f19a57;
    }

    body.theme-dark .template-sunrise-weekend .story p,
    body.theme-dark .template-sunrise-weekend .story li,
    body.theme-dark .template-sunrise-weekend .story blockquote {
      color: #f8ecdf;
    }

    body.theme-dark .template-sunrise-weekend .story mark {
      background: rgba(241, 154, 87, 0.28);
      color: #fff3e4;
    }

    body.theme-dark .template-iron-column .newspaper-head {
      background: linear-gradient(170deg, rgba(44, 31, 31, 0.98), rgba(56, 40, 40, 0.95)) !important;
      border-top-color: var(--accent);
      border-bottom-color: var(--accent);
    }

    body.theme-dark .template-iron-column .newspaper-top {
      color: var(--ink);
    }

    body.theme-dark .template-iron-column .headline {
      color: #ffecec;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4), 0 10px 22px rgba(0, 0, 0, 0.24);
    }

    body.theme-dark .template-iron-column .deck {
      color: #f0dbdb;
    }

    body.theme-dark .template-iron-column .meta-row {
      color: #e2cdcd;
    }

    body.theme-dark .template-granite-digest .briefing-head {
      background:
        linear-gradient(155deg, rgba(28, 42, 51, 0.98), rgba(36, 55, 66, 0.94)),
        linear-gradient(90deg, rgba(127, 182, 207, 0.16) 1px, transparent 1px);
      background-size: auto, 24px 24px;
    }

    body.theme-dark .template-granite-digest .panel {
      background: linear-gradient(180deg, rgba(28, 42, 51, 0.98), rgba(36, 55, 66, 0.92)) !important;
    }

    body.theme-dark .template-granite-digest .reader-shell {
      background: linear-gradient(180deg, rgba(28, 42, 51, 0.98), rgba(36, 55, 66, 0.94)) !important;
      border-color: #49687c !important;
    }

    body.theme-dark .template-granite-digest .reader-toolbar {
      background: rgba(159, 210, 234, 0.08);
      border-bottom-color: #4b6a7e;
    }

    body.theme-dark .template-granite-digest .reader-btn {
      background: rgba(255, 255, 255, 0.06);
      border-color: #5b7b90;
      color: #e8f2f8;
    }

    body.theme-dark .template-granite-digest .reader-status {
      color: #c9dbe6;
    }

    body.theme-dark .template-granite-digest .story h2 {
      background: rgba(127, 182, 207, 0.2);
      color: #d8ecf6;
      border-left-color: #7fb6cf;
    }

    body.theme-dark .template-granite-digest .story p,
    body.theme-dark .template-granite-digest .story li,
    body.theme-dark .template-granite-digest .story blockquote {
      color: #edf5fa;
    }

    body.theme-dark .template-granite-digest .panel h3 {
      color: #9fd2ea;
    }

    body.theme-dark .template-granite-digest .meta-list li {
      color: #bfd2dd;
      border-bottom-color: rgba(127, 182, 207, 0.28);
    }

    body.theme-dark .template-granite-digest .meta-list li strong {
      color: #ecf7fc;
    }

    body.theme-dark .template-granite-digest .point-list {
      color: #e3edf3;
    }

    body.theme-dark .template-granite-digest .point-list li {
      background: rgba(127, 182, 207, 0.14);
      border-color: rgba(127, 182, 207, 0.34);
    }

    body.theme-dark .template-granite-digest .tag-pill {
      background: rgba(127, 182, 207, 0.18);
      border-color: #4f6f83;
      color: #e8f7ff;
    }

    body.theme-dark .template-civic-observer .hero {
      background: linear-gradient(160deg, rgba(26, 44, 57, 0.98), rgba(35, 56, 71, 0.94));
    }

    body.theme-dark .template-civic-observer .panel {
      background: linear-gradient(180deg, rgba(26, 44, 57, 0.98), rgba(35, 56, 71, 0.92)) !important;
      border-color: #4a6a7f !important;
    }

    body.theme-dark .template-civic-observer .panel h3 {
      color: #9ec8df;
    }

    body.theme-dark .template-civic-observer .meta-list li {
      color: #d2e2ec;
      border-bottom-color: rgba(110, 168, 198, 0.3);
    }

    body.theme-dark .template-civic-observer .meta-list li strong {
      color: #f5fbff;
    }

    body.theme-dark .template-civic-observer .point-list {
      color: #eef7fc;
    }

    body.theme-dark .template-civic-observer .tag-pill {
      background: rgba(110, 168, 198, 0.2);
      border-color: #4a6b80 !important;
      color: #eff8fd;
    }

    body.theme-dark .template-civic-observer .story p,
    body.theme-dark .template-civic-observer .story li,
    body.theme-dark .template-civic-observer .story blockquote {
      color: #e6f1f7;
    }

    body.theme-dark .template-atelier-notes .notebook-page {
      background:
        repeating-linear-gradient(
          to bottom,
          rgba(42, 34, 28, 0.98),
          rgba(42, 34, 28, 0.98) 31px,
          rgba(52, 43, 34, 0.98) 32px,
          rgba(52, 43, 34, 0.98) 33px
        );
      box-shadow: inset 44px 0 0 rgba(208, 135, 94, 0.12);
    }

    body.theme-dark .template-atelier-notes .note-card {
      background: linear-gradient(180deg, rgba(45, 35, 27, 0.98), rgba(58, 46, 35, 0.92)) !important;
      border-color: #6b5240 !important;
      border-left: 3px solid rgba(197, 141, 105, 0.55);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    }

    body.theme-dark .template-atelier-notes .note-card h3 {
      color: #e0b38e;
    }

    body.theme-dark .template-atelier-notes .note-card p {
      color: #f3e7dd;
    }

    body.theme-dark .template-nightwire-deep .eyebrow {
      color: #9fd4ff;
    }

    body.theme-dark .template-nightwire-deep .headline {
      color: #eaf4ff;
    }

    body.theme-dark .template-nightwire-deep .deck {
      color: #bfd3e8;
    }

    body.theme-dark .template-nightwire-deep .quote-panel,
    body.theme-dark .template-nightwire-deep .highlight-band,
    body.theme-dark .template-nightwire-deep .tag-band {
      background: linear-gradient(180deg, rgba(19, 35, 52, 0.98), rgba(28, 48, 68, 0.92));
      border-color: var(--border);
    }

    body.theme-dark .template-nightwire-deep .reader-btn {
      background: #182b3d;
      border-color: #35556d;
      color: #dce9f8;
    }

    body.theme-dark .template-nightwire-deep .reader-btn-primary {
      background: #67b8ff;
      color: #101d2c;
      border-color: transparent;
    }

    body.theme-dark .template-nightwire-deep .story h2 {
      color: #a7d7ff;
      border-bottom-color: #335067;
    }

    body.theme-dark .template-nightwire-deep .story p,
    body.theme-dark .template-nightwire-deep .story li,
    body.theme-dark .template-nightwire-deep .story blockquote {
      color: #d8e7f8;
    }

    body.theme-dark .template-nightwire-deep .story mark {
      background: rgba(103, 184, 255, 0.24);
      color: #ecf7ff;
    }

    body.theme-dark .template-nightwire-deep .tag-pill {
      background: rgba(103, 184, 255, 0.2);
      border-color: #396180;
      color: #dff1ff;
    }

    body.theme-dark .style-newspaper .reader-shell,
    body.theme-dark .style-ledger-grid .reader-shell {
      background:
        linear-gradient(180deg, rgba(14, 19, 28, 0.96), rgba(19, 26, 37, 0.94)),
        repeating-linear-gradient(90deg, rgba(140, 160, 189, 0.14) 0 1px, transparent 1px 24px),
        var(--surface);
    }

    body.theme-dark .style-newspaper .story p,
    body.theme-dark .style-ledger-grid .story p,
    body.theme-dark .style-newspaper .story li,
    body.theme-dark .style-ledger-grid .story li,
    body.theme-dark .style-newspaper .story blockquote,
    body.theme-dark .style-ledger-grid .story blockquote {
      color: #e2e9f2;
    }

    body.theme-dark .style-notebook .reader-shell,
    body.theme-dark .style-journal-cards .reader-shell {
      background:
        linear-gradient(180deg, rgba(25, 31, 22, 0.96), rgba(34, 42, 31, 0.93)),
        repeating-linear-gradient(to bottom, rgba(197, 215, 183, 0.12), rgba(197, 215, 183, 0.12) 1px, transparent 1px, transparent 34px),
        var(--surface);
    }

    body.theme-dark .style-column .reader-shell,
    body.theme-dark .style-mono-column .reader-shell,
    body.theme-dark .style-immersive .reader-shell,
    body.theme-dark .style-visual-journey .reader-shell {
      background:
        linear-gradient(180deg, rgba(22, 28, 37, 0.98), rgba(30, 38, 50, 0.94)),
        var(--surface);
    }

    body.theme-dark .style-feature-mosaic .reader-shell,
    body.theme-dark .style-spotlight .reader-shell {
      background:
        radial-gradient(circle at 96% 8%, rgba(243, 177, 120, 0.2), transparent 42%),
        linear-gradient(180deg, rgba(26, 23, 20, 0.98), rgba(35, 30, 25, 0.95));
    }

    body.theme-dark .style-feature-mosaic .story p:first-of-type::first-letter,
    body.theme-dark .style-spotlight .story p:first-of-type::first-letter {
      color: #ffd4ac;
    }

    body.theme-dark.template-eclipse-report .panel {
      background: linear-gradient(180deg, rgba(16, 30, 45, 0.98), rgba(24, 42, 61, 0.94));
      border-color: #3f5a74;
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.32);
    }

    body.theme-dark.template-eclipse-report .panel h3 {
      color: #ffbe74;
    }

    body.theme-dark.template-eclipse-report .meta-list li {
      color: #cad9ea;
      border-bottom-color: rgba(120, 157, 192, 0.34);
    }

    body.theme-dark.template-eclipse-report .meta-list li strong,
    body.theme-dark.template-eclipse-report .point-list,
    body.theme-dark.template-eclipse-report .panel p {
      color: #e9f4ff;
    }

    body.theme-dark.template-eclipse-report .tag-pill {
      background: rgba(242, 160, 79, 0.22);
      border-color: #6f553f;
      color: #fff2df;
    }

    body.theme-dark.template-meadow-letter .notebook-hero {
      background:
        radial-gradient(circle at 88% 8%, rgba(114, 172, 108, 0.28), transparent 44%),
        linear-gradient(165deg, rgba(28, 42, 34, 0.98), rgba(35, 52, 41, 0.95));
      border-top-color: #6ea36a;
    }

    body.theme-dark.template-meadow-letter .notebook-rail .panel:not(.note-card) {
      background: linear-gradient(180deg, rgba(31, 49, 39, 0.98), rgba(38, 60, 47, 0.94));
      border-color: #44644f;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    }

    body.theme-dark.template-meadow-letter .notebook-rail .panel:not(.note-card) h3 {
      color: #a6dca6;
    }

    body.theme-dark.template-meadow-letter .notebook-rail .tag-pill {
      background: rgba(118, 178, 114, 0.22);
      border-color: #4f7358;
      color: #ecf8ed;
    }

    body.theme-dark.template-sunrise-weekend .spotlight-copy {
      background:
        linear-gradient(180deg, rgba(46, 33, 24, 0.98), rgba(59, 43, 31, 0.95)),
        radial-gradient(circle at 90% 8%, rgba(241, 154, 87, 0.2), transparent 46%) !important;
      border-left: 1px solid rgba(241, 154, 87, 0.34);
    }

    body.theme-dark.template-sunrise-weekend .rail .panel {
      background: linear-gradient(180deg, rgba(45, 33, 24, 0.98), rgba(56, 41, 29, 0.94));
      border-color: #7a5a43;
    }

    body.theme-dark.template-sunrise-weekend .meta-list li {
      color: #e5cfbc;
      border-bottom-color: rgba(241, 154, 87, 0.26);
    }

    body.theme-dark.template-sunrise-weekend .meta-list li strong,
    body.theme-dark.template-sunrise-weekend .point-list,
    body.theme-dark.template-sunrise-weekend .panel p {
      color: #fbecdd;
    }

    body.theme-dark.template-sunrise-weekend .tag-pill {
      background: rgba(241, 154, 87, 0.22);
      border-color: #815d44;
      color: #fff3e6;
    }

    body.theme-dark.template-iron-column .newspaper-head {
      background:
        linear-gradient(170deg, rgba(45, 30, 30, 0.98), rgba(58, 40, 40, 0.95)),
        linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px 26px) !important;
      background-size: auto, 26px 100% !important;
      border-color: #9b5e5e;
      box-shadow: 0 16px 34px rgba(0, 0, 0, 0.34);
    }

    body.theme-dark.template-iron-column .newspaper-top,
    body.theme-dark.template-iron-column .meta-row {
      color: #f0d6d6;
    }

    body.theme-dark.template-iron-column .deck {
      color: #f2dbdb;
    }

    body.theme-dark.template-granite-digest .rail .panel {
      background: linear-gradient(180deg, rgba(27, 43, 54, 0.98), rgba(36, 56, 69, 0.94)) !important;
      border-color: #55778f !important;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    }

    body.theme-dark.template-granite-digest .panel p,
    body.theme-dark.template-granite-digest .point-list li {
      color: #e9f4fb;
    }

    body.theme-dark.template-granite-digest .point-list li {
      background: rgba(127, 182, 207, 0.14);
      border-color: rgba(127, 182, 207, 0.36);
    }

    body.theme-dark.template-granite-digest .tag-empty {
      color: #d2e5f2;
    }

    body.theme-dark.template-atelier-notes .notebook-hero {
      background:
        radial-gradient(circle at 8% 0%, rgba(188, 128, 88, 0.28), transparent 42%),
        linear-gradient(170deg, rgba(41, 33, 27, 0.98), rgba(50, 40, 32, 0.95));
      border-top-color: #a97049;
    }

    body.theme-dark.template-atelier-notes .notebook-rail .panel:not(.note-card) {
      background: linear-gradient(180deg, rgba(44, 35, 28, 0.98), rgba(56, 45, 36, 0.93));
      border-color: #755845;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
    }

    body.theme-dark.template-atelier-notes .notebook-rail .panel:not(.note-card) h3 {
      color: #e3b693;
    }

    body.theme-dark.template-atelier-notes .notebook-rail .tag-pill {
      background: rgba(195, 141, 105, 0.2);
      border-color: #7f604a;
      color: #f8ece3;
    }

    .template-custom-studio .hero {
      box-shadow: inset 0 0 0 1px var(--border);
    }

    .custom-canvas-shell {
      padding: 0;
      margin: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
      border-radius: 0;
    }

    .custom-canvas-page {
      display: grid;
      grid-template-columns: repeat(var(--studio-grid-columns, 12), minmax(0, 1fr));
      grid-auto-rows: minmax(var(--studio-row-height, 30px), auto);
      gap: 0;
      margin: 0;
      min-height: calc(var(--studio-grid-rows, 28) * var(--studio-row-height, 30px));
      position: relative;
    }

    .custom-studio-block {
      border-radius: var(--studio-block-radius, 16px);
      border: 0;
      background: var(--studio-block-shell-bg, var(--surface));
      color: var(--studio-block-text, var(--text));
      padding: 0;
      margin: 0;
      font-size: clamp(0.88rem, calc(0.82rem * var(--studio-block-font-scale, 1)), 1.2rem);
      overflow: visible;
      position: relative;
      box-shadow: none;
      container-type: inline-size;
    }

    .custom-studio-block[data-shape]:not([data-shape="rect"]) {
      clip-path: var(--studio-block-shape-clip, none);
      border-radius: 0;
    }

    .custom-studio-block.align-center {
      text-align: center;
    }

    .custom-studio-block.align-right {
      text-align: right;
    }

    .custom-studio-block-inner {
      min-height: 100%;
      height: 100%;
      border-radius: calc(var(--studio-block-radius, 16px) - 5px);
      background: var(--studio-block-content-bg, var(--surface-muted));
      padding: 0;
      margin: 0;
      box-shadow: none;
      overflow: visible;
    }

    .custom-studio-block[data-shape]:not([data-shape="rect"]) .custom-studio-block-inner {
      clip-path: var(--studio-block-shape-clip, none);
      border-radius: 0;
    }

    .custom-studio-block h1,
    .custom-studio-block h2,
    .custom-studio-block h3 {
      margin-top: 0;
      color: inherit;
    }

    .custom-studio-block p,
    .custom-studio-block li,
    .custom-studio-block blockquote,
    .custom-studio-block cite,
    .custom-studio-block span,
    .custom-studio-block strong {
      color: inherit;
    }

    .custom-studio-block.underline-solid h1,
    .custom-studio-block.underline-solid h2,
    .custom-studio-block.underline-solid h3,
    .custom-studio-block.underline-solid .custom-studio-headline {
      text-decoration: underline;
      text-decoration-color: var(--studio-block-underline, var(--accent));
      text-underline-offset: 0.28em;
    }

    .custom-studio-block.underline-dashed h1,
    .custom-studio-block.underline-dashed h2,
    .custom-studio-block.underline-dashed h3,
    .custom-studio-block.underline-dashed .custom-studio-headline {
      text-decoration: underline dashed;
      text-decoration-color: var(--studio-block-underline, var(--accent));
      text-underline-offset: 0.28em;
    }

    .custom-studio-block.underline-wavy h1,
    .custom-studio-block.underline-wavy h2,
    .custom-studio-block.underline-wavy h3,
    .custom-studio-block.underline-wavy .custom-studio-headline {
      text-decoration: underline wavy;
      text-decoration-color: var(--studio-block-underline, var(--accent));
      text-underline-offset: 0.3em;
    }

    .custom-studio-block.underline-highlight h1,
    .custom-studio-block.underline-highlight h2,
    .custom-studio-block.underline-highlight h3,
    .custom-studio-block.underline-highlight .custom-studio-headline {
      display: inline;
      box-decoration-break: clone;
      background: linear-gradient(180deg, transparent 58%, var(--studio-block-underline, var(--accent-soft)) 58%);
      padding-inline: 0.08em;
    }

    .custom-studio-title-wrap {
      display: grid;
      gap: clamp(8px, 1.3cqi, 14px);
      height: 100%;
      align-content: start;
      min-width: 0;
    }

    .custom-studio-article-logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: clamp(38px, 5.2cqi, 58px);
      aspect-ratio: 1;
      margin-bottom: clamp(1px, 0.45cqi, 4px);
      pointer-events: none;
      user-select: none;
    }

    .custom-studio-block.align-center .custom-studio-article-logo {
      justify-self: center;
    }

    .custom-studio-block.align-right .custom-studio-article-logo {
      justify-self: end;
    }

    .custom-studio-article-logo-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0.94;
      filter: drop-shadow(0 8px 16px color-mix(in srgb, var(--ink) 12%, transparent 88%));
    }

    .custom-studio-article-logo-light {
      display: none;
    }

    body.theme-dark .custom-studio-article-logo-dark {
      display: none;
    }

    body.theme-dark .custom-studio-article-logo-light {
      display: block;
      filter:
        drop-shadow(0 1px 0 rgba(15, 23, 20, 0.6))
        drop-shadow(1px 0 0 rgba(15, 23, 20, 0.42))
        drop-shadow(-1px 0 0 rgba(15, 23, 20, 0.42))
        drop-shadow(0 8px 16px rgba(0, 0, 0, 0.22));
    }

    @media (prefers-color-scheme: dark) {
      body.theme-auto .custom-studio-article-logo-dark {
        display: none;
      }

      body.theme-auto .custom-studio-article-logo-light {
        display: block;
        filter:
          drop-shadow(0 1px 0 rgba(15, 23, 20, 0.6))
          drop-shadow(1px 0 0 rgba(15, 23, 20, 0.42))
          drop-shadow(-1px 0 0 rgba(15, 23, 20, 0.42))
          drop-shadow(0 8px 16px rgba(0, 0, 0, 0.22));
      }
    }

    .custom-studio-kicker {
      margin: 0;
      font-size: clamp(0.68rem, 2.2cqi, 0.82rem);
      text-transform: uppercase;
      letter-spacing: 0;
      opacity: 0.78;
      font-weight: 700;
    }

    .custom-studio-headline {
      margin: 0;
      font-family: var(--title-font);
      font-size: clamp(1.7rem, 11cqi, 5.4rem);
      line-height: 0.96;
      letter-spacing: 0;
      max-width: 17ch;
      text-wrap: balance;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    .custom-studio-deck {
      margin: 0;
      max-width: 72ch;
      font-size: clamp(0.94rem, 3.1cqi, 1.24rem);
      line-height: 1.55;
      opacity: 0.88;
      overflow-wrap: break-word;
    }

    .custom-studio-meta {
      margin: 0;
      padding: 0 0 0 clamp(12px, 3.2cqi, 28px);
      list-style: none;
      display: grid;
      gap: 0;
      height: 100%;
      align-content: start;
      border-left: 1px solid color-mix(in srgb, var(--studio-block-border, var(--border)) 74%, transparent 26%);
    }

    .custom-studio-meta li {
      display: grid;
      grid-template-columns: minmax(72px, 0.65fr) minmax(0, 1fr);
      align-items: center;
      gap: clamp(8px, 2cqi, 16px);
      border-bottom: 1px solid color-mix(in srgb, var(--studio-block-border, var(--border)) 56%, transparent 44%);
      padding: clamp(7px, 1.4cqi, 12px) 0;
      font-size: clamp(0.78rem, 2.5cqi, 0.96rem);
      min-width: 0;
    }

    .custom-studio-meta li span {
      opacity: 0.72;
    }

    .custom-studio-meta li strong {
      font-weight: 700;
      min-width: 0;
      text-align: right;
      overflow-wrap: break-word;
    }

    .custom-studio-image,
    .custom-studio-gallery,
    .custom-studio-collage,
    .custom-studio-image-fallback {
      margin: 0;
      border-radius: clamp(10px, 1.4cqi, 22px);
      overflow: hidden;
      min-height: 100%;
      height: 100%;
      border: 0;
      background: color-mix(in srgb, var(--studio-block-content-bg, var(--surface)) 84%, black 16%);
      display: grid;
      place-items: center;
      position: relative;
      box-shadow: 0 18px 42px color-mix(in srgb, var(--ink) 18%, transparent 82%);
    }

    .custom-studio-image img,
    .custom-studio-gallery img,
    .custom-studio-collage img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .custom-studio-gallery {
      grid-template-rows: 1fr auto;
      align-content: stretch;
    }

    .custom-studio-gallery-track {
      display: grid;
      gap: clamp(6px, 1.2cqi, 10px);
      height: 100%;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      align-content: stretch;
    }

    .custom-studio-gallery-track img {
      border-radius: 10px;
      min-height: 96px;
    }

    .custom-studio-collage {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(80px, 1fr)) auto;
      gap: clamp(6px, 1.2cqi, 10px);
      align-content: stretch;
      padding: clamp(6px, 1.2cqi, 10px);
    }

    .custom-studio-collage-cell {
      overflow: hidden;
      border-radius: 10px;
      min-height: 82px;
    }

    .custom-studio-collage-cell-1 {
      grid-column: 1 / span 2;
      grid-row: 1 / span 2;
    }

    .custom-studio-collage-cell-2 {
      grid-column: 3;
      grid-row: 1;
    }

    .custom-studio-collage-cell-3 {
      grid-column: 3;
      grid-row: 2;
    }

    .custom-studio-collage-cell-4 {
      grid-column: 1 / span 3;
      grid-row: 3;
      min-height: 84px;
    }

    .custom-studio-image-fallback p {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 0.72rem;
      opacity: 0.78;
    }

    .custom-studio-caption {
      margin: 0;
      width: 100%;
      font-size: 0.72rem;
      line-height: 1.4;
      letter-spacing: 0.03em;
      color: color-mix(in srgb, var(--studio-block-text, var(--text)) 86%, white 14%);
    }

    .custom-studio-caption-strip {
      padding: 7px 10px;
      background: color-mix(in srgb, var(--studio-block-content-bg, var(--surface)) 64%, black 36%);
      border-top: 1px solid color-mix(in srgb, var(--studio-block-border, var(--border)) 80%, transparent 20%);
    }

    .custom-studio-caption-boxed {
      position: absolute;
      right: 10px;
      bottom: 10px;
      max-width: min(86%, 380px);
      padding: 6px 10px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--studio-block-content-bg, var(--surface)) 48%, black 52%);
      border: 1px solid color-mix(in srgb, var(--studio-block-border, var(--border)) 82%, transparent 18%);
    }

    .custom-studio-caption-minimal {
      margin-top: 6px;
      opacity: 0.82;
      text-align: left;
    }

    .custom-studio-list-wrap h3,
    .custom-studio-tags-wrap h3 {
      margin: 0 0 10px;
      font-family: var(--title-font);
      font-size: 1.04rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .custom-studio-list {
      margin: 0;
      padding-left: 1.2rem;
      display: grid;
      gap: 8px;
      line-height: 1.5;
    }

    .custom-studio-tags-wrap .tag-wrap {
      gap: 8px;
    }

    .custom-studio-type-product-tags {
      border: 0;
      background: transparent;
      padding: 0;
      box-shadow: none;
      overflow: visible;
    }

    .custom-studio-type-product-tags .custom-studio-block-inner {
      background: transparent;
      box-shadow: none;
      overflow: visible;
      padding: 0;
    }

    .custom-product-tag-placeholder {
      min-height: 100%;
      display: grid;
      place-items: center;
      gap: 4px;
      border-radius: max(8px, calc(var(--studio-block-radius, 16px) - 6px));
      border: 1px dashed color-mix(in srgb, var(--studio-block-border, var(--border)) 78%, transparent 22%);
      background: transparent;
      padding: 8px;
      text-align: center;
    }

    .custom-product-tag-placeholder strong,
    .custom-product-tag-placeholder span {
      display: block;
    }

    .custom-product-tag-placeholder strong {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .custom-product-tag-placeholder span {
      font-size: 0.72rem;
      opacity: 0.76;
    }

    .custom-product-tag-anchor {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .custom-product-tag-overlay {
      position: relative;
      width: fit-content;
      max-width: 100%;
      color: #111827;
    }

    .custom-product-tag-summary {
      list-style: none;
      cursor: pointer;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      min-width: 74px;
      min-height: 42px;
      position: relative;
      outline: none;
    }

    .custom-product-tag-summary::-webkit-details-marker {
      display: none;
    }

    .custom-product-tag-summary:focus-visible .custom-product-tag-chip {
      outline: 2px solid color-mix(in srgb, var(--accent) 52%, transparent 48%);
      outline-offset: 3px;
    }

    .custom-product-tag-image {
      width: min(92px, 100%);
      max-height: 108px;
      object-fit: contain;
      transform: rotate(-5deg);
      pointer-events: none;
      filter: drop-shadow(0 14px 20px rgba(0, 0, 0, 0.28));
    }

    .custom-product-tag-chip {
      position: absolute;
      right: 0;
      bottom: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 0;
      background: transparent;
      padding: 0;
      font-size: 0.68rem;
      font-weight: 800;
      line-height: 1;
      color: var(--studio-block-text, var(--ink));
      text-shadow: 0 1px 2px color-mix(in srgb, var(--bg) 75%, transparent 25%);
      box-shadow: none;
      white-space: nowrap;
    }

    .custom-product-tag-panel {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      z-index: 80;
      width: min(18rem, 78vw);
      max-height: 320px;
      overflow: auto;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.36);
      background: #fff;
      color: #111827;
      padding: 8px;
      box-shadow: 0 24px 52px rgba(15, 23, 42, 0.28);
    }

    .custom-product-tag-overlay:not([open]) .custom-product-tag-panel {
      display: none;
    }

    .custom-product-tag-row {
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 9px;
      padding: 8px;
      color: inherit;
      text-decoration: none;
    }

    .custom-product-tag-row:hover {
      background: #f3f4f6;
    }

    .custom-product-tag-row img,
    .custom-product-tag-external-icon {
      width: 44px;
      height: 44px;
      flex: 0 0 auto;
      border-radius: 9px;
      background: #f3f4f6;
      object-fit: cover;
    }

    .custom-product-tag-external-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.64rem;
      font-weight: 800;
      color: #6b7280;
    }

    .custom-product-tag-row-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
      text-align: left;
    }

    .custom-product-tag-row-copy strong,
    .custom-product-tag-row-copy span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .custom-product-tag-row-copy strong {
      font-size: 0.82rem;
      color: #111827;
    }

    .custom-product-tag-row-copy span {
      font-size: 0.72rem;
      color: #6b7280;
    }

    .custom-product-tag-row-muted {
      color: #6b7280;
      cursor: default;
    }

    .custom-studio-quote {
      margin: 0;
      display: grid;
      gap: 14px;
      height: 100%;
      align-content: center;
    }

    .custom-studio-quote p {
      margin: 0;
      font-family: var(--title-font);
      font-size: clamp(1.02rem, 2.3vw, 1.4rem);
      font-style: italic;
      line-height: 1.45;
    }

    .custom-studio-quote cite {
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      opacity: 0.72;
      font-style: normal;
    }

    .template-custom-studio .custom-canvas-device-tablet.custom-canvas-shell {
      padding: 0;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-canvas-page {
      gap: 0;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-block {
      padding: 0;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-block-inner {
      padding: 0;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-headline {
      font-size: clamp(1.34rem, 10cqi, 3rem);
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-meta li {
      font-size: 0.84rem;
      gap: 8px;
    }

    .template-custom-studio .custom-canvas-device-mobile.custom-canvas-shell {
      padding: 0;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-canvas-page {
      gap: 0;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-block {
      padding: 0;
      font-size: clamp(0.84rem, calc(0.78rem * var(--studio-block-font-scale, 1)), 1rem);
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-block-inner {
      padding: 0;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-headline {
      font-size: clamp(1.16rem, 12cqi, 2.18rem);
      line-height: 1.12;
      letter-spacing: 0;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-deck,
    .template-custom-studio .custom-canvas-device-mobile .custom-studio-list,
    .template-custom-studio .custom-canvas-device-mobile .custom-studio-meta,
    .template-custom-studio .custom-canvas-device-mobile .custom-studio-tags-wrap,
    .template-custom-studio .custom-canvas-device-mobile .custom-studio-quote {
      font-size: 0.92em;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-meta li {
      font-size: 0.78rem;
      gap: 6px;
      padding-bottom: 5px;
      grid-template-columns: minmax(68px, 0.7fr) minmax(0, 1fr);
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-list {
      gap: 0.28rem;
      padding-left: 1rem;
    }

    .template-custom-studio .custom-canvas-device-mobile .story-pagination-nav {
      margin: 8px 2px 4px;
      padding: 8px 10px;
      gap: 8px;
    }

    .template-custom-studio .custom-canvas-device-mobile .story-page-btn {
      width: 34px;
      height: 34px;
    }

    .template-custom-studio .custom-canvas-device-mobile .story-page-btn-icon {
      width: 16px;
      height: 16px;
    }

    .template-custom-studio .custom-canvas-device-mobile .story-pagination-status {
      font-size: 0.62rem;
      letter-spacing: 0.1em;
      min-width: 76px;
    }

    .custom-studio-video-grid {
      display: grid;
      gap: clamp(8px, 1.4cqi, 14px);
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      height: 100%;
      align-content: start;
    }

    .custom-studio-video-card {
      border-radius: clamp(10px, 1.4cqi, 18px);
      overflow: hidden;
      border: 0;
      min-height: 126px;
      background: color-mix(in srgb, var(--studio-block-content-bg, var(--surface)) 74%, black 26%);
      box-shadow: 0 16px 34px color-mix(in srgb, var(--ink) 16%, transparent 84%);
    }

    .custom-studio-video-card iframe,
    .custom-studio-video-card video {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 126px;
      border: 0;
    }

    .custom-studio-video-fallback {
      display: grid;
      gap: 8px;
      align-content: center;
      height: 100%;
      text-align: left;
    }

    .custom-studio-video-fallback h3 {
      margin: 0;
      font-size: 1rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .custom-studio-video-fallback p {
      margin: 0;
      opacity: 0.82;
      line-height: 1.5;
    }

    .custom-studio-video-grid.layout-single {
      grid-template-columns: 1fr;
    }

    .custom-studio-video-grid.layout-split {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .custom-studio-type-content .reader-shell {
      margin: 0;
      border: 0;
      border-radius: 0;
      padding: 0;
      background: transparent;
      box-shadow: none;
      min-height: 100%;
    }

    .custom-studio-type-content .reader-toolbar {
      border-bottom-color: color-mix(in srgb, var(--studio-block-border, var(--border)) 78%, transparent 22%);
      padding: 0 0 clamp(8px, 1.5cqi, 14px);
      margin-bottom: clamp(8px, 1.5cqi, 14px);
    }

    .custom-studio-type-content .reader-content {
      margin-top: 0;
      max-height: none;
    }

    .custom-studio-type-content .story {
      margin: 0 auto;
      padding: 0;
      max-width: min(72ch, 100%);
      overflow-wrap: normal;
      word-break: normal;
    }

    .custom-studio-type-content .story p,
    .custom-studio-type-content .story li,
    .custom-studio-type-content .story blockquote {
      font-size: clamp(1rem, 3cqi, 1.16rem);
      line-height: 1.72;
    }

    .custom-studio-type-content .story-page {
      border: 0;
      background: color-mix(in srgb, var(--studio-block-content-bg, var(--surface)) 92%, transparent 8%);
      box-shadow: none;
      padding: clamp(16px, 4cqi, 34px);
    }

    .custom-studio-type-content .story h2 {
      margin-top: 1.1em;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-type-content .reader-toolbar {
      padding: 4px 4px 10px;
      gap: 8px;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-type-content .reader-btn {
      padding: 6px 10px;
      font-size: 0.66rem;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-type-content .reader-volume-wrap {
      padding: 5px 8px;
      font-size: 0.64rem;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-type-content .story p,
    .template-custom-studio .custom-canvas-device-tablet .custom-studio-type-content .story li,
    .template-custom-studio .custom-canvas-device-tablet .custom-studio-type-content .story blockquote {
      font-size: clamp(0.92rem, 1.45vw, 1.02rem);
      line-height: 1.68;
    }

    .template-custom-studio .custom-canvas-device-tablet .custom-studio-type-content .story-page {
      min-height: 210px;
      padding: 16px 18px;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .reader-toolbar {
      padding: 2px 0 8px;
      gap: 6px;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .reader-toolbar-main {
      gap: 6px;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .reader-btn {
      padding: 5px 9px;
      font-size: 0.62rem;
      letter-spacing: 0.06em;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .reader-volume-wrap {
      padding: 5px 8px;
      font-size: 0.6rem;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .reader-volume-wrap input {
      width: 72px;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .reader-status {
      margin: 0 2px 8px;
      font-size: 0.66rem;
      letter-spacing: 0.05em;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .reader-content {
      margin-top: 6px;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .reader-summary {
      padding: 12px;
      gap: 8px;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story h2,
    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story h3 {
      margin-top: 1em;
      margin-bottom: 0.32em;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story p,
    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story li,
    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story blockquote {
      font-size: 0.93rem;
      line-height: 1.62;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story .lead::first-letter {
      font-size: 2.45em;
      margin: 0.05em 0.1em 0 0;
      padding: 0.04em 0.1em;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story .inline-media {
      margin: 1rem 0 1.2rem;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story .inline-media figcaption {
      padding: 8px 10px;
      font-size: 0.62rem;
    }

    .template-custom-studio .custom-canvas-device-mobile .custom-studio-type-content .story-page {
      min-height: 140px;
      padding: 10px 12px;
    }

    .longread .split-grid,
    .longread .newspaper-grid,
    .longread .spotlight-grid,
    .longread .notebook-grid,
    .longread .briefing-grid,
    .longread .ledger-structure,
    .longread .board-structure,
    .longread .mosaic-structure,
    .longread .journey-lead-grid,
    .longread .journal-structure,
    .longread .wire-structure,
    .longread .mono-footer-grid,
    .longread .zine-cards,
    .longread .journey-meta-grid,
    .longread .ledger-brief-strip,
    .longread .board-kpis {
      grid-template-columns: minmax(0, 1fr);
    }

    .longread .rail {
      position: static;
      max-height: none;
      overflow: visible;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    }

    .longread .reader-shell {
      padding: 12px;
    }

    .longread .story {
      margin-inline: auto;
      max-width: min(920px, 100%);
    }

    .longread .custom-studio-type-content .reader-shell {
      padding: 0;
    }

    .longread .custom-studio-type-content .story {
      max-width: min(72ch, 100%);
    }

    .newspaper-story .inline-media {
      column-span: all;
    }

    .column-stack {
      max-width: min(840px, 100%);
      margin: 0 auto;
      display: grid;
      gap: 16px;
    }

    .pull-quote {
      padding: 24px;
      text-align: center;
      background: var(--surface-muted);
      border: 1px solid var(--border);
      border-radius: 16px;
    }

    .pull-quote p {
      margin: 0;
      font-family: var(--title-font);
      color: var(--ink);
      font-size: clamp(1.2rem, 2.1vw, 1.8rem);
      font-style: italic;
    }

    .tag-band {
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--surface-muted);
    }

    .spotlight {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr);
      padding: 0;
      overflow: hidden;
    }

    .spotlight-media {
      position: relative;
      min-height: 340px;
      overflow: hidden;
    }

    .spotlight-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.05);
      transition: transform 0.45s ease;
    }

    .spotlight-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(120deg, transparent, rgba(0, 0, 0, 0.34));
    }

    .spotlight-placeholder {
      width: 100%;
      height: 100%;
      min-height: 340px;
      display: grid;
      place-items: center;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      background: var(--surface-muted);
    }

    .spotlight-copy {
      padding: clamp(20px, 3.8vw, 38px);
      display: grid;
      gap: 12px;
      align-content: center;
    }

    .immersive-head {
      border-radius: 22px;
    }

    .immersive-strip {
      display: grid;
      grid-template-columns: minmax(240px, 0.55fr) minmax(0, 1fr);
      gap: 16px;
      align-items: stretch;
    }

    .quote-panel p {
      margin: 0;
      font-family: var(--title-font);
      font-size: clamp(1.12rem, 2vw, 1.45rem);
      font-style: italic;
      color: var(--ink);
    }

    .immersive-cover {
      height: 100%;
    }

    .highlight-band {
      padding: 20px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: var(--surface-muted);
      display: grid;
      gap: 12px;
    }

    .highlight-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
    }
    .highlight-grid p {
      margin: 0;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      font-size: 0.94rem;
      color: var(--text);
    }

    .newspaper-head {
      padding: 18px 24px 24px;
      border-radius: 18px;
    }

    .newspaper-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.7rem;
      font-family: "IBM Plex Sans", sans-serif;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .newspaper-story {
      column-count: 1;
    }

    .newspaper-story h1,
    .newspaper-story h2,
    .newspaper-story h3,
    .newspaper-story blockquote,
    .newspaper-story ul,
    .newspaper-story ol,
    .newspaper-story hr {
      column-span: all;
    }

    .notebook-hero {
      background:
        linear-gradient(165deg, var(--surface), var(--surface-muted));
    }

    .notebook-page {
      background:
        repeating-linear-gradient(
          to bottom,
          var(--surface),
          var(--surface) 33px,
          var(--surface-muted) 34px,
          var(--surface-muted) 35px
        );
    }

    .note-card p {
      margin: 0;
      color: var(--text);
      font-size: 0.94rem;
    }

    .briefing-head {
      padding: 22px;
      border-radius: 16px;
    }

    .briefing-cover {
      margin-top: 4px;
    }

    .ledger-mast {
      padding: 20px 24px 24px;
      border-top: 6px double var(--accent);
      border-radius: 18px;
      background:
        linear-gradient(165deg, var(--surface), var(--surface-muted)),
        repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 32px);
      background-size: auto, 32px 100%;
    }

    .ledger-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.68rem;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 800;
      margin-bottom: 10px;
    }

    .ledger-title {
      margin: 0;
      color: var(--ink);
      font-family: var(--title-font);
      font-size: clamp(2.3rem, 5.1vw, 4.5rem);
      line-height: 0.98;
      letter-spacing: -0.03em;
      text-transform: uppercase;
    }

    .ledger-deck {
      margin: 0;
      max-width: 72ch;
      color: var(--muted);
      font-size: clamp(1rem, 1.6vw, 1.15rem);
    }

    .ledger-brief-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .ledger-brief-card {
      padding: 14px;
      border-radius: 14px;
      background: var(--surface-muted);
      border: 1px solid var(--border);
    }

    .ledger-brief-card h3 {
      margin: 0 0 6px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
    }

    .ledger-brief-card p {
      margin: 0;
      font-size: 0.95rem;
      color: var(--ink);
      line-height: 1.5;
    }

    .ledger-structure {
      grid-template-columns: minmax(0, 1.32fr) minmax(220px, 0.68fr);
    }

    .ledger-cover {
      max-height: none;
    }

    .ledger-story {
      column-count: 1;
    }

    .ledger-story h1,
    .ledger-story h2,
    .ledger-story h3,
    .ledger-story blockquote,
    .ledger-story ul,
    .ledger-story ol,
    .ledger-story hr,
    .ledger-story .inline-media {
      column-span: all;
    }

    .board-mast {
      padding: 22px;
      border-radius: 16px;
      border-left: 5px solid var(--accent);
      background:
        linear-gradient(150deg, var(--surface), var(--surface-muted)),
        linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px);
      background-size: auto, 24px 24px;
    }

    .board-kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .board-kpi {
      padding: 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface-muted);
      display: grid;
      gap: 6px;
      align-content: start;
    }

    .board-kpi h3 {
      margin: 0;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .board-kpi p {
      margin: 0;
      font-family: var(--title-font);
      font-size: 1.08rem;
      color: var(--ink);
      font-weight: 700;
      line-height: 1.3;
    }

    .board-structure {
      grid-template-columns: minmax(0, 1.3fr) minmax(210px, 0.7fr);
    }

    .board-panel {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      border-radius: 12px;
    }

    .board-story h2 {
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-size: 0.92rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-left: 4px solid var(--accent);
      border-bottom: 0;
      background: var(--surface-muted);
      border-radius: 0 8px 8px 0;
      padding: 0.52rem 0.7rem;
      margin: 1.45em 0 0.7em;
    }

    .board-cover {
      margin-top: 2px;
    }

    .mosaic-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
      padding: 0;
      overflow: hidden;
      border-radius: 22px;
      min-height: 320px;
    }

    .mosaic-media {
      position: relative;
      min-height: 300px;
      overflow: hidden;
    }

    .mosaic-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.04);
      transition: transform 0.45s ease;
    }

    .mosaic-copy {
      padding: clamp(18px, 3.5vw, 34px);
      display: grid;
      gap: 12px;
      align-content: start;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), var(--surface-muted));
    }

    .mosaic-chip-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 2px;
    }

    .mosaic-chip-wrap .tag-pill {
      background: var(--accent-soft);
      border-color: transparent;
    }

    .mosaic-structure {
      grid-template-columns: minmax(0, 1.22fr) minmax(220px, 0.78fr);
    }

    .mosaic-quote {
      border-left: 4px solid var(--accent);
      border-radius: 10px 12px 12px 10px;
    }

    .mosaic-quote p {
      margin: 0;
      font-family: var(--title-font);
      font-size: clamp(1.1rem, 1.8vw, 1.35rem);
      line-height: 1.46;
      color: var(--ink);
      font-style: italic;
    }

    .mosaic-story blockquote {
      border-left-width: 5px;
      border-radius: 0 12px 12px 0;
      background: linear-gradient(135deg, var(--surface-muted), var(--surface));
    }

    .journey-head {
      padding: clamp(22px, 4vw, 42px);
      border-radius: 20px;
      background:
        radial-gradient(circle at 94% 8%, var(--accent-soft), transparent 42%),
        linear-gradient(165deg, var(--surface), var(--surface-muted));
    }

    .journey-lead-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(240px, 0.82fr);
      gap: 14px;
      align-items: stretch;
    }

    .journey-cover {
      height: 100%;
    }

    .journey-note {
      padding: 16px;
      border-radius: 14px;
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      border: 1px solid var(--border);
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .journey-note h3 {
      margin: 0;
      font-size: 0.74rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .journey-note p {
      margin: 0;
      color: var(--ink);
      font-size: 1.02rem;
      line-height: 1.58;
    }

    .journey-story h2 {
      border-left: 4px solid var(--accent);
      border-bottom: 0;
      padding-left: 0.66rem;
      margin-top: 1.5em;
    }

    .journey-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      align-items: start;
    }

    .mono-mast {
      max-width: min(940px, 100%);
      margin-inline: auto;
      border-radius: 16px;
      border-top: 4px solid var(--accent);
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .mono-reader-wrap {
      max-width: min(940px, 100%);
      margin: 0 auto;
    }

    .mono-story {
      max-width: 74ch;
      margin-inline: auto;
      padding-top: clamp(24px, 3.9vw, 44px);
      padding-bottom: clamp(24px, 3.9vw, 44px);
    }

    .mono-story h2 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.22em;
      margin-top: 1.6em;
    }

    .mono-story p,
    .mono-story li {
      font-size: clamp(1.04rem, 1.2vw, 1.18rem);
      line-height: 1.84;
    }

    .mono-footer-grid {
      max-width: min(940px, 100%);
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .mono-foot-card {
      padding: 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
    }

    .mono-foot-card h3 {
      margin: 0 0 8px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
    }

    .mono-foot-card p {
      margin: 0;
      color: var(--text);
      font-size: 0.94rem;
      line-height: 1.6;
    }

    .zine-mast {
      padding: 22px;
      border-radius: 18px;
      border: 2px solid var(--accent);
      background:
        linear-gradient(145deg, var(--surface), var(--surface-muted)),
        radial-gradient(circle at 92% 4%, var(--accent-soft), transparent 44%);
      box-shadow: var(--shadow), inset 0 0 0 1px rgba(0, 0, 0, 0.04);
    }

    .zine-title {
      margin: 0;
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      font-size: clamp(2rem, 4.2vw, 3.4rem);
      line-height: 0.98;
      text-transform: uppercase;
      letter-spacing: -0.018em;
      color: var(--ink);
    }

    .zine-deck {
      margin: 0;
      max-width: 62ch;
      color: var(--muted);
      font-size: clamp(0.98rem, 1.46vw, 1.1rem);
    }

    .zine-cards {
      display: grid;
      grid-template-columns: minmax(0, 1.26fr) minmax(220px, 0.74fr);
      gap: 12px;
      align-items: stretch;
    }

    .zine-cover {
      height: 100%;
      margin: 0;
    }

    .zine-card {
      padding: 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      display: grid;
      gap: 9px;
      align-content: start;
    }

    .zine-card h3 {
      margin: 0;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
    }

    .zine-card p {
      margin: 0;
      color: var(--text);
      font-size: 0.94rem;
      line-height: 1.6;
    }

    .zine-story h2 {
      border-left: 4px solid var(--accent);
      border-bottom: 0;
      border-radius: 0 8px 8px 0;
      background: var(--surface-muted);
      padding: 0.52rem 0.72rem;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      margin: 1.42em 0 0.7em;
    }

    .journal-mast {
      border-top: 3px solid var(--accent);
      background:
        radial-gradient(circle at 90% 8%, var(--accent-soft), transparent 44%),
        linear-gradient(165deg, var(--surface), var(--surface-muted));
    }

    .journal-structure {
      grid-template-columns: minmax(0, 1.3fr) minmax(220px, 0.7fr);
      align-items: start;
    }

    .journal-main {
      display: grid;
      gap: 12px;
    }

    .journal-cover {
      margin-top: 0;
    }

    .journal-note {
      padding: 14px;
      border-radius: 12px;
      border: 1px solid var(--border);
      border-left: 3px solid var(--accent);
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
    }

    .journal-note h3 {
      margin: 0 0 8px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
    }

    .journal-note p {
      margin: 0;
      color: var(--text);
      font-size: 0.95rem;
      line-height: 1.65;
    }

    .journal-story h2 {
      border-bottom: 0;
      padding-left: 0.85rem;
      position: relative;
    }

    .journal-story h2::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.15em;
      bottom: 0.15em;
      width: 4px;
      border-radius: 999px;
      background: var(--accent);
    }

    .wire-mast {
      padding: 22px;
      border-radius: 16px;
      border-top: 3px solid var(--accent);
      background:
        linear-gradient(155deg, rgba(13, 17, 27, 0.94), rgba(20, 26, 41, 0.92)),
        linear-gradient(90deg, rgba(91, 130, 255, 0.22) 1px, transparent 1px);
      background-size: auto, 26px 26px;
    }

    .wire-title {
      margin: 0;
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
      font-size: clamp(2.1rem, 4.35vw, 3.55rem);
      line-height: 1.02;
      letter-spacing: -0.016em;
      color: #f1f6ff;
    }

    .wire-deck {
      margin: 0;
      max-width: 64ch;
      color: #c5d3ea;
      font-size: clamp(0.98rem, 1.45vw, 1.14rem);
    }

    .wire-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .wire-chip-row span {
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid rgba(120, 152, 230, 0.46);
      background: rgba(96, 127, 209, 0.14);
      color: #d7e4fb;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-weight: 700;
    }

    .wire-structure {
      grid-template-columns: minmax(0, 1.33fr) minmax(220px, 0.67fr);
    }

    .wire-panel {
      background: linear-gradient(180deg, rgba(19, 25, 39, 0.96), rgba(26, 34, 52, 0.92));
      border-color: #445577;
    }

    .wire-panel h3 {
      color: #91b7ff;
    }

    .wire-rail .panel,
    .wire-rail .meta-list li strong,
    .wire-rail .tag-pill {
      color: #dce8ff;
    }

    .wire-rail .meta-list li {
      border-bottom-color: rgba(139, 162, 214, 0.32);
      color: #c0d0ec;
    }

    .wire-rail .tag-pill {
      background: rgba(96, 127, 209, 0.18);
      border-color: rgba(120, 152, 230, 0.42);
    }

    .wire-story h2 {
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      font-size: 0.94rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-left: 4px solid #90b7ff;
      border-bottom: 0;
      border-radius: 0 8px 8px 0;
      background: rgba(96, 127, 209, 0.16);
      color: #d8e7ff;
      padding: 0.54rem 0.72rem;
      margin: 1.45em 0 0.72em;
    }

    .wire-story p,
    .wire-story li,
    .wire-story blockquote {
      color: #e3ecfb;
    }

    .wire-story blockquote {
      background: rgba(129, 152, 197, 0.16);
      border-left-color: #90b7ff;
      color: #eaf2ff;
    }

    .wire-cover {
      margin-top: 2px;
    }

    .style-ledger-grid .reader-shell,
    .style-data-board .reader-shell,
    .style-feature-mosaic .reader-shell,
    .style-visual-journey .reader-shell,
    .style-zine-board .reader-shell,
    .style-journal-cards .reader-shell,
    .style-noir-wire .reader-shell {
      border-radius: 14px;
    }

    .style-ledger-grid .story h2 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.28em;
      text-transform: uppercase;
      font-size: 0.95rem;
      letter-spacing: 0.06em;
      font-family: "Libre Franklin", "IBM Plex Sans", sans-serif;
    }

    .style-data-board .story h2 {
      border-bottom: 0;
      border-left: 4px solid var(--accent);
      border-radius: 0 8px 8px 0;
      background: var(--surface-muted);
      padding: 0.52rem 0.7rem;
    }

    .style-feature-mosaic .story h2 {
      border-left: 4px solid var(--accent);
      border-bottom: 0;
      padding-left: 0.66rem;
    }

    .style-visual-journey .story h2 {
      border-bottom: 0;
      border-left: 4px solid var(--accent);
      padding-left: 0.68rem;
    }

    .style-mono-column .story h2 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.22em;
    }

    .style-zine-board .story h2 {
      border-bottom: 0;
      border-left: 4px solid var(--accent);
      border-radius: 0 8px 8px 0;
      background: var(--surface-muted);
      padding: 0.52rem 0.7rem;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.95rem;
    }

    .style-journal-cards .story h2 {
      border-bottom: 0;
      padding-left: 0.82rem;
      position: relative;
    }

    .style-journal-cards .story h2::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.18em;
      bottom: 0.18em;
      width: 4px;
      border-radius: 999px;
      background: var(--accent);
    }

    .style-noir-wire .reader-shell {
      background: linear-gradient(180deg, rgba(19, 25, 39, 0.98), rgba(25, 34, 51, 0.94));
      border-color: #4a5e82;
    }

    .style-noir-wire .reader-toolbar,
    .style-noir-wire .reader-volume-wrap {
      background: rgba(255, 255, 255, 0.04);
      border-color: #4a5e82;
    }

    .style-noir-wire .reader-btn {
      background: rgba(255, 255, 255, 0.06);
      border-color: #5d749e;
      color: #e1ebff;
    }

    .style-noir-wire .reader-btn-primary {
      background: #6b95ff;
      color: #0f1627;
      border-color: transparent;
    }

    .style-noir-wire .reader-status {
      color: #c2d2ef;
    }

    .style-noir-wire .story h2 {
      border-left: 4px solid #8fb4ff;
      border-bottom: 0;
      border-radius: 0 8px 8px 0;
      background: rgba(96, 127, 209, 0.16);
      padding: 0.52rem 0.7rem;
      color: #dce9ff;
      font-family: "IBM Plex Sans", "Libre Franklin", sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      font-size: 0.95rem;
    }

    .style-noir-wire .story p,
    .style-noir-wire .story li,
    .style-noir-wire .story blockquote {
      color: #e7efff;
    }

    .style-noir-wire .story blockquote {
      background: rgba(143, 180, 255, 0.14);
      border-left-color: #8fb4ff;
    }

    .style-noir-wire .story mark {
      background: rgba(123, 156, 235, 0.24);
      color: #eef5ff;
    }

    .style-newspaper .reader-shell,
    .style-ledger-grid .reader-shell {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.72)),
        repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.035) 0 1px, transparent 1px 26px),
        var(--surface);
    }

    .style-newspaper .story,
    .style-ledger-grid .story {
      font-family: "Source Serif 4", "Newsreader", Georgia, serif;
      font-size: clamp(1.03rem, 1.08vw, 1.14rem);
      line-height: 1.86;
    }

    .style-newspaper .story p,
    .style-ledger-grid .story p {
      text-align: justify;
      text-wrap: pretty;
      hyphens: auto;
    }

    .style-newspaper .story p + p,
    .style-ledger-grid .story p + p {
      text-indent: 1.28em;
    }

    .style-newspaper .story h2,
    .style-ledger-grid .story h2 {
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .style-briefing .reader-shell,
    .style-data-board .reader-shell {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      border-radius: 14px;
    }

    .style-briefing .story,
    .style-data-board .story {
      font-family: "Inter", "IBM Plex Sans", "Segoe UI", sans-serif;
      font-size: clamp(0.98rem, 1.02vw, 1.06rem);
      line-height: 1.72;
    }

    .style-briefing .story ul li::marker,
    .style-data-board .story ul li::marker {
      color: var(--accent);
    }

    .style-notebook .reader-shell,
    .style-journal-cards .reader-shell {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.34)),
        repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.03) 1px, transparent 1px, transparent 34px),
        var(--surface);
      border-radius: 16px;
    }

    .style-notebook .story,
    .style-journal-cards .story {
      font-family: "Lora", "Source Serif 4", Georgia, serif;
      font-size: clamp(1.05rem, 1.16vw, 1.19rem);
      line-height: 1.9;
    }

    .style-notebook .story h2,
    .style-journal-cards .story h2 {
      font-family: "Playfair Display", "Newsreader", Georgia, serif;
    }

    .style-column .reader-shell,
    .style-mono-column .reader-shell {
      background: linear-gradient(180deg, var(--surface), var(--surface-muted));
      border-radius: 18px;
      box-shadow: 0 18px 34px rgba(0, 0, 0, 0.12);
    }

    .style-column .story,
    .style-mono-column .story {
      max-width: 74ch;
      margin-inline: auto;
      font-family: "Source Serif 4", "Lora", Georgia, serif;
      font-size: clamp(1.06rem, 1.2vw, 1.2rem);
      line-height: 1.88;
    }

    .style-feature-mosaic .reader-shell,
    .style-spotlight .reader-shell {
      background:
        radial-gradient(circle at 96% 8%, var(--accent-soft), transparent 40%),
        linear-gradient(180deg, var(--surface), var(--surface-muted));
      border-radius: 16px;
    }

    .style-feature-mosaic .story,
    .style-spotlight .story {
      font-size: clamp(1.02rem, 1.1vw, 1.11rem);
      line-height: 1.82;
    }

    .style-feature-mosaic .story p:first-of-type::first-letter,
    .style-spotlight .story p:first-of-type::first-letter {
      float: left;
      margin-right: 0.12em;
      font-size: 2.7em;
      line-height: 0.85;
      color: var(--accent);
      font-family: var(--title-font);
      font-weight: 700;
    }

    .style-immersive .reader-shell,
    .style-visual-journey .reader-shell {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.62)),
        linear-gradient(135deg, transparent, rgba(0, 0, 0, 0.05)),
        var(--surface);
      border-radius: 16px;
    }

    .style-immersive .story,
    .style-visual-journey .story {
      font-size: clamp(1.04rem, 1.16vw, 1.16rem);
      line-height: 1.86;
    }

    body.template-eclipse-report .panel {
      background: linear-gradient(180deg, rgba(252, 244, 235, 0.98), rgba(245, 234, 220, 0.9));
      border-color: #d6c1aa;
    }

    body.template-eclipse-report .panel h3 {
      color: #9d6237;
    }

    body.template-meadow-letter .notebook-rail .panel:not(.note-card) {
      background: linear-gradient(180deg, rgba(243, 250, 237, 0.98), rgba(231, 243, 224, 0.9));
      border-color: rgba(111, 168, 106, 0.38);
      box-shadow: 0 10px 22px rgba(44, 64, 38, 0.1);
    }

    body.template-meadow-letter .notebook-rail .panel:not(.note-card) h3 {
      color: #4d7d4a;
    }

    body.template-meadow-letter .notebook-rail .tag-pill {
      background: rgba(111, 168, 106, 0.2);
      border-color: rgba(93, 145, 88, 0.45);
      color: #315033;
    }

    body.template-sunrise-weekend .rail .panel {
      background: linear-gradient(180deg, rgba(255, 248, 238, 0.98), rgba(255, 238, 218, 0.9));
      border-color: #efcca8;
    }

    body.template-iron-column .newspaper-head {
      background:
        linear-gradient(170deg, #fafafa, #efefef),
        linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px 28px);
      background-size: auto, 28px 100%;
    }

    body.template-granite-digest .rail .panel {
      background: linear-gradient(180deg, rgba(247, 252, 255, 0.98), rgba(233, 243, 248, 0.9));
      border-color: #c4d5df;
    }

    body.template-atelier-notes .notebook-rail .panel:not(.note-card) {
      background: linear-gradient(180deg, rgba(255, 249, 242, 0.97), rgba(246, 235, 224, 0.9));
      border-color: #dcc6b1;
      box-shadow: 0 12px 24px rgba(51, 35, 23, 0.14);
    }

    body.template-atelier-notes .notebook-rail .panel:not(.note-card) h3 {
      color: #a16038;
    }

    body.template-atelier-notes .notebook-rail .tag-pill {
      background: rgba(220, 187, 164, 0.36);
      border-color: rgba(166, 107, 68, 0.35);
      color: #4a3323;
    }

    .video-shell {
      padding: 14px;
      display: grid;
      gap: 12px;
    }

    .section-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .section-top p {
      margin: 0;
      color: var(--muted);
      font-size: 0.88rem;
    }

    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .video-card {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: #000;
      min-height: 170px;
    }

    .video-card iframe,
    .video-card video {
      width: 100%;
      height: 100%;
      min-height: 170px;
      border: 0;
      object-fit: cover;
      display: block;
    }

    .reveal {
      opacity: 1;
      transform: none;
    }

    .js .reveal {
      opacity: 0;
      transform: translateY(18px);
    }

    .js .reveal.is-visible {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.42s ease, transform 0.42s ease;
    }

    .style-spotlight .frame-card,
    .style-immersive .frame-card,
    .style-newspaper .frame-card,
    .style-notebook .frame-card,
    .style-briefing .frame-card {
      border-radius: 14px;
    }

    @media (min-width: 1360px) {
      .newspaper-story {
        column-count: 2;
        column-gap: 2rem;
        column-rule: 1px solid var(--border);
      }

      .ledger-story {
        column-count: 2;
        column-gap: 1.9rem;
        column-rule: 1px solid var(--border);
      }
    }

    @media (max-width: 1320px) {
      .split-grid,
      .newspaper-grid,
      .spotlight-grid,
      .notebook-grid,
      .briefing-grid,
      .ledger-structure,
      .board-structure,
      .mosaic-structure,
      .journey-lead-grid,
      .journal-structure,
      .wire-structure,
      .zine-cards,
      .journey-meta-grid,
      .mono-footer-grid,
      .ledger-brief-strip,
      .board-kpis {
        grid-template-columns: minmax(0, 1fr);
      }

      .rail {
        position: static;
        max-height: none;
        overflow: visible;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      }
    }

    @media (max-width: 1080px) {
      .briefing-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .briefing-grid .rail {
        position: static;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .zine-cards {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (max-width: 980px) {
      .split-grid,
      .newspaper-grid,
      .spotlight-grid,
      .notebook-grid,
      .layout-grid,
      .ledger-structure,
      .board-structure,
      .mosaic-structure,
      .journey-lead-grid,
      .journal-structure,
      .wire-structure,
      .zine-cards,
      .journey-meta-grid,
      .mono-footer-grid,
      .ledger-brief-strip,
      .board-kpis {
        grid-template-columns: minmax(0, 1fr);
      }

      .spotlight {
        grid-template-columns: minmax(0, 1fr);
      }

      .rail {
        position: static;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .newspaper-story {
        column-count: 1;
      }

      .ledger-story {
        column-count: 1;
      }

      .immersive-strip {
        grid-template-columns: minmax(0, 1fr);
      }

      .progress-serif {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .reader-toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .reader-toolbar-main {
        justify-content: space-between;
      }

      .reader-volume-wrap {
        width: 100%;
        justify-content: space-between;
      }

      .reader-volume-wrap input {
        width: min(180px, 100%);
      }

      .template-root {
        width: min(100%, 100vw);
        padding: 10px 8px 22px;
        gap: 12px;
      }

      body.template-custom-studio .template-root {
        width: min(100%, 100vw);
        padding: 12px;
        gap: 14px;
      }

      .headline {
        font-size: clamp(1.6rem, 8vw, 2.4rem);
      }

      .frame-card,
      .cover-fallback {
        border-radius: 12px;
      }

      .story {
        padding: 16px;
      }

      .ledger-mast,
      .board-mast,
      .zine-mast,
      .wire-mast,
      .newspaper-head,
      .briefing-head {
        padding: 16px;
      }

      .wire-title,
      .zine-title,
      .ledger-title {
        font-size: clamp(1.72rem, 8vw, 2.45rem);
      }
    }
  </style>
</head>
<body class="theme-${resolvedThemeMode} layout-${template.resolvedLayout} style-${template.style} template-${template.id} ${longReadClass}">
  <div class="progress-top"><span id="progress-top-fill"></span></div>
  <div class="progress-serif"><span id="progress-serif-fill"></span></div>

  <main class="template-root">
    ${renderTemplateLayout(article, template, contentHtml)}
    ${renderVideos(article.videoUrls)}
  </main>

  <script>
    (function () {
      var root = document.documentElement;
      root.classList.add('js');

      var revealNodes = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
      var markVisible = function (node) {
        node.classList.add('is-visible');
      };

      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) return;
              markVisible(entry.target);
              observer.unobserve(entry.target);
            });
          },
          { threshold: 0.02, rootMargin: '0px 0px -8% 0px' }
        );

        revealNodes.forEach(function (node) {
          observer.observe(node);
        });
        setTimeout(function () {
          revealNodes.forEach(markVisible);
        }, 1400);
      } else {
        revealNodes.forEach(markVisible);
      }

      var progressTopFill = document.getElementById('progress-top-fill');
      var progressSerifFill = document.getElementById('progress-serif-fill');

      var reportFrameHeight = function () {
        try {
          var rootNode = document.querySelector('.template-root');
          var rootHeight = rootNode ? Math.ceil(rootNode.getBoundingClientRect().height + ${template.id === CUSTOM_TEMPLATE_ID ? 0 : 56}) : 0;
          var docEl = document.documentElement;
          var body = document.body;
          var documentHeight = Math.max(
            body ? body.scrollHeight : 0,
            body ? body.offsetHeight : 0,
            docEl ? docEl.scrollHeight : 0,
            docEl ? docEl.offsetHeight : 0
          );
          var nextHeight = rootHeight > 0 ? rootHeight : documentHeight;
          if (!nextHeight) return;

          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'article-template:height', height: nextHeight }, '*');
          }
        } catch (error) {
          // Ignore postMessage failures.
        }
      };

      var scheduleHeightSync = function () {
        reportFrameHeight();
        requestAnimationFrame(reportFrameHeight);
        setTimeout(reportFrameHeight, 120);
      };

      Array.prototype.slice.call(document.querySelectorAll('.custom-product-tag-overlay')).forEach(function (node) {
        node.addEventListener('toggle', scheduleHeightSync);
      });

      var updateProgress = function () {
        var doc = document.documentElement;
        var top = doc.scrollTop || document.body.scrollTop || 0;
        var total = Math.max(doc.scrollHeight - doc.clientHeight, 1);
        var ratio = Math.max(0, Math.min(1, top / total));
        var percent = (ratio * 100).toFixed(2) + '%';

        if (progressTopFill) progressTopFill.style.width = percent;
        if (progressSerifFill) progressSerifFill.style.height = percent;
      };

      var parallaxNode = document.querySelector('[data-parallax] img');
      var updateParallax = function () {
        if (!parallaxNode) return;
        var doc = document.documentElement;
        var top = doc.scrollTop || document.body.scrollTop || 0;
        var amount = Math.min(56, top * 0.06);
        parallaxNode.style.transform = 'scale(1.07) translateY(' + amount.toFixed(2) + 'px)';
      };

      var playBtn = document.getElementById('reader-play-btn');
      var muteBtn = document.getElementById('reader-mute-btn');
      var summaryBtn = document.getElementById('reader-summary-btn');
      var volumeInput = document.getElementById('reader-volume');
      var statusNode = document.getElementById('reader-status');
      var storyNode = document.getElementById('reader-story');
      var summaryNode = document.getElementById('reader-summary');
      var paginationNav = document.getElementById('story-pagination-nav');
      var pagePrevBtn = document.getElementById('story-page-prev');
      var pageNextBtn = document.getElementById('story-page-next');
      var pageStatusNode = document.getElementById('story-page-status');
      var readerShell = document.getElementById('reader-shell');
      var readerContent = document.getElementById('reader-content');
      var layoutGrid = readerShell ? readerShell.closest('.layout-grid') : null;
      var paginationConfig = ${JSON.stringify(paginationConfig)};
      var synth = window.speechSynthesis || null;
      var isPlaying = false;
      var isPaused = false;
      var isSummaryMode = false;
      var volume = 1;
      var lastVolume = 1;
      var activeUtterance = null;
      var paginatedPages = [];
      var activePageIndex = 0;
      var storyText = ${JSON.stringify((article.paragraphs || []).join(' ').trim() || article.metaDescription || '')};
      var summaryText = ${JSON.stringify(buildReaderSummary(article).join(' '))};

      if (summaryNode) {
        summaryNode.hidden = true;
        summaryNode.style.display = 'none';
        summaryNode.setAttribute('aria-hidden', 'true');
      }
      if (storyNode) {
        storyNode.hidden = false;
        storyNode.style.display = '';
        storyNode.setAttribute('aria-hidden', 'false');
      }
      if (readerShell) readerShell.classList.remove('is-summary-mode');
      if (layoutGrid) layoutGrid.classList.remove('summary-mode-grid');

      var setStatus = function (message) {
        if (statusNode) statusNode.textContent = message;
      };
      var pageScopedBlocks = Array.prototype.slice.call(
        document.querySelectorAll('[data-page-placement]')
      );
      var syncPageScopedBlockVisibility = function () {
        if (!pageScopedBlocks.length) return;

        var totalPages = Math.max(paginatedPages.length, 1);
        var activePage = Math.min(activePageIndex + 1, totalPages);

        pageScopedBlocks.forEach(function (blockNode) {
          if (!blockNode || !blockNode.getAttribute) return;
          var mode = String(blockNode.getAttribute('data-page-placement') || 'all').toLowerCase();
          var shouldShow = true;

          if (mode === 'first') shouldShow = activePage === 1;
          else if (mode === 'last') shouldShow = activePage === totalPages;
          else if (mode === 'middle') shouldShow = totalPages > 2 && activePage > 1 && activePage < totalPages;

          blockNode.hidden = !shouldShow;
          blockNode.style.display = shouldShow ? '' : 'none';
          blockNode.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        });
      };

      var updateStoryPagination = function () {
        var totalPages = paginatedPages.length;
        var hasMultiplePages = totalPages > 1;
        var canGoPrev = hasMultiplePages && activePageIndex > 0;
        var canGoNext = hasMultiplePages && activePageIndex < totalPages - 1;

        paginatedPages.forEach(function (page, index) {
          var isActive = index === activePageIndex;
          page.classList.toggle('is-active', isActive);
          page.hidden = !isActive;
        });

        if (pageStatusNode) {
          pageStatusNode.textContent = (Math.min(activePageIndex + 1, Math.max(totalPages, 1))) + ' / ' + Math.max(totalPages, 1);
        }

        if (pagePrevBtn) {
          pagePrevBtn.classList.toggle('is-hidden', !canGoPrev);
          pagePrevBtn.hidden = !canGoPrev;
          pagePrevBtn.disabled = !canGoPrev;
          pagePrevBtn.tabIndex = canGoPrev ? 0 : -1;
          pagePrevBtn.setAttribute('aria-disabled', canGoPrev ? 'false' : 'true');
          pagePrevBtn.setAttribute('aria-hidden', canGoPrev ? 'false' : 'true');
        }

        if (pageNextBtn) {
          pageNextBtn.classList.toggle('is-hidden', !canGoNext);
          pageNextBtn.hidden = !canGoNext;
          pageNextBtn.disabled = !canGoNext;
          pageNextBtn.tabIndex = canGoNext ? 0 : -1;
          pageNextBtn.setAttribute('aria-disabled', canGoNext ? 'false' : 'true');
          pageNextBtn.setAttribute('aria-hidden', canGoNext ? 'false' : 'true');
        }

        if (paginationNav) {
          var navHidden = isSummaryMode || !hasMultiplePages;
          paginationNav.hidden = navHidden;
          paginationNav.classList.remove('is-next-only', 'is-prev-only');
          if (!navHidden) {
            if (!canGoPrev && canGoNext) paginationNav.classList.add('is-next-only');
            else if (canGoPrev && !canGoNext) paginationNav.classList.add('is-prev-only');
          }
        }

        syncPageScopedBlockVisibility();
        scheduleHeightSync();
        setTimeout(reportFrameHeight, 90);
      };

      var splitLongParagraphBlocks = function (options) {
        if (!storyNode) return;
        var minParagraphLength = options && options.minParagraphLength ? Number(options.minParagraphLength) : 900;
        var chunkSize = options && options.chunkSize ? Number(options.chunkSize) : 420;

        var paragraphNodes = Array.prototype.slice.call(storyNode.querySelectorAll('p'));
        paragraphNodes.forEach(function (paragraph) {
          var text = (paragraph.textContent || '').replace(/\s+/g, ' ').trim();
          if (text.length < minParagraphLength) return;

          var sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
          if (sentences.length < 2) return;

          var chunks = [];
          var bucket = '';

          sentences.forEach(function (sentence) {
            var candidate = (bucket + ' ' + sentence).trim();
            if (candidate.length > chunkSize && bucket) {
              chunks.push(bucket.trim());
              bucket = sentence.trim();
            } else {
              bucket = candidate;
            }
          });

          if (bucket.trim()) chunks.push(bucket.trim());
          if (chunks.length < 2) return;

          var leadClass = paragraph.classList.contains('lead');

          chunks.forEach(function (chunk, index) {
            var splitParagraph = document.createElement('p');
            splitParagraph.textContent = chunk;
            if (leadClass && index === 0) {
              splitParagraph.className = 'lead';
            }
            paragraph.parentNode.insertBefore(splitParagraph, paragraph);
          });

          paragraph.remove();
        });
      };

      var paginateStory = function () {
        if (!paginationConfig || !paginationConfig.enabled) return false;
        if (!storyNode || storyNode.dataset.paginated === 'true') return false;

        splitLongParagraphBlocks(
          paginationConfig.forceManual
            ? { minParagraphLength: 220, chunkSize: 180 }
            : { minParagraphLength: 900, chunkSize: 420 }
        );

        var blocks = Array.prototype.slice.call(storyNode.children || []);
        if (blocks.length < 2) return false;

        var totalText = (storyNode.textContent || '').replace(/\s+/g, ' ').trim().length;
        var minBlocks = paginationConfig.hasRichMedia ? 4 : 6;
        if (!paginationConfig.forceManual && blocks.length < minBlocks && totalText < 1000 && !paginationConfig.hasRichMedia) return false;

        var desiredPages = Math.max(2, Math.min(paginationConfig.forceManual ? 6 : 3, paginationConfig.targetPages || 2));
        var pages = [];
        if (paginationConfig.forceManual) {
          var blocksPerPage = Math.max(1, Math.ceil(blocks.length / desiredPages));
          for (var pageCursor = 0; pageCursor < desiredPages; pageCursor += 1) {
            var from = pageCursor * blocksPerPage;
            var to = Math.min(blocks.length, from + blocksPerPage);
            if (from >= blocks.length) break;

            var manualPage = document.createElement('section');
            manualPage.className = 'story-page';
            blocks.slice(from, to).forEach(function (block) {
              manualPage.appendChild(block);
            });

            if (manualPage.children.length) {
              pages.push(manualPage);
            }
          }
        } else {
          var perPageTarget = Math.max(760, Math.ceil(totalText / desiredPages));
          var currentPage = document.createElement('section');
          currentPage.className = 'story-page';
          var currentBucket = 0;
          var pageIndex = 0;

          blocks.forEach(function (block) {
            var blockSize = Math.max((block.textContent || '').trim().length, 70);
            var tag = (block.tagName || '').toLowerCase();
            var hasBoundaryWeight = tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'figure' || tag === 'blockquote';
            var shouldStartNewPage =
              pageIndex < desiredPages - 1
              && (
                (currentBucket >= perPageTarget && currentPage.children.length >= 3)
                || (hasBoundaryWeight && currentBucket >= Math.floor(perPageTarget * 0.72) && currentPage.children.length >= 2)
              );

            if (shouldStartNewPage) {
              pages.push(currentPage);
              currentPage = document.createElement('section');
              currentPage.className = 'story-page';
              currentBucket = 0;
              pageIndex += 1;
            }

            currentPage.appendChild(block);
            currentBucket += blockSize;
          });

          if (currentPage.children.length) pages.push(currentPage);
        }
        if (pages.length < 2) return false;

        storyNode.innerHTML = '';
        paginatedPages = pages;
        activePageIndex = 0;

        paginatedPages.forEach(function (page, index) {
          page.setAttribute('data-page-index', String(index + 1));
          storyNode.appendChild(page);
        });

        storyNode.classList.add('is-paginated');
        storyNode.dataset.paginated = 'true';
        updateStoryPagination();
        return true;
      };

      var updateControlLabels = function () {
        if (playBtn) {
          if (isPlaying && !isPaused) playBtn.textContent = 'Pause';
          else if (isPaused) playBtn.textContent = 'Resume';
          else playBtn.textContent = 'Play';
        }

        if (muteBtn) {
          muteBtn.textContent = volume === 0 ? 'Unmute' : 'Mute';
        }
      };

      var stopReading = function () {
        if (!synth) return;
        synth.cancel();
        isPlaying = false;
        isPaused = false;
        activeUtterance = null;
        updateControlLabels();
      };

      var setSummaryMode = function (nextMode) {
        isSummaryMode = Boolean(nextMode);

        if (readerShell) readerShell.classList.toggle('is-summary-mode', isSummaryMode);
        if (layoutGrid) layoutGrid.classList.toggle('summary-mode-grid', isSummaryMode);

        if (summaryNode) {
          summaryNode.hidden = !isSummaryMode;
          summaryNode.style.display = isSummaryMode ? 'grid' : 'none';
          summaryNode.setAttribute('aria-hidden', isSummaryMode ? 'false' : 'true');
        }
        if (storyNode) {
          storyNode.hidden = isSummaryMode;
          storyNode.style.display = isSummaryMode ? 'none' : '';
          storyNode.setAttribute('aria-hidden', isSummaryMode ? 'true' : 'false');
        }

        if (paginationNav) {
          paginationNav.hidden = isSummaryMode || Math.max(paginatedPages.length, 1) < 2;
        }

        if (summaryBtn) summaryBtn.textContent = isSummaryMode ? 'Original' : 'Summary';

        stopReading();
        setStatus(isSummaryMode ? 'Summary mode enabled' : 'Reading full article');

        if (readerContent) {
          readerContent.style.minHeight = '0px';
          readerContent.style.height = 'auto';
        }

        if (readerShell) {
          readerShell.style.minHeight = '0px';
          readerShell.style.height = 'auto';
        }

        if (paginatedPages.length) {
          updateStoryPagination();
        } else {
          syncPageScopedBlockVisibility();
        }

        requestAnimationFrame(function () {
          updateProgress();
          reportFrameHeight();
        });
        scheduleHeightSync();
        setTimeout(reportFrameHeight, 160);
        setTimeout(reportFrameHeight, 360);
        setTimeout(reportFrameHeight, 760);
      };

      var getActiveText = function () {
        var source = isSummaryMode ? summaryText : storyText;
        return (source || '').replace(/\s+/g, ' ').trim();
      };

      var startReading = function () {
        if (!synth) {
          setStatus('Audio playback is not supported in this browser.');
          return;
        }

        var text = getActiveText();
        if (!text) {
          setStatus('No readable text available.');
          return;
        }

        stopReading();
        activeUtterance = new SpeechSynthesisUtterance(text);
        activeUtterance.rate = 1;
        activeUtterance.pitch = 1;
        activeUtterance.volume = volume;

        activeUtterance.onend = function () {
          isPlaying = false;
          isPaused = false;
          updateControlLabels();
          setStatus(isSummaryMode ? 'Summary ready for listening.' : 'Reading full article');
        };

        synth.speak(activeUtterance);
        isPlaying = true;
        isPaused = false;
        updateControlLabels();
        setStatus(isSummaryMode ? 'Reading summary aloud' : 'Reading article aloud');
      };

      if (summaryBtn) {
        summaryBtn.addEventListener('click', function () {
          setSummaryMode(!isSummaryMode);
        });
      }

      if (pagePrevBtn) {
        pagePrevBtn.addEventListener('click', function () {
          if (activePageIndex <= 0) return;
          activePageIndex -= 1;
          updateStoryPagination();
        });
      }

      if (pageNextBtn) {
        pageNextBtn.addEventListener('click', function () {
          if (activePageIndex >= paginatedPages.length - 1) return;
          activePageIndex += 1;
          updateStoryPagination();
        });
      }

      var handleStoryPageKeydown = function (event) {
        if (isSummaryMode || paginatedPages.length < 2) return;
        var tag = (event.target && event.target.tagName ? event.target.tagName : '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        if (event.key === 'ArrowLeft' && activePageIndex > 0) {
          event.preventDefault();
          activePageIndex -= 1;
          updateStoryPagination();
        }

        if (event.key === 'ArrowRight' && activePageIndex < paginatedPages.length - 1) {
          event.preventDefault();
          activePageIndex += 1;
          updateStoryPagination();
        }
      };

      window.addEventListener('keydown', handleStoryPageKeydown);

      if (playBtn) {
        playBtn.addEventListener('click', function () {
          if (!synth) {
            setStatus('Audio playback is not supported in this browser.');
            return;
          }

          if (isPlaying && !isPaused) {
            synth.pause();
            isPaused = true;
            updateControlLabels();
            setStatus('Audio paused');
            return;
          }

          if (isPaused) {
            synth.resume();
            isPaused = false;
            updateControlLabels();
            setStatus(isSummaryMode ? 'Reading summary aloud' : 'Reading article aloud');
            return;
          }

          startReading();
        });
      }

      if (muteBtn) {
        muteBtn.addEventListener('click', function () {
          if (volume === 0) {
            volume = lastVolume > 0 ? lastVolume : 1;
          } else {
            lastVolume = volume;
            volume = 0;
          }

          if (volumeInput) volumeInput.value = String(volume);
          stopReading();
          updateControlLabels();
          setStatus(volume === 0 ? 'Audio muted' : 'Audio unmuted');
        });
      }

      if (volumeInput) {
        volumeInput.addEventListener('input', function (event) {
          var next = parseFloat(event.target.value);
          if (Number.isNaN(next)) return;
          volume = Math.max(0, Math.min(1, next));
          if (volume > 0) lastVolume = volume;
          stopReading();
          updateControlLabels();
          setStatus('Volume set to ' + Math.round(volume * 100) + '%');
        });
      }

      if (!summaryText && summaryBtn) {
        summaryBtn.disabled = true;
        summaryBtn.classList.add('reader-btn-disabled');
        setSummaryMode(false);
      }

      if (!synth) {
        if (playBtn) playBtn.disabled = true;
        if (muteBtn) muteBtn.disabled = true;
        setStatus('Audio playback is not supported in this browser.');
      }

      paginateStory();
      syncPageScopedBlockVisibility();
      updateControlLabels();

      var onScroll = function () {
        updateProgress();
        updateParallax();
      };

      updateProgress();
      updateParallax();
      scheduleHeightSync();
      var mediaNodes = Array.prototype.slice.call(document.querySelectorAll('img, video'));
      mediaNodes.forEach(function (node) {
        if (!node) return;
        if (node.tagName === 'IMG' && node.complete) return;

        var onMediaReady = function () {
          scheduleHeightSync();
        };

        node.addEventListener('load', onMediaReady, { passive: true });
        node.addEventListener('error', onMediaReady, { passive: true });

        if (node.tagName === 'VIDEO') {
          node.addEventListener('loadedmetadata', onMediaReady, { passive: true });
        }
      });

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      window.addEventListener('resize', reportFrameHeight);
    })();
  </script>
</body>
</html>`;
};

export const generateArticleTemplateHTML = (
  article,
  templateId = DEFAULT_TEMPLATE_ID,
  customTemplate = null,
  templateThemeMode = 'auto',
  runtimeOptions = null
) => {
  const normalized = normalizeArticleTemplateData({
    ...(article || {}),
    templateThemeMode:
      templateThemeMode !== undefined ? templateThemeMode : article?.templateThemeMode
  });
  const template = runtimeTemplate(templateId, customTemplate, runtimeOptions);
  return renderTemplateHtml(normalized, template);
};

export const DEFAULT_ARTICLE_TEMPLATE_ID = DEFAULT_TEMPLATE_ID;
export const CUSTOM_ARTICLE_TEMPLATE_ID = CUSTOM_TEMPLATE_ID;

export const ARTICLE_TEMPLATE_FONT_OPTIONS = Object.entries(FONT_MAP).map(([id, font]) => ({
  id,
  label: font.label
}));

export const ARTICLE_TEMPLATE_LAYOUT_OPTIONS = TEMPLATE_LAYOUT_OPTIONS;
export const ARTICLE_TEMPLATE_THEME_OPTIONS = TEMPLATE_THEME_OPTIONS;
export const CUSTOM_TEMPLATE_BLOCK_OPTIONS = CUSTOM_STUDIO_BLOCK_TYPES;
export const CUSTOM_TEMPLATE_BORDER_STYLE_OPTIONS = CUSTOM_STUDIO_BORDER_STYLES;
export const CUSTOM_TEMPLATE_UNDERLINE_STYLE_OPTIONS = CUSTOM_STUDIO_UNDERLINE_STYLES;
export const CUSTOM_TEMPLATE_TEXT_ALIGN_OPTIONS = CUSTOM_STUDIO_TEXT_ALIGN_OPTIONS;
export const CUSTOM_TEMPLATE_PAGINATION_MODE_OPTIONS = CUSTOM_TEMPLATE_PAGINATION_OPTIONS;
export const CUSTOM_TEMPLATE_DEVICE_OPTIONS = CUSTOM_TEMPLATE_DEVICE_OPTIONS_LIST;
export const CUSTOM_TEMPLATE_IMAGE_FIT_OPTIONS = CUSTOM_STUDIO_IMAGE_FIT_OPTIONS;
export const CUSTOM_TEMPLATE_CAPTION_STYLE_OPTIONS = CUSTOM_STUDIO_CAPTION_STYLE_OPTIONS;
export const CUSTOM_TEMPLATE_VIDEO_LAYOUT_OPTIONS = CUSTOM_STUDIO_VIDEO_LAYOUT_OPTIONS;
export const CUSTOM_TEMPLATE_PAGE_PLACEMENT_OPTIONS = CUSTOM_STUDIO_PAGE_PLACEMENT_OPTIONS;
export const CUSTOM_TEMPLATE_BORDER_PRESET_OPTIONS = CUSTOM_STUDIO_BORDER_PRESET_OPTIONS;
export const CUSTOM_TEMPLATE_HIGHLIGHT_PRESET_OPTIONS = CUSTOM_STUDIO_HIGHLIGHT_PRESET_OPTIONS;
export const CUSTOM_TEMPLATE_SHAPE_PRESET_OPTIONS = CUSTOM_STUDIO_SHAPE_PRESET_OPTIONS;
export const customTemplateHasProductTagAnchor = (customTemplate, runtimeDevice = null) => {
  if (!customTemplate || typeof customTemplate !== 'object') return false;

  const normalized = normalizeCustomTemplate(customTemplate);
  const studios = normalized?.studios || {};
  const requestedDevice = cleanEnum(
    cleanText(runtimeDevice, ''),
    CUSTOM_TEMPLATE_DEVICE_OPTIONS_LIST.map((option) => option.id),
    ''
  );
  const studioKeys = requestedDevice
    ? [requestedDevice]
    : CUSTOM_TEMPLATE_DEVICE_OPTIONS_LIST.map((option) => option.id);

  return studioKeys.some((key) =>
    Array.isArray(studios[key]?.blocks)
    && studios[key].blocks.some((block) => block?.visible !== false && block?.type === 'product-tags')
  );
};
export const canUseCustomTemplateShapeForBlockType = (blockType) =>
  isCustomStudioShapeEligibleTypeInternal(blockType);
export const getCustomTemplateShapeClipPath = (
  shapePreset,
  shapeNotch,
  shapeOffset,
  shapeGridCols,
  shapeGridRows,
  shapeMaskCells
) =>
  resolveCustomStudioShapeClipPath(
    shapePreset,
    shapeNotch,
    shapeOffset,
    shapeGridCols,
    shapeGridRows,
    shapeMaskCells
  );
export const CUSTOM_TEMPLATE_GRID_LIMITS = {
  columns: CUSTOM_STUDIO_DEFAULT_COLUMNS,
  minColumns: CUSTOM_STUDIO_MIN_COLUMNS,
  maxColumns: CUSTOM_STUDIO_MAX_COLUMNS,
  minRows: CUSTOM_STUDIO_MIN_ROWS,
  maxRows: CUSTOM_STUDIO_MAX_ROWS,
  minRowHeight: 24,
  maxRowHeight: 54
};

export const articleTemplates = VISIBLE_TEMPLATE_PRESETS.map((template) => ({
  ...template,
  generateHTML: (article, customTemplate, templateThemeMode = 'auto') =>
    generateArticleTemplateHTML(article, template.id, customTemplate, templateThemeMode)
}));

export const getArticleTemplateById = (templateId) =>
  articleTemplates.find((template) => template.id === templateId)
  || PRESET_MAP[CUSTOM_TEMPLATE_ID]
  || articleTemplates[0];

export const curatedArticleTemplateIds = CURATED_TEMPLATE_IDS.slice();
export const visibleArticleTemplateCount = VISIBLE_TEMPLATE_PRESETS.length;












