// Suggested prompts for running the guides with an AI coding agent, rendered by
// `<AgentPrompt id="..." />`. Keep these in step with the guides and the SDK version
// they target: a prompt naming a stale API is as wrong as a stale code sample.

export const DOCS_URL = "https://dstorage.pro/docs";

const SOURCE_OF_TRUTH = `Use the dStorage SDK docs as your source of truth, not prior knowledge: the SDK is new and its API changes between versions. The docs index is ${DOCS_URL}/llms.txt and the full docs are in ${DOCS_URL}/llms-full.txt.`;

const CONFLICTS = `If anything in my project conflicts with the guide (module system, Node.js version, existing dStorage setup), explain the conflict before changing anything.`;

const TOKEN_HANDLING = `Don't hard-code my dStorage Pro token: read it from an environment variable, add a placeholder for it to .env.example, and make sure the real .env file is git-ignored. If the token isn't set, stop and ask me for it.`;

const LOCAL_SERVICES = `Before running anything, check whether the local services the guide needs are already running and tell me which ones you need me to start.`;

export interface AgentPromptEntry {
  // Heading shown in the prompt box; defaults to "Let your AI agent follow this guide".
  label?: string;
  prompt: string;
}

export const prompts: Record<string, AgentPromptEntry> = {
  "mock-adapters": {
    prompt: `${SOURCE_OF_TRUTH}

Read the "Mock Adapters" guide at ${DOCS_URL}/guide/mock-adapters.md, then follow it in my current project:

1. Install @dstorage-tech/dstorage-sdk (requires Node.js 22 or later).
2. Configure DStorage with MockStorageAdapter, MockChainAdapter and PasswordEncryptionAdapter, exactly as the guide shows.
3. Add a small script that calls init(), stores the string "hello, dStorage", retrieves it with retrieveByRefId(), prints the decoded result, and calls destroy().
4. Run the script and confirm it prints "hello, dStorage".

${CONFLICTS}`,
  },

  "core-concepts": {
    label: "Let your AI agent explain this with your code",
    prompt: `${SOURCE_OF_TRUTH}

Read the "Core Concepts" guide at ${DOCS_URL}/guide/core-concepts.md, then look at how my current project uses the dStorage SDK and explain, in terms of my own code:

1. Which encryptionAdapters protect each upload's DEK, and which of them could unlock my data on their own.
2. Where my code gets a refId and where it gets a storageId, and whether I'm storing the right one for later retrieval.
3. Which storageAdapters and chainAdapters I've configured, in what fallback order, and whether I'm in storage-only mode.
4. Exactly what my uploads put on-chain and what they put on the storage network.

Point to file and line for each answer. Don't change any code; if something looks wrong against the guide, list it at the end as a suggestion.`,
  },

  "local-simulator-adapters": {
    prompt: `${SOURCE_OF_TRUTH}

Read the "Local & Simulator Adapters" guide at ${DOCS_URL}/guide/local-simulator-adapters.md, then follow it in my current project:

1. Make sure arlocal is running on port 1984 (Docker or npx, as the guide shows).
2. Replace MockStorageAdapter with ArweaveLocalStorageAdapter.createWithTestWallet() and MockChainAdapter with MidnightSimulatorChainAdapter. Keep PasswordEncryptionAdapter as it is.
3. Run the init() / store() / retrieveByRefId() round trip with the string "hello, dStorage" and confirm it prints that string back.
4. Show me the chainRefId and storageId you got, and confirm that the chainRefId is a 32-byte hex ID.

${LOCAL_SERVICES} ${CONFLICTS}`,
  },

  "managed-payments-service": {
    prompt: `${SOURCE_OF_TRUTH}

Read the "Managed Payments Service" guide at ${DOCS_URL}/guide/managed-payments-service.md, then follow it in my current project, starting from the Local & Simulator Adapters setup:

1. Make sure arlocal is running on port 1984.
2. Create a single managedPayment config object (signingServerUrl "https://portal.dstorage.pro", testMode: true) and pass it to both ArweaveLocalStorageAdapter.createWithTestWallet() and MidnightSimulatorChainAdapter.
3. Run the init() / store() / retrieveByRefId() round trip with the string "hello, dStorage" and confirm it prints that string back.
4. Tell me to check the dStorage Pro portal, where this store() should show up as two TEST payments: one for storage and one for the chain.

${TOKEN_HANDLING} ${LOCAL_SERVICES} ${CONFLICTS}`,
  },

  "midnight-network-adapter": {
    prompt: `${SOURCE_OF_TRUTH}

Read the "Midnight Network Adapter" guide at ${DOCS_URL}/guide/midnight-network-adapter.md, then follow it in my current project. This guide runs in the browser with Vite:

1. Make sure arlocal is running on port 1984, and start the Midnight proof server Docker image on port 6300 with the exact image tag the guide uses.
2. Copy the SDK's DataRegistry keys/ and zkir/ folders into public/, as the guide shows, and add a script so this happens on every dev run.
3. Import from @dstorage-tech/dstorage-sdk/browser and configure MidnightChainAdapter in "connector" mode for the preprod network. Keep ArweaveLocalStorageAdapter and PasswordEncryptionAdapter.
4. Wire init() / store() / retrieveByRefId() to a Run button, logging the contract address and the decoded "hello, dStorage" result.
5. Make the contract address configurable, so I can paste the one from my first run and reconnect to that contract instead of deploying a new one.

You can't drive my wallet extension: when it's time to click Run, tell me what to check first (wallet switched to Preprod, funded with DUST from the Preprod faucet) and what output to expect. ${LOCAL_SERVICES} ${CONFLICTS}`,
  },

  "passkey-encryption": {
    prompt: `${SOURCE_OF_TRUTH}

Read the "Passkey Encryption" guide at ${DOCS_URL}/guide/passkey-encryption.md, then follow it in my current project, starting from the Midnight Network Adapter browser app:

1. Check WebAuthnPrfEncryptionAdapter.isSupported() and show a clear message if PRF isn't available.
2. Call register() on the first visit and authenticate() on later visits, and persist the credentialId in localStorage as the guide shows.
3. Replace PasswordEncryptionAdapter with the passkey adapter in encryptionAdapters. Leave the storage and chain adapters unchanged.
4. Keep the existing Run button flow (init() / store() / retrieveByRefId()) working with the passkey adapter.

You can't complete passkey prompts for me: tell me when to run the app, what browser and authenticator prompts to expect, and how to test a returning visit by reloading the page. ${CONFLICTS}`,
  },

  "managed-payments-midnight": {
    prompt: `${SOURCE_OF_TRUTH}

Read the "Managed Payments on Midnight" guide at ${DOCS_URL}/guide/managed-payments-midnight.md, then follow it in my current project, starting from the Midnight Network Adapter browser app:

1. Make sure arlocal (port 1984) and the Midnight proof server (port 6300) are running, as in the Midnight Network Adapter guide.
2. Add a managedPayment config object (signingServerUrl "https://portal.dstorage.pro") to MidnightChainAdapter only. Leave ArweaveLocalStorageAdapter and PasswordEncryptionAdapter unchanged.
3. Keep the existing Run button flow (init() / store() / retrieveByRefId()) working.

This app runs in the browser, so it must use a JWT token from the portal, never a ds_* secret token. If you find a ds_* token in my config, stop and warn me. ${TOKEN_HANDLING} Tell me when to click Run, and point out that my wallet only needs to be on Preprod: it doesn't need any DUST or NIGHT. ${LOCAL_SERVICES} ${CONFLICTS}`,
  },
};
