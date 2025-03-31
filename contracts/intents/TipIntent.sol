// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Base7683.sol";
import "../crosschain/HotShotVerifier.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TipIntent
 * @dev Implementation of cross-chain tipping using ERC-7683 and HotShot
 */
contract TipIntent is Base7683 {
    using SafeERC20 for IERC20;
    
    HotShotVerifier public immutable hotshot;
    
    // Tip intent specific data
    struct TipData {
        address creator;
        address tipper;
        address token;
        uint256 amount;
        string message;
        uint256 chainId;
    }
    
    // Mapping from intent ID to tip data
    mapping(bytes32 => TipData) public tipIntents;
    
    // Events
    event TipIntentCreated(
        bytes32 indexed intentId,
        address indexed creator,
        address indexed tipper,
        address token,
        uint256 amount,
        string message,
        uint256 chainId
    );
    event TipExecuted(
        bytes32 indexed intentId,
        bytes32 messageId,
        address recipient,
        address token,
        uint256 amount
    );
    
    /**
     * @dev Constructor
     * @param _hotshot Address of the HotShot verifier contract
     */
    constructor(address _hotshot) {
        require(_hotshot != address(0), "Invalid HotShot address");
        hotshot = HotShotVerifier(_hotshot);
    }
    
    /**
     * @dev Creates a new tip intent
     * @param creator Address to receive the tip
     * @param token Address of the token to tip
     * @param amount Amount of tokens to tip
     * @param message Optional message with the tip
     * @param deadline Timestamp after which the intent expires
     * @return intentId The ID of the created intent
     */
    function createTipIntent(
        address creator,
        address token,
        uint256 amount,
        string memory message,
        uint256 deadline
    ) external returns (bytes32 intentId) {
        require(creator != address(0), "Invalid creator");
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be greater than 0");
        
        // Create base intent with empty preferences - convert to bytes
        bytes memory emptyPreferences = new bytes(0);
        intentId = createIntent(deadline, emptyPreferences);
        
        // Store tip specific data
        tipIntents[intentId] = TipData({
            creator: creator,
            tipper: msg.sender,
            token: token,
            amount: amount,
            message: message,
            chainId: block.chainid
        });
        
        // Lock tokens
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        emit TipIntentCreated(
            intentId,
            creator,
            msg.sender,
            token,
            amount,
            message,
            block.chainid
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
        require(tipData.tipper != address(0), "Tip intent does not exist");
        
        // If called directly (not by solver), transfer to creator directly
        // Otherwise, let the solver handle distribution (including fees)
        if (msg.sender == tipData.creator || msg.sender == tipData.tipper) {
            IERC20(tipData.token).safeTransfer(tipData.creator, tipData.amount);
        } else {
            // Approve the solver (msg.sender) to transfer the tokens
            IERC20(tipData.token).safeApprove(msg.sender, tipData.amount);
        }
        
        emit TipExecuted(
            intentId,
            messageId,
            tipData.creator,
            tipData.token,
            tipData.amount
        );
    }
    
    /**
     * @dev Cancels a tip intent and refunds tokens
     * @param intentId The ID of the intent to cancel
     */
    function cancelTipIntent(bytes32 intentId) external {
        TipData storage tipData = tipIntents[intentId];
        require(tipData.tipper == msg.sender, "Not tip creator");
        
        // Cancel base intent
        cancelIntent(intentId);
        
        // Refund tokens
        IERC20(tipData.token).safeTransfer(msg.sender, tipData.amount);
    }
    
    /**
     * @dev Gets tip intent data
     * @param intentId The ID of the intent
     * @return A TipData struct containing all tip details
     */
    function getTipIntent(bytes32 intentId) external view returns (
        TipData memory
    ) {
        return tipIntents[intentId];
    }
    
    /**
     * @dev Gets tip data for solver
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
            tipData.creator, // Recipient is the creator
            tipData.chainId
        );
    }
} 