import React from 'react';
import { Terminal, ShieldAlert, Cpu, Network, Clock, ExternalLink, BrainCircuit } from 'lucide-react';

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
    <div className="h-full space-y-6 animate-slide-up flex flex-col">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-black rounded-2xl border border-black/5 shadow-[0_0_15px_rgba(255,140,60,0.1)] relative overflow-hidden group hover:bg-[#0a0e14] cursor-pointer transition-all">
            <div className="absolute inset-0 bg-[#ff8c3c]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <ShieldAlert className="w-5 h-5 text-[#ff8c3c] relative z-10 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-black/80">Forensic Pulse </h2>
            <div className="text-[9px] font-mono text-[#a8976d] font-bold mt-1 tracking-widest">{transaction.transaction_id}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2.5 rounded-xl bg-white border border-black/5 text-[10px] font-mono text-[#a8976d] flex items-center gap-2 hover:bg-black hover:text-[#e6d3a3] cursor-pointer transition-colors shadow-sm font-bold">
             {new Date(transaction.timestamp).toLocaleTimeString()} <Clock className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Signal Panel */}
        <div className="bg-[#0a0e14] rounded-3xl p-8 flex flex-col border border-black/5 shadow-2xl transition-all duration-500 hover:shadow-[#ff8c3c]/10 hover:-translate-y-1 cursor-pointer">
          <div className="mb-8 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a8976d] flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-[#ff8c3c]" /> Relational Signals
            </h3>
            <div className="w-1.5 h-1.5 bg-[#a8976d] rounded-full opacity-50 shadow-[0_0_5px_rgba(168,151,109,0.5)]"></div>
          </div>
          <div className="space-y-5 mb-8">
            <div className="flex justify-between items-center text-[10px] group border-b border-white/5 pb-3">
              <span className="text-[#cbb98f] font-bold opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-3 bg-white/10 rounded-full group-hover:bg-[#ff8c3c] transition-colors"></span> Device Hash
              </span>
              <span className="font-mono text-[#e6d3a3] font-black bg-white/5 px-2.5 py-1 rounded-lg tracking-wider border border-white/5">{transaction.device_id.substring(0, 8)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] group border-b border-white/5 pb-3">
              <span className="text-[#cbb98f] font-bold opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-3 bg-white/10 rounded-full group-hover:bg-[#ff8c3c] transition-colors"></span> Geo Location
              </span>
              <span className="font-mono text-white font-black tracking-wider">{transaction.location}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] group pb-1">
              <span className="text-[#cbb98f] font-bold opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-3 bg-white/10 rounded-full group-hover:bg-[#ff8c3c] transition-colors"></span> Process Latency
              </span>
              <span className="font-mono text-[#ff8c3c] font-black tracking-wider">{prediction?.latency_ms ? `${prediction.latency_ms}ms` : '---'}</span>
            </div>
          </div>

          <div className="flex-1 bg-[#12161f] rounded-2xl p-6 border border-white/5 font-mono text-[10px] space-y-3 overflow-y-auto custom-scrollbar shadow-inner relative">
            <div className="text-[#ff8c3c]/40 flex items-center gap-2 font-bold"><span className="w-1.5 h-1.5 bg-[#ff8c3c]/60 rounded-full animate-ping"></span> _EXEC_NEURAL_CHECKS</div>
            <div className="text-[#ffb36b]/60 hover:text-[#ffb36b] transition-colors cursor-text">&gt; QUERY_GRAPH_DB [OK]</div>
            <div className="text-[#a8976d]/60 hover:text-[#a8976d] transition-colors cursor-text">&gt; CHECKING_NODE_VELOCITY ... </div>
            <div className="text-white border-l-2 border-[#ff8c3c] pl-3 my-3 ml-1 bg-white/5 py-1 text-[11px]">&gt; TARGET SCORE: {(prediction?.fraud_score || 0).toFixed(4)}</div>
            <div className="text-white/10 mt-3 border-t border-white/10 pt-3"></div>
            <div className="text-[#e6d3a3] font-sans text-[11px] italic opacity-80 leading-relaxed font-medium">
              &lt; {(prediction?.explanation || '').split('.')[0] || 'Validating behavior footprints...'} &gt;
            </div>
          </div>
        </div>

        {/* AI Consolidation */}
        <div className="bg-[#12161f] rounded-3xl p-8 space-y-8 flex flex-col border border-black/5 shadow-2xl transition-all duration-500 hover:shadow-[#ff8c3c]/10 hover:-translate-y-1 cursor-pointer relative overflow-hidden group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#ff8c3c]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          
          <div className="flex justify-between items-center relative z-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a8976d] flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[#ffb36b]" /> Consensus Overview
            </h3>
          </div>
          
          <div className="p-6 rounded-2xl bg-black/40 border border-white/5 italic text-[12px] text-white/70 leading-relaxed shadow-inner backdrop-blur-sm relative z-10 min-h-[90px] flex items-center">
            "{prediction?.explanation || "Awaiting complete neural vector alignment from node modules."}"
          </div>
          
          <div className="grid grid-cols-2 gap-5 relative z-10">
            <div className="p-6 bg-[#0a0e14] rounded-2xl border border-white/5 hover:border-white/10 transition-colors group/box">
              <div className="text-[9px] text-[#a8976d] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <BrainCircuit className="w-3 h-3 text-[#ff8c3c]/50 group-hover/box:text-[#ff8c3c] transition-colors" /> Base Risk
              </div>
              <div className="text-3xl font-black text-[#ffb36b] tracking-tighter">{(prediction?.fraud_score || 0).toFixed(2)}</div>
            </div>
            <div className="p-6 bg-[#0a0e14] rounded-2xl border border-white/5 hover:border-white/10 transition-colors group/box">
              <div className="text-[9px] text-[#a8976d] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert className="w-3 h-3 text-white/30 group-hover/box:text-white transition-colors" /> AI Status
              </div>
              <div className={`text-xl font-black ${getRiskColor(prediction?.risk_level)} pt-1`}>{prediction?.risk_level || 'IDLE'}</div>
            </div>
          </div>

          <button className="w-full mt-auto py-5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#ff8c3c] hover:text-white transition-all duration-300 flex items-center justify-center gap-3 rounded-2xl hover:shadow-[0_0_20px_rgba(255,140,60,0.3)] shadow-lg relative z-10">
            Escalate Forensic Node <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
