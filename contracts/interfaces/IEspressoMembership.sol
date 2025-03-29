// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEspressoMembership {
    struct MembershipTier {
        string name;
        string description;
        uint256 price;
        uint256 duration; // Duration in seconds
        bool isActive;
        string[] benefits;
    }

    event TierCreated(
        address indexed creator,
        uint256 indexed tierId,
        string name,
        uint256 price
    );

    event TierUpdated(
        address indexed creator,
        uint256 indexed tierId,
        string name,
        uint256 price
    );

    event MembershipPurchased(
        address indexed member,
        address indexed creator,
        uint256 indexed tierId,
        uint256 expiryDate
    );

    event MembershipCancelled(
        address indexed member,
        address indexed creator,
        uint256 indexed tierId
    );

    function createTier(
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 duration,
        string[] calldata benefits
    ) external returns (uint256 tierId);

    function updateTier(
        uint256 tierId,
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 duration,
        string[] calldata benefits
    ) external;

    function purchaseMembership(
        address creator,
        uint256 tierId
    ) external payable;

    function cancelMembership(
        address creator,
        uint256 tierId
    ) external;

    function getTier(
        address creator,
        uint256 tierId
    ) external view returns (MembershipTier memory);

    function getMembershipStatus(
        address member,
        address creator,
        uint256 tierId
    ) external view returns (bool isActive, uint256 expiryDate);

    function getCreatorTiers(
        address creator
    ) external view returns (uint256[] memory tierIds);
} 