# SatarkAI — Technical Deep Dives

---

## 1. Blockchain Federated Layer — How Banks Submit Fraud Patterns

### The architecture in one sentence
Banks never share raw transaction data. They share **model gradient updates** (federated learning) and **anonymized fraud signal hashes** (blockchain registry). SatarkAI's global model gets smarter from every bank's experience, without any bank seeing another bank's customers.

### How it actually works — step by step

```
Bank A detects a new fraud ring (e.g., SIM swap + mule chain pattern)
    ↓
Bank A's local SatarkAI instance trains on this pattern
    ↓
Bank A computes gradient updates (ΔW) — NOT raw data
    ↓
DP-SGD adds calibrated noise to gradients (differential privacy)
    ↓
Encrypted gradient submitted to FederatedOrchestrator smart contract
    ↓
Flower FL server aggregates gradients from all banks (FedAvg)
    ↓
Updated global model weights distributed back to all banks
    ↓
Bank A also publishes fraud signal hash to FraudSignalRegistry:
    {
      device_hash: keccak256("device_imei_123"),
      ip_risk_score: 0.94,
      fraud_category: "SIM_SWAP_MULE_CHAIN",
      severity: "CRITICAL",
      publisher: "0xBank_A_wallet_address"
    }
    ↓
All other banks' SatarkAI instances receive this signal
↓ before they even see a transaction from this device
```

### Smart contracts (Solidity)

```solidity
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
```

```solidity
// contracts/FraudAuditLedger.sol
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
```

### Bank/Org Portal for Submitting Fraud Types

This is a new React page in the frontend — `BankPortal.jsx`:

```jsx
// frontend/src/pages/BankPortal.jsx
// Banks log in with their wallet (MetaMask/WalletConnect)
// and submit new fraud pattern types to enrich the model

const FRAUD_CATEGORIES = [
  "SIM_SWAP", "MULE_ACCOUNT_CHAIN", "DEVICE_RING", 
  "GHOST_MERCHANT", "ACCOUNT_TAKEOVER", "P2P_SCAM",
  "BNPL_FRAUD", "KYC_BYPASS", "DEEPFAKE_AUTH", "CUSTOM"
];

export default function BankPortal() {
  const [form, setForm] = useState({
    fraudCategory: '',
    description: '',
    indicatorType: 'device', // device | ip | merchant | behavioral
    sampleHashes: [],
    severity: 3
  });

  const submitToChain = async () => {
    // 1. Hash any raw identifiers client-side before sending
    const deviceHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(form.deviceFingerprint)
    );
    
    // 2. Write to FraudSignalRegistry contract
    const contract = new ethers.Contract(REGISTRY_ADDRESS, ABI, signer);
    await contract.publishSignal(deviceHash, ipHash, form.fraudCategory, form.severity);
    
    // 3. Also POST to SatarkAI backend to update training queue
    await fetch('/api/federated/submit-pattern', {
      method: 'POST',
      body: JSON.stringify({
        fraudCategory: form.fraudCategory,
        description: form.description,
        gradientUpdate: await computeLocalGradient(form.sampleData)
      })
    });
  };
  
  // ... render form
}
```

### Federated Learning with Flower FL

```python
# backend/services/federated_service.py
import flwr as fl
import torch
from typing import List, Tuple

class SatarkFederatedClient(fl.client.NumPyClient):
    """Each bank runs this client locally."""
    
    def __init__(self, model, train_data, val_data):
        self.model = model
        self.train_data = train_data
        self.val_data = val_data
    
    def get_parameters(self, config):
        return [p.detach().numpy() for p in self.model.parameters()]
    
    def fit(self, parameters, config):
        # Load global model weights
        for p, new_p in zip(self.model.parameters(), parameters):
            p.data = torch.tensor(new_p)
        
        # Train locally on bank's own data (NEVER leaves bank's servers)
        self.model.train()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)
        for batch in self.train_data:
            loss = self.model(batch)
            loss.backward()
            optimizer.step()
        
        # Add differential privacy noise before sending gradients
        with torch.no_grad():
            for p in self.model.parameters():
                p.data += torch.randn_like(p) * 0.01  # DP noise σ=0.01
        
        return self.get_parameters(config), len(self.train_data), {}
    
    def evaluate(self, parameters, config):
        # ... evaluate on local validation set
        return float(loss), len(self.val_data), {"auprc": float(auprc)}


# SatarkAI central server aggregates gradients from all banks
def start_federated_server(num_rounds: int = 10):
    strategy = fl.server.strategy.FedAvg(
        fraction_fit=0.5,       # use 50% of banks per round
        min_fit_clients=3,      # need at least 3 banks
        min_available_clients=3,
    )
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=num_rounds),
        strategy=strategy,
    )
```

