# Local & Simulator Adapters

The [Mock Adapters](/guide/mock-adapters) guide used fully in-memory adapters. This guide swaps
them for `ArweaveLocalStorageAdapter` and `MidnightSimulatorChainAdapter` — adapters that behave
like the real thing (real HTTP calls to a local Arweave-compatible node, real DataRegistry
circuit execution) but still need no Midnight proof server, no wallet extension, and no real
tokens.

This is a good next step once Mock Adapters feels too simplified: `refId` values now use the
real circuit-derived format, and ownership checks run exactly as they would against the live
chain — so tests written against these adapters exercise realistic behavior.

## Prerequisites

- Node.js 22 or later
- [arlocal](https://github.com/textury/arlocal) — a local Arweave-compatible node
- No Midnight proof server, wallet extension, or DUST tokens needed —
  `MidnightSimulatorChainAdapter` runs the real `DataRegistry` circuits in-process

## Step 1 — Start arlocal

```sh
docker run -d --rm -p 1984:1984 textury/arlocal
# or, without Docker:
npx arlocal
```

No real AR tokens are needed — arlocal auto-funds test wallets.

## Step 2 — Configure the SDK

`ArweaveLocalStorageAdapter.createWithTestWallet()` generates a fresh JWK wallet and funds it
against your running arlocal instance:

```typescript
import {
  DStorage,
  ArweaveLocalStorageAdapter,
  MidnightSimulatorChainAdapter,
  PasswordEncryptionAdapter,
} from "@dstorage-tech/dstorage";

const { adapter: storageAdapter } = await ArweaveLocalStorageAdapter.createWithTestWallet({
  fundAr: 5,
});

const sdk = new DStorage({
  storageAdapter,
  chainAdapter: new MidnightSimulatorChainAdapter(),
  encryptionAdapters: [
    new PasswordEncryptionAdapter({
      password: "Correct-Horse-Battery!",
      salt: "myapp:v1",
    }),
  ],
});
```

## Step 3 — Init, upload, retrieve

The API is identical to the Mock Adapters guide — that's the point, adapters are interchangeable:

```typescript
await sdk.init();

const { chainRefId } = await sdk.store(new TextEncoder().encode("hello, dStorage"));

const { bytes } = await sdk.retrieveByRefId(chainRefId);
console.log(new TextDecoder().decode(bytes)); // "hello, dStorage"
```

What's different from Mock under the hood:

- **`chainRefId`** is now a real `Bytes<32>` hex string produced by the actual `DataRegistry`
  circuit — not the simplified UUID-style ID `MockChainAdapter` returns.
- **Ownership checks** (`removeReference`, `updateReference`) enforce the same
  `ownerSecret`/`ownerCommitment` logic as the live chain, so tests here catch ownership bugs
  that Mock's simplified checks would miss.
- **Uploads really travel over HTTP** to your local arlocal instance, rather than staying in a
  JS `Map`.

## What's next

- **[Midnight Adapters](/guide/midnight-adapters)** — the real Midnight network, a real wallet, and a live proof server.
- **[Managed Adapters](/guide/managed-adapters)** — production storage via `ArweaveBundlerStorageAdapter` and managed payments.
- Browse the [FAQ](/faq/adapters) for the full adapter reference.
