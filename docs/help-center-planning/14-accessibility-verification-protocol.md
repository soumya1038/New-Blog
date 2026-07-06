# Accessibility Verification Protocol

Last updated: June 27, 2026

## 1. Purpose

This protocol defines how Lekhon verifies accessibility for the Help Center, policy pages, Safety Center, support/report/appeal forms, public footer, contextual Help links, and Android Help behavior.

The public Accessibility Statement remains blocked until D-030 approves the conformance target and audit process. Until then, this protocol is the internal release checklist for finding and fixing barriers before launch.

## 2. Working Target

Use WCAG 2.2 AA as the working product-quality target for new Help, policy, support, and footer surfaces unless the approved accessibility decision register sets a different target.

Do not publish a public conformance claim until:

- D-030 is approved.
- Manual assistive-technology checks are complete.
- Known critical barriers have owners and release decisions.
- The Accessibility Statement has legal and accessibility review.

## 3. Required Test Surfaces

| Surface | Routes or examples | Required checks |
|---|---|---|
| Help Center home | `/help` | Landmarks, H1, search label, zero-result state, category links, keyboard focus, mobile layout |
| Category pages | `/help/category/account-access`, `/help/category/selling`, `/help/category/android` | Breadcrumbs, article rows, headings, mobile layout |
| Article pages | OAuth, order help, add product, report, appeal, seller payout | Breadcrumbs, on-page navigation, workflow strips, callouts, actions, reference preservation |
| Policy pages | `/policies`, published policy, draft policy | Draft status, effective date, table/list readability, contact route |
| Safety Center | `/safety` | Safety action cards, emergency wording, report/appeal paths |
| Support forms | `/contact`, `/report`, `/appeals` | Labels, required fields, errors, success state, reference field, keyboard submit |
| Public footer | Shared footer desktop and mobile | Column headings, disclosure accordions, link text, social labels, keyboard reachability |
| Contextual Help | Checkout, add product, login, orders, privacy, seller, chat | Link text, focus order, preserved references, state preservation |
| Android WebView | Help, article, footer, support form, OAuth return | TalkBack, Android back, focus order, keyboard where available |

## 4. Automated and Source-Level Checks

Run from `redirect`:

```text
npm run test:help -- --runInBand
npm run build
```

Run `npm run help:external-worksheet -- --name <external-pass-name>` from the repository root to create the manual accessibility evidence worksheet for the current release candidate. Use `--dry-run` first to confirm the target path and gate counts.

Run `npm run help:accessibility-environment` from the repository root before manual keyboard, NVDA, and TalkBack testing. This records OS, detected desktop browsers, NVDA installation/running status, adb device state, and TalkBack package/service information where available.

Run `npm run help:accessibility-readiness` from the repository root to summarize source-level accessibility affordances, required route surfaces, failed source checks, and remaining keyboard, NVDA, TalkBack, text zoom, contrast, and reduced-motion evidence.

Run `npm run help:accessibility-verification -- --name <accessibility-pass-name>` from the repository root to generate a dated manual accessibility verification packet for keyboard, NVDA, TalkBack, text zoom, contrast, focus/back behavior, reduced-motion, environment identity, and final release decisions. Use `--dry-run` first to confirm the target path and current source counts.

The focused Help test must continue to cover:

- Registered Help categories and articles.
- Footer and article-action destinations.
- Required footer taxonomy.
- Critical workflow strips.
- Source Help links and critical contextual Help links.
- Published versus draft policy metadata.
- Critical search results and zero-result behavior.
- Help accessibility affordances that can be protected at source level.
- The accessibility verification packet command remains wired to the manual screen-reader release gate.

Source-level checks cannot replace screen-reader testing. They only prevent obvious regressions, such as removing visible focus styles, reduced-motion hooks, labels, or required Help links.

## 5. Manual Keyboard Protocol

For each required web surface:

