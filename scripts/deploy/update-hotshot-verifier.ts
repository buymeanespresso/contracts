import { ethers } from "hardhat";

async function main() {
  // Address of the real Espresso HotShot light client on Arbitrum Sepolia
  const ESPRESSO_LIGHT_CLIENT_ADDRESS = "0x08d16cb8243b3e172dddcdf1a1a5dacca1cd7098";
  
  console.log("Deploying updated HotShotVerifier pointing to the real Espresso light client...");
  console.log(`Light client address: ${ESPRESSO_LIGHT_CLIENT_ADDRESS}`);
  
  // Deploy HotShotVerifier with the real light client address
  const HotShotVerifier = await ethers.getContractFactory("HotShotVerifier");
  const hotShotVerifier = await HotShotVerifier.deploy(ESPRESSO_LIGHT_CLIENT_ADDRESS);
  await hotShotVerifier.waitForDeployment();
  
  const deployedAddress = await hotShotVerifier.getAddress();
  console.log(`HotShotVerifier deployed to: ${deployedAddress}`);
  
  // Output verification command
  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network arbitrumSepolia ${deployedAddress} ${ESPRESSO_LIGHT_CLIENT_ADDRESS}`);
  
  // Also redeploy the dependent contracts
  console.log("\nDeploying TipIntent with updated HotShotVerifier...");
  const TipIntent = await ethers.getContractFactory("TipIntent");
  const tipIntent = await TipIntent.deploy(deployedAddress);
  await tipIntent.waitForDeployment();
  
  const tipIntentAddress = await tipIntent.getAddress();
  console.log(`TipIntent deployed to: ${tipIntentAddress}`);
  
  // Set configuration for IntentSolver
  const minTipAmount = ethers.parseEther("0.01"); // 0.01 ETH
  const maxTipAmount = ethers.parseEther("1000"); // 1000 ETH
  const solverFee = 100; // 1% (100 basis points)
  
  console.log("\nDeploying IntentSolver with updated contracts...");
  const IntentSolver = await ethers.getContractFactory("IntentSolver");
  const intentSolver = await IntentSolver.deploy(
    tipIntentAddress,
    deployedAddress,
    minTipAmount,
    maxTipAmount,
    solverFee
  );
  await intentSolver.waitForDeployment();
  
  const intentSolverAddress = await intentSolver.getAddress();
  console.log(`IntentSolver deployed to: ${intentSolverAddress}`);
  
  // Output contract addresses for easy reference
  console.log("\nDeployed contract addresses:");
  console.log(`- HotShotVerifier: ${deployedAddress}`);
  console.log(`- TipIntent: ${tipIntentAddress}`);
  console.log(`- IntentSolver: ${intentSolverAddress}`);
  
  // Output verification commands for all contracts
  console.log("\nVerification commands for all contracts:");
  console.log(`npx hardhat verify --network arbitrumSepolia ${deployedAddress} ${ESPRESSO_LIGHT_CLIENT_ADDRESS}`);
  console.log(`npx hardhat verify --network arbitrumSepolia ${tipIntentAddress} ${deployedAddress}`);
  console.log(`npx hardhat verify --network arbitrumSepolia ${intentSolverAddress} ${tipIntentAddress} ${deployedAddress} ${minTipAmount} ${maxTipAmount} ${solverFee}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 