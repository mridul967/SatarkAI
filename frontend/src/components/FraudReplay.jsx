import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Play, Pause, ChevronLeft, ChevronRight, RotateCcw, 
  Activity, Shield, AlertTriangle, History,
  TrendingUp, Zap
} from 'lucide-react';
import { FORENSIC_CASES, MODES } from '../data/forensic_cases';

export default function FraudReplay() {
  const containerRef = useRef(null);
  const [activeMode, setActiveMode] = useState(MODES.SIM_SWAP);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  const caseData = useMemo(() => FORENSIC_CASES[activeMode], [activeMode]);
  const maxSteps = caseData.events.length - 1;

  // Playback engine
  useEffect(() => {
    let interval;
    if (isPlaying && currentStep < maxSteps) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= maxSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStep, maxSteps, speed]);

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const nodeIds = new Set();
    for (let i = 0; i <= currentStep; i++) {
        const event = caseData.events[i];
        event.nodes.forEach(n => {
            if (!nodeIds.has(n.id)) {
                nodes.push({ ...n });
                nodeIds.add(n.id);
            }
        });
        event.links.forEach(l => links.push({ ...l }));
    }
    return { nodes, links };
  }, [caseData, currentStep]);

  const detectionIdx = caseData.events.findIndex(e => e.risk >= caseData.threshold);
  const isDetected = currentStep >= detectionIdx && detectionIdx !== -1;
  const missedWindow = detectionIdx !== -1 ? detectionIdx : 0;

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = 400;
    d3.select(containerRef.current).selectAll('*').remove();
    const svg = d3.select(containerRef.current).append('svg').attr('width', width).attr('height', height).attr('class', 'overflow-visible');
    const defs = svg.append('defs');
    const nodeGlow = defs.append('filter').attr('id', 'item-glow');
    nodeGlow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    nodeGlow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    const link = svg.append('g').selectAll('line').data(graphData.links).enter().append('line')
      .attr('stroke', '#334155').attr('stroke-width', 2).attr('stroke-opacity', 0.6).attr('stroke-dasharray', '5,5');

    const node = svg.append('g').selectAll('g').data(graphData.nodes).enter().append('g').attr('class', 'node-group transition-all duration-500');

    node.append('circle').attr('r', d => d.group === 'user' ? 20 : 14)
      .attr('fill', d => d.group === 'user' ? '#10b981' : d.group === 'device' ? '#3b82f6' : d.group === 'merchant' ? '#d97706' : '#64748b')
      .attr('filter', d => d.risk > 0.5 ? 'url(#item-glow)' : 'none')
      .attr('stroke', d => d.risk > 0.8 ? '#ef4444' : 'rgba(255,255,255,0.1)').attr('stroke-width', 3);

    node.append('text').text(d => d.label).attr('dy', 35).attr('text-anchor', 'middle').attr('class', 'fill-slate-500 font-mono text-[10px] uppercase font-bold tracking-tight');

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }, [graphData]);

  const currentEvent = caseData.events[currentStep];

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] text-slate-300 font-sans selection:bg-emerald-500/30 overflow-hidden">
      <div className="flex gap-2 p-6 pb-2">
        {Object.values(MODES).map(mode => (
          <button key={mode} onClick={() => { setActiveMode(mode); setCurrentStep(0); setIsPlaying(false); }}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${activeMode === mode ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'}`}>
            {mode} <span className="ml-1 opacity-40 font-medium lowercase italic text-[9px]">{FORENSIC_CASES[mode].tag}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 flex-1 p-6 pt-2 gap-6 min-h-0">
        <div className="col-span-8 relative bg-black/40 border border-white/5 rounded-3xl overflow-hidden group shadow-2xl">
          <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><Zap className="w-4 h-4 text-emerald-400" /></div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Entity correlation graph</h3>
              <div className="flex gap-4 mt-1">
                {['User', 'Device', 'Merchant', 'Flagged'].map((l, i) => (
                  <span key={l} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase">
                    <span className={`w-2 h-2 rounded-full ${['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500'][i]}`}></span> {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div ref={containerRef} className="w-full h-full cursor-crosshair" />
        </div>

        <div className="col-span-4 flex flex-col gap-6 overflow-hidden">
          <div className="bg-[#111620] border border-white/5 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Current Transaction</span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Amount', val: currentEvent.amount ? `₹${currentEvent.amount.toLocaleString()}` : '—' },
                { label: 'User', val: currentEvent.nodes.find(n => n.group === 'user')?.label || '—' },
                { label: 'Device', val: currentEvent.nodes.find(n => n.group === 'device')?.label || '—' },
                { label: 'Merchant', val: currentEvent.nodes.find(n => n.group === 'merchant')?.label || '—' },
                { label: 'Risk score', val: `${(currentEvent.risk * 100).toFixed(1)}%`, highlight: currentEvent.risk > caseData.threshold },
                { label: 'Status', val: currentEvent.risk > caseData.threshold ? 'INTERCEPTED' : 'MONITORING', highlight: currentEvent.risk > caseData.threshold }
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{row.label}</span>
                  <span className={`text-xs font-mono font-bold ${row.highlight ? 'text-red-400' : 'text-white'}`}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111620] border border-white/5 rounded-3xl p-6 shadow-xl flex-1">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Session Stats</span>
            </div>
            <div className="space-y-6">
               {[
                 { l: 'Txns seen', v: currentStep + 1 },
                 { l: 'Graph nodes', v: graphData.nodes.length },
                 { l: 'Detection at', v: isDetected ? `T+${caseData.events[detectionIdx].t}s` : '—', h: isDetected, c: 'text-red-400' },
                 { l: 'Missed window', v: isDetected ? `${missedWindow} txns` : '—', h: isDetected, c: 'text-orange-400' }
               ].map(s => (
                 <div key={s.l} className="flex justify-between items-end">
                    <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1">{s.l}</div>
                    <div className={`text-xl font-black ${s.h ? s.c : 'text-white'}`}>{s.v}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="relative group px-1">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
              <div className="h-full bg-emerald-500 transition-all duration-300 relative rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(currentStep / maxSteps) * 100}%` }} />
            </div>
            {detectionIdx !== -1 && (
              <div className="absolute top-[-8px] flex flex-col items-center group-hover:opacity-100 transition-opacity" style={{ left: `${(detectionIdx / maxSteps) * 100}%` }}>
                 <span className="text-[8px] font-black text-red-400 uppercase tracking-tighter mb-1 animate-pulse">▼ detected</span>
                 <div className="w-0.5 h-4 bg-red-400/60" />
              </div>
            )}
            <input type="range" min="0" max={maxSteps} value={currentStep} onChange={e => { setCurrentStep(parseInt(e.target.value)); setIsPlaying(false); }} className="absolute inset-0 w-full opacity-0 cursor-pointer h-6 top-[-10px]" />
          </div>

          <div className="flex items-start gap-12">
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-3">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
                    {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-1" />}
                  </button>
                  {[ChevronLeft, ChevronRight, RotateCcw].map((Icon, idx) => (
                    <button key={idx} onClick={() => { 
                      if (idx === 0) setCurrentStep(p => Math.max(0, p-1));
                      if (idx === 1) setCurrentStep(p => Math.min(maxSteps, p+1));
                      if (idx === 2) setCurrentStep(0);
                      setIsPlaying(false);
                    }} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all">
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                  <div className="h-10 w-px bg-white/10 mx-2" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Speed</span>
                    <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="bg-transparent text-white font-black text-xs border-none focus:ring-0 p-0 cursor-pointer hover:text-emerald-400">
                      <option value="1" className="bg-[#0a0e14]">1×</option><option value="2" className="bg-[#0a0e14]">2×</option><option value="4" className="bg-[#0a0e14]">4×</option>
                    </select>
                  </div>
               </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden mask-fade-right">
              {caseData.events.map((ev, i) => (
                <div key={i} onClick={() => { setCurrentStep(i); setIsPlaying(false); }}
                  className={`min-w-[180px] p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${i === currentStep ? 'bg-white/10 border-white/20 shadow-lg' : i <= currentStep ? 'bg-white/[0.03] border-white/5 opacity-60 hover:opacity-100' : 'bg-transparent border-white/[0.02] opacity-20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-black ${i === detectionIdx ? 'text-red-400' : 'text-slate-500'}`}>T+{ev.t}S</span>
                    {ev.amount > 0 && <span className="text-[10px] font-bold text-emerald-400">₹{ev.amount.toLocaleString()}</span>}
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-tight leading-tight ${i === detectionIdx ? 'text-red-400' : 'text-white'}`}>{ev.label}</div>
                  {i === detectionIdx && i <= currentStep && <div className="mt-2 text-[8px] font-medium text-red-300/60 lowercase italic leading-none">Risk Threshold Triggered</div>}
                </div>
              ))}
            </div>
          </div>
          {currentEvent.signal && (
            <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-slide-up">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              <div><span className="text-[10px] font-black uppercase text-amber-500 tracking-widest block">Anomaly Insight</span><span className="text-xs text-amber-200/80 font-medium">{currentEvent.signal}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
