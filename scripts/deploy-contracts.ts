// Deploy TipIntent and IntentSolver contracts to the Arbitrum Orbit rollup
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  rollupRpcUrl: process.env.ROLLUP_RPC_URL || "http://34.31.168.162:8547",
  minTipAmount: ethers.parseEther("0.01"),    // 0.01 of the token
  maxTipAmount: ethers.parseEther("1000"),    // 1000 of the token
  solverFee: 100n,                            // 1% fee (in basis points)
};

async function main() {
  console.log("🚀 Starting contract deployment to Espresso Rollup...");
  
  // Connect to the rollup network
  console.log(`Connecting to Rollup RPC at ${CONFIG.rollupRpcUrl}...`);
  const provider = new ethers.JsonRpcProvider(CONFIG.rollupRpcUrl);
  
  // Get the private key or throw an error
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is not set");
  }
  
  // Prepare the deployer wallet
  const deployerWallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deployer wallet address: ${deployerWallet.address}`);
  
  // Get the chain ID
  const chainId = await provider.getNetwork().then(network => network.chainId);
  console.log(`Network chain ID: ${chainId}`);
  
  // Check deployer balance
  const balance = await provider.getBalance(deployerWallet.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.1")) {
    console.warn("⚠️ LOW BALANCE: Deployer has less than 0.1 ETH. Deployment may fail.");
  }
  
  // Deploy contracts
  const contracts: Record<string, string> = {};
  
  try {
    // 1. Deploy MockHotShotLightClient
    console.log("Deploying MockHotShotLightClient...");
    const MockHotShotLightClientFactory = await ethers.getContractFactory(
      "MockHotShotLightClient", 
      deployerWallet
    );
    const mockHotShotLightClient = await MockHotShotLightClientFactory.deploy();
    await mockHotShotLightClient.waitForDeployment();
    const mockHotShotLightClientAddress = await mockHotShotLightClient.getAddress();
    console.log(`✅ MockHotShotLightClient deployed to: ${mockHotShotLightClientAddress}`);
    contracts.mockHotShotLightClient = mockHotShotLightClientAddress;

    // 2. Deploy HotShotVerifierImpl
    console.log("Deploying HotShotVerifierImpl...");
    const HotShotVerifierImplFactory = await ethers.getContractFactory(
      "HotShotVerifierImpl", 
      deployerWallet
    );
    const hotShotVerifier = await HotShotVerifierImplFactory.deploy(mockHotShotLightClientAddress);
    await hotShotVerifier.waitForDeployment();
    const hotShotVerifierAddress = await hotShotVerifier.getAddress();
    console.log(`✅ HotShotVerifierImpl deployed to: ${hotShotVerifierAddress}`);
    contracts.hotShotVerifier = hotShotVerifierAddress;
    
    // 3. Deploy MockERC20
    console.log("Deploying MockERC20...");
    const MockERC20Factory = await ethers.getContractFactory(
      "contracts/mocks/MockERC20.sol:MockERC20", 
      deployerWallet
    );
    const mockERC20 = await MockERC20Factory.deploy("Espresso Token", "ESPR");
    await mockERC20.waitForDeployment();
    const mockERC20Address = await mockERC20.getAddress();
    console.log(`✅ MockERC20 deployed to: ${mockERC20Address}`);
    contracts.mockERC20 = mockERC20Address;
    
    // 4. Deploy TipIntent
    console.log("Deploying TipIntent...");
    const TipIntentFactory = await ethers.getContractFactory("TipIntent", deployerWallet);
    const tipIntent = await TipIntentFactory.deploy(hotShotVerifierAddress);
    await tipIntent.waitForDeployment();
    const tipIntentAddress = await tipIntent.getAddress();
    console.log(`✅ TipIntent deployed to: ${tipIntentAddress}`);
    contracts.tipIntent = tipIntentAddress;
    
    // 5. Deploy IntentSolver
    console.log("Deploying IntentSolver...");
    const IntentSolverFactory = await ethers.getContractFactory("IntentSolver", deployerWallet);
    const intentSolver = await IntentSolverFactory.deploy(
      tipIntentAddress,
      hotShotVerifierAddress,
      CONFIG.minTipAmount,
      CONFIG.maxTipAmount,
      CONFIG.solverFee
    );
    await intentSolver.waitForDeployment();
    const intentSolverAddress = await intentSolver.getAddress();
    console.log(`✅ IntentSolver deployed to: ${intentSolverAddress}`);
    contracts.intentSolver = intentSolverAddress;
    
    // 6. Deploy EspressoCreatorRegistry
    console.log("Deploying EspressoCreatorRegistry...");
    const EspressoCreatorRegistryFactory = await ethers.getContractFactory(
      "EspressoCreatorRegistry", 
      deployerWallet
    );
    const espressoCreatorRegistry = await EspressoCreatorRegistryFactory.deploy();
    await espressoCreatorRegistry.waitForDeployment();
    const espressoCreatorRegistryAddress = await espressoCreatorRegistry.getAddress();
    console.log(`✅ EspressoCreatorRegistry deployed to: ${espressoCreatorRegistryAddress}`);
    contracts.espressoCreatorRegistry = espressoCreatorRegistryAddress;
    
    // Mint test tokens to deployer
    console.log("Minting test tokens to deployer...");
    const mintAmount = ethers.parseEther("10000");
    const mintTx = await mockERC20.mint(deployerWallet.address, mintAmount);
    await mintTx.wait();
    console.log(`✅ Minted ${ethers.formatEther(mintAmount)} ESPR tokens to deployer`);
    
    // Deployment summary
    console.log("\n🎉 Deployment complete! Contract addresses:");
    for (const [name, address] of Object.entries(contracts)) {
      console.log(`${name}: ${address}`);
    }
    
    // Save deployments to a file
    const deploymentsJson = JSON.stringify(contracts, null, 2);
    fs.writeFileSync("deployments.json", deploymentsJson);
    console.log("Deployments saved to deployments.json");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 