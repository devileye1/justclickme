import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

const ENTRY_FEE = ethers.parseEther('40');

async function deployFixture() {
  const [admin, user1, user2, treasury] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("JustClickMeMatrix");
  const proxy = await hre.upgrades.deployProxy(Factory, [admin.address, treasury.address], { kind: 'uups' });
  await proxy.waitForDeployment();
  return { proxy, admin, user1, user2, treasury };
}

describe("JustClickMeMatrix", function () {
  it("should initialize with correct entry fee and treasury", async function () {
    const { proxy, treasury } = await deployFixture();
    expect(await proxy.entryFee()).to.equal(ENTRY_FEE);
    expect(await proxy.treasury()).to.equal(treasury.address);
  });

  it("should activate ID and route funds", async function () {
    const { proxy, user1, user2, treasury } = await deployFixture();
    const initialTreasury = await ethers.provider.getBalance(treasury.address);
    const initialSponsor = await ethers.provider.getBalance(user2.address);

    await expect(proxy.connect(user1).activateID(user2.address, { value: ENTRY_FEE }))
      .to.emit(proxy, "IDActivated")
      .withArgs(user1.address, user2.address, ENTRY_FEE);

    expect(await proxy.active(user1.address)).to.be.true;
    expect(await proxy.sponsorOf(user1.address)).to.equal(user2.address);

    const treasuryGain = (await ethers.provider.getBalance(treasury.address)) - initialTreasury;
    const sponsorGain = (await ethers.provider.getBalance(user2.address)) - initialSponsor;

    expect(treasuryGain).to.equal(ethers.parseEther('30'));
    expect(sponsorGain).to.equal(ethers.parseEther('10'));
  });

  it("should reject insufficient fee", async function () {
    const { proxy, user1, user2 } = await deployFixture();
    await expect(proxy.connect(user1).activateID(user2.address, { value: ethers.parseEther('10') }))
      .to.be.revertedWith("Insufficient fee");
  });

  it("should reject duplicate activation", async function () {
    const { proxy, user1, user2 } = await deployFixture();
    await proxy.connect(user1).activateID(user2.address, { value: ENTRY_FEE });
    await expect(proxy.connect(user1).activateID(user2.address, { value: ENTRY_FEE }))
      .to.be.revertedWith("Already active");
  });

  it("should allow re-top-up", async function () {
    const { proxy, user1, user2, treasury } = await deployFixture();
    await proxy.connect(user1).activateID(user2.address, { value: ENTRY_FEE });

    const initialTreasury = await ethers.provider.getBalance(treasury.address);
    const initialSponsor = await ethers.provider.getBalance(user2.address);

    await expect(proxy.connect(user1).retopUp({ value: ENTRY_FEE }))
      .to.emit(proxy, "ReTopUp")
      .withArgs(user1.address, user2.address, ENTRY_FEE);

    const treasuryGain = (await ethers.provider.getBalance(treasury.address)) - initialTreasury;
    const sponsorGain = (await ethers.provider.getBalance(user2.address)) - initialSponsor;

    expect(treasuryGain).to.equal(ethers.parseEther('30'));
    expect(sponsorGain).to.equal(ethers.parseEther('10'));
  });

  it("should allow admin to update entry fee", async function () {
    const { proxy, admin, user1, user2 } = await deployFixture();
    const newFee = ethers.parseEther('50');
    await proxy.connect(admin).setEntryFee(newFee);
    expect(await proxy.entryFee()).to.equal(newFee);
  });

  it("should prevent non-admin from updating entry fee", async function () {
    const { proxy, user1 } = await deployFixture();
    await expect(proxy.connect(user1).setEntryFee(ethers.parseEther('50'))).to.be.reverted;
  });
});
