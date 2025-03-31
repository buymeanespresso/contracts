import { ethers } from "hardhat";
import { ContractTransactionResponse } from "ethers";
import axios from "axios";
import { Log } from "@ethersproject/abstract-provider";
import { LogDescription } from "@ethersproject/abi";

// Espresso Network API endpoints
const ESPRESSO_ENDPOINTS = {
  query: "http://34.31.168.162:8770/v0",
  stateRelay: "http://34.31.168.162:8770/v0",
  submit: "http://34.31.168.162:8770/v0"
};

// Network configuration
const NETWORK_CONFIG = {
  chainId: 421614,
  rpcUrl: "http://34.31.168.162:8547",
  name: "Arbitrum Sepolia Rollup"
};

// Contract addresses from verified.md
const CONTRACTS = {
  espressoCreator: "0x1393403A3Dfaf903876650Ce5CbE911AEd962907",
  aiCreatorExtension: "0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9",
  espressoTipping: "0x89D6B8220359938293F614cC0cA390B303A524Fa",
  mockERC20: "0xf771FDBad3b6Fafa722298504Da846BCd49ADd9A",
  tipIntent: "0x9A491Ac439644Ad8fc62e851A53134d683C35851",
  intentSolver: "0x7B46B3cdBDA41AA7fd94fD2D92Db89F52Ca5A661",
  hotShotVerifier: "0x8d183ED504320649AaD4e5fa717bD1e294a2f4eb"
};

