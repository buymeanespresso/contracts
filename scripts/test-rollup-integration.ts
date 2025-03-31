import { ethers } from "hardhat";
import axios from "axios";

// Rollup Configuration
const ROLLUP_CONFIG = {
  rpcUrl: "http://34.31.168.162:8547",
  chainId: 4371337, // Espresso Network Chain ID
  ownerWallet: "0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1",
  hotShotLightClient: "0x08d16cb8243b3e172dddcdf1a1a5dacca1cd7098" // Arbitrum Sepolia
};

// Espresso Network API endpoints
const ESPRESSO_ENDPOINTS = {
  query: "http://34.31.168.162:8770/v0",
  stateRelay: "http://34.31.168.162:8770/v0",
  submit: "http://34.31.168.162:8770/v0"
};

// Deployed contract addresses - to be filled after deployment
const CONTRACTS = {
  // Core infrastructure
  hotShotVerifier: "", // Will be deployed
  tipIntent: "",       // Will be deployed
  intentSolver: "",    // Will be deployed
  mockERC20: "",       // Will be deployed
  
  // Application contracts
  espressoCreatorRegistry: "", // Will be deployed
  aiCreatorExtension: "",      // Will be deployed
  espressoTipping: "",         // Will be deployed
  espressoMembership: ""       // Will be deployed
};

