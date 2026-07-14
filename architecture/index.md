# Architecture

## Package structure

```
@dstorage-tech/dstorage     ← Developer-facing API (npm install @dstorage-tech/dstorage)
    ├── @dstorage/crypto        ← XChaCha20-Poly1305 encryption, key derivation       [bundled]
    ├── @dstorage/encryption    ← Encryption adapters: PasswordEncryptionAdapter | MnemonicEncryptionAdapter | KeypairEncryptionAdapter [bundled]
    ├── @dstorage/storage       ← Storage adapters: Mock | Arweave | ArweaveBundler | Arweave Local [bundled: Mock only]
    ├── @dstorage/payment       ← Payment adapters: Mock | Arweave | Managed           [bundled: Mock only]
    └── @dstorage/chain         ← Chain adapters:   Mock | MidnightSimulator | Midnight [bundled: Mock only]
```

## Data flow

```
User input
    │
    ▼
[encrypt]      ← key derived from encryption adapter (password, wallet, mnemonic…)
    │              (key never leaves the device)
    ▼
[pay storage]  → adapter-defined token (commonly AR / MOCK)
    │
    ▼
[store]        → Encrypted blob → Arweave / Arweave Local / Mock
    │
    ▼
[pay chain]    → adapter-defined token (commonly DUST / MOCK)
    │
    ▼
[reference]    → Storage pointer + owner → Midnight / Mock chain
    │              (owner hidden behind ZK proof on Midnight)
    ▼
 chainRefId    ← on-chain reference ID (use to retrieve later)
 storageId     ← storage network content ID
 private state ← owner's on-chain record updated (ZK-shielded, not publicly readable)
```

## Large-file chunking

Files larger than **10 MB** are automatically split into independently encrypted 10 MB chunks.
Each chunk is uploaded as a separate storage transaction; a small manifest file ties them
together and its `storageId` is the single pointer written on-chain. The split/reassembly is
entirely transparent to the caller — `store()`, `retrieveByRefId()`, and `retrieveByStorageId()`
behave identically regardless of file size.

## Supported providers

### Storage

| Provider                   | Status  | Notes                                                                                                    |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------|
| Mock (localStorage/memory) | ✅ Live | Perfect for development & demos                                                                          |
| Arweave Local              | ✅ Live | Local arlocal integration testing                                                                        |
| Arweave                    | ✅ Live | Requires `arweave` package + Wander wallet                                                               |
| Arweave Bundler            | ✅ Live | Near-instant finality via ANS-104 bundled uploads and managed server-signing; no client AR wallet needed |

### Blockchain

| Chain             | Status  | Notes                                                                             |
| ------------------ | ------- | -----------------------------------------------------------------------------------|
| Mock              | ✅ Live | Simulates on-chain references locally                                            |
| MidnightSimulator | ✅ Live | Simulated Midnight chain; runs real DataRegistry circuits without a live network  |
| Midnight          | ✅ Live | Connector + facade modes supported                                               |

## Where to go deeper

This page covers the system's big-picture shape. For the details behind the `[encrypt]` step:

- **[Core Concepts](/guide/core-concepts)** — how your data gets encrypted, `storageId` vs `refId`, and how adapters compose.
- **[FAQ: Encryption & Security](/faq/encryption-security#encryption-security)** — cryptographic primitives, wire formats, and post-quantum safety per adapter.
