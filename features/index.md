# Features

A complete list of what dStorage offers, split into three groups: capabilities you get as a
developer integrating the SDK, guarantees your end-users get as a result, and what changes when
you route payments through dStorage Pro's managed service.

## Developer Features

- Pluggable adapter architecture — storage, chain, and encryption are configured independently and can be swapped without touching call sites. See [Core Concepts](/guide/core-concepts).
- Three encryption adapters: `PasswordEncryptionAdapter`, `MnemonicEncryptionAdapter` (BIP-39), and `KeypairEncryptionAdapter` (ML-KEM768, post-quantum). See [FAQ: Encryption & Security](/faq/encryption-security).
- Multi-key encryption — register multiple encryption adapters (e.g. a password plus a recovery mnemonic); any one can independently decrypt.
- Key rotation (`rotateKeys()`) — add or remove encryption adapters without re-uploading content.
- `generatePqsPassword()` — a cryptographically random, machine-generated password for full post-quantum protection at the key-encapsulation layer.
- Automatic large-file chunking — files over 10 MB are transparently split into independently encrypted chunks. See [Architecture](/architecture/).
- Storage-only mode — omit `chainAdapter` to skip on-chain references entirely.
- Explicit public-mode opt-in (`isPublic: true`) for world-readable content — never the default.
- On-chain BLAKE3 content-hash verification on every `retrieve()` call, detecting storage-layer tampering.
- AAD-bound ciphertexts — payloads, manifests, chunks, and storage pointers are each bound to their role, preventing substitution attacks.
- Partial-failure recovery — `StorePartialError` and `onProgress` recovery payloads let you retry just the on-chain write if it fails after a successful upload.
- In-place content updates (`update()`) that preserve the `refId`.
- `executeMetaTransaction()` — a single-call pipeline wrapper with step-by-step progress events.
- `listReferences()` and `removeReference()`, the latter backed by a ZK ownership proof.
- Fully in-memory Mock adapters — no network, Docker, or tokens required for local development.
- `MidnightSimulatorChainAdapter` — real DataRegistry circuit behavior without a live network. See [Local & Simulator Adapters](/guide/local-simulator-adapters).
- `ArweaveLocalStorageAdapter` with an auto-funded test wallet for local integration testing.
- Works in both Node.js and the browser, with a dedicated browser entry point.
- `HttpGatewayChainAdapter` for custom REST backends, for deployments that don't use Midnight.
- TypeScript-first, with strict typing throughout.

## End-User Features

- Client-side encryption — data is encrypted on-device before it ever leaves.
- Non-custodial — operators, backend servers, and storage/chain networks never see plaintext.
- A tamper-proof, verifiable on-chain ownership receipt for every upload.
- Permanent, censorship-resistant decentralised storage.
- Post-quantum protection options, guarding against "harvest now, decrypt later" threats.
- Cross-device recovery via password, mnemonic phrase, or keypair — no vendor account needed.
- Portable identity — the same credentials restore access to your data on any device.
- Shared or delegated access, by registering more than one encryption adapter (e.g. a trusted recovery contact).
- No vendor lock-in — the same data model works across multiple storage and chain providers.
- Private by default — making data public requires an explicit, clearly-irreversible opt-in.

## dStorage Pro (Managed Services)

[dStorage Pro](https://dstorage.pro) is a managed service that signs Arweave and Midnight
transactions on your app's behalf, so end-users never need their own AR wallet or a
DUST-funded Midnight wallet. Configure it via `signingServerUrl`/`authToken` on the storage and
chain adapters — see the [Managed Payments Service](/guide/managed-payments-service) guide for a complete
walkthrough.

- Managed Arweave signing — no AR wallet or JWK key file needed client-side.
- Near-instant finality via the ANS-104 bundler protocol, instead of Arweave L1's 2–20 minute confirmation wait.
- Managed Midnight DUST-fee sponsorship — no funded Midnight wallet needed either. See [Managed Payments Service](/guide/managed-payments-service).
- Privacy-preserving signing — your file bytes never leave the client and are never sent to or seen by the signing server. Only a small cryptographic hash needed to construct the transaction is transmitted; the content itself and your encryption keys are never shared with dStorage Pro.
- Two token types: `ds_*` secret tokens (full account access, server-side only) and scoped JWT tokens (browser-safe, with origin/spend/request caps and instant revocation).
- Signing-key pinning — the auth token embeds the server's public key, so a key rotation or substitution is detected immediately.
- A `managedmock` test mode for exercising the full managed-payment round trip without real credentials or funds.
