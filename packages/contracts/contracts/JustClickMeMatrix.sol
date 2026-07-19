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
    uint256 public directRequirement;
    uint256 public indirectCapQualified;
    uint256 public indirectCapUnqualified;

    struct User {
        uint256 id;
        address wallet;
        address sponsor;
        uint256 directReferrals;
        uint256 indirectCycles;
        bool qualified;
    }

    mapping(address => User) public users;
    mapping(uint256 => address) public idToUser;
    uint256 public nextId;

    event IDActivated(address indexed user, uint256 indexed id, address indexed sponsor);
    event ReTopUp(address indexed user, address indexed sponsor);
    event PoolReset(address indexed user);
    event IndirectPaid(address indexed user, uint256 amount);
    event LevelPaid(address indexed user, uint256 amount);
    event DirectPaid(address indexed user, uint256 amount);

    function initialize(address admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        entryFee = 40 * 1e18;
        directRequirement = 3;
        indirectCapQualified = 5;
        indirectCapUnqualified = 1;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    function setEntryFee(uint256 _entryFee) external onlyRole(ADMIN_ROLE) {
        entryFee = _entryFee;
    }

    function setDirectRequirement(uint256 _directRequirement) external onlyRole(ADMIN_ROLE) {
        directRequirement = _directRequirement;
    }

    function setIndirectCap(uint256 qualified, uint256 unqualified) external onlyRole(ADMIN_ROLE) {
        indirectCapQualified = qualified;
        indirectCapUnqualified = unqualified;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function activateID(address sponsor) external payable whenNotPaused {
        require(users[msg.sender].wallet == address(0), "Already active");
        require(msg.value >= entryFee, "Insufficient fee");

        uint256 id = nextId++;
        users[msg.sender] = User({
            id: id,
            wallet: msg.sender,
            sponsor: sponsor,
            directReferrals: 0,
            indirectCycles: 0,
            qualified: false
        });
        idToUser[id] = msg.sender;

        if (sponsor != address(0)) {
            users[sponsor].directReferrals++;
            if (users[sponsor].directReferrals >= directRequirement) {
                users[sponsor].qualified = true;
            }
        }

        emit IDActivated(msg.sender, id, sponsor);
    }

    function retopUp() external payable whenNotPaused {
        require(users[msg.sender].wallet != address(0), "Not active");
        require(msg.value >= entryFee, "Insufficient fee");
        address sponsor = users[msg.sender].sponsor;
        if (sponsor != address(0)) {
            (bool success, ) = sponsor.call{value: 10 * 1e18}("");
            require(success, "Sponsor payment failed");
            emit DirectPaid(sponsor, 10 * 1e18);
        }
        users[msg.sender].indirectCycles = 0;
        emit ReTopUp(msg.sender, sponsor);
    }

    function distribute() external payable onlyRole(ADMIN_ROLE) {
        // Placeholder for off-chain orchestrated distribution
    }

    receive() external payable {}
}