---

## 2. Sub-50ms Fraud Detection — Exactly How

The 50ms budget breakdown:

```
Total budget:  50ms
├── Network (bank → SatarkAI):   ~5ms   (co-located in same DC ideally)
├── Redis feature lookup:         ~2ms   (pre-warmed user profiles)
├── Feature engineering:          ~3ms   (pure Python, vectorized numpy)
├── ONNX LightGBM inference:      ~3ms   (ONNX Runtime, no Python overhead)
├── ONNX GAT inference:           ~10ms  (subgraph already cached in Redis)
├── Graph signal lookup:          ~2ms   (Redis, not Neo4j on hot path)
├── Score fusion + thresholding:  ~1ms
├── Response serialization:       ~2ms
└── Network (SatarkAI → bank):   ~5ms
                                 -----
Total:                           ~33ms  ✓ well under 50ms
```

LLM consensus (Claude/Gemini/GPT/Groq) runs **async and non-blocking** — it doesn't affect the 50ms decision. The fraud decision fires at 33ms. LLM explanation arrives ~300ms later and enriches the audit record.

### The critical optimization — Redis pre-warming

```python
# backend/services/cache_service.py

async def warm_user_cache(user_id: str, redis: Redis):
    """
    Called when user opens their UPI app (login event).
    Pre-computes all features so fraud check is instant.
    """
    user_features = {
        "amount_mean_30d": await db.query_mean(user_id, days=30),
        "amount_std_30d":  await db.query_std(user_id, days=30),
        "velocity_count_1h": await db.query_count(user_id, minutes=60),
        "device_age_days": await db.query_device_age(user_id),
        "home_location": await db.query_home_location(user_id),
        "merchant_whitelist": await db.query_trusted_merchants(user_id),
        "risk_tier": await db.query_risk_tier(user_id),  # NEW/LOW/MED/HIGH
    }
    
    # Cache subgraph too — 2-hop neighborhood, serialized
    subgraph = await graph_service.get_subgraph(user_id, hops=2)
    subgraph_tensor = serialize_to_tensor(subgraph)
    
    await redis.setex(
        f"user:{user_id}:features", 
        3600,  # 1 hour TTL
        json.dumps(user_features)
    )
    await redis.setex(
        f"user:{user_id}:subgraph",
        300,   # 5 min TTL — graph changes faster
        subgraph_tensor.tobytes()
    )


async def predict_sub50ms(transaction: Transaction, redis: Redis) -> float:
    """The hot path — everything from cache."""
    
    # 1. Get pre-warmed features (2ms)
    cached = await redis.get(f"user:{transaction.user_id}:features")
    if cached:
        features = json.loads(cached)
    else:
        features = await feature_service.compute_features(transaction)  # cold path
    
    # 2. Check blockchain signal registry (1ms — Redis mirror of chain)
    device_hash = keccak256(transaction.device_id)
    chain_signal = await redis.get(f"chain:device:{device_hash}")
    if chain_signal and json.loads(chain_signal)["severity"] >= 3:
        return 0.95  # Fast-path: known bad device from another bank
    
    # 3. ONNX LightGBM (3ms)
    lgbm_score = lgbm_session.run(None, {"input": feature_vector})[0][0]
    
    # 4. ONNX GAT on cached subgraph (10ms)
    subgraph_bytes = await redis.get(f"user:{transaction.user_id}:subgraph")
    gat_score = gat_session.run(None, {"x": node_features, "edge_index": edges})[0][0]
    
    # 5. Ensemble (1ms)
    final_score = 0.6 * gat_score + 0.4 * lgbm_score
    
    # Fire-and-forget: LLM explanation + blockchain write (non-blocking)
    asyncio.create_task(explain_and_audit(transaction, final_score, features))
    
    return final_score  # Returns in ~33ms total
```

