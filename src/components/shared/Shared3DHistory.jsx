import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Search, Box, ChevronDown, Sparkles, Info, Eraser, Loader2, Download,
  PersonStanding, Wand2, LayoutGrid, X, Upload, Scissors, Boxes
} from 'lucide-react';
import { collection, query, where, orderBy, getDocs, limit, startAfter, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseApp';
import HistoryCard from '../../ai_components/shared/HistoryCard';
import { getItemTs } from '../../ai_components/trellis/utils';
import { checkThumbnailCache } from '../../ai_components/trellis/Glbthumbnail';
import { Tooltip } from '../../ai_components/meshy/ui/Primitives';
import toast from 'react-hot-toast';
import './Shared3DHistory.css';

const PAGE_SIZE = 15;
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ─── Type color map ────────────────────────────────────────────────────── */
const TYPE_COLORS = {
  model: { rail: "#64748b", glow: "#475569" },
  rigged: { rail: "#f472b6", glow: "#db2777" },
  animation: { rail: "#22d3ee", glow: "#0891b2" },
  segment: { rail: "#f59e0b", glow: "#d97706" },
  trellis: { rail: "#34d399", glow: "#059669" },
  upload: { rail: "#94a3b8", glow: "#475569" },
};

/* ─── Section header — editorial divider style ──────────────────────────── */
function SectionHeader({ label, icon: Icon, typeColor, count }) {
  const { rail } = typeColor;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "14px 0 8px", marginBottom: 2, position: "relative",
    }}>
      {/* Left accent line */}
      <div style={{
        width: 2, height: 14, borderRadius: 1, flexShrink: 0,
        background: `linear-gradient(180deg, ${rail}, ${rail}40)`,
        boxShadow: `0 0 6px ${rail}80`,
      }} />
      {Icon && <Icon style={{ width: 10, height: 10, color: rail, flexShrink: 0 }} />}
      <span style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
        textTransform: "uppercase", color: `${rail}cc`, flex: 1,
      }}>{label}</span>
      {count != null && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8, fontWeight: 500, color: `${rail}66`,
          background: `${rail}0d`, borderRadius: 3, padding: "1px 5px",
          border: `1px solid ${rail}18`,
        }}>{String(count).padStart(2, '0')}</span>
      )}
      {/* Divider line with gradient fade */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
        background: `linear-gradient(90deg, ${rail}50 0%, ${rail}18 40%, transparent 100%)`,
      }} />
    </div>
  );
}

