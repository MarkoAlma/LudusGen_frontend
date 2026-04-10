// trellis/TripoPanel.jsx
import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from "react";
import {
  Download, Loader2, AlertCircle, Trash2, RotateCcw,
  Camera, Move3d, Layers, Play, Square, Clock,
  ChevronRight, ChevronLeft, Box, Zap, ChevronDown,
  Sparkles, Grid3x3, Scissors, PaintBucket,
  Boxes, PersonStanding, Wand2, Activity,
} from "lucide-react";

import ThreeViewer from "../meshy/viewer/ThreeViewer";
import { setCameraPreset } from "../meshy/viewer/threeHelpers";
import { IconBtn, Tooltip } from "../meshy/ui/Primitives";
import LightingControls from "../meshy/viewer/LightingControls";
import {
  VIEW_MODES, WireframeControl, BgColorPicker, HistoryCard,
} from "../trellis/.";
import ConfirmModal from "../trellis/ConfirmModal";
import DownloadModal from "../trellis/DownloadModal";
import { saveHistoryToFirestore, loadHistoryPageFromFirestore } from "../trellis/utils";
import { getAnimById, ANIMATION_LIBRARY, ANIM_CATEGORIES } from "./animationlibrary";
import { persistGen, loadPersistedGen, updatePersistedProgress, clearPersistedGen } from "./useGenerationPersist";

import GeneratePanel, { MODEL_VERSIONS } from "./GeneratePanel";
import Segment from "./Segment";
import Retopo from "./Retopo";
import Texture from "./Texture";
import Animate from "./Animate";
import { motion, AnimatePresence } from "framer-motion";

/* ─── constants ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const POLL_MS = 2500;
const POLL_MAX = 500;

const PROGRESS_JUMP_LIMIT = 30;
const STUCK_THRESHOLD_MS = 300_000;

const NAV = [
  { id: "generate", label: "Model", icon: Sparkles, sub: false },
  { id: "segment", label: "Segment", icon: Scissors, sub: true },
  { id: "retopo", label: "Retopo", icon: Grid3x3, sub: false },
  { id: "texture", label: "Texture", icon: PaintBucket, sub: true },
  { id: "texture_edit", label: "Edit", icon: Wand2, sub: false },
  { id: "animate", label: "Animate", icon: PersonStanding, sub: false },
];

const SEGMENT_SUBS = [
  { id: "segment", label: "Segment" },
  { id: "fill_parts", label: "Fill Parts" },
];

const MODE_COST = {
  segment: 40,
  fill_parts: 50,
  texture_edit: 10,
  animate: 10,
};

/* ─── CSS ────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  :root {
    --bg-base: #0a0a14;
    --bg-panel: rgba(10, 10, 20, 0.4);
    --bg-surface: rgba(255, 255, 255, 0.02);
    --bg-raised: rgba(255, 255, 255, 0.04);
    --accent: #8b5cf6;
    --accent-bright: #a78bfa;
    --accent-glow: rgba(139, 92, 246, 0.3);
    --text-primary: #ffffff;
    --text-secondary: #94a3b8;
    --text-muted: #475569;
    --text-faint: #1e293b;
    --border: rgba(255, 255, 255, 0.05);
    --border-accent: rgba(139, 92, 246, 0.3);
    --error: #ef4444;
    --success: #10b981;
  }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:none } }
  .anim-spin { animation: spin 1s linear infinite; }
  .fade-up   { animation: fadeUp 0.18s ease forwards; }
  .tp-scroll { scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.06) transparent; }
  .tp-scroll::-webkit-scrollbar { width:3px; }
  .tp-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px; }
  .tp-nav-btn { display:flex;flex-direction:column;align-items:center;gap:5px;width:100%;padding:10px 0;background:none;border:none;cursor:pointer;position:relative;transition:all 0.14s; }
  .tp-nav-btn .ico { width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;transition:all 0.14s; }
  .tp-nav-btn:hover .ico { background:rgba(255,255,255,0.06); }
  .tp-nav-btn.active .ico { background:rgba(124,111,255,0.22);box-shadow:0 0 12px rgba(124,111,255,0.2); }
  .tp-nav-btn .lbl { font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;transition:color 0.14s; }
  .tp-nav-btn.active .lbl { color:var(--accent-bright); }
  .tp-nav-btn:not(.active) .lbl { color:var(--text-muted); }
  .tp-nav-btn:not(.active):hover .lbl { color:var(--text-secondary); }
  .tp-nav-btn.active::before { content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:26px;background:linear-gradient(180deg,var(--accent-bright),var(--accent));border-radius:0 4px 4px 0;box-shadow:0 0 8px var(--accent-glow); }
  .tp-switch { width:36px;height:20px;border-radius:10px;position:relative;transition:background 0.2s;flex-shrink:0;cursor:pointer; }
  .tp-switch::after { content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.4); }
  .tp-switch.on::after { transform:translateX(16px); }
  .tp-input { width:100%;padding:8px 11px;border-radius:9px;font-size:12px;color:var(--text-primary);background:var(--bg-raised);border:1px solid var(--border);outline:none;font-family:inherit;transition:border-color 0.14s,background 0.14s;box-sizing:border-box; }
  .tp-input:focus { border-color:var(--border-accent);background:rgba(30,30,54,0.9); }
  .tp-input::placeholder { color:var(--text-muted); }
  .tp-ta { width:100%;padding:10px 12px;border-radius:10px;font-size:12px;color:var(--text-primary);background:var(--bg-raised);border:1px solid var(--border);outline:none;font-family:inherit;resize:none;line-height:1.6;box-sizing:border-box;transition:border-color 0.14s; }
  .tp-ta::placeholder { color:var(--text-muted); }
  .tp-ta:focus { border-color:var(--border-accent);outline:none; }
  .tp-drop:hover { border-color:rgba(108,99,255,0.4) !important; }
  .tp-sub-tab { padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;border:none;transition:all 0.13s;font-family:inherit; }
  .tp-sub-tab.on { background:rgba(124,111,255,0.25);color:var(--accent-bright);outline:1px solid var(--border-accent); }
  .tp-sub-tab:not(.on) { background:transparent;color:var(--text-muted); }
  .tp-sub-tab:not(.on):hover { color:#5a5a7a;background:rgba(255,255,255,0.04); }
  .tp-inp-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.15s;font-family:inherit;background:transparent; }
  .tp-inp-tab.active { background:#ffffff;box-shadow:0 1px 6px rgba(0,0,0,0.35); }
  .tp-qual-btn { flex:1;padding:10px 4px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all 0.14s;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit; }
  .tp-gen-btn { width:100%;padding:16px 0;border-radius:13px;font-size:15px;font-weight:800;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.03em;transition:all 0.2s;font-family:inherit; }
  .tp-gen-btn.go { background: var(--accent); color:#ffffff; box-shadow:0 15px 45px rgba(139, 92, 246, 0.3); }
  .tp-gen-btn.go:hover { box-shadow:0 20px 60px rgba(139, 92, 246, 0.45); transform:translateY(-2px) scale(1.02); }
  .tp-gen-btn.no { background:rgba(255,255,255,0.03); color:var(--text-muted); cursor:not-allowed; border:1px solid var(--border); }
  .tp-model-card { padding:11px 12px;border-radius:10px;background:var(--bg-raised);border:1px solid var(--border);cursor:pointer;transition:all 0.13s;margin-bottom:5px; }
  .tp-model-card.sel { background:rgba(124,111,255,0.14);border-color:var(--border-accent);box-shadow:0 0 0 1px rgba(124,111,255,0.2); }
  .tp-model-card:hover:not(.sel) { background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.2); }
  .tp-handle { width:4px;flex-shrink:0;cursor:col-resize;position:relative;z-index:10; }
  .tp-handle::after { content:'';position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:1px;background:rgba(255,255,255,0.04);transition:all 0.14s; }
  .tp-handle:hover::after { background:rgba(255,255,255,0.14);width:2px; }
  .tp-hbtn { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:28px;border-radius:99px;border:1px solid rgba(255,255,255,0.09);background:#0c0c18;display:flex;align-items:center;justify-content:center;opacity:0;cursor:pointer;transition:opacity 0.14s; }
  .tp-handle:hover .tp-hbtn { opacity:1; }
  .checker { background-color:#131326;background-image:linear-gradient(45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,0.025) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,0.025) 75%);background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0; }
  .anim-card { border-radius:10px;overflow:hidden;cursor:pointer;transition:all 0.13s; }
  .anim-card:hover { border-color:rgba(255,255,255,0.22) !important; transform:scale(1.02); }
  .sec-row { display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:10px 0;user-select:none; }
  .sec-row span { transition:color 0.13s; }
  .sec-row:hover span { color:#8a8aaa !important; }
  .tp-topo-btn { flex:1;padding:8px 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all 0.14s;font-family:inherit; }
  .tp-topo-btn.sel { background:rgba(124,111,255,0.22);color:var(--accent-bright);outline:1.5px solid var(--border-accent); }
  .tp-topo-btn:not(.sel) { background:var(--bg-raised);color:var(--text-secondary);outline:1px solid var(--border); }
  .tp-topo-btn:not(.sel):hover { background:rgba(255,255,255,0.07);color:#6a6a8a; }
  .tex-input-box { border:1.5px solid rgba(108,99,255,0.35);border-radius:12px;overflow:hidden;background:rgba(108,99,255,0.04);margin-bottom:14px; }
  .tex-tab-bar { display:flex;background:rgba(255,255,255,0.04);padding:4px;gap:3px; }
  .tex-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.14s;font-family:inherit; }
  .tex-tab.on { background:rgba(255,255,255,0.14);box-shadow:0 1px 4px rgba(0,0,0,0.3); }
  .mv-grid { display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px; }
  .mv-cell { border-radius:8px;aspect-ratio:1/1;border:1.5px dashed rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:border-color 0.13s;position:relative; }
  .mv-cell:hover { border-color:rgba(108,99,255,0.4); }
  .magic-mode-tab { flex:1;padding:8px 0;border:none;cursor:pointer;font-size:12px;font-weight:600;border-radius:8px;transition:all 0.14s;font-family:inherit; }
  .magic-mode-tab.on { background:#fff;color:#0a0a1a;box-shadow:0 1px 6px rgba(0,0,0,0.3); }
  .magic-mode-tab:not(.on) { background:transparent;color:#5a5a7a; }
  .anim-model-dd { width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);cursor:pointer;display:flex;align-items:center;gap:8px;transition:border-color 0.13s; }
  .anim-model-dd:hover { border-color:rgba(108,99,255,0.4); }
  .auto-rig-btn { width:100%;padding:12px 0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;transition:all 0.2s; }
  .auto-rig-btn.ready { background:rgba(255,255,255,0.08);color:#c8c8e0; }
  .auto-rig-btn.ready:hover { background:rgba(255,255,255,0.12); }
  .auto-rig-btn.disabled { background:rgba(255,255,255,0.04);color:#1e1e38;cursor:not-allowed; }

  /* ── Model-NA: feature not available with selected model ─────────────
   * Wrapper dims the child UI and blocks all pointer interaction.
   * Title tooltip on the wrapper still describes why it's disabled.
   * ─────────────────────────────────────────────────────────────────── */
  .model-na {
    opacity: 0.28;
    filter: grayscale(0.45);
    cursor: not-allowed !important;
    transition: opacity 0.15s, filter 0.15s;
    position: relative;
  }
  .model-na * {
    pointer-events: none !important;
    cursor: not-allowed !important;
  }
  /* Tab buttons get model-na directly (no wrapper), so pointer-events is
     overridden individually via JS onClick guard + cursor style. */
  .tp-inp-tab.model-na {
    pointer-events: none !important;
    opacity: 0.25 !important;
    filter: grayscale(0.5);
  }
