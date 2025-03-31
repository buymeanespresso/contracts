// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../crosschain/IHotShotLightClient.sol";

/**
 * @title MockHotShotLightClient
 * @dev Mock implementation of the HotShot light client for testing
 */
contract MockHotShotLightClient is IHotShotLightClient {
    // Status codes for message confirmations
    uint8 public constant STATUS_PENDING = 0;
    uint8 public constant STATUS_CONFIRMED = 1;
    uint8 public constant STATUS_REJECTED = 2;
    
    // Mapping to track confirmation status for messages
    mapping(bytes32 => uint8) private confirmationStatus;
    
    // Events
    event MessageStatusSet(bytes32 indexed messageId, uint8 status);
    
    /**
     * @dev Sets the confirmation status for a message
     * @param messageId The ID of the message
     * @param status The status to set (0: PENDING, 1: CONFIRMED, 2: REJECTED)
     */
    function setConfirmationStatus(bytes32 messageId, uint8 status) external {
        require(status <= STATUS_REJECTED, "Invalid status code");
        confirmationStatus[messageId] = status;
        emit MessageStatusSet(messageId, status);
    }
    
    /**
     * @dev Marks a message as confirmed
     * @param messageId The ID of the message to confirm
     */
    function confirmMessage(bytes32 messageId) external {
        confirmationStatus[messageId] = STATUS_CONFIRMED;
        emit MessageStatusSet(messageId, STATUS_CONFIRMED);
    }
    
    /**
     * @dev Marks a message as rejected
     * @param messageId The ID of the message to reject
     */
    function rejectMessage(bytes32 messageId) external {
        confirmationStatus[messageId] = STATUS_REJECTED;
        emit MessageStatusSet(messageId, STATUS_REJECTED);
    }
    
    /**
     * @dev Checks if a message is confirmed
     * @param messageId The ID of the message to check
     * @return True if the message is confirmed, false otherwise
     */
    function isConfirmed(bytes32 messageId) external view override returns (bool) {
        return confirmationStatus[messageId] == STATUS_CONFIRMED;
    }
    
    /**
     * @dev Gets the confirmation status of a message
     * @param messageId The ID of the message to check
     * @return The confirmation status (0: PENDING, 1: CONFIRMED, 2: REJECTED)
     */
    function getConfirmationStatus(bytes32 messageId) external view override returns (uint8) {
        return confirmationStatus[messageId];
    }
} 