import React, {
  useState, useRef, useCallback, useEffect, useMemo, useContext, useReducer,
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
import { setCameraPreset, switchAnimationClip } from "../meshy/viewer/threeHelpers";
import { IconBtn, Tooltip } from "../meshy/ui/Primitives";
import LightingControls from "../meshy/viewer/LightingControls";
import {
  VIEW_MODES, WireframeControl, RigControl, BgColorPicker, HistoryCard,
} from "../trellis/.";
import ConfirmModal from "../trellis/ConfirmModal";
import DownloadModal from "../trellis/DownloadModal";
import Shared3DHistory from "../../components/shared/Shared3DHistory";
import { getAnimById, ANIMATION_LIBRARY, ANIM_CATEGORIES } from "./animationlibrary";
import { persistGen, loadPersistedGen, updatePersistedProgress, clearPersistedGen, markHistorySaved, persistActiveTask, removeActiveTask, loadPersistedActiveTasks } from "./useGenerationPersist";

import { useActiveTasksPoller } from "./useActiveTasksPoller";
import { getCachedThumbnail } from "../trellis/Glbthumbnail";
import { useTripoHistory } from "./useTripoHistory";
import { useTripoRig } from "./useTripoRig";
import GeneratePanel, { MODEL_VERSIONS, STYLE_PREFIX } from "./GeneratePanel";
import Segment from "./Segment";
import Retopo from "./Retopo";
import Texture from "./Texture";
import Animate from "./Animate";
import { motion, AnimatePresence, animate } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { MyUserContext } from "../../context/MyUserProvider";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useStudioPanels } from "../../context/StudioPanelContext";
import { useJobs } from "../../context/JobsContext";
import toast from "react-hot-toast";

