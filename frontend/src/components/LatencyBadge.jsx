import React from 'react';

export const LatencyBadge = ({ ms }) => {
  if (ms === undefined || ms === null) return null;

  const scheme =
    ms < 50  ? { bg: '#E1F5EE', color: '#085041', border: '#b2e8d6' } :
    ms < 100 ? { bg: '#FAEEDA', color: '#633806', border: '#f3d9ab' } :
               { bg: '#FCEBEB', color: '#791F1F', border: '#f9cbcb' };
               
  return (
    <span 
      className="latency-badge"
      style={{
        backgroundColor: scheme.bg,
        color: scheme.color,
        border: `1px solid ${scheme.border}`,
        fontSize: '9px', 
        fontWeight: '700',
        padding: '2px 8px', 
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        fontFamily: 'monospace',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: ms < 50 ? '0 0 10px rgba(0, 209, 255, 0.1)' : 'none'
      }}
    >
      <span className="opacity-50">⏱</span> {ms}ms
    </span>
  );
};

export default LatencyBadge;
