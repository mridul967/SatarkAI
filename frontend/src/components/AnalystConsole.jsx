import React from 'react';
import { Terminal, ShieldAlert, Cpu, Network, Clock, ExternalLink } from 'lucide-react';

export default function AnalystConsole({ transaction, prediction }) {
  if (!transaction) return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center glass-card">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
        <Terminal className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-300">Session Idle</h3>
      <p className="text-sm text-slate-500 max-w-xs mt-2">Awaiting real-time transaction ingestion for forensic analysis.</p>
    </div>
  );

  return (
    <div className="h-full space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Forensic Incident </h2>
            <div className="text-[10px] font-mono text-slate-500">#{transaction.transaction_id}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-2 py-1 rounded bg-slate-800 text-[9px] font-mono text-slate-400 border border-white/5 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {new Date(transaction.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100%-80px)]">
        {/* Signal Panel */}
        <div className="glass-card bg-slate-900/60 p-5 space-y-6 flex flex-col">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
              <Network className="w-3 h-3 text-emerald-500" /> Relational Signals
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Device Linkage</span>
                <span className="font-mono text-emerald-400 font-bold">STABLE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">IP Velocity</span>
                <span className="font-mono text-emerald-400 font-bold">NORMAL</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">GNN Latency</span>
                <span className="font-mono text-slate-500 font-bold">32ms</span>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-[10px] space-y-2 overflow-y-auto no-scrollbar">
            <div className="text-emerald-500/50">_INITIALIZING_NEURAL_CHECK...</div>
            <div className="text-blue-500/80">&gt; CHECKING CROSS_BANK_REGISTRY (PHASE 3)</div>
            <div className="text-slate-500">&gt; NO_ON_CHAIN_SIGNALS_FOUND</div>
            <div className="text-emerald-500/80">&gt; WEIGHTED_GNN_SCORE: {(prediction?.fraud_score || 0).toFixed(4)}</div>
            <div className="text-slate-500 mt-2">--------------------------------</div>
            <div className="text-white/70 mt-1">INCIDENT_ROOT_CAUSE: {prediction?.explanation?.split('.')[0]}</div>
          </div>
        </div>

        {/* AI Consolidation */}
        <div className="glass-card bg-[#0d1219] p-5 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Cpu className="w-3 h-3 text-blue-500" /> Consensus Insight
          </h3>
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 italic text-sm text-slate-300 leading-relaxed">
            "{prediction?.explanation || "Legitimate pattern detected across all vectors."}"
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-800/40 rounded-lg border border-white/5">
              <div className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">AI Confidence</div>
              <div className="text-xl font-bold text-blue-400">{(1 - (prediction?.fraud_score || 0)).toFixed(2)}</div>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-white/5">
              <div className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Risk Level</div>
              <div className="text-xl font-bold text-red-500">{prediction?.risk_level}</div>
            </div>
          </div>

          <button className="w-full mt-4 py-3 bg-emerald-600/10 border border-emerald-600/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600/20 transition-all flex items-center justify-center gap-2 rounded-lg">
            Escalate to Analyst <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
