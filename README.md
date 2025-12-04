# PrivacyGuardianWallet

A privacy-first decentralized wallet recovery system built on Ethereum, allowing users to specify multiple guardians. Wallet recovery requires the approval of a majority of guardians, but guardians cannot see each other's identities.

## Project Background

Traditional wallet recovery mechanisms often face privacy and trust issues:

• Centralized recovery risks: Single points of failure or malicious administrators can compromise recovery

• Guardian collusion: In standard social recovery, guardians may identify each other and collude

• Lack of anonymity: Guardians' identities may be exposed during recovery

PrivacyGuardianWallet addresses these challenges by combining blockchain with encryption techniques:

• Guardians are selected and stored in an encrypted list

• Recovery requests are aggregated using fully homomorphic encryption (FHE)

• Approvals and denials are anonymized to prevent identity leaks

• Recovery process is transparent and tamper-resistant

## Features

### Core Functionality

• Wallet Recovery: Users specify multiple guardians; recovery requires majority approval

• Encrypted Guardian List: Guardian identities are encrypted and never exposed

• Anonymized Approvals: Guardians approve or reject recovery without revealing themselves

• Aggregated Requests: FHE ensures recovery requests are combined securely

• Transparent and Immutable: All requests and approvals are recorded on-chain

### Privacy & Security

• Full Anonymity: Guardians do not know each other’s identities

• Client-side Encryption: Guardian lists and requests encrypted before blockchain submission

• Immutable Records: Recovery requests and approvals cannot be altered

• Collusion Prevention: System design prevents multiple guardians from conspiring

## Architecture

### Smart Contracts

PrivacyGuardianWallet.sol (deployed on Ethereum)

• Manages encrypted guardian registration and recovery requests

• Aggregates FHE-encrypted approvals

• Ensures transparent, immutable on-chain storage

### Frontend Application

• React + TypeScript: Responsive, interactive UI

• Ethers.js: Blockchain interaction

• Modern UI/UX: Recovery dashboard, guardian management, and request tracking

• Wallet Integration: Optional Ethereum wallet support

• Real-time Updates: Fetches requests and aggregated approval status from blockchain

## Technology Stack

### Blockchain

• Solidity ^0.8.24: Smart contract development

• OpenZeppelin: Secure smart contract libraries

• Hardhat: Development, testing, and deployment framework

• Ethereum Testnets (e.g., Sepolia) for deployment

### Frontend

• React 18 + TypeScript: Modern frontend framework

• Ethers.js: Ethereum blockchain interaction

• Tailwind + CSS: Styling and responsive layout

• React Icons: UI iconography

• Vercel: Frontend deployment platform

## Installation

### Prerequisites

• Node.js 18+

• npm / yarn / pnpm package manager

• Ethereum wallet (MetaMask, WalletConnect, etc.)

### Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to network (configure hardhat.config.js first)
npx hardhat run deploy/deploy.ts --network sepolia

# Start the frontend development server
cd frontend

# Install dependencies
npm install

# Run
npm run dev
```

## Usage

• Configure Wallet: Connect wallet for interacting with smart contracts

• Manage Guardians: Add encrypted guardians to your wallet

• Initiate Recovery: Request wallet recovery and track approval status

• View Approvals: Monitor aggregated, anonymized approval results

## Security Features

• Encrypted Guardian List: Identities never exposed

• FHE Aggregation: Secure computation of recovery requests

• Immutable Storage: Requests and approvals are tamper-proof

• Privacy by Design: Guardians cannot see each other

• Collusion Prevention: System prevents multiple guardians from conspiring

## Future Enhancements

• Multi-chain deployment for broader compatibility

• Mobile-friendly interface

• DAO governance for community-driven feature improvement

• Advanced threshold and alert systems for high-value wallets

Built with ❤️ to protect wallet security and user privacy on Ethereum
