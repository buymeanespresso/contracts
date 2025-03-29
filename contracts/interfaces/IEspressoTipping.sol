// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEspressoTipping {
    event TipSent(
        address indexed from,
        address indexed to,
        uint256 amount,
        string message
    );

    event TipWithdrawn(
        address indexed creator,
        uint256 amount
    );

    function tipCreator(
        address creator,
        string calldata message
    ) external payable;

    function tipAgent(
        address agent,
        string calldata message
    ) external payable;

    function withdrawTips() external;

    function getTipsBalance(address creator) external view returns (uint256);
    
    function getCreatorTotalTips(address creator) external view returns (uint256);
} 