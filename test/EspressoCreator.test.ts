import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EspressoCreator } from "../typechain-types";

describe("EspressoCreator", function () {
  let espressoCreator: EspressoCreator;
  let owner: SignerWithAddress;
  let creator1: SignerWithAddress;
  let creator2: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator1, creator2] = await ethers.getSigners();
    
    const EspressoCreator = await ethers.getContractFactory("EspressoCreator");
    espressoCreator = await EspressoCreator.deploy();
  });

  describe("Profile Creation", function () {
    it("Should allow creating a new profile", async function () {
      await espressoCreator.connect(creator1).createProfile(
        "creator1",
        "Creator One",
        "Test bio",
        "https://example.com/image.jpg"
      );

      const profile = await espressoCreator.getProfile(creator1.address);
      expect(profile.username).to.equal("creator1");
      expect(profile.displayName).to.equal("Creator One");
      expect(profile.bio).to.equal("Test bio");
      expect(profile.profileImage).to.equal("https://example.com/image.jpg");
      expect(profile.isRegistered).to.be.true;
    });

    it("Should prevent duplicate usernames", async function () {
      await espressoCreator.connect(creator1).createProfile(
        "creator1",
        "Creator One",
        "Test bio",
        "https://example.com/image.jpg"
      );

      await expect(
        espressoCreator.connect(creator2).createProfile(
          "creator1",
          "Creator Two",
          "Test bio",
          "https://example.com/image.jpg"
        )
      ).to.be.revertedWith("Username taken");
    });

    it("Should validate username length", async function () {
      await expect(
        espressoCreator.connect(creator1).createProfile(
          "ab", // Too short
          "Creator One",
          "Test bio",
          "https://example.com/image.jpg"
        )
      ).to.be.revertedWith("Username length invalid");

      await expect(
        espressoCreator.connect(creator1).createProfile(
          "a".repeat(31), // Too long
          "Creator One",
          "Test bio",
          "https://example.com/image.jpg"
        )
      ).to.be.revertedWith("Username length invalid");
    });

    it("Should prevent creating multiple profiles", async function () {
      await espressoCreator.connect(creator1).createProfile(
        "creator1",
        "Creator One",
        "Test bio",
        "https://example.com/image.jpg"
      );

      await expect(
        espressoCreator.connect(creator1).createProfile(
          "creator1_new",
          "Creator One New",
          "Test bio",
          "https://example.com/image.jpg"
        )
      ).to.be.revertedWith("Already registered");
    });
  });

  describe("Profile Updates", function () {
    beforeEach(async function () {
      await espressoCreator.connect(creator1).createProfile(
        "creator1",
        "Creator One",
        "Test bio",
        "https://example.com/image.jpg"
      );
    });

    it("Should allow updating profile", async function () {
      await espressoCreator.connect(creator1).updateProfile(
        "Updated Creator",
        "Updated bio",
        "https://example.com/new-image.jpg"
      );

      const profile = await espressoCreator.getProfile(creator1.address);
      expect(profile.displayName).to.equal("Updated Creator");
      expect(profile.bio).to.equal("Updated bio");
      expect(profile.profileImage).to.equal("https://example.com/new-image.jpg");
      // Username should remain unchanged
      expect(profile.username).to.equal("creator1");
    });

    it("Should prevent non-creators from updating", async function () {
      await expect(
        espressoCreator.connect(creator2).updateProfile(
          "Updated Creator",
          "Updated bio",
          "https://example.com/new-image.jpg"
        )
      ).to.be.revertedWith("Not a registered creator");
    });
  });

  describe("Creator Verification", function () {
    it("Should correctly identify creators", async function () {
      expect(await espressoCreator.isCreator(creator1.address)).to.be.false;

      await espressoCreator.connect(creator1).createProfile(
        "creator1",
        "Creator One",
        "Test bio",
        "https://example.com/image.jpg"
      );

      expect(await espressoCreator.isCreator(creator1.address)).to.be.true;
      expect(await espressoCreator.isCreator(creator2.address)).to.be.false;
    });
  });
}); 