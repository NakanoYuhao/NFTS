import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("DerivativeRule - 二创规则引擎", function () {
  async function deployAll() {
    const [admin, creator, derivativeCreator, regulator] = await ethers.getSigners();

    // 1. CreatorRegistry
    const Registry = await ethers.getContractFactory("CreatorRegistry");
    const registry = await Registry.deploy();

    // 2. OriginalWork
    const OriginalWork = await ethers.getContractFactory("OriginalWork");
    const originalWork = await OriginalWork.deploy(
      await registry.getAddress(), admin.address, 500
    );

    // 3. LicenseToken
    const LicenseToken = await ethers.getContractFactory("LicenseToken");
    const licenseToken = await LicenseToken.deploy();

    // 4. DerivativeNFT
    const DerivativeNFT = await ethers.getContractFactory("DerivativeNFT");
    const derivativeNFT = await DerivativeNFT.deploy();

    // 5. DerivativeRule (核心)
    const DerivativeRule = await ethers.getContractFactory("DerivativeRule");
    const derivativeRule = await DerivativeRule.deploy(
      await originalWork.getAddress(),
      await derivativeNFT.getAddress(),
      await licenseToken.getAddress(),
      await registry.getAddress()
    );

    // 6. RoyaltySplitter
    const RoyaltySplitter = await ethers.getContractFactory("RoyaltySplitter");
    const royaltySplitter = await RoyaltySplitter.deploy(await derivativeRule.getAddress());

    // 7. NfcSealRegistry
    const NfcSealRegistry = await ethers.getContractFactory("NfcSealRegistry");
    const nfcSeal = await NfcSealRegistry.deploy();

    // 设置合约引用
    await licenseToken.setRuleEngine(await derivativeRule.getAddress());
    await derivativeNFT.setRuleEngine(await derivativeRule.getAddress());

    // 注册角色
    await registry.assignRole(regulator.address, 3); // Regulator

    // 注册并认证创作者
    await registry.connect(creator).registerCreator(
      "did:fisco:bcos:" + creator.address.toLowerCase(),
      ethers.keccak256(ethers.toUtf8Bytes("did_doc"))
    );
    await registry.verifyCreator(creator.address);

    return {
      admin, creator, derivativeCreator, regulator,
      registry, originalWork, licenseToken, derivativeNFT,
      derivativeRule, royaltySplitter, nfcSeal,
    };
  }

  // ========== 测试 1: 铸造原作 ==========
  describe("OriginalWork Minting", function () {
    it("应该成功铸造原作 NFT", async function () {
      const { originalWork, creator } = await loadFixture(deployAll);
      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_CHIP_001"));
      const did = "did:fisco:bcos:" + creator.address.toLowerCase();

      const tx = await originalWork.connect(creator).mintOriginal(
        "ipfs://QmOriginalMeta", nfcHash, did
      );
      const receipt = await tx.wait();

      expect(await originalWork.ownerOf(0)).to.equal(creator.address);
      expect(await originalWork.tokenCreator(0)).to.equal(creator.address);
    });

    it("未认证创作者铸造应该失败", async function () {
      const { originalWork, derivativeCreator: unverified } = await loadFixture(deployAll);
      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_CHIP_002"));

      await expect(
        originalWork.connect(unverified).mintOriginal(
          "ipfs://xxx", nfcHash, "did:fisco:bcos:unverified"
        )
      ).to.be.revertedWith("Not verified creator");
    });

    it("重复绑定同一 NFC 芯片应该失败", async function () {
      const { originalWork, creator } = await loadFixture(deployAll);
      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_CHIP_DUP"));
      const did = "did:fisco:bcos:" + creator.address.toLowerCase();

      await originalWork.connect(creator).mintOriginal("ipfs://A", nfcHash, did);
      await expect(
        originalWork.connect(creator).mintOriginal("ipfs://B", nfcHash, did)
      ).to.be.reverted;
    });
  });

  // ========== 测试 2: 规则设定 ==========
  describe("Policy Setting", function () {
    it("原作持有者应该成功设定二创规则", async function () {
      const { originalWork, derivativeRule, creator } = await loadFixture(deployAll);
      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_POLICY_01"));
      const did = "did:fisco:bcos:" + creator.address.toLowerCase();

      await originalWork.connect(creator).mintOriginal("ipfs://QmTest", nfcHash, did);

      const allowedTypes = [
        ethers.keccak256(ethers.toUtf8Bytes("remix")),
        ethers.keccak256(ethers.toUtf8Bytes("recolor")),
      ];

      const expireTime = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
      await derivativeRule.connect(creator).setPolicy(
        await originalWork.getAddress(), 0, true, allowedTypes,
        500, 100, false, expireTime, true
      );

      const policy = await derivativeRule.getPolicy(await originalWork.getAddress(), 0);
      expect(policy.allowsDerivative).to.be.true;
      expect(policy.royaltyBps).to.equal(500);
      expect(policy.maxSupply).to.equal(100);
    });

    it("非原作持有者设定规则应该失败", async function () {
      const { originalWork, derivativeRule, creator, derivativeCreator: other } =
        await loadFixture(deployAll);
      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_POLICY_02"));
      const did = "did:fisco:bcos:" + creator.address.toLowerCase();

      await originalWork.connect(creator).mintOriginal("ipfs://QmTest", nfcHash, did);

      const allowedTypes = [ethers.keccak256(ethers.toUtf8Bytes("remix"))];
      const expireTime = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

      await expect(
        derivativeRule.connect(other).setPolicy(
          await originalWork.getAddress(), 0, true, allowedTypes,
          500, 100, false, expireTime, true
        )
      ).to.be.revertedWith("ERR: not original owner");
    });
  });

  // ========== 测试 3: 衍生品提交（核心流程） ==========
  describe("Derivative Submission", function () {
    async function setupWithPolicy() {
      const ctx = await deployAll();
      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_DERIV_01"));
      const did = "did:fisco:bcos:" + ctx.creator.address.toLowerCase();

      await ctx.originalWork.connect(ctx.creator).mintOriginal(
        "ipfs://QmOrg", nfcHash, did
      );

      const allowedTypes = [ethers.keccak256(ethers.toUtf8Bytes("remix"))];
      const expireTime = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
      await ctx.derivativeRule.connect(ctx.creator).setPolicy(
        await ctx.originalWork.getAddress(), 0, true, allowedTypes,
        1000, 50, false, expireTime, false
      );

      return ctx;
    }

    it("完整流程：提交衍生品 → 铸造 → 溯源", async function () {
      const { derivativeRule, derivativeNFT, derivativeCreator } =
        await loadFixture(setupWithPolicy);

      const derivTypeHash = ethers.keccak256(ethers.toUtf8Bytes("remix"));
      const tx = await derivativeRule.connect(derivativeCreator).submitDerivative(
        await derivativeRule.originalWorkAddr(), 0,
        derivTypeHash,
        ethers.ZeroHash,
        "ipfs://QmDerivMeta"
      );
      const receipt = await tx.wait();

      // 验证溯源
      const trace = await derivativeRule.traceDerivative(
        await derivativeNFT.getAddress(), 0
      );
      expect(trace.verified).to.be.true;
      expect(trace.derivativeCreator).to.equal(derivativeCreator.address);
    });

    it("二创被禁止时提交应该失败", async function () {
      const { originalWork, derivativeRule, derivativeCreator, creator } =
        await loadFixture(deployAll);

      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_NO_DERIV"));
      const did = "did:fisco:bcos:" + creator.address.toLowerCase();
      await originalWork.connect(creator).mintOriginal("ipfs://QmOrg", nfcHash, did);

      // 不设定规则，默认不允许二创
      await expect(
        derivativeRule.connect(derivativeCreator).submitDerivative(
          await originalWork.getAddress(), 0,
          ethers.keccak256(ethers.toUtf8Bytes("remix")),
          ethers.ZeroHash, "ipfs://xxx"
        )
      ).to.be.revertedWith("ERR: derivatives not allowed");
    });

    it("超过最大发行量应该失败", async function () {
      const { derivativeRule, derivativeCreator } = await loadFixture(setupWithPolicy);

      // maxSupply = 50, 第 51 次应该失败
      for (let i = 0; i < 50; i++) {
        await derivativeRule.connect(derivativeCreator).submitDerivative(
          await derivativeRule.originalWorkAddr(), 0,
          ethers.keccak256(ethers.toUtf8Bytes("remix")),
          ethers.ZeroHash,
          `ipfs://QmDeriv${i}`
        );
      }

      await expect(
        derivativeRule.connect(derivativeCreator).submitDerivative(
          await derivativeRule.originalWorkAddr(), 0,
          ethers.keccak256(ethers.toUtf8Bytes("remix")),
          ethers.ZeroHash,
          "ipfs://QmDerivOverflow"
        )
      ).to.be.revertedWith("ERR: supply limit reached");
    });

    it("规则过期后提交应该失败", async function () {
      const { originalWork, derivativeRule, derivativeCreator, creator } =
        await loadFixture(deployAll);

      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_EXPIRED"));
      const did = "did:fisco:bcos:" + creator.address.toLowerCase();
      await originalWork.connect(creator).mintOriginal("ipfs://QmOrg", nfcHash, did);

      const allowedTypes = [ethers.keccak256(ethers.toUtf8Bytes("remix"))];
      // 设定一个较长的过期时间，然后再快进使其过期
      const expireTime = Math.floor(Date.now() / 1000) + 3600;
      await derivativeRule.connect(creator).setPolicy(
        await originalWork.getAddress(), 0, true, allowedTypes,
        500, 100, false, expireTime, true
      );

      // 快进 4000 秒让规则过期
      await ethers.provider.send("evm_increaseTime", [4000]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        derivativeRule.connect(derivativeCreator).submitDerivative(
          await originalWork.getAddress(), 0,
          ethers.keccak256(ethers.toUtf8Bytes("remix")),
          ethers.ZeroHash, "ipfs://xxx"
        )
      ).to.be.revertedWith("ERR: policy expired");
    });

    it("不允许的二创类型应该失败", async function () {
      const { originalWork, derivativeRule, derivativeCreator, creator } =
        await loadFixture(deployAll);

      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_TYPE"));
      const did = "did:fisco:bcos:" + creator.address.toLowerCase();
      await originalWork.connect(creator).mintOriginal("ipfs://QmOrg", nfcHash, did);

      const allowedTypes = [ethers.keccak256(ethers.toUtf8Bytes("recolor"))]; // 只允许改色
      const expireTime = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
      await derivativeRule.connect(creator).setPolicy(
        await originalWork.getAddress(), 0, true, allowedTypes,
        500, 100, false, expireTime, true
      );

      // 尝试 remix 类型（不在允许列表中）
      await expect(
        derivativeRule.connect(derivativeCreator).submitDerivative(
          await originalWork.getAddress(), 0,
          ethers.keccak256(ethers.toUtf8Bytes("remix")),
          ethers.ZeroHash, "ipfs://xxx"
        )
      ).to.be.revertedWith("ERR: type not allowed");
    });
  });

  // ========== 测试 4: 冻结机制 ==========
  describe("Freeze Mechanism", function () {
    it("管理员可以冻结违规衍生品", async function () {
      const { derivativeRule, derivativeNFT, derivativeCreator, originalWork, creator } =
        await loadFixture(deployAll);

      const nfcHash = ethers.keccak256(ethers.toUtf8Bytes("NFC_FREEZE"));
      const did = "did:fisco:bcos:" + creator.address.toLowerCase();
      await originalWork.connect(creator).mintOriginal("ipfs://QmOrg", nfcHash, did);

      const allowedTypes = [ethers.keccak256(ethers.toUtf8Bytes("remix"))];
      const expireTime = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
      await derivativeRule.connect(creator).setPolicy(
        await originalWork.getAddress(), 0, true, allowedTypes,
        500, 100, false, expireTime, true
      );

      await derivativeRule.connect(derivativeCreator).submitDerivative(
        await originalWork.getAddress(), 0,
        ethers.keccak256(ethers.toUtf8Bytes("remix")),
        ethers.ZeroHash, "ipfs://QmDeriv"
      );

      // 管理员冻结
      await derivativeRule.freezeDerivative(await derivativeNFT.getAddress(), 0);

      const trace = await derivativeRule.traceDerivative(
        await derivativeNFT.getAddress(), 0
      );
      expect(trace.verified).to.be.false;
    });
  });
});
