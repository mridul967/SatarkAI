import React from 'react';

export default function ScoreGauge({ score, riskLevel }) {
  const rotation = (score * 180) - 90;
  
  const getColor = (s) => {
    if (s > 0.8) return '#ff4d4d'; // Cyber Red
    if (s > 0.6) return '#f59e0b'; // Amber
    if (s > 0.3) return '#fbbf24'; // Yellow
    return '#10b981'; // Emerald
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-56 h-28 overflow-hidden group">
        {/* Layered Svg Gauge */}
        <svg viewBox="0 0 100 50" className="w-full h-full select-none">
          <defs>
            <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff4d4d" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
          
          {/* Subtle Gradient Backdrop */}
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gauge-gradient)" strokeWidth="8" strokeLinecap="round" opacity="0.5" />

          {/* Active Highlight Arc */}
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * score)}
            className="transition-all duration-1000 ease-out"
            filter="url(#gauge-glow)" />

          {/* Ticks */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => {
            const angle = (t * Math.PI) + Math.PI;
            const x1 = 50 + 32 * Math.cos(angle);
            const y1 = 50 + 32 * Math.sin(angle);
            const x2 = 50 + 38 * Math.cos(angle);
            const y2 = 50 + 38 * Math.sin(angle);
            return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />;
          })}
        </svg>

        {/* Floating Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-0.5 h-16 bg-white origin-bottom rounded-full transition-transform duration-1000 ease-in-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        
        {/* Needle Hub */}
        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-800 border border-slate-700 shadow-inner" />
      </div>

      <div className="mt-4 text-center">
        <div className="text-4xl font-black tracking-tighter" style={{ color, filter: `drop-shadow(0 0 8px ${color}44)` }}>
          {Math.round(score * 100)}<span className="text-lg opacity-50 ml-0.5">%</span>
        </div>
        <div className={`mt-2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border-2 transition-colors duration-500 ${
          score > 0.8 ? 'bg-red-500/10 text-red-500 border-red-500/20'
            : score > 0.6 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            : score > 0.3 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        }`}>
          {riskLevel}
        </div>
      </div>
    </div>
  );
}
