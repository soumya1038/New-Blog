# Overall Release Versioning

This project uses:
- separate component versions (`backend/package.json`, `redirect/package.json`)
- one overall app release version (`package.json`) via Git tag + release notes

## Command

```bash
npm run release:overall -- <version> [--tag] [--push-tag]
```

Examples:

```bash
npm run release:overall -- 1.1.0
npm run release:overall -- 1.1.0 --tag
npm run release:overall -- 1.1.0 --tag --push-tag
```

What it does:
1. Reads current component versions:
   - overall (`package.json`)
   - backend
   - redirect
2. Creates release note:
   - `docs/releases/v<version>.md`
3. Updates release index:
   - `docs/releases/RELEASE_LOG.md`
4. Optionally creates annotated Git tag:
   - `v<version>`
5. Optionally pushes tag when `--push-tag` is provided.

## Suggested flow

1. Finish feature/fix commits on `development`.
2. Run tests/build checks.
3. Run:
   - `npm run release:overall -- 1.x.y --tag`
4. Review the generated release note and fill highlights.
5. Commit the release note changes.
6. Push branch.
7. Push tag only when approved.

## Team Versioning Rule (Your Preference)

Before every push to GitHub:
1. During local commit prep (non-main):
   - `npm run version:push`
   - bumps patch only on backend + redirect.
2. Just before push (non-main):
   - `npm run version:prepush`
   - bumps minor while preserving patch on backend + redirect.
3. On `main` branch release:
   - `npm run version:release`
   - bumps overall + backend + redirect (minor promotion, patch preserved).

Example flow on `development`:
- before commit: `1.5.12` -> `1.5.13`
- before push: `1.5.13` -> `1.6.13`

Notes:
- Overall app version bump is blocked on non-main branches.
- `release:overall` with `--tag` is also restricted to `main`.
