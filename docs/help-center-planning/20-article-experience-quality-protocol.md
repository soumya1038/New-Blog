# Article Experience Quality Protocol

Status: Active for local Help article UI  
Last updated: June 26, 2026

## 1. Purpose

This protocol defines the user-facing quality rules for individual Help articles. It makes sure articles are not only searchable, but also scannable, mobile-friendly, connected to the right next action, and easy to maintain when product behavior changes.

## 2. Current Implemented Behavior

Help articles currently provide:

- Breadcrumbs back to Help Center and category.
- Title, summary, platform labels, and reviewed date.
- Guide details for topic, platform, audience, and reviewed date.
- On-this-page section navigation.
- Body sections with paragraphs, bullets, numbered steps, workflow strips, actions, notes, and warnings.
- Contextual support/report/appeal escalation panel.
- Local Helpful or Not helpful feedback.
- Related guides selected by category plus keyword, audience, platform, and featured weighting.

## 3. Article Page Quality Rules

Every article page should answer:

1. What is this guide about?
2. Who is it for?
3. Does it apply to web, Android, or both?
4. What should the user do first?
5. What happens next?
6. What can go wrong?
7. What support/report/appeal path applies if self-service is not enough?
8. What related guide should the user read next?
9. When was the article reviewed?
10. How can the user signal that the guide helped or did not help?

## 4. Guide Details Panel

The article side panel must show:

- Topic.
- Applies to.
- Useful for.
- Reviewed date.

Rules:

- The panel must be useful on mobile and desktop.
- The panel must not expose internal-only owner names unless product decides those should be public.
- The reviewed date must match the article metadata.
- The topic must match the registered Help category.

## 5. Escalation Panel

The escalation panel must provide the safest next action when the guide is not enough.

Default action:

- Contact Support.

Conditional actions:

- Report a safety issue when the article relates to abuse, fraud, harassment, threats, impersonation, phishing, unsafe content, or reporting.
- Appeal a decision when the article relates to suspension, rejection, revocation, enforcement, removal, or appeal.

Rules:

- Contact Support should preserve the best matching support category.
- Report and appeal links should preserve a safe source reference when present.
- The panel must warn users not to include passwords, one-time codes, API keys, or full payment details.
- A support path must exist even when self-service steps fail.

## 6. Related Guide Ranking

Related guides should not be random or merely chronological. They should be selected from the same category and ranked by:

1. Shared keywords.
2. Shared audience.
3. Shared platform.
4. Featured status.
5. Title as a stable final tie-breaker.

Rules:

- Related guides must resolve to registered Help articles.
- A category with fewer than three other articles can show fewer related guides.
- Search and contextual-link tests remain the stronger guard for cross-category discovery.

## 7. Mobile Reading Rules

On mobile:

- The guide details and on-this-page navigation appear before the article body.
- Escalation actions stack vertically.
- Related guide rows and feedback controls must not create horizontal overflow.
- Workflow strips may stack when the screen is too narrow.
- Text must remain readable at 200 percent text zoom.

## 8. Accessibility Rules

- Breadcrumbs must use a breadcrumb navigation label.
- On-this-page links must be keyboard reachable.
- Guide details must have an accessible label.
- Workflow strips must expose text labels, not image-only steps.
- Escalation actions must be links with visible text.
- Feedback buttons must expose pressed state.
- Status messages must use a live status region when they appear.

## 9. Review Triggers

Review article experience when:

- A new Help category or article template field is added.
- A route, support category, report category, or appeal category changes.
- Search behavior or related-guide ranking changes.
- Mobile layout changes.
- Article feedback moves from local-only storage to production analytics.
- A visual guide is added to an article.

## 10. Verification

Required checks:

- `npm run test:help -- --runInBand`
- `npm run build`
- Mobile browser or WebView smoke test for at least one article with workflow strip, one article with report escalation, and one article with appeal escalation.
- Keyboard tab pass through breadcrumbs, on-this-page links, escalation actions, feedback buttons, and related guides.
- Text zoom check at 200 percent on a narrow viewport.

## 11. Release Rule

Do not claim the Help article experience is production-ready until the article template, escalation paths, related guides, local feedback, mobile layout, and accessibility checks pass for representative guides. Production analytics and visual-guide completeness remain separate gates.
