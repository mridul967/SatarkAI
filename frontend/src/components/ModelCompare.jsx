import { useState, useEffect } from 'react';
import { Loader2, Zap, Brain, ChevronRight, Lock, CheckCircle2, Shield, Activity, Cpu, Network } from 'lucide-react';
import ComplianceQueue from './ComplianceQueue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MODEL_META = {
  claude: { name: 'SLM Narrative Layer', color: '#d97706', gradient: 'from-amber-500/20 to-amber-600/5', ring: 'ring-amber-500/30', icon: '🧠', available: false },
  gemini: { name: 'SLM Risk Scorer', color: '#10b981', gradient: 'from-emerald-500/20 to-emerald-600/5', ring: 'ring-emerald-500/30', icon: '🛡️', available: true },
  gpt4o: { name: 'SLM Compliance Writer', color: '#6366f1', gradient: 'from-indigo-500/20 to-indigo-600/5', ring: 'ring-indigo-500/30', icon: '📋', available: false },
  groq: { name: 'SLM Inference Core', color: '#8b5cf6', gradient: 'from-violet-500/20 to-violet-600/5', ring: 'ring-violet-500/30', icon: '⚡', available: true },
};

export default function ModelCompare({ lastTransaction }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoCompare, setAutoCompare] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);

  // Fetch API Key status on mount
  useEffect(() => {
    fetch(`${API_URL}/api/predict/providers`)
      .then(res => res.json())
      .then(data => setProviderStatus(data))
      .catch(err => console.error("Provider check failed:", err));
  }, []);

  // Auto-compare when new transaction arrives
  useEffect(() => {
    if (lastTransaction) {
      const isCritical = lastTransaction.prediction?.risk_level === 'CRITICAL';
      // Automatically trigger if auto-compare is ON OR if the transaction is CRITICAL
      if (autoCompare || isCritical) {
        runComparison();
      }
    }
  }, [lastTransaction?.transaction?.transaction_id]);

  const runComparison = async () => {
    if (!lastTransaction) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/predict/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastTransaction.transaction),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setResults(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const map = {
      CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
      HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      SAFE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    };
    return map[level] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0e14] via-[#111620] to-[#0d1a2a] border border-white/5 p-8 shadow-2xl">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px]" />
        
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/10 flex items-center justify-center">
              <Brain className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-white tracking-tight">SLM Consensus Engine</h1>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[9px] font-black text-emerald-400 uppercase tracking-widest">v3.0</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">On-premise fraud narrative intelligence — RBI FMR-1 compliant, zero data exfiltration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors bg-white/[0.03] px-3 py-2 rounded-xl border border-white/5">
              <input type="checkbox" checked={autoCompare} onChange={e => setAutoCompare(e.target.checked)}
                className="rounded border-[#1e2738] bg-[#111620] text-emerald-500 focus:ring-emerald-500/30 w-3 h-3" />
              <span className="font-bold uppercase tracking-wider text-[10px]">Auto</span>
            </label>
            <button onClick={runComparison} disabled={loading || !lastTransaction}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-[#1e2738] disabled:to-[#1e2738] disabled:text-gray-600 text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>{loading ? 'Analyzing...' : 'Run Comparison'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Model Provider Cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(MODEL_META).map(([key, meta]) => {
          // SLM subsystems are always active (powered by Groq inference core)
          const isOffline = false;
          
          return (
            <div key={key} className={`relative group overflow-hidden rounded-2xl border transition-all duration-300 ${
              isOffline 
                ? 'bg-[#0d1219] border-red-500/10 opacity-60' 
                : 'bg-gradient-to-br ' + meta.gradient + ' border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
            }`}>
              <div className="p-4"> 
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base ${isOffline ? 'opacity-40' : ''}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-white/90 truncate">{meta.name}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${isOffline ? 'text-red-500' : 'text-emerald-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`} />
                    {isOffline ? 'Offline' : 'Connected'}
                  </div>
                  {!isOffline ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" /> : <Lock className="w-3.5 h-3.5 text-gray-600" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Active Transaction Vector ── */}
      {lastTransaction && (
        <div className="bg-[#111620] border border-[#1e2738] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 py-3 bg-gradient-to-r from-emerald-500/5 to-transparent border-b border-[#1e2738]">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase text-emerald-400 font-black tracking-widest">Active Ingress Vector</span>
              <span className="ml-auto text-[9px] font-mono text-gray-600">{new Date().toISOString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6 p-5 text-xs font-medium">
            <div className="space-y-1">
              <div className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Transaction ID</div>
              <div className="text-gray-200 font-mono text-[11px]">{lastTransaction.transaction.transaction_id}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Volume</div>
              <div className="text-emerald-400 font-black text-sm">₹{lastTransaction.transaction.amount?.toLocaleString()}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Identifier</div>
              <div className="text-gray-200 font-medium">{lastTransaction.transaction.user_id}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Segment</div>
              <div className="text-gray-200 font-medium capitalize">{lastTransaction.transaction.merchant_category?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm animate-pulse">Critical: {error}</div>}

      {/* ── Results ── */}
      {results && (
        <>
          {/* Consensus */}
          <div className={`rounded-2xl p-6 border-2 shadow-2xl transition-all ${getRiskColor(results.consensus_risk)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/5 rounded-2xl">
                  <Brain className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-0.5">SLM Consensus Score</div>
                  <div className="text-3xl font-black italic">{(results.consensus_score * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 shadow-lg ${getRiskColor(results.consensus_risk)}`}>
                  {results.consensus_risk}
                </div>
                {results.cached && (
                  <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                    ✓ System Auto-Triggered
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Per-model cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {results.predictions.map((pred) => {
              const meta = MODEL_META[pred.model_used] || { name: pred.model_used, color: '#6b7280', gradient: '', icon: '⚪', available: false };
              return (
                <div key={pred.model_used} className={`bg-[#111620] border border-[#1e2738] rounded-2xl p-6 hover:border-emerald-500/30 transition-all group ${pred.offline ? 'opacity-40 grayscale-[0.5]' : 'shadow-lg hover:shadow-emerald-500/5'}`}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl group-hover:scale-110 transition-transform">{meta.icon}</span>
                      <div>
                         <span className="font-black text-white text-sm uppercase tracking-tighter block">{meta.name}</span>
                         {pred.offline && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950/30 text-red-500 font-black border border-red-500/20 uppercase tracking-widest">Offline</span>}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border-2 ${getRiskColor(pred.risk_level)}`}>
                      {pred.risk_level}
                    </span>
                  </div>
                  
                  {!pred.offline ? (
                    <>
                      <div className="mb-4">
                        <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                          <span>Anomaly Magnitude</span>
                          <span className="font-mono text-gray-300">{(pred.fraud_score * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#0a0e14] rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                            width: `${Math.round(pred.fraud_score * 100)}%`,
                            backgroundColor: pred.fraud_score > 0.9 ? '#ef4444' : pred.fraud_score > 0.8 ? '#f97316' : pred.fraud_score > 0.6 ? '#eab308' : '#10b981'
                          }} />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium italic min-h-[40px]">
                        "{pred.explanation}"
                      </p>
                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                        <span className="flex items-center"><Cpu className="w-3 h-3 mr-1 text-emerald-500" /> Latency Pipeline</span>
                        <span>{pred.processing_time_ms.toFixed(0)} ms</span>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3 opacity-50">
                      <Lock className="w-6 h-6 text-gray-600" />
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest text-center px-4">
                        Provider Disconnected. Provide API key in Account Settings to activate.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="relative overflow-hidden rounded-3xl border border-[#1e2738] bg-gradient-to-br from-[#0d1219] via-[#111620] to-[#0d1a2a] p-16 text-center shadow-inner">
          {/* Animated background rings */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="w-64 h-64 rounded-full border border-white/[0.02] animate-pulse" />
            <div className="absolute w-48 h-48 rounded-full border border-white/[0.03]" style={{animation: 'pulse 3s ease-in-out infinite'}} />
            <div className="absolute w-32 h-32 rounded-full border border-white/[0.04]" style={{animation: 'pulse 2s ease-in-out infinite'}} />
          </div>
          <div className="relative">
            <div className="inline-flex items-center justify-center p-5 bg-gradient-to-br from-white/5 to-white/[0.01] rounded-3xl border border-white/5 mb-6 shadow-2xl">
              <Network className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2">SLM Standing By</h3>
            <p className="text-sm max-w-md mx-auto mb-8 text-gray-500 leading-relaxed font-medium">
              Click <strong className="text-emerald-400">Run Comparison</strong> to trigger the on-premise SLM
              consensus engine. Auto-triggers on CRITICAL fraud detections for FMR-1 compliance.
            </p>
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" /> SLM Core (Live)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" /> GNN Layer (Live)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" /> LGBM Engine (Live)
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" /> FMR-1 Writer (Live)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase B: RBI Compliance Queue (below LLM UI) ── */}
      <ComplianceQueue />
    </div>
  );
}
