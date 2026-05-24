// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title 衍生作品 NFT 合约
/// @notice 二创完成后的衍生作品，绑定原始作品和授权许可
contract DerivativeNFT is ERC721, ERC721URIStorage, ERC721Royalty, Ownable {

    uint256 private _nextTokenId;
    address public ruleEngineAddr;

    struct DerivativeInfo {
        address originalContract;
        uint256 originalTokenId;
        uint256 licenseId;
        address creator;
    }

    mapping(uint256 => DerivativeInfo) public derivativeInfo;

    event DerivativeMinted(
        uint256 indexed tokenId,
        address indexed creator,
        uint256 indexed licenseId,
        string metadataCid
    );

    constructor()
        ERC721("NFCTrendyDerivative", "NTD")
        Ownable()
    {}

    modifier onlyRuleEngine() {
        require(msg.sender == ruleEngineAddr, "Only RuleEngine");
        _;
    }

    function setRuleEngine(address _engine) external onlyOwner {
        ruleEngineAddr = _engine;
    }

    /// @notice 铸造衍生 NFT（仅规则引擎可调用）
    function mintDerivative(
        address creator,
        address originalContract,
        uint256 originalTokenId,
        uint256 licenseId,
        string memory metadataCid
    ) external onlyRuleEngine returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(creator, tokenId);
        _setTokenURI(tokenId, metadataCid);

        derivativeInfo[tokenId] = DerivativeInfo({
            originalContract: originalContract,
            originalTokenId: originalTokenId,
            licenseId: licenseId,
            creator: creator
        });

        // 设置版税接收者为原创作
        _setTokenRoyalty(tokenId, creator, 500); // 默认 5% 可后续调整

        emit DerivativeMinted(tokenId, creator, licenseId, metadataCid);
    }

    /// @notice 设置单个衍生品的版税
    function setDerivativeRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 royaltyBps
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _setTokenRoyalty(tokenId, receiver, royaltyBps);
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
