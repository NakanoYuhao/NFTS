// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title NFC 芯片链上防伪注册表
/// @notice 将 NFC 芯片 UID、厂商签名、NFT 绑定关系上链存证
contract NfcSealRegistry is Ownable {

    using ECDSA for bytes32;

    struct Seal {
        bytes32 nfcUID;            // NTAG 芯片 UID 哈希
        bytes vendorSignature;     // NXP 厂商 ECC 签名
        bytes issuerSignature;     // 平台签发者签名
        address boundNFT;          // 绑定的 NFT 合约地址
        uint256 boundTokenId;      // 绑定的 tokenID
        uint256 registeredAt;
        bool active;
    }

    mapping(bytes32 => Seal) public seals;

    // 平台授权签名者
    mapping(address => bool) public authorizedSigners;

    event SealRegistered(
        bytes32 indexed nfcUID,
        address indexed nftContract,
        uint256 indexed tokenId
    );
    event SealRevoked(bytes32 indexed nfcUID);

    constructor() Ownable() {
        authorizedSigners[msg.sender] = true;
    }

    modifier onlySigner() {
        require(authorizedSigners[msg.sender], "Not authorized signer");
        _;
    }

    function addSigner(address signer) external onlyOwner {
        authorizedSigners[signer] = true;
    }

    function removeSigner(address signer) external onlyOwner {
        authorizedSigners[signer] = false;
    }

    /// @notice 注册 NFC 芯片防伪密封
    /// @param nfcUID          NFC 芯片 UID 的哈希
    /// @param vendorSignature NXP 厂商 ECC 签名原文
    /// @param issuerSignature 平台签发者对 (nfcUID + nftContract + tokenId) 的签名
    function registerSeal(
        bytes32 nfcUID,
        bytes calldata vendorSignature,
        bytes calldata issuerSignature,
        address nftContract,
        uint256 tokenId
    ) external {
        require(seals[nfcUID].registeredAt == 0, "Seal already registered");

        // 验证签发者签名
        bytes32 messageHash = keccak256(
            abi.encodePacked(nfcUID, nftContract, tokenId)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(issuerSignature);
        require(authorizedSigners[recoveredSigner], "Invalid issuer signature");

        seals[nfcUID] = Seal({
            nfcUID: nfcUID,
            vendorSignature: vendorSignature,
            issuerSignature: issuerSignature,
            boundNFT: nftContract,
            boundTokenId: tokenId,
            registeredAt: block.timestamp,
            active: true
        });

        emit SealRegistered(nfcUID, nftContract, tokenId);
    }

    /// @notice 查验 NFC 芯片的防伪密封
    function verifySeal(bytes32 nfcUID) external view returns (
        address nftContract,
        uint256 tokenId,
        bool active,
        uint256 registeredAt
    ) {
        Seal storage seal = seals[nfcUID];
        require(seal.registeredAt > 0, "Seal not found");

        return (seal.boundNFT, seal.boundTokenId, seal.active, seal.registeredAt);
    }

    /// @notice 吊销防伪密封
    function revokeSeal(bytes32 nfcUID) external onlySigner {
        require(seals[nfcUID].registeredAt > 0, "Seal not found");
        seals[nfcUID].active = false;
        emit SealRevoked(nfcUID);
    }
}
