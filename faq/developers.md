# Developers

### What is the minimal working setup?

```typescript
import {
  DStorage,
  MockStorageAdapter,
  MockChainAdapter,
  PasswordEncryptionAdapter,
} from "@dstorage-tech/dstorage-sdk";

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
await sdk.init();
const { chainRefId } = await sdk.store(new TextEncoder().encode("hello"));
const { bytes } = await sdk.retrieveByRefId(chainRefId);
```

Mock adapters are fully in-memory — no network, no Docker, no tokens required.

### What does `sdk.init()` do?

`init()` prepares the SDK for use: it derives the chain encryption key and, if a `chainAdapter` is configured, calls `chainAdapter.init()` which either deploys a new `DataRegistry` contract or joins an existing one. You must call `init()` before `store()` or `retrieveByRefId()` when using private (encrypted) data.

### Should I call `sdk.destroy()` when I'm done, and why?

Yes, calling `destroy()` is strongly recommended whenever the user logs out, navigates away, or the SDK instance is no longer needed. It immediately wipes all sensitive in-memory state:

- **Encryption providers** — the live `EncryptionAdapter` instances holding derived KEKs
- **Wallet reference** — the in-memory wallet info including the raw seed used to derive keys
- **Initialized flag** — prevents accidental further use of a stale instance

Without an explicit `destroy()` call, this material stays in the JavaScript heap for the lifetime of the process or page. In a browser context that means it persists across route changes and is accessible to any code running in the same tab. In a Node.js server context it stays in memory for the lifetime of the process, potentially across multiple users' sessions if the instance is inadvertently shared.

```typescript
// React example — destroy on logout or unmount
useEffect(() => {
  return () => sdk.destroy();
}, []);

// or on explicit logout
function handleLogout() {
  sdk.destroy();
  router.push("/login");
}
```

`destroy()` does not delete any on-chain data or stored content — it only clears the local key material. You can call `init()` again on the same instance to reinitialise if needed.

### What happens if `store()` succeeds at the storage layer but fails to write the on-chain reference?

`store()` is not atomic: the content is uploaded first, then the chain reference is written. If the chain write fails (network error, timeout, insufficient DUST), the content is permanently on the storage network — paid for — but has no on-chain record, making it unretrievable via `retrieveByRefId()`.

`store()` throws a `StorePartialError` (a `DStorageError` subclass) that includes a `recovery` object with the information needed to retry only the chain write, without re-uploading:

```typescript
import { isStorePartialError } from "@dstorage-tech/dstorage-sdk";

// Reactive recovery — catch the error:
try {
  const result = await sdk.store(bytes);
} catch (err) {
  if (isStorePartialError(err)) {
    const { storageId, storageProvider, keyEnvelope, contentHash } =
      err.recovery;
    // Persist recovery to localStorage or DB — keyEnvelope is safe to store
    localStorage.setItem("pending-store", JSON.stringify(err.recovery));
    // Retry the chain write:
    const { chainRefId } = await sdk.registerReference({
      storageId,
      storageProvider,
      keyEnvelope,
      contentHash, // preserves the on-chain integrity hash for the recovered reference
    });
  }
}
```

For extra resilience, use the proactive path: `onProgress` fires a `"stored"` phase event after the storage write succeeds and **before** the chain write begins. Persist the recovery payload at that point — it covers crashes and page reloads before the chain write completes:

```typescript
await sdk.store(bytes, {
  onProgress(p) {
    if (p.phase === "stored" && p.recovery) {
      // Safe to persist — keyEnvelope is the DEK encrypted under your KEK
      localStorage.setItem("pending-store", JSON.stringify(p.recovery));
    }
  },
});
localStorage.removeItem("pending-store"); // clear on success
```

On app startup, check for a pending recovery:

```typescript
const pending = localStorage.getItem("pending-store");
if (pending) {
  const { storageId, storageProvider, keyEnvelope, contentHash } =
    JSON.parse(pending);
  await sdk.registerReference({
    storageId,
    storageProvider,
    keyEnvelope,
    contentHash,
  });
  localStorage.removeItem("pending-store");
}
```

`keyEnvelope` is the DEK already encrypted under your KEK — it is safe to persist to localStorage or a database. The raw DEK is never exposed. For public uploads, `keyEnvelope` is `undefined` and the content remains publicly accessible via `retrieveByStorageId(recovery.storageId)`. `contentHash` is the BLAKE3 hex digest of the stored ciphertext — pass it to `registerReference()` so the recovered reference carries the same on-chain integrity commitment.

### How do I preserve a deployed contract address across runs?

`init()` returns the `contractAddress` of the deployed (or joined) `DataRegistry` contract. Save it and pass it as `contractAddress` to `MidnightChainAdapter` on subsequent runs to reconnect instead of deploying a new one each time.

### Can I estimate costs before uploading?

Yes:

```typescript
const estimate = await sdk.estimateCost(bytes.byteLength);
// { storageCost: { amount, token }, chainCost: { amount, token }, fileSizeBytes }
```

`executeMetaTransaction()` is a higher-level wrapper that runs the entire pipeline (estimate → encrypt → pay → upload → write reference) and emits progress events at each step.

### How do I pass metadata to an upload?

Use the second argument to `store()`:

```typescript
await sdk.store(bytes, {
  metadata: { filename: "report.pdf", mimeType: "application/pdf" },
  onProgress: ({ phase, chunksUploaded, totalChunks }) => {
    /* … */
  },
});
```

Metadata is stored alongside the on-chain reference and returned during retrieval.

