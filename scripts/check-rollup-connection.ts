// Script to check connection to the rollup node
import { ethers } from "hardhat";

async function main() {
  console.log("Checking connection to Espresso Rollup...");
  
  // Get network
  const network = await ethers.provider.getNetwork();
  console.log("Connected to network:", {
    name: network.name,
    chainId: network.chainId.toString() // Convert BigInt to string
  });
  
  // Get block number
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Current block number:", blockNumber);
  
  // Get gas price
  const gasPrice = await ethers.provider.getFeeData();
  console.log("Gas price:", {
    gasPrice: gasPrice.gasPrice?.toString(),
    maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString()
  });
  
  // Get accounts
  const accounts = await ethers.getSigners();
  console.log("Account:", accounts[0].address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(accounts[0].address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  console.log("Connection test complete!");
}

main().catch((error) => {
  console.error("Error connecting to rollup:", error);
  process.exitCode = 1;
}); 