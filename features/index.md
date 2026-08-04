---
# Every sidebar sub-item on this page (see .vitepress/config.ts) is a hash
# anchor into this same page, so VitePress's Prev/Next pager — which dedupes
# sidebar candidates by path, ignoring hash — never has a genuine other page
# to point to. Left enabled, it degenerates into pointing back at this page.
next: false
---

# Features

A complete list of what dStorage offers, split into three groups: capabilities you get as a
developer integrating the SDK, guarantees your end-users get as a result, and what changes when
you route payments through dStorage Pro's managed service.

## Developer Features

The SDK is a set of independently swappable adapters (storage, chain, encryption, and payment)
wired together behind one `store()` / `retrieve()` call pattern — pick the adapters that fit your
environment without changing your application code.

### Architecture & Core Capabilities

- Pluggable adapter architecture — storage, chain, encryption, and payment are each configured independently and can be swapped without touching call sites. See [Core Concepts](/guide/core-concepts).
- No custom on-chain contract to write or deploy — the DataRegistry contract ships pre-compiled with the SDK, so integrating dStorage doesn't require Compact expertise.
- `estimateCost()` — a pre-upload cost estimate covering both the storage and chain side, before you commit to a `store()` call.
- Storage-only mode — omit `chainAdapter` to skip on-chain references entirely.
- Works in both Node.js and the browser, with a dedicated browser entry point.
- TypeScript-first, with strict typing throughout.

### Encryption & Recovery

