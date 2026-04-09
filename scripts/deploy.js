const hre = require("hardhat");

async function main() {
  console.log("Starting deployment of SatarkAI Smart Contracts...");

  // 1. Deploy FraudSignalRegistry
  const FraudSignalRegistry = await hre.ethers.getContractFactory("FraudSignalRegistry");
  const registry = await FraudSignalRegistry.deploy();
  await registry.waitForDeployment();
  console.log(`FraudSignalRegistry deployed to: ${await registry.getAddress()}`);

  // 2. Deploy FraudAuditLedger
  const FraudAuditLedger = await hre.ethers.getContractFactory("FraudAuditLedger");
  const ledger = await FraudAuditLedger.deploy();
  await ledger.waitForDeployment();
  console.log(`FraudAuditLedger deployed to: ${await ledger.getAddress()}`);

  console.log("Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
