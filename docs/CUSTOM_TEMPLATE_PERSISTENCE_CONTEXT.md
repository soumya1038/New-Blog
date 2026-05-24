# Custom Template Persistence Context

Last updated: 2026-04-25

Master context for ongoing organic editor evolution:
- `docs/ORGANIC_TEMPLATE_EDITOR_CONTEXT.md`
Historical refinements changelog:
- `docs/CUSTOM_TEMPLATE_REFINEMENTS_CHANGELOG.md`

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
- Payload guardrail:
  - `MAX_TEMPLATE_PAYLOAD_BYTES = 450000` (backend validation ceiling)

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

## Current-State Summary (instead of long history blocks)
- Persistence is API-first for authenticated users with local fallback for unauthenticated sessions.
- Article records persist full template metadata (`templateId`, `customTemplate`, theme mode, gallery fields).
- Custom Studio supports responsive `desktop/tablet/mobile` layouts with shared data contract.
- Runtime now applies explicit device binding (`runtimeStudioDevice`) so custom studio preview and article details can resolve per-device studios consistently.
- Runtime now exposes device-class hooks (`custom-canvas-device-*`) and applies compact tablet/mobile typography-spacing tuning for better small-screen readability.
- Long-form custom content blocks now use denser tablet/mobile reader controls and tighter story-page spacing to reduce visual dead space on small devices.
- Studio now hides direct grid sliders (`columns`, `rows`, `row-height`) from user-facing controls; internal grid values remain persisted and runtime-safe.
- Custom media caption rendering suppresses duplicated deck/meta text to avoid noisy messages below images.
- Shape tooling is border-handle based in engine, with production UI gating controlled separately.
- Historical implementation details are maintained in the dedicated changelog:
  - `docs/CUSTOM_TEMPLATE_REFINEMENTS_CHANGELOG.md`
