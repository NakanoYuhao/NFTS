// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * OPEN-NFTs — 极简 ERC-721 NFT 合约
 *
 * 功能：
 *   - safeMint(address to, string uri): 铸造 NFT（任何人可调用，调用者付 Gas）
 *   - tokenURI(uint256): 查询元数据 URI
 *   - 标准 ERC-721 只读接口
 *
 * 部署方式：
 *   方式1: 使用 Remix (https://remix.ethereum.org) 在线编译部署
 *   方式2: 使用项目 scripts/deploy-contract.ts 脚本部署
 *   方式3: 使用 Hardhat/Foundry 等工具部署
 *
 * 部署后，将合约地址配置到环境变量 NEXT_PUBLIC_NFT_CONTRACT_ADDRESS
 */

contract OpenNFT {
    // ============ 存储 ============
    string public name;
    string public symbol;
    uint256 private _nextTokenId;
    address public owner;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    // ============ 事件 ============
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // ============ 修饰符 ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    // ============ 构造函数 ============
    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
        owner = msg.sender;
        _nextTokenId = 1;
    }

    // ============ 铸造 ============
    /**
     * 铸造新 NFT
     * @param to 接收地址
     * @param uri 元数据 URI (ipfs://... 或 https://...)
     * @return tokenId 铸造的 Token ID
     */
    function safeMint(address to, string memory uri) external returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _owners[tokenId] = to;
        _balances[to]++;
        _tokenURIs[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);

        return tokenId;
    }

    // ============ ERC-721 只读 ============

    function balanceOf(address addr) external view returns (uint256) {
        require(addr != address(0), "Zero address query");
        return _balances[addr];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Token does not exist");
        return o;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ============ ERC-721 转移 ============

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "Not token owner");
        require(to != address(0), "Cannot transfer to zero address");
        require(
            msg.sender == from || msg.sender == owner,
            "Not authorized"
        );

        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    // ============ 管理功能 ============

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
