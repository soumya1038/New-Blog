# Design System Specification: High-End Editorial & Literary Platform

## 1. Overview & Creative North Star: "The Modern Archivist"
This design system is built to honor the written word. It rejects the frantic, cluttered nature of the modern web in favor of a "Modern Archivist" aesthetic—one that combines the structural authority of *The Atlantic* with the breathable, minimalist luxury of *Kinfolk*.

The goal is to create a digital environment that feels like a physical object: heavy paper stock, gold-leaf accents, and intentional whitespace. We break the "template" look by utilizing extreme typographic contrast, asymmetrical layouts, and a total rejection of traditional structural lines (borders).

**Key Principles:**
*   **Intentional Asymmetry:** Use the spacing scale to create offset compositions where text and imagery breathe independently.
*   **Tonal Depth:** Hierarchy is established through the "Deep Forest Night" palette, using layers of darkness rather than lines of division.
*   **The Editorial Breath:** A high-end experience is defined by what you leave out. Large margins (`spacing-20` and `spacing-24`) are not wasted space; they are a sign of premium quality.

---

## 2. Colors: Deep Forest Night
The palette is rooted in the "Deep Forest Night" dark mode. It uses a sophisticated range of greens and muted golds to create a high-contrast, legible, and moody reading experience.

### Primary Palette
*   **Primary (`#e8c265`):** Our Gold. Reserved for moments of high importance, signature call-to-actions, and editorial accents.
*   **Surface (`#01170b`):** The "Deep Forest" base. A near-black green that provides a rich, ink-like foundation.
*   **On-Surface (`#cde9d4`):** Our "Warm Parchment" equivalent for text in dark mode. It reduces eye strain compared to pure white.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. 
Boundaries must be defined solely through:
1.  **Background Color Shifts:** Placing a `surface-container-low` section against a `surface` background.
2.  **Vertical Space:** Using the `spacing-16` to `spacing-24` tokens to denote a new thought or section.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine-paper sheets. Each level of "lift" is achieved by moving up the container scale:
*   **Base Layer:** `surface` (#01170b)
*   **Section Layer:** `surface-container-low` (#082013)
*   **Component Layer:** `surface-container` (#0c2417)
*   **Interactive/Hover Layer:** `surface-container-high` (#172f21)

### Signature Textures: Glass & Gradients
To move beyond a flat UI, use **Glassmorphism** for floating navigation bars or overlays. Use `surface-bright` (#263e2f) at 60% opacity with a `20px` backdrop blur. 
**Pro-Tip:** Apply a subtle linear gradient to main CTAs transitioning from `primary` (#e8c265) to `on-primary-container` (#ac8b34) at a 45-degree angle to simulate the shimmer of gold foil.

---

## 3. Typography: Editorial Authority
Typography is the core of this system. We utilize three distinct families to balance literary prestige with functional clarity.

*   **Display & Headline (Playfair Display / Newsreader):** Used for large-scale editorial titles. These should feel "heavy" and authoritative. 
    *   *Rule:* Use `display-lg` (3.5rem) for main article titles with tight letter-spacing (-0.02em).
*   **Title & Body (Source Serif 4 / Noto Serif):** The "Workhorse" for reading. Optimized for long-form immersion.
    *   *Rule:* All long-form reading must use `body-lg` (1rem) with a generous line-height (1.6) to ensure the "literary" feel.
*   **Labels & UI (IBM Plex Sans / Inter):** Technical clarity. Used for metadata, button labels, and navigation. 
    *   *Rule:* Always set in `uppercase` with `0.05em` letter-spacing to distinguish UI from Content.

---

## 4. Elevation & Depth: Tonal Layering
In this system, depth is felt, not seen. We avoid the "shadow-heavy" look of standard Material Design.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural "recessed" look without a single pixel of shadow.
*   **Ambient Shadows:** If a floating element (like a modal) is required, use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow color must be a darkened version of the background green, never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a container definition, use the `outline-variant` token at 15% opacity. It should be felt as a whisper, not a scream.

---

## 5. Components: The Bespoke UI

### Buttons
*   **Primary:** A solid `primary` (Gold) block. **Sharp corners (0px)**. Text is `on-primary` (#3e2e00), bold, and uppercase.
*   **Tertiary (Editorial Link):** No background. `on-surface` text with a `primary` (Gold) 1px underline that sits 4px below the baseline.

### Cards & Lists
*   **The "No-Divider" Rule:** Never use line dividers between list items. Use `spacing-6` padding and a subtle background shift on hover (`surface-container-highest`).
*   **Editorial Cards:** Use asymmetrical padding. Example: `padding: 2.75rem (spacing-8) 1.4rem (spacing-4)`. Place the category label (IBM Plex Sans) 1rem above the headline (Playfair Display).

### Input Fields
*   **Style:** Minimalist. A single `outline-variant` bottom border (0.5px). 
*   **Interaction:** On focus, the bottom border transforms into a `primary` (Gold) 1px line. Labels float above in `label-sm` sizing.

### Signature Component: The "Progress Serif"
For long-form articles, include a progress indicator that is a simple, vertical Gold line (`primary`) on the left margin of the text, growing as the user scrolls. No numbers, no percentage—just visual flow.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme vertical whitespace to separate major content blocks (e.g., `spacing-24`).
*   **Do** mix serif headlines with sans-serif metadata for a professional, "published" look.
*   **Do** use `0px` border-radius for every single element. Roundness contradicts the "authoritative" brand pillar.

### Don't
*   **Don't** use 1px solid borders to create grids. Use the background colors.
*   **Don't** use pure white (#FFFFFF). It shatters the sophisticated "Deep Forest" mood. Use `on-surface` (#cde9d4).
*   **Don't** use standard "drop shadows." If it doesn't look like it’s glowing or layered naturally, remove it.