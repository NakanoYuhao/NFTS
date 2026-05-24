// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";

/// @title 二创规则引擎（核心合约）
/// @notice 锁定创作规则，强制执行二创授权校验，提供完整溯源链
contract DerivativeRule is Ownable {

    // ========== 数据结构 ==========

    struct DerivativePolicy {
        address originalCreator;
        bool allowsDerivative;
        bytes32[] allowedTypes;    // 允许的二创类型哈希数组
        uint96 royaltyBps;         // 版税基点
        uint256 maxSupply;         // 最大衍生数
        uint256 currentSupply;     // 已授权数
        bool requireNfc;
        uint256 expireTime;
        bool allowCommercial;
    }

    struct DerivativeRecord {
        address originalContract;
        uint256 originalTokenId;
        address derivativeCreator;
        uint256 licenseId;
        bytes32 nfcChipUID;
        string metadataCid;
        bool verified;
        uint256 createdAt;
    }

    // ========== 存储 ==========

    // 原作 → tokenID → 策略
    mapping(address => mapping(uint256 => DerivativePolicy)) public policies;
    // 衍生品合约 → tokenID → 溯源记录
    mapping(address => mapping(uint256 => DerivativeRecord)) public derivativeTrace;
    // 创作者 → 已提交衍生物数量
    mapping(address => uint256) public creatorDerivativeCount;

    address public originalWorkAddr;
    address public derivativeNFTAddr;
    address public licenseTokenAddr;
    address public creatorRegistryAddr;

    // ========== 事件 ==========

    event PolicySet(
        address indexed originalContract,
        uint256 indexed tokenId,
        bytes32 ruleHash
    );
    event DerivativeSubmitRequested(
        address indexed creator,
        address indexed originalContract,
        uint256 indexed originalTokenId
    );
    event DerivativeRegistered(
        address indexed derivativeContract,
        uint256 indexed derivativeTokenId,
        address indexed creator,
        uint256 licenseId
    );
    event DerivativeFrozen(
        address indexed derivativeContract,
        uint256 indexed tokenId
    );

    // ========== 构造函数 ==========

    constructor(
        address _originalWork,
        address _derivativeNFT,
        address _licenseToken,
        address _creatorRegistry
    ) Ownable() {
        originalWorkAddr = _originalWork;
        derivativeNFTAddr = _derivativeNFT;
        licenseTokenAddr = _licenseToken;
        creatorRegistryAddr = _creatorRegistry;
    }

    // ========== 策略管理 ==========

    /// @notice IP 方/原作持有者设定二创规则
    /// @param operator 操作者地址（由后端传入，不依赖 msg.sender）
    function setPolicy(
        address operator,
        address originalContract,
        uint256 originalTokenId,
        bool allowsDerivative,
        bytes32[] calldata allowedTypes,
        uint96 royaltyBps,
        uint256 maxSupply,
        bool requireNfc,
        uint256 expireTime,
        bool allowCommercial
    ) external {
        require(
            IERC721(originalContract).ownerOf(originalTokenId) == operator,
            "ERR: not original owner"
        );
        require(maxSupply > 0 && maxSupply <= 10000, "ERR: invalid maxSupply");
        require(royaltyBps <= 3000, "ERR: royalty too high");  // 最大 30%
        require(expireTime > block.timestamp, "ERR: already expired");

        policies[originalContract][originalTokenId] = DerivativePolicy({
            originalCreator: operator,
            allowsDerivative: allowsDerivative,
            allowedTypes: allowedTypes,
            royaltyBps: royaltyBps,
            maxSupply: maxSupply,
            currentSupply: policies[originalContract][originalTokenId].currentSupply, // 保留已有计数
            requireNfc: requireNfc,
            expireTime: expireTime,
            allowCommercial: allowCommercial
        });

        bytes32 ruleHash = keccak256(abi.encode(
            originalTokenId, allowsDerivative, allowedTypes,
            royaltyBps, maxSupply, requireNfc, expireTime, allowCommercial
        ));

        emit PolicySet(originalContract, originalTokenId, ruleHash);
    }

    // ========== 衍生品提交（核心流程） ==========

    /// @notice 二创作者提交衍生作品
    /// @param derivativeCreator 二创作者地址（由后端传入）
    function submitDerivative(
        address derivativeCreator,
        address originalContract,
        uint256 originalTokenId,
        bytes32 derivativeType,
        bytes32 nfcChipUID,
        string calldata metadataCid
    ) external returns (uint256 derivativeTokenId) {

        DerivativePolicy storage policy = policies[originalContract][originalTokenId];

        // ===== 链上规则校验 =====
        require(policy.allowsDerivative, "ERR: derivatives not allowed");
        require(block.timestamp < policy.expireTime, "ERR: policy expired");
        require(policy.currentSupply < policy.maxSupply, "ERR: supply limit reached");
        require(_isTypeAllowed(policy.allowedTypes, derivativeType), "ERR: type not allowed");

        if (policy.requireNfc) {
            require(nfcChipUID != bytes32(0), "ERR: NFC binding required");
        }

        // ===== 铸造授权许可令牌 =====
        uint256 licenseId = ILicenseToken(licenseTokenAddr).mintLicense(
            derivativeCreator,
            originalContract,
            originalTokenId,
            derivativeType,
            policy.royaltyBps,
            policy.maxSupply,
            policy.requireNfc,
            policy.expireTime
        );

        // ===== 铸造衍生 NFT =====
        derivativeTokenId = IDerivativeNFT(derivativeNFTAddr).mintDerivative(
            derivativeCreator,
            originalContract,
            originalTokenId,
            licenseId,
            metadataCid
        );

        // ===== 写入溯源记录 =====
        derivativeTrace[derivativeNFTAddr][derivativeTokenId] = DerivativeRecord({
            originalContract: originalContract,
            originalTokenId: originalTokenId,
            derivativeCreator: derivativeCreator,
            licenseId: licenseId,
            nfcChipUID: nfcChipUID,
            metadataCid: metadataCid,
            verified: true,
            createdAt: block.timestamp
        });

        policy.currentSupply += 1;
        creatorDerivativeCount[derivativeCreator] += 1;

        emit DerivativeRegistered(derivativeNFTAddr, derivativeTokenId, derivativeCreator, licenseId);
    }

    // ========== 监管操作 ==========

    /// @notice 监管者冻结违规衍生品
    function freezeDerivative(address derivativeContract, uint256 tokenId) external {
        require(
            ICreatorRegistry(creatorRegistryAddr).isVerifiedCreator(msg.sender) ||
            owner() == msg.sender,
            "ERR: not authorized"
        );
        // 检查监管者角色
        DerivativeRecord storage record = derivativeTrace[derivativeContract][tokenId];
        require(record.createdAt > 0, "ERR: derivative not found");

        record.verified = false;
        emit DerivativeFrozen(derivativeContract, tokenId);
    }

    // ========== 查询函数 ==========

    /// @notice 查询衍生品的完整溯源链
    function traceDerivative(address derivativeContract, uint256 tokenId)
        external view returns (DerivativeRecord memory)
    {
        DerivativeRecord memory record = derivativeTrace[derivativeContract][tokenId];
        require(record.createdAt > 0, "ERR: derivative not found");
        return record;
    }

    /// @notice 查询原作的二创策略
    function getPolicy(address originalContract, uint256 tokenId)
        external view returns (DerivativePolicy memory)
    {
        return policies[originalContract][tokenId];
    }

    /// @notice 查询创作者衍生品数量
    function getCreatorCount(address creator) external view returns (uint256) {
        return creatorDerivativeCount[creator];
    }

    // ========== 内部函数 ==========

    function _isTypeAllowed(bytes32[] storage allowed, bytes32 query)
        internal view returns (bool)
    {
        for (uint256 i = 0; i < allowed.length; i++) {
            if (allowed[i] == query) return true;
        }
        return false;
    }
}

interface IDerivativeNFT {
    function mintDerivative(
        address creator,
        address originalContract,
        uint256 originalTokenId,
        uint256 licenseId,
        string calldata metadataCid
    ) external returns (uint256);
}

interface ILicenseToken {
    function mintLicense(
        address to,
        address originalContract,
        uint256 originalTokenId,
        bytes32 derivativeType,
        uint96 royaltyBps,
        uint256 maxSupply,
        bool requireNfc,
        uint256 expireTime
    ) external returns (uint256);
    function isLicenseValid(uint256 licenseId, address holder) external view returns (bool);
}

interface ICreatorRegistry {
    function isVerifiedCreator(address addr) external view returns (bool);
}
