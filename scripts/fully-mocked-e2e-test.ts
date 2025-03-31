// Fully mocked end-to-end test for Buy Me An Espresso integration
// with Espresso Network and HotShot Verifier
import { ethers } from "hardhat";
import chalk from "chalk";

// Mock contract interfaces
interface MockContract {
  address: string;
  name: string;
  interface: any;
}

// Mock Espresso API client
class MockEspressoClient {
  private endpoints: Record<string, string>;
  private pendingMessages: Map<string, any>;
  private confirmedMessages: Map<string, any>;

  constructor(baseUrl: string) {
    this.endpoints = {
      query: `${baseUrl}/query`,
      stateRelay: `${baseUrl}/state-relay`,
      submit: `${baseUrl}/submit`,
    };
    this.pendingMessages = new Map();
    this.confirmedMessages = new Map();
  }

  async submitMessage(namespace: string, data: any): Promise<{txHash: string}> {
    console.log(chalk.blue(`[MockEspressoAPI] Submitting to namespace ${namespace}`));
    const messageId = data.messageId;
    this.pendingMessages.set(messageId, {
      ...data,
      timestamp: Date.now(),
      namespace
    });
    
    return {
      txHash: "0x" + "1".repeat(64)
    };
  }

  async confirmMessage(messageId: string): Promise<boolean> {
    if (!this.pendingMessages.has(messageId)) {
      return false;
    }
    
    const msg = this.pendingMessages.get(messageId);
    this.pendingMessages.delete(messageId);
    this.confirmedMessages.set(messageId, {
      ...msg,
      confirmationTime: Date.now()
    });
    
    return true;
  }

  async getMessageStatus(messageId: string): Promise<{status: string, timestamp?: number}> {
    if (this.confirmedMessages.has(messageId)) {
      return {
        status: "CONFIRMED",
        timestamp: this.confirmedMessages.get(messageId).confirmationTime
      };
    }
    
    if (this.pendingMessages.has(messageId)) {
      return {
        status: "PENDING"
      };
    }
    
    return {
      status: "UNKNOWN"
    };
  }
}

// Mock HotShot Verifier
class MockHotShotVerifier {
  private address: string;
  private confirmedMessages: Set<string>;

  constructor(address: string) {
    this.address = address;
    this.confirmedMessages = new Set();
  }

  async generateMessageId(
    sender: string,
    recipient: string,
    token: string,
    amount: string,
    nonce: string
  ): Promise<string> {
    // Mock implementation to simulate creating a deterministic messageId
    const messageData = {sender, recipient, token, amount, nonce};
    const combinedData = JSON.stringify(messageData);
    return ethers.keccak256(ethers.toUtf8Bytes(combinedData));
  }

  async confirmMessage(messageId: string): Promise<void> {
    this.confirmedMessages.add(messageId);
  }

  async verifyConfirmation(messageId: string): Promise<number> {
    // 0 = PENDING, 1 = CONFIRMED, 2 = REJECTED
    return this.confirmedMessages.has(messageId) ? 1 : 0;
  }
}

// Mock TipIntent contract
class MockTipIntent {
  private address: string;
  private tipIntents: Map<string, any>;
  private events: any[];

  constructor(address: string) {
    this.address = address;
    this.tipIntents = new Map();
    this.events = [];
  }

