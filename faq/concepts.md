# Concepts & Features

### What is dStorage?

dStorage is a privacy-first SDK that combines client-side encryption, decentralised storage (Arweave), and on-chain coordination (Midnight) in a single developer-facing API. It lets dApps store sensitive user data without the operator ever seeing the plaintext.

### Who is dStorage designed for?

Teams building privacy-sensitive dApps — health records, identity, finance, enterprise workflows — that need strong client-side confidentiality without running their own plaintext data infrastructure.

### What problem does it solve?

Most services store user data on servers they control. Users must trust the operator not to read, sell, or lose their data. dStorage removes that requirement: data is encrypted on the user's device before it ever leaves, stored on a decentralised network, and the on-chain reference gives the owner a verifiable receipt. Operators never see the plaintext.

### What is an on-chain reference and why does it matter?

An on-chain reference is a tamper-proof record written to the Midnight blockchain that links an owner's identity to an encrypted storage blob. It is what makes data _retrievable_ — you can look it up later with just a `refId`. The reference contains an encrypted storage pointer and a key envelope; without the owner's key neither piece reveals anything meaningful.

### What does the SDK store on-chain vs off-chain?

- **Off-chain (Arweave)**: the encrypted data payload.
- **On-chain (Midnight DataRegistry contract)**: an encrypted storage pointer (`storageId`), an encrypted key envelope (`keyEnvelope`), the encryption scheme label, and optional public metadata. Raw user data and plaintext keys never appear on-chain.

### What happens, step by step, when I call `store()`?

Your data is encrypted on-device, then (if a payment adapter is configured) the storage payment is made, the encrypted blob is uploaded to the storage network, the chain payment is made (if applicable), and finally the encrypted pointer is written on-chain as a reference. `store()` returns a `storageId` (the storage-network pointer) and, when a chain adapter is configured, a `chainRefId` (the on-chain reference handle).

### Can dStorage operators read my data?

No. Encryption happens on the user's device using keys derived locally. The managed payment service (`dstorage.pro`) only receives a cryptographic hash — never content. The storage network (Arweave) holds ciphertext. No party in the pipeline holds an unencrypted copy.

### What is a `refId`?

A `refId` is a 32-byte identifier (returned as a hex string) produced by the Midnight `DataRegistry` contract when a reference is stored. Pass it to `retrieveByRefId()` to look up and decrypt the data later. It is the primary retrieval handle; `storageId` is a lower-level identifier for the raw storage blob.

### What is a `storageId`?

A 43-character base64url string (32 decoded bytes) that identifies the encrypted blob on the storage network. For chunked uploads it points to the manifest, not individual chunks. You can retrieve directly via `retrieveByStorageId()` but this bypasses the on-chain record — useful for direct storage access when no chain adapter is configured.

### Does dStorage work without a blockchain?

Yes. Omit `chainAdapter` from `DStorageConfig` to run in storage-only mode. Uploads go directly to the storage network; no on-chain reference is written. `store()` still returns a `storageId` for later retrieval, but there is no verifiable on-chain ownership record.

### Does dStorage support large files?

Yes. Files larger than 10 MB are automatically split into independently encrypted 10 MB chunks. A small manifest ties them together; the manifest's `storageId` is the single pointer written on-chain. `store()`, `retrieveByRefId()`, and `retrieveByStorageId()` behave identically regardless of file size.

### What networks and storage providers are supported today?

| Area    | Available now                                                  | Stub / planned |
| ------- | ---------------------------------------------------------------| -------------- |
| Storage | Mock, Arweave Local, Arweave, Arweave Bundler (managed)        |
| Chain   | Mock, MidnightSimulator, Midnight (connector + provider modes) |
| Payment | Mock, Arweave (JWK), Managed (remote signing server)           |

### What tokens are used for payments?

| Token  | Network  | Used for                                                     |
| ------ | -------- | -------------------------------------------------------------|
| `AR`   | Arweave  | Storage payment via `ArweavePaymentAdapter` or managed flow  |
| `DUST` | Midnight | Chain fees — handled internally by the Midnight wallet       |
| `MOCK` | Mock     | Development & testing (simulated, no real funds needed)      |

### What does `isPublic: true` do?

It is an explicit opt-in that skips both encryption layers. The data payload is stored as raw bytes; the `storageId` is written to the chain in plaintext. Use it only for world-readable content. **Public mode is permanent and irreversible** — once data is stored unencrypted on Arweave it cannot be made private retroactively.
