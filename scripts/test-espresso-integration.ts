import { ethers } from "hardhat";

async function main() {
  // Deployed contract addresses with real Espresso integration
  const CONTRACTS = {
    hotShotVerifier: "0xf4A3aa512B9F4E0DAF907ee1E61D25Df503DFB02",
    tipIntent: "0xf335739DdAeB83C1e52EA0958a76a47323e3763E",
    intentSolver: "0x4fc7714aAC94a83D829CE4Cd30f68075b594e11B",
    mockERC20: "0x3f1503507A731D462f497a5457db32c32122Ff73" // Kept for testing purposes
  };
  
  // Light client address
  const LIGHT_CLIENT = "0x08d16cb8243b3e172dddcdf1a1a5dacca1cd7098";
  
  console.log("Testing Espresso Network Integration");
  console.log("-----------------------------------------");
  console.log("HotShotVerifier:", CONTRACTS.hotShotVerifier);
  console.log("Light Client:", LIGHT_CLIENT);
  
  // Load the HotShotVerifier contract
  const hotShotVerifier = await ethers.getContractAt("HotShotVerifier", CONTRACTS.hotShotVerifier);
  
  // Get the light client address from the contract to verify it's pointing to the right one
  const lightClientAddress = await hotShotVerifier.hotshot();
  console.log("\nLight client address from contract:", lightClientAddress);
  console.log("Should match:", LIGHT_CLIENT);
  console.log("Matches expected address:", lightClientAddress.toLowerCase() === LIGHT_CLIENT.toLowerCase() ? "✅ Yes" : "❌ No");
  
  // Get status constants
  const STATUS_PENDING = await hotShotVerifier.STATUS_PENDING();
  const STATUS_CONFIRMED = await hotShotVerifier.STATUS_CONFIRMED();
  const STATUS_REJECTED = await hotShotVerifier.STATUS_REJECTED();
  
  console.log("\nStatus Constants:");
  console.log("PENDING:", STATUS_PENDING);
  console.log("CONFIRMED:", STATUS_CONFIRMED);
  console.log("REJECTED:", STATUS_REJECTED);
  
  // Generate a test message ID
  const [deployer] = await ethers.getSigners();
  const sender = deployer.address;
  const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Test recipient
  const token = CONTRACTS.mockERC20;
  const amount = ethers.parseEther("1.0");
  const nonce = Math.floor(Math.random() * 1000000);
  
  console.log("\nGenerating test message ID with parameters:");
  console.log("Sender:", sender);
  console.log("Recipient:", recipient);
  console.log("Token:", token);
  console.log("Amount:", ethers.formatEther(amount), "tokens");
  console.log("Nonce:", nonce);
  
  const messageId = await hotShotVerifier.generateMessageId(
    sender,
    recipient,
    token,
    amount,
    nonce
  );
  
  console.log("\nGenerated Message ID:", messageId);
  
  // Check confirmation status from the Espresso light client
  console.log("\nChecking confirmation status...");
  try {
    const status = await hotShotVerifier.verifyConfirmation(messageId);
    console.log("Status code:", status);
    
    if (status == STATUS_PENDING) {
      console.log("Message is PENDING");
    } else if (status == STATUS_CONFIRMED) {
      console.log("Message is CONFIRMED");
    } else if (status == STATUS_REJECTED) {
      console.log("Message is REJECTED");
    } else {
      console.log("Unknown status");
    }
  } catch (error) {
    console.error("Error checking confirmation status:", error);
  }
  
  console.log("\nThis test message is not expected to be confirmed because it hasn't been submitted to the Espresso Network.");
  console.log("To fully test with real confirmations, you would need to:");
  console.log("1. Create a tip intent");
  console.log("2. Generate a message ID");
  console.log("3. Submit it to the Espresso Network");
  console.log("4. Wait for confirmation");
  console.log("5. Solve the intent once confirmed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 