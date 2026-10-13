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
