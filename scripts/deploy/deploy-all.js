const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('');

  const deployments = {};

  // ---- OpenNFT (Core NFT) ----
  console.log('[1/8] Deploying OpenNFT...');
  const OpenNFT = await hre.ethers.getContractFactory('OpenNFT');
  const openNFT = await OpenNFT.deploy('OPEN-NFTs', 'ONFT');
  await openNFT.waitForDeployment();
  deployments.OpenNFT = await openNFT.getAddress();
  console.log('  OpenNFT:', deployments.OpenNFT);

  // ---- Regulator Contracts ----
  console.log('[2/8] Deploying CreatorRegistry...');
  const CreatorRegistry = await hre.ethers.getContractFactory('CreatorRegistry');
  const creatorRegistry = await CreatorRegistry.deploy();
  await creatorRegistry.waitForDeployment();
  deployments.CreatorRegistry = await creatorRegistry.getAddress();
  console.log('  CreatorRegistry:', deployments.CreatorRegistry);

  console.log('[3/8] Deploying OriginalWork...');
  const OriginalWork = await hre.ethers.getContractFactory('OriginalWork');
  const originalWork = await OriginalWork.deploy();
  await originalWork.waitForDeployment();
  deployments.OriginalWork = await originalWork.getAddress();
  console.log('  OriginalWork:', deployments.OriginalWork);

  console.log('[4/8] Deploying LicenseToken...');
  const LicenseToken = await hre.ethers.getContractFactory('LicenseToken');
  const licenseToken = await LicenseToken.deploy();
  await licenseToken.waitForDeployment();
  deployments.LicenseToken = await licenseToken.getAddress();
  console.log('  LicenseToken:', deployments.LicenseToken);

  console.log('[5/8] Deploying DerivativeNFT...');
  const DerivativeNFT = await hre.ethers.getContractFactory('DerivativeNFT');
  const derivativeNFT = await DerivativeNFT.deploy();
  await derivativeNFT.waitForDeployment();
  deployments.DerivativeNFT = await derivativeNFT.getAddress();
  console.log('  DerivativeNFT:', deployments.DerivativeNFT);

  console.log('[6/8] Deploying DerivativeRule...');
  const DerivativeRule = await hre.ethers.getContractFactory('DerivativeRule');
  const derivativeRule = await DerivativeRule.deploy();
  await derivativeRule.waitForDeployment();
  deployments.DerivativeRule = await derivativeRule.getAddress();
  console.log('  DerivativeRule:', deployments.DerivativeRule);

  console.log('[7/8] Deploying RoyaltySplitter...');
  const RoyaltySplitter = await hre.ethers.getContractFactory('RoyaltySplitter');
  const royaltySplitter = await RoyaltySplitter.deploy();
  await royaltySplitter.waitForDeployment();
  deployments.RoyaltySplitter = await royaltySplitter.getAddress();
  console.log('  RoyaltySplitter:', deployments.RoyaltySplitter);

  console.log('[8/8] Deploying NfcSealRegistry...');
  const NfcSealRegistry = await hre.ethers.getContractFactory('NfcSealRegistry');
  const nfcSealRegistry = await NfcSealRegistry.deploy();
  await nfcSealRegistry.waitForDeployment();
  deployments.NfcSealRegistry = await nfcSealRegistry.getAddress();
  console.log('  NfcSealRegistry:', deployments.NfcSealRegistry);

  // ---- Output ----
  console.log('');
  console.log('========== DEPLOYED ADDRESSES ==========');
  console.log('NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=' + deployments.OpenNFT);
  console.log('CONTRACT_CREATORREGISTRY=' + deployments.CreatorRegistry);
  console.log('CONTRACT_ORIGINALWORK=' + deployments.OriginalWork);
  console.log('CONTRACT_LICENSETOKEN=' + deployments.LicenseToken);
  console.log('CONTRACT_DERIVATIVENFT=' + deployments.DerivativeNFT);
  console.log('CONTRACT_DERIVATIVERULE=' + deployments.DerivativeRule);
  console.log('CONTRACT_ROYALTYSPLITTER=' + deployments.RoyaltySplitter);
  console.log('CONTRACT_NFCSEALREGISTRY=' + deployments.NfcSealRegistry);
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
