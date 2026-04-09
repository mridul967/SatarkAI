import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Shield, Send, Activity, Lock, Globe } from 'lucide-react';

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
            // const provider = new ethers.providers.Web3Provider(window.ethereum);
            // const signer = provider.getSigner();
            // const contract = new ethers.Contract(process.env.VITE_FRAUD_REGISTRY_ADDR, REGISTRY_ABI, signer);
            // const tx = await contract.publishSignal(deviceHash, ipHash, form.category, form.severity);
            // await tx.wait();

            setStatus({ type: 'success', msg: `Fraud signal published for device ${form.deviceId.substring(0,6)}...` });
        } catch (err) {
            setStatus({ type: 'error', msg: 'Transaction failed: ' + err.message });
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-slate-900 rounded-xl border border-slate-800 text-white">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-500" />
                    <h1 className="text-2xl font-bold">Institutional Fraud Registry</h1>
                </div>
                {!account ? (
                    <button onClick={connectWallet} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors">
                        <Lock className="w-4 h-4" /> Connect Institutional Wallet
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-sm bg-slate-800 px-3 py-1 rounded-full text-blue-400">
                        <Globe className="w-4 h-4" /> {account.substring(0, 6)}...{account.substring(38)}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Send className="w-5 h-5 text-green-500" /> Publish New Signal
                    </h2>
                    
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Device ID (IMEI/Fingerprint)</label>
                        <input type="text" className="w-full bg-slate-800 border border-slate-700 p-2 rounded focus:border-blue-500 outline-none" 
                               value={form.deviceId} onChange={e => setForm({...form, deviceId: e.target.value})} required placeholder="Enter device identifier" />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">IP Address</label>
                        <input type="text" className="w-full bg-slate-800 border border-slate-700 p-2 rounded focus:border-blue-500 outline-none" 
                               value={form.ipAddress} onChange={e => setForm({...form, ipAddress: e.target.value})} required placeholder="103.21..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Fraud Category</label>
                            <select className="w-full bg-slate-800 border border-slate-700 p-2 rounded outline-none"
                                    value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                {FRAUD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Severity (1-4)</label>
                            <input type="number" min="1" max="4" className="w-full bg-slate-800 border border-slate-700 p-2 rounded outline-none"
                                   value={form.severity} onChange={e => setForm({...form, severity: parseInt(e.target.value)})} />
                        </div>
                    </div>

                    <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-all disabled:opacity-50" 
                            disabled={!isAuthorized}>
                        Sign & Publish to Polygon
                    </button>
                    
                    {status.msg && (
                        <div className={`p-3 rounded text-sm ${status.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-blue-900/50 text-blue-200'}`}>
                            {status.msg}
                        </div>
                    )}
                </form>

                <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" /> Network Activity
                    </h2>
                    <div className="bg-slate-800/50 rounded-lg p-4 h-64 overflow-y-auto border border-slate-800">
                        <p className="text-slate-500 text-center mt-20">Listening for on-chain events...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
