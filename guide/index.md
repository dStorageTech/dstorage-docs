# Guide

Five guides, ordered easiest to hardest — each one swaps in a more realistic set of adapters
than the last, while the core `init()` / `store()` / `retrieveByRefId()` call pattern stays the
same throughout.

- **[Mock Adapters](/guide/mock-adapters)** — fully in-memory, zero external dependencies. Your first encrypted upload and retrieval, in a few minutes.
- **[Core Concepts](/guide/core-concepts)** — the DEK/KEK model, `storageId` vs `refId`, and how the three adapter slots compose. Conceptual, not hands-on — read this before or after Mock Adapters.
- **[Local & Simulator Adapters](/guide/local-simulator-adapters)** — real circuit behavior and real local storage, still with no live wallet or Docker proof server.
- **[Midnight Adapters](/guide/midnight-adapters)** — a real Midnight network, a real wallet, and a live proof server.
- **[Managed Adapters](/guide/managed-adapters)** — production Arweave storage and Midnight DUST fees, both sponsored via dStorage Pro's managed service.
