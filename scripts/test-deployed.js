"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ethers_1 = require("ethers");
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
// Contract ABIs
var ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount) external"
];
// Network configuration
var NETWORK_CONFIG = {
    chainId: 421614,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    name: "Arbitrum Sepolia"
};
// Contract addresses from contract-endpoints.md
var CONTRACTS = {
    espressoCreator: "0x1393403A3Dfaf903876650Ce5CbE911AEd962907",
    aiCreatorExtension: "0xC4ea5b98A68d2e52c4df183bD956F3BB295Ba7C9",
    espressoTipping: "0x89D6B8220359938293F614cC0cA390B303A524Fa",
    mockERC20: "0x252CAD43f438c5b79f46fa4140E325505B8fA294",
    tipIntent: "0xdC6ee9504004F1cafB175B3A7840b3F324bd85EB",
    intentSolver: "0x3Dd111577c07c05DA8Ba9F2b8C9dc9A023E511A3"
};
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var provider, walletDir, wallets, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    provider = new ethers_1.ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
                    walletDir = path.join(__dirname, '../test-wallets');
                    if (!fs.existsSync(walletDir)) {
                        fs.mkdirSync(walletDir);
                    }
                    return [4 /*yield*/, generateTestWallets(provider)];
                case 1:
                    wallets = _a.sent();
                    console.log('\nStarting tests on', NETWORK_CONFIG.name);
                    console.log('----------------------------------------');
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 7]);
                    // Test EspressoCreator contract
                    return [4 /*yield*/, testEspressoCreator(wallets.creator)];
                case 3:
                    // Test EspressoCreator contract
                    _a.sent();
                    // Test MockERC20 and Tipping
                    return [4 /*yield*/, testTipping(wallets.creator, wallets.tipper)];
                case 4:
                    // Test MockERC20 and Tipping
                    _a.sent();
                    // Test Cross-chain Tipping
                    return [4 /*yield*/, testCrossChainTipping(wallets.creator, wallets.tipper)];
                case 5:
                    // Test Cross-chain Tipping
                    _a.sent();
                    console.log('\nAll tests completed successfully! 🎉');
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error('\nTest failed:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function generateTestWallets(provider) {
    return __awaiter(this, void 0, void 0, function () {
        var walletPath, walletData_1, creator, tipper, walletData;
        return __generator(this, function (_a) {
            walletPath = path.join(__dirname, '../test-wallets/test-wallets.key.json');
            if (fs.existsSync(walletPath)) {
                walletData_1 = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
                return [2 /*return*/, {
                        creator: new ethers_1.ethers.Wallet(walletData_1.creator.privateKey, provider),
                        tipper: new ethers_1.ethers.Wallet(walletData_1.tipper.privateKey, provider)
                    }];
            }
            creator = ethers_1.ethers.Wallet.createRandom().connect(provider);
            tipper = ethers_1.ethers.Wallet.createRandom().connect(provider);
            walletData = {
                creator: {
                    address: creator.address,
                    privateKey: creator.privateKey
                },
                tipper: {
                    address: tipper.address,
                    privateKey: tipper.privateKey
                }
            };
            fs.writeFileSync(walletPath, JSON.stringify(walletData, null, 2));
            console.log('Generated new test wallets:', {
                creator: creator.address,
                tipper: tipper.address
            });
            return [2 /*return*/, { creator: creator, tipper: tipper }];
        });
    });
}
function testEspressoCreator(creatorWallet) {
    return __awaiter(this, void 0, void 0, function () {
        var contract, username, tx, isCreator, profile;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\nTesting EspressoCreator contract...');
                    contract = new ethers_1.ethers.Contract(CONTRACTS.espressoCreator, [
                        "function createProfile(string memory username, string memory displayName, string memory bio, string memory profileImage) external",
                        "function isCreator(address creator) external view returns (bool)",
                        "function getProfile(address creator) external view returns (tuple(string username, string displayName, string bio, string profileImage, bool isVerified))"
                    ], creatorWallet);
                    username = "test_".concat(Date.now());
                    return [4 /*yield*/, contract.createProfile(username, "Test Creator", "Test bio", "ipfs://test")];
                case 1:
                    tx = _a.sent();
                    return [4 /*yield*/, tx.wait()];
                case 2:
                    _a.sent();
                    console.log('Created profile:', username);
                    return [4 /*yield*/, contract.isCreator(creatorWallet.address)];
                case 3:
                    isCreator = _a.sent();
                    if (!isCreator)
                        throw new Error('Profile creation failed');
                    return [4 /*yield*/, contract.getProfile(creatorWallet.address)];
                case 4:
                    profile = _a.sent();
                    console.log('Profile verified:', profile);
                    return [2 /*return*/];
            }
        });
    });
}
function testTipping(creatorWallet, tipperWallet) {
    return __awaiter(this, void 0, void 0, function () {
        var mockToken, mintTx, tipping, approveTx, tipAmount, tipTx, tipBalance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\nTesting Tipping functionality...');
                    mockToken = new ethers_1.ethers.Contract(CONTRACTS.mockERC20, ERC20_ABI, tipperWallet);
                    return [4 /*yield*/, mockToken.mint(tipperWallet.address, ethers_1.ethers.parseEther("1000"))];
                case 1:
                    mintTx = _a.sent();
                    return [4 /*yield*/, mintTx.wait()];
                case 2:
                    _a.sent();
                    console.log('Minted tokens to tipper');
                    tipping = new ethers_1.ethers.Contract(CONTRACTS.espressoTipping, [
                        "function tipToken(address creator, address token, uint256 amount, string memory message) external",
                        "function getTokenTips(address creator, address token) external view returns (uint256)"
                    ], tipperWallet);
                    return [4 /*yield*/, mockToken.approve(CONTRACTS.espressoTipping, ethers_1.ethers.MaxUint256)];
                case 3:
                    approveTx = _a.sent();
                    return [4 /*yield*/, approveTx.wait()];
                case 4:
                    _a.sent();
                    console.log('Approved tokens for tipping');
                    tipAmount = ethers_1.ethers.parseEther("10");
                    return [4 /*yield*/, tipping.tipToken(creatorWallet.address, CONTRACTS.mockERC20, tipAmount, "Test tip!")];
                case 5:
                    tipTx = _a.sent();
                    return [4 /*yield*/, tipTx.wait()];
                case 6:
                    _a.sent();
                    console.log('Sent tip of', ethers_1.ethers.formatEther(tipAmount), 'tokens');
                    return [4 /*yield*/, tipping.getTokenTips(creatorWallet.address, CONTRACTS.mockERC20)];
                case 7:
                    tipBalance = _a.sent();
                    if (tipBalance !== tipAmount)
                        throw new Error('Tip amount mismatch');
                    console.log('Tip verified in contract');
                    return [2 /*return*/];
            }
        });
    });
}
function testCrossChainTipping(creatorWallet, tipperWallet) {
    return __awaiter(this, void 0, void 0, function () {
        var mockToken, tipIntent, approveTx, deadline, createTx, receipt, event, intentId, intent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\nTesting Cross-chain Tipping...');
                    mockToken = new ethers_1.ethers.Contract(CONTRACTS.mockERC20, ERC20_ABI, tipperWallet);
                    tipIntent = new ethers_1.ethers.Contract(CONTRACTS.tipIntent, [
                        "function createTipIntent(address creator, address token, uint256 amount, string memory message, uint256 deadline) external returns (bytes32)",
                        "function getTipIntent(bytes32 intentId) external view returns (tuple(address creator, address tipper, address token, uint256 amount, string message, uint256 deadline, uint256 nonce, uint8 status))"
                    ], tipperWallet);
                    return [4 /*yield*/, mockToken.approve(CONTRACTS.tipIntent, ethers_1.ethers.MaxUint256)];
                case 1:
                    approveTx = _a.sent();
                    return [4 /*yield*/, approveTx.wait()];
                case 2:
                    _a.sent();
                    console.log('Approved tokens for cross-chain tipping');
                    deadline = Math.floor(Date.now() / 1000) + 3600;
                    return [4 /*yield*/, tipIntent.createTipIntent(creatorWallet.address, CONTRACTS.mockERC20, ethers_1.ethers.parseEther("5"), "Cross-chain test tip!", deadline)];
                case 3:
                    createTx = _a.sent();
                    return [4 /*yield*/, createTx.wait()];
                case 4:
                    receipt = _a.sent();
                    event = receipt.logs[0];
                    intentId = event.topics[1];
                    console.log('Created tip intent:', intentId);
                    return [4 /*yield*/, tipIntent.getTipIntent(intentId)];
                case 5:
                    intent = _a.sent();
                    if (intent.creator !== creatorWallet.address)
                        throw new Error('Intent creation failed');
                    console.log('Cross-chain tip intent verified');
                    return [2 /*return*/];
            }
        });
    });
}
// Run tests
main().catch(function (error) {
    console.error(error);
    process.exit(1);
});
