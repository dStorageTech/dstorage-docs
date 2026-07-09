# Midnight Adapters

The [Local & Simulator Adapters](/guide/local-simulator-adapters) guide ran real DataRegistry
circuits in-process, with no live network. This guide swaps `MidnightSimulatorChainAdapter` for
the real `MidnightChainAdapter` — connecting to an actual Midnight network with a real wallet
and a real proof server. It's the first guide in this series that talks to live infrastructure.

## Prerequisites

- Node.js 22 or later
- Docker, to run the Midnight proof server
- A Midnight wallet funded with DUST — for local development, request test tokens from the
  [Midnight Preprod Faucet](https://faucet.preprod.midnight.network/)
- [Lace](https://www.lace.io) wallet extension (version 1.36.2 or later), if you're targeting
  the browser connector flow below

Fast track: clone [`starter-template`](https://github.com/dStorageTech/dstorage-docs/tree/main/starter-template) and wire up this guide's adapters in minutes.

## Step 1 — Start the Midnight proof server

```sh
docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 -- midnight-proof-server -v
```

## Step 2 — Configure the SDK

`MidnightChainAdapter` takes a `walletMode`, which depends on where your code runs:

- **`"provider"`** (Node.js) — you build and sync a `WalletFacade` yourself and pass it in.
- **`"connector"`** (browser) — delegates wallet/key management to the Lace extension.

```typescript
import {
  DStorage,
  ArweaveLocalStorageAdapter,
  MidnightChainAdapter,
  PasswordEncryptionAdapter,
  NetworkId,
} from "@dstorage-tech/dstorage";

const { adapter: storageAdapter } = await ArweaveLocalStorageAdapter.createWithTestWallet({
  fundAr: 5,
});

const chainAdapter = new MidnightChainAdapter({
  walletMode: "provider",
  walletProvider, // a pre-built, synced WalletFacade
  privateStatePassword, // password for local LevelDB state encryption
  zkArtifactsPath: "/absolute/path/to/artifacts", // keys/ and zkir/ directories
  network: NetworkId.Undeployed,
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

In the browser, use connector mode instead:

```typescript
const chainAdapter = new MidnightChainAdapter({
  walletMode: "connector",
  connectorName: "mnLace",
  zkConfigBaseUrl: window.location.origin, // ZK artifacts served from your public/ directory
  network: NetworkId.TestNet,
  proofServerEndpoint: "http://localhost:6300",
});
```

This guide keeps `ArweaveLocalStorageAdapter` for storage, to isolate what changes on the chain
side. Swapping in real Arweave storage is covered in [Managed Adapters](/guide/managed-adapters).

## Step 3 — Init, store, retrieve

Same call pattern as every other guide in this series:

```typescript
await sdk.init(); // deploys (or joins) the DataRegistry contract on-chain

const { chainRefId } = await sdk.store(
  new TextEncoder().encode("hello, dStorage"),
);

const { bytes } = await sdk.retrieveByRefId(chainRefId);
console.log(new TextDecoder().decode(bytes)); // "hello, dStorage"
```

What's different now that you're on a live network:

- **`sdk.init()`** submits a real transaction — deploying or joining the `DataRegistry`
  contract costs DUST and takes real proof-generation + confirmation time.
- **`store()`** writes an on-chain reference for real, through the proof server you started in
  Step 1.
- **Save the `contractAddress`** returned by `init()` and pass it back in as
  `contractAddress` on the next run, so you reconnect to the same contract instead of deploying
  a new one each time.

## Learn More

- Browse the FAQ for more on [deployment & configuration](/faq/deployment-configuration) and the [full adapter reference](/faq/adapters).
