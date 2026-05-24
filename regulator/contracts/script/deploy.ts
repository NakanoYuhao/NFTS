import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // 1. CreatorRegistry
  const CreatorRegistry = await ethers.getContractFactory("CreatorRegistry");
  const registry = await CreatorRegistry.deploy();
  await registry.waitForDeployment();
  console.log("CreatorRegistry:", await registry.getAddress());

  // 2. OriginalWork
  const OriginalWork = await ethers.getContractFactory("OriginalWork");
  const originalWork = await OriginalWork.deploy(
    await registry.getAddress(),
    deployer.address,  // royalty receiver
    500                 // 5% royalty
  );
  await originalWork.waitForDeployment();
  console.log("OriginalWork:", await originalWork.getAddress());

  // 3. LicenseToken
  const LicenseToken = await ethers.getContractFactory("LicenseToken");
  const licenseToken = await LicenseToken.deploy();
  await licenseToken.waitForDeployment();
  console.log("LicenseToken:", await licenseToken.getAddress());

  // 4. DerivativeNFT
  const DerivativeNFT = await ethers.getContractFactory("DerivativeNFT");
  const derivativeNFT = await DerivativeNFT.deploy();
  await derivativeNFT.waitForDeployment();
  console.log("DerivativeNFT:", await derivativeNFT.getAddress());

  // 5. DerivativeRule (核心)
  const DerivativeRule = await ethers.getContractFactory("DerivativeRule");
  const derivativeRule = await DerivativeRule.deploy(
    await originalWork.getAddress(),
    await derivativeNFT.getAddress(),
    await licenseToken.getAddress(),
    await registry.getAddress()
  );
  await derivativeRule.waitForDeployment();
  console.log("DerivativeRule:", await derivativeRule.getAddress());

  // 6. RoyaltySplitter
  const RoyaltySplitter = await ethers.getContractFactory("RoyaltySplitter");
  const royaltySplitter = await RoyaltySplitter.deploy(
    await derivativeRule.getAddress()
  );
  await royaltySplitter.waitForDeployment();
  console.log("RoyaltySplitter:", await royaltySplitter.getAddress());

  // 7. NfcSealRegistry
  const NfcSealRegistry = await ethers.getContractFactory("NfcSealRegistry");
  const nfcSeal = await NfcSealRegistry.deploy();
  await nfcSeal.waitForDeployment();
  console.log("NfcSealRegistry:", await nfcSeal.getAddress());

  // 设置合约间引用
  await licenseToken.setRuleEngine(await derivativeRule.getAddress());
  await derivativeNFT.setRuleEngine(await derivativeRule.getAddress());

  console.log("\n=== Deployment Summary ===");
  console.log("CreatorRegistry: ", await registry.getAddress());
  console.log("OriginalWork:    ", await originalWork.getAddress());
  console.log("LicenseToken:    ", await licenseToken.getAddress());
  console.log("DerivativeNFT:   ", await derivativeNFT.getAddress());
  console.log("DerivativeRule:  ", await derivativeRule.getAddress());
  console.log("RoyaltySplitter: ", await royaltySplitter.getAddress());
  console.log("NfcSealRegistry: ", await nfcSeal.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
