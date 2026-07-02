---
layout: home

hero:
  name: "dStorage SDK"
  text: "Privacy-first data layer for dApps"
  tagline: Client-side encryption + decentralised storage + on-chain coordination in a single SDK.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: FAQ
      link: /faq/
    - theme: alt
      text: All Features
      link: /features/

features:
  - title: Client-side encryption
    details: Data is encrypted on the user's device using keys derived from a pluggable encryption adapter (password, wallet signature, mnemonic, or custom) before it ever leaves.
  - title: Decentralised storage
    details: Encrypted blobs are stored on decentralised networks (Arweave, Arweave Local, Mock) — no single party holds a plaintext copy.
  - title: On-chain coordination
    details: Cryptographic references are written on-chain (Mock, Midnight), giving data owners a verifiable, tamper-proof receipt.
  - title: Adapter flexibility
    details: Swap storage, chain, and encryption adapters independently — start with Mock everything and move to real infrastructure without changing call sites.
  - title: Post-quantum options
    details: ML-KEM768 keypair encryption and machine-generated PQ-safe passwords protect against "harvest now, decrypt later" threats.
  - title: Managed payments
    details: dStorage Pro sponsors both Arweave storage and Midnight DUST fees — end-users need no AR wallet and no funded Midnight wallet.
---
