# Route and Navigation Registry

Last updated: June 26, 2026

## 1. Purpose

This registry defines the public routes and navigation rules that keep the Help Center, policies, safety pages, support forms, contextual Help links, and footer discoverable.

The Help Center is not only content. It also depends on route registration, fallback behavior, public footer visibility, native app routing, and stable callback paths. A release that changes these paths must update the content registry, footer, contextual links, Android protocol, and tests together.

## 2. Current Public Support Route Family

| Route | Component | Purpose | Footer visibility |
|---|---|---|---|
| `/help` | `HelpCenter` | Help Center home and search | Yes |
| `/help/category/:categoryId` | `HelpCategory` | Category browsing | Yes |
| `/help/article/:slug` | `HelpArticle` | Task guidance and troubleshooting | Yes |
| `/policies` | `PolicyCenter` | Policy directory | Yes |
| `/policies/:slug` | `PolicyDetail` | Policy detail and draft pages | Yes |
| `/safety` | `SafetyCenter` | Safety actions and report/appeal guidance | Yes |
| `/contact` | `SupportRequest` | General support intake | Yes |
| `/report` | `SupportRequest` | Safety, abuse, fraud, and content report intake | Yes |
| `/appeals` | `SupportRequest` | Enforcement and seller decision appeal intake | Yes |
| `/privacy` | `PrivacyPolicy` | Current privacy page | Yes |
| `/terms` | `TermsOfService` | Current terms page | Yes |
| `/about` | `About` | Public product information | Yes |

## 3. Android and OAuth Routes

| Route | Purpose | Release note |
|---|---|---|
| `/` | Web landing page or native redirect to `/home` | Android must not show the public landing page as the first screen |
| `/home` | Native and authenticated app home | Android root/minimize behavior depends on this route |
| `/auth/google/callback` | Google OAuth callback | Must match deployed provider redirect setup |
| `/auth/facebook/callback` | Facebook OAuth callback | Must match deployed provider redirect setup |
| `/auth/twitter/callback` | X/Twitter OAuth callback | Must match deployed provider redirect setup |
| `/auth/linkedin/callback` | LinkedIn OAuth callback | Must match deployed provider redirect setup |

## 4. Footer Visibility Rules

The shared public footer must appear on:

- `/about`
- `/privacy`
- `/terms`
- `/help` and all `/help/...` routes
- `/policies` and all `/policies/...` routes
- `/safety`
- `/contact`
- `/report`
- `/appeals`

The footer is intentionally not shown on every authenticated workflow surface. Contextual Help links cover those point-of-use workflows.

## 5. Current Planned or Deferred Routes

| Route | Status | Reason |
|---|---|---|
| `/status` | Deferred | Public service-status provider/page is still an open decision in D-022 |
| iOS routes or app-specific deep links | Deferred | No verified iOS project exists |
| Android App Links | Deferred | D-028 remains open and provider return paths need physical-device verification |

Do not add these routes to footer or Help tests as required destinations until product behavior exists.

## 6. Route Change Rules

When a route is renamed, removed, or added:

- Update `redirect/src/App.js`.
- Update Help content action links and contextual links.
- Update `redirect/src/components/PublicFooter.js` when the route is part of public navigation.
- Update `redirect/src/content/helpCenterContent.test.js`.
- Update affected planning inventory files.
- Add redirects or backwards-compatible aliases when stable public links already exist.
- Re-run Help tests, production build, and Android sync if mobile routing is affected.

## 7. Verification

`redirect/src/content/helpCenterContent.test.js` verifies that:

- App route registration includes Help, policy, safety, contact, report, appeal, OAuth callback, and Android root behavior.
- Public footer visibility includes the required public route prefixes.
- Footer and article-action links resolve to known destinations.
- Source Help links route to registered articles or categories.

Run from `redirect`:

```text
npm run test:help -- --runInBand
```

## 8. Release Rule

The Help Center route layer is not release-complete if:

- A public Help, policy, safety, contact, report, or appeal route is missing.
- A footer or article-action link points to an unregistered destination.
- Android opens to the wrong first route.
- OAuth callback routes do not match provider and backend configuration.
- A route change breaks previously published Help, policy, footer, or contextual Help links without a redirect or approved migration.
