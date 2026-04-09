import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function FraudGraph({ userId, API_URL }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    if (!userId || !API_URL) return;

    const fetchAndRender = () => {
      fetch(`${API_URL}/api/graph/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.nodes || data.nodes.length === 0) { setNodeCount(0); return; }
          setNodeCount(data.nodes.length);
          renderGraph(data);
        })
        .catch(err => setError(err.message));
    };

    fetchAndRender();
    const interval = setInterval(fetchAndRender, 5000);
    return () => clearInterval(interval);
  }, [userId, API_URL]);

  const renderGraph = (data) => {
    const width = containerRef.current.clientWidth;
    const height = 460;

    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'overflow-visible');

    // ─── DEFS & FILTERS ──────────────────────────────────────────
    const defs = svg.append('defs');
    
    // Core Node Glow
    const filter = defs.append('filter').attr('id', 'node-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    filter.append('feFlood').attr('flood-color', '#10b981').attr('flood-opacity', '0.4').attr('result', 'color');
    filter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'glow');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Link Gradient
    const gradient = defs.append('linearGradient').attr('id', 'link-grad').attr('gradientUnits', 'userSpaceOnUse');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(16, 185, 129, 0.2)');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(59, 130, 246, 0.2)');

    // ─── SIMULATION ─────────────────────────────────────────────
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // ─── LINKS ──────────────────────────────────────────────────
    const link = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', 'url(#link-grad)')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4);

    // ─── NODES ──────────────────────────────────────────────────
    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .attr('class', 'cursor-pointer group')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Glow backing for primary nodes
    nodeGroup.append('circle')
      .attr('r', d => d.group === 1 ? 22 : 0)
      .attr('fill', 'var(--primary-glow)')
      .attr('filter', 'blur(10px)')
      .attr('opacity', 0.5);

    // Main Circle
    nodeGroup.append('circle')
      .attr('r', d => {
        if (d.group === 1) return 16;   // User
        if (d.group === 4) return 7;    // Txn
        return 11;                       // Entity
      })
      .attr('fill', d => {
        if (d.group === 1) return '#10b981'; // Emerald
        if (d.group === 2) return '#3b82f6'; // Blue
        if (d.group === 3) return '#8b5cf6'; // Violet
        return d.risk > 0.5 ? '#ff4d4d' : '#334155'; // RED if risky
      })
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 2)
      .style('filter', d => (d.group === 1 || d.risk > 0.5) ? 'url(#node-glow)' : 'none');

    // ID Labels (Visible on hover or if important)
    nodeGroup.append('text')
      .text(d => d.label)
      .attr('dy', d => d.group === 1 ? 30 : 25)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-slate-500 font-mono text-[9px] uppercase tracking-tighter transition-all group-hover:fill-white');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }
  };

  return (
    <div className="relative glass-card bg-slate-900/40 p-1">
      {/* HUD Header */}
      <div className="absolute top-4 left-6 flex items-center space-x-2 z-10">
        <div className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Entity Correlation Node</span>
      </div>

      <div className="absolute top-4 right-6 flex items-center space-x-4 z-10 text-[9px] font-bold uppercase text-slate-500 tracking-widest">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 glow-emerald"></span>User</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Entity</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 glow-red"></span>Risk</span>
      </div>
      
      {error && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 text-xs font-mono">{error}</div>}
      {nodeCount === 0 && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-[10px] uppercase font-bold tracking-widest">
          Synchronizing Neural Fabric...
        </div>
      )}

      <div ref={containerRef} className="w-full h-[460px]"></div>
      
      {/* Stats overlay */}
      <div className="absolute bottom-4 left-6 py-1 px-3 rounded-md bg-white/5 border border-white/5 backdrop-blur-md">
        <span className="text-[9px] font-mono text-slate-500 uppercase">Active Nodes: </span>
        <span className="text-[11px] font-mono text-emerald-500 font-bold">{nodeCount.toString().padStart(3, '0')}</span>
      </div>
    </div>
  );
}