### How do I run tests?

```sh
npm test          # unit tests — fully in-memory, no network required
npm run test:integration  # integration tests — requires arlocal (+ proof server for Midnight suite)
```

Unit tests use `MockStorageAdapter`, `MockChainAdapter`, and fast scrypt params so the suite completes in seconds. Integration tests are skipped gracefully when the required services are not running.

### How do I run only a single integration suite?

```sh
npm run test:integration -- -t "arlocal only"
npm run test:integration -- -t "multi-key wrapping"
npm run test:integration -- -t "full stack"
```

### What scrypt params should I use in tests?

```typescript
new PasswordEncryptionAdapter({
  password: "dstorage-test-passphrase-v1!",
  salt: "test-salt",
  params: { N: 1024, r: 8, p: 1 }, // fast for tests — never use in production
});
```

### What is the build order for packages?

```
crypto → encryption → payment → storage → chain → core
```

Run `npm run build` from the repo root — it respects this order. After modifying any package source, rebuild before running the demo apps.

### Can I integrate dStorage into an existing Midnight app?

Yes. See `QUICK_START.md` for a step-by-step guide that wires dStorage into the [Midnight Bulletin Board](https://github.com/midnightntwrk/example-bboard) example app, reusing its existing wallet and proof server.

### What is `executeMetaTransaction()` and when should I use it?

It is a convenience wrapper that runs the full upload pipeline atomically and fires a progress callback at each step (`estimate` → `encrypt` → `payment_storage` → `upload` → `chain_reference` → `complete`). Use it when you want a single entry point and progress reporting. Use `store()` directly when you need fine-grained control.

### How do I update the content stored at an existing reference?

Use `sdk.update(refId, newBytes, options?)`. It encrypts the new content with a fresh DEK, uploads it to the storage network, then calls `chainAdapter.updateReference()` — proving ownership with the old `ownerSecret` and registering the new one atomically.

- The on-chain pointer is updated in place; the `refId` stays the same.
- Old content is **not** deleted from the storage network — only the on-chain pointer changes.
- Chunking is **not** applied by `update()`. For large replacements, use `store()` to create a new chunked reference and then `removeReference()` on the old one.
- Requires the chain adapter to implement `updateReference()`. Both `MockChainAdapter` and `MidnightChainAdapter` support it; storage-only mode does not.

```typescript
const { chainRefId, storageId } = await sdk.update(refId, newBytes);
```

### How do I rotate encryption adapters without re-uploading content?

Use `sdk.rotateKeys(refId)`. It re-wraps the existing DEK under all adapters currently in the instance's `encryptionAdapters` list, then writes the new `keyEnvelope` back on-chain. The storage-network ciphertext is **never touched** and `writtenAt` is preserved to reflect the original upload time.

Common use cases:

- **Add a recovery key** — include both the primary and the new recovery adapter in the instance, then call `rotateKeys`. Both adapters will be able to decrypt going forward.
- **Change password (full revocation)** — two steps: (1) init with `[old, new]` so `rotateKeys` can unwrap with `old` and re-wrap under both; (2) init a fresh instance with `[new]` only and call `rotateKeys` again to prune the old wrapper from the envelope.

Requires the chain adapter to implement `updateReference()` (same as `update()`).

```typescript
// Add a recovery key to an existing reference
const sdk = new DStorage({
  storageAdapter,
  chainAdapter,
  encryptionAdapters: [
    new PasswordEncryptionAdapter({ password, salt }), // existing
    new MnemonicEncryptionAdapter({ mnemonic: backupPhrase }), // new recovery
  ],
});
await sdk.init();
await sdk.rotateKeys(refId);
```

### How do I list all my on-chain references?

Call `sdk.listReferences()`. It returns a `DataReferenceSummary[]` — one entry per reference in the DataRegistry contract — containing the `refId`, decrypted `storageId`, `storageProvider`, `writtenAt`, and any attached metadata. The SDK automatically decrypts each entry using the configured adapters; references whose envelope cannot be decrypted are returned with a `decryptionError` field rather than throwing.

To look up a known subset without fetching the entire list, pass `refIds`:

```typescript
const all = await sdk.listReferences();
const specific = await sdk.listReferences({ refIds: [refId1, refId2] });
```

Requires a chain adapter. The full (no-filter) path additionally requires the adapter to implement `listReferences()`.

### How do I remove an on-chain reference?

Call `sdk.removeReference(refId)`. The SDK re-derives the `ownerSecret` from the reference and submits a ZK ownership proof. Only the original owner can remove a reference — the chain contract enforces this.

Removing a reference does **not** delete the data from the storage network; it only removes the on-chain pointer. Whether the underlying blob can be reclaimed later depends on the storage provider. Any caller who saved the old `storageId` can still fetch the ciphertext via `retrieveByStorageId()`, but without the `keyEnvelope` they cannot decrypt it.

Requires the chain adapter to implement `removeReference()`.

```typescript
await sdk.removeReference(refId);
```

### What Node.js version is required?

Node.js 22 or later.

### Does the SDK work in the browser?

Yes, with some constraints. Use the browser entry point (`@dstorage/chain/browser`) which excludes Node.js-only adapters. Set `walletMode: "connector"` in `MidnightChainAdapter` to use a browser wallet extension (1AM by default, or Lace, or any other wallet implementing the dApp Connector API). Pass `zkConfigBaseUrl: window.location.origin` so ZK artifacts are fetched over HTTP from the `public/` directory rather than read from disk.
