import React, { useState } from 'react';
import { Save, Key, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AccountSettings() {
  const [keys, setKeys] = useState({
    anthropic: '',
    openai: '',
    gemini: '',
    groq: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/settings/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys),
      });

      if (!res.ok) throw new Error('Failed to update keys');
      
      setMessage({ type: 'success', text: 'API Keys updated and hot-reloaded successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Account Settings</h1>
          <p className="text-gray-500 mt-1">Configure your enterprise API credentials and security preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111620] border border-[#1e2738] rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[#1e2738] flex items-center space-x-2">
              <Key className="w-5 h-5 text-emerald-500" />
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Model API Credentials</h2>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Anthropic API Key</label>
                  <input
                    type="password"
                    value={keys.anthropic}
                    onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}
                    className="w-full bg-[#0a0e14] border border-[#1e2738] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="sk-ant-..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">OpenAI API Key</label>
                  <input
                    type="password"
                    value={keys.openai}
                    onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                    className="w-full bg-[#0a0e14] border border-[#1e2738] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Google (Gemini) Key</label>
                  <input
                    type="password"
                    value={keys.gemini}
                    onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
                    className="w-full bg-[#0a0e14] border border-[#1e2738] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="AIza..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Groq API Key</label>
                  <input
                    type="password"
                    value={keys.groq}
                    onChange={(e) => setKeys({ ...keys, groq: e.target.value })}
                    className="w-full bg-[#0a0e14] border border-[#1e2738] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="gsk_..."
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center space-x-3 text-sm animate-slide-up ${
                  message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-[#1e2738]">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <h3 className="font-bold text-white uppercase tracking-widest text-xs">Security Note</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              API keys are hot-reloaded into the backend's memory. These keys are not persisted to the database in this version to prioritize ephemeral security. Rebuilding the Docker container will reset them to environment defaults.
            </p>
          </div>

          <div className="bg-[#111620] border border-[#1e2738] rounded-2xl p-6">
            <h3 className="font-bold text-gray-300 uppercase tracking-widest text-xs mb-4">System Identity</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Instance ID</span>
                <span className="text-gray-300 font-mono">SATARK-2026-ALPHA</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Architecture</span>
                <span className="text-gray-300">GAT + 4-LLM Ensemble</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Database Engine</span>
                <span className="text-gray-300">SQLite 3.x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