async function main() {
  console.log("Testing Rollup Integration with Espresso Network");
  console.log("------------------------------------------------");

  // Get network
  const network = await ethers.provider.getNetwork();
  console.log("\nNetwork:", {
    name: network.name,
    chainId: network.chainId
  });

  // Make sure we're on the right network
  if (network.chainId.toString() !== ROLLUP_CONFIG.chainId.toString()) {
    console.error(`Error: Connected to wrong network. Expected chainId ${ROLLUP_CONFIG.chainId}, got ${network.chainId}`);
    process.exit(1);
  }

  // Get signers
  const [deployer, creator, tipper] = await ethers.getSigners();
  console.log("\nAccounts:");
  console.log("Deployer:", deployer.address);
  console.log("Creator:", creator.address);
  console.log("Tipper:", tipper.address);

  // Check contract addresses - for a real test we need to deploy these first
  if (!CONTRACTS.hotShotVerifier || !CONTRACTS.tipIntent || !CONTRACTS.intentSolver || !CONTRACTS.mockERC20) {
    console.log("\nWarning: Contract addresses not provided. Run deploy-rollup.ts first and update the CONTRACTS object.");
    console.log("Using hardcoded contract addresses for this test...");
    
    // These are the addresses we expect after running deploy-rollup.ts
    // Update with actual values from deployment
    CONTRACTS.hotShotVerifier = "0x8d183ED504320649AaD4e5fa717bD1e294a2f4eb";
    CONTRACTS.tipIntent = "0x9A491Ac439644Ad8fc62e851A53134d683C35851";
    CONTRACTS.intentSolver = "0x7B46B3cdBDA41AA7fd94fD2D92Db89F52Ca5A661";
    CONTRACTS.mockERC20 = "0xf771FDBad3b6Fafa722298504Da846BCd49ADd9A";
    CONTRACTS.espressoCreatorRegistry = "0x1393403A3Dfaf903876650Ce5CbE911AEd962907";
    CONTRACTS.aiCreatorExtension = "0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9";
    CONTRACTS.espressoTipping = "0x89D6B8220359938293F614cC0cA390B303A524Fa";
  }

  // Load contracts
  const hotShotVerifier = await ethers.getContractAt("HotShotVerifier", CONTRACTS.hotShotVerifier);
  const tipIntent = await ethers.getContractAt("TipIntent", CONTRACTS.tipIntent);
  const mockERC20 = await ethers.getContractAt("MockERC20", CONTRACTS.mockERC20);
  const intentSolver = await ethers.getContractAt("IntentSolver", CONTRACTS.intentSolver);

  // Check solver configuration
  console.log("\nChecking solver configuration...");
  const minTipAmount = await intentSolver.minTipAmount();
  const maxTipAmount = await intentSolver.maxTipAmount();
  const solverFee = await intentSolver.solverFee();
  console.log("Min tip amount:", ethers.formatEther(minTipAmount));
  console.log("Max tip amount:", ethers.formatEther(maxTipAmount));
  console.log("Solver fee (basis points):", solverFee);

  // Set up creator and tipper
  console.log("\nSetting up accounts for testing...");
  
  // Mint tokens for tipper
  const tipAmount = ethers.parseEther("1.0");
  let tipperBalance = await mockERC20.balanceOf(tipper.address);
  
  if (tipperBalance < tipAmount) {
    console.log("Minting tokens for tipper...");
    const mintTx = await mockERC20.connect(deployer).mint(tipper.address, tipAmount);
    await mintTx.wait();
    tipperBalance = await mockERC20.balanceOf(tipper.address);
  }
  
  console.log("Tipper token balance:", ethers.formatEther(tipperBalance));

  // Create tip intent
  console.log("\nCreating tip intent from tipper to creator...");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now as BigInt
  
  // Check and update allowance if needed
  const currentAllowance = await mockERC20.connect(tipper).allowance(tipper.address, CONTRACTS.tipIntent);
  console.log("Current allowance:", ethers.formatEther(currentAllowance));
  
  if (currentAllowance < tipAmount) {
    console.log("Approving tip amount...");
    const approveTx = await mockERC20.connect(tipper).approve(CONTRACTS.tipIntent, tipAmount);
    await approveTx.wait();
    console.log("Approved!");
  }

  // Create the tip intent
  console.log("\nCreating tip intent...");
  let intentId;
  try {
    const tx = await tipIntent.connect(tipper).createTipIntent(
      creator.address, // Send to creator
      CONTRACTS.mockERC20, // token
      tipAmount,
      "Thanks for the great content!",
      deadline,
      {
        gasLimit: 1000000
      }
    );
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction receipt not found");

    // Parse events from receipt
    const events = receipt.logs.map((log) => {
      try {
        return tipIntent.interface.parseLog({
          topics: [...log.topics],
          data: log.data
        });
      } catch (e) {
        return null;
      }
    }).filter((event) => event !== null);

    // Find TipIntentCreated event
    const tipIntentCreatedEvent = events.find((event) => event?.name === "TipIntentCreated");
    if (!tipIntentCreatedEvent) throw new Error("TipIntentCreated event not found");
    
    intentId = tipIntentCreatedEvent.args[0]; // First argument is intentId
    console.log("\nIntent ID:", intentId);
  } catch (error: any) {
    console.error("Failed to create tip intent:", error.message);
    process.exit(1);
  }

  // Submit message to Espresso Network
  console.log("\nSubmitting message to Espresso Network...");
  try {
    // Format the message data
    const messageData = {
      sender: tipper.address,
      recipient: creator.address,
      token: CONTRACTS.mockERC20,
      amount: tipAmount.toString(),
      nonce: Math.floor(Date.now() / 1000).toString()
    };
    
    // Generate message ID
    const messageId = await hotShotVerifier.generateMessageId(
      messageData.sender,
      messageData.recipient,
      messageData.token,
      messageData.amount,
      messageData.nonce
    );
    
    console.log("Message ID:", messageId);

    // Convert message data for submission
    const payload = {
      intentId: intentId.toString(),
      messageId: messageId.toString(),
      messageData
    };
    
    console.log("Submitting data:", JSON.stringify(payload, null, 2));
    
    // Submit to Espresso Network
    const response = await axios.post(
      `${ESPRESSO_ENDPOINTS.submit}/submit`,
      {
        type: "tip_intent",
        version: "1.0",
        namespace: "buymeanespresso",
        payload: Buffer.from(JSON.stringify(payload)).toString('base64')
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log("Message submitted:", response.data);

    // Poll for confirmation
    console.log("\nPolling for confirmation...");
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!confirmed && attempts < maxAttempts) {
      attempts++;
      try {
        const status = await hotShotVerifier.verifyConfirmation(messageId);
        console.log(`Attempt ${attempts}: Message status:`, 
                    status === 0 ? "PENDING" : 
                    status === 1 ? "CONFIRMED" : "REJECTED");
        
        if (status === 1) { // STATUS_CONFIRMED
          confirmed = true;
          console.log("Message confirmed!");

          // Try to solve the tip intent
          console.log("\nSolving tip intent...");
          try {
            const solveTx = await intentSolver.connect(deployer).solveTipIntent(intentId, messageId);
            const solveReceipt = await solveTx.wait();
            console.log("Tip intent solved! Transaction:", solveReceipt?.hash);
            
            // Check balances
            const creatorBalance = await mockERC20.balanceOf(creator.address);
            const deployerBalance = await mockERC20.balanceOf(deployer.address); // Solver gets fee
            
            console.log("\nFinal balances:");
            console.log("Creator received:", ethers.formatEther(creatorBalance));
            console.log("Solver fee received:", ethers.formatEther(deployerBalance));
            
            console.log("\n✅ E2E Test Completed Successfully!");
            break;
          } catch (error: any) {
            console.error("Failed to solve tip intent:", error.message);
          }
          break;
        }
      } catch (error) {
        console.error(`Error in attempt ${attempts}:`, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    if (!confirmed) {
      console.log("Message not confirmed after maximum attempts");
      console.log("\n❌ E2E Test Failed: Message confirmation timed out");
    }
  } catch (error: any) {
    console.error("Error interacting with Espresso Network:", error.message);
    if (error.response) {
      console.log("Response data:", error.response.data);
    }
    console.log("\n❌ E2E Test Failed: Espresso Network interaction error");
  }
}

main().catch((error) => {
  console.error(error);
  console.log("\n❌ E2E Test Failed: Unexpected error");
  process.exitCode = 1;
}); 