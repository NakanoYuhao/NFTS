// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CreatorRegistry.sol";
import "../src/OriginalWork.sol";
import "../src/LicenseToken.sol";
import "../src/DerivativeNFT.sol";
import "../src/DerivativeRule.sol";
import "../src/RoyaltySplitter.sol";
import "../src/NfcSealRegistry.sol";

/// @title 全套合约部署脚本
/// @notice forge script script/Deploy.s.sol --rpc-url <RPC_URL> --broadcast
contract DeployScript is Script {

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        // 1. 部署创作者注册表
        CreatorRegistry registry = new CreatorRegistry();
        console.log("CreatorRegistry:", address(registry));

        // 2. 部署原作 NFT（版税收款人为部署者，默认 5% 即 500 基点）
        OriginalWork originalWork = new OriginalWork(
            address(registry),
            deployer,   // 默认版税收款人
            500          // 5%
        );
        console.log("OriginalWork:", address(originalWork));

        // 3. 部署授权许可令牌
        LicenseToken licenseToken = new LicenseToken();
        console.log("LicenseToken:", address(licenseToken));

        // 4. 部署衍生 NFT
        DerivativeNFT derivativeNFT = new DerivativeNFT();
        console.log("DerivativeNFT:", address(derivativeNFT));

        // 5. 部署规则引擎（核心）
        DerivativeRule derivativeRule = new DerivativeRule(
            address(originalWork),
            address(derivativeNFT),
            address(licenseToken),
            address(registry)
        );
        console.log("DerivativeRule:", address(derivativeRule));

        // 6. 部署版税分配器
        RoyaltySplitter royaltySplitter = new RoyaltySplitter(
            address(derivativeRule)
        );
        console.log("RoyaltySplitter:", address(royaltySplitter));

        // 7. 部署 NFC 防伪注册表
        NfcSealRegistry nfcSealRegistry = new NfcSealRegistry();
        console.log("NfcSealRegistry:", address(nfcSealRegistry));

        // ---- 设置合约间的相互引用 ----

        // LicenseToken 授权规则引擎调用
        licenseToken.setRuleEngine(address(derivativeRule));

        // DerivativeNFT 授权规则引擎调用
        derivativeNFT.setRuleEngine(address(derivativeRule));

        vm.stopBroadcast();

        // ---- 输出部署摘要 ----
        console.log("\n=== Deployment Summary ===");
        console.log("CreatorRegistry:  ", address(registry));
        console.log("OriginalWork:     ", address(originalWork));
        console.log("LicenseToken:     ", address(licenseToken));
        console.log("DerivativeNFT:    ", address(derivativeNFT));
        console.log("DerivativeRule:   ", address(derivativeRule));
        console.log("RoyaltySplitter:  ", address(royaltySplitter));
        console.log("NfcSealRegistry:  ", address(nfcSealRegistry));
    }
}
