/**
 * Trellis2Panel.jsx — Meshy AI 3D generator panel (Enhanced)
 * - Text→3D és Image→3D generálás
 * - UV Texture tab-ok: Base Color, Roughness, Metallic, Normal, Emissive
 * - Download Settings modal (Resize, Origin, Format)
 * - Edit Texture modal (Retexture + Image Reference)
 * - Remesh modal (Polycount, Topology)
 * - Camera presets, auto-rotate, view modes, lighting
 * - History sidebar
 * - Animate modal: GIF previews from Meshy CDN
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload, RotateCcw, Download, Layers, Grid3x3,
  Box, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle,
  Trash2, RefreshCw, Sparkles, Move3d,
  Clock, Info, Wand2, Sun, Eye, Camera,
  Play, Square, X, Maximize2,
  Paintbrush2, Settings, Image,
  Search, Plus, Check, PersonStanding, Music2, Pause,
} from 'lucide-react';
import { ChevronRight } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────
const PROMPT_MAX = 600;
const LS_KEY = 'meshy_panel_history_v1';
const POLL_MS = 2500;
const API_BASE = '/api/meshy';
const MESHY_GIF_BASE = 'https://cdn.meshy.ai/webapp-assets/feature-demo/animation/preview/biped';

// ─── GIF URL helper ───────────────────────────────────────────────────────
const getAnimGifUrl = (slug) => `${MESHY_GIF_BASE}/${slug}.gif`;

// ─── localStorage ─────────────────────────────────────────────────────────
const loadHistory = () => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveHistory = (h) => { try { localStorage.setItem(LS_KEY, JSON.stringify(h.slice(0, 40))); } catch {} };

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const hexToInt = (h) => h ? parseInt(h.replace('#', ''), 16) : null;
const fileToDataURI = (file) => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
});

// ─── Animation Library ────────────────────────────────────────────────────
// slug = exact filename (without .gif) on Meshy CDN biped path
export const ANIMATION_LIBRARY = [
  // ── Walking / Locomotion ──
  { id: 'casual_walk',                      label: 'Casual Walk',                      slug: 'Casual_Walk',                         category: 'walking'  },
  { id: 'slow_orc_walk',                    label: 'Slow Orc Walk',                    slug: 'Slow_Orc_Walk',                       category: 'walking'  },
  { id: 'unsteady_walk',                    label: 'Unsteady Walk',                    slug: 'Unsteady_Walk',                       category: 'walking'  },
  { id: 'walking',                          label: 'Walking',                          slug: 'Walking',                             category: 'walking'  },
  { id: 'walking_2',                        label: 'Walking 2',                        slug: 'Walking_2',                           category: 'walking'  },
  { id: 'walking_woman',                    label: 'Walking Woman',                    slug: 'Walking_Woman',                       category: 'walking'  },
  { id: 'walking_with_phone',               label: 'Walking with Phone',               slug: 'Walking_with_Phone',                  category: 'walking'  },
  { id: 'carry_heavy_cannon_forward',       label: 'Carry Heavy Cannon Forward',       slug: 'Carry_Heavy_Cannon_Forward',          category: 'walking'  },
  { id: 'carry_heavy_object_walk',          label: 'Carry Heavy Object Walk',          slug: 'Carry_Heavy_Object_Walk',             category: 'walking'  },
  { id: 'carry_water_bucket_walk',          label: 'Carry Water Bucket Walk',          slug: 'Carry_Water_Bucket_Walk',             category: 'walking'  },
  { id: 'confident_strut',                  label: 'Confident Strut',                  slug: 'Confident_Strut',                     category: 'walking'  },
  { id: 'crawl_backward',                   label: 'Crawl Backward',                   slug: 'Crawl_Backward',                      category: 'walking'  },
  { id: 'elderly_shaky_walk',               label: 'Elderly Shaky Walk',               slug: 'Elderly_Shaky_Walk',                  category: 'walking'  },
  { id: 'flirty_strut',                     label: 'Flirty Strut',                     slug: 'Flirty_Strut',                        category: 'walking'  },
  { id: 'frankenstein_walk',                label: 'Frankenstein Walk',                slug: 'Frankenstein_Walk',                   category: 'walking'  },
  { id: 'funky_walk',                       label: 'Funky Walk',                       slug: 'Funky_Walk',                          category: 'walking'  },
  { id: 'hot_walk',                         label: 'Hot Walk',                         slug: 'Hot_Walk',                            category: 'walking'  },
  { id: 'injured_walk',                     label: 'Injured Walk',                     slug: 'Injured_Walk',                        category: 'walking'  },
  { id: 'injured_walk_backward',            label: 'Injured Walk Backward',            slug: 'Injured_Walk_Backward',               category: 'walking'  },
  { id: 'limping_walk',                     label: 'Limping Walk',                     slug: 'Limping_Walk',                        category: 'walking'  },
  { id: 'limping_walk_1',                   label: 'Limping Walk 1',                   slug: 'Limping_Walk_1',                      category: 'walking'  },
  { id: 'limping_walk_2',                   label: 'Limping Walk 2',                   slug: 'Limping_Walk_2',                      category: 'walking'  },
  { id: 'limping_walk_3',                   label: 'Limping Walk 3',                   slug: 'Limping_Walk_3',                      category: 'walking'  },
  { id: 'proud_strut',                      label: 'Proud Strut',                      slug: 'Proud_Strut',                         category: 'walking'  },
  { id: 'quick_walk',                       label: 'Quick Walk',                       slug: 'Quick_Walk',                          category: 'walking'  },
  { id: 'red_carpet_walk',                  label: 'Red Carpet Walk',                  slug: 'Red_Carpet_Walk',                     category: 'walking'  },
  { id: 'run_to_walk_transition',           label: 'Run to Walk Transition',           slug: 'Run_to_Walk_Transition',              category: 'walking'  },
  { id: 'skip_forward',                     label: 'Skip Forward',                     slug: 'Skip_Forward',                        category: 'walking'  },
  { id: 'sneaky_walk',                      label: 'Sneaky Walk',                      slug: 'Sneaky_Walk',                         category: 'walking'  },
  { id: 'spear_walk',                       label: 'Spear Walk',                       slug: 'Spear_Walk',                          category: 'walking'  },
  { id: 'stage_walk',                       label: 'Stage Walk',                       slug: 'Stage_Walk',                          category: 'walking'  },
  { id: 'step_back',                        label: 'Step Back',                        slug: 'Step_Back',                           category: 'walking'  },
  { id: 'step_hip_hop_dance',               label: 'Step Hip Hop Dance',               slug: 'Step_Hip_Hop_Dance',                  category: 'walking'  },
  { id: 'stumble_walk',                     label: 'Stumble Walk',                     slug: 'Stumble_Walk',                        category: 'walking'  },
  { id: 'stylish_walk',                     label: 'Stylish Walk',                     slug: 'Stylish_Walk',                        category: 'walking'  },
  { id: 'texting_walk',                     label: 'Texting Walk',                     slug: 'Texting_Walk',                        category: 'walking'  },
  { id: 'thoughtful_walk',                  label: 'Thoughtful Walk',                  slug: 'Thoughtful_Walk',                     category: 'walking'  },
  { id: 'tightrope_walk',                   label: 'Tightrope Walk',                   slug: 'Tightrope_Walk',                      category: 'walking'  },
  { id: 'walk_backward',                    label: 'Walk Backward',                    slug: 'Walk_Backward',                       category: 'walking'  },
  { id: 'walk_backward_with_bow',           label: 'Walk Backward with Bow',           slug: 'Walk_Backward_with_Bow',              category: 'walking'  },
  { id: 'walk_backward_with_bow_1',         label: 'Walk Backward with Bow 1',         slug: 'Walk_Backward_with_Bow_1',            category: 'walking'  },
  { id: 'walk_backward_with_grenade',       label: 'Walk Backward with Grenade',       slug: 'Walk_Backward_with_Grenade',          category: 'walking'  },
  { id: 'walk_backward_with_gun_1',         label: 'Walk Backward with Gun 1',         slug: 'Walk_Backward_with_Gun_1',            category: 'walking'  },
  { id: 'walk_backward_with_sword',         label: 'Walk Backward with Sword',         slug: 'Walk_Backward_with_Sword',            category: 'walking'  },
  { id: 'walk_backward_sword_shield',       label: 'Walk Backward with Sword & Shield',slug: 'Walk_Backward_with_Sword_%26_Shield', category: 'walking'  },
  { id: 'walk_fight_back',                  label: 'Walk Fight Back',                  slug: 'Walk_Fight_Back',                     category: 'walking'  },
  { id: 'walk_fight_forward',               label: 'Walk Fight Forward',               slug: 'Walk_Fight_Forward',                  category: 'walking'  },
  { id: 'walk_with_umbrella',               label: 'Walk with Umbrella',               slug: 'Walk_with_Umbrella',                  category: 'walking'  },
  { id: 'walk_with_walker_support',         label: 'Walk with Walker Support',         slug: 'Walk_with_Walker_Support',            category: 'walking'  },

  // ── Running ──
  { id: 'running',                          label: 'Running',                          slug: 'Running',                             category: 'running'  },
  { id: 'sprint',                           label: 'Sprint',                           slug: 'Sprint',                              category: 'running'  },
  { id: 'run_fast',                         label: 'Run Fast',                         slug: 'Run_Fast',                            category: 'running'  },
  { id: 'run_backward',                     label: 'Run Backward',                     slug: 'Run_Backward',                        category: 'running'  },
  { id: 'run_with_gun',                     label: 'Run with Gun',                     slug: 'Run_with_Gun',                        category: 'running'  },
  { id: 'run_with_sword',                   label: 'Run with Sword',                   slug: 'Run_with_Sword',                      category: 'running'  },
  { id: 'zombie_run',                       label: 'Zombie Run',                       slug: 'Zombie_Run',                          category: 'running'  },

  // ── Idle / Locomotion base ──
  { id: 'idle',                             label: 'Idle',                             slug: 'Idle',                                category: 'idle'     },
  { id: 'idle_2',                           label: 'Idle 2',                           slug: 'Idle_2',                              category: 'idle'     },
  { id: 'breathing_idle',                   label: 'Breathing Idle',                   slug: 'Breathing_Idle',                      category: 'idle'     },
  { id: 'combat_idle',                      label: 'Combat Idle',                      slug: 'Combat_Idle',                         category: 'idle'     },
  { id: 'sitting_idle',                     label: 'Sitting Idle',                     slug: 'Sitting_Idle',                        category: 'idle'     },
  { id: 'jump',                             label: 'Jump',                             slug: 'Jump',                                category: 'idle'     },
  { id: 'jump_forward',                     label: 'Jump Forward',                     slug: 'Jump_Forward',                        category: 'idle'     },

  // ── Dance ──
  { id: 'all_night_dance',                  label: 'All Night Dance',                  slug: 'All_Night_Dance',                     category: 'dance'    },
  { id: 'boom_dance',                       label: 'Boom Dance',                       slug: 'Boom_Dance',                          category: 'dance'    },
  { id: 'dance_hip_hop',                    label: 'Hip Hop Dance',                    slug: 'Hip_Hop_Dance',                       category: 'dance'    },
  { id: 'breakdance',                       label: 'Breakdance',                       slug: 'Breakdance',                          category: 'dance'    },
  { id: 'salsa_dance',                      label: 'Salsa Dance',                      slug: 'Salsa_Dance',                         category: 'dance'    },
  { id: 'twerking',                         label: 'Twerking',                         slug: 'Twerking',                            category: 'dance'    },
  { id: 'macarena',                         label: 'Macarena',                         slug: 'Macarena',                            category: 'dance'    },

  // ── Gesture ──
  { id: 'agree_gesture',                    label: 'Agree Gesture',                    slug: 'Agree_Gesture',                       category: 'gesture'  },
  { id: 'alert',                            label: 'Alert',                            slug: 'Alert',                               category: 'gesture'  },
  { id: 'wave',                             label: 'Wave',                             slug: 'Wave',                                category: 'gesture'  },
  { id: 'bow',                              label: 'Bow',                              slug: 'Bow',                                 category: 'gesture'  },
  { id: 'clap',                             label: 'Clap',                             slug: 'Clap',                                category: 'gesture'  },
  { id: 'salute',                           label: 'Salute',                           slug: 'Salute',                              category: 'gesture'  },
  { id: 'talking',                          label: 'Talking',                          slug: 'Talking',                             category: 'gesture'  },
  { id: 'angry',                            label: 'Angry',                            slug: 'Angry',                               category: 'gesture'  },
  { id: 'sad_idle',                         label: 'Sad Idle',                         slug: 'Sad_Idle',                            category: 'gesture'  },
  { id: 'cheering',                         label: 'Cheering',                         slug: 'Cheering',                            category: 'gesture'  },
  { id: 'pray',                             label: 'Pray',                             slug: 'Pray',                                category: 'gesture'  },
  { id: 'thinking',                         label: 'Thinking',                         slug: 'Thinking',                            category: 'gesture'  },

  // ── Combat ──
  { id: 'attack',                           label: 'Attack',                           slug: 'Attack',                              category: 'combat'   },
  { id: 'be_hit_flyup',                     label: 'BeHit FlyUp',                      slug: 'Be_Hit_Flyup',                        category: 'combat'   },
  { id: 'boxing_practice',                  label: 'Boxing Practice',                  slug: 'Boxing_Practice',                     category: 'combat'   },
  { id: 'kick',                             label: 'Kick',                             slug: 'Kick',                                category: 'combat'   },
  { id: 'sword_slash',                      label: 'Sword Slash',                      slug: 'Sword_Slash',                         category: 'combat'   },
  { id: 'shooting',                         label: 'Shooting',                         slug: 'Shooting',                            category: 'combat'   },
  { id: 'blocking',                         label: 'Blocking',                         slug: 'Blocking',                            category: 'combat'   },
  { id: 'punching',                         label: 'Punching',                         slug: 'Punching',                            category: 'combat'   },

  // ── Action ──
  { id: 'arise',                            label: 'Arise',                            slug: 'Arise',                               category: 'action'   },
  { id: 'crouch',                           label: 'Crouch',                           slug: 'Crouch',                              category: 'action'   },
  { id: 'dead',                             label: 'Dead',                             slug: 'Dead',                                category: 'action'   },
  { id: 'falling',                          label: 'Falling',                          slug: 'Falling',                             category: 'action'   },
  { id: 'roll',                             label: 'Roll',                             slug: 'Roll',                                category: 'action'   },
  { id: 'sit_idle',                         label: 'Sit Idle',                         slug: 'Sit_Idle',                            category: 'action'   },
  { id: 'pickup',                           label: 'Pick Up',                          slug: 'Pick_Up',                             category: 'action'   },
  { id: 'climbing',                         label: 'Climbing',                         slug: 'Climbing',                            category: 'action'   },
  { id: 'swimming',                         label: 'Swimming',                         slug: 'Swimming',                            category: 'action'   },
];

const ANIM_CATEGORIES = ['all', 'walking', 'running', 'idle', 'dance', 'gesture', 'combat', 'action'];

// ─── Tooltip ──────────────────────────────────────────────────────────────
function Tooltip({ text, children, side = 'top', delay = 300 }) {
  const [vis, setVis] = useState(false);
  const t = useRef(null);
  const show = () => { t.current = setTimeout(() => setVis(true), delay); };
  const hide = () => { clearTimeout(t.current); setVis(false); };
  const pos = {
    top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 6px)',    left: '50%', transform: 'translateX(-50%)' },
    left:   { right: 'calc(100% + 6px)',  top: '50%',  transform: 'translateY(-50%)' },
    right:  { left: 'calc(100% + 6px)',   top: '50%',  transform: 'translateY(-50%)' },
  }[side];
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {vis && <span style={{ position: 'absolute', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap', background: 'rgba(8,8,22,0.97)', border: '1px solid rgba(255,255,255,0.13)', color: '#e5e7eb', fontSize: 10, fontWeight: 500, padding: '4px 9px', borderRadius: 7, boxShadow: '0 4px 18px rgba(0,0,0,0.55)', ...pos }}>{text}</span>}
    </span>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div style={{ width, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <span style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── IconBtn ──────────────────────────────────────────────────────────────
function IconBtn({ icon, tip, onClick, active, color, disabled = false, side = 'top', size = 28 }) {
  const c = color || '#7c3aed';
  const btn = (
    <button onClick={onClick} disabled={disabled}
      style={{ width: size, height: size, borderRadius: 9, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', background: active ? `${c}28` : 'rgba(255,255,255,0.04)', outline: `1px solid ${active ? c + '55' : 'rgba(255,255,255,0.07)'}`, color: active ? c : disabled ? '#2d2d45' : '#6b7280', transition: 'all 0.15s', flexShrink: 0, opacity: disabled ? 0.4 : 1 }}
      onMouseEnter={(e) => { if (!active && !disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#d1d5db'; } }}
      onMouseLeave={(e) => { if (!active && !disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#6b7280'; } }}>
      {React.cloneElement(icon, { style: { width: size * 0.5, height: size * 0.5 } })}
    </button>
  );
  return tip ? <Tooltip text={tip} side={side}>{btn}</Tooltip> : btn;
}

// ─── Status pill ──────────────────────────────────────────────────────────
const S_CFG = {
  idle:        { Icon: Box,          label: 'Várakozás',   bg: 'rgba(255,255,255,0.06)', col: '#6b7280' },
  pending:     { Icon: Loader2,      label: 'Feldolgozás…', bg: 'rgba(124,58,237,0.15)', col: '#a78bfa', spin: true },
  in_progress: { Icon: Loader2,      label: 'Generálás…',  bg: 'rgba(59,130,246,0.15)', col: '#60a5fa', spin: true },
  succeeded:   { Icon: CheckCircle2, label: 'Elkészült',   bg: 'rgba(16,185,129,0.14)', col: '#34d399' },
  failed:      { Icon: AlertCircle,  label: 'Hiba',        bg: 'rgba(239,68,68,0.14)',  col: '#f87171' },
  expired:     { Icon: AlertCircle,  label: 'Lejárt',      bg: 'rgba(245,158,11,0.14)', col: '#fbbf24' },
};
const StatusPill = ({ status }) => {
  const c = S_CFG[status?.toLowerCase()] || S_CFG.idle;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: c.bg, color: c.col }}>
      <c.Icon style={{ width: 11, height: 11, animation: c.spin ? 'spin 1s linear infinite' : 'none' }} />
      {c.label}
    </span>
  );
};

// ─── Toggle ───────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, label, hint, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
    <div><p style={{ color: '#d1d5db', fontSize: 11, fontWeight: 500, margin: 0 }}>{label}</p>{hint && <p style={{ color: '#4b5563', fontSize: 9, margin: 0 }}>{hint}</p>}</div>
    <button onClick={() => onChange(!value)} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer', border: 'none', background: value ? (color || '#84cc16') : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.35)', transition: 'left 0.2s', left: value ? 18 : 2 }} />
    </button>
  </div>
);

// ─── SegControl ───────────────────────────────────────────────────────────
function SegControl({ value, options, onChange, color }) {
  return (
    <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            style={{ flex: 1, padding: '6px 4px', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: isActive ? (color || '#84cc16') : 'transparent', color: isActive ? '#fff' : '#6b7280' }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#d1d5db'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#6b7280'; }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────
function Select({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>}
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 9, fontSize: 11, color: '#e5e7eb', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
        <span>{options.find((o) => o.value === value)?.label ?? value}</span>
        <ChevronDown style={{ width: 12, height: 12, color: '#6b7280' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 500, width: '100%', marginTop: 4, background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.65)' }}>
          {options.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: 11, cursor: 'pointer', color: value === o.value ? '#a78bfa' : '#d1d5db', background: value === o.value ? 'rgba(124,58,237,0.12)' : 'transparent', border: 'none' }}
              onMouseEnter={(e) => { if (value !== o.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { if (value !== o.value) e.currentTarget.style.background = 'transparent'; }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MeshyRow ─────────────────────────────────────────────────────────────
function MeshyRow({ label, tip, children, premium }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
        <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600 }}>{label}</span>
        {tip && <Tooltip text={tip} side="right"><Info style={{ width: 11, height: 11, color: '#374151', cursor: 'default' }} /></Tooltip>}
        {premium && <span style={{ fontSize: 11, marginLeft: 'auto' }} title="Prémium">👑</span>}
      </div>
      {children}
    </div>
  );
}

// ─── NumStepper ───────────────────────────────────────────────────────────
function NumStepper({ value, onChange, min = 1, max = 4 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, overflow: 'hidden', width: 80 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} style={{ width: 26, height: 28, border: 'none', background: 'transparent', color: value <= min ? '#2d2d45' : '#9ca3af', cursor: value <= min ? 'not-allowed' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
      <span style={{ flex: 1, textAlign: 'center', color: '#e5e7eb', fontSize: 12, fontWeight: 700 }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} style={{ width: 26, height: 28, border: 'none', background: 'transparent', color: value >= max ? '#2d2d45' : '#9ca3af', cursor: value >= max ? 'not-allowed' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
    </div>
  );
}

// ─── Collapsible ─────────────────────────────────────────────────────────
function Collapsible({ title, icon, children, defaultOpen = false, color }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 2 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {icon && React.cloneElement(icon, { style: { width: 11, height: 11, color: color || '#7c3aed' } })}
          {title}
        </span>
        {open ? <ChevronUp style={{ width: 12, height: 12, color: '#4b5563' }} /> : <ChevronDown style={{ width: 12, height: 12, color: '#4b5563' }} />}
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>}
    </div>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────
function HistoryCard({ item, isActive, onSelect, color }) {
  return (
    <button onClick={() => onSelect(item)} style={{ width: '100%', textAlign: 'left', borderRadius: 12, padding: 10, cursor: 'pointer', transition: 'all 0.15s', background: isActive ? `${color}15` : 'rgba(255,255,255,0.025)', border: `1px solid ${isActive ? color + '42' : 'rgba(255,255,255,0.06)'}` }}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; } }}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; } }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, border: `1px solid ${color}30` }}>
            <Box style={{ width: 18, height: 18, color }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 600, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.prompt}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <StatusPill status={item.status} />
            <span style={{ color: '#374151', fontSize: 10 }}>{fmtDate(item.ts)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DOWNLOAD SETTINGS MODAL
// ══════════════════════════════════════════════════════════════════════════
function DownloadModal({ onClose, activeItem, color }) {
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
    else alert(`${format.toUpperCase()} formátum nem elérhető. Próbáld GLB-vel.`);
  };

  return (
    <Modal title="Download Settings" onClose={onClose} width={340}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 600 }}>Resize</span>
            <Tooltip text="Modell méret átméretezése letöltéskor" side="right">
              <Info style={{ width: 13, height: 13, color: '#4b5563' }} />
            </Tooltip>
            <span style={{ fontSize: 13 }}>👑</span>
          </div>
          <button onClick={() => setResize((v) => !v)} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, flexShrink: 0, cursor: 'pointer', border: 'none', background: resize ? color : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.35)', transition: 'left 0.2s', left: resize ? 22 : 3 }} />
          </button>
        </div>
        {resize && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: '#9ca3af', fontSize: 11 }}>Height</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={height} onChange={(e) => setHeight(e.target.value)} style={{ flex: 1, padding: '7px 10px', borderRadius: 9, fontSize: 12, color: '#e5e7eb', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }} />
              <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ padding: '7px 8px', borderRadius: 9, fontSize: 12, color: '#e5e7eb', background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', cursor: 'pointer' }}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <button style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <Maximize2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
        {resize && (
          <div>
            <span style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 6 }}>Origin</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['bottom', 'center'].map((o) => (
                <button key={o} onClick={() => setOrigin(o)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: origin === o ? color : 'rgba(255,255,255,0.06)', color: origin === o ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {o === 'bottom' ? '⬇' : '⊙'} {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <span style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 6 }}>Format</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {formats.map((f) => (
              <button key={f} onClick={() => setFormat(f)}
                style={{ padding: '7px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: format === f ? color : 'rgba(255,255,255,0.06)', color: format === f ? '#fff' : '#6b7280', textTransform: 'uppercase', transition: 'all 0.15s' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleDownload}
          style={{ width: '100%', padding: '13px 0', borderRadius: 13, fontSize: 14, fontWeight: 800, color: '#0a0a0a', background: `linear-gradient(135deg,${color},#84cc16)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 6px 24px ${color}55` }}>
          <Download style={{ width: 16, height: 16 }} /> Download
          <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 999 }}>PRO</span>
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EDIT TEXTURE MODAL
// ══════════════════════════════════════════════════════════════════════════
function EditTextureModal({ onClose, color, uvLayer, setUvLayer }) {
  const [texturePrompt, setTexturePrompt] = useState('');
  const [strength, setStrength] = useState(0.5);
  const [refImage, setRefImage] = useState(null);
  const [refPreview, setRefPreview] = useState(null);
  const [retexturing, setRetexturing] = useState(false);
  const [history, setHistory] = useState([]);
  const fileRef = useRef(null);

  const UV_LAYERS = [
    { id: 'base_color',  label: 'Base Color',   icon: '🎨' },
    { id: 'roughness',   label: 'Roughness',    icon: '〰' },
    { id: 'metallic',    label: 'Metallic',     icon: '🔩' },
    { id: 'normal',      label: 'Normal',       icon: '🔵' },
    { id: 'emissive',    label: 'Emissive',     icon: '✨' },
  ];

  const handleRefImage = (file) => {
    if (!file) return;
    setRefImage(file);
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
    <Modal title="Edit Texture" onClose={onClose} width={900}>
      <div style={{ display: 'flex', gap: 0, height: 600 }}>
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 20, borderRight: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto' }}>
          <div>
            <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>History</p>
            <div style={{ minHeight: 80, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.length === 0 ? (
                <p style={{ color: '#2d3748', fontSize: 11, textAlign: 'center', margin: '20px 0' }}>Nincs textúra előzmény</p>
              ) : history.map((h, i) => (
                <div key={i} style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#d1d5db', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{h.prompt || 'Retexture'}</span>
                  <span style={{ color: '#4b5563', fontSize: 10, flexShrink: 0, marginLeft: 8 }}>{fmtDate(h.ts)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prompt</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: color, fontSize: 10, fontWeight: 600 }}>↑ Import original prompt</button>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea value={texturePrompt} onChange={(e) => setTexturePrompt(e.target.value.slice(0, 800))} placeholder="Describe the desired texture…" rows={4}
                style={{ width: '100%', resize: 'none', borderRadius: 10, fontSize: 11, color: '#e5e7eb', lineHeight: 1.55, padding: '10px 10px 22px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', bottom: 7, right: 9, color: '#4b5563', fontSize: 10 }}>{texturePrompt.length}/800</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prompt Influence Strength</span>
              <span style={{ color: color, fontSize: 11, fontWeight: 700 }}>{Math.round(strength * 100)}%</span>
            </div>
            <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3, background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${strength * 100}%`, pointerEvents: 'none' }} />
              <input type="range" min={0} max={1} step={0.01} value={strength} onChange={(e) => setStrength(Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
            </div>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Upload Image Reference</p>
            <div onClick={() => fileRef.current?.click()}
              style={{ height: refPreview ? 'auto' : 90, borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.12)', overflow: 'hidden', padding: refPreview ? 0 : 12 }}>
              {refPreview ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  <img src={refPreview} alt="" style={{ width: '100%', objectFit: 'cover', borderRadius: 10, maxHeight: 120 }} />
                  <button onClick={(e) => { e.stopPropagation(); setRefImage(null); setRefPreview(null); }}
                    style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X style={{ width: 11, height: 11, color: '#f87171' }} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload style={{ width: 20, height: 20, color: '#4b5563', marginBottom: 6 }} />
                  <p style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', margin: '0 0 2px' }}>Click / Drag & Drop / Paste Image</p>
                  <p style={{ color: '#374151', fontSize: 9, textAlign: 'center', margin: 0 }}>Supported: .png, .jpg, .jpeg, .webp — Max 20MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleRefImage(e.target.files?.[0])} />
          </div>
          <button onClick={handleRetexture} disabled={retexturing}
            style={{ width: '100%', padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, color: '#0a0a0a', background: retexturing ? 'rgba(132,204,22,0.4)' : 'linear-gradient(90deg,#a3e635,#65a30d)', border: 'none', cursor: retexturing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {retexturing ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Retexturing…</> : <><Paintbrush2 style={{ width: 14, height: 14 }} /> Retexture</>}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 20 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {UV_LAYERS.map((layer) => (
              <button key={layer.id} onClick={() => setUvLayer(layer.id)}
                style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: uvLayer === layer.id ? color : 'rgba(255,255,255,0.06)', color: uvLayer === layer.id ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{layer.icon}</span> {layer.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Image style={{ width: 26, height: 26, color }} />
              </div>
              <p style={{ color: '#4b5563', fontSize: 12 }}>Textúra előnézet</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ tip: 'Kamera visszaállítása', icon: <Camera style={{ width: 14, height: 14 }} /> }, { tip: 'Drótváz', icon: <Grid3x3 style={{ width: 14, height: 14 }} /> }, { tip: 'UV szerkesztő', icon: <Layers style={{ width: 14, height: 14 }} /> }, { tip: 'Undo', icon: <RotateCcw style={{ width: 14, height: 14 }} /> }].map((btn, i) => (
                <Tooltip key={i} text={btn.tip} side="top">
                  <button style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>{btn.icon}</button>
                </Tooltip>
              ))}
            </div>
            <button style={{ padding: '8px 20px', borderRadius: 11, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: color, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11 }}>👑</span> Save to Model
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REMESH MODAL
// ══════════════════════════════════════════════════════════════════════════
function RemeshModal({ onClose, color, params, setParam }) {
  const [polycountMode, setPolycountMode] = useState('fixed');
  const [polycountPreset, setPolycountPreset] = useState('10k');
  const [loading, setLoading] = useState(false);
  const PRESETS = ['Custom', '3K', '10K', '30K', '100K'];
  const PRESET_VALUES = { '3K': 3000, '10K': 10000, '30K': 30000, '100K': 100000 };
  const handleConfirm = () => { if (loading) return; setLoading(true); setTimeout(() => { setLoading(false); onClose(); }, 1500); };
  return (
    <Modal title="Remesh" onClose={onClose} width={320}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 600 }}>Target Polycount</span>
            <span style={{ fontSize: 13 }}>👑</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {['fixed', 'adaptive'].map((m) => (
              <button key={m} onClick={() => setPolycountMode(m)}
                style={{ flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: polycountMode === m ? color : 'rgba(255,255,255,0.06)', color: polycountMode === m ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRESETS.map((p) => (
              <button key={p} onClick={() => { setPolycountPreset(p); if (PRESET_VALUES[p]) setParam('target_polycount', PRESET_VALUES[p]); }}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: polycountPreset === p ? color : 'rgba(255,255,255,0.06)', color: polycountPreset === p ? '#fff' : '#6b7280', transition: 'all 0.15s' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span style={{ color: '#d1d5db', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Topology</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['quad', 'triangle'].map((t) => (
              <button key={t} onClick={() => setParam('topology', t)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: params.topology === t ? color : 'rgba(255,255,255,0.06)', color: params.topology === t ? '#fff' : '#6b7280', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                {t === 'quad' ? '⊞' : '△'} {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#6b7280', fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 12, height: 12 }} /> 1 min</span>
          <span>🟡 0</span>
        </div>
        <button onClick={handleConfirm} disabled={loading}
          style={{ width: '100%', padding: '13px 0', borderRadius: 13, fontSize: 14, fontWeight: 800, color: '#0a0a0a', background: loading ? 'rgba(132,204,22,0.4)' : 'linear-gradient(90deg,#a3e635,#65a30d)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {loading ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Remeshing…</> : '✓ Confirm'}
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ANIMATE MODAL — GIF previews from Meshy CDN
// ══════════════════════════════════════════════════════════════════════════

// ── AnimCard — GIF thumbnail with hover overlay ───────────────────────────
function AnimCard({ anim, isAdded, isLoading, color, onAdd }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${isAdded ? color + '60' : hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
        background: isAdded ? `${color}14` : hovered ? 'rgba(255,255,255,0.05)' : '#111120',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        position: 'relative',
      }}>

      {/* Thumbnail — GIF from Meshy CDN */}
      <div
        style={{
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hovered ? '#1c1c30' : '#141422',
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.2s',
        }}>
        {!imgError ? (
          <img
            src={getAnimGifUrl(anim.slug)}
            alt={anim.label}
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          // Fallback when GIF fails to load
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <PersonStanding style={{ width: 28, height: 28, color: '#2d3748' }} />
            <span style={{ color: '#2d3748', fontSize: 9, textAlign: 'center', padding: '0 4px' }}>{anim.label}</span>
          </div>
        )}

        {/* "Added" badge top-right */}
        {isAdded && (
          <div style={{
            position: 'absolute', top: 5, right: 5,
            fontSize: 9, fontWeight: 800, color: color,
            background: `${color}25`, border: `1px solid ${color}55`,
            borderRadius: 999, padding: '2px 6px',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <Check style={{ width: 8, height: 8 }} /> Added
          </div>
        )}

        {/* Hover overlay — "+ Add" or "Remove" */}
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              background: isAdded ? 'rgba(239,68,68,0.4)' : 'rgba(0,0,0,0.55)',
              border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '0.02em',
            }}>
            {isLoading
              ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              : isAdded
                ? <><X style={{ width: 13, height: 13 }} /> Remove</>
                : <><Plus style={{ width: 13, height: 13 }} /> Add</>
            }
          </button>
        )}
      </div>

      {/* Label */}
      <div style={{ padding: '5px 8px', background: '#0d0d1c', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ color: '#b0afc0', fontSize: 9.5, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{anim.label}</span>
      </div>
    </div>
  );
}

