import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Attack config — fetched from /api/demo/catalog ─────────────────────────
const TIER_CONFIG = {
  CRITICAL:   { color: "#A32D2D", bg: "#FCEBEB", label: "CRITICAL",   icon: "🔴" },
  HIGH_ALERT: { color: "#633806", bg: "#FAEEDA", label: "HIGH ALERT", icon: "🟠" },
};

// Label lookup for result display
const ATTACK_CATALOG_LABELS = {
  mule_ring:         "Money Mule Chain",
  device_ring:       "Device Fingerprint Ring",
  velocity_burst:    "Velocity Burst",
  impossible_travel: "Impossible Travel",
};

// ── Mobile Notification simulation ─────────────────────────────────────────
const MobileNotification = ({ msg, tier, onDismiss }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.HIGH_ALERT;
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="demo-notification" style={{ borderColor: cfg.color }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div className="demo-notif-icon" style={{ background: cfg.bg }}>🛡️</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>
            SatarkAI — {cfg.label}
          </div>
          <div style={{ fontSize: 10, color: "#999" }}>now</div>
        </div>
        <button onClick={onDismiss} className="demo-notif-close">×</button>
      </div>
      <div style={{ fontSize: 13, color: "#1c1a18", lineHeight: 1.5 }}>{msg}</div>
    </div>
  );
};

// ── OTP Modal (High Alert) ──────────────────────────────────────────────────
const OTPModal = ({ txnId, amount, onVerify, onDecline }) => {
  const [otp, setOtp]     = useState(["","","","","",""]);
  const [error, setError] = useState(false);
  const inputRefs = useRef([]);

  const handleKey = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setError(false);
    if (val && i < 5) inputRefs.current[i+1]?.focus();
  };

  const verify = () => {
    const code = otp.join("");
    if (code.length < 6) { setError(true); return; }
    onVerify(code);
  };

  return (
    <div className="demo-modal-overlay">
      <div className="demo-otp-modal">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div className="demo-otp-icon">⚠️</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#1c1a18" }}>Verify this payment</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            SatarkAI flagged unusual activity
          </div>
        </div>

        {/* Transaction summary */}
        <div className="demo-otp-txn-summary">
          <div style={{ fontSize: 11, color: "#888" }}>Transaction</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, fontFamily: "'Roboto Mono', monospace" }}>{txnId}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#633806", marginTop: 6 }}>
            ₹{Number(amount).toLocaleString("en-IN", {minimumFractionDigits:2})}
          </div>
          <div className="demo-otp-risk-badge">
            Risk score: HIGH — re-verification required
          </div>
        </div>

        {/* OTP inputs */}
        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
          Enter the OTP sent to your registered number
        </div>
        <div className="demo-otp-inputs">
          {otp.map((v, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              value={v}
              maxLength={1}
              onChange={e => handleKey(i, e.target.value)}
              onKeyDown={e => {
                if (e.key === "Backspace" && !v && i > 0)
                  inputRefs.current[i-1]?.focus();
              }}
              className={`demo-otp-input ${error ? 'demo-otp-input-error' : ''}`}
            />
          ))}
        </div>
        {error && (
          <div style={{ fontSize: 11, color: "#A32D2D", marginBottom: 8 }}>
            Please enter all 6 digits
          </div>
        )}
        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 18 }}>
          Demo: any 6-digit code will work
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onDecline} className="demo-btn-secondary" style={{ flex: 1 }}>Decline</button>
          <button onClick={verify} className="demo-btn-primary" style={{ flex: 2 }}>Verify & Allow</button>
        </div>
      </div>
    </div>
  );
};

// ── Score Ring (SVG) ────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const pct    = score * 100;
  const radius = 40;
  const circ   = 2 * Math.PI * radius;
  const dash   = (pct / 100) * circ;
  const color  = pct >= 90 ? "#A32D2D" : pct >= 80 ? "#BA7517" : "#1D9E75";

  return (
    <svg width={100} height={100} style={{ display: "block" }}>
      <circle cx={50} cy={50} r={radius} fill="none"
        stroke="#e8e6e1" strokeWidth={7}/>
      <circle cx={50} cy={50} r={radius} fill="none"
        stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
      <text x={50} y={46} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 18, fontWeight: 700, fill: color }}>
        {pct.toFixed(0)}%
      </text>
      <text x={50} y={62} textAnchor="middle"
        style={{ fontSize: 8, fontWeight: 600, fill: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        risk
      </text>
    </svg>
  );
};

// ── Animated loading dots ───────────────────────────────────────────────────
const LoadingDots = () => (
  <span className="demo-loading-dots">
    <span>.</span><span>.</span><span>.</span>
  </span>
);

