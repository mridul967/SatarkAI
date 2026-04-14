import { useState, useRef, useEffect } from 'react';
import { 
  Activity, GitGraph, BrainCircuit, Database, ChevronRight, 
  Settings, BookOpen, LogOut, Terminal, 
  Search, Bell, Command, LayoutDashboard, Globe, Menu, X
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
import Intro from './components/Intro';
import LatencyBadge from './components/LatencyBadge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showIntro, setShowIntro] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isConnected, lastTransaction, data } = useWebSocket('ws://localhost:8000/ws/transactions');

  if (showIntro) return <Intro onComplete={() => setShowIntro(false)} />;

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
    <div className="relative flex h-screen bg-[#f0f0ee] text-[#1c1a18] overflow-hidden selection:bg-[#ff8c3c]/30 w-full">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ─── SIDEBAR (Tactical Black) ─────────────────────── */}
      <aside className={`absolute inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-[260px] bg-[#0a0e14] flex flex-col z-50 shadow-2xl shrink-0 transition-transform duration-300 ease-in-out`}>
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
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
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
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f0f0ee] w-full min-w-0">
        
        {/* Top Header / Breadcrumbs (Hybrid) */}
        <header className="h-16 md:h-20 border-b border-black/5 flex items-center px-4 md:px-10 justify-between bg-white z-30 shrink-0">
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#a8976d]">
            <button 
              className="md:hidden p-2 -ml-2 text-black hover:bg-black/5 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline-block px-2 py-1 bg-black text-white rounded">Enterprise</span>
            <ChevronRight className="hidden sm:block w-3 h-3 text-black/20" />
            <span className="text-black font-black whitespace-nowrap overflow-hidden text-ellipsis">{navItems.find(n => n.id === activeTab)?.label}</span>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
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
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar relative z-0">
          
          {/* Workstation View (Main Investigation) */}
          {activeTab === 'dashboard' && (
            <div className="max-w-[1700px] mx-auto space-y-6 md:space-y-8 animate-slide-up-subtle">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
                
                {/* Left: Global Graph (Morphic Black Container) */}
                <div className="xl:col-span-8 flex flex-col group cursor-crosshair">
                  <div className="flex items-center justify-between mb-4 px-1 md:px-2">
                    <h2 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-black/80 flex items-center whitespace-nowrap overflow-hidden text-ellipsis">
                       <span className="w-1.5 h-1.5 bg-[#ff8c3c] rounded-full mr-2 md:mr-3 animate-pulse shrink-0"></span>
                       Global Entity Mapper
                    </h2>
                    <div className="text-[9px] md:text-[10px] font-mono text-black/40 flex items-center gap-1 md:gap-2 shrink-0">
                      <Settings className="w-3 h-3 hover:text-black transition-colors cursor-pointer" />
                      <span className="hidden sm:inline">CONFIG_NODE</span>
                    </div>
                  </div>
                  <div className="h-[400px] md:h-[600px] rounded-3xl overflow-hidden bg-[#0a0e14] border border-black/5 shadow-2xl relative transition-all duration-500 hover:shadow-[#ff8c3c]/10 hover:-translate-y-1">
                    <FraudGraph userId={lastTransaction?.transaction.user_id || 'usr_1001'} API_URL={API_URL} />
                    {/* Corner accent */}
                    <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#ff8c3c]/30 rounded-tr-3xl m-4 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100"></div>
                  </div>
                </div>

                {/* Right: Tactical HUD */}
                <div className="xl:col-span-4 space-y-8 flex flex-col justify-between">
                  <div className="bg-[#0a0e14] rounded-3xl p-8 flex flex-col items-center border border-black/5 shadow-2xl relative transition-all duration-500 hover:shadow-[#ff8c3c]/10 hover:-translate-y-1 cursor-pointer">
                    <div className="absolute top-5 left-6 text-[9px] font-mono text-[#a8976d]/50 tracking-widest uppercase">SEC_LEVEL_alpha</div>
                    <div className="absolute top-5 right-6 w-2 h-2 rounded-full bg-[#ffb36b] shadow-[0_0_10px_rgba(255,179,107,0.5)] animate-pulse"></div>
                    
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#a8976d] mt-4 mb-6">Threat Vector Pulse</h3>
                    <ScoreGauge 
                      score={lastTransaction?.prediction?.fraud_score || 0}
                      riskLevel={lastTransaction?.prediction?.risk_level || 'SAFE'}
                    />
                  </div>

                  <div className="bg-[#12161f] rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden group hover:bg-[#1a202c] transition-all duration-500 border border-black/5 shadow-2xl cursor-pointer hover:-translate-y-1">
                    <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                      <BrainCircuit className="w-48 h-48 text-[#ff8c3c]" />
                    </div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#a8976d]">Target UID</div>
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white transition-colors border border-white/5 group-hover:border-white/20">
                        <Activity className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tighter mb-5 select-all break-all transition-colors group-hover:text-[#ff8c3c] relative z-10">{lastTransaction?.transaction.user_id || 'ID_SYNCHRONIZING'}</div>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                      <div className="p-3.5 rounded-2xl bg-[#0a0e14] border border-white/5 flex flex-col hover:border-white/10 transition-colors">
                        <span className="text-[9px] font-bold text-[#a8976d] uppercase mb-1.5 tracking-widest">Txn Value</span>
                        <span className="text-sm font-black text-white leading-none">₹{lastTransaction?.transaction.amount?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-[#0a0e14] border border-white/5 flex flex-col hover:border-white/10 transition-colors">
                        <span className="text-[9px] font-bold text-[#a8976d] uppercase mb-1.5 tracking-widest">Curr State</span>
                        <span className={`text-sm font-black ${getRiskColor(lastTransaction?.prediction.risk_level)} leading-none`}>{lastTransaction?.prediction.risk_level || 'IDLE'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Section: Forensic Console & Stream */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 pb-10">
                <div className="xl:col-span-12">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                      <div className="min-h-[400px] xl:h-[500px]">
                        <AnalystConsole transaction={lastTransaction?.transaction} prediction={lastTransaction?.prediction} />
                      </div>
                      
                      <div className="h-[400px] xl:h-[500px] bg-[#0a0e14] rounded-3xl flex flex-col overflow-hidden border border-black/5 shadow-2xl transition-all duration-500 hover:shadow-[#ff8c3c]/10 group hover:-translate-y-1">
                        <div className="p-6 border-b border-white/5 bg-[#12161f] flex justify-between items-center transition-colors">
                          <div className="flex items-center gap-3">
                            <Database className="w-4 h-4 text-[#ff8c3c]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#a8976d]">Neural Forensic Stream</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] text-[#a8976d] uppercase tracking-widest hidden sm:block">Live Connect</span>
                            <span className="text-[9px] font-mono p-1.5 bg-[#ff8c3c]/10 text-[#ff8c3c] border border-[#ff8c3c]/20 rounded-md px-2 font-bold">{data.length} BUFF</span>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] p-6 space-y-3 relative">
                          {!data.length ? (
                             <div className="absolute inset-0 flex items-center justify-center text-[#a8976d]/40 italic">Awaiting connection...</div>
                          ) : (
                            data.map((item, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-[#ff8c3c]/5 cursor-pointer transition-all duration-300 border border-white/5 hover:border-[#ff8c3c]/30 hover:scale-[1.01]"
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-[#a8976d]/50 w-16 block">{new Date(item.transaction.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                                  <span className="w-1 h-1 rounded-full bg-white/10 hidden sm:block"></span>
                                  <span className="text-white font-bold tracking-wide opacity-80 hover:text-[#ffb36b] transition-colors">{item.transaction.user_id}</span>
                                </div>
                                
                                <div className="flex items-center gap-5">
                                  <span className="text-[#a8976d]/70 font-medium tracking-wide">₹{item.transaction.amount?.toLocaleString()}</span>
                                  <LatencyBadge ms={item.prediction?.latency_ms} />
                                  <span className={`font-black tracking-widest w-20 text-right ${getRiskColor(item.prediction?.risk_level)}`}>{item.prediction?.risk_level}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'graph' && (
            <div className="max-w-[1600px] mx-auto space-y-5 animate-slide-up-subtle">
              <div className="h-[calc(100vh-160px)] md:h-[800px] min-h-[400px] rounded-3xl overflow-hidden glass-card border-none shadow-2xl">
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
