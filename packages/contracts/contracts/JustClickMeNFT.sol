// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract JustClickMeNFT is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public nextTokenId;
    mapping(uint256 => uint256) public lockedUntil;

    event MintLocked(address indexed to, uint256 indexed tokenId, uint256 lockedUntil);

    constructor(address admin) ERC721("JustClickMe NFT", "JCMNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mintLocked(address to, uint256 lockDurationSeconds) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        lockedUntil[tokenId] = block.timestamp + lockDurationSeconds;
        emit MintLocked(to, tokenId, lockedUntil[tokenId]);
        return tokenId;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        require(block.timestamp >= lockedUntil[tokenId] || auth == address(0), "JustClickMeNFT: token locked");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
