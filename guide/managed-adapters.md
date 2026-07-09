# Managed Adapters

The [Midnight Adapters](/guide/midnight-adapters) guide used a real Midnight network with a
DUST-funded wallet, and kept storage local. This guide routes *both* sides through dStorage
Pro's managed signing service (`https://dstorage.pro`): `ArweaveBundlerStorageAdapter` for
storage, and `MidnightChainAdapter` configured with the same signing-server credentials for
chain. End-users need no AR wallet and no DUST-funded Midnight wallet — the signing server pays
and signs on their behalf for both.

## Prerequisites

- Everything from the [Midnight Adapters](/guide/midnight-adapters) guide, **except** the
  DUST-funded wallet — a Midnight wallet identity is still needed (see the note in Step 2), but
  it no longer needs to hold any DUST
- A dStorage Pro auth token — sign up at [dstorage.pro](https://dstorage.pro)

Fast track: clone [`starter-template`](https://github.com/dStorageTech/dstorage-docs/tree/main/starter-template) and wire up this guide's adapters in minutes.

## Step 1 — Get an auth token

Tokens come in two flavors, and the choice matters:

- **`ds_*` secret token** — full account access (manage other tokens, payment history). Server-side
  only — never ship one in browser JavaScript.
- **JWT token** — scoped and safe to embed in a browser bundle. Its allowed origin, spend cap,
  and request cap are baked into the signature, and it's instantly revocable from the portal.

For a Node.js backend, a `ds_*` token is simplest. Set it via environment variables:

```sh
export DSTORAGE_SERVICE_URL=https://dstorage.pro
export DSTORAGE_AUTH_TOKEN=ds_your_token_here
```

## Step 2 — Configure the SDK

Both the storage adapter and the chain adapter accept `signingServerUrl` / `authToken`:

```typescript
import {
  DStorage,
  ArweaveBundlerStorageAdapter,
  MidnightChainAdapter,
  PasswordEncryptionAdapter,
  NetworkId,
} from "@dstorage-tech/dstorage";

const sdk = new DStorage({
  storageAdapter: new ArweaveBundlerStorageAdapter({
    signingServerUrl: process.env.DSTORAGE_SERVICE_URL ?? "https://dstorage.pro",
    authToken: process.env.DSTORAGE_AUTH_TOKEN ?? "",
  }),
  chainAdapter: new MidnightChainAdapter({
    walletMode: "provider",
    walletProvider,
    privateStatePassword,
    zkArtifactsPath: "/absolute/path/to/artifacts",
    network: NetworkId.Undeployed,
    proofServerEndpoint: "http://localhost:6300",
    signingServerUrl: process.env.DSTORAGE_SERVICE_URL ?? "https://dstorage.pro",
    authToken: process.env.DSTORAGE_AUTH_TOKEN ?? "",
  }),
  encryptionAdapters: [
    new PasswordEncryptionAdapter({
      password: "Correct-Horse-Battery!",
      salt: "myapp:v1",
    }),
  ],
});
```

Configuring `signingServerUrl`/`authToken` on `MidnightChainAdapter` sponsors DUST chain fees
too, the same way it already does for Arweave storage on the `ArweaveBundlerStorageAdapter`
side: the signing server balances and signs the on-chain transaction on the wallet's behalf, so
the wallet never needs to hold DUST. This is automatic — no extra configuration beyond
`signingServerUrl`/`authToken` is required.

The `walletProvider` passed to `MidnightChainAdapter` still needs to be a real wallet object,
though — it's used to expose the public keys the ZK circuit needs
(`getCoinPublicKey()`/`getEncryptionPublicKey()`). It just doesn't need to be funded or synced
with the network, since the signing server handles balancing and signing instead of the wallet.

## Step 3 — Init, store, retrieve

Same call pattern as every other guide in this series:

```typescript
await sdk.init();

const { chainRefId } = await sdk.store(
  new TextEncoder().encode("hello, dStorage"),
);

const { bytes } = await sdk.retrieveByRefId(chainRefId);
console.log(new TextDecoder().decode(bytes)); // "hello, dStorage"
```

What's different now that both sides are managed:

- **No AR wallet or JWK file needed client-side** — the signing server holds a funded bundler
  account and signs Arweave transactions on your behalf.
- **No DUST-funded Midnight wallet needed either** — the same signing server balances and signs
  the on-chain reference transaction, sponsoring the chain fee.
- **Near-instant finality** on the storage side, via the ANS-104 bundler protocol, instead of
  waiting on Arweave L1.
- **Privacy is preserved** — only a 48-byte ANS-104 `deep_hash` is sent to the signing server for
  storage; the file bytes themselves never leave the client.

## Using this from a browser

If you need to call the managed service directly from browser JavaScript (no backend proxy),
use a **JWT token** instead of a `ds_*` token — it's accepted only on the `sign-tx` endpoint, and
its origin/spend/request limits are cryptographically enforced:

```typescript
new ArweaveBundlerStorageAdapter({
  signingServerUrl: "https://dstorage.pro",
  authToken: process.env.DSTORAGE_JWT_TOKEN ?? "",
});
```

## Learn More

You've reached the end of the adapter progression — from fully in-memory Mock adapters, through
local/simulator adapters, to a real Midnight network with fully managed Arweave and DUST
payments. From here:

- Browse the [FAQ](/faq/managed-payments) for the full managed-payments reference, including
  token scoping and security notes.
- The [full adapter reference](/faq/adapters) covers every adapter combination, including ones
  not shown in these guides.
