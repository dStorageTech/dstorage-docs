# Adapters

### What is an adapter and how do the three types compose?

Adapters are the pluggable components you pass to `DStorage` to tell it _where_ to store data, _where_ to write the on-chain record, and _how_ to encrypt the per-upload key. There are three adapter slots:

| Slot       | Config field          | Role                                                    | Required?                                              |
| ---------- | ---------------------- | -------------------------------------------------------- | -------------------------------------------------------|
| Storage    | `storageAdapter`     | Receives encrypted bytes and returns a `storageId`      | Always                                                 |
| Chain      | `chainAdapter`       | Writes the encrypted pointer and key envelope on-chain  | Optional — omit for storage-only mode                  |
| Encryption | `encryptionAdapters` | Wraps the per-upload DEK under each adapter's KEK       | Optional — omit for public (`isPublic: true`) uploads  |

You can supply multiple encryption adapters; any single registered adapter can independently decrypt any upload made while it was in the list.

### `MockStorageAdapter`

In-memory storage for development and testing. Stores encrypted bytes in an in-memory `Map` on Node.js or `localStorage` in the browser. No network, no tokens, no Docker required. Generates 43-character base64url `storageId` values in the same format as real Arweave IDs, so code that handles `storageId` values works identically against real and mock storage. Uses a MOCK pricing model for `estimateCost()` calls. Optionally accepts `signingServerUrl` and `authToken` to exercise managed payment request/response round-trips in tests without touching real funds.

```typescript
const sdk = new DStorage({
  storageAdapter: new MockStorageAdapter(),
  chainAdapter: new MockChainAdapter(),
  encryptionAdapters: [adapter],
});
```

### `ArweaveLocalStorageAdapter`

Local Arweave integration testing. A drop-in replacement for `ArweaveStorageAdapter` that connects to a local arlocal node (`localhost:1984`) instead of the Arweave mainnet. No real AR tokens are needed. The recommended setup is the `createWithTestWallet()` factory, which generates a fresh JWK wallet and auto-funds it:

```typescript
const { adapter } = await ArweaveLocalStorageAdapter.createWithTestWallet({
  fundAr: 5,
});
const sdk = new DStorage({ storageAdapter: adapter /* … */ });
```

The adapter exposes a `.testnet` helper with utilities for controlling the local node: `mine(blocks)` to fast-forward the blockchain, `mintTokens(address, winstons)` to fund wallets, `getBalance(address)`, `isRunning()`, and `reset()` for a clean slate between test runs.

arlocal must be running before using `ArweaveLocalStorageAdapter`:

```sh
docker run -d --rm -p 1984:1984 textury/arlocal
# or: npx arlocal
```

### `ArweaveStorageAdapter`

Permanent Arweave storage. Uploads to the Arweave permaweb: pay once, store forever. Signing is handled by the ArConnect browser extension (browser) or a JWK wallet file (Node.js). The adapter tags every upload with a BLAKE3 `X-Content-Hash` and verifies it on retrieval — pass `skipIntegrityCheck: true` only when using a fully trusted private gateway. Uploads are optimistic (HTTP 202); if you need to block until the transaction is confirmed on-chain, set `waitForConfirmation: true` (expect 2–20 minutes). For development against the Arweave testnet, use `gateway: { host: "arweave.dev", port: 443, protocol: "https" }`.

```typescript
// Browser — ArConnect handles signing
const sdk = new DStorage({
  storageAdapter: new ArweaveStorageAdapter(),
  // …
});

// Node.js — JWK wallet file
const sdk = new DStorage({
  storageAdapter: new ArweaveStorageAdapter({
    walletKey: JSON.parse(fs.readFileSync("wallet.json", "utf8")),
  }),
  // …
});
```

Requires a funded AR wallet by default (local signing via `walletKey`). To avoid requiring end-users to hold AR, pass `signingServerUrl`/`authToken` instead to delegate signing to a managed service (see [What is dStorage Pro?](./managed-payments#what-is-dstorage-pro) in the Managed Payments section) — the same mechanism `ArweaveBundlerStorageAdapter` requires unconditionally (it has no local-signing mode; omitting `signingServerUrl` throws). The Bundler adapter's advantage isn't avoiding a wallet — both need a managed signing service to do that — it's near-instant ANS-104 finality instead of the 2–20 minute L1 confirmation wait.

`retrieve()` — the method that downloads previously stored content back from Arweave — is bounded by the `maxRetrieveSizeBytes` constructor option (default 256 MiB): the adapter rejects the download upfront if the transaction metadata reports a larger `data_size`, and rejects again after loading if the actual byte count exceeds the limit anyway. This guards against a gateway serving a misleadingly small `data_size` or an unexpectedly huge blob.

### `ArweaveBundlerStorageAdapter`

Fast finality via managed signing. Uploads via the ANS-104 Arweave bundler, which delivers near-instant finality compared to the 2–20 minute wait for Arweave L1 transactions. The signing server holds a funded bundler account, so end-users need no AR wallet — see [What is dStorage Pro?](./managed-payments#what-is-dstorage-pro) in the Managed Payments section for the managed service this adapter relies on. Privacy is preserved: only a 48-byte ANS-104 `deep_hash` is sent to the server — the file bytes never leave the client.

```typescript
const sdk = new DStorage({
  storageAdapter: new ArweaveBundlerStorageAdapter({
    signingServerUrl:
      process.env.DSTORAGE_SERVICE_URL ?? "https://dstorage.pro",
    authToken: process.env.DSTORAGE_AUTH_TOKEN ?? "",
  }),
  // …
});
```

The `authToken` uses the compound `ds_<credential>.<base64url_modulus>` format. The modulus is the server's RSA-4096 public key and is pinned at construction time — if the server rotates its key the adapter immediately detects the mismatch, and the token must be re-issued.

`retrieve()` — the method that downloads previously stored content back from Arweave — makes two network calls to the gateway: one for the transaction metadata/tags (used to look up and verify the content), and one for the actual data bytes. Two constructor options bound both against a slow or misbehaving gateway: `requestTimeoutMs` (default 30 s, `0` disables it) aborts either call if it takes too long; `maxMetadataResponseBytes` (default 1 MiB) caps how large the metadata/tags JSON response is allowed to be, since a hostile gateway could otherwise return an oversized body to exhaust memory even though real metadata/tags are always tiny.

### `MockChainAdapter`

In-memory chain adapter for development and testing. Stores on-chain references in an in-memory `Map` on Node.js or in `localStorage` in the browser (browser state survives page reloads). Enforces the same SHA-256 `ownerSecret` commitment check as the real DataRegistry contract, so ownership-gated operations (`removeReference`, `updateReference`) behave correctly in tests. `refId` values are UUID-style strings rather than the Bytes<32> format produced by the real circuit. Requires no Midnight node, proof server, indexer, or DUST tokens.

```typescript
const sdk = new DStorage({
  storageAdapter: new MockStorageAdapter(),
  chainAdapter: new MockChainAdapter(),
  encryptionAdapters: [adapter],
});
```

### `HttpGatewayChainAdapter`

Remote REST backend. Delegates reference operations to a custom HTTP/HTTPS service instead of a blockchain. Configure it with four paths (write, read, list, delete) appended to a shared `baseUrl`:

```typescript
new HttpGatewayChainAdapter({
  baseUrl: "https://my-backend.example.com",
  writePath: "/api/refs",
  readPath: "/api/refs",
  listPath: "/api/refs",
  deletePath: "/api/refs",
});
```

All four CRUD operations (`POST /{refId}`, `GET /{refId}`, `GET`, `DELETE /{refId}`) are issued against those paths.

**Fixed request headers** — use the optional `headers` field to send the same headers on every request. This is the standard way to pass API tokens or any other authentication material required by the backend:

```typescript
new HttpGatewayChainAdapter({
  baseUrl: "https://my-backend.example.com",
  writePath: "/api/refs",
  readPath: "/api/refs",
  listPath: "/api/refs",
  deletePath: "/api/refs",
  headers: {
    Authorization: "Bearer my-api-token",
    "X-Api-Key": "abc123",
  },
});
```

For gateways that use a custom CA or mutual-TLS client certificate, pass a preconfigured `fetch`-compatible function via `customFetch`:

```typescript
new HttpGatewayChainAdapter({
  // …
  customFetch: (url, init) => fetch(url, { ...init, agent: myCustomHttpsAgent }),
});
```

Every operation applies a `requestTimeoutMs` (default 30 s, `0` disables it), and `readReference`/`listReferences` cap their JSON response at `maxResponseBytes` (default 10 MiB) — both guard against a hung or hostile gateway.

One important security note: `ownerSecret` is an internal ZK witness that is deliberately stripped before any network call — it is never transmitted to the gateway. Ownership enforcement (whether to honour a remove or update request) is therefore the responsibility of the backend service, not the adapter.

By default, `refId` values are client-generated UUID-style strings (via `crypto.randomUUID()`), matching `MockChainAdapter`'s format — the adapter picks the ID before writing, and the backend just stores it under that key. This isn't enforced on read/list, though: the backend is free to store and return `refId` in any string format (including circuit-derived `Bytes<32>` hex), and a caller can also supply their own `refId` on write to override the client-generated default. No Midnight infrastructure (proof server, indexer, DUST wallet) is needed — cost estimates always return zero.

Typical use cases:

- Staging environments backed by a custom database
- Non-Midnight deployments where a simple REST service is preferable to a blockchain
- Integration testing against a real HTTP service
- Bridging to another blockchain's own reference registry, by implementing the REST backend as a thin proxy in front of that chain

### `MidnightSimulatorChainAdapter`

Real DataRegistry circuits without a live network. Runs the actual DataRegistry Compact circuits in-process via `DataRegistrySimulator`. Ownership enforcement, `ownerSecret`/`ownerCommitment` semantics, and `refId` derivation all match the on-chain behavior exactly — unlike `MockChainAdapter`, which uses simplified UUID-style IDs. No Midnight node, indexer, proof server, or DUST tokens are required. Optionally accepts `signingServerUrl` and `authToken` to exercise the managed payment flow end-to-end in tests.

Use this adapter when you need realistic ZK circuit behavior (correct `refId` format, real commitment checks) in integration tests without standing up Docker infrastructure.

```typescript
const sdk = new DStorage({
  storageAdapter: new ArweaveLocalStorageAdapter(/* … */),
  chainAdapter: new MidnightSimulatorChainAdapter(),
  encryptionAdapters: [adapter],
});
```

### `MidnightChainAdapter`

Real Midnight network. Connects to the Midnight blockchain — `preprod`, `preview`, and `undeployed`/localhost have built-in default endpoints; any other network (e.g. `mainnet`) also works as long as you supply `nodeEndpoint`, `nodeWsEndpoint`, `indexerEndpoint`, `indexerWsEndpoint`, and `proofServerEndpoint` explicitly. Choose a `walletMode` based on your runtime:

- **`"provider"` (Node.js)**: you build and sync a `WalletFacade` yourself, then pass it as `walletProvider`. Also requires `privateStatePassword` (LevelDB encryption) and optionally `zkArtifactsPath` (absolute path to the `keys/` and `zkir/` directories).
- **`"connector"` (browser)**: delegates all key management to a Midnight wallet extension — by default the first wallet discovered under `window.midnight`, or pass `connectorName` (e.g. `"1am"`) to prefer a specific one (matched by rdns, then declared name, then the injected key). Lace, 1AM, or any other wallet implementing the dApp Connector API works. Requires `zkConfigBaseUrl` set to the base URL from which the ZK artifacts are served.

`init()` either deploys a fresh DataRegistry contract or, if you pass `contractAddress`, reconnects to an existing one. Save the returned address across runs to avoid redeploying.

```typescript
import { createRequire } from "node:module";
import path from "node:path";

// The compiled DataRegistry ZK artifacts ship inside the SDK package itself —
// resolve the bundled copy via its package.json rather than hardcoding a path.
const zkArtifactsPath = path.join(
  path.dirname(createRequire(import.meta.url).resolve("@dstorage-tech/dstorage-sdk/package.json")),
  "dist/contracts/dataregistry/managed",
);

// Node.js (provider mode)
new MidnightChainAdapter({
  walletMode: "provider",
  walletProvider, // pre-built, synced AdapterWalletProvider
  privateStatePassword,
  zkArtifactsPath,
  network: "undeployed",
  proofServerEndpoint: "http://localhost:6300",
});

// Browser (connector mode)
new MidnightChainAdapter({
  walletMode: "connector",
  connectorName: "1am",
  zkConfigBaseUrl: window.location.origin,
  network: "preprod",
  proofServerEndpoint: "http://localhost:6300",
});
```

Requires a running Midnight proof server and a wallet funded with DUST. DUST chain fees are handled internally by the connected wallet — no explicit payment config is needed. Optionally pass `signingServerUrl` and `authToken` to route Midnight transaction balancing through [dStorage Pro](./managed-payments#what-is-dstorage-pro) instead of the local wallet.

Start a local proof server with Docker (see [How do I start the local Midnight proof server?](./deployment-configuration#how-do-i-start-the-local-midnight-proof-server) in the Deployment section):

```sh
docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 -- midnight-proof-server -v
```

### `PasswordEncryptionAdapter`

Password-derived encryption. Derives a 64-byte KEK from a user-supplied password using scrypt (memory-hard; default: 128 MB RAM per attempt, matching OWASP 2024 recommendations). Because derivation is deterministic, the same `password` and `salt` always produce the same key on any device — no key backup is needed beyond those two values.

The `salt` is mandatory and must be supplied by the caller. Use an app-scoped domain label (`"myapp:v1"`), a per-user identifier, or a combination. The SDK never supplies a default to avoid silent cross-app key collisions when passwords are reused. Passwords are validated at construction: minimum 12 characters, at least 3 of 4 character classes (uppercase, lowercase, digits, special), no sequential runs, and at least 60 bits of estimated entropy.

For constrained devices (e.g. mobile browsers) where 128 MB is too expensive, pass `preset: "v1-lite"` (64 MB). In tests, pass `params: { N: 32768, r: 8, p: 1 }` for fast derivation — that's the fastest params the SDK allows. The SDK enforces a hard floor on any custom `N` (must be ≥ 32768 and a power of two — the OWASP 2024 minimum); anything weaker throws at construction time rather than silently producing a brute-forceable KDF.

```typescript
new PasswordEncryptionAdapter({
  password: "Correct-Horse-Battery!",
  salt: "myapp:v1",
  // preset: "v1-lite",  // constrained devices only
});
```

::: warning Post-quantum note
Human-chosen passwords rarely reach 256-bit entropy. For the full ~192-bit post-quantum safety at the key layer, use a randomly generated `KeypairEncryptionAdapter` (`generateKeypair()`, secret key backed up separately).

A password- or mnemonic-derived keypair (`fromPassword()` / `fromMnemonic()`) is bounded at ~128-bit by the derivation input's Grover ceiling — still the NIST minimum, but not 192-bit.

If you need a machine-generated credential instead of a human-chosen password, `generateHighEntropyPassword()` (see [What is `generateHighEntropyPassword()`?](./encryption-security#what-is-generatehighentropypassword) in the Encryption & Security section) produces a cryptographically random 43-character string with 256 bits of real entropy, reaching that same ~128-bit PQ floor when passed to `KeypairEncryptionAdapter.fromPassword()`.
:::

### `MnemonicEncryptionAdapter`

BIP-39 mnemonic or hex seed. Derives a KEK via HKDF from a BIP-39 seed phrase or a raw 64-byte hex seed. Requires a 24-word mnemonic — 12-word phrases are rejected at construction because they provide only 64-bit post-quantum security (below NIST's 128-bit minimum). With 24 words the adapter is unconditionally post-quantum safe. The raw seed bytes are imported into a non-extractable `CryptoKey` and zeroed from the JS heap immediately — they are never readable from JavaScript after construction. Like `PasswordEncryptionAdapter`, derivation is deterministic: the same mnemonic always recovers the same key on any device.

Mnemonic validation checks the full BIP-39 checksum, not just that each word is in the wordlist — a phrase with a single-word typo that still happens to land on another real wordlist word is rejected rather than silently deriving a different, wrong key.

```typescript
new MnemonicEncryptionAdapter({ mnemonic: "word1 word2 … word24" });
// or from a hex seed:
new MnemonicEncryptionAdapter({
  seedHex: "a1b2c3…" /* 64 bytes / 128 hex chars */,
});
```

### `KeypairEncryptionAdapter`

ML-KEM768 asymmetric wrapping. Uses CRYSTALS-Kyber (ML-KEM, NIST FIPS 203) for asymmetric DEK encapsulation. The default variant is `mlkem768` (192-bit post-quantum security); `mlkem512` (128-bit) and `mlkem1024` (256-bit) are also available.

The asymmetric design enables upload-only parties: an uploader who holds only the public key can wrap a DEK, but cannot unwrap it — decryption requires the secret key. This is useful for delegated upload scenarios where the client should not be able to read back what it stored.

```typescript
// Generate a fresh keypair:
const { adapter, secretKey } = KeypairEncryptionAdapter.generateKeypair("myapp:v1");
// adapter holds PK+SK — use for full read/write access
// share adapter.publicKey with upload-only parties:
const uploaderOnly = KeypairEncryptionAdapter.fromPublicKey(
  adapter.publicKey,
  "myapp:v1",
);
```

Key sizes for `mlkem768`: public key 1184 bytes, secret key 2400 bytes, KEM ciphertext 1088 bytes.

A keypair can also be derived deterministically from a password instead of generated randomly, the same way `PasswordEncryptionAdapter` derives a symmetric KEK — same `password` + `salt` always recover the same ML-KEM keypair on any device, so there's no secret key to back up separately, only the password and salt:

```typescript
const adapter = await KeypairEncryptionAdapter.fromPassword(
  "s3cr3t!",
  "myapp:user-42", // salt
  "myapp:kek:v1", // context — domain-separation string bound into the KEK derivation
);
```

`KeypairEncryptionAdapter.fromMnemonic()` works the same way for a 24-word BIP-39 mnemonic or hex seed instead of a password:

```typescript
const adapter = await KeypairEncryptionAdapter.fromMnemonic(
  { mnemonic: "word1 word2 … word24" },
  "myapp:kek:v1", // context — domain-separation string bound into the KEK derivation
);
// or from a hex seed:
const sameAdapter = await KeypairEncryptionAdapter.fromMnemonic(
  { seedHex: "a1b2c3…" /* 32 or 64 bytes */ },
  "myapp:kek:v1",
);
```

### `WebAuthnPrfEncryptionAdapter`

Passkey-based encryption via the WebAuthn PRF extension. Instead of a password or mnemonic, key material is derived from a platform passkey's PRF output — so there's nothing for the user to remember or type. Internally, it derives a seed from your passkey and uses it to build two things: a `MnemonicEncryptionAdapter` that locks and unlocks your uploads, and a fixed `KeypairEncryptionAdapter` whose public key you can safely share. Anyone holding that shared public key can encrypt something for you without ever touching your passkey — only you can unlock it, and only by using the passkey again.

Two async static factories cover the two points where a user interacts with their passkey:

```typescript
// First visit — registers a new passkey
const adapter = await WebAuthnPrfEncryptionAdapter.register();
localStorage.setItem(
  "credentialId",
  btoa(String.fromCharCode(...adapter.credentialId)),
);

// Returning visits — re-authenticate with the stored credential
const stored = localStorage.getItem("credentialId")!;
const adapter = await WebAuthnPrfEncryptionAdapter.authenticate([
  Uint8Array.from(atob(stored), (c) => c.charCodeAt(0)),
]);
```

The adapter doesn't persist `credentialId` for you — your app is responsible for saving it (e.g. `localStorage`) and passing it back into `authenticate()` on later sessions, the same way it's responsible for `contractAddress` after `init()`.

For upload-only delegation without a WebAuthn ceremony — e.g. a Node.js backend encrypting content on behalf of a browser-registered passkey owner — use the shared public key directly:

```typescript
const uploaderOnly = WebAuthnPrfEncryptionAdapter.fromPublicKey(adapter.publicKey);
```

`fromPublicKey()` also accepts an optional second argument, `{ shareContext, shareVariant }`, needed only if the owner customized those away from their defaults (see below) — it must match whatever the owner's `register()`/`authenticate()` call used.

Check support before calling `register()`, since PRF isn't available everywhere:

```typescript
if (!(await WebAuthnPrfEncryptionAdapter.isSupported())) {
  // fall back to PasswordEncryptionAdapter, MnemonicEncryptionAdapter, etc.
}
```

Browser/authenticator support: WebAuthn PRF extension support in the browser, or a CTAP2 hardware key with `hmac-secret` support (e.g. a YubiKey 5). Call `isSupported()` first to check the current browser — it returns `false` rather than throwing where the PRF extension isn't available.

For a flow with nothing to persist client-side at all, register with a resident (discoverable) credential and skip storing `credentialId`:

```typescript
// Register with a resident (discoverable) credential
const adapter = await WebAuthnPrfEncryptionAdapter.register({
  residentKey: "required",
});

// Later — no stored credentialId needed; the browser's native picker
// shows any resident passkey for this origin
const adapter = await WebAuthnPrfEncryptionAdapter.authenticate([], {
  discoverable: true,
});
```

`discoverable: true` omits `allowCredentials` from the WebAuthn call entirely, so the browser can present its native picker across any resident passkey instead of requiring a `credentialId` you supplied. It only works for a credential registered with `residentKey: "required"` (or `"preferred"`, depending on the authenticator) — the `credentialId`-based flow above remains the default.

`register()`/`authenticate()` also accept a few advanced options for interoperating with a pre-existing, non-SDK passkey-encryption scheme — all default to the SDK's own current behavior, so they're only needed if you're matching an external derivation: `seedDerivation` (`"hkdf-expand"` default, or `"raw"` to use the PRF output directly as the seed) and `seedExpandInfo` (overrides the HKDF info label) control how the seed is derived; `shareContext` and `shareVariant` customize the internally-derived ML-KEM sharing keypair behind `.publicKey`/`fromPublicKey()` away from the SDK's fixed defaults.

::: warning
`register()` and `authenticate()` let the underlying `DOMException` (user cancellation, no matching credential, etc.) bubble up unwrapped rather than converting it to a `DStorageError` — catch `DOMException` directly around these calls.
:::
