import {
  DStorage,
  MockStorageAdapter,
  MockChainAdapter,
  PasswordEncryptionAdapter,
} from "@dstorage-tech/dstorage";

// This starter matches the "Mock Adapters" guide at https://dstorage.pro/docs/guide/mock-adapters
// As you move through the other guides in the series (Core Concepts, Local & Simulator
// Adapters, Midnight Adapters, Managed Adapters), replace the adapters below — the rest of
// main() stays the same throughout.

async function main() {
  const sdk = new DStorage({
    // Where the encrypted bytes are stored — in-memory for Mock, real storage in later guides.
    storageAdapter: new MockStorageAdapter(),

    // Where the on-chain reference is written — simulated in-memory here.
    chainAdapter: new MockChainAdapter(),

    // How the per-upload encryption key is protected — derived from a password + salt.
    encryptionAdapters: [
      new PasswordEncryptionAdapter({
        password: "Correct-Horse-Battery!",
        salt: "myapp:v1",
      }),
    ],
  });

  // Prepares the SDK — deploys/joins the on-chain DataRegistry when a chainAdapter is configured.
  await sdk.init();

  // Encrypts the bytes client-side and uploads them; returns the on-chain reference id.
  const { chainRefId } = await sdk.store(
    new TextEncoder().encode("hello, dStorage"),
  );
  console.log("Stored. chainRefId:", chainRefId);

  // Looks up the reference, downloads the ciphertext, and decrypts it locally.
  const { bytes } = await sdk.retrieveByRefId(chainRefId);
  console.log("Retrieved:", new TextDecoder().decode(bytes));

  // Wipes in-memory key material — call this when the SDK instance is no longer needed.
  sdk.destroy();
}

// Top-level error handling for the async entry point.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
