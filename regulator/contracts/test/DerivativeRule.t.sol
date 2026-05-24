// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CreatorRegistry.sol";
import "../src/OriginalWork.sol";
import "../src/LicenseToken.sol";
import "../src/DerivativeNFT.sol";
import "../src/DerivativeRule.sol";

contract DerivativeRuleTest is Test {
    CreatorRegistry public registry;
    OriginalWork public originalWork;
    LicenseToken public licenseToken;
    DerivativeNFT public derivativeNFT;
    DerivativeRule public rule;

    address public admin = address(0x1);
    address public creator = address(0x2);
    address public derivativeCreator = address(0x3);
    address public regulator = address(0x4);

    function setUp() public {
        vm.startPrank(admin);

        // 1. 部署所有合约
        registry = new CreatorRegistry();
        originalWork = new OriginalWork(address(registry), admin, 500);
        licenseToken = new LicenseToken();
        derivativeNFT = new DerivativeNFT();
        rule = new DerivativeRule(
            address(originalWork), address(derivativeNFT),
            address(licenseToken), address(registry)
        );

        licenseToken.setRuleEngine(address(rule));
        derivativeNFT.setRuleEngine(address(rule));

        // 2. 注册监管者
        registry.assignRole(regulator, CreatorRegistry.Role.Regulator);

        vm.stopPrank();

        // 3. 注册并认证创作者
        vm.startPrank(creator);
        registry.registerCreator("did:fisco:bcos:0x2", keccak256("did_doc"));
        vm.stopPrank();

        vm.prank(admin);
        registry.verifyCreator(creator);
    }

    // ========== 铸造原作测试 ==========

    function test_MintOriginalWork() public {
        vm.prank(creator);
        uint256 tokenId = originalWork.mintOriginal(
            "ipfs://QmOriginalMeta", bytes32(uint256(0xABCD)), "did:fisco:bcos:0x2"
        );

        assertEq(tokenId, 0);
        assertEq(originalWork.ownerOf(tokenId), creator);
        assertEq(originalWork.tokenCreator(tokenId), creator);
    }

    function test_RevertMintByUnverifiedCreator() public {
        address unverified = address(0x99);
        vm.prank(unverified);
        registry.registerCreator("did:fisco:bcos:0x99", keccak256("did99"));

        vm.prank(unverified);
        vm.expectRevert("Not verified creator");
        originalWork.mintOriginal("ipfs://xxx", bytes32(uint256(1)), "did:fisco:bcos:0x99");
    }

    function test_RevertDuplicateNfc() public {
        vm.startPrank(creator);
        originalWork.mintOriginal("ipfs://A", bytes32(uint256(0x111)), "did:fisco:bcos:0x2");

        vm.expectRevert("NFC chip already bound");
        originalWork.mintOriginal("ipfs://B", bytes32(uint256(0x111)), "did:fisco:bcos:0x2");
        vm.stopPrank();
    }

    // ========== 规则设定测试 ==========

    function test_SetPolicy() public {
        vm.startPrank(creator);
        originalWork.mintOriginal("ipfs://QmTest", bytes32(uint256(0xAAA)), "did:fisco:bcos:0x2");

        bytes32[] memory allowedTypes = new bytes32[](2);
        allowedTypes[0] = keccak256("remix");
        allowedTypes[1] = keccak256("recolor");

        rule.setPolicy(
            address(originalWork), 0, true, allowedTypes,
            500, 100, false, block.timestamp + 365 days, true
        );

        DerivativeRule.DerivativePolicy memory p = rule.getPolicy(address(originalWork), 0);
        assertTrue(p.allowsDerivative);
        assertEq(p.royaltyBps, 500);
        assertEq(p.maxSupply, 100);
        assertEq(p.allowCommercial, true);
        vm.stopPrank();
    }

    function test_RevertSetPolicyByNonOwner() public {
        vm.prank(creator);
        originalWork.mintOriginal("ipfs://QmTest", bytes32(uint256(0xBBB)), "did:fisco:bcos:0x2");

        bytes32[] memory types = new bytes32[](1);
        types[0] = keccak256("remix");

        vm.prank(address(0xdead));
        vm.expectRevert("ERR: not original owner");
        rule.setPolicy(
            address(originalWork), 0, true, types,
            500, 100, false, block.timestamp + 365 days, true
        );
    }

    // ========== 衍生品提交测试（完整流程） ==========

    function test_SubmitDerivativeSuccess() public {
        // Step 1: 铸造原作
        vm.prank(creator);
        originalWork.mintOriginal("ipfs://QmOrg", bytes32(uint256(0xCCC)), "did:fisco:bcos:0x2");

        // Step 2: 设定二创规则
        bytes32[] memory allowedTypes = new bytes32[](1);
        allowedTypes[0] = keccak256("remix");

        vm.prank(creator);
        rule.setPolicy(
            address(originalWork), 0, true, allowedTypes,
            1000, 50, false, block.timestamp + 365 days, false
        );

        // Step 3: 二创作者提交衍生作品
        vm.prank(derivativeCreator);
        uint256 derivTokenId = rule.submitDerivative(
            address(originalWork), 0,
            keccak256("remix"),
            bytes32(0),
            "ipfs://QmDerivMeta"
        );

        // Step 4: 验证溯源
        DerivativeRule.DerivativeRecord memory trace = rule.traceDerivative(
            address(derivativeNFT), derivTokenId
        );
        assertTrue(trace.verified);
        assertEq(trace.originalTokenId, 0);
        assertEq(trace.derivativeCreator, derivativeCreator);
    }

    function test_RevertDerivativeWhenNotAllowed() public {
        vm.prank(creator);
        originalWork.mintOriginal("ipfs://QmOrg", bytes32(uint256(0xDDD)), "did:fisco:bcos:0x2");

        // 规则：allowsDerivative = false（默认）
        vm.prank(derivativeCreator);
        vm.expectRevert("ERR: derivatives not allowed");
        rule.submitDerivative(
            address(originalWork), 0,
            keccak256("remix"), bytes32(0), "ipfs://xxx"
        );
    }

    function test_RevertDerivativeWhenSupplyExceeded() public {
        vm.prank(creator);
        originalWork.mintOriginal("ipfs://QmOrg", bytes32(uint256(0xEEE)), "did:fisco:bcos:0x2");

        bytes32[] memory allowedTypes = new bytes32[](1);
        allowedTypes[0] = keccak256("remix");

        // 最多 1 件衍生
        vm.prank(creator);
        rule.setPolicy(
            address(originalWork), 0, true, allowedTypes,
            500, 1, false, block.timestamp + 365 days, true
        );

        // 第一个成功
        vm.prank(derivativeCreator);
        rule.submitDerivative(address(originalWork), 0, keccak256("remix"), bytes32(0), "ipfs://A");

        // 第二个失败
        vm.prank(address(0x77));
        vm.expectRevert("ERR: supply limit reached");
        rule.submitDerivative(address(originalWork), 0, keccak256("remix"), bytes32(0), "ipfs://B");
    }

    function test_RevertDerivativeWhenExpired() public {
        vm.prank(creator);
        originalWork.mintOriginal("ipfs://QmOrg", bytes32(uint256(0xFFF)), "did:fisco:bcos:0x2");

        bytes32[] memory allowedTypes = new bytes32[](1);
        allowedTypes[0] = keccak256("remix");

        vm.prank(creator);
        rule.setPolicy(
            address(originalWork), 0, true, allowedTypes,
            500, 100, false, block.timestamp + 1, true // 1 秒后过期
        );

        vm.warp(block.timestamp + 2); // 快进 2 秒

        vm.prank(derivativeCreator);
        vm.expectRevert("ERR: policy expired");
        rule.submitDerivative(address(originalWork), 0, keccak256("remix"), bytes32(0), "ipfs://xxx");
    }

    function test_RevertDerivativeTypeNotAllowed() public {
        vm.prank(creator);
        originalWork.mintOriginal("ipfs://QmOrg", bytes32(uint256(0x1111)), "did:fisco:bcos:0x2");

        bytes32[] memory allowedTypes = new bytes32[](1);
        allowedTypes[0] = keccak256("recolor"); // 只允许改色

        vm.prank(creator);
        rule.setPolicy(
            address(originalWork), 0, true, allowedTypes,
            500, 100, false, block.timestamp + 365 days, true
        );

        vm.prank(derivativeCreator);
        vm.expectRevert("ERR: type not allowed");
        rule.submitDerivative(address(originalWork), 0, keccak256("remix"), bytes32(0), "ipfs://xxx");
    }

    // ========== 冻结测试 ==========

    function test_FreezeDerivative() public {
        // 完整流程
        vm.prank(creator);
        originalWork.mintOriginal("ipfs://QmOrg", bytes32(uint256(0x2222)), "did:fisco:bcos:0x2");

        bytes32[] memory types = new bytes32[](1);
        types[0] = keccak256("remix");

        vm.prank(creator);
        rule.setPolicy(address(originalWork), 0, true, types, 500, 100, false, block.timestamp + 365, true);

        vm.prank(derivativeCreator);
        uint256 dtId = rule.submitDerivative(address(originalWork), 0, keccak256("remix"), bytes32(0), "ipfs://D");

        // 冻结
        vm.prank(admin);
        rule.freezeDerivative(address(derivativeNFT), dtId);

        DerivativeRule.DerivativeRecord memory trace = rule.traceDerivative(address(derivativeNFT), dtId);
        assertFalse(trace.verified);
    }
}
