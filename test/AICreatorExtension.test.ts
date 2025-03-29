import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AICreatorExtension, EspressoCreator } from "../typechain-types";

describe("AICreatorExtension", function () {
  let aiExtension: AICreatorExtension;
  let espressoCreator: EspressoCreator;
  let owner: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let developer: SignerWithAddress;
  let operator: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator1, creator2, developer, operator] = await ethers.getSigners();
    
    // Deploy EspressoCreator first
    const EspressoCreator = await ethers.getContractFactory("EspressoCreator");
    espressoCreator = await EspressoCreator.deploy();
    
    // Deploy AICreatorExtension
    const AICreatorExtension = await ethers.getContractFactory("AICreatorExtension");
    aiExtension = await AICreatorExtension.deploy(await espressoCreator.getAddress());
    
    // Register creator1 as a creator
    await espressoCreator.connect(creator1).createProfile(
      "creator1",
      "Creator One",
      "Test bio",
      "https://example.com/image.jpg"
    );
  });

  describe("Agent Registration", function () {
    it("Should allow registering as an agent", async function () {
      await aiExtension.connect(creator1).registerAsAgent(
        1, // Autonomous
        developer.address,
        operator.address,
        5000, // 50% split
        "GPT-4 trained model",
        "Natural language processing"
      );

      const agentInfo = await aiExtension.getAgentInfo(creator1.address);
      expect(agentInfo.agentType).to.equal(1);
      expect(agentInfo.developer).to.equal(developer.address);
      expect(agentInfo.operator).to.equal(operator.address);
      expect(agentInfo.revenueSplitDeveloper).to.equal(5000);
      expect(agentInfo.trainingInfo).to.equal("GPT-4 trained model");
      expect(agentInfo.capabilities).to.equal("Natural language processing");
      expect(agentInfo.verified).to.be.false;
    });

    it("Should prevent non-creators from registering", async function () {
      await expect(
        aiExtension.connect(creator2).registerAsAgent(
          1,
          developer.address,
          operator.address,
          5000,
          "GPT-4 trained model",
          "Natural language processing"
        )
      ).to.be.revertedWith("Not a registered creator");
    });

    it("Should validate revenue split percentage", async function () {
      await expect(
        aiExtension.connect(creator1).registerAsAgent(
          1,
          developer.address,
          operator.address,
          10001, // Over 100%
          "GPT-4 trained model",
          "Natural language processing"
        )
      ).to.be.revertedWith("Revenue split cannot exceed 100%");
    });

    it("Should validate agent type", async function () {
      await expect(
        aiExtension.connect(creator1).registerAsAgent(
          0, // NotAgent
          developer.address,
          operator.address,
          5000,
          "GPT-4 trained model",
          "Natural language processing"
        )
      ).to.be.revertedWith("Invalid agent type");
    });
  });

  describe("Agent Updates", function () {
    beforeEach(async function () {
      await aiExtension.connect(creator1).registerAsAgent(
        1,
        developer.address,
        operator.address,
        5000,
        "GPT-4 trained model",
        "Natural language processing"
      );
    });

    it("Should allow updating agent info", async function () {
      await aiExtension.connect(creator1).updateAgentInfo(
        2, // SemiAutonomous
        developer.address,
        operator.address,
        6000, // 60% split
        "Updated training info",
        "Updated capabilities"
      );

      const agentInfo = await aiExtension.getAgentInfo(creator1.address);
      expect(agentInfo.agentType).to.equal(2);
      expect(agentInfo.revenueSplitDeveloper).to.equal(6000);
      expect(agentInfo.trainingInfo).to.equal("Updated training info");
      expect(agentInfo.capabilities).to.equal("Updated capabilities");
    });

    it("Should prevent non-agents from updating", async function () {
      await expect(
        aiExtension.connect(creator2).updateAgentInfo(
          2,
          developer.address,
          operator.address,
          6000,
          "Updated training info",
          "Updated capabilities"
        )
      ).to.be.revertedWith("Not a registered creator");
    });
  });

  describe("Agent Verification", function () {
    beforeEach(async function () {
      await aiExtension.connect(creator1).registerAsAgent(
        1,
        developer.address,
        operator.address,
        5000,
        "GPT-4 trained model",
        "Natural language processing"
      );
    });

    it("Should allow owner to verify agents", async function () {
      await aiExtension.connect(owner).verifyAgent(creator1.address, true);
      const agentInfo = await aiExtension.getAgentInfo(creator1.address);
      expect(agentInfo.verified).to.be.true;
    });

    it("Should prevent non-owners from verifying agents", async function () {
      await expect(
        aiExtension.connect(creator2).verifyAgent(creator1.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent verifying non-existent agents", async function () {
      await expect(
        aiExtension.connect(owner).verifyAgent(creator2.address, true)
      ).to.be.revertedWith("Not registered as an agent");
    });
  });

  describe("Agent Status Checks", function () {
    it("Should correctly identify agents", async function () {
      expect(await aiExtension.isAgent(creator1.address)).to.be.false;

      await aiExtension.connect(creator1).registerAsAgent(
        1,
        developer.address,
        operator.address,
        5000,
        "GPT-4 trained model",
        "Natural language processing"
      );

      expect(await aiExtension.isAgent(creator1.address)).to.be.true;
      expect(await aiExtension.isAgent(creator2.address)).to.be.false;
    });
  });
}); 