// ── AnimateModal ───────────────────────────────────────────────────────────
function AnimateModal({ onClose, color, modelUrl }) {
  const [tab, setTab] = useState('library');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [added, setAdded] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [addingId, setAddingId] = useState(null);

  const meshInfo = { topology: 'Triangle', faces: 9988, vertices: 4934 };

  const filtered = useMemo(() => {
    return ANIMATION_LIBRARY.filter((a) => {
      const matchCat = category === 'all' || a.category === category;
      const matchSearch = !search || a.label.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const addedAnims = ANIMATION_LIBRARY.filter((a) => added.includes(a.id));

  const handleAdd = (id) => {
    if (added.includes(id)) { handleRemove(id); return; }
    setAddingId(id);
    setTimeout(() => { setAdded((prev) => [...prev, id]); setAddingId(null); }, 500);
  };
  const handleRemove = (id) => setAdded((prev) => prev.filter((a) => a !== id));
  const handlePlay = (id) => setPlaying((p) => p === id ? null : id);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div style={{ display: 'flex', width: '100%', height: '100%' }} onClick={(e) => e.stopPropagation()}>

        {/* ── Left sidebar ── */}
        <div style={{ width: 240, background: '#0a0a1a', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Header */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <PersonStanding style={{ width: 15, height: 15, color }} /> Animate
              </span>
              <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: '#4b5563' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search animation…"
                style={{ width: '100%', padding: '6px 8px 6px 26px', borderRadius: 9, fontSize: 11, color: '#e5e7eb', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = `${color}55`; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
            </div>
          </div>

          {/* Library / Added tabs */}
          <div style={{ display: 'flex', padding: '8px 10px 0', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'library', label: 'Library', icon: <Layers style={{ width: 11, height: 11 }} /> },
              { id: 'added',   label: 'Added',   icon: <Check style={{ width: 11, height: 11 }} />, count: added.length },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: '5px 6px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none', color: tab === t.id ? color : '#6b7280', borderBottom: tab === t.id ? `2px solid ${color}` : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: -1, transition: 'all 0.15s' }}>
                {t.icon} {t.label}
                {t.count > 0 && <span style={{ fontSize: 9, background: color, color: '#fff', padding: '1px 5px', borderRadius: 999, fontWeight: 800 }}>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Category filter (library only) */}
          {tab === 'library' && (
            <div style={{ padding: '8px 10px 4px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ANIM_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', background: category === cat ? `${color}30` : 'rgba(255,255,255,0.04)', color: category === cat ? color : '#6b7280', outline: category === cat ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Count badge */}
          {tab === 'library' && (
            <div style={{ padding: '2px 10px 4px' }}>
              <span style={{ color: '#374151', fontSize: 10 }}>{filtered.length} animáció</span>
            </div>
          )}

          {/* Animation grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px', scrollbarWidth: 'thin' }}>
            {tab === 'library' ? (
              filtered.length === 0 ? (
                <p style={{ color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 30 }}>Nincs találat</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {filtered.map((anim) => (
                    <AnimCard
                      key={anim.id}
                      anim={anim}
                      isAdded={added.includes(anim.id)}
                      isLoading={addingId === anim.id}
                      color={color}
                      onAdd={() => handleAdd(anim.id)}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Added tab */
              addedAnims.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, textAlign: 'center' }}>
                  <Music2 style={{ width: 28, height: 28, color: '#1f2937', marginBottom: 8 }} />
                  <p style={{ color: '#2d3748', fontSize: 11 }}>Még nincs hozzáadott animáció</p>
                  <button onClick={() => setTab('library')} style={{ marginTop: 8, padding: '5px 14px', borderRadius: 8, fontSize: 10, fontWeight: 700, border: `1px solid ${color}40`, background: `${color}15`, color, cursor: 'pointer' }}>
                    Böngéssz a Library-ban
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {addedAnims.map((anim) => {
                    const isPlaying = playing === anim.id;
                    return (
                      <div key={anim.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                        {/* Mini GIF thumbnail */}
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#181828', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          <img
                            src={getAnimGifUrl(anim.slug)}
                            alt={anim.label}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{anim.label}</p>
                          <p style={{ color: '#4b5563', fontSize: 9, margin: 0, textTransform: 'capitalize' }}>{anim.category}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => handlePlay(anim.id)}
                            style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: isPlaying ? `${color}30` : 'rgba(255,255,255,0.06)', color: isPlaying ? color : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isPlaying ? <Pause style={{ width: 10, height: 10 }} /> : <Play style={{ width: 10, height: 10 }} />}
                          </button>
                          <button onClick={() => handleRemove(anim.id)}
                            style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X style={{ width: 10, height: 10 }} />
                          </button>
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
                <button style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.07)', background: i === 1 ? `${color}22` : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: i === 1 ? color : '#6b7280' }}>
                  {btn.icon}
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Mesh info */}
          <div style={{ position: 'absolute', top: 56, left: 16, zIndex: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
            {[['Topology', meshInfo.topology], ['Faces', meshInfo.faces.toLocaleString()], ['Vertices', meshInfo.vertices.toLocaleString()]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 24, marginBottom: 2 }}>
                <span style={{ color: '#6b7280', fontSize: 11, width: 70 }}>{k}</span>
                <span style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Viewport */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px', backgroundPosition: 'center center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />

            {/* Playing animation preview — show large GIF */}
            {playing ? (
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 200, height: 300, borderRadius: 16, overflow: 'hidden', border: `1px solid ${color}40`, background: '#0a0a1a' }}>
                  <img
                    src={getAnimGifUrl(ANIMATION_LIBRARY.find((a) => a.id === playing)?.slug || '')}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, background: `${color}18`, padding: '5px 14px', borderRadius: 999, border: `1px solid ${color}40` }}>
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
                <p style={{ color: '#1f2937', fontSize: 11 }}>
                  {modelUrl ? 'Kattints egy animációra a Library-ban' : 'Generálj egy 3D modellt az animáláshoz'}
                </p>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
            <button onClick={() => setTab('library')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#d1d5db', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
              <PersonStanding style={{ width: 15, height: 15 }} /> Add Animations
            </button>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <Tooltip text="Export animáció (GLB+animáció)" side="top">
                <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', background: 'rgba(255,255,255,0.06)', color: '#9ca3af', cursor: 'pointer' }}>
                  <Download style={{ width: 13, height: 13 }} />
                  <span style={{ fontSize: 14 }}>🟡</span>
                  <span style={{ color: '#e5e7eb', fontWeight: 800 }}>+250</span>
                </button>
              </Tooltip>
              <button style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a3e635,#65a30d)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(132,204,22,0.4)' }}>
                <Download style={{ width: 16, height: 16, color: '#0a0a0a' }} />
              </button>
            </div>
            {added.length > 0 && (
              <div style={{ position: 'absolute', bottom: 54, right: 20, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: `${color}20`, border: `1px solid ${color}40`, color }}>
                <Check style={{ width: 12, height: 12 }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{added.length} animáció hozzáadva</span>
              </div>
            )}
          </div>

          {/* Bottom prompt bar */}
          <div style={{ padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#374151', fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {modelUrl ? 'Realistic AAA-quality 3D character…' : 'Nincs aktív modell'}
            </span>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, fontSize: 10, fontWeight: 700, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#6b7280', cursor: 'pointer', flexShrink: 0 }}>
              ↺ Reuse prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// THREE.JS VIEWER
// ══════════════════════════════════════════════════════════════════════════
function ThreeViewer({ color, viewMode, lightMode, showGrid, modelUrl, onReady }) {
  const mountRef = useRef(null);
  const S = useRef(null);
  const [cursor, setCursor] = useState('grab');

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let resizeObs;

    (async () => {
      if (!window.THREE) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      if (!window.THREE.GLTFLoader) await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
      const THREE = window.THREE;
      const W = el.clientWidth || 640, H = el.clientHeight || 480;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 500);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);

      const grid = new THREE.GridHelper(20, 40, 0x1e1e3a, 0x111128);
      grid.position.y = -1; scene.add(grid);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.3 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true; scene.add(ground);

      const placeholder = buildPlaceholder(THREE, color);
      scene.add(placeholder);
      const lightGroup = new THREE.Group(); scene.add(lightGroup);
      const cam = { theta: 0.4, phi: Math.PI / 3, radius: 4, panX: 0, panY: 0 };
      syncCamera(camera, cam);
      S.current = { THREE, scene, camera, renderer, grid, lightGroup, placeholder, model: null, origMaterials: new Map(), cam, autoSpin: true, drag: { active: false, btn: 0, x: 0, y: 0 }, frame: null };
      applyLights(S.current, lightMode, color);
      const loop = () => { S.current.frame = requestAnimationFrame(loop); if (S.current.autoSpin && !S.current.drag.active && !S.current.model) { S.current.cam.theta += 0.004; syncCamera(camera, S.current.cam); } renderer.render(scene, camera); };
      loop();
      resizeObs = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); });
      resizeObs.observe(el);
      if (onReady) onReady(S.current);
    })().catch(console.error);

    return () => {
      resizeObs?.disconnect();
      if (S.current?.frame) cancelAnimationFrame(S.current.frame);
      if (S.current?.renderer) { S.current.renderer.dispose(); if (el.contains(S.current.renderer.domElement)) el.removeChild(S.current.renderer.domElement); }
    };
  }, []); // eslint-disable-line

  useEffect(() => { if (!S.current?.scene) return; applyViewMode(S.current, viewMode); }, [viewMode]);
  useEffect(() => { if (!S.current?.scene) return; applyLights(S.current, lightMode, color); }, [lightMode, color]);
  useEffect(() => { if (S.current?.grid) S.current.grid.visible = showGrid; }, [showGrid]);
  useEffect(() => { if (!modelUrl || !S.current?.scene) return; loadGLB(S.current, modelUrl, viewMode); }, [modelUrl]); // eslint-disable-line

  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const handler = (e) => { e.preventDefault(); e.stopPropagation(); if (!S.current) return; S.current.cam.radius = Math.max(0.5, Math.min(25, S.current.cam.radius + (e.deltaY > 0 ? 0.4 : -0.4))); syncCamera(S.current.camera, S.current.cam); };
    el.addEventListener('wheel', handler, { passive: false }); return () => el.removeEventListener('wheel', handler);
  }, []);

  const onPointerDown = useCallback((e) => { e.currentTarget.setPointerCapture(e.pointerId); if (!S.current) return; S.current.drag = { active: true, btn: e.button, x: e.clientX, y: e.clientY }; S.current.autoSpin = false; setCursor('grabbing'); }, []);
  const onPointerMove = useCallback((e) => {
    if (!S.current?.drag.active) return;
    const dx = e.clientX - S.current.drag.x, dy = e.clientY - S.current.drag.y;
    S.current.drag.x = e.clientX; S.current.drag.y = e.clientY;
    if (e.shiftKey || S.current.drag.btn !== 0) { const spd = S.current.cam.radius * 0.0018; S.current.cam.panY -= dy * spd; S.current.cam.panX -= dx * spd * Math.cos(S.current.cam.theta); }
    else { S.current.cam.theta -= dx * 0.007; S.current.cam.phi = Math.max(0.05, Math.min(Math.PI - 0.05, S.current.cam.phi - dy * 0.007)); }
    syncCamera(S.current.camera, S.current.cam);
  }, []);
  const onPointerUp = useCallback(() => { if (S.current) S.current.drag.active = false; setCursor('grab'); }, []);

  return <div ref={mountRef} className="w-full h-full" style={{ cursor, touchAction: 'none', userSelect: 'none' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} />;
}

function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) { res(); return; } const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function syncCamera(camera, c) { camera.position.set(c.panX + c.radius * Math.sin(c.phi) * Math.sin(c.theta), c.panY + c.radius * Math.cos(c.phi), c.radius * Math.sin(c.phi) * Math.cos(c.theta)); camera.lookAt(c.panX, c.panY, 0); }
function buildPlaceholder(THREE, color) { const geo = new THREE.TorusKnotGeometry(0.7, 0.26, 140, 22); const mat = new THREE.MeshStandardMaterial({ color: hexToInt(color) || 0x7c3aed, metalness: 0.4, roughness: 0.3 }); const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.userData.isPlaceholder = true; return m; }
function applyLights(s, mode, color) {
  const { THREE, lightGroup } = s; if (!THREE) return;
  while (lightGroup.children.length) lightGroup.remove(lightGroup.children[0]);
  if (mode === 'studio') { lightGroup.add(Object.assign(new THREE.AmbientLight(0xffffff, 0.4))); const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 6, 4); key.castShadow = true; lightGroup.add(key); const fill = new THREE.DirectionalLight(0xddeeff, 0.5); fill.position.set(-4, 2, -2); lightGroup.add(fill); const rim = new THREE.DirectionalLight(hexToInt(color) || 0x7c3aed, 0.6); rim.position.set(-2, -1, -5); lightGroup.add(rim); }
  else if (mode === 'outdoor') { lightGroup.add(new THREE.HemisphereLight(0x87ceeb, 0x3a3020, 0.9)); const sun = new THREE.DirectionalLight(0xfff5e0, 1.6); sun.position.set(8, 12, 6); sun.castShadow = true; lightGroup.add(sun); }
  else if (mode === 'dramatic') { lightGroup.add(new THREE.AmbientLight(0x111133, 0.15)); const spot = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 8, 0.3); spot.position.set(0, 8, 3); spot.castShadow = true; lightGroup.add(spot); const back = new THREE.DirectionalLight(hexToInt(color) || 0x4400ff, 0.8); back.position.set(-5, -2, -5); lightGroup.add(back); }
}
function applyViewMode(s, mode) {
  const { THREE, scene, origMaterials } = s; if (!THREE) return;
  scene.traverse((node) => {
    if (!node.isMesh || node.userData.isPlaceholder) return;
    if (!origMaterials.has(node.uuid)) origMaterials.set(node.uuid, node.material);
    const orig = origMaterials.get(node.uuid);
    if (mode === 'solid') { node.material = orig; node.material.wireframe = false; }
    else if (mode === 'wireframe') { node.material = new THREE.MeshBasicMaterial({ color: 0x00ccff, wireframe: true }); }
    else if (mode === 'clay') { node.material = new THREE.MeshStandardMaterial({ color: 0xc8a882, metalness: 0, roughness: 0.85 }); }
    else if (mode === 'normal') { node.material = new THREE.MeshNormalMaterial(); }
    else if (mode === 'uv') { node.material = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }', fragmentShader: 'varying vec2 vUv; void main(){ gl_FragColor=vec4(vUv.x, vUv.y, 0.5, 1.0); }' }); }
  });
}
function loadGLB(s, url, currentViewMode) {
  const { THREE, scene, placeholder } = s; if (!THREE?.GLTFLoader) return;
  if (placeholder?.parent) scene.remove(placeholder);
  if (s.model) { scene.remove(s.model); s.model = null; s.origMaterials.clear(); }
  const loader = new THREE.GLTFLoader();
  loader.load(url, (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3()).length(); const scale = 3 / size;
    model.position.sub(center.multiplyScalar(scale)); model.scale.setScalar(scale);
    model.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    scene.add(model); s.model = model; s.cam.radius = 3.5; s.cam.panY = 0; syncCamera(s.camera, s.cam); applyViewMode(s, currentViewMode);
  }, undefined, (err) => console.error('GLB load error:', err));
}
function setCameraPreset(s, preset) {
  if (!s) return; s.autoSpin = false;
  if (preset === 'reset') { s.cam.theta = 0.4; s.cam.phi = Math.PI / 3; s.cam.panX = 0; s.cam.panY = 0; }
  if (preset === 'front') { s.cam.theta = 0; s.cam.phi = Math.PI / 2; }
  if (preset === 'side') { s.cam.theta = Math.PI / 2; s.cam.phi = Math.PI / 2; }
  if (preset === 'top') { s.cam.theta = 0; s.cam.phi = 0.05; }
  syncCamera(s.camera, s.cam);
}

// ─── Default params ───────────────────────────────────────────────────────
const defaultParams = () => ({
  ai_model: 'latest', model_type: 'standard', topology: 'triangle',
  target_polycount: 100000, should_remesh: false, symmetry_mode: 'auto',
  pose_mode: '', multiview: false, should_texture: true,
  num_generations: 1, enable_pbr: true, texture_prompt: '', license: 'cc',
});

// ══════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ══════════════════════════════════════════════════════════════════════════
export default function Trellis2Panel({ selectedModel, getIdToken }) {
  const color = selectedModel?.color || '#06b6d4';

  const [inputMode, setInputMode] = useState('text');
  const [prompt, setPrompt] = useState('');
  const [modelName, setModelName] = useState('');
  const [params, setParams] = useState(defaultParams);
  const [poseEnabled, setPoseEnabled] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [taskId, setTaskId] = useState(null);
  const [taskType, setTaskType] = useState('text-to-3d');
  const [genStatus, setGenStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [modelUrl, setModelUrl] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [previewTaskId, setPreviewTaskId] = useState(null);
  const [refining, setRefining] = useState(false);

  const [viewMode, setViewMode] = useState('solid');
  const [lightMode, setLightMode] = useState('studio');
  const [showGrid, setShowGrid] = useState(true);
  const [autoSpin, setAutoSpin] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const [uvLayer, setUvLayer] = useState('base_color');

  const [showDownload, setShowDownload] = useState(false);
  const [showEditTexture, setShowEditTexture] = useState(false);
  const [showRemesh, setShowRemesh] = useState(false);
  const [showAnimate, setShowAnimate] = useState(false);

  const [history, setHistory] = useState(() => loadHistory());
  const [activeItem, setActiveItem] = useState(() => loadHistory()[0] ?? null);
  const [histSearch, setHistSearch] = useState('');

  useEffect(() => { saveHistory(history); }, [history]);

  const sceneRef = useRef(null);
  const pollTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const setParam = useCallback((k, v) => setParams((p) => ({ ...p, [k]: v })), []);

  const handleImageFile = useCallback((file) => {
    if (!file) return; setImageFile(file); setImagePreview(URL.createObjectURL(file));
  }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false); handleImageFile(e.dataTransfer?.files[0] ?? e.target?.files?.[0]);
  }, [handleImageFile]);

  const authHeaders = useCallback(async () => {
    const token = getIdToken ? await getIdToken() : '';
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  const startPolling = useCallback((id, type) => {
    clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_BASE}/task/${type}/${id}`, { headers });
        const data = await res.json();
        if (!data.success) return;
        setProgress(data.progress ?? 0); setGenStatus(data.status?.toLowerCase() ?? 'pending');
        if (data.status === 'SUCCEEDED') {
          clearInterval(pollTimerRef.current); setProgress(100);
          const glbUrl = data.model_urls?.glb ?? data.model_urls?.obj ?? null;
          setModelUrl(glbUrl); setThumbnail(data.thumbnail_url ?? null); setPreviewTaskId(id);
          const item = { id: `m_${id}`, task_id: id, task_type: type, prompt: inputMode === 'text' ? prompt : imageFile?.name ?? 'Kép alapú', status: 'succeeded', thumbnail: data.thumbnail_url ?? null, model_urls: data.model_urls ?? {}, ts: Date.now() };
          setHistory((h) => [item, ...h]); setActiveItem(item);
        } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
          clearInterval(pollTimerRef.current); setErrorMsg(data.task_error?.message ?? 'Generálás sikertelen');
        }
      } catch (err) { console.error('Poll error:', err); }
    }, POLL_MS);
  }, [authHeaders, inputMode, prompt, imageFile]);

  const handleGenerate = useCallback(async () => {
    if (genStatus === 'pending' || genStatus === 'in_progress') return;
    if (inputMode === 'text' && !prompt.trim()) return;
    if (inputMode === 'image' && !imageFile) return;
    setErrorMsg(''); setModelUrl(null); setPreviewTaskId(null); setProgress(0); setGenStatus('pending');
    try {
      const headers = await authHeaders();
      let res, data;
      if (inputMode === 'text') {
        res = await fetch(`${API_BASE}/text-to-3d`, { method: 'POST', headers, body: JSON.stringify({ prompt: prompt.trim(), ...params }) });
        data = await res.json(); setTaskType('text-to-3d');
      } else {
        const imageDataURI = await fileToDataURI(imageFile);
        res = await fetch(`${API_BASE}/image-to-3d`, { method: 'POST', headers, body: JSON.stringify({ image_url: imageDataURI, model_type: params.model_type, ai_model: params.ai_model, topology: params.topology, target_polycount: params.target_polycount, symmetry_mode: params.symmetry_mode, should_remesh: params.should_remesh, should_texture: params.should_texture, enable_pbr: params.enable_pbr, pose_mode: params.pose_mode, ...(params.texture_prompt ? { texture_prompt: params.texture_prompt } : {}) }) });
        data = await res.json(); setTaskType('image-to-3d');
      }
      if (!data.success) { setGenStatus('failed'); setErrorMsg(data.message ?? 'Hiba'); return; }
      setTaskId(data.task_id); startPolling(data.task_id, inputMode === 'text' ? 'text-to-3d' : 'image-to-3d');
    } catch (err) { console.error('Generate error:', err); setGenStatus('failed'); setErrorMsg(err.message ?? 'Hálózati hiba'); }
  }, [genStatus, inputMode, prompt, imageFile, params, authHeaders, startPolling]);

  const handleRefine = useCallback(async () => {
    if (!previewTaskId || refining) return;
    setRefining(true); setGenStatus('pending'); setProgress(0); setErrorMsg('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/refine`, { method: 'POST', headers, body: JSON.stringify({ preview_task_id: previewTaskId, enable_pbr: params.enable_pbr, texture_prompt: params.texture_prompt }) });
      const data = await res.json();
      if (!data.success) { setGenStatus('failed'); setErrorMsg(data.message); setRefining(false); return; }
      setTaskId(data.task_id); startPolling(data.task_id, 'text-to-3d');
    } catch (err) { setGenStatus('failed'); setErrorMsg(err.message); setRefining(false); }
  }, [previewTaskId, refining, params, authHeaders, startPolling]);

  useEffect(() => () => clearInterval(pollTimerRef.current), []);

  const handleSelectHistory = useCallback((item) => {
    setActiveItem(item);
    if (item.model_urls?.glb) setModelUrl(item.model_urls.glb);
    else if (item.model_urls?.obj) setModelUrl(item.model_urls.obj);
    setGenStatus(item.status); setThumbnail(item.thumbnail ?? null);
  }, []);

  const camPreset = useCallback((preset) => {
    if (sceneRef.current) {
      setCameraPreset(sceneRef.current, preset);
      if (preset !== 'reset') { setAutoSpin(false); sceneRef.current.autoSpin = false; }
      else { setAutoSpin(true); sceneRef.current.autoSpin = true; }
    }
  }, []);

  const toggleAutoSpin = useCallback(() => {
    setAutoSpin((v) => { const next = !v; if (sceneRef.current) sceneRef.current.autoSpin = next; return next; });
  }, []);

  const charPct = prompt.length / PROMPT_MAX;
  const charColor = charPct > 0.9 ? '#f87171' : charPct > 0.72 ? '#fbbf24' : '#4b5563';
  const isRunning = genStatus === 'pending' || genStatus === 'in_progress';
  const canGen = !isRunning && (inputMode === 'text' ? prompt.trim().length > 0 : !!imageFile);

  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase();
    return q ? history.filter((i) => i.prompt.toLowerCase().includes(q)) : history;
  }, [history, histSearch]);

  const UV_LAYER_LABELS = {
    base_color: 'Base Color', roughness: 'Roughness', metallic: 'Metallic', normal: 'Normal', emissive: 'Emissive',
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .animate-pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: "'SF Pro Display',-apple-system,system-ui,sans-serif" }}>

        {/* ════ LEFT PANEL ════ */}
        <aside style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,20,0.5)', scrollbarWidth: 'thin' }}>
          <div style={{ padding: '10px 10px 0' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {[
                { id: 'image', emoji: '🖼️', tip: 'Kép → 3D' },
                { id: 'batch', emoji: '📦', tip: 'Batch kép → 3D (hamarosan)', disabled: true },
                { id: 'text',  emoji: '💬', tip: 'Szöveg → 3D' },
              ].map((tab) => (
                <Tooltip key={tab.id} text={tab.tip} side="bottom">
                  <button onClick={() => !tab.disabled && setInputMode(tab.id)}
                    style={{ width: 44, height: 36, borderRadius: 10, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: tab.disabled ? 'not-allowed' : 'pointer', border: 'none', transition: 'all 0.15s', background: inputMode === tab.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', outline: inputMode === tab.id ? `2px solid ${color}60` : '1px solid rgba(255,255,255,0.08)', opacity: tab.disabled ? 0.35 : 1 }}>
                    {tab.emoji}
                  </button>
                </Tooltip>
              ))}
            </div>

            {inputMode === 'image' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600 }}>Image</span>
                </div>
                <div onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                  style={{ height: 120, borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: dragOver ? `${color}18` : imagePreview ? 'transparent' : 'rgba(255,255,255,0.03)', border: `1.5px dashed ${dragOver ? color : imagePreview ? 'transparent' : 'rgba(255,255,255,0.12)'}`, overflow: 'hidden', transition: 'all 0.2s', marginBottom: 10 }}>
                  {imagePreview ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                      <Tooltip text="Kép eltávolítása" side="bottom">
                        <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', border: 'none', cursor: 'pointer' }}>
                          <Trash2 style={{ width: 11, height: 11, color: '#f87171' }} />
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <>
                      <Upload style={{ width: 22, height: 22, color: '#4b5563', marginBottom: 6 }} />
                      <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 500, textAlign: 'center', margin: '0 0 2px' }}>Click / Drag & Drop / Paste Image</p>
                      <p style={{ color: '#374151', fontSize: 9, textAlign: 'center', margin: 0 }}>PNG, JPG, JPEG, WEBP — Max 20MB</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleDrop} />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600 }}>Prompt</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Tooltip text="Prompt javítása" side="bottom"><button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 2, display: 'flex' }}><Wand2 style={{ width: 11, height: 11 }} /></button></Tooltip>
                    <Tooltip text="Prompt mentése" side="bottom"><button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 2, fontSize: 11 }}>🔖</button></Tooltip>
                  </div>
                </div>
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  <textarea value={prompt} maxLength={PROMPT_MAX} onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX))} placeholder="Describe the object to generate…" rows={5}
                    style={{ width: '100%', resize: 'none', borderRadius: 10, fontSize: 11, color: '#e5e7eb', lineHeight: 1.55, padding: '10px 10px 22px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${prompt ? color + '40' : 'rgba(255,255,255,0.08)'}`, outline: 'none', scrollbarWidth: 'thin', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = `${color}65`; }} onBlur={(e) => { e.target.style.borderColor = prompt ? `${color}40` : 'rgba(255,255,255,0.08)'; }} />
                  <span style={{ position: 'absolute', bottom: 7, right: 9, color: charColor, fontSize: 10 }}>{prompt.length}/{PROMPT_MAX}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ padding: '2px 10px 6px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 9px', borderRadius: 9, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 8 }}>
                <AlertCircle style={{ width: 12, height: 12, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: '#fca5a5', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{errorMsg}</p>
              </div>
            )}

            {inputMode === 'image' && (
              <MeshyRow label="Name" tip="Opcionális név">
                <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Give your generation a name"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 9, fontSize: 11, color: '#e5e7eb', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </MeshyRow>
            )}

            <MeshyRow label="Model Type" tip="Standard: részletes · Low Poly: stílusos">
              <SegControl value={params.model_type} options={[{ value: 'standard', label: 'Standard' }, { value: 'lowpoly', label: 'Low Poly (Beta)' }]} onChange={(v) => setParam('model_type', v)} color={color} />
            </MeshyRow>

            <MeshyRow label="AI Model" tip="Meshy AI modell verzió">
              <Select value={params.ai_model} onChange={(v) => setParam('ai_model', v)} options={[{ value: 'latest', label: 'Meshy 6' }, { value: 'meshy-5', label: 'Meshy 5' }]} />
            </MeshyRow>

            {inputMode === 'image' && (
              <MeshyRow label="Multi-view (Beta)" tip="Több szögből – Prémium" premium>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>👑</span>
                  <button onClick={() => setParam('multiview', !params.multiview)} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer', border: 'none', background: params.multiview ? color : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: params.multiview ? 18 : 2 }} />
                  </button>
                </div>
              </MeshyRow>
            )}

            {inputMode === 'text' && (
              <MeshyRow label="Pose 👑" tip="Karakter póz">
                <SegControl value={params.pose_mode || 'none'} options={[{ value: 'none', label: 'None' }, { value: 'a-pose', label: 'A-Pose' }, { value: 't-pose', label: 'T-Pose' }]} onChange={(v) => setParam('pose_mode', v === 'none' ? '' : v)} color={color} />
              </MeshyRow>
            )}

            {inputMode === 'image' && (
              <>
                <MeshyRow label="Pose 👑" tip="Karakter póz beállítása">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>👑</span>
                    <button onClick={() => setPoseEnabled((v) => !v)} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0, cursor: 'pointer', border: 'none', background: poseEnabled ? color : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: poseEnabled ? 18 : 2 }} />
                    </button>
                  </div>
                </MeshyRow>
                {poseEnabled && (
                  <div style={{ marginBottom: 10 }}>
                    <SegControl value={params.pose_mode || 'a-pose'} options={[{ value: 'a-pose', label: 'A-Pose' }, { value: 't-pose', label: 'T-Pose' }, { value: 'custom', label: 'Custom' }]} onChange={(v) => setParam('pose_mode', v)} color={color} />
                  </div>
                )}
              </>
            )}

            {inputMode === 'text' && (
              <MeshyRow label="Number of Generations" tip="Hány modell variáns (1–4)">
                <NumStepper value={params.num_generations} onChange={(v) => setParam('num_generations', v)} min={1} max={4} />
              </MeshyRow>
            )}

            <MeshyRow label="License" tip="CC BY 4.0: nyílt · Private: prémium">
              <SegControl value={params.license} options={[{ value: 'cc', label: 'CC BY 4.0' }, { value: 'private', label: 'Private 👑' }]} onChange={(v) => setParam('license', v)} color={color} />
            </MeshyRow>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />

            <Collapsible title="Speciális beállítások" icon={<Info />} color={color}>
              <Select label="Topológia" value={params.topology} onChange={(v) => setParam('topology', v)} options={[{ value: 'triangle', label: '▲ Háromszög' }, { value: 'quad', label: '□ Négyzet (quad)' }]} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Poligon cél</p>
                  <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 800 }}>{(params.target_polycount / 1000).toFixed(0)}K</span>
                </div>
                <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2, background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${((params.target_polycount - 100) / 299900) * 100}%`, pointerEvents: 'none' }} />
                  <input type="range" min={100} max={300000} step={5000} value={params.target_polycount} onChange={(e) => setParam('target_polycount', Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }} />
                </div>
              </div>
              <Toggle label="Remesh" hint="Mesh topológia optimalizálás" value={params.should_remesh} onChange={(v) => setParam('should_remesh', v)} color={color} />
              <Toggle label="PBR térképek" hint="Metallic, Roughness, Normal" value={params.enable_pbr} onChange={(v) => setParam('enable_pbr', v)} color={color} />
              <div>
                <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Textúra prompt</p>
                <textarea value={params.texture_prompt} maxLength={600} onChange={(e) => setParam('texture_prompt', e.target.value.slice(0, 600))} placeholder="Pl. dark fantasy armor, worn leather…" rows={2}
                  style={{ width: '100%', resize: 'none', borderRadius: 8, fontSize: 10, color: '#e5e7eb', lineHeight: 1.5, padding: '6px 8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </Collapsible>
          </div>

          {/* Generate footer */}
          <div style={{ padding: '10px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {isRunning && (
              <div style={{ marginBottom: 8, borderRadius: 3, overflow: 'hidden', height: 3, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${progress}%`, transition: 'width 0.5s ease' }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ color: '#6b7280', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 11, height: 11 }} /> 1 min</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>🟡</span><span style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 700 }}>20</span></span>
            </div>
            <Tooltip text={!canGen ? (inputMode === 'text' ? 'Adj meg egy promptot' : 'Tölts fel egy képet') : 'Meshy AI 3D generálás'} side="top">
              <button onClick={handleGenerate} disabled={!canGen}
                style={{ width: '100%', padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: canGen ? 'pointer' : 'not-allowed', border: 'none', background: isRunning ? 'rgba(255,255,255,0.07)' : canGen ? 'linear-gradient(90deg,#a3e635,#65a30d)' : 'rgba(255,255,255,0.06)', boxShadow: canGen && !isRunning ? '0 4px 20px rgba(132,204,22,0.35)' : 'none', opacity: !canGen ? 0.4 : 1, transition: 'all 0.2s' }}>
                {isRunning ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Generálás… {progress}%</> : <><Sparkles style={{ width: 15, height: 15 }} /> Generate</>}
              </button>
            </Tooltip>

            {previewTaskId && inputMode === 'text' && genStatus === 'succeeded' && (
              <Tooltip text="PBR textúra refine fázis" side="top">
                <button onClick={handleRefine} disabled={refining}
                  style={{ marginTop: 6, width: '100%', padding: '8px 0', borderRadius: 11, fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: refining ? 'not-allowed' : 'pointer', border: 'none', background: refining ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${color},#8b5cf6)`, opacity: refining ? 0.5 : 1 }}>
                  {refining ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Refine…</> : <><RefreshCw style={{ width: 12, height: 12 }} /> Refine (PBR Textúra)</>}
                </button>
              </Tooltip>
            )}
          </div>
        </aside>

        {/* ════ CENTER — 3D VIEWER ════ */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Top toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,8,20,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 4 }}>NÉZET</span>
              {[
                { id: 'solid',     label: 'Solid',  tip: 'Teljes anyag' },
                { id: 'wireframe', label: 'Wire',   tip: 'Drótváz' },
                { id: 'clay',      label: 'Clay',   tip: 'Agyag nézet' },
                { id: 'normal',    label: 'Normal', tip: 'Normal map' },
                { id: 'uv',        label: 'UV',     tip: 'UV koordináta térkép' },
              ].map((v) => (
                <Tooltip key={v.id} text={v.tip} side="bottom">
                  <button onClick={() => setViewMode(v.id)}
                    style={{ padding: '3px 8px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: viewMode === v.id ? `${color}28` : 'rgba(255,255,255,0.04)', color: viewMode === v.id ? color : '#6b7280', outline: viewMode === v.id ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)' }}>
                    {v.label}
                  </button>
                </Tooltip>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {viewMode === 'uv' && (
                <>
                  <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 2 }}>LAYER</span>
                  {['base_color', 'roughness', 'metallic', 'normal', 'emissive'].map((layer) => (
                    <Tooltip key={layer} text={UV_LAYER_LABELS[layer]} side="bottom">
                      <button onClick={() => setUvLayer(layer)}
                        style={{ padding: '3px 7px', borderRadius: 7, fontSize: 9, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: uvLayer === layer ? `${color}28` : 'rgba(255,255,255,0.04)', color: uvLayer === layer ? color : '#6b7280', outline: uvLayer === layer ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)' }}>
                        {UV_LAYER_LABELS[layer].split(' ')[0]}
                      </button>
                    </Tooltip>
                  ))}
                  <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
                </>
              )}

              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 2 }}>FÉNY</span>
              {[
                { id: 'studio',   icon: <Sun />,   tip: 'Studio' },
                { id: 'outdoor',  icon: <Eye />,   tip: 'Outdoor' },
                { id: 'dramatic', icon: <Sparkles />, tip: 'Dramatic' },
              ].map((l) => (
                <IconBtn key={l.id} icon={l.icon} tip={l.tip} active={lightMode === l.id} color={color} onClick={() => setLightMode(l.id)} side="bottom" />
              ))}
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
              <IconBtn icon={<Grid3x3 />}     tip={showGrid ? 'Rács elrejtése' : 'Rács megjelenítése'} active={showGrid}   color={color} onClick={() => setShowGrid((v) => !v)} />
              <IconBtn icon={<ChevronRight />} tip={rightOpen ? 'Előzmények bezárása' : 'Előzmények megnyitása'} active={rightOpen} color={color} onClick={() => setRightOpen((v) => !v)} />
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap' }}>
              <RotateCcw style={{ width: 10, height: 10 }} />
              Húzd = forgat · Shift+drag = pan · Scroll = zoom
            </div>
            <ThreeViewer color={color} viewMode={viewMode} lightMode={lightMode} showGrid={showGrid} modelUrl={modelUrl}
              onReady={(s) => { sceneRef.current = s; s.autoSpin = autoSpin; }} />

            {isRunning && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,6,18,0.8)', backdropFilter: 'blur(8px)', pointerEvents: 'none' }}>
                <div style={{ width: 68, height: 68, borderRadius: 20, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, border: `1px solid ${color}45` }}>
                  <Box style={{ width: 28, height: 28, color }} className="animate-pulse" />
                </div>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>3D modell generálása…</p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 16px' }}>{genStatus === 'pending' ? 'Feldolgozás sorban áll…' : `Meshy AI dolgozik… ${progress}%`}</p>
                <div style={{ width: 192, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${progress}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}
          </div>

          {/* Bottom toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,8,20,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#374151', fontSize: 10, fontWeight: 600, marginRight: 3 }}>KAMERA</span>
              <IconBtn icon={<RotateCcw />} tip="Kamera visszaállítása" onClick={() => camPreset('reset')} />
              <IconBtn icon={<Camera />}    tip="Elölnézet"             onClick={() => camPreset('front')} />
              <IconBtn icon={<Move3d />}    tip="Oldalnézet"            onClick={() => camPreset('side')} />
              <IconBtn icon={<Layers />}    tip="Felülnézet"            onClick={() => camPreset('top')} />
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 3px' }} />
              <Tooltip text={autoSpin ? 'Auto-spin leállítása' : 'Auto-spin indítása'} side="top">
                <button onClick={toggleAutoSpin}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', background: autoSpin ? `${color}28` : 'rgba(255,255,255,0.04)', color: autoSpin ? color : '#6b7280', outline: autoSpin ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)' }}>
                  {autoSpin ? <Square style={{ width: 9, height: 9 }} /> : <Play style={{ width: 9, height: 9 }} />} Auto-spin
                </button>
              </Tooltip>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tooltip text="Remesh modál megnyitása" side="top">
                <button onClick={() => setShowRemesh(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#d1d5db', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                  <Settings style={{ width: 11, height: 11 }} /> Remesh
                </button>
              </Tooltip>

              <Tooltip text="Textúra szerkesztő megnyitása" side="top">
                <button onClick={() => setShowEditTexture(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#d1d5db', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                  <Paintbrush2 style={{ width: 11, height: 11 }} /> Edit Texture
                </button>
              </Tooltip>

              <Tooltip text="Animáció hozzáadása" side="top">
                <button onClick={() => setShowAnimate(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#d1d5db', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                  <PersonStanding style={{ width: 11, height: 11 }} /> Animate
                </button>
              </Tooltip>

              <Tooltip text="Letöltési beállítások" side="top">
                <button onClick={() => setShowDownload(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#fff', background: `linear-gradient(90deg,${color}cc,${color})`, border: 'none', cursor: 'pointer', transition: 'all 0.15s', boxShadow: `0 3px 12px ${color}44` }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                  <Download style={{ width: 11, height: 11 }} /> Download
                </button>
              </Tooltip>
            </div>
          </div>
        </main>

        {/* ════ RIGHT PANEL — History ════ */}
        {rightOpen && (
          <aside style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,20,0.5)' }}>
            <div style={{ padding: '12px 10px 8px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock style={{ width: 12, height: 12, color }} /> Előzmények
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: `${color}18`, color }}>{history.length}</span>
              </p>
              <input placeholder="Keresés…" value={histSearch} onChange={(e) => setHistSearch(e.target.value)}
                style={{ width: '100%', padding: '5px 9px', borderRadius: 8, fontSize: 11, color: '#e5e7eb', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={(e) => { e.target.style.borderColor = `${color}55`; }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'thin' }}>
              {filteredHistory.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, textAlign: 'center' }}>
                  <Box style={{ width: 26, height: 26, color: '#1f2937', marginBottom: 8 }} />
                  <p style={{ color: '#2d3748', fontSize: 11 }}>{histSearch ? 'Nincs találat' : 'Még nincs generálás'}</p>
                </div>
              )}
              {filteredHistory.map((item) => (
                <HistoryCard key={item.id} item={item} isActive={activeItem?.id === item.id} onSelect={handleSelectHistory} color={color} />
              ))}
            </div>
            {history.length > 0 && (
              <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <Tooltip text="Összes előzmény törlése" side="top">
                  <button onClick={() => { if (window.confirm('Törlöd az összes előzményt?')) { setHistory([]); setActiveItem(null); } }}
                    style={{ width: '100%', padding: 5, borderRadius: 8, fontSize: 10, fontWeight: 600, color: '#4b5563', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.28)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                    <Trash2 style={{ width: 10, height: 10 }} /> Előzmények törlése
                  </button>
                </Tooltip>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ════ MODALS ════ */}
      {showDownload    && <DownloadModal    onClose={() => setShowDownload(false)}    activeItem={activeItem} color={color} />}
      {showEditTexture && <EditTextureModal onClose={() => setShowEditTexture(false)} color={color} uvLayer={uvLayer} setUvLayer={setUvLayer} />}
      {showRemesh      && <RemeshModal      onClose={() => setShowRemesh(false)}      color={color} params={params} setParam={setParam} />}
      {showAnimate     && <AnimateModal     onClose={() => setShowAnimate(false)}     color={color} modelUrl={modelUrl} />}
    </>
  );
}