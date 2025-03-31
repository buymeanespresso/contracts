// Real end-to-end test for Buy Me An Espresso integration
// with Espresso Network and Arbitrum Orbit Rollup
import { ethers } from "hardhat";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

// Infrastructure configuration
const CONFIG = {
  // Rollup details
  chainId: 4371337,
  rollupRpcUrl: "http://34.31.168.162:8547",
  arbSepoliaRpcUrl: process.env.ARBITRUM_RPC_URL || "https://arbitrum-sepolia.testnet.espresso.network/",
  
  // Espresso Network endpoints - using Caldera API endpoints
  espressoApiUrl: {
    query: "https://espresso-sequencer-query.caldera.dev",
    stateRelay: "https://espresso-sequencer-state-relay.caldera.dev",
    submit: "https://espresso-sequencer-submit.caldera.dev"
  },

  // Contract addresses
  contracts: {
    rollupProxy: "0xCD25aa8FF5099f88E923368A3946e276C968Fb24",
    inbox: "0xc0b97c94188C101794E60946A31360e25d98955a",
    sequencerInbox: "0x2d5BC00a99cD89F6C2f79C772bEC2746f7245244",
    bridge: "0xD247616D839BE6e3D6C74a0c6044485e28567810",
    hotShotLightClient: "0x08d16cb8243b3e172dddcdf1a1a5dacca1cd7098", // On Arbitrum Sepolia
  },

  // Key wallet addresses
  accounts: {
    owner: {
      address: "0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1",
      // Don't include the private key in the script, use environment variable
    },
    validator: "0xcd544bf90AeAa458bf23452971A7B5AB349054B7",
    batchPoster: "0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8",
    creator: "0xd54A03E37822bc4496E49756cc8eC3f4a27A6acd",
    tipper: "0xC81FCe80c87434338003ED114590Df6f0283c25d"
  }
};

// Format ETH values
function formatEth(wei: bigint): string {
  return ethers.formatEther(wei);
}

// Format addresses for better readability
function formatAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