1. Start with the browser address bar focused.
2. Use `Tab`, `Shift+Tab`, `Enter`, `Space`, arrow keys where native controls support them, and `Esc` where dialogs or menus exist.
3. Confirm every interactive element is reachable.
4. Confirm focus is visible at all times.
5. Confirm focus order follows the visual and task order.
6. Confirm forms can be completed and submitted without a mouse.
7. Confirm errors are visible and announced or adjacent to the relevant task.
8. Confirm dialogs, accordions, and menus do not trap focus unless they are modal.
9. Confirm browser back returns to a useful previous state.

Record:

- Browser and version.
- Accessibility environment command output.
- Viewport.
- Route.
- Tester.
- Pass/fail.
- Issue owner.

## 6. NVDA Desktop Protocol

Use Windows with NVDA and a supported browser.

Check:

- Page title and H1 are understandable.
- Main, navigation, footer, form, and article landmarks are discoverable.
- Breadcrumbs announce as navigation.
- Search field has a useful accessible name.
- Category and article links announce enough context.
- Workflow strips read in the correct order.
- Callouts announce important warning or note text.
- Support/report/appeal fields announce label, required state, current value, and error state.
- Success reference number is announced after submission.
- Mobile footer accordions are not the only way to reach policy or support routes on desktop.

Record the screen-reader version, browser, route, and any confusing announcement.
Use `npm run help:accessibility-environment` to seed the browser and NVDA identity fields, then verify the actual route announcements manually.

## 7. TalkBack Android Protocol

Use a physical Android device for release approval. Emulator checks can prepare the build, but they do not replace physical-device TalkBack evidence.

Check:

- App start route announces a meaningful screen.
- Help search, category cards, article links, workflow strips, support forms, and footer accordions are reachable by swipe navigation.
- Android back returns to the previous page before minimizing the app.
- OAuth provider handoff and return do not strand TalkBack focus.
- Camera and microphone permission prompts are understandable and recovery guidance exists after denial.
- Support/report/appeal success references can be reached and copied or recorded.

Record device model, Android version, app build, TalkBack version, route, and result.
Use `npm run help:accessibility-environment -- --serial <device-serial>` to seed adb, device, enabled accessibility service, and TalkBack package evidence when a physical phone is connected.

## 8. Text Zoom and Reflow

Check at:

- 360 x 800.
- 412 x 915.
- 200% browser text zoom.
- Android display size and font size increased.

Pass criteria:

- No horizontal page overflow except intentionally scrollable workflow strips or data tables.
- No clipped buttons, labels, inputs, or footer links.
- Help search and support forms remain usable.
- Workflow strips reflow vertically or remain touch-scrollable with visible content.
- Sticky on-page navigation does not cover article content.

## 9. Contrast and Theme

Check light and dark themes for:

- Body text.
- Muted text.
- Help links.
- Focus outlines.
- Form borders and error messages.
- Footer links and social icons.
- Draft-policy status badges.
- Warning callouts.

Do not rely only on color to distinguish draft, error, warning, or selected states.

## 10. Motion and Animation

Check:

- `prefers-reduced-motion: reduce` removes non-essential Help motion.
- Landing page scroll animation has a reduced-motion alternative before release approval.
- Post-login animation does not block access to content and has a tolerable duration.
- Support/report/appeal forms do not require timed interaction.

## 11. Evidence Template

```markdown
## Accessibility evidence

Release:
Route or workflow:
Platform:
Device/browser:
Assistive technology:
Environment command:
Viewport or display settings:
Tester:
Date:

### Result

Pass / Fail / Exception

### Evidence

- Screenshot/log/video:
- Notes:

### Issues

- Issue:
- Severity:
- Owner:
- Fix required before release: yes/no
```

## 12. Release Rule

The Help Center system is not release-complete if:

- A user cannot reach Help, report, appeal, support, policy, or safety routes by keyboard or screen reader.
- Support/report/appeal forms cannot be completed with assistive technology.
- Accessibility environment identity is missing for the manual test pass.
- Android TalkBack cannot navigate Help and support flows on a physical phone.
- Focus disappears, becomes trapped, or returns to a destructive action unexpectedly.
- Text zoom causes clipped controls or unusable forms.
- A public Accessibility Statement claims a target that has not been approved and verified.
