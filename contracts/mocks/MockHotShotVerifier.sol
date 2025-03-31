// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockHotShotVerifier
 * @dev A mock implementation of the HotShot verifier for testing purposes
 */
contract MockHotShotVerifier {
    // Map of messageId to confirmation status: 0 = PENDING, 1 = CONFIRMED, 2 = REJECTED
    mapping(bytes32 => uint8) public confirmations;
    
    // Events
    event MessageConfirmed(bytes32 indexed messageId);
    event MessageRejected(bytes32 indexed messageId);
    
    /**
     * @dev Generates a deterministic message ID based on input parameters
     * @param sender The sender's address
     * @param recipient The recipient's address
     * @param token The token address
     * @param amount The amount of tokens
     * @param nonce The transaction nonce (to ensure uniqueness)
     * @return bytes32 The generated message ID
     */
    function generateMessageId(
        address sender,
        address recipient,
        address token,
        uint256 amount,
        uint256 nonce
    ) external pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                sender,
                recipient,
                token,
                amount,
                nonce
            )
        );
    }
    
    /**
     * @dev Confirms a message (only for testing purposes)
     * @param messageId The ID of the message to confirm
     */
    function confirmMessage(bytes32 messageId) external {
        confirmations[messageId] = 1; // CONFIRMED
        emit MessageConfirmed(messageId);
    }
    
    /**
     * @dev Rejects a message (only for testing purposes)
     * @param messageId The ID of the message to reject
     */
    function rejectMessage(bytes32 messageId) external {
        confirmations[messageId] = 2; // REJECTED
        emit MessageRejected(messageId);
    }
    
    /**
     * @dev Checks the confirmation status of a message
     * @param messageId The ID of the message to check
     * @return uint8 The confirmation status (0=PENDING, 1=CONFIRMED, 2=REJECTED)
     */
    function verifyConfirmation(bytes32 messageId) external view returns (uint8) {
        return confirmations[messageId];
    }
} 