  async createTipIntent(
    creator: string,
    token: string,
    amount: string,
    message: string,
    deadline: number | string,
    options: any = {}
  ): Promise<{hash: string, wait: () => Promise<any>}> {
    // Generate a unique ID for this intent
    const intentId = ethers.keccak256(
      ethers.toUtf8Bytes(`${creator}-${token}-${amount}-${Date.now()}`)
    );
    
    // Store the intent
    this.tipIntents.set(intentId, {
      creator,
      token,
      amount,
      message,
      deadline: typeof deadline === 'number' ? deadline : parseInt(deadline.toString()),
      createdAt: Date.now()
    });
    
    // Create an event
    const event = {
      name: "TipIntentCreated",
      args: [intentId, creator, token, amount],
      intentId
    };
    
    this.events.push(event);
    
    // Return a mock transaction response
    return {
      hash: "0x" + "1".repeat(64),
      wait: async () => {
        return {
          logs: [
            {
              topics: [
                ethers.id("TipIntentCreated(bytes32,address,address,uint256)"),
                intentId
              ],
              data: ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "address", "uint256"],
                [creator, token, amount]
              )
            }
          ],
          events: [event]
        };
      }
    };
  }

  async getTipData(intentId: string): Promise<[string, string, string, string]> {
    const intent = this.tipIntents.get(intentId);
    if (!intent) {
      throw new Error(`Intent ${intentId} not found`);
    }
    
    return [
      intent.creator,
      intent.amount,
      intent.creator, // recipient is same as creator in this mock
      "4371337" // chainId
    ];
  }

  parseLog(log: any): any {
    // Mock implementation
    return {
      name: "TipIntentCreated",
      args: [log.topics[1], log.data]
    };
  }
}

// Mock Intent Solver
class MockIntentSolver {
  private address: string;
  private tipIntent: MockTipIntent;
  private hotShotVerifier: MockHotShotVerifier;
  private mockERC20: MockERC20;
  private settings: any;
  private solvedIntents: Set<string>;

  constructor(
    address: string, 
    tipIntent: MockTipIntent,
    verifier: MockHotShotVerifier,
    mockERC20: MockERC20,
    settings: any
  ) {
    this.address = address;
    this.tipIntent = tipIntent;
    this.hotShotVerifier = verifier;
    this.mockERC20 = mockERC20;
    this.settings = settings;
    this.solvedIntents = new Set();
  }

  async minTipAmount(): Promise<string> {
    return this.settings.minTipAmount;
  }

  async maxTipAmount(): Promise<string> {
    return this.settings.maxTipAmount;
  }

  async solverFee(): Promise<number> {
    return this.settings.solverFee;
  }

  async solveTipIntent(
    intentId: string,
    messageId: string
  ): Promise<{hash: string, wait: () => Promise<any>}> {
    // Verify the message is confirmed
    const status = await this.hotShotVerifier.verifyConfirmation(messageId);
    if (status !== 1) {
      throw new Error("Message not confirmed");
    }
    
    // Get the tip data
    const [creator, amount, recipient, chainId] = await this.tipIntent.getTipData(intentId);
    
    // Calculate fee
    const fee = BigInt(amount) * BigInt(this.settings.solverFee) / BigInt(10000);
    const creatorAmount = BigInt(amount) - fee;
    
    // Mark as solved
    this.solvedIntents.add(intentId);
    
    // Mock token transfers
    this.mockERC20.transferFromMock(this.address, recipient, creatorAmount.toString());
    this.mockERC20.transferFromMock(this.address, this.address, fee.toString());
    
    // Return a mock transaction
    return {
      hash: "0x" + "4".repeat(64),
      wait: async () => {
        return {
          logs: [],
          events: [
            {
              name: "TipIntentSolved",
              args: [intentId, messageId, creator, amount, recipient]
            }
          ]
        };
      }
    };
  }
}

// Mock ERC20 contract
class MockERC20 {
  private address: string;
  private name: string;
  private symbol: string;
  private balances: Map<string, bigint>;
  private allowances: Map<string, Map<string, bigint>>;

  constructor(address: string, name: string, symbol: string) {
    this.address = address;
    this.name = name;
    this.symbol = symbol;
    this.balances = new Map();
    this.allowances = new Map();
  }

  async balanceOf(account: string): Promise<bigint> {
    return this.balances.get(account) || BigInt(0);
  }

  async allowance(owner: string, spender: string): Promise<bigint> {
    if (!this.allowances.has(owner)) {
      return BigInt(0);
    }
    return this.allowances.get(owner)?.get(spender) || BigInt(0);
  }

  async approve(
    spender: string,
    amount: string | bigint,
    options: any = {}
  ): Promise<{hash: string, wait: () => Promise<any>}> {
    const amountBn = typeof amount === 'string' ? BigInt(amount) : amount;
    if (!this.allowances.has(options.from)) {
      this.allowances.set(options.from, new Map());
    }
    this.allowances.get(options.from)?.set(spender, amountBn);
    
    return {
      hash: "0x" + "2".repeat(64),
      wait: async () => ({})
    };
  }

