// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title 原始作品 NFT 合约
/// @notice 代表 NFC 潮玩的"原作"，绑定 NFC 芯片 UID 和创作者 DID
contract OriginalWork is ERC721, ERC721URIStorage, ERC721Royalty, Ownable {
    uint256 private _nextTokenId;

    // 外部合约地址
    address public creatorRegistryAddr;

    // NFC 芯片 UID 哈希 → tokenID（一个芯片只能绑定一个 NFT）
    mapping(bytes32 => uint256) public nfcToToken;
    // NFC 芯片 UID 哈希 → 是否已绑定
    mapping(bytes32 => bool) public nfcIsBound;
    // tokenID → 创作者地址
    mapping(uint256 => address) public tokenCreator;

    event OriginalMinted(
        uint256 indexed tokenId,
        address indexed creator,
        bytes32 nfcChipUID,
        string metadataCid
    );

    constructor(
        address _creatorRegistry,
        address defaultRoyaltyReceiver,
        uint96 defaultRoyaltyBps
    )
        ERC721("NFCTrendyOriginal", "NTO")
        Ownable()
    {
        creatorRegistryAddr = _creatorRegistry;
        _setDefaultRoyalty(defaultRoyaltyReceiver, defaultRoyaltyBps);
    }

    /// @notice 铸造原作 NFT（仅已验证创作者可调用）
    /// @param metadataCid  元数据 IPFS CID
    /// @param nfcChipUID   NFC 芯片 UID 的哈希
    /// @param creatorDid   创作者的 DID 字符串
    function mintOriginal(
        address creator,
        string memory metadataCid,
        bytes32 nfcChipUID,
        string calldata creatorDid
    ) external returns (uint256 tokenId) {
        // 校验：指定的创作者必须已通过链上认证
        require(
            ICreatorRegistry(creatorRegistryAddr).isVerifiedCreator(creator),
            "Not verified creator"
        );
        // 校验：NFC 芯片未被绑定过
        require(!nfcIsBound[nfcChipUID], "NFC chip already bound");

        tokenId = _nextTokenId++;
        _safeMint(creator, tokenId);
        _setTokenURI(tokenId, metadataCid);

        nfcToToken[nfcChipUID] = tokenId;
        nfcIsBound[nfcChipUID] = true;
        tokenCreator[tokenId] = creator;

        emit OriginalMinted(tokenId, creator, nfcChipUID, metadataCid);
    }

    /// @notice 通过 NFC 芯片 UID 验证真伪
    function verifyByNfc(bytes32 nfcChipUID) external view returns (
        uint256 tokenId,
        address creator,
        string memory metadataCid,
        bool valid
    ) {
        tokenId = nfcToToken[nfcChipUID];
        if (tokenId == 0) return (0, address(0), "", false);
        if (_ownerOf(tokenId) == address(0)) return (tokenId, address(0), "", false);

        creator = tokenCreator[tokenId];
        metadataCid = tokenURI(tokenId);
        valid = true;
    }

    /// @notice 更新合约引用的注册表地址
    function setCreatorRegistry(address _registry) external onlyOwner {
        creatorRegistryAddr = _registry;
    }

    // ========== override ==========

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage, ERC721Royalty)
    {
        super._burn(tokenId);
    }
}

interface ICreatorRegistry {
    function isVerifiedCreator(address addr) external view returns (bool);
}
