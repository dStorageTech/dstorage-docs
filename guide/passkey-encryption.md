# Passkey Encryption (WebAuthn PRF)

This guide uses the [WebAuthn PRF extension](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions) — see MDN's docs if you want the full spec-level detail behind how passkeys generate the key material this guide relies on.

Every guide so far encrypted uploads with `PasswordEncryptionAdapter`. This guide continues from
the [Midnight Network Adapter](/guide/midnight-network-adapter) guide's browser app and swaps
`PasswordEncryptionAdapter` out for `WebAuthnPrfEncryptionAdapter` — uploads unlock with a
platform passkey rather than a typed password. Only the encryption adapter changes here; storage
and chain setup stay exactly as they were in the Midnight Network Adapter guide.

## Prerequisites

Everything from the [Midnight Network Adapter](/guide/midnight-network-adapter) guide, plus:

- A browser and authenticator with WebAuthn PRF extension support, or a CTAP2 hardware security
  key with `hmac-secret` support (e.g. a YubiKey 5).
- Served over HTTPS or `localhost` — a WebAuthn requirement, already satisfied by the Vite dev
  server the other guides use.

Fast track: clone [`starter-template`](https://github.com/dStorageTech/dstorage-docs/tree/main/starter-template), run `npm install && npm run dev`, and open the printed local URL.

## Step 1 — Register a passkey

`WebAuthnPrfEncryptionAdapter` isn't constructed with `new` — you get an instance back from
`register()` (first visit) or `authenticate()` (returning visits), both static methods. Check
`isSupported()` first, since PRF isn't available everywhere:

```typescript
import { WebAuthnPrfEncryptionAdapter } from "@dstorage-tech/dstorage-sdk/browser";

const supported = await WebAuthnPrfEncryptionAdapter.isSupported();
if (!supported) {
  throw new Error("WebAuthn PRF isn't supported in this browser");
}

const storedCredentialId = localStorage.getItem("passkeyCredentialId");

const passkeyAdapter = storedCredentialId
  ? await WebAuthnPrfEncryptionAdapter.authenticate([
      Uint8Array.from(atob(storedCredentialId), (c) => c.charCodeAt(0)),
    ])
  : await (async () => {
      const adapter = await WebAuthnPrfEncryptionAdapter.register();
      localStorage.setItem(
        "passkeyCredentialId",
        btoa(String.fromCharCode(...adapter.credentialId)),
      );
      return adapter;
    })();
```

`credentialId` isn't secret — it just tells the browser which passkey to prompt for — but the
adapter doesn't persist it for you. Your app owns that responsibility, the same way it owns the
`contractAddress` returned by `init()`.

For a simpler flow with nothing to persist client-side at all, register with
`residentKey: "required"` and later call `authenticate([], { discoverable: true })` — the
browser's native picker handles credential selection instead. See the
[full adapter reference](/faq/adapters#adapters) for details.

## Step 2 — Configure the SDK

Same `ArweaveLocalStorageAdapter` + connector-mode `MidnightChainAdapter` as the Midnight Network
Adapter guide. The only change is `encryptionAdapters`:

```typescript
import {
  DStorage,
  ArweaveLocalStorageAdapter,
  MidnightChainAdapter,
} from "@dstorage-tech/dstorage-sdk/browser";

const { adapter: storageAdapter } = await ArweaveLocalStorageAdapter.createWithTestWallet({
  fundAr: 5,
});

const chainAdapter = new MidnightChainAdapter({
  walletMode: "connector",
  connectorName: "1am",
  zkConfigBaseUrl: window.location.origin,
  network: "preprod",
  proofServerEndpoint: "http://localhost:6300",
});

const sdk = new DStorage({
  storageAdapter,
  chainAdapter,
  encryptionAdapters: [passkeyAdapter],
});
```

What's different from `PasswordEncryptionAdapter`:

- **No password to type or remember.** The passkey ceremony is what authorizes decryption
  instead.
- **`credentialId` replaces the password/salt pair** as the thing your app needs to hold onto —
  it's not a secret, just a lookup key for the browser's passkey prompt.
- **Same DEK-wrapping model underneath.** `WebAuthnPrfEncryptionAdapter` implements the same
  interface as every other encryption adapter, so it composes the same way — you could list it
  alongside a `PasswordEncryptionAdapter` or `MnemonicEncryptionAdapter` in
  `encryptionAdapters: [...]` as a backup unlock method, exactly as shown in the
  [full adapter reference](/faq/adapters#adapters).

## Step 3 — Init, store, retrieve

The same call pattern as every other guide in this series:

```typescript
const contractAddress = await sdk.init();
console.log("DataRegistry contract address:", contractAddress);

const { chainRefId } = await sdk.store(
  new TextEncoder().encode("hello, dStorage"),
);

const { bytes } = await sdk.retrieveByRefId(chainRefId);
console.log(new TextDecoder().decode(bytes)); // "hello, dStorage"
```

What's different about unlocking:

- **Within the same session**, `retrieveByRefId()` needs no extra passkey prompt — it reuses the
  `passkeyAdapter` instance already unlocked in Step 1.
- **In a new session** (page reload, different device), you need `authenticate([credentialId])`
  again before `retrieveByRefId()` can unwrap the DEK — that's the branch already wired up in
  Step 1's snippet via `storedCredentialId`.

## Learn More

- The [full adapter reference](/faq/adapters#adapters) covers every encryption adapter — Password,
  Mnemonic, Keypair, and this one — including how to combine several in `encryptionAdapters: [...]`
  so any one of them can unlock the same upload.
- The [Encryption & Security FAQ](/faq/encryption-security#encryption-security) compares their
  post-quantum security tradeoffs.
- Next: [Managed Payments Service](/guide/managed-payments-service), the final guide in this
  series, covers production Arweave storage and Midnight DUST fees via dStorage Pro.
