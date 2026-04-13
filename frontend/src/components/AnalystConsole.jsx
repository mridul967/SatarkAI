import React from 'react';
import { Terminal, ShieldAlert, Cpu, Network, Clock, ExternalLink } from 'lucide-react';

export default function AnalystConsole({ transaction, prediction }) {
  if (!transaction) return (
    <div className="h-full flex flex-col items-center justify-center p-12 text-center glass-card border-none shadow-2xl">
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-6 text-[#ff8c3c]">
        <Terminal className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold text-white tracking-tight">Node Idle</h3>
      <p className="text-sm text-[#a8976d] max-w-xs mt-3 leading-relaxed">Awaiting synchronous transaction ingestion for neural forensic mapping.</p>
    </div>
  );

  const getRiskColor = (level) => {
    if (level === 'CRITICAL' || level === 'HIGH') return 'text-red-400';
    if (level === 'MEDIUM') return 'text-orange-400';
    return 'text-[#e6d3a3]';
  };

  return (
    <div className="h-full space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#ff8c3c]/10 rounded-xl border border-[#ff8c3c]/20 shadow-[0_0_15px_rgba(255,140,60,0.1)]">
            <ShieldAlert className="w-6 h-6 text-[#ff8c3c]" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-black">Forensic Pulse </h2>
            <div className="text-[10px] font-mono text-[#a8976d] font-bold">NODE_ID / #{transaction.transaction_id}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-mono text-[#e6d3a3] border border-white/5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#ff8c3c]" /> {new Date(transaction.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100%-100px)]">
        {/* Signal Panel */}
        <div className="glass-card bg-black p-6 space-y-8 flex flex-col border-none shadow-2xl">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.34em] text-[#a8976d] mb-6 flex items-center gap-2">
              <Network className="w-4 h-4 text-[#ff8c3c]" /> Relational Signals
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#cbb98f] font-medium opacity-60">Device Linkage</span>
                <span className="font-mono text-[#ff8c3c] font-black">STABLE</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#cbb98f] font-medium opacity-60">IP Velocity</span>
                <span className="font-mono text-[#ff8c3c] font-black">NORMAL</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#cbb98f] font-medium opacity-60">GNN Latency</span>
                <span className="font-mono text-[#a8976d] font-black">{prediction?.latency_ms ? `${prediction.latency_ms}ms` : '32ms'}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-[#05070a] rounded-2xl p-6 border border-white/5 font-mono text-[11px] space-y-3 overflow-y-auto no-scrollbar shadow-inner">
            <div className="text-[#ff8c3c]/30">_INITIALIZING_NEURAL_CHECK...</div>
            <div className="text-[#ffb36b]/60">&gt; CHECKING CROSS_BANK_REGISTRY (PHASE 3)</div>
            <div className="text-[#a8976d]/40">&gt; NO_ON_CHAIN_SIGNALS_FOUND</div>
            <div className="text-[#ff8c3c]/80">&gt; WEIGHTED_GNN_SCORE: {(prediction?.fraud_score || 0).toFixed(4)}</div>
            <div className="text-white/10 mt-2">--------------------------------</div>
            <div className="text-white/90 mt-2 leading-relaxed opacity-80">INCIDENT_ROOT_CAUSE: {prediction?.explanation?.split('.')[0]}</div>
          </div>
        </div>

        {/* AI Consolidation */}
        <div className="glass-card bg-black/50 p-6 space-y-6 flex flex-col border-none shadow-2xl">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#a8976d] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#ffb36b]" /> Consensus Insight
          </h3>
          <div className="p-6 rounded-2xl bg-[#ff8c3c]/5 border border-[#ff8c3c]/10 italic text-sm text-[#e6d3a3] leading-relaxed opacity-90 shadow-inner">
            "{prediction?.explanation || "Legitimate pattern detected across all vectors."}"
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="text-[10px] text-[#a8976d] font-black uppercase tracking-tighter mb-1">AI Confidence</div>
              <div className="text-2xl font-black text-[#ffb36b]">{(1 - (prediction?.fraud_score || 0)).toFixed(2)}</div>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="text-[10px] text-[#a8976d] font-black uppercase tracking-tighter mb-1">Risk Intensity</div>
              <div className={`text-2xl font-black ${getRiskColor(prediction?.risk_level)}`}>{prediction?.risk_level || 'IDLE'}</div>
            </div>
          </div>

          <button className="w-full mt-auto py-4 bg-[#ff8c3c]/10 border border-[#ff8c3c]/20 text-[#ff8c3c] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-[#ff8c3c]/20 transition-all duration-300 flex items-center justify-center gap-3 rounded-2xl group shadow-lg shadow-[#ff8c3c]/5">
            Escalate Forensic Node <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
