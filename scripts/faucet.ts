import { ethers } from "hardhat";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  rollupRpcUrl: process.env.ROLLUP_RPC_URL || "http://34.31.168.162:8547",
  mockERC20Address: "0x1393403A3Dfaf903876650Ce5CbE911AEd962907", // MockERC20 contract address
  recipient: process.env.RECIPIENT || "0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8",
  amount: process.env.AMOUNT || "10",
};

/**
 * ESPR Token Faucet Script
 * 
 * This script mints ESPR tokens to a specified address using the faucet account.
 * The faucet account (0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1) has minting permissions.
 * Private key is loaded from the .env file.
 */
async function main() {
  // Get recipient from environment or use the default
  const recipientAddress = CONFIG.recipient;
  const amountInEspr = parseFloat(CONFIG.amount);
  const amount = ethers.parseEther(amountInEspr.toString());

  // Validate recipient address
  if (!ethers.isAddress(recipientAddress)) {
    console.error(`Invalid Ethereum address: ${recipientAddress}`);
    process.exit(1);
  }

  console.log(`🚰 ESPR Token Faucet`);
  console.log(`====================`);
  
  // Connect to the network through Hardhat
  const [deployer] = await ethers.getSigners();
  console.log(`Using signer: ${deployer.address}`);
  
  // Get the chain ID
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network chain ID: ${chainId}`);
  
  // Get signer balance
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`Signer ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
  
  // Get MockERC20 contract
  const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
  const mockERC20 = await MockERC20.attach(CONFIG.mockERC20Address);
  
  // Check if the signer has the owner role on the MockERC20 contract
  try {
    const owner = await mockERC20.owner();
    console.log(`MockERC20 owner: ${owner}`);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.warn(`Warning: The current signer (${deployer.address}) is not the owner of the MockERC20 contract.`);
      console.warn(`Current owner is: ${owner}`);
      console.warn(`Will attempt to mint tokens anyway, but it may fail if the signer doesn't have permissions.`);
    }
  } catch (error: any) {
    console.error("Error checking contract ownership:", error.message);
    console.warn("Continuing anyway...");
  }

  // Get token symbol and decimals
  try {
    const symbol = await mockERC20.symbol();
    const decimals = await mockERC20.decimals();
    console.log(`Token: ${symbol} (${decimals} decimals)`);
    
    // Get recipient's current balance
    const initialBalance = await mockERC20.balanceOf(recipientAddress);
    console.log(`Recipient (${recipientAddress}) initial balance: ${ethers.formatEther(initialBalance)} ${symbol}`);
    
    // Mint tokens to recipient
    console.log(`\n💸 Minting ${amountInEspr} ${symbol} to ${recipientAddress}...`);
    const mintTx = await mockERC20.mint(recipientAddress, amount);
    console.log(`Transaction hash: ${mintTx.hash}`);
    console.log(`Waiting for transaction confirmation...`);
    
    const receipt = await mintTx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Get updated balance
    const newBalance = await mockERC20.balanceOf(recipientAddress);
    console.log(`\n📊 Updated recipient balance: ${ethers.formatEther(newBalance)} ${symbol}`);
    console.log(`🎉 Successfully sent ${amountInEspr} ${symbol} to ${recipientAddress}`);
  } catch (error: any) {
    console.error(`❌ Error minting tokens:`, error.message);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error: any) => {
    console.error(error);
    process.exit(1);
  }); 