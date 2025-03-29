// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/IEspressoMembership.sol";
import "../interfaces/IEspressoCreator.sol";

contract EspressoMembership is IEspressoMembership, Ownable, ReentrancyGuard {
    using Address for address payable;
    using Counters for Counters.Counter;

    // State variables
    IEspressoCreator private immutable _creatorContract;
    Counters.Counter private _tierIdCounter;
    
    // Mappings
    mapping(address => mapping(uint256 => MembershipTier)) private _creatorTiers;
    mapping(address => uint256[]) private _creatorTierIds;
    mapping(address => mapping(address => mapping(uint256 => uint256))) private _membershipExpiry; // member => creator => tierId => expiry
    
    constructor(address creatorContract) {
        _transferOwnership(msg.sender);
        require(creatorContract != address(0), "Invalid creator contract");
        _creatorContract = IEspressoCreator(creatorContract);
    }
    
    // Modifiers
    modifier onlyCreator() {
        require(_creatorContract.isCreator(msg.sender), "Not a registered creator");
        _;
    }
    
    modifier validTier(address creator, uint256 tierId) {
        require(_creatorTiers[creator][tierId].isActive, "Tier does not exist or is inactive");
        _;
    }
    
    // External functions
    function createTier(
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 duration,
        string[] calldata benefits
    ) external override onlyCreator returns (uint256 tierId) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(duration > 0, "Duration must be greater than 0");
        
        tierId = _tierIdCounter.current();
        _tierIdCounter.increment();
        
        _creatorTiers[msg.sender][tierId] = MembershipTier({
            name: name,
            description: description,
            price: price,
            duration: duration,
            isActive: true,
            benefits: benefits
        });
        
        _creatorTierIds[msg.sender].push(tierId);
        
        emit TierCreated(msg.sender, tierId, name, price);
        
        return tierId;
    }
    
    function updateTier(
        uint256 tierId,
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 duration,
        string[] calldata benefits
    ) external override onlyCreator validTier(msg.sender, tierId) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(duration > 0, "Duration must be greater than 0");
        
        MembershipTier storage tier = _creatorTiers[msg.sender][tierId];
        
        tier.name = name;
        tier.description = description;
        tier.price = price;
        tier.duration = duration;
        tier.benefits = benefits;
        
        emit TierUpdated(msg.sender, tierId, name, price);
    }
    
    function purchaseMembership(
        address creator,
        uint256 tierId
    ) external payable override nonReentrant validTier(creator, tierId) {
        MembershipTier storage tier = _creatorTiers[creator][tierId];
        require(msg.value >= tier.price, "Insufficient payment");
        
        uint256 currentExpiry = _membershipExpiry[msg.sender][creator][tierId];
        uint256 newExpiry;
        
        if (currentExpiry > block.timestamp) {
            // Extend existing membership
            newExpiry = currentExpiry + tier.duration;
        } else {
            // New membership
            newExpiry = block.timestamp + tier.duration;
        }
        
        _membershipExpiry[msg.sender][creator][tierId] = newExpiry;
        
        // Transfer payment to creator
        payable(creator).sendValue(msg.value);
        
        emit MembershipPurchased(msg.sender, creator, tierId, newExpiry);
    }
    
    function cancelMembership(
        address creator,
        uint256 tierId
    ) external override validTier(creator, tierId) {
        require(
            _membershipExpiry[msg.sender][creator][tierId] > block.timestamp,
            "No active membership"
        );
        
        _membershipExpiry[msg.sender][creator][tierId] = block.timestamp;
        
        emit MembershipCancelled(msg.sender, creator, tierId);
    }
    
    // View functions
    function getTier(
        address creator,
        uint256 tierId
    ) external view override returns (MembershipTier memory) {
        return _creatorTiers[creator][tierId];
    }
    
    function getMembershipStatus(
        address member,
        address creator,
        uint256 tierId
    ) external view override returns (bool isActive, uint256 expiryDate) {
        expiryDate = _membershipExpiry[member][creator][tierId];
        isActive = expiryDate > block.timestamp;
        return (isActive, expiryDate);
    }
    
    function getCreatorTiers(
        address creator
    ) external view override returns (uint256[] memory) {
        return _creatorTierIds[creator];
    }
} 