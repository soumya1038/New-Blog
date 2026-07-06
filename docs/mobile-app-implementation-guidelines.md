# Mobile App Implementation Guidelines

Date: 2026-07-06
Branch: development

## Selected Design References

- Marketplace, seller, store, payment, and order flows: `output/mobile-app-design-temp/01-marketplace-seller-payment-selected-option-1.png`
- Create, edit, chat, profile, drafts, article, blog, and shorts flows: `output/mobile-app-design-temp/02-content-social-selected-option-b.png`

These two images are the approved visual source of truth for the mobile implementation. Match the structure, priority, density, and interaction model before adding extra polish.

## Main Goal

Create a complete professional mobile app experience for Lekhon across marketplace, seller, creator, reader, chat, profile, payment, and order workflows while preserving the existing application behavior, routes, APIs, authentication, and desktop usability.

## Navigation Rule

Mobile users must always have a clear path from the default workspace to the marketplace.

Primary mobile app tabs:

1. Home
2. Marketplace
3. Create
4. Chat
5. Profile

The Marketplace tab must be visible in the global mobile bottom navigation on the default logged-in workspace. It must not be hidden only inside a hamburger menu or profile menu.

Focused flows can temporarily hide or reduce the bottom navigation when the user is checking out, paying, confirming an order, editing a sensitive seller setting, or completing authentication.

## Implementation Scope

Build the mobile experience in these checkpoints:

1. App shell and navigation
2. Marketplace buyer flows
3. Seller dashboard, store, product, earnings, and payment flows
4. Creator create, edit, drafts, and publishing flows
5. Reader article, blog, short blog, and shorts flows
6. Chat and messaging flows
7. Profile, settings, privacy, support, and account flows
8. Final responsive QA and cleanup

## Checkpoints

### C0 Baseline

Status: complete

- Version updated with `npm run version:push`.
- Current baseline committed and pushed to GitHub.
- Selected design images stored in `output/mobile-app-design-temp/`.
- Focused help/content test passed.

### C1 Guardrails

Status: complete

- This guideline document exists.
- The implementation must follow the selected image references.
- Any major design deviation must be intentional and documented.

### C2 Mobile Shell

Status: complete

Goal:

- Add a persistent mobile bottom navigation.
- Make Marketplace reachable from the default workspace.
- Keep existing desktop navigation functional.
- Avoid route breaks in auth, help, policy, checkout, and seller flows.

Exit criteria:

- Home, Marketplace, Create, Chat, and Profile tabs work on mobile.
- Active tab state is clear.
- Checkout and focused routes behave intentionally.
- Layout does not overlap with bottom navigation.

### C3 Marketplace And Seller

Status: complete

Goal:

- Implement the selected marketplace mobile layout.
- Improve product browsing, product detail, cart/checkout, orders, seller dashboard, seller store, add/edit product, earnings, and payment states.

Exit criteria:

- Buyer can discover products, open products, and reach checkout.
- Seller can understand sales, products, orders, and earnings quickly.
- Store pages feel like public storefronts, not admin screens.

### C4 Creator And Content

Status: complete

Goal:

- Implement the selected content/social mobile layout for create, edit, drafts, article, blog, short blogs, and shorts.

Exit criteria:

- Creator actions are prominent and efficient.
- Drafts and edit flows feel mobile-native.
- Article/blog reading has comfortable typography and media spacing.
- Shorts and short blogs feel like a dedicated mobile consumption flow.

### C5 Chat And Profile

Status: complete

Goal:

- Make chat, profile, settings, privacy, support, and account management complete on mobile.

Exit criteria:

- Chat list and conversation views are usable on small screens.
- Profile has clear creator, seller, and account areas.
- Privacy and sensitive account actions remain accessible.

### C6 Final QA

Status: complete

Goal:

- Verify the implementation against the selected references and existing app behavior.

Required checks:

- `npm --prefix redirect run build`
- `npm --prefix redirect run test:help -- --watchAll=false`
- Mobile browser screenshots for key routes when tooling is available.
- `design-qa.md` updated with final result.

## Do

- Use existing Lekhon tokens, colors, typography direction, route structure, and components when practical.
- Design mobile-first, then keep desktop usable.
- Use real route links and real existing app data structures.
- Keep controls large enough for touch.
- Keep bottom navigation compact and predictable.
- Make seller and creator workflows feel like serious work tools.
- Use existing icon libraries where available.
- Keep changes scoped to mobile app completion unless a shared fix is required.

## Do Not

- Do not hide marketplace access only inside menus.
- Do not break existing auth, OAuth callback, checkout, seller, chat, help, policy, or support routes.
- Do not replace functional pages with static mockups.
- Do not add unrelated features while implementing mobile layout.
- Do not make a new landing page for this task.
- Do not use decorative blobs, generic placeholder boxes, or fake UI assets where the app already has real content.
- Do not create nested cards or oversized marketing sections inside operational app screens.
- Do not make the app visually dominated by one purple, beige, dark slate, or brown/orange theme.
- Do not use desktop tables as the primary mobile layout.
- Do not let fixed bottom navigation cover forms, buttons, chats, or checkout actions.

## Decision Log

- Selected marketplace design: Option 1, Refined Lekhon Native.
- Selected content/social design: Option B, Reader + Messenger First.
- Marketplace entry point: persistent mobile bottom tab from the default workspace.
- Checkout/payment: may use focused chrome to reduce distraction.
- Implementation priority: app shell first, then marketplace/seller, then creator/content, then chat/profile, then QA.
