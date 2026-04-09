import { useState, useRef, useEffect } from 'react';
import { 
  Activity, GitGraph, BrainCircuit, Database, ChevronRight, 
  Settings, BookOpen, LogOut, Terminal, 
  Search, Bell, Command, LayoutDashboard, Globe
} from 'lucide-react';
import logo from './logo.png';
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
    if (level === 'MEDIUM') return 'text-orange-500';
    return 'text-[#1c1a18]';
  };

  return (
    <div className="relative flex h-screen bg-[#f0f0ee] text-[#1c1a18] overflow-hidden selection:bg-[#ff8c3c]/30">
      
      {/* ─── SIDEBAR (Tactical Black) ─────────────────────── */}
      <aside className="w-[260px] bg-[#0a0e14] flex flex-col z-50 shadow-2xl">
        <div className="p-8 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden p-1.5">
              <img src={logo} alt="SatarkAI" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white">SATARK<span className="text-[#ff8c3c] italic">AI</span></h1>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a8976d] leading-none">Pro Engine v2.0</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all duration-300 group ${
                activeTab === item.id 
                  ? 'bg-[#ff8c3c] text-white shadow-lg shadow-[#ff8c3c]/30' 
                  : 'text-[#a8976d] hover:text-[#e6d3a3] hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-[#a8976d] group-hover:text-[#cbb98f]'}`} />
                <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
              </div>
              {activeTab === item.id && <ChevronRight className="w-3 h-3 transition-transform" />}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-[#ff8c3c]">
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{user.username}</div>
              <div className="text-[10px] font-bold text-[#a8976d] uppercase tracking-tighter">Bharat Forensic Lead</div>
            </div>
            <button onClick={logout} className="p-2 text-[#a8976d] hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#a8976d]">
            <span>Status</span>
            <span className="flex items-center gap-1.5 text-[#ff8c3c]">
              <span className="w-2 h-2 rounded-full bg-[#ff8c3c] animate-pulse"></span>
              Synchronized
            </span>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ──────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f0f0ee]">
        
        {/* Top Header / Breadcrumbs (Hybrid) */}
        <header className="h-20 border-b border-black/5 flex items-center px-10 justify-between bg-white z-40">
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-[#a8976d]">
            <span className="px-2 py-1 bg-black text-white rounded">Enterprise</span>
            <ChevronRight className="w-3 h-3 text-black/20" />
            <span className="text-black font-black">{navItems.find(n => n.id === activeTab)?.label}</span>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden lg:flex items-center bg-[#f0f0ee] border border-black/5 rounded-xl px-5 py-3 gap-4 text-black">
              <Search className="w-4 h-4 opacity-30" />
              <input type="text" placeholder="Search Global Forensic ID..." className="bg-transparent border-none outline-none text-xs w-64 font-mono font-bold placeholder-black/20" />
              <div className="flex items-center gap-1 opacity-20">
                <Command className="w-3 h-3" />
                <span className="text-[10px]">K</span>
              </div>
            </div>
            <button className="relative text-black/40 hover:text-black transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ff8c3c] rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* View Layouts */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          
          {/* Workstation View (Main Investigation) */}
          {activeTab === 'dashboard' && (
            <div className="max-w-[1700px] mx-auto space-y-10 animate-slide-up-subtle">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                
                {/* Left: Global Graph (Morphic Black Container) */}
                <div className="xl:col-span-8 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-black">
                       <span className="text-[#ff8c3c] mr-2">/</span> Global Entity Mapper
                    </h2>
                  </div>
                  <div className="h-[600px] rounded-3xl overflow-hidden glass-card shadow-2xl border-none">
                    <FraudGraph userId={lastTransaction?.transaction.user_id || 'usr_1001'} API_URL={API_URL} />
                  </div>
                </div>

                {/* Right: Tactical HUD */}
                <div className="xl:col-span-4 space-y-8 flex flex-col justify-between">
                  <div className="glass-card bg-[#0a0e14] p-10 flex flex-col items-center border-none shadow-2xl">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#a8976d] mb-10">Threat Vector Pulse</h3>
                    <ScoreGauge 
                      score={lastTransaction?.prediction?.fraud_score || 0}
                      riskLevel={lastTransaction?.prediction?.risk_level || 'SAFE'}
                    />
                  </div>

                  <div className="glass-card p-8 flex flex-col justify-center relative overflow-hidden group hover:bg-[#0a0e14]/90 transition-all duration-400 border-none shadow-xl">
                    <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                      <BrainCircuit className="w-48 h-48 text-[#ff8c3c]" />
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-[#a8976d] mb-3">Target UID</div>
                    <div className="text-3xl font-black text-white tracking-tighter mb-2 select-all break-all">{lastTransaction?.transaction.user_id || 'ID_SYNCHRONIZING'}</div>
                    <div className="flex items-center gap-4 mt-6">
                      <div className="px-4 py-2 rounded-xl bg-white/5 text-[11px] font-bold text-[#e6d3a3] border border-white/5">VALUE: ₹{lastTransaction?.transaction.amount?.toLocaleString() || '0'}</div>
                      <div className={`px-4 py-2 rounded-xl bg-white/5 text-[11px] font-black ${getRiskColor(lastTransaction?.prediction.risk_level)} border border-white/5`}>{lastTransaction?.prediction.risk_level || 'IDLE'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Section: Forensic Console & Stream */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-12">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="h-[450px]">
                        <AnalystConsole transaction={lastTransaction?.transaction} prediction={lastTransaction?.prediction} />
                      </div>
                      
                      <div className="h-[450px] glass-card flex flex-col overflow-hidden border-none shadow-2xl">
                        <div className="p-6 border-b border-white/5 bg-black/40 flex justify-between items-center">
                          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#a8976d]">Neural Forensic Stream</span>
                          <span className="text-[10px] font-mono p-2 bg-[#ff8c3c]/20 text-[#ff8c3c] rounded-lg px-3 font-bold">{data.length} BUFF</span>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-xs p-8 space-y-4">
                          {data.map((item, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-all duration-300 border border-transparent hover:border-white/10"
                            >
                              <span className="text-[#a8976d] opacity-50">{new Date(item.transaction.timestamp).toLocaleTimeString()}</span>
                              <span className="text-white font-bold tracking-tight">{item.transaction.user_id}</span>
                              <span className={`font-black ${getRiskColor(item.prediction?.risk_level)}`}>{item.prediction?.risk_level}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'graph' && (
            <div className="max-w-[1600px] mx-auto space-y-5 animate-slide-up-subtle">
              <div className="h-[800px] rounded-3xl overflow-hidden glass-card border-none shadow-2xl">
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
