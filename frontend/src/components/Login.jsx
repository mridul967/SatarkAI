import React, { useState } from 'react';
import ParticleSphere from './ui/ParticleSphere';
import NeuralNetworkBackground from './ui/NeuralNetworkBackground';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react';
import logo from '../logo.png';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate network latency for realism
    setTimeout(() => {
      login(username, password);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-sans flex items-center justify-center p-8">

      {/* Background Layer 1: Neural Network Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <NeuralNetworkBackground />
      </div>

      {/* Background Layer 2: Particle Sphere (Centered or Hero position) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-full max-w-4xl transform scale-150 lg:scale-[1.8]">
          <ParticleSphere />
        </div>
      </div>

      {/* Background decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#ff8c3c]/5 blur-[120px] pointer-events-none" />

      {/* Login UI Container */}
      <div className="relative z-20 max-w-md w-full animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6 group transition-transform duration-500 hover:scale-110 cursor-default">
            <img src={logo} alt="SatarkAI Logo" className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">SatarkAI</h1>
          <p className="text-[#a8976d] text-[10px] uppercase tracking-[0.3em] font-bold tracking-widest">Bharat Fraud Intelligence Engine</p>
        </div>

        {/* Tactical Login Card (Solid Black) */}
        <div className="bg-[#0a0e14] p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5 rounded-3xl relative overflow-hidden backdrop-blur-xl bg-opacity-90">
          {/* Subtle card glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ff8c3c]/5 blur-[60px] rounded-full pointer-events-none" />

          <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
            <div>
              <label className="block text-[10px] font-black text-[#a8976d] uppercase tracking-widest mb-3">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8976d] group-focus-within:text-[#ff8c3c] transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#000000] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#ff8c3c]/50 transition-all placeholder-white/5"
                  placeholder="admin@satark"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#a8976d] uppercase tracking-widest mb-3">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8976d] group-focus-within:text-[#ff8c3c] transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#000000] border border-white/5 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#ff8c3c]/50 transition-all placeholder-white/5"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <div className="text-red-400 text-xs text-center font-bold animate-shake">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff8c3c] hover:bg-[#ff9d57] text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-[#ff8c3c]/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 group relative overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-xs font-bold">Authorize Access</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Branding Footer */}
        <div className="text-center mt-12 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white opacity-20 mb-4">
            SatarkAI · Neural Forensic Node · 2026
          </div>
          <p className="text-[#a8976d] text-[10px] tracking-[0.2em] font-medium uppercase opacity-60 hover:opacity-100 transition-opacity">
            हर लेन-देने पर नज़र &copy; 2026 SatarkAI Systems
          </p>
        </div>
      </div>
    </div>
  );
}
