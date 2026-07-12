# dStorage Guide Starter

A minimal Node.js/TypeScript project (with a small browser entry for the wallet-connector guide)
to follow along with the
[dStorage SDK docs guides](https://dstorage.pro/docs/guide/) — clone it, run it, then replace
the code in `src/index.ts` with each guide's snippets as you read through the series (Mock
Adapters → Core Concepts → Local & Simulator Adapters → Midnight Network Adapter → Managed Adapters).

## Prerequisites

- Node.js 22 or later
- npm

## Setup

```bash
npm install
npm start
```

Out of the box this runs the [Mock Adapters](https://dstorage.pro/docs/guide/mock-adapters.html)
guide's code: it configures the SDK with fully in-memory adapters, stores an encrypted string,
retrieves and decrypts it, and prints the result — no external services needed.

## Following along with later guides

Core Concepts and Local & Simulator Adapters keep using `src/index.ts` via `npm start` — each
guide swaps in a different combination of adapters, but the overall shape of `main()` —
configure, `init()`, `store()`, `retrieveByRefId()`, `destroy()` — stays the same.

[Midnight Network Adapter](https://dstorage.pro/docs/guide/midnight-network-adapter.html) runs
in the browser instead, since it connects to the Lace wallet extension:

```bash
npm run dev
```

This copies the compiled `DataRegistry` contract's ZK artifacts into `public/`, starts a Vite
dev server, and opens a page (`index.html` + `src/main.ts`) with a **Run** button that walks
through the same `init()` → `store()` → `retrieveByRefId()` sequence — see that guide's
Prerequisites for the proof server, arlocal, and wallet setup it needs first.

[Managed Adapters](https://dstorage.pro/docs/guide/managed-adapters.html) goes back to
`src/index.ts` / `npm start`, since it targets a Node.js backend.
