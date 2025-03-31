import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Contract ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address to, uint256 amount) external"
];

// Network configuration
const NETWORK_CONFIG = {
  chainId: 421614,
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  name: "Arbitrum Sepolia"
};

// Replace these with your newly deployed contract addresses
const CONTRACTS = {
  // These contracts remain the same
  espressoCreator: "0x1393403A3Dfaf903876650Ce5CbE911AEd962907",
  aiCreatorExtension: "0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9",
  espressoTipping: "0x89D6B8220359938293F614cC0cA390B303A524Fa",
  // Newly deployed contracts
  hotShotVerifier: "0xC7905533691239D85deA62Db342aaaaA798093E2",
  mockERC20: "0x3f1503507A731D462f497a5457db32c32122Ff73",
  tipIntent: "0xf23F4f270Bb0a736f03f28B5621F479B50e3E285",
  intentSolver: "0xa1AfC3c59ACDb074397a097d72cCf986B3EdC6cd"
};

// Load test wallets directly
async function loadTestWallets(provider: ethers.Provider) {
  const walletPath = path.join(__dirname, '../test-wallets/test-wallets.key.json');
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  
  return {
    creator: new ethers.Wallet(walletData.creator.privateKey, provider),
    tipper: new ethers.Wallet(walletData.tipper.privateKey, provider)
  };
}

async function main() {
  // Check if contract addresses are set
  if (!CONTRACTS.hotShotVerifier || !CONTRACTS.mockERC20 || !CONTRACTS.tipIntent || !CONTRACTS.intentSolver) {
    console.error('ERROR: Please update the contract addresses in the script after deployment.');
    process.exit(1);
  }

  // Create provider
  const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  
  // Load test wallets
  const wallets = await loadTestWallets(provider);
  
  console.log('\nStarting fixed contract tests on', NETWORK_CONFIG.name);
  console.log('----------------------------------------');
  console.log('Creator wallet:', wallets.creator.address);
  console.log('Tipper wallet:', wallets.tipper.address);

  // Check wallet balances
  await checkWalletBalances(wallets, provider);

  try {
    // Test the cross-chain tipping flow with our fixed contracts
    await testFixedCrossChainTipping(wallets.creator, wallets.tipper);
    
    console.log('\nAll tests completed successfully! 🎉');
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

async function checkWalletBalances(
  wallets: { creator: ethers.Wallet; tipper: ethers.Wallet },
  provider: ethers.Provider
) {
  for (const [role, wallet] of Object.entries(wallets)) {
    const balance = await provider.getBalance(wallet.address);
    console.log(`${role} wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.01")) {
      console.warn(`WARNING: ${role} wallet has low balance. Consider funding it with more ETH.`);
    }
  }
}

async function testFixedCrossChainTipping(creatorWallet: ethers.Wallet, tipperWallet: ethers.Wallet) {
  console.log('\nTesting Fixed Cross-chain Tipping...');

  // Setup contracts
  const mockToken = new ethers.Contract(CONTRACTS.mockERC20, ERC20_ABI, tipperWallet);
  const tipIntent = new ethers.Contract(
    CONTRACTS.tipIntent,
    [
      "function createTipIntent(address creator, address token, uint256 amount, string memory message, uint256 deadline) external returns (bytes32)",
      "function getTipIntent(bytes32 intentId) external view returns (tuple(address creator, address tipper, address token, uint256 amount, string message, uint256 chainId))",
      "function cancelTipIntent(bytes32 intentId) external"
    ],
    tipperWallet
  );

  const hotShotVerifier = new ethers.Contract(
    CONTRACTS.hotShotVerifier,
    [
      "function generateMessageId(address sender, address recipient, address token, uint256 amount, uint256 nonce) external pure returns (bytes32)"
    ],
    tipperWallet
  );

  // Mint tokens to tipper if needed
  const tipperBalance = await mockToken.balanceOf(tipperWallet.address);
  if (tipperBalance < ethers.parseEther("10")) {
    console.log('Minting tokens to tipper...');
    const mintTx = await mockToken.mint(tipperWallet.address, ethers.parseEther("1000"));
    await mintTx.wait();
    console.log('Minted 1000 tokens to tipper');
  } else {
    console.log('Tipper already has tokens:', ethers.formatEther(tipperBalance));
  }

  // Check and approve tokens for TipIntent
  const currentAllowance = await mockToken.allowance(tipperWallet.address, CONTRACTS.tipIntent);
  if (currentAllowance < ethers.parseEther("5")) {
    console.log('Approving tokens for cross-chain tipping...');
    const approveTx = await mockToken.approve(CONTRACTS.tipIntent, ethers.MaxUint256);
    await approveTx.wait();
    console.log('Approved tokens for cross-chain tipping');
  } else {
    console.log('Tokens already approved for cross-chain tipping');
  }

  // Create tip intent
  console.log('Creating tip intent...');
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const tipAmount = ethers.parseEther("1");
  const createTx = await tipIntent.createTipIntent(
    creatorWallet.address,
    CONTRACTS.mockERC20,
    tipAmount,
    "Cross-chain test tip!",
    deadline
  );
  const receipt = await createTx.wait();
  
  // Get intentId from events
  const intentId = receipt?.logs[0]?.topics[1];
  if (!intentId) throw new Error('Could not extract intentId from transaction');
  console.log('Created tip intent:', intentId);

  // Verify intent
  const intent = await tipIntent.getTipIntent(intentId);
  console.log('Tip intent details:');
  console.log('- Creator:', intent.creator);
  console.log('- Tipper:', intent.tipper);
  console.log('- Token:', intent.token);
  console.log('- Amount:', ethers.formatEther(intent.amount));
  console.log('- Message:', intent.message);
  console.log('- ChainId:', intent.chainId.toString());
  
  if (intent.creator !== creatorWallet.address) throw new Error('Intent creation failed - wrong creator');
  if (intent.token !== CONTRACTS.mockERC20) throw new Error('Intent creation failed - wrong token');
  console.log('Cross-chain tip intent verified ✅');
  
  // Create a mock message ID (in a real scenario, this would be provided by HotShot)
  const nonce = ethers.getBytes(ethers.randomBytes(32))[0]; // Random nonce
  const messageId = await hotShotVerifier.generateMessageId(
    tipperWallet.address,
    creatorWallet.address,
    CONTRACTS.mockERC20,
    tipAmount,
    nonce
  );
  console.log('Generated message ID:', messageId);
  
  // We can't test execution since we'd need a real HotShot confirmation
  console.log('\nCross-chain tipping test completed ✅');
  console.log('Note: Execution not tested as it requires HotShot confirmation');
  
  // Clean up by cancelling the intent
  try {
    console.log('Cancelling test intent...');
    const cancelTx = await tipIntent.cancelTipIntent(intentId);
    await cancelTx.wait();
    console.log('Cancelled test intent successfully');
  } catch (error) {
    console.warn('Failed to cancel test intent:', error);
  }
}

// Run tests
main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 