# Managed Payments on Midnight

dStorage Pro is a hosted signing/payment service run by the dStorage team. It can front the
Midnight DUST chain fees your app incurs, billed to your dStorage Pro account instead of drawn
from each end user's own wallet — access is authorized per-request via a token you configure once.

This guide uses the same `ArweaveLocalStorageAdapter` + connector-mode `MidnightChainAdapter`
browser app as the [Midnight Network Adapter](/guide/midnight-network-adapter) and
[Passkey Encryption](/guide/passkey-encryption) guides, with `PasswordEncryptionAdapter` for
encryption, and turns managed payment on for the chain side — so neither you nor your end users
need a wallet funded with DUST or NIGHT. If you'd rather try the managed-payment flow without a real network
first, see [Managed Payments Service](/guide/managed-payments-service), which runs it against the
simulator and dStorage Pro's `TEST` sandbox.

## Prerequisites

Everything from the [Midnight Network Adapter](/guide/midnight-network-adapter) guide, except
the funded wallet: **you don't need any DUST or NIGHT** — no faucet request, no tokens in your
wallet.

- Node.js 22 or later, to run the Vite dev server
- Docker, to run the Midnight proof server
- [arlocal](https://github.com/textury/arlocal) running locally — see
  [Step 1 of the Local & Simulator Adapters guide](/guide/local-simulator-adapters#step-1-—-start-arlocal)
- [1AM](https://1am.xyz) wallet extension (latest version) — or [Lace](https://www.lace.io),
  or any other wallet implementing the dApp Connector API — switched to the Preprod
  network — your wallet still connects to expose public keys and submit transactions, but it
  can be completely empty: no DUST and no NIGHT needed
- A dStorage Pro account and API token from [portal.dstorage.pro](https://portal.dstorage.pro)

Fast track: clone [`dstorage-starter-template`](https://github.com/dStorageTech/dstorage-starter-template), run `npm install && npm run dev`, and open the printed local URL.

## Step 1 — Get a dStorage Pro API token

Go to [portal.dstorage.pro](https://portal.dstorage.pro) and sign in with Google, Lace, MetaMask,
or 1AM. Top up your balance — by card, bank transfer, local payment
methods, or a coupon — then create a token from the dashboard.

Tokens come in two flavors:

- **JWT token** — scoped and safe to embed in a browser bundle. Its allowed origin, spend cap,
  and request cap are baked into the signature, and it's instantly revocable from the portal.
  This is what the rest of this guide uses.
- **`ds_*` secret token** — full account access (manage other tokens, payment history). Server-side
  only — never ship one in browser JavaScript. Use this instead if you're proxying requests
  through your own Node.js backend rather than calling dStorage Pro directly from the browser;
  see the [full adapter reference](/faq/adapters#adapters) for that setup.

Create a JWT token in the portal's JWT Tokens tab and copy it — you'll paste it directly into the
adapter config in Step 2.

::: tip Free coupons and TEST tokens
Free coupons for the dStorage Pro service and its `TEST` sandbox are regularly shared on our
socials — [X](https://x.com/dStorageTech), [Reddit](https://www.reddit.com/r/dStorage), and
[LinkedIn](https://www.linkedin.com/company/dstorage-tech) — like
[this one](https://x.com/dStorageTech/status/2105119589810217410?s=20). Redeem them from the
portal to top up your balance. If you've claimed `TEST` tokens, dStorage Pro sponsors your DUST
fees for free, so you can follow this guide on Preprod without spending any real funds.
:::

## Step 2 — Add managed payment to the chain adapter

Starting from the same `ArweaveLocalStorageAdapter` + connector-mode `MidnightChainAdapter` config
as the Midnight Network Adapter guide, the only change is a `managedPayment` config object passed
to `MidnightChainAdapter`:

```typescript
import {
  DStorage,
  ArweaveLocalStorageAdapter,
  MidnightChainAdapter,
  PasswordEncryptionAdapter,
} from "@dstorage-tech/dstorage-sdk/browser";

const managedPayment = {
  signingServerUrl: "https://portal.dstorage.pro",
  authToken: "your_jwt_token_here", // from portal.dstorage.pro
};

const { adapter: storageAdapter } = await ArweaveLocalStorageAdapter.createWithTestWallet({
  fundAr: 5,
});

const chainAdapter = new MidnightChainAdapter({
  walletMode: "connector",
  connectorName: "1am",
  zkConfigBaseUrl: window.location.origin,
  network: "preprod",
  proofServerEndpoint: "http://localhost:6300",
  managedPayment,
});

const sdk = new DStorage({
  storageAdapters: [storageAdapter],
  chainAdapters: [chainAdapter],
  encryptionAdapters: [
    new PasswordEncryptionAdapter({
      password: "Correct-Horse-Battery!",
      salt: "myapp:v1",
    }),
  ],
});
```

Adding `managedPayment` to `MidnightChainAdapter` delegates DUST chain fees to dStorage Pro:
it balances and signs the on-chain transaction instead of the wallet.

The wallet extension is still involved, though — it still connects, still exposes the public keys
the ZK circuit needs, and still submits the final transaction. It just never needs a DUST or
NIGHT balance to do any of that — a freshly created, unfunded wallet works.

Privacy is preserved too: only the already-proven Midnight transaction is sent for balancing and
signing. Thanks to the ZK proof, that transaction reveals nothing about the private data it
references, so no content or witness data is ever sent to dStorage Pro for the DUST payment.

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

What's different from the Midnight Network Adapter guide:

- **No DUST or NIGHT needed in the wallet** — dStorage Pro balances and signs the on-chain
  reference transaction, covering the chain fee, so you can skip the Preprod faucet entirely.
- **Each `store()` records a chain payment on your dStorage Pro account**, so you can see it in
  the portal dashboard.
- **Storage is unchanged** — uploads still land in your local arlocal instance via
  `ArweaveLocalStorageAdapter`.

## Learn More

You've reached the end of the adapter progression — from fully in-memory Mock adapters, through
local/simulator adapters, to a real Midnight network with managed DUST payments. From here:

- Browse the [FAQ](/faq/managed-payments#managed-payments-dstorage-pro) for the full
  managed-payments reference, including token scoping and security notes.
- The [full adapter reference](/faq/adapters#adapters) covers every adapter combination, including
  ones not shown in these guides.
