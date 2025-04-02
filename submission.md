# Buy Me an Espresso - Hackathon Submission

## Project Overview

"Buy Me an Espresso" is a decentralized platform that enables cross-chain tipping for creators, built on an Arbitrum Orbit rollup with Espresso Network integration. The platform leverages the power of fast cross-chain messaging through Espresso's HotShotVerifier to enable seamless tipping experiences across multiple chains.

Beyond cross-chain tipping, our platform includes advanced features like membership tiers and AI agent support, making it a comprehensive creator monetization solution.

## Rollup Details

- **Chain ID**: 4371337
- **Server IP**: 34.31.168.162
- **RPC URL**: http://34.31.168.162:8547
- **Namespace**: espresso-hackathon
- **CreateRollup Transaction Hash**: `0x6e4f52269E90A7029Adc1B93827e984ffA8Fa1FF`

## Espresso Network Integration

Our platform integrates with the Espresso Network through:

1. **HotShotVerifier Contract**: Deployed at `0x6141dD10feDd8E124f70DcA9E680617E11EA94F5`, this contract is responsible for:
   - Generating message IDs for cross-chain verification
   - Confirming messages that have been processed by the Espresso Network
   - Enabling trustless cross-chain message verification

2. **Cross-Chain Message Flow**:
   - We generate a message ID using the HotShotVerifier contract
   - The message is confirmed directly through the HotShotVerifier 
   - Once confirmed, the intent can be executed on the destination chain

## Technical Implementation

### ERC-7683 Intent Implementation

We've fully implemented the ERC-7683 Open Intents Framework:

1. **Base7683.sol**: Our base implementation of the ERC-7683 intent standard, which includes:
   - `execute()` function for executing intents
   - Intent metadata and status tracking
   - Standard events and errors

2. **TipIntent.sol**: Extends Base7683 for tipping functionality:
   - Creates cross-chain tip intents
   - Validates intent execution conditions
   - Enforces proper distribution of tips

3. **IntentSolver.sol**: Handles the execution of intents:
   - Verifies that cross-chain messages have been confirmed
   - Distributes tokens according to the intent parameters
   - Takes a small fee for the solver

### Cross-Chain Verification Flow

The cross-chain messaging flow uses the following sequence:

1. **Message Generation**:
   ```solidity
   bytes32 messageId = hotShotVerifier.generateMessageId(abi.encodePacked(sender, recipient, token, amount, nonce));
   ```

2. **Direct Confirmation**:
   ```solidity
   hotShotVerifier.confirmMessage(messageId);
   ```

3. **Intent Execution**:
   ```solidity
   intentSolver.solveIntent(intentId, messageId);
   ```

For frontend and backend developers, we've created a comprehensive [Cross-Chain User Flow](./cross-chain-user-flow.md) guide that provides a detailed, production-ready implementation with full code examples. This ensures seamless integration with our contracts and a 100% functional cross-chain tipping experience.

### Creator Membership System

We've implemented a robust membership system that allows creators to monetize through subscriptions:

1. **EspressoMembership.sol**: Deployed at `0x7669788612A9c44cf97d1f9bBf7Ad3A30e3cAbb4`, this contract enables:
   - Creation of multiple membership tiers with customizable pricing and duration
   - Subscription management with automatic duration tracking
   - Benefits and perks associated with each tier

2. **Key Membership Functions**:
   ```solidity
   function createTier(
     string name,
     string description,
     uint256 price,
     uint256 duration,
     string[] benefits
   ) external returns (uint256 tierId);
   
   function purchaseMembership(address creator, uint256 tierId) external payable;
   
   function getMembershipStatus(address member, address creator, uint256 tierId) 
     external view returns (bool isActive, uint256 expiryDate);
   ```

### AI Agent Integration

Our platform supports AI agents as first-class creators:

