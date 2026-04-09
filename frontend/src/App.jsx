import { useState, useRef, useEffect } from 'react';
import { Activity, GitGraph, BrainCircuit, Database, Menu, ChevronDown, Settings, FileText, BookOpen, LogOut } from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAuth } from './contexts/AuthContext';
import ScoreGauge from './components/ScoreGauge';
import FraudGraph from './components/FraudGraph';
import ModelCompare from './components/ModelCompare';
import TransactionHistory from './components/TransactionHistory';
import AccountSettings from './components/AccountSettings';
import BankPortal from './components/BankPortal';
import Login from './components/Login';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected, lastTransaction, data } = useWebSocket('ws://localhost:8000/ws/transactions');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setAdminOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return <Login />;
  }

  const tabs = [
    { id: 'dashboard', label: 'Live Predictions', icon: Activity },
    { id: 'graph', label: 'Entity Graph', icon: GitGraph },
    { id: 'models', label: 'LLM Models', icon: BrainCircuit },
    { id: 'history', label: 'System Logs', icon: Database },
    { id: 'bank-network', label: 'Bank Network', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getRiskBadge = (level) => {
    const map = {
      CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
      HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      SAFE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return map[level] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e14] text-gray-200 overflow-hidden font-sans">

      {/* ─── TOP NAVBAR ──────────────────────────────── */}
      <nav className="h-14 bg-[#111620] border-b border-[#1e2738] flex items-center px-4 z-50 shrink-0">
        {/* Left: hamburger + brand */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-400 hover:text-white mr-3">
          <Menu className="w-5 h-5" />
        </button>

        {/* Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-[10px] uppercase font-bold text-gray-600 tracking-tighter">
            <span>Model:</span>
            <span className="text-emerald-500">GAT + 4 LLM</span>
          </div>

          {/* Admin dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-[#1e2738] rounded-lg text-xs font-bold text-gray-300 hover:bg-[#2a3548] transition-colors uppercase tracking-widest border border-white/5"
            >
              <span>{user.username}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
            </button>
            {adminOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#151b28] border border-[#1e2738] rounded-xl shadow-2xl py-1 animate-slide-up ring-1 ring-white/5">
                <button 
                  onClick={() => { setActiveTab('settings'); setAdminOpen(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1e2738] transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-500" /><span>Account Settings</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('history'); setAdminOpen(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1e2738] transition-colors"
                >
                  <FileText className="w-4 h-4 text-gray-500" /><span>System Logs</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1e2738] transition-colors">
                  <BookOpen className="w-4 h-4 text-gray-500" /><span>Documentation</span>
                </button>
                <div className="border-t border-[#1e2738] my-1" />
                <button 
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /><span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Connection indicator */}
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-red-500 shadow-lg shadow-red-500/40'} animate-pulse`} title={isConnected ? 'Connected' : 'Disconnected'} />
        </div>
      </nav>

      {/* ─── MAIN CONTENT ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 bg-[#0a0e14]">

        {/* ════ DASHBOARD (LIVE PREDICTIONS) ════ */}
        {activeTab === 'dashboard' && (
          <div className="max-w-[1400px] mx-auto space-y-5 animate-slide-up">
            <h1 className="text-3xl font-bold text-white tracking-tight">Transaction Monitoring</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Current Transaction Gauge */}
                <div className="bg-[#111620] border border-[#1e2738] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 border-l-2 border-emerald-500 pl-3">Current Transaction</h3>
                  {lastTransaction ? (
                    <ScoreGauge
                      score={lastTransaction.prediction?.fraud_score || 0}
                      riskLevel={lastTransaction.prediction?.risk_level || 'UNKNOWN'}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-600 text-sm italic">Awaiting secure stream...</div>
                  )}
                </div>

                {/* Recent Transaction Details */}
                <div className="bg-[#111620] border border-[#1e2738] rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 border-l-2 border-emerald-500 pl-3">Vector Analysis</h3>
                  {lastTransaction ? (
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-[#1e2738]/50">
                        <span className="text-gray-500 font-medium">Txn Identifier</span>
                        <span className="text-gray-200 font-mono">{lastTransaction.transaction.transaction_id}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-[#1e2738]/50">
                        <span className="text-gray-500 font-medium">Entity User</span>
                        <span className="text-emerald-500 font-bold">{lastTransaction.transaction.user_id}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-[#1e2738]/50">
                        <span className="text-gray-500 font-medium">Volume</span>
                        <span className="text-white font-extrabold">₹{lastTransaction.transaction.amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-gray-500 font-medium">Node Location</span>
                        <span className="text-gray-400 font-semibold">{lastTransaction.transaction.location}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm italic">No active vectors.</div>
                  )}

                  {/* LLM Reasoning */}
                  {lastTransaction && (
                    <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter mb-2">Engine Reasoning</div>
                      <p className="text-xs text-gray-400 leading-relaxed font-medium italic">"{lastTransaction.prediction?.explanation || lastTransaction.prediction?.reason || "System processing legitimate pattern."}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Graph */}
              <div className="lg:col-span-2">
                <div className="bg-[#111620] border border-[#1e2738] rounded-2xl overflow-hidden h-full shadow-lg">
                  <div className="p-4 border-b border-[#1e2738] bg-[#0d1219]">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-3 border-l-2 border-emerald-500">Relational Topology Node Map</h3>
                  </div>
                  <FraudGraph
                    userId={lastTransaction ? lastTransaction.transaction.user_id : 'usr_1001'}
                    API_URL={API_URL}
                  />
                </div>
              </div>
            </div>

            {/* Transaction Stream Table */}
            <div className="bg-[#111620] border border-[#1e2738] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-[#1e2738] flex items-center justify-between bg-[#0d1219]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Real-time Stream</h3>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-black border border-emerald-500/20">{data.length} INGESTED</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0a0e14] text-gray-600 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Observed at</th>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Volume</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Satark Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2738]/30">
                    {data.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-[10px] text-gray-600 font-mono italic">{new Date(item.transaction.timestamp).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400 group-hover:text-gray-200">{item.transaction.transaction_id}</td>
                        <td className="px-6 py-4 text-emerald-500 font-bold">{item.transaction.user_id}</td>
                        <td className="px-6 py-4 text-white font-extrabold">₹{item.transaction.amount?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500 font-medium">{item.transaction.location}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-black uppercase border-2 ${getRiskBadge(item.prediction?.risk_level)}`}>
                            {item.prediction?.risk_level || 'SAFE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.length === 0 && (
                      <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-600 text-sm font-medium italic">Synchronizing with enterprise socket stream...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════ ENTITY GRAPH ════ */}
        {activeTab === 'graph' && (
          <div className="max-w-[1400px] mx-auto space-y-5 animate-slide-up">
            <h1 className="text-3xl font-bold text-white tracking-tight">Entity Graph</h1>
            <p className="text-gray-500">Unified entity mapping for cross-account correlation and multi-node drift detection.</p>
            <div className="bg-[#111620] border border-[#1e2738] rounded-2xl overflow-hidden shadow-2xl">
              <FraudGraph
                userId={lastTransaction ? lastTransaction.transaction.user_id : 'usr_1001'}
                API_URL={API_URL}
              />
            </div>
          </div>
        )}

        {/* ════ MODEL COMPARE ════ */}
        {activeTab === 'models' && (
          <div className="animate-slide-up">
            <ModelCompare lastTransaction={lastTransaction} />
          </div>
        )}

        {/* ════ SYSTEM LOGS ════ */}
        {activeTab === 'history' && (
          <div className="animate-slide-up">
            <TransactionHistory />
          </div>
        )}

        {/* ════ BANK NETWORK ════ */}
        {activeTab === 'bank-network' && (
          <div className="animate-slide-up">
            <BankPortal />
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {activeTab === 'settings' && (
          <div className="animate-slide-up">
            <AccountSettings />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
