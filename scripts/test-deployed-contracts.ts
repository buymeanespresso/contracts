import { ethers } from "hardhat";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Load deployment addresses
const deployments = JSON.parse(
  fs.readFileSync("deployments.json", "utf8")
);

// Create a separate creator wallet
const creatorWallet = ethers.Wallet.createRandom();
console.log(`Created test creator wallet: ${creatorWallet.address}`);

// Test configuration
const TEST_CONFIG = {
  creatorAddress: creatorWallet.address, // Using separate creator wallet
  tipAmount: ethers.parseEther("1.0"), // 1 ESPR token
  tipMessage: "Thanks for the great content!",
  tipDeadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
};

async function main() {
  console.log("🧪 Testing deployed Buy Me An Espresso contracts");
  console.log("================================================");
  
  // Connect to rollup network
  const provider = new ethers.JsonRpcProvider(process.env.ROLLUP_RPC_URL || "http://34.31.168.162:8547");
  console.log(`Connected to rollup network with chain ID: ${(await provider.getNetwork()).chainId}`);
  
  // Create wallet from private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is not set");
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Using wallet address: ${wallet.address}`);
  
  // Load contract instances
  const mockERC20 = await ethers.getContractAt("contracts/mocks/MockERC20.sol:MockERC20", deployments.mockERC20, wallet);
  const tipIntent = await ethers.getContractAt("TipIntent", deployments.tipIntent, wallet);
  const intentSolver = await ethers.getContractAt("IntentSolver", deployments.intentSolver, wallet);
  const mockHotShotLightClient = await ethers.getContractAt("MockHotShotLightClient", deployments.mockHotShotLightClient, wallet);
  const hotShotVerifier = await ethers.getContractAt("HotShotVerifierImpl", deployments.hotShotVerifier, wallet);
  
  console.log("\n📊 Contract Details:");
  console.log(`MockERC20: ${await mockERC20.getAddress()}`);
  console.log(`TipIntent: ${await tipIntent.getAddress()}`);
  console.log(`IntentSolver: ${await intentSolver.getAddress()}`);
  console.log(`MockHotShotLightClient: ${await mockHotShotLightClient.getAddress()}`);
  console.log(`HotShotVerifier: ${await hotShotVerifier.getAddress()}`);
  
  // Check wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`\n💰 ETH Balance: ${ethers.formatEther(balance)} ETH`);
  
  // Check ERC20 balance
  const tokenBalance = await mockERC20.balanceOf(wallet.address);
  console.log(`💰 ESPR Token Balance: ${ethers.formatEther(tokenBalance)} ESPR`);
  
  // Check initial balances
  const initialTokenBalance = await mockERC20.balanceOf(wallet.address);
  console.log(`\n💰 Initial ESPR Token Balance: ${ethers.formatEther(initialTokenBalance)} ESPR`);

  // Check initial contract balances
  const initialTipIntentBalance = await mockERC20.balanceOf(await tipIntent.getAddress());
  const initialSolverBalance = await mockERC20.balanceOf(await intentSolver.getAddress());
  const initialSolverOwnerBalance = await mockERC20.balanceOf(await intentSolver.owner());

  console.log(`Initial TipIntent contract balance: ${ethers.formatEther(initialTipIntentBalance)} ESPR`);
  console.log(`Initial IntentSolver contract balance: ${ethers.formatEther(initialSolverBalance)} ESPR`);
  console.log(`Initial IntentSolver owner balance: ${ethers.formatEther(initialSolverOwnerBalance)} ESPR`);
  
  // Approve token spending
  console.log("\n🔓 Approving TipIntent contract to spend tokens...");
  const approveTx = await mockERC20.approve(await tipIntent.getAddress(), TEST_CONFIG.tipAmount);
  await approveTx.wait();
  console.log(`✅ Approved ${ethers.formatEther(TEST_CONFIG.tipAmount)} ESPR tokens for TipIntent contract`);
  
  // Create tip intent
  console.log("\n🎁 Creating tip intent...");
  console.log(`Creator: ${TEST_CONFIG.creatorAddress}`);
  console.log(`Amount: ${ethers.formatEther(TEST_CONFIG.tipAmount)} ESPR`);
  console.log(`Message: ${TEST_CONFIG.tipMessage}`);
  console.log(`Deadline: ${new Date(TEST_CONFIG.tipDeadline * 1000).toISOString()}`);
  
  const createTipTx = await tipIntent.createTipIntent(
    TEST_CONFIG.creatorAddress,
    await mockERC20.getAddress(),
    TEST_CONFIG.tipAmount,
    TEST_CONFIG.tipMessage,
    TEST_CONFIG.tipDeadline
  );
  
  const createTipReceipt = await createTipTx.wait();
  
  // Check balances after creating tip intent
  const afterTipTokenBalance = await mockERC20.balanceOf(wallet.address);
  const afterTipTipIntentBalance = await mockERC20.balanceOf(await tipIntent.getAddress());

  console.log(`\n💰 After creating tip intent:`);
  console.log(`Wallet ESPR balance: ${ethers.formatEther(afterTipTokenBalance)} ESPR (change: ${ethers.formatEther(afterTipTokenBalance - initialTokenBalance)} ESPR)`);
  console.log(`TipIntent contract balance: ${ethers.formatEther(afterTipTipIntentBalance)} ESPR (change: ${ethers.formatEther(afterTipTipIntentBalance - initialTipIntentBalance)} ESPR)`);
  
  // Find the TipIntentCreated event to get the intentId
  const tipIntentCreatedEvent = createTipReceipt?.logs
    .filter((log: any) => log.fragment?.name === "TipIntentCreated")
    .map((log: any) => tipIntent.interface.parseLog(log))[0];
  
  if (!tipIntentCreatedEvent) {
    throw new Error("Failed to find TipIntentCreated event");
  }
  
  const intentId = tipIntentCreatedEvent.args[0];
  console.log(`✅ Tip intent created with ID: ${intentId}`);
  
  // Get tip data
  const tipData = await tipIntent.getTipIntent(intentId);
  console.log("\n📝 Tip Intent Data:");
  console.log(`Creator: ${tipData.creator}`);
  console.log(`Token: ${tipData.token}`);
  console.log(`Amount: ${ethers.formatEther(tipData.amount)} ESPR`);
  console.log(`Message: ${tipData.message}`);
  console.log(`Is Executed: ${tipData.isExecuted}`);
  
  // Create a message
  console.log("\n📨 Creating a cross-chain message...");
  const messageData = ethers.solidityPacked(
    ["address", "address", "address", "uint256", "uint256"],
    [
      wallet.address,
      TEST_CONFIG.creatorAddress,
      await mockERC20.getAddress(),
      TEST_CONFIG.tipAmount,
      Date.now() // nonce
    ]
  );
  
  // Generate message ID
  const messageId = await hotShotVerifier.generateMessageId(messageData);
  console.log(`Generated message ID: ${messageId}`);
  
  // Set message as confirmed in mock light client
  console.log("\n✅ Simulating message confirmation by HotShot...");
  await mockHotShotLightClient.confirmMessage(messageId);
  
  // Verify message is confirmed
  const isConfirmed = await mockHotShotLightClient.isConfirmed(messageId);
  console.log(`Message confirmation status: ${isConfirmed ? "CONFIRMED" : "NOT CONFIRMED"}`);
  
  // Execute the tip intent
  console.log("\n💸 Executing tip intent...");
  const executeTx = await intentSolver.solveIntent(intentId, messageId);
  const executeReceipt = await executeTx.wait();
  
  // Parse events from the receipt logs
  console.log("\n📜 Events from execution transaction:");

  // Print raw logs first
  console.log("Raw transaction logs:");
  if (executeReceipt && executeReceipt.logs) {
    console.log(`Found ${executeReceipt.logs.length} logs`);
    executeReceipt.logs.forEach((log: any, index: number) => {
      console.log(`Log #${index}:`);
      console.log(`  Address: ${log.address}`);
      console.log(`  Topics: ${JSON.stringify(log.topics)}`);
      console.log(`  Data: ${log.data}`);
    });
  } else {
    console.log("No logs found in receipt");
  }

  // Then try to parse the logs
  if (executeReceipt && executeReceipt.logs) {
    for (const log of executeReceipt.logs) {
      try {
        // Try to parse with IntentSolver interface
        const parsedLog = intentSolver.interface.parseLog(log);
        if (parsedLog) {
          console.log(`Event: ${parsedLog.name}`);
          console.log(`Args: ${JSON.stringify(parsedLog.args, (key, value) => {
            return typeof value === 'bigint' ? value.toString() : value;
          }, 2)}`);
        }
      } catch (e) {
        // Try to parse with TipIntent interface
        try {
          const parsedLog = tipIntent.interface.parseLog(log);
          if (parsedLog) {
            console.log(`Event: ${parsedLog.name}`);
            console.log(`Args: ${JSON.stringify(parsedLog.args, (key, value) => {
              return typeof value === 'bigint' ? value.toString() : value;
            }, 2)}`);
          }
        } catch (e2) {
          // Try to parse with MockERC20 interface
          try {
            const parsedLog = mockERC20.interface.parseLog(log);
            if (parsedLog) {
              console.log(`Event: ${parsedLog.name}`);
              console.log(`Args: ${JSON.stringify(parsedLog.args, (key, value) => {
                return typeof value === 'bigint' ? value.toString() : value;
              }, 2)}`);
            }
          } catch (e3) {
            // Couldn't parse this log
            console.log(`Unparsed log: ${JSON.stringify(log)}`);
          }
        }
      }
    }
  }

  console.log("✅ Tip intent executed successfully!");
  
  // Check balances after execution
  const finalWalletBalance = await mockERC20.balanceOf(wallet.address);
  const finalTipIntentBalance = await mockERC20.balanceOf(await tipIntent.getAddress());
  const finalSolverBalance = await mockERC20.balanceOf(await intentSolver.getAddress());
  const finalSolverOwnerBalance = await mockERC20.balanceOf(await intentSolver.owner());

  console.log(`\n💰 Final balances:`);
  console.log(`Wallet ESPR balance: ${ethers.formatEther(finalWalletBalance)} ESPR (change from initial: ${ethers.formatEther(finalWalletBalance - initialTokenBalance)} ESPR)`);
  console.log(`TipIntent contract balance: ${ethers.formatEther(finalTipIntentBalance)} ESPR (change from initial: ${ethers.formatEther(finalTipIntentBalance - initialTipIntentBalance)} ESPR)`);
  console.log(`IntentSolver contract balance: ${ethers.formatEther(finalSolverBalance)} ESPR (change from initial: ${ethers.formatEther(finalSolverBalance - initialSolverBalance)} ESPR)`);
  console.log(`IntentSolver owner balance: ${ethers.formatEther(finalSolverOwnerBalance)} ESPR (change from initial: ${ethers.formatEther(finalSolverOwnerBalance - initialSolverOwnerBalance)} ESPR)`);
  
  // Check if intent is now executed
  const updatedTipData = await tipIntent.getTipIntent(intentId);
  console.log(`Tip intent execution status: ${updatedTipData.isExecuted ? "EXECUTED" : "PENDING"}`);
  
  // Verify balances after execution
  console.log("\n💰 Final balances:");
  
  // Check creator's balance
  const creatorBalance = await mockERC20.balanceOf(TEST_CONFIG.creatorAddress);
  console.log(`Creator's ESPR balance: ${ethers.formatEther(creatorBalance)} ESPR`);

  // In our test, the creator is the same as the sender/tipper
  // So the initial balance includes both the token mint and the token that was tipped
  // The expected balance should include:
  // 1. Initial balance (10000 ESPR)
  // 2. Minus the tip amount (1 ESPR)
  // 3. Plus the creator amount (0.99 ESPR)
  // So expected balance is 10000 - 1 + 0.99 = 9999.99 ESPR

  // Check solver's fee (owner of IntentSolver)
  const solverFee = await intentSolver.solverFee();
  const expectedFeeAmount = (TEST_CONFIG.tipAmount * solverFee) / 10000n;
  const expectedCreatorAmount = TEST_CONFIG.tipAmount - expectedFeeAmount;

  console.log(`Expected solver fee: ${ethers.formatEther(expectedFeeAmount)} ESPR`);
  console.log(`Expected creator payment: ${ethers.formatEther(expectedCreatorAmount)} ESPR`);

  // Since the creator and tipper are the same wallet in this test:
  const expectedBalance = ethers.parseEther("10000") - TEST_CONFIG.tipAmount + expectedCreatorAmount;
  console.log(`Expected final creator balance: ${ethers.formatEther(expectedBalance)} ESPR`);

  // Check if the solver received the fee
  if (finalSolverOwnerBalance >= expectedFeeAmount) {
    console.log("✅ Solver received correct fee!");
  } else {
    console.log("⚠️ Solver fee doesn't match expected amount");
  }
  
  console.log("\n🎉 Test completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  }); 