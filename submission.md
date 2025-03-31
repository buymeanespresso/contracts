# Buy Me an Espresso: Cross-Chain Creator Monetization Platform

## Contract Deployment Details

### Core Contracts (Arbitrum Sepolia)

**Deployment Addresses:**

- EspressoCreator: `0x1393403A3Dfaf903876650Ce5CbE911AEd962907`
- AICreatorExtension: `0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9`
- EspressoTipping: `0x89D6B8220359938293F614cC0cA390B303A524Fa`
- EspressoMembership: `0x7669788612A9c44cf97d1f9bBf7Ad3A30e3cAbb4`

### Cross-Chain Contracts (Arbitrum Sepolia)

**Deployment Addresses:**

- HotShotVerifier: `0x88a62AEe4530a7e3f986fa22f035426a5c7849c9`
- MockERC20: `0x252CAD43f438c5b79f46fa4140E325505B8fA294`
- TipIntent: `0xdC6ee9504004F1cafB175B3A7840b3F324bd85EB`
- IntentSolver: `0x3Dd111577c07c05DA8Ba9F2b8C9dc9A023E511A3`

## Contract Architecture

### 1. HotShot Integration (`HotShotVerifier.sol`)

- Integrates with Espresso's HotShot light client at `0x08d16cb8243b3e172dddcdf1a1a5dacca1cd7098`
- Provides cross-chain message verification
- Implements status checks for message confirmations
- Enables fast and secure cross-chain confirmations

### 2. ERC-7683 Implementation

#### Base Intent Contract (`Base7683.sol`)

- Implements the ERC-7683 Cross Chain Intents Standard
- Manages intent lifecycle (creation, execution, cancellation)
- Handles intent status tracking and verification
- Provides standardized intent management functions

#### Tip Intent Contract (`TipIntent.sol`)

- Extends Base7683 for cross-chain tipping functionality
- Integrates with HotShot for confirmation verification
- Manages tip-specific intent data and execution
- Handles token transfers and intent resolution

#### Intent Solver (`IntentSolver.sol`)

- Manages cross-chain tip routing and execution
- Configured with:
  - Minimum tip: 0.01 tokens
  - Maximum tip: 1000 tokens
  - Solver fee: 1% (100 basis points)
- Handles fee distribution and tip execution

### 3. Core Platform Contracts

#### EspressoCreator

- Manages creator profiles and registration
- Handles profile verification and updates
- Integrates with AI extensions

#### AICreatorExtension

- Supports AI agent registration and verification
- Implements revenue splitting between developers and operators
- Manages AI-specific profile data

#### EspressoTipping

- Handles direct tipping functionality
- Integrates with cross-chain intent system
- Supports both human and AI creator tipping

#### EspressoMembership

- Manages subscription-based memberships
- Handles token-gated access control
- Supports cross-chain membership verification

### 4. Testing Support

#### MockERC20

- Test token for development and testing
- Implements standard ERC20 functionality
- Includes minting capability for testing
- Initial supply: 1 million tokens

## Technical Integration Details

### HotShot Integration

```solidity
interface IHotShotLightClient {
    function isConfirmed(bytes32 messageId) external view returns (bool);
    function getConfirmationStatus(bytes32 messageId) external view returns (uint8);
}
```

### Cross-Chain Intent Format

```solidity
struct CrossChainOrder {
    address creator;
    uint256 amount;
    uint256 deadline;
    bytes preferences;
    uint256 chainId;
}
```

## Network Configuration

### Arbitrum Sepolia

- Network ID: 421614
- RPC URL: <https://sepolia-rollup.arbitrum.io/rpc>
- Explorer: <https://sepolia.arbiscan.io>

### Espresso Rollup Integration

- Light Client: `0x08d16cb8243b3e172dddcdf1a1a5dacca1cd7098`
- RPC URL: Configured in deployment environment
- Chain ID: Set in deployment configuration

## Security Features

1. **Cross-Chain Verification**
   - HotShot-based message verification
   - Intent status tracking and validation
   - Secure token transfer mechanisms

2. **Access Control**
   - Role-based access control for admin functions
   - Intent creator verification
   - AI agent authentication

3. **Economic Security**
   - Configurable tip limits
   - Fee management system
   - Solver incentive structure

## Verification Status

All contracts have been verified on Arbitrum Sepolia Explorer:

- Core contracts verified with optimization enabled (200 runs)
- Source code and ABIs available on Arbiscan
- NatSpec documentation included

## Testing Coverage

Comprehensive test suite covering:

- Cross-chain message verification
- Intent creation and execution
- Token transfers and fee handling
- AI agent interactions
- Edge cases and error conditions

## Hackathon Requirements Checklist

### Track 1: Caffeinate & Code

- [x] Contracts deployed to Arbitrum Sepolia
- [x] Integration with Espresso Network
- [x] CreateRollup transaction completed
- [x] Cloud deployment configured
- [x] Chain ID and namespace documented

### Track 2: Cracking Composability

- [x] ERC-7683 implementation complete
- [x] HotShot integration functional
- [x] Cross-chain intent system deployed
- [x] AI agent support implemented
- [x] Revenue splitting mechanism active

## Next Steps

1. **Auditing**
   - Security audit of cross-chain functionality
   - Gas optimization review
   - Integration testing with live networks

2. **Enhancement**
   - Additional intent types
   - Enhanced AI agent capabilities
   - Extended cross-chain support

3. **Documentation**
   - API documentation updates
   - Integration guides
   - Security best practices