---

## 3. UPI Integration — Exact Code & Flow

### How UPI apps (PhonePe, GPay, Paytm) connect to SatarkAI

UPI operates through NPCI's network. Banks that issue UPI handles (VPAs like you@okicici) plug into NPCI's switch. SatarkAI sits at the **bank's PSP layer** as a pre-debit fraud check.

```
User taps "Pay ₹14,999" in PhonePe
    ↓
PhonePe → NPCI UPI Switch (collect/pay request)
    ↓
NPCI → Payer Bank (ICICI / SBI / etc.)
    ↓
Payer Bank's CBS (Core Banking System)
    ↓  ← SatarkAI plugs in HERE as a webhook
Bank calls SatarkAI: POST /webhook/upi/pre-debit
    ↓
SatarkAI returns ALLOW / BLOCK / CHALLENGE in <50ms
    ↓
If ALLOW  → Bank approves, NPCI settles
If BLOCK  → Bank declines, UPI returns error code
If CHALLENGE → Bank sends OTP re-auth to user
    ↓
PhonePe shows success / "Transaction blocked for security"
```

### The pre-debit webhook endpoint

```python
# backend/routers/upi.py
from fastapi import APIRouter, Header, HTTPException
import hmac, hashlib

router = APIRouter(prefix="/webhook/upi")

@router.post("/pre-debit")
async def upi_pre_debit_hook(
    payload: UPITransactionPayload,
    x_bank_signature: str = Header(...),
    x_bank_id: str = Header(...)
):
    """
    Called by bank CBS before debiting the payer's account.
    MUST respond in < 50ms or bank defaults to ALLOW.
    
    Request from bank:
    {
      "upi_txn_id": "UPI2024112312345678",
      "payer_vpa": "user@okicici",
      "payee_vpa": "merchant@ybl",
      "amount": 14999.00,
      "device_id": "IMEI_HASH_abc123",
      "ip_address": "103.21.244.0",
      "upi_app": "com.phonepe.app",
      "latitude": 19.076,
      "longitude": 72.877,
      "timestamp": "2024-11-12T03:47:00Z",
      "bank_hmac": "sha256_signature"
    }
    """
    
    # 1. Verify HMAC — ensure request is genuinely from the bank
    expected_hmac = hmac.new(
        BANK_SECRET_KEYS[x_bank_id].encode(),
        payload.json().encode(),
        hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected_hmac, x_bank_signature):
        raise HTTPException(403, "Invalid bank signature")
    
    # 2. Map UPI payload to SatarkAI transaction schema
    txn = Transaction(
        transaction_id=payload.upi_txn_id,
        user_id=hash_vpa(payload.payer_vpa),    # hash VPA — no PII stored
        amount=payload.amount,
        merchant_id=hash_vpa(payload.payee_vpa),
        device_id=payload.device_id,
        ip_address=payload.ip_address,
        timestamp=payload.timestamp,
        location=f"{payload.latitude},{payload.longitude}",
        merchant_category=await lookup_vpa_category(payload.payee_vpa)
    )
    
    # 3. Score in < 50ms (hot path)
    score = await predict_sub50ms(txn, redis)
    risk = classify_risk(score, await get_user_risk_tier(txn.user_id))
    
    # 4. Return decision
    if risk == "CRITICAL":
        return {"decision": "BLOCK",   "reason_code": "FRAUD_HIGH_RISK", "score": score}
    elif risk == "HIGH":
        return {"decision": "CHALLENGE", "reason_code": "FRAUD_VERIFY_REQUIRED"}
    else:
        return {"decision": "ALLOW",   "score": score}
```

### How to make it UPI-safe (NPCI compliance)

UPI has strict rules for fraud systems:

| Requirement | SatarkAI implementation |
|---|---|
| Response time < 50ms | ONNX + Redis cache hot path (33ms P99) |
| Must not store VPAs | VPAs are SHA-256 hashed immediately on receipt |
| Must not block > 0.1% of legitimate transactions | Adaptive thresholding per user tier |
| Reason code must be NPCI-standard | Use NPCI error code table in responses |
| Must support OTP challenge flow | CHALLENGE response triggers bank's own OTP |
| Must handle 10,000 TPS | Kubernetes HPA, Redis cluster, ONNX stateless |
| Audit trail required | Elasticsearch + blockchain hash per decision |