async function main() {
  console.log("Testing Espresso Network API Integration");
  console.log("---------------------------------------");

  // Get network
  const network = await ethers.provider.getNetwork();
  console.log("\nNetwork:", {
    name: network.name,
    chainId: network.chainId
  });

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("\nAccounts:");
  console.log("Deployer:", deployer.address);

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

  // Create a tip intent
  console.log("\nCreating tip intent...");
  const tipAmount = ethers.parseEther("1.0");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now as BigInt

  // Check token balances
  console.log("\nChecking token balances...");
  const deployerBalance = await mockERC20.balanceOf(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(deployerBalance));

  // Mint tokens if needed
  if (deployerBalance < tipAmount) {
    console.log("Minting tokens...");
    const mintTx = await mockERC20.mint(deployer.address, tipAmount);
    await mintTx.wait();
    console.log("New balance:", ethers.formatEther(await mockERC20.balanceOf(deployer.address)));
  }

  // Check and update allowance if needed
  console.log("Checking token allowance...");
  const currentAllowance = await mockERC20.allowance(deployer.address, CONTRACTS.tipIntent);
  console.log("Current allowance:", ethers.formatEther(currentAllowance));
  
  // Helper function to wait for transaction confirmation
  async function waitForTx(tx: ContractTransactionResponse) {
    console.log(`Waiting for transaction ${tx.hash} to be confirmed...`);
    await tx.wait();
    console.log('Transaction confirmed');
  }

  // Reset allowance
  console.log('Resetting allowance...');
  const resetTx = await mockERC20.approve(CONTRACTS.tipIntent, 0);
  await waitForTx(resetTx);
  console.log('Allowance reset');

  // Approve exact amount needed
  console.log('Approving exact amount needed...');
  const approveTx = await mockERC20.approve(CONTRACTS.tipIntent, tipAmount);
  await waitForTx(approveTx);
  console.log('Amount approved');

  // Create the tip intent
  console.log("\nCreating tip intent...");
  let intentId: string;
  try {
    // Log the parameters
    console.log("Parameters:", {
      creator: deployer.address,
      token: CONTRACTS.mockERC20,
      amount: ethers.formatEther(tipAmount),
      deadline: new Date(Number(deadline) * 1000).toISOString(),
      currentTimestamp: new Date(Date.now()).toISOString()
    });

    // First try to get the revert reason using a lower-level call
    console.log("Checking for revert reason...");
    const data = tipIntent.interface.encodeFunctionData("createTipIntent", [
      deployer.address, // creator (recipient)
      CONTRACTS.mockERC20, // token
      tipAmount,
      "Thanks for the great content!",
      deadline
    ]);
    
    try {
      const result = await deployer.provider.call({
        to: CONTRACTS.tipIntent,
        data,
        from: deployer.address
      });
      console.log("Call result:", result);
    } catch (error: any) {
      console.error("Call failed:", error.message);
      if (error.data) {
        try {
          const decodedError = tipIntent.interface.parseError(error.data);
          if (decodedError) {
            console.log("Decoded error:", {
              name: decodedError.name,
              args: decodedError.args
            });
          } else {
            console.log("Could not decode error data:", error.data);
          }
        } catch (e) {
          console.log("Could not decode error data:", error.data);
        }
      }
    }

    const tx = await tipIntent.createTipIntent(
      deployer.address, // creator (recipient)
      CONTRACTS.mockERC20, // token
      tipAmount,
      "Thanks for the great content!",
      deadline,
      {
        gasLimit: 1000000 // Set a high gas limit to ensure it's not a gas issue
      }
    );
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction receipt not found");

    // Parse events from receipt
    const events = receipt.logs.map((log: Log) => {
      try {
        const parsed = tipIntent.interface.parseLog({
          topics: [...log.topics],
          data: log.data
        });
        return parsed;
      } catch (e) {
        return null;
      }
    }).filter((event: LogDescription | null): event is LogDescription => event !== null);

    // Find TipIntentCreated event
    const tipIntentCreatedEvent = events.find((event: LogDescription) => event.name === "TipIntentCreated");
    if (!tipIntentCreatedEvent) throw new Error("TipIntentCreated event not found");
    
    intentId = tipIntentCreatedEvent.args[0]; // First argument is intentId
    console.log("\nIntent ID:", intentId);
  } catch (error: any) {
    console.error("Failed to create tip intent:", error.message);
    if (error.data) {
      // Try to decode the error
      try {
        const decodedError = tipIntent.interface.parseError(error.data);
        if (decodedError) {
          console.log("Decoded error:", {
            name: decodedError.name,
            args: decodedError.args
          });
        } else {
          console.log("Could not decode error data:", error.data);
        }
      } catch (e) {
        console.log("Could not decode error data:", error.data);
      }
    }
    if (error.transaction) {
      console.log("Transaction:", {
        from: error.transaction.from,
        to: error.transaction.to,
        data: error.transaction.data?.slice(0, 100) + "..." // Show first 100 chars of data
      });
    }
    process.exit(1);
  }

  // Submit message to Espresso Network
  console.log("\nSubmitting message to Espresso Network...");
  try {
    // Format the message data
    const messageData = {
      sender: deployer.address,
      recipient: deployer.address,
      token: CONTRACTS.mockERC20,
      amount: tipAmount.toString(), // Convert BigInt to string
      nonce: Math.floor(Date.now() / 1000).toString() // Use unix timestamp as string
    };
    
    // Generate message ID
    const messageId = await hotShotVerifier.generateMessageId(
      messageData.sender,
      messageData.recipient,
      messageData.token,
      messageData.amount,
      messageData.nonce
    );

    // Convert message data for submission
    const submissionData = {
      intentId: intentId.toString(), // Convert bytes32 to string
      messageId: messageId.toString(), // Convert bytes32 to string
      messageData
    };
    
    console.log("Submitting data:", JSON.stringify(submissionData, null, 2));
    
    // Submit to Espresso Network
    const response = await axios.post(
      `${ESPRESSO_ENDPOINTS.submit}/submit`,
      {
        type: "tip_intent",
        version: "1.0",
        namespace: "buymeanespresso",
        payload: Buffer.from(JSON.stringify({
          intentId: intentId.toString(),
          messageId: messageId.toString(),
          messageData: {
            sender: deployer.address,
            recipient: deployer.address,
            token: CONTRACTS.mockERC20,
            amount: tipAmount.toString(),
            nonce: Math.floor(Date.now() / 1000).toString()
          }
        })).toString('base64')
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
      const status = await hotShotVerifier.verifyConfirmation(intentId);
      console.log(`Attempt ${attempts}: Message status:`, status === 0 ? "PENDING" : status === 1 ? "CONFIRMED" : "REJECTED");
      
      if (status === 1) { // STATUS_CONFIRMED
        confirmed = true;
        console.log("Message confirmed!");

        // Get message ID
        const messageId = await hotShotVerifier.generateMessageId(intentId);
        console.log("Message ID:", messageId);

        // Check tip data
        const tipData = await tipIntent.getTipData(intentId);
        console.log("\nTip data:", {
          creator: tipData[0],
          amount: ethers.formatEther(tipData[1]),
          recipient: tipData[2],
          chainId: tipData[3]
        });

        // Try to solve the tip intent
        console.log("\nSolving tip intent...");
        try {
          const solveTx = await intentSolver.solveTipIntent(intentId, messageId);
          const solveReceipt = await solveTx.wait();
          console.log("Tip intent solved! Transaction:", solveReceipt.hash);
        } catch (error: any) {
          console.error("Failed to solve tip intent:", error.message);
          // Try to get more details about the revert
          if (error.data) {
            console.log("Error data:", error.data);
          }
        }
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    if (!confirmed) {
      console.log("Message not confirmed after maximum attempts");
    }

  } catch (error: any) {
    console.error("Error interacting with Espresso Network:", error.message);
    if (error.response) {
      console.log("Response data:", error.response.data);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 