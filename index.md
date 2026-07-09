---
layout: home

hero:
  name: "dStorage SDK"
  text: "Privacy-first data layer for dApps"
  tagline: Client-side encryption + decentralised storage + on-chain coordination in a single SDK.
  actions:
    - theme: brand
      text: Start Building
      link: /guide/
    - theme: alt
      text: All Features
      link: /features/
    - theme: alt
      text: FAQ
      link: /faq/

features:
  - icon: 🔒
    title: Client-side encryption
    details: Data is encrypted on the user's device using keys derived from a pluggable encryption adapter (password, mnemonic, or keypair) before it ever leaves.
  - icon: 🗄️
    title: Decentralised storage
    details: Encrypted blobs are stored on decentralised networks (Arweave, others coming soon) — no single party holds a plaintext copy.
  - icon: ⛓️
    title: On-chain coordination
    details: Cryptographic references can be written on-chain (Mock, MidnightSimulator, or Midnight), giving data owners a verifiable, tamper-proof receipt.
  - icon: 🔌
    title: Adapter flexibility
    details: Swap storage, chain, and encryption adapters independently — start with Mock everything and move to real infrastructure without changing application code.
  - icon: 🛡️
    title: Post-quantum options
    details: Post-quantum-safe key wrapping — via ML-KEM768 keypairs, 24-word mnemonics, or machine-generated passwords — protects against "harvest now, decrypt later" threats.
  - icon: 💳
    title: Managed payments
    details: Fund your dStorage Pro account to cover Arweave storage and Midnight DUST fees on behalf of your users — no AR wallet or funded Midnight wallet required on their end.
---
