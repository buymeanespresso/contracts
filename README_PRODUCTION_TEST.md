# Production Cross-Chain Test

This test script performs a real cross-chain transaction using the Espresso Network's HotShot verification service to demonstrate the production-ready implementation.

## Prerequisites

- [Bun](https://bun.sh/) installed (for fast dependency installation and execution)
- Node.js 18+ (if not using Bun)
- A wallet with funds on the Espresso Rollup (for executing transactions)
- Access to the Espresso Network API endpoints

## Setup

1. Install dependencies:

```bash
# Using Bun (recommended)
bun install

# Using npm as fallback
npm install --legacy-peer-deps
```

2. Create a `.env` file in the root directory with the following content:

```
PRIVATE_KEY=your_private_key_here
```

**IMPORTANT**: Never commit your private key to version control!

3. Copy the `deployments.example.json` to `deployments.json` and update with your actual contract addresses:

```bash
cp deployments.example.json deployments.json
```

Then edit `deployments.json` to include your deployed contract addresses:

```json
{
  "mockERC20": "0xF8BB532Db32B681cD813d9f7d7606083984c7739",
  "tipIntent": "0x271b96Cf80758FdB97246c8CF94Dc325B77c8cE8",
  "intentSolver": "0x2AB4b67f0f1f4c680EC8C11b479D26b1346c3bC2",
  "hotShotVerifier": "0x6141dD10feDd8E124f70DcA9E680617E11EA94F5"
}
```

## Running the Test

Execute the test script using Bun:

```bash
bun run test:production
```

For verbose output and debugging:

```bash
bun run test:production:debug
```

## What the Test Does

1. Connects to both the source chain (Espresso Rollup) and destination chain (Arbitrum Sepolia)
2. Checks token balances and mints more tokens if needed
3. Creates a tip intent on the source chain
4. Generates a cross-chain message and submits it to the Espresso Network
5. Waits for the message to be confirmed by the Espresso Network
6. Executes the tip intent once the message is confirmed
7. Verifies the successful execution of the cross-chain tip

## Troubleshooting

### API Connection Issues

If you encounter errors connecting to the Espresso Network API:

1. Verify that the Espresso Network endpoints are accessible from your network
2. Check if there are rate limiting issues (the script includes automatic retry mechanisms)
3. Ensure your testnet is properly configured and running

### Transaction Failures

If transactions fail:

1. Ensure your wallet has enough ETH for gas on both chains
2. Check that your wallet has sufficient ESPR tokens
3. Verify the contract addresses in `deployments.json`

### Message Confirmation Timeout

If the message confirmation times out:

1. The Espresso Network might be experiencing delays
2. Try increasing the `maxPollAttempts` in the configuration
3. Check the Espresso Network status through their monitoring tools

## Network Configuration

The test currently uses the following network configuration:

- Source Chain: Espresso Rollup (ChainID: 4371337)
- Destination Chain: Arbitrum Sepolia (ChainID: 421614)

You can modify these settings in the `CONFIG` object within the script if needed.

## Further Resources

- [Espresso Network Documentation](https://docs.espressosys.com/network/)
- [Arbitrum Orbit Documentation](https://docs.arbitrum.io/launch-orbit-chain/orbit-quickstart) 