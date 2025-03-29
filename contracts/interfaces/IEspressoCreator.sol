// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEspressoCreator {
    struct CreatorProfile {
        string username;
        string displayName;
        string bio;
        string profileImage;
        bool isRegistered;
        uint256 registrationDate;
        uint256 totalTipsReceived;
    }

    event CreatorRegistered(
        address indexed creator,
        string username,
        string displayName
    );

    event CreatorProfileUpdated(
        address indexed creator,
        string username,
        string displayName
    );

    event TipReceived(
        address indexed creator,
        address indexed tipper,
        uint256 amount,
        string message
    );

    function createProfile(
        string calldata username,
        string calldata displayName,
        string calldata bio,
        string calldata profileImage
    ) external;

    function updateProfile(
        string calldata displayName,
        string calldata bio,
        string calldata profileImage
    ) external;

    function getProfile(address creator) external view returns (CreatorProfile memory);
    
    function isCreator(address user) external view returns (bool);
} 