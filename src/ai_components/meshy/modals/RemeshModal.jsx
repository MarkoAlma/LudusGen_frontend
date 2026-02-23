// modals/RemeshModal.jsx
import React, { useState } from 'react';
import { Loader2, Clock } from 'lucide-react';
import { Modal } from '../ui/Primitives';

const PRESETS = ['Custom', '3K', '10K', '30K', '100K'];
const PRESET_VALUES = { '3K': 3000, '10K': 10000, '30K': 30000, '100K': 100000 };

export default function RemeshModal({ onClose, color, params, setParam }) {
  const [polycountMode, setPolycountMode] = useState('fixed');
  const [polycountPreset, setPolycountPreset] = useState('10K');
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onClose(); }, 1500);
  };

  return (
    <Modal title="Remesh" onClose={onClose} width={320}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Target Polycount */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 600 }}>Target Polycount</span>
            <span style={{ fontSize: 13 }}>👑</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {['fixed', 'adaptive'].map((m) => (
              <button key={m} onClick={() => setPolycountMode(m)} style={{
                flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: polycountMode === m ? color : 'rgba(255,255,255,0.06)',
                color: polycountMode === m ? '#fff' : '#6b7280',
              }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRESETS.map((p) => (
              <button key={p} onClick={() => {
                setPolycountPreset(p);
                if (PRESET_VALUES[p]) setParam('target_polycount', PRESET_VALUES[p]);
              }} style={{
                flex: 1, padding: '7px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: polycountPreset === p ? color : 'rgba(255,255,255,0.06)',
                color: polycountPreset === p ? '#fff' : '#6b7280',
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Topology */}
        <div>
          <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Topology</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['quad', 'triangle'].map((t) => (
              <button key={t} onClick={() => setParam('topology', t)} style={{
                flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: params.topology === t ? color : 'rgba(255,255,255,0.06)',
                color: params.topology === t ? '#fff' : '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                {t === 'quad' ? '⊞' : '△'} {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#6b7280', fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 12, height: 12 }} /> 1 min</span>
          <span>🟡 0</span>
        </div>

        <button onClick={handleConfirm} disabled={loading} style={{
          width: '100%', padding: '13px 0', borderRadius: 13, fontSize: 14, fontWeight: 800,
          color: '#0a0a0a', background: loading ? 'rgba(132,204,22,0.4)' : 'linear-gradient(90deg,#a3e635,#65a30d)',
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
          {loading
            ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Remeshing…</>
            : '✓ Confirm'}
        </button>
      </div>
    </Modal>
  );
}