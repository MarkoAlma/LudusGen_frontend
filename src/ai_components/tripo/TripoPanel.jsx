import React, {
  useState, useRef, useCallback, useEffect, useMemo, useContext,
} from "react";
import {
  Download, Loader2, AlertCircle, Trash2, RotateCcw,
  Camera, Move3d, Layers, Play, Square, ChevronRight, ChevronLeft, Box, Zap, ChevronDown,
  Sparkles, Grid3x3, Scissors, PaintBucket,
  Boxes, PersonStanding, Wand2, Activity,
  PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen
} from "lucide-react";

import StudioLayout, { StudioLayoutContext } from "../../components/shared/StudioLayout";
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
import Shared3DHistory from "../../components/shared/Shared3DHistory";
import { getAnimById, ANIMATION_LIBRARY, ANIM_CATEGORIES } from "./animationlibrary";
import { persistGen, loadPersistedGen, updatePersistedProgress, clearPersistedGen } from "./useGenerationPersist";

import GeneratePanel, { MODEL_VERSIONS } from "./GeneratePanel";
import Segment from "./Segment";
import Retopo from "./Retopo";
import Texture from "./Texture";
import Animate from "./Animate";
import { motion, AnimatePresence, animate } from "framer-motion";
import { MyUserContext } from "../../context/MyUserProvider";
import toast from "react-hot-toast";

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
  { id: "refine", label: "Refine", icon: Activity, sub: false },
  { id: "stylize", label: "Stylize", icon: Boxes, sub: false },
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
export default function TripoPanel({ selectedModel, getIdToken, userId, isGlobalOpen }) {
  const color = selectedModel?.color || "#6c63ff";
  const { user, refreshCredits } = useContext(MyUserContext);
  const userCredits = user?.credits ?? 0;

  // Master Sidebar Sync
  useEffect(() => {
    setLeftOpen(isGlobalOpen);
  }, [isGlobalOpen]);

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
  const [refineId, setRefineId] = useState("");
  const [stylizeId, setStylizeId] = useState("");
  const [stylizeStyle, setStylizeStyle] = useState("cartoon");
  const [animId, setAnimId] = useState("");

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

  // layout state (controlled by StudioLayout)
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);

  // history
  const [history, setHistory] = useState([]);
  const [selHistId, setSelHistId] = useState(null);
  const activeH = useMemo(() => history.find(h => h.id === selHistId), [history, selHistId]);
  const activeTaskId = activeH?.task_id || activeH?.id || "";
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingId, setLoadingId] = useState(null);

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

  // panels / modals
  const [dlOpen, setDlOpen] = useState(false);
  const [dlItem, setDlItem] = useState(null);


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
      case "refine": return !!(refineId.trim() || activeTaskId);
      case "stylize": return !!(stylizeId.trim() || activeTaskId);
      case "animate": return !!(riggedId && selAnim);
      default: return false;
    }
  }, [isRunning, mode, genTab, prompt, imgToken, batchImages, segId, fillId, retopoId, activeTaskId, texInputTab, texPrompt, multiImages, editId, texId, refineId, stylizeId]);



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

  // ── Asset upload (GLB/FBX/OBJ) ────────────────────────────────────────
  const [assetUploading, setAssetUploading] = useState(false);
  const assetFileRef = useRef(null);

  const handleAssetUpload = useCallback(async (file) => {
    if (!file) return;
    setAssetUploading(true);
    try {
      const t = getIdToken ? await getIdToken() : "";
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(BASE_URL + "/api/tripo/assets/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + t },
        body: form,
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      toast.success(`Asset uploaded: ${d.filename}`);
      // Reset history state — the existing useEffect will reload
      histInit.current = false;
      lastDocR.current = null;
      setHistory([]);
      setHasMore(false);
    } catch (e) {
      toast.error(`Upload failed: ${e.message}`);
      setErrorMsg("Asset upload failed: " + e.message);
    } finally {
      setAssetUploading(false);
    }
  }, [getIdToken]);

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

  const genCost = useMemo(() => {
    if (mode === "texture") return tex4K ? 20 : 10;
    if (mode === "retopo") return smartLowPoly ? 10 : 5;
    if (mode === "refine") return 30;
    if (mode === "stylize") return 20;
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

  const handleGen = useCallback(async () => {
    if (!canGen) return;

    // Frontend credit check — don't send request if insufficient
    const estimatedCost = genCost;
    if (userCredits < estimatedCost && estimatedCost > 0) {
      toast.error(`Insufficient credits: ${estimatedCost} needed, ${userCredits} available`);
      setErrorMsg(`Insufficient credits. You need ${estimatedCost} credits but have ${userCredits}.`);
      return;
    }

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
        case "refine": body = { type: "refine_model", original_model_task_id: (refineId.trim() || srcId) }; break;
        case "stylize": body = { type: "stylize_model", original_model_task_id: (stylizeId.trim() || srcId), style: stylizeStyle }; break;
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
        refreshCredits?.();
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
      refreshCredits?.();
    }
  }, [canGen, mode, genTab, prompt, negPrompt, modelVer, texOn, pbrOn, tex4K, meshQ, polycount, inParts, imgToken, makeBetter, multiImages, batchImages, segId, fillId, retopoId, quadMesh, smartLowPoly, outFormat, pivotToBottom, texId, texPrompt, texNeg, texPbr, texAlignment, editId, brushPrompt, creativity, riggedId, selAnim, tPose, modelSeed, textureSeed, imageSeed, autoSize, exportUv, authH, modelUrl, pollTask, fetchProxy, revokeBlobUrl, saveHist, activeTaskId, refreshCredits, userCredits, genCost]);

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



  const camP = useCallback(p => {
    if (sceneRef.current) { setCameraPreset(sceneRef.current, p); setAutoSpin(p === "reset"); sceneRef.current.autoSpin = p === "reset"; }
  }, []);

  const genLabel = useMemo(() => ({
    generate: "Generate Model", segment: "Start Segmenting", fill_parts: "Part Completion",
    retopo: "Retopology", texture: "Generate Texture", texture_edit: "Apply Magic Brush",
    refine: "Refine Model", stylize: "Apply Style",
    animate: "Apply Animation",
  })[mode] ?? "Generate", [mode]);

  const modeTitle = useMemo(() => ({
    generate: "Generate Model", segment: "Segmentation", fill_parts: "Fill Parts",
    retopo: "Retopology", texture: "3D Model Texture Generator", texture_edit: "Magic Brush",
    refine: "Model Refinement", stylize: "Style Transfer",
    animate: "3D Rigging & Animation",
  })[mode] ?? mode, [mode]);

  const handleDlClose = useCallback(() => {
    if (dlItem?.blobUrl) revokeBlobUrl(dlItem.blobUrl);
    setDlOpen(false); setDlItem(null);
  }, [dlItem, revokeBlobUrl]);

  return (
    <StudioLayout
      leftOpen={leftOpen}
      setLeftOpen={setLeftOpen}
      leftSecondaryOpen={leftSecondaryOpen}
      setLeftSecondaryOpen={setLeftSecondaryOpen}
      rightOpen={rightOpen}
      setRightOpen={setRightOpen}
      leftWidth={62}
      leftSecondaryWidth={240}
      rightWidth={220}
      leftSidebar={
        <div className="h-full flex flex-col bg-[#030308] border-r border-white/5">
          {NAV.map(n => {
            const Icon = n.icon;
            const isN = modelVer !== "P1-20260311" && !modelVer.startsWith("v3.");
            const actsAsN = isN && (n.id === "segment" || n.id === "texture_edit" || n.id === "retopo");
            return (
              <Tooltip key={n.id} text={n.label + (actsAsN ? " (Not supported by Model V1/V2)" : "")} side="right">
                <button 
                  onClick={() => {
                    if (!actsAsN) {
                      setMode(n.id);
                      setLeftSecondaryOpen(true);
                    }
                  }} 
                  className={"tp-nav-btn" + (mode === n.id ? " active" : "") + (actsAsN ? " model-na" : "")}
                >
                  <div className="ico"><Icon style={{ width: 18, height: 18, color: mode === n.id ? "var(--accent-bright)" : "var(--text-muted)" }} /></div>
                  <span className="lbl">{n.label}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      }
      leftSecondarySidebar={
        <div className="h-full flex flex-col overflow-hidden bg-[#060410]/60 backdrop-blur-3xl">
          <div className="p-4 py-3 border-b border-white/5 flex-shrink-0">
            <h3 className="m-0 text-[13px] font-black tracking-widest uppercase text-white flex items-center gap-2 italic">
              <Activity className="w-4 h-4 text-primary opacity-50" />
              {modeTitle}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 tp-scroll">
            {mode === "generate" && <GeneratePanel genTab={genTab} setGenTab={setGenTab} modelVer={modelVer} setModelVer={setModelVer} prompt={prompt} setPrompt={setPrompt} negPrompt={negPrompt} setNegPrompt={setNegPrompt} makeBetter={makeBetter} setMakeBetter={setMakeBetter} imgPrev={imgPrev} setImgPrev={setImgPrev} imgUploading={imgUploading} handleImg={handleImg} meshQ={meshQ} setMeshQ={setMeshQ} inParts={inParts} setInParts={setInParts} privacy={privacy} setPrivacy={setPrivacy} texOn={texOn} setTexOn={setTexOn} tex4K={tex4K} setTex4K={setTex4K} pbrOn={pbrOn} setPbrOn={setPbrOn} polycount={polycount} setPolycount={setPolycount} quadMesh={quadMesh} setQuadMesh={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} tPose={tPose} setTPose={setTPose} modelSeed={modelSeed} setModelSeed={setModelSeed} textureSeed={textureSeed} setTextureSeed={setTextureSeed} imageSeed={imageSeed} setImageSeed={setImageSeed} autoSize={autoSize} setAutoSize={setAutoSize} exportUv={exportUv} setExportUv={setExportUv} multiImages={multiImages} setMultiImages={setMultiImages} batchImages={batchImages} setBatchImages={setBatchImages} handleMultiImg={handleMultiImg} handleBatchImg={handleBatchImg} getIdToken={getIdToken} backendCaps={backendCaps} color={color} isRunning={isRunning} handleGen={handleGen} setErrorMsg={setErrorMsg} />}
            {(mode === "segment" || mode === "fill_parts") && <Segment segSub={mode === "fill_parts" ? "fill_parts" : segSub} activeTaskId={activeTaskId} isRiggedInput={isRiggedInput} color={color} />}
            {mode === "retopo" && <Retopo quad={quadMesh} setQuad={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} polycount={polycount} setPolycount={setPolycount} outFormat={outFormat} setOutFormat={setOutFormat} pivotToBottom={pivotToBottom} setPivotToBottom={setPivotToBottom} activeTaskId={activeTaskId} color={color} />}
            {mode === "texture" && <Texture mode={mode} activeTaskId={activeTaskId} texInputTab={texInputTab} setTexInputTab={setTexInputTab} texPrompt={texPrompt} setTexPrompt={setTexPrompt} imgPrev={imgPrev} imgToken={imgToken} imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef} multiImages={multiImages} setMultiImages={setMultiImages} tex4K={tex4K} setTex4K={setTex4K} pbrOn={texPbr} setPbrOn={setTexPbr} texAlignment={texAlignment} setTexAlignment={setTexAlignment} color={color} />}
            {mode === "texture_edit" && <Texture mode={mode} activeTaskId={activeTaskId} brushMode={brushMode} setBrushMode={setBrushMode} brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt} creativity={creativity} setCreativity={setCreativity} brushColor={brushColor} setBrushColor={setBrushColor} color={color} />}
            {mode === "animate" && <Animate animId={animId} activeTaskId={activeTaskId} animSearch={animSearch} setAnimSearch={setAnimSearch} animCat={animCat} setAnimCat={setAnimCat} selAnim={selAnim} setSelAnim={setSelAnim} animModelVer={animModelVer} setAnimModelVer={setAnimModelVer} filtAnims={filtAnims} rigStep={rigStep} handleAutoRig={handleAutoRig} color={color} />}
            {mode === "refine" && (
              <div>
                {activeTaskId && (
                  <div className="p-2 px-3 rounded-lg bg-primary/10 border border-primary/25 mb-4">
                    <p className="text-primary font-bold text-[11px] m-0">Selected model</p>
                    <p className="text-[#2d2d48] text-[9px] mt-1 font-mono truncate">{activeTaskId}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3 p-1.5 px-2 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-primary italic">
                  task: "refine_model"
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed mb-4 italic">
                  Enhance mesh quality, fix topology issues, and improve geometry detail. Uses Tripo refine_model (30 credits).
                </p>
                <input
                  className="tp-input"
                  placeholder="Or enter task ID manually..."
                  value={refineId}
                  onChange={e => setRefineId(e.target.value)}
                />
              </div>
            )}
            {mode === "stylize" && (
              <div>
                {activeTaskId && (
                  <div className="p-2 px-3 rounded-lg bg-primary/10 border border-primary/25 mb-4">
                    <p className="text-primary font-bold text-[11px] m-0">Selected model</p>
                    <p className="text-[#2d2d48] text-[9px] mt-1 font-mono truncate">{activeTaskId}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3 p-1.5 px-2 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-primary italic">
                  task: "stylize_model"
                </div>
                <div className="mb-4">
                  <span className="text-zinc-500 text-[11px] font-black uppercase tracking-widest block mb-2 italic">Style Filter</span>
                  <div className="grid grid-cols-2 gap-2">
                    {["cartoon", "clay", "alien", "steampunk", "lego", "voxel", "voronoi", "minecraft", "gold", "ancient_bronze"].map(s => (
                      <button
                        key={s}
                        onClick={() => setStylizeStyle(s)}
                        className={`p-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${stylizeStyle === s ? 'bg-primary/20 text-white border border-primary/50' : 'bg-white/5 text-zinc-600 border border-white/5'}`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  className="tp-input"
                  placeholder="Or enter task ID manually..."
                  value={stylizeId}
                  onChange={e => setStylizeId(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="p-4 py-6 border-t border-white/5 bg-black/20">
            {isRunning ? (
              <div className="fade-up">
                <div className="flex flex-col items-center mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-4 h-4 text-primary anim-spin" />
                    <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] italic">{progress}% Complete</span>
                  </div>
                  <PBar value={progress} />
                </div>
                <button className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all" onClick={handleStop}>
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
                    className="w-full mt-3 py-3 rounded-xl bg-white/5 border border-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:text-white hover:border-white/10 transition-all">
                    <Download className="w-4 h-4" /> Export Engine
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      }
      rightSidebar={
        <div className="h-full flex flex-col bg-[#060410] pt-0">
          <Shared3DHistory
            userId={userId}
            getIdToken={getIdToken}
            color={color}
            activeItemId={activeH?.id}
            loadingId={loadingId}
            refreshTrigger={refreshTrigger}
            onSelect={selHist}
            onReuse={reuse}
            onDownload={async (i) => {
              try { const b = await fetchProxy(i.model_url); setDlItem({ blobUrl: b, item: i }); setDlOpen(true); }
              catch (e) { alert(e.message); }
            }}
          />
        </div>
      }
    >
      <TripoWorkspaceWrapper
        color={color}
        viewMode={viewMode}
        setViewMode={setViewMode}
        lightMode={lightMode}
        setLightMode={setLightMode}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        modelUrl={modelUrl}
        bgColor={bgColor}
        setBgColor={setBgColor}
        lStr={lStr}
        setLStr={setLStr}
        lRot={lRot}
        setLRot={setLRot}
        lAutoR={lAutoR}
        setLAutoR={setLAutoR}
        lAutoS={lAutoS}
        setLAutoS={setLAutoS}
        dramC={dramC}
        setDramC={setDramC}
        gc1={gc1}
        setGc1={setGc1}
        gc2={gc2}
        setGc2={setGc2}
        wireOv={wireOv}
        setWireOv={setWireOv}
        wireOp={wireOp}
        setWireOp={setWireOp}
        wireC={wireC}
        setWireC={setWireC}
        autoSpin={autoSpin}
        setAutoSpin={setAutoSpin}
        loadingId={loadingId}
        isRunning={isRunning}
        statusMsg={statusMsg}
        progress={progress}
        camP={camP}
        sceneRef={sceneRef}
        dlItem={dlItem}
        setDlItem={setDlItem}
        setDlOpen={setDlOpen}
        dlOpen={dlOpen}
        handleDlClose={handleDlClose}
        activeH={activeH}
      />
    </StudioLayout>
  );
}

/**
 * TripoWorkspaceWrapper
 * Consumes StudioLayoutContext to provide zero-rerender HUD tracking
 */
function TripoWorkspaceWrapper({
  color, viewMode, setViewMode, lightMode, setLightMode,
  showGrid, setShowGrid, modelUrl, bgColor, setBgColor,
  lStr, setLStr, lRot, setLRot, lAutoR, setLAutoR, lAutoS, setLAutoS,
  dramC, setDramC, gc1, setGc1, gc2, setGc2, wireOv, setWireOv,
  wireOp, setWireOp, wireC, setWireC, autoSpin, setAutoSpin,
  loadingId, isRunning, statusMsg, progress, camP, sceneRef,
  dlItem, setDlItem, setDlOpen, dlOpen, handleDlClose, activeH
}) {
  const { smoothL, smoothR } = useContext(StudioLayoutContext);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* top hud */}
      <motion.div
        style={{ paddingLeft: smoothL, paddingRight: smoothR }}
        className="flex items-center justify-between h-12 flex-shrink-0 border-b border-white/5 bg-[#0a0a0f] gap-4 relative z-40 px-5"
      >
        <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic mr-4">View Context</span>
          {VIEW_MODES.map(v => (
            <Tooltip key={v.id} text={v.tip} side="bottom">
              <button
                onClick={() => setViewMode(v.id)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === v.id ? 'bg-primary/20 text-white border border-primary/30 shadow-primary-glow' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {v.label}
              </button>
            </Tooltip>
          ))}
          <div className="w-px h-5 bg-white/5 mx-2" />
          {modelUrl && <WireframeControl active={wireOv} onToggle={() => setWireOv(v => !v)} opacity={wireOp} onOpacityChange={setWireOp} color={wireC} onColorChange={setWireC} accentColor={color} />}
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <BgColorPicker value={bgColor} onChange={setBgColor} />
          <div className="w-px h-5 bg-white/5" />
          <LightingControls viewMode={viewMode} lightMode={lightMode} setLightMode={setLightMode} lightStrength={lStr} setLightStrength={setLStr} lightRotation={lRot} setLightRotation={setLRot} lightAutoRotate={lAutoR} setLightAutoRotate={setLAutoR} lightAutoRotateSpeed={lAutoS} setLightAutoRotateSpeed={setLAutoS} dramaticColor={dramC} setDramaticColor={setDramC} gridColor1={gc1} setGridColor1={setGc1} gridColor2={gc2} setGridColor2={setGc2} color={color} />
          <div className="w-px h-5 bg-white/5" />
          <IconBtn icon={<Grid3x3 className="w-4 h-4" />} tip="Grid" active={showGrid} color={color} onClick={() => setShowGrid(v => !v)} />
        </div>
      </motion.div>

      {/* viewport main */}
      <div className="flex-1 relative overflow-hidden">
        <ThreeViewer
          color={color}
          viewMode={viewMode}
          lightMode={lightMode}
          showGrid={showGrid}
          modelUrl={modelUrl}
          lightStrength={lStr}
          lightRotation={lRot}
          lightAutoRotate={lAutoR}
          lightAutoRotateSpeed={lAutoS}
          dramaticColor={dramC}
          wireframeOverlay={wireOv}
          wireOpacity={wireOp}
          wireHexColor={wireC.replace("#", "0x")}
          autoSpin={autoSpin}
          bgColor={bgColor}
          gridColor1={gc1}
          gridColor2={gc2}
          onSpinStop={() => setAutoSpin(false)}
          onReady={s => { sceneRef.current = s; }}
        />

        <AnimatePresence>
          {(loadingId && !isRunning) && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl"
            >
              <Loader2 className="w-8 h-8 text-primary anim-spin mb-4" />
              <p className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">Fetching Spatial Voxel Map</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-3xl pointer-events-none"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-8 shadow-primary-heavy animate-pulse">
                <Sparkles className="w-10 h-10 text-primary shadow-primary-glow" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em] italic mb-2">Nexus Forge Alpha</h2>
              {statusMsg && <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-6 opacity-60 leading-relaxed text-center max-w-xs">{statusMsg}</p>}
              <div className="w-64">
                <PBar value={progress} />
                <p className="text-[14px] font-mono text-white mt-4 text-center tracking-widest">{progress}%</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isRunning && !modelUrl && !loadingId && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none opacity-20">
            <div className="text-center">
              <div className="w-[120px] h-[120px] rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mb-8 shadow-2xl mx-auto">
                <Box className="w-12 h-12 text-zinc-800" />
              </div>
              <h3 className="text-emerald font-black text-[22px] tracking-[0.4em] uppercase italic mb-2">Awaiting Directive</h3>
              <p className="text-zinc-900/40 text-[9px] font-black uppercase tracking-[0.5em] italic">Inhabit the viewport via spatial forge</p>
            </div>
          </div>
        )}
      </div>

      {/* bottom hud */}
      <motion.div
        style={{ paddingLeft: smoothL, paddingRight: smoothR }}
        className="h-14 flex items-center justify-between flex-shrink-0 border-t border-white/5 bg-[#0a0a14]/60 backdrop-blur-3xl relative z-40 px-5"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic mr-4">Orbital Controls</span>
          <div className="flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-white/5 border border-white/5">
            <IconBtn icon={<RotateCcw className="w-4 h-4" />} tip="C-Reset" onClick={() => camP("reset")} />
            <IconBtn icon={<Camera className="w-4 h-4" />} tip="Front" onClick={() => camP("front")} />
            <IconBtn icon={<Move3d className="w-4 h-4" />} tip="Side" onClick={() => camP("side")} />
            <IconBtn icon={<Layers className="w-4 h-4" />} tip="Top" onClick={() => camP("top")} />
          </div>
          <div className="w-px h-5 bg-white/5 mx-2" />
          <button
            onClick={() => setAutoSpin(v => !v)}
            className={`flex items-center gap-2.5 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${autoSpin ? 'bg-primary text-white shadow-primary-glow' : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'}`}
          >
            {autoSpin ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {autoSpin ? "Spin Active" : "Start Spinner"}
          </button>
        </div>
        <div className="flex items-center gap-6">
          {modelUrl && (
            <button
              onClick={() => { setDlItem(null); setDlOpen(true); }}
              className="flex items-center gap-3 px-6 py-2.5 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-widest shadow-primary-heavy hover:scale-105 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" /> Production Export
            </button>
          )}
        </div>
      </motion.div>

      <DownloadModal isOpen={dlOpen} onClose={handleDlClose} glbBlobUrl={dlItem ? dlItem.blobUrl : modelUrl} scene={sceneRef.current?.scene ?? sceneRef.current} filename={dlItem ? (dlItem.item?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now())) : (activeH?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now()))} color={color} />
      
      {/* ── FOOTER: Spatial Logic Stream ── */}
      {activeH && !isRunning && (
        <div className="h-10 bg-[#0a0a0f] border-t border-white/5 px-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50" />
          <div className="relative z-10 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 italic flex items-center gap-2">
            <div className="w-2 h-0.5 bg-primary/30" />
            Spatial Logic Stream v2.4.0
          </div>
          <div className="flex items-center gap-8 relative z-10">
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
              Neural Precision: <span className="text-emerald-500/60">Optimized</span>
            </span>
            <div className="w-[1px] h-3 bg-white/5" />
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">
              Latency: <span className="text-zinc-500">14ms</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}