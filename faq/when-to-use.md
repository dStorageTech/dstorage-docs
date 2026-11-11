---
description: "When dStorage is the right tool, and when it isn't: storing private user data in a dApp, encrypting files before Arweave, off-chain data for Midnight contracts, passkey encryption, and sponsoring storage and chain fees."
---

# When to Use dStorage

Use dStorage when a dApp needs to keep **private user data** (files, records, documents) off its
own servers, readable only by the user who owns it. Each question below is a problem developers
commonly run into, with how dStorage handles it and what building it yourself involves.

### How do I store private user data in a dApp without running my own database?

dStorage encrypts the data on the user's device, stores the ciphertext on Arweave, and writes an
owner-only reference to the Midnight blockchain. One call does all three:

```typescript
const { chainRefId } = await sdk.store(bytes);
const { bytes: plaintext } = await sdk.retrieveByRefId(chainRefId);
```

Building it yourself means picking an encryption scheme and key management, uploading to a storage
network and paying for it, and writing and deploying a contract that tracks who owns what. With
dStorage, the `DataRegistry` contract ships pre-compiled with the SDK, so there's no Compact code
to write. Start with [Mock Adapters](/guide/mock-adapters).

### How do I encrypt files before uploading them to Arweave?

Anything stored on Arweave is permanent and public, so it must be encrypted first. dStorage
encrypts every upload with XChaCha20-Poly1305 under a fresh per-upload key (the DEK), and wraps
that key with a key from your encryption adapter: a password, mnemonic, keypair or passkey. Files
over 10 MB are split into independently encrypted chunks automatically. See
[Core Concepts](/guide/core-concepts) and [Encryption & Security](/faq/encryption-security).

You can use dStorage without a blockchain: omit `chainAdapters` for storage-only mode. You still
get encrypted uploads, but no on-chain ownership record.

### How do I store off-chain data for a Midnight contract?

Midnight contracts keep private state small. Larger data such as documents, images or records
belongs off-chain, with only a reference on-chain. dStorage gives you that pattern ready-made: the
encrypted payload lives on Arweave, and its `DataRegistry` contract holds an encrypted storage
pointer and key envelope that only the owner can update or remove.

It runs alongside your own contracts rather than replacing them, and can reuse your app's existing
wallet connection and proof server. See
[Can I integrate dStorage into an existing Midnight app?](/faq/developers#can-i-integrate-dstorage-into-an-existing-midnight-app)
and the [Midnight Network Adapter](/guide/midnight-network-adapter) guide.

### How do I encrypt user data with a passkey instead of a password?

Use `WebAuthnPrfEncryptionAdapter`. It derives the encryption key from a platform passkey or
security key through the WebAuthn PRF extension, so users unlock their data with the same passkey
prompt they use to sign in, and there's no password to remember or type. See
[Passkey Encryption](/guide/passkey-encryption).

### How do I let users store data without holding AR, DUST or NIGHT?

Route payments through [dStorage Pro](/faq/managed-payments), the managed payment service. It pays
Arweave storage costs and sponsors Midnight DUST fees, billed to your account, so your users don't
need a funded wallet. The service only sees a hash of the content, never plaintext or keys. Try it
without spending real funds in the [Managed Payments Service](/guide/managed-payments-service)
guide.

### When is dStorage not the right fit?

- **You need production stability today.** The SDK is pre-1.0 and its API may change between minor
  versions.
- **The data is public.** dStorage can store unencrypted data (`isPublic: true`), but if nothing
  needs to stay private, uploading to a storage network directly is simpler.
- **You need a storage network other than Arweave.** Storage adapters are pluggable, but Arweave
  is the only network supported today.
- **You need an on-chain registry on a chain other than Midnight.** The built-in chain adapters
  target Midnight. `HttpGatewayChainAdapter` can point at your own REST backend instead, which can
  proxy to another chain, but you then enforce ownership in that backend yourself.
- **You need to delete stored data.** Arweave storage is permanent. `removeReference()` deletes the
  on-chain pointer, but the ciphertext stays on Arweave (it can't be decrypted without the key
  envelope that was on-chain).