// ── Main Demo Page ──────────────────────────────────────────────────────────
export default function DemoPage() {
  const [catalog,      setCatalog]      = useState({});
  const [firing,       setFiring]       = useState(null);
  const [result,       setResult]       = useState(null);
  const [notification, setNotification] = useState(null);
  const [otpModal,     setOtpModal]     = useState(null);
  const [otpResult,    setOtpResult]    = useState(null);
  const [fireCount,    setFireCount]    = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/demo/catalog`)
      .then(r => r.json())
      .then(setCatalog)
      .catch(err => {
        console.warn("Failed to fetch catalog, using local fallback:", err);
        setCatalog({
          mule_ring:         { tier: "CRITICAL",   label: "Money Mule Chain" },
          device_ring:       { tier: "CRITICAL",   label: "Device Fingerprint Ring" },
          velocity_burst:    { tier: "HIGH_ALERT", label: "Velocity Burst" },
          impossible_travel: { tier: "HIGH_ALERT", label: "Impossible Travel" },
        });
      });
  }, []);

  const fireAttack = async (attackType) => {
    setFiring(attackType);
    setResult(null);
    setOtpResult(null);
    setOtpModal(null);

    try {
      const res  = await fetch(`${API_URL}/api/demo/fire/${attackType}`, { method: "POST" });
      const data = await res.json();
      setFiring(null);
      setResult(data);
      setFireCount(c => c + 1);

      // Show mobile notification
      const notifMsg =
        data.action === "AUTO_BLOCKED"
          ? `Transaction AUTO-BLOCKED. Score: ${(data.peak_score*100).toFixed(0)}%. FMR-1 draft generated.`
          : `Unusual activity detected. Score: ${(data.peak_score*100).toFixed(0)}%. OTP verification required.`;

      setNotification({ msg: notifMsg, tier: data.tier });

      // High alert → OTP modal after brief delay
      if (data.action === "OTP_REQUIRED") {
        setTimeout(() => {
          const peakTxn = data.transactions.reduce((a,b) =>
            a.fraud_score > b.fraud_score ? a : b
          );
          setOtpModal({ txnId: peakTxn.transaction_id, amount: peakTxn.amount });
        }, 800);
      }
    } catch (err) {
      console.error("Fire attack failed:", err);
      setFiring(null);
    }
  };

  const criticalAttacks  = Object.entries(catalog).filter(([,v]) => v.tier === "CRITICAL");
  const highAlertAttacks = Object.entries(catalog).filter(([,v]) => v.tier === "HIGH_ALERT");

  return (
    <div className="demo-page">

      {/* Mobile notification */}
      {notification && (
        <MobileNotification
          msg={notification.msg} tier={notification.tier}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* OTP modal */}
      {otpModal && !otpResult && (
        <OTPModal
          txnId={otpModal.txnId} amount={otpModal.amount}
          onVerify={(code) => {
            setOtpModal(null);
            setOtpResult({ verified: true, code });
          }}
          onDecline={() => {
            setOtpModal(null);
            setOtpResult({ verified: false });
          }}
        />
      )}

      <div className="demo-container">

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="demo-header">
          <div className="demo-header-top">
            <div>
              <h1 className="demo-title">
                <span className="demo-title-hindi">सतर्क</span> AI
              </h1>
              <div className="demo-version">Fraud Engine Demo · v2.1</div>
            </div>
            <div className="demo-header-badge">
              <span className="demo-pulse"></span>
              LIVE ENGINE
            </div>
          </div>
          <p className="demo-subtitle">
            Live fraud detection — each attack is sampled fresh from IEEE-CIS fraud distributions.
            The GNN scores it independently. Nothing is hardcoded.
          </p>
        </header>

        {/* ── Two-tier explanation cards ─────────────────────────── */}
        <div className="demo-tier-grid">
          <div className="demo-tier-card demo-tier-critical">
            <div className="demo-tier-label" style={{ color: "#A32D2D" }}>
              🔴 Critical Attack (≥90%)
            </div>
            <div className="demo-tier-desc" style={{ color: "#791F1F" }}>
              Transaction is auto-blocked immediately. FMR-1 compliance draft
              is generated automatically. No human approval needed.
            </div>
          </div>
          <div className="demo-tier-card demo-tier-high">
            <div className="demo-tier-label" style={{ color: "#633806" }}>
              🟠 High Alert (80–89%)
            </div>
            <div className="demo-tier-desc" style={{ color: "#412402" }}>
              Transaction is held pending user re-verification via OTP.
              App notification sent. User can confirm or decline.
            </div>
          </div>
        </div>

        {/* ── Attack buttons ────────────────────────────────────── */}
        <section className="demo-attacks-section">
          <div className="demo-section-label">
            Critical attacks — auto block + FMR-1 report
          </div>
          <div className="demo-btn-row">
            {criticalAttacks.map(([key, val]) => (
              <button key={key} onClick={() => fireAttack(key)}
                disabled={!!firing}
                className={`demo-attack-btn demo-attack-critical ${firing === key ? 'demo-btn-firing' : ''}`}
                style={{ opacity: firing && firing !== key ? 0.5 : 1 }}>
                {firing === key ? <>Simulating<LoadingDots /></> : `🔴 ${val.label}`}
              </button>
            ))}
          </div>

          <div className="demo-section-label" style={{ marginTop: 20 }}>
            High alert — OTP re-verification + notification
          </div>
          <div className="demo-btn-row">
            {highAlertAttacks.map(([key, val]) => (
              <button key={key} onClick={() => fireAttack(key)}
                disabled={!!firing}
                className={`demo-attack-btn demo-attack-high ${firing === key ? 'demo-btn-firing' : ''}`}
                style={{ opacity: firing && firing !== key ? 0.5 : 1 }}>
                {firing === key ? <>Simulating<LoadingDots /></> : `🟠 ${val.label}`}
              </button>
            ))}
          </div>
        </section>

        {/* ── Results panel ─────────────────────────────────────── */}
        {result && (
          <div className={`demo-result-panel ${result.tier === "CRITICAL" ? 'demo-result-critical' : 'demo-result-high'}`}
               key={fireCount}>

            {/* Result header */}
            <div className="demo-result-header">
              <ScoreRing score={result.peak_score} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={`demo-action-badge ${result.action === "AUTO_BLOCKED" ? 'demo-badge-blocked' : 'demo-badge-otp'}`}>
                  {result.action === "AUTO_BLOCKED" ? "🔴 AUTO BLOCKED" : "🟠 OTP REQUIRED"}
                </div>
                <div className="demo-result-title">
                  {ATTACK_CATALOG_LABELS[result.attack_type] || result.attack_type}
                </div>
                <div className="demo-result-meta">
                  Peak score: {(result.peak_score * 100).toFixed(1)}% ·
                  Avg latency: {result.avg_latency_ms}ms ·
                  {result.fmr1_queued ? " FMR-1 draft queued ✓" : " Awaiting analyst confirmation"}
                </div>
                {otpResult && (
                  <div className={`demo-otp-result ${otpResult.verified ? 'demo-otp-verified' : 'demo-otp-declined'}`}>
                    {otpResult.verified
                      ? "✓ OTP verified — transaction allowed by user"
                      : "✗ User declined transaction"}
                  </div>
                )}
              </div>
            </div>

            {/* Modus operandi */}
            <div className="demo-modus-section">
              <div className="demo-modus-label">Modus operandi (auto-generated)</div>
              <div className="demo-modus-text">{result.modus_operandi}</div>
            </div>

            {/* Transaction chain */}
            <div className="demo-chain-label">Transaction chain</div>
            <div className="demo-chain-list">
              {result.transactions.map((txn, i) => (
                <div key={i} className="demo-chain-row"
                  style={{
                    borderLeftColor: txn.fraud_score >= 0.90 ? "#A32D2D" :
                                     txn.fraud_score >= 0.80 ? "#BA7517" : "#1D9E75"
                  }}>
                  <span className="demo-chain-addr">{txn.sender.substring(0,16)}</span>
                  <span className="demo-chain-arrow">→</span>
                  <span className="demo-chain-addr">{txn.receiver.substring(0,16)}</span>
                  <span className="demo-chain-amount">₹{txn.amount.toLocaleString("en-IN")}</span>
                  <span className="demo-chain-score"
                    style={{ color: txn.fraud_score >= 0.90 ? "#A32D2D" : "#BA7517" }}>
                    {(txn.fraud_score * 100).toFixed(0)}%
                  </span>
                  <span className="demo-chain-latency">{txn.latency_ms}ms</span>
                </div>
              ))}
            </div>

            {/* FMR-1 download */}
            {result.fmr1_queued && result.transactions[0] && (
              <div style={{ marginTop: 16 }}>
                <a href={`${API_URL}/api/demo/fmr1/${result.transactions.reduce((a,b) =>
                    a.fraud_score > b.fraud_score ? a : b).transaction_id}`}
                  className="demo-fmr1-link" target="_blank" rel="noopener noreferrer">
                  📄 Download FMR-1 Draft (RBI Compliance)
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="demo-footer">
          Each attack payload is freshly sampled from IEEE-CIS fraud feature distributions
          (590,540 transactions, 3.5% fraud rate). The GNN scores transactions based on
          graph topology learned during training — not pattern matching.
          <br/>SatarkAI v2.1 · SatarkGAT Ensemble · AUPRC 0.91
        </footer>
      </div>
    </div>
  );
}
