import { ethers, upgrades } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  // Deploy JustClickMeMatrix (UUPS upgradeable proxy)
  const JustClickMeMatrix = await ethers.getContractFactory('JustClickMeMatrix');
  const matrix = await upgrades.deployProxy(JustClickMeMatrix, [deployer.address], {
    kind: 'uups',
    initializer: 'initialize',
  });
  await matrix.waitForDeployment();
  const matrixAddress = await matrix.getAddress();
  console.log('JustClickMeMatrix deployed to:', matrixAddress);

  // Deploy JustClickMeToken
  const JustClickMeToken = await ethers.getContractFactory('JustClickMeToken');
  const token = await JustClickMeToken.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log('JustClickMeToken deployed to:', tokenAddress);

  // Deploy JustClickMeNFT
  const JustClickMeNFT = await ethers.getContractFactory('JustClickMeNFT');
  const nft = await JustClickMeNFT.deploy(deployer.address);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log('JustClickMeNFT deployed to:', nftAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    matrix: matrixAddress,
    token: tokenAddress,
    nft: nftAddress,
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(deploymentsDir, 'bscTestnet.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log('Deployment info saved to deployments/bscTestnet.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
