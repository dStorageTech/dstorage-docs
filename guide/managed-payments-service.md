# Managed Payments Service

dStorage Pro is a hosted signing/payment service run by the dStorage team. It fronts Arweave
storage costs and Midnight DUST chain fees on your behalf, billed to your dStorage Pro account
instead of drawn from each end user's own wallet — access is authorized per-request via a token
you configure once. This guide takes the [Midnight Network Adapter](/guide/midnight-network-adapter)
guide's browser app and turns this service on for both the storage and chain sides, so your
end users never need their own funded AR wallet or DUST-funded Midnight wallet.

## Prerequisites

Everything from the [Midnight Network Adapter](/guide/midnight-network-adapter) guide, with two
changes:

- Node.js 22 or later, to run the Vite dev server
- Docker, to run the Midnight proof server
- [Lace](https://www.lace.io) wallet extension (version 2.0 or later), switched to the Preprod
  network — your wallet still connects to expose public keys and submit transactions, but it no
  longer needs to hold any DUST
- ~~arlocal~~ — not needed anymore; this guide uses real Arweave via dStorage Pro's bundler
  instead of a local test wallet
- A dStorage Pro account and token — sign up at [dstorage.pro](https://dstorage.pro)

Fast track: clone [`starter-template`](https://github.com/dStorageTech/dstorage-docs/tree/main/starter-template) — its `src/main.ts` already has the Midnight Network Adapter guide's browser app wired up, so you can use it as the base for this guide's changes. Run `npm install && npm run dev` and open the printed local URL.

## Step 1 — Get a dStorage Pro API token

Tokens come in two flavors:

- **JWT token** — scoped and safe to embed in a browser bundle. Its allowed origin, spend cap,
  and request cap are baked into the signature, and it's instantly revocable from the portal.
  This is what the rest of this guide uses.
- **`ds_*` secret token** — full account access (manage other tokens, payment history). Server-side
  only — never ship one in browser JavaScript. Use this instead if you're proxying requests
  through your own Node.js backend rather than calling dStorage Pro directly from the browser;
  see the [full adapter reference](/faq/adapters) for that setup.

Copy your JWT token from the dStorage Pro portal — you'll paste it directly into the adapter
config in Step 2.

## Step 2 — Add managed payments to your adapters

Starting from the same connector-mode `chainAdapter` as the Midnight Network Adapter guide, two
things change: the storage adapter swaps to `ArweaveBundlerStorageAdapter`, and both adapters get
a `signingServerUrl`/`authToken`.

```typescript
import {
  DStorage,
  ArweaveBundlerStorageAdapter,
  MidnightChainAdapter,
  PasswordEncryptionAdapter,
} from "@dstorage-tech/dstorage/browser";

const signingServerUrl = "https://dstorage.pro";
const authToken = "your_jwt_token_here";

const sdk = new DStorage({
  storageAdapter: new ArweaveBundlerStorageAdapter({
    signingServerUrl,
    authToken,
  }),

  chainAdapter: new MidnightChainAdapter({
    walletMode: "connector",
    connectorName: "lace",
    zkConfigBaseUrl: window.location.origin,
    network: "preprod",
    proofServerEndpoint: "http://localhost:6300",
    signingServerUrl,
    authToken,
  }),

  encryptionAdapters: [
    new PasswordEncryptionAdapter({
      password: "Correct-Horse-Battery!",
      salt: "myapp:v1",
    }),
  ],
});
```

Adding `signingServerUrl`/`authToken` to `MidnightChainAdapter` manages DUST chain fees the same
way it manages Arweave storage costs on `ArweaveBundlerStorageAdapter`. dStorage Pro balances and
signs the on-chain transaction instead of the wallet.

The wallet extension is still involved, though — it still connects, still exposes the public keys
the ZK circuit needs, and still submits the final transaction. It just never needs a DUST balance
to do any of that.

The same separation of concerns applies on the storage side. `ArweaveBundlerStorageAdapter` never
sends your content to dStorage Pro — not the raw data, and not even the encrypted bytes. dStorage
Pro only pays for and signs the Arweave upload. The actual content, still encrypted, is submitted
directly to the Arweave storage network afterwards, once payment is settled — it never passes
through dStorage Pro at all.

## Step 3 — Init, store, retrieve

Same call pattern as every other guide in this series:

```typescript
const contractAddress = await sdk.init();
console.log("DataRegistry contract address:", contractAddress);

const { chainRefId } = await sdk.store(
  new TextEncoder().encode("hello, dStorage"),
);

const { bytes } = await sdk.retrieveByRefId(chainRefId);
console.log(new TextDecoder().decode(bytes)); // "hello, dStorage"
```

What's different now that both sides are managed:

- **No AR wallet or JWK file needed client-side** — dStorage Pro holds a funded bundler account
  and signs Arweave transactions on your behalf.
- **No DUST-funded Midnight wallet needed either** — dStorage Pro balances and signs the
  on-chain reference transaction too, covering the chain fee.
- **Near-instant finality** on the storage side, via the ANS-104 bundler protocol, instead of
  waiting on Arweave L1.
- **Privacy is preserved on both sides** — for storage, only a 48-byte ANS-104 `deep_hash` is
  sent to dStorage Pro; the file bytes themselves never leave the client. For chain, only the
  already-proven Midnight transaction is sent for balancing and signing — thanks to the ZK proof,
  that transaction reveals nothing about the private data it references, so no content or
  witness data is ever sent to dStorage Pro for the DUST payment either.

## Learn More

You've reached the end of the adapter progression — from fully in-memory Mock adapters, through
local/simulator adapters, to a real Midnight network with fully managed Arweave and DUST
payments. From here:

- Browse the [FAQ](/faq/managed-payments) for the full managed-payments reference, including
  token scoping and security notes.
- The [full adapter reference](/faq/adapters) covers every adapter combination, including ones
  not shown in these guides.
