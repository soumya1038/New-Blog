# Custom Template Persistence Context

Last updated: 2026-04-24 (pass 2)

## Goal
- Make `Use This Template` persist custom templates in the database for the logged-in user.
- Keep custom templates private to the owner unless explicitly shared.
- Ensure published article pages always render the selected template (including custom layout) for every visitor.
- Preserve existing template preview and publishing behavior.

## Scope
- Backend (`backend`):
  - Add template preset model and API routes.
  - Persist article template fields in schema/controller.
- Redirect frontend (`redirect`):
  - Replace local-only preset persistence with API-first sync (fallback to local when unauthenticated).
  - Keep current Custom Studio UX and extend with share visibility controls.

## Functional Requirements
1. User can save a custom template from Template Preview.
2. Saved template belongs to that user and appears only to that user by default.
3. User can toggle sharing for a saved template (`private` / `public`).
4. Publishing an article with a selected template stores template data on the article record.
5. Any visitor opening that published article sees the same template layout.

## Data Model Plan
- `TemplatePreset` collection:
  - `owner` (User ref, required)
  - `name` (string, required)
  - `nameLower` (string, indexed for case-insensitive uniqueness)
  - `template` (Mixed object)
  - `visibility` (`private` | `public`, default `private`)
  - timestamps

## Progress Checklist
- [x] Create this implementation context document.
- [x] Add backend `TemplatePreset` model.
- [x] Add backend controller for CRUD + share toggle.
- [x] Add backend routes and mount in server.
- [x] Extend `Article` schema with template persistence fields.
- [x] Update article create/update controller parsing + persistence.
- [x] Add frontend preset API service.
- [x] Update `TemplatePreview` to sync presets from API (with local fallback).
- [x] Add share/private controls in Custom Studio preset actions.
- [x] Run validation checks (`backend` load checks + `redirect` build).
- [x] Update this document with final completion notes.

## Risks / Edge Cases
- Invalid or oversized template payloads should be rejected gracefully.
- Unauthenticated users should still be able to preview without breaking (local fallback).
- Existing articles without `templateId` should continue rendering with default template.

## Completion Notes
- Added backend template preset persistence:
  - Model: `backend/models/TemplatePreset.js`
  - Controller: `backend/controllers/templatePresetController.js`
  - Routes: `backend/routes/templatePresetRoutes.js`
  - Mounted route: `GET/POST/PUT/DELETE /api/template-presets`, `POST /api/template-presets/:id/share`
- Extended article persistence fields:
  - `templateId`, `customTemplate`, `templateThemeMode`
  - `galleryImages`, `galleryImagePublicIds`
- Updated article controller create/update flows to parse and persist these fields safely.
- Updated `TemplatePreview` to use backend presets for authenticated users, with localStorage fallback.
- Added share/private toggle controls in Custom Studio preset list.
- Validation performed:
  - Backend module load check (`node -e` require checks) passed.
  - Redirect production build passed (`npm run build`).

## Follow-up Refinements (2026-04-18)
- Added explicit `Enable Border` toggle in Custom Studio selected block controls.
- Added one-click `Square Corners (90deg)` action for rigid grid-aligned corners.
- Updated custom-canvas renderer so when multiple `Main Content` blocks are present:
  - article body is split into sequential segments,
  - the first content block keeps the full reader controls,
  - additional content blocks render independent story segments (no duplicated full content).
- Added high-resolution shape freedom while preserving right-angle geometry:
  - Custom Studio now supports adjustable grid columns (8 to 48) per device layout.
  - Drag/resize calculations now follow the active column count, enabling finer rectangular shapes.
  - Runtime renderer now respects per-studio column count with `--studio-grid-columns`.

## Follow-up Refinements (2026-04-19)
- Added stepped orthogonal block shapes (90-degree corners) for text-oriented blocks in Custom Studio:
  - shape presets: `Rectangle`, `Stepped (Left -> Right)`, `Stepped (Right -> Left)`.
  - per-block controls: `Shape Notch` and `Shape Offset`.
  - live shape preview in drag/resize canvas.
  - final article renderer now persists and applies shape masks for compatible blocks.
- Added true cell-paint custom shapes (orthogonal polyform) for text-oriented blocks:
  - new shape preset: `Cell Paint (Custom)`.
  - per-block mask grid controls (`columns`, `rows`) and paintable cell matrix.
  - utilities added to normalize and persist mask cells (`shapeGridCols`, `shapeGridRows`, `shapeMaskCells`).
  - runtime clip-path now generated from the painted cell union boundary.
- Enhanced Cell Paint workflow (next pass):
  - click-drag paint and erase support in shape matrix.
  - one-click `Sample: Reference Step` preset to generate the exact stepped shape requested in feedback.
  - additional guidance hint when Advanced Style Controls are collapsed.
  - improved mask boundary tracing for more reliable clip-path output.
- Merged shape editing into the `Drag & Resize` canvas:
  - new `Canvas Shape Edit` mode for eligible text blocks.
  - in-place paint/erase brush controls directly on the selected block footprint.
  - shape mask now syncs with block resize/span changes so reshaping is easier while arranging layout.
  - keeps media blocks rectangle-only for stability.
- Enforced media stability:
  - image/gallery/collage/video blocks remain rectangular by default for reliable framing and embeds.
  - switching a block type to media auto-resets shape preset to `Rectangle`.

## Follow-up Refinements (2026-04-24)
- Improved Custom Studio shape editing ergonomics in Drag & Resize canvas:
  - added `Edge Drag` as the default canvas shape tool for `Cell Paint (Custom)` blocks.
  - per-row left/right edge handles are now rendered directly on the selected block, so users can drag borders instead of manually toggling many cells.
  - edge dragging keeps orthogonal geometry (90-degree corners) and stays grid-snapped.
- Kept paint/erase as optional fine-tuning tools:
  - users can still switch to `Paint` or `Erase` for micro-adjustments.
  - session state now resets cleanly when changing tools or exiting canvas shape mode.
- Reinforced shape/content consistency:
  - custom shape masks continue to drive runtime block clip-path for both block shell and inner content container.
  - this keeps visible content constrained to the final selected shape in preview and published rendering.

## Follow-up Refinements (2026-04-24, pass 2)
- Reworked Canvas Shape Edit based on UX feedback:
  - removed paint/erase dependency from canvas-shape workflow.
  - removed frame/fill/center/sample cell-paint controls from Selected Block advanced panel.
  - shape editing now uses border-handle dragging only in canvas.
- Added full edge sculpt controls for `Cell Paint (Custom)` blocks:
  - row-level left/right edge handles.
  - column-level top/bottom edge handles.
  - all edits stay grid-snapped with 90-degree geometry.
- Stabilized shape-mode entry to prevent random/inconsistent block forms:
  - entering Canvas Shape Edit now remaps to current span, normalizes profiles, and applies a stabilized mask.
  - if no valid prior mask is present, editor starts from full-rectangle mask for predictable behavior.
- Improved generic block resizing ergonomics in Drag & Resize:
  - added direct resize handles on all four sides (`N/E/S/W`) plus existing corner resize.
  - shape-edit active block suppresses generic resize handles to avoid interaction conflicts.
