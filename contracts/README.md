# Smart Contracts Architecture

This directory contains the Solidity smart contracts for the Buy Me an Espresso platform, implementing a cross-chain tipping system powered by the Espresso Network and the ERC-7683 intent standard.

## Directory Structure

- **/core**: Core contracts for the platform
- **/crosschain**: Cross-chain messaging contracts for Espresso Network integration
- **/intents**: ERC-7683 intent implementation
- **/interfaces**: Contract interfaces
- **/registry**: Creator registry contracts
- **/mocks**: Mock contracts for testing
- **/test**: Test contracts and utilities

## Key Contracts

### Cross-Chain Messaging (Espresso Network Integration)

- **HotShotVerifier.sol**: Interface for verifying cross-chain messages via Espresso Network
- **HotShotVerifierImpl.sol**: Implementation of the HotShotVerifier contract (deployed at `0x6141dD10feDd8E124f70DcA9E680617E11EA94F5`)
- **IHotShotLightClient.sol**: Interface for the HotShot light client
- **MockHotShotLightClient.sol**: Mock implementation for testing (deployed at `0x3717feFfFa0085C562D1a14401C878284b37fF1a`)

### Intents Framework (ERC-7683)

- **Base7683.sol**: Base implementation of the ERC-7683 standard, including intent status tracking and execution logic
- **TipIntent.sol**: Implementation of tipping intents (deployed at `0x271b96Cf80758FdB97246c8CF94Dc325B77c8cE8`)
- **IntentSolver.sol**: Contract for solving/executing cross-chain intents (deployed at `0x2AB4b67f0f1f4c680EC8C11b479D26b1346c3bC2`)

### Registry

- **EspressoCreatorRegistry.sol**: Registry for storing creator information (deployed at `0x5a96Ee105408559Ee3B94C02eBdd89F87BC68Bf3`)

## ERC-7683 Intent Implementation

The ERC-7683 intent standard is implemented through:

1. **Base7683 Contract**: Provides core intent functionality:
   ```solidity
   enum IntentStatus {
       PENDING,
       EXECUTED,
       CANCELED,
       EXPIRED
   }
   
   function execute(bytes32 intentId, bytes calldata executionData) external;
   function cancel(bytes32 intentId) external;
   function getStatus(bytes32 intentId) external view returns (IntentStatus);
   ```

2. **TipIntent Contract**: Extends Base7683 for cross-chain tips:
   ```solidity
   function createTipIntent(
       address creator, 
       address token, 
       uint256 amount, 
       string memory message, 
       uint256 deadline
   ) external;
   
   function executeTipIntent(bytes32 intentId, bytes32 messageId) external;
   ```

## Cross-Chain Messaging Flow

The integration with Espresso Network follows this flow:

1. User creates a tip intent on the source chain (Arbitrum Orbit Rollup)
2. A message ID is generated using the HotShotVerifier:
   ```solidity
   bytes32 messageId = hotShotVerifier.generateMessageId(
     abi.encodePacked(sender, recipient, token, amount, nonce)
   );
   ```
3. The message is confirmed through the HotShotVerifier:
   ```solidity
   hotShotVerifier.confirmMessage(messageId);
   ```
4. The IntentSolver verifies message confirmation and executes the tip intent:
   ```solidity
   require(hotShotVerifier.isMessageConfirmed(messageId), "Message not confirmed");
   tipIntent.executeTipIntent(intentId, messageId);
   ```

## Contract Interactions

The main contract interactions are:

1. **TipIntent <-> HotShotVerifier**: For cross-chain message verification
2. **IntentSolver <-> TipIntent**: For executing confirmed intents
3. **IntentSolver <-> HotShotVerifier**: For checking message confirmation status
4. **TipIntent <-> ERC20**: For handling token transfers

## Deployed Contract Addresses

All contracts are deployed on our Arbitrum Orbit Rollup (Chain ID: 4371337):

- **MockERC20**: `0xF8BB532Db32B681cD813d9f7d7606083984c7739`
- **TipIntent**: `0x271b96Cf80758FdB97246c8CF94Dc325B77c8cE8`
- **IntentSolver**: `0x2AB4b67f0f1f4c680EC8C11b479D26b1346c3bC2`
- **HotShotVerifier**: `0x6141dD10feDd8E124f70DcA9E680617E11EA94F5`
- **EspressoCreatorRegistry**: `0x5a96Ee105408559Ee3B94C02eBdd89F87BC68Bf3`
- **MockHotShotLightClient**: `0x3717feFfFa0085C562D1a14401C878284b37fF1a` 