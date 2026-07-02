# Deploying

This site is served at **https://dstorage.pro/docs** — a subpath of the main dstorage.pro
marketing site, not GitHub Pages. It's a static build, published manually (no CI/CD wired up
for this yet).

## 1. Build

```bash
npm install
npm run docs:build
```

Output lands in `.vitepress/dist/`. The `base: '/docs/'` setting in `.vitepress/config.ts`
means every asset/link in that output is already prefixed with `/docs/`, so the build only
works correctly when served under that subpath (not at the domain root).

## 2. Copy into dstorage-pro

The dstorage.pro site's source is `dstorage-pro/public/index.html`, deployed via Firebase
Hosting (`.firebaserc` → project `dstorage-c3a56`) with `public/` as the Hosting root. Copy
the build output there, under a `docs/` subfolder:

```bash
rsync -a --delete .vitepress/dist/ ../dstorage-pro/public/docs/
```

(Adjust the relative path if your checkout layout differs — the two repos are expected to be
sibling directories.) This only touches `public/docs/`; it doesn't touch `public/index.html`
or the marketing site's other assets.

## 3. Deploy dstorage-pro

Deploy `dstorage-pro` however you currently do (e.g. `firebase deploy --only hosting` from
that repo).

**Before deploying, check `firebase.json`'s hosting `rewrites`.** As of this writing there is
no `firebase.json` in the `dstorage-pro` working tree — one existed early in the project's
history with a catch-all rewrite (`{"source": "**", "destination": "/index.html"}`), which
would swallow every request under `/docs/*` and serve the marketing page instead of the docs.
If your current Firebase Hosting config (locally or already live) has anything like that
catch-all, add an exception for `/docs/**` above it, or scope the rewrite more narrowly, before
relying on this deploy.
