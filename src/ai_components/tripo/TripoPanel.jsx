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
import { setCameraPreset, switchAnimationClip } from "../meshy/viewer/threeHelpers";
import { IconBtn, Tooltip } from "../meshy/ui/Primitives";
import LightingControls from "../meshy/viewer/LightingControls";
import {
  VIEW_MODES, WireframeControl, RigControl, BgColorPicker, HistoryCard,
} from "../trellis/.";
import ConfirmModal from "../trellis/ConfirmModal";
import DownloadModal from "../trellis/DownloadModal";
import { saveHistoryToFirestore, loadHistoryPageFromFirestore } from "../trellis/utils";
import Shared3DHistory from "../../components/shared/Shared3DHistory";
import { getAnimById, ANIMATION_LIBRARY, ANIM_CATEGORIES } from "./animationlibrary";
import { persistGen, loadPersistedGen, updatePersistedProgress, clearPersistedGen, markHistorySaved } from "./useGenerationPersist";

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
import toast from "react-hot-toast";

/* ─── constants ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const POLL_MS = 2500;
const POLL_MAX = 500;

const PROGRESS_JUMP_LIMIT = 30;
const STUCK_THRESHOLD_MS = 300_000;

// Session-level dedup guard — prevents double Firestore writes if saveHist is called twice for the same URL
const _savedUrls = new Set();

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
  .anim-spin { animation: spin 1s linear infinite; }
  .fade-up   { animation: fadeUp 0.18s ease forwards; }
  .tp-viewport canvas { position: relative !important; z-index: 0 !important; }
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
  .tp-input:focus { border-color:var(--border-accent);background:rgba(30,30,54,0.9);box-shadow:0 0 0 3px rgba(139,92,246,0.08); }
  .tp-input::placeholder { color:var(--text-muted); }
  .tp-ta { width:100%;padding:10px 13px;border-radius:11px;font-size:12px;color:var(--text-primary);background:var(--bg-raised);border:1px solid var(--border);outline:none;font-family:inherit;resize:none;line-height:1.6;box-sizing:border-box;transition:border-color 0.18s,box-shadow 0.18s; }
  .tp-ta::placeholder { color:var(--text-muted); }
  .tp-ta:focus { border-color:var(--border-accent);outline:none;box-shadow:0 0 0 3px rgba(139,92,246,0.08); }
  .tp-drop:hover { border-color:rgba(108,99,255,0.4) !important;box-shadow:0 0 12px rgba(108,99,255,0.06); }
  .tp-sub-tab { padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;border:none;transition:all 0.13s;font-family:inherit; }
  .tp-sub-tab.on { background:rgba(124,111,255,0.25);color:var(--accent-bright);outline:1px solid var(--border-accent); }
  .tp-sub-tab:not(.on) { background:transparent;color:var(--text-muted); }
  .tp-sub-tab:not(.on):hover { color:#5a5a7a;background:rgba(255,255,255,0.04); }
  .tp-inp-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:9px;transition:all 0.18s;font-family:inherit;background:transparent; }
  .tp-inp-tab.active { background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.05); }
  .tp-qual-btn { flex:1;padding:10px 4px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all 0.18s;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit; }
  .tp-gen-btn { width:100%;padding:16px 0;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.03em;transition:all 0.22s;font-family:inherit; }
  .tp-gen-btn.go { background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:#ffffff; box-shadow:0 12px 40px rgba(139,92,246,0.28),0 4px 12px rgba(0,0,0,0.2); }
  .tp-gen-btn.go:hover { box-shadow:0 18px 55px rgba(139,92,246,0.4),0 6px 16px rgba(0,0,0,0.25); transform:translateY(-2px) scale(1.02); }
  .tp-gen-btn.no { background:rgba(255,255,255,0.025); color:var(--text-muted); cursor:not-allowed; border:1px solid var(--border); }
  .tp-model-card { padding:11px 13px;border-radius:11px;background:var(--bg-raised);border:1px solid var(--border);cursor:pointer;transition:all 0.16s;margin-bottom:5px;box-shadow:0 1px 3px rgba(0,0,0,0.1); }
  .tp-model-card.sel { background:rgba(124,111,255,0.14);border-color:var(--border-accent);box-shadow:0 0 0 1px rgba(124,111,255,0.18),0 2px 8px rgba(124,111,255,0.08); }
  .tp-model-card:hover:not(.sel) { background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.15);box-shadow:0 2px 8px rgba(0,0,0,0.15); }
  .checker { background-color:#131326;background-image:linear-gradient(45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,0.025) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,0.025) 75%);background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0; }
  .anim-card { border-radius:11px;overflow:hidden;cursor:pointer;transition:all 0.16s; }
  .anim-card:hover { border-color:rgba(255,255,255,0.22) !important; transform:scale(1.02);box-shadow:0 4px 12px rgba(0,0,0,0.2); }
  .sec-row { display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:11px 4px;user-select:none;border-radius:8px;transition:background 0.14s; }
  .sec-row span { transition:color 0.14s; }
  .sec-row:hover { background:rgba(255,255,255,0.02); }
  .sec-row:hover span { color:#8a8aaa !important; }
  .tp-topo-btn { flex:1;padding:9px 4px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all 0.16s;font-family:inherit; }
  .tp-topo-btn.sel { background:rgba(124,111,255,0.2);color:var(--accent-bright);outline:1.5px solid var(--border-accent);box-shadow:0 2px 6px rgba(124,111,255,0.1); }
  .tp-topo-btn:not(.sel) { background:var(--bg-raised);color:var(--text-secondary);outline:1px solid var(--border); }
  .tp-topo-btn:not(.sel):hover { background:rgba(255,255,255,0.07);color:#6a6a8a; }
  .tex-input-box { border:1.5px solid rgba(139,92,246,0.28);border-radius:14px;overflow:hidden;background:rgba(139,92,246,0.03);margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.1); }
  .tex-tab-bar { display:flex;background:rgba(255,255,255,0.05);padding:4px;gap:3px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.15); }
  .tex-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:all 0.18s;font-family:inherit; }
  .tex-tab.on { background:rgba(255,255,255,0.14);box-shadow:0 2px 6px rgba(0,0,0,0.3); }
  .mv-grid { display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:11px; }
  .mv-cell { border-radius:10px;aspect-ratio:1/1;border:1.5px dashed rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:border-color 0.16s,box-shadow 0.16s;position:relative; }
  .mv-cell:hover { border-color:rgba(108,99,255,0.4);box-shadow:0 0 10px rgba(108,99,255,0.06); }
  .magic-mode-tab { flex:1;padding:8px 0;border:none;cursor:pointer;font-size:12px;font-weight:600;border-radius:11px;transition:all 0.18s;font-family:inherit; }
  .magic-mode-tab.on { background:#ffffff;color:#0a0a1a;box-shadow:0 2px 8px rgba(0,0,0,0.3); }
  .magic-mode-tab:not(.on) { background:transparent;color:#5a5a7a; }
  .anim-model-dd { width:100%;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);cursor:pointer;display:flex;align-items:center;gap:8px;transition:border-color 0.16s,box-shadow 0.16s; }
  .anim-model-dd:hover { border-color:rgba(139,92,246,0.35);box-shadow:0 0 10px rgba(139,92,246,0.05); }
  .auto-rig-btn { width:100%;padding:13px 0;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;transition:all 0.2s; }
  .auto-rig-btn.ready { background:rgba(255,255,255,0.08);color:#c8c8e0;box-shadow:0 2px 8px rgba(0,0,0,0.1); }
  .auto-rig-btn.ready:hover { background:rgba(255,255,255,0.12);box-shadow:0 4px 12px rgba(0,0,0,0.15); transform:translateY(-1px); }
  .auto-rig-btn.disabled { background:rgba(255,255,255,0.03);color:#1e1e38;cursor:not-allowed; }

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
  const [mode, setMode] = useState(() => sessionStorage.getItem("tripo_mode") || "generate");
  const [segSub, setSegSub] = useState("segment");
  useEffect(() => { sessionStorage.setItem("tripo_mode", mode); }, [mode]);

  // generate
  const [genTab, setGenTab] = useState("image");
  const [modelVer, setModelVer] = useState(MODEL_VERSIONS[0].id);
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("floating objects, extra limbs, missing limbs, cut off body, cropped figure, background scenery, fused fingers, warped topology, duplicate figure, two models, inverted normals, texture stretching, melted features, wax skin, plastic doll, artifacts");
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
  const [stylizeStyle, setStylizeStyle] = useState("cartoon");
  const [animId, setAnimId] = useState("");

  // animate
  const [animModelVer, setAnimModelVer] = useState("v2.5-animals");
  const [animSearch, setAnimSearch] = useState("");
  const [animCat, setAnimCat] = useState("all");
  const [selAnim, setSelAnim] = useState(new Set());
  const [rigStep, setRigStep] = useState("idle");
  const [riggedId, setRiggedId] = useState(null);
  const riggedIdRef = useRef(null);
  useEffect(() => { riggedIdRef.current = riggedId; }, [riggedId]);
  const [rigType, setRigType] = useState("biped");
  const [rigSpec, setRigSpec] = useState("tripo");
  const [detectedRigType, setDetectedRigType] = useState(null);
  const [detectedRigModelVer, setDetectedRigModelVer] = useState(null);
  const [detectedRigSpec, setDetectedRigSpec] = useState(null);
  const [prerigcheckResult, setPrerigcheckResult] = useState(null);
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
  const [selHistId, setSelHistId] = useState(() => sessionStorage.getItem("tripo_sel_hist") || null);
  useEffect(() => {
    if (selHistId) sessionStorage.setItem("tripo_sel_hist", selHistId);
    else sessionStorage.removeItem("tripo_sel_hist");
  }, [selHistId]);
  const activeH = useMemo(() => history.find(h => h.id === selHistId), [history, selHistId]);
  const activeTaskId = activeH?.taskId || activeH?.task_id || activeH?.id || "";
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Pre-set loadingId when a model is expected on mount (URL param or saved session)
  // so ThreeViewer never mounts and shows the placeholder before the real model loads.
  const [loadingId, setLoadingId] = useState(() =>
    (searchParams.get("tripoTaskId") || sessionStorage.getItem("tripo_sel_hist"))
      ? "__url_pending__" : null
  );

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
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // panels / modals
  const [dlOpen, setDlOpen] = useState(false);
  const [dlItem, setDlItem] = useState(null);


  const histAbort = useRef(null);
  const sceneRef = useRef(null);
  const pollAb = useRef(null);
  const prevUrl = useRef(null);
  const fileRef = useRef(null);
  const currentTaskId = useRef(null);
  const currentRequestId = useRef(null);
  const userStoppedRef = useRef(false);
  // Holds a taskId from ?tripoTaskId= URL param until history loads and we can auto-select it
  const pendingUrlTaskId = useRef(searchParams.get("tripoTaskId") || null);

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

  const canGen = useMemo(() => {
    if (isRunning) return false;
    switch (mode) {
      case "generate": return genTab === "text" ? !!prompt.trim() : genTab === "batch" ? (batchImages?.length > 0) : !!imgToken;
      case "segment": return !!(segId.trim() || activeTaskId);
      case "fill_parts": return !!(fillId.trim() || activeTaskId);
      case "retopo": return !!(retopoId.trim() || activeTaskId);
      case "texture": return !!(texId.trim() || activeTaskId) && (texInputTab === "text" ? !!texPrompt.trim() : texInputTab === "image" ? !!imgToken : multiImages.length > 0);
      case "texture_edit": return !!(editId.trim() || activeTaskId) && (brushMode === "Paint Mode" || !!brushPrompt.trim());
      case "refine": return !!(refineId.trim() || activeTaskId);
      case "stylize": return !!(stylizeId.trim() || activeTaskId);
      case "animate": return !!riggedId && selAnim.size > 0;
      default: return false;
    }
  }, [isRunning, mode, genTab, prompt, imgToken, batchImages, segId, fillId, retopoId, activeTaskId, texInputTab, texPrompt, multiImages, editId, texId, refineId, stylizeId, riggedId, selAnim, brushMode, brushPrompt]);



  const authH = useCallback(async () => {
    const t = getIdToken ? await getIdToken() : "";
    return { "Content-Type": "application/json", Authorization: "Bearer " + t };
  }, [getIdToken]);

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

  const pollTask = useCallback(async (taskId, pt, headers, onSuccess, { skipJumpCheck = false } = {}) => {
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
    if (persisted.mode && persisted.mode !== "generate") setMode(persisted.mode);
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
            if (!persisted.savedToHistory && sd.modelUrl) {
              markHistorySaved();
              const _ni = await saveRigHist(persisted.taskId, sd.modelUrl, { prompt: "auto-rig", originalModelTaskId: persisted.mode === "animate" ? persisted.taskId : undefined, rigModelVer: persisted.rigModelVer, rigType: persisted.rigType, rigSpec: persisted.rigSpec });
              if (_ni) getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
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
            if (!persisted.savedToHistory) {
              markHistorySaved();
              const _ni = await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? "animation", animated: true });
              if (_ni) getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
            }
            currentTaskId.current = null; clearPersistedGen();
          } else if (opType === "segment") {
            setProgress(100); setStatusMsg(""); setIsRunning(false);
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
            if (!persisted.savedToHistory && rawUrl) {
              markHistorySaved();
              const _ni = await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? "" });
              if (_ni) getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
            }
          }
        };

        if (d.status === "success" && (d.modelUrl || opType === "segment")) {
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

  const saveHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const dedupKey = rawUrl + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);
    const autoName = (extra.prompt || prompt).trim().split(/\s+/).slice(0, 2).join(" ");
    const resolvedName = modelName.trim() || extra.name || autoName || null;
    const item = { prompt: prompt.trim() || extra.label || mode, name: resolvedName, status: "succeeded", model_url: rawUrl, source: "tripo", mode, taskId, params: { model_version: modelVer, mode, ...extra }, ts: Date.now() };
    const stableDocId = extra.animationIndex != null ? `tripo_${taskId}_${extra.animationIndex}` : `tripo_${taskId}`;
    const { docId } = await saveHistoryToFirestore(userId, item, stableDocId);
    const ni = { id: docId ?? stableDocId, ...item, createdAt: { toDate: () => new Date() } };
    setOptimisticItems(prev => prev.filter(o => o.id !== stableDocId));
    setHistory(h => [ni, ...h]); setSelHistId(ni.id); histInit.current = true; return ni;
  }, [userId, prompt, mode, modelVer, modelName]);

  // Save a rigged model to history with mode="rig"
  const saveRigHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const dedupKey = rawUrl + "|" + taskId;
    if (_savedUrls.has(dedupKey)) return null;
    _savedUrls.add(dedupKey);
    const srcPrompt = history.find(h => h.taskId === extra.originalModelTaskId)?.name || history.find(h => h.taskId === extra.originalModelTaskId)?.prompt || extra.prompt || "model";
    const rigName = extra.aiName || (srcPrompt.split(/\s+/).slice(0, 2).join(" ") + "_rigged");
    // Explicitly build params — never let extra override mode/rigged/animated
    const params = { rigModelVer: extra.rigModelVer, rigType: extra.rigType, rigSpec: extra.rigSpec, originalModelTaskId: extra.originalModelTaskId, mode: "rig", rigged: true };
    const item = { prompt: extra.prompt || "auto-rig", name: rigName, status: "succeeded", model_url: rawUrl, source: "tripo", mode: "rig", taskId, params, ts: Date.now() };
    const stableDocId = `tripo_${taskId}`;
    const { docId } = await saveHistoryToFirestore(userId, item, stableDocId);
    const ni = { id: docId ?? stableDocId, ...item, createdAt: { toDate: () => new Date() } };
    setOptimisticItems(prev => prev.filter(o => o.id !== stableDocId));
    setHistory(h => [ni, ...h]); setSelHistId(ni.id); histInit.current = true; return ni;
  }, [userId, history]);

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
    if (mode === "texture") return tex4K ? 20 : 10;
    if (mode === "retopo") return smartLowPoly ? 10 : 5;
    if (mode === "refine") return 30;
    if (mode === "stylize") return 20;
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
    const animSlugs = [...selAnim].map(id => getAnimById(id)?.slug).filter(Boolean);
    const animSlug = animSlugs.length === 1 ? animSlugs[0] : null;
    try {
      const headers = await authH();
      let body;

      /* ── texture_edit: upload mask from canvas before building body ── */
      let maskToken = null;
      if (mode === "texture_edit") {
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
            const isP1 = effectiveModel === "P1-20260311";
            body = {
              type: "multiview_to_model",
              files: multiImages.map(i => ({ type: "png", file_token: i.token })),
              model_version: effectiveModel,
              ...(negPrompt.trim() && !isP1 && { negative_prompt: negPrompt.trim() }),
              ...(tPose && { t_pose: true }),
              ...(texOn && { texture: true }),
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
          } else if (genTab === "batch") {
            const isP1 = effectiveModel === "P1-20260311";
            body = {
              type: "image_to_model",
              file: { type: "jpg", file_token: batchImages[0]?.token },
              model_version: effectiveModel,
              ...(negPrompt.trim() && !isP1 && { negative_prompt: negPrompt.trim() }),
              ...(tPose && { t_pose: true }),
              ...(texOn && { texture: true }),
              ...(pbrOn && { pbr: true }),
              ...((texOn || pbrOn) && { texture_quality: tex4K ? "detailed" : "standard" }),
              ...(makeBetter && { enable_image_autofix: true }),
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
            const isUltra = meshQ === "ultra" && _isModern;
            const isP1 = effectiveModel === "P1-20260311";
            body = {
              type: "image_to_model",
              file: { type: "jpg", file_token: imgToken },
              model_version: effectiveModel,
              ...(negPrompt.trim() && !isP1 && { negative_prompt: negPrompt.trim() }),
              ...(tPose && { t_pose: true }),
              ...(texOn && { texture: true }),
              ...(pbrOn && { pbr: true }),
              ...((texOn || pbrOn) && { texture_quality: tex4K ? "detailed" : "standard" }),
              ...(!isP1 && isUltra && { geometry_quality: "detailed" }),
              ...(makeBetter && { enable_image_autofix: true }),
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
        case "texture_edit":
          body = {
            type: "texture_model",
            original_model_task_id: (editId.trim() || srcId),
            texture_quality: tex4K ? "detailed" : "standard",
            ...(brushPrompt.trim() && { prompt: brushPrompt.trim() }),
            ...(texPbr && { pbr: true }),
            ...(maskToken && { file: { type: "png", file_token: maskToken } }),
          };
          break;
        case "refine": body = { type: "refine_model", original_model_task_id: (refineId.trim() || srcId) }; break;
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
      const opTypeForMode = { generate: "generate", text: "generate", image: "generate", batch: "generate", multi: "generate", retopo: "retopo", texture: "texture", texture_edit: "texture", stylize: "stylize", refine: "refine", animate: "animate", segment: "segment", fill_parts: "fill" };
      persistGen({ taskId: td.taskId, requestId, mode, prompt: prompt.trim(), modelVer, lastProgress: 0, lastProgressAt: Date.now(), startedAt: Date.now(), opType: opTypeForMode[mode] ?? "generate" });
      setStatusMsg(mode === "animate" && selAnim.size > 1 ? `Generating ${selAnim.size} animations…` : "Generating…");
      await pollTask(td.taskId, pt, headers, async d => {
        if (pt.cancelled) return;
        if (currentRequestId.current !== requestId) return;
        const animatedModels = Array.isArray(d.rawOutput?.animated_models) ? d.rawOutput.animated_models : null;
        if (mode === "animate") console.log("[TripoPanel] animate_retarget result:", { taskId: td.taskId, modelUrl: d.modelUrl, animated_models: animatedModels, animated_models_count: animatedModels?.length ?? 0, rawOutputKeys: Object.keys(d.rawOutput ?? {}) });
        const rawUrl = d.modelUrl ?? (animatedModels ? animatedModels[0] : null);
        if (!rawUrl) throw Object.assign(new Error("Generation blocked: content policy or empty output. Credits were not charged."), { type: "nsfw" }); const blob = await fetchProxy(rawUrl, td.taskId);
        if (pt.cancelled) { revokeBlobUrl(blob); return; }
        revokeBlobUrl(prevUrl.current);
        setModelUrl(blob); prevUrl.current = blob;
        setGenStatus("succeeded"); setProgress(100); setStatusMsg(""); setIsRunning(false);
        
        // Instant optimistic entry so the HistoryCard shows immediately with full data
        const mockStableId = `tripo_${td.taskId}`;
        const autoName = prompt.trim().split(/\s+/).slice(0, 3).join(" ") || mode;
        const optimisticEntry = {
          id: mockStableId, taskId: td.taskId, status: "succeeded",
          model_url: rawUrl, source: "tripo", mode, ts: Date.now(),
          prompt: prompt.trim() || mode,
          name: modelName.trim() || autoName,
          params: { model_version: modelVer, mode },
          createdAt: { toDate: () => new Date() },
        };
        setOptimisticItems(prev => [optimisticEntry, ...prev.filter(o => o.id !== mockStableId)]);
        setHistory(h => h.some(x => x.id === mockStableId) ? h : [optimisticEntry, ...h]);
        setSelHistId(mockStableId);

        if (mode === "animate") {
          // Animated model is still rigged — keep rig state alive
          setRiggedId(td.taskId); setShowRig(true);
          if (!userStoppedRef.current) {
            const urlsToSave = animatedModels ?? [rawUrl];
            const total = urlsToSave.length;
            const srcItem = history.find(h => h.taskId === (riggedId || srcId));
            const baseNameForAnim = srcItem?.name || srcItem?.prompt?.trim().split(/\s+/).slice(0, 2).join(" ") || "model";
            const basePromptForAnim = srcItem?.prompt?.trim() || prompt.trim() || baseNameForAnim;
            const animLabelsForName = urlsToSave.map((_, i) => {
              const sl = animSlugs[i] ?? animSlugs[0] ?? null;
              return getAnimById([...selAnim][i])?.label ?? sl ?? "animation";
            });
            const aiAnimNames = await Promise.all(
              animLabelsForName.map(lbl => generateAIName(basePromptForAnim, "animation", lbl))
            );
            let firstEntry = null;
            for (let i = 0; i < total; i++) {
              const url = urlsToSave[i];
              if (!url) continue;
              if (total > 1) setStatusMsg(`Animation ${i + 1}/${total} saving…`);
              const singleSlug = animSlugs[i] ?? animSlugs[0] ?? null;
              const singleLabel = animLabelsForName[i];
              const animSuffix = (singleSlug || singleLabel || "anim").split(":").pop().toLowerCase();
              const entry = await saveHist(td.taskId, url, {
                prompt: singleLabel,
                name: aiAnimNames[i] ?? `${baseNameForAnim}_${animSuffix}`,
                animation: singleSlug,
                animated: true,
                animationName: singleLabel,
                animations: total > 1 ? animSlugs : undefined,
                animationIndex: i,
                originalModelTaskId: riggedId || srcId || null,
              });
              if (entry) getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${td.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
              if (i === 0) firstEntry = entry;
            }
            setStatusMsg("");
            markHistorySaved();
            if (firstEntry) setSelHistId(firstEntry.id);
          }
        } else {
          setRigStep("idle"); setRiggedId(null); setShowRig(false);
          if (!userStoppedRef.current) { const aiName = await generateAIName(prompt.trim(), "model"); const _ni3 = await saveHist(td.taskId, rawUrl, { prompt: prompt.trim(), name: aiName ?? undefined }); markHistorySaved(); if (_ni3) getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${td.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { })); }
        }
        currentTaskId.current = null; clearPersistedGen();
        setModelName("");
        refreshCredits?.();
      }, { skipJumpCheck: mode === "animate" });
    } catch (e) {
      setIsRunning(false); setProgress(0); setStatusMsg(""); setRigStep("idle"); setRiggedId(null); setShowRig(false); currentTaskId.current = null; clearPersistedGen();
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
  }, [canGen, mode, genTab, prompt, negPrompt, modelVer, texOn, pbrOn, tex4K, meshQ, polycount, inParts, imgToken, makeBetter, multiImages, batchImages, segId, fillId, retopoId, quadMesh, smartLowPoly, outFormat, pivotToBottom, texId, texPrompt, texNeg, texPbr, texAlignment, editId, brushPrompt, creativity, riggedId, selAnim, tPose, modelSeed, textureSeed, imageSeed, autoSize, exportUv, authH, modelUrl, pollTask, fetchProxy, revokeBlobUrl, saveHist, activeTaskId, refreshCredits, userCredits, genCost, refineId, stylizeId, stylizeStyle, getMaskBlob, getIdToken, history]);

  const handlePrerigcheck = useCallback(async () => {
    if (!activeTaskId && !animId) return;
    setErrorMsg("");
    const srcId = animId.trim() || activeTaskId;
    try {
      const headers = await authH();
      const rr = await fetch(BASE_URL + "/api/tripo/task", { method: "POST", headers, body: JSON.stringify({ type: "animate_prerigcheck", original_model_task_id: srcId }) });
      const rd = await rr.json(); if (!rd.success) throw new Error(rd.message);
      await pollTask(rd.taskId, { cancelled: false }, headers, d => {
        setPrerigcheckResult({ riggable: true, rigType: d.detectedRigType || "biped" });
        if (d.detectedRigType) setDetectedRigType(d.detectedRigType);
      }, { skipJumpCheck: true });
    } catch (e) { setErrorMsg(e.message); }
  }, [activeTaskId, animId, authH, pollTask]);

  const handleAutoRig = useCallback(async () => {
    if (!activeTaskId && !animId) return;
    setErrorMsg(""); setRigStep("rigging");
    setDetectedRigModelVer(null); setDetectedRigType(null); setDetectedRigSpec(null);
    if (pollAb.current) pollAb.current.cancelled = true;
    const pt = { cancelled: false }; pollAb.current = pt;
    userStoppedRef.current = false;
    const srcId = animId.trim() || activeTaskId;
    try {
      const headers = await authH();
      setStatusMsg("Rigging…");
      const rr = await fetch(BASE_URL + "/api/tripo/task", { method: "POST", headers, body: JSON.stringify({ type: "animate_rig", original_model_task_id: srcId, spec: rigSpec, out_format: animOutFormat, rig_type: rigType, bake_animation: animBakeAnimation, export_with_geometry: animExportGeometry, animate_in_place: animAnimateInPlace }) });
      const rd = await rr.json(); if (!rd.success) throw new Error(rd.message);
      currentTaskId.current = rd.taskId;
      await pollTask(rd.taskId, pt, headers, async d => {
        if (pt.cancelled) return;
        const blob = d.modelUrl ? await fetchProxy(d.modelUrl, rd.taskId) : null;
        if (pt.cancelled) { revokeBlobUrl(blob); return; }
        if (blob) { revokeBlobUrl(prevUrl.current); setModelUrl(blob); prevUrl.current = blob; }
        const actualRigType = d.rigType || rigType;
        setRiggedId(rd.taskId); setRigStep("rigged"); setShowRig(true); setStatusMsg(""); setGenStatus("succeeded");
        setDetectedRigModelVer(animModelVer); setDetectedRigType(actualRigType); setDetectedRigSpec(rigSpec);

        const mockStableId = `tripo_${rd.taskId}`;
        const rigOptEntry = {
          id: mockStableId, taskId: rd.taskId, status: "succeeded",
          model_url: d.modelUrl, source: "tripo", mode: "rig", ts: Date.now(),
          prompt: "auto-rig",
          name: (history.find(h => h.taskId === srcId)?.name || "model") + "_rigged",
          params: { rigModelVer: animModelVer, rigType: actualRigType, rigSpec, rigged: true, mode: "rig" },
          createdAt: { toDate: () => new Date() },
        };
        setOptimisticItems(prev => [rigOptEntry, ...prev.filter(o => o.id !== mockStableId)]);
        setHistory(h => h.some(x => x.id === mockStableId) ? h : [rigOptEntry, ...h]);
        setSelHistId(mockStableId);

        currentTaskId.current = null;
        persistGen({ taskId: rd.taskId, requestId: rd.taskId, mode: "animate", prompt: "auto-rig", modelVer: "", lastProgress: 100, lastProgressAt: Date.now(), startedAt: Date.now(), riggedId: rd.taskId, opType: "rig", rigModelVer: animModelVer, rigType: actualRigType, rigSpec });
        const srcItemForRig = history.find(h => h.taskId === srcId); const rigBasePrompt = srcItemForRig?.prompt?.trim() || srcItemForRig?.name?.trim() || prompt.trim(); const aiRigName = await generateAIName(rigBasePrompt, "rig"); const _ni4 = await saveRigHist(rd.taskId, d.modelUrl, { prompt: "auto-rig", originalModelTaskId: srcId, aiName: aiRigName ?? undefined, rigModelVer: animModelVer, rigType: actualRigType, rigSpec }); markHistorySaved(); if (_ni4) getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${rd.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
      }, { skipJumpCheck: true });
    } catch (e) { currentTaskId.current = null; if (pt.cancelled) return; setRigStep("idle"); setRiggedId(null); setShowRig(false); setErrorMsg(e.message); setStatusMsg(""); }
  }, [activeTaskId, animId, authH, pollTask, fetchProxy, revokeBlobUrl, saveRigHist, rigSpec, animOutFormat, rigType, animModelVer, animBakeAnimation, animExportGeometry, animAnimateInPlace]);

  const handleStop = useCallback(async () => {
    userStoppedRef.current = true;
    if (pollAb.current) pollAb.current.cancelled = true;
    setIsRunning(false); setProgress(0); setStatusMsg(""); clearPersistedGen();
    setRigStep("idle");
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
    setLoadingId(item.id); setSelHistId(item.id); setGenStatus(item.status);
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
    const savedHistId = sessionStorage.getItem("tripo_sel_hist");
    const item = urlTaskId
      ? items.find(i => i.taskId === urlTaskId || i.id === urlTaskId)
      : savedHistId
        ? items.find(i => i.id === savedHistId)
        : null;
    if (!item) { setLoadingId(null); return; }
    pendingUrlTaskId.current = null;
    selHist(item);
  }, [selHist]);

  const reuse = useCallback((item) => {
    if (item?.prompt) setPrompt(item.prompt);
    if (item?.taskId) {
      setSegId(item.taskId); setFillId(item.taskId); setRetopoId(item.taskId);
      setTexId(item.taskId); setAnimId(item.taskId); setEditId(item.taskId);
      setRefineId(item.taskId); setStylizeId(item.taskId);
    }
    setErrorMsg("");
  }, []);

  // Rig auto-detection callback — passed to TripoWorkspaceWrapper so it can access riggedIdRef
  const onRigDetected = useCallback((count) => {
    if (riggedIdRef && !riggedIdRef.current && activeTaskId) {
      setRiggedId(activeTaskId);
    }
  }, [activeTaskId, detectedRigModelVer, detectedRigType, detectedRigSpec, animModelVer, rigType, rigSpec]);



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

  const handleRightToggle = useCallback(() => {
    if (!rightOpen && isMobile) {
      setLeftSecondaryOpen(false);
    }
    setRightOpen(v => !v);
  }, [rightOpen, isMobile, setLeftSecondaryOpen]);

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
            </div>
            <div className="flex-1 overflow-y-auto p-4 tp-scroll">
              {mode === "generate" && <GeneratePanel genTab={genTab} setGenTab={setGenTab} modelVer={modelVer} setModelVer={setModelVer} prompt={prompt} setPrompt={setPrompt} negPrompt={negPrompt} setNegPrompt={setNegPrompt} makeBetter={makeBetter} setMakeBetter={setMakeBetter} imgPrev={imgPrev} setImgPrev={setImgPrev} imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef} imgToken={imgToken} setImgToken={setImgToken} setImgFile={setImgFile} meshQ={meshQ} setMeshQ={setMeshQ} inParts={inParts} setInParts={setInParts} privacy={privacy} setPrivacy={setPrivacy} texOn={texOn} setTexOn={setTexOn} tex4K={tex4K} setTex4K={setTex4K} pbrOn={pbrOn} setPbrOn={setPbrOn} polycount={polycount} setPolycount={setPolycount} quadMesh={quadMesh} setQuadMesh={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} tPose={tPose} setTPose={setTPose} modelSeed={modelSeed} setModelSeed={setModelSeed} textureSeed={textureSeed} setTextureSeed={setTextureSeed} imageSeed={imageSeed} setImageSeed={setImageSeed} autoSize={autoSize} setAutoSize={setAutoSize} exportUv={exportUv} setExportUv={setExportUv} multiImages={multiImages} setMultiImages={setMultiImages} batchImages={batchImages} setBatchImages={setBatchImages} handleMultiImg={handleMultiImg} handleBatchImg={handleBatchImg} getIdToken={getIdToken} backendCaps={backendCaps} color={color} isRunning={isRunning} handleGen={handleGen} setErrorMsg={setErrorMsg} activeStyles={activeStyle} onStyleToggle={handleStyleToggle} />}
              {(mode === "segment" || mode === "fill_parts") && <Segment segSub={mode === "fill_parts" ? "fill_parts" : segSub} activeTaskId={activeTaskId} isRiggedInput={isRiggedInput} color={color} />}
              {mode === "retopo" && <Retopo quad={quadMesh} setQuad={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} polycount={polycount} setPolycount={setPolycount} outFormat={outFormat} setOutFormat={setOutFormat} pivotToBottom={pivotToBottom} setPivotToBottom={setPivotToBottom} activeTaskId={activeTaskId} color={color} />}
              {mode === "texture" && <Texture mode={mode} activeTaskId={activeTaskId} texInputTab={texInputTab} setTexInputTab={setTexInputTab} texPrompt={texPrompt} setTexPrompt={setTexPrompt} imgPrev={imgPrev} imgToken={imgToken} imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef} multiImages={multiImages} setMultiImages={setMultiImages} tex4K={tex4K} setTex4K={setTex4K} pbrOn={texPbr} setPbrOn={setTexPbr} texAlignment={texAlignment} setTexAlignment={setTexAlignment} color={color} />}
              {mode === "texture_edit" && <Texture mode={mode} activeTaskId={activeTaskId} brushMode={brushMode} setBrushMode={setBrushMode} brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt} creativity={creativity} setCreativity={setCreativity} brushColor={brushColor} setBrushColor={setBrushColor} brushSize={brushSize} setBrushSize={setBrushSize} canvasRef={canvasRef} color={color} onUndo={() => sceneRef.current?.undoPaint()} />}
              {mode === "animate" && <Animate animId={animId} activeTaskId={activeTaskId} animSearch={animSearch} setAnimSearch={setAnimSearch} animCat={animCat} setAnimCat={setAnimCat} selAnim={selAnim} setSelAnim={setSelAnim} animModelVer={animModelVer} setAnimModelVer={setAnimModelVer} filtAnims={filtAnims} rigStep={rigStep} handleAutoRig={handleAutoRig} rigType={rigType} setRigType={setRigType} rigSpec={rigSpec} setRigSpec={setRigSpec} detectedRigType={detectedRigType} detectedRigModelVer={detectedRigModelVer} detectedRigSpec={detectedRigSpec} prerigcheckResult={prerigcheckResult} handlePrerigcheck={handlePrerigcheck} animOutFormat={animOutFormat} setAnimOutFormat={setAnimOutFormat} animBakeAnimation={animBakeAnimation} setAnimBakeAnimation={setAnimBakeAnimation} animExportGeometry={animExportGeometry} setAnimExportGeometry={setAnimExportGeometry} animAnimateInPlace={animAnimateInPlace} setAnimAnimateInPlace={setAnimAnimateInPlace} color={color} />}
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
            <div className="px-4 pt-4 pb-0 border-t border-white/5 bg-black/20">
              <input
                className="tp-input"
                placeholder={prompt ? prompt.trim().split(/\s+/).slice(0, 2).join(" ") || "Model neve…" : "Model neve…"}
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                style={{ width: "100%", marginBottom: 10, fontSize: 11, height: 36, borderRadius: 10 }}
              />
            </div>
            <div className="p-4 pt-2 border-white/0 bg-black/20">
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
        rigStep={rigStep}
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
        onRigDetected={onRigDetected}
        onAnimClipsDetected={handleAnimClipsDetected}
        animClips={animClips}
        activeClipIdx={activeClipIdx}
        onSwitchClip={handleSwitchClip}
        // 3D Paint
        paintMode={mode === "texture_edit" && brushMode === "Paint Mode"}
        paintColor={brushColor}
        paintSize={brushSize}
        paintCanvasRef={canvasRef}
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
  wireOp, setWireOp, wireC, setWireC, showRig, setShowRig, riggedId, rigStep,
  autoSpin, setAutoSpin,
  loadingId, isRunning, statusMsg, progress, camP, sceneRef,
  dlItem, setDlItem, setDlOpen, dlOpen, handleDlClose, activeH,
  onRigDetected,
  onAnimClipsDetected,
  animClips, activeClipIdx, onSwitchClip,
  // 3D Paint
  paintMode, paintColor, paintSize, paintCanvasRef
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
          {modelUrl && <WireframeControl active={wireOv} onToggle={() => setWireOv(v => !v)} opacity={wireOp} onOpacityChange={setWireOp} color={wireC} onColorChange={setWireC} accentColor={color} />}
          {modelUrl && <RigControl active={showRig} onToggle={() => setShowRig(v => !v)} rigged={!!riggedId} />}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 min-w-0" style={{ flexWrap: 'wrap' }}>
          <BgColorPicker value={bgColor} onChange={setBgColor} />
          <div className="w-px h-5 bg-white/5 hidden sm:block mx-0" />
          <LightingControls viewMode={viewMode} lightMode={lightMode} setLightMode={setLightMode} lightStrength={lStr} setLightStrength={setLStr} lightRotation={lRot} setLightRotation={setLRot} lightAutoRotate={lAutoR} setLightAutoRotate={setLAutoR} lightAutoRotateSpeed={lAutoS} setLightAutoRotateSpeed={setLAutoS} dramaticColor={dramC} setDramaticColor={setDramC} gridColor1={gc1} setGridColor1={setGc1} gridColor2={gc2} setGridColor2={setGc2} color={color} />
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
            lightAutoRotate={lAutoR}
            lightAutoRotateSpeed={lAutoS}
            dramaticColor={dramC}
            wireframeOverlay={wireOv}
            wireOpacity={wireOp}
            wireHexColor={wireC.replace("#", "0x")}
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

        <AnimatePresence>
          {rigStep === "rigging" && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-3xl"
            >
              <div className="w-20 h-20 rounded-[1.5rem] bg-emerald/10 border-2 border-emerald/20 flex items-center justify-center mb-6 shadow-emerald-heavy animate-pulse">
                <PersonStanding className="w-9 h-9 text-emerald shadow-emerald-glow" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em] italic mb-2">Auto Rigging</h2>
              {statusMsg && <p className="text-emerald text-[10px] font-black uppercase tracking-[0.4em] mb-6 opacity-60 leading-relaxed text-center max-w-xs">{statusMsg}</p>}
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald anim-spin" />
                <p className="text-zinc-400 text-[11px] font-bold tracking-wider">Applying skeleton bones…</p>
              </div>
              {progress > 0 && (
                <div style={{ width: 200, marginTop: 16 }}>
                  <PBar value={progress} />
                  <p className="text-[11px] font-mono text-white mt-2 text-center tracking-widest">{progress}%</p>
                </div>
              )}
              <button
                className="mt-6 px-8 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                onClick={handleStop}
              >
                Terminálás
              </button>
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

        {/* Animation clip picker — visible when GLB has 2+ clips */}
        {animClips.length > 1 && modelUrl && !isRunning && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl">
            <Play className="w-3.5 h-3.5 text-cyan-400 mr-1 flex-shrink-0" />
            {animClips.map((clip, i) => (
              <button
                key={i}
                onClick={() => onSwitchClip(i)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeClipIdx === i
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