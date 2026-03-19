// trellis/TripoPanel.jsx
import React, {
  useState, useRef, useCallback, useEffect, useMemo,
} from "react";
import {
  Download, Loader2, AlertCircle, Trash2, RotateCcw,
  Camera, Move3d, Layers, Play, Square, Clock,
  ChevronRight, ChevronLeft, Box, Zap, ChevronDown,
  Sparkles, Grid3x3, Scissors, PaintBucket,
  Boxes, PersonStanding, Wand2,
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

/* ─── constants ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const POLL_MS = 2500;
const POLL_MAX = 120;

// Auto-stop thresholds
const PROGRESS_JUMP_LIMIT = 30;    // stop if progress jumps >30% in one poll
const STUCK_THRESHOLD_MS  = 30_000; // stop if stuck at 99/100% for 30s

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

// Rögzített módköltségek — mode-specifikus taskokhoz.
// A "generate" és "texture" és "retopo" módok dinamikusan számolnak (genCost).
const MODE_COST = {
  segment:      40,  // mesh_segmentation: 40
  fill_parts:   50,  // mesh_completion:   50
  texture_edit: 10,  // texture_edit task
  animate:      10,  // animate_retarget:  10 per animation
};

/* ─── CSS ────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
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
  .tp-nav-btn.active .ico { background:rgba(108,99,255,0.18); }
  .tp-nav-btn .lbl { font-size:10px;font-weight:600;letter-spacing:0.01em;transition:color 0.14s; }
  .tp-nav-btn.active .lbl { color:#a5a0ff; }
  .tp-nav-btn:not(.active) .lbl { color:#2d2d48; }
  .tp-nav-btn:not(.active):hover .lbl { color:#5a5a7a; }
  .tp-nav-btn.active::before { content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:24px;background:linear-gradient(180deg,#8b5cf6,#6c63ff);border-radius:0 3px 3px 0; }
  .tp-switch { width:36px;height:20px;border-radius:10px;position:relative;transition:background 0.2s;flex-shrink:0;cursor:pointer; }
  .tp-switch::after { content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.4); }
  .tp-switch.on::after { transform:translateX(16px); }
  .tp-input { width:100%;padding:8px 11px;border-radius:9px;font-size:12px;color:#e4e4f0;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);outline:none;font-family:inherit;transition:border-color 0.14s;box-sizing:border-box; }
  .tp-input:focus { border-color:rgba(108,99,255,0.5); }
  .tp-input::placeholder { color:#22223a; }
  .tp-ta { width:100%;padding:10px 12px;border-radius:10px;font-size:12px;color:#e4e4f0;background:transparent;border:none;outline:none;font-family:inherit;resize:none;line-height:1.6;box-sizing:border-box; }
  .tp-ta::placeholder { color:#3a3a5a; }
  .tp-drop:hover { border-color:rgba(108,99,255,0.4) !important; }
  .tp-sub-tab { padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;border:none;transition:all 0.13s;font-family:inherit; }
  .tp-sub-tab.on { background:rgba(108,99,255,0.2);color:#a5a0ff; }
  .tp-sub-tab:not(.on) { background:transparent;color:#2d2d48; }
  .tp-sub-tab:not(.on):hover { color:#5a5a7a;background:rgba(255,255,255,0.04); }
  .tp-inp-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.15s;font-family:inherit;background:transparent; }
  .tp-inp-tab.active { background:#ffffff;box-shadow:0 1px 6px rgba(0,0,0,0.35); }
  .tp-qual-btn { flex:1;padding:9px 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all 0.14s;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit; }
  .tp-gen-btn { width:100%;padding:14px 0;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.01em;transition:all 0.2s;font-family:inherit; }
  .tp-gen-btn.go { background:linear-gradient(135deg,#f5c518,#e6a400);color:#0a0800;box-shadow:0 4px 24px rgba(245,197,24,0.3); }
  .tp-gen-btn.go:hover { box-shadow:0 6px 32px rgba(245,197,24,0.42);transform:translateY(-1px); }
  .tp-gen-btn.no { background:rgba(255,255,255,0.05);color:#2d2d48;cursor:not-allowed; }
  .tp-model-card { padding:11px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.13s;margin-bottom:5px; }
  .tp-model-card.sel { background:rgba(108,99,255,0.08);border-color:rgba(108,99,255,0.3); }
  .tp-model-card:hover:not(.sel) { background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.13); }
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
  .tp-topo-btn.sel { background:rgba(108,99,255,0.2);color:#a5a0ff;outline:1.5px solid rgba(108,99,255,0.4); }
  .tp-topo-btn:not(.sel) { background:rgba(255,255,255,0.04);color:#3d3d5a;outline:1.5px solid rgba(255,255,255,0.07); }
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
      <div style={{ width: value + "%", height: "100%", background: "linear-gradient(90deg,#6c63ff99,#6c63ff)", borderRadius: 99, transition: "width 0.4s ease" }} />
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
  const [isRunning, setIsRunning] = useState(false); // ← explicit, nem derived
  // FIX: removed unused `texQ` state (was declared but never read or passed anywhere)
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
  const currentTaskId      = useRef(null);
  const currentRequestId   = useRef(null); // concurrency guard
  const userStoppedRef     = useRef(false);  // true = user explicitly stopped

  // FIX: store panel widths in refs so startDrag doesn't recreate on every resize
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

  // FIX: startDrag no longer has leftW/rightW in its dep array.
  // It reads current values from refs, so it's created only once.
  // The refs are kept in sync via the setLeftW/setRightW calls below.
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
        leftWRef.current = nw;
        setLeftW(nw);
      } else {
        const nw = Math.max(180, Math.min(320, sw - dx));
        rightWRef.current = nw;
        setRightW(nw);
      }
    };
    const up = () => { dragRef.current = null; document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
  }, []); // no deps — reads widths from refs

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

  // FIX: handleMultiImg and handleBatchImg were identical — merged into one uploadImageFile
  const uploadImageFile = useCallback(async (file) => {
    const t = getIdToken ? await getIdToken() : "";
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(BASE_URL + "/api/tripo/upload", {
      method: "POST",
      headers: { Authorization: "Bearer " + t },
      body: form,
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.message);
    return d.imageToken;
  }, [getIdToken]);

  const pollTask = useCallback(async (taskId, pt, headers, onSuccess) => {
    let n = 0;
    let prevProgress  = 0;
    let stuckSince    = null;

    while (n < POLL_MAX) {
      if (pt.cancelled) return;
      await new Promise(r => setTimeout(r, POLL_MS));
      if (pt.cancelled) return;
      n++;

      const res = await fetch(BASE_URL + "/api/tripo/task/" + taskId, { headers });
      const d   = await res.json();
      if (!d.success) throw new Error(d.message ?? "Poll error");

      const prog = d.progress ?? 0;

      // AUTO-STOP A: suspicious progress jump
      if (d.status !== "success" && prog - prevProgress > PROGRESS_JUMP_LIMIT) {
        throw Object.assign(
          new Error(`Auto-stopped: suspicious progress jump (${prevProgress}% → ${prog}%)`),
          { type: "auto_stop", autoStop: true }
        );
      }

      // AUTO-STOP B: stuck at 99/100% for 30s
      if (d.status !== "success" && prog >= 99) {
        if (!stuckSince) stuckSince = Date.now();
        else if (Date.now() - stuckSince > STUCK_THRESHOLD_MS) {
          throw Object.assign(
            new Error("Auto-stopped: stuck at " + prog + "% for 30s"),
            { type: "auto_stop", autoStop: true }
          );
        }
      } else {
        stuckSince = null;
      }

      // Update progress & persist snapshot
      if (d.status !== "success" && d.status !== "failed" && d.status !== "cancelled") {
        const dp = Math.min(prog, 99);
        setProgress(dp);
        updatePersistedProgress(dp);
        prevProgress = prog;
      }

      if (d.status === "success") {
        if (!d.modelUrl) {
          throw Object.assign(
            new Error("Content blocked by Tripo. Credits were not charged."),
            { type: "nsfw" }
          );
        }
        await onSuccess(d);
        return;
      }
      if (d.status === "failed" || d.status === "cancelled") {
        throw Object.assign(
          new Error("Task " + d.status),
          { tripoStatus: d.status, rawOutput: d }
        );
      }
    }
    throw new Error("Timeout");
  }, []);

  const fetchProxy = useCallback(async (rawUrl) => {
    const t = await getIdToken();
    const res = await fetch(BASE_URL + "/api/tripo/model-proxy?url=" + encodeURIComponent(rawUrl), {
      headers: { Authorization: "Bearer " + t },
    });
    if (!res.ok) throw new Error("Model load: " + res.status);
    return URL.createObjectURL(await res.blob());
  }, [getIdToken]);

  // FIX: helper to safely revoke blob URLs — prevents RAM accumulation
  // every fetchProxy call creates a blob:// that must be explicitly freed
  const revokeBlobUrl = useCallback((url) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  }, []);

  // FIX: cleanup on unmount — releases the last active blob from memory
  useEffect(() => {
    return () => { revokeBlobUrl(prevUrl.current); };
  }, []); // eslint-disable-line

  // Page-reload resume: reconnect to an in-progress generation
  useEffect(() => {
    const persisted = loadPersistedGen();
    if (!persisted) return;
    console.log("[TripoPanel] Resuming after reload:", persisted.taskId);
    setIsRunning(true);
    setProgress(persisted.lastProgress ?? 0);
    setStatusMsg("Resuming generation…");
    currentTaskId.current = persisted.taskId;
    userStoppedRef.current = false;
    const requestId = crypto.randomUUID();
    currentRequestId.current = requestId;
    const pt = { cancelled: false };
    pollAb.current = pt;
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
          setGenStatus("succeeded"); setProgress(100); setStatusMsg("");
          setIsRunning(false);
          currentTaskId.current = null;
          clearPersistedGen();
          await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? "" });
        });
      } catch (e) {
        setIsRunning(false); setProgress(0); setStatusMsg("");
        currentTaskId.current = null;
        clearPersistedGen();
        if (!pt.cancelled) {
          setGenStatus(e.autoStop ? "idle" : "failed");
          setErrorMsg(e.message ?? "Resumed generation failed");
        } else {
          setGenStatus(prevUrl.current ? "succeeded" : "idle");
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  const saveHist = useCallback(async (taskId, rawUrl, extra = {}) => {
    const item = { prompt: prompt.trim() || extra.label || mode, status: "succeeded", model_url: rawUrl, source: "tripo", mode, taskId, params: { model_version: modelVer, mode, ...extra }, ts: Date.now() };
    const { docId } = await saveHistoryToFirestore(userId, item);
    const ni = { id: docId ?? ("tripo_" + Date.now()), ...item, createdAt: { toDate: () => new Date() } };
    setHistory(h => [ni, ...h]); setActiveH(ni); histInit.current = true; return ni;
  }, [userId, prompt, mode, modelVer]);

  const handleGen = useCallback(async () => {
    if (!canGen) return;
    setGenStatus("pending");
    setIsRunning(true); // ← explicit true
    setErrorMsg(""); setProgress(0); setStatusMsg("");
    prevUrl.current = modelUrl; setModelUrl(null); setGenStatus("pending");
    if (pollAb.current) pollAb.current.cancelled = true;
    const pt = { cancelled: false }; pollAb.current = pt;

    // Unique requestId for stale-response detection
    const requestId = crypto.randomUUID();
    currentRequestId.current = requestId;
    userStoppedRef.current = false;

    const srcId = activeTaskId;
    const animSlug = selAnim ? getAnimById(selAnim)?.slug : null;
    try {
      const headers = await authH();
      let body;
      // isModernModel: P1-20260311 és V3.x modellek támogatják a geometry_quality (Ultra) módot
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
        case "segment":
          body = { type: "mesh_segmentation", original_model_task_id: (segId.trim() || srcId) }; break;
        case "fill_parts":
          body = { type: "mesh_completion", original_model_task_id: (fillId.trim() || srcId) }; break;
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
          body = { type: "texture_edit", original_model_task_id: (editId.trim() || srcId), ...(brushPrompt.trim() && { prompt: brushPrompt.trim() }), creativity_strength: creativity };
          break;
        case "animate":
          body = { type: "animate_retarget", original_model_task_id: riggedId, animation: animSlug, out_format: "glb" };
          break;
        default: return;
      }

      setStatusMsg("Starting…");
      const tr = await fetch(BASE_URL + "/api/tripo/task", { method: "POST", headers, body: JSON.stringify(body) });
      const td = await tr.json();

      // ── Ismert hibatípusok felismerése task létrehozáskor ──────────────
      if (!td.success) {
        const msg = td.message ?? "Task failed";
        const lower = msg.toLowerCase();
        if (lower.includes("insufficient") || lower.includes("credit") || lower.includes("balance")) {
          throw Object.assign(new Error("Insufficient credits. Please top up your balance."), { type: "credits" });
        }
        if (lower.includes("nsfw") || lower.includes("content policy") || lower.includes("moderat")) {
          throw Object.assign(new Error("Content blocked: NSFW or policy violation detected."), { type: "nsfw" });
        }
        throw new Error(msg);
      }

      // ── Tároljuk a taskId-t, hogy Stop-kor le tudjuk cancelolni ───────
      currentTaskId.current = td.taskId;
      persistGen({
        taskId: td.taskId, requestId, mode, prompt: prompt.trim(), modelVer,
        lastProgress: 0, lastProgressAt: Date.now(), startedAt: Date.now(),
      });
      setStatusMsg("Generating…");
      await pollTask(td.taskId, pt, headers, async d => {
        if (pt.cancelled) return;

        // ── Poll-szintű hibák felismerése (NSFW, credit, failed) ──────────


        // Stale response guard
        if (currentRequestId.current !== requestId) return;

        const rawUrl = d.modelUrl;
        if (!rawUrl) {
          throw Object.assign(
            new Error("Generation blocked: content policy or empty output. Credits were not charged."),
            { type: "nsfw" }
          );
        }
        const blob = await fetchProxy(rawUrl);
        if (pt.cancelled) { revokeBlobUrl(blob); return; }
        revokeBlobUrl(prevUrl.current);
        setModelUrl(blob); prevUrl.current = blob;
        setGenStatus("succeeded"); setProgress(100); setStatusMsg("");
        setIsRunning(false);
        currentTaskId.current = null;
        clearPersistedGen();
        // History: only if user did NOT explicitly stop
        if (!userStoppedRef.current) {
          await saveHist(td.taskId, rawUrl, { prompt: prompt.trim() });
        }
      });
    } catch (e) {
      setIsRunning(false);
      setProgress(0);
      setStatusMsg("");
      currentTaskId.current = null;
      clearPersistedGen();

      // User cancelled
      if (pt.cancelled) {
        setModelUrl(prevUrl.current);
        setGenStatus(prevUrl.current ? "succeeded" : "idle");
        return;
      }

      // System auto-stop (progress jump / stuck)
      if (e.autoStop) {
        setModelUrl(prevUrl.current);
        setGenStatus(prevUrl.current ? "succeeded" : "idle");
        setErrorMsg(e.message);
        return;
      }

      // ── Hibatípus felismerés ───────────────────────────────────────────
      if (!e.type && e.rawOutput) {
        const reason = (
          e.rawOutput?.rawOutput?.error_msg ??
          e.rawOutput?.rawOutput?.message ??
          e.rawOutput?.rawOutput?.reason ??
          ""
        ).toLowerCase();
        if (reason.includes("nsfw") || reason.includes("content policy") || reason.includes("safety")) {
          e.type = "nsfw";
          e.message = "Content blocked: NSFW or policy violation detected.";
        } else if (reason.includes("insufficient") || reason.includes("credit")) {
          e.type = "credits";
          e.message = "Insufficient credits. Please top up your balance.";
        }
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
        if (blob) {
          // FIX: revoke old blob before replacing
          revokeBlobUrl(prevUrl.current);
          setModelUrl(blob); prevUrl.current = blob;
        }
        setRiggedId(rd.taskId); setRigStep("rigged"); setStatusMsg(""); setGenStatus("succeeded");
      });
    } catch (e) { if (pt.cancelled) return; setRigStep("idle"); setErrorMsg(e.message); setStatusMsg(""); }
  }, [activeTaskId, animId, authH, pollTask, fetchProxy, revokeBlobUrl]);
  const handleStop = useCallback(async () => {
    userStoppedRef.current = true; // user-initiated: suppress history save
    if (pollAb.current) pollAb.current.cancelled = true;
    setIsRunning(false);
    setProgress(0);
    setStatusMsg("");
    clearPersistedGen();
    const taskId = currentTaskId.current;
    if (taskId) {
      currentTaskId.current = null;
      try {
        const t = getIdToken ? await getIdToken() : "";
        await fetch(BASE_URL + "/api/tripo/task/" + taskId + "/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
        });
      } catch (err) {
        console.warn("[handleStop] cancel request failed:", err.message);
      }
    }
    setModelUrl(prevUrl.current);
    setGenStatus(prevUrl.current ? "succeeded" : "idle");
    setErrorMsg("");
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
          try {
            const b = await fetchProxy(l.model_url);
            // FIX: revoke old blob before setting new one
            revokeBlobUrl(prevUrl.current);
            setModelUrl(b); prevUrl.current = b;
          } catch { setModelUrl(l.model_url); prevUrl.current = l.model_url; }
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
        if (!t.cancelled) {
          // FIX: free the previous model blob before showing the new one
          revokeBlobUrl(prevUrl.current);
          setModelUrl(b); prevUrl.current = b;
        } else {
          // FIX: if selection was cancelled mid-fetch, free the new blob too
          revokeBlobUrl(b);
        }
      } catch {
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
      const res = await fetch(BASE_URL + "/api/trellis/history/" + toDel.id, { method: "DELETE", headers });
      const d = await res.json();
      if (d.success) {
        const dId = toDel.id, wasA = activeH?.id === dId;
        setHistory(prev => {
          const next = prev.filter(i => i.id !== dId);
          if (wasA) {
            if (next.length === 0) {
              setActiveH(null);
              // FIX: revoke blob when clearing the active model
              revokeBlobUrl(prevUrl.current);
              setModelUrl(null); prevUrl.current = null; setGenStatus("idle");
            } else {
              const idx = prev.findIndex(i => i.id === dId);
              setTimeout(() => selHist(next[Math.max(0, idx - 1)]), 0);
            }
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
      const res = await fetch(BASE_URL + "/api/trellis/history", { method: "DELETE", headers });
      const d = await res.json();
      if (d.success) {
        setHistory([]); setActiveH(null);
        // FIX: revoke blob before nulling it
        revokeBlobUrl(prevUrl.current);
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
    // Texture Generation (önálló retexture task): std=10, HD=20
    if (mode === "texture") return tex4K ? 20 : 10;
    // Post Processing: Retopology
    if (mode === "retopo") return smartLowPoly ? 10 : 5;
    // Egyéb rögzített módok (segment, fill_parts, texture_edit, animate)
    if (mode !== "generate") return MODE_COST[mode] ?? 10;

    // ── 3D Generálás ─────────────────────────────────────────────────
    const type = genTab === "text"  ? "text_to_model"
               : genTab === "multi" ? "multiview_to_model"
                                    : "image_to_model";

    // V1.4: lapos árazás, nincs textúra addon
    if (modelVer === "v1.4-20240625") {
      return type === "text_to_model" ? 20 : 30;
    }

    /*
     * Alapár = WITHOUT TEXTURE ár (CREDIT_COSTS["type:mv"]):
     *   P1-20260311  text: 30  |  P1-20260311  image/multi: 40
     *   Többi text: 10  |  Többi image/multi: 20
     *
     * Textúra addonok (modelltől függetlenül egységes):
     *   Standard Texture: +10
     *   Detailed Texture: +20  (standard +10, HD/detailed upgrade +10)
     *
     * Összesített árak:
     *   P1-20260311  text:  30 (no tex) | 40 (std) | 50 (HD)
     *   P1-20260311  image: 40 (no tex) | 50 (std) | 60 (HD)
     *   Többi text:  10 (no tex) | 20 (std) | 30 (detailed)
     *   Többi image: 20 (no tex) | 30 (std) | 40 (detailed)
     *
     * Advanced Generation Setup addonok az alapárra adódnak:
     *   Detailed Geometry Quality (Ultra): +20
     *   Low Poly:                          +10
     *   Generate in parts:                 +20
     *   Quad Topology:                      +5
     *   Style:                              +5
     */
    const isP1     = modelVer === "P1-20260311";
    const isText   = type === "text_to_model";
    const isModern = modelVer === "P1-20260311" || modelVer.startsWith("v3.");
    const isUltra  = meshQ === "ultra" && isModern;

    // Without-texture alap (modell + típus függő)
    const base = isP1 ? (isText ? 30 : 40) : (isText ? 10 : 20);

    // Textúra addon: std=+10, HD=+20
    const hasTex  = texOn || pbrOn;
    const texAddon = !hasTex ? 0 : tex4K ? 20 : 10;

    // Advanced Generation Setup addonok
    const ultraAddon = isUltra      ? 20 : 0;
    const slpCost    = smartLowPoly ? 10 : 0;
    const partsCost  = inParts      ? 20 : 0;
    const quadCost   = quadMesh     ?  5 : 0;
    // const styleCost = genStyle ? 5 : 0;

    return base + texAddon + ultraAddon + slpCost + partsCost + quadCost;
  }, [mode, genTab, texOn, pbrOn, tex4K, meshQ, inParts, quadMesh, smartLowPoly, modelVer]);
  // FIX: download modal blob cleanup — the onDownload handler creates a new
  // fetchProxy blob for the download modal. When the modal is closed we revoke it.
  const handleDlClose = useCallback(() => {
    if (dlItem?.blobUrl) revokeBlobUrl(dlItem.blobUrl);
    setDlOpen(false); setDlItem(null);
  }, [dlItem, revokeBlobUrl]);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "'DM Sans',-apple-system,sans-serif", background: "#09090f" }}>

        {/* ── NAV ── */}
        <div style={{ width: 58, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", background: "#0b0b17", borderRight: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, overflowY: "auto" }} className="tp-scroll">
          {NAV.map(n => (
            <button key={n.id} className={"tp-nav-btn" + (mode === n.id ? " active" : "")} onClick={() => { setMode(n.id); setErrorMsg(""); }}>
              <div className="ico"><n.icon style={{ width: 17, height: 17, color: mode === n.id ? "#a5a0ff" : "#2d2d48" }} /></div>
              <span className="lbl">{n.label}</span>
              {n.sub && <ChevronDown style={{ width: 8, height: 8, color: mode === n.id ? "#4a4a68" : "#1a1a30", marginTop: -2 }} />}
            </button>
          ))}
        </div>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: leftOpen ? leftW : 0, minWidth: 0, flexShrink: 0, overflow: "hidden", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", background: "#0c0c18", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: leftW, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.055)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: mode === "segment" ? 10 : 0 }}>
                {mode === "generate" && <Sparkles style={{ width: 14, height: 14, color: "#6c63ff" }} />}
                {mode === "segment" && <Scissors style={{ width: 14, height: 14, color: "#6c63ff" }} />}
                {mode === "fill_parts" && <Boxes style={{ width: 14, height: 14, color: "#6c63ff" }} />}
                {mode === "retopo" && <Grid3x3 style={{ width: 14, height: 14, color: "#6c63ff" }} />}
                {mode === "texture" && <PaintBucket style={{ width: 14, height: 14, color: "#6c63ff" }} />}
                {mode === "texture_edit" && <Wand2 style={{ width: 14, height: 14, color: "#6c63ff" }} />}
                {mode === "animate" && <PersonStanding style={{ width: 14, height: 14, color: "#6c63ff" }} />}
                <span style={{ color: "#e8e8f4", fontSize: 14, fontWeight: 700 }}>{modeTitle}</span>
              </div>
              {mode === "segment" && (
                <div style={{ display: "flex", gap: 3 }}>
                  {SEGMENT_SUBS.map(t => (
                    <button key={t.id} className={"tp-sub-tab" + (segSub === t.id ? " on" : "")} onClick={() => setSegSub(t.id)}>{t.label}</button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }} className="tp-scroll">
              <div style={{ padding: "14px 16px" }}>
                {mode === "generate" && (
                  <GeneratePanel
                    genTab={genTab} setGenTab={setGenTab}
                    prompt={prompt} setPrompt={setPrompt}
                    makeBetter={makeBetter} setMakeBetter={setMakeBetter}
                    imgPrev={imgPrev} imgToken={imgToken}
                    imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef}
                    multiImages={multiImages} setMultiImages={setMultiImages}
                    batchImages={batchImages} setBatchImages={setBatchImages}
                    meshQ={meshQ} setMeshQ={setMeshQ}
                    inParts={inParts} setInParts={setInParts}
                    privacy={privacy} setPrivacy={setPrivacy}
                    texOn={texOn} setTexOn={setTexOn}
                    negPrompt={negPrompt} setNegPrompt={setNegPrompt}
                    tPose={tPose} setTPose={setTPose}
                    modelSeed={modelSeed} setModelSeed={setModelSeed}
                    textureSeed={textureSeed} setTextureSeed={setTextureSeed}
                    imageSeed={imageSeed} setImageSeed={setImageSeed}
                    autoSize={autoSize} setAutoSize={setAutoSize}
                    exportUv={exportUv} setExportUv={setExportUv}
                    tex4K={tex4K} setTex4K={setTex4K}
                    pbrOn={pbrOn} setPbrOn={setPbrOn}
                    quadMesh={quadMesh} setQuadMesh={setQuadMesh}
                    smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly}
                    polycount={polycount} setPolycount={setPolycount}
                    modelVer={modelVer} setModelVer={setModelVer}
                    isRunning={isRunning} canGen={canGen}
                    handleGen={handleGen} setErrorMsg={setErrorMsg}
                    handleMultiImg={uploadImageFile}
                    handleBatchImg={uploadImageFile}
                    getIdToken={getIdToken}
                  />
                )}
                {(mode === "segment" || mode === "fill_parts") && (
                  <Segment segSub={mode === "fill_parts" ? "fill_parts" : segSub} activeTaskId={activeTaskId} isRiggedInput={isRiggedInput} />
                )}
                {mode === "retopo" && (
                  <Retopo activeTaskId={activeTaskId} quad={quadMesh} setQuad={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} polycount={polycount} setPolycount={setPolycount} outFormat={outFormat} setOutFormat={setOutFormat} pivotToBottom={pivotToBottom} setPivotToBottom={setPivotToBottom} isRiggedInput={isRiggedInput} />
                )}
                {(mode === "texture" || mode === "texture_edit") && (
                  <Texture mode={mode} activeTaskId={activeTaskId} texInputTab={texInputTab} setTexInputTab={setTexInputTab} texPrompt={texPrompt} setTexPrompt={setTexPrompt} imgPrev={imgPrev} imgToken={imgToken} imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef} multiImages={multiImages} setMultiImages={setMultiImages} tex4K={tex4K} setTex4K={setTex4K} pbrOn={texPbr} setPbrOn={setTexPbr} texAlignment={texAlignment} setTexAlignment={setTexAlignment} brushMode={brushMode} setBrushMode={setBrushMode} brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt} creativity={creativity} setCreativity={setCreativity} brushColor={brushColor} setBrushColor={setBrushColor} />
                )}
                {mode === "animate" && (
                  <Animate activeTaskId={activeTaskId} animId={animId} rigStep={rigStep} handleAutoRig={handleAutoRig} selAnim={selAnim} setSelAnim={setSelAnim} animModelVer={animModelVer} setAnimModelVer={setAnimModelVer} animSearch={animSearch} setAnimSearch={setAnimSearch} animCat={animCat} setAnimCat={setAnimCat} filtAnims={filtAnims} />
                )}
                {errorMsg && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", marginTop: 12 }}>
                    <AlertCircle style={{ width: 13, height: 13, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
                    <p style={{ color: "#fca5a5", fontSize: 11, margin: 0, lineHeight: 1.55 }}>{errorMsg}</p>
                  </div>
                )}
                <div style={{ height: 12 }} />
              </div>
            </div>

            <div style={{ padding: "12px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.055)", flexShrink: 0 }}>
              {isRunning ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <PBar value={progress} />
                  {statusMsg && <p style={{ color: "#8a8aaa", fontSize: 10, margin: 0, textAlign: "center", fontFamily: "monospace" }}>{statusMsg}</p>}
                  <button onClick={handleStop} style={{ width: "100%", padding: "12px 0", borderRadius: 11, fontSize: 13, fontWeight: 600, color: "#fca5a5", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", border: "none", background: "rgba(239,68,68,0.09)", outline: "1.5px solid rgba(239,68,68,0.2)", fontFamily: "inherit" }}>
                    <Square style={{ width: 12, height: 12 }} /> Stop
                  </button>
                </div>
              ) : (
                <>
                  <button className={"tp-gen-btn" + (canGen ? " go" : " no")} onClick={handleGen} disabled={!canGen}>
                    {genLabel}
                    {canGen && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 4, paddingLeft: 8, borderLeft: "1px solid rgba(0,0,0,0.2)" }}>
                        <CoinIcon size={16} /><span style={{ fontSize: 14, fontWeight: 800 }}>{genCost}</span>
                      </div>
                    )}
                  </button>
                  {modelUrl && !isRunning && (
                    <button onClick={() => { setDlItem(null); setDlOpen(true); }}
                      style={{ width: "100%", marginTop: 7, padding: "9px 0", borderRadius: 9, fontSize: 11, fontWeight: 600, color: "#4a4a68", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", border: "1.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", fontFamily: "inherit", transition: "all 0.14s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#8a8aaa"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#4a4a68"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}>
                      <Download style={{ width: 11, height: 11 }} /> Download
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Left handle */}
        <div className="tp-handle" onMouseDown={startDrag("left")}>
          <div className="tp-hbtn" onMouseDown={e => e.stopPropagation()} onClick={() => setLeftOpen(v => !v)}>
            {leftOpen ? <ChevronLeft style={{ width: 9, height: 9, color: "#5a5a7a" }} /> : <ChevronRight style={{ width: 9, height: 9, color: "#5a5a7a" }} />}
          </div>
        </div>

        {/* ── CENTER ── */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#09090f", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: 40, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.055)", background: "rgba(9,9,18,0.98)", gap: 12, overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {!leftOpen && <button onClick={() => setLeftOpen(true)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", color: "#2d2d48", marginRight: 4 }}><ChevronRight style={{ width: 11, height: 11 }} /></button>}
              <span style={{ color: "#1a1a30", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "monospace", marginRight: 3 }}>View</span>
              {VIEW_MODES.map(v => (
                <Tooltip key={v.id} text={v.tip} side="bottom">
                  <button onClick={() => setViewMode(v.id)} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none", background: viewMode === v.id ? "rgba(108,99,255,0.18)" : "rgba(255,255,255,0.03)", color: viewMode === v.id ? "#a5a0ff" : "#2d2d48", outline: viewMode === v.id ? "1px solid rgba(108,99,255,0.38)" : "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap", flexShrink: 0 }}>{v.label}</button>
                </Tooltip>
              ))}
              {modelUrl && <WireframeControl active={wireOv} onToggle={() => setWireOv(v => !v)} opacity={wireOp} onOpacityChange={setWireOp} color={wireC} onColorChange={setWireC} accentColor={color} />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <BgColorPicker value={bgColor} onChange={setBgColor} />
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.06)" }} />
              <LightingControls viewMode={viewMode} lightMode={lightMode} setLightMode={setLightMode} lightStrength={lStr} setLightStrength={setLStr} lightRotation={lRot} setLightRotation={setLRot} lightAutoRotate={lAutoR} setLightAutoRotate={setLAutoR} lightAutoRotateSpeed={lAutoS} setLightAutoRotateSpeed={setLAutoS} dramaticColor={dramC} setDramaticColor={setDramC} gridColor1={gc1} setGridColor1={setGc1} gridColor2={gc2} setGridColor2={setGc2} color={color} />
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.06)" }} />
              <IconBtn icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" /></svg>} tip="Grid" active={showGrid} color={color} onClick={() => setShowGrid(v => !v)} />
              {!rightOpen && <button onClick={() => setRightOpen(true)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", color: "#2d2d48" }}><ChevronLeft style={{ width: 11, height: 11 }} /></button>}
            </div>
          </div>

          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <ThreeViewer color={color} viewMode={viewMode} lightMode={lightMode} showGrid={showGrid} modelUrl={modelUrl} lightStrength={lStr} lightRotation={lRot} lightAutoRotate={lAutoR} lightAutoRotateSpeed={lAutoS} dramaticColor={dramC} wireframeOverlay={wireOv} wireOpacity={wireOp} wireHexColor={wireHex} autoSpin={autoSpin} bgColor={bgColor} gridColor1={gc1} gridColor2={gc2} onSpinStop={() => setAutoSpin(false)} onReady={s => { sceneRef.current = s; }} />
            {(histLoad || (loadingId && !isRunning)) && (
              <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(9,9,18,0.72)", backdropFilter: "blur(12px)" }}>
                <Loader2 style={{ width: 22, height: 22, color: "#6c63ff", marginBottom: 10 }} className="anim-spin" />
                <p style={{ color: "#22223a", fontSize: 10, margin: 0, fontFamily: "monospace" }}>{histLoad ? "Loading history…" : "Loading model…"}</p>
              </div>
            )}
            {isRunning && (
              <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(4,4,14,0.9)", backdropFilter: "blur(18px)", pointerEvents: "none" }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 22, background: "rgba(108,99,255,0.1)", border: "1.5px solid rgba(108,99,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(108,99,255,0.16)" }}>
                  <Sparkles style={{ width: 28, height: 28, color: "#8b7fff" }} />
                </div>
                <p style={{ color: "#e8e8f4", fontWeight: 700, fontSize: 15, margin: "0 0 6px" }}>{genLabel}…</p>
                {statusMsg && <p style={{ color: "#2d2d48", fontSize: 11, margin: "0 0 14px", fontFamily: "monospace" }}>{statusMsg}</p>}
                <div style={{ width: 220 }}><PBar value={progress} /></div>
                <p style={{ color: "#6c63ff", fontSize: 13, fontWeight: 700, margin: "8px 0 0", fontFamily: "monospace", letterSpacing: "0.05em" }}>{progress}%</p>
              </div>
            )}
            {!isRunning && !modelUrl && !histLoad && !loadingId && (
              <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 18, background: "rgba(108,99,255,0.04)", border: "1px solid rgba(108,99,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Box style={{ width: 30, height: 30, color: "rgba(108,99,255,0.18)" }} />
                </div>
                <p style={{ color: "#14142a", fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Tripo3D Studio</p>
                <p style={{ color: "#0e0e22", fontSize: 10, fontFamily: "monospace" }}>{genLabel}</p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: 40, flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.055)", background: "rgba(9,9,18,0.98)", overflowX: "auto", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <span style={{ color: "#1a1a30", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "monospace", marginRight: 2 }}>Camera</span>
              <IconBtn icon={<RotateCcw />} tip="Reset" onClick={() => camP("reset")} />
              <IconBtn icon={<Camera />} tip="Front" onClick={() => camP("front")} />
              <IconBtn icon={<Move3d />} tip="Side" onClick={() => camP("side")} />
              <IconBtn icon={<Layers />} tip="Top" onClick={() => camP("top")} />
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.06)", margin: "0 4px" }} />
              <button onClick={() => setAutoSpin(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none", background: autoSpin ? "rgba(108,99,255,0.18)" : "rgba(255,255,255,0.03)", color: autoSpin ? "#a5a0ff" : "#2d2d48", outline: autoSpin ? "1px solid rgba(108,99,255,0.38)" : "1px solid rgba(255,255,255,0.06)", fontFamily: "inherit" }}>
                {autoSpin ? <Square style={{ width: 9, height: 9 }} /> : <Play style={{ width: 9, height: 9 }} />} Auto-spin
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {modelUrl && (
                <button onClick={() => { setDlItem(null); setDlOpen(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#6c63ff,#8b7fff)", border: "none", cursor: "pointer", boxShadow: "0 2px 14px rgba(108,99,255,0.35)", fontFamily: "inherit" }}>
                  <Download style={{ width: 11, height: 11 }} /> Download
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

        {/* ── RIGHT: History ── */}
        <div style={{ width: rightOpen ? rightW : 0, minWidth: 0, flexShrink: 0, overflow: "hidden", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", background: "#0c0c18", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: rightW, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid rgba(255,255,255,0.055)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
                <Clock style={{ width: 11, height: 11, color: "#2d2d48" }} />
                <span style={{ color: "#5a5a7a", fontSize: 12, fontWeight: 700 }}>History</span>
                <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "rgba(108,99,255,0.1)", color: "rgba(108,99,255,0.6)", border: "1px solid rgba(108,99,255,0.14)", fontFamily: "monospace" }}>{history.length}{hasMore ? "+ " : ""}</span>
              </div>
              <input placeholder="Search…" value={histQ} onChange={e => setHistQ(e.target.value)} className="tp-input" style={{ fontSize: 11 }}
                onFocus={e => e.target.style.borderColor = "rgba(108,99,255,0.45)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }} className="tp-scroll">
              {histLoad && <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Loader2 style={{ width: 14, height: 14, color: "#1e1e38" }} className="anim-spin" /></div>}
              {!histLoad && filtHist.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 130, gap: 8 }}>
                  <Box style={{ width: 20, height: 20, color: "#111128" }} />
                  <p style={{ color: "#14142a", fontSize: 10, margin: 0 }}>{histQ ? "No results" : "No saved models yet"}</p>
                </div>
              )}
              {filtHist.map((item, idx) => (
                <div key={item.id} style={{ animationDelay: (Math.min(idx, 4) * 0.04) + "s" }} className="fade-up">
                  <HistoryCard
                    item={item} isActive={activeH?.id === item.id} isLoading={loadingId === item.id}
                    disabled={loadingId !== null} onSelect={selHist} onReuse={reuse}
                    onDownload={async (i) => {
                      try {
                        const b = await fetchProxy(i.model_url);
                        // FIX: store blob in dlItem so handleDlClose can revoke it on close
                        setDlItem({ blobUrl: b, item: i });
                        setDlOpen(true);
                      } catch (e) { alert(e.message); }
                    }}
                    onDelete={i => { setToDel(i); setDelModal(true); }}
                    color={color} getIdToken={getIdToken}
                  />
                </div>
              ))}
              {!histQ && hasMore && (
                <button onClick={loadMore} disabled={moreLoad}
                  style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: 9, fontWeight: 600, color: moreLoad ? "#1e1e38" : "#2d2d48", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: moreLoad ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "monospace" }}>
                  {moreLoad ? <><Loader2 style={{ width: 9, height: 9 }} className="anim-spin" />Loading…</> : <><ChevronDown style={{ width: 9, height: 9 }} />Load more</>}
                </button>
              )}
              {!histQ && !hasMore && history.length > 0 && <p style={{ textAlign: "center", fontSize: 8, color: "#0e0e22", fontFamily: "monospace", padding: "6px 0" }}>{"— " + history.length + " models —"}</p>}
            </div>
            {history.length > 0 && (
              <div style={{ padding: "6px 8px", borderTop: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <button onClick={() => setClrModal(true)}
                  style={{ width: "100%", padding: "6px 0", borderRadius: 7, fontSize: 9, fontWeight: 600, color: "#1e1e38", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit", transition: "all 0.13s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#1e1e38"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}>
                  <Trash2 style={{ width: 9, height: 9 }} /> Clear history
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={delModal} onClose={() => { if (!deleting) { setDelModal(false); setToDel(null); } }} onConfirm={confirmDel} title="Delete model" message={"Delete \"" + ((toDel?.prompt?.slice(0, 60)) || "") + "…\"?"} confirmText="Delete" confirmColor="#ef4444" isDeleting={deleting} />
      <ConfirmModal isOpen={clrModal} onClose={() => { if (!deleting) setClrModal(false); }} onConfirm={confirmClr} title="Clear history" message={"Delete all " + history.length + " Tripo models?"} confirmText="Clear all" confirmColor="#dc2626" isDeleting={deleting} />
      {/* FIX: onClose now calls handleDlClose which revokes the download blob */}
      <DownloadModal isOpen={dlOpen} onClose={handleDlClose} glbBlobUrl={dlItem ? dlItem.blobUrl : modelUrl} scene={sceneRef.current?.scene ?? sceneRef.current} filename={dlItem ? (dlItem.item?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now())) : (activeH?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now()))} color={color} />
    </>
  );
}