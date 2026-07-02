# Encryption & Security

### What encryption scheme does the SDK use?

XChaCha20-Poly1305 with a 24-byte random nonce. Its 192-bit nonce space pushes the birthday bound to 2⁸⁰, making random nonce collision a non-issue in practice.

### What is the DEK/KEK model?

A fresh random **Data Encryption Key (DEK)** is generated per upload. The DEK is then wrapped (encrypted) under each adapter's **Key Encryption Key (KEK)** and stored in the `keyEnvelope` field on-chain. To decrypt, the SDK retrieves the key envelope, uses one of the registered adapters to unwrap the DEK, then decrypts the payload.

### What encryption adapters are available?

| Adapter                     | Key source                           | Post-quantum at key layer       | Cross-device portable                                             |
| ---------------------------- | ------------------------------------ | -------------------------------- | ------------------------------------------------------------------ |
| `PasswordEncryptionAdapter` | scrypt(password, salt)               | Conditional on password entropy | Yes — same password + salt on any device                          |
| `MnemonicEncryptionAdapter` | BIP-39 (24-word) or 64-byte hex seed | 128-bit PQ (unconditional)      | Yes — same mnemonic on any device                                 |
| `KeypairEncryptionAdapter`  | ML-KEM768 public/secret keypair      | 192-bit PQ (unconditional)      | Requires SK; re-derivable via `fromPassword()` / `fromMnemonic()` |

### Why does `MnemonicEncryptionAdapter` require 24 words?

A 12-word BIP-39 mnemonic provides only 128 bits of entropy, which Grover's algorithm halves to 64-bit post-quantum security — below NIST's 128-bit minimum. The adapter rejects anything shorter than 24 words at construction time.

### Can multiple adapters decrypt the same upload?

Yes. Supply an array to `encryptionAdapters`. The SDK wraps the DEK under every adapter's KEK independently. Any single registered adapter can decrypt any upload made while it was in the list. This is useful for adding a recovery key or shared access:

```typescript
encryptionAdapters: [
  new PasswordEncryptionAdapter({ password, salt }), // primary
  new MnemonicEncryptionAdapter({ mnemonic: backupPhrase }), // recovery
];
```

### What happens if I lose my encryption key / password?

Data is permanently unrecoverable. The SDK stores no key material — keys are derived deterministically from the adapter's inputs each time. There is no key escrow or recovery mechanism. Follow standard backup practices for whichever secret your adapter uses (password + salt, BIP-39 mnemonic, or SK bytes).

### Is `PasswordEncryptionAdapter` post-quantum safe?

At the data layer, yes — XChaCha20-Poly1305 with a 256-bit key gives 128-bit post-quantum security (NIST minimum). At the key encapsulation layer, it depends on password entropy. Human-chosen passwords cannot reach the 256-bit entropy required to resist Grover's. To close this gap, use `generatePqsPassword()` with `KeypairEncryptionAdapter.fromPassword()`, or switch to `MnemonicEncryptionAdapter` (24 words).

### What is `generatePqsPassword()`?

A helper that produces a cryptographically random 43-character base64url string (32 bytes = 256 bits of real entropy). Pass the result to `KeypairEncryptionAdapter.fromPassword()` to get full ML-KEM PQ protection without manual key storage. Store the generated string — it is the only secret needed to re-derive the keypair.

### What makes a password acceptable to `PasswordEncryptionAdapter`?

The adapter enforces four rules at construction time:

1. **Length** — at least 12 characters (configurable via `minPasswordLength`).
2. **Character diversity** — at least 3 of 4 character classes: uppercase, lowercase, digits, special characters.
3. **No sequential runs** — patterns like `abcde` or `12345` are rejected.
4. **No keyboard-walk patterns** — sequences like `qwerty` or `asdfg` are rejected.
5. **Entropy** — charset-based entropy estimate must reach 60 bits (configurable via `minEntropyBits`).

If your use case requires bypassing these checks — for example, a machine-generated credential — use `generatePqsPassword()` to obtain a cryptographically random 43-character base64url string (256 bits of real entropy), then pass it to `KeypairEncryptionAdapter.fromPassword()` for full ML-KEM PQ protection.

### How does the SDK prevent swapping chunks or blobs in transit?

Each ciphertext is bound to its role via Additional Authenticated Data (AAD). Labels used:

| Label                       | Protects                                |
| ---------------------------- | ---------------------------------------- |
| `dstorage:payload:v1`       | Single-shot (non-chunked) uploads       |
| `dstorage:manifest:v1`      | Chunked upload manifest                 |
| `dstorage:chunk:v1:<i>/<n>` | Each chunk bound to its index and total |
| `dstorage:storageId:v1`     | Storage pointer encrypted on-chain      |

A reordered chunk, a substituted manifest, or a ciphertext moved from one role to another causes MAC verification to fail before any data is returned.

### How does the SDK verify that an Arweave gateway hasn't tampered with the retrieved data?

Every Arweave transaction includes an `X-Content-Hash` tag containing the BLAKE3 hex digest of the uploaded bytes (ciphertext for private uploads, plaintext for public ones). On retrieval, `ArweaveStorageAdapter` fetches the transaction metadata, recomputes the hash, and throws `[dStorage/arweave] Content hash mismatch` if they differ.

