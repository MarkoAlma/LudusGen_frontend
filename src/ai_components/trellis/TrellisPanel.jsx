// trellis/TrellisPanel.jsx — NVIDIA Trellis AI Text-to-3D Panel
import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from "react";
import {
  Download, Loader2, AlertCircle, Trash2, RotateCcw,
  Camera, Move3d, Layers, Play, Square, Sparkles,
  Clock, ChevronRight, ChevronLeft, Sliders, Box, Type, Zap,
} from "lucide-react";

import ThreeViewer from "../meshy/viewer/ThreeViewer";
import { setCameraPreset } from "../meshy/viewer/threeHelpers";
import { IconBtn, Tooltip } from "../meshy/ui/Primitives";
import LightingControls from "../meshy/viewer/LightingControls";

import {
  T, VIEW_MODES, EXAMPLE_PROMPTS, STYLE_OPTIONS, TRELLIS_PRESETS,
  ENHANCE_SYSTEM, DECHANTER_SYSTEM,
  fetchGlbAsBlob, stripStylePrefix, applyStylePrefix, defaultParams,
  loadHistoryFromFirestore, saveHistoryToFirestore,
  Card, MiniSlider, NumInput, Pill, SectionLabel, ToggleRow,
  WireframeControl, BgColorPicker, HistoryCard,
} from ".";
import ConfirmModal from "./ConfirmModal";
import StylePicker from "./StylePicker";
import PromptInput from "./PromptInput";

// ── Constants ─────────────────────────────────────────────────────────────────
const PRESET_TIME = {
  Ultra: "~10–15 mp", Gyors: "~18–22 mp", Normál: "~28–35 mp",
  Minőség: "~45–55 mp", Max: "~60–70 mp",
};
const LEFT_DEFAULT  = 264;
const LEFT_MIN      = 248;   // Simplify + Enhance gombok + padding minimuma
const LEFT_MAX      = 360;
const RIGHT_DEFAULT = 212;
const RIGHT_MIN     = 178;   // HistoryCard akciógombok + padding minimuma
const RIGHT_MAX     = 320;

const PULSE_DOTS = [0,1,2,3,4].map((i) => (
  <div key={i} style={{
    width: 5, height: 5, borderRadius: "50%", background: "currentColor", opacity: 0.25,
    animation: `pulse 1.4s ease-in-out ${i * 0.18}s infinite`,
  }} />
));

// ── AI name prompt ────────────────────────────────────────────────────────────
const NAME_SYSTEM = `You generate ultra-short creative names for 3D models (2–4 words max).
Rules: poetic, evocative, memorable. No articles (a/an/the). No punctuation at end. English only.
Examples: "Mossy Stone Tower", "Crystal Wyvern", "Rusted Cargo Bay", "Frosted Pine Cabin"
Return ONLY the name, nothing else.`;

// ── Shared streaming helper ───────────────────────────────────────────────────
async function streamChat(headers, body) {
  const res = await fetch("http://localhost:3001/api/chat", {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const raw = t.slice(6);
      if (raw === "[DONE]") continue;
      try { accumulated += JSON.parse(raw).delta || ""; } catch { /* skip */ }
    }
  }
  return accumulated.trim();
}

