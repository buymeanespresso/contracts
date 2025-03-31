// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TipIntent.sol";
import "../crosschain/HotShotVerifier.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IntentSolver
 * @dev Contract for solving cross-chain tip intents with HotShot verification
 */
contract IntentSolver is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // Configuration
    uint256 public minTipAmount;   // Minimum tip amount to solve
    uint256 public maxTipAmount;   // Maximum tip amount to solve
    uint256 public solverFee;      // Fee percentage charged (basis points, e.g. 100 = 1%)
    
    // Contract dependencies
    TipIntent public immutable tipIntent;
    HotShotVerifier public immutable hotshot;
    
    // Solver state
    bool public paused;
    
    // Mappings
    mapping(bytes32 => bool) public solvedIntents;  // Track which intents have been solved
    mapping(bytes32 => bool) public usedMessages;   // Track which messages have been used
    
    // Events
    event IntentSolved(
        bytes32 indexed intentId,
        bytes32 indexed messageId,
        address indexed creator,
        address token,
        uint256 creatorAmount,
        uint256 solverFeeAmount
    );
    
    event ConfigUpdated(
        uint256 minTipAmount,
        uint256 maxTipAmount,
        uint256 solverFee
    );
    
    event SolverPaused(bool paused);
    
    /**
     * @dev Constructor
     * @param _tipIntent Address of the TipIntent contract
     * @param _hotshot Address of the HotShot verifier contract
     * @param _minTipAmount Minimum tip amount to solve
     * @param _maxTipAmount Maximum tip amount to solve
     * @param _solverFee Fee percentage charged (basis points)
     */
    constructor(
        address _tipIntent,
        address _hotshot,
        uint256 _minTipAmount,
        uint256 _maxTipAmount,
        uint256 _solverFee
    ) Ownable() {
        require(_tipIntent != address(0), "Invalid TipIntent address");
        require(_hotshot != address(0), "Invalid HotShot address");
        require(_solverFee <= 10000, "Fee cannot exceed 100%");
        require(_minTipAmount <= _maxTipAmount, "Min tip must be <= Max tip");
        
        tipIntent = TipIntent(_tipIntent);
        hotshot = HotShotVerifier(_hotshot);
        minTipAmount = _minTipAmount;
        maxTipAmount = _maxTipAmount;
        solverFee = _solverFee;
        paused = false;
    }
    
    /**
     * @dev Solves a tip intent by executing it and distributing funds
     * @param intentId The intent ID to solve
     * @param messageId The message ID from HotShot for verification
     */
    function solveIntent(
        bytes32 intentId,
        bytes32 messageId
    ) external nonReentrant {
        require(!paused, "Solver is paused");
        require(!solvedIntents[intentId], "Intent already solved");
        require(!usedMessages[messageId], "Message already used");
        
        // Verify message confirmation status through HotShot
        uint8 confirmationStatus = hotshot.verifyConfirmation(messageId);
        require(confirmationStatus == 1, "Message not confirmed");
        
        // Get tip data
        (address creator, uint256 amount, address recipient, uint256 chainId) = tipIntent.getTipData(intentId);
        
        // Validate tip parameters
        require(amount >= minTipAmount, "Tip amount too low");
        require(amount <= maxTipAmount, "Tip amount too high");
        require(chainId == block.chainid, "Invalid chain ID");
        
        // Execute the tip intent (this will also verify the message)
        tipIntent.executeTipIntent(intentId, messageId);
        
        // Mark as solved and used
        solvedIntents[intentId] = true;
        usedMessages[messageId] = true;
        
        // Get the tip details to determine token
        TipIntent.TipData memory tipData = tipIntent.getTipIntent(intentId);
        
        // Calculate fee amount
        uint256 feeAmount = (amount * solverFee) / 10000;
        uint256 creatorAmount = amount - feeAmount;
        
        // Transfer tokens to creator and take fee
        if (feeAmount > 0) {
            // Pull the tokens from the TipIntent contract
            IERC20(tipData.token).safeTransferFrom(address(tipIntent), address(this), amount);
            
            // Send to creator
            IERC20(tipData.token).safeTransfer(creator, creatorAmount);
            
            // Keep fee in this contract
            IERC20(tipData.token).safeTransfer(owner(), feeAmount);
        } else {
            // If no fee, transfer directly to creator
            IERC20(tipData.token).safeTransferFrom(address(tipIntent), creator, amount);
        }
        
        emit IntentSolved(
            intentId,
            messageId,
            creator,
            tipData.token,
            creatorAmount,
            feeAmount
        );
    }
    
    /**
     * @dev Updates the solver configuration
     * @param _minTipAmount New minimum tip amount
     * @param _maxTipAmount New maximum tip amount
     * @param _solverFee New solver fee (basis points)
     */
    function updateConfig(
        uint256 _minTipAmount,
        uint256 _maxTipAmount,
        uint256 _solverFee
    ) external onlyOwner {
        require(_solverFee <= 10000, "Fee cannot exceed 100%");
        require(_minTipAmount <= _maxTipAmount, "Min tip must be <= Max tip");
        
        minTipAmount = _minTipAmount;
        maxTipAmount = _maxTipAmount;
        solverFee = _solverFee;
        
        emit ConfigUpdated(
            minTipAmount,
            maxTipAmount,
            solverFee
        );
    }
    
    /**
     * @dev Pauses or unpauses the solver
     * @param _paused New paused state
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit SolverPaused(paused);
    }
    
    /**
     * @dev Emergency fund recovery in case of contract issues
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function recoverFunds(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
} 