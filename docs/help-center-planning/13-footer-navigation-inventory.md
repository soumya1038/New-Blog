# Footer Navigation Inventory

Last updated: June 26, 2026

## 1. Purpose

The public footer is Lekhon's persistent discovery layer for Help, policies, safety, marketplace guidance, Android guidance, and support routes. It must stay compact on mobile, scannable on desktop, and release-safe when policy or support routes change.

This inventory defines the required footer taxonomy and verification rules for the shared footer in `redirect/src/components/PublicFooter.js`. The landing page keeps a matching local footer, but the shared footer remains the primary application footer used across product pages.

## 2. Required Footer Taxonomy

| Column | Required purpose | Current required destinations |
|---|---|---|
| Explore Lekhon | General navigation and platform orientation | `/home`, `/about`, `/marketplace`, `/help/category/android` |
| Create and connect | Writing, AI, messaging, privacy, and safety discovery | `/help/category/writing-publishing`, `/help/category/ai-tools`, `/help/category/community-messaging`, `/help/category/privacy-security`, `/safety` |
| Buy and sell | Marketplace buyer, seller, order, refund, earning, payout, and marketplace policy discovery | `/help/category/marketplace-buyers`, `/help/category/selling`, `/help/article/cancel-order-and-understand-refund`, `/help/article/understand-seller-earnings-and-payouts`, `/policies` |
| Help and safety | Support, reporting, appeals, and account-safety entry points | `/help`, `/contact`, `/report`, `/appeals`, `/help/category/privacy-security` |
| Legal | Policy directory, effective legal pages, AI guidance, and API safety | `/policies`, `/terms`, `/privacy`, `/help/article/use-ai-tools-responsibly`, `/help/article/create-and-protect-api-key` |

## 3. Mobile Behavior

The footer uses:

- Desktop columns for wider screens.
- Mobile disclosure accordions for narrow screens.
- Native `details` and `summary` elements so the links remain keyboard reachable.
- Compact link labels and stable spacing so mobile users can scan without horizontal scrolling.

Mobile release checks must confirm that each accordion opens, link text remains readable, and no footer content creates horizontal overflow at 360 x 800 and 412 x 915.

## 4. Policy and Draft Safety

Footer links may route to the policy directory or effective legal pages, but the footer must not imply that a draft policy is binding. The footer bottom notice must continue to communicate that published policies apply as shown and documents marked in review are not final terms.

When a draft policy moves to effective, update the policy registry, policy approval tracker, footer destination if needed, and release evidence record together.

## 5. Social Links

The footer may include external social links only when:

- The destination is official for Lekhon.
- The link opens with `target="_blank"` and `rel="noopener noreferrer"`.
- The icon link has an accessible label and title.
- The social account can be maintained or removed during release review if inactive.

## 6. Drift Verification

`redirect/src/content/helpCenterContent.test.js` verifies that:

- The shared footer has the required five-column taxonomy.
- Required support, report, appeal, policy, Android, buyer, seller, AI, API, order, and payout destinations remain present.
- Footer link labels are non-empty.
- Footer destinations resolve to registered internal routes, Help categories, Help articles, or policies.

Run from `redirect`:

```text
npm run test:help -- --runInBand
```

## 7. Release Rule

A release that changes Help categories, policy routes, support/report/appeal routes, Android guidance, marketplace guidance, or public legal pages must review this inventory. If a required route is removed or renamed, update the footer, Help content registry, policy registry, release evidence record, and tests in the same change.