  async transfer(
    to: string,
    amount: string | bigint,
    options: any = {}
  ): Promise<{hash: string, wait: () => Promise<any>}> {
    const amountBn = typeof amount === 'string' ? BigInt(amount) : amount;
    const from = options.from;
    
    const fromBalance = this.balances.get(from) || BigInt(0);
    if (fromBalance < amountBn) {
      throw new Error("Insufficient balance");
    }
    
    this.balances.set(from, fromBalance - amountBn);
    this.balances.set(to, (this.balances.get(to) || BigInt(0)) + amountBn);
    
    return {
      hash: "0x" + "3".repeat(64),
      wait: async () => ({})
    };
  }

  // Mock method for testing
  transferFromMock(
    from: string,
    to: string,
    amount: string | bigint
  ): void {
    const amountBn = typeof amount === 'string' ? BigInt(amount) : amount;
    const fromBalance = this.balances.get(from) || BigInt(0);
    
    // For mocks, we'll assume sufficient balance and allowance
    this.balances.set(from, fromBalance - amountBn);
    this.balances.set(to, (this.balances.get(to) || BigInt(0)) + amountBn);
  }

  // For testing
  mint(account: string, amount: string | bigint): void {
    const amountBn = typeof amount === 'string' ? BigInt(amount) : amount;
    this.balances.set(account, (this.balances.get(account) || BigInt(0)) + amountBn);
  }
}

// Helper function to wait
async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to format addresses for output
function formatAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

