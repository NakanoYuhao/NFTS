// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title 授权许可令牌（ERC-1155）
/// @notice 二创作者获得的授权凭证，绑定具体规则和有效期
contract LicenseToken is ERC1155, Ownable {

    uint256 private _nextLicenseId;

    struct LicenseMeta {
        address originalContract;    // 原作合约地址
        uint256 originalTokenId;     // 原作 tokenID
        address derivativeCreator;   // 二创作者
        bytes32 derivativeType;      // 二创类型哈希
        uint96 royaltyBps;           // 版税基点
        uint256 maxSupply;           // 许可最大衍生数
        bool requireNfc;
        uint256 expireTime;
        bool isRevoked;
    }

    mapping(uint256 => LicenseMeta) public licenseMeta;

    // 仅允许 DerivativeRule 合约调用
    address public ruleEngineAddr;

    event LicenseMinted(uint256 indexed licenseId, address indexed to);
    event LicenseRevoked(uint256 indexed licenseId);

    constructor()
        ERC1155("")
        Ownable()
    {}

    modifier onlyRuleEngine() {
        require(msg.sender == ruleEngineAddr, "Only RuleEngine");
        _;
    }

    function setRuleEngine(address _engine) external onlyOwner {
        ruleEngineAddr = _engine;
    }

    /// @notice 铸造授权许可（仅规则引擎可调用）
    function mintLicense(
        address to,
        address originalContract,
        uint256 originalTokenId,
        bytes32 derivativeType,
        uint96 royaltyBps,
        uint256 maxSupply,
        bool requireNfc,
        uint256 expireTime
    ) external onlyRuleEngine returns (uint256 licenseId) {
        licenseId = _nextLicenseId++;

        licenseMeta[licenseId] = LicenseMeta({
            originalContract: originalContract,
            originalTokenId: originalTokenId,
            derivativeCreator: to,
            derivativeType: derivativeType,
            royaltyBps: royaltyBps,
            maxSupply: maxSupply,
            requireNfc: requireNfc,
            expireTime: expireTime,
            isRevoked: false
        });

        _mint(to, licenseId, 1, "");

        emit LicenseMinted(licenseId, to);
    }

    /// @notice 吊销许可
    function revokeLicense(uint256 licenseId) external onlyOwner {
        licenseMeta[licenseId].isRevoked = true;
        emit LicenseRevoked(licenseId);
    }

    /// @notice 检查许可是否有效
    function isLicenseValid(uint256 licenseId, address holder) external view returns (bool) {
        LicenseMeta memory meta = licenseMeta[licenseId];
        if (meta.isRevoked) return false;
        if (block.timestamp > meta.expireTime) return false;
        if (balanceOf(holder, licenseId) < 1) return false;
        return true;
    }
}
