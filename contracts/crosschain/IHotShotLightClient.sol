// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IHotShotLightClient
 * @dev Interface for the HotShot light client used in the Espresso Network
 */
interface IHotShotLightClient {
    /**
     * @dev Checks if a message is confirmed
     * @param messageId The ID of the message to check
     * @return True if the message is confirmed, false otherwise
     */
    function isConfirmed(bytes32 messageId) external view returns (bool);
    
    /**
     * @dev Gets the confirmation status of a message
     * @param messageId The ID of the message to check
     * @return The confirmation status (0: PENDING, 1: CONFIRMED, 2: REJECTED)
     */
    function getConfirmationStatus(bytes32 messageId) external view returns (uint8);
} 