// ── Global CSS ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .animate-spin { animation: spin 1s linear infinite; }

  .trellis-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.08) transparent;
  }
  .trellis-scroll::-webkit-scrollbar        { width: 3px; }
  .trellis-scroll::-webkit-scrollbar-track  { background: transparent; }
  .trellis-scroll::-webkit-scrollbar-thumb  { background: rgba(255,255,255,0.08); border-radius: 99px; }
  .trellis-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }

  /* Hide topbar scrollbar */
  .trellis-topbar::-webkit-scrollbar { display: none; }

  /* Drag handle */
  .trellis-handle {
    width: 5px; flex-shrink: 0; cursor: col-resize;
    background: transparent; position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: center;
  }
  .trellis-handle::after {
    content: ''; position: absolute; top: 0; bottom: 0;
    left: 50%; transform: translateX(-50%);
    width: 1px; background: rgba(255,255,255,0.05);
    transition: background 0.15s, width 0.15s;
  }
  .trellis-handle:hover::after,
  .trellis-handle.dragging::after { background: rgba(255,255,255,0.2); width: 2px; }

  /* Collapse toggle — appears on hover */
  .handle-toggle {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 18px; height: 30px; border-radius: 99px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(10,10,28,0.98);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; cursor: pointer; z-index: 2;
    transition: opacity 0.15s, background 0.15s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .trellis-handle:hover .handle-toggle { opacity: 1; }
  .handle-toggle:hover { background: rgba(30,30,50,0.98); }

  .ex-btn:hover     { background: rgba(255,255,255,0.035) !important; color: #6b7280 !important; }
  .hist-clear:hover { color: #f87171 !important; border-color: rgba(248,113,113,0.18) !important; background: rgba(248,113,113,0.05) !important; }
  .dl-ghost:hover   { color: #9ca3af !important; border-color: rgba(255,255,255,0.12) !important; background: rgba(255,255,255,0.04) !important; }
  .view-btn:hover   { background: rgba(255,255,255,0.05) !important; }
`;

// ── Layout styles ─────────────────────────────────────────────────────────────
const S = {
  root: {
    display: "flex", height: "100%", overflow: "hidden",
    fontFamily: "'SF Pro Text', -apple-system, system-ui, sans-serif",
    background: "#06060f",
  },
  leftHeader: {
    padding: "13px 14px 11px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    display: "flex", alignItems: "center", gap: 10,
    flexShrink: 0, background: "rgba(255,255,255,0.01)",
  },
  leftScroll: { flex: 1, overflowY: "auto", padding: "14px 12px 0", minWidth: 0 },
  generateArea: {
    padding: "11px 12px 13px", flexShrink: 0,
    borderTop: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(6,6,18,0.98)",
    minWidth: 0, overflow: "hidden",
  },
  center: {
    flex: 1, minWidth: 0, display: "flex",
    flexDirection: "column", position: "relative", background: "#06060f",
  },
  topBar: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px", height: 38, flexShrink: 0,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    background: "rgba(6,6,18,0.98)",
    overflowX: "auto", overflowY: "hidden",
    scrollbarWidth: "none",
    gap: 12,
  },
  bottomBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 12px", height: 38, flexShrink: 0,
    borderTop: "1px solid rgba(255,255,255,0.04)",
    background: "rgba(6,6,18,0.98)",
    overflowX: "auto", overflowY: "hidden",
    scrollbarWidth: "none",
    gap: 12,
  },
  toolbarLabel: {
    color: "#272736", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em",
    textTransform: "uppercase", fontFamily: "'SF Mono', monospace",
    userSelect: "none", marginRight: 2, flexShrink: 0,
  },
  separator: { width: 1, height: 14, background: "rgba(255,255,255,0.06)", margin: "0 3px", flexShrink: 0 },
  overlay: {
    position: "absolute", inset: 0, zIndex: 20,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "rgba(4,4,14,0.9)",
    backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", pointerEvents: "none",
  },
  loadingOverlay: {
    position: "absolute", inset: 0, zIndex: 20,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "rgba(6,6,16,0.65)",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", pointerEvents: "none",
  },
  emptyState: {
    position: "absolute", inset: 0, zIndex: 5,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    pointerEvents: "none",
  },
  viewerHint: {
    position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)",
    fontSize: 9, color: "#161625", display: "flex", alignItems: "center", gap: 10,
    pointerEvents: "none", zIndex: 10, whiteSpace: "nowrap",
    fontFamily: "'SF Mono', monospace", letterSpacing: "0.02em",
  },
  rightHeader: {
    padding: "11px 10px 9px", flexShrink: 0,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    minWidth: 0,
  },
  historyList: {
    flex: 1, overflowY: "auto", padding: "7px 8px",
    display: "flex", flexDirection: "column", gap: 4,
    minWidth: 0,
  },
  divider: { height: 1, background: "rgba(255,255,255,0.04)", margin: "4px 0 14px" },
  headerTitle: { color: "#e5e7eb", fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: "-0.015em" },
  headerSub: { color: "#22223a", fontSize: 9, margin: "1px 0 0", fontFamily: "'SF Mono', monospace" },
};

// ── ResizablePanel ────────────────────────────────────────────────────────────
function ResizablePanel({ side, width, open, children }) {
  const easing = "cubic-bezier(0.4,0,0.2,1)";
  return (
    <aside style={{
      width: open ? width : 0,
      minWidth: 0,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      transition: `width 0.22s ${easing}`,
      borderLeft:  side === "right" ? "1px solid rgba(255,255,255,0.055)" : "none",
      borderRight: side === "left"  ? "1px solid rgba(255,255,255,0.055)" : "none",
      background: "rgba(8,8,20,0.98)",
    }}>
      {/* Fixed-width inner so content doesn't squish during animation */}
      <div style={{
        width: width,
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {children}
      </div>
    </aside>
  );
}

// ── DragHandle ────────────────────────────────────────────────────────────────
function DragHandle({ onMouseDown, onToggle, icon }) {
  return (
    <div className="trellis-handle" onMouseDown={onMouseDown} style={{ userSelect: "none" }}>
      <div
        className="handle-toggle"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggle}
      >
        {icon}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function TrellisPanel({ selectedModel, getIdToken, userId }) {
  const color = selectedModel?.color || "#a78bfa";

  const [prompt, setPrompt] = useState("");
  const [genStatus, setGenStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [modelUrl, setModelUrl] = useState(null);
  const [params, setParams] = useState(defaultParams);
  const [selectedStyle, setSelectedStyle] = useState("nostyle");
  const [enhancing, setEnhancing] = useState(false);
  const [dechantig, setDechantig] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const [viewMode, setViewMode] = useState("clay");
  const [lightMode, setLightMode] = useState("studio");
  const [showGrid, setShowGrid] = useState(true);
  const [autoSpin, setAutoSpin] = useState(true);
  const [bgColor, setBgColor] = useState("default");
  const [wireframeOverlay, setWireframeOverlay] = useState(false);
  const [wireOpacity, setWireOpacity] = useState(0.22);
  const [wireColor, setWireColor] = useState("#ffffff");
  const [lightStrength, setLightStrength] = useState(1.0);
  const [lightRotation, setLightRotation] = useState(0);
  const [lightAutoRotate, setLightAutoRotate] = useState(false);
  const [lightAutoRotateSpeed, setLightAutoRotateSpeed] = useState(0.5);
  const [dramaticColor, setDramaticColor] = useState("#4400ff");
  const [gridColor1, setGridColor1] = useState("#1e1e3a");
  const [gridColor2, setGridColor2] = useState("#111128");

  // Panel state
  const [leftOpen,   setLeftOpen]   = useState(true);
  const [rightOpen,  setRightOpen]  = useState(true);
  const [leftWidth,  setLeftWidth]  = useState(LEFT_DEFAULT);
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [histSearch, setHistSearch] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sceneRef    = useRef(null);
  const abortRef    = useRef(null);
  const timeoutRef  = useRef(null);
  const prevUrlRef  = useRef(null);
  const dragRef     = useRef(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const wireHexColor = useMemo(() => parseInt(wireColor.replace("#",""), 16), [wireColor]);
  const isRunning    = genStatus === "pending";
  const canGen       = !isRunning && !!prompt.trim() && prompt.length <= 1000;

  const activePresetLabel = useMemo(
    () => TRELLIS_PRESETS.find(
      (p) => p.slat_steps === params.slat_sampling_steps && p.ss_steps === params.ss_sampling_steps
    )?.label ?? null,
    [params.slat_sampling_steps, params.ss_sampling_steps],
  );

  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase();
    return q ? history.filter((i) => (i.prompt||"").toLowerCase().includes(q)) : history;
  }, [history, histSearch]);

  const runningStyle = useMemo(
    () => selectedStyle !== "nostyle" ? STYLE_OPTIONS.find((s) => s.id === selectedStyle) : null,
    [selectedStyle],
  );

  // ── Panel drag-to-resize ──────────────────────────────────────────────────
  const startDrag = useCallback((side) => (e) => {
    e.preventDefault();
    dragRef.current = { side, startX: e.clientX, startW: side === "left" ? leftWidth : rightWidth };
    const onMove = (ev) => {
      if (!dragRef.current) return;
      const { side: s, startX, startW } = dragRef.current;
      const dx = ev.clientX - startX;
      if (s === "left")  setLeftWidth(Math.max(LEFT_MIN,  Math.min(LEFT_MAX,  startW + dx)));
      else               setRightWidth(Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, startW - dx)));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }, [leftWidth, rightWidth]);

  // ── Load history ──────────────────────────────────────────────────────────
  useEffect(() => {
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
          setActiveItem(latest); setGenStatus("succeeded");
          if (latest.model_url) {
            try {
              const blobUrl = await fetchGlbAsBlob(latest.model_url, getIdToken);
              if (!cancelled) { setModelUrl(blobUrl); prevUrlRef.current = blobUrl; }
            } catch {
              if (!cancelled) { setModelUrl(latest.model_url); prevUrlRef.current = latest.model_url; }
            }
          }
        }
      } catch (err) { console.error("History betöltési hiba:", err); }
      finally { if (!cancelled) setHistoryLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [userId]);

  const authHeaders = useCallback(async () => {
    const token = getIdToken ? await getIdToken() : "";
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, [getIdToken]);

  // ── AI name ───────────────────────────────────────────────────────────────
  const generateName = useCallback(async (promptText) => {
    try {
      const name = await streamChat(await authHeaders(), {
        model: "gpt-oss-120b", provider: "cerebras",
        messages: [
          { role: "system", content: NAME_SYSTEM },
          { role: "user",   content: promptText.slice(0, 300) },
        ],
        temperature: 0.8, max_tokens: 20,
      });
      return name || null;
    } catch { return null; }
  }, [authHeaders]);

  const setParam = useCallback((k, v) => setParams((p) => ({ ...p, [k]: v })), []);
  const handleStyleSelect  = useCallback((id) => setSelectedStyle(id), []);
  const toggleGrid         = useCallback(() => setShowGrid((v) => !v), []);
  const toggleWireframe    = useCallback(() => setWireframeOverlay((v) => !v), []);
  const toggleAutoSpin     = useCallback(() => setAutoSpin((v) => !v), []);
  const handleSpinStop     = useCallback(() => setAutoSpin(false), []);
  const handleSceneReady   = useCallback((s) => { sceneRef.current = s; }, []);
  const handleExampleClick = useCallback((ex) => { setPrompt(ex); setErrorMsg(""); }, []);
  const handleReusePrompt  = useCallback((p) => { setPrompt(p); setErrorMsg(""); }, []);
  const handleDeleteItem   = useCallback((item) => { setItemToDelete(item); setDeleteModalOpen(true); }, []);
  const handleClearHistory = useCallback(() => setClearAllModalOpen(true), []);

  const handleEnhance = useCallback(async () => {
    if (!prompt.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const result = await streamChat(await authHeaders(), {
        model: "gpt-oss-120b", provider: "cerebras",
        messages: [
          { role: "system", content: ENHANCE_SYSTEM },
          { role: "user",   content: stripStylePrefix(prompt.trim(), selectedStyle) },
        ],
        temperature: 0.7, max_tokens: 500,
      });
      if (result) setPrompt(result);
    } catch (err) { console.error("Enhance hiba:", err); }
    finally { setEnhancing(false); }
  }, [prompt, enhancing, authHeaders, selectedStyle]);

  const handleDechance = useCallback(async () => {
    if (!prompt.trim() || dechantig) return;
    setDechantig(true);
    try {
      const result = await streamChat(await authHeaders(), {
        model: "gpt-oss-120b", provider: "cerebras",
        messages: [
          { role: "system", content: DECHANTER_SYSTEM },
          { role: "user",   content: stripStylePrefix(prompt.trim(), selectedStyle) },
        ],
        temperature: 0.4, max_tokens: 300,
      });
      if (result) { setPrompt(result); setTimedOut(false); }
    } catch (err) { console.error("Dechance hiba:", err); }
    finally { setDechantig(false); }
  }, [prompt, dechantig, authHeaders, selectedStyle]);

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (genStatus === "pending" || !prompt.trim() || prompt.length > 1000) return;
    setErrorMsg("");
    prevUrlRef.current = modelUrl;
    setModelUrl(null); setGenStatus("pending"); setTimedOut(false);

    const controller = new AbortController();
    abortRef.current = controller;
    timeoutRef.current = setTimeout(() => { controller.abort(); setTimedOut(true); }, 70_000);

    try {
      const headers = await authHeaders();
      const resolvedSeed = params.randomSeed
        ? Math.floor(Math.random() * 2_147_483_647)
        : Math.max(0, Math.floor(Number(params.seed) || 0));

      const res = await fetch("http://localhost:3001/api/trellis", {
        method: "POST", headers, signal: controller.signal,
        body: JSON.stringify({
          prompt: applyStylePrefix(prompt.trim(), selectedStyle),
          slat_cfg_scale: params.slat_cfg_scale, ss_cfg_scale: params.ss_cfg_scale,
          slat_sampling_steps: params.slat_sampling_steps, ss_sampling_steps: params.ss_sampling_steps,
          seed: resolvedSeed,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setModelUrl(prevUrlRef.current);
        setGenStatus(prevUrlRef.current ? "succeeded" : "failed");
        setErrorMsg(data.message ?? "Trellis generálás sikertelen");
        return;
      }

      const glbUrl  = data.glb_url ?? data.model_url ?? null;
      const blobUrl = await fetchGlbAsBlob(glbUrl, getIdToken);
      setModelUrl(blobUrl); prevUrlRef.current = blobUrl;
      setGenStatus("succeeded");

      // Generate AI name in background
      const aiName = await generateName(prompt.trim());

      const itemData = {
        prompt: prompt.trim(),
        name: aiName ?? null,
        status: "succeeded", model_url: glbUrl,
        params: {
          slat_cfg_scale: params.slat_cfg_scale, ss_cfg_scale: params.ss_cfg_scale,
          slat_sampling_steps: params.slat_sampling_steps, ss_sampling_steps: params.ss_sampling_steps,
          seed: resolvedSeed, randomSeed: params.randomSeed,
        },
        style: selectedStyle, ts: Date.now(),
      };

      const docId   = await saveHistoryToFirestore(userId, itemData);
      const newItem = { id: docId ?? `local_${Date.now()}`, ...itemData, createdAt: { toDate: () => new Date() } };
      setHistory((h) => [newItem, ...h]);
      setActiveItem(newItem);
    } catch (err) {
      if (err.name === "AbortError") {
        setModelUrl(prevUrlRef.current);
        setGenStatus(prevUrlRef.current ? "succeeded" : "idle");
        setErrorMsg("");
      } else {
        setModelUrl(prevUrlRef.current);
        setGenStatus(prevUrlRef.current ? "succeeded" : "failed");
        setErrorMsg(err.message ?? "Hálózati hiba");
      }
    } finally {
      abortRef.current = null;
      clearTimeout(timeoutRef.current); timeoutRef.current = null;
    }
  }, [genStatus, prompt, params, authHeaders, userId, getIdToken, modelUrl, selectedStyle, generateName]);

  const handleStop = useCallback(() => { setTimedOut(false); abortRef.current?.abort(); }, []);

  const handleSelectHistory = useCallback(async (item) => {
    setActiveItem(item); setGenStatus(item.status);
    if (item.style) setSelectedStyle(item.style);
    if (item.model_url) {
      try {
        const blobUrl = await fetchGlbAsBlob(item.model_url, getIdToken);
        setModelUrl(blobUrl); prevUrlRef.current = blobUrl;
      } catch { setModelUrl(item.model_url); prevUrlRef.current = item.model_url; }
    }
  }, [getIdToken]);

  const confirmDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const headers = await authHeaders();
      const res  = await fetch(`http://localhost:3001/api/trellis/history/${itemToDelete.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.success) {
        setHistory((h) => h.filter((i) => i.id !== itemToDelete.id));
        if (activeItem?.id === itemToDelete.id) { setActiveItem(null); setModelUrl(null); setGenStatus("idle"); }
      } else { alert("Törlés sikertelen: " + data.message); }
    } catch (err) { alert("Hálózati hiba: " + err.message); }
    finally { setIsDeleting(false); setDeleteModalOpen(false); setItemToDelete(null); }
  }, [itemToDelete, authHeaders, activeItem]);

  const confirmClearAll = useCallback(async () => {
    setIsDeleting(true);
    try {
      const headers = await authHeaders();
      const res  = await fetch("http://localhost:3001/api/trellis/history", { method: "DELETE", headers });
      const data = await res.json();
      if (data.success) { setHistory([]); setActiveItem(null); setModelUrl(null); setGenStatus("idle"); }
      else { alert("Törlés sikertelen: " + data.message); }
    } catch (err) { alert("Hálózati hiba: " + err.message); }
    finally { setIsDeleting(false); setClearAllModalOpen(false); }
  }, [authHeaders]);

  const handleDownload = useCallback(() => {
    if (!modelUrl) return;
    const a = document.createElement("a"); a.href = modelUrl;
    a.download = `trellis_${Date.now()}.glb`; a.click();
  }, [modelUrl]);

  const handleDownloadItem = useCallback(async (item) => {
    try {
      const blobUrl = await fetchGlbAsBlob(item.model_url, getIdToken);
      const a = document.createElement("a"); a.href = blobUrl;
      a.download = `trellis_${item.id ?? Date.now()}.glb`; a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (err) { alert("GLB letöltés sikertelen: " + err.message); }
  }, [getIdToken]);

  const camPreset = useCallback((preset) => {
    if (sceneRef.current) {
      setCameraPreset(sceneRef.current, preset);
      const spin = preset === "reset";
      setAutoSpin(spin); sceneRef.current.autoSpin = spin;
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}{`
        @keyframes trellisPulse {
          0%,100% { box-shadow: 0 4px 20px ${color}45; }
          50%      { box-shadow: 0 4px 28px ${color}70, 0 0 0 2px ${color}12; }
        }
      `}</style>

      <div style={S.root}>

        {/* ══════════ LEFT PANEL ══════════ */}
        <ResizablePanel side="left" width={leftWidth} open={leftOpen}>
          <div style={S.leftHeader}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: `${color}14`, border: `1px solid ${color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 18px ${color}18`, flexShrink: 0,
            }}>
              <Sparkles style={{ width: 13, height: 13, color }} />
            </div>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <p style={{ ...S.headerTitle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>NVIDIA Trellis</p>
              <p style={S.headerSub}>microsoft/trellis · text→3D</p>
            </div>
          </div>

          <div style={S.leftScroll} className="trellis-scroll">
            <StylePicker selected={selectedStyle} onSelect={handleStyleSelect} color={color} disabled={isRunning} />
            <div style={S.divider} />
            <SectionLabel icon={<Type />} color={color}>Prompt</SectionLabel>
            <PromptInput
              value={prompt} onChange={setPrompt} onSubmit={handleGenerate}
              onEnhance={handleEnhance} enhancing={enhancing}
              onDechance={handleDechance} dechantig={dechantig}
              color={color} disabled={isRunning}
            />
            <ExamplePrompts prompts={EXAMPLE_PROMPTS} color={color} disabled={isRunning} onClick={handleExampleClick} />

            {timedOut && (
              <div style={{ marginBottom: 12, borderRadius: 10, background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.18)", overflow: "hidden" }}>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <Clock style={{ width: 10, height: 10, color: "#fb923c", flexShrink: 0 }} />
                    <p style={{ color: "#fdba74", fontSize: 10, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Időtúllépés (1:10)</p>
                  </div>
                  <p style={{ color: "#6b3a1a", fontSize: 9, margin: "0 0 9px", lineHeight: 1.6 }}>Csökkentsd a Steps értékét, vagy egyszerűsítsd a promptot.</p>
                  <button onClick={handleDechance} disabled={dechantig} style={{
                    width: "100%", padding: "6px 0", borderRadius: 8,
                    fontSize: 10, fontWeight: 700, cursor: dechantig ? "not-allowed" : "pointer",
                    border: "none", background: "rgba(251,146,60,0.12)", color: "#fb923c",
                    outline: "1px solid rgba(251,146,60,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s",
                  }}>
                    {dechantig ? <><Loader2 style={{ width: 10, height: 10 }} className="animate-spin" /> Egyszerűsítés…</> : <><Zap style={{ width: 10, height: 10 }} /> Prompt egyszerűsítése</>}
                  </button>
                </div>
              </div>
            )}

            {!timedOut && errorMsg && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "9px 11px", borderRadius: 9, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", marginBottom: 12 }}>
                <AlertCircle style={{ width: 11, height: 11, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: "#fca5a5", fontSize: 10, margin: 0, lineHeight: 1.55 }}>{errorMsg}</p>
              </div>
            )}

            <GenerationSettings color={color} open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} params={params} setParam={setParam} activePresetLabel={activePresetLabel} />
            <div style={{ height: 8 }} />
          </div>

          <div style={S.generateArea}>
            {/* Preset idő + model sor — overflow hidden, ne törjön ki */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 9, minWidth: 0, overflow: "hidden", gap: 6,
            }}>
              <span style={{ color: "#1e1e38", fontSize: 9, display: "flex", alignItems: "center", gap: 4, fontFamily: "'SF Mono', monospace", flexShrink: 0, whiteSpace: "nowrap" }}>
                <Clock style={{ width: 9, height: 9 }} />{activePresetLabel ? PRESET_TIME[activePresetLabel] : "~30 mp"}
              </span>
              <span style={{ color: "#181828", fontSize: 9, fontFamily: "'SF Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>microsoft/trellis</span>
            </div>
            {isRunning ? (
              <button onClick={handleStop} style={{
                width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 11, fontWeight: 700, letterSpacing: "-0.01em",
                color: "#fca5a5", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                cursor: "pointer", border: "none", background: "rgba(239,68,68,0.1)", outline: "1px solid rgba(239,68,68,0.25)", transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}><Square style={{ width: 11, height: 11, flexShrink: 0 }} /> Leállítás</button>
            ) : (
              <Tooltip text={!canGen ? (!prompt.trim() ? "Írj be egy promptot" : "Prompt túl hosszú") : "Trellis 3D generálás indítása"} side="top">
                <button onClick={handleGenerate} disabled={!canGen} style={{
                  width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 11, fontWeight: 700, letterSpacing: "-0.01em",
                  color: canGen ? "#fff" : "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  cursor: canGen ? "pointer" : "not-allowed", border: "none",
                  background: canGen ? `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` : "rgba(255,255,255,0.04)",
                  boxShadow: canGen ? `0 2px 16px ${color}35` : "none",
                  transition: "all 0.2s", animation: canGen ? "trellisPulse 2.8s ease-in-out infinite" : "none",
                  whiteSpace: "nowrap",
                }}>
                  <Sparkles style={{ width: 13, height: 13, flexShrink: 0 }} /> Trellis Generate
                </button>
              </Tooltip>
            )}
            {modelUrl && (
              <button className="dl-ghost" onClick={handleDownload} style={{
                marginTop: 6, width: "100%", padding: "6px 0", borderRadius: 8,
                fontSize: 10, fontWeight: 600, letterSpacing: "0.01em", color: "#374151",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                cursor: "pointer", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}>
                <Download style={{ width: 10, height: 10, flexShrink: 0 }} /> GLB letöltése
              </button>
            )}
          </div>
        </ResizablePanel>

        {/* Left handle */}
        <DragHandle
          onMouseDown={startDrag("left")}
          onToggle={() => setLeftOpen((v) => !v)}
          icon={leftOpen
            ? <ChevronLeft  style={{ width: 10, height: 10, color: "rgba(255,255,255,0.45)" }} />
            : <ChevronRight style={{ width: 10, height: 10, color: "rgba(255,255,255,0.45)" }} />
          }
        />

        {/* ══════════ CENTER ══════════ */}
        <main style={S.center}>
          <div style={S.topBar} className="trellis-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              {!leftOpen && (
                <Tooltip text="Bal panel megnyitása" side="bottom">
                  <button onClick={() => setLeftOpen(true)} style={{
                    width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.04)", color: "#3d3d5a", marginRight: 4, transition: "all 0.14s",
                  }}>
                    <ChevronRight style={{ width: 11, height: 11 }} />
                  </button>
                </Tooltip>
              )}
              <span style={S.toolbarLabel}>Nézet</span>
              {VIEW_MODES.map((v) => (
                <Tooltip key={v.id} text={v.tip} side="bottom">
                  <button className="view-btn" onClick={() => setViewMode(v.id)} style={{
                    padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                    cursor: "pointer", border: "none", transition: "all 0.14s",
                    background: viewMode === v.id ? `${color}1c` : "rgba(255,255,255,0.025)",
                    color: viewMode === v.id ? color : "#3d3d5a",
                    outline: viewMode === v.id ? `1px solid ${color}38` : "1px solid rgba(255,255,255,0.055)",
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>{v.label}</button>
                </Tooltip>
              ))}
              {modelUrl && (
                <WireframeControl
                  active={wireframeOverlay} onToggle={toggleWireframe}
                  opacity={wireOpacity} onOpacityChange={setWireOpacity}
                  color={wireColor} onColorChange={setWireColor} accentColor={color}
                />
              )}
            </div>
            {/* space-between a két csoportot szétválasztja, nincs szükség spacerre */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <BgColorPicker value={bgColor} onChange={setBgColor} />
              <div style={S.separator} />
              <span style={S.toolbarLabel}>Fény</span>
              <LightingControls
                viewMode={viewMode} lightMode={lightMode} setLightMode={setLightMode}
                lightStrength={lightStrength} setLightStrength={setLightStrength}
                lightRotation={lightRotation} setLightRotation={setLightRotation}
                lightAutoRotate={lightAutoRotate} setLightAutoRotate={setLightAutoRotate}
                lightAutoRotateSpeed={lightAutoRotateSpeed} setLightAutoRotateSpeed={setLightAutoRotateSpeed}
                dramaticColor={dramaticColor} setDramaticColor={setDramaticColor}
                gridColor1={gridColor1} setGridColor1={setGridColor1}
                gridColor2={gridColor2} setGridColor2={setGridColor2}
                color={color}
              />
              <div style={S.separator} />
              <IconBtn
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" /></svg>}
                tip={showGrid ? "Rács elrejtése" : "Rács megjelenítése"}
                active={showGrid} color={color} onClick={toggleGrid}
              />
              {!rightOpen && (
                <Tooltip text="Előzmények megnyitása" side="bottom">
                  <button onClick={() => setRightOpen(true)} style={{
                    width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.04)", color: "#3d3d5a", transition: "all 0.14s",
                  }}>
                    <ChevronLeft style={{ width: 11, height: 11 }} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>

          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <div style={S.viewerHint}>
              <RotateCcw style={{ width: 9, height: 9 }} />
              Húzd = forgat · Shift+drag = model · Jobb = pan · Scroll = zoom
            </div>
            <ThreeViewer
              color={color} viewMode={viewMode} lightMode={lightMode} showGrid={showGrid}
              modelUrl={modelUrl} lightStrength={lightStrength} lightRotation={lightRotation}
              lightAutoRotate={lightAutoRotate} lightAutoRotateSpeed={lightAutoRotateSpeed}
              dramaticColor={dramaticColor} wireframeOverlay={wireframeOverlay}
              wireOpacity={wireOpacity} wireHexColor={wireHexColor}
              autoSpin={autoSpin} bgColor={bgColor} gridColor1={gridColor1} gridColor2={gridColor2}
              onSpinStop={handleSpinStop} onReady={handleSceneReady}
            />
            {historyLoading && (
              <div style={S.loadingOverlay}>
                <Loader2 style={{ width: 20, height: 20, color, marginBottom: 10 }} className="animate-spin" />
                <p style={{ color: "#2d3748", fontSize: 10, margin: 0, fontFamily: "'SF Mono', monospace" }}>Előzmények betöltése…</p>
              </div>
            )}
            {isRunning && (
              <div style={S.overlay}>
                <div style={{ width: 64, height: 64, borderRadius: 18, marginBottom: 20, background: `${color}10`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px ${color}20, inset 0 1px 0 ${color}20` }}>
                  <Box style={{ width: 26, height: 26, color }} />
                </div>
                <p style={{ color: "#e5e7eb", fontWeight: 700, fontSize: 14, margin: "0 0 5px", letterSpacing: "-0.02em" }}>Trellis generál…</p>
                {runningStyle && <p style={{ color: `${color}b0`, fontSize: 10, fontWeight: 600, margin: "0 0 6px" }}>{runningStyle.emoji} {runningStyle.label} stílus</p>}
                <p style={{ color: "#272745", fontSize: 10, margin: "0 0 4px", maxWidth: 260, textAlign: "center", lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontStyle: "italic" }}>„{prompt}"</p>
                <p style={{ color: "#1e1e38", fontSize: 9, margin: "0 0 22px", fontFamily: "'SF Mono', monospace" }}>{activePresetLabel ? PRESET_TIME[activePresetLabel] : "~30 mp"}</p>
                <div style={{ display: "flex", gap: 5, alignItems: "center", color }}>{PULSE_DOTS}</div>
              </div>
            )}
            {!isRunning && !modelUrl && !historyLoading && (
              <div style={S.emptyState}>
                <div style={{ width: 68, height: 68, borderRadius: 20, marginBottom: 16, background: `${color}05`, border: `1px solid ${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Box style={{ width: 28, height: 28, color: `${color}28` }} />
                </div>
                <p style={{ color: "#1c1c34", fontSize: 12, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.01em" }}>{prompt.trim() ? "Kattints a Trellis Generate gombra" : "Írj be egy promptot"}</p>
                <p style={{ color: "#14142a", fontSize: 9, fontFamily: "'SF Mono', monospace" }}>Szövegből 3D model — NVIDIA Trellis AI</p>
              </div>
            )}
          </div>

          <div style={S.bottomBar} className="trellis-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              <span style={S.toolbarLabel}>Kamera</span>
              <IconBtn icon={<RotateCcw />} tip="Kamera visszaállítása" onClick={() => camPreset("reset")} />
              <IconBtn icon={<Camera />}    tip="Elölnézet"             onClick={() => camPreset("front")} />
              <IconBtn icon={<Move3d />}    tip="Oldalnézet"            onClick={() => camPreset("side")}  />
              <IconBtn icon={<Layers />}    tip="Felülnézet"            onClick={() => camPreset("top")}   />
              <div style={{ ...S.separator, margin: "0 5px" }} />
              <Tooltip text={autoSpin ? "Auto-spin leállítása" : "Auto-spin indítása"} side="top">
                <button onClick={toggleAutoSpin} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  cursor: "pointer", border: "none", transition: "all 0.14s",
                  background: autoSpin ? `${color}1c` : "rgba(255,255,255,0.025)",
                  color: autoSpin ? color : "#3d3d5a",
                  outline: autoSpin ? `1px solid ${color}38` : "1px solid rgba(255,255,255,0.055)",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {autoSpin ? <Square style={{ width: 9, height: 9 }} /> : <Play style={{ width: 9, height: 9 }} />}
                  Auto-spin
                </button>
              </Tooltip>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {activeItem?.params && <ParamsBadge params={activeItem.params} />}
              {modelUrl && (
                <button onClick={handleDownload} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 13px", borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: "-0.01em",
                  color: "#fff", background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
                  border: "none", cursor: "pointer", boxShadow: `0 2px 12px ${color}38`, transition: "all 0.15s",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  <Download style={{ width: 10, height: 10 }} /> GLB letöltése
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Right handle */}
        <DragHandle
          onMouseDown={startDrag("right")}
          onToggle={() => setRightOpen((v) => !v)}
          icon={rightOpen
            ? <ChevronRight style={{ width: 10, height: 10, color: "rgba(255,255,255,0.45)" }} />
            : <ChevronLeft  style={{ width: 10, height: 10, color: "rgba(255,255,255,0.45)" }} />
          }
        />

        {/* ══════════ RIGHT PANEL ══════════ */}
        <ResizablePanel side="right" width={rightWidth} open={rightOpen}>
          <div style={S.rightHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9, minWidth: 0 }}>
              <Clock style={{ width: 10, height: 10, color: `${color}70`, flexShrink: 0 }} />
              <span style={{ color: "#5a5a78", fontSize: 11, fontWeight: 700, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Előzmények</span>
              <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: `${color}10`, color: `${color}90`, border: `1px solid ${color}1c`, fontFamily: "'SF Mono', monospace", flexShrink: 0 }}>
                {history.length}
              </span>
            </div>
            <input
              placeholder="Keresés…" value={histSearch}
              onChange={(e) => setHistSearch(e.target.value)}
              style={{
                width: "100%", padding: "5px 9px", borderRadius: 7, fontSize: 10,
                color: "#9ca3af", background: "rgba(255,255,255,0.028)",
                border: "1px solid rgba(255,255,255,0.065)", outline: "none",
                boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${color}30`; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.065)"; }}
            />
          </div>

          <div style={S.historyList} className="trellis-scroll">
            {historyLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                <Loader2 style={{ width: 14, height: 14, color: "#22223a" }} className="animate-spin" />
              </div>
            )}
            {!historyLoading && filteredHistory.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 140, textAlign: "center", gap: 8 }}>
                <Box style={{ width: 20, height: 20, color: "#14142a" }} />
                <p style={{ color: "#1c1c34", fontSize: 10, margin: 0 }}>{histSearch ? "Nincs találat" : "Még nincs mentett modell"}</p>
              </div>
            )}
            {filteredHistory.map((item) => (
              <HistoryCard
                key={item.id} item={item} isActive={activeItem?.id === item.id}
                onSelect={handleSelectHistory} onReuse={handleReusePrompt}
                onDownload={handleDownloadItem} onDelete={handleDeleteItem}
                color={color} getIdToken={getIdToken}
              />
            ))}
          </div>

          {history.length > 0 && (
            <div style={{ padding: "6px 8px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
              <button className="hist-clear" onClick={handleClearHistory} style={{
                width: "100%", padding: "5px", borderRadius: 7, fontSize: 9, fontWeight: 600,
                color: "#22223a", background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.045)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                transition: "all 0.15s", fontFamily: "inherit", whiteSpace: "nowrap",
              }}>
                <Trash2 style={{ width: 9, height: 9, flexShrink: 0 }} /> Előzmények törlése
              </button>
            </div>
          )}
        </ResizablePanel>
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => { if (!isDeleting) { setDeleteModalOpen(false); setItemToDelete(null); } }}
        onConfirm={confirmDeleteItem} title="Modell törlése"
        message={`Biztosan törölni szeretnéd ezt a modellt? "${itemToDelete?.prompt?.slice(0,60)}${(itemToDelete?.prompt?.length??0)>60?"...":""}" Ez a művelet nem vonható vissza.`}
        confirmText="Törlés" confirmColor="#ef4444" isDeleting={isDeleting}
      />
      <ConfirmModal
        isOpen={clearAllModalOpen}
        onClose={() => { if (!isDeleting) setClearAllModalOpen(false); }}
        onConfirm={confirmClearAll} title="Összes előzmény törlése"
        message={`Biztosan törölni szeretnéd mind a ${history.length} mentett modellt? Ez a művelet nem vonható vissza.`}
        confirmText="Összes törlése" confirmColor="#dc2626" isDeleting={isDeleting}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const ExamplePrompts = React.memo(function ExamplePrompts({ prompts, color, disabled, onClick }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ color: "#22223a", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px", fontFamily: "'SF Mono', monospace" }}>Példák</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {prompts.map((ex) => (
          <button key={ex} className="ex-btn" onClick={() => onClick(ex)} disabled={disabled} style={{
            width: "100%", padding: "5px 9px", borderRadius: 7, textAlign: "left", fontSize: 9,
            color: "#2d2d4a", cursor: disabled ? "not-allowed" : "pointer",
            background: "rgba(255,255,255,0.012)", border: "1px solid rgba(255,255,255,0.038)",
            transition: "all 0.12s", opacity: disabled ? 0.35 : 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.5, fontFamily: "inherit",
          }}>
            <span style={{ color: `${color}55`, marginRight: 5 }}>↗</span>{ex}
          </button>
        ))}
      </div>
    </div>
  );
});

const GenerationSettings = React.memo(function GenerationSettings({ color, open, onToggle, params, setParam, activePresetLabel }) {
  return (
    <div style={{ marginBottom: 14, borderRadius: 10, background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.055)", overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", padding: "9px 12px", display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", minWidth: 0, overflow: "hidden" }}>
        <Sliders style={{ width: 10, height: 10, color: `${color}70`, flexShrink: 0 }} />
        <span style={{ color: "#6b7280", fontSize: 10, fontWeight: 700, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Generálás beállítások</span>
        {activePresetLabel && <Pill color={color} active>{TRELLIS_PRESETS.find((p) => p.label === activePresetLabel)?.emoji} {activePresetLabel}</Pill>}
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#22223a", transition: "transform 0.22s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ marginBottom: 14, paddingTop: 12 }}>
            <p style={{ color: "#22223a", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: "'SF Mono', monospace" }}>Gyors preset</p>
            <div style={{ display: "flex", gap: 3 }}>
              {TRELLIS_PRESETS.map((p) => {
                const isActive = params.slat_sampling_steps === p.slat_steps && params.ss_sampling_steps === p.ss_steps;
                return (
                  <Tooltip key={p.label} text={p.tip} side="top">
                    <button onClick={() => { setParam("slat_cfg_scale", p.slat_cfg); setParam("ss_cfg_scale", p.ss_cfg); setParam("slat_sampling_steps", p.slat_steps); setParam("ss_sampling_steps", p.ss_steps); }} style={{
                      flex: "1 1 0", padding: "6px 2px", borderRadius: 7, fontSize: 9, fontWeight: 700,
                      border: "none", cursor: "pointer",
                      background: isActive ? `${color}1c` : "rgba(255,255,255,0.022)",
                      color: isActive ? color : "#3d3d5a",
                      outline: isActive ? `1px solid ${color}40` : "1px solid rgba(255,255,255,0.055)",
                      transition: "all 0.14s", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      boxShadow: isActive ? `0 0 10px ${color}12` : "none",
                      minWidth: 0,
                    }}>
                      <span style={{ fontSize: 12, lineHeight: 1 }}>{p.emoji}</span>
                      <span style={{ fontSize: 8.5, letterSpacing: "0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{p.label}</span>
                      <span style={{ fontSize: 8, opacity: 0.45, fontFamily: "'SF Mono', monospace" }}>{p.slat_steps}s</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            {activePresetLabel && <p style={{ color: "#22223a", fontSize: 9, margin: "7px 0 0", textAlign: "center", fontFamily: "'SF Mono', monospace" }}>est. <span style={{ color, fontWeight: 700 }}>{PRESET_TIME[activePresetLabel]}</span></p>}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "0 0 13px" }} />
          <MiniSlider label="SLAT CFG Scale" value={params.slat_cfg_scale} min={1} max={10} step={0.1} onChange={(v) => setParam("slat_cfg_scale", v)} color={color} display={params.slat_cfg_scale.toFixed(1)} />
          <MiniSlider label="SS CFG Scale" value={params.ss_cfg_scale} min={1} max={10} step={0.1} onChange={(v) => setParam("ss_cfg_scale", v)} color={color} display={params.ss_cfg_scale.toFixed(1)} />
          <MiniSlider label="SLAT Sampling Steps" value={params.slat_sampling_steps} min={4} max={50} step={1} onChange={(v) => setParam("slat_sampling_steps", v)} color={color} display={`${params.slat_sampling_steps}`} />
          <MiniSlider label="SS Sampling Steps" value={params.ss_sampling_steps} min={4} max={50} step={1} onChange={(v) => setParam("ss_sampling_steps", v)} color={color} display={`${params.ss_sampling_steps}`} />
          <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "4px 0 13px" }} />
          <ToggleRow label="Véletlenszerű seed" hint="Minden generálás egyedi eredményt ad" value={params.randomSeed} onChange={(v) => setParam("randomSeed", v)} color={color} />
          {!params.randomSeed && <NumInput label="Seed" hint="0 – 2 147 483 647" value={params.seed} min={0} max={2147483647} onChange={(v) => setParam("seed", v)} color={color} />}
        </div>
      )}
    </div>
  );
});

const ParamsBadge = React.memo(function ParamsBadge({ params }) {
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "center", padding: "3px 10px", borderRadius: 7, background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.045)", overflow: "hidden" }}>
      {[
        { k: "SLAT", v: params.slat_cfg_scale?.toFixed?.(1) ?? params.slat_cfg_scale },
        { k: "SS",   v: params.ss_cfg_scale?.toFixed?.(1)   ?? params.ss_cfg_scale   },
        { k: "Steps", v: params.slat_sampling_steps },
        { k: "Seed",  v: params.seed },
      ].map(({ k, v }) => (
        <span key={k} style={{ fontSize: 9, color: "#22223a", display: "flex", gap: 3, fontFamily: "'SF Mono', monospace", flexShrink: 0, whiteSpace: "nowrap" }}>
          <span style={{ color: "#1a1a30" }}>{k}:</span>
          <span style={{ color: "#2d2d4a", fontWeight: 700 }}>{v}</span>
        </span>
      ))}
    </div>
  );
});