- Three encryption adapters: `PasswordEncryptionAdapter`, `MnemonicEncryptionAdapter` (BIP-39), and `KeypairEncryptionAdapter` (ML-KEM768, post-quantum). See [FAQ: Encryption & Security](/faq/encryption-security#encryption-security).
- Multi-key encryption — register multiple encryption adapters (e.g. a password plus a recovery mnemonic); any one can independently decrypt.
- Key rotation (`rotateKeys()`) — add or remove encryption adapters without re-uploading content.
- `generateHighEntropyPassword()` generates a machine-random, 256-bit password. Combined with `KeypairEncryptionAdapter`, it gives 128-bit (NIST-minimum) post-quantum protection at the key-encapsulation layer, while the password itself stays human-recoverable.
- Upgrade a password or mnemonic to a keypair adapter in place with `intoKeypairEncryptionAdapter()` (or `KeypairEncryptionAdapter.fromPassword()`), without changing how existing content was encrypted.

### Data Integrity & Resilience

- Automatic large-file chunking — files over 10 MB are transparently split into independently encrypted chunks. See [FAQ: Concepts & Features](/faq/concepts#does-dstorage-support-large-files).
- Explicit public-mode opt-in (`isPublic: true`) for world-readable content — never the default.
- Tamper detection on every `retrieve()` call: the SDK recomputes the BLAKE3 hash of the retrieved content and compares it against the hash recorded on-chain — not one reported by the storage gateway itself — so it catches tampering even by a gateway that controls both the returned bytes and its own metadata.
- AAD-bound ciphertexts — payloads, manifests, chunks, and storage pointers each carry additional authenticated data (AAD) tying the ciphertext to its specific role, preventing one from being substituted for another.
- Partial-failure recovery — `StorePartialError` and `onProgress` recovery payloads let you retry just the on-chain write if it fails after a successful upload.
- In-place content updates (`update()`) that preserve the `refId`.
- `listReferences()` and `removeReference()`, the latter backed by a ZK ownership proof.

### Adapters for Every Environment

- Fully in-memory Mock adapters — no network, Docker, or tokens required for local development.
- `MidnightSimulatorChainAdapter` — real DataRegistry circuit behavior without a live network. See [Local & Simulator Adapters](/guide/local-simulator-adapters).
- `ArweaveLocalStorageAdapter` with an auto-funded test wallet for local integration testing.
- Production storage adapters — `ArweaveBundlerStorageAdapter` (near-instant finality via the ANS-104 bundler protocol) and `ArweaveStorageAdapter` (direct Arweave L1 submission) — plus `MidnightChainAdapter` for the real Midnight network.
- `HttpGatewayChainAdapter` for delegating chain operations to any custom REST/gateway backend instead of talking to a chain directly.

## End-User Features

None of this requires end-users to understand blockchains, hold tokens, or trust dStorage or any
single storage/chain provider with their data.

- Client-side encryption — data is encrypted on-device before it ever leaves.
- Non-custodial — encryption keys are held only by the user; operators, backend servers, and storage/chain networks never see the user's data or plaintext.
- A tamper-proof, verifiable on-chain ownership receipt for every upload.
- Permanent, censorship-resistant decentralised storage.
- Post-quantum protection options, guarding against "harvest now, decrypt later" threats. See [FAQ: Encryption & Security](/faq/encryption-security#encryption-security).
- Cross-device recovery via password, mnemonic phrase, or keypair — no vendor account needed. See [FAQ: Adapters](/faq/adapters#adapters).
- Portable identity — the same credentials restore access to your data on any device.
- Shared or delegated access, by registering more than one encryption adapter (e.g. a trusted recovery contact) — including upload-only delegation, where a party can encrypt content for you using your public key alone, without ever being able to decrypt it.
- No vendor lock-in — the same data model works across multiple storage and chain providers.
- Private by default — making data public requires an explicit, clearly-irreversible opt-in.

## Managed Payments Service

[dStorage Pro](https://dstorage.pro) is a managed service that signs Arweave and Midnight
transactions on your app's behalf, so end-users never need their own AR wallet or a
DUST-funded Midnight wallet. Configure it via `signingServerUrl`/`authToken` on the storage and
chain adapters — see the [Managed Payments Service](/guide/managed-payments-service) guide for a complete
walkthrough. Sign-up isn't open to the public yet; see the [Managed Payments FAQ](/faq/managed-payments#where-do-i-get-an-auth-token) for the latest status.

- Managed Arweave signing — no AR wallet or JWK key file needed client-side.
- Two managed storage-signing options: near-instant finality via the ANS-104 bundler protocol (`ArweaveBundlerStorageAdapter`), or direct Arweave L1 submission (`ArweaveStorageAdapter`) for callers who prefer L1's 2–20 minute confirmation semantics.
- Managed Midnight DUST-fee payment — no funded Midnight wallet needed either, with sponsorship in some cases. See [Managed Payments Service](/guide/managed-payments-service).
- Privacy-preserving signing — your file bytes never leave the client and are never sent to or seen by the signing server. Only a cryptographic hash of the content, plus the metadata needed to construct the transaction, is transmitted; the content itself and your encryption keys are never shared with dStorage Pro.
- Two token types: `ds_*` secret tokens (full account access, server-side only) and scoped JWT tokens (browser-safe, with origin/spend/request caps and instant revocation).
- Signing-key pinning — the auth token embeds the server's public key, so a key rotation or substitution is detected immediately.
- A `managedmock` test mode for exercising the full managed-payment round trip without spending real funds — it still uses your real dStorage Pro account and token.
- Balance funding via debit/credit cards, crypto, and stablecoins, or by redeeming a coupon code — with a DUST bonus auto-credited on deposit.
- A per-account stats dashboard — total requests, success rate, balance spent, and network breakdown, with a 7-day request-activity chart and an all-time network-distribution chart.
- Unified transaction and payment history — a paginated, filterable feed with a per-transaction breakdown of native network cost vs. service fee, plus live on-chain status tracking (submitted → confirming → confirmed/expired) for non-Midnight transactions.
- An account-management REST API, separate from the SDK's signing endpoint, for automating balance/profile lookups, stats and history queries, and full CRUD on both secret and JWT API tokens — including per-JWT spend and request caps. See [Managed Payments FAQ](/faq/managed-payments#where-do-i-get-an-auth-token).
