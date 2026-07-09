# dStorage Guide Starter

A minimal Node.js/TypeScript project to follow along with the
[dStorage SDK docs guides](https://dstorage.pro/docs/guide/) — clone it, run it, then replace
the code in `src/index.ts` with each guide's snippets as you read through the series (Mock
Adapters → Core Concepts → Local & Simulator Adapters → Midnight Adapters → Managed Adapters).

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

Each later guide swaps in a different combination of adapters (and, from
[Midnight Adapters](https://dstorage.pro/docs/guide/midnight-adapters.html) onward, requires real
infrastructure — a Midnight proof server, a wallet, etc. — as described in that guide's own
Prerequisites section). The overall shape of `main()` in `src/index.ts` — configure, `init()`,
`store()`, `retrieveByRefId()`, `destroy()` — stays the same; only the adapter configuration
changes.
