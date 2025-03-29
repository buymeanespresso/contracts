// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAICreatorExtension {
    enum AgentType {
        NotAgent,
        Autonomous,
        SemiAutonomous,
        Controlled
    }
    
    struct AgentInfo {
        AgentType agentType;
        address developer;
        address operator;
        uint256 revenueSplitDeveloper; // Percentage in basis points (e.g., 5000 = 50%)
        string trainingInfo;
        string capabilities;
        bool verified;
    }
    
    event AgentRegistered(
        address indexed agent,
        AgentType agentType,
        address developer,
        address operator
    );
    
    event AgentUpdated(
        address indexed agent,
        AgentType agentType,
        address developer,
        address operator
    );
    
    event AgentVerified(
        address indexed agent,
        bool verified
    );
    
    function registerAsAgent(
        AgentType agentType,
        address developer,
        address operator,
        uint256 revenueSplitDeveloper,
        string calldata trainingInfo,
        string calldata capabilities
    ) external;
    
    function updateAgentInfo(
        AgentType agentType,
        address developer,
        address operator,
        uint256 revenueSplitDeveloper,
        string calldata trainingInfo,
        string calldata capabilities
    ) external;
    
    function getAgentInfo(address agentAddress) external view returns (AgentInfo memory);
    
    function isAgent(address user) external view returns (bool);
    
    function verifyAgent(address agent, bool verified) external;
} 