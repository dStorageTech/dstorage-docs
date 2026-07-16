import {
  DStorage,
  ArweaveLocalStorageAdapter,
  MidnightChainAdapter,
  PasswordEncryptionAdapter,
} from "@dstorage-tech/dstorage/browser";

// This entry matches the "Midnight Network Adapter" guide at
// https://dstorage.pro/docs/guide/midnight-network-adapter
// Run `npm run dev`, open the printed URL, and click the button — the wallet
// will prompt you to connect the first time sdk.init() runs.

const logEl = document.querySelector<HTMLPreElement>("#log")!;
const button = document.querySelector<HTMLButtonElement>("#run")!;

function log(...args: unknown[]) {
  logEl.textContent += `${args.map(String).join(" ")}\n`;
}

async function run() {
  log("Creating arlocal adapter with test wallet for storage...");
  const { adapter: storageAdapter } =
    await ArweaveLocalStorageAdapter.createWithTestWallet({
      fundAr: 5, // amount of test AR to fund the generated wallet with
    });

  log("Creating Midnight network adapter...");
  const chainAdapter = new MidnightChainAdapter({
    walletMode: "connector",
    connectorName: "1am", // matches window.midnight['1am'] by injected key or wallet name — omit to use whichever wallet is found first
    zkConfigBaseUrl: window.location.origin, // serves the keys/ and zkir/ copied to public/
    network: "preprod",
    proofServerEndpoint: "http://localhost:6300",
    logger: console,
  });

  const sdk = new DStorage({
    storageAdapter,
    chainAdapter,
    encryptionAdapters: [
      new PasswordEncryptionAdapter({
        password: "Correct-Horse-Battery!",
        salt: "myapp:v1",
      }),
    ],
  });

  log("Waiting for wallet connection — approve the prompt if one appears...");
  const contractAddress = await sdk.init();
  log("DataRegistry contract address:", contractAddress);

  const { chainRefId } = await sdk.store(
    new TextEncoder().encode("hello, dStorage"),
  );
  log("Stored. chainRefId:", chainRefId);

  const { bytes } = await sdk.retrieveByRefId(chainRefId);
  log("Retrieved:", new TextDecoder().decode(bytes));

  sdk.destroy();
}

button.addEventListener("click", () => {
  button.disabled = true;
  logEl.textContent = "";
  run()
    .catch((err) => {
      console.error(err);
      log("Error:", err instanceof Error ? err.message : String(err));
    })
    .finally(() => {
      button.disabled = false;
    });
});