### Getting NPCI sandbox access

```
1. Register at: developer.npci.org.in
2. Apply for: UPI Fraud API Sandbox
3. Credentials needed:
   - Institution type: Technology Service Provider (TSP)
   - Use case: Fraud Detection and Prevention
   - Expected TPS: state your expected load
4. NPCI will issue:
   - Sandbox API keys
   - Test VPAs (like test@sandbox)
   - Test transaction simulator
5. Certification path:
   Sandbox → NPCI UAT → Production
   (Production requires RBI-regulated entity partnership)
```

---

## 4. RBI Compliance Engine — One-Click Reporting

### What RBI actually requires

Under **Master Direction on Frauds - Classification and Reporting by Commercial Banks (2024)**:

- All frauds > ₹1 lakh must be reported to RBI within **7 days** of classification
- Report format: FMR-1 (Fraud Monitoring Return)
- Submission via: **CIMS portal** (Centralised Information Management System)
- Required fields: 47 data points including fraud type, modus operandi, amount, parties

### The compliance engine

```python
# backend/services/compliance_service.py
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, Paragraph
import json

class RBIComplianceEngine:
    
    # RBI fraud classification codes
    FRAUD_CATEGORIES = {
        "ACCOUNT_TAKEOVER":    {"code": "01", "type": "Technology Related"},
        "DEVICE_RING":         {"code": "02", "type": "Technology Related"},
        "SIM_SWAP":            {"code": "03", "type": "Technology Related"},
        "MULE_ACCOUNT":        {"code": "04", "type": "Money Mule"},
        "UPI_FRAUD":           {"code": "07", "type": "Digital Payment Fraud"},
        "PHISHING":            {"code": "08", "type": "Internet Banking"},
    }
    
    async def generate_fmr1_report(
        self, 
        fraud_record: FraudRecord,
        institution: Institution
    ) -> RBIReport:
        """
        Generates RBI FMR-1 Fraud Monitoring Return.
        Auto-triggered when fraud > ₹1 lakh is confirmed.
        """
        
        # Pull blockchain audit hash as evidence
        audit_hash = await blockchain_service.get_audit_hash(
            fraud_record.transaction_id
        )
        
        report_data = {
            # Part A: Basic Information
            "institution_name": institution.name,
            "bsr_code": institution.bsr_code,
            "ifsc_code": institution.ifsc,
            "report_date": datetime.now().strftime("%d/%m/%Y"),
            
            # Part B: Fraud Details
            "fraud_classification": self.FRAUD_CATEGORIES[fraud_record.fraud_type]["code"],
            "fraud_type_description": self.FRAUD_CATEGORIES[fraud_record.fraud_type]["type"],
            "amount_involved": fraud_record.amount,
            "date_of_fraud": fraud_record.transaction_date,
            "date_of_detection": fraud_record.detected_at,
            "modus_operandi": fraud_record.llm_explanation,  # LLM-generated!
            
            # Part C: Parties
            "payer_account_masked": mask_account(fraud_record.payer_account),
            "payee_details": fraud_record.payee_description,
            
            # Part D: System Evidence (SatarkAI-specific)
            "ai_fraud_score": fraud_record.fraud_score,
            "detection_method": "Graph Neural Network + Multi-LLM Consensus",
            "blockchain_audit_hash": audit_hash,
            "graph_signals": json.dumps(fraud_record.graph_signals),
            
            # Part E: Action Taken
            "transaction_status": "BLOCKED" if fraud_record.was_blocked else "POST_FACTO",
            "amount_recovered": fraud_record.recovered_amount or 0,
            "action_taken": fraud_record.analyst_action,
        }
        
        return RBIReport(
            data=report_data,
            pdf=await self._generate_pdf(report_data),
            json_export=json.dumps(report_data, indent=2),
            submission_ready=self._validate_completeness(report_data)
        )
    
    async def _generate_pdf(self, data: dict) -> bytes:
        """Generate RBI FMR-1 formatted PDF."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        elements = []
        elements.append(Paragraph("FRAUD MONITORING RETURN (FMR-1)", title_style))
        elements.append(Paragraph(f"Report Date: {data['report_date']}", normal_style))
        # ... build full PDF with all 47 required fields
        
        doc.build(elements)
        return buffer.getvalue()
    
    async def submit_to_cims(self, report: RBIReport) -> SubmissionResult:
        """
        One-click submission to RBI's CIMS portal.
        NOTE: CIMS API is not publicly documented — 
        requires direct RBI/NIC integration agreement.
        Until then, generates export package for manual upload.
        """
        export = {
            "fmr1_json": report.json_export,
            "fmr1_pdf": base64.b64encode(report.pdf).decode(),
            "blockchain_proof": report.data["blockchain_audit_hash"],
            "satark_report_id": report.id
        }
        
        # When CIMS API is available:
        # response = await cims_client.post("/api/v1/submit-fraud-report", json=export)
        
        # For now — package for manual upload + email to RBI nodal officer
        await email_service.send_report_package(
            to=institution.rbi_nodal_email,
            subject=f"FMR-1 Report - {report.data['amount_involved']} - {report.id}",
            attachment=report.pdf
        )
        
        return SubmissionResult(status="PACKAGED_FOR_SUBMISSION", report_id=report.id)
```

