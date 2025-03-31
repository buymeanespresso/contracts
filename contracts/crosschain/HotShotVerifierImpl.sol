// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./HotShotVerifier.sol";
import "./IHotShotLightClient.sol";

/**
 * @title HotShotVerifierImpl
 * @dev Implementation of the HotShotVerifier interface using the HotShot light client
 */
contract HotShotVerifierImpl is HotShotVerifier {
    // Status codes for message confirmations
    uint8 private constant STATUS_PENDING = 0;
    uint8 private constant STATUS_CONFIRMED = 1;
    uint8 private constant STATUS_REJECTED = 2;
    
    // Contract dependencies
    IHotShotLightClient public immutable hotshot;
    
    // Access control
    address public owner;
    mapping(address => bool) public authorizedVerifiers;
    
    /**
     * @dev Constructor to set the HotShot light client address
     * @param _hotshot Address of the HotShot light client contract
     */
    constructor(address _hotshot) {
        require(_hotshot != address(0), "Invalid HotShot client address");
        hotshot = IHotShotLightClient(_hotshot);
        owner = msg.sender;
    }
    
    /**
     * @dev Modifier to restrict access to authorized verifiers or owner
     */
    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedVerifiers[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    /**
     * @dev Adds a verifier to the authorized list
     * @param verifier Address of the verifier to authorize
     */
    function addVerifier(address verifier) external {
        require(msg.sender == owner, "Only owner can add verifiers");
        require(verifier != address(0), "Invalid verifier address");
        authorizedVerifiers[verifier] = true;
    }
    
    /**
     * @dev Removes a verifier from the authorized list
     * @param verifier Address of the verifier to remove
     */
    function removeVerifier(address verifier) external {
        require(msg.sender == owner, "Only owner can remove verifiers");
        authorizedVerifiers[verifier] = false;
    }
    
    /**
     * @dev Transfers ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner can transfer ownership");
        require(newOwner != address(0), "Invalid owner address");
        owner = newOwner;
    }
    
    /**
     * @dev Generates a message ID from the given message data
     * @param data The raw message data
     * @return messageId The generated message ID
     */
    function generateMessageId(bytes calldata data) external pure override returns (bytes32 messageId) {
        return keccak256(data);
    }
    
    /**
     * @dev Verifies the confirmation status of a message
     * @param messageId The ID of the message to verify
     * @return status The confirmation status (0: PENDING, 1: CONFIRMED, 2: REJECTED)
     */
    function verifyConfirmation(bytes32 messageId) external view override returns (uint8 status) {
        try hotshot.isConfirmed(messageId) returns (bool confirmed) {
            if (confirmed) {
                return STATUS_CONFIRMED;
            }
        } catch {
            // If isConfirmed call fails, try getConfirmationStatus
        }
        
        try hotshot.getConfirmationStatus(messageId) returns (uint8 lightClientStatus) {
            return lightClientStatus;
        } catch {
            // If both calls fail, return PENDING by default for safety
            return STATUS_PENDING;
        }
    }
    
    /**
     * @dev Confirms a message (only callable by authorized verifiers)
     * @param messageId The ID of the message to confirm
     */
    function confirmMessage(bytes32 messageId) external override onlyAuthorized {
        // Only allow if not already rejected
        require(
            hotshot.getConfirmationStatus(messageId) != STATUS_REJECTED,
            "Cannot confirm rejected message"
        );
        
        // Use a low-level call to handle cases where the light client implementation
        // might not have this exact function signature
        (bool success, ) = address(hotshot).call(
            abi.encodeWithSignature("confirmMessage(bytes32)", messageId)
        );
        
        // Fallback to setting status if direct method is not available
        if (!success) {
            (success, ) = address(hotshot).call(
                abi.encodeWithSignature("setConfirmationStatus(bytes32,uint8)", messageId, STATUS_CONFIRMED)
            );
        }
        
        // Verify the status was updated correctly
        require(
            hotshot.getConfirmationStatus(messageId) == STATUS_CONFIRMED,
            "Failed to confirm message"
        );
        
        emit MessageConfirmed(messageId);
    }
    
    /**
     * @dev Rejects a message (only callable by authorized verifiers)
     * @param messageId The ID of the message to reject
     * @param reason The reason for rejection
     */
    function rejectMessage(bytes32 messageId, string calldata reason) external override onlyAuthorized {
        // Only allow if not already confirmed
        require(
            hotshot.getConfirmationStatus(messageId) != STATUS_CONFIRMED,
            "Cannot reject confirmed message"
        );
        
        // Use a low-level call to handle cases where the light client implementation
        // might not have this exact function signature
        (bool success, ) = address(hotshot).call(
            abi.encodeWithSignature("rejectMessage(bytes32)", messageId)
        );
        
        // Fallback to setting status if direct method is not available
        if (!success) {
            (success, ) = address(hotshot).call(
                abi.encodeWithSignature("setConfirmationStatus(bytes32,uint8)", messageId, STATUS_REJECTED)
            );
        }
        
        // Verify the status was updated correctly
        require(
            hotshot.getConfirmationStatus(messageId) == STATUS_REJECTED,
            "Failed to reject message"
        );
        
        emit MessageRejected(messageId, reason);
    }
} 