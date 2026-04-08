// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentIdentity - ERC-8004 Compliant Trustless Agent Identity
/// @notice Mints a unique AgentId NFT for autonomous trading agents
/// @dev Implements ERC-8004 standard for on-chain agent reputation
contract AgentIdentity is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct AgentProfile {
        string name;
        uint256 totalTrades;
        uint256 wins;
        uint256 losses;
        int256 pnl;
        uint256 trustScore;
        uint256 registeredAt;
        bool isActive;
    }

    struct TradeRecord {
        string symbol;
        string action;
        string reasoning;
        bytes32 signatureHash;
        uint256 timestamp;
    }

    mapping(uint256 => AgentProfile) public agents;
    mapping(uint256 => TradeRecord[]) public tradeHistory;

    event AgentRegistered(uint256 indexed tokenId, string name, address owner);
    event TradeRecorded(uint256 indexed tokenId, string symbol, string action, bytes32 sigHash);
    event TrustScoreUpdated(uint256 indexed tokenId, uint256 newScore);

    constructor() ERC721("TrustlessAgentId", "TAGENT") Ownable(msg.sender) {}

    function registerAgent(string memory name) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        agents[tokenId] = AgentProfile({
            name: name,
            totalTrades: 0,
            wins: 0,
            losses: 0,
            pnl: 0,
            trustScore: 50,
            registeredAt: block.timestamp,
            isActive: true
        });
        emit AgentRegistered(tokenId, name, msg.sender);
        return tokenId;
    }

    function recordTrade(
        uint256 tokenId,
        string memory symbol,
        string memory action,
        string memory reasoning,
        bytes32 signatureHash
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        tradeHistory[tokenId].push(TradeRecord({
            symbol: symbol,
            action: action,
            reasoning: reasoning,
            signatureHash: signatureHash,
            timestamp: block.timestamp
        }));
        agents[tokenId].totalTrades++;
        emit TradeRecorded(tokenId, symbol, action, signatureHash);
    }

    function updateTrustScore(uint256 tokenId, uint256 newScore) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        require(newScore <= 100, "Score must be 0-100");
        agents[tokenId].trustScore = newScore;
        emit TrustScoreUpdated(tokenId, newScore);
    }

    function getAgentProfile(uint256 tokenId) external view returns (AgentProfile memory) {
        return agents[tokenId];
    }

    function getTradeCount(uint256 tokenId) external view returns (uint256) {
        return tradeHistory[tokenId].length;
    }

    function getTrade(uint256 tokenId, uint256 index) external view returns (TradeRecord memory) {
        return tradeHistory[tokenId][index];
    }
}