For private uploads this is defence-in-depth on top of XChaCha20-Poly1305 AEAD authentication. For public uploads it is the primary integrity guarantee.

To opt out when using a fully trusted private gateway, pass `skipIntegrityCheck: true` to `ArweaveStorageAdapter`.

### Is the storage pointer on-chain encrypted?

Yes. The `storageId` (the Arweave content address) is encrypted with the same per-upload DEK using a fresh nonce, then stored in the `DataRegistry` contract. A blockchain observer cannot learn which storage resource belongs to which wallet even though the on-chain record is public.

### What is the on-chain content hash and what does it protect against?

When a reference is written (via `store()` or `registerReference()`), the SDK computes a BLAKE3 hash of the ciphertext bytes — the exact bytes as written to the storage network — and stores it in the `DataRegistry` contract alongside the encrypted storage pointer. On `retrieveByRefId()`, the SDK re-downloads those bytes, recomputes the hash, and compares it to the on-chain value before attempting decryption.

This catches:

- A compromised or manipulated storage gateway returning bytes that have been altered since upload.
- Any divergence between what was committed to the chain and what the storage network currently serves.

For private uploads, AEAD authentication (XChaCha20-Poly1305) provides a second independent tamper check during decryption. For public uploads (no encryption), the on-chain hash is the primary integrity guarantee beyond the storage adapter's own tag.

If the check fails, `retrieveByStorageId()` throws a `DStorageError` with code `CONTENT_HASH_MISMATCH` before any decryption is attempted. `retrieveByRefId()` delegates to `retrieveByStorageId()`, passing the hash from the on-chain reference — so the check fires automatically on every `retrieveByRefId()` call when a hash is present. You can also call `retrieveByStorageId(storageId, dekScheme, knownHash)` directly to perform the same check without going through the chain adapter.

### Is the on-chain content hash computed from the plaintext or the ciphertext?

Always the ciphertext — the bytes exactly as stored on the storage network. For private uploads this is the encrypted blob; because a fresh random nonce is generated per upload, the ciphertext is non-deterministic even for identical plaintext, so the on-chain hash reveals nothing about content. For public uploads (`isPublic: true`) the ciphertext equals the plaintext, which is acceptable since the data is world-readable by design.

For chunked uploads, the hash covers the **manifest ciphertext** (the small encrypted JSON at the `storageId` pointer), not the concatenated chunks. Individual chunks are already independently protected by their AEAD authentication tags and position-binding AAD.

### How does the on-chain hash differ from the `X-Content-Hash` Arweave tag?

|                          | `X-Content-Hash` (Arweave tag)            | On-chain hash (`DataRegistry`)                                |
| ------------------------ | ------------------------------------------ | ---------------------------------------------------------------|
| **Where stored**         | Arweave transaction metadata              | Midnight `DataRegistry` contract                              |
| **Who verifies**         | Storage adapter (`ArweaveStorageAdapter`) | Core SDK (`retrieveByStorageId`, called by `retrieveByRefId`) |
| **Applies to**           | Arweave adapters only                     | All storage adapters                                          |
| **Skippable**            | Yes — `skipIntegrityCheck: true`          | No — always checked when present                              |
| **Independent of chain** | Yes                                       | Anchored to the on-chain reference                             |

Both checks run on `retrieveByRefId()` with Arweave adapters, providing two independent commitments. The on-chain hash covers storage adapters that do not implement their own tag (Mock, future adapters).

### What is `ownerSecret` and why is it not stored?

`ownerSecret` is an HKDF derivative of the DEK and the raw `storageId`. It is needed to remove or update a reference on-chain. Because it is derived deterministically from values the SDK already holds, it never needs to be persisted — it is recomputed on demand during `removeReference()`.

### What exactly changes when I call `rotateKeys()` — and what stays the same?

| Field                                | Changes?                                                  |
| -------------------------------------- | ----------------------------------------------------------|
| `keyEnvelope` on-chain               | Yes — re-wrapped under the new adapter set                 |
| Encrypted `storageId` on-chain       | No                                                         |
| `writtenAt` on-chain                 | No — preserved from the original upload                    |
| `encryptionScheme`                   | No                                                         |
| Ciphertext on the storage network    | No — bytes are never re-uploaded                           |
| `ownerSecret` / ownership commitment | No — derived from the same DEK + storageId, so identical  |

Because the DEK itself is unchanged, any party who previously obtained the DEK retains the ability to decrypt until the corresponding adapter wrapper is pruned from the envelope (see the two-step password-change flow in the Developers section).

### If I call `update()`, what happens to the original content on the storage network?

Nothing — it stays there. `update()` only changes the on-chain pointer (the `storageId` field in the DataRegistry reference) to point at the newly encrypted blob. The old blob remains at its original `storageId` on the storage network; whether it can be garbage-collected depends on the storage provider (Arweave uploads, for example, are permanent and immutable).

- Anyone who saved the old `storageId` can still download the old ciphertext — but without the old `keyEnvelope` they cannot decrypt it, as the key envelope on-chain now covers the new content's DEK.
- `update()` is best suited for mutable application state (user profiles, document drafts) where preserving old versions is not required.
