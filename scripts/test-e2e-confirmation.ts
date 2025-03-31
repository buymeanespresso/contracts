import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

// Use typed contract factories instead of manually applying ABIs
async function main() {
  console.log("Starting E2E test with HotShot confirmation...");
  
  // Load test wallets from key file
  const wallets = await loadTestWallets();
  const [deployer, creator, tipper] = await ethers.getSigners();
  
  console.log("Test accounts:");
  console.log("- Deployer:", deployer.address);
  console.log("- Creator:", creator.address);
  console.log("- Tipper:", tipper.address);
  
  // Deploy a mock HotShot light client
  console.log("\nDeploying mock HotShot light client...");
  const MockHotShotLightClient = await ethers.getContractFactory("MockHotShotLightClient");
  const mockLightClient = await MockHotShotLightClient.deploy();
  await mockLightClient.waitForDeployment();
  console.log("Mock HotShot light client deployed to:", await mockLightClient.getAddress());
  
  // Deploy HotShotVerifier
  console.log("\nDeploying HotShotVerifier...");
  const HotShotVerifier = await ethers.getContractFactory("HotShotVerifier");
  const hotShotVerifier = await HotShotVerifier.deploy(await mockLightClient.getAddress());
  await hotShotVerifier.waitForDeployment();
  console.log("HotShotVerifier deployed to:", await hotShotVerifier.getAddress());
  
  // Deploy a test token
  console.log("\nDeploying test token...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Test Token", "TEST");
  await mockToken.waitForDeployment();
  console.log("Test token deployed to:", await mockToken.getAddress());
  
  // Deploy TipIntent
  console.log("\nDeploying TipIntent...");
  const TipIntent = await ethers.getContractFactory("TipIntent");
  const tipIntent = await TipIntent.deploy(await hotShotVerifier.getAddress());
  await tipIntent.waitForDeployment();
  console.log("TipIntent deployed to:", await tipIntent.getAddress());
  
  // Deploy IntentSolver
  console.log("\nDeploying IntentSolver...");
  const IntentSolver = await ethers.getContractFactory("IntentSolver");
  const intentSolver = await IntentSolver.deploy(
    await tipIntent.getAddress(),
    await hotShotVerifier.getAddress(),
    ethers.parseEther("0.01"), // minTipAmount: 0.01 tokens
    ethers.parseEther("1000"), // maxTipAmount: 1000 tokens
    100 // solverFee: 1% (100 basis points)
  );
  await intentSolver.waitForDeployment();
  console.log("IntentSolver deployed to:", await intentSolver.getAddress());
  
  // Mint tokens to tipper
  console.log("\nMinting tokens to tipper...");
  const mintTx = await mockToken.mint(tipper.address, ethers.parseEther("100"));
  await mintTx.wait();
  const tipperBalance = await mockToken.balanceOf(tipper.address);
  console.log("Tipper token balance:", ethers.formatEther(tipperBalance));
  
  // Approve tokens for TipIntent
  console.log("\nApproving tokens for TipIntent...");
  const approveTx = await mockToken.connect(tipper).approve(await tipIntent.getAddress(), ethers.parseEther("100"));
  await approveTx.wait();
  console.log("Tokens approved");
  
  // Create tip intent
  console.log("\nCreating tip intent...");
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const tipAmount = ethers.parseEther("1");
  const createTx = await tipIntent.connect(tipper).createTipIntent(
    creator.address,
    await mockToken.getAddress(),
    tipAmount,
    "E2E test tip!",
    deadline
  );
  const receipt = await createTx.wait();
  
  // Get intentId from events
  const intentId = receipt?.logs[0]?.topics[1];
  console.log("Created tip intent:", intentId);
  
  // Check creator's token balance before
  const creatorBalanceBefore = await mockToken.balanceOf(creator.address);
  console.log("\nCreator token balance before:", ethers.formatEther(creatorBalanceBefore));
  
  // Get intent details
  const intentDetails = await tipIntent.getTipIntent(intentId);
  console.log("\nIntent details:");
  console.log("- Creator:", intentDetails.creator);
  console.log("- Tipper:", intentDetails.tipper);
  console.log("- Token:", intentDetails.token);
  console.log("- Amount:", ethers.formatEther(intentDetails.amount));
  
  // Generate a message ID
  const nonce = 1; // Using a fixed nonce for reproducibility
  const messageId = await hotShotVerifier.generateMessageId(
    tipper.address,
    creator.address,
    await mockToken.getAddress(),
    tipAmount,
    nonce
  );
  console.log("\nGenerated message ID:", messageId);
  
  // Set the message as confirmed in the mock light client
  console.log("\nSetting message as confirmed in mock light client...");
  const statusConfirmed = await hotShotVerifier.STATUS_CONFIRMED();
  await mockLightClient.setConfirmation(messageId, statusConfirmed);
  console.log("Message confirmed in mock light client");
  
  // Check if the message is confirmed
  const isConfirmed = await mockLightClient.isConfirmed(messageId);
  console.log("Is message confirmed?", isConfirmed);
  
  // Get solver fee information
  const solverFee = await intentSolver.solverFee();
  const minTipAmount = await intentSolver.minTipAmount();
  const maxTipAmount = await intentSolver.maxTipAmount();
  console.log("\nSolver fee:", solverFee.toString(), "basis points");
  console.log("Min tip amount:", ethers.formatEther(minTipAmount));
  console.log("Max tip amount:", ethers.formatEther(maxTipAmount));
  
  // Solve the intent
  console.log("\nSolving tip intent...");
  const solveTx = await intentSolver.connect(deployer).solveTipIntent(intentId, messageId);
  await solveTx.wait();
  console.log("Tip intent solved successfully");
  
  // Check creator's token balance after
  const creatorBalanceAfter = await mockToken.balanceOf(creator.address);
  console.log("\nCreator token balance after:", ethers.formatEther(creatorBalanceAfter));
  
  // Calculate expected amount after fee
  const feeAmount = (tipAmount * solverFee) / 10000n;
  const expectedAmount = tipAmount - feeAmount;
  console.log("\nExpected amount after fee:", ethers.formatEther(expectedAmount));
  
  // Check if creator received the correct amount
  const receivedAmount = creatorBalanceAfter - creatorBalanceBefore;
  console.log("Actually received amount:", ethers.formatEther(receivedAmount));
  
  // Compare as strings to avoid bigint comparison issues
  if (receivedAmount.toString() === expectedAmount.toString()) {
    console.log("\n✅ SUCCESS: Creator received the correct amount after fee");
  } else {
    console.log("\n❌ ERROR: Creator did not receive the correct amount");
  }
  
  console.log("\nE2E test with HotShot confirmation completed successfully!");
}

async function loadTestWallets() {
  try {
    const walletPath = path.join(__dirname, '../test-wallets/test-wallets.key.json');
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    return {
      creator: walletData.creator,
      tipper: walletData.tipper
    };
  } catch (error) {
    console.warn("Could not load test wallets:", error);
    return null;
  }
}

// Execute the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 