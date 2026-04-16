export const MODES = {
  SIM_SWAP: 'SIM Swap — Delhi',
  MULE_RING: 'Mule Ring — 4 accounts',
  COLLUSION: 'Merchant Collusion',
};

export const FORENSIC_CASES = {
  [MODES.SIM_SWAP]: {
    id: 'sim_swap_01',
    name: 'SIM Swap — Delhi',
    tag: 'SIM Swap',
    description: 'Account takeover via unauthorized SIM cloning followed by rapid fund extraction.',
    threshold: 0.85,
    events: [
      { t: 0, label: 'Login — known device', type: 'INFO', amount: 320, nodes: [
        { id: 'usr_8821', group: 'user', label: 'usr_8821', risk: 0.1 },
        { id: 'iphone_a', group: 'device', label: 'iPhone A', risk: 0.1 }
      ], links: [{ source: 'usr_8821', target: 'iphone_a' }], risk: 0.05 },
      
      { t: 8, label: 'SIM swap detected', type: 'WARN', amount: 0, nodes: [
        { id: 'iphone_b', group: 'device', label: 'iPhone B', risk: 0.6 }
      ], links: [{ source: 'usr_8821', target: 'iphone_b' }], risk: 0.45, signal: 'Telecom carrier signal: SIM ID mismatch' },
      
      { t: 18, label: 'First transfer via new device', type: 'ALERT', amount: 48000, nodes: [
        { id: 'fx_portal', group: 'merchant', label: 'FX Portal', risk: 0.3 }
      ], links: [{ source: 'usr_8821', target: 'fx_portal' }], risk: 0.82, signal: 'Impossible travel: Device B in Delhi vs Device A in Mumbai' },
      
      { t: 26, label: 'Velocity spike — same merchant', type: 'CRITICAL', amount: 90000, nodes: [
        { id: 'crypto_atm', group: 'merchant', label: 'Crypto ATM', risk: 0.9 }
      ], links: [{ source: 'usr_8821', target: 'crypto_atm' }], risk: 0.98, signal: 'Velocity burst: ₹1.38L extracted in 18s' }
    ]
  },
  
  [MODES.MULE_RING]: {
    id: 'mule_ring_04',
    name: 'Mule Ring — 4 accounts',
    tag: 'Money Mule Network',
    description: 'Layering scheme detected through shared device fingerprints across unconnected accounts.',
    threshold: 0.75,
    events: [
      { t: 0, label: 'Inbound transfer: High value', type: 'INFO', amount: 450000, nodes: [
        { id: 'mule_main', group: 'user', label: 'usr_mule_1', risk: 0.2 },
        { id: 'pixel_7', group: 'device', label: 'Pixel 7', risk: 0.1 }
      ], links: [{ source: 'mule_main', target: 'pixel_7' }], risk: 0.15 },
      
      { t: 12, label: 'Layering: Account A split', type: 'ALERT', amount: 150000, nodes: [
        { id: 'usr_sub_a', group: 'user', label: 'usr_sub_a', risk: 0.7 }
      ], links: [{ source: 'mule_main', target: 'usr_sub_a' }, { source: 'usr_sub_a', target: 'pixel_7' }], risk: 0.65, signal: 'GNN Signal: Bipartite splitting pattern' },
      
      { t: 22, label: 'Layering: Account B split', type: 'ALERT', amount: 150000, nodes: [
        { id: 'usr_sub_b', group: 'user', label: 'usr_sub_b', risk: 0.8 }
      ], links: [{ source: 'mule_main', target: 'usr_sub_b' }, { source: 'usr_sub_b', target: 'pixel_7' }], risk: 0.88, signal: 'Device fingerprint shared across multiple unlinked accounts' },
      
      { t: 35, label: 'Final exit: Crypto Merchant', type: 'CRITICAL', amount: 450000, nodes: [
        { id: 'exit_node', group: 'merchant', label: 'Exit Node', risk: 0.9 }
      ], links: [{ source: 'mule_main', target: 'exit_node' }], risk: 0.99, signal: 'Total funds extraction to blacklisted exchange' }
    ]
  },

  [MODES.COLLUSION]: {
    id: 'col_01',
    name: 'Merchant Collusion',
    tag: 'Merchant Fraud',
    description: 'Cash-out scenario involving artificial transaction volumes to inflated merchant ratings.',
    threshold: 0.80,
    events: [
        { t: 0, label: 'Batch creation', type: 'INFO', amount: 500, nodes: [
          { id: 'merch_77', group: 'merchant', label: 'Merch_77', risk: 0.3 },
          { id: 'usr_x', group: 'user', label: 'usr_x', risk: 0.1 }
        ], links: [{ source: 'usr_x', target: 'merch_77' }], risk: 0.2 },
        { t: 5, label: 'Cyclical volume detected', type: 'WARN', amount: 500, nodes: [
          { id: 'usr_y', group: 'user', label: 'usr_y', risk: 0.1 }
        ], links: [{ source: 'usr_y', target: 'merch_77' }], risk: 0.45 },
        { t: 15, label: 'Multiple accounts, single IP', type: 'ALERT', amount: 5000, nodes: [
          { id: 'ip_shared', group: 'device', label: '142.1.0.9', risk: 0.7 }
        ], links: [{ source: 'usr_x', target: 'ip_shared' }, { source: 'usr_y', target: 'ip_shared' }], risk: 0.85, signal: 'IP velocity: 40 txns/min from distinct users' }
    ]
  }
};
