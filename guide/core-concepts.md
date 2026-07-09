# Core Concepts

The [Mock Adapters](/guide/mock-adapters) guide showed *how* to call the SDK. This page explains
*why* it works the way it does — the three ideas worth having in your head before you plug in
real adapters.

## The DEK/KEK model

Every upload gets its own random encryption key, called the **DEK** (Data Encryption Key). The
DEK encrypts your data — and only your data for that one upload.

The DEK itself then gets encrypted ("wrapped") under a separate key called the **KEK** (Key
Encryption Key), which comes from whichever `encryptionAdapters` you configured (password,
mnemonic, or keypair). The wrapped DEK is stored on-chain in a field called `keyEnvelope`.

```
your data --[encrypted by]--> DEK --[wrapped by]--> KEK (from your adapter)
```

To decrypt later, the SDK unwraps the DEK using one of your registered adapters, then uses the
DEK to decrypt the data. If you register multiple encryption adapters (e.g. a password *and* a
recovery mnemonic), each one gets an independent copy of the wrapped DEK — any one of them can
unlock the data on its own.

## `storageId` vs `refId`

Two different identifiers come out of `sdk.store()`, and they point at two different things:

- **`storageId`** identifies the encrypted blob on the storage network itself (a 43-character
  string). It's a pointer to *bytes*.
- **`refId`** identifies the on-chain record in the `DataRegistry` contract (a 32-byte value).
  It's a pointer to a *reference* — which itself contains the (encrypted) `storageId`, plus the
  `keyEnvelope` needed to decrypt.

In everyday use you only need `refId`: `retrieveByRefId(refId)` looks up the reference, finds
the storage pointer, downloads the ciphertext, and decrypts it — all in one call. `storageId` is
a lower-level handle, useful mainly for storage-only mode (no chain adapter) or for retrieving
public data directly.

## How adapters compose

`DStorage` is configured with three independent adapter slots. Each one answers a different
question:

| Slot                  | Answers                                   | Required?                             |
| ---------------------- | ------------------------------------------ | -------------------------------------- |
| `storageAdapter`      | Where do the encrypted bytes live?        | Always                                |
| `chainAdapter`        | Where's the on-chain reference written?   | Optional — omit for storage-only mode |
| `encryptionAdapters`  | How is the per-upload DEK protected?      | Optional — omit for public uploads    |

Because these are independent, you can mix and match: start with Mock everything for local
development, swap in `ArweaveLocalStorageAdapter` once you want realistic storage behavior, then
move to real `MidnightChainAdapter` and `ArweaveStorageAdapter` for production — without
changing how you call `store()` or `retrieveByRefId()`. The rest of the guides in this section
walk through those combinations.

## What's on-chain vs off-chain

- **Off-chain** (the storage network): the encrypted data payload — the actual bytes.
- **On-chain** (the `DataRegistry` contract): the encrypted `storageId`, the encrypted
  `keyEnvelope`, and a few small metadata fields. Never the raw data, never an unwrapped key.

## Learn More

- Browse the [FAQ](/faq/concepts) for more depth on any of these topics, including [encryption & security](/faq/encryption-security).
