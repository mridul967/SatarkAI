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
    const height = 420;

    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Glow
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(22));

    // Links
    const link = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', d => d.value > 1 ? '#ef4444' : '#1e2738')
      .attr('stroke-width', d => d.value > 1 ? 1.5 : 1)
      .attr('stroke-dasharray', d => d.value === 1 ? '4,3' : 'none')
      .attr('stroke-opacity', d => d.value > 1 ? 0.8 : 0.4);

    // Nodes
    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    nodeGroup.append('circle')
      .attr('r', d => {
        if (d.group === 1) return 18;
        if (d.group === 4) return 8;
        return 11;
      })
      .attr('fill', d => {
        if (d.group === 1) return '#10b981'; // User - emerald
        if (d.group === 2) return '#3b82f6'; // Device - blue
        if (d.group === 3) return '#6366f1'; // IP - indigo
        return d.risk > 0.5 ? '#ef4444' : '#6b7280'; // Transaction
      })
      .attr('stroke', d => d.risk > 0.5 ? '#ef4444' : 'rgba(255,255,255,0.05)')
      .attr('stroke-width', d => d.risk > 0.5 ? 2 : 1)
      .style('filter', d => d.risk > 0.5 ? 'url(#glow)' : 'none');

    nodeGroup.append('text')
      .text(d => d.label)
      .attr('x', 16)
      .attr('y', 4)
      .style('fill', '#6b7280')
      .style('font-size', '9px')
      .style('font-family', 'Inter, sans-serif');

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
    <div className="relative">
      {/* Top Legend */}
      <div className="absolute top-3 right-4 z-10 flex items-center space-x-3 text-[10px] text-gray-500">
        <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span><span>User</span></span>
        <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span><span>Device</span></span>
        <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span><span>Transaction</span></span>
        <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span><span>Risky Txn</span></span>
      </div>
      
      {error && <div className="absolute text-red-500 m-4 mt-10 text-xs z-10">{error}</div>}
      {nodeCount === 0 && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm z-10">
          Waiting for transactions to build graph...
        </div>
      )}
      <div ref={containerRef} className="w-full h-[420px]"></div>
      
      {/* Bottom Legend */}
      <div className="flex items-center justify-center space-x-4 py-2 text-[10px] text-gray-600 border-t border-[#1e2738]">
        <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span><span>User</span></span>
        <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span><span>Device</span></span>
        <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span><span>Transaction</span></span>
        <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span><span>Risky Txn</span></span>
        <span className="ml-2 text-gray-700">{nodeCount} / 542</span>
      </div>
    </div>
  );
}
