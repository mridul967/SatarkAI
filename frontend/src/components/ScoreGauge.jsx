export default function ScoreGauge({ score, riskLevel }) {
  const degrees = (score * 180) - 90;

  let color = '#10b981'; // green
  if (score > 0.8) color = '#ef4444'; // red
  else if (score > 0.6) color = '#f97316'; // orange
  else if (score > 0.3) color = '#eab308'; // yellow

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative w-44 h-22 overflow-hidden mb-2">
        <svg viewBox="0 0 100 50" className="w-full h-full drop-shadow-lg">
          {/* Background Arc */}
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e2738" strokeWidth="8" strokeLinecap="round" />
          {/* Active Arc */}
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray="125" strokeDashoffset={125 - (125 * score)}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }} />
          <circle cx="50" cy="50" r="3.5" fill="#4b5563" />
        </svg>
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-14 bg-white origin-bottom rounded-t-full transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateX(-50%) rotate(${degrees}deg)`, boxShadow: '0 0 6px rgba(255,255,255,0.3)' }}
        />
      </div>
      <div className="text-3xl font-bold tracking-tight mb-1" style={{ color }}>
        {Math.round(score * 100)}%
      </div>
      <div className={`px-3 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
        score > 0.8 ? 'bg-red-500/15 text-red-400 border-red-500/30'
          : score > 0.6 ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
          : score > 0.3 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      }`}>
        {riskLevel}
      </div>
    </div>
  );
}
