# ESPR Token Faucet

This script allows you to mint ESPR tokens to any address from the faucet account.

## Prerequisites

1. Make sure your private key is configured in Hardhat's configuration
2. The signer account must have owner privileges on the MockERC20 contract

## Usage

```bash
# Mint tokens to the default address (0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8)
npx hardhat run scripts/faucet.ts --network espresso-rollup

# Mint to a different address by setting environment variables
RECIPIENT=0xYourAddress AMOUNT=25 npx hardhat run scripts/faucet.ts --network espresso-rollup
```

## Configuration

You can configure the faucet script using environment variables:

- `RECIPIENT`: The address to receive tokens (default: 0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8)
- `AMOUNT`: The amount of ESPR tokens to mint (default: 10)
- `ROLLUP_RPC_URL`: Custom RPC URL for the Espresso Rollup (optional)

## Network Configuration

The project already has an "espresso-rollup" network configured in `hardhat.config.ts`:

```typescript
networks: {
  "espresso-rollup": {
    url: process.env.ROLLUP_RPC_URL || "http://34.31.168.162:8547",
    accounts: [PRIVATE_KEY],
    chainId: 4371337,
    timeout: 120000, // 2 minutes
  },
}
```

## Notes

- Make sure the signer account has owner privileges on the MockERC20 contract to mint tokens
- The script will warn you if your account doesn't appear to be the owner
- The signer account must have ETH for gas fees on the rollup network 