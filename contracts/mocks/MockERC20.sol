// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev A mock ERC20 token for testing purposes with minting capabilities
 */
contract MockERC20 is ERC20, Ownable {
    /**
     * @dev Constructor that gives the msg.sender all of existing tokens.
     * @param name The name of the token
     * @param symbol The symbol of the token
     */
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable() {}

    /**
     * @dev Creates `amount` tokens and assigns them to `account`
     * @param account The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }
} 