import { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import LatencyBadge from './LatencyBadge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/predict/history?limit=100`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const [histRes, statsRes] = await Promise.all([
        fetch(url),
        fetch(`${API_URL}/api/predict/stats`)
      ]);
      setTransactions(await histRes.json());
      setStats(await statsRes.json());
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh stats but don't auto-refresh table if filters are active
    const interval = setInterval(() => {
      if (!startDate && !endDate) fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const getRiskBadge = (level) => {
    const map = {
      CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/25',
      HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
      MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
      SAFE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    };
    return map[level] || 'bg-gray-500/15 text-gray-500 border-gray-500/25';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Logs</h1>
          <p className="text-gray-500 mt-1">Full transaction registry with multi-vector risk persistence.</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-[#111620] p-1.5 rounded-xl border border-[#1e2738]">
          <div className="flex items-center space-x-2 px-3">
            <span className="text-[10px] uppercase font-bold text-gray-600">From</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs text-gray-300 focus:ring-0 p-0"
            />
          </div>
          <div className="w-px h-4 bg-[#1e2738]" />
          <div className="flex items-center space-x-2 px-3">
            <span className="text-[10px] uppercase font-bold text-gray-600">To</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs text-gray-300 focus:ring-0 p-0"
            />
          </div>
          <button onClick={fetchData} disabled={loading}
            className="p-2 hover:bg-[#1e2738] text-gray-400 hover:text-white rounded-lg transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Transactions', value: stats.total_transactions, color: 'text-white' },
            { label: 'Flagged (Anomaly)', value: stats.flagged_transactions, color: 'text-red-400' },
            { label: 'Avg Fraud Score', value: `${(stats.average_fraud_score * 100).toFixed(1)}%`, color: 'text-emerald-400' },
            { label: 'System Flag Rate', value: `${stats.flag_rate}%`, color: 'text-yellow-400' },
          ].map((s, i) => (
            <div key={i} className="bg-[#111620] border border-[#1e2738] rounded-2xl p-5 shadow-sm">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111620] border border-[#1e2738] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#1e2738] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Transaction Database</h3>
          </div>
          <span className="text-[10px] font-mono text-gray-600 bg-[#0a0e14] px-3 py-1 rounded-full border border-[#1e2738]">
            {transactions.length} RECORDS FOUND
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0d1219] text-gray-500 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Anomaly Score</th>
                <th className="px-6 py-4 text-center">Latency</th>
                <th className="px-6 py-4">Risk Engine</th>
                <th className="px-6 py-4">Model</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn, idx) => (
                <tr key={idx} className="border-b border-[#1e2738] last:border-0 hover:bg-[#151b28]/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{txn.transaction_id}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-500">{txn.user_id}</td>
                  <td className="px-6 py-4 font-bold text-white">₹{txn.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-500">{txn.location}</td>
                  <td className="px-6 py-4 shrink-0">
                    <div className="flex items-center space-x-2">
                       <div className="w-12 h-1 bg-[#0a0e14] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${(txn.fraud_score || 0) * 100}%` }} />
                       </div>
                       <span className="font-mono text-xs text-gray-400">{(txn.fraud_score * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <LatencyBadge ms={txn.latency_ms || txn.processing_time_ms} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${getRiskBadge(txn.risk_level)}`}>
                      {txn.risk_level || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] text-gray-600 font-medium">{txn.model_used || 'central'}</td>
                  <td className="px-6 py-4 text-[10px] text-gray-500 font-mono italic">
                    {txn.created_at ? new Date(txn.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan="8" className="px-6 py-16 text-center text-gray-600 text-sm italic">No verified records found in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
