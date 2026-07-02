# Managed Payments & dStorage Pro

### What is dStorage Pro?

dStorage Pro (`https://dstorage.pro`) is a managed service that handles storage and chain payment signing on behalf of applications. Instead of requiring every end-user to hold AR tokens and manage an Arweave JWK wallet, the service signs and submits transactions server-side. Developers sign up for an API auth token and configure the SDK to point at the service URL — no client-side wallet management required.

### What does the managed service see?

Only a cryptographic hash of the content and the request metadata needed to construct the transaction. It never receives the plaintext payload or encryption keys. Encryption happens entirely on the user's device before the SDK makes any network call.

### How do I configure the managed payment flow?

Pass `signingServerUrl` and `authToken` to `ArweaveBundlerStorageAdapter`:

```typescript
import {
  DStorage,
  ArweaveBundlerStorageAdapter,
  MidnightChainAdapter,
} from "@dstorage-tech/dstorage";

const sdk = new DStorage({
  storageAdapter: new ArweaveBundlerStorageAdapter({
    signingServerUrl:
      process.env.DSTORAGE_SERVICE_URL ?? "https://dstorage.pro",
    authToken: process.env.DSTORAGE_AUTH_TOKEN ?? "",
  }),
  chainAdapter: new MidnightChainAdapter({
    // … chain config …
    signingServerUrl:
      process.env.DSTORAGE_SERVICE_URL ?? "https://dstorage.pro",
    authToken: process.env.DSTORAGE_AUTH_TOKEN ?? "",
  }),
  encryptionAdapters: [
    /* … */
  ],
});
```

Both the storage adapter and the chain adapter accept `signingServerUrl` / `authToken`. Prefer environment variables over hard-coding credentials.

### Where do I get an auth token?

