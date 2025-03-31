import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface WalletData {
  address: string;
  privateKey: string;
}

interface TestWallets {
  creator: WalletData;
  tipper: WalletData;
}

async function main() {
  // Create provider
  const provider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
  
  // Create signer from private key in .env
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  // Load test wallets
  const walletPath = path.join(__dirname, '../test-wallets/test-wallets.key.json');
  if (!fs.existsSync(walletPath)) {
    throw new Error('Test wallets not found. Please run test-deployed.ts first to generate wallets.');
  }
  
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8')) as TestWallets;
  
  // Fund each wallet with 0.1 ETH
  const fundAmount = ethers.parseEther("0.1");
  
  console.log('\nFunding test wallets...');
  
  for (const [role, wallet] of Object.entries(walletData)) {
    console.log(`\nFunding ${role} wallet: ${wallet.address}`);
    
    const tx = await signer.sendTransaction({
      to: wallet.address,
      value: fundAmount
    });
    
    console.log('Transaction hash:', tx.hash);
    await tx.wait();
    console.log(`Successfully funded ${role} wallet with 0.1 ETH`);
  }
  
  console.log('\nAll wallets funded successfully! 🎉');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 