import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment...");

  // Deploy EspressoCreator
  console.log("Deploying EspressoCreator...");
  const EspressoCreator = await ethers.getContractFactory("EspressoCreator");
  const espressoCreator = await EspressoCreator.deploy();
  await espressoCreator.waitForDeployment();
  console.log("EspressoCreator deployed to:", await espressoCreator.getAddress());

  // Deploy AICreatorExtension
  console.log("Deploying AICreatorExtension...");
  const AICreatorExtension = await ethers.getContractFactory("AICreatorExtension");
  const aiCreatorExtension = await AICreatorExtension.deploy(await espressoCreator.getAddress());
  await aiCreatorExtension.waitForDeployment();
  console.log("AICreatorExtension deployed to:", await aiCreatorExtension.getAddress());

  // Deploy EspressoTipping with fee percentages
  console.log("Deploying EspressoTipping...");
  const developerFeePercentage = 500; // 5.00%
  const operatorFeePercentage = 500; // 5.00%
  const EspressoTipping = await ethers.getContractFactory("EspressoTipping");
  const espressoTipping = await EspressoTipping.deploy(
    await espressoCreator.getAddress(),
    await aiCreatorExtension.getAddress(),
    developerFeePercentage,
    operatorFeePercentage
  );
  await espressoTipping.waitForDeployment();
  console.log("EspressoTipping deployed to:", await espressoTipping.getAddress());

  // Deploy EspressoMembership
  console.log("Deploying EspressoMembership...");
  const EspressoMembership = await ethers.getContractFactory("EspressoMembership");
  const espressoMembership = await EspressoMembership.deploy(await espressoCreator.getAddress());
  await espressoMembership.waitForDeployment();
  console.log("EspressoMembership deployed to:", await espressoMembership.getAddress());

  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log("EspressoCreator:", await espressoCreator.getAddress());
  console.log("AICreatorExtension:", await aiCreatorExtension.getAddress());
  console.log("EspressoTipping:", await espressoTipping.getAddress());
  console.log("EspressoMembership:", await espressoMembership.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 