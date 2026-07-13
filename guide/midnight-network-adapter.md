# Midnight Network Adapter

The [Local & Simulator Adapters](/guide/local-simulator-adapters) guide ran real DataRegistry
circuits in-process, with no live network. This guide swaps `MidnightSimulatorChainAdapter` for
the real `MidnightChainAdapter` — connecting to an actual Midnight network with a real wallet
and a real proof server. It's the first guide in this series that talks to live infrastructure.

## Prerequisites

- Node.js 22 or later, to run the Vite dev server (the app code itself runs in the browser)
- Docker, to run the Midnight proof server
- [arlocal](https://github.com/textury/arlocal) — a local Arweave-compatible node, still running
  from [Step 1 of the Local & Simulator Adapters guide](/guide/local-simulator-adapters#step-1-—-start-arlocal)
- [Lace](https://www.lace.io) wallet extension (version 2.0 or later), **switched to the
  Preprod network in its own settings** — this guide runs in the browser and connects to it
  directly, and a wallet only exposes addresses for the network it's currently set to
- A Midnight wallet funded with DUST — for local development, request test tokens from the
  [Midnight Preprod Faucet](https://faucet.preprod.midnight.network/)

Fast track: clone [`starter-template`](https://github.com/dStorageTech/dstorage-docs/tree/main/starter-template), run `npm install && npm run dev`, and open the printed local URL to see this guide running. The same project doubles as a boilerplate — keep building on `index.html` / `src/main.ts` for your own app instead of starting from scratch.

## Step 1 — Start the Midnight proof server

The proof server generates the zero-knowledge proofs needed to submit transactions to the
Midnight network — it's what lets `MidnightChainAdapter` write on-chain references without
revealing the private inputs behind them.

```sh
docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 -- midnight-proof-server -v
```

Once you've finished working through this guide, stop the proof server so it doesn't keep running
in the background. If it's running attached to your terminal (as shown above), press
<kbd>Ctrl+C</kbd> there. If you started it detached, run:

```sh
docker stop $(docker ps -q --filter ancestor=midnightntwrk/proof-server:8.1.0)
```

## Step 2 — Configure the SDK

`MidnightChainAdapter` takes a `walletMode`, which depends on where your code runs:

- **`"provider"`** (Node.js) — you build, start, and sync a `WalletFacade` yourself and pass it
  in. Useful for backend services; see the [full adapter reference](/faq/adapters) if you need
  this instead.
- **`"connector"`** (browser) — delegates wallet/key management to a Midnight-compatible wallet
  extension (Lace by default, but any wallet implementing the dApp Connector API works). This is
  what the rest of this guide uses.

Connector mode fetches the compiled `DataRegistry` contract's ZK artifacts (`keys/` and `zkir/`)
over HTTP from your app's own origin, instead of reading them from disk. Copy them from the
installed SDK package into Vite's `public/` directory so they're served alongside your app
(`starter-template`'s `npm run dev` does this for you automatically — see
`scripts/copy-zk-artifacts.mjs`):

```sh
cp -r node_modules/@dstorage-tech/chain/src/adapters/midnight/contracts/dataregistry/managed/keys public/keys
cp -r node_modules/@dstorage-tech/chain/src/adapters/midnight/contracts/dataregistry/managed/zkir public/zkir
```

This guide keeps `ArweaveLocalStorageAdapter` for storage, to isolate what changes on the chain
side. Swapping in real Arweave storage is covered in [Managed Payments Service](/guide/managed-payments-service).

```typescript
import {
  DStorage,
  ArweaveLocalStorageAdapter,
  MidnightChainAdapter,
  PasswordEncryptionAdapter,
} from "@dstorage-tech/dstorage/browser";

const { adapter: storageAdapter } = await ArweaveLocalStorageAdapter.createWithTestWallet({
  fundAr: 5,
});

const chainAdapter = new MidnightChainAdapter({
  walletMode: "connector",
  connectorName: "lace", // window.midnight.lace — omit to use whichever wallet is found first
  zkConfigBaseUrl: window.location.origin, // serves the keys/ and zkir/ you copied to public/
  network: "preprod", // matches the Preprod Faucet used to fund your wallet
  proofServerEndpoint: "http://localhost:6300",
});

const sdk = new DStorage({
  storageAdapter,
  chainAdapter,
  encryptionAdapters: [
    new PasswordEncryptionAdapter({
      password: "Correct-Horse-Battery!",
      salt: "myapp:v1",
    }),
  ],
});
```

A few things worth knowing about how connector mode behaves:

- **Private state is in-memory only.** The `DataRegistry` contract's off-chain data lives only
  for the life of the page — a reload starts fresh, so hold onto the `contractAddress` you get
  back from `init()` if you want to reconnect to the same contract afterwards.
- **ZK artifacts come over HTTP.** They're fetched from `zkConfigBaseUrl` instead of read off the
  filesystem.
- **Your app never touches signing keys.** The adapter hands transactions to the connected
  wallet extension for balancing and signing, then submits the result — your code only ever sees
  the public coin/encryption keys the circuit needs.

## Step 3 — Init, store, retrieve

The same call pattern as every other guide in this series, but now triggered from a browser
button click instead of a Node.js script — `index.html` loads `main.ts`, which wires this up to
a **Run** button:

```typescript
const contractAddress = await sdk.init();
console.log("DataRegistry contract address:", contractAddress);

const { chainRefId } = await sdk.store(
  new TextEncoder().encode("hello, dStorage"),
);

const { bytes } = await sdk.retrieveByRefId(chainRefId);
console.log(new TextDecoder().decode(bytes)); // "hello, dStorage"
```

What's different now that you're on a live network:

- **`sdk.init()`** prompts your wallet extension to connect (if it hasn't already), then deploys
  or joins the `DataRegistry` contract with a real transaction — this costs DUST and takes real
  proof-generation + confirmation time.
- **`store()`** encrypts your data and uploads it to arlocal as before, but the on-chain
  reference is now written for real — through the proof server you started in Step 1 — instead
  of only being simulated.
- **Save the `contractAddress`** returned by `init()` — copy it from the log line above the
  first time you run this, then pass it back in as the `contractAddress` config field on
  `MidnightChainAdapter` on subsequent runs, so you reconnect to the same contract instead of
  deploying a new one each time.

## Learn More

- Browse the FAQ for more on [deployment & configuration](/faq/deployment-configuration) and the [full adapter reference](/faq/adapters).