async function main() {
  console.log("\n🚀 Testing Buy Me An Espresso on Espresso-powered Arbitrum Orbit Rollup");
  console.log("=========================================================================");

  // Connect to the rollup network
  console.log(`\n📡 Connecting to Rollup RPC: ${CONFIG.rollupRpcUrl}`);
  const rollupProvider = new ethers.JsonRpcProvider(CONFIG.rollupRpcUrl);
  
  // Connect to the Arbitrum Sepolia network
  console.log(`📡 Connecting to Arbitrum Sepolia RPC: ${CONFIG.arbSepoliaRpcUrl}`);
  const arbSepoliaProvider = new ethers.JsonRpcProvider(CONFIG.arbSepoliaRpcUrl);

  // Prepare the wallet (using private key from environment variable)
  const ownerWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, rollupProvider);
  console.log(`👤 Connected with wallet: ${formatAddress(ownerWallet.address)}`);

  // Check if connected wallet matches expected owner
  if (ownerWallet.address.toLowerCase() !== CONFIG.accounts.owner.address.toLowerCase()) {
    console.warn(`⚠️  Warning: Connected wallet (${ownerWallet.address}) doesn't match the expected owner address (${CONFIG.accounts.owner.address})`);
  }

  // Step 1: Check wallet balances
  console.log("\n💰 Step 1: Checking account balances");
  
  const ownerBalance = await rollupProvider.getBalance(CONFIG.accounts.owner.address);
  console.log(`Owner balance: ${formatEth(ownerBalance)} ETH`);
  
  try {
    const creatorBalance = await rollupProvider.getBalance(CONFIG.accounts.creator);
    console.log(`Creator balance: ${formatEth(creatorBalance)} ETH`);
    
    const tipperBalance = await rollupProvider.getBalance(CONFIG.accounts.tipper);
    console.log(`Tipper balance: ${formatEth(tipperBalance)} ETH`);
  } catch (error) {
    console.error("Error fetching some balances:", error);
  }

  // Step 2: Check rollup chain information
  console.log("\n🔗 Step 2: Checking rollup chain information");
  
  try {
    // Use network method to get chain ID instead of getChainId()
    const network = await rollupProvider.getNetwork();
    const chainId = network.chainId;
    console.log(`Chain ID: ${chainId}`);
    
    const blockNumber = await rollupProvider.getBlockNumber();
    console.log(`Current block number: ${blockNumber}`);
    
    const latestBlock = await rollupProvider.getBlock("latest");
    console.log(`Latest block timestamp: ${new Date(Number(latestBlock?.timestamp || 0) * 1000).toISOString()}`);
  } catch (error) {
    console.error("Error fetching chain information:", error);
  }

  // Step 3: Check if contracts are deployed (we'll just verify we can connect to the rollup proxy)
  console.log("\n📑 Step 3: Checking contract deployment status");
  
  try {
    // Check RollupProxy code
    const rollupProxyCode = await rollupProvider.getCode(CONFIG.contracts.rollupProxy);
    if (rollupProxyCode && rollupProxyCode !== "0x") {
      console.log(`✅ RollupProxy contract deployed at ${formatAddress(CONFIG.contracts.rollupProxy)}`);
    } else {
      console.log(`❌ RollupProxy contract not found at ${formatAddress(CONFIG.contracts.rollupProxy)}`);
    }
    
    // Check Inbox code
    const inboxCode = await arbSepoliaProvider.getCode(CONFIG.contracts.inbox);
    if (inboxCode && inboxCode !== "0x") {
      console.log(`✅ Inbox contract deployed at ${formatAddress(CONFIG.contracts.inbox)}`);
    } else {
      console.log(`❌ Inbox contract not found at ${formatAddress(CONFIG.contracts.inbox)}`);
    }
  } catch (error) {
    console.error("Error checking contract deployment:", error);
  }

  // Step 4: Check if Espresso Network API is accessible
  console.log("\n☕ Step 4: Testing Espresso Network API connectivity");
  
  try {
    // Test query endpoint
    const queryResponse = await axios.get(`${CONFIG.espressoApiUrl.query}/health`);
    console.log(`Query endpoint status: ${queryResponse.status === 200 ? "✅ Available" : "❌ Error"}`);
  } catch (error) {
    console.error("Error connecting to Espresso Network Query API:", error);
    console.log("❌ Failed to connect to Query endpoint");
  }
  
  try {
    // Test state relay endpoint
    const stateRelayResponse = await axios.get(`${CONFIG.espressoApiUrl.stateRelay}/health`);
    console.log(`State Relay endpoint status: ${stateRelayResponse.status === 200 ? "✅ Available" : "❌ Error"}`);
  } catch (error) {
    console.error("Error connecting to Espresso Network State Relay API:", error);
    console.log("❌ Failed to connect to State Relay endpoint");
  }

  // Step 5: Bridge funds from Arbitrum Sepolia to the rollup if needed
  if (ownerBalance < ethers.parseEther("0.01")) {
    console.log("\n🌉 Step 5: Bridging funds from Arbitrum Sepolia to the rollup");
    console.log("Owner balance is low, attempting to bridge funds...");
    
    try {
      // Create wallet on Arbitrum Sepolia
      const arbSepoliaWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, arbSepoliaProvider);
      
      // Check balance on Arbitrum Sepolia first
      const arbSepoliaBalance = await arbSepoliaProvider.getBalance(arbSepoliaWallet.address);
      console.log(`Balance on Arbitrum Sepolia: ${formatEth(arbSepoliaBalance)} ETH`);
      
      if (arbSepoliaBalance < ethers.parseEther("0.02")) {
        console.log("❌ Insufficient funds on Arbitrum Sepolia to bridge. Please fund your account first.");
      } else {
        // Create interface for the Inbox contract to call depositEth()
        const inboxInterface = new ethers.Interface([
          "function depositEth() external payable returns (uint256)"
        ]);
        
        // Prepare transaction
        const amount = ethers.parseEther("0.01");
        console.log(`Bridging ${formatEth(amount)} ETH to the rollup...`);
        
        // Create transaction to bridge ETH
        const tx = {
          to: CONFIG.contracts.inbox,
          value: amount,
          data: inboxInterface.encodeFunctionData("depositEth", [])
        };
        
        // Send transaction
        const txResponse = await arbSepoliaWallet.sendTransaction(tx);
        console.log(`Transaction sent: ${txResponse.hash}`);
        console.log("Waiting for confirmation...");
        
        // Wait for transaction to be confirmed
        const receipt = await txResponse.wait();
        console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
        console.log("✅ Funds bridged successfully. Note: It may take some time for funds to arrive on the rollup.");
      }
    } catch (error) {
      console.error("Error bridging funds:", error);
    }
  } else {
    console.log("\n💰 Step 5: Skipping bridging as funds are sufficient");
  }

  // Step 6: Send a test transaction on the rollup
  console.log("\n📤 Step 6: Sending a test transaction on the rollup");
  
  try {
    // Only send a small amount to test
    const amount = ethers.parseEther("0.0001");
    console.log(`Sending ${formatEth(amount)} ETH to Creator address...`);
    
    // Create a simple ETH transfer transaction
    const tx = {
      to: CONFIG.accounts.creator,
      value: amount,
    };
    
    // Send transaction
    const txResponse = await ownerWallet.sendTransaction(tx);
    console.log(`Transaction sent: ${txResponse.hash}`);
    console.log("Waiting for confirmation...");
    
    // Wait for transaction to be confirmed
    const receipt = await txResponse.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    console.log("✅ Test transaction successful");
    
    // Check creator balance after transaction
    const creatorBalanceAfter = await rollupProvider.getBalance(CONFIG.accounts.creator);
    console.log(`Creator balance after transfer: ${formatEth(creatorBalanceAfter)} ETH`);
  } catch (error) {
    console.error("Error sending test transaction:", error);
  }

  console.log("\n✅ Buy Me An Espresso rollup test completed");
  console.log("=========================================================================");
  console.log("Next steps:");
  console.log("1. Deploy the TipIntent contract on your rollup");
  console.log("2. Deploy the IntentSolver contract with HotShot integration");
  console.log("3. Implement the frontend interface for tipping creators");
  console.log("=========================================================================");
}

main().catch((error) => {
  console.error("💥 Error in test:", error);
  process.exitCode = 1;
}); 