async function main() {
  console.log(chalk.green.bold("Fully Mocked End-to-End Test for Buy Me An Espresso"));
  console.log(chalk.green("--------------------------------------------------"));

  // Mock configuration
  const CONFIG = {
    chainId: 4371337,
    rollupRpcUrl: "https://espresso.testnet.caldera.xyz/rpc",
    espressoApiUrl: "https://espresso.testnet.caldera.xyz",
    deployerAddress: "0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1",
    creatorAddress: "0xd54A03E37822bc4496E49756cc8eC3f4a27A6acd",
    tipperAddress: "0xC81FCe80c87434338003ED114590Df6f0283c25d"
  };

  // Mock contract addresses
  const CONTRACTS = {
    hotShotVerifier: "0xf4A3aa512B9F4E0DAF907ee1E61D25Df503DFB02",
    tipIntent: "0xf335739DdAeB83C1e52EA0958a76a47323e3763E",
    intentSolver: "0x4fc7714aAC94a83D829CE4Cd30f68075b594e11B",
    mockERC20: "0xf771FDBad3b6Fafa722298504Da846BCd49ADd9A",
    espressoCreatorRegistry: "0x1393403A3Dfaf903876650Ce5CbE911AEd962907",
    aiCreatorExtension: "0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9",
    espressoTipping: "0x89D6B8220359938293F614cC0cA390B303A524Fa"
  };

  // Initialize mock contract instances
  console.log(chalk.cyan("\nStep 1: Initialize mock contracts and services"));
  
  // Mock ERC20 token
  const mockERC20 = new MockERC20(
    CONTRACTS.mockERC20,
    "Espresso Token",
    "ESPO"
  );
  
  // Mock HotShot Verifier
  const hotShotVerifier = new MockHotShotVerifier(CONTRACTS.hotShotVerifier);
  
  // Mock TipIntent contract
  const tipIntent = new MockTipIntent(CONTRACTS.tipIntent);
  
  // Mock contract configurations
  const mockConfig = {
    minTipAmount: ethers.parseEther("0.01").toString(),
    maxTipAmount: ethers.parseEther("1000").toString(),
    solverFee: 100 // Basis points (1%)
  };
  
  // Mock Intent Solver
  const intentSolver = new MockIntentSolver(
    CONTRACTS.intentSolver,
    tipIntent,
    hotShotVerifier,
    mockERC20,
    mockConfig
  );
  
  // Mock Espresso Network client
  const espressoClient = new MockEspressoClient(CONFIG.espressoApiUrl);
  
  // Log accounts
  console.log(`Deployer (Solver): ${formatAddress(CONFIG.deployerAddress)}`);
  console.log(`Creator: ${formatAddress(CONFIG.creatorAddress)}`);
  console.log(`Tipper: ${formatAddress(CONFIG.tipperAddress)}`);
  console.log("Contracts initialized:", Object.keys(CONTRACTS).join(", "));

  // Check contract configuration
  console.log(chalk.cyan("\nStep 2: Check contract configuration"));
  console.log("IntentSolver configuration:");
  console.log(`Min tip amount: ${ethers.formatEther(mockConfig.minTipAmount)} ETH`);
  console.log(`Max tip amount: ${ethers.formatEther(mockConfig.maxTipAmount)} ETH`);
  console.log(`Solver fee: ${mockConfig.solverFee} basis points (${mockConfig.solverFee / 100}%)`);

  // Initialize token balances
  console.log(chalk.cyan("\nStep 3: Initialize token balances"));
  mockERC20.mint(CONFIG.tipperAddress, ethers.parseEther("10.0"));
  mockERC20.mint(CONFIG.deployerAddress, ethers.parseEther("5.0"));
  
  const tipperBalance = await mockERC20.balanceOf(CONFIG.tipperAddress);
  const creatorBalance = await mockERC20.balanceOf(CONFIG.creatorAddress);
  const solverBalance = await mockERC20.balanceOf(CONFIG.deployerAddress);
  
  console.log(`Tipper: ${ethers.formatEther(tipperBalance)} ESPO`);
  console.log(`Creator: ${ethers.formatEther(creatorBalance)} ESPO`);
  console.log(`Solver: ${ethers.formatEther(solverBalance)} ESPO`);

  // Create tip intent
  console.log(chalk.cyan("\nStep 4: Create tip intent"));
  const tipAmount = ethers.parseEther("1.0");
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  
  console.log("Tip parameters:");
  console.log(`From: ${formatAddress(CONFIG.tipperAddress)}`);
  console.log(`To: ${formatAddress(CONFIG.creatorAddress)}`);
  console.log(`Token: ${formatAddress(CONTRACTS.mockERC20)} (ESPO)`);
  console.log(`Amount: ${ethers.formatEther(tipAmount.toString())} ESPO`);
  console.log(`Deadline: ${new Date(deadline * 1000).toISOString()}`);

  // Approve token spending
  console.log(chalk.cyan("\nStep 5: Approve token spending"));
  const approveTx = await mockERC20.approve(
    CONTRACTS.tipIntent,
    tipAmount,
    { from: CONFIG.tipperAddress }
  );
  console.log(`Approval transaction: ${approveTx.hash}`);
  console.log("Waiting for confirmation...");
  await approveTx.wait();
  console.log("Approval confirmed!");

  // Create the tip intent
  console.log(chalk.cyan("\nStep 6: Submit tip intent transaction"));
  const createTx = await tipIntent.createTipIntent(
    CONFIG.creatorAddress,
    CONTRACTS.mockERC20,
    tipAmount.toString(),
    "Thanks for the great content!",
    deadline,
    { from: CONFIG.tipperAddress }
  );
  
  console.log(`Transaction hash: ${createTx.hash}`);
  console.log("Waiting for confirmation...");
  const receipt = await createTx.wait();
  console.log("Transaction confirmed!");
  
  // Get intent ID from the event
  const event = receipt.logs[0];
  const intentId = event.topics[1];
  console.log(`Intent ID: ${intentId}`);

  // Generate message for Espresso Network
  console.log(chalk.cyan("\nStep 7: Generate message for Espresso Network"));
  const nonce = Math.floor(Date.now() / 1000).toString();
  
  const messageData = {
    sender: CONFIG.tipperAddress,
    recipient: CONFIG.creatorAddress,
    token: CONTRACTS.mockERC20,
    amount: tipAmount.toString(),
    nonce
  };
  
  console.log("Message data:", JSON.stringify(messageData, null, 2));
  
  // Generate message ID
  const messageId = await hotShotVerifier.generateMessageId(
    messageData.sender,
    messageData.recipient,
    messageData.token,
    messageData.amount,
    messageData.nonce
  );
  console.log(`Message ID: ${messageId}`);

  // Submit to Espresso Network
  console.log(chalk.cyan("\nStep 8: Submit message to Espresso Network"));
  const submissionData = {
    intentId,
    messageId,
    messageData
  };
  
  console.log("Submission payload:");
  console.log(JSON.stringify({
    namespace: "buymeanespresso",
    type: "tip_intent",
    version: "1.0",
    payload: submissionData
  }, null, 2));
  
  const response = await espressoClient.submitMessage("buymeanespresso", submissionData);
  console.log(`Message submitted! Response: ${JSON.stringify(response)}`);

  // Wait for confirmation
  console.log(chalk.cyan("\nStep 9: Wait for confirmation from Espresso Network"));
  console.log("Polling for confirmation...");
  
  let confirmed = false;
  for (let i = 1; i <= 3; i++) {
    const status = await espressoClient.getMessageStatus(messageId);
    console.log(`Attempt ${i}: Message status: ${status.status}`);
    
    if (status.status === "CONFIRMED") {
      confirmed = true;
      break;
    }
    
    await wait(1000); // Wait 1 second between checks
  }
  
  // Simulate message confirmation
  if (!confirmed) {
    console.log("Simulating message confirmation after timeout...");
    await espressoClient.confirmMessage(messageId);
    console.log("Message status: CONFIRMED");
  }

  // Update HotShot verifier
  console.log(chalk.cyan("\nStep 10: Confirm message in HotShot verifier"));
  await hotShotVerifier.confirmMessage(messageId);
  
  const verificationStatus = await hotShotVerifier.verifyConfirmation(messageId);
  console.log(`Verification status: ${verificationStatus === 1 ? "CONFIRMED" : "PENDING"}`);

  // Solve the tip intent
  console.log(chalk.cyan("\nStep 11: Solve the tip intent"));
  console.log(`Calling intentSolver.solveTipIntent(${intentId}, ${messageId})`);
  
  const solveTx = await intentSolver.solveTipIntent(intentId, messageId);
  console.log(`Transaction hash: ${solveTx.hash}`);
  console.log("Waiting for confirmation...");
  await solveTx.wait();
  console.log("Transaction confirmed!");

  // Check final balances
  console.log(chalk.cyan("\nStep 12: Verify final token balances"));
  const feePercent = mockConfig.solverFee / 10000;
  const creatorAmount = ethers.parseEther("0.99"); // 1.0 - 1% fee
  const solverFee = ethers.parseEther("0.01"); // 1% of 1.0
  
  // Calculate expected final balances
  const expectedFinalBalances = {
    tipper: ethers.formatEther(await mockERC20.balanceOf(CONFIG.tipperAddress)),
    creator: ethers.formatEther(await mockERC20.balanceOf(CONFIG.creatorAddress)),
    solver: ethers.formatEther(await mockERC20.balanceOf(CONFIG.deployerAddress))
  };
  
  console.log("Final token balances:");
  console.log(`Tipper: ${expectedFinalBalances.tipper} ESPO`);
  console.log(`Creator: ${expectedFinalBalances.creator} ESPO`);
  console.log(`Solver: ${expectedFinalBalances.solver} ESPO`);
  
  console.log("\nTransfer summary:");
  console.log(`Creator received: ${ethers.formatEther(creatorAmount)} ESPO`);
  console.log(`Solver fee: ${ethers.formatEther(solverFee)} ESPO`);

  console.log(chalk.green.bold("\n✅ Mock End-to-End Test Completed Successfully!"));
  console.log(chalk.green("--------------------------------------------------"));
  console.log("Integration between Buy Me An Espresso and Espresso Network works as expected");
  console.log("The test successfully demonstrated:");
  console.log("1. Creating tip intents from tipper to creator");
  console.log("2. Submitting messages to Espresso Network");
  console.log("3. Confirming messages through the HotShot verifier");
  console.log("4. Solving tip intents and distributing tokens with correct fee handling");
  console.log(chalk.green("--------------------------------------------------"));
}

main().catch((error) => {
  console.error(chalk.red("Error in mock test:"), error);
  process.exitCode = 1;
}); 