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
import LanguageToggle from './components/LanguageToggle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showIntro, setShowIntro] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
  const WS_URL = `${API_URL.replace(/^https?:\/\//, `${wsProtocol}://`)}/ws/transactions`;
  const { isConnected, lastTransaction, data } = useWebSocket(WS_URL);
  
  const [lang, setLang] = useState(() => localStorage.getItem('sartak_lang') || 'en');

  const handleLangToggle = (newLang) => {
    setLang(newLang);
    localStorage.setItem('sartak_lang', newLang);
  };

  if (showIntro) return <Intro onComplete={() => setShowIntro(false)} />;

  if (!user) return <Login />;

  const navItems = [
    { id: 'dashboard', label: 'Workstation', icon: LayoutDashboard },
    { id: 'graph', label: 'Entity Mapper', icon: GitGraph },
    { id: 'models', label: 'Consensus Base', icon: BrainCircuit },
    { id: 'bank-network', label: 'Mesh Network', icon: Globe },
    { id: 'history', label: 'Audit Ledger', icon: Database },
  ];

  const getRiskColor = (level) => {
    if (level === 'CRITICAL') return 'text-red-500';
    if (level === 'HIGH') return 'text-orange-500';
    if (level === 'MEDIUM') return 'text-yellow-500';
    return 'text-emerald-500';
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
            <LanguageToggle lang={lang} onToggle={handleLangToggle} />

            <button className="relative text-black/40 hover:text-black transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ff8c3c] rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* View Layouts */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar relative z-0">
          
          {/* Workstation View — Premium Redesign */}
          {activeTab === 'dashboard' && (
            <div className="max-w-[1700px] mx-auto space-y-6 animate-slide-up-subtle">

              {/* ═══ ROW 0: Live Metrics Ribbon ═══ */}
              <div className="bg-[#0a0e14] rounded-2xl border border-white/[0.04] shadow-xl p-1">
                <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-white/[0.04]">
                  {[
                    { label: 'Active Target', value: lastTransaction?.transaction.user_id || '—', accent: 'text-white' },
                    { label: 'Transaction', value: `₹${lastTransaction?.transaction.amount?.toLocaleString() || '0'}`, accent: 'text-white' },
                    { label: 'Risk Score', value: `${Math.round((lastTransaction?.prediction?.fraud_score || 0) * 100)}%`, accent: lastTransaction?.prediction?.fraud_score > 0.6 ? 'text-red-400' : lastTransaction?.prediction?.fraud_score > 0.3 ? 'text-orange-400' : 'text-emerald-400' },
                    { label: 'Classification', value: lastTransaction?.prediction?.risk_level || 'IDLE', accent: getRiskColor(lastTransaction?.prediction?.risk_level) },
                    { 
                      label: 'Inference', 
                      value: lastTransaction?.prediction?.latency_ms ? (
                        <LatencyBadge ms={lastTransaction.prediction.latency_ms} />
                      ) : '—', 
                      accent: '' 
                    },
                  ].map((m, i) => (
                    <div key={i} className="px-5 py-4 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#a8976d]/60 mb-1.5">{m.label}</span>
                      <span className={`text-sm font-black tracking-tight ${m.accent}`}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══ ROW 1: Graph + Intelligence Panel ═══ */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* ─── LEFT: Entity Graph ─── */}
                <div className="xl:col-span-8 group">
                  <div className="relative h-[520px] rounded-2xl overflow-hidden bg-[#0a0e14] border border-white/[0.04] shadow-2xl transition-all duration-500 hover:shadow-[#ff8c3c]/[0.06]">
                    <FraudGraph userId={lastTransaction?.transaction.user_id || 'usr_1001'} API_URL={API_URL} />
                    {/* Corner accents */}
                    <div className="absolute top-3 right-3 w-10 h-10 border-t border-r border-[#ff8c3c]/20 rounded-tr-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute bottom-3 left-3 w-10 h-10 border-b border-l border-[#ff8c3c]/20 rounded-bl-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>

                {/* ─── RIGHT: Intelligence Column ─── */}
                <div className="xl:col-span-4 space-y-6 flex flex-col">

                  {/* Gauge Card */}
                  <div className="bg-[#0a0e14] rounded-2xl p-6 border border-white/[0.04] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff8c3c]/30 to-transparent"></div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a8976d]/60">Threat Vector</span>
                      <span className="w-2 h-2 rounded-full bg-[#ff8c3c]/60 animate-pulse shadow-[0_0_8px_rgba(255,140,60,0.4)]"></span>
                    </div>
                    <ScoreGauge 
                      score={lastTransaction?.prediction?.fraud_score || 0}
                      riskLevel={lastTransaction?.prediction?.risk_level || 'SAFE'}
                    />
                  </div>

                  {/* Target Identity Card */}
                  <div className="bg-[#0a0e14] rounded-2xl border border-white/[0.04] shadow-2xl relative overflow-hidden group/card hover:border-[#ff8c3c]/10 transition-all cursor-pointer flex-1">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a8976d]/60">Target Identity</span>
                        <Activity className="w-3.5 h-3.5 text-white/20 group-hover/card:text-[#ff8c3c] transition-colors" />
                      </div>
                      <div className="text-2xl font-black text-white tracking-tighter mb-6 group-hover/card:text-[#ff8c3c] transition-colors select-all">
                        {lastTransaction?.transaction.user_id || 'SYNCHRONIZING'}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                          <span className="text-[8px] font-bold text-[#a8976d]/50 uppercase tracking-widest block mb-1">Value</span>
                          <span className="text-xs font-black text-white">₹{lastTransaction?.transaction.amount?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                          <span className="text-[8px] font-bold text-[#a8976d]/50 uppercase tracking-widest block mb-1">State</span>
                          <span className={`text-xs font-black ${getRiskColor(lastTransaction?.prediction?.risk_level)}`}>{lastTransaction?.prediction?.risk_level || 'IDLE'}</span>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                          <span className="text-[8px] font-bold text-[#a8976d]/50 uppercase tracking-widest block mb-1">Device</span>
                          <span className="text-xs font-black text-white/70 truncate block">{lastTransaction?.transaction.device_id?.substring(0, 7) || '—'}</span>
                        </div>
                      </div>
                    </div>
                    {/* Subtle Background Icon */}
                    <BrainCircuit className="absolute -bottom-6 -right-6 w-32 h-32 text-[#ff8c3c]/[0.03] group-hover/card:text-[#ff8c3c]/[0.08] transition-colors pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ═══ ROW 2: Forensic Analysis + Live Feed ═══ */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-8">

                {/* ─── LEFT: Forensic Console ─── */}
                <div className="xl:col-span-5">
                  <AnalystConsole 
                    transaction={lastTransaction?.transaction} 
                    prediction={lastTransaction?.prediction} 
                    onEscalate={() => setActiveTab('graph')}
                    lang={lang}
                  />
                </div>

                {/* ─── RIGHT: Live Transaction Stream ─── */}
                <div className="xl:col-span-7">
                  <div className="bg-[#0a0e14] rounded-2xl border border-white/[0.04] shadow-2xl overflow-hidden">
                    {/* Stream Header */}
                    <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#ff8c3c]/10 flex items-center justify-center">
                          <Database className="w-4 h-4 text-[#ff8c3c]" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 block">Live Feed</span>
                          <span className="text-[8px] font-mono text-[#a8976d]/40 uppercase tracking-widest">{data.length} transactions buffered</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                        <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">LIVE</span>
                      </div>
                    </div>

                    {/* Stream Body */}
                    <div className="overflow-y-auto max-h-[480px] custom-scrollbar">
                      {!data.length ? (
                        <div className="py-20 flex items-center justify-center text-[#a8976d]/30 italic text-xs">Awaiting ingestion...</div>
                      ) : (
                        <div className="divide-y divide-white/[0.03]">
                          {data.map((item, idx) => {
                            const risk = item.prediction?.risk_level;
                            const isCritical = risk === 'CRITICAL' || risk === 'HIGH';
                            return (
                              <div 
                                key={idx} 
                                className={`flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.02] cursor-pointer transition-all duration-200 group/row ${isCritical ? 'bg-red-500/[0.03]' : ''}`}
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <span className="text-[10px] font-mono text-white/20 w-14 shrink-0">{new Date(item.transaction.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCritical ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : risk === 'MEDIUM' ? 'bg-orange-400' : 'bg-emerald-500/50'}`}></div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-bold text-white/70 group-hover/row:text-white transition-colors truncate">{item.transaction.user_id}</span>
                                    <span className="text-[9px] text-[#a8976d]/40 truncate group-hover/row:text-[#a8976d]/60 transition-colors">
                                      {lang === 'hi' ? item.prediction?.alert_hi : item.prediction?.alert_en}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-5 shrink-0">
                                  <span className="text-[11px] font-mono text-white/30 hidden sm:block">₹{item.transaction.amount?.toLocaleString()}</span>
                                  <LatencyBadge ms={item.prediction?.latency_ms} />
                                  <span className={`text-[10px] font-black uppercase tracking-widest w-16 text-right ${getRiskColor(risk)}`}>{risk}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
