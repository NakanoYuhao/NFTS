const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying OpenNFT with account:', deployer.address);

  const OpenNFT = await hre.ethers.getContractFactory('OpenNFT');
  const nft = await OpenNFT.deploy('OPEN-NFTs', 'ONFT');
  await nft.waitForDeployment();

  const address = await nft.getAddress();
  console.log('OpenNFT deployed to:', address);
  console.log('');
  console.log('Add this to your .env.local:');
  console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
