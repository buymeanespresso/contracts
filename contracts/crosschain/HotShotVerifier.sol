// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HotShotVerifier
 * @dev Contract for verifying cross-chain confirmations using Espresso's HotShot protocol
 */
interface IHotShotLightClient {
    function isConfirmed(bytes32 messageId) external view returns (bool);
    function getConfirmationStatus(bytes32 messageId) external view returns (uint8);
}

contract HotShotVerifier {
    IHotShotLightClient public immutable hotshot;
    
    // Status codes for message confirmations
    uint8 public constant STATUS_PENDING = 0;
    uint8 public constant STATUS_CONFIRMED = 1;
    uint8 public constant STATUS_REJECTED = 2;
    
    // Events
    event MessageConfirmed(bytes32 indexed messageId);
    event MessageRejected(bytes32 indexed messageId);
    
    /**
     * @dev Constructor to set the HotShot light client address
     * @param _hotshot Address of the HotShot light client contract
     */
    constructor(address _hotshot) {
        require(_hotshot != address(0), "Invalid HotShot client address");
        hotshot = IHotShotLightClient(_hotshot);
    }
    
    /**
     * @dev Verify a cross-chain message confirmation
     * @param messageId The ID of the message to verify
     * @return status The confirmation status of the message
     */
    function verifyConfirmation(bytes32 messageId) external view returns (uint8) {
        try hotshot.isConfirmed(messageId) returns (bool confirmed) {
            if (confirmed) {
                return STATUS_CONFIRMED;
            }
        } catch {
            // If isConfirmed call fails, try getConfirmationStatus
        }
        
        try hotshot.getConfirmationStatus(messageId) returns (uint8 status) {
            return status;
        } catch {
            // If both calls fail, return PENDING by default for safety
            return STATUS_PENDING;
        }
    }
    
    /**
     * @dev Verify multiple cross-chain message confirmations
     * @param messageIds Array of message IDs to verify
     * @return statuses Array of confirmation statuses
     */
    function verifyConfirmationBatch(bytes32[] calldata messageIds) 
        external 
        view 
        returns (uint8[] memory statuses) 
    {
        statuses = new uint8[](messageIds.length);
        for (uint256 i = 0; i < messageIds.length; i++) {
            statuses[i] = this.verifyConfirmation(messageIds[i]);
        }
        return statuses;
    }
    
    /**
     * @dev Generate a deterministic message ID from intent parameters
     * @param sender The address that initiated the cross-chain transaction
     * @param recipient The address that will receive the funds
     * @param token The token address being transferred
     * @param amount The amount of tokens being transferred
     * @param nonce A unique nonce to prevent replay attacks
     * @return The generated message ID
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
} 