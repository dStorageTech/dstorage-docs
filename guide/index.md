# Guide

Six guides that gradually introduce new concepts — each one swaps in a more realistic set of
storage/chain adapters than the last (except Passkey Encryption, which swaps the encryption
adapter instead), while the core `init()` / `store()` / `retrieveByRefId()` call pattern stays the
same throughout.

Every guide can also be followed hands-on against a ready-to-run starter app instead of building
from scratch — clone [`starter-template`](https://github.com/dStorageTech/dstorage-docs/tree/main/starter-template)
from this repo and swap in each guide's adapters as you go.

- **[Mock Adapters](/guide/mock-adapters)** — fully in-memory, zero external dependencies. Your first encrypted upload and retrieval, in a few minutes.
- **[Core Concepts](/guide/core-concepts)** — how your data gets encrypted, `storageId` vs `refId`, and how the three adapter slots compose. Conceptual, not hands-on — read this before or after Mock Adapters.
- **[Local & Simulator Adapters](/guide/local-simulator-adapters)** — real circuit behavior and real local storage, still with no live wallet or Docker proof server.
- **[Midnight Network Adapter](/guide/midnight-network-adapter)** — a real Midnight network, a real wallet, and a live proof server.
- **[Passkey Encryption](/guide/passkey-encryption)** — swap in `WebAuthnPrfEncryptionAdapter` to unlock uploads with a platform passkey instead of a password.
- **[Managed Payments Service](/guide/managed-payments-service)** — production Arweave storage and Midnight DUST fees, both sponsored via dStorage Pro's managed service.
