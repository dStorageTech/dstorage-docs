# Troubleshooting

### `Failed to parse result provided by node` / `instanceof BN` failure

`bn.js@5.2.3` appears more than once in `node_modules` — `instanceof BN` fails across module boundaries. Fix: pin `bn.js@5.2.3` in root `package.json` `dependencies` and delete any nested copies under `node_modules`. Run `npm install` afterwards.

### Wallet extension not detected in browser connector mode

Confirm a Midnight wallet extension (1AM, Lace, or another wallet implementing the dApp Connector API) is installed and enabled in your browser. The connector flow enumerates `window.midnight` and calls `connect()` on the discovered wallet — if no extension is installed or enabled, this call rejects. Reload the page after installing/enabling the extension.
