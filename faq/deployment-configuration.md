# Deployment & Configuration

### What are the prerequisites for running the SDK locally?

- Node.js 22+, npm
- Docker (for Midnight proof server and Arweave Local)
- Midnight Compact compiler v0.31.1 (for recompiling the contract)
- 1AM wallet extension (latest version) — or Lace, or another dApp Connector-compatible wallet (browser connector flows only)
- Wander wallet extension (Arweave browser flows only)

### How do I start the local Midnight proof server?

```sh
docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 -- midnight-proof-server -v
```

### How do I start a local Arweave node for testing?

```sh
docker run -d --rm -p 1984:1984 textury/arlocal
# or: npx arlocal
```

No real AR tokens are needed — arlocal auto-funds test wallets.

### What Midnight networks does the adapter support?

The `MidnightChainAdapter` supports `undeployed` (localhost) and `preprod`.

### How do I configure `MidnightChainAdapter` for browser vs Node.js?

Use the `walletMode` discriminated union:

```typescript
// Node.js (provider mode) — caller supplies a pre-built, synced WalletFacade
{
  walletMode: "provider",
  walletProvider,       // AdapterWalletProvider built and synced by the app
  privateStatePassword, // password for local LevelDB state encryption
  zkArtifactsPath,      // optional: absolute path to keys/ and zkir/ dirs — the SDK
                         // ships its own compiled copy (see below), no separate compile needed
}

// Browser (connector mode) — delegates to a wallet extension (1AM, Lace, or another dApp Connector wallet)
{ walletMode: "connector", connectorName: "1am", zkConfigBaseUrl: window.location.origin }
```

`walletMode` is required. See `QUICK_START.md` for a complete provider-mode setup example.

### How do I configure `ArweaveBundlerStorageAdapter` for managed uploads?

```typescript
new ArweaveBundlerStorageAdapter({
  signingServerUrl: "https://dstorage.pro",
  // Token format: <credential>.<base64url_modulus> — issued by the signing server.
  // The modulus (512 bytes, base64url) is the server's RSA-4096 public key and is
  // used to pin the expected signing key at construction time.
  authToken: process.env.DSTORAGE_AUTH_TOKEN ?? "",
});
```

### How do I reuse an existing DataRegistry contract?

Pass the previously deployed address:

```typescript
new MidnightChainAdapter({
  contractAddress: "02abc123…",
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
- **Browser**: copy `keys/` and `zkir/` from `node_modules/@dstorage-tech/dstorage-sdk/dist/contracts/dataregistry/managed/` into your application's public assets directory, then pass `zkConfigBaseUrl: window.location.origin`. Artifacts are fetched over HTTP. (The `starter-template`'s `npm run dev` does this automatically — see `scripts/copy-zk-artifacts.mjs`.)

### What environment variables does the integration test suite need?

Copy `tests/integration/env.example` to `.env.integration` and fill in:

| Variable                       | Required               | Default                 | Purpose                                                                              |
| ------------------------------- | ----------------------- | ------------------------- | -------------------------------------------------------------------------------------|
| `INTEGRATION_SEED`             | Yes (full-stack suite) | —                        | 24-word BIP-39 mnemonic or 128-char (64-byte) hex seed for a funded Midnight wallet |
| `INTEGRATION_CONTRACT_ADDRESS` | No                     | deploys fresh            | Reuse an existing DataRegistry to skip slow deployment                              |
| `ARLOCAL_URL`                  | No                     | `http://localhost:1984` | Arweave Local endpoint                                                               |
| `PROOF_SERVER_URL`             | No                     | `http://localhost:6300` | Midnight proof server endpoint                                                       |

### Can I skip integration services in CI?

Yes. If arlocal or the proof server is not running, those suites are skipped rather than failed. The unit test suite (`npm test`) never requires external services.
