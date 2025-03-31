// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Base7683
 * @dev Implementation of ERC-7683 Cross Chain Intents Standard
 */
abstract contract Base7683 is ReentrancyGuard {
    using ECDSA for bytes32;

    // Intent status
    enum IntentStatus {
        PENDING,
        EXECUTED,
        CANCELLED,
        EXPIRED
    }

    // Intent structure
    struct Intent {
        address creator;
        uint256 deadline;
        bytes preferences;
        IntentStatus status;
        bytes32 messageId;
    }

    // Mapping from intent ID to Intent
    mapping(bytes32 => Intent) public intents;
    
    // Events
    event IntentCreated(
        bytes32 indexed intentId,
        address indexed creator,
        uint256 deadline,
        bytes preferences
    );
    event IntentExecuted(bytes32 indexed intentId, bytes32 messageId);
    event IntentCancelled(bytes32 indexed intentId);
    event IntentExpired(bytes32 indexed intentId);

    /**
     * @dev Creates a new intent
     * @param deadline Timestamp after which the intent expires
     * @param preferences Additional preferences for intent execution
     * @return intentId The ID of the created intent
     */
    function createIntent(
        uint256 deadline,
        bytes memory preferences
    ) public virtual nonReentrant returns (bytes32 intentId) {
        require(deadline > block.timestamp, "Intent deadline must be in future");
        
        intentId = keccak256(
            abi.encodePacked(
                msg.sender,
                deadline,
                preferences,
                block.timestamp
            )
        );

        require(intents[intentId].creator == address(0), "Intent already exists");

        intents[intentId] = Intent({
            creator: msg.sender,
            deadline: deadline,
            preferences: preferences,
            status: IntentStatus.PENDING,
            messageId: bytes32(0)
        });

        emit IntentCreated(intentId, msg.sender, deadline, preferences);
        return intentId;
    }

    /**
     * @dev Executes an intent
     * @param intentId The ID of the intent to execute
     * @param messageId The cross-chain message ID associated with execution
     */
    function executeIntent(
        bytes32 intentId,
        bytes32 messageId
    ) public virtual nonReentrant {
        Intent storage intent = intents[intentId];
        require(intent.creator != address(0), "Intent does not exist");
        require(intent.status == IntentStatus.PENDING, "Intent not pending");
        require(block.timestamp <= intent.deadline, "Intent expired");

        intent.status = IntentStatus.EXECUTED;
        intent.messageId = messageId;

        emit IntentExecuted(intentId, messageId);
    }

    /**
     * @dev Cancels an intent
     * @param intentId The ID of the intent to cancel
     */
    function cancelIntent(bytes32 intentId) public virtual nonReentrant {
        Intent storage intent = intents[intentId];
        require(intent.creator == msg.sender, "Not intent creator");
        require(intent.status == IntentStatus.PENDING, "Intent not pending");

        intent.status = IntentStatus.CANCELLED;
        emit IntentCancelled(intentId);
    }

    /**
     * @dev Marks an intent as expired
     * @param intentId The ID of the intent to expire
     */
    function expireIntent(bytes32 intentId) public virtual nonReentrant {
        Intent storage intent = intents[intentId];
        require(intent.creator != address(0), "Intent does not exist");
        require(intent.status == IntentStatus.PENDING, "Intent not pending");
        require(block.timestamp > intent.deadline, "Intent not expired");

        intent.status = IntentStatus.EXPIRED;
        emit IntentExpired(intentId);
    }

    /**
     * @dev Gets the status of an intent
     * @param intentId The ID of the intent
     * @return status The current status of the intent
     */
    function getIntentStatus(bytes32 intentId) external view virtual returns (IntentStatus) {
        return intents[intentId].status;
    }
} 