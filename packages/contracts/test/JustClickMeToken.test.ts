import { expect } from 'chai';
import { ethers } from 'hardhat';
import { JustClickMeToken } from '../typechain-types';

describe('JustClickMeToken', function () {
  let token: JustClickMeToken;
  let admin: any;
  let user: any;

  beforeEach(async function () {
    [admin, user] = await ethers.getSigners();
    const JustClickMeToken = await ethers.getContractFactory('JustClickMeToken');
    token = (await JustClickMeToken.deploy(admin.address)) as unknown as JustClickMeToken;
    await token.waitForDeployment();
  });

  it('should deploy with correct name and symbol', async function () {
    expect(await token.name()).to.equal('JustClickMe Token');
    expect(await token.symbol()).to.equal('JCM');
  });

  it('should allow minter to mint tokens', async function () {
    const amount = ethers.parseEther('100');
    await expect(token.connect(admin).mint(user.address, amount))
      .to.emit(token, 'Transfer')
      .withArgs(ethers.ZeroAddress, user.address, amount);

    expect(await token.balanceOf(user.address)).to.equal(amount);
  });

  it('should reject minting by non-minter', async function () {
    await expect(token.connect(user).mint(user.address, ethers.parseEther('100'))).to.be.reverted;
  });
});
