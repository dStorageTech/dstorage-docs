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

- **Encryption providers** — calls each configured `EncryptionAdapter`'s own `destroy()` method (for adapters that implement it, e.g. `KeypairEncryptionAdapter` zeroes its secret key bytes) before dropping the SDK's references to them
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
      // Safe to persist — keyEnvelope is the encryption key already wrapped by your configured adapter
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

`keyEnvelope` is the per-upload encryption key already wrapped by your configured encryption adapter — it is safe to persist to localStorage or a database. The raw encryption key is never exposed. For public uploads, `keyEnvelope` is `undefined` and the content remains publicly accessible via `retrieveByStorageId(recovery.storageId)`. `contentHash` is the BLAKE3 hex digest of the stored ciphertext — pass it to `registerReference()` so the recovered reference carries the same on-chain integrity commitment.

### How do I preserve a deployed contract address across runs?

`init()` returns the `contractAddress` of the deployed (or joined) `DataRegistry` contract. Save it and pass it as `contractAddress` to `MidnightChainAdapter` on subsequent runs to reconnect instead of deploying a new one each time.

### Can I estimate costs before uploading?

Yes:

```typescript
const estimate = await sdk.estimateCost(bytes.byteLength);
// { storageCost: { amount, token }, chainCost: { amount, token }, fileSizeBytes }
```

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

Metadata is encrypted with the same per-upload key as the payload before being written on-chain, and decrypted automatically on retrieval — it is never stored in plaintext. Because there's no encryption key in public mode, passing `metadata` together with `isPublic: true` throws rather than silently storing it unencrypted.

### What scrypt params should I use in tests?

```typescript
new PasswordEncryptionAdapter({
  password: "dstorage-test-passphrase-v1!",
  salt: "test-salt",
  params: { N: 32768, r: 8, p: 1 }, // minimum allowed N — fastest params tests can use
});
```

### Can I integrate dStorage into an existing Midnight app?

Yes. dStorage is designed to sit alongside an existing Midnight app rather than replace anything — the `DataRegistry` contract it uses is independent of your own contract(s), so integrating it is mostly additive. A few ideas for approaching it:

- Reuse the app's existing wallet connection and proof server when configuring `MidnightChainAdapter` (`walletProvider` in Node.js, `connectorName` in the browser) instead of standing up a second wallet flow.
- Deploy `DataRegistry` once and save the resulting `contractAddress` alongside your app's other deployed contract addresses, so later runs join it rather than redeploying.
- Prototype the calling code first with `MockStorageAdapter`/`MockChainAdapter`, then swap in real adapters once `store()`/`retrieveByRefId()` are wired in at the points where your app handles sensitive user data.

The [Midnight Bulletin Board](https://github.com/midnightntwrk/example-bboard) is a small example dApp — a single Compact contract with `post`/`takeDown` circuits for posting and removing one message at a time, with its own wallet and proof server setup — that's a good, low-friction target for practicing exactly this kind of integration: adding dStorage's independent `DataRegistry` contract alongside an app's existing one.

### How do I update the content stored at an existing reference?

Use `sdk.update(refId, newBytes, options?)`. It encrypts the new content with a fresh per-upload encryption key, uploads it to the storage network, then calls `chainAdapter.updateReference()` — proving ownership with the old `ownerSecret` and registering the new one atomically.

- The on-chain pointer is updated in place; the `refId` stays the same.
- Old content is **not** deleted from the storage network — only the on-chain pointer changes.
- Chunking is **not** applied by `update()`. For large replacements, use `store()` to create a new chunked reference and then `removeReference()` on the old one.
- Requires the chain adapter to implement `updateReference()`. Both `MockChainAdapter` and `MidnightChainAdapter` support it; storage-only mode does not.

```typescript
const { chainRefId, storageId } = await sdk.update(refId, newBytes);
```

### How do I rotate encryption adapters without re-uploading content?

Use `sdk.rotateKeys(refId)`. It re-wraps the existing per-upload encryption key using all adapters currently in the instance's `encryptionAdapters` list, then writes the new `keyEnvelope` back on-chain. The storage-network ciphertext is **never touched** and `writtenAt` is preserved to reflect the original upload time.

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

Yes. A plain `import ... from "@dstorage-tech/dstorage-sdk"` already resolves to a browser-safe build automatically in bundlers that honor the package's `"browser"` exports condition (Vite, webpack 5+, Rollup, esbuild) — no separate import needed. If your tooling doesn't resolve conditional exports, or you just want it explicit, the same build is also available at `@dstorage-tech/dstorage-sdk/browser`.

The main constraint is `MidnightChainAdapter`'s `walletMode: "provider"` (facade mode), which only works in Node.js — use `walletMode: "connector"` instead to delegate to a browser wallet extension (leave `connectorName` unset to use whichever wallet is first detected, or set it to prefer a specific one; any wallet implementing the dApp Connector API works). Pass `zkConfigBaseUrl: window.location.origin` so ZK artifacts are fetched over HTTP from the `public/` directory rather than read from disk.
