// modals/EditTextureModal.jsx
import React, { useState, useRef } from 'react';
import { Upload, Loader2, X, Image, Camera, Grid3x3, Layers, RotateCcw, Paintbrush2 } from 'lucide-react';
import { Modal, Tooltip } from '../ui/Primitives';

const UV_LAYERS = [
  { id: 'base_color', label: 'Base Color', icon: '🎨' },
  { id: 'roughness',  label: 'Roughness',  icon: '〰' },
  { id: 'metallic',   label: 'Metallic',   icon: '🔩' },
  { id: 'normal',     label: 'Normal',     icon: '🔵' },
  { id: 'emissive',   label: 'Emissive',   icon: '✨' },
];

const fmtDate = (d) => new Date(d).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function EditTextureModal({ onClose, color, uvLayer, setUvLayer }) {
  const [texturePrompt, setTexturePrompt] = useState('');
  const [strength, setStrength] = useState(0.5);
  const [refPreview, setRefPreview] = useState(null);
  const [retexturing, setRetexturing] = useState(false);
  const [history, setHistory] = useState([]);
  const fileRef = useRef(null);

  const handleRefImage = (file) => {
    if (!file) return;
    setRefPreview(URL.createObjectURL(file));
  };

  const handleRetexture = async () => {
    if (retexturing) return;
    setRetexturing(true);
    setTimeout(() => {
      setHistory((h) => [{ prompt: texturePrompt || 'Custom retexture', ts: Date.now() }, ...h]);
      setRetexturing(false);
    }, 2000);
  };

  return (
    <Modal title="Edit Texture" onClose={onClose} width={760}>
      <div style={{ display: 'flex', gap: 20, minHeight: 420 }}>
        {/* ── Left: controls ── */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* History */}
          <div>
            <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>History</p>
            {history.length === 0
              ? <p style={{ color: '#374151', fontSize: 11 }}>Nincs textúra előzmény</p>
              : history.map((h, i) => (
                <div key={i} style={{ padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', marginBottom: 4 }}>
                  <p style={{ color: '#d1d5db', fontSize: 11, margin: 0 }}>{h.prompt}</p>
                  <p style={{ color: '#374151', fontSize: 9, margin: 0 }}>{fmtDate(h.ts)}</p>
                </div>
              ))
            }
          </div>

          {/* Prompt */}
          <div>
            <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px' }}>Prompt</p>
            <div style={{ position: 'relative' }}>
              <textarea value={texturePrompt} onChange={(e) => setTexturePrompt(e.target.value.slice(0, 800))}
                placeholder="Describe the desired texture…" rows={4}
                style={{
                  width: '100%', resize: 'none', borderRadius: 10, fontSize: 11, color: '#e5e7eb',
                  lineHeight: 1.55, padding: '10px 10px 22px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }} />
              <span style={{ position: 'absolute', bottom: 7, right: 9, color: '#4b5563', fontSize: 10 }}>{texturePrompt.length}/800</span>
            </div>
          </div>

          {/* Strength */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Influence Strength</span>
              <span style={{ color, fontSize: 11, fontWeight: 700 }}>{Math.round(strength * 100)}%</span>
            </div>
            <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
                background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${strength * 100}%`, pointerEvents: 'none',
              }} />
              <input type="range" min={0} max={1} step={0.01} value={strength} onChange={(e) => setStrength(Number(e.target.value))}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
            </div>
          </div>

          {/* Image reference */}
          <div>
            <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Upload Image Reference</p>
            <div onClick={() => fileRef.current?.click()} style={{
              height: refPreview ? 'auto' : 90, borderRadius: 10, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.12)',
              overflow: 'hidden', padding: refPreview ? 0 : 12,
            }}>
              {refPreview ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  <img src={refPreview} alt="" style={{ width: '100%', objectFit: 'cover', borderRadius: 10, maxHeight: 120 }} />
                  <button onClick={(e) => { e.stopPropagation(); setRefPreview(null); }} style={{
                    position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><X style={{ width: 11, height: 11, color: '#f87171' }} /></button>
                </div>
              ) : (
                <>
                  <Upload style={{ width: 20, height: 20, color: '#4b5563', marginBottom: 6 }} />
                  <p style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', margin: '0 0 2px' }}>Click / Drag & Drop</p>
                  <p style={{ color: '#374151', fontSize: 9, textAlign: 'center', margin: 0 }}>PNG, JPG, WEBP — Max 20MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleRefImage(e.target.files?.[0])} />
          </div>

          <button onClick={handleRetexture} disabled={retexturing} style={{
            width: '100%', padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 800,
            color: '#0a0a0a', background: retexturing ? 'rgba(132,204,22,0.4)' : 'linear-gradient(90deg,#a3e635,#65a30d)',
            border: 'none', cursor: retexturing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            {retexturing
              ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Retexturing…</>
              : <><Paintbrush2 style={{ width: 14, height: 14 }} /> Retexture</>}
          </button>
        </div>

        {/* ── Right: UV preview ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Layer tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {UV_LAYERS.map((layer) => (
              <button key={layer.id} onClick={() => setUvLayer(layer.id)} style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: uvLayer === layer.id ? color : 'rgba(255,255,255,0.06)',
                color: uvLayer === layer.id ? '#fff' : '#6b7280',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{layer.icon}</span> {layer.label}
              </button>
            ))}
          </div>

          {/* Preview area */}
          <div style={{
            flex: 1, borderRadius: 14, background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: 0,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, background: `${color}20`,
                border: `1px solid ${color}40`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 12px',
              }}>
                <Image style={{ width: 26, height: 26, color }} />
              </div>
              <p style={{ color: '#4b5563', fontSize: 12 }}>Textúra előnézet</p>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ tip: 'Kamera', icon: <Camera style={{ width: 14, height: 14 }} /> },
                { tip: 'Drótváz', icon: <Grid3x3 style={{ width: 14, height: 14 }} /> },
                { tip: 'UV szerkesztő', icon: <Layers style={{ width: 14, height: 14 }} /> },
                { tip: 'Undo', icon: <RotateCcw style={{ width: 14, height: 14 }} /> }].map((btn, i) => (
                <Tooltip key={i} text={btn.tip} side="top">
                  <button style={{
                    width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
                  }}>{btn.icon}</button>
                </Tooltip>
              ))}
            </div>
            <button style={{
              padding: '8px 20px', borderRadius: 11, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', border: 'none', background: color, color: '#fff',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 11 }}>👑</span> Save to Model
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}