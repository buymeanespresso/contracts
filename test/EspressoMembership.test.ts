import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EspressoMembership, EspressoCreator } from "../typechain-types";

describe("EspressoMembership", function () {
  let espressoMembership: EspressoMembership;
  let espressoCreator: EspressoCreator;
  let owner: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;

  const tierPrice = ethers.parseEther("0.1");
  const tierDuration = 30 * 24 * 60 * 60; // 30 days in seconds

  beforeEach(async function () {
    [owner, creator1, creator2, member1, member2] = await ethers.getSigners();
    
    // Deploy EspressoCreator
    const EspressoCreator = await ethers.getContractFactory("EspressoCreator");
    espressoCreator = await EspressoCreator.deploy();
    
    // Deploy EspressoMembership
    const EspressoMembership = await ethers.getContractFactory("EspressoMembership");
    espressoMembership = await EspressoMembership.deploy(await espressoCreator.getAddress());
    
    // Register creator1
    await espressoCreator.connect(creator1).createProfile(
      "creator1",
      "Creator One",
      "Test bio",
      "https://example.com/image.jpg"
    );
  });

  describe("Tier Management", function () {
    it("Should allow creating a membership tier", async function () {
      const tierId = await espressoMembership.connect(creator1).createTier(
        "Gold Tier",
        "Premium content access",
        tierPrice,
        tierDuration,
        ["Exclusive content", "Direct messaging"]
      );

      const tier = await espressoMembership.getTier(creator1.address, 0);
      expect(tier.name).to.equal("Gold Tier");
      expect(tier.description).to.equal("Premium content access");
      expect(tier.price).to.equal(tierPrice);
      expect(tier.duration).to.equal(tierDuration);
      expect(tier.isActive).to.be.true;
      expect(tier.benefits).to.deep.equal(["Exclusive content", "Direct messaging"]);
    });

    it("Should prevent non-creators from creating tiers", async function () {
      await expect(
        espressoMembership.connect(creator2).createTier(
          "Gold Tier",
          "Premium content access",
          tierPrice,
          tierDuration,
          ["Exclusive content"]
        )
      ).to.be.revertedWith("Not a registered creator");
    });

    it("Should allow updating a tier", async function () {
      await espressoMembership.connect(creator1).createTier(
        "Gold Tier",
        "Premium content access",
        tierPrice,
        tierDuration,
        ["Exclusive content"]
      );

      const newPrice = ethers.parseEther("0.2");
      await espressoMembership.connect(creator1).updateTier(
        0,
        "Platinum Tier",
        "Enhanced premium access",
        newPrice,
        tierDuration,
        ["Exclusive content", "Priority support"]
      );

      const tier = await espressoMembership.getTier(creator1.address, 0);
      expect(tier.name).to.equal("Platinum Tier");
      expect(tier.price).to.equal(newPrice);
      expect(tier.benefits).to.deep.equal(["Exclusive content", "Priority support"]);
    });
  });

  describe("Membership Purchase", function () {
    let tierId: number;

    beforeEach(async function () {
      await espressoMembership.connect(creator1).createTier(
        "Gold Tier",
        "Premium content access",
        tierPrice,
        tierDuration,
        ["Exclusive content"]
      );
      tierId = 0;
    });

    it("Should allow purchasing a membership", async function () {
      await espressoMembership.connect(member1).purchaseMembership(
        creator1.address,
        tierId,
        { value: tierPrice }
      );

      const [isActive, expiryDate] = await espressoMembership.getMembershipStatus(
        member1.address,
        creator1.address,
        tierId
      );

      expect(isActive).to.be.true;
      expect(expiryDate).to.be.gt(0);
    });

    it("Should prevent purchasing with insufficient payment", async function () {
      await expect(
        espressoMembership.connect(member1).purchaseMembership(
          creator1.address,
          tierId,
          { value: tierPrice - 1n }
        )
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should extend existing membership", async function () {
      // First purchase
      await espressoMembership.connect(member1).purchaseMembership(
        creator1.address,
        tierId,
        { value: tierPrice }
      );

      const [, firstExpiryDate] = await espressoMembership.getMembershipStatus(
        member1.address,
        creator1.address,
        tierId
      );

      // Second purchase
      await espressoMembership.connect(member1).purchaseMembership(
        creator1.address,
        tierId,
        { value: tierPrice }
      );

      const [, secondExpiryDate] = await espressoMembership.getMembershipStatus(
        member1.address,
        creator1.address,
        tierId
      );

      expect(secondExpiryDate).to.equal(firstExpiryDate + BigInt(tierDuration));
    });
  });

  describe("Membership Management", function () {
    let tierId: number;

    beforeEach(async function () {
      await espressoMembership.connect(creator1).createTier(
        "Gold Tier",
        "Premium content access",
        tierPrice,
        tierDuration,
        ["Exclusive content"]
      );
      tierId = 0;

      await espressoMembership.connect(member1).purchaseMembership(
        creator1.address,
        tierId,
        { value: tierPrice }
      );
    });

    it("Should allow cancelling membership", async function () {
      await espressoMembership.connect(member1).cancelMembership(
        creator1.address,
        tierId
      );

      const [isActive] = await espressoMembership.getMembershipStatus(
        member1.address,
        creator1.address,
        tierId
      );

      expect(isActive).to.be.false;
    });

    it("Should prevent cancelling non-existent membership", async function () {
      await expect(
        espressoMembership.connect(member2).cancelMembership(
          creator1.address,
          tierId
        )
      ).to.be.revertedWith("No active membership");
    });

    it("Should list creator tiers correctly", async function () {
      const tierIds = await espressoMembership.getCreatorTiers(creator1.address);
      expect(tierIds.length).to.equal(1);
      expect(tierIds[0]).to.equal(0);

      // Create another tier
      await espressoMembership.connect(creator1).createTier(
        "Platinum Tier",
        "Ultimate access",
        ethers.parseEther("0.2"),
        tierDuration,
        ["Everything"]
      );

      const updatedTierIds = await espressoMembership.getCreatorTiers(creator1.address);
      expect(updatedTierIds.length).to.equal(2);
      expect(updatedTierIds[1]).to.equal(1);
    });
  });
}); 