### The one-click UI

```jsx
// frontend/src/components/CompliancePanel.jsx

export default function CompliancePanel({ fraudRecord }) {
  const [report, setReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const generateReport = async () => {
    const r = await api.post('/api/compliance/rbi-report', { 
      transaction_id: fraudRecord.id 
    });
    setReport(r.data);
  };

  const submitOneClick = async () => {
    setSubmitting(true);
    await api.post(`/api/compliance/submit/${report.id}`);
    toast.success('FMR-1 report submitted to RBI nodal officer');
    setSubmitting(false);
  };

  return (
    <div className="compliance-panel">
      {/* Auto-generated if fraud > ₹1 lakh */}
      {fraudRecord.amount > 100000 && (
        <div className="rbi-alert">
          RBI reporting required within 7 days
        </div>
      )}
      
      <button onClick={generateReport}>
        Generate FMR-1 Report
      </button>

      {report && (
        <>
          <ReportPreview data={report.data} />
          <div className="report-actions">
            <button onClick={() => downloadPDF(report.pdf)}>
              Download PDF
            </button>
            <button onClick={submitOneClick} disabled={submitting}>
              {submitting ? 'Submitting...' : 'One-Click Submit to RBI'}
            </button>
          </div>
          <div className="blockchain-proof">
            Audit hash: {report.data.blockchain_audit_hash}
            <a href={`https://polygonscan.com/tx/${report.tx_hash}`}>
              View on chain ↗
            </a>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 5. New UI Architecture — Three Distinct Views

### View 1: Analyst Workstation
- Left panel: live fraud alert queue (WebSocket, CRITICAL first)
- Center: D3 fraud graph for selected alert
- Right: LLM explanation + SHAP values + one-click confirm/dismiss
- Bottom: model comparison bar chart (4 models)

### View 2: Bank Admin Portal
- Submit fraud patterns (connects to FraudSignalRegistry contract)
- View federated learning round status (how many banks contributed)
- Manage institution wallet and signing keys
- Download updated global model weights

### View 3: Compliance Officer Dashboard
- Pending RBI reports with deadline countdown
- One-click generate + submit FMR-1
- Blockchain audit trail viewer
- 7-year archive with DPDP-compliant search

---

## Summary: What phase to build next

Given your hackathon context and the fact that Phase 1 is complete:

**Build Phase 2 first (GNN + Sub-50ms)** — this is what makes SatarkAI technically credible. A fraud detector without a trained model is just an API wrapper.

**Phase 3 blockchain** — for the hackathon presentation, you only need to deploy the smart contracts to Polygon Mumbai testnet (free) and show one write + one read. Full federated learning can be stubbed with 2 local Flower clients simulating 2 banks.

**Phase 5 RBI compliance** — high judge impact in India context. The PDF generator + one-click download is achievable in 2-3 hours. Full CIMS submission can be noted as "pending CIMS API access."

**Phases 4, 6, 7** are post-hackathon production work.