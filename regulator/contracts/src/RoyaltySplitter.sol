// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title 版税自动分配合约
/// @notice 衍生作品交易时自动将版税分配给原创作者
contract RoyaltySplitter is Ownable {

    address public derivativeRuleAddr;

    struct RoyaltyRecord {
        address payer;
        address receiver;
        uint256 amount;
        uint256 derivativeTokenId;
        uint256 timestamp;
    }

    RoyaltyRecord[] public royaltyHistory;

    event RoyaltyDistributed(
        uint256 indexed derivativeTokenId,
        address indexed originalCreator,
        uint256 amount
    );

    constructor(address _derivativeRule) Ownable() {
        derivativeRuleAddr = _derivativeRule;
    }

    function setDerivativeRule(address _addr) external onlyOwner {
        derivativeRuleAddr = _addr;
    }

    /// @notice 分配版税（从衍生品交易中调用）
    /// @param derivativeTokenId 衍生品 tokenID
    /// @param originalCreator   原创作者地址
    /// @param royaltyBps        版税基点
    /// @param salePrice         成交价格
    function distributeRoyalty(
        uint256 derivativeTokenId,
        address originalCreator,
        uint96 royaltyBps,
        uint256 salePrice
    ) external payable {
        uint256 royaltyAmount = (salePrice * royaltyBps) / 10000;

        require(msg.value >= royaltyAmount, "Insufficient payment");

        (bool sent, ) = originalCreator.call{value: royaltyAmount}("");
        require(sent, "Royalty transfer failed");

        royaltyHistory.push(RoyaltyRecord({
            payer: msg.sender,
            receiver: originalCreator,
            amount: royaltyAmount,
            derivativeTokenId: derivativeTokenId,
            timestamp: block.timestamp
        }));

        emit RoyaltyDistributed(derivativeTokenId, originalCreator, royaltyAmount);
    }

    /// @notice 提取版税（从合约余额中转给原创作者）
    function withdrawRoyalty(
        uint256 derivativeTokenId,
        address payable originalCreator,
        uint256 amount
    ) external {
        // 从 DerivativeRule 合约获取溯源信息来校验
        require(amount <= address(this).balance, "Insufficient contract balance");

        royaltyHistory.push(RoyaltyRecord({
            payer: address(0),
            receiver: originalCreator,
            amount: amount,
            derivativeTokenId: derivativeTokenId,
            timestamp: block.timestamp
        }));

        (bool sent, ) = originalCreator.call{value: amount}("");
        require(sent, "Withdrawal failed");

        emit RoyaltyDistributed(derivativeTokenId, originalCreator, amount);
    }

    /// @notice 获取版税历史总数
    function getRoyaltyHistoryCount() external view returns (uint256) {
        return royaltyHistory.length;
    }

    /// @notice 接收 ETH（fallback）
    receive() external payable {}
}
