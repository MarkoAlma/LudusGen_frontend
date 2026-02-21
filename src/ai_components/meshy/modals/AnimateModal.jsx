// modals/AnimateModal.jsx
import React, { useState, useMemo } from 'react';
import {
  Search, Layers, Check, Plus, X, Loader2,
  PersonStanding, Music2, Play, Pause, Download,
} from 'lucide-react';
import { Tooltip } from '../ui/Primitives';
import { ANIMATION_LIBRARY } from './animationlibrary';

const ANIM_CATEGORIES = ['all', 'walking', 'running', 'idle', 'dance', 'gesture', 'combat', 'action', 'other'];

// ── AnimCard ──────────────────────────────────────────────────────────────────
function AnimCard({ anim, isAdded, isLoading, color, onAdd }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        border: `1px solid ${isAdded ? color + '60' : hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
        background: isAdded ? `${color}14` : hovered ? 'rgba(255,255,255,0.05)' : '#111120',
        position: 'relative',
      }}
    >
      <div style={{
        height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hovered ? '#1c1c30' : '#141422', position: 'relative', overflow: 'hidden', transition: 'background 0.2s',
      }}>
        {!imgError ? (
          <img src={anim.gif} alt={anim.label} onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <PersonStanding style={{ width: 28, height: 28, color: '#2d3748' }} />
            <span style={{ color: '#2d3748', fontSize: 9, textAlign: 'center', padding: '0 4px' }}>{anim.label}</span>
          </div>
        )}
        {isAdded && (
          <div style={{
            position: 'absolute', top: 5, right: 5, fontSize: 9, fontWeight: 800, color,
            background: `${color}25`, border: `1px solid ${color}55`, borderRadius: 999,
            padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Check style={{ width: 8, height: 8 }} /> Added
          </div>
        )}
        {hovered && (
          <button onClick={(e) => { e.stopPropagation(); onAdd(); }} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: isAdded ? 'rgba(239,68,68,0.4)' : 'rgba(0,0,0,0.55)',
            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#fff',
          }}>
            {isLoading
              ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              : isAdded
                ? <><X style={{ width: 13, height: 13 }} /> Remove</>
                : <><Plus style={{ width: 13, height: 13 }} /> Add</>}
          </button>
        )}
      </div>
      <div style={{ padding: '5px 8px', background: '#0d0d1c', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{
          color: '#b0afc0', fontSize: 9.5, fontWeight: 600, display: 'block',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{anim.label}</span>
      </div>
    </div>
  );
}

// ── AnimateModal ───────────────────────────────────────────────────────────────
export default function AnimateModal({ onClose, color, modelUrl }) {
  const [tab, setTab] = useState('library');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [added, setAdded] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [addingId, setAddingId] = useState(null);

  const filtered = useMemo(() => ANIMATION_LIBRARY.filter((a) => {
    const matchCat = category === 'all' || a.category === category;
    const matchSearch = !search || a.label.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [search, category]);

  const addedAnims = ANIMATION_LIBRARY.filter((a) => added.includes(a.id));

  const handleAdd = (id) => {
    if (added.includes(id)) { setAdded((p) => p.filter((a) => a !== id)); return; }
    setAddingId(id);
    setTimeout(() => { setAdded((p) => [...p, id]); setAddingId(null); }, 500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
    }} onClick={onClose}>
      <div style={{ display: 'flex', width: '100%', height: '100%' }} onClick={(e) => e.stopPropagation()}>

        {/* ── Left sidebar ── */}
        <div style={{
          width: 240, background: '#0a0a1a', borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Header */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <PersonStanding style={{ width: 15, height: 15, color }} /> Animate
              </span>
              <button onClick={onClose} style={{
                width: 24, height: 24, borderRadius: 7, border: 'none',
                background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
              }}><X style={{ width: 12, height: 12 }} /></button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#4b5563' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search animation…"
                style={{
                  width: '100%', padding: '6px 8px 6px 26px', borderRadius: 9, fontSize: 11,
                  color: '#e5e7eb', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = `${color}55`; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
            </div>
          </div>

          {/* Library / Added tabs */}
          <div style={{ display: 'flex', padding: '8px 10px 0', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'library', label: 'Library', icon: <Layers style={{ width: 11, height: 11 }} /> },
              { id: 'added', label: 'Added', icon: <Check style={{ width: 11, height: 11 }} />, count: added.length },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '5px 6px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: 'none', background: 'none', color: tab === t.id ? color : '#6b7280',
                borderBottom: tab === t.id ? `2px solid ${color}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                marginBottom: -1, transition: 'all 0.15s',
              }}>
                {t.icon} {t.label}
                {t.count > 0 && (
                  <span style={{
                    fontSize: 9, background: color, color: '#fff', padding: '1px 5px',
                    borderRadius: 999, fontWeight: 800,
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {tab === 'library' && (
            <div style={{ padding: '8px 10px 4px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ANIM_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', border: 'none', textTransform: 'capitalize', transition: 'all 0.15s',
                  background: category === cat ? `${color}30` : 'rgba(255,255,255,0.04)',
                  color: category === cat ? color : '#6b7280',
                  outline: category === cat ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                }}>{cat}</button>
              ))}
            </div>
          )}

          {tab === 'library' && (
            <div style={{ padding: '2px 10px 4px' }}>
              <span style={{ color: '#374151', fontSize: 10 }}>{filtered.length} animáció</span>
            </div>
          )}

          {/* Animation grid / list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px', scrollbarWidth: 'thin' }}>
            {tab === 'library' ? (
              filtered.length === 0
                ? <p style={{ color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 30 }}>Nincs találat</p>
                : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {filtered.map((anim) => (
                      <AnimCard key={anim.id} anim={anim} isAdded={added.includes(anim.id)}
                        isLoading={addingId === anim.id} color={color} onAdd={() => handleAdd(anim.id)} />
                    ))}
                  </div>
                )
            ) : (
              addedAnims.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, textAlign: 'center' }}>
                  <Music2 style={{ width: 28, height: 28, color: '#1f2937', marginBottom: 8 }} />
                  <p style={{ color: '#2d3748', fontSize: 11 }}>Még nincs hozzáadott animáció</p>
                  <button onClick={() => setTab('library')} style={{
                    marginTop: 8, padding: '5px 14px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                    border: `1px solid ${color}40`, background: `${color}15`, color, cursor: 'pointer',
                  }}>Böngéssz a Library-ban</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {addedAnims.map((anim) => {
                    const isPlaying = playing === anim.id;
                    return (
                      <div key={anim.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                        borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.15s',
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 8, background: '#181828',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
                        }}>
                          <img src={anim.gif} alt={anim.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{anim.label}</p>
                          <p style={{ color: '#4b5563', fontSize: 9, margin: 0, textTransform: 'capitalize' }}>{anim.category}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setPlaying((p) => p === anim.id ? null : anim.id)} style={{
                            width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: isPlaying ? `${color}30` : 'rgba(255,255,255,0.06)',
                            color: isPlaying ? color : '#6b7280',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isPlaying ? <Pause style={{ width: 10, height: 10 }} /> : <Play style={{ width: 10, height: 10 }} />}
                          </button>
                          <button onClick={() => setAdded((p) => p.filter((a) => a !== anim.id))} style={{
                            width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: 'rgba(239,68,68,0.1)', color: '#f87171',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}><X style={{ width: 10, height: 10 }} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Main 3D area ── */}
        <div style={{ flex: 1, position: 'relative', background: '#0d0d1f', display: 'flex', flexDirection: 'column' }}>
          {/* Top icon row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { tip: 'Solid nézet', icon: '🖥' },
              { tip: 'Rig nézet (csontok)', icon: '🦴' },
              { tip: 'Auto Rigging', icon: '🔄' },
              { tip: 'Animáció hozzáadása', icon: '➕' },
              { tip: 'Beállítások', icon: '⚙️' },
            ].map((btn, i) => (
              <Tooltip key={i} text={btn.tip} side="bottom">
                <button style={{
                  width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.07)',
                  background: i === 1 ? `${color}22` : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: i === 1 ? color : '#6b7280',
                }}>{btn.icon}</button>
              </Tooltip>
            ))}
          </div>

          {/* Viewport */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px', backgroundPosition: 'center center',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />

            {playing ? (
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 200, height: 300, borderRadius: 16, overflow: 'hidden',
                  border: `1px solid ${color}40`, background: '#0a0a1a',
                }}>
                  <img src={ANIMATION_LIBRARY.find((a) => a.id === playing)?.gif || ''} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{
                  color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                  background: `${color}18`, padding: '5px 14px', borderRadius: 999, border: `1px solid ${color}40`,
                }}>
                  <Music2 style={{ width: 12, height: 12 }} />
                  {ANIMATION_LIBRARY.find((a) => a.id === playing)?.label || 'Playing…'}
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                <PersonStanding style={{ width: 48, height: 48, color: '#1f2937', marginBottom: 12 }} />
                <p style={{ color: '#374151', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>
                  {modelUrl ? 'Válassz animációt az előnézethez' : 'Nincs betöltött modell'}
                </p>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative',
          }}>
            <button onClick={() => setTab('library')} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#d1d5db', transition: 'all 0.15s',
            }}>
              <PersonStanding style={{ width: 15, height: 15 }} /> Add Animations
            </button>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <Tooltip text="Export animáció" side="top">
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 16px', borderRadius: 10,
                  fontSize: 12, fontWeight: 700, border: 'none', background: 'rgba(255,255,255,0.06)',
                  color: '#9ca3af', cursor: 'pointer',
                }}>
                  <Download style={{ width: 13, height: 13 }} />
                  <span style={{ fontSize: 14 }}>🟡</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 800 }}>+250</span>
                </button>
              </Tooltip>
              <button style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#a3e635,#65a30d)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(132,204,22,0.4)',
              }}>
                <Download style={{ width: 16, height: 16, color: '#0a0a0a' }} />
              </button>
            </div>
            {added.length > 0 && (
              <div style={{
                position: 'absolute', bottom: 54, right: 20,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 999, background: `${color}20`,
                border: `1px solid ${color}40`, color,
              }}>
                <Check style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{added.length} animáció hozzáadva</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}