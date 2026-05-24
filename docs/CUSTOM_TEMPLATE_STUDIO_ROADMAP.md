# Custom Template Studio Roadmap (PR-Sized)

Reference context: `docs/ORGANIC_TEMPLATE_EDITOR_CONTEXT.md`

Goal: turn `Custom Studio` from preset tweaking into a true visual article-template builder with drag, resize, and per-section styling.

## Status Legend
- `done`: delivered and validated in current app flow
- `in-progress`: partially delivered, refinement/fixes still active
- `blocked`: waiting on dependency/decision before implementation
- `not-started`: planned but not implemented yet

## Delivery Table (C1-C6)
| PR | Scope | Status | Notes |
| --- | --- | --- | --- |
| PR-C1 | Foundation: normalized studio schema, block model, drag/resize, base styling controls, preview/publish rendering parity | done | Core architecture shipped and in use. |
| PR-C2 | Advanced section tools: multi-select align, duplicate/lock, z-order, spacing presets, border/highlight presets | done | Core tools are present in studio UI. |
| PR-C3 | Media composer: gallery strip/collage, multi-video layouts, focal-point controls, caption styles | done | Implemented; caption behavior now controlled to avoid noisy auto text. |
| PR-C4 | Responsive designer: desktop/tablet/mobile studios, device switcher, overflow safety | in-progress | Base implementation shipped; ongoing parity hardening between preview and runtime. |
| PR-C5 | Pagination: long-content split, next/prev runtime navigation, page-specific block behavior | in-progress | Pagination exists; UX and runtime consistency tuning still ongoing. |
| PR-C6 | Reusable library: save/duplicate/share/delete custom presets, recommendation scoring | in-progress | Preset persistence and sharing shipped; library UX refinement continues. |

## Shape Editor Gate Decision (Resolved)
- Current shipping behavior:
  - Canvas Shape Editor is **hidden in Template Preview Studio production UI**.
  - This is enforced by passing `showCanvasShapeEditor={false}` from template preview.
- Engine behavior:
  - Border-handle based shape engine remains in code for controlled future rollout.
- Reason:
  - avoid unstable UX while parity and organic quality passes are prioritized.

## Next Execution Focus
1. Complete PR-C4 parity acceptance criteria for all device buckets.
2. Finish PR-C5 pagination UX consistency in preview and details runtime.
3. Continue PR-C6 library UX polish with non-regression checks.

## Latest Implementation Pass (2026-04-25)
- Enforced runtime studio device binding through `runtimeStudioDevice` so preview/details rendering resolves the intended `desktop/tablet/mobile` studio deterministically.
- Updated custom-canvas render path to read the selected studio from `studios[device]` at runtime instead of relying on mutable `studio` fallback behavior.
- Suppressed noisy auto-caption duplication when media caption text matches the article deck/meta description.
- Refined pagination UX state handling so first/last page views switch nav layout (`next-only` / `prev-only`) and hidden arrows are removed from interaction flow.
- Improved article-details runtime device resolution to use measured frame/container width (plus resize observer) for better custom studio parity against preview device behavior.
- Added custom-studio runtime device classes (`custom-canvas-device-desktop/tablet/mobile`) and tuned mobile/tablet spacing, typography, and pagination control sizing for a more compact organic presentation.
- Added deeper tablet/mobile long-content tuning for custom content blocks (reader toolbar density, story typography, summary spacing, drop-cap scale, and page min-height compaction).
- Removed visible `Columns / Rows / Row Height` sliders from studio UI; grid stays internal and drag/resize is now the primary visible layout workflow.
- Added a focused small-device studio-controls compaction pass: tighter panel padding, responsive one-column control groups on narrow widths, and updated mobile preview/builder viewport heights to reduce clipping under the toolbar.
- Validation:
  - `redirect`: `npm run build` passed.

## Latest Implementation Pass (2026-04-26)
- Parity hardening for custom-studio responsive rendering:
  - Article details runtime now resolves custom studio device from viewport width first, which keeps device bucket selection consistent with real screen breakpoints.
  - Template preview iframe now remounts on template/theme/device changes to avoid stale iframe state when switching desktop/tablet/mobile previews.
- Media polish:
  - Strengthened duplicate-caption suppression logic for custom media blocks so repeated meta-description text is not rendered as noisy image captions.
- Validation:
  - `redirect`: `npm run build` passed.
