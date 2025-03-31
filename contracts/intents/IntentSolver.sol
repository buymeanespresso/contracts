// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TipIntent.sol";
import "../crosschain/HotShotVerifier.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title IntentSolver
 * @dev Contract for solving cross-chain tip intents
 */
contract IntentSolver is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // Contracts
    TipIntent public immutable tipIntent;
    HotShotVerifier public immutable hotshot;
    
    // Solver configuration
    uint256 public minTipAmount;
    uint256 public maxTipAmount;
    uint256 public solverFee; // In basis points (1/10000)
    
    // Events
    event IntentSolved(
        bytes32 indexed intentId,
        bytes32 messageId,
        address recipient,
        address token,
        uint256 amount,
        uint256 fee
    );
    event SolverConfigUpdated(
        uint256 minTipAmount,
        uint256 maxTipAmount,
        uint256 solverFee
    );
    
    /**
     * @dev Constructor
     * @param _tipIntent Address of the TipIntent contract
     * @param _hotshot Address of the HotShot verifier contract
     * @param _minTipAmount Minimum tip amount that can be solved
     * @param _maxTipAmount Maximum tip amount that can be solved
     * @param _solverFee Solver fee in basis points
     */
    constructor(
        address _tipIntent,
        address _hotshot,
        uint256 _minTipAmount,
        uint256 _maxTipAmount,
        uint256 _solverFee
    ) {
        require(_tipIntent != address(0), "Invalid TipIntent address");
        require(_hotshot != address(0), "Invalid HotShot address");
        require(_solverFee <= 1000, "Fee too high"); // Max 10%
        
        tipIntent = TipIntent(_tipIntent);
        hotshot = HotShotVerifier(_hotshot);
        minTipAmount = _minTipAmount;
        maxTipAmount = _maxTipAmount;
        solverFee = _solverFee;
    }
    
    /**
     * @dev Solves a cross-chain tip intent
     * @param intentId The ID of the intent to solve
     * @param messageId The cross-chain message ID from HotShot
     */
    function solveTipIntent(
        bytes32 intentId,
        bytes32 messageId
    ) external nonReentrant {
        // Get tip data
        (
            address creator,
            uint256 amount,
            address recipient,
            uint256 chainId
        ) = tipIntent.getTipData(intentId);
        
        // Get token from the tip intent
        TipIntent.TipData memory tipData = tipIntent.getTipIntent(intentId);
        address token = tipData.token;
        
        require(amount >= minTipAmount, "Tip amount too low");
        require(amount <= maxTipAmount, "Tip amount too high");
        require(chainId == block.chainid, "Wrong chain");
        
        // Calculate fee
        uint256 fee = (amount * solverFee) / 10000;
        uint256 recipientAmount = amount - fee;
        
        // Execute the tip intent which will approve this contract to transfer tokens
        tipIntent.executeTipIntent(intentId, messageId);
        
        // Transfer tokens from the TipIntent contract
        IERC20(token).safeTransferFrom(address(tipIntent), address(this), amount);
        
        // Distribute tokens with fee
        IERC20(token).safeTransfer(recipient, recipientAmount);
        IERC20(token).safeTransfer(owner(), fee);
        
        emit IntentSolved(
            intentId,
            messageId,
            recipient,
            token,
            recipientAmount,
            fee
        );
    }
    
    /**
     * @dev Updates solver configuration
     * @param _minTipAmount New minimum tip amount
     * @param _maxTipAmount New maximum tip amount
     * @param _solverFee New solver fee in basis points
     */
    function updateConfig(
        uint256 _minTipAmount,
        uint256 _maxTipAmount,
        uint256 _solverFee
    ) external onlyOwner {
        require(_solverFee <= 1000, "Fee too high"); // Max 10%
        require(_minTipAmount <= _maxTipAmount, "Invalid amounts");
        
        minTipAmount = _minTipAmount;
        maxTipAmount = _maxTipAmount;
        solverFee = _solverFee;
        
        emit SolverConfigUpdated(_minTipAmount, _maxTipAmount, _solverFee);
    }
    
    /**
     * @dev Withdraws tokens from the solver contract
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     */
    function withdrawTokens(
        IERC20 token,
        uint256 amount
    ) external onlyOwner {
        token.safeTransfer(owner(), amount);
    }
} 