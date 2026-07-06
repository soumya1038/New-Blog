# Contextual Help Inventory

Last updated: June 26, 2026

## 1. Purpose

This inventory tracks Help Center links that appear inside product workflows instead of only in the footer or Help Center home. These links matter because users often need guidance at the exact moment they are signing in, saving a product, checking out, handling an order, changing privacy settings, reporting safety concerns, or reviewing seller earnings.

Contextual help is considered implemented only when the link appears on the relevant screen, routes to a registered Help article or category, preserves important references where useful, and does not interrupt the user's current work.

## 2. Current Contextual Help Links

| Product surface | Source file | Help destination | Purpose | Reference preserved | Status |
|---|---|---|---|---|---|
| Checkout header | `redirect/src/pages/Checkout.js` | `/help/article/checkout-and-payment` | Helps buyers understand checkout, payment, cancellation, refund, and failed payment behavior | No | Implemented |
| Add product header | `redirect/src/pages/AddProduct.js` | `/help/article/add-and-save-product` | Explains section-by-section local saving, saved drafts, cancel behavior, publish behavior, and expiry | No | Implemented |
| Seller application terms step | `redirect/src/pages/BecomeASeller.js` | `/help/article/apply-to-become-seller` | Helps applicants understand seller application and review expectations | No | Implemented |
| Login password step | `redirect/src/pages/Login.jsx` | `/help/article/secure-a-compromised-account` | Gives account security guidance before or during sign-in | No | Implemented |
| Login suspended-account error | `redirect/src/pages/Login.jsx` | `/help/article/appeal-an-enforcement-or-seller-decision` | Gives appeal guidance when sign-in reports suspension | No | Implemented |
| Delivered order card | `redirect/src/pages/MyOrders.js` | `/help/article/resolve-an-order-delivery-or-return-problem` | Helps buyers resolve delivery, return, refund, and order problems | Order number or order ID | Implemented |
| Order detail page | `redirect/src/pages/OrderDetail.js` | `/help/article/resolve-an-order-delivery-or-return-problem` | Keeps order-help guidance available from the specific order | Order number or order ID | Implemented |
| Profile privacy settings | `redirect/src/components/PrivacySettings.js` | `/help/article/manage-profile-privacy` | Explains profile visibility, message permissions, and contact visibility settings | No | Implemented |
| Seller dashboard header | `redirect/src/pages/SellerDashboard.js` | `/help/article/manage-your-seller-dashboard` | Explains dashboard sections, orders, products, price changes, coupons, and payouts | No | Implemented |
| Seller earnings header | `redirect/src/pages/SellerEarnings.js` | `/help/article/understand-seller-earnings-and-payouts` | Explains earnings, holds, payout request states, and payout risks | No | Implemented |
| Chat conversation menu | `redirect/src/pages/ChatNew.jsx` | `/help/article/report-abuse-fraud-or-unsafe-content` | Gives safety and report guidance from a specific conversation | Username or user ID | Implemented |
| Chat user panel | `redirect/src/pages/ChatNew.jsx` | `/help/article/report-abuse-fraud-or-unsafe-content` | Gives safety and report guidance from the active chat profile panel | Username or user ID | Implemented |
| Safety Center action card | `redirect/src/pages/SafetyCenter.jsx` | `/help/article/block-or-mute-a-user` | Explains blocking and muting before users act | No | Implemented |

## 3. Global Help Navigation

These surfaces are important but are not counted as contextual workflow links:

- Public footer links in `redirect/src/components/PublicFooter.js`.
- Landing page Help and category links in `redirect/src/pages/LandingPage.jsx`.
- Help Center article links, category links, related content, and action links inside Help pages.
- Policy directory links that route to policy documents rather than task guidance.

They are still validated by the Help content test because broken footer and article-action destinations would block release.

## 4. Missing or Future Contextual Links

| Workflow | Needed link | Reason | Status |
|---|---|---|---|
| Account deletion flow | Account deletion and retention guide | Destructive action with irreversible consequences and unresolved retention details | Pending product/privacy decision |
| Register and email verification | Account creation and email verification guide | Helps users recover from missing code, failed verification, or eligibility questions | Pending placement |
| Social OAuth buttons | Social sign-in guide | Android users need provider handoff and redirect guidance before failure | Pending placement |
| API key panel | API key safety guide | Prevents accidental secret exposure | Pending placement |
| Create blog/article/media flows | Publishing and media guide | Helps writers understand drafts, media limits, scheduling, and deletion consequences | Pending placement |
| Product image/camera step | Product image and camera guidance | Permission, content-rights, and photo-capture behavior need point-of-use guidance | Pending visual capture |
| Product detail reviews | Reviews policy and report guidance | Buyers need review standards before submitting or reporting reviews | Pending policy approval |
| Return or refund controls | Order problem guide and refund policy | Return workflow is incomplete and needs safe user guidance | Pending commerce/legal decision |
| Admin support queue | Support operations runbook | Admins need triage, stale, urgent, assignment, and cleanup guidance | Pending owner assignment |
| Chat call and microphone controls | Android permissions and messaging/call safety guides | Permission prompts and consent rules matter at the point of use | Pending call policy decisions |

## 5. Acceptance Rules

Each contextual Help entry must:

- Use a registered `/help/article/:slug` or `/help/category/:id` destination.
- Preserve useful references such as order number, username, or support category when that helps the user continue.
- Open without clearing unsaved form state.
- Avoid replacing a required product workflow with documentation alone.
- Use concise link text that names the task or risk.
- Be visible on mobile and keyboard reachable.
- Be included in `redirect/src/content/helpCenterContent.test.js` when it is a critical workflow link.

## 6. Verification

The Help content governance test scans `redirect/src/pages`, `redirect/src/components`, and `redirect/src/content` for Help article/category links and verifies that each discovered destination exists in the Help registry. It also asserts that the critical contextual surfaces listed above remain linked.

Run from `redirect`:

```text
npm run test:help -- --runInBand
```

## 7. Release Rule

A release that changes checkout, seller, order, login, chat, privacy, report, appeal, Android, or admin support behavior must review this inventory. If a workflow gains a new user-facing consequence, error state, permission prompt, or policy limitation, the release must either add/update contextual Help or record why no point-of-use guidance is needed.
