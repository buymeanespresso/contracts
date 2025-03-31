// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HotShotVerifier
 * @dev Interface for verifying messages through the HotShot verification system
 */
interface HotShotVerifier {
    /**
     * @dev Message confirmation status codes
     * 0: PENDING - Message is not yet confirmed
     * 1: CONFIRMED - Message is confirmed
     * 2: REJECTED - Message is rejected
     */
    
    /**
     * @dev Event emitted when a message is confirmed
     * @param messageId The ID of the confirmed message
     */
    event MessageConfirmed(bytes32 indexed messageId);
    
    /**
     * @dev Event emitted when a message is rejected
     * @param messageId The ID of the rejected message
     * @param reason The reason for rejection
     */
    event MessageRejected(bytes32 indexed messageId, string reason);
    
    /**
     * @dev Generates a message ID from the given message data
     * @param data The raw message data
     * @return messageId The generated message ID
     */
    function generateMessageId(bytes calldata data) external pure returns (bytes32 messageId);
    
    /**
     * @dev Verifies the confirmation status of a message
     * @param messageId The ID of the message to verify
     * @return status The confirmation status (0: PENDING, 1: CONFIRMED, 2: REJECTED)
     */
    function verifyConfirmation(bytes32 messageId) external view returns (uint8 status);
    
    /**
     * @dev Confirms a message (typically called by an authorized verifier)
     * @param messageId The ID of the message to confirm
     */
    function confirmMessage(bytes32 messageId) external;
    
    /**
     * @dev Rejects a message (typically called by an authorized verifier)
     * @param messageId The ID of the message to reject
     * @param reason The reason for rejection
     */
    function rejectMessage(bytes32 messageId, string calldata reason) external;
} 