// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract JustClickMeMatrix is Initializable, AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public entryFee;
    address public treasury;

    mapping(address => bool) public active;
    mapping(address => address) public sponsorOf;

    event IDActivated(address indexed user, address indexed sponsor, uint256 amount);
    event ReTopUp(address indexed user, address indexed sponsor, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);
    event EntryFeeUpdated(uint256 newEntryFee);

    function initialize(address admin, address _treasury) public initializer {
        __AccessControl_init();
        __Pausable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        entryFee = 40 * 1e18;
        treasury = _treasury;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    function setEntryFee(uint256 _entryFee) external onlyRole(ADMIN_ROLE) {
        entryFee = _entryFee;
        emit EntryFeeUpdated(_entryFee);
    }

    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function activateID(address sponsor) external payable whenNotPaused {
        require(!active[msg.sender], "Already active");
        require(msg.value >= entryFee, "Insufficient fee");

        active[msg.sender] = true;
        sponsorOf[msg.sender] = sponsor;

        _distribute(msg.sender, sponsor);

        emit IDActivated(msg.sender, sponsor, msg.value);
    }

    function retopUp() external payable whenNotPaused {
        require(active[msg.sender], "Not active");
        require(msg.value >= entryFee, "Insufficient fee");

        address sponsor = sponsorOf[msg.sender];
        _distribute(msg.sender, sponsor);

        emit ReTopUp(msg.sender, sponsor, msg.value);
    }

    function _distribute(address user, address sponsor) internal {
        uint256 directAmount = 10 * 1e18;
        uint256 treasuryAmount = 30 * 1e18;

        if (sponsor != address(0)) {
            (bool directSuccess, ) = sponsor.call{value: directAmount}("");
            require(directSuccess, "Direct sponsor payment failed");
        } else {
            treasuryAmount += directAmount;
        }

        (bool treasurySuccess, ) = treasury.call{value: treasuryAmount}("");
        require(treasurySuccess, "Treasury payment failed");
    }

    receive() external payable {}
}
