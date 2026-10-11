# Deployment & Configuration

### What are the prerequisites for running the SDK locally?

- Node.js 22+, npm
- Docker (for Midnight proof server and Arweave Local)
- 1AM wallet extension (latest version) — or Lace, or another dApp Connector-compatible wallet (browser connector flows only)
- Wander wallet extension (Arweave browser flows only)

The `DataRegistry` contract ships pre-compiled with the SDK package (compiled circuits and keys included) — the Midnight Compact compiler is only needed if you're modifying the contract itself, not for normal SDK usage.

### How do I start the local Midnight proof server?

```sh
docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 -- midnight-proof-server -v
```

### How do I start a local Arweave node for testing?

```sh
docker run -d --rm -p 1984:1984 textury/arlocal
# or: npx arlocal
```

No real AR tokens are needed — arlocal auto-funds test wallets.

### What Midnight networks does the adapter support?

Any Midnight network — `undeployed` (localhost), `preprod`, `preview`, or another — passed as the required `network` field. The adapter has no built-in default endpoints:

- **Provider mode** requires `indexerEndpoint`, `indexerWsEndpoint`, and `proofServerEndpoint`; the constructor throws if any is missing.
- **Connector mode** uses the indexer endpoints reported by the connected wallet unless you set `indexerEndpoint`/`indexerWsEndpoint` yourself, and `init()` throws if the wallet is on a different network than `network`. Set `proofServerEndpoint` as well — the wallet's own proof server is only used if you opt in with `allowWalletProofServer: true`.

### How do I configure `MidnightChainAdapter` for browser vs Node.js?

Use the `walletMode` discriminated union:

Node.js (provider mode) — caller supplies a pre-built, synced WalletFacade:

```typescript
{
  walletMode: "provider",
  walletProvider,       // AdapterWalletProvider built and synced by the app
  privateStatePassword, // password for local LevelDB state encryption
  network: "undeployed",
  indexerEndpoint,      // required: indexer GraphQL (HTTP) URL
  indexerWsEndpoint,    // required: indexer GraphQL WebSocket URL
  proofServerEndpoint: "http://localhost:6300", // required
  zkArtifactsPath,      // optional: absolute path to keys/ and zkir/ dirs — the SDK
                         // ships its own compiled copy (see below), no separate compile needed
}
```

Browser (connector mode) — delegates to a wallet extension (1AM, Lace, or another dApp Connector wallet):

```typescript
{
  walletMode: "connector",
  connectorName: "1am",              // wallet to prefer under window.midnight
  zkConfigBaseUrl: window.location.origin, // base URL serving keys/ and zkir/
  network: "preprod",                // must match the network the wallet is set to
  proofServerEndpoint: "http://localhost:6300",
  // indexer endpoints come from the wallet unless set here
}
```

`walletMode` and `network` are required.

### Does `WebAuthnPrfEncryptionAdapter` work in a Node.js app?

Only partially. `register()` and `authenticate()` require real browser globals — `window`, `navigator.credentials`, `PublicKeyCredential` — and throw `WEBAUTHN_PRF_UNAVAILABLE` if they're missing, which is always the case in a plain Node.js process. `isSupported()` behaves the same way: it returns `false` (rather than throwing) whenever `window` is undefined.

So the interactive passkey ceremony only runs in a real browser tab, or in an Electron **renderer** process (which exposes those same browser globals) — never in a Node.js backend, CLI, or Electron **main** process.

The one part of the adapter that does work in Node is `fromPublicKey()`: it only needs raw public-key bytes and never touches WebAuthn, so a Node.js backend can use it for upload-only delegation on behalf of a browser-registered passkey owner (see [`WebAuthnPrfEncryptionAdapter`](/faq/adapters#webauthnprfencryptionadapter) in Adapters).

### How do I configure `ArweaveBundlerStorageAdapter` for managed uploads?

```typescript
new ArweaveBundlerStorageAdapter({
  managedPayment: {
    signingServerUrl: "https://portal.dstorage.pro",
    // Token format: <credential>.<base64url_modulus> — issued by the signing server.
    // The modulus (512 bytes, base64url) is the server's RSA-4096 public key and is
    // used to pin the expected signing key at construction time.
    authToken: process.env.DSTORAGE_AUTH_TOKEN ?? "",
  },
});
```

### How do I reuse an existing DataRegistry contract?

Pass the previously deployed address:

```typescript
new MidnightChainAdapter({
  contractAddress: "a1b2c3…", // 64 lowercase hex chars
  // … rest of config
});
```

Omit `contractAddress` to deploy a new contract on first `init()`.

### Where do ZK artifacts live and how are they served?

`DataRegistry` is dStorage's own fixed contract — not something you compile yourself. Its
compiled ZK artifacts (prover/verifier keys and ZKIR) ship inside the
`@dstorage-tech/dstorage-sdk` package at `dist/contracts/dataregistry/managed/{keys,zkir}`.

- **Node.js**: pass an absolute path via `zkArtifactsPath`. The adapter reads `keys/` and `zkir/` from that directory. Resolve the bundled copy via the package's own `package.json` rather than hardcoding a `node_modules` path:
  ```typescript
  import { createRequire } from "node:module";
  import path from "node:path";

  const zkArtifactsPath = path.join(
    path.dirname(createRequire(import.meta.url).resolve("@dstorage-tech/dstorage-sdk/package.json")),
    "dist/contracts/dataregistry/managed",
  );
  ```
- **Browser**: copy `keys/` and `zkir/` from `node_modules/@dstorage-tech/dstorage-sdk/dist/contracts/dataregistry/managed/` into your application's public assets directory, then pass `zkConfigBaseUrl: window.location.origin`. Artifacts are fetched over HTTP. (The [`dstorage-starter-template`](https://github.com/dStorageTech/dstorage-starter-template)'s `npm run dev` does this automatically — see `scripts/copy-zk-artifacts.mjs`.)

