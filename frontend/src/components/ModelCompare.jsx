import { useState, useEffect } from 'react';
import { Loader2, Zap, Brain, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MODEL_META = {
  claude: { name: 'Claude Sonnet', color: '#d97706', icon: '🟠', available: false },
  gemini: { name: 'Gemini 2.0 Flash', color: '#10b981', icon: '🟢', available: true },
  gpt4o: { name: 'GPT-4o Mini', color: '#6366f1', icon: '🔵', available: false },
  groq: { name: 'Groq Llama 3.3 70B', color: '#8b5cf6', icon: '🟣', available: true },
};

export default function ModelCompare({ lastTransaction }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoCompare, setAutoCompare] = useState(false);

  // Auto-compare when new transaction arrives
  useEffect(() => {
    if (autoCompare && lastTransaction) {
      runComparison();
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
    <div className="max-w-5xl mx-auto space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">4-LLM Consensus Engine</h1>
          <p className="text-gray-500 text-sm">Compare fraud assessments across multiple AI providers in parallel.</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoCompare} onChange={e => setAutoCompare(e.target.checked)}
              className="rounded border-[#1e2738] bg-[#111620] text-emerald-500 focus:ring-emerald-500/30" />
            <span>Auto-compare</span>
          </label>
          <button onClick={runComparison} disabled={loading || !lastTransaction}
            className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#1e2738] disabled:text-gray-600 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-emerald-500/15 disabled:shadow-none">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>{loading ? 'Analyzing...' : 'Run Comparison'}</span>
          </button>
        </div>
      </div>

      {/* Model Availability */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(MODEL_META).map(([key, meta]) => {
          // Check if this model returned a result in the last run (to check actual availability)
          const lastResult = results?.predictions?.find(p => p.model_used === key);
          const isOffline = lastResult?.offline === true;
          
          return (
            <div key={key} className={`flex items-center space-x-2.5 p-3 rounded-lg border transition-all ${isOffline ? 'bg-[#0d1219] border-red-500/20 opacity-50' : 'bg-[#111620] border-emerald-500/20 shadow-lg shadow-emerald-500/5'}`}>
              <span className="text-base">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-300 truncate">{meta.name}</div>
                <div className={`text-[10px] font-black uppercase tracking-tighter ${isOffline ? 'text-red-500' : 'text-emerald-500'}`}>
                  {isOffline ? 'Offline' : 'Connected'}
                </div>
              </div>
              {!isOffline ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Active Transaction */}
      {lastTransaction && (
        <div className="bg-[#111620] border border-[#1e2738] rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] uppercase text-gray-600 font-bold tracking-widest mb-3 border-l-2 border-emerald-500 pl-3">Active Ingress Vector</div>
          <div className="grid grid-cols-4 gap-6 text-xs font-medium">
            <div className="text-gray-500 capitalize">ID: <span className="text-gray-200 font-mono text-[10px] ml-1">{lastTransaction.transaction.transaction_id}</span></div>
            <div className="text-gray-500 capitalize">Volume: <span className="text-emerald-500 font-bold ml-1">₹{lastTransaction.transaction.amount?.toLocaleString()}</span></div>
            <div className="text-gray-500 capitalize">Identifier: <span className="text-gray-200 ml-1">{lastTransaction.transaction.user_id}</span></div>
            <div className="text-gray-500 capitalize">Segment: <span className="text-gray-200 ml-1">{lastTransaction.transaction.merchant_category}</span></div>
          </div>
        </div>
      )}

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm animate-pulse">Critical: {error}</div>}

      {/* Results */}
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
                  <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-0.5">Ensemble Consensus Score</div>
                  <div className="text-3xl font-black italic">{(results.consensus_score * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 shadow-lg ${getRiskColor(results.consensus_risk)}`}>
                {results.consensus_risk}
              </div>
            </div>
          </div>

          {/* Per-model cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {results.predictions.map((pred) => {
              const meta = MODEL_META[pred.model_used] || { name: pred.model_used, color: '#6b7280', icon: '⚪', available: false };
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
                            backgroundColor: pred.fraud_score > 0.8 ? '#ef4444' : pred.fraud_score > 0.6 ? '#f97316' : pred.fraud_score > 0.3 ? '#eab308' : '#10b981'
                          }} />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-medium italic min-h-[40px]">
                        "{pred.explanation}"
                      </p>
                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                        <span className="flex items-center"><ChevronRight className="w-3 h-3 mr-1 text-emerald-500" /> Latency Pipeline</span>
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
        <div className="border-2 border-dashed border-[#1e2738] rounded-3xl p-16 text-center text-gray-600 bg-[#0d1219]/50 shadow-inner">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-10" />
          <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2">Ready for Analysis</h3>
          <p className="text-sm max-w-sm mx-auto mb-6 text-gray-500 leading-relaxed">
            Click <strong className="text-emerald-500">Run Comparison</strong> to perform a parallel vector analysis across all connected enterprise LLM providers.
          </p>
          <div className="flex items-center justify-center space-x-6">
             <div className="text-[10px] font-bold uppercase tracking-widest flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-sm shadow-emerald-500/40" /> Gemini (Live)</div>
             <div className="text-[10px] font-bold uppercase tracking-widest flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-sm shadow-emerald-500/40" /> Groq (Live)</div>
             <div className="text-[10px] font-bold uppercase tracking-widest flex items-center opacity-30 cursor-help" title="Add Key in Settings"><span className="w-2 h-2 rounded-full bg-gray-600 mr-2" /> Anthropic</div>
             <div className="text-[10px] font-bold uppercase tracking-widest flex items-center opacity-30 cursor-help" title="Add Key in Settings"><span className="w-2 h-2 rounded-full bg-gray-600 mr-2" /> OpenAI</div>
          </div>
        </div>
      )}
    </div>
  );
}