/* ─── constants ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const POLL_MS = 2500;
const POLL_MAX = 500;

const PROGRESS_JUMP_LIMIT = 30;
const STUCK_THRESHOLD_MS = 300_000;

// Module-level store: survives TripoPanel unmount/remount within the same session tab.
// Replaces sessionStorage — avoids stale URLs on tab duplication and is invisible to React lifecycle.
let _pendingModel = null;   // { url: string, taskId: string } | null
let _selHistId = null;      // string | null

const NAV = [
  { id: "generate", label: "Model", icon: Sparkles, sub: false },
  { id: "segment", label: "Segment", icon: Scissors, sub: true },
  { id: "retopo", label: "Retopo", icon: Grid3x3, sub: false },
  { id: "texture", label: "Texture", icon: PaintBucket, sub: true },
  { id: "refine", label: "Refine", icon: Activity, sub: false },
  { id: "stylize", label: "Stylize", icon: Boxes, sub: false },
  { id: "animate", label: "Animate", icon: PersonStanding, sub: false },
];
// fill_parts is a subtab of segment, not a separate nav item

const SEGMENT_SUBS = [
  { id: "segment", label: "Segment" },
  { id: "fill_parts", label: "Fill Parts" },
];

const TEXTURE_SUBS = [
  { id: "generate", label: "Generate" },
  { id: "paint", label: "Paint" },
];

const MODE_COST = {
  segment: 40,
  fill_parts: 50,
  paint: 10,
  animate: 10,
};

/* ─── CSS ────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  :root {
    --bg-base: #0a0a14;
    --bg-panel: rgba(10, 10, 20, 0.45);
    --bg-surface: rgba(255, 255, 255, 0.025);
    --bg-raised: rgba(255, 255, 255, 0.045);
    --accent: #8b5cf6;
    --accent-bright: #a78bfa;
    --accent-glow: rgba(139, 92, 246, 0.25);
    --text-primary: #f0f0f8;
    --text-secondary: #94a3b8;
    --text-muted: #475569;
    --text-faint: #1e293b;
    --border: rgba(255, 255, 255, 0.06);
    --border-accent: rgba(139, 92, 246, 0.28);
    --error: #ef4444;
    --success: #10b981;
  }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:none } }
  @keyframes pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
  }
  .anim-spin { animation: spin 1s linear infinite; }
  .fade-up   { animation: fadeUp 0.18s ease forwards; }
  .tp-viewport canvas { position: relative !important; z-index: 0 !important; }
  .tp-scroll { scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.06) transparent; }
  .tp-scroll::-webkit-scrollbar { width:3px; }
  .tp-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px; }
  .tp-nav-btn { display:flex;flex-direction:column;align-items:center;gap:5px;width:100%;padding:10px 0;background:none;border:none;cursor:pointer;position:relative;transition:background 0.14s, opacity 0.14s; }
  .tp-nav-btn .ico { width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;transition:background 0.14s, transform 0.14s, box-shadow 0.14s; }
  .tp-nav-btn:hover .ico { background:rgba(255,255,255,0.06); }
  .tp-nav-btn.active .ico { background:rgba(124,111,255,0.22);box-shadow:0 0 12px rgba(124,111,255,0.2); }
  .tp-nav-btn .lbl { font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;transition:color 0.14s; }
  .tp-nav-btn.active .lbl { color:var(--accent-bright); }
  .tp-nav-btn:not(.active) .lbl { color:var(--text-muted); }
  .tp-nav-btn:not(.active):hover .lbl { color:var(--text-secondary); }
  .tp-nav-btn.active::before { content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:26px;background:linear-gradient(180deg,var(--accent-bright),var(--accent));border-radius:0 4px 4px 0;box-shadow:0 0 8px var(--accent-glow); }
  /* Mobile: hide labels in narrow primary nav */
  @media (max-width: 640px) {
    .tp-nav-btn .lbl { display: none; }
    .tp-nav-btn .ico { width: 32px; height: 32px; }
    .tp-nav-btn { padding: 8px 0; }
  }
  .tp-switch { width:36px;height:20px;border-radius:10px;position:relative;transition:background 0.2s;flex-shrink:0;cursor:pointer; }
  .tp-switch::after { content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.4); }
  .tp-switch.on::after { transform:translateX(16px); }
  .tp-input { width:100%;padding:9px 12px;border-radius:10px;font-size:12px;color:var(--text-primary);background:var(--bg-raised);border:1px solid var(--border);outline:none;font-family:inherit;transition:border-color 0.18s,background 0.18s,box-shadow 0.18s;box-sizing:border-box; }
  input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none;margin:0; }
  .tp-input:focus { border-color:var(--border-accent);background:rgba(30,30,54,0.9);box-shadow:0 0 0 3px rgba(139,92,246,0.08); }
  .tp-input::placeholder { color:var(--text-muted); }
  .tp-ta { width:100%;padding:10px 13px;border-radius:11px;font-size:12px;color:var(--text-primary);background:var(--bg-raised);border:1px solid var(--border);outline:none;font-family:inherit;resize:none;line-height:1.6;box-sizing:border-box;transition:border-color 0.18s,box-shadow 0.18s; }
  .tp-ta::placeholder { color:var(--text-muted); }
  .tp-ta:focus { border-color:var(--border-accent);outline:none;box-shadow:0 0 0 3px rgba(139,92,246,0.08); }
  .tp-drop:hover { border-color:rgba(108,99,255,0.4) !important;box-shadow:0 0 12px rgba(108,99,255,0.06); }
  .tp-sub-tab { padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;border:none;transition:background 0.13s, color 0.13s;font-family:inherit; }
  .tp-sub-tab.on { background:rgba(124,111,255,0.25);color:var(--accent-bright);outline:1px solid var(--border-accent); }
  .tp-sub-tab:not(.on) { background:transparent;color:var(--text-muted); }
  .tp-sub-tab:not(.on):hover { color:#5a5a7a;background:rgba(255,255,255,0.04); }
  .tp-inp-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:9px;transition:background 0.18s, color 0.18s, box-shadow 0.18s;font-family:inherit;background:transparent; }
  .tp-inp-tab.active { background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.05); }
  .tp-qual-btn { flex:1;padding:10px 4px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:background 0.18s, color 0.18s, border-color 0.18s;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit; }
  .tp-gen-btn { width:100%;padding:16px 0;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.03em;transition:background 0.22s, transform 0.22s, box-shadow 0.22s;font-family:inherit; }
  .tp-gen-btn.go { background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:#ffffff; box-shadow:0 12px 40px rgba(139,92,246,0.28),0 4px 12px rgba(0,0,0,0.2); }
  .tp-gen-btn.go:hover { box-shadow:0 18px 55px rgba(139,92,246,0.4),0 6px 16px rgba(0,0,0,0.25); transform:translateY(-2px) scale(1.02); }
  .tp-gen-btn.no { background:rgba(255,255,255,0.025); color:var(--text-muted); cursor:not-allowed; border:1px solid var(--border); }
  .tp-model-card { padding:11px 13px;border-radius:11px;background:var(--bg-raised);border:1px solid var(--border);cursor:pointer;transition:background 0.16s, border-color 0.16s, box-shadow 0.16s;margin-bottom:5px;box-shadow:0 1px 3px rgba(0,0,0,0.1); }
  .tp-model-card.sel { background:rgba(124,111,255,0.14);border-color:var(--border-accent);box-shadow:0 0 0 1px rgba(124,111,255,0.18),0 2px 8px rgba(124,111,255,0.08); }
  .tp-model-card:hover:not(.sel) { background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15);box-shadow:0 2px 8px rgba(0,0,0,0.15); }
  .checker { background-color:#131326;background-image:linear-gradient(45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,0.025) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,0.025) 75%);background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0; }
  .anim-card { border-radius:11px;overflow:hidden;cursor:pointer;transition:transform 0.16s, box-shadow 0.16s, border-color 0.16s; }
  .anim-card:hover { border-color:rgba(255,255,255,0.22) !important; transform:scale(1.02);box-shadow:0 4px 12px rgba(0,0,0,0.2); }
  .sec-row { display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:11px 4px;user-select:none;border-radius:8px;transition:background 0.14s; }
  .sec-row span { transition:color 0.14s; }
  .sec-row:hover { background:rgba(255,255,255,0.02); }
  .sec-row:hover span { color:#8a8aaa !important; }
  .tp-topo-btn { flex:1;padding:9px 4px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:background 0.16s, color 0.16s, outline 0.16s;font-family:inherit; }
  .tp-topo-btn.sel { background:rgba(124,111,255,0.2);color:var(--accent-bright);outline:1.5px solid var(--border-accent);box-shadow:0 2px 6px rgba(124,111,255,0.1); }
  .tp-topo-btn:not(.sel) { background:var(--bg-raised);color:var(--text-secondary);outline:1px solid var(--border); }
  .tp-topo-btn:not(.sel):hover { background:rgba(255,255,255,0.07);color:#6a6a8a; }
  .tex-input-box { border:1.5px solid rgba(139,92,246,0.28);border-radius:14px;overflow:hidden;background:rgba(139,92,246,0.03);margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.1); }
  .tex-tab-bar { display:flex;background:rgba(255,255,255,0.05);padding:4px;gap:3px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.15); }
  .tex-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:background 0.18s, color 0.18s, box-shadow 0.18s;font-family:inherit; }
  .tex-tab.on { background:rgba(255,255,255,0.14);box-shadow:0 2px 6px rgba(0,0,0,0.3); }
  .mv-grid { display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:11px; }
  .mv-cell { border-radius:10px;aspect-ratio:1/1;border:1.5px dashed rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:border-color 0.16s,box-shadow 0.16s;position:relative; }
  .mv-cell:hover { border-color:rgba(108,99,255,0.4);box-shadow:0 0 10px rgba(108,99,255,0.06); }
  .magic-mode-tab { flex:1;padding:8px 0;border:none;cursor:pointer;font-size:12px;font-weight:600;border-radius:11px;transition:background 0.18s, color 0.18s, box-shadow 0.18s;font-family:inherit; }
  .magic-mode-tab.on { background:#ffffff;color:#0a0a1a;box-shadow:0 2px 8px rgba(0,0,0,0.3); }
  .magic-mode-tab:not(.on) { background:transparent;color:#5a5a7a; }
  .anim-model-dd { width:100%;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);cursor:pointer;display:flex;align-items:center;gap:8px;transition:border-color 0.16s,box-shadow 0.16s; }
  .anim-model-dd:hover { border-color:rgba(139,92,246,0.35);box-shadow:0 0 10px rgba(139,92,246,0.05); }
  .auto-rig-btn { width:100%;padding:13px 0;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;transition:background 0.2s, transform 0.2s, box-shadow 0.2s; }
  .auto-rig-btn.ready { background:rgba(255,255,255,0.08);color:#c8c8e0;box-shadow:0 2px 8px rgba(0,0,0,0.1); }
  .auto-rig-btn.ready:hover { background:rgba(255,255,255,0.12);box-shadow:0 4px 12px rgba(0,0,0,0.15); transform:translateY(-1px); }
  .auto-rig-btn.disabled { background:rgba(255,255,255,0.03);color:#1e1e38;cursor:not-allowed; }

  /* ── Model-NA: feature not available with selected model ─────────────
   * Wrapper dims the child UI and blocks all pointer interaction.
   * Title tooltip on the wrapper still describes why it's disabled.
   * ─────────────────────────────────────────────────────────────────── */
  .model-na {
    opacity: 0.35;
    cursor: not-allowed !important;
    transition: opacity 0.15s;
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
export default function TripoPanel({ selectedModel, getIdToken, userId, isGlobalOpen, toggleGlobalSidebar, globalSidebar }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const color = selectedModel?.color || "#475569";
  const { user, refreshCredits } = useContext(MyUserContext);
  const userCredits = user?.credits ?? 0;

  // ── responsive breakpoints ──────────────────────────────────────────
  const isMobile640 = useMediaQuery("(max-width: 640px)");
  const isTablet1024 = useMediaQuery("(max-width: 1024px)");
  // Use context-driven breakpoints on mobile/tablet, local on desktop
  const { isMobile: ctxMobile, isTablet: ctxTablet, registerPanel, unregisterPanel, togglePanel } = useStudioPanels();
  const isMobile = ctxMobile || isMobile640;
  const isTablet = ctxTablet || isTablet1024;

  const { jobs, addJob, updateJob, markJobDone, markJobDoneAndSeen, markJobError, registerCancelHandler, unregisterCancelHandler } = useJobs();

  // Register panels with centralized manager
  useEffect(() => {
    registerPanel('L1');
    registerPanel('L2');
    registerPanel('R');
    return () => {
      unregisterPanel('L1');
      unregisterPanel('L2');
      unregisterPanel('R');
    };
  }, [registerPanel, unregisterPanel]);

  // Responsive sidebar widths
  const leftW = isMobile ? 48 : isTablet ? 52 : 62;
  // On mobile, secondary and right sidebars are full-width overlays
  const leftSecondaryW = isMobile ? Math.min(window.innerWidth - 48, 320) : isTablet ? 220 : 240;
  const rightW = isMobile ? Math.min(window.innerWidth - 48, 320) : isTablet ? 220 : 280;

  // Master Sidebar Sync
  useEffect(() => {
    setLeftOpen(isGlobalOpen);
  }, [isGlobalOpen]);

  // nav — persist active tab across refresh
  const [mode, setMode] = useState(() => {
    const m = sessionStorage.getItem("tripo_mode") || "generate";
    if (m === "fill_parts") return "segment";
    if (m === "texture_paint") return "texture";
    return m;
  });
  const [segSub, setSegSub] = useState(() => sessionStorage.getItem("tripo_mode") === "fill_parts" ? "fill_parts" : "segment");
  const [texSub, setTexSub] = useState(() => sessionStorage.getItem("tripo_mode") === "texture_paint" ? "paint" : "generate");

  useEffect(() => {
    let finalMode = mode;
    if (mode === "segment" && segSub === "fill_parts") finalMode = "fill_parts";
    if (mode === "texture" && texSub === "paint") finalMode = "texture_paint";
    sessionStorage.setItem("tripo_mode", finalMode);
  }, [mode, segSub, texSub]);

  // generate
  const [genTab, setGenTab] = useState("image");
  const [modelVer, setModelVer] = useState(MODEL_VERSIONS[0].id);
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [aiSuggestedNeg, setAiSuggestedNeg] = useState("");
  const [makeBetter, setMakeBetter] = useState(true);
  const [meshQ, setMeshQ] = useState("standard");
  const [inParts, setInParts] = useState(false);
  const [privacy, setPrivacy] = useState("public");
  const [texOn, setTexOn] = useState(true);
  const [tex4K, setTex4K] = useState(true);
  const [pbrOn, setPbrOn] = useState(false);
  const [genStatus, setGenStatus] = useState("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [pendingCountdown, setPendingCountdown] = useState(null);
  const pendingTaskRef = useRef(null);
  const [multiImages, setMultiImages] = useState([]);
  const [batchImages, setBatchImages] = useState([]);
  const [imgFile, setImgFile] = useState(null);
  const [imgPrev, setImgPrev] = useState(null);
  const [imgToken, setImgToken] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);

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

  // Style prefix — only one active at a time
  const [activeStyle, setActiveStyle] = useState("");
  const handleStyleToggle = useCallback((id) => {
    setActiveStyle(prev => prev === id ? "" : id);
  }, []);

  // task id inputs
  const [segId, setSegId] = useState("");
  const [fillId, setFillId] = useState("");
  const [retopoId, setRetopoId] = useState("");
  const [texId, setTexId] = useState("");
  const [editId, setEditId] = useState("");
  const [refineId, setRefineId] = useState("");
  const [stylizeId, setStylizeId] = useState("");
  const [stylizeStyle, setStylizeStyle] = useState("lego");
  const [animId, setAnimId] = useState("");

  // animate
  const [animModelVer, setAnimModelVer] = useState("v1");
  const [animSearch, setAnimSearch] = useState("");
  const [animCat, setAnimCat] = useState("all");
  const [selAnim, setSelAnim] = useState(new Set());
  const [rigBtnLocked, setRigBtnLocked] = useState(false);
  const [rigStep, setRigStep] = useState("idle");
  const [riggedId, setRiggedId] = useState(null);
  const riggedIdRef = useRef(null);
  useEffect(() => { riggedIdRef.current = riggedId; }, [riggedId]);
  const [rigType, setRigType] = useState("biped");
  const [rigSpec, setRigSpec] = useState("tripo");
  const [detectedRigType, setDetectedRigType] = useState(null);
  const [detectedRigModelVer, setDetectedRigModelVer] = useState(null);
  const [detectedRigSpec, setDetectedRigSpec] = useState(null);
  const [rigCompat, setRigCompat] = useState(null);
  const [animOutFormat, setAnimOutFormat] = useState("glb");
  const [animBakeAnimation, setAnimBakeAnimation] = useState(true);
  const [animExportGeometry, setAnimExportGeometry] = useState(true);
  const [animAnimateInPlace, setAnimAnimateInPlace] = useState(false);

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
  const [showRig, setShowRig] = useState(false);
  const [animClips, setAnimClips] = useState([]);
  const [activeClipIdx, setActiveClipIdx] = useState(0);
  const [lStr, setLStr] = useState(1.0);
  const [lRot, setLRot] = useState(0);
  const [lElev, setLElev] = useState(45);
  const [lAutoR, setLAutoR] = useState(false);
  const [lAutoS, setLAutoS] = useState(0.5);
  const [dramC, setDramC] = useState("#4400ff");
  const [gc1, setGc1] = useState("#1e1e3a");
  const [gc2, setGc2] = useState("#111128");

  // layout state (controlled by StudioLayout)
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftSecondaryOpen, setLeftSecondaryOpen] = useState(true);

  // model name (optional — auto-filled from first 2 prompt words if empty)
  const [modelName, setModelName] = useState("");

  // history — persist selected model across refresh
  const [history, setHistory] = useState([]);
  const [optimisticItems, setOptimisticItems] = useState([]);
  const [selHistId, setSelHistId] = useState(() => _selHistId || null);
  const selHistIdRef = useRef(selHistId);
  useEffect(() => {
    selHistIdRef.current = selHistId;
    _selHistId = selHistId || null;
  }, [selHistId]);
  // Load pending model URL written by onParallelTaskSuccess when panel was unmounted
  useEffect(() => {
    const pending = _pendingModel;
    if (!pending) return;
    _pendingModel = null;
    if (!pending.url) return;
    // Only load if viewer is currently empty (don't override user's selection)
    if (!modelUrl) {
      setModelUrl(pending.url);
      setGenStatus("succeeded");
    }
    if (pending.taskId) {
      setSelHistId(`tripo_${pending.taskId}`);
    }
  }, []);

  const activeH = useMemo(() => history.find(h => h.id === selHistId), [history, selHistId]);
  const activeTaskId = activeH?.taskId || activeH?.task_id || activeH?.id || "";
  const activeTaskIdRef = useRef(activeTaskId);
  activeTaskIdRef.current = activeTaskId;
  const historyRef = useRef(history);
  historyRef.current = history;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Pre-set loadingId when a model is expected on mount (URL param or saved session)
  // so ThreeViewer never mounts and shows the placeholder before the real model loads.
  const [loadingId, setLoadingId] = useState(() =>
    (searchParams.get("tripoTaskId") || _selHistId)
      ? "__url_pending__" : null
  );

  const isSegOutput = activeH?.mode === "segment";
  const hasTexture = activeH?.params?.texture === true;

  // Segment highlight state controlled manually via top-right toggle
  const [segmentHighlight, setSegmentHighlight] = useState(false);

  // texture mode options
  const [texInputTab, setTexInputTab] = useState("image");
  const [texPrompt, setTexPrompt] = useState("");
  const [texNeg, setTexNeg] = useState("");
  const [texPbr, setTexPbr] = useState(false);
  const [texAlignment, setTexAlignment] = useState("original_image");

  // texture_edit — Magic Brush (viewport inpainting)
  const [brushMode, setBrushMode] = useState("Gen Mode");
  const [brushPrompt, setBrushPrompt] = useState("");
  const [creativity, setCreativity] = useState(0.6);
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(10);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [brushHardness, setBrushHardness] = useState(80);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // panels / modals
  const [dlOpen, setDlOpen] = useState(false);
  const [dlItem, setDlItem] = useState(null);


  const histAbort = useRef(null);
  const histInit = useRef(false);
  const sceneRef = useRef(null);
  const pollAb = useRef(null);
  const prevUrl = useRef(null);

  // ── Parallel task tracking ───────────────────────────────────────────
  const activeTasksRef = useRef(new Map());
  const [_taskTick, forceUpdate] = useReducer(x => x + 1, 0);
  const [focusedInstanceId, setFocusedInstanceId] = useState(null);
  const fileRef = useRef(null);
  const currentTaskId = useRef(null);
  const currentRequestId = useRef(null);
  const userStoppedRef = useRef(false);
  // Holds a taskId from ?tripoTaskId= URL param until history loads and we can auto-select it
  const pendingUrlTaskId = useRef(searchParams.get("tripoTaskId") || null);
  // Tracks the last taskId we wrote to the URL ourselves — prevents the URL-watcher
  // effect from re-selecting the old item during the render cycle between saveHist
  // updating activeTaskId and syncSelHist updating the URL param.
  const programmaticUrlRef = useRef(null);



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

  // NOTE: sidebar canvas event bindings removed — painting happens directly on the
  // 3D viewport via ThreeViewer's raycaster and _paintCanvas.

  /* ── Helper: get mask blob from ThreeViewer's internal paint canvas ── */
  const getMaskBlob = useCallback(() => {
    const canvas = sceneRef.current?._paintCanvas;
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, [sceneRef]);

  const PARALLEL_LIMIT = 10;

  const canGen = useMemo(() => {
    const running = [...activeTasksRef.current.values()]
      .filter(t => t.status === "running" || t.status === "pending").length;
    if (running >= PARALLEL_LIMIT) return false;

    switch (mode) {
      case "generate":
        return genTab === "text" ? !!prompt.trim()
          : (batchImages?.length > 0 && batchImages.every(i => i.token));
      case "segment":
        if (segSub === "fill_parts") {
          return isSegOutput && !!(fillId.trim() || activeTaskId);
        }
        return !!(segId.trim() || activeTaskId);
      case "retopo": return !!(retopoId.trim() || activeTaskId);
      case "texture":
        return !!(texId.trim() || activeTaskId) &&
          (texInputTab === "text" ? !!texPrompt.trim() : multiImages.length > 0);
      case "texture_edit":
        return !!(editId.trim() || activeTaskId) &&
          (brushMode === "Paint Mode" || !!brushPrompt.trim());
      case "refine": {
        if (!refineId.trim() && activeH?.params?.texture === true) return false;
        return !!(refineId.trim() || activeTaskId);
      }
      case "stylize": return !!(stylizeId.trim() || activeTaskId);
      case "animate": return !!riggedId && selAnim.size > 0;
      default: return false;
    }
  }, [mode, genTab, prompt, batchImages, segId, fillId, retopoId, isSegOutput,
    texId, texInputTab, texPrompt, multiImages, editId, brushMode, brushPrompt,
    refineId, stylizeId, riggedId, selAnim, activeTaskId, activeH, focusedInstanceId, _taskTick]);



  const authH = useCallback(async () => {
    const t = getIdToken ? await getIdToken() : "";
    return { "Content-Type": "application/json", Authorization: "Bearer " + t };
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

  const handleImg = useCallback(async (file) => {
    if (!file) {
      setImgFile(null); setImgPrev(null); setImgToken(null);
      return;
    }
    setImgFile(file); setImgToken(null); setErrorMsg("");
    const r = new FileReader(); 
    r.onload = e => setImgPrev(e.target.result); 
    r.readAsDataURL(file);
    setImgUploading(true);
    try {
      const t = getIdToken ? await getIdToken() : "";
      const form = new FormData(); form.append("file", file);
      const res = await fetch(BASE_URL + "/api/tripo/upload", { 
        method: "POST", 
        headers: { Authorization: "Bearer " + t }, 
        body: form 
      });
      const d = await res.json(); 
      if (!d.success) throw new Error(d.message); 
      setImgToken(d.imageToken);
    } catch (e) { 
      setErrorMsg("Upload failed: " + e.message); 
      setImgFile(null); setImgPrev(null); 
    }
    finally { setImgUploading(false); }
  }, [getIdToken]);

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
      setHistory([]);
    } catch (e) {
      toast.error(`Upload failed: ${e.message}`);
      setErrorMsg("Asset upload failed: " + e.message);
    } finally {
      setAssetUploading(false);
    }
  }, [getIdToken]);

  const pollTask = useCallback(async (taskId, pt, headers, onSuccess, { skipJumpCheck = false, onProgress = null } = {}) => {
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
      if (!skipJumpCheck && d.status !== "success" && prog - prevProgress > PROGRESS_JUMP_LIMIT) {
        throw Object.assign(new Error(`Auto-stopped: suspicious progress jump (${prevProgress}% → ${prog}%)`), { type: "auto_stop", autoStop: true });
      }
      if (d.status !== "success") {
        if (prog > 0 && prog === prevProgress) {
          if (!stuckSince) stuckSince = Date.now();
          else if (Date.now() - stuckSince > STUCK_THRESHOLD_MS)
            throw Object.assign(new Error("Auto-stopped: stuck at " + prog + "% for 5min"), { type: "auto_stop", autoStop: true });
        } else {
          stuckSince = null;
        }
      }
      if (d.status !== "success" && d.status !== "failed" && d.status !== "cancelled") {
        const dp = Math.min(prog, 99); setProgress(dp); updatePersistedProgress(dp); prevProgress = prog;
        if (dp >= 95) setStatusMsg("Finalizing…");
        if (onProgress) onProgress(dp);
      }
      if (d.status === "success") {
        // prerigcheck tasks don't return a model — they only set rigCheckResult
        if (!d.modelUrl && d.rigCheckResult === null) {
          throw Object.assign(new Error("Content blocked by Tripo. Credits were not charged."), { type: "nsfw" });
        }
        await onSuccess(d); return;
      }
      if (d.status === "failed" || d.status === "cancelled") {
        console.warn("[pollTask] failed rawOutput:", d.rawOutput);
        throw Object.assign(new Error("Task " + d.status), { tripoStatus: d.status, rawOutput: d });
      }
    }
    throw new Error("Timeout");
  }, []);

  const fetchProxy = useCallback(async (rawUrl, taskId = null, retries = 3) => {
    let lastErr;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1200 * attempt));
        const t = await getIdToken();
        const proxyUrl = BASE_URL + "/api/tripo/model-proxy?url=" + encodeURIComponent(rawUrl) + (taskId ? `&taskId=${taskId}` : "");
        const res = await fetch(proxyUrl, { headers: { Authorization: "Bearer " + t }, signal: AbortSignal.timeout(45_000) });
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

  // Page-reload resume — check task status first, only poll if still running
  useEffect(() => {
    const persisted = loadPersistedGen();
    if (!persisted) return;
    // Restore mode and rig state
    if (persisted.mode && persisted.mode !== "generate") {
      if (persisted.mode === "fill_parts") { setMode("segment"); setSegSub("fill_parts"); }
      else setMode(persisted.mode);
    }
    if (persisted.riggedId && persisted.riggedId !== "auto-detected" && persisted.riggedId.length > 10) {
      setRiggedId(persisted.riggedId);
      setRigStep("rigged");
    }
    const requestId = crypto.randomUUID(); currentRequestId.current = requestId;
    const pt = { cancelled: false }; pollAb.current = pt;

    const opType = persisted.opType ?? "generate";

    // Show appropriate loading state immediately
    if (opType === "rig") {
      setRigStep("rigging"); setStatusMsg("Resuming rig…"); setProgress(persisted.lastProgress ?? 0);
    } else {
      if (persisted.lastProgress != null && persisted.lastProgress < 100) {
        setIsRunning(true); setProgress(persisted.lastProgress); setStatusMsg("Resuming…");
      }
    }

    (async () => {
      try {
        const t = getIdToken ? await getIdToken() : "";
        const headers = { "Content-Type": "application/json", Authorization: "Bearer " + t };
        const res = await fetch(BASE_URL + "/api/tripo/task/" + persisted.taskId, { headers });
        if (pt.cancelled) return;
        const d = await res.json();
        if (!d.success) throw new Error(d.message ?? "Task check failed");

        // Inline success handler for resume — handles all opTypes
        const onSuccess = async (sd) => {
          if (pt.cancelled) return;
          if (opType === "rig") {
            const blob = sd.modelUrl ? await fetchProxy(sd.modelUrl, persisted.taskId) : null;
            if (pt.cancelled) { revokeBlobUrl(blob); return; }
            if (blob) { revokeBlobUrl(prevUrl.current); setModelUrl(blob); prevUrl.current = blob; }
            setRiggedId(persisted.taskId); setRigStep("rigged"); setShowRig(true);
            setStatusMsg(""); setGenStatus("succeeded");

            if (sd.modelUrl && blob) {
              try {
                const buf = await fetch(blob).then(r => r.arrayBuffer());
                await getCachedThumbnail(buf, { width: 280, height: 280 }, sd.modelUrl);
              } catch { }
            }

            if (!persisted.savedToHistory && sd.modelUrl) {
              markHistorySaved();
              const _ni = await saveRigHist(persisted.taskId, sd.modelUrl, { prompt: "auto-rig", originalModelTaskId: persisted.mode === "animate" ? persisted.taskId : undefined, rigModelVer: persisted.rigModelVer, rigType: persisted.rigType, rigSpec: persisted.rigSpec });
              if (_ni) { syncSelHist(_ni); getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { })); }
            }
            currentTaskId.current = null; clearPersistedGen();
          } else if (opType === "animate") {
            const animatedModels = Array.isArray(sd.rawOutput?.animated_models) ? sd.rawOutput.animated_models : null;
            const rawUrl = sd.modelUrl ?? (animatedModels ? animatedModels[0] : null);
            if (!rawUrl) throw Object.assign(new Error("Content blocked."), { type: "nsfw" });
            const blob = await fetchProxy(rawUrl, persisted.taskId);
            if (pt.cancelled) { revokeBlobUrl(blob); return; }
            revokeBlobUrl(prevUrl.current);
            setModelUrl(blob); prevUrl.current = blob;
            setGenStatus("succeeded"); setProgress(100); setStatusMsg(""); setIsRunning(false);
            setRiggedId(persisted.taskId); setShowRig(true);

            if (rawUrl && blob) {
              try {
                const buf = await fetch(blob).then(r => r.arrayBuffer());
                await getCachedThumbnail(buf, { width: 280, height: 280 }, rawUrl);
              } catch { }
            }

            if (!persisted.savedToHistory) {
              markHistorySaved();
              const _ni = await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? "animation", animated: true });
              if (_ni) { syncSelHist(_ni); getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { })); }
            }
            currentTaskId.current = null; clearPersistedGen();
          } else if (opType === "segment" || opType === "fill_parts") {
            const rawUrl = sd.modelUrl;
            if (rawUrl) {
              const blob = await fetchProxy(rawUrl, persisted.taskId).catch(() => null);
              if (!pt.cancelled && blob) { revokeBlobUrl(prevUrl.current); setModelUrl(blob); prevUrl.current = blob; }
              else if (blob) revokeBlobUrl(blob);
            }
            setGenStatus("succeeded"); setProgress(100); setStatusMsg(""); setIsRunning(false);
            if (!persisted.savedToHistory && rawUrl) {
              markHistorySaved();
              const _ni = await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? (opType === "fill_parts" ? "part completion" : "segmentation"), mode: opType });
              if (_ni) { syncSelHist(_ni); getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => {})); }
            }
            currentTaskId.current = null; clearPersistedGen();
          } else {
            // generate, retopo, texture, stylize, refine, fill
            const rawUrl = sd.modelUrl;
            if (!rawUrl) throw Object.assign(new Error("Content blocked."), { type: "nsfw" });
            const blob = await fetchProxy(rawUrl, persisted.taskId);
            if (pt.cancelled) { revokeBlobUrl(blob); return; }
            revokeBlobUrl(prevUrl.current);
            setModelUrl(blob); prevUrl.current = blob;
            setGenStatus("succeeded"); setProgress(100); setStatusMsg(""); setIsRunning(false);
            currentTaskId.current = null; clearPersistedGen();

            if (rawUrl && blob) {
              try {
                const buf = await fetch(blob).then(r => r.arrayBuffer());
                await getCachedThumbnail(buf, { width: 280, height: 280 }, rawUrl);
              } catch { }
            }

            if (!persisted.savedToHistory && rawUrl) {
              markHistorySaved();
              const _ni = await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? "" });
              if (_ni) { syncSelHist(_ni); getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { })); }
            }
          }
        };

        if (d.status === "success" && (d.modelUrl || opType === "segment" || opType === "fill_parts")) {
          await onSuccess(d);
        } else if (d.status === "failed" || d.status === "cancelled") {
          setIsRunning(false); setProgress(0); setStatusMsg("");
          if (opType === "rig") setRigStep("idle");
          currentTaskId.current = null; clearPersistedGen();
          setGenStatus("failed"); setErrorMsg("Task " + d.status);
        } else {
          if (opType === "rig") {
            setRigStep("rigging"); setStatusMsg("Resuming rig…");
          } else {
            setIsRunning(true); setProgress(d.progress ?? persisted.lastProgress ?? 0);
            setStatusMsg(`Resuming ${opType}…`);
          }
          currentTaskId.current = persisted.taskId; userStoppedRef.current = false;
          await pollTask(persisted.taskId, pt, headers, onSuccess, { skipJumpCheck: opType === "animate" || opType === "rig" });
        }
      } catch (e) {
        if (pt.cancelled) { setGenStatus(prevUrl.current ? "succeeded" : "idle"); return; }
        setIsRunning(false); setProgress(0); setStatusMsg("");
        if (persisted.opType === "rig") setRigStep("idle");
        currentTaskId.current = null; clearPersistedGen();
        setGenStatus(e.autoStop ? "idle" : "failed"); setErrorMsg(e.message ?? "Resumed operation failed");
      }
    })();
    return () => { pt.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page-reload resume for parallel tasks — restore persisted active tasks into Map
  useEffect(() => {
    const persisted = loadPersistedActiveTasks();
    if (!persisted || persisted.length === 0) return;
    const resumable = persisted.filter(t => t.status === "running" && t.taskId);
    if (resumable.length === 0) return;
    for (const t of resumable) {
      activeTasksRef.current.set(t.instanceId, t);
    }
    if (resumable.length > 0) {
      setFocusedInstanceId(resumable[resumable.length - 1].instanceId);
      forceUpdate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { saveHist, saveRigHist } = useTripoHistory({
    userId, prompt, negPrompt, mode, modelVer, activeStyle, history, histInit,
    setOptimisticItems, setHistory, setSelHistId,
  });

  const generateAIName = useCallback(async (basePrompt, type, animLabel = "") => {
    if (!basePrompt?.trim()) return null;
    try {
      const tok = await getIdToken();
      const systemPrompt = "You are a concise 3D asset naming assistant. Reply with ONLY the asset name — no quotes, no explanation, no punctuation at the end. Max 4 words.";
      const userMsg = type === "rig"
        ? `Name this rigged character based on: "${basePrompt}". Format: "[Name]: rigged"`
        : type === "animation"
          ? `Name this animation based on model: "${basePrompt}", animation: "${animLabel}". Format: "[Name] - [AnimationName]"`
          : `Name this 3D model based on: "${basePrompt}"`;
      const res = await fetch(`${BASE_URL}/api/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          provider: "groq",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
          max_tokens: 32,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const name = data?.content?.trim().replace(/^["']|["']$/g, "");
      return name || null;
    } catch {
      return null;
    }
  }, [getIdToken]);

  const genCost = useMemo(() => {
    if (mode === "texture") {
      if (texSub === "paint") return MODE_COST.paint;
      return tex4K ? 20 : 10;
    }
    if (mode === "retopo") return smartLowPoly ? 10 : 5;
    if (mode === "refine") return 30;
    if (mode === "stylize") return 20;
    if (mode === "segment") return MODE_COST[segSub] ?? MODE_COST.segment;
    if (mode !== "generate") return MODE_COST[mode] ?? 10;
    const type = genTab === "text" ? "text_to_model" : genTab === "multi" ? "multiview_to_model" : "image_to_model";
    // P1-20260311 fails for text_to_model — auto-switched to v3.1, so use v3.1 pricing
    const effectiveVer = (genTab === "text" && modelVer === "P1-20260311") ? "v3.1-20260211" : modelVer;
    if (effectiveVer === "v1.4-20240625") return type === "text_to_model" ? 20 : 30;
    const isP1 = effectiveVer === "P1-20260311";
    const isText = type === "text_to_model";
    const isModern = effectiveVer === "P1-20260311" || effectiveVer.startsWith("v3.");
    const isUltra = meshQ === "ultra" && isModern;
    const base = isP1 ? (isText ? 30 : 40) : (isText ? 10 : 20);
    const hasTex = texOn || pbrOn;
    const texAddon = !hasTex ? 0 : tex4K ? 20 : 10;
    const ultraAddon = isUltra ? 20 : 0;
    const slpCost = smartLowPoly ? 10 : 0;
    const partsCost = inParts ? 20 : 0;
    const quadCost = quadMesh ? 5 : 0;
    return base + texAddon + ultraAddon + slpCost + partsCost + quadCost;
  }, [mode, texSub, genTab, texOn, pbrOn, tex4K, meshQ, inParts, quadMesh, smartLowPoly, modelVer]);

  const syncSelHist = useCallback((entry) => {
    if (!entry) return;
    setSelHistId(entry.id);
    programmaticUrlRef.current = entry.taskId || null;
    if (entry.taskId) setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tripoTaskId", entry.taskId); return n; }, { replace: true });
    else setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("tripoTaskId"); return n; }, { replace: true });
  }, [setSearchParams]);

  const handleGen = useCallback(async () => {
    if (!canGen) return;

    // Frontend credit check — don't send request if insufficient
    const estimatedCost = genCost;
    if (userCredits < estimatedCost && estimatedCost > 0) {
      toast.error(`Insufficient credits: ${estimatedCost} needed, ${userCredits} available`);
      setErrorMsg(`Insufficient credits. You need ${estimatedCost} credits but have ${userCredits}.`);
      return;
    }

    setGenStatus("pending"); setErrorMsg("");
    const srcId = activeTaskId;
    const animSlugs = [...selAnim].map(id => getAnimById(id)?.slug).filter(Boolean);
    const animSlug = animSlugs.length === 1 ? animSlugs[0] : null;
    try {
      let body;

      /* ── texture paint: upload mask from canvas before building body ── */
      let maskToken = null;
      if (mode === "texture" && texSub === "paint") {
        try {
          const maskBlob = await getMaskBlob();
          if (maskBlob && maskBlob.size > 0) {
            const t = getIdToken ? await getIdToken() : "";
            const maskForm = new FormData();
            maskForm.append("file", maskBlob, "mask.png");
            const maskRes = await fetch(BASE_URL + "/api/tripo/upload", {
              method: "POST",
              headers: { Authorization: "Bearer " + t },
              body: maskForm,
            });
            const maskData = await maskRes.json();
            if (maskData.success) {
              maskToken = maskData.imageToken;
            }
          }
        } catch (e) {
          console.warn("[TripoPanel] Mask upload failed, continuing without mask:", e.message);
        }
      }

      // P1-20260311 consistently fails for text_to_model ("Failed to call LLM API").
      // Safety net: force v3.1 at submission time if text_to_model with P1.
      const effectiveModel = (genTab === "text" && modelVer === "P1-20260311")
        ? "v3.1-20260211" : modelVer;
      const _isModern = effectiveModel === "P1-20260311" || effectiveModel.startsWith("v3.");
      // Build style prefix for text_to_model
      const styleObj = STYLE_PREFIX.find(s => s.id === activeStyle);
      const stylePrefix = (genTab === "text" && styleObj) ? styleObj.prefix : "";
      switch (mode) {
        case "generate":
          if (genTab === "text") {
            const isUltra = meshQ === "ultra" && _isModern;
            body = {
              type: "text_to_model", prompt: stylePrefix + prompt.trim(), model_version: effectiveModel,
              ...(negPrompt.trim() && { negative_prompt: negPrompt.trim() }),
              ...(tPose && { t_pose: true }),
              texture: texOn,
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
            const isP1 = effectiveModel === "P1-20260311";
            body = {
              type: "multiview_to_model",
              files: multiImages.map(i => ({ type: "png", file_token: i.token })),
              model_version: effectiveModel,
              ...(negPrompt.trim() && !isP1 && { negative_prompt: negPrompt.trim() }),
              ...(tPose && { t_pose: true }),
              texture: texOn,
              ...(pbrOn && { pbr: true }),
              ...((texOn || pbrOn) && { texture_quality: tex4K ? "detailed" : "standard" }),
              ...(!isP1 && isUltra && { geometry_quality: "detailed" }),
              ...(polycount > 0 && { face_limit: polycount }),
              // P1-20260311 does NOT support quad, smart_low_poly, generate_parts, geometry_quality
              ...(!isP1 && quadMesh && { quad: true }),
              ...(!isP1 && smartLowPoly && { smart_low_poly: true }),
              ...(!isP1 && inParts && { generate_parts: true }),
              ...(modelSeed != null && { model_seed: modelSeed }),
              ...(imageSeed != null && { image_seed: imageSeed }),
              ...((texOn || pbrOn) && textureSeed != null && { texture_seed: textureSeed }),
              ...(autoSize && { auto_size: true }),
              ...(!exportUv && { export_uv: false }),
            };
          } else {
            // Unify Single and Batch images
            const isUltra = meshQ === "ultra" && _isModern;
            const isP1 = effectiveModel === "P1-20260311";
            
            // Collect all image tokens from batchImages state
            const tokens = (batchImages ?? []).filter(i => i.token).map(i => i.token);
            if (tokens.length === 0) return;

            body = {
              type: "image_to_model",
              model_version: effectiveModel,
              ...(negPrompt.trim() && !isP1 && { negative_prompt: negPrompt.trim() }),
              ...(tPose && { t_pose: true }),
              texture: texOn,
              ...(pbrOn && { pbr: true }),
              ...((texOn || pbrOn) && { texture_quality: tex4K ? "detailed" : "standard" }),
              ...(!isP1 && isUltra && { geometry_quality: "detailed" }),
              ...(makeBetter && { enable_image_autofix: true }),
              ...(polycount > 0 && { face_limit: polycount }),
              ...(!isP1 && quadMesh && { quad: true }),
              ...(!isP1 && smartLowPoly && { smart_low_poly: true }),
              ...(!isP1 && inParts && { generate_parts: true }),
              ...(modelSeed != null && { model_seed: modelSeed }),
              ...(imageSeed != null && { image_seed: imageSeed }),
              ...((texOn || pbrOn) && textureSeed != null && { texture_seed: textureSeed }),
              ...(autoSize && { auto_size: true }),
              ...(!exportUv && { export_uv: false }),
            };

            // Requirement: 1 -> images: [], >1 -> batch_images: []
            if (tokens.length === 1) {
              body.images = tokens;
            } else {
              body.batch_images = tokens;
            }
          }
          break;
        case "segment": {
          if (segSub === "fill_parts") {
            body = { type: "mesh_completion", original_model_task_id: (fillId.trim() || srcId) };
          } else {
            const _segSrc = history.find(h => h.taskId === (segId.trim() || srcId));
            const _segName = _segSrc?.name || _segSrc?.prompt || "";
            body = { type: "mesh_segmentation", original_model_task_id: (segId.trim() || srcId), _sourceName: _segName };
          }
          break;
        }
        case "retopo": {
          const _retopoSrc = history.find(h => h.taskId === (retopoId.trim() || srcId));
          const _retopoName = _retopoSrc?.name || _retopoSrc?.prompt || "";
          body = {
            type: "convert_model",
            original_model_task_id: (retopoId.trim() || srcId),
            format: quadMesh ? "fbx" : (outFormat || "glb"),
            ...(quadMesh && { quad: true }),
            ...(polycount > 0 && { face_limit: polycount }),
            ...(pivotToBottom && !smartLowPoly && { pivot_to_center_bottom: true }),
            ...(smartLowPoly && { smart_low_poly: true }),
            _sourceName: _retopoName,
          };
          break;
        }
        case "texture":
          if (texSub === "paint") {
            body = {
              type: "texture_model",
              original_model_task_id: (editId.trim() || srcId),
              texture_quality: tex4K ? "detailed" : "standard",
              ...(brushPrompt.trim() && { prompt: brushPrompt.trim() }),
              ...(texPbr && { pbr: true }),
              ...(maskToken && { file: { type: "png", file_token: maskToken } }),
            };
          } else {
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
          }
          break;
        case "refine": body = { type: "refine_model", draft_model_task_id: (refineId.trim() || srcId) }; break;
        case "stylize": body = { type: "stylize_model", original_model_task_id: (stylizeId.trim() || srcId), style: stylizeStyle }; break;
        case "animate": {
          const baseModelId = riggedId || activeH?.params?.originalModelTaskId || activeTaskId;
          const commonParams = {
            type: "animate_retarget",
            original_model_task_id: baseModelId,
            out_format: animOutFormat || "glb",
            bake_animation: animBakeAnimation,
            animate_in_place: animAnimateInPlace,
            export_with_geometry: animExportGeometry,
          };
          if (animSlugs.length > 1) {
            body = { ...commonParams, animations: animSlugs };
          } else {
            body = { ...commonParams, animation: animSlugs[0] };
          }
          break;
        }
        default: return;
      }

      // Generate instanceId and label
      const instanceId = crypto.randomUUID();
      const effectiveOpType = mode === "segment" ? segSub : mode;
      const genCount = [...activeTasksRef.current.values()].filter(t => t.mode === mode).length;
      const label = `${mode.charAt(0).toUpperCase() + mode.slice(1)} #${genCount + 1}`;

      // Optimistic map entry
      activeTasksRef.current.set(instanceId, {
        instanceId,
        taskId: null,
        mode,
        opType: effectiveOpType,
        label,
        status: "pending",
        progress: 0,
        errorMsg: null,
        result: null,
        startedAt: Date.now(),
        snapshot: body,
        originalTaskId: activeTaskId || null,
        // animate_retarget metadata for onParallelTaskSuccess
        animSlugs: mode === "animate" ? animSlugs : undefined,
        riggedId: mode === "animate" ? (riggedId || activeTaskId || null) : undefined,
      });
      setFocusedInstanceId(instanceId);
      addJob({ id: instanceId, panelType: "tripo", title: label, status: "queued", progress: 0, countdown: 3, createdAt: Date.now(), updatedAt: Date.now() });
      forceUpdate();

      // 3s cancellable window before sending to Tripo
      const CANCEL_WINDOW = 3;
      let cancelled = false;
      setPendingCountdown(CANCEL_WINDOW);
      pendingTaskRef.current = { instanceId, cancelled: false };
      registerCancelHandler(instanceId, () => { if (pendingTaskRef.current) pendingTaskRef.current.cancelled = true; });

      await new Promise((resolve) => {
        let remaining = CANCEL_WINDOW;
        const tick = setInterval(() => {
          remaining -= 1;
          if (pendingTaskRef.current?.cancelled) {
            clearInterval(tick);
            cancelled = true;
            setPendingCountdown(null);
            pendingTaskRef.current = null;
            resolve();
            return;
          }
          if (remaining <= 0) {
            clearInterval(tick);
            setPendingCountdown(null);
            updateJob(instanceId, { countdown: null });
            pendingTaskRef.current = null;
            resolve();
          } else {
            setPendingCountdown(remaining);
            updateJob(instanceId, { countdown: remaining });
          }
        }, 1000);
      });
      unregisterCancelHandler(instanceId);

      if (cancelled) {
        // Remove the optimistic entry without submitting
        activeTasksRef.current.delete(instanceId);
        markJobError(instanceId, "Cancelled");
        forceUpdate();
        return;
      }

      try {
        const headers = await authH();
        const tr = await fetch(BASE_URL + "/api/tripo/task", { method: "POST", headers, body: JSON.stringify(body) });
        const td = await tr.json();

        if (!td.success) {
          const msg = td.message ?? "Task failed";
          const lower = msg.toLowerCase();
          if (lower.includes("insufficient") || lower.includes("credit") || lower.includes("balance")) throw Object.assign(new Error("Nincs elég Tripo kredit. Tölts fel a fiókodba!"), { type: "credits" });
          if (lower.includes("nsfw") || lower.includes("content policy") || lower.includes("moderat")) throw Object.assign(new Error("Tartalom blokkolva: NSFW vagy irányelvek megsértése."), { type: "nsfw" });
          throw new Error(msg);
        }

        const current = activeTasksRef.current.get(instanceId);
        if (current) {
          if (td.taskIds && Array.isArray(td.taskIds)) {
            // Batch response: Multiple task IDs
            td.taskIds.forEach((taskId, idx) => {
              const subInstanceId = idx === 0 ? instanceId : crypto.randomUUID();
              const subLabel = `Generate #${genCount + idx + 1}`;
              
              if (idx === 0) {
                // Update primary instance
                activeTasksRef.current.set(instanceId, { ...current, taskId, status: "running", label: subLabel });
                persistActiveTask({ ...activeTasksRef.current.get(instanceId) });
                updateJob(instanceId, { status: "running", progress: 0, taskId, title: subLabel });
              } else {
                // Create extra instances for other batch items
                const subTask = {
                  ...current,
                  instanceId: subInstanceId,
                  taskId,
                  label: subLabel,
                  status: "running",
                  progress: 0,
                  startedAt: Date.now(),
                };
                activeTasksRef.current.set(subInstanceId, subTask);
                persistActiveTask(subTask);
                addJob({
                  id: subInstanceId,
                  panelType: "tripo",
                  title: subLabel,
                  status: "running",
                  progress: 0,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                });
              }
            });
          } else {
            // Single task ID response
            activeTasksRef.current.set(instanceId, { ...current, taskId: td.taskId, status: "running" });
            persistActiveTask({ ...activeTasksRef.current.get(instanceId) });
            updateJob(instanceId, { status: "running", progress: 0, taskId: td.taskId });
          }
        }
        forceUpdate();
      } catch (e) {
        const current = activeTasksRef.current.get(instanceId);
        if (current) {
          activeTasksRef.current.set(instanceId, { ...current, status: "failed", errorMsg: e.message ?? "Network error" });
        }
        markJobError(instanceId, e.message ?? "Network error");
        forceUpdate();
        refreshCredits?.();
        if (!e.type) toast.error(e.message ?? "Task létrehozása sikertelen.");
        else if (e.type === "credits") toast.error("Nincs elég Tripo kredit. Tölts fel a fiókodba!");
        else if (e.type === "nsfw") toast.error("Tartalom blokkolva: NSFW vagy irányelvek megsértése.");
      }
    } catch (e) {
      // Body-building errors (mask upload, switch default already returns early)
      console.warn("[handleGen] Unexpected error during body construction:", e.message);
      setErrorMsg(e.message ?? "Generation setup failed");
    }
  }, [canGen, mode, genTab, prompt, negPrompt, modelVer, texOn, pbrOn, tex4K, meshQ, polycount, inParts, makeBetter, multiImages, batchImages, segId, fillId, retopoId, quadMesh, smartLowPoly, outFormat, pivotToBottom, texId, texPrompt, texNeg, texPbr, texAlignment, editId, brushPrompt, creativity, riggedId, selAnim, tPose, modelSeed, textureSeed, imageSeed, autoSize, exportUv, authH, fetchProxy, revokeBlobUrl, activeTaskId, refreshCredits, refineId, stylizeId, stylizeStyle, getMaskBlob, getIdToken, history, syncSelHist, forceUpdate, persistActiveTask, addJob, updateJob, markJobError]);

  const { rigCompatRef, getCompatibility, handleAutoRig } = useTripoRig({
    activeTaskId, animId, authH, pollTask, fetchProxy, revokeBlobUrl,
    saveRigHist, generateAIName, getIdToken,
    rigSpec, animOutFormat, rigType, animModelVer, animBakeAnimation, animExportGeometry, animAnimateInPlace,
    history, prompt, syncSelHist,
    addJob, updateJob, markJobDoneAndSeen, markJobError,
    pollAb, prevUrl, currentTaskId, userStoppedRef,
    setRigBtnLocked, setErrorMsg, setRigCompat, setRigStep,
    setDetectedRigModelVer, setDetectedRigType, setDetectedRigSpec,
    setStatusMsg, setModelUrl, setRiggedId, setShowRig, setGenStatus,
    setOptimisticItems, setHistory,
  });

  const handleStop = useCallback(async (instanceId) => {
    const id = instanceId ?? focusedInstanceId;
    const inst = id ? activeTasksRef.current.get(id) : null;
    const stopMsg = "Task will finish on Tripo servers — credits will be used";

    if (!inst) {
      // Fallback: single-task (rig) path — no instanceId in activeTasksRef
      const singleTaskId = currentTaskId.current;
      if (pollAb.current) pollAb.current.cancelled = true;
      userStoppedRef.current = true;
      setStatusMsg(stopMsg);
      if (singleTaskId) {
        try {
          const t = getIdToken ? await getIdToken() : "";
          await fetch(`${BASE_URL}/api/tripo/task/${singleTaskId}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
          });
        } catch (err) { console.warn("[handleStop] cancel request failed:", err.message); }
      }
      return;
    }

    activeTasksRef.current.set(id, {
      ...inst,
      _cancelled: true,
      status: "failed",
      errorMsg: stopMsg,
    });
    removeActiveTask(id);
    markJobError(id, stopMsg);
    forceUpdate();

    if (inst.taskId) {
      try {
        const t = getIdToken ? await getIdToken() : "";
        await fetch(`${BASE_URL}/api/tripo/task/${inst.taskId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        });
      } catch (err) { console.warn("[handleStop] cancel request failed:", err.message); }
    }
  }, [focusedInstanceId, getIdToken, forceUpdate, markJobError, currentTaskId, pollAb, userStoppedRef, setStatusMsg]);

  // ── Parallel task poller callbacks ──────────────────────────────────────
  const onParallelTaskSuccess = useCallback(async (inst, d, blobUrl) => {
    if (blobUrl) {
      // Only update viewer if user hasn't manually selected a different history item
      const thisOptimisticId = `tripo_${inst.taskId}`;
      const currentSel = selHistIdRef.current;
      const isThisTaskSelected = !currentSel || currentSel === thisOptimisticId;
      if (isThisTaskSelected) {
        revokeBlobUrl(prevUrl.current);
        setModelUrl(blobUrl);
        prevUrl.current = blobUrl;
        setGenStatus("succeeded");
      }

      // Prime thumbnail cache so HistoryCard renders instantly (no blank placeholder)
      if (d.modelUrl) {
        try {
          const buf = await fetch(blobUrl).then(r => r.arrayBuffer());
          await getCachedThumbnail(buf, { width: 280, height: 280 }, d.modelUrl);
        } catch { /* non-critical — HistoryCard will regenerate on miss */ }
      }

      // Free the blob if not showing it in the viewer
      if (!isThisTaskSelected) revokeBlobUrl(blobUrl);
    }
    markJobDone(inst.instanceId, { title: inst.label, progress: 100, taskId: inst.taskId, modelUrl: d.modelUrl ?? null });

    // Persist the durable Firestore URL so TripoPanel can load it on next mount.
    // Blob URLs are revoked on unmount and must not be stored here.
    if (d.modelUrl) {
      _pendingModel = { url: d.modelUrl, taskId: inst.taskId };
    }

    refreshCredits?.();

    // Optimistic entry so Shared3DHistory shows card immediately (before Firestore round-trip)
    if (d.modelUrl && inst.taskId) {
      const stableDocId = `tripo_${inst.taskId}`;
      setOptimisticItems(prev => [
        {
          id: stableDocId,
          taskId: inst.taskId,
          status: "succeeded",
          model_url: d.modelUrl,
          source: "tripo",
          mode: inst.mode,
          ts: Date.now(),
          prompt: inst.snapshot?.prompt || inst.snapshot?._sourceName || inst.mode,
          params: inst.mode === "animate" ? { animated: true, originalModelTaskId: inst.riggedId || inst.originalTaskId || null } : undefined,
          createdAt: { toDate: () => new Date() },
        },
        ...prev.filter(o => o.id !== stableDocId),
      ]);
    }

    try {
      const isAnimate = inst.mode === "animate";
      if (isAnimate) {
        // animate_retarget — save each animated_model URL as a separate history entry
        const animatedModels = Array.isArray(d.rawOutput?.animated_models) ? d.rawOutput.animated_models : null;
        const urlsToSave = animatedModels ?? (d.modelUrl ? [d.modelUrl] : []);
        const animSlugs = inst.animSlugs ?? [];
        const srcItem = history.find(h => h.taskId === inst.riggedId) || history.find(h => h.taskId === inst.originalTaskId);
        const baseName = (srcItem?.name || srcItem?.prompt || "model").trim().split(/\s+/).slice(0, 2).join(" ");
        for (let i = 0; i < urlsToSave.length; i++) {
          const url = urlsToSave[i];
          if (!url) continue;
          const slug = animSlugs[i] ?? animSlugs[0] ?? null;
          const label = slug ?? "animation";
          const animSuffix = (slug || label).split(":").pop().toLowerCase();
          const animTypePart = animSuffix.charAt(0).toUpperCase() + animSuffix.slice(1);
          const ni = await saveHist(inst.taskId, url, {
            prompt: label,
            name: `${animTypePart}/${baseName}`,
            animation: slug,
            animated: true,
            animationName: label,
            animations: animSlugs.length > 1 ? animSlugs : undefined,
            animationIndex: animSlugs.length > 1 ? i : undefined,
            originalModelTaskId: inst.riggedId || inst.originalTaskId || null,
          });
          if (ni) {
            syncSelHist(ni);
            try {
              const tok = await getIdToken();
              await fetch(`${BASE_URL}/api/tripo/task/${inst.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } });
            } catch { /* non-critical */ }
          }
        }
      } else {
        const _sourceName = inst.snapshot?._sourceName || "";
        const _modeLabel = inst.mode === "segment" ? "Segmentation" : inst.mode === "retopo" ? "Retopo" : "";
        const ni = await saveHist(inst.taskId, d.modelUrl, {
          prompt: inst.snapshot?.prompt || _sourceName || inst.label,
          name: _sourceName ? (_modeLabel ? `${_modeLabel}/${_sourceName}` : _sourceName) : undefined,
          label: inst.label,
          mode: inst.mode,
          modelVer: inst.snapshot?.model_version ?? undefined,
          ...(inst.snapshot?.texture === true && { texture: true }),
        });
        if (ni) {
          syncSelHist(ni);
          try {
            const tok = await getIdToken();
            await fetch(`${BASE_URL}/api/tripo/task/${inst.taskId}/ack`, {
              method: "POST",
              headers: { Authorization: `Bearer ${tok}` },
            });
          } catch { /* non-critical */ }
        }
      }
    } catch (e) {
      console.error("[onParallelTaskSuccess] saveHist failed:", e?.message ?? e);
    }
  }, [saveHist, syncSelHist, getIdToken, refreshCredits, revokeBlobUrl, markJobDone, setOptimisticItems, history]);

  const onParallelTaskFail = useCallback((inst, reason) => {
    markJobError(inst.instanceId, reason);
    toast.error(`${inst.label ?? inst.mode}: ${reason}`);
    refreshCredits?.();
  }, [refreshCredits, markJobError]);

  // ── Parallel task poller ─────────────────────────────────────────────────
  useActiveTasksPoller({
    activeTasksRef,
    forceUpdate,
    getIdToken,
    fetchProxy,
    revokeBlobUrl,
    refreshCredits,
    onTaskSuccess: onParallelTaskSuccess,
    onTaskFail: onParallelTaskFail,
    onTaskProgress: useCallback((instanceId, prog) => {
      updateJob(instanceId, { status: "running", progress: prog });
    }, [updateJob]),
  });

  const selHist = useCallback(async (item) => {
    if (histAbort.current) histAbort.current.cancelled = true;
    const t = { cancelled: false }; histAbort.current = t;
    setLoadingId(item.id); setSelHistId(item.id); setGenStatus(item.status);
    programmaticUrlRef.current = item?.taskId || null;
    if (item?.taskId) setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tripoTaskId", item.taskId); return n; }, { replace: true });
    else setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("tripoTaskId"); return n; }, { replace: true });
    // Show textures by default when loading from archive (base color mode)
    setViewMode("uv");
    // Populate ALL mode-specific IDs so segment/retopo/texture/etc. work immediately
    if (item?.taskId) {
      setSegId(item.taskId); setFillId(item.taskId); setRetopoId(item.taskId);
      setTexId(item.taskId); setAnimId(item.taskId); setEditId(item.taskId);
      setRefineId(item.taskId); setStylizeId(item.taskId);
    }
    // Restore rig state when loading a rigged history item
    const isRigItem = item?.mode === "rig" || item?.params?.rigged === true || item?.params?.type === "animate_rig";
    const isAnimItem = item?.params?.animated === true || item?.params?.type === "animate_retarget";
    if (isRigItem || isAnimItem) {
      // For animation items the riggedId points to the source rig, not the animation task itself
      const rigId = isAnimItem
        ? (item.params?.originalModelTaskId || item.taskId)
        : item.taskId;
      setRiggedId(rigId || null);
      setRigStep("rigged");
      setShowRig(true);
      setDetectedRigModelVer(item.params?.rigModelVer ?? null);
      setDetectedRigType(item.params?.rigType ?? null);
      setDetectedRigSpec(item.params?.rigSpec ?? null);
      // Restore animation selection if this is an animated model
      if (item?.params?.animations && item.params.animations.length > 0) {
        // Multi-animation restore
        const ids = item.params.animations
          .map(slug => ANIMATION_LIBRARY.find(a => a.slug === slug)?.id)
          .filter(Boolean);
        setSelAnim(new Set(ids));
      } else if (item?.params?.animation) {
        // Single-animation restore (legacy)
        const anim = ANIMATION_LIBRARY.find(a => a.slug === item.params.animation);
        setSelAnim(anim ? new Set([anim.id]) : new Set());
      } else {
        setSelAnim(new Set());
      }
    } else {
      setRiggedId(null);
      setRigStep("idle");
      setShowRig(false);
      setSelAnim(new Set());
      setDetectedRigModelVer(null);
      setDetectedRigType(null);
      setDetectedRigSpec(null);
    }
    if (item.model_url) {
      try {
        const b = await fetchProxy(item.model_url, item.taskId);
        if (!t.cancelled) { revokeBlobUrl(prevUrl.current); setModelUrl(b); prevUrl.current = b; }
        else { revokeBlobUrl(b); }
      } catch (loadErr) {
        console.warn("[selHist] fetchProxy failed, using direct URL:", loadErr.message);
        if (!t.cancelled) { setModelUrl(item.model_url); prevUrl.current = item.model_url; }
      }
    }
    if (!t.cancelled) setLoadingId(null);
  }, [fetchProxy, revokeBlobUrl, setSearchParams]);


  // Called by Shared3DHistory once when the first Firestore snapshot arrives.
  // Restores the previously selected item from URL param or saved sessionStorage id.
  const onHistoryLoad = useCallback((items) => {
    // URL param takes priority over sessionStorage
    const urlTaskId = pendingUrlTaskId.current;
    const item = urlTaskId
      ? items.find(i => i.taskId === urlTaskId || i.id === urlTaskId)
      : _selHistId
        ? items.find(i => i.id === _selHistId)
        : null;
    if (!item) { setLoadingId(null); return; }
    pendingUrlTaskId.current = null;
    selHist(item);
  }, [selHist]);

  const reuse = useCallback((item) => {
    const styleObj = STYLE_PREFIX.find(s => s.id === item?.styleId);
    const rawPrompt = styleObj?.prefix && item?.prompt?.startsWith(styleObj.prefix)
      ? item.prompt.slice(styleObj.prefix.length)
      : (item?.prompt || "");
    setPrompt(rawPrompt);
    setNegPrompt(item?.negPrompt || "");
    if (item?.taskId) {
      setSegId(item.taskId); setFillId(item.taskId); setRetopoId(item.taskId);
      setTexId(item.taskId); setAnimId(item.taskId); setEditId(item.taskId);
      setRefineId(item.taskId); setStylizeId(item.taskId);
    }
    setActiveStyle(item?.styleId || "");
    setErrorMsg("");
  }, []);

  // Reset rigCompat when srcId changes — restore from cache if present
  useEffect(() => {
    const srcId = animId.trim() || activeTaskId;
    if (!srcId) { setRigCompat(null); return; }
    const cached = rigCompatRef.current[srcId];
    setRigCompat(cached !== undefined ? cached : null);
  }, [animId, activeTaskId]);

  // Rig auto-detection callback — passed to TripoWorkspaceWrapper so it can access riggedIdRef
  const onRigDetected = useCallback((count) => {
    if (riggedIdRef && !riggedIdRef.current && activeTaskId) {
      setRiggedId(activeTaskId);
    }
  }, [activeTaskId]);



  const camP = useCallback(p => {
    if (sceneRef.current) { setCameraPreset(sceneRef.current, p); setAutoSpin(p === "reset"); sceneRef.current.autoSpin = p === "reset"; }
  }, []);

  const handleAnimClipsDetected = useCallback((clips) => {
    setAnimClips(clips);
    setActiveClipIdx(0);
  }, []);

  const handleSwitchClip = useCallback((idx) => {
    if (sceneRef.current) {
      switchAnimationClip(sceneRef.current, idx);
      setActiveClipIdx(idx);
    }
  }, []);

  const genLabel = useMemo(() => {
    if (mode === "segment") return segSub === "fill_parts" ? "Part Completion" : "Start Segmenting";
    if (mode === "texture") return texSub === "paint" ? "Apply Magic Brush" : "Generate Texture";
    return ({
      generate: "Generate Model",
      retopo: "Retopology",
      refine: "Refine Model", stylize: "Apply Style",
      animate: "Apply Animation",
    })[mode] ?? "Generate";
  }, [mode, segSub, texSub]);

  const modeTitle = useMemo(() => {
    if (mode === "segment") return segSub === "fill_parts" ? "Fill Parts" : "Segmentation";
    if (mode === "texture") return texSub === "paint" ? "Magic Brush" : "3D Model Texture Generator";
    return ({
      generate: "Generate Model",
      retopo: "Retopology",
      refine: "Model Refinement", stylize: "Style Transfer",
      animate: "3D Rigging & Animation",
    })[mode] ?? mode;
  }, [mode, segSub, texSub]);

  const handleDlClose = useCallback(() => {
    if (dlItem?.blobUrl) revokeBlobUrl(dlItem.blobUrl);
    setDlOpen(false); setDlItem(null);
  }, [dlItem, revokeBlobUrl]);

  const handleRightToggle = useCallback(() => {
    if (!rightOpen && isMobile) {
      setLeftSecondaryOpen(false);
    }
    setRightOpen(v => !v);
  }, [rightOpen, isMobile, setLeftSecondaryOpen]);

  const activeTasksRunningCount = useMemo(() =>
    [...activeTasksRef.current.values()].filter(t => t.status === "running" || t.status === "pending").length,
    [_taskTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Consume ludusgen_open_job written by AiChat when user clicks a completed job in JobQueueWidget
  // We run this on mount and also whenever jobs or history change in case the item wasn't ready yet.
  useEffect(() => {
    if (!user?.uid) return;
    const key = `ludusgen_open_job:${user.uid}`;
    const jobId = sessionStorage.getItem(key);
    if (!jobId) return;

    const job = jobs.find(j => j.id === jobId);
    if (job?.taskId) {
      const histItem = history.find(h => h.taskId === job.taskId);
      if (histItem) {
        sessionStorage.removeItem(key);
        selHist(histItem);
      } else if (job.status === 'done') {
        // Still waiting for history to sync the finished job
        pendingUrlTaskId.current = job.taskId;
        setLoadingId("__url_pending__");
      }
    } else {
      // Job doesn't have taskId yet or was removed?
      sessionStorage.removeItem(key);
    }
  }, [user?.uid, jobs, history, selHist]);

  // Synchronize active model with tripoTaskId URL parameter
  const urlTaskIdParam = searchParams.get("tripoTaskId");
  const urlTaskIdParamRef = useRef(urlTaskIdParam);
  urlTaskIdParamRef.current = urlTaskIdParam;
  useEffect(() => {
    if (!urlTaskIdParam) return;
    // Skip URL changes we initiated ourselves (saveHist, syncSelHist, selHist)
    if (programmaticUrlRef.current === urlTaskIdParam) {
      programmaticUrlRef.current = null;
      return;
    }
    // Read latest values via refs — avoids history/activeTaskId as deps
    // which would re-trigger on every Firestore snapshot or state update
    if (urlTaskIdParam === activeTaskIdRef.current) return;
    const histItem = historyRef.current.find(h => h.taskId === urlTaskIdParam);
    if (histItem) {
      selHist(histItem);
    } else {
      pendingUrlTaskId.current = urlTaskIdParam;
      setLoadingId("__url_pending__");
    }
    // Only re-run when the URL param itself changes (external navigation)
  }, [urlTaskIdParam, selHist]);

  return (
    <StudioLayout
      leftOpen={leftOpen}
      setLeftOpen={toggleGlobalSidebar}
      leftSecondaryOpen={leftSecondaryOpen}
      setLeftSecondaryOpen={setLeftSecondaryOpen}
      rightOpen={rightOpen}
      setRightOpen={setRightOpen}
      onRightToggle={handleRightToggle}
      leftWidth={320}
      leftSecondaryWidth={392}
      rightWidth={rightW}
      overlay={isMobile}
      leftSidebar={globalSidebar}
      leftSecondarySidebar={
        <div className="h-full flex flex-row overflow-hidden bg-[#060410]/60 backdrop-blur-3xl border-r border-white/5">
          {/* Tripo Tool Strip (72px) */}
          <div className="w-[72px] h-full flex flex-col bg-[#030308] border-r border-white/5">
            {NAV.map(n => {
              const Icon = n.icon;
              const isN = modelVer !== "P1-20260311" && !modelVer.startsWith("v3.");
              const actsAsN = isN && (n.id === "segment" || n.id === "retopo");
              return (
                <Tooltip key={n.id} text={n.label + (actsAsN ? " (Not supported by Model V1/V2)" : "")} side="right">
                  <button
                    onClick={() => {
                      if (!actsAsN) {
                        setMode(n.id);
                        setLeftSecondaryOpen(true);
                        if (isMobile) setRightOpen(false);
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

          {/* Tripo Controls (320px) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 py-3 border-b border-white/5 flex-shrink-0">
              <h3 className="m-0 text-[13px] font-black tracking-widest uppercase text-white flex items-center gap-2 italic">
                <Activity className="w-4 h-4 text-primary opacity-50" />
                {modeTitle}
              </h3>
              {mode === "segment" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                  {SEGMENT_SUBS.map(s => {
                    const isDisabled = s.id === "fill_parts" && !isSegOutput;
                    return (
                      <button
                        key={s.id}
                        disabled={isDisabled}
                        className={`tp-sub-tab${segSub === s.id ? " on" : ""}${isDisabled ? " opacity-30 cursor-not-allowed" : ""}`}
                        onClick={() => !isDisabled && setSegSub(s.id)}
                        style={{ flex: "1 1 auto", minWidth: "120px" }}
                        title={isDisabled ? "Only available for segmented models" : ""}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {mode === "texture" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                  {TEXTURE_SUBS.map(s => {
                    const isDisabled = s.id === "paint" && !hasTexture;
                    return (
                      <button
                        key={s.id}
                        disabled={isDisabled}
                        className={`tp-sub-tab${texSub === s.id ? " on" : ""}${isDisabled ? " opacity-30 cursor-not-allowed" : ""}`}
                        onClick={() => !isDisabled && setTexSub(s.id)}
                        style={{ flex: "1 1 auto", minWidth: "120px" }}
                        title={isDisabled ? "Only available for models with texture" : ""}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 tp-scroll">
              <div style={mode !== "generate" ? { display: "none" } : undefined}>
                <GeneratePanel
                  genTab={genTab} setGenTab={setGenTab}
                  modelVer={modelVer} setModelVer={setModelVer}
                  prompt={prompt} setPrompt={setPrompt}
                  negPrompt={negPrompt} setNegPrompt={setNegPrompt}
                  makeBetter={makeBetter} setMakeBetter={setMakeBetter}
                  batchImages={batchImages} setBatchImages={setBatchImages}
                  meshQ={meshQ} setMeshQ={setMeshQ}
                  inParts={inParts} setInParts={setInParts}
                  privacy={privacy} setPrivacy={setPrivacy}
                  texOn={texOn} setTexOn={setTexOn}
                  tex4K={tex4K} setTex4K={setTex4K}
                  pbrOn={pbrOn} setPbrOn={setPbrOn}
                  polycount={polycount} setPolycount={setPolycount}
                  quadMesh={quadMesh} setQuadMesh={setQuadMesh}
                  smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly}
                  tPose={tPose} setTPose={setTPose}
                  modelSeed={modelSeed} setModelSeed={setModelSeed}
                  textureSeed={textureSeed} setTextureSeed={setTextureSeed}
                  imageSeed={imageSeed} setImageSeed={setImageSeed}
                  autoSize={autoSize} setAutoSize={setAutoSize}
                  exportUv={exportUv} setExportUv={setExportUv}
                  multiImages={multiImages} setMultiImages={setMultiImages}
                  getIdToken={getIdToken}
                  color={color} isRunning={isRunning} handleGen={handleGen}
                  setErrorMsg={setErrorMsg} activeStyles={activeStyle}
                  onStyleToggle={handleStyleToggle}
                  aiSuggestedNeg={aiSuggestedNeg} setAiSuggestedNeg={setAiSuggestedNeg}
                />
              </div>
              <div style={mode !== "segment" ? { display: "none" } : undefined}>
                <Segment segSub={segSub} activeTaskId={activeTaskId} isRiggedInput={isRiggedInput} isSegmentOutput={isSegOutput} color={color} />
              </div>
              <div style={mode !== "retopo" ? { display: "none" } : undefined}>
                <Retopo quad={quadMesh} setQuad={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} polycount={polycount} setPolycount={setPolycount} outFormat={outFormat} setOutFormat={setOutFormat} pivotToBottom={pivotToBottom} setPivotToBottom={setPivotToBottom} activeTaskId={activeTaskId} color={color} />
              </div>
              <div style={mode !== "texture" ? { display: "none" } : undefined}>
                <Texture
                  mode={texSub === "paint" ? "texture_edit" : "texture"}
                  activeTaskId={activeTaskId}
                  texInputTab={texInputTab} setTexInputTab={setTexInputTab}
                  texPrompt={texPrompt} setTexPrompt={setTexPrompt}
                  imgPrev={imgPrev} imgToken={imgToken} imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef}
                  multiImages={multiImages} setMultiImages={setMultiImages}
                  tex4K={tex4K} setTex4K={setTex4K}
                  pbrOn={texPbr} setPbrOn={setTexPbr}
                  texAlignment={texAlignment} setTexAlignment={setTexAlignment}
                  brushMode={brushMode} setBrushMode={setBrushMode}
                  brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt}
                  creativity={creativity} setCreativity={setCreativity}
                  brushColor={brushColor} setBrushColor={setBrushColor}
                  brushSize={brushSize} setBrushSize={setBrushSize}
                  brushOpacity={brushOpacity} setBrushOpacity={setBrushOpacity}
                  brushHardness={brushHardness} setBrushHardness={setBrushHardness}
                  canvasRef={canvasRef}
                  color={color}
                  onUndo={() => sceneRef.current?.undoPaint()}
                />
              </div>
              <div style={mode !== "animate" ? { display: "none" } : undefined}>
                <Animate animId={animId} activeTaskId={activeTaskId} animSearch={animSearch} setAnimSearch={setAnimSearch} animCat={animCat} setAnimCat={setAnimCat} selAnim={selAnim} setSelAnim={setSelAnim} animModelVer={animModelVer} setAnimModelVer={setAnimModelVer} filtAnims={filtAnims} rigStep={rigStep} rigBtnLocked={rigBtnLocked} handleAutoRig={handleAutoRig} rigType={rigType} setRigType={setRigType} rigSpec={rigSpec} setRigSpec={setRigSpec} detectedRigType={detectedRigType} detectedRigModelVer={detectedRigModelVer} detectedRigSpec={detectedRigSpec} rigCompat={rigCompat} animOutFormat={animOutFormat} setAnimOutFormat={setAnimOutFormat} animBakeAnimation={animBakeAnimation} setAnimBakeAnimation={setAnimBakeAnimation} animExportGeometry={animExportGeometry} setAnimExportGeometry={setAnimExportGeometry} animAnimateInPlace={animAnimateInPlace} setAnimAnimateInPlace={setAnimAnimateInPlace} color={color} />
              </div>
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
                  {activeH?.params?.texture === true ? (
                    <div className="p-2 px-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                      <p className="text-red-400 font-bold text-[10px] m-0 uppercase tracking-widest">Not Refinable</p>
                      <p className="text-red-300/70 text-[10px] mt-1 leading-relaxed">This model was generated <span className="font-bold">with texture</span>. Refine only works on draft meshes (no texture). Generate a new model without texture, then apply Refine.</p>
                    </div>
                  ) : (
                    <div className="p-2 px-3 rounded-lg bg-yellow-500/10 border border-yellow-500/25 mb-4">
                      <p className="text-yellow-400 font-bold text-[10px] m-0 uppercase tracking-widest">Requirement</p>
                      <p className="text-yellow-300/70 text-[10px] mt-1 leading-relaxed">Only works on models generated <span className="font-bold">without texture</span>. Turn off Texture in Generate before using Refine.</p>
                    </div>
                  )}
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
                      {["lego", "voxel", "voronoi", "minecraft"].map(s => (
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
            {/* Action bar */}
            <div style={{ padding: "6px 10px 10px", flexShrink: 0 }}>
              <div style={{
                position: "relative",
                borderRadius: 12,
                background: "#0d0b1a",
                border: "1px solid rgba(139,92,246,0.18)",
                overflow: "hidden",
                borderLeft: "3px solid #8b5cf6",
                boxShadow: "0 0 24px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}>
                {/* purple corner glow */}
                <div style={{ position: "absolute", top: 0, left: 0, width: 120, height: 60, background: "radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />

                {/* Model name row */}
                <div style={{ padding: "10px 12px 0", position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(139,92,246,0.6)", textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: "'JetBrains Mono', monospace" }}>ASSET NAME</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(139,92,246,0.12)" }} />
                  </div>
                  <input
                    className="tp-input"
                    placeholder={prompt ? prompt.trim().split(/\s+/).slice(0, 2).join(" ") || "Model neve…" : "Model neve…"}
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    style={{ width: "100%", fontSize: 11, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#e8e0ff", letterSpacing: "0.04em" }}
                  />
                </div>

                {/* Generate / Running area */}
                <div style={{ padding: "8px 12px 10px", position: "relative", zIndex: 1 }}>
                  {pendingCountdown !== null ? (
                    <div className="fade-up">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                          <Loader2 style={{ width: 11, height: 11, color: "#8b5cf6", flexShrink: 0 }} className="anim-spin" />
                          <span style={{ fontSize: 11, fontWeight: 900, color: "#e8e0ff", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace" }}>Feldolgozás</span>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.1em",
                          background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)",
                          borderRadius: 20, padding: "2px 8px", fontFamily: "'JetBrains Mono', monospace",
                        }}>FELDOLGOZÁS</span>
                      </div>
                      <button
                        style={{
                          width: "100%", padding: "7px 0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                          color: "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
                          textTransform: "uppercase", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                        onClick={() => { if (pendingTaskRef.current) pendingTaskRef.current.cancelled = true; }}
                      >
                        <span style={{ fontSize: 12, lineHeight: 1 }}>✕</span>
                        <span>MÉGSE ({pendingCountdown}s)</span>
                      </button>
                    </div>
                  ) : isRunning ? (
                    <div className="fade-up">
                      {/* Running header row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                          <Loader2 style={{ width: 11, height: 11, color: "#8b5cf6", flexShrink: 0 }} className="anim-spin" />
                          <span style={{ fontSize: 11, fontWeight: 900, color: "#e8e0ff", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace" }}>{genLabel}</span>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.1em",
                          background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)",
                          borderRadius: 20, padding: "2px 8px", fontFamily: "'JetBrains Mono', monospace",
                        }}>FELDOLGOZÁS</span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ position: "relative", height: 3, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 6 }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, height: "100%",
                          width: `${progress}%`,
                          background: "linear-gradient(90deg, #a855f7, #ec4899)",
                          borderRadius: 3,
                          boxShadow: "0 0 8px rgba(236,72,153,0.6)",
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                      {/* Sub row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace" }}>TRIPO</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#a855f7", fontFamily: "'JetBrains Mono', monospace" }}>{progress}%</span>
                      </div>
                      <button
                        style={{
                          width: "100%", padding: "7px 0", borderRadius: 8,
                          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                          color: "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
                          textTransform: "uppercase", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                        onClick={() => handleStop()}
                      >
                        TERMINÁLÁS
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className={"tp-gen-btn" + (canGen ? " go" : " no")}
                        onClick={handleGen}
                        disabled={!canGen}
                        style={{ height: 48, borderRadius: 10, width: "100%", fontSize: 12, letterSpacing: "0.12em" }}
                        title={
                          activeTasksRunningCount >= PARALLEL_LIMIT
                            ? `Maximum párhuzamos taskok elérve (${PARALLEL_LIMIT}/${PARALLEL_LIMIT})`
                            : undefined
                        }
                      >
                        {genLabel}
                        {canGen && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 10, paddingLeft: 10, borderLeft: "1px solid rgba(255,255,255,0.18)" }}>
                            <CoinIcon size={13} /><span style={{ fontSize: 13, fontWeight: 900 }}>{genCost}</span>
                          </div>
                        )}
                      </button>
                      {modelUrl && !isRunning && (
                        <button
                          onClick={() => { setDlItem(null); setDlOpen(true); }}
                          style={{
                            width: "100%", marginTop: 6, padding: "7px 0", borderRadius: 8,
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                            color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 700,
                            letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#e8e0ff"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"; e.currentTarget.style.background = "rgba(139,92,246,0.08)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                        >
                          <Download style={{ width: 10, height: 10 }} /> EXPORT ENGINE
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
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
            optimisticItems={optimisticItems}
            firestoreCollection="tripo_history"
            onSelect={selHist}
            onReuse={reuse}
            onHistoryLoad={onHistoryLoad}
            onDownload={async (i) => {
              try { const b = await fetchProxy(i.model_url, i.taskId); setDlItem({ blobUrl: b, item: i }); setDlOpen(true); }
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
        lElev={lElev}
        setLElev={setLElev}
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
        showRig={showRig}
        setShowRig={setShowRig}
        riggedId={riggedId}
        autoSpin={autoSpin}
        setAutoSpin={setAutoSpin}
        loadingId={loadingId}
        isRunning={isRunning}
        camP={camP}
        sceneRef={sceneRef}
        dlItem={dlItem}
        setDlItem={setDlItem}
        setDlOpen={setDlOpen}
        dlOpen={dlOpen}
        handleDlClose={handleDlClose}
        activeH={activeH}
        onRigDetected={onRigDetected}
        onAnimClipsDetected={handleAnimClipsDetected}
        animClips={animClips}
        activeClipIdx={activeClipIdx}
        onSwitchClip={handleSwitchClip}
        // 3D Paint
        paintMode={mode === "texture" && texSub === "paint" && brushMode === "Paint Mode"}
        paintColor={brushColor}
        paintSize={brushSize}
        paintOpacity={brushOpacity}
        paintHardness={brushHardness}
        paintCanvasRef={canvasRef}
        segmentHighlight={segmentHighlight}
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
  lStr, setLStr, lRot, setLRot, lElev, setLElev, lAutoR, setLAutoR, lAutoS, setLAutoS,
  dramC, setDramC, gc1, setGc1, gc2, setGc2, wireOv, setWireOv,
  wireOp, setWireOp, wireC, setWireC, showRig, setShowRig, riggedId,
  autoSpin, setAutoSpin,
  loadingId, isRunning, camP, sceneRef,
  dlItem, setDlItem, setDlOpen, dlOpen, handleDlClose, activeH,
  onRigDetected,
  onAnimClipsDetected,
  animClips, activeClipIdx, onSwitchClip,
  // 3D Paint
  paintMode, paintColor, paintSize, paintOpacity, paintHardness, paintCanvasRef,
  segmentHighlight
}) {
  const { smoothL, smoothR } = useContext(StudioLayoutContext);

  return (
    <div className="relative isolate flex flex-col h-full bg-transparent">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* top hud */}
      <motion.div
        style={{ paddingLeft: smoothL, paddingRight: smoothR }}
        className="flex items-center justify-between h-12 flex-shrink-0 border-b border-white/5 gap-2 relative z-[60] px-3 bg-[#0a0a0f]/90 backdrop-blur-xl"
      >
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 min-w-0" style={{ flexWrap: 'wrap' }}>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic mr-1 sm:mr-2 hidden sm:inline">View Context</span>
          {VIEW_MODES.map(v => (
            <Tooltip key={v.id} text={v.tip} side="bottom">
              <button
                onClick={() => setViewMode(v.id)}
                className={`px-2 sm:px-3 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === v.id ? 'bg-primary/20 text-white border border-primary/30 shadow-primary-glow' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {v.label}
              </button>
            </Tooltip>
          ))}
          <div className="w-px h-5 bg-white/5 mx-0.5 sm:mx-1 hidden sm:block" />
          <IconBtn
            icon={<Scissors className="w-4 h-4" />}
            tip="Segment View (Translucent)"
            active={segmentHighlight}
            color={color}
            onClick={() => setSegmentHighlight(v => !v)}
          />
          <div className="w-px h-5 bg-white/5 mx-0.5 sm:mx-1 hidden sm:block" />
          {modelUrl && <WireframeControl active={wireOv} onToggle={() => setWireOv(v => !v)} opacity={wireOp} onOpacityChange={setWireOp} color={wireC} onColorChange={setWireC} accentColor={color} />}
          {modelUrl && <RigControl active={showRig} onToggle={() => setShowRig(v => !v)} rigged={!!riggedId} />}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 min-w-0" style={{ flexWrap: 'wrap' }}>
          <BgColorPicker value={bgColor} onChange={setBgColor} />
          <div className="w-px h-5 bg-white/5 hidden sm:block mx-0" />
          <LightingControls viewMode={viewMode} lightMode={lightMode} setLightMode={setLightMode} lightStrength={lStr} setLightStrength={setLStr} lightRotation={lRot} setLightRotation={setLRot} lightElevation={lElev} setLightElevation={setLElev} lightAutoRotate={lAutoR} setLightAutoRotate={setLAutoR} lightAutoRotateSpeed={lAutoS} setLightAutoRotateSpeed={setLAutoS} dramaticColor={dramC} setDramaticColor={setDramC} gridColor1={gc1} setGridColor1={setGc1} gridColor2={gc2} setGridColor2={setGc2} color={color} />
          <div className="w-px h-5 bg-white/5 hidden sm:block" />
          <IconBtn icon={<Grid3x3 className="w-4 h-4" />} tip="Grid" active={showGrid} color={color} onClick={() => setShowGrid(v => !v)} />
        </div>
      </motion.div>

      {/* viewport main */}
      <div className="flex-1 relative tp-viewport" style={{ minHeight: 0 }}>
        <div className="absolute inset-0">
          {(loadingId === "__url_pending__" && !modelUrl) ? (
            <div className="absolute inset-0 bg-black" />
          ) : (
            <ThreeViewer
              color={color}
              viewMode={viewMode}
              lightMode={lightMode}
              showGrid={showGrid}
              modelUrl={modelUrl}
              lightStrength={lStr}
              lightRotation={lRot}
              lightElevation={lElev}
              lightAutoRotate={lAutoR}
              lightAutoRotateSpeed={lAutoS}
              dramaticColor={dramC}
              wireframeOverlay={wireOv}
              wireOpacity={wireOp}
              wireHexColor={wireC.replace("#", "0x")}
              segmentHighlight={segmentHighlight}
              segmentEdgeColor={0x00ff88}
              showRig={showRig && !!riggedId}
              onRigDetected={onRigDetected}
              onAnimClipsDetected={onAnimClipsDetected}
              autoSpin={autoSpin}
              bgColor={bgColor}
              gridColor1={gc1}
              gridColor2={gc2}
              onSpinStop={() => setAutoSpin(false)}
              onReady={s => { sceneRef.current = s; }}
              // 3D Paint
              paintMode={paintMode}
              paintColor={paintColor}
              paintSize={paintSize}
              paintOpacity={paintOpacity}
              paintHardness={paintHardness}
              paintCanvasRef={paintCanvasRef}
            />
          )}
        </div>

        <AnimatePresence>
          {(loadingId && !isRunning) && (
            <motion.div
              initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black backdrop-blur-2xl"
            >
              <Loader2 className="w-8 h-8 text-primary anim-spin mb-4" />
              <p className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">Fetching Spatial Voxel Map</p>
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

        {/* Animation clip picker — visible when GLB has 2+ clips */}
        {animClips.length > 1 && modelUrl && !isRunning && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl">
            <Play className="w-3.5 h-3.5 text-cyan-400 mr-1 flex-shrink-0" />
            {animClips.map((clip, i) => (
              <button
                key={i}
                onClick={() => onSwitchClip(i)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeClipIdx === i
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
              >
                {clip.name || `Clip ${i + 1}`}
              </button>
            ))}
            <span className="text-[9px] text-zinc-600 font-bold ml-1 tracking-wider">{animClips[activeClipIdx]?.duration?.toFixed(1)}s</span>
          </div>
        )}
      </div>

      {/* bottom hud */}
      <motion.div
        style={{ paddingLeft: smoothL, paddingRight: smoothR }}
        className="h-14 flex items-center justify-between flex-shrink-0 border-t border-white/5 bg-[#0a0a14]/80 backdrop-blur-xl relative z-[60] px-2 sm:px-3 overflow-x-auto gap-1.5 sm:gap-2"
      >
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-w-0">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] italic mr-1 sm:mr-2 hidden sm:inline">Orbital Controls</span>
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 px-1.5 sm:px-2 rounded-2xl bg-white/5 border border-white/5">
            <IconBtn icon={<RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} tip="C-Reset" onClick={() => camP("reset")} />
            <IconBtn icon={<Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} tip="Front" onClick={() => camP("front")} />
            <IconBtn icon={<Move3d className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} tip="Side" onClick={() => camP("side")} />
            <IconBtn icon={<Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} tip="Top" onClick={() => camP("top")} />
          </div>
          <div className="w-px h-5 bg-white/5 mx-0.5 sm:mx-1 hidden sm:block" />
          <button
            onClick={() => setAutoSpin(v => !v)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${autoSpin ? 'bg-primary text-white shadow-primary-glow' : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'}`}
          >
            {autoSpin ? <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
            <span className="hidden sm:inline">{autoSpin ? "Spin Active" : "Start Spinner"}</span>
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {modelUrl && (
            <button
              onClick={() => { setDlItem(null); setDlOpen(true); }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl bg-primary text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-primary-heavy hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Production Export</span><span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </motion.div>

      <DownloadModal isOpen={dlOpen} onClose={handleDlClose} glbBlobUrl={dlItem ? dlItem.blobUrl : modelUrl} scene={sceneRef.current?.scene ?? sceneRef.current} filename={dlItem ? (dlItem.item?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now())) : (activeH?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now()))} color={color} />

      {/* ── FOOTER: Spatial Logic Stream ── */}
      {activeH && !isRunning && (
        <div className="h-10 bg-[#0a0a0f] border-t border-white/5 px-4 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50" />
          <div className="relative z-10 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 italic flex items-center gap-2">
            <div className="w-2 h-0.5 bg-primary/30" />
            <span className="hidden sm:inline">Spatial Logic Stream v2.4.0</span>
            <span className="sm:hidden">SLS v2.4</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-8 relative z-10">
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
              <span className="hidden sm:inline">Neural Precision:</span><span className="sm:hidden">NP:</span> <span className="text-emerald-500/60">Optimized</span>
            </span>
            <div className="w-[1px] h-3 bg-white/5 hidden sm:block" />
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">
              <span className="hidden sm:inline">Latency:</span><span className="sm:hidden">L:</span> <span className="text-zinc-500">14ms</span>
            </span>
          </div>

        </div>
      )}
    </div>
  );
}