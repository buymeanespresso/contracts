import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

// Get private key from environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || "https://arbitrum-sepolia.testnet.espresso.network/";
const ROLLUP_RPC_URL = process.env.ROLLUP_RPC_URL || "http://34.31.168.162:8547";

// Restore the arbiscanApiKey variable but make it optional
const arbiscanApiKey: string = process.env.ARBISCAN_API_KEY || "";

// Add the condition for verification
if (!arbiscanApiKey && process.env.VERIFY === "true") {
  throw new Error("Please set your ARBISCAN_API_KEY in a .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    "arbitrum-sepolia": {
      url: ARBITRUM_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 421614,
    },
    "espresso-rollup": {
      url: ROLLUP_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 4371337,
      timeout: 120000, // 2 minutes
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: arbiscanApiKey
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      }
    ]
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};

export default config;