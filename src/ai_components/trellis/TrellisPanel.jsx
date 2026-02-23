// trellis/TrellisPanel.jsx — NVIDIA Trellis AI Text-to-3D Panel
import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from 'react';
import {
  Download, Loader2, AlertCircle, Trash2,
  RotateCcw, Camera, Move3d, Layers, Play, Square,
  Sparkles, Clock, ChevronRight, Sliders,
  Box, Type,
} from 'lucide-react';

import ThreeViewer from '../meshy/viewer/ThreeViewer';
import { setCameraPreset } from '../meshy/viewer/threeHelpers';
import { IconBtn, Tooltip } from '../meshy/ui/Primitives';
import LightingControls from '../meshy/viewer/LightingControls';

// ── Firebase Firestore ────────────────────────────────────────────────────────
// Importáld a saját firebase konfig fájlodból
import { db } from '../../firebase/firebaseApp';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query,
  where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';

const VIEW_MODES = [
  { id: 'clay',   label: 'Clay',       tip: 'Clay — semleges szürke agyag' },
  { id: 'uv',     label: 'Base Color', tip: 'Base Color — textúra árnyék nélkül' },
  { id: 'normal', label: 'RGB',        tip: 'RGB — textúra + árnyék' },
];

const BG_OPTIONS = [
  {
    id: 'default', label: 'Alap',
    render: () => (
      <div style={{
        width: 14, height: 14, borderRadius: 3,
        background: 'linear-gradient(45deg,#1e1e3a 25%,#111128 25%,#111128 50%,#1e1e3a 50%,#1e1e3a 75%,#111128 75%)',
        backgroundSize: '6px 6px',
      }} />
    ),
  },
  {
    id: 'black', label: 'Fekete',
    render: () => <div style={{ width: 14, height: 14, borderRadius: 3, background: '#000', border: '1px solid rgba(255,255,255,0.15)' }} />,
  },
  {
    id: 'darkgray', label: 'Sötétszürke',
    render: () => <div style={{ width: 14, height: 14, borderRadius: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.1)' }} />,
  },
  {
    id: 'white', label: 'Fehér',
    render: () => <div style={{ width: 14, height: 14, borderRadius: 3, background: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />,
  },
];

const EXAMPLE_PROMPTS = [
  'a rustic log cabin with a stone chimney and a wooden porch',
  'a futuristic sci-fi helmet with glowing visor',
  'a medieval iron sword with ornate handle',
  'a cute cartoon mushroom house with round door',
  'a vintage wooden treasure chest with brass fittings',
  'a sleek sports car with aerodynamic body',
];

const fmtDate = (d) => {
  if (!d) return '';
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleString('hu-HU', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const defaultParams = () => ({
  slat_cfg_scale:      3.0,
  ss_cfg_scale:        7.5,
  slat_sampling_steps: 25,
  ss_sampling_steps:   25,
  seed:                0,
  randomSeed:          true,
});

// ── Standalone GLB fetcher (nem hook, bárhol hívható) ────────────────────────
// Újratölti a GLB-t a backenden keresztül, blob URL-t ad vissza.
// Minden page refresh után újra le kell tölteni, mert a blob URL session-specifikus.
async function fetchGlbAsBlob(modelUrl, getIdToken) {
  if (!modelUrl) return null;
  if (modelUrl.startsWith('data:')) return modelUrl;

  let fetchUrl = modelUrl;

  // Relatív backend URL → abszolút
  if (modelUrl.startsWith('/api/')) {
    fetchUrl = `http://localhost:3001${modelUrl}`;
  } else if (modelUrl.startsWith('https://s3.') || modelUrl.includes('backblazeb2.com')) {
    fetchUrl = `http://localhost:3001/api/trellis/proxy?url=${encodeURIComponent(modelUrl)}`;
  }

  const token = getIdToken ? await getIdToken() : '';
  const r = await fetch(fetchUrl, {
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!r.ok) throw new Error(`GLB letöltés sikertelen (${r.status})`);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

// ── Firestore history helpers ─────────────────────────────────────────────────
const TRELLIS_COLLECTION = 'trellis_history';

async function loadHistoryFromFirestore(userId) {
  if (!userId) {
    console.warn('loadHistory: userId hiányzik');
    return [];
  }
  try {
    console.log('Firestore betoltes, userId:', userId);
    const q = query(
      collection(db, TRELLIS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    console.log('Firestore talalatok szama:', snap.size);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(i => i.status === 'succeeded' && i.model_url);
  } catch (e) {
    console.error('Firestore load hiba:', e.message, e.code);
    return [];
  }
}


async function saveHistoryToFirestore(userId, item) {
  if (!userId) return null;
  try {
    const docRef = await addDoc(collection(db, TRELLIS_COLLECTION), {
      ...item,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.warn('Firestore history save failed:', e.message);
    return null;
  }
}

async function deleteHistoryFromFirestore(userId) {
  if (!userId) return;
  try {
    const q = query(
      collection(db, TRELLIS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, TRELLIS_COLLECTION, d.id)));
    await Promise.all(deletePromises);
  } catch (e) {
    console.warn('Firestore history delete failed:', e.message);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────
function MiniSlider({ label, value, min, max, step, onChange, color, display }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ color, fontSize: 11, fontWeight: 800 }}>{display ?? value}</span>
      </div>
      <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg,${color},#8b5cf6)`,
          width: `${Math.min(100, pct)}%`, pointerEvents: 'none',
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ color: '#374151', fontSize: 9 }}>{min}</span>
        <span style={{ color: '#374151', fontSize: 9 }}>{max}</span>
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange, min, max, color, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div>
          <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          {hint && <span style={{ color: '#4b5563', fontSize: 9, display: 'block' }}>{hint}</span>}
        </div>
        <input
          type="number" min={min} max={max} value={value}
          onChange={e => {
            const v = Number(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          style={{
            width: 72, padding: '3px 7px', borderRadius: 7,
            fontSize: 11, fontWeight: 700, color,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${color}30`,
            outline: 'none', textAlign: 'right', fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <p style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, margin: '0 0 1px' }}>{label}</p>
        {hint && <p style={{ color: '#4b5563', fontSize: 9, margin: 0 }}>{hint}</p>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        position: 'relative', width: 36, height: 20, borderRadius: 10,
        cursor: 'pointer', border: 'none',
        background: value ? color : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s', left: value ? 18 : 2,
        }} />
      </button>
    </div>
  );
}

function BgColorPicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const current = BG_OPTIONS.find(o => o.id === value) ?? BG_OPTIONS[0];
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} ref={ref}>
      <Tooltip text="Háttér szín" side="bottom">
        <button onClick={() => setOpen(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 7px', borderRadius: 7, fontSize: 10, fontWeight: 700,
          cursor: 'pointer', border: 'none', transition: 'all 0.15s',
          background: open ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
          color: '#6b7280',
          outline: open ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
        }}>
          {current.render()}
          <span style={{ color: '#6b7280', fontSize: 9 }}>▾</span>
        </button>
      </Tooltip>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999,
          width: 140, borderRadius: 10,
          background: '#0f0f23', border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)', padding: 6,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {BG_OPTIONS.map(opt => {
            const isActive = value === opt.id;
            return (
              <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: 'none', textAlign: 'left', width: '100%',
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: isActive ? '#e5e7eb' : '#9ca3af', transition: 'all 0.12s',
              }}>
                {opt.render()} {opt.label}
                {isActive && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6b7280' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WireframeControl({ active, onToggle, opacity, onOpacityChange, color, onColorChange, accentColor }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const pct = ((opacity - 0.05) / (1 - 0.05)) * 100;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 0 }} ref={ref}>
      <Tooltip text={active ? 'Wire overlay kikapcsolása' : 'Wire overlay bekapcsolása'} side="bottom">
        <button onClick={onToggle} style={{
          padding: '3px 8px', borderRadius: open ? '7px 0 0 7px' : 7,
          fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
          background: active ? `${accentColor}28` : 'rgba(255,255,255,0.04)',
          color: active ? accentColor : '#6b7280',
          outline: active ? `1px solid ${accentColor}50` : '1px solid rgba(255,255,255,0.06)',
        }}>Wire</button>
      </Tooltip>
      <Tooltip text="Wire beállítások" side="bottom">
        <button onClick={() => setOpen(v => !v)} style={{
          padding: '3px 5px', borderRadius: open ? '0 7px 7px 0' : 7,
          fontSize: 9, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
          background: open ? `${accentColor}28` : 'rgba(255,255,255,0.04)',
          color: open ? accentColor : '#6b7280',
          outline: open ? `1px solid ${accentColor}50` : '1px solid rgba(255,255,255,0.06)',
          borderLeft: open ? `1px solid ${accentColor}30` : undefined, marginLeft: 1,
        }}>▾</button>
      </Tooltip>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999,
          width: 200, borderRadius: 12, background: '#0f0f23',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)', padding: 12,
        }}>
          <p style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 800, margin: '0 0 10px' }}>Wire overlay</p>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Átlátszóság</span>
              <span style={{ color: accentColor, fontSize: 11, fontWeight: 800 }}>{Math.round(opacity * 100)}%</span>
            </div>
            <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
                background: `linear-gradient(90deg,${accentColor},#8b5cf6)`,
                width: `${pct}%`, pointerEvents: 'none',
              }} />
              <input type="range" min={0.05} max={1} step={0.01} value={opacity}
                onChange={e => onOpacityChange(Number(e.target.value))}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Szín</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {['#ffffff', '#84cc16', '#60a5fa', '#f87171'].map(c => (
                <button key={c} onClick={() => onColorChange(c)} style={{
                  width: 16, height: 16, borderRadius: '50%', border: 'none',
                  background: c, cursor: 'pointer',
                  outline: color === c ? `2px solid ${accentColor}` : '2px solid transparent',
                  outlineOffset: 1,
                }} />
              ))}
              <label style={{ cursor: 'pointer', position: 'relative', width: 16, height: 16 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px dashed #4b5563', background: color, cursor: 'pointer' }} />
                <input type="color" value={color} onChange={e => onColorChange(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </label>
            </div>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280', fontSize: 10 }}>Wire overlay</span>
            <button onClick={onToggle} style={{
              position: 'relative', width: 32, height: 18, borderRadius: 9, flexShrink: 0,
              cursor: 'pointer', border: 'none',
              background: active ? accentColor : 'rgba(255,255,255,0.1)', transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s', left: active ? 16 : 2,
              }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryCard({ item, isActive, onSelect, onReuse, color }) {
  return (
    <button onClick={() => onSelect(item)} style={{
      width: '100%', borderRadius: 10, padding: '8px 9px',
      border: `1px solid ${isActive ? color + '50' : 'rgba(255,255,255,0.07)'}`,
      background: isActive ? `${color}12` : 'rgba(255,255,255,0.02)',
      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 7, flexShrink: 0,
          background: `${color}15`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box style={{ width: 16, height: 16, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: isActive ? '#e5e7eb' : '#9ca3af',
            fontSize: 10, fontWeight: 600, margin: '0 0 2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.prompt || 'Trellis generálás'}
          </p>
          <p style={{ color: '#4b5563', fontSize: 9, margin: '0 0 4px' }}>
            {fmtDate(item.createdAt)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              background: 'rgba(74,222,128,0.12)', color: '#4ade80',
            }}>
              ☁ Mentve
            </span>
            <button
              onClick={e => { e.stopPropagation(); onReuse(item.prompt); }}
              style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4,
                background: `${color}15`, color, border: `1px solid ${color}30`,
                cursor: 'pointer',
              }}
            >
              ↩ Újra
            </button>
            {item.model_url && (
              <a
                href={item.model_url}
                download={`trellis_${item.id}.glb`}
                onClick={e => e.stopPropagation()}
                style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(255,255,255,0.05)', color: '#6b7280',
                  border: '1px solid rgba(255,255,255,0.08)',
                  textDecoration: 'none', cursor: 'pointer',
                }}
              >
                ↓ GLB
              </a>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function PromptInput({ value, onChange, onSubmit, color, disabled }) {
  const MAX_CHARS = 1000;
  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !disabled && value.trim() && !isOverLimit) {
      onSubmit();
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ position: 'relative' }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Írj le egy 3D objektumot angolul…&#10;pl. a rustic log cabin with a stone chimney"
          rows={5}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 12px 28px 12px',
            borderRadius: 12, resize: 'vertical', minHeight: 100, maxHeight: 220,
            fontSize: 11, lineHeight: 1.6, color: '#e5e7eb',
            background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${isOverLimit ? '#f87171' : value.trim() ? color + '50' : 'rgba(255,255,255,0.1)'}`,
            outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 0.2s',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        <span style={{
          position: 'absolute', bottom: 8, right: 10,
          fontSize: 9, fontWeight: 700,
          color: isOverLimit ? '#f87171' : remaining < 100 ? '#f59e0b' : '#374151',
        }}>
          {remaining}
        </span>
      </div>
      <p style={{ color: '#2d3748', fontSize: 9, margin: '4px 0 0', textAlign: 'right' }}>
        Ctrl+Enter a generáláshoz
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ════════════════════════════════════════════════════════════════════════════
export default function TrellisPanel({ selectedModel, getIdToken, userId }) {
  // ↑ userId propot add át a szülő komponenstől (MyUserContext-ből: user?.uid)

  const color = selectedModel?.color || '#a78bfa';

  // ── Prompt ───────────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('');

  // ── Generation ───────────────────────────────────────────────────────────
  const [genStatus, setGenStatus] = useState('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const [modelUrl, setModelUrl]   = useState(null);
  const [params, setParams]       = useState(defaultParams());

  // ── Viewer ───────────────────────────────────────────────────────────────
  const [viewMode, setViewMode]                 = useState('clay');
  const [lightMode, setLightMode]               = useState('studio');
  const [showGrid, setShowGrid]                 = useState(true);
  const [autoSpin, setAutoSpin]                 = useState(true);
  const [bgColor, setBgColor]                   = useState('default');
  const [wireframeOverlay, setWireframeOverlay] = useState(false);
  const [wireOpacity, setWireOpacity]           = useState(0.22);
  const [wireColor, setWireColor]               = useState('#ffffff');
  const wireHexColor = parseInt(wireColor.replace('#', ''), 16);

  // ── Lighting ─────────────────────────────────────────────────────────────
  const [lightStrength, setLightStrength]               = useState(1.0);
  const [lightRotation, setLightRotation]               = useState(0);
  const [lightAutoRotate, setLightAutoRotate]           = useState(false);
  const [lightAutoRotateSpeed, setLightAutoRotateSpeed] = useState(0.5);
  const [dramaticColor, setDramaticColor]               = useState('#4400ff');
  const [bgLightOn, setBgLightOn]                       = useState(true);
  const [bgLightColor, setBgLightColor]                 = useState('#ffffff');
  const [bgLightSize, setBgLightSize]                   = useState(4);
  const [bgLightIntensity, setBgLightIntensity]         = useState(0.1);
  const [gridColor1, setGridColor1]                     = useState('#1e1e3a');
  const [gridColor2, setGridColor2]                     = useState('#111128');

  // ── UI ───────────────────────────────────────────────────────────────────
  const [rightOpen, setRightOpen]       = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── History — Firestore-ból töltjük be ────────────────────────────────────
  const [history, setHistory]       = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [histSearch, setHistSearch] = useState('');

  const sceneRef = useRef(null);
  const setParam = useCallback((k, v) => setParams(p => ({ ...p, [k]: v })), []);

  // ── Firestore history betöltése + utolsó modell auto-load ────────────────
  useEffect(() => {
    console.log('TrellisPanel useEffect, userId:', userId);
    if (!userId) return;

    let cancelled = false;
    setHistoryLoading(true);

    (async () => {
      try {
        const items = await loadHistoryFromFirestore(userId);
        if (cancelled) return;

        setHistory(items);

        if (items.length > 0) {
          const latest = items[0];
          setActiveItem(latest);
          setGenStatus('succeeded');

          if (latest.model_url) {
            try {
              // Standalone fn: getIdToken ref közvetlenül, stabil referencia
              const blobUrl = await fetchGlbAsBlob(latest.model_url, getIdToken);
              if (!cancelled) setModelUrl(blobUrl);
            } catch (err) {
              console.warn('GLB auto-load hiba, raw url fallback:', err.message);
              if (!cancelled) setModelUrl(latest.model_url);
            }
          }
        }
      } catch (err) {
        console.error('History betöltési hiba:', err);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // getIdToken szándékosan kihagyva: stabil referencia (Firebase auth fn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const authHeaders = useCallback(async () => {
    const token = getIdToken ? await getIdToken() : '';
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (genStatus === 'pending' || !prompt.trim() || prompt.length > 1000) return;
    setErrorMsg('');
    setModelUrl(null);
    setGenStatus('pending');

    try {
      const headers = await authHeaders();

      // ── FIX: random seed generálása itt, közvetlenül a kérés előtt ──────
      // A params.randomSeed alapján döntünk, de a tényleges seed értéket
      // mindig itt számítjuk ki, nem a params.seed-ben tároljuk.
      const resolvedSeed = params.randomSeed
        ? Math.floor(Math.random() * 2_147_483_647)
        : Math.max(0, Math.floor(Number(params.seed) || 0));

      const res = await fetch('http://localhost:3001/api/trellis', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt:              prompt.trim(),
          slat_cfg_scale:      params.slat_cfg_scale,
          ss_cfg_scale:        params.ss_cfg_scale,
          slat_sampling_steps: params.slat_sampling_steps,
          ss_sampling_steps:   params.ss_sampling_steps,
          seed:                resolvedSeed,   // ← a ténylegesen használt seed
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setGenStatus('failed');
        setErrorMsg(data.message ?? 'Trellis generálás sikertelen');
        return;
      }

      const glbUrl = data.glb_url ?? data.model_url ?? null;

      const blobUrl = await fetchGlbAsBlob(glbUrl, getIdToken);
      setModelUrl(blobUrl);
      setGenStatus('succeeded');

      // ── Firestore-ba mentés (userId-hez kötött) ──────────────────────────
      const itemData = {
        prompt:    prompt.trim(),
        status:    'succeeded',
        model_url: glbUrl,
        params:    {
          slat_cfg_scale:      params.slat_cfg_scale,
          ss_cfg_scale:        params.ss_cfg_scale,
          slat_sampling_steps: params.slat_sampling_steps,
          ss_sampling_steps:   params.ss_sampling_steps,
          seed:                resolvedSeed,
          randomSeed:          params.randomSeed,
        },
        // ts-t is mentjük a Firestore serverTimestamp() mellett (gyors local display-hez)
        ts: Date.now(),
      };

      const docId = await saveHistoryToFirestore(userId, itemData);

      const newItem = {
        id:        docId ?? `local_${Date.now()}`,
        ...itemData,
        // createdAt lokálisan szimulálva (Firestore serverTimestamp async)
        createdAt: { toDate: () => new Date() },
      };

      setHistory(h => [newItem, ...h]);
      setActiveItem(newItem);

    } catch (err) {
      setGenStatus('failed');
      setErrorMsg(err.message ?? 'Hálózati hiba');
    }
  }, [genStatus, prompt, params, authHeaders, userId, getIdToken]);

  const handleSelectHistory = useCallback(async (item) => {
    setActiveItem(item);
    setGenStatus(item.status);
    if (item.model_url) {
      try {
        const blobUrl = await fetchGlbAsBlob(item.model_url, getIdToken);
        setModelUrl(blobUrl);
      } catch {
        setModelUrl(item.model_url);
      }
    }
  }, [getIdToken]);

  const handleReusePrompt = useCallback((p) => {
    setPrompt(p);
    setErrorMsg('');
  }, []);

  const camPreset = useCallback((preset) => {
    if (sceneRef.current) {
      setCameraPreset(sceneRef.current, preset);
      const spin = preset === 'reset';
      setAutoSpin(spin);
      sceneRef.current.autoSpin = spin;
    }
  }, []);

  const toggleAutoSpin = useCallback(() => setAutoSpin(v => !v), []);

  const isRunning  = genStatus === 'pending';
  const canGen     = !isRunning && !!prompt.trim() && prompt.length <= 1000;

  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase();
    return q ? history.filter(i => (i.prompt || '').toLowerCase().includes(q)) : history;
  }, [history, histSearch]);

  const handleDownload = useCallback(() => {
    if (!modelUrl) return;
    const a = document.createElement('a');
    a.href = modelUrl;
    a.download = `trellis_${Date.now()}.glb`;
    a.click();
  }, [modelUrl]);

  // ── Előzmények törlése Firestore-ból ────────────────────────────────────
  const handleClearHistory = useCallback(async () => {
    if (!window.confirm('Törlöd az összes Trellis előzményt?')) return;
    await deleteHistoryFromFirestore(userId);
    setHistory([]);
    setActiveItem(null);
  }, [userId]);

  return (
    <>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        .animate-spin    { animation: spin 1s linear infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes trellisPulse {
          0%, 100% { box-shadow: 0 0 0 0 ${color}40; }
          50%       { box-shadow: 0 0 0 12px ${color}00; }
        }
      `}</style>

      <div style={{
        display: 'flex', height: '100%', overflow: 'hidden',
        fontFamily: "'SF Pro Display',-apple-system,system-ui,sans-serif",
      }}>

        {/* ═══════════════════════════════════════════════════════
            LEFT PANEL — Prompt + Settings
        ═══════════════════════════════════════════════════════ */}
        <aside style={{
          width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column',
          overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(8,8,20,0.5)', scrollbarWidth: 'thin',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 12px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${color}20`, border: `1px solid ${color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles style={{ width: 14, height: 14, color }} />
            </div>
            <div>
              <p style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 800, margin: 0 }}>NVIDIA Trellis</p>
              <p style={{ color: '#4b5563', fontSize: 9, margin: 0 }}>Szöveg → 3D (microsoft/trellis)</p>
            </div>
          </div>

          <div style={{ padding: '12px 12px 0', flex: 1 }}>

            {/* Section label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <Type style={{ width: 11, height: 11, color }} />
              <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Prompt
              </span>
            </div>

            {/* Prompt textarea */}
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleGenerate}
              color={color}
              disabled={isRunning}
            />

            {/* Example prompts */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ color: '#374151', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                Példák
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {EXAMPLE_PROMPTS.map(ex => (
                  <button key={ex} onClick={() => { setPrompt(ex); setErrorMsg(''); }} disabled={isRunning}
                    style={{
                      width: '100%', padding: '5px 8px', borderRadius: 7, textAlign: 'left',
                      fontSize: 9, color: '#4b5563', cursor: isRunning ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.12s', opacity: isRunning ? 0.5 : 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { if (!isRunning) { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = `${color}30`; }}}
                    onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                  >
                    ↗ {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 9px',
                borderRadius: 9, background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)', marginBottom: 12,
              }}>
                <AlertCircle style={{ width: 12, height: 12, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#fca5a5', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{errorMsg}</p>
              </div>
            )}

            {/* Settings accordion */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, marginBottom: 12, overflow: 'hidden',
            }}>
              <button onClick={() => setSettingsOpen(v => !v)} style={{
                width: '100%', padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
              }}>
                <Sliders style={{ width: 12, height: 12, color }} />
                <span style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 800 }}>Trellis beállítások</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 9, color: '#374151', transition: 'transform 0.2s',
                  display: 'inline-block', transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▾</span>
              </button>

              {settingsOpen && (
                <div style={{ padding: '0 12px 12px' }}>
                  <MiniSlider label="SLAT CFG Scale" value={params.slat_cfg_scale} min={1} max={10} step={0.1}
                    onChange={v => setParam('slat_cfg_scale', v)} color={color} display={params.slat_cfg_scale.toFixed(1)} />
                  <MiniSlider label="SS CFG Scale" value={params.ss_cfg_scale} min={1} max={10} step={0.1}
                    onChange={v => setParam('ss_cfg_scale', v)} color={color} display={params.ss_cfg_scale.toFixed(1)} />
                  <MiniSlider label="SLAT Sampling Steps" value={params.slat_sampling_steps} min={10} max={50} step={1}
                    onChange={v => setParam('slat_sampling_steps', v)} color={color} display={`${params.slat_sampling_steps}`} />
                  <MiniSlider label="SS Sampling Steps" value={params.ss_sampling_steps} min={10} max={50} step={1}
                    onChange={v => setParam('ss_sampling_steps', v)} color={color} display={`${params.ss_sampling_steps}`} />
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0 14px' }} />

                  {/* ── FIX: Random seed toggle + seed input ─────────────── */}
                  <ToggleRow
                    label="Véletlenszerű seed"
                    hint="Minden generálás egyedi eredményt ad"
                    value={params.randomSeed}
                    onChange={v => setParam('randomSeed', v)}
                    color={color}
                  />
                  {!params.randomSeed && (
                    <NumInput
                      label="Seed"
                      hint="0 – 2 147 483 647"
                      value={params.seed}
                      min={0}
                      max={2147483647}
                      onChange={v => setParam('seed', v)}
                      color={color}
                    />
                  )}

                  {/* Jelenlegi seed megjelenítése (ha random, akkor N/A amíg nem generálunk) */}
                  {params.randomSeed && activeItem?.params?.seed !== undefined && (
                    <div style={{
                      marginBottom: 10, padding: '5px 8px', borderRadius: 7,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ color: '#4b5563', fontSize: 9 }}>Utolsó seed</span>
                      <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>
                        {activeItem.params.seed}
                      </span>
                    </div>
                  )}

                  {/* Presets */}
                  <div style={{ marginTop: 4 }}>
                    <p style={{ color: '#4b5563', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                      Gyors preset
                    </p>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[
                        { label: 'Gyors',   slat_cfg: 3,   ss_cfg: 7.5, slat_steps: 12, ss_steps: 12 },
                        { label: 'Normál',  slat_cfg: 3,   ss_cfg: 7.5, slat_steps: 25, ss_steps: 25 },
                        { label: 'Minőség', slat_cfg: 3.5, ss_cfg: 8,   slat_steps: 40, ss_steps: 40 },
                      ].map(p => (
                        <button key={p.label} onClick={() => {
                          setParam('slat_cfg_scale', p.slat_cfg);
                          setParam('ss_cfg_scale', p.ss_cfg);
                          setParam('slat_sampling_steps', p.slat_steps);
                          setParam('ss_sampling_steps', p.ss_steps);
                        }} style={{
                          flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 10, fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          background: params.slat_sampling_steps === p.slat_steps ? `${color}28` : 'rgba(255,255,255,0.04)',
                          color: params.slat_sampling_steps === p.slat_steps ? color : '#6b7280',
                          outline: params.slat_sampling_steps === p.slat_steps ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                          transition: 'all 0.15s',
                        }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate footer */}
          <div style={{ padding: '10px 12px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ color: '#6b7280', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock style={{ width: 11, height: 11 }} /> ~30 mp
              </span>
              <span style={{ color: '#4b5563', fontSize: 10 }}>microsoft/trellis</span>
            </div>
            <Tooltip
              text={!canGen
                ? (!prompt.trim() ? 'Írj be egy promptot' : prompt.length > 1000 ? 'Prompt túl hosszú' : 'Generálás folyamatban')
                : 'Trellis 3D generálás indítása'}
              side="top"
            >
              <button onClick={handleGenerate} disabled={!canGen} style={{
                width: '100%', padding: '12px 0', borderRadius: 12,
                fontSize: 13, fontWeight: 800, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                cursor: canGen ? 'pointer' : 'not-allowed', border: 'none',
                background: isRunning
                  ? 'rgba(255,255,255,0.07)'
                  : canGen
                    ? `linear-gradient(135deg,${color},#8b5cf6)`
                    : 'rgba(255,255,255,0.06)',
                boxShadow: canGen && !isRunning ? `0 4px 24px ${color}50` : 'none',
                opacity: !canGen ? 0.45 : 1,
                transition: 'all 0.2s',
                animation: canGen && !isRunning ? 'trellisPulse 2.5s infinite' : 'none',
              }}>
                {isRunning
                  ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Generálás…</>
                  : <><Sparkles style={{ width: 15, height: 15 }} /> Trellis Generate</>
                }
              </button>
            </Tooltip>
            {modelUrl && (
              <button onClick={handleDownload} style={{
                marginTop: 6, width: '100%', padding: '8px 0', borderRadius: 10,
                fontSize: 11, fontWeight: 700, color: '#d1d5db',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', transition: 'all 0.15s',
              }}>
                <Download style={{ width: 12, height: 12 }} /> GLB letöltése
              </button>
            )}
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════
            CENTER — 3D VIEWER
        ═══════════════════════════════════════════════════════ */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Top toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 14px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(8,8,20,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 4 }}>NÉZET</span>
              {VIEW_MODES.map(v => (
                <Tooltip key={v.id} text={v.tip} side="bottom">
                  <button onClick={() => setViewMode(v.id)} style={{
                    padding: '3px 8px', borderRadius: 7, fontSize: 10, fontWeight: 700,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: viewMode === v.id ? `${color}28` : 'rgba(255,255,255,0.04)',
                    color: viewMode === v.id ? color : '#6b7280',
                    outline: viewMode === v.id ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                  }}>{v.label}</button>
                </Tooltip>
              ))}
              {modelUrl && (
                <WireframeControl
                  active={wireframeOverlay}
                  onToggle={() => setWireframeOverlay(v => !v)}
                  opacity={wireOpacity}
                  onOpacityChange={setWireOpacity}
                  color={wireColor}
                  onColorChange={setWireColor}
                  accentColor={color}
                />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <BgColorPicker value={bgColor} onChange={setBgColor} />
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 2px' }} />
              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 2 }}>FÉNY</span>
              <LightingControls
                viewMode={viewMode}
                lightMode={lightMode} setLightMode={setLightMode}
                lightStrength={lightStrength} setLightStrength={setLightStrength}
                lightRotation={lightRotation} setLightRotation={setLightRotation}
                lightAutoRotate={lightAutoRotate} setLightAutoRotate={setLightAutoRotate}
                lightAutoRotateSpeed={lightAutoRotateSpeed} setLightAutoRotateSpeed={setLightAutoRotateSpeed}
                dramaticColor={dramaticColor} setDramaticColor={setDramaticColor}
                bgLightOn={bgLightOn} setBgLightOn={setBgLightOn}
                bgLightColor={bgLightColor} setBgLightColor={setBgLightColor}
                bgLightSize={bgLightSize} setBgLightSize={setBgLightSize}
                bgLightIntensity={bgLightIntensity} setBgLightIntensity={setBgLightIntensity}
                gridColor1={gridColor1} setGridColor1={setGridColor1}
                gridColor2={gridColor2} setGridColor2={setGridColor2}
                color={color}
              />
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
              <IconBtn
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" />
                </svg>}
                tip={showGrid ? 'Rács elrejtése' : 'Rács megjelenítése'}
                active={showGrid} color={color}
                onClick={() => setShowGrid(v => !v)}
              />
              <IconBtn
                icon={<ChevronRight />}
                tip={rightOpen ? 'Előzmények bezárása' : 'Előzmények megnyitása'}
                active={rightOpen} color={color}
                onClick={() => setRightOpen(v => !v)}
              />
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, color: '#1f2937',
              display: 'flex', alignItems: 'center', gap: 8,
              pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
            }}>
              <RotateCcw style={{ width: 10, height: 10 }} />
              Húzd = forgat · Shift+drag = model · Jobb gomb = pan · Scroll = zoom
            </div>

            <ThreeViewer
              color={color} viewMode={viewMode} lightMode={lightMode}
              showGrid={showGrid} modelUrl={modelUrl}
              lightStrength={lightStrength} lightRotation={lightRotation}
              lightAutoRotate={lightAutoRotate} lightAutoRotateSpeed={lightAutoRotateSpeed}
              dramaticColor={dramaticColor}
              wireframeOverlay={wireframeOverlay} wireOpacity={wireOpacity} wireHexColor={wireHexColor}
              autoSpin={autoSpin} bgColor={bgColor}
              bgLightOn={bgLightOn} bgLightColor={bgLightColor}
              bgLightSize={bgLightSize} bgLightIntensity={bgLightIntensity}
              gridColor1={gridColor1} gridColor2={gridColor2}
              onSpinStop={() => setAutoSpin(false)}
              onReady={s => { sceneRef.current = s; }}
            />

            {/* History loading overlay */}
            {historyLoading && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 20,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(6,6,18,0.6)', backdropFilter: 'blur(6px)',
                pointerEvents: 'none',
              }}>
                <Loader2 style={{ width: 24, height: 24, color, marginBottom: 8 }} className="animate-spin" />
                <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>Előzmények betöltése…</p>
              </div>
            )}

            {/* Loading overlay */}
            {isRunning && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 20,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(6,6,18,0.85)', backdropFilter: 'blur(10px)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, marginBottom: 16,
                  background: `${color}15`, border: `2px solid ${color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 32px ${color}30`,
                }}>
                  <Box style={{ width: 28, height: 28, color }} />
                </div>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 5px' }}>
                  Trellis 3D generálás…
                </p>
                <p style={{
                  color: '#6b7280', fontSize: 10, margin: '0 0 6px',
                  maxWidth: 280, textAlign: 'center', lineHeight: 1.5,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  „{prompt}"
                </p>
                <p style={{ color: '#4b5563', fontSize: 11, margin: '0 0 20px' }}>
                  NVIDIA microsoft/trellis · ~30 másodperc
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0,1,2,3,4].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: color, opacity: 0.3,
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isRunning && !modelUrl && !historyLoading && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 24, marginBottom: 16,
                  background: `${color}08`, border: `1px solid ${color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Box style={{ width: 36, height: 36, color: `${color}40` }} />
                </div>
                <p style={{ color: '#2d3748', fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>
                  {prompt.trim() ? 'Kattints a Trellis Generate gombra' : 'Írj be egy promptot a generáláshoz'}
                </p>
                <p style={{ color: '#1f2937', fontSize: 11 }}>
                  Az NVIDIA Trellis AI szövegből készít 3D modellt
                </p>
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 14px', flexShrink: 0,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(8,8,20,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 3 }}>KAMERA</span>
              <IconBtn icon={<RotateCcw />} tip="Kamera visszaállítása" onClick={() => camPreset('reset')} />
              <IconBtn icon={<Camera />} tip="Elölnézet" onClick={() => camPreset('front')} />
              <IconBtn icon={<Move3d />} tip="Oldalnézet" onClick={() => camPreset('side')} />
              <IconBtn icon={<Layers />} tip="Felülnézet" onClick={() => camPreset('top')} />
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 3px' }} />
              <Tooltip text={autoSpin ? 'Auto-spin leállítása' : 'Auto-spin indítása'} side="top">
                <button onClick={toggleAutoSpin} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                  borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: autoSpin ? `${color}28` : 'rgba(255,255,255,0.04)',
                  color: autoSpin ? color : '#6b7280',
                  outline: autoSpin ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                }}>
                  {autoSpin ? <Square style={{ width: 9, height: 9 }} /> : <Play style={{ width: 9, height: 9 }} />}
                  Auto-spin
                </button>
              </Tooltip>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeItem?.params && (
                <div style={{
                  display: 'flex', gap: 6, alignItems: 'center',
                  padding: '3px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {[
                    { k: 'SLAT CFG', v: activeItem.params.slat_cfg_scale?.toFixed?.(1) ?? activeItem.params.slat_cfg_scale },
                    { k: 'SS CFG',   v: activeItem.params.ss_cfg_scale?.toFixed?.(1) ?? activeItem.params.ss_cfg_scale },
                    { k: 'Steps',    v: activeItem.params.slat_sampling_steps },
                    { k: 'Seed',     v: activeItem.params.seed },
                  ].map(({ k, v }) => (
                    <span key={k} style={{ fontSize: 9, color: '#4b5563', display: 'flex', gap: 3 }}>
                      <span style={{ color: '#374151' }}>{k}:</span>
                      <span style={{ color: '#6b7280', fontWeight: 700 }}>{v}</span>
                    </span>
                  ))}
                </div>
              )}
              {modelUrl && (
                <button onClick={handleDownload} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#fff',
                  background: `linear-gradient(90deg,${color}cc,${color})`,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: `0 3px 12px ${color}44`,
                }}>
                  <Download style={{ width: 11, height: 11 }} /> GLB letöltése
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ═══════════════════════════════════════════════════════
            RIGHT PANEL — History (Firestore, fiókhoz kötött)
        ═══════════════════════════════════════════════════════ */}
        {rightOpen && (
          <aside style={{
            width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(8,8,20,0.5)',
          }}>
            <div style={{ padding: '12px 10px 8px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{
                color: '#e5e7eb', fontSize: 11, fontWeight: 800, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Clock style={{ width: 12, height: 12, color }} /> Előzmények
                <span style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 999,
                  background: `${color}18`, color,
                }}>{history.length}</span>
              </p>
              <input
                placeholder="Keresés prompt alapján…"
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
                style={{
                  width: '100%', padding: '5px 9px', borderRadius: 8,
                  fontSize: 11, color: '#e5e7eb',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{
              flex: 1, overflowY: 'auto', padding: 8,
              display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'thin',
            }}>
              {historyLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <Loader2 style={{ width: 16, height: 16, color: '#4b5563' }} className="animate-spin" />
                </div>
              )}
              {!historyLoading && filteredHistory.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: 150, textAlign: 'center',
                }}>
                  <Box style={{ width: 26, height: 26, color: '#1f2937', marginBottom: 8 }} />
                  <p style={{ color: '#2d3748', fontSize: 11 }}>
                    {histSearch ? 'Nincs találat' : 'Még nincs mentett modell'}
                  </p>
                </div>
              )}
              {filteredHistory.map(item => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  isActive={activeItem?.id === item.id}
                  onSelect={handleSelectHistory}
                  onReuse={handleReusePrompt}
                  color={color}
                />
              ))}
            </div>

            {history.length > 0 && (
              <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <button
                  onClick={handleClearHistory}
                  style={{
                    width: '100%', padding: 5, borderRadius: 8,
                    fontSize: 10, fontWeight: 600, color: '#4b5563',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.28)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <Trash2 style={{ width: 10, height: 10 }} /> Előzmények törlése
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </>
  );
}