Sign up at [dstorage.pro](https://dstorage.pro). Tokens use a compound format:

```
<credential>.<base64url_modulus>
```

`<credential>` is the authentication secret sent as the Bearer header. `<base64url_modulus>` is the 512-byte RSA-4096 public key modulus of the server's Arweave signing key, base64url-encoded (~683 chars). The adapter parses and pins this key at construction time — if the server rotates its signing key the token must be re-issued to reflect the new modulus.

### How do I set the credentials via environment variables?

```sh
export DSTORAGE_SERVICE_URL=https://dstorage.pro
export DSTORAGE_AUTH_TOKEN=ds_your_token_here
```

Or add them to a `.env` file in your project root (loaded via `dotenv` or equivalent). The SDK does not load `.env` files automatically — your application loader must do that.

### What is `ArweaveBundlerStorageAdapter` and how does it differ from `ArweaveStorageAdapter`?

`ArweaveBundlerStorageAdapter` uses the ANS-104 Arweave bundler protocol routed through the dStorage Pro signing server. Uploads reach near-instant finality and require no client-side AR wallet or JWK key file. `ArweaveStorageAdapter` requires the caller to hold a funded Arweave JWK wallet and signs transactions locally.

### What does the managed Midnight chain payment flow look like?

DUST chain fees are sponsored by the managed service too — not just Arweave storage. When `MidnightChainAdapter` is configured with `signingServerUrl` and `authToken`, the SDK wraps the wallet's transaction-balancing step so the signing server balances *and* signs the transaction on the wallet's behalf. The local wallet only needs to expose its public keys (for the ZK circuit) — it never needs to hold DUST. This is automatic: no configuration beyond `signingServerUrl`/`authToken` on `MidnightChainAdapter` is needed.

### Does the managed service support the bboard quick-start example?

Yes — the QUICK_START guide is built around the managed flow. `ArweaveBundlerStorageAdapter` + `MidnightChainAdapter` in provider-wallet mode both accept `signingServerUrl` / `authToken` and reuse bboard's existing wallet and proof server. No separate AR wallet is needed.

### Is there a known security limitation with the managed payment response?

The signing server response (`txId`, `signature`) is validated for schema correctness but carries no cryptographic MAC. The adapter relies on TLS for transport integrity. A compromised CDN or network-level MITM could substitute a valid-shaped response and schema validation would still pass.

The signing key substitution attack (where a MITM replaces the server's public key to corrupt the on-chain ownership record) is mitigated: the expected key is embedded in the auth token and pinned at construction time. Each sign-tx request asserts the pinned key; the server rejects any mismatch.

**Mitigation for the response MAC gap**: always use `signingServerUrl` with HTTPS and a valid certificate issued to the operator-controlled domain. Never use this adapter over plain HTTP or with self-signed certificates in production. A proper fix (an `HMAC-SHA256` response MAC) is deferred pending a stable signing-server API.

### What payment tokens does the managed service handle?

The managed service covers Arweave storage costs billed in AR, and — when `MidnightChainAdapter` is configured with `signingServerUrl`/`authToken` — Midnight chain fees billed in DUST too. In that case the wallet configured in `MidnightChainAdapter` never needs to hold DUST itself.

### How do I test the managed payment code path without real dStorage Pro credentials?

Use `MockStorageAdapter` and `MidnightSimulatorChainAdapter` with `signingServerUrl` and `authToken` pointing at a local signing server (or any reachable test endpoint). Both adapters automatically use the `managedmock` payment network, which sends the network identifier `"TEST"` to the server instead of `"arweave_bundler"` or `"midnight"`. This exercises the full managed payment request/response round-trip — including auth token pinning and error handling — without touching real funds or the production signing server.

```typescript
const sdk = new DStorage({
  storageAdapter: new MockStorageAdapter({
    signingServerUrl: "http://localhost:3000",
    authToken: process.env.DSTORAGE_TEST_TOKEN ?? "",
  }),
  chainAdapter: new MidnightSimulatorChainAdapter({
    signingServerUrl: "http://localhost:3000",
    authToken: process.env.DSTORAGE_TEST_TOKEN ?? "",
  }),
  encryptionAdapters: [
    /* … */
  ],
});
```

### What type of API token do I need to use the managed service?

The standard credential is a **secret `ds_*` API token** issued by the dStorage Pro portal. Obtain one via the portal UI (API Tokens tab) or `POST /api/tokens`. Tokens use the compound format:

```
ds_<credential>.<base64url_modulus>
```

`<credential>` is the authentication secret sent as the `Authorization: Bearer` header. `<base64url_modulus>` is the base64url-encoded RSA-4096 public key modulus of the server's Arweave signing key; the SDK parses and pins it at construction time so that a signing key rotation is caught immediately.

Always supply the token via an environment variable — never hard-code it:

```typescript
new ArweaveBundlerStorageAdapter({
  signingServerUrl: "https://dstorage.pro",
  authToken: process.env.DSTORAGE_AUTH_TOKEN ?? "",
});
```

`ds_*` tokens carry **full account access** (manage other tokens, payment history, coupons). Treat them like private keys. Tokens expire after 90 days by default; re-issue before expiry in the portal.

### Can I use a `ds_*` token in browser-side JavaScript?

No. A `ds_*` token grants full account control — anyone who can read your bundle can extract it and manage your entire account. Never ship a `ds_*` token in a browser bundle, React app, or any public-facing code.

For frontends that need to call the managed service directly, use a **JWT token** instead (see below).

### What is a JWT token and why does the service support it?

JWT tokens exist to solve one problem: `ds_*` tokens cannot safely leave a secure server environment, but some applications need to call the managed `sign-tx` endpoint directly from browser JavaScript — for example, a dApp that submits transactions on behalf of users without a backend proxy.

The portal issues ES256-signed JWT tokens that are specifically designed to be public:

- They are accepted **only** on `POST /api/service/sign-tx`. No other endpoint will honour them — they cannot list tokens, access payment history, redeem coupons, or do anything else.
- Their constraints (allowed origin, spend cap, request cap) are **baked into the cryptographic signature**. They cannot be forged or modified without invalidating the JWT.
- Each JWT has a unique `jti` identifier checked against the database on every request, so revocation is instant — delete the token in the portal and it stops working immediately.

This gives you a credential that is safe to embed in a browser bundle because the blast radius of a leak is mathematically bounded.

### What do JWT tokens provide that a `ds_*` token does not?

| Capability                              | `ds_*` API token | JWT token                  |
| ----------------------------------------- | ------------------ | ---------------------------- |
| Call `sign-tx`                          | Yes               | Yes                         |
| Origin restriction (lock to one domain) | No                | Optional — `origin` claim   |
| Per-token spend cap                     | No                | `maxBalance` (USD)          |
| Per-token request cap                   | No                | `maxRequests`               |
| Safe to embed in browser JavaScript     | No                | Yes                         |
| Account management endpoints            | Yes               | No                          |

Create a JWT token in the portal (JWT Tokens tab) or via `POST /api/jwt-tokens` using a `ds_*` token. Required fields: `name`, `expiresAt`, `maxBalance`. The `origin` and `maxRequests` constraints are optional but recommended for public deployments.

Use a JWT token in the SDK exactly the same way as a `ds_*` token — the `authToken` field accepts either format:

```typescript
new ArweaveBundlerStorageAdapter({
  signingServerUrl: "https://dstorage.pro",
  authToken: process.env.DSTORAGE_JWT_TOKEN ?? "",
});
```

Lock a JWT to your production domain to limit exposure if the token is scraped:

```
origin: "https://myapp.com"
maxBalance: 50       // stop after $50 of Arweave storage charged to your account
maxRequests: 10000   // or after 10 000 sign-tx calls, whichever comes first
```

If a JWT is compromised, an attacker can only call `sign-tx` within those configured bounds on that one origin — and you can revoke it instantly from the portal.