/* ─── Empty state with CSS particle dots ────────────────────────────────── */
function EmptyState({ accent, message }) {
  const dots = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: 200, gap: 16, position: "relative",
    }}>
      {/* Particle dots */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        {dots.map(i => {
          const angle = (i / 9) * 360;
          const r = 32;
          const x = 40 + r * Math.cos((angle * Math.PI) / 180);
          const y = 40 + r * Math.sin((angle * Math.PI) / 180);
          return (
            <div key={i} style={{
              position: "absolute",
              width: 3, height: 3,
              borderRadius: "50%",
              background: accent,
              left: x - 1.5, top: y - 1.5,
              animation: `arch-pulse-dot ${1.4 + i * 0.15}s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }} />
          );
        })}
        {/* Center icon */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Box style={{ width: 20, height: 20, color: accent, opacity: 0.25 }} />
        </div>
      </div>
      <p style={{
        fontFamily: "'Rajdhani', sans-serif",
        color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.2em", textAlign: "center", margin: 0,
      }}>
        {message}
      </p>
    </div>
  );
}

const TABS = [
  { id: 'tripo', label: 'Tripo3D', color: "#64748b" },
  { id: 'trellis', label: 'Trellis', color: "#34d399" },
  { id: 'upload', label: 'Uploads', color: "#94a3b8" },
];

const SUBTABS = [
  { id: 'all', label: 'All', icon: LayoutGrid, from: "#64748b", to: "#475569" },
  { id: 'models', label: 'Models', icon: Box, from: "#64748b", to: "#334155" },
  { id: 'rigged', label: 'Rig', icon: PersonStanding, from: "#f472b6", to: "#db2777" },
  { id: 'animations', label: 'Anim', icon: Wand2, from: "#22d3ee", to: "#0891b2" },
  { id: 'segment', label: 'Segment', icon: Scissors, from: "#f59e0b", to: "#d97706" },
  { id: 'fill_parts', label: 'Fill Parts', icon: Boxes, from: "#c084fc", to: "#9333ea" },
];


export default function Shared3DHistory({
  userId, getIdToken, color = "#a78bfa",
  onSelect, onReuse, onDownload, onHistoryLoad, activeItemId, loadingId,
  refreshTrigger = 0, defaultTab = 'tripo', optimisticItems = [],
  firestoreCollection = 'trellis_history',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [subTab, setSubTab] = useState('all');
  const [histQ, setHistQ] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [history, setHistory] = useState([]);
  const [histLoad, setHistLoad] = useState(true);
  const [moreLoad, setMoreLoad] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const lastDocR = useRef(null);
  const assetFileRef = useRef(null);
  const historyLoadedRef = useRef(false);

  useEffect(() => {
    if (!userId) { setHistLoad(false); return; }
    const q = query(collection(db, firestoreCollection),
      where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const rawItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const items = rawItems.filter(item => {
        if (!item.model_url) {
          return false;
        }
        const ts = getItemTs(item); return ts === 0 || (now - ts) < HISTORY_TTL_MS;
      });
      setHistory(items);
      lastDocR.current = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setHistLoad(false);
      if (!historyLoadedRef.current) { historyLoadedRef.current = true; onHistoryLoad?.(items); }
    }, err => { console.error("[Shared3DHistory]", err); setHistLoad(false); });
    return () => unsub();
  }, [userId, firestoreCollection, refreshTrigger]);

  const loadMore = useCallback(async () => {
    if (!hasMore || moreLoad || !lastDocR.current) return;
    setMoreLoad(true);
    try {
      const q = query(collection(db, firestoreCollection),
        where('userId', '==', userId), orderBy('createdAt', 'desc'),
        startAfter(lastDocR.current), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const now = Date.now();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(item => {
          if (!item.model_url) return false;
          const ts = getItemTs(item); return ts === 0 || (now - ts) < HISTORY_TTL_MS;
        });
      setHistory(prev => { const s = new Set(prev.map(i => i.id)); return [...prev, ...items.filter(i => !s.has(i.id))]; });
      lastDocR.current = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) { console.error(e); } finally { setMoreLoad(false); }
  }, [userId, hasMore, moreLoad]);

  const handleAssetUpload = useCallback(async (file) => {
    if (!file) return;
    setAssetUploading(true);
    try {
      const t = getIdToken ? await getIdToken() : "";
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(BASE_URL + "/api/tripo/assets/upload", { method: "POST", headers: { Authorization: "Bearer " + t }, body: form });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      toast.success(`Feltöltve: ${d.filename}`);
      setActiveTab('upload');
      if (onSelect && d.taskId) onSelect({ id: d.historyId || d.taskId, taskId: d.taskId, source: 'upload', status: 'success', model_url: d.modelUrl || null });
    } catch (e) { toast.error(`Feltöltés sikertelen: ${e.message}`); } finally { setAssetUploading(false); }
  }, [getIdToken, onSelect]);

  const handleDeleteLocally = async (item) => {
    if (!window.confirm(`Biztosan törlöd: "${item.prompt?.slice(0, 30) || 'Modell'}"?`)) return;
    try {
      const t = getIdToken ? await getIdToken() : "";
      const res = await fetch(BASE_URL + "/api/tripo/history/" + item.id, { method: "DELETE", headers: { Authorization: "Bearer " + t } });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setHistory(prev => prev.filter(i => i.id !== item.id));
      toast.success("Törölve.");
    } catch (e) { toast.error("Törlés sikertelen: " + e.message); }
  };

  const handleClearAll = useCallback(async () => {
    const label = activeTab === 'tripo' ? 'Tripo3D' : activeTab === 'trellis' ? 'Trellis' : 'Feltöltések';
    if (!window.confirm(`Biztosan törlöd az összes ${label} elemet?`)) return;
    setClearing(true);
    try {
      const t = getIdToken ? await getIdToken() : "";
      const res = await fetch(`${BASE_URL}/api/tripo/history?source=${activeTab}`, { method: "DELETE", headers: { Authorization: "Bearer " + t } });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setHistory(prev => prev.filter(i => (i.source || 'trellis') !== activeTab));
      toast.success(`${data.deleted ?? 'Összes'} elem törölve.`);
    } catch (e) { toast.error("Törlés sikertelen: " + e.message); } finally { setClearing(false); }
  }, [activeTab, getIdToken]);

  const mergedHistory = useMemo(() => {
    if (!optimisticItems.length) return history;
    const fsIds = new Set(history.map(i => i.id));
    const pending = optimisticItems.filter(o => !fsIds.has(o.id));
    return pending.length ? [...pending, ...history] : history;
  }, [history, optimisticItems]);

  const filtHist = useMemo(() => mergedHistory.filter(item => {
    if (!item.model_url) return false;
    if (histQ && !(item.prompt || "").toLowerCase().includes(histQ.toLowerCase())) return false;
    const src = item.source || "trellis";
    if (activeTab === 'tripo') {
      if (src !== 'tripo') return false;
      const isRig = item.mode === 'rig' || item.params?.rigged === true || item.params?.type === 'animate_rig';
      const isAnim = item.mode === 'animate' && !isRig || item.params?.animated === true || item.params?.type === 'animate_retarget';
      const isSeg = item.mode === 'segment';
      const isFill = item.mode === 'fill_parts';
      if (subTab === 'models') return !isRig && !isAnim && !isSeg && !isFill;
      if (subTab === 'rigged') return isRig;
      if (subTab === 'animations') return isAnim;
      if (subTab === 'segment') return isSeg;
      if (subTab === 'fill_parts') return isFill;
      return true;
    }
    if (activeTab === 'trellis') return src === 'trellis';
    if (activeTab === 'upload') return src === 'upload';
    return false;
  }), [mergedHistory, histQ, activeTab, subTab]);

  const getDisplayName = useCallback((item) => {
    const origPrompt = mergedHistory.find(h => h.taskId === item.params?.originalModelTaskId)?.prompt;
    const base = origPrompt ?? item.prompt ?? "Model";
    if (item.params?.animated) { const slug = item.params?.animation ?? ""; const l = slug.split(":").pop() || slug; return l ? `${base}_${l}` : base; }
    if (item.params?.rigged) return `${base}_rigged`;
    return base;
  }, [mergedHistory]);

  const handleSelect = useCallback((item) => {
    if (!onSelect) return;
    const previewThumbnail = checkThumbnailCache(item?.model_url) || item?.thumbnail || item?.thumbnail_url || null;
    onSelect({ ...item, previewThumbnail });
  }, [onSelect]);

  const tripoSections = useMemo(() => {
    if (activeTab !== 'tripo') return null;
    const generated = [], rigged = [], animations = [], segments = [], fillParts = [];
    for (const item of filtHist) {
      const isRig = item.mode === 'rig' || item.params?.rigged === true || item.params?.type === 'animate_rig';
      const isAnim = (item.mode === 'animate' && !isRig) || item.params?.animated === true || item.params?.type === 'animate_retarget';
      const isSeg = item.mode === 'segment';
      const isFill = item.mode === 'fill_parts';
      if (isAnim) animations.push(item);
      else if (isRig) rigged.push(item);
      else if (isSeg) segments.push(item);
      else if (isFill) fillParts.push(item);
      else generated.push(item);
    }
    return { generated, rigged, animations, segments, fillParts };
  }, [filtHist, activeTab]);

  const activeTabDef = TABS.find(t => t.id === activeTab) || TABS[0];
  const accent = activeTabDef.color;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", width: "100%",
      background: "#05030f",
      fontFamily: "'Rajdhani', 'JetBrains Mono', sans-serif",
    }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "12px 14px 12px", flexShrink: 0,
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Scan line animation */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`,
          animation: "arch-scan 4s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* Title */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9, marginBottom: 12 }}>
          {/* Logo mark */}
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0, position: "relative",
            background: `linear-gradient(135deg, ${accent}25, transparent)`,
            border: `1px solid ${accent}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: 5,
              background: `radial-gradient(circle at 50% 0%, ${accent}20, transparent 70%)`,
            }} />
            <History style={{ width: 12, height: 12, color: accent }} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 13, fontWeight: 700, color: "#e8e0ff",
              letterSpacing: "0.18em", textTransform: "uppercase", lineHeight: 1,
            }}>
              Asset Archive
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, color: `${accent}66`, letterSpacing: "0.08em", marginTop: 2,
            }}>
              {filtHist.length > 0 ? `${filtHist.length} records` : 'no records'}
            </div>
          </div>

          {filtHist.length > 0 && (
            <Tooltip text={`Összes ${activeTabDef.label} törlése`} side="bottom">
              <button onClick={handleClearAll} disabled={clearing} style={{
                background: "none", border: "1px solid rgba(255,255,255,0.07)",
                cursor: clearing ? "not-allowed" : "pointer",
                color: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center",
                padding: "4px 6px", borderRadius: 5, transition: "all 0.15s",
              }}
                onMouseEnter={e => { if (!clearing) { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; e.currentTarget.style.background = "rgba(248,113,113,0.08)"; } }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.22)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "none"; }}
              >
                {clearing ? <Loader2 style={{ width: 12, height: 12 }} className="anim-spin" /> : <Eraser style={{ width: 12, height: 12 }} />}
              </button>
            </Tooltip>
          )}
          <Tooltip text="Modelleket 7 napig tároljuk." side="bottom">
            <button style={{
              background: "none", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer",
              color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center",
              padding: "4px 6px", borderRadius: 5, transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
            >
              <Info style={{ width: 12, height: 12 }} />
            </button>
          </Tooltip>
        </div>

        {/* Source tabs — pill style */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 10,
          background: "rgba(0,0,0,0.4)", padding: 3, borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          {TABS.map(tab => {
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSubTab('all'); }}
                className={isAct ? "arch-tab-active" : ""}
                style={{
                  "--arch-tab-color": tab.color,
                  flex: "1 1 80px", padding: "6px 0", borderRadius: 8,
                  fontSize: 9.5, fontWeight: 600, cursor: "pointer",
                  border: "none", transition: "all 0.2s",
                  fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  position: "relative",
                  background: isAct
                    ? `linear-gradient(135deg, ${tab.color}1e 0%, ${tab.color}0a 100%)`
                    : "transparent",
                  color: isAct ? tab.color : "rgba(255,255,255,0.25)",
                  boxShadow: isAct ? `0 0 12px ${tab.color}15` : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tripo sub-filter chips */}
        <AnimatePresence>
          {activeTab === 'tripo' && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 10 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {SUBTABS.map(st => {
                  const isAct = subTab === st.id;
                  const Icon = st.icon;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setSubTab(st.id)}
                      style={{
                        flex: "1 1 auto", padding: "5px 8px",
                        borderRadius: 6, cursor: "pointer",
                        fontFamily: "'Rajdhani', sans-serif",
                        fontSize: 8.5, fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        transition: "all 0.18s",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                        background: isAct
                          ? `linear-gradient(90deg, ${st.from}2a, ${st.to}18)`
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isAct ? st.from + "50" : "rgba(255,255,255,0.07)"}`,
                        color: isAct ? st.from : "rgba(255,255,255,0.28)",
                        boxShadow: isAct ? `0 0 8px ${st.from}22, inset 0 1px 0 ${st.from}15` : "none",
                      }}
                    >
                      <Icon style={{ width: 8, height: 8, flexShrink: 0 }} />
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search — animated border gradient on focus */}
        <div style={{ position: "relative" }}>
          {/* Animated gradient border wrapper */}
          <div style={{
            position: "absolute", inset: -1, borderRadius: 9,
            background: searchFocused
              ? `linear-gradient(90deg, ${accent}80, ${accent}30, ${accent}80)`
              : "transparent",
            backgroundSize: "200% 100%",
            animation: searchFocused ? "arch-border-spin 2s linear infinite" : "none",
            zIndex: 0,
          }} />
          <Search style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            width: 11, height: 11, zIndex: 2,
            color: searchFocused ? accent : "rgba(255,255,255,0.2)",
            transition: "color 0.2s", pointerEvents: "none",
          }} />
          <input
            placeholder="Search assets..."
            value={histQ}
            onChange={e => setHistQ(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: "100%", height: 34, borderRadius: 8,
              border: `1px solid ${searchFocused ? "transparent" : "rgba(255,255,255,0.08)"}`,
              background: searchFocused ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.03)",
              color: "#e2deff",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, outline: "none",
              paddingLeft: 28, paddingRight: histQ ? 28 : 10,
              boxSizing: "border-box", transition: "all 0.2s",
              position: "relative", zIndex: 1,
            }}
          />
          {histQ && (
            <button onClick={() => setHistQ("")} style={{
              position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer",
              padding: "2px 3px", color: "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", borderRadius: 3,
              transition: "all 0.12s", zIndex: 2,
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            >
              <X style={{ width: 10, height: 10 }} />
            </button>
          )}
        </div>

        {/* Upload drop zone */}
        {activeTab === 'upload' && (
          <>
            <input ref={assetFileRef} type="file" accept=".glb,.fbx,.obj" style={{ display: "none" }}
              onChange={e => { if (e.target.files?.[0]) handleAssetUpload(e.target.files[0]); e.target.value = ""; }}
            />
            <button onClick={() => assetFileRef.current?.click()} disabled={assetUploading} style={{
              width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 8,
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
              color: assetUploading ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              cursor: assetUploading ? "not-allowed" : "pointer",
              border: "1px dashed rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.02)",
              transition: "all 0.15s", textTransform: "uppercase",
            }}
              onMouseEnter={e => { if (!assetUploading) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              {assetUploading
                ? <><Loader2 style={{ width: 11, height: 11 }} className="anim-spin" /> Uploading…</>
                : <><Upload style={{ width: 11, height: 11 }} /> Drop or select .glb / .fbx / .obj</>
              }
            </button>
          </>
        )}
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="arch-scroll" style={{
        flex: 1, overflowY: "auto", padding: "8px 10px 20px",
        display: "flex", flexDirection: "column",
      }}>

        {histLoad && (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <div style={{ position: "relative", width: 32, height: 32 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: `1.5px solid ${accent}30`,
                borderTop: `1.5px solid ${accent}`,
                animation: "arch-shimmer 0.8s linear infinite",
              }} />
            </div>
          </div>
        )}

        {!histLoad && filtHist.length === 0 && (
          <EmptyState accent={accent} message={histQ ? "No matches found" : activeTab === 'upload' ? "No uploads yet" : "Archive empty"} />
        )}

        {/* Tripo sections */}
        {!histLoad && activeTab === 'tripo' && tripoSections && (
          <AnimatePresence mode="sync">
            <motion.div key={`${activeTab}-${subTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
              {subTab === 'all' ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {[...filtHist].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)).map(item => {
                    const isRig = item.mode === 'rig' || item.params?.rigged === true || item.params?.type === 'animate_rig';
                    const isAnim = (item.mode === 'animate' && !isRig) || item.params?.animated === true || item.params?.type === 'animate_retarget';
                    const isSeg = item.mode === 'segment';
                    const isFill = item.mode === 'fill_parts';
                    const cardColor = isAnim ? TYPE_COLORS.animation.rail : isRig ? TYPE_COLORS.rigged.rail : isSeg ? TYPE_COLORS.segment.rail : isFill ? "#c084fc" : accent;
                    return (
                <HistoryCard key={item.id} item={{ ...item, name: getDisplayName(item) }} isActive={activeItemId === item.id} isLoading={loadingId === item.id} disabled={loadingId !== null} onSelect={handleSelect} onReuse={onReuse} onDownload={onDownload} onDelete={handleDeleteLocally} color={cardColor} getIdToken={getIdToken} />
                    );
                  })}
                </div>
              ) : (
                <>
                  {tripoSections.generated.length > 0 && (
                    <>
                      <SectionHeader label="Generated Models" icon={Sparkles} typeColor={TYPE_COLORS.model} count={tripoSections.generated.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
                        {tripoSections.generated.map(item => (
                      <HistoryCard key={item.id} item={{ ...item, name: getDisplayName(item) }} isActive={activeItemId === item.id} isLoading={loadingId === item.id} disabled={loadingId !== null} onSelect={handleSelect} onReuse={onReuse} onDownload={onDownload} onDelete={handleDeleteLocally} color={accent} getIdToken={getIdToken} />
                        ))}
                      </div>
                    </>
                  )}
                  {tripoSections.rigged.length > 0 && (
                    <>
                      <SectionHeader label="Rigged Characters" icon={PersonStanding} typeColor={TYPE_COLORS.rigged} count={tripoSections.rigged.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
                        {tripoSections.rigged.map(item => (
                      <HistoryCard key={item.id} item={{ ...item, name: getDisplayName(item) }} isActive={activeItemId === item.id} isLoading={loadingId === item.id} disabled={loadingId !== null} onSelect={handleSelect} onReuse={onReuse} onDownload={onDownload} onDelete={handleDeleteLocally} color={TYPE_COLORS.rigged.rail} getIdToken={getIdToken} />
                        ))}
                      </div>
                    </>
                  )}
                  {tripoSections.animations.length > 0 && (
                    <>
                      <SectionHeader label="Animations" icon={Wand2} typeColor={TYPE_COLORS.animation} count={tripoSections.animations.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
                        {tripoSections.animations.map(item => (
                      <HistoryCard key={item.id} item={{ ...item, name: getDisplayName(item) }} isActive={activeItemId === item.id} isLoading={loadingId === item.id} disabled={loadingId !== null} onSelect={handleSelect} onReuse={onReuse} onDownload={onDownload} onDelete={handleDeleteLocally} color={TYPE_COLORS.animation.rail} getIdToken={getIdToken} />
                        ))}
                      </div>
                    </>
                  )}
                  {tripoSections.segments.length > 0 && (
                    <>
                      <SectionHeader label="Segmented" icon={Scissors} typeColor={TYPE_COLORS.segment} count={tripoSections.segments.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
                        {tripoSections.segments.map(item => (
                      <HistoryCard key={item.id} item={{ ...item, name: getDisplayName(item) }} isActive={activeItemId === item.id} isLoading={loadingId === item.id} disabled={loadingId !== null} onSelect={handleSelect} onReuse={onReuse} onDownload={onDownload} onDelete={handleDeleteLocally} color={TYPE_COLORS.segment.rail} getIdToken={getIdToken} />
                        ))}
                      </div>
                    </>
                  )}
                  {tripoSections.fillParts.length > 0 && (
                    <>
                      <SectionHeader label="Completed Parts" icon={Boxes} typeColor={{ rail: "#c084fc" }} count={tripoSections.fillParts.length} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 }}>
                        {tripoSections.fillParts.map(item => (
                      <HistoryCard key={item.id} item={{ ...item, name: getDisplayName(item) }} isActive={activeItemId === item.id} isLoading={loadingId === item.id} disabled={loadingId !== null} onSelect={handleSelect} onReuse={onReuse} onDownload={onDownload} onDelete={handleDeleteLocally} color="#c084fc" getIdToken={getIdToken} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Other tabs */}
        {!histLoad && activeTab !== 'tripo' && filtHist.length > 0 && (
          <AnimatePresence mode="sync">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {filtHist.map(item => (
                <HistoryCard key={item.id} item={item} isActive={activeItemId === item.id} isLoading={loadingId === item.id} disabled={loadingId !== null} onSelect={handleSelect} onReuse={onReuse} onDownload={onDownload} onDelete={handleDeleteLocally} color={accent} getIdToken={getIdToken} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Load more — gradient border style */}
        {!histQ && hasMore && filtHist.length > 0 && (
          <div style={{ position: "relative", marginTop: 10 }}>
            {/* Gradient border */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 8,
              background: `linear-gradient(90deg, ${accent}50, ${accent}20, ${accent}50)`,
              padding: 1,
            }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 7, background: "#05030f" }} />
            </div>
            <button
              onClick={loadMore}
              disabled={moreLoad}
              style={{
                position: "relative", zIndex: 1,
                width: "100%", padding: "10px 0", borderRadius: 8,
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em",
                color: moreLoad ? "rgba(255,255,255,0.25)" : accent,
                background: "transparent", border: "none",
                cursor: moreLoad ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                textTransform: "uppercase", transition: "all 0.15s",
              }}
            >
              {moreLoad
                ? <><Loader2 style={{ width: 11, height: 11 }} className="anim-spin" /> Loading…</>
                : <><ChevronDown style={{ width: 11, height: 11 }} /> Load More</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
