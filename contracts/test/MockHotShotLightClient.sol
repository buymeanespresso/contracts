// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../crosschain/HotShotVerifier.sol";

contract MockHotShotLightClient is IHotShotLightClient {
    mapping(bytes32 => uint8) public confirmations;

    function setConfirmation(bytes32 messageId, uint8 status) external {
        confirmations[messageId] = status;
    }

    function isConfirmed(bytes32 messageId) external view override returns (bool) {
        return confirmations[messageId] == 1;
    }

    function getConfirmationStatus(bytes32 messageId) external view override returns (uint8) {
        return confirmations[messageId];
    }
} 