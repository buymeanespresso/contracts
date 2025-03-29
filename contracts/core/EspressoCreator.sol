// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IEspressoCreator.sol";

contract EspressoCreator is IEspressoCreator, Ownable, ReentrancyGuard {
    // Mappings
    mapping(address => CreatorProfile) private _profiles;
    mapping(string => address) private _usernameToAddress;
    
    // Username validation
    uint256 private constant MIN_USERNAME_LENGTH = 3;
    uint256 private constant MAX_USERNAME_LENGTH = 30;
    
    constructor() {
        _transferOwnership(msg.sender);
    }
    
    // Modifiers
    modifier validUsername(string calldata username) {
        bytes memory usernameBytes = bytes(username);
        require(
            usernameBytes.length >= MIN_USERNAME_LENGTH && 
            usernameBytes.length <= MAX_USERNAME_LENGTH,
            "Username length invalid"
        );
        require(
            _usernameToAddress[username] == address(0) || 
            _usernameToAddress[username] == msg.sender,
            "Username taken"
        );
        _;
    }
    
    modifier onlyCreator() {
        require(_profiles[msg.sender].isRegistered, "Not a registered creator");
        _;
    }
    
    // External functions
    function createProfile(
        string calldata username,
        string calldata displayName,
        string calldata bio,
        string calldata profileImage
    ) external override validUsername(username) {
        require(!_profiles[msg.sender].isRegistered, "Already registered");
        
        _profiles[msg.sender] = CreatorProfile({
            username: username,
            displayName: displayName,
            bio: bio,
            profileImage: profileImage,
            isRegistered: true,
            registrationDate: block.timestamp,
            totalTipsReceived: 0
        });
        
        _usernameToAddress[username] = msg.sender;
        
        emit CreatorRegistered(msg.sender, username, displayName);
    }
    
    function updateProfile(
        string calldata displayName,
        string calldata bio,
        string calldata profileImage
    ) external override onlyCreator {
        CreatorProfile storage profile = _profiles[msg.sender];
        
        profile.displayName = displayName;
        profile.bio = bio;
        profile.profileImage = profileImage;
        
        emit CreatorProfileUpdated(
            msg.sender,
            profile.username,
            displayName
        );
    }
    
    // View functions
    function getProfile(address creator) 
        external 
        view 
        override 
        returns (CreatorProfile memory) 
    {
        return _profiles[creator];
    }
    
    function isCreator(address user) 
        external 
        view 
        override 
        returns (bool) 
    {
        return _profiles[user].isRegistered;
    }
    
    // Internal functions
    function _incrementTotalTips(address creator, uint256 amount) internal {
        _profiles[creator].totalTipsReceived += amount;
    }
} 