// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title 创作者 DID 注册表
/// @notice 管理链上地址与 DID 的绑定关系，以及角色和声誉
contract CreatorRegistry is Ownable {
    // ========== 数据结构 ==========

    struct Creator {
        string did;              // did:fisco:bcos:0x...
        bytes32 didHash;         // DID 文档的 keccak256
        uint256 registeredAt;
        bool isVerified;         // 平台认证状态
        uint8 reputationScore;   // 声誉分 0~100
    }

    enum Role { None, Creator, Admin, Regulator }

    // ========== 存储 ==========

    mapping(address => Creator) public creators;
    mapping(string => address) public didToAddress;
    mapping(address => Role) public roles;

    // ========== 事件 ==========

    event CreatorRegistered(address indexed addr, string did);
    event CreatorVerified(address indexed addr);
    event ReputationChanged(address indexed addr, uint8 newScore);
    event RoleAssigned(address indexed addr, Role role);

    // ========== 构造函数 ==========

    constructor() Ownable() {
        roles[msg.sender] = Role.Admin;
    }

    // ========== 核心函数 ==========

    /// @notice 注册创作者身份（平台代用户注册）
    /// @param creator 创作者地址
    /// @param did DID 字符串，如 did:fisco:bcos:0x123...
    /// @param didHash DID 文档的 keccak256 哈希
    function registerCreator(address creator, string calldata did, bytes32 didHash) external {
        require(bytes(did).length > 0, "Empty DID");
        require(creators[creator].registeredAt == 0, "Already registered");
        require(didToAddress[did] == address(0), "DID already bound to another address");

        creators[creator] = Creator({
            did: did,
            didHash: didHash,
            registeredAt: block.timestamp,
            isVerified: false,
            reputationScore: 100
        });

        didToAddress[did] = creator;
        if (roles[creator] == Role.None) {
            roles[creator] = Role.Creator;
        }

        emit CreatorRegistered(creator, did);
        emit RoleAssigned(creator, Role.Creator);
    }

    /// @notice 管理员认证创作者
    function verifyCreator(address creator) external onlyAdmin {
        Creator storage c = creators[creator];
        require(c.registeredAt > 0, "Not registered");
        c.isVerified = true;
        emit CreatorVerified(creator);
    }

    /// @notice 监管者降低创作者声誉
    function penalizeCreator(address creator, uint8 deduction) external onlyRegulator {
        Creator storage c = creators[creator];
        require(c.registeredAt > 0, "Not registered");
        c.reputationScore = c.reputationScore > deduction
            ? c.reputationScore - deduction
            : 0;
        emit ReputationChanged(creator, c.reputationScore);
    }

    /// @notice 分配角色
    function assignRole(address user, Role role) external onlyOwner {
        roles[user] = role;
        emit RoleAssigned(user, role);
    }

    // ========== 查询函数 ==========

    function getCreator(address addr) external view returns (Creator memory) {
        return creators[addr];
    }

    function isCreator(address addr) external view returns (bool) {
        return creators[addr].registeredAt > 0;
    }

    function isVerifiedCreator(address addr) external view returns (bool) {
        return creators[addr].isVerified;
    }

    function getCreatorByDid(string calldata did) external view returns (Creator memory) {
        address addr = didToAddress[did];
        require(addr != address(0), "DID not found");
        return creators[addr];
    }

    // ========== 修饰器 ==========

    modifier onlyAdmin() {
        require(roles[msg.sender] == Role.Admin || roles[msg.sender] == Role.Regulator,
            "Only admin or regulator");
        _;
    }

    modifier onlyRegulator() {
        require(roles[msg.sender] == Role.Regulator, "Only regulator");
        _;
    }
}
