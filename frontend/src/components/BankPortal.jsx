import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Shield, Send, Activity, Lock, Globe, Share2 } from 'lucide-react';

// Simplified ABI for interaction
const REGISTRY_ABI = [
    "function publishSignal(bytes32 deviceHash, bytes32 ipHash, string calldata fraudCategory, uint8 severity) external",
    "function getSignalCount(bytes32 deviceHash) external view returns (uint256)",
    "function authorizedBanks(address) public view returns (bool)"
];

const FRAUD_CATEGORIES = [
    "SIM_SWAP", "MULE_ACCOUNT_CHAIN", "DEVICE_RING", 
    "GHOST_MERCHANT", "ACCOUNT_TAKEOVER", "P2P_SCAM",
    "BNPL_FRAUD", "KYC_BYPASS", "DEEPFAKE_AUTH"
];

export default function BankPortal() {
    const [account, setAccount] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [form, setForm] = useState({
        deviceId: '',
        ipAddress: '',
        category: FRAUD_CATEGORIES[0],
        severity: 3
    });
    const [status, setStatus] = useState({ type: '', msg: '' });

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
                checkAuthorization(accounts[0]);
            } catch (err) {
                setStatus({ type: 'error', msg: 'Wallet connection failed.' });
            }
        } else {
            setStatus({ type: 'info', msg: 'Please install MetaMask to use the Bank Portal.' });
        }
    };

    const checkAuthorization = async (addr) => {
        // Mocking check - in production we'd use ethers to call authorizedBanks(addr)
        setIsAuthorized(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account) return setStatus({ type: 'error', msg: 'Connect wallet first.' });

        setStatus({ type: 'info', msg: 'Signing transaction on Polygon...' });
        
        try {
            // Logic for hashing identifiers before on-chain submission
            const deviceHash = ethers.utils.id(form.deviceId);
            const ipHash = ethers.utils.id(form.ipAddress);

            // In a real environment, we'd use:
            // const tx = await contract.publishSignal(deviceHash, ipHash, form.category, form.severity);
            // await tx.wait();

            setStatus({ type: 'success', msg: `Fraud signal published for device ${form.deviceId.substring(0,6)}...` });
        } catch (err) {
            setStatus({ type: 'error', msg: 'Transaction failed: ' + err.message });
        }
    };

    return (
        <div className="p-10 max-w-6xl mx-auto glass-card bg-black/50 border-none shadow-2xl animate-slide-up rounded-3xl overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12 border-b border-white/5 pb-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-[#ff8c3c]/10 rounded-2xl border border-[#ff8c3c]/20 shadow-[0_0_20px_rgba(255,140,60,0.1)]">
                        <Shield className="w-10 h-10 text-[#ff8c3c]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Federated Registry</h1>
                        <p className="text-xs text-[#a8976d] font-bold tracking-[0.4em] uppercase opacity-70 mt-1">Institutional Signal Layer · Polygon Mesh</p>
                    </div>
                </div>
                {!account ? (
                    <button onClick={connectWallet} className="px-8 py-4 bg-[#ff8c3c] hover:bg-[#ff9d57] text-white font-black rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-xl shadow-[#ff8c3c]/30 active:scale-95 group">
                        <Lock className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" /> Connect Institutional Ledger
                    </button>
                ) : (
                    <div className="flex items-center gap-4 text-xs bg-white/5 px-6 py-3 rounded-2xl text-[#ff8c3c] border border-[#ff8c3c]/20 font-mono shadow-inner tracking-wider">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff8c3c] animate-pulse"></div>
                        {account.substring(0, 10)}...{account.substring(34)}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <form onSubmit={handleSubmit} className="lg:col-span-12 xl:col-span-7 space-y-10">
                    <h2 className="text-xs font-black text-[#a8976d] uppercase tracking-[0.4em] flex items-center gap-3 mb-8">
                        <Share2 className="w-5 h-5 text-[#ff8c3c]" /> Publish Cross-Bank Signal
                    </h2>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[11px] uppercase font-black text-[#a8976d] mb-3 tracking-widest opacity-60">Target Device Hash</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black/60 border border-white/5 p-4 rounded-2xl focus:border-[#ff8c3c]/50 focus:bg-black/80 outline-none text-sm text-white transition-all placeholder-white/5 font-mono" 
                                    value={form.deviceId} 
                                    onChange={e => setForm({...form, deviceId: e.target.value})} 
                                    required 
                                    placeholder="0x72a..." 
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase font-black text-[#a8976d] mb-3 tracking-widest opacity-60">Ingress IP Identity</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black/60 border border-white/5 p-4 rounded-2xl focus:border-[#ff8c3c]/50 focus:bg-black/80 outline-none text-sm text-white transition-all placeholder-white/5 font-mono" 
                                    value={form.ipAddress} 
                                    onChange={e => setForm({...form, ipAddress: e.target.value})} 
                                    required 
                                    placeholder="103.XXX.XXX.XXX" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[11px] uppercase font-black text-[#a8976d] mb-3 tracking-widest opacity-60">Risk Categorization</label>
                                <select 
                                    className="w-full bg-black/60 border border-white/5 p-4 rounded-2xl focus:border-[#ff8c3c]/50 focus:bg-black/80 outline-none text-sm text-[#e6d3a3] cursor-pointer appearance-none font-bold"
                                    value={form.category} 
                                    onChange={e => setForm({...form, category: e.target.value})}
                                >
                                    {FRAUD_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0a0e14] text-white">{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase font-black text-[#a8976d] mb-3 tracking-widest opacity-60">Criticality Mapping (1-4)</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="4" 
                                    className="w-full bg-black/60 border border-white/5 p-4 rounded-2xl focus:border-[#ff8c3c]/50 focus:bg-black/80 outline-none text-sm text-white transition-all font-mono"
                                    value={form.severity} 
                                    onChange={e => setForm({...form, severity: parseInt(e.target.value)})} 
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full py-5 bg-[#ff8c3c] hover:bg-[#ff9d57] text-white font-black uppercase tracking-[0.3em] rounded-2xl transition-all duration-400 disabled:opacity-50 shadow-2xl shadow-[#ff8c3c]/20 mt-8 active:scale-[0.98]" 
                        disabled={!isAuthorized}
                    >
                        Authorize & Broadcast to Blockchain
                    </button>
                    
                    {status.msg && (
                        <div className={`p-5 rounded-2xl text-xs font-black border tracking-widest uppercase transition-all duration-500 ${status.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-[#ff8c3c]/10 border-[#ff8c3c]/40 text-[#ff8c3c]'} animate-pulse text-center`}>
                           ⚡ {status.msg}
                        </div>
                    )}
                </form>

                <div className="lg:col-span-12 xl:col-span-5 space-y-10">
                    <h2 className="text-xs font-black text-[#a8976d] uppercase tracking-[0.4em] flex items-center gap-3 mb-8">
                        <Activity className="w-5 h-5 text-[#ff8c3c]" /> Live Ledger Feed
                    </h2>
                    <div className="bg-[#05070a] rounded-3xl p-10 h-[32rem] overflow-hidden border border-white/5 flex flex-col items-center justify-center relative shadow-inner group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#ff8c3c]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-1000"></div>
                        <Globe className="w-24 h-24 text-[#ff8c3c]/10 absolute animate-spin-slow opacity-30" />
                        <div className="relative z-10 text-center space-y-4">
                             <p className="text-[#a8976d] text-[11px] font-black uppercase tracking-[0.4em] leading-relaxed">
                                Neural Observer <br/> 
                                <span className="text-[#ff8c3c] opacity-100 italic">Connected to Mainnet</span>
                            </p>
                            <div className="flex gap-1 justify-center items-end h-8">
                                <div className="w-1 bg-[#ff8c3c]/40 animate-pulse h-4"></div>
                                <div className="w-1 bg-[#ff8c3c]/60 animate-pulse h-8"></div>
                                <div className="w-1 bg-[#ff8c3c]/30 animate-pulse h-6"></div>
                                <div className="w-1 bg-[#ff8c3c]/50 animate-pulse h-5"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
