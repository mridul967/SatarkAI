import React from 'react';
import { Terminal, ShieldAlert, Cpu, Network, Clock, ExternalLink, BrainCircuit, Zap, Fingerprint, MapPin } from 'lucide-react';

export default function AnalystConsole({ transaction, prediction, onEscalate, lang }) {
  if (!transaction) return (
    <div className="bg-[#0a0e14] rounded-2xl border border-white/[0.04] shadow-2xl p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-5 mx-auto">
        <Terminal className="w-7 h-7 text-[#ff8c3c]/30" />
      </div>
      <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-2">Forensic Console</h3>
      <p className="text-[11px] text-white/15 max-w-xs mx-auto leading-relaxed">Awaiting transaction ingestion for neural forensic analysis.</p>
    </div>
  );

  const getRiskColor = (level) => {
    if (level === 'CRITICAL' || level === 'HIGH') return 'text-red-400';
    if (level === 'MEDIUM') return 'text-orange-400';
    return 'text-emerald-400';
  };

  const getRiskBg = (level) => {
    if (level === 'CRITICAL' || level === 'HIGH') return 'bg-red-500/10 border-red-500/20';
    if (level === 'MEDIUM') return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-emerald-500/10 border-emerald-500/20';
  };

  return (
    <div className="bg-[#0a0e14] rounded-2xl border border-white/[0.04] shadow-2xl overflow-hidden">
      {/* Top Gradient Line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[#ff8c3c]/30 to-transparent"></div>
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ff8c3c]/10 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-[#ff8c3c]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 block">Forensic Console</span>
            <span className="text-[8px] font-mono text-[#a8976d]/40 uppercase tracking-widest">{transaction.transaction_id}</span>
          </div>
        </div>
        <span className="text-[9px] font-mono text-white/20 flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> {new Date(transaction.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Signal Grid */}
      <div className="p-5 space-y-4">
        {/* Key Signals Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.04] group/sig hover:border-[#ff8c3c]/15 transition-all">
            <div className="flex items-center gap-1.5 mb-2">
              <Fingerprint className="w-3 h-3 text-[#a8976d]/30 group-hover/sig:text-[#ff8c3c]/50 transition-colors" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#a8976d]/40">Device</span>
            </div>
            <span className="text-[11px] font-black text-white/80 block truncate">{transaction.device_id}</span>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.04] group/sig hover:border-[#ff8c3c]/15 transition-all">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3 h-3 text-[#a8976d]/30 group-hover/sig:text-[#ff8c3c]/50 transition-colors" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#a8976d]/40">Location</span>
            </div>
            <span className="text-[11px] font-black text-white/80">{transaction.location}</span>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.04] group/sig hover:border-[#ff8c3c]/15 transition-all">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3 h-3 text-[#a8976d]/30 group-hover/sig:text-[#ff8c3c]/50 transition-colors" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#a8976d]/40">Latency</span>
            </div>
            <span className="text-[11px] font-black text-[#ff8c3c]">{prediction?.latency_ms ? `${prediction.latency_ms}ms` : '—'}</span>
          </div>
        </div>

        {/* AI Verdict Bar */}
        <div className={`rounded-xl p-4 border flex items-center justify-between ${getRiskBg(prediction?.risk_level)}`}>
          <div className="flex items-center gap-3">
            <BrainCircuit className={`w-5 h-5 ${getRiskColor(prediction?.risk_level)}`} />
            <div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 block">AI Classification</span>
              <span className={`text-lg font-black tracking-tight ${getRiskColor(prediction?.risk_level)}`}>{prediction?.risk_level || 'IDLE'}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 block">Score</span>
            <span className="text-lg font-black text-white/80 font-mono">{(prediction?.fraud_score || 0).toFixed(3)}</span>
          </div>
        </div>

        {/* Neural Log */}
        <div className="bg-[#080b10] rounded-xl border border-white/[0.04] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
            <Terminal className="w-3 h-3 text-[#ff8c3c]/40" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Neural Trace</span>
          </div>
          <div className="p-4 font-mono text-[10px] space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
            <div className="text-[#ff8c3c]/30 flex items-center gap-2">
              <span className="w-1 h-1 bg-[#ff8c3c]/40 rounded-full animate-pulse"></span>
              EXEC_NEURAL_PIPELINE
            </div>
            <div className="text-white/15 pl-3">→ GRAPH_QUERY [OK]</div>
            <div className="text-white/15 pl-3">→ VELOCITY_CHECK [OK]</div>
            <div className="text-white/25 pl-3 border-l border-[#ff8c3c]/20 ml-0.5 pl-3">
              SCORE: <span className="text-white/60">{(prediction?.fraud_score || 0).toFixed(4)}</span>
            </div>
            <div className="text-white/10 border-t border-white/[0.04] pt-2 mt-2 italic text-[9px] leading-relaxed text-white/20">
              {lang === 'hi' ? (prediction?.alert_hi || prediction?.reason) : (prediction?.alert_en || prediction?.reason) || 'Analyzing behavioral footprint...'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={onEscalate}
          className="w-full py-3.5 bg-white/[0.04] hover:bg-[#ff8c3c] text-white/40 hover:text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-white/[0.04] hover:border-[#ff8c3c] hover:shadow-[0_0_20px_rgba(255,140,60,0.2)]"
        >
          Escalate Entity Mapper <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