1. **AICreatorExtension.sol**: Deployed at `0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9`, this contract enables:
   - Registration of AI agents with different autonomy levels
   - Revenue splitting between developers and operators
   - Verification system for trusted AI agents

2. **Key AI Agent Functions**:
   ```solidity
   function registerAsAgent(
     AgentType agentType,
     address developer,
     address operator,
     uint256 revenueSplitDeveloper, // basis points (e.g., 5000 = 50%)
     string calldata trainingInfo,
     string calldata capabilities
   ) external;
   
   function isAgent(address user) external view returns (bool);
   
   function getAgentInfo(address agentAddress) external view returns (AgentInfo memory);
   ```

## Deployed Contracts

| Contract | Address | Chain ID |
|----------|---------|----------|
| MockERC20 | 0xF8BB532Db32B681cD813d9f7d7606083984c7739 | 4371337 |
| TipIntent | 0x271b96Cf80758FdB97246c8CF94Dc325B77c8cE8 | 4371337 |
| IntentSolver | 0x2AB4b67f0f1f4c680EC8C11b479D26b1346c3bC2 | 4371337 |
| HotShotVerifier | 0x6141dD10feDd8E124f70DcA9E680617E11EA94F5 | 4371337 |
| EspressoCreatorRegistry | 0x5a96Ee105408559Ee3B94C02eBdd89F87BC68Bf3 | 4371337 |
| MockHotShotLightClient | 0x3717feFfFa0085C562D1a14401C878284b37fF1a | 4371337 |

### Arbitrum Sepolia Contracts

| Contract | Address | Verification Status |
|----------|---------|-------------------|
| EspressoCreator | 0x1393403A3Dfaf903876650Ce5CbE911AEd962907 | ✅ Verified |
| AICreatorExtension | 0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9 | ✅ Verified |
| EspressoMembership | 0x7669788612A9c44cf97d1f9bBf7Ad3A30e3cAbb4 | ✅ Verified |
| EspressoTipping | 0x89D6B8220359938293F614cC0cA390B303A524Fa | ✅ Verified |

## Supported Cross-Chain Destinations

Our platform supports tipping to creators on:

- **Arbitrum Sepolia** (Chain ID: 421614)
- **Ethereum Sepolia** (Chain ID: 11155111)
- **Our Rollup** (Chain ID: 4371337)

## Testing and Verification

We've created dedicated scripts to verify our implementation:

1. `test-production-integration.ts`: Demonstrates the full end-to-end cross-chain tip flow
2. `verify-espresso-integration.ts`: Directly verifies integration with the Espresso Network
3. `test-membership.ts`: Tests the membership tier functionality
4. `test-ai-agent.ts`: Tests the AI agent registration and revenue splitting

These scripts confirm that:
- Message IDs are correctly generated
- Messages are properly confirmed
- Intents are executed as expected once confirmed
- Membership tiers can be created and managed
- AI agents can be registered with proper revenue splitting

For a detailed list of all verified contracts, test results, and known limitations, see our [Verified Contracts](./lts_verified_contracts.md) document.

## Future Improvements

While our current implementation provides a functional cross-chain tipping platform, we plan to enhance it with:

1. Direct integration with Espresso Network API endpoints for production use
2. Replace the mock light client with the real Espresso Network light client
3. Extend the platform to support more token types (ERC-721, ERC-1155)
4. Build a multi-chain creator registry for cross-chain profile access
5. Enhanced membership benefits with token-gated access
6. Integration with AI model marketplaces for verified AI agents

## Conclusion

"Buy Me an Espresso" demonstrates the power of combining Arbitrum Orbit rollups with Espresso Network's cross-chain messaging capabilities to create a seamless tipping experience across multiple chains. Our implementation of the ERC-7683 intent standard showcases the potential for standardized cross-chain interactions, while our membership and AI agent features provide a comprehensive creator monetization platform.

## Repository

GitHub: [https://github.com/buymeanespresso](https://github.com/buymeanespresso)
