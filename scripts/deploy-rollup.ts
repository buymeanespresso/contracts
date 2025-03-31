import { ethers } from "hardhat";

// Rollup Configuration
const ROLLUP_CONFIG = {
  rpcUrl: "http://34.31.168.162:8547",
  chainId: 4371337, // Espresso Network Chain ID
  ownerWallet: "0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1",
  hotShotLightClient: "0x08d16cb8243b3e172dddcdf1a1a5dacca1cd7098" // Arbitrum Sepolia
};

async function main() {
  console.log("Deploying BuyMeAnEspresso contracts to rollup...");
  console.log("------------------------------------------------");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Deploy MockERC20 for testing if needed
  console.log("\nDeploying MockERC20...");
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20Factory.deploy("Espresso Token", "ESPO");
  await mockERC20.waitForDeployment();
  const mockERC20Address = await mockERC20.getAddress();
  console.log("MockERC20 deployed to:", mockERC20Address);
  
  // Deploy HotShotVerifier
  console.log("\nDeploying HotShotVerifier...");
  const HotShotVerifierFactory = await ethers.getContractFactory("HotShotVerifier");
  const hotShotVerifier = await HotShotVerifierFactory.deploy();
  await hotShotVerifier.waitForDeployment();
  const hotShotVerifierAddress = await hotShotVerifier.getAddress();
  console.log("HotShotVerifier deployed to:", hotShotVerifierAddress);
  
  // Deploy TipIntent
  console.log("\nDeploying TipIntent...");
  const TipIntentFactory = await ethers.getContractFactory("TipIntent");
  const tipIntent = await TipIntentFactory.deploy(hotShotVerifierAddress);
  await tipIntent.waitForDeployment();
  const tipIntentAddress = await tipIntent.getAddress();
  console.log("TipIntent deployed to:", tipIntentAddress);
  
  // Deploy IntentSolver
  console.log("\nDeploying IntentSolver...");
  const minTipAmount = ethers.parseEther("0.01");  // 0.01 tokens
  const maxTipAmount = ethers.parseEther("1000");  // 1000 tokens
  const solverFee = 100n;  // 1% (in basis points)
  
  const IntentSolverFactory = await ethers.getContractFactory("IntentSolver");
  const intentSolver = await IntentSolverFactory.deploy(
    tipIntentAddress,
    hotShotVerifierAddress,
    minTipAmount,
    maxTipAmount,
    solverFee
  );
  await intentSolver.waitForDeployment();
  const intentSolverAddress = await intentSolver.getAddress();
  console.log("IntentSolver deployed to:", intentSolverAddress);
  
  // Deploy EspressoCreatorRegistry
  console.log("\nDeploying EspressoCreatorRegistry...");
  const EspressoCreatorRegistryFactory = await ethers.getContractFactory("EspressoCreatorRegistry");
  const espressoCreatorRegistry = await EspressoCreatorRegistryFactory.deploy();
  await espressoCreatorRegistry.waitForDeployment();
  const espressoCreatorRegistryAddress = await espressoCreatorRegistry.getAddress();
  console.log("EspressoCreatorRegistry deployed to:", espressoCreatorRegistryAddress);
  
  // Deploy AICreatorExtension
  console.log("\nDeploying AICreatorExtension...");
  const AICreatorExtensionFactory = await ethers.getContractFactory("AICreatorExtension");
  const aiCreatorExtension = await AICreatorExtensionFactory.deploy(espressoCreatorRegistryAddress);
  await aiCreatorExtension.waitForDeployment();
  const aiCreatorExtensionAddress = await aiCreatorExtension.getAddress();
  console.log("AICreatorExtension deployed to:", aiCreatorExtensionAddress);
  
  // Deploy EspressoTipping
  console.log("\nDeploying EspressoTipping...");
  const EspressoTippingFactory = await ethers.getContractFactory("EspressoTipping");
  const espressoTipping = await EspressoTippingFactory.deploy(
    espressoCreatorRegistryAddress,
    tipIntentAddress,
    hotShotVerifierAddress
  );
  await espressoTipping.waitForDeployment();
  const espressoTippingAddress = await espressoTipping.getAddress();
  console.log("EspressoTipping deployed to:", espressoTippingAddress);
  
  // Deploy EspressoMembership
  console.log("\nDeploying EspressoMembership...");
  const EspressoMembershipFactory = await ethers.getContractFactory("EspressoMembership");
  const espressoMembership = await EspressoMembershipFactory.deploy(espressoCreatorRegistryAddress);
  await espressoMembership.waitForDeployment();
  const espressoMembershipAddress = await espressoMembership.getAddress();
  console.log("EspressoMembership deployed to:", espressoMembershipAddress);
  
  // Summary
  console.log("\n------------------------------------------------");
  console.log("Deployment Summary");
  console.log("------------------------------------------------");
  console.log("MockERC20:", mockERC20Address);
  console.log("HotShotVerifier:", hotShotVerifierAddress);
  console.log("TipIntent:", tipIntentAddress);
  console.log("IntentSolver:", intentSolverAddress);
  console.log("EspressoCreatorRegistry:", espressoCreatorRegistryAddress);
  console.log("AICreatorExtension:", aiCreatorExtensionAddress);
  console.log("EspressoTipping:", espressoTippingAddress);
  console.log("EspressoMembership:", espressoMembershipAddress);
  console.log("------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 