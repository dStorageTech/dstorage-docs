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

Requires a funded AR wallet. Not suitable for applications where end-users do not hold AR — use `ArweaveBundlerStorageAdapter` instead.

### `ArweaveLocalStorageAdapter`

Local Arweave integration testing. A drop-in replacement for `ArweaveStorageAdapter` that connects to a local arlocal node (`localhost:1984`) instead of the Arweave mainnet. No real AR tokens are needed. The recommended setup is the `createWithTestWallet()` factory, which generates a fresh JWK wallet and auto-funds it:

```typescript
const { adapter } = await ArweaveLocalStorageAdapter.createWithTestWallet({
  fundAr: 5,
});
const sdk = new DStorage({ storageAdapter: adapter /* … */ });
```

The adapter exposes a `.testnet` helper with utilities for controlling the local node: `mine(blocks)` to fast-forward the blockchain, `mintTokens(address, winstons)` to fund wallets, `getBalance(address)`, `isRunning()`, and `reset()` for a clean slate between test runs.

Start arlocal before running tests:

```sh
docker run -d --rm -p 1984:1984 textury/arlocal
# or: npx arlocal
```

### `ArweaveBundlerStorageAdapter`

Fast finality via managed signing. Uploads via the ANS-104 Arweave bundler, which delivers near-instant finality compared to the 2–20 minute wait for Arweave L1 transactions. The signing server holds a funded bundler account, so end-users need no AR wallet. Privacy is preserved: only a 48-byte ANS-104 `deep_hash` is sent to the server — the file bytes never leave the client.

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

`retrieve()` applies a `requestTimeoutMs` (default 30 s, `0` disables it) to both the metadata and data fetches, and caps the transaction-metadata/tags JSON response at `maxMetadataResponseBytes` (default 1 MiB) to guard against a hung or hostile gateway.

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

For gateways that use a custom CA or mutual-TLS client certificate, pass a preconfigured `fetch`-compatible function via `customFetch`.

Every operation applies a `requestTimeoutMs` (default 30 s, `0` disables it), and `readReference`/`listReferences` cap their JSON response at `maxResponseBytes` (default 10 MiB) — both guard against a hung or hostile gateway.

One important security note: `ownerSecret` is an internal ZK witness that is deliberately stripped before any network call — it is never transmitted to the gateway. Ownership enforcement (whether to honour a remove or update request) is therefore the responsibility of the backend service, not the adapter.

`refId` values are UUID-style strings (not circuit-derived Bytes<32>), matching `MockChainAdapter`'s format. No Midnight infrastructure (proof server, indexer, DUST wallet) is needed — cost estimates always return zero.

Typical use cases: staging environments backed by a custom database, non-Midnight deployments where a simple REST service is preferable to a blockchain, and integration testing against a real HTTP service.

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

Real Midnight network. Connects to the Midnight blockchain (`preprod` or `undeployed`/localhost). Choose a `walletMode` based on your runtime:

- **`"provider"` (Node.js)**: you build and sync a `WalletFacade` yourself, then pass it as `walletProvider`. Also requires `privateStatePassword` (LevelDB encryption) and optionally `zkArtifactsPath` (absolute path to the `keys/` and `zkir/` directories).
- **`"connector"` (browser)**: delegates all key management to a Midnight wallet extension — 1AM by default (`connectorName: "1am"`), though Lace or any other wallet implementing the dApp Connector API also works. Requires `zkConfigBaseUrl` set to the base URL from which the ZK artifacts are served.

`init()` either deploys a fresh DataRegistry contract or, if you pass `contractAddress`, reconnects to an existing one. Save the returned address across runs to avoid redeploying. DUST chain fees are handled internally by the connected wallet — no explicit payment config is needed. Optionally pass `signingServerUrl` and `authToken` to route Midnight transaction balancing through dStorage Pro instead of the local wallet.

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
  network: NetworkId.Undeployed,
  proofServerEndpoint: "http://localhost:6300",
});

// Browser (connector mode)
new MidnightChainAdapter({
  walletMode: "connector",
  connectorName: "1am",
  zkConfigBaseUrl: window.location.origin,
  network: NetworkId.TestNet,
  proofServerEndpoint: "http://localhost:6300",
});
```

Requires a running Midnight proof server and a wallet funded with DUST.

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

Post-quantum note: human-chosen passwords rarely reach 256-bit entropy. For full post-quantum safety at the key layer, use `KeypairEncryptionAdapter`.

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
const { adapter, secretKey } = KeypairEncryptionAdapter.generateKeypair();
// adapter holds PK+SK — use for full read/write access
// share adapter.publicKey with upload-only parties:
const uploaderOnly = KeypairEncryptionAdapter.fromPublicKey(
  adapter.publicKey,
  "myapp:v1",
);

// Deterministic from a password (same inputs → same keypair):
const adapter = await KeypairEncryptionAdapter.fromPassword(
  "s3cr3t!",
  "myapp:v1",
);
```

Key sizes for `mlkem768`: public key 1184 bytes, secret key 2400 bytes, KEM ciphertext 1088 bytes.
