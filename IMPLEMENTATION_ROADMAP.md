# Blog Platform Hardening Roadmap (PR-Sized)

This roadmap is organized into small, reviewable PRs so we can ship safely without breaking existing behavior.

Current status (development branch):
- Completed: PR-1, PR-2, PR-3, PR-4, PR-5, PR-6
- Next: PR-7 (Full-text search phase 1)

## PR-1: Security Baseline Hardening (Low Risk)
Goal: Add safer defaults for abuse prevention without changing user flows.

Scope:
- Add dedicated comment creation rate limiter (stricter than global API limiter).
- Add comment spam-guard middleware (links flood, repeated text, suspicious patterns).
- Add proxy-aware server setting for correct client IP handling behind hosted infra.
- Tighten helmet configuration for production while preserving compatibility.

Acceptance criteria:
- Normal comments continue to work.
- Obvious spam payloads are rejected with clear messages.
- Rapid-fire comment posting is throttled.
- Existing auth/content APIs remain unaffected.

## PR-2: SEO Core Metadata (Medium Risk)
Goal: Improve discoverability and social sharing previews for blog/article detail pages.

Scope:
- Add per-page title, description, canonical URL.
- Add Open Graph + Twitter card tags from post/article data.
- Add fallback meta values for pages without content data.

Acceptance criteria:
- Blog/article pages render meaningful social preview metadata.
- No regressions in routing or page rendering.

## PR-3: Sitemap, Robots, RSS Feed (Low-Medium Risk)
Goal: Provide crawler and feed endpoints.

Scope:
- Add backend endpoints for sitemap.xml and feed.xml.
- Add robots.txt route with sitemap reference.
- Include published blogs/articles only.

Acceptance criteria:
- sitemap.xml and feed.xml are valid and accessible.
- robots.txt includes sitemap location.

## PR-4: Slug Routing + Redirect Strategy (Medium Risk)
Goal: Human-readable URLs with backward compatibility.

Scope:
- Enforce slug generation/uniqueness at publish/update.
- Support slug-based detail route resolution.
- Add redirect behavior from old slug to new slug.

Acceptance criteria:
- Content can be opened by slug URL.
- Updated slugs still resolve from previous slug via redirect strategy.

## PR-5: Cursor Pagination for Feeds + Comments (Medium Risk)
Goal: Improve scaling and response performance.

Scope:
- Implement cursor pagination in blogs/articles list endpoints.
- Implement cursor pagination in comment threads.
- Keep backward-compatible query params where possible.

Acceptance criteria:
- Large lists load incrementally with stable ordering.
- Existing UI continues functioning or gets safe adapter updates.

## PR-6: Redis Caching Layer (Medium Risk)
Goal: Reduce DB pressure for hot reads.

Scope:
- Add Redis dependency and connection bootstrap with fallback.
- Cache high-traffic list/detail endpoints with TTL.
- Invalidate related keys on publish/update/delete.

Acceptance criteria:
- Cache hit/miss behavior observable in logs.
- Data freshness preserved after writes.

## PR-7: Full-Text Search (Phase 1) (Medium Risk)
Goal: Ship practical search quickly with upgrade path.

Scope:
- Add Mongo text indexes and weighted search endpoint.
- Add ranking + pagination for search results.
- Keep interface compatible for future Meilisearch/Typesense swap.

Acceptance criteria:
- Users can search titles/content with relevance ordering.
- Search remains responsive on moderate data volume.

## PR-8: Background Jobs + Async Email Pipeline (Medium-High Risk)
Goal: Decouple slow work from request path.

Scope:
- Add queue worker service (BullMQ) for email + indexing jobs.
- Move verification/reset/welcome emails to queued workers.
- Add retry and dead-letter handling basics.

Acceptance criteria:
- API responses are not blocked by email sending.
- Failed jobs are retried and observable.

## PR-9: Error Tracking + Runtime Visibility (Low-Medium Risk)
Goal: Capture production errors before users report them.

Scope:
- Add Sentry backend integration.
- Add Sentry frontend integration in redirect app.
- Include release and environment metadata.

Acceptance criteria:
- Unhandled frontend/backend exceptions appear in Sentry.
- No impact on normal application behavior.

## PR-10: Monitoring + CI/CD Alignment (Medium Risk)
Goal: Reliable deployment and operational confidence.

Scope:
- Add uptime check targets and health endpoint docs.
- Align GitHub Actions workflow with actual repo structure.
- Add minimum checks (lint, build, smoke).

Acceptance criteria:
- CI passes on development branch.
- Health/uptime checks are externally monitorable.

## Execution order
PR-1 -> PR-2 -> PR-3 -> PR-4 -> PR-5 -> PR-6 -> PR-7 -> PR-8 -> PR-9 -> PR-10

## Notes
- Each PR bumps version before commit.
- Each PR is committed on `development`.
- No push without explicit user approval.
