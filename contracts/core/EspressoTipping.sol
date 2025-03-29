// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../interfaces/IEspressoTipping.sol";
import "../interfaces/IEspressoCreator.sol";
import "../interfaces/IAICreatorExtension.sol";

contract EspressoTipping is IEspressoTipping, Ownable, ReentrancyGuard {
    using Address for address payable;

    // State variables
    IEspressoCreator private immutable _creatorContract;
    IAICreatorExtension private immutable _aiExtension;
    
    // Mappings
    mapping(address => uint256) private _tipsBalance;
    mapping(address => uint256) private _totalTipsReceived;
    
    // Events
    event TipSplitProcessed(
        address indexed agent,
        address indexed developer,
        address indexed operator,
        uint256 developerAmount,
        uint256 operatorAmount
    );
    
    uint256 private constant PERCENTAGE_BASE = 10000; // 100.00%
    uint256 private constant MAX_FEE_PERCENTAGE = 2000; // 20.00%

    uint256 private _developerFeePercentage;
    uint256 private _operatorFeePercentage;

    constructor(
        address creatorContract,
        address aiExtensionContract,
        uint256 developerFeePercentage,
        uint256 operatorFeePercentage
    ) {
        _transferOwnership(msg.sender);
        require(creatorContract != address(0), "Invalid creator contract");
        require(aiExtensionContract != address(0), "Invalid AI extension contract");
        require(developerFeePercentage <= MAX_FEE_PERCENTAGE, "Developer fee too high");
        require(operatorFeePercentage <= MAX_FEE_PERCENTAGE, "Operator fee too high");
        require(developerFeePercentage + operatorFeePercentage <= MAX_FEE_PERCENTAGE, "Total fee too high");

        _creatorContract = IEspressoCreator(creatorContract);
        _aiExtension = IAICreatorExtension(aiExtensionContract);
        _developerFeePercentage = developerFeePercentage;
        _operatorFeePercentage = operatorFeePercentage;
    }
    
    function getDeveloperFeePercentage() external view returns (uint256) {
        return _developerFeePercentage;
    }

    function getOperatorFeePercentage() external view returns (uint256) {
        return _operatorFeePercentage;
    }
    
    // External functions
    function tipCreator(
        address creator,
        string calldata message
    ) external payable override nonReentrant {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(_creatorContract.isCreator(creator), "Invalid creator address");
        
        _tipsBalance[creator] += msg.value;
        _totalTipsReceived[creator] += msg.value;
        
        emit TipSent(msg.sender, creator, msg.value, message);
    }
    
    function tipAgent(
        address agent,
        string calldata message
    ) external payable override nonReentrant {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(_creatorContract.isCreator(agent), "Invalid creator address");
        require(_aiExtension.isAgent(agent), "Address is not an agent");
        
        // Get agent info
        IAICreatorExtension.AgentInfo memory agentInfo = _aiExtension.getAgentInfo(agent);
        
        // Calculate revenue split
        uint256 developerAmount = (msg.value * agentInfo.revenueSplitDeveloper) / 10000;
        uint256 operatorAmount = msg.value - developerAmount;
        
        // Update balances
        if (developerAmount > 0) {
            _tipsBalance[agentInfo.developer] += developerAmount;
            _totalTipsReceived[agentInfo.developer] += developerAmount;
        }
        
        if (operatorAmount > 0) {
            _tipsBalance[agentInfo.operator] += operatorAmount;
            _totalTipsReceived[agentInfo.operator] += operatorAmount;
        }
        
        emit TipSent(msg.sender, agent, msg.value, message);
        emit TipSplitProcessed(
            agent,
            agentInfo.developer,
            agentInfo.operator,
            developerAmount,
            operatorAmount
        );
    }
    
    function withdrawTips() external override nonReentrant {
        uint256 amount = _tipsBalance[msg.sender];
        require(amount > 0, "No tips to withdraw");
        
        _tipsBalance[msg.sender] = 0;
        
        payable(msg.sender).sendValue(amount);
        
        emit TipWithdrawn(msg.sender, amount);
    }
    
    // View functions
    function getTipsBalance(address creator) 
        external 
        view 
        override 
        returns (uint256) 
    {
        return _tipsBalance[creator];
    }
    
    function getCreatorTotalTips(address creator) 
        external 
        view 
        override 
        returns (uint256) 
    {
        return _totalTipsReceived[creator];
    }
} 