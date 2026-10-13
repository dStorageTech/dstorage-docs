---
description: Use these docs with Claude Code, Cursor, Codex or any other AI coding agent — llms.txt, project instructions, and a ready-made prompt for every guide.
---

# Build with AI

These docs are written to be read by AI coding agents as well as people. The dStorage SDK is
new and its API changes between versions, so an agent working from what it remembers will often
get it wrong. Point it at these docs instead, and it works from the current API.

## Point your agent at the docs

Every page is also published as plain Markdown for agents:

- **[`llms.txt`](https://dstorage.pro/docs/llms.txt)** — an index of every page, with links to
  their Markdown versions. Start here.
- **[`llms-full.txt`](https://dstorage.pro/docs/llms-full.txt)** — the whole docs in one file,
  for agents that work best with everything in context at once.
- **A Markdown copy of each page** — the page URL with `.md` instead of `.html`, e.g.
  [`/docs/guide/mock-adapters.md`](https://dstorage.pro/docs/guide/mock-adapters.md).

Some agents' fetch tools can't read the `.md` copies. If yours can't, give it the normal page URL
or `llms-full.txt` instead.

## Add the docs to your project's agent instructions

Most coding agents read a project instructions file on every run: `AGENTS.md` (Codex, Cursor and
others), `CLAUDE.md` (Claude Code) or `.cursor/rules`. Add this to yours, so the agent checks
these docs whenever it touches dStorage code, without you having to remind it:

```md
## dStorage SDK

This project uses @dstorage-tech/dstorage-sdk. Its API changes between versions, so don't rely
on prior knowledge of it. Before writing or changing dStorage code, read the docs:

- Docs index: https://dstorage.pro/docs/llms.txt
- Full docs in one file: https://dstorage.pro/docs/llms-full.txt

Check the SDK version installed in package.json, and flag anything in the docs that doesn't
match it.
```

## Ask about any page

The **Copy page for AI** button in the top bar copies the current page as Markdown. Its menu can
also open the page in Claude or ChatGPT, ready for you to ask questions about it — handy for the
[FAQ](/faq/) and [Features](/features/) pages.

## A prompt for every guide

Each [guide](/guide/) starts with a ready-made prompt that has your agent follow it in your own
project, ending with a check that it worked. They're collected here in the same order as the
guides, each building on the one before:

<AgentPrompt id="mock-adapters" label="Mock Adapters" compact />

<AgentPrompt id="core-concepts" label="Core Concepts" compact />

<AgentPrompt id="local-simulator-adapters" label="Local & Simulator Adapters" compact />

<AgentPrompt id="managed-payments-service" label="Managed Payments Service" compact />

<AgentPrompt id="midnight-network-adapter" label="Midnight Network Adapter" compact />

<AgentPrompt id="passkey-encryption" label="Passkey Encryption" compact />

<AgentPrompt id="managed-payments-midnight" label="Managed Payments on Midnight" compact />

Prefer a working app to start from? Clone
[`dstorage-starter-template`](https://github.com/dStorageTech/dstorage-starter-template) and run
the prompts against it.

## Tips

- **Review what the agent changes**, especially anything touching keys, passwords or tokens.
- **Never paste a `ds_*` secret token into a prompt or browser code.** Keep tokens in
  environment variables; in the browser, use a scoped JWT token (see
  [Managed Payments](/faq/managed-payments)).
- **Steps that need you** — approving wallet prompts, passkey ceremonies, creating a dStorage
  Pro token — can't be done by the agent. The prompts tell it to stop and ask you at those points.
