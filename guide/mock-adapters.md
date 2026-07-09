# Mock Adapters

This guide gets you from zero to your first encrypted upload and retrieval in a few minutes,
using dStorage's in-memory Mock adapters — no Midnight wallet, no Docker, no external services.
They're fully self-contained and behave like the real storage/chain adapters, just without the
network calls.

## Prerequisites

- Node.js 22 or later
- npm

That's it — Mock adapters need no wallet extensions, no proof server, and no tokens.

Fast track: clone [`starter-template`](https://github.com/dStorageTech/dstorage-docs/tree/main/starter-template) and wire up this guide's adapters in minutes.

## Install

```sh
npm install @dstorage-tech/dstorage
```

## Step 1 — Configure the SDK

`DStorage` is configured with three kinds of adapters, each with a distinct job:

- **`storageAdapter`** — where the encrypted bytes are stored. `MockStorageAdapter` keeps them
  in memory.
- **`chainAdapter`** — where the on-chain reference (the tamper-proof pointer to your data) is
  written. `MockChainAdapter` simulates this without a real blockchain.
- **`encryptionAdapters`** — how the per-upload encryption key is protected.
  `PasswordEncryptionAdapter` derives it from a password you provide.

```typescript
import {
  DStorage,
  MockStorageAdapter,
  MockChainAdapter,
  PasswordEncryptionAdapter,
} from "@dstorage-tech/dstorage";

const sdk = new DStorage({
  storageAdapter: new MockStorageAdapter(),
  chainAdapter: new MockChainAdapter(),
  encryptionAdapters: [
    new PasswordEncryptionAdapter({
      password: "Correct-Horse-Battery!",
      salt: "myapp:v1",
    }),
  ],
});
```

The `salt` scopes key derivation to your application — use an app-specific label like this one,
not a per-user secret.

## Step 2 — Init, store, retrieve

```typescript
await sdk.init();

const { chainRefId } = await sdk.store(
  new TextEncoder().encode("hello, dStorage"),
);

const { bytes } = await sdk.retrieveByRefId(chainRefId);
console.log(new TextDecoder().decode(bytes)); // "hello, dStorage"
```

What happened at each step:

1. **`sdk.init()`** prepares the SDK — with a `chainAdapter` configured, this is where the
   `DataRegistry` contract gets deployed (or joined, if you passed an existing address — more on
   that in the [Midnight Adapters](/guide/midnight-adapters) guide).
2. **`sdk.store()`** encrypts your data on the client with a fresh random key before anything
   leaves the process, uploads the ciphertext via the storage adapter, and writes an encrypted
   reference on-chain via the chain adapter. It returns a `chainRefId` — your handle for
   retrieving the data later.
3. **`sdk.retrieveByRefId()`** looks up the reference, downloads the ciphertext, and decrypts it
   locally using the same password-derived key. The operator — and the storage/chain adapters
   themselves — never see the plaintext.

## Step 3 — Clean up

Call `sdk.destroy()` when you're done with the instance — on logout, on unmount, or whenever the
SDK is no longer needed:

```typescript
sdk.destroy();
```

This immediately wipes the in-memory key material (the live encryption adapters and any wallet
reference) so it doesn't linger in the JS heap for the lifetime of the process or page. It does
**not** delete any stored data or on-chain references — only the local key material.

## Learn More

- Browse the [FAQ](/faq/) for answers on encryption, adapters, and troubleshooting.
