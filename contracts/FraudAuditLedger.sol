// contracts/FraudAuditLedger.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FraudAuditLedger {
    
    struct AuditRecord {
        bytes32 decisionHash;    // keccak256(txnId + score + timestamp + modelVersion)
        uint8   riskLevel;       // 1=LOW 2=MED 3=HIGH 4=CRITICAL
        uint256 timestamp;
        address institution;
        bool    analystConfirmed;
    }

    mapping(bytes32 => AuditRecord) public records;
    
    event FraudDecisionRecorded(bytes32 indexed decisionHash, uint8 riskLevel);

    function recordDecision(
        bytes32 decisionHash,
        uint8 riskLevel
    ) external {
        records[decisionHash] = AuditRecord({
            decisionHash: decisionHash,
            riskLevel: riskLevel,
            timestamp: block.timestamp,
            institution: msg.sender,
            analystConfirmed: false
        });
        emit FraudDecisionRecorded(decisionHash, riskLevel);
    }

    function confirmFraud(bytes32 decisionHash) external {
        records[decisionHash].analystConfirmed = true;
    }
}
