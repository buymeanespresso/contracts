import { ethers } from "hardhat";

async function main() {
  console.log("Starting cross-chain contracts deployment...");

  // Deploy HotShotVerifier first
  const hotShotLightClientAddress = "0x08d16cb8243b3e172dddcdf1a1a5dacca1cd7098"; // Espresso testnet light client
  const HotShotVerifier = await ethers.getContractFactory("HotShotVerifier");
  const hotShotVerifier = await HotShotVerifier.deploy(hotShotLightClientAddress);
  await hotShotVerifier.waitForDeployment();
  console.log("HotShotVerifier deployed to:", await hotShotVerifier.getAddress());

  // Deploy TipIntent with mock ERC20 for testing
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Test Token", "TEST");
  await mockToken.waitForDeployment();
  console.log("MockERC20 deployed to:", await mockToken.getAddress());

  const TipIntent = await ethers.getContractFactory("TipIntent");
  const tipIntent = await TipIntent.deploy(
    await hotShotVerifier.getAddress(),
    await mockToken.getAddress()
  );
  await tipIntent.waitForDeployment();
  console.log("TipIntent deployed to:", await tipIntent.getAddress());

  // Deploy IntentSolver
  const IntentSolver = await ethers.getContractFactory("IntentSolver");
  const intentSolver = await IntentSolver.deploy(
    await tipIntent.getAddress(),
    await hotShotVerifier.getAddress(),
    await mockToken.getAddress(),
    ethers.parseEther("0.01"), // minTipAmount: 0.01 tokens
    ethers.parseEther("1000"), // maxTipAmount: 1000 tokens
    100 // solverFee: 1% (100 basis points)
  );
  await intentSolver.waitForDeployment();
  console.log("IntentSolver deployed to:", await intentSolver.getAddress());

  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log("HotShotVerifier:", await hotShotVerifier.getAddress());
  console.log("MockERC20:", await mockToken.getAddress());
  console.log("TipIntent:", await tipIntent.getAddress());
  console.log("IntentSolver:", await intentSolver.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 