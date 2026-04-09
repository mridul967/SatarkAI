import { useState, useRef, useEffect } from 'react';
import { 
  Activity, GitGraph, BrainCircuit, Database, ChevronRight, 
  Settings, BookOpen, LogOut, ShieldCheck, Terminal, 
  Search, Bell, Command, LayoutDashboard, Globe
} from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAuth } from './contexts/AuthContext';

// Redesigned Components
import ScoreGauge from './components/ScoreGauge';
import FraudGraph from './components/FraudGraph';
import ModelCompare from './components/ModelCompare';
import TransactionHistory from './components/TransactionHistory';
import AccountSettings from './components/AccountSettings';
import BankPortal from './components/BankPortal';
import AnalystConsole from './components/AnalystConsole';
import Login from './components/Login';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isConnected, lastTransaction, data } = useWebSocket('ws://localhost:8000/ws/transactions');

  if (!user) return <Login />;

  const navItems = [
    { id: 'dashboard', label: 'Workstation', icon: LayoutDashboard },
    { id: 'graph', label: 'Entity Mapper', icon: GitGraph },
    { id: 'models', label: 'Consensus Base', icon: BrainCircuit },
    { id: 'bank-network', label: 'Mesh Network', icon: Globe },
    { id: 'history', label: 'Audit Ledger', icon: Database },
    { id: 'settings', label: 'Node Settings', icon: Settings },
  ];

  const getRiskColor = (level) => {
    if (level === 'CRITICAL' || level === 'HIGH') return 'text-red-500';
    if (level === 'MEDIUM') return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <div className="flex h-screen bg-bg-deep text-slate-200 overflow-hidden selection:bg-emerald-500/30">
      
      {/* ─── SIDEBAR ─────────────────────────────────────── */}
      <aside className="w-[260px] glass-panel flex flex-col z-50">
        <div className="p-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white">SATARK<span className="text-emerald-500 italic">AI</span></h1>
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 leading-none">Pro Engine v2.0</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                activeTab === item.id 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
              </div>
              {activeTab === item.id && <ChevronRight className="w-3 h-3 transition-transform" />}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold">
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-200 truncate">{user.username}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Senior Analyst</div>
            </div>
            <button onClick={logout} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-600">
            <span>Status</span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Synchronized
            </span>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ──────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Header / Breadcrumbs */}
        <header className="h-16 border-b border-white/5 flex items-center px-8 justify-between bg-bg-deep/50 backdrop-blur-md z-40">
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span>Enterprise</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-200">{navItems.find(n => n.id === activeTab)?.label}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center bg-black/30 border border-white/5 rounded-full px-4 py-2 gap-3 text-slate-500">
              <Search className="w-3.5 h-3.5" />
              <input type="text" placeholder="Search Neural ID..." className="bg-transparent border-none outline-none text-[10px] w-48 font-mono" />
              <div className="flex items-center gap-1 opacity-40">
                <Command className="w-3 h-3" />
                <span className="text-[10px]">K</span>
              </div>
            </div>
            <button className="relative text-slate-500 hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-deep"></span>
            </button>
          </div>
        </header>

        {/* View Layouts */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* Workstation View (Main Investigation) */}
          {activeTab === 'dashboard' && (
            <div className="max-w-[1600px] mx-auto space-y-8 animate-slide-up-subtle">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[550px]">
                
                {/* Left: Global Graph (Corpus) */}
                <div className="xl:col-span-8 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                       <Terminal className="w-3 h-3" /> Global Entity Mapper
                    </h2>
                  </div>
                  <div className="flex-1 min-h-0 rounded-2xl overflow-hidden glass-card">
                    <FraudGraph userId={lastTransaction?.transaction.user_id || 'usr_1001'} API_URL={API_URL} />
                  </div>
                </div>

                {/* Right: Focused HUD */}
                <div className="xl:col-span-4 space-y-6">
                  <div className="glass-card bg-emerald-500/[0.02] p-8 flex flex-col items-center border-emerald-500/10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mb-6">Threat Vector Gauge</h3>
                    <ScoreGauge 
                      score={lastTransaction?.prediction?.fraud_score || 0}
                      riskLevel={lastTransaction?.prediction?.risk_level || 'SAFE'}
                    />
                  </div>

                  <div className="glass-card p-6 min-h-[160px] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <BrainCircuit className="w-16 h-16" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Primary Entity Identifier</div>
                    <div className="text-2xl font-black text-white tracking-tighter mb-1 select-all">{lastTransaction?.transaction.user_id || 'ID_SYNCHRONIZING'}</div>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-slate-400">VOL: ₹{lastTransaction?.transaction.amount?.toLocaleString() || '0'}</div>
                      <div className={`px-2 py-1 rounded bg-slate-800 text-[10px] font-black ${getRiskColor(lastTransaction?.prediction.risk_level)}`}>RL: {lastTransaction?.prediction.risk_level || 'IDLE'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Section: Analyst Forensic Console */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-7 h-[400px]">
                  <AnalystConsole transaction={lastTransaction?.transaction} prediction={lastTransaction?.prediction} />
                </div>
                
                <div className="xl:col-span-5 h-[400px]">
                   <div className="glass-card h-full flex flex-col overflow-hidden bg-slate-900/20">
                      <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Forensic Stream</span>
                        <span className="text-[9px] font-mono p-1 bg-emerald-500/10 text-emerald-500 rounded px-2">{data.length} BUFF</span>
                      </div>
                      <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-[10px] p-4 space-y-2">
                        {data.map((item, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {/* Focus transaction */}}
                            className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/5"
                          >
                            <span className="text-slate-500">{new Date(item.transaction.timestamp).toLocaleTimeString()}</span>
                            <span className="text-slate-300 font-bold">{item.transaction.user_id}</span>
                            <span className={`font-black ${getRiskColor(item.prediction?.risk_level)}`}>{item.prediction?.risk_level}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'graph' && (
            <div className="max-w-[1400px] mx-auto space-y-5 animate-slide-up-subtle focus-within:">
              <div className="h-[750px] glass-card overflow-hidden">
                <FraudGraph userId={lastTransaction?.transaction.user_id || 'usr_1001'} API_URL={API_URL} />
              </div>
            </div>
          )}

          {activeTab === 'models' && <div className="animate-slide-up-subtle"><ModelCompare lastTransaction={lastTransaction} /></div>}
          {activeTab === 'bank-network' && <div className="animate-slide-up-subtle"><BankPortal /></div>}
          {activeTab === 'history' && <div className="animate-slide-up-subtle"><TransactionHistory /></div>}
          {activeTab === 'settings' && <div className="animate-slide-up-subtle"><AccountSettings /></div>}

        </div>
      </main>
    </div>
  );
}

export default App;
