// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../crosschain/HotShotVerifier.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TipIntent
 * @dev Contract for creating and executing cross-chain tip intents
 */
contract TipIntent is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // Structure to store tip intent data
    struct TipData {
        address creator;      // The creator who will receive the tip
        address token;        // The token to be tipped
        uint256 amount;       // The amount to tip
        uint256 deadline;     // The deadline after which the tip is invalid
        bool isExecuted;      // Whether the tip has been executed
        uint256 timestamp;    // When the tip was created
        string message;       // Optional message from the tipper
    }
    
    // Mapping from intent ID to tip data
    mapping(bytes32 => TipData) public tipIntents;
    
    // Mapping from message ID to intent ID to track execution status
    mapping(bytes32 => bytes32) public messageToIntent;
    
    // Contract dependencies
    HotShotVerifier public immutable hotshot;
    
    // Events
    event TipIntentCreated(
        bytes32 indexed intentId,
        address indexed creator,
        address indexed token,
        uint256 amount,
        uint256 deadline,
        string message
    );
    
    event TipIntentExecuted(
        bytes32 indexed intentId,
        bytes32 indexed messageId,
        address executor
    );
    
    event TipIntentRefunded(
        bytes32 indexed intentId,
        address indexed refundRecipient
    );
    
    /**
     * @dev Constructor
     * @param _hotshot Address of the HotShot verifier contract
     */
    constructor(address _hotshot) Ownable() {
        require(_hotshot != address(0), "Invalid HotShot address");
        hotshot = HotShotVerifier(_hotshot);
    }
    
    /**
     * @dev Creates a new tip intent
     * @param creator The creator who will receive the tip
     * @param token The token to be tipped
     * @param amount The amount to tip
     * @param message Optional message from the tipper
     * @param deadline The deadline after which the tip is invalid
     * @return intentId The generated intent ID
     */
    function createTipIntent(
        address creator,
        address token,
        uint256 amount,
        string memory message,
        uint256 deadline
    ) external nonReentrant returns (bytes32 intentId) {
        require(creator != address(0), "Invalid creator address");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");
        
        // Transfer tokens from sender to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Generate unique intent ID
        intentId = keccak256(
            abi.encodePacked(
                creator,
                token,
                amount,
                deadline,
                block.timestamp,
                msg.sender
            )
        );
        
        // Store tip intent data
        tipIntents[intentId] = TipData({
            creator: creator,
            token: token,
            amount: amount,
            deadline: deadline,
            isExecuted: false,
            timestamp: block.timestamp,
            message: message
        });
        
        emit TipIntentCreated(
            intentId,
            creator,
            token,
            amount,
            deadline,
            message
        );
        
        return intentId;
    }
    
    /**
     * @dev Executes a tip intent based on a verified cross-chain message
     * @param intentId The intent ID to execute
     * @param messageId The cross-chain message ID from HotShot
     */
    function executeTipIntent(
        bytes32 intentId,
        bytes32 messageId
    ) external nonReentrant {
        require(messageId != bytes32(0), "Invalid message ID");
        require(intentId != bytes32(0), "Invalid intent ID");
        
        TipData storage tipData = tipIntents[intentId];
        require(!tipData.isExecuted, "Intent already executed");
        require(block.timestamp <= tipData.deadline, "Intent expired");
        
        // Verify that the message has been confirmed via HotShot
        uint8 confirmationStatus = hotshot.verifyConfirmation(messageId);
        require(confirmationStatus == 1, "Message not confirmed");
        require(messageToIntent[messageId] == bytes32(0), "Message already used");
        
        // Mark the intent as executed
        tipData.isExecuted = true;
        messageToIntent[messageId] = intentId;
        
        emit TipIntentExecuted(intentId, messageId, msg.sender);
        
        // Approve the solver to transfer tokens
        IERC20(tipData.token).approve(msg.sender, tipData.amount);
    }
    
    /**
     * @dev Refunds a tip intent if it has expired
     * @param intentId The intent ID to refund
     */
    function refundTipIntent(bytes32 intentId) external nonReentrant {
        TipData storage tipData = tipIntents[intentId];
        require(!tipData.isExecuted, "Intent already executed");
        require(block.timestamp > tipData.deadline, "Intent not yet expired");
        
        // Mark as executed to prevent double-refund
        tipData.isExecuted = true;
        
        // Transfer tokens back to the sender
        IERC20(tipData.token).safeTransfer(msg.sender, tipData.amount);
        
        emit TipIntentRefunded(intentId, msg.sender);
    }
    
    /**
     * @dev Gets tip data for a given intent ID
     * @param intentId The intent ID
     * @return creator The creator address
     * @return amount The tip amount
     * @return recipient The recipient address (same as creator)
     * @return chainId The chain ID where this contract is deployed
     */
    function getTipData(bytes32 intentId) external view returns (
        address creator,
        uint256 amount,
        address recipient,
        uint256 chainId
    ) {
        TipData storage tipData = tipIntents[intentId];
        require(tipData.timestamp > 0, "Intent does not exist");
        
        return (
            tipData.creator,
            tipData.amount,
            tipData.creator, // Recipient is the same as creator
            block.chainid
        );
    }
    
    /**
     * @dev Gets full tip intent data
     * @param intentId The intent ID
     * @return The complete tip intent data structure
     */
    function getTipIntent(bytes32 intentId) external view returns (TipData memory) {
        TipData storage tipData = tipIntents[intentId];
        require(tipData.timestamp > 0, "Intent does not exist");
        return tipData;
    }
} 