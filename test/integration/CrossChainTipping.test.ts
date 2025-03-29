import { expect } from "chai";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { HotShotVerifier, MockERC20, TipIntent, IntentSolver, MockHotShotLightClient } from "../../typechain-types";

describe("CrossChainTipping Integration", function () {
  // Test timeout
  this.timeout(30000);

  let hotShotVerifier: HotShotVerifier;
  let mockERC20: MockERC20;
  let tipIntent: TipIntent;
  let intentSolver: IntentSolver;
  let mockLightClient: MockHotShotLightClient;
  
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let tipper: SignerWithAddress;
  let solver: SignerWithAddress;

  const MIN_TIP = ethers.parseEther("0.01");
  const MAX_TIP = ethers.parseEther("1000");
  const SOLVER_FEE = 100; // 1%
  const TIP_AMOUNT = ethers.parseEther("1.0");
  const TARGET_CHAIN_ID = 1337; // Hardhat's chain ID from config
  const DEADLINE = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  beforeEach(async function () {
    [owner, creator, tipper, solver] = await ethers.getSigners();

    // Deploy mock light client
    const MockHotShotLightClient = await ethers.getContractFactory("MockHotShotLightClient");
    mockLightClient = await MockHotShotLightClient.deploy();

    // Deploy contracts
    const HotShotVerifier = await ethers.getContractFactory("HotShotVerifier");
    hotShotVerifier = await HotShotVerifier.deploy(await mockLightClient.getAddress());

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Test Token", "TEST");

    const TipIntent = await ethers.getContractFactory("TipIntent");
    tipIntent = await TipIntent.deploy(
      await hotShotVerifier.getAddress(),
      await mockERC20.getAddress()
    );

    const IntentSolver = await ethers.getContractFactory("IntentSolver");
    intentSolver = await IntentSolver.deploy(
      await tipIntent.getAddress(),
      await hotShotVerifier.getAddress(),
      await mockERC20.getAddress(),
      MIN_TIP,
      MAX_TIP,
      SOLVER_FEE
    );

    // Mint tokens to tipper
    await mockERC20.connect(tipper).mint(tipper.address, TIP_AMOUNT);
    // Approve TipIntent to spend tipper's tokens
    await mockERC20.connect(tipper).approve(await tipIntent.getAddress(), TIP_AMOUNT);
  });

  describe("Cross-Chain Tip Flow", function () {
    it("Should create and execute a tip intent", async function () {
      // Create tip intent
      const tx = await tipIntent.connect(tipper).createTipIntent(
        creator.address,
        TIP_AMOUNT,
        TARGET_CHAIN_ID + 1, // Different chain ID
        DEADLINE,
        "0x" // No preferences
      );
      const receipt = await tx.wait();
      const event = receipt?.logs[0]; // First event should be TipIntentCreated
      const intentId = event?.topics[1];
      expect(intentId).to.not.be.undefined;

      // Mock HotShot confirmation
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "uint256", "uint256", "bytes"],
          [creator.address, TIP_AMOUNT, TARGET_CHAIN_ID + 1, DEADLINE, "0x"]
        )
      );
      await mockLightClient.setConfirmation(messageHash, 1); // Set as confirmed

      // Execute the tip intent
      await tipIntent.connect(solver).executeTipIntent(
        intentId!,
        messageHash
      );

      // Verify balances
      const creatorBalance = await mockERC20.balanceOf(creator.address);
      expect(creatorBalance).to.equal(TIP_AMOUNT);
    });

    it("Should prevent executing invalid tip intents", async function () {
      // Create tip intent
      const tx = await tipIntent.connect(tipper).createTipIntent(
        creator.address,
        TIP_AMOUNT,
        TARGET_CHAIN_ID + 1, // Different chain ID
        DEADLINE,
        "0x" // No preferences
      );
      const receipt = await tx.wait();
      const event = receipt?.logs[0]; // First event should be TipIntentCreated
      const intentId = event?.topics[1];
      expect(intentId).to.not.be.undefined;

      // Try with wrong message hash
      const wrongHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "uint256", "uint256", "bytes"],
          [creator.address, TIP_AMOUNT + 1n, TARGET_CHAIN_ID + 1, DEADLINE, "0x"]
        )
      );
      await mockLightClient.setConfirmation(wrongHash, 0); // Set as pending

      await expect(
        tipIntent.connect(solver).executeTipIntent(
          intentId!,
          wrongHash
        )
      ).to.be.revertedWith("Message not confirmed");
    });

    it("Should enforce tip amount limits", async function () {
      // Try with amount below minimum
      await expect(
        tipIntent.connect(tipper).createTipIntent(
          creator.address,
          0,
          TARGET_CHAIN_ID + 1, // Different chain ID
          DEADLINE,
          "0x"
        )
      ).to.be.revertedWith("Amount must be greater than 0");

      // Try tipping on the same chain
      await expect(
        tipIntent.connect(tipper).createTipIntent(
          creator.address,
          TIP_AMOUNT,
          TARGET_CHAIN_ID, // Same chain ID
          DEADLINE,
          "0x"
        )
      ).to.be.revertedWith("Cannot tip on same chain");

      // Try with amount above maximum
      const largeAmount = ethers.parseEther("1001"); // Above MAX_TIP
      await mockERC20.connect(tipper).mint(tipper.address, largeAmount);
      await mockERC20.connect(tipper).approve(await tipIntent.getAddress(), largeAmount);

      // Create tip intent with large amount
      const tx = await tipIntent.connect(tipper).createTipIntent(
        creator.address,
        largeAmount,
        TARGET_CHAIN_ID + 1, // Different chain ID
        DEADLINE,
        "0x"
      );
      const receipt = await tx.wait();
      const event = receipt?.logs[0];
      const intentId = event?.topics[1];

      // Mock HotShot confirmation
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "uint256", "uint256", "bytes"],
          [creator.address, largeAmount, TARGET_CHAIN_ID + 1, DEADLINE, "0x"]
        )
      );
      await mockLightClient.setConfirmation(messageHash, 1);

      // Try to solve the intent - should fail due to amount being too high
      await expect(
        intentSolver.connect(solver).solveTipIntent(intentId!, messageHash)
      ).to.be.revertedWith("Tip amount too high");
    });

    it("Should allow canceling pending intents", async function () {
      // Create tip intent
      const tx = await tipIntent.connect(tipper).createTipIntent(
        creator.address,
        TIP_AMOUNT,
        TARGET_CHAIN_ID + 1, // Different chain ID
        DEADLINE,
        "0x"
      );
      const receipt = await tx.wait();
      const event = receipt?.logs[0]; // First event should be TipIntentCreated
      const intentId = event?.topics[1];
      expect(intentId).to.not.be.undefined;

      // Cancel the intent
      await tipIntent.connect(tipper).cancelTipIntent(intentId!);

      // Verify intent is canceled
      const status = await tipIntent.getIntentStatus(intentId!);
      expect(status).to.equal(2); // STATUS_CANCELED
    });
  });
}); 