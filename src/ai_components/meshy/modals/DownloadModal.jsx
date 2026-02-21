// modals/DownloadModal.jsx
import React, { useState } from 'react';
import { Modal } from '../ui/primitives';

export default function DownloadModal({ onClose, activeItem, color }) {
  const [resize, setResize] = useState(false);
  const [height, setHeight] = useState('10.00');
  const [unit, setUnit] = useState('m');
  const [origin, setOrigin] = useState('bottom');
  const [format, setFormat] = useState('glb');
  const formats = ['glb', 'fbx', 'obj', 'usdz', 'stl'];
  const units = ['m', 'cm', 'mm', 'ft', 'in'];

  const handleDownload = () => {
    if (!activeItem?.model_urls) { alert('Nincs letölthető modell!'); return; }
    const url = activeItem.model_urls[format] || activeItem.model_urls.glb;
    if (url) { window.open(url, '_blank'); onClose(); }
    else alert(`${format.toUpperCase()} formátum nem elérhető.`);
  };

  return (
    <Modal title="Download Settings" onClose={onClose} width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Resize toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 600 }}>Resize 👑</span>
          <button onClick={() => setResize((v) => !v)} style={{
            position: 'relative', width: 44, height: 24, borderRadius: 12, flexShrink: 0,
            cursor: 'pointer', border: 'none', background: resize ? color : 'rgba(255,255,255,0.1)',
            transition: 'background 0.2s',
          }}>
            <span style={{
              position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s', left: resize ? 22 : 3,
            }} />
          </button>
        </div>

        {resize && (
          <>
            <div>
              <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Height</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={height} onChange={(e) => setHeight(e.target.value)} style={{
                  flex: 1, padding: '7px 10px', borderRadius: 9, fontSize: 12, color: '#e5e7eb',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
                }} />
                <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{
                  padding: '7px 8px', borderRadius: 9, fontSize: 12, color: '#e5e7eb',
                  background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', cursor: 'pointer',
                }}>
                  {units.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Origin</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {['bottom', 'center'].map((o) => (
                  <button key={o} onClick={() => setOrigin(o)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: origin === o ? color : 'rgba(255,255,255,0.06)',
                    color: origin === o ? '#fff' : '#6b7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    {o === 'bottom' ? '⬇' : '⊙'} {o.charAt(0).toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Format */}
        <div>
          <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Format</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {formats.map((f) => (
              <button key={f} onClick={() => setFormat(f)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: 'none', textTransform: 'uppercase', transition: 'all 0.15s',
                background: format === f ? color : 'rgba(255,255,255,0.06)',
                color: format === f ? '#fff' : '#6b7280',
              }}>{f}</button>
            ))}
          </div>
        </div>

        <button onClick={handleDownload} style={{
          width: '100%', padding: '12px 0', borderRadius: 13, fontSize: 14, fontWeight: 800,
          color: '#0a0a0a', background: 'linear-gradient(90deg,#a3e635,#65a30d)',
          border: 'none', cursor: 'pointer',
        }}>
          Download PRO
        </button>
      </div>
    </Modal>
  );
}