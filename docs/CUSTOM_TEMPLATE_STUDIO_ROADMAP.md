# Custom Template Studio Roadmap (PR-Sized)

Goal: turn `Custom Studio` from preset tweaking into a true visual article-template builder with drag, resize, and per-section styling.

## PR-C1: Foundation (Done in this pass)
- Add normalized custom-studio schema (`studio.rows`, `studio.rowHeight`, `studio.blocks`).
- Add block model for: title, meta, image, content, highlights, tags, video, quote.
- Add drag-and-resize playground in template preview custom studio.
- Add block-level controls:
  - section color
  - text color
  - border color/width/style/radius
  - underline style/color
  - text alignment
  - padding and shadow level
- Render the same saved custom layout in template HTML so preview + published layout stay consistent.

## PR-C2: Advanced Section Tools
- Group select + multi-block alignment (left/center/right, top/middle/bottom).
- Duplicate/lock block, z-order controls, quick spacing presets.
- Border pattern presets (editorial corners, stitched lines, magazine ribbons).
- Highlight presets (marker, spotlight stripe, quote emphasis badges).

## PR-C3: Media Composer
- Add gallery strip block and collage block.
- Support multiple video cards with layout modes (single, split, grid).
- Image focal-point controls and caption style presets.

## PR-C4: Responsive Designer
- Add desktop/tablet/mobile layout variants.
- Device switcher in studio with per-device block overrides.
- Responsive safety checks and overflow warnings.

## PR-C5: Pagination for Long Articles
- Auto page-splitting for long content/media-heavy articles.
- Next/Prev page navigation controls in template runtime.
- Page-specific block overrides for hero and media blocks.

## PR-C6: Reusable Template Library
- Save custom templates as reusable presets.
- Duplicate/share/delete custom presets.
- Template scoring assistant to suggest best preset based on article signals.
