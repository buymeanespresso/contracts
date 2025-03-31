// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EspressoCreatorRegistry
 * @dev Registry for managing creator profiles in the Buy Me An Espresso platform
 */
contract EspressoCreatorRegistry is Ownable {
    // Struct to hold creator profile data
    struct CreatorProfile {
        string name;
        string bio;
        string avatarUrl;
        string socialMediaLinks; // JSON string of social media links
        bool isVerified;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // Mapping from creator address to their profile
    mapping(address => CreatorProfile) public creators;
    
    // Mapping from creator address to their extension contracts
    mapping(address => address[]) public creatorExtensions;
    
    // Array of all registered creators
    address[] public allCreators;
    
    // Events
    event CreatorRegistered(address indexed creator, string name);
    event CreatorProfileUpdated(address indexed creator);
    event CreatorVerified(address indexed creator);
    event ExtensionAdded(address indexed creator, address indexed extension);
    event ExtensionRemoved(address indexed creator, address indexed extension);
    
    /**
     * @dev Constructor
     */
    constructor() Ownable() {}
    
    /**
     * @dev Register a new creator
     * @param name Creator name
     * @param bio Creator bio
     * @param avatarUrl URL to creator's avatar image
     * @param socialMediaLinks JSON string with social media links
     */
    function registerCreator(
        string memory name,
        string memory bio,
        string memory avatarUrl,
        string memory socialMediaLinks
    ) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(creators[msg.sender].createdAt == 0, "Creator already registered");
        
        creators[msg.sender] = CreatorProfile({
            name: name,
            bio: bio,
            avatarUrl: avatarUrl,
            socialMediaLinks: socialMediaLinks,
            isVerified: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        allCreators.push(msg.sender);
        emit CreatorRegistered(msg.sender, name);
    }
    
    /**
     * @dev Update creator profile
     * @param name Creator name
     * @param bio Creator bio
     * @param avatarUrl URL to creator's avatar image
     * @param socialMediaLinks JSON string with social media links
     */
    function updateProfile(
        string memory name,
        string memory bio,
        string memory avatarUrl,
        string memory socialMediaLinks
    ) external {
        require(creators[msg.sender].createdAt > 0, "Creator not registered");
        require(bytes(name).length > 0, "Name cannot be empty");
        
        CreatorProfile storage profile = creators[msg.sender];
        profile.name = name;
        profile.bio = bio;
        profile.avatarUrl = avatarUrl;
        profile.socialMediaLinks = socialMediaLinks;
        profile.updatedAt = block.timestamp;
        
        emit CreatorProfileUpdated(msg.sender);
    }
    
    /**
     * @dev Verify a creator (only callable by owner)
     * @param creator Address of the creator to verify
     */
    function verifyCreator(address creator) external onlyOwner {
        require(creators[creator].createdAt > 0, "Creator not registered");
        require(!creators[creator].isVerified, "Creator already verified");
        
        creators[creator].isVerified = true;
        emit CreatorVerified(creator);
    }
    
    /**
     * @dev Add an extension contract to a creator
     * @param extension Address of the extension contract
     */
    function addExtension(address extension) external {
        require(creators[msg.sender].createdAt > 0, "Creator not registered");
        require(extension != address(0), "Invalid extension address");
        
        // Check if extension already exists
        address[] storage extensions = creatorExtensions[msg.sender];
        for (uint i = 0; i < extensions.length; i++) {
            require(extensions[i] != extension, "Extension already added");
        }
        
        extensions.push(extension);
        emit ExtensionAdded(msg.sender, extension);
    }
    
    /**
     * @dev Remove an extension contract from a creator
     * @param extension Address of the extension contract to remove
     */
    function removeExtension(address extension) external {
        require(creators[msg.sender].createdAt > 0, "Creator not registered");
        
        address[] storage extensions = creatorExtensions[msg.sender];
        for (uint i = 0; i < extensions.length; i++) {
            if (extensions[i] == extension) {
                // Remove by swapping with the last element and popping
                extensions[i] = extensions[extensions.length - 1];
                extensions.pop();
                emit ExtensionRemoved(msg.sender, extension);
                return;
            }
        }
        
        revert("Extension not found");
    }
    
    /**
     * @dev Get creator profile
     * @param creator Address of the creator
     * @return CreatorProfile struct with creator information
     */
    function getCreatorProfile(address creator) external view returns (CreatorProfile memory) {
        require(creators[creator].createdAt > 0, "Creator not registered");
        return creators[creator];
    }
    
    /**
     * @dev Get creator extensions
     * @param creator Address of the creator
     * @return Array of extension contract addresses
     */
    function getCreatorExtensions(address creator) external view returns (address[] memory) {
        return creatorExtensions[creator];
    }
    
    /**
     * @dev Get total number of registered creators
     * @return Total number of creators
     */
    function getCreatorCount() external view returns (uint256) {
        return allCreators.length;
    }
    
    /**
     * @dev Get paginated list of creators
     * @param offset Starting index
     * @param limit Maximum number of creators to return
     * @return Array of creator addresses
     */
    function getPaginatedCreators(uint256 offset, uint256 limit) external view returns (address[] memory) {
        require(offset < allCreators.length, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > allCreators.length) {
            end = allCreators.length;
        }
        
        uint256 resultCount = end - offset;
        address[] memory result = new address[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = allCreators[offset + i];
        }
        
        return result;
    }
} 