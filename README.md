# dStorage Docs

Documentation site for the [dStorage SDK](https://github.com/dStorageTech/dstorage-sdk), built with [VitePress](https://vitepress.dev).

## Development

```bash
npm install
npm run docs:dev
```

## Build

```bash
npm run docs:build
npm run docs:preview
```

## Deploying

This site is served at **https://dstorage.pro/docs** — a subpath of the main dstorage.pro, not GitHub Pages.

### 1. Build

```bash
npm install
npm run docs:build
```

Output lands in `.vitepress/dist/`. The `base: '/docs/'` setting in `.vitepress/config.ts`
means every asset/link in that output is already prefixed with `/docs/`, so the build only
works correctly when served under that subpath (not at the domain root).

### 2. Copy into your hosting site

Copy the build output into your hosting project's public/static directory, under whatever
subpath matches the `base: '/docs/'` config above — typically a `docs/` subfolder:

```bash
rsync -a --delete .vitepress/dist/ <path-to-your-hosting-repo>/public/docs/
```

(For example, if your hosting repo is checked out as a sibling directory, that path might look
like `../your-hosting-repo/public/docs/`.) This only touches the `docs/` subfolder; it doesn't
touch the rest of the hosting site's assets.

### Google Analytics (GA4)

The landing page (`index.md`) carries a GA4 tag (`gtag.js`, measurement ID `G-Z4HN3WGRBY`)
injected via the `transformHead` hook in `.vitepress/config.ts`, scoped to that one page. It's
part of the build output, not something to hand-edit in `.vitepress/dist/` or the deployed
`public/docs/index.html` — those get overwritten on every rebuild/copy.
