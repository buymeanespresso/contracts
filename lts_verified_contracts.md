# Verified Contracts - Buy Me An Espresso Platform

This document lists all contracts that have been successfully verified through test execution and are considered stable for deployment.

## Core Contracts

| Contract | Address | Status | Functionality |
|----------|---------|--------|--------------|
| EspressoCreator | 0x1393403A3Dfaf903876650Ce5CbE911AEd962907 | ✅ Verified | Creator profile management |
| EspressoTipping | 0xB3426fce375D6edd2fdf7f80c9a6cd89aB93aFA4 | ✅ Verified | Tipping functionality |
| EspressoMembership | 0x7669788612A9c44cf97d1f9bBf7Ad3A30e3cAbb4 | ✅ Verified | Membership tier management |
| AICreatorExtension | 0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9 | ✅ Verified | AI agent registration and management |

## Intents Framework Contracts

| Contract | Status | Purpose |
|----------|--------|---------|
| TipIntent | ✅ Verified (Cross-chain Test) | Intent implementation for cross-chain tipping |
| IntentSolver | ✅ Verified (Cross-chain Test) | Solver implementation for executing intents |
| Base7683 | ✅ Verified | Base implementation of ERC-7683 intent standard |

## Cross-Chain Messaging Contracts

| Contract | Status | Purpose |
|----------|--------|---------|
| HotShotVerifier | ✅ Verified | Espresso Network integration for cross-chain messaging |
| ArbitrumL2Messenger | ✅ Verified | Messaging contract for Arbitrum chain communication |

## Verification Details

### Core Contracts

1. **EspressoCreator**
   - Verified on: Arbitrum Sepolia
   - Test Script: Integration tests in production test
   - Features Verified: Profile creation and management

2. **EspressoTipping**
   - Verified on: Arbitrum Sepolia
   - Test Script: Production cross-chain test
   - Features Verified: Direct tipping, tip distribution

3. **EspressoMembership**
   - Verified on: Arbitrum Sepolia
   - Test Script: `test:membership`
   - Features Verified:
     - Membership tier creation
     - Tier details retrieval
     - Active tier status

4. **AICreatorExtension**
   - Verified on: Arbitrum Sepolia
   - Test Script: `test:ai-agent`
   - Features Verified:
     - AI agent registration
     - Agent information retrieval and updates
     - Different agent types
     - Revenue split configuration

### Intents Framework

The cross-chain tipping functionality relies on the ERC-7683 intent standard for creating and executing intents across chains. The intents implementation has been verified through the production cross-chain test, which confirms:

- Intent creation and signing
- Intent execution by a solver
- Cross-chain message passing via Espresso Network

### Known Limitations

- TipIntent contract does not fully implement all optional functions of the ERC-7683 intent standard, but core functionality works as expected.

## Test Commands

To verify these contracts yourself, run the following commands:

```bash
# Test cross-chain tipping functionality
bun run test:production

# Test membership functionality
bun run test:membership

# Test AI agent functionality
bun run test:ai-agent
```

## Deployment Information

All verified contracts are deployed on the Arbitrum Sepolia testnet. For the latest deployment addresses, refer to the `contract-endpoints.md` file. 