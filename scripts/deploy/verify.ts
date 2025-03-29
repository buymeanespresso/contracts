import { run } from "hardhat";

async function main() {
  console.log("Starting contract verification...");

  const ESPRESSO_CREATOR_ADDRESS = "0x91dc3bFDf6e351bDeaDa157570591c925326Ed3B";
  const AI_CREATOR_EXTENSION_ADDRESS = "0x1175b767AA83cb07845cD8553D71Cd19242f07C9";
  const ESPRESSO_TIPPING_ADDRESS = "0xE7E055f29afF0494694f06B7F56Bcf6F9689Ad1d";
  const ESPRESSO_MEMBERSHIP_ADDRESS = "0x7116fF137f4CE18a88f013Fc87518c9a8E798f2C";

  // Verify EspressoCreator
  console.log("\nVerifying EspressoCreator...");
  try {
    await run("verify:verify", {
      address: ESPRESSO_CREATOR_ADDRESS,
      constructorArguments: [],
    });
    console.log("EspressoCreator verified successfully");
  } catch (error) {
    console.error("Error verifying EspressoCreator:", error);
  }

  // Verify AICreatorExtension
  console.log("\nVerifying AICreatorExtension...");
  try {
    await run("verify:verify", {
      address: AI_CREATOR_EXTENSION_ADDRESS,
      constructorArguments: [ESPRESSO_CREATOR_ADDRESS],
    });
    console.log("AICreatorExtension verified successfully");
  } catch (error) {
    console.error("Error verifying AICreatorExtension:", error);
  }

  // Verify EspressoTipping
  console.log("\nVerifying EspressoTipping...");
  try {
    await run("verify:verify", {
      address: ESPRESSO_TIPPING_ADDRESS,
      constructorArguments: [
        ESPRESSO_CREATOR_ADDRESS,
        AI_CREATOR_EXTENSION_ADDRESS,
        500, // developerFeePercentage (5.00%)
        500, // operatorFeePercentage (5.00%)
      ],
    });
    console.log("EspressoTipping verified successfully");
  } catch (error) {
    console.error("Error verifying EspressoTipping:", error);
  }

  // Verify EspressoMembership
  console.log("\nVerifying EspressoMembership...");
  try {
    await run("verify:verify", {
      address: ESPRESSO_MEMBERSHIP_ADDRESS,
      constructorArguments: [ESPRESSO_CREATOR_ADDRESS],
    });
    console.log("EspressoMembership verified successfully");
  } catch (error) {
    console.error("Error verifying EspressoMembership:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 