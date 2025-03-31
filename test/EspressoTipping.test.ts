import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EspressoCreator, AICreatorExtension, EspressoTipping } from "../typechain-types";

describe("EspressoTipping", function () {
  let espressoCreator: EspressoCreator;
  let aiExtension: AICreatorExtension;
  let espressoTipping: EspressoTipping;
  let owner: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let tipper: SignerWithAddress;
  let developer: SignerWithAddress;
  let operator: SignerWithAddress;

  const tipAmount = ethers.parseEther("1.0");
  const developerSplit = 5000; // 50%

  beforeEach(async function () {
    [owner, creator1, creator2, tipper, developer, operator] = await ethers.getSigners();
    
    // Deploy EspressoCreator
    const EspressoCreatorFactory = await ethers.getContractFactory("EspressoCreator");
    espressoCreator = await EspressoCreatorFactory.deploy() as unknown as EspressoCreator;
    await espressoCreator.waitForDeployment();
    
    // Deploy AICreatorExtension
    const AICreatorExtensionFactory = await ethers.getContractFactory("AICreatorExtension");
    aiExtension = await AICreatorExtensionFactory.deploy(await espressoCreator.getAddress()) as unknown as AICreatorExtension;
    await aiExtension.waitForDeployment();
    
    // Deploy EspressoTipping
    const EspressoTippingFactory = await ethers.getContractFactory("EspressoTipping");
    espressoTipping = await EspressoTippingFactory.deploy(
      await espressoCreator.getAddress(),
      await aiExtension.getAddress()
    ) as unknown as EspressoTipping;
    await espressoTipping.waitForDeployment();
    
    // Register creator1
    await espressoCreator.connect(creator1).createProfile(
      "creator1",
      "Creator One",
      "Test bio",
      "https://example.com/image.jpg"
    );
  });

  describe("Regular Creator Tipping", function () {
    it("Should allow tipping creators", async function () {
      await espressoTipping.connect(tipper).tipCreator(
        creator1.address,
        "Great content!",
        { value: tipAmount }
      );

      expect(await espressoTipping.getTipsBalance(creator1.address)).to.equal(tipAmount);
      expect(await espressoTipping.getCreatorTotalTips(creator1.address)).to.equal(tipAmount);
    });

    it("Should prevent tipping non-creators", async function () {
      await expect(
        espressoTipping.connect(tipper).tipCreator(
          creator2.address,
          "Great content!",
          { value: tipAmount }
        )
      ).to.be.revertedWith("Invalid creator address");
    });

    it("Should prevent tipping with zero amount", async function () {
      await expect(
        espressoTipping.connect(tipper).tipCreator(
          creator1.address,
          "Great content!",
          { value: 0 }
        )
      ).to.be.revertedWith("Tip amount must be greater than 0");
    });
  });

  describe("AI Agent Tipping", function () {
    beforeEach(async function () {
      // Register creator1 as an AI agent
      await aiExtension.connect(creator1).registerAsAgent(
        1, // Autonomous
        developer.address,
        operator.address,
        developerSplit,
        "GPT-4 trained model",
        "Natural language processing"
      );
    });

    it("Should split tips correctly between developer and operator", async function () {
      const initialDevBalance = await ethers.provider.getBalance(developer.address);
      const initialOpBalance = await ethers.provider.getBalance(operator.address);

      await espressoTipping.connect(tipper).tipAgent(
        creator1.address,
        "Thanks AI!",
        { value: tipAmount }
      );

      const expectedDevAmount = (tipAmount * BigInt(developerSplit)) / 10000n;
      const expectedOpAmount = tipAmount - expectedDevAmount;

      expect(await espressoTipping.getTipsBalance(developer.address)).to.equal(expectedDevAmount);
      expect(await espressoTipping.getTipsBalance(operator.address)).to.equal(expectedOpAmount);
    });

    it("Should prevent tipping non-AI agents", async function () {
      await expect(
        espressoTipping.connect(tipper).tipAgent(
          creator2.address,
          "Thanks AI!",
          { value: tipAmount }
        )
      ).to.be.revertedWith("Invalid creator address");
    });
  });

  describe("Tip Withdrawal", function () {
    beforeEach(async function () {
      // Send some tips to creator1
      await espressoTipping.connect(tipper).tipCreator(
        creator1.address,
        "Great content!",
        { value: tipAmount }
      );
    });

    it("Should allow withdrawing tips", async function () {
      const initialBalance = await ethers.provider.getBalance(creator1.address);
      
      await espressoTipping.connect(creator1).withdrawTips();
      
      const finalBalance = await ethers.provider.getBalance(creator1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      expect(await espressoTipping.getTipsBalance(creator1.address)).to.equal(0);
    });

    it("Should prevent withdrawing with zero balance", async function () {
      await expect(
        espressoTipping.connect(creator2).withdrawTips()
      ).to.be.revertedWith("No tips to withdraw");
    });

    it("Should handle multiple withdrawals correctly", async function () {
      // First withdrawal
      await espressoTipping.connect(creator1).withdrawTips();
      expect(await espressoTipping.getTipsBalance(creator1.address)).to.equal(0);
      
      // Second tip
      await espressoTipping.connect(tipper).tipCreator(
        creator1.address,
        "More content!",
        { value: tipAmount }
      );
      
      // Second withdrawal
      await espressoTipping.connect(creator1).withdrawTips();
      expect(await espressoTipping.getTipsBalance(creator1.address)).to.equal(0);
      expect(await espressoTipping.getCreatorTotalTips(creator1.address)).to.equal(tipAmount * 2n);
    });
  });
}); 