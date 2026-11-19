---
description: "Fixes for common dStorage errors: duplicate bn.js copies, wallet extension not detected, invalid prover config, proof server or wallet proving failures, and indexer network mismatches."
---

# Troubleshooting

### `Failed to parse result provided by node` / `instanceof BN` failure

`bn.js@5.2.3` appears more than once in `node_modules` — `instanceof BN` fails across module boundaries. Fix: pin `bn.js@5.2.3` in root `package.json` `dependencies` and delete any nested copies under `node_modules`. Run `npm install` afterwards.

### Wallet extension not detected in browser connector mode

Confirm a Midnight wallet extension (1AM, Lace, or another wallet implementing the dApp Connector API) is installed and enabled in your browser. The connector flow enumerates `window.midnight` and calls `connect()` on the discovered wallet — if no extension is installed or enabled, this call rejects. Reload the page after installing/enabling the extension.

### `MIDNIGHT_INVALID_PROVER_CONFIG` after upgrading to v0.3.0

`MidnightChainAdapter`'s connector-mode proving options changed in v0.3.0. The constructor throws this error if the config still sets the removed `allowWalletProofServer` option, sets neither `proofServerEndpoint` nor a wallet `prover` mode, sets `proofServerEndpoint` together with a wallet `prover` mode, or passes `prover` in provider mode. See [Where are ZK proofs generated in connector mode?](/faq/adapters#where-are-zk-proofs-generated-in-connector-mode) for the valid combinations.

### `Proof server at … failed to …` (`MIDNIGHT_PROOF_SERVER_FAILED`)

The adapter couldn't reach the proof server, or it returned an error. The message names the proof server URL and the reason (connection refused, timeout, or an HTTP error status). Check that the proof server is running — e.g. the `midnightntwrk/proof-server` Docker container from the [Midnight Network Adapter](/guide/midnight-network-adapter#step-1-—-start-the-midnight-proof-server) guide — and that `proofServerEndpoint` (or the wallet's configured proof server) points at it.

### `Wallet failed to …` / `Wallet did not provide a proving provider` (`MIDNIGHT_WALLET_PROVING_FAILED`)

With `prover: PROVER_MODE.WALLET_DELEGATED`, the wallet extension failed to generate the proof, didn't provide a proving provider, or the user rejected its prompt. Check that the wallet supports delegated proving and can fetch the ZK artifacts from `zkConfigBaseUrl`, or switch back to `PROVER_MODE.PROOF_SERVER_URL` with your own proof server.

### `The configured indexerEndpoint … serves a different chain than the wallet's indexer` (`MIDNIGHT_INDEXER_NETWORK_MISMATCH`)

In connector mode, the wallet submits transactions to the network it's connected to, but the adapter waits for them on `indexerEndpoint` when you set one. If that indexer is on another network (for example `network: "mainnet"` with a preprod indexer URL), a deploy or write would wait forever for a transaction that never appears there. To prevent that, `init()` compares the genesis block hash of your configured indexer with the wallet's, and throws this error if they differ, before anything is deployed. Point `indexerEndpoint` and `indexerWsEndpoint` at the wallet's network, or remove them to use the wallet's own indexer.

If either indexer can't be reached, `init()` logs a warning and continues without the check.

### Deploy or write never finishes

The transaction was submitted but the adapter never sees it confirmed. The deploy log line names the indexer it's waiting on. Check that this indexer is up and on the same network as the wallet. A configured indexer on a different chain is rejected at `init()` with `MIDNIGHT_INDEXER_NETWORK_MISMATCH` (see above).