`;

function CoinIcon({ size = 15 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#f5c518,#e09900)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Zap style={{ width: size * 0.56, height: size * 0.56, color: "#0a0800" }} />
    </div>
  );
}

function PBar({ value }) {
  return (
    <div style={{ width: "100%", height: 3, borderRadius: 99, background: "rgba(255,255,255,0.07)" }}>
      <div style={{ width: value + "%", height: "100%", background: "linear-gradient(90deg,var(--accent),var(--accent-bright))", borderRadius: 99, transition: "width 0.4s ease" }} />
    </div>
  );
}

/* ─── component ──────────────────────────────────────────────────────── */
export default function TripoPanel({ selectedModel, getIdToken, userId }) {
  const color = selectedModel?.color || "#6c63ff";

  // nav
  const [mode, setMode] = useState("generate");
  const [segSub, setSegSub] = useState("segment");

  // generate
  const [genTab, setGenTab] = useState("image");
  const [modelVer, setModelVer] = useState(MODEL_VERSIONS[0].id);
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [makeBetter, setMakeBetter] = useState(true);
  const [imgFile, setImgFile] = useState(null);
  const [imgPrev, setImgPrev] = useState(null);
  const [imgToken, setImgToken] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [meshQ, setMeshQ] = useState("standard");
  const [inParts, setInParts] = useState(false);
  const [privacy, setPrivacy] = useState("public");
  const [texOn, setTexOn] = useState(true);
  const [tex4K, setTex4K] = useState(true);
  const [pbrOn, setPbrOn] = useState(false);
  const [genStatus, setGenStatus] = useState("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [multiImages, setMultiImages] = useState([]);
  const [batchImages, setBatchImages] = useState([]);

  // topology
  const [quadMesh, setQuadMesh] = useState(true);
  const [smartLowPoly, setSmartLowPoly] = useState(false);
  const [polycount, setPolycount] = useState(0);

  // retopo extras
  const [outFormat, setOutFormat] = useState("glb");
  const [pivotToBottom, setPivotToBottom] = useState(false);
  const [tPose, setTPose] = useState(false);
  const [modelSeed, setModelSeed] = useState(null);
  const [textureSeed, setTextureSeed] = useState(null);
  const [imageSeed, setImageSeed] = useState(null);
  const [autoSize, setAutoSize] = useState(false);
  const [exportUv, setExportUv] = useState(true);

  // task id inputs
  const [segId, setSegId] = useState("");
  const [fillId, setFillId] = useState("");
  const [retopoId, setRetopoId] = useState("");
  const [texId, setTexId] = useState("");
  const [editId, setEditId] = useState("");
  const [animId, setAnimId] = useState("");

  // texture mode options
  const [texInputTab, setTexInputTab] = useState("image");
  const [texPrompt, setTexPrompt] = useState("");
  const [texNeg, setTexNeg] = useState("");
  const [texPbr, setTexPbr] = useState(false);
  const [texAlignment, setTexAlignment] = useState("original_image");

  // texture_edit
  const [brushMode, setBrushMode] = useState("Gen Mode");
  const [brushPrompt, setBrushPrompt] = useState("");
  const [creativity, setCreativity] = useState(0.6);
  const [brushColor, setBrushColor] = useState("#ffffff");

  // animate
  const [animModelVer, setAnimModelVer] = useState("v2.5-animals");
  const [animSearch, setAnimSearch] = useState("");
  const [animCat, setAnimCat] = useState("all");
  const [selAnim, setSelAnim] = useState(null);
  const [rigStep, setRigStep] = useState("idle");
  const [riggedId, setRiggedId] = useState(null);

  // gen state
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [modelUrl, setModelUrl] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  // viewer
  const [viewMode, setViewMode] = useState("clay");
  const [lightMode, setLightMode] = useState("studio");
  const [showGrid, setShowGrid] = useState(true);
  const [autoSpin, setAutoSpin] = useState(true);
  const [bgColor, setBgColor] = useState("default");
  const [wireOv, setWireOv] = useState(false);
  const [wireOp, setWireOp] = useState(0.22);
  const [wireC, setWireC] = useState("#ffffff");
  const [lStr, setLStr] = useState(1.0);
  const [lRot, setLRot] = useState(0);
  const [lAutoR, setLAutoR] = useState(false);
  const [lAutoS, setLAutoS] = useState(0.5);
  const [dramC, setDramC] = useState("#4400ff");
  const [gc1, setGc1] = useState("#1e1e3a");
  const [gc2, setGc2] = useState("#111128");

  // panels / modals
  const [dlOpen, setDlOpen] = useState(false);
  const [dlItem, setDlItem] = useState(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftW, setLeftW] = useState(302);
  const [rightW, setRightW] = useState(220);

  // history
  const [history, setHistory] = useState([]);
  const [histLoad, setHistLoad] = useState(false);
  const [moreLoad, setMoreLoad] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [histQ, setHistQ] = useState("");
  const [activeH, setActiveH] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [delModal, setDelModal] = useState(false);
  const [clrModal, setClrModal] = useState(false);
  const [toDel, setToDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const histInit = useRef(false);
  const lastDocR = useRef(null);
  const histAbort = useRef(null);
  const sceneRef = useRef(null);
  const pollAb = useRef(null);
  const prevUrl = useRef(null);
  const dragRef = useRef(null);
  const fileRef = useRef(null);
  const currentTaskId = useRef(null);
  const currentRequestId = useRef(null);
  const userStoppedRef = useRef(false);

  // ── Backend-driven model capabilities ───────────────────────────────────
  // Fetched once on mount; falls back to null so GeneratePanel uses its own
  // static MODEL_CAPS map until the response arrives.
  const [backendCaps, setBackendCaps] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = getIdToken ? await getIdToken() : "";
        const res = await fetch(BASE_URL + "/api/tripo/model-capabilities", {
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
        });
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled && d.success && d.capabilities) {
          setBackendCaps(d.capabilities);
        }
      } catch (e) {
        console.warn("[TripoPanel] Failed to fetch model capabilities from backend:", e.message);
        // Graceful fallback — GeneratePanel uses its own static MODEL_CAPS
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Weekly history cleanup ───────────────────────────────────────────────
  // Runs once per session (not per component mount) to prune expired items.
  useEffect(() => {
    if (!userId || !getIdToken) return;
    const CLEANUP_KEY = "tripo_history_cleanup_ts";
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const last = parseInt(localStorage.getItem(CLEANUP_KEY) || "0", 10);
    if (Date.now() - last < WEEK_MS) return; // already ran this week
    (async () => {
      try {
        const t = await getIdToken();
        if (!t) return; // no token yet — skip cleanup, will retry next session
        const res = await fetch(BASE_URL + "/api/tripo/history/expired", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
        });
        if (res.ok) {
          localStorage.setItem(CLEANUP_KEY, String(Date.now()));
          const d = await res.json();
          if (d.deleted > 0) console.log(`[TripoPanel] Cleaned up ${d.deleted} expired history items`);
        }
        // 401/403 = token not valid yet, silently skip
      } catch (e) {
        // Network error — non-critical, skip silently
      }
    })();
  }, [userId, getIdToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const leftWRef = useRef(302);
  const rightWRef = useRef(220);

  const wireHex = useMemo(() => parseInt(wireC.replace("#", ""), 16), [wireC]);
  const activeTaskId = activeH?.taskId ?? activeH?.id ?? "";

  const isRiggedInput = useMemo(() => {
    const m = activeH?.mode ?? activeH?.params?.mode ?? "";
    return m === "animate";
  }, [activeH]);

  const filtAnims = useMemo(() => ANIMATION_LIBRARY.filter(a => {
    const mc = animCat === "all" || a.category === animCat;
    const ms = !animSearch || a.label.toLowerCase().includes(animSearch.toLowerCase());
    return mc && ms;
  }), [animSearch, animCat]);

  const canGen = useMemo(() => {
    if (isRunning) return false;
    switch (mode) {
      case "generate": return genTab === "text" ? !!prompt.trim() : genTab === "batch" ? (batchImages?.length > 0) : !!imgToken;
      case "segment": return !!(segId.trim() || activeTaskId);
      case "fill_parts": return !!(fillId.trim() || activeTaskId);
      case "retopo": return !!(retopoId.trim() || activeTaskId);
      case "texture": return !!(texId.trim() || activeTaskId) && (texInputTab === "text" ? !!texPrompt.trim() : texInputTab === "image" ? !!imgToken : multiImages.length > 0);
      case "texture_edit": return !!(editId.trim() || activeTaskId);
      case "animate": return !!(riggedId && selAnim);
      default: return false;
    }
  }, [isRunning, mode, genTab, prompt, imgToken, batchImages, segId, fillId, retopoId, activeTaskId, texInputTab, texPrompt, multiImages, editId, texId]);

  const filtHist = useMemo(() => {
    const q = histQ.toLowerCase();
    return q ? history.filter(i => (i.prompt || "").toLowerCase().includes(q)) : history;
  }, [history, histQ]);

  const authH = useCallback(async () => {
    const t = getIdToken ? await getIdToken() : "";
    return { "Content-Type": "application/json", Authorization: "Bearer " + t };
  }, [getIdToken]);

  const startDrag = useCallback((side) => (e) => {
    e.preventDefault();
    const startW = side === "left" ? leftWRef.current : rightWRef.current;
    dragRef.current = { side, startX: e.clientX, startW };
    const mv = (ev) => {
      if (!dragRef.current) return;
      const { side: s, startX, startW: sw } = dragRef.current;
      const dx = ev.clientX - startX;
      if (s === "left") {
        const nw = Math.max(260, Math.min(400, sw + dx));
        leftWRef.current = nw; setLeftW(nw);
      } else {
        const nw = Math.max(180, Math.min(320, sw - dx));
        rightWRef.current = nw; setRightW(nw);
      }
    };
    const up = () => { dragRef.current = null; document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
  }, []);

  const handleImg = useCallback(async (file) => {
    if (!file) return;
    setImgFile(file); setImgToken(null); setErrorMsg("");
    const r = new FileReader(); r.onload = e => setImgPrev(e.target.result); r.readAsDataURL(file);
    setImgUploading(true);
    try {
      const t = getIdToken ? await getIdToken() : "", form = new FormData(); form.append("file", file);
      const res = await fetch(BASE_URL + "/api/tripo/upload", { method: "POST", headers: { Authorization: "Bearer " + t }, body: form });
      const d = await res.json(); if (!d.success) throw new Error(d.message); setImgToken(d.imageToken);
    } catch (e) { setErrorMsg("Upload failed: " + e.message); setImgFile(null); setImgPrev(null); }
    finally { setImgUploading(false); }
  }, [getIdToken]);

  const uploadImageFile = useCallback(async (file) => {
    const t = getIdToken ? await getIdToken() : "";
    const form = new FormData(); form.append("file", file);
    const res = await fetch(BASE_URL + "/api/tripo/upload", { method: "POST", headers: { Authorization: "Bearer " + t }, body: form });
    const d = await res.json();
    if (!d.success) throw new Error(d.message);
    return d.imageToken;
  }, [getIdToken]);

  const handleMultiImg = uploadImageFile;
  const handleBatchImg = uploadImageFile;

  const pollTask = useCallback(async (taskId, pt, headers, onSuccess) => {
    let n = 0, prevProgress = 0, stuckSince = null;
    while (n < POLL_MAX) {
      if (pt.cancelled) return;
      await new Promise(r => setTimeout(r, POLL_MS));
      if (pt.cancelled) return;
      n++;
      const res = await fetch(BASE_URL + "/api/tripo/task/" + taskId, { headers });
      const d = await res.json();
      if (!d.success) throw new Error(d.message ?? "Poll error");
      const prog = d.progress ?? 0;
      if (d.status !== "success" && prog - prevProgress > PROGRESS_JUMP_LIMIT) {
        throw Object.assign(new Error(`Auto-stopped: suspicious progress jump (${prevProgress}% → ${prog}%)`), { type: "auto_stop", autoStop: true });
      }
      if (d.status !== "success" && prog >= 99) {
        if (!stuckSince) stuckSince = Date.now();
        else if (Date.now() - stuckSince > STUCK_THRESHOLD_MS) {
          throw Object.assign(new Error("Auto-stopped: stuck at " + prog + "% for 5min"), { type: "auto_stop", autoStop: true });
        }
      } else { stuckSince = null; }
      if (d.status !== "success" && d.status !== "failed" && d.status !== "cancelled") {
        const dp = Math.min(prog, 99); setProgress(dp); updatePersistedProgress(dp); prevProgress = prog;
      }
      if (d.status === "success") {
        if (!d.modelUrl) throw Object.assign(new Error("Content blocked by Tripo. Credits were not charged."), { type: "nsfw" });
        await onSuccess(d); return;
      }
      if (d.status === "failed" || d.status === "cancelled") {
        throw Object.assign(new Error("Task " + d.status), { tripoStatus: d.status, rawOutput: d });
      }
    }
    throw new Error("Timeout");
  }, []);

  const fetchProxy = useCallback(async (rawUrl, retries = 3) => {
    let lastErr;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1200 * attempt));
        const t = await getIdToken();
        const res = await fetch(BASE_URL + "/api/tripo/model-proxy?url=" + encodeURIComponent(rawUrl), { headers: { Authorization: "Bearer " + t }, signal: AbortSignal.timeout(45_000) });
        if (!res.ok) throw new Error("Model load HTTP " + res.status);
        const blob = await res.blob();
        if (!blob || blob.size === 0) throw new Error("Empty model response");
        return URL.createObjectURL(blob);
      } catch (err) { lastErr = err; console.warn(`[fetchProxy] attempt ${attempt + 1}/${retries} failed:`, err.message); }
    }
    throw lastErr ?? new Error("fetchProxy: all retries exhausted");
  }, [getIdToken]);

  const revokeBlobUrl = useCallback((url) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => { return () => { revokeBlobUrl(prevUrl.current); }; }, []); // eslint-disable-line

  // Page-reload resume
  useEffect(() => {
    const persisted = loadPersistedGen();
    if (!persisted) return;
    console.log("[TripoPanel] Resuming after reload:", persisted.taskId);
    setIsRunning(true); setProgress(persisted.lastProgress ?? 0); setStatusMsg("Resuming generation…");
    currentTaskId.current = persisted.taskId; userStoppedRef.current = false;
    const requestId = crypto.randomUUID(); currentRequestId.current = requestId;
    const pt = { cancelled: false }; pollAb.current = pt;
    (async () => {
      try {
        const t = getIdToken ? await getIdToken() : "";
        const headers = { "Content-Type": "application/json", Authorization: "Bearer " + t };
        await pollTask(persisted.taskId, pt, headers, async (d) => {
          if (currentRequestId.current !== requestId) return;
          const rawUrl = d.modelUrl;
          if (!rawUrl) throw Object.assign(new Error("Content blocked."), { type: "nsfw" });
          const blob = await fetchProxy(rawUrl);
          if (pt.cancelled) { revokeBlobUrl(blob); return; }
          revokeBlobUrl(prevUrl.current);
          setModelUrl(blob); prevUrl.current = blob;
          setGenStatus("succeeded"); setProgress(100); setStatusMsg(""); setIsRunning(false);
          currentTaskId.current = null; clearPersistedGen();
          await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? "" });
        });
      } catch (e) {
        setIsRunning(false); setProgress(0); setStatusMsg(""); currentTaskId.current = null; clearPersistedGen();
        if (!pt.cancelled) { setGenStatus(e.autoStop ? "idle" : "failed"); setErrorMsg(e.message ?? "Resumed generation failed"); }
        else { setGenStatus(prevUrl.current ? "succeeded" : "idle"); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const item = { prompt: prompt.trim() || extra.label || mode, status: "succeeded", model_url: rawUrl, source: "tripo", mode, taskId, params: { model_version: modelVer, mode, ...extra }, ts: Date.now() };
    const { docId } = await saveHistoryToFirestore(userId, item);
    const ni = { id: docId ?? ("tripo_" + Date.now()), ...item, createdAt: { toDate: () => new Date() } };
    setHistory(h => [ni, ...h]); setActiveH(ni); histInit.current = true; return ni;
  }, [userId, prompt, mode, modelVer]);

  const handleGen = useCallback(async () => {
    if (!canGen) return;
    setGenStatus("pending"); setIsRunning(true); setErrorMsg(""); setProgress(0); setStatusMsg("");
    prevUrl.current = modelUrl; setModelUrl(null); setGenStatus("pending");
    if (pollAb.current) pollAb.current.cancelled = true;
    const pt = { cancelled: false }; pollAb.current = pt;
    const requestId = crypto.randomUUID(); currentRequestId.current = requestId;
    userStoppedRef.current = false;
    const srcId = activeTaskId;
    const animSlug = selAnim ? getAnimById(selAnim)?.slug : null;
    try {
      const headers = await authH();
      let body;
      const _isModern = modelVer === "P1-20260311" || modelVer.startsWith("v3.");
      switch (mode) {
        case "generate":
          if (genTab === "text") {
            const isUltra = meshQ === "ultra" && _isModern;
            body = {
              type: "text_to_model", prompt: prompt.trim(), model_version: modelVer,
              ...(negPrompt.trim() && { negative_prompt: negPrompt.trim() }),
              ...(tPose && { t_pose: true }),
              ...(texOn && { texture: true }),
              ...(pbrOn && { pbr: true }),
              ...((texOn || pbrOn) && { texture_quality: tex4K ? "detailed" : "standard" }),
              ...(isUltra && { geometry_quality: "detailed" }),
              ...(polycount > 0 && { face_limit: polycount }),
              ...(inParts && { generate_parts: true }),
              ...(quadMesh && { quad: true }),
              ...(smartLowPoly && { smart_low_poly: true }),
              ...(modelSeed != null && { model_seed: modelSeed }),
              ...(imageSeed != null && { image_seed: imageSeed }),
              ...((texOn || pbrOn) && textureSeed != null && { texture_seed: textureSeed }),
              ...(autoSize && { auto_size: true }),
              ...(!exportUv && { export_uv: false }),
            };
          } else if (genTab === "multi") {
            const isUltra = meshQ === "ultra" && _isModern;
            body = {
              type: "multiview_to_model",
              files: multiImages.map(i => ({ type: "png", file_token: i.token })),
              model_version: modelVer,
              ...(negPrompt.trim() && { negative_prompt: negPrompt.trim() }),
              ...(texOn && { texture: true }),
              ...(pbrOn && { pbr: true }),
              ...((texOn || pbrOn) && { texture_quality: tex4K ? "detailed" : "standard" }),
              ...(isUltra && { geometry_quality: "detailed" }),
              ...(polycount > 0 && { face_limit: polycount }),
              ...(quadMesh && { quad: true }),
              ...(smartLowPoly && { smart_low_poly: true }),
              ...(inParts && { generate_parts: true }),
              ...(modelSeed != null && { model_seed: modelSeed }),
              ...(imageSeed != null && { image_seed: imageSeed }),
              ...((texOn || pbrOn) && textureSeed != null && { texture_seed: textureSeed }),
              ...(autoSize && { auto_size: true }),
              ...(!exportUv && { export_uv: false }),
            };
          } else if (genTab === "batch") {
            body = {
              type: "image_to_model",
              file: { type: "jpg", file_token: batchImages[0]?.token },
              model_version: modelVer,
              ...(negPrompt.trim() && { negative_prompt: negPrompt.trim() }),
              ...(texOn && { texture: true }),
              ...(pbrOn && { pbr: true }),
              ...((texOn || pbrOn) && { texture_quality: tex4K ? "detailed" : "standard" }),
              ...(makeBetter && { enable_image_autofix: true }),
              ...(polycount > 0 && { face_limit: polycount }),
              ...(quadMesh && { quad: true }),
              ...(smartLowPoly && { smart_low_poly: true }),
              ...(modelSeed != null && { model_seed: modelSeed }),
              ...(imageSeed != null && { image_seed: imageSeed }),
              ...((texOn || pbrOn) && textureSeed != null && { texture_seed: textureSeed }),
              ...(autoSize && { auto_size: true }),
              ...(!exportUv && { export_uv: false }),
            };
          } else {
            const isUltra = meshQ === "ultra" && _isModern;
            body = {
              type: "image_to_model",
              file: { type: "jpg", file_token: imgToken },
              model_version: modelVer,
              ...(negPrompt.trim() && { negative_prompt: negPrompt.trim() }),
              ...(texOn && { texture: true }),
              ...(pbrOn && { pbr: true }),
              ...((texOn || pbrOn) && { texture_quality: tex4K ? "detailed" : "standard" }),
              ...(isUltra && { geometry_quality: "detailed" }),
              ...(makeBetter && { enable_image_autofix: true }),
              ...(polycount > 0 && { face_limit: polycount }),
              ...(quadMesh && { quad: true }),
              ...(smartLowPoly && { smart_low_poly: true }),
              ...(inParts && { generate_parts: true }),
              ...(modelSeed != null && { model_seed: modelSeed }),
              ...(imageSeed != null && { image_seed: imageSeed }),
              ...((texOn || pbrOn) && textureSeed != null && { texture_seed: textureSeed }),
              ...(autoSize && { auto_size: true }),
              ...(!exportUv && { export_uv: false }),
            };
          }
          break;
        case "segment": body = { type: "mesh_segmentation", original_model_task_id: (segId.trim() || srcId) }; break;
        case "fill_parts": body = { type: "mesh_completion", original_model_task_id: (fillId.trim() || srcId) }; break;
        case "retopo":
          if (smartLowPoly) {
            body = { type: "smart_low_poly", original_model_task_id: (retopoId.trim() || srcId), face_limit: polycount > 0 ? polycount : undefined, ...(quadMesh && { quad: true }) };
          } else {
            body = { type: "convert_model", original_model_task_id: (retopoId.trim() || srcId), format: quadMesh ? "fbx" : (outFormat || "glb"), ...(quadMesh && { quad: true }), ...(polycount > 0 && { face_limit: polycount }), ...(pivotToBottom && { pivot_to_center_bottom: true }) };
          }
          break;
        case "texture":
          body = {
            type: "texture_model", original_model_task_id: (texId.trim() || srcId),
            texture_quality: tex4K ? "detailed" : "standard",
            ...(texPbr && { pbr: true }),
            ...(texPrompt.trim() && { prompt: texPrompt.trim() }),
            ...(texNeg.trim() && { negative_prompt: texNeg.trim() }),
            ...((texInputTab === "image" && imgToken) && { file: { type: "png", file_token: imgToken } }),
            ...((texInputTab === "multi" && multiImages.length > 0) && { files: multiImages.map(i => ({ type: "png", file_token: i.token })) }),
            ...(texAlignment && { texture_alignment: texAlignment }),
          };
          break;
        case "texture_edit": body = { type: "texture_edit", original_model_task_id: (editId.trim() || srcId), ...(brushPrompt.trim() && { prompt: brushPrompt.trim() }), creativity_strength: creativity }; break;
        case "animate": body = { type: "animate_retarget", original_model_task_id: riggedId, animation: animSlug, out_format: "glb" }; break;
        default: return;
      }

      setStatusMsg("Starting…");
      const tr = await fetch(BASE_URL + "/api/tripo/task", { method: "POST", headers, body: JSON.stringify(body) });
      const td = await tr.json();
      if (!td.success) {
        const msg = td.message ?? "Task failed";
        const lower = msg.toLowerCase();
        if (lower.includes("insufficient") || lower.includes("credit") || lower.includes("balance")) throw Object.assign(new Error("Insufficient credits. Please top up your balance."), { type: "credits" });
        if (lower.includes("nsfw") || lower.includes("content policy") || lower.includes("moderat")) throw Object.assign(new Error("Content blocked: NSFW or policy violation detected."), { type: "nsfw" });
        throw new Error(msg);
      }

      currentTaskId.current = td.taskId;
      persistGen({ taskId: td.taskId, requestId, mode, prompt: prompt.trim(), modelVer, lastProgress: 0, lastProgressAt: Date.now(), startedAt: Date.now() });
      setStatusMsg("Generating…");
      await pollTask(td.taskId, pt, headers, async d => {
        if (pt.cancelled) return;
        if (currentRequestId.current !== requestId) return;
        const rawUrl = d.modelUrl;
        if (!rawUrl) throw Object.assign(new Error("Generation blocked: content policy or empty output. Credits were not charged."), { type: "nsfw" });
        const blob = await fetchProxy(rawUrl);
        if (pt.cancelled) { revokeBlobUrl(blob); return; }
        revokeBlobUrl(prevUrl.current);
        setModelUrl(blob); prevUrl.current = blob;
        setGenStatus("succeeded"); setProgress(100); setStatusMsg(""); setIsRunning(false);
        currentTaskId.current = null; clearPersistedGen();
        if (!userStoppedRef.current) await saveHist(td.taskId, rawUrl, { prompt: prompt.trim() });
      });
    } catch (e) {
      setIsRunning(false); setProgress(0); setStatusMsg(""); currentTaskId.current = null; clearPersistedGen();
      if (pt.cancelled) { setModelUrl(prevUrl.current); setGenStatus(prevUrl.current ? "succeeded" : "idle"); return; }
      if (e.autoStop) { setModelUrl(prevUrl.current); setGenStatus(prevUrl.current ? "succeeded" : "idle"); setErrorMsg(e.message); return; }
      if (!e.type && e.rawOutput) {
        const reason = (e.rawOutput?.rawOutput?.error_msg ?? e.rawOutput?.rawOutput?.message ?? e.rawOutput?.rawOutput?.reason ?? "").toLowerCase();
        if (reason.includes("nsfw") || reason.includes("content policy") || reason.includes("safety")) { e.type = "nsfw"; e.message = "Content blocked: NSFW or policy violation detected."; }
        else if (reason.includes("insufficient") || reason.includes("credit")) { e.type = "credits"; e.message = "Insufficient credits. Please top up your balance."; }
      }
      const isHardError = e.type === "credits" || e.type === "nsfw";
      setModelUrl(prevUrl.current);
      setGenStatus(prevUrl.current ? "succeeded" : (isHardError ? "idle" : "failed"));
      setErrorMsg(e.message ?? "Network error");
    }
  }, [canGen, mode, genTab, prompt, negPrompt, modelVer, texOn, pbrOn, tex4K, meshQ, polycount, inParts, imgToken, makeBetter, multiImages, batchImages, segId, fillId, retopoId, quadMesh, smartLowPoly, outFormat, pivotToBottom, texId, texPrompt, texNeg, texPbr, texAlignment, editId, brushPrompt, creativity, riggedId, selAnim, tPose, modelSeed, textureSeed, imageSeed, autoSize, exportUv, authH, modelUrl, pollTask, fetchProxy, revokeBlobUrl, saveHist, activeTaskId]);

  const handleAutoRig = useCallback(async () => {
    if (!activeTaskId && !animId) return;
    setErrorMsg(""); setRigStep("rigging");
    if (pollAb.current) pollAb.current.cancelled = true;
    const pt = { cancelled: false }; pollAb.current = pt;
    const srcId = animId.trim() || activeTaskId;
    try {
      const headers = await authH();
      setStatusMsg("Checking animatability…");
      const cr = await fetch(BASE_URL + "/api/tripo/task", { method: "POST", headers, body: JSON.stringify({ type: "animate_prerigcheck", original_model_task_id: srcId }) });
      const cd = await cr.json(); if (!cd.success) throw new Error(cd.message);
      let animatable = false;
      await pollTask(cd.taskId, pt, headers, async d => { animatable = d.rigCheckResult ?? d.rawOutput?.is_animatable ?? false; });
      if (pt.cancelled) return;
      if (!animatable) { setRigStep("idle"); setErrorMsg("Model is not animatable"); setStatusMsg(""); return; }
      setStatusMsg("Rigging…");
      const rr = await fetch(BASE_URL + "/api/tripo/task", { method: "POST", headers, body: JSON.stringify({ type: "animate_rig", original_model_task_id: srcId, out_format: "glb" }) });
      const rd = await rr.json(); if (!rd.success) throw new Error(rd.message);
      await pollTask(rd.taskId, pt, headers, async d => {
        if (pt.cancelled) return;
        const blob = d.modelUrl ? await fetchProxy(d.modelUrl) : null;
        if (pt.cancelled) { revokeBlobUrl(blob); return; }
        if (blob) { revokeBlobUrl(prevUrl.current); setModelUrl(blob); prevUrl.current = blob; }
        setRiggedId(rd.taskId); setRigStep("rigged"); setStatusMsg(""); setGenStatus("succeeded");
      });
    } catch (e) { if (pt.cancelled) return; setRigStep("idle"); setErrorMsg(e.message); setStatusMsg(""); }
  }, [activeTaskId, animId, authH, pollTask, fetchProxy, revokeBlobUrl]);

  const handleStop = useCallback(async () => {
    userStoppedRef.current = true;
    if (pollAb.current) pollAb.current.cancelled = true;
    setIsRunning(false); setProgress(0); setStatusMsg(""); clearPersistedGen();
    const taskId = currentTaskId.current;
    if (taskId) {
      currentTaskId.current = null;
      try {
        const t = getIdToken ? await getIdToken() : "";
        await fetch(BASE_URL + "/api/tripo/task/" + taskId + "/cancel", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t } });
      } catch (err) { console.warn("[handleStop] cancel request failed:", err.message); }
    }
    setModelUrl(prevUrl.current); setGenStatus(prevUrl.current ? "succeeded" : "idle"); setErrorMsg("");
  }, [getIdToken]);

  const loadFirst = useCallback(async () => {
    if (!userId || histInit.current) return;
    histInit.current = true; setHistLoad(true);
    try {
      const { items, lastDoc } = await loadHistoryPageFromFirestore(userId, { limit: PAGE_SIZE, startAfter: null });
      const it = items.filter(i => i.source === "tripo");
      lastDocR.current = lastDoc; setHasMore(it.length === PAGE_SIZE); setHistory(it);
      if (it.length > 0) {
        const l = it[0]; setActiveH(l); setGenStatus("succeeded");
        if (l.model_url) {
          try { const b = await fetchProxy(l.model_url); revokeBlobUrl(prevUrl.current); setModelUrl(b); prevUrl.current = b; }
          catch { setModelUrl(l.model_url); prevUrl.current = l.model_url; }
        }
      }
    } catch (e) { console.error(e); } finally { setHistLoad(false); }
  }, [userId, fetchProxy, revokeBlobUrl]);

  useEffect(() => { if (rightOpen && !histInit.current && userId) loadFirst(); }, [rightOpen, userId, loadFirst]);

  const loadMore = useCallback(async () => {
    if (!userId || moreLoad || !hasMore || !lastDocR.current) return;
    setMoreLoad(true);
    try {
      const { items, lastDoc } = await loadHistoryPageFromFirestore(userId, { limit: PAGE_SIZE, startAfter: lastDocR.current });
      const it = items.filter(i => i.source === "tripo");
      lastDocR.current = lastDoc; setHasMore(it.length === PAGE_SIZE); setHistory(p => [...p, ...it]);
    } catch (e) { console.error(e); } finally { setMoreLoad(false); }
  }, [userId, moreLoad, hasMore]);

  const selHist = useCallback(async (item) => {
    if (histAbort.current) histAbort.current.cancelled = true;
    const t = { cancelled: false }; histAbort.current = t;
    setLoadingId(item.id); setActiveH(item); setGenStatus(item.status);
    if (item.model_url) {
      try {
        const b = await fetchProxy(item.model_url);
        if (!t.cancelled) { revokeBlobUrl(prevUrl.current); setModelUrl(b); prevUrl.current = b; }
        else { revokeBlobUrl(b); }
      } catch (loadErr) {
        console.warn("[selHist] fetchProxy failed, using direct URL:", loadErr.message);
        if (!t.cancelled) { setModelUrl(item.model_url); prevUrl.current = item.model_url; }
      }
    }
    if (!t.cancelled) setLoadingId(null);
  }, [fetchProxy, revokeBlobUrl]);

  const reuse = useCallback((item) => {
    if (item?.prompt) setPrompt(item.prompt);
    if (item?.taskId) { setSegId(item.taskId); setFillId(item.taskId); setRetopoId(item.taskId); setTexId(item.taskId); setAnimId(item.taskId); setEditId(item.taskId); }
    setErrorMsg("");
  }, []);

  const confirmDel = useCallback(async () => {
    if (!toDel) return; setDeleting(true);
    try {
      const headers = await authH();
      const res = await fetch(BASE_URL + "/api/tripo/history/" + toDel.id, { method: "DELETE", headers });
      const d = await res.json();
      if (d.success) {
        const dId = toDel.id, wasA = activeH?.id === dId;
        setHistory(prev => {
          const next = prev.filter(i => i.id !== dId);
          if (wasA) {
            if (next.length === 0) { setActiveH(null); revokeBlobUrl(prevUrl.current); setModelUrl(null); prevUrl.current = null; setGenStatus("idle"); }
            else { const idx = prev.findIndex(i => i.id === dId); setTimeout(() => selHist(next[Math.max(0, idx - 1)]), 0); }
          }
          return next;
        });
      }
    } catch (e) { alert(e.message); } finally { setDeleting(false); setDelModal(false); setToDel(null); }
  }, [toDel, authH, activeH, selHist, revokeBlobUrl]);

  const confirmClr = useCallback(async () => {
    setDeleting(true);
    try {
      const headers = await authH();
      const res = await fetch(BASE_URL + "/api/tripo/history", { method: "DELETE", headers });
      const d = await res.json();
      if (d.success) {
        setHistory([]); setActiveH(null); revokeBlobUrl(prevUrl.current);
        setModelUrl(null); prevUrl.current = null; setGenStatus("idle");
        histInit.current = false; lastDocR.current = null; setHasMore(false);
      }
    } catch (e) { alert(e.message); } finally { setDeleting(false); setClrModal(false); }
  }, [authH, revokeBlobUrl]);

  const camP = useCallback(p => {
    if (sceneRef.current) { setCameraPreset(sceneRef.current, p); setAutoSpin(p === "reset"); sceneRef.current.autoSpin = p === "reset"; }
  }, []);

  const genLabel = useMemo(() => ({
    generate: "Generate Model", segment: "Start Segmenting", fill_parts: "Part Completion",
    retopo: "Retopology", texture: "Generate Texture", texture_edit: "Apply Magic Brush",
    animate: "Apply Animation",
  })[mode] ?? "Generate", [mode]);

  const modeTitle = useMemo(() => ({
    generate: "Generate Model", segment: "Segmentation", fill_parts: "Fill Parts",
    retopo: "Retopology", texture: "3D Model Texture Generator", texture_edit: "Magic Brush",
    animate: "3D Rigging & Animation",
  })[mode] ?? mode, [mode]);

  const genCost = useMemo(() => {
    if (mode === "texture") return tex4K ? 20 : 10;
    if (mode === "retopo") return smartLowPoly ? 10 : 5;
    if (mode !== "generate") return MODE_COST[mode] ?? 10;
    const type = genTab === "text" ? "text_to_model" : genTab === "multi" ? "multiview_to_model" : "image_to_model";
    if (modelVer === "v1.4-20240625") return type === "text_to_model" ? 20 : 30;
    const isP1 = modelVer === "P1-20260311";
    const isText = type === "text_to_model";
    const isModern = modelVer === "P1-20260311" || modelVer.startsWith("v3.");
    const isUltra = meshQ === "ultra" && isModern;
    const base = isP1 ? (isText ? 30 : 40) : (isText ? 10 : 20);
    const hasTex = texOn || pbrOn;
    const texAddon = !hasTex ? 0 : tex4K ? 20 : 10;
    const ultraAddon = isUltra ? 20 : 0;
    const slpCost = smartLowPoly ? 10 : 0;
    const partsCost = inParts ? 20 : 0;
    const quadCost = quadMesh ? 5 : 0;
    return base + texAddon + ultraAddon + slpCost + partsCost + quadCost;
  }, [mode, genTab, texOn, pbrOn, tex4K, meshQ, inParts, quadMesh, smartLowPoly, modelVer]);

  const handleDlClose = useCallback(() => {
    if (dlItem?.blobUrl) revokeBlobUrl(dlItem.blobUrl);
    setDlOpen(false); setDlItem(null);
  }, [dlItem, revokeBlobUrl]);

  return (
    <div className="flex w-full h-full bg-[#0a0a14] text-white overflow-hidden relative selection:bg-primary/30">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Cinematic Background Layer removed for 3D modeling focus */}

      {/* ── LEFT: Tools ── */}
      <div className="" style={{ width: leftOpen ? leftW : 0, minWidth: 0, flexShrink: 0, overflow: "hidden", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", background: "rgba(3,0,10,0.2)", backdropFilter: "blur(60px)", borderRight: "1px solid var(--border)", position: "relative", zIndex: 10 }}>
        <div className="pt-28 lg:pt-32" style={{ width: leftW, display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Narrow icon nav */}
          <div style={{ width: 62, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)" }}>
            {NAV.map(n => {
              const Icon = n.icon;
              const isN = modelVer !== "P1-20260311" && !modelVer.startsWith("v3.");
              const actsAsN = isN && (n.id === "segment" || n.id === "texture_edit" || n.id === "retopo");
              return (
                <Tooltip key={n.id} text={n.label + (actsAsN ? " (Not supported by Model V1/V2)" : "")} side="right">
                  <button onClick={() => !actsAsN && setMode(n.id)} className={"tp-nav-btn" + (mode === n.id ? " active" : "") + (actsAsN ? " model-na" : "")}>
                    <div className="ico"><Icon style={{ width: 18, height: 18, color: mode === n.id ? "var(--accent-bright)" : "var(--text-muted)" }} /></div>
                    <span className="lbl">{n.label}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
          {/* Tool settings */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff", display: "flex", alignItems: "center", gap: 8, fontStyle: "italic" }}>
                <Activity className="w-4 h-4 text-primary opacity-50" />
                {modeTitle}
              </h3>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }} className="tp-scroll">
              {mode === "generate" && <GeneratePanel genTab={genTab} setGenTab={setGenTab} modelVer={modelVer} setModelVer={setModelVer} prompt={prompt} setPrompt={setPrompt} negPrompt={negPrompt} setNegPrompt={setNegPrompt} makeBetter={makeBetter} setMakeBetter={setMakeBetter} imgPrev={imgPrev} setImgPrev={setImgPrev} imgUploading={imgUploading} handleImg={handleImg} meshQ={meshQ} setMeshQ={setMeshQ} inParts={inParts} setInParts={setInParts} privacy={privacy} setPrivacy={setPrivacy} texOn={texOn} setTexOn={setTexOn} tex4K={tex4K} setTex4K={setTex4K} pbrOn={pbrOn} setPbrOn={setPbrOn} polycount={polycount} setPolycount={setPolycount} quadMesh={quadMesh} setQuadMesh={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} tPose={tPose} setTPose={setTPose} modelSeed={modelSeed} setModelSeed={setModelSeed} textureSeed={textureSeed} setTextureSeed={setTextureSeed} imageSeed={imageSeed} setImageSeed={setImageSeed} autoSize={autoSize} setAutoSize={setAutoSize} exportUv={exportUv} setExportUv={setExportUv} multiImages={multiImages} setMultiImages={setMultiImages} batchImages={batchImages} setBatchImages={setBatchImages} handleMultiImg={handleMultiImg} handleBatchImg={handleBatchImg} getIdToken={getIdToken} backendCaps={backendCaps} color={color} isRunning={isRunning} handleGen={handleGen} setErrorMsg={setErrorMsg} />}
              {(mode === "segment" || mode === "fill_parts") && <Segment segSub={mode === "fill_parts" ? "fill_parts" : segSub} activeTaskId={activeTaskId} isRiggedInput={isRiggedInput} color={color} />}
              {mode === "retopo" && <Retopo quad={quadMesh} setQuad={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} polycount={polycount} setPolycount={setPolycount} outFormat={outFormat} setOutFormat={setOutFormat} pivotToBottom={pivotToBottom} setPivotToBottom={setPivotToBottom} activeTaskId={activeTaskId} color={color} />}
              {mode === "texture" && <Texture mode={mode} activeTaskId={activeTaskId} texInputTab={texInputTab} setTexInputTab={setTexInputTab} texPrompt={texPrompt} setTexPrompt={setTexPrompt} imgPrev={imgPrev} imgToken={imgToken} imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef} multiImages={multiImages} setMultiImages={setMultiImages} tex4K={tex4K} setTex4K={setTex4K} pbrOn={texPbr} setPbrOn={setTexPbr} texAlignment={texAlignment} setTexAlignment={setTexAlignment} color={color} />}
              {mode === "texture_edit" && <Texture mode={mode} activeTaskId={activeTaskId} brushMode={brushMode} setBrushMode={setBrushMode} brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt} creativity={creativity} setCreativity={setCreativity} brushColor={brushColor} setBrushColor={setBrushColor} color={color} />}
              {mode === "animate" && <Animate animId={animId} activeTaskId={activeTaskId} animSearch={animSearch} setAnimSearch={setAnimSearch} animCat={animCat} setAnimCat={setAnimCat} selAnim={selAnim} setSelAnim={setSelAnim} animModelVer={animModelVer} setAnimModelVer={setAnimModelVer} filtAnims={filtAnims} rigStep={rigStep} handleAutoRig={handleAutoRig} color={color} />}
            </div>
            <div style={{ padding: "20px 16px 24px", borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
              {isRunning ? (
                <div className="fade-up">
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Loader2 style={{ width: 14, height: 14, color: "var(--accent-bright)" }} className="anim-spin" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-bright)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{progress}% Complete</span>
                    </div>
                  </div>
                  <PBar value={progress} />
                  <button className="tp-gen-btn" onClick={handleStop} style={{ height: 42, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", marginTop: 14, fontSize: 13 }}>
                    Terminálás
                  </button>
                </div>
              ) : (
                <>
                  <button className={"tp-gen-btn" + (canGen ? " go" : " no")} onClick={handleGen} disabled={!canGen} style={{ height: 58, borderRadius: 20 }}>
                    {genLabel}
                    {canGen && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 12, paddingLeft: 12, borderLeft: "1px solid rgba(255,255,255,0.2)" }}>
                        <CoinIcon size={16} /><span style={{ fontSize: 16, fontWeight: 900 }}>{genCost}</span>
                      </div>
                    )}
                  </button>
                  {modelUrl && !isRunning && (
                    <button onClick={() => { setDlItem(null); setDlOpen(true); }}
                      style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 12, fontSize: 11, fontWeight: 800, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", fontFamily: "inherit", transition: "all 0.14s", textTransform: "uppercase", letterSpacing: "0.05em" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}>
                      <Download style={{ width: 13, height: 13 }} /> Export Engine
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Left handle */}
      <div className="tp-handle" onMouseDown={startDrag("left")}>
        <div className="tp-hbtn" onMouseDown={e => e.stopPropagation()} onClick={() => setLeftOpen(v => !v)}>
          {leftOpen ? <ChevronLeft style={{ width: 9, height: 9, color: "#5a5a7a" }} /> : <ChevronRight style={{ width: 9, height: 9, color: "#5a5a7a" }} />}
        </div>
      </div>

      {/* ── CENTER: Viewport ── */}
      <main className="pt-20 lg:pt-24" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "transparent", position: "relative", zIndex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 48, flexShrink: 0, borderBottom: "1px solid var(--border)", background: "rgba(10,10,20,0.8)", backdropFilter: "blur(40px)", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {!leftOpen && <button onClick={() => setLeftOpen(true)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)", color: "#fff", marginRight: 8 }}><ChevronRight style={{ width: 13, height: 13 }} /></button>}
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", marginRight: 6 }}>View</span>
            {VIEW_MODES.map(v => (
              <Tooltip key={v.id} text={v.tip} side="bottom">
                <button onClick={() => setViewMode(v.id)} style={{ padding: "5px 12px", borderRadius: "10px", fontSize: 10, fontWeight: 900, cursor: "pointer", border: "none", background: viewMode === v.id ? "rgba(139, 92, 246, 0.15)" : "transparent", color: viewMode === v.id ? "var(--accent-bright)" : "#475569", outline: viewMode === v.id ? "1px solid rgba(139, 92, 246, 0.3)" : "none", whiteSpace: "nowrap", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s" }}>{v.label}</button>
              </Tooltip>
            ))}
            {modelUrl && <WireframeControl active={wireOv} onToggle={() => setWireOv(v => !v)} opacity={wireOp} onOpacityChange={setWireOp} color={wireC} onColorChange={setWireC} accentColor={color} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <BgColorPicker value={bgColor} onChange={setBgColor} />
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.05)" }} />
            <LightingControls viewMode={viewMode} lightMode={lightMode} setLightMode={setLightMode} lightStrength={lStr} setLightStrength={setLStr} lightRotation={lRot} setLightRotation={setLRot} lightAutoRotate={lAutoR} setLightAutoRotate={setLAutoR} lightAutoRotateSpeed={lAutoS} setLightAutoRotateSpeed={setLAutoS} dramaticColor={dramC} setDramaticColor={setDramC} gridColor1={gc1} setGridColor1={setGc1} gridColor2={gc2} setGridColor2={setGc2} color={color} />
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.05)" }} />
            <IconBtn icon={<Grid3x3 className="w-4 h-4" />} tip="Grid" active={showGrid} color={color} onClick={() => setShowGrid(v => !v)} />
            {!rightOpen && <button onClick={() => setRightOpen(true)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)", color: "#fff" }}><ChevronLeft style={{ width: 13, height: 13 }} /></button>}
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <ThreeViewer color={color} viewMode={viewMode} lightMode={lightMode} showGrid={showGrid} modelUrl={modelUrl} lightStrength={lStr} lightRotation={lRot} lightAutoRotate={lAutoR} lightAutoRotateSpeed={lAutoS} dramaticColor={dramC} wireframeOverlay={wireOv} wireOpacity={wireOp} wireHexColor={wireHex} autoSpin={autoSpin} bgColor={bgColor} gridColor1={gc1} gridColor2={gc2} onSpinStop={() => setAutoSpin(false)} onReady={s => { sceneRef.current = s; }} />

          {/* Loading / Status Overlays with vertical blending sync */}
          <AnimatePresence>
            {(histLoad || (loadingId && !isRunning)) && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(3,0,10,0.4)", backdropFilter: "blur(30px)" }}
              >
                <Loader2 style={{ width: 32, height: 32, color: "var(--accent)", marginBottom: 16 }} className="anim-spin" />
                <p style={{ color: "#fff", fontSize: 11, fontWeight: 900, margin: 0, textTransform: "uppercase", letterSpacing: "0.2em", fontStyle: "italic" }}>
                  {histLoad ? "Synchronizing Archive" : "Fetching Neural Mesh"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(3,0,10,0.6)", backdropFilter: "blur(40px)", pointerEvents: "none" }}
              >
                <div style={{ width: 100, height: 100, borderRadius: 32, marginBottom: 28, background: "rgba(139, 92, 246, 0.1)", border: "1.5px solid rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 50px rgba(139, 92, 246, 0.2)" }}>
                  <Sparkles style={{ width: 40, height: 40, color: "var(--accent-bright)", filter: "drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))" }} className="animate-pulse" />
                </div>
                <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 28, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "-0.02em", fontStyle: "italic" }}>3D Forge Active</h2>
                {statusMsg && <p style={{ color: "var(--accent-bright)", fontSize: 10, margin: "0 0 20px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", opacity: 0.6 }}>{statusMsg}</p>}
                <div style={{ width: 280 }}><PBar value={progress} /></div>
                <p style={{ color: "#fff", fontSize: 16, fontWeight: 900, margin: "12px 0 0", fontFamily: "monospace", letterSpacing: "0.1em" }}>{progress}%</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!isRunning && !modelUrl && !histLoad && !loadingId && (
            <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ textAlign: "center", opacity: 0.2 }}>
                <div style={{ width: 120, height: 120, borderRadius: 40, marginBottom: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                  <Box style={{ width: 48, height: 48, color: "#fff" }} />
                </div>
                <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 900, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.4em", fontStyle: "italic" }}>Forge Foundry</h3>
                <p style={{ color: "#fff", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.5 }}>Neural 3D Engine v4.0</p>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 48, flexShrink: 0, borderTop: "1px solid var(--border)", background: "rgba(3,0,10,0.6)", backdropFilter: "blur(40px)", overflowX: "auto", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", marginRight: 6 }}>Camera</span>
            <IconBtn icon={<RotateCcw className="w-4 h-4" />} tip="Reset" onClick={() => camP("reset")} />
            <IconBtn icon={<Camera className="w-4 h-4" />} tip="Front" onClick={() => camP("front")} />
            <IconBtn icon={<Move3d className="w-4 h-4" />} tip="Side" onClick={() => camP("side")} />
            <IconBtn icon={<Layers className="w-4 h-4" />} tip="Top" onClick={() => camP("top")} />
            <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.05)", margin: "0 8px" }} />
            <button onClick={() => setAutoSpin(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 10, fontSize: 10, fontWeight: 900, cursor: "pointer", border: "none", background: autoSpin ? "rgba(139, 92, 246, 0.15)" : "transparent", color: autoSpin ? "var(--accent-bright)" : "#475569", outline: autoSpin ? "1px solid var(--border-accent)" : "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.2s" }}>
              {autoSpin ? <Square style={{ width: 10, height: 10, fill: "currentColor" }} /> : <Play style={{ width: 10, height: 10, fill: "currentColor" }} />} Auto-spin
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {modelUrl && (
              <button onClick={() => { setDlItem(null); setDlOpen(true); }}
                className="group"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 12, fontSize: 11, fontWeight: 900, color: "#fff", background: "var(--accent)", border: "none", cursor: "pointer", boxShadow: "0 10px 40px rgba(139, 92, 246, 0.4)", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.3s" }}>
                <Download style={{ width: 13, height: 13 }} className="group-hover:-translate-y-0.5 transition-transform" /> Production Export
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Right handle */}
      <div className="tp-handle" onMouseDown={startDrag("right")}>
        <div className="tp-hbtn" onMouseDown={e => e.stopPropagation()} onClick={() => setRightOpen(v => !v)}>
          {rightOpen ? <ChevronRight style={{ width: 9, height: 9, color: "#5a5a7a" }} /> : <ChevronLeft style={{ width: 9, height: 9, color: "#5a5a7a" }} />}
        </div>
      </div>

      {/* ── RIGHT: Archive ── */}
      <div className="" style={{ width: rightOpen ? rightW : 0, minWidth: 0, flexShrink: 0, overflow: "hidden", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", background: "rgba(3,0,10,0.2)", backdropFilter: "blur(60px)", borderLeft: "1px solid var(--border)", position: "relative", zIndex: 10 }}>
        <div className="pt-28 lg:pt-32" style={{ width: rightW, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Clock className="w-4 h-4 text-primary opacity-50" />
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontStyle: "italic" }}>Archive</span>
              <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 900, padding: "2px 10px", borderRadius: 99, background: "rgba(139, 92, 246, 0.1)", color: "var(--accent-bright)", border: "1px solid var(--border-accent)", fontFamily: "monospace" }}>{history.length}{hasMore ? "+" : ""}</span>
            </div>
            <div className="relative">
              <input placeholder="Neural search..." value={histQ} onChange={e => setHistQ(e.target.value)} className="tp-input" style={{ fontSize: 11, paddingRight: 32, height: 40, borderRadius: 12, border: "1px solid var(--border)" }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px", display: "flex", flexDirection: "column", gap: 6 }} className="tp-scroll">
            {histLoad && <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Loader2 style={{ width: 24, height: 24, color: "var(--accent)" }} className="anim-spin" /></div>}
            {!histLoad && filtHist.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12, opacity: 0.3 }}>
                <Box style={{ width: 32, height: 32, color: "#fff" }} />
                <p style={{ color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{histQ ? "Zero matches" : "Empty Archive"}</p>
              </div>
            )}
            {filtHist.map((item, idx) => (
              <div key={item.id} style={{ animationDelay: (Math.min(idx, 6) * 0.04) + "s" }} className="fade-up">
                <HistoryCard
                  item={item} isActive={activeH?.id === item.id} isLoading={loadingId === item.id}
                  disabled={loadingId !== null} onSelect={selHist} onReuse={reuse}
                  onDownload={async (i) => {
                    try { const b = await fetchProxy(i.model_url); setDlItem({ blobUrl: b, item: i }); setDlOpen(true); }
                    catch (e) { alert(e.message); }
                  }}
                  onDelete={i => { setToDel(i); setDelModal(true); }}
                  color={color} getIdToken={getIdToken}
                />
              </div>
            ))}
            {!histQ && hasMore && (
              <button
                onClick={loadMore}
                disabled={moreLoad}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 900,
                  color: "#94a3b8",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                  cursor: moreLoad ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                {moreLoad ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Loader2 style={{ width: 12, height: 12 }} className="anim-spin" />
                    <span>Processing…</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ChevronDown style={{ width: 12, height: 12 }} />
                    <span>More Records</span>
                  </div>
                )}
              </button>
            )}
          </div>
          {history.length > 0 && (
            <div style={{ padding: "12px", borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.1)" }}>
              <button onClick={() => setClrModal(true)}
                className="group"
                style={{ width: "100%", padding: "10px 0", borderRadius: 12, fontSize: 10, fontWeight: 900, color: "#475569", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.2s", textTransform: "uppercase", letterSpacing: "0.1em" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                <Trash2 style={{ width: 11, height: 11 }} className="group-hover:scale-110 transition-transform" /> Purge Records
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={delModal} onClose={() => { if (!deleting) { setDelModal(false); setToDel(null); } }} onConfirm={confirmDel} title="Delete model" message={"Delete \"" + ((toDel?.prompt?.slice(0, 60)) || "") + "…\"?"} confirmText="Delete" confirmColor="#ef4444" isDeleting={deleting} />
      <ConfirmModal isOpen={clrModal} onClose={() => { if (!deleting) setClrModal(false); }} onConfirm={confirmClr} title="Clear history" message={"Delete all " + history.length + " Tripo models?"} confirmText="Clear all" confirmColor="#dc2626" isDeleting={deleting} />
      <DownloadModal isOpen={dlOpen} onClose={handleDlClose} glbBlobUrl={dlItem ? dlItem.blobUrl : modelUrl} scene={sceneRef.current?.scene ?? sceneRef.current} filename={dlItem ? (dlItem.item?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now())) : (activeH?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now()))} color={color} />
    </div>
  );
}