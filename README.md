# Buy Me An Espresso ☕

A decentralized tipping platform built on top of Arbitrum Orbit and Espresso Network.

## Overview

"Buy Me An Espresso" is a web3 platform that allows users to tip content creators with tokens. The platform uses:

- **Arbitrum Orbit Rollup**: A custom L2 rollup for low-cost transactions
- **Espresso Network**: For cross-chain messaging and intent verification
- **HotShot Verifier**: For secure message verification

## Project Architecture

The project consists of several key components:

1. **TipIntent Contract**: Handles the creation and execution of tip intents
2. **IntentSolver**: Executes verified tip intents and distributes funds
3. **EspressoCreatorRegistry**: Manages creator profiles and verification
4. **HotShotVerifier**: Interface for the Espresso Network message verification
5. **Mock Contracts**: For testing purposes (MockERC20, MockHotShotLightClient)

## Deployed Contracts

The following contracts have been deployed to the Arbitrum Orbit Rollup:

```json
{
  "mockHotShotLightClient": "0xE7E055f29afF0494694f06B7F56Bcf6F9689Ad1d",
  "hotShotVerifier": "0x7116fF137f4CE18a88f013Fc87518c9a8E798f2C",
  "mockERC20": "0x1393403A3Dfaf903876650Ce5CbE911AEd962907",
  "tipIntent": "0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9",
  "intentSolver": "0x89D6B8220359938293F614cC0cA390B303A524Fa",
  "espressoCreatorRegistry": "0x7669788612A9c44cf97d1f9bBf7Ad3A30e3cAbb4"
}
```

## How It Works

1. A user creates a tip intent on the rollup, specifying:
   - Creator address
   - Token and amount
   - Deadline
   - Optional message

2. The Espresso Network routes the message to the destination chain

3. The HotShot Verifier confirms the message on the destination chain

4. The IntentSolver executes the tip intent, transferring funds to the creator minus a small fee

## Development and Testing

### Prerequisites

- Node.js v16+
- Bun package manager
- Hardhat

### Setup

```bash
# Install dependencies
bun install

# Compile contracts
bun hardhat compile
```

### Deployment

To deploy all contracts to the Arbitrum Orbit rollup:

```bash
export PRIVATE_KEY=your_private_key
bun hardhat run scripts/deploy-contracts.ts --network espresso-rollup
```

### Testing

To test the deployed contracts:

```bash
export PRIVATE_KEY=your_private_key
bun hardhat run scripts/test-deployed-contracts.ts --network espresso-rollup
```

## Frontend Integration

The frontend for this platform should interact with these contracts to:

1. Display creator profiles
2. Allow users to send tips
3. Show tip history and status
4. Connect to the Espresso Network for cross-chain messaging

## License

MIT
