import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { JustClickMeMatrix } from '../typechain-types';

const ENTRY_FEE = ethers.parseEther('40');

describe('JustClickMeMatrix', function () {
  let matrix: JustClickMeMatrix;
  let admin: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();
    const JustClickMeMatrix = await ethers.getContractFactory('JustClickMeMatrix');
    matrix = (await upgrades.deployProxy(JustClickMeMatrix, [admin.address], {
      kind: 'uups',
    })) as unknown as JustClickMeMatrix;
    await matrix.waitForDeployment();
  });

  it('should initialize with admin and default entry fee', async function () {
    expect(await matrix.entryFee()).to.equal(ENTRY_FEE);
    expect(await matrix.hasRole(await matrix.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    expect(await matrix.hasRole(await matrix.ADMIN_ROLE(), admin.address)).to.be.true;
  });

  it('should allow a user to activate ID with sufficient fee', async function () {
    await expect(matrix.connect(user1).activateID(user2.address, { value: ENTRY_FEE }))
      .to.emit(matrix, 'IDActivated')
      .withArgs(user1.address, 0, user2.address);

    const user = await matrix.users(user1.address);
    expect(user.wallet).to.equal(user1.address);
    expect(user.sponsor).to.equal(user2.address);
  });

  it('should reject activation with insufficient fee', async function () {
    await expect(
      matrix.connect(user1).activateID(user2.address, { value: ethers.parseEther('1') })
    ).to.be.revertedWith('Insufficient fee');
  });

  it('should reject double activation', async function () {
    await matrix.connect(user1).activateID(user2.address, { value: ENTRY_FEE });
    await expect(
      matrix.connect(user1).activateID(user2.address, { value: ENTRY_FEE })
    ).to.be.revertedWith('Already active');
  });

  it('should allow retop-up and emit ReTopUp', async function () {
    await matrix.connect(user1).activateID(user2.address, { value: ENTRY_FEE });
    await expect(matrix.connect(user1).retopUp({ value: ENTRY_FEE }))
      .to.emit(matrix, 'ReTopUp')
      .withArgs(user1.address, user2.address);
  });

  it('should reject retop-up for inactive user', async function () {
    await expect(
      matrix.connect(user1).retopUp({ value: ENTRY_FEE })
    ).to.be.revertedWith('Not active');
  });

  it('should allow admin to update entry fee', async function () {
    const newFee = ethers.parseEther('50');
    await matrix.connect(admin).setEntryFee(newFee);
    expect(await matrix.entryFee()).to.equal(newFee);
  });

  it('should reject non-admin entry fee update', async function () {
    await expect(matrix.connect(user1).setEntryFee(ethers.parseEther('50'))).to.be.reverted;
  });

  it('should allow admin to pause and unpause', async function () {
    await matrix.connect(admin).pause();
    await expect(
      matrix.connect(user1).activateID(user2.address, { value: ENTRY_FEE })
    ).to.be.revertedWithCustomError(matrix, 'EnforcedPause');

    await matrix.connect(admin).unpause();
    await expect(matrix.connect(user1).activateID(user2.address, { value: ENTRY_FEE }))
      .to.emit(matrix, 'IDActivated');
  });
});
