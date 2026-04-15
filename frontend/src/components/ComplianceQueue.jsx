import { useState, useEffect } from 'react';
import { AlertTriangle, Download, RefreshCw, FileText, Clock, Shield, ChevronRight, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ComplianceQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/compliance/queue`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = async (txnId) => {
    setDownloading(txnId);
    try {
      const res = await fetch(`${API_URL}/api/compliance/download/${txnId}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FMR1_DRAFT_${txnId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  const parseTimestamp = (ts) => {
    // Handle both Unix timestamps (number) and ISO datetime strings
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return new Date(ts).getTime() / 1000;
    return Date.now() / 1000;
  };

  const getTimeSince = (ts) => {
    const tsSeconds = parseTimestamp(ts);
    const diff = Math.floor((Date.now() / 1000) - tsSeconds);
    if (diff < 0) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getDeadlineInfo = (ts, instType) => {
    const tsSeconds = parseTimestamp(ts);
    const days = instType === 'COMMERCIAL_BANK' ? 7 : 14;
    const deadlineTs = tsSeconds + (days * 86400);
    const remaining = Math.floor((deadlineTs - Date.now() / 1000) / 86400);
    return { days, remaining: Math.max(0, remaining) };
  };

  return (
    <div className="mt-8 space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              RBI Compliance Queue
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              FMR-1 Drafts · RBI Master Directions 2024 · Auto-generated
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {queue.length > 0 && (
            <span className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400 uppercase tracking-widest">
              {queue.length} Pending
            </span>
          )}
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="p-2.5 bg-[#1e2738] hover:bg-[#2a3548] border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Legal Banner */}
      <div className="flex items-start gap-3 p-4 bg-[#1a1207] border border-yellow-500/20 rounded-2xl">
        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-yellow-500/80 leading-relaxed font-medium">
          <strong className="text-yellow-400">DRAFT ONLY</strong> — SatarkAI generates pre-filled FMR-1 drafts for compliance officer review.
          Only the regulated institution may submit via{' '}
          <a href="https://cims.rbi.org.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-300 transition-colors">
            RBI CIMS portal
          </a>. No threshold — all confirmed fraud amounts must be reported
          (RBI Master Directions July 2024). Timeline: 7 days (Commercial Banks) / 14 days (NBFCs & Cooperative Banks).
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs font-bold">
          Connection Error: {error}
        </div>
      )}

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div className="border-2 border-dashed border-[#1e2738] rounded-3xl p-12 text-center bg-[#0d1219]/50 shadow-inner">
          <FileText className="w-10 h-10 mx-auto mb-4 text-gray-700" />
          <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2">
            No Active FMR-1 Drafts
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            FMR-1 drafts are automatically generated when CRITICAL risk transactions
            (score &gt; 85%) are detected by the GNN inference engine.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const deadline = getDeadlineInfo(item.queued_at, item.institution_type);
            const isUrgent = deadline.remaining <= 3;
            return (
              <div
                key={item.transaction_id}
                className={`bg-[#111620] border rounded-2xl p-5 transition-all hover:shadow-lg group ${
                  isUrgent
                    ? 'border-red-500/30 hover:border-red-500/50 hover:shadow-red-500/5'
                    : 'border-[#1e2738] hover:border-emerald-500/30 hover:shadow-emerald-500/5'
                }`}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left: Status + Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl border ${
                      isUrgent
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-orange-500/10 border-orange-500/20'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 ${isUrgent ? 'text-red-400' : 'text-orange-400'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                          Action Required
                        </span>
                        <span className="text-[9px] font-mono text-gray-600">•</span>
                        <span className="text-[10px] font-mono text-gray-400 truncate">
                          {item.transaction_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold flex-wrap">
                        <span className="flex items-center gap-1">
                          User: <span className="text-gray-300">{item.user_id}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          Amount: <span className="text-red-400 font-black">₹{item.amount?.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          Score: <span className="text-red-400 font-black">{(item.fraud_score * 100).toFixed(0)}%</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Deadline */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${
                      isUrgent
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-[#1e2738] border-white/5 text-gray-400'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {deadline.remaining}d left / {deadline.days}d window
                    </div>
                    <span className="text-[9px] text-gray-600 font-mono">
                      {getTimeSince(item.queued_at)}
                    </span>
                  </div>

                  {/* Right: Download */}
                  <button
                    onClick={() => handleDownload(item.transaction_id)}
                    disabled={downloading === item.transaction_id}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#E6F1FB] hover:bg-[#d0e6f7] text-[#0C447C] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 shrink-0 border border-[#0C447C]/10"
                  >
                    {downloading === item.transaction_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download FMR-1 Draft
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
