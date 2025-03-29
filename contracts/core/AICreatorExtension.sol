// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IAICreatorExtension.sol";
import "../interfaces/IEspressoCreator.sol";

contract AICreatorExtension is IAICreatorExtension, Ownable {
    // State variables
    IEspressoCreator private immutable _creatorContract;
    
    // Mapping creator address => agent info
    mapping(address => AgentInfo) private _agentInfo;
    
    constructor(address creatorContract) {
        _transferOwnership(msg.sender);
        require(creatorContract != address(0), "Invalid creator contract");
        _creatorContract = IEspressoCreator(creatorContract);
    }
    
    // Modifiers
    modifier onlyRegisteredCreator() {
        require(_creatorContract.isCreator(msg.sender), "Not a registered creator");
        _;
    }
    
    // External functions
    function registerAsAgent(
        AgentType agentType,
        address developer,
        address operator,
        uint256 revenueSplitDeveloper,
        string calldata trainingInfo,
        string calldata capabilities
    ) external override onlyRegisteredCreator {
        require(agentType != AgentType.NotAgent, "Invalid agent type");
        require(developer != address(0), "Developer address cannot be zero");
        require(operator != address(0), "Operator address cannot be zero");
        require(revenueSplitDeveloper <= 10000, "Revenue split cannot exceed 100%");
        
        _agentInfo[msg.sender] = AgentInfo({
            agentType: agentType,
            developer: developer,
            operator: operator,
            revenueSplitDeveloper: revenueSplitDeveloper,
            trainingInfo: trainingInfo,
            capabilities: capabilities,
            verified: false
        });
        
        emit AgentRegistered(msg.sender, agentType, developer, operator);
    }
    
    function updateAgentInfo(
        AgentType agentType,
        address developer,
        address operator,
        uint256 revenueSplitDeveloper,
        string calldata trainingInfo,
        string calldata capabilities
    ) external override onlyRegisteredCreator {
        require(_agentInfo[msg.sender].agentType != AgentType.NotAgent, "Not registered as an agent");
        require(agentType != AgentType.NotAgent, "Invalid agent type");
        require(developer != address(0), "Developer address cannot be zero");
        require(operator != address(0), "Operator address cannot be zero");
        require(revenueSplitDeveloper <= 10000, "Revenue split cannot exceed 100%");
        
        AgentInfo storage agent = _agentInfo[msg.sender];
        
        agent.agentType = agentType;
        agent.developer = developer;
        agent.operator = operator;
        agent.revenueSplitDeveloper = revenueSplitDeveloper;
        agent.trainingInfo = trainingInfo;
        agent.capabilities = capabilities;
        
        emit AgentUpdated(msg.sender, agentType, developer, operator);
    }
    
    function getAgentInfo(address agentAddress) 
        external 
        view 
        override 
        returns (AgentInfo memory) 
    {
        return _agentInfo[agentAddress];
    }
    
    function isAgent(address user) 
        external 
        view 
        override 
        returns (bool) 
    {
        return _agentInfo[user].agentType != AgentType.NotAgent;
    }
    
    function verifyAgent(address agent, bool verified) 
        external 
        override 
        onlyOwner 
    {
        require(_agentInfo[agent].agentType != AgentType.NotAgent, "Not registered as an agent");
        
        _agentInfo[agent].verified = verified;
        
        emit AgentVerified(agent, verified);
    }
} 