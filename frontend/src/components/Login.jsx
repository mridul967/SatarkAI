import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e14] p-4 font-sans">
      <div className="max-w-md w-full animate-slide-up">
        {/* Brand / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">SatarkAI</h1>
          <p className="text-gray-500 mt-2 text-sm uppercase tracking-widest font-medium">Enterprise Fraud Intelligence</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111620] border border-[#1e2738] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0a0e14] border border-[#1e2738] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0e14] border border-[#1e2738] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <div className="text-red-400 text-xs text-center">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600 text-xs tracking-wide">
            हर लेन-देन पर नज़र &copy; 2026 SatarkAI Systems
          </p>
        </div>
      </div>
    </div>
  );
}
