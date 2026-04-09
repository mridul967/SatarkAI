// contracts/FraudSignalRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FraudSignalRegistry {
    
    struct FraudSignal {
        bytes32 deviceHash;      // keccak256 of device fingerprint
        bytes32 ipHash;          // keccak256 of IP address
        string  fraudCategory;   // "SIM_SWAP", "MULE_CHAIN", "DEVICE_RING", etc.
        uint8   severity;        // 1=LOW 2=MED 3=HIGH 4=CRITICAL
        uint256 timestamp;
        address publisher;       // which bank published this
        bool    verified;        // confirmed by 3+ banks = verified
    }

    mapping(bytes32 => FraudSignal[]) public signalsByDevice;
    mapping(address => bool) public authorizedBanks;
    address public owner;
    
    event SignalPublished(bytes32 indexed deviceHash, string category, uint8 severity);
    event SignalVerified(bytes32 indexed deviceHash, uint256 signalIndex);

    modifier onlyBank() {
        require(authorizedBanks[msg.sender], "Not an authorized institution");
        _;
    }

    constructor() { owner = msg.sender; }

    function registerBank(address bank) external {
        require(msg.sender == owner, "Only owner");
        authorizedBanks[bank] = true;
    }

    function publishSignal(
        bytes32 deviceHash,
        bytes32 ipHash,
        string calldata fraudCategory,
        uint8 severity
    ) external onlyBank {
        signalsByDevice[deviceHash].push(FraudSignal({
            deviceHash: deviceHash,
            ipHash: ipHash,
            fraudCategory: fraudCategory,
            severity: severity,
            timestamp: block.timestamp,
            publisher: msg.sender,
            verified: false
        }));
        emit SignalPublished(deviceHash, fraudCategory, severity);
    }

    // Query: has this device been flagged by any bank?
    function getSignalCount(bytes32 deviceHash) external view returns (uint256) {
        return signalsByDevice[deviceHash].length;
    }

    function getLatestSignal(bytes32 deviceHash) 
        external view returns (FraudSignal memory) {
        FraudSignal[] storage signals = signalsByDevice[deviceHash];
        require(signals.length > 0, "No signals for this device");
        return signals[signals.length - 1];
    }
}
