// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Base7683.sol";
import "../crosschain/HotShotVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TipIntent
 * @dev Implementation of cross-chain tipping using ERC-7683 and HotShot
 */
contract TipIntent is Base7683 {
    HotShotVerifier public immutable hotshot;
    IERC20 public immutable tipToken;
    
    // Tip intent specific data
    struct TipData {
        address creator;
        uint256 amount;
        address recipient;
        uint256 chainId;
    }
    
    // Mapping from intent ID to tip data
    mapping(bytes32 => TipData) public tipIntents;
    
    // Events
    event TipIntentCreated(
        bytes32 indexed intentId,
        address indexed creator,
        address indexed recipient,
        uint256 amount,
        uint256 chainId
    );
    event TipExecuted(
        bytes32 indexed intentId,
        bytes32 messageId,
        address recipient,
        uint256 amount
    );
    
    /**
     * @dev Constructor
     * @param _hotshot Address of the HotShot verifier contract
     * @param _tipToken Address of the ERC20 token used for tipping
     */
    constructor(address _hotshot, address _tipToken) {
        require(_hotshot != address(0), "Invalid HotShot address");
        require(_tipToken != address(0), "Invalid token address");
        hotshot = HotShotVerifier(_hotshot);
        tipToken = IERC20(_tipToken);
    }
    
    /**
     * @dev Creates a new tip intent
     * @param recipient Address to receive the tip
     * @param amount Amount of tokens to tip
     * @param chainId Target chain ID for the tip
     * @param deadline Timestamp after which the intent expires
     * @param preferences Additional preferences for intent execution
     * @return intentId The ID of the created intent
     */
    function createTipIntent(
        address recipient,
        uint256 amount,
        uint256 chainId,
        uint256 deadline,
        bytes calldata preferences
    ) external returns (bytes32 intentId) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(chainId != block.chainid, "Cannot tip on same chain");
        require(chainId > 0, "Invalid chain ID");
        
        // Create base intent
        intentId = createIntent(deadline, preferences);
        
        // Store tip specific data
        tipIntents[intentId] = TipData({
            creator: msg.sender,
            amount: amount,
            recipient: recipient,
            chainId: chainId
        });
        
        // Lock tokens
        require(
            tipToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        emit TipIntentCreated(
            intentId,
            msg.sender,
            recipient,
            amount,
            chainId
        );
        
        return intentId;
    }
    
    /**
     * @dev Executes a tip intent with HotShot confirmation
     * @param intentId The ID of the intent to execute
     * @param messageId The cross-chain message ID from HotShot
     */
    function executeTipIntent(
        bytes32 intentId,
        bytes32 messageId
    ) external {
        // Verify HotShot confirmation
        uint8 status = hotshot.verifyConfirmation(messageId);
        require(status == hotshot.STATUS_CONFIRMED(), "Message not confirmed");
        
        // Execute base intent
        executeIntent(intentId, messageId);
        
        // Get tip data
        TipData storage tipData = tipIntents[intentId];
        require(tipData.creator != address(0), "Tip intent does not exist");
        
        // Transfer tokens to recipient
        require(
            tipToken.transfer(tipData.recipient, tipData.amount),
            "Token transfer failed"
        );
        
        emit TipExecuted(
            intentId,
            messageId,
            tipData.recipient,
            tipData.amount
        );
    }
    
    /**
     * @dev Cancels a tip intent and refunds tokens
     * @param intentId The ID of the intent to cancel
     */
    function cancelTipIntent(bytes32 intentId) external {
        TipData storage tipData = tipIntents[intentId];
        require(tipData.creator == msg.sender, "Not tip creator");
        
        // Cancel base intent
        cancelIntent(intentId);
        
        // Refund tokens
        require(
            tipToken.transfer(msg.sender, tipData.amount),
            "Token refund failed"
        );
    }
    
    /**
     * @dev Gets tip intent data
     * @param intentId The ID of the intent
     * @return creator The creator of the tip
     * @return amount The tip amount
     * @return recipient The tip recipient
     * @return chainId The target chain ID
     */
    function getTipData(bytes32 intentId) external view returns (
        address creator,
        uint256 amount,
        address recipient,
        uint256 chainId
    ) {
        TipData storage tipData = tipIntents[intentId];
        return (
            tipData.creator,
            tipData.amount,
            tipData.recipient,
            tipData.chainId
        );
    }
} 