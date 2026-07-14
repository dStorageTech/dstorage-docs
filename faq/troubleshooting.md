# Troubleshooting

### `Maximum call stack size exceeded` when encrypting files

Caused by spreading large `Uint8Array` values into `String.fromCharCode()`. This was fixed in the SDK by processing the buffer in 8 KB chunks. Ensure you are on a version that includes this fix.

### `Failed to parse result provided by node` / `instanceof BN` failure

`bn.js@5.2.3` appears more than once in `node_modules` — `instanceof BN` fails across module boundaries. Fix: pin `bn.js@5.2.3` in root `package.json` `dependencies` and delete any nested copies under `node_modules`. Run `npm install` afterwards.

### `Invalid URL` instead of an `init()` error

The chain adapter's `_getAPI()` is called before `init()` completes, hitting an endpoint that has no URL yet. Make sure `await sdk.init()` resolves fully before any `store()` or `retrieve*()` call.

### ZK artifacts not found / `Invalid URL` at runtime

- **Node.js**: verify `zkArtifactsPath` points to the directory containing `keys/` and `zkir/` sub-directories, not to a JS file or parent directory.
- **Browser**: confirm the artifacts were copied into `public/` and that `zkConfigBaseUrl` is set.

### Wallet extension not detected in browser connector mode

Confirm the Lace extension (≥ 1.36.2) is installed and enabled in your browser. The connector flow calls `window.midnight.mnLace.enable()` — if the extension is absent or not enabled the call rejects. Reload the page after installing/enabling the extension.

### Integration tests stall or never complete

Check that the required Docker containers are running (`docker ps`). Confirm port availability: arlocal on 1984, proof server on 6300. The Midnight full-stack suite generates ZK proofs which can take 30–90 seconds each — this is expected.

### How do I reuse a deployed DataRegistry contract across integration test runs?

On the first run, copy the contract address printed in the test output, then add it to `.env.integration`:

```
INTEGRATION_CONTRACT_ADDRESS=02abc123…
```

Subsequent runs will join the existing contract, skipping the slow deployment step.
