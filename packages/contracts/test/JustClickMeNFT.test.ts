import { expect } from 'chai';
import { ethers } from 'hardhat';
import { JustClickMeNFT } from '../typechain-types';

describe('JustClickMeNFT', function () {
  let nft: JustClickMeNFT;
  let admin: any;
  let user: any;
  let other: any;

  beforeEach(async function () {
    [admin, user, other] = await ethers.getSigners();
    const JustClickMeNFT = await ethers.getContractFactory('JustClickMeNFT');
    nft = (await JustClickMeNFT.deploy(admin.address)) as unknown as JustClickMeNFT;
    await nft.waitForDeployment();
  });

  it('should deploy with correct name and symbol', async function () {
    expect(await nft.name()).to.equal('JustClickMe NFT');
    expect(await nft.symbol()).to.equal('JCMNFT');
  });

  it('should allow minter to mint locked NFT', async function () {
    const lockDuration = 3600;
    const tx = await nft.connect(admin).mintLocked(user.address, lockDuration);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt?.blockNumber || 'latest');
    const expectedLockedUntil = (block?.timestamp || 0) + lockDuration;

    await expect(tx)
      .to.emit(nft, 'MintLocked')
      .withArgs(user.address, 0, expectedLockedUntil);

    expect(await nft.ownerOf(0)).to.equal(user.address);
  });

  it('should reject transfer while locked', async function () {
    const lockDuration = 3600;
    await nft.connect(admin).mintLocked(user.address, lockDuration);
    await expect(
      nft.connect(user).transferFrom(user.address, other.address, 0)
    ).to.be.revertedWith('JustClickMeNFT: token locked');
  });

  it('should allow transfer after lock expires', async function () {
    const lockDuration = 2;
    await nft.connect(admin).mintLocked(user.address, lockDuration);

    await ethers.provider.send('evm_increaseTime', [lockDuration + 1]);
    await ethers.provider.send('evm_mine', []);

    await expect(nft.connect(user).transferFrom(user.address, other.address, 0))
      .to.not.be.reverted;
    expect(await nft.ownerOf(0)).to.equal(other.address);
  });

  it('should reject minting by non-minter', async function () {
    await expect(nft.connect(user).mintLocked(user.address, 3600)).to.be.reverted;
  });
});
