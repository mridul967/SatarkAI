import React from 'react';

export default function ScoreGauge({ score, riskLevel }) {
  const rotation = (score * 180) - 90;
  
  const getColor = (s) => {
    if (s > 0.8) return '#f87171'; // Red-400
    if (s > 0.6) return '#fb923c'; // Orange-400
    if (s > 0.3) return '#ffb36b'; // Soft Orange
    return '#e6d3a3'; // Beige/Gold
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
              <stop offset="0%" stopColor="#e6d3a3" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#ffb36b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f87171" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,140,60,0.05)" strokeWidth="8" strokeLinecap="round" />
          
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
            return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(230,211,163,0.2)" strokeWidth="0.5" />;
          })}
        </svg>

        {/* Floating Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-0.5 h-16 bg-[#e6d3a3] origin-bottom rounded-full transition-transform duration-1000 ease-in-out shadow-[0_0_10px_rgba(255,140,60,0.5)]"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        
        {/* Needle Hub */}
        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#1a1a1a] border border-[#ff8c3c]/20 shadow-inner" />
      </div>

      <div className="mt-4 text-center">
        <div className="text-4xl font-black tracking-tighter" style={{ color: '#e6d3a3', filter: `drop-shadow(0 0 8px #ff8c3c44)` }}>
          {Math.round(score * 100)}<span className="text-lg opacity-50 ml-0.5 text-[#a8976d]">%</span>
        </div>
        <div className={`mt-2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border-2 transition-colors duration-500 ${
          score > 0.8 ? 'bg-red-500/10 text-red-400 border-red-400/20'
            : score > 0.6 ? 'bg-orange-500/10 text-orange-400 border-orange-400/20'
            : score > 0.3 ? 'bg-orange-300/10 text-[#ffb36b] border-[#ffb36b]/20'
            : 'bg-[#ff8c3c]/5 text-[#e6d3a3] border-[#e6d3a3]/20'
        }`}>
          {riskLevel || 'IDLE'}
        </div>
      </div>
    </div>
  );
}
