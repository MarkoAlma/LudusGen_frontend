import React, {
  useState, useRef, useCallback, useEffect, useMemo, useContext, useReducer,
} from "react";
import {
  Download, Loader2, AlertCircle, Trash2, RotateCcw,
  Camera, Move3d, Layers, Play, Square, ChevronRight, ChevronLeft, Box, Zap, Info,
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
import { persistGen, loadPersistedGen, updatePersistedProgress, clearPersistedGen, markHistorySaved, persistActiveTask, persistActiveTasks, removeActiveTask, loadPersistedActiveTasks } from "./useGenerationPersist";

import { useActiveTasksPoller } from "./useActiveTasksPoller";
import { checkThumbnailCache, getCachedThumbnail } from "../trellis/Glbthumbnail";
import { fetchModelData } from "../trellis/utils";
import { getHistoryThumbnailCacheKey } from "../shared/historyThumbnailCache";
import { useTripoHistory } from "./useTripoHistory";
import { useTripoRig } from "./useTripoRig";
import GeneratePanel, { MODEL_VERSIONS, STYLE_PREFIX } from "./GeneratePanel";
import MultiviewImagesPanel from "./MultiviewImagesPanel";
import { DEFAULT_MODEL_VERSION, DEFAULT_TEXTURE_MODEL_VERSION, DETAILED_TEXTURE_MODEL_VERSION, TEXTURE_MODEL_VERSIONS } from "./constants";
import { streamTaskStatus, uploadViaTripoSts } from "./tripoTransfers";
import { resolveTripoModelUrl, resolveTripoUrlNode } from "./utils/modelUrl";
import { estimateTripoPanelGenerationCost } from "./tripoGenerationCost";
import { buildImageToModelSubmission } from "./tripoGenerationRequest";
import {
  MULTIVIEW_UPLOAD_ORDER,
  buildMultiviewPreviewItems,
  getMultiviewFilesPayload,
  getReadyMultiviewRefs,
  hasTaskImagePreview,
  isMultiviewUploadReady,
} from "./multiviewUtils";
import {
  downloadImageHistoryZip,
  extractTripoPreviewImageUrls,
  getHistoryImageUrls,
  getModelPreviewImageUrl,
  isImageHistoryItem,
} from "./tripoImageHistoryUtils";
import { shouldAutoSelectGeneratedHistoryItem } from "./tripoAutoSelectionPolicy";
import Segment from "./Segment";
import Retopo from "./Retopo";
import Texture from "./Texture";
import Animate from "./Animate";
import {
  REFINE_DIRECT_SOURCE_TYPES,
  UPSTREAM_SOURCE_TYPES,
  getHistoryModelVersion,
  getHistoryTaskType,
  itemHasTexture as resolveItemHasTexture,
  resolveOperationSource,
} from "./tripoSourceResolver";
import { motion, AnimatePresence, animate } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { MyUserContext } from "../../context/MyUserProvider";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useStudioPanels } from "../../context/StudioPanelContext";
import { useJobs } from "../../context/JobsContext";
import toast from "react-hot-toast";
import tripoSidebarBg from "../../assets/3d_forge_bg.png";

/* ─── constants ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 10;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const POLL_MS = 2500;
const POLL_MAX = 500;

const PROGRESS_JUMP_LIMIT = 30;
const STUCK_THRESHOLD_MS = 300_000;

function getModelHistoryThumbnailCacheKey(modelUrl) {
  return getHistoryThumbnailCacheKey({ model_url: modelUrl }) || modelUrl || null;
}

function buildPreviewHistoryFields(previewUrls) {
  const normalized = Array.isArray(previewUrls)
    ? [...new Set(previewUrls.filter(Boolean))]
    : [];
  return normalized.length > 0
    ? { previewImageUrl: normalized[0], previewImageUrls: normalized }
    : {};
}

// Module-level store: survives TripoPanel unmount/remount within the same session tab.
// Replaces sessionStorage — avoids stale URLs on tab duplication and is invisible to React lifecycle.
let _pendingModel = null;   // { url: string, taskId: string } | null
let _selHistId = null;      // string | null

const NAV = [
  { id: "generate", label: "Model", icon: Sparkles, sub: false },
  { id: "views", label: "Images", icon: Camera, sub: false },
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
  { id: "paint", label: "Paint", disabled: true, disabledMessage: "waiting for tripo patch" },
];

const MODE_UI = {
  generate: {
    eyebrow: "Create",
    description: "Build a new 3D asset from image, multiview or prompt input.",
    accent: "#8a2be2",
    accent2: "#00e5ff",
  },
  views: {
    eyebrow: "Images",
    description: "Generate source images, build multiview guides, or edit view sets before model creation.",
    accent: "#00e5ff",
    accent2: "#8a2be2",
  },
  segment: {
    eyebrow: "Parts",
    description: "Split selected models into editable object regions.",
    accent: "#00e5ff",
    accent2: "#8a2be2",
  },
  retopo: {
    eyebrow: "Mesh",
    description: "Convert, simplify and prepare topology for export.",
    accent: "#3B82F6",
    accent2: "#00e5ff",
  },
  texture: {
    eyebrow: "Surface",
    description: "Generate or prepare texture passes for the active model.",
    accent: "#ff007f",
    accent2: "#ff007f",
  },
  refine: {
    eyebrow: "Improve",
    description: "Refine the draft source while keeping schema-safe task inputs.",
    accent: "#ff007f",
    accent2: "#00e5ff",
  },
  stylize: {
    eyebrow: "Look",
    description: "Apply a clear visual style preset to the selected asset.",
    accent: "#8a2be2",
    accent2: "#ff007f",
  },
  animate: {
    eyebrow: "Motion",
    description: "Rig compatible models and apply reusable animation clips.",
    accent: "#00e5ff",
    accent2: "#8a2be2",
  },
};

const MODE_COST = {
  segment: 40,
  fill_parts: 50,
  paint: 10,
  animate: 10,
  generate_image: 5,
  generate_multiview_image: 10,
  edit_multiview_image: 10,
};
const TRIPO_PAINT_MODE_DISABLED = true;
const TRIPO_PAINT_MODE_DISABLED_MESSAGE = "waiting for tripo patch";
const TRIPO_MODEL_IMPORT_MAX_BYTES = 150 * 1024 * 1024;
const TRIPO_MODEL_IMPORT_EXTENSIONS = new Set(["glb", "fbx", "obj", "stl"]);

function normalizeUploadedMultiviewItem(file, preview, payload) {
  return {
    file,
    preview,
    token: typeof payload === "string"
      ? payload
      : payload?.token || payload?.object?.key || "sts",
    ...(typeof payload === "object" && payload ? { tripoFile: payload } : {}),
  };
}

function inferImageTypeFromUrl(url) {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) return "jpeg";
  if (cleanUrl.endsWith(".webp")) return "webp";
  if (cleanUrl.endsWith(".png")) return "png";
  return "png";
}

function isRefineModelVersionSupported(version) {
  if (!version) return true;
  return String(version).toLowerCase().startsWith("v1.4");
}

function isPostProcessModelVersionSupported(version) {
  if (!version) return true;
  const value = String(version);
  return value === "P1-20260311" || value.startsWith("v3.");
}

/* ─── CSS ────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  :root {
    --bg-base: #050306;
    --bg-panel: rgba(13, 8, 10, 0.72);
    --bg-surface: rgba(225, 226, 212, 0.035);
    --bg-raised: rgba(225, 226, 212, 0.06);
    --accent: #8a2be2;
    --accent-bright: #00e5ff;
    --accent-glow: rgba(138, 43, 226, 0.24);
    --vu-cream: #e2e8f0;
    --vu-ash: #94a3b8;
    --vu-ink: #03000a;
    --vu-rust: #ff007f;
    --vu-clay: #1d4ed8;
    --text-primary: #f0f0f8;
    --text-secondary: #94a3b8;
    --text-muted: #475569;
    --text-faint: #1e293b;
    --border: rgba(255, 255, 255, 0.06);
    --border-accent: rgba(47, 140, 255, 0.34);
    --error: #ef4444;
    --success: #2f8cff;
  }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:none } }
  @keyframes pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(47, 140, 255, 0.34); }
    70% { box-shadow: 0 0 0 6px rgba(47, 140, 255, 0); }
    100% { box-shadow: 0 0 0 0 rgba(47, 140, 255, 0); }
  }
  @keyframes tpAurora {
    0%,100% { background-position:0% 0%; opacity:0.60; }
    50% { background-position:100% 70%; opacity:0.82; }
  }
  @keyframes tpRailPulse {
    0%,100% { box-shadow:0 18px 44px rgba(0,0,0,0.34),0 0 22px rgba(138,43,226,0.24),0 0 18px rgba(0,229,255,0.12),inset 0 1px 0 rgba(255,255,255,0.18); }
    50% { box-shadow:0 20px 54px rgba(0,0,0,0.42),0 0 34px rgba(138,43,226,0.34),0 0 28px rgba(0,229,255,0.18),inset 0 1px 0 rgba(255,255,255,0.26); }
  }
  @keyframes tpButtonSheen {
    0% { background-position:0% 50%; }
    50% { background-position:100% 50%; }
    100% { background-position:0% 50%; }
  }
  .anim-spin { animation: spin 1s linear infinite; }
  .fade-up   { animation: fadeUp 0.18s ease forwards; }
  .tp-viewport canvas { position: relative !important; z-index: 0 !important; }
  .tp-side-shell { position:relative; isolation:isolate; display:flex; flex-direction:row; background:linear-gradient(180deg,rgba(3,0,10,0.985),rgba(3,5,12,0.995)); border-right:1px solid rgba(0,229,255,0.12); box-shadow:24px 0 84px rgba(0,0,0,0.54),12px 0 56px rgba(138,43,226,0.08); }
  .tp-side-shell::before { content:''; position:absolute; inset:0; pointer-events:none; z-index:-1; background-image:linear-gradient(90deg,rgba(3,0,10,0.90),rgba(3,7,18,0.78)),radial-gradient(circle at 92% 8%,rgba(138,43,226,0.28),transparent 34%),radial-gradient(circle at 0% 72%,rgba(0,229,255,0.16),transparent 42%),var(--tp-rail-bg); background-size:auto,170% 170%,170% 170%,cover; background-position:center,0% 0%,100% 100%,center; animation:tpAurora 13s ease-in-out infinite; opacity:0.98; }
  .tp-side-shell::after { content:''; position:absolute; inset:0; pointer-events:none; z-index:1; background:linear-gradient(90deg,rgba(138,43,226,0.08),transparent 12%,transparent 88%,rgba(0,229,255,0.08)),linear-gradient(180deg,rgba(255,255,255,0.04),transparent 42%); opacity:0.72; }
  .tp-mode-rail { position:relative; z-index:4; width:88px; flex:0 0 88px; display:flex; flex-direction:column; align-items:center; gap:16px; padding:18px 13px; border-right:1px solid rgba(0,229,255,0.13); background:linear-gradient(180deg,rgba(10,11,22,0.74),rgba(4,1,12,0.88)); box-shadow:inset -1px 0 0 rgba(255,255,255,0.04),12px 0 34px rgba(0,229,255,0.045); backdrop-filter:blur(24px); }
  .tp-mode-rail::after { content:''; position:absolute; right:-1px; top:26px; bottom:26px; width:1px; background:linear-gradient(180deg,transparent,rgba(138,43,226,0.42),rgba(0,229,255,0.42),transparent); pointer-events:none; box-shadow:0 0 22px rgba(0,229,255,0.18); }
  .tp-rail-brand { width:54px; height:54px; border-radius:20px; display:flex; align-items:center; justify-content:center; color:#f8fafc; font-size:11px; font-weight:950; letter-spacing:0.08em; background:linear-gradient(145deg,rgba(255,255,255,0.14),rgba(138,43,226,0.22) 52%,rgba(0,229,255,0.12)); border:1px solid rgba(255,255,255,0.16); box-shadow:0 18px 42px rgba(0,0,0,0.36),0 0 32px rgba(138,43,226,0.20),inset 0 1px 0 rgba(255,255,255,0.18); }
  .tp-rail-list { width:100%; display:flex; flex-direction:column; align-items:center; gap:12px; }
  .tp-rail-btn { width:58px; min-height:66px; border:1px solid rgba(255,255,255,0.075); border-radius:20px; background:linear-gradient(145deg,rgba(255,255,255,0.050),rgba(255,255,255,0.018)); color:rgba(203,213,225,0.58); cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; position:relative; overflow:hidden; transition:transform 0.2s,background 0.2s,border-color 0.2s,color 0.2s,box-shadow 0.2s; box-shadow:inset 0 1px 0 rgba(255,255,255,0.04); }
  .tp-rail-btn::before { content:''; position:absolute; left:-13px; top:17px; bottom:17px; width:3px; border-radius:99px; background:linear-gradient(180deg,#8a2be2,#ff007f,#00e5ff); opacity:0; transform:scaleY(0.35); transition:opacity 0.18s,transform 0.18s; box-shadow:0 0 20px rgba(0,229,255,0.44); }
  .tp-rail-btn::after { content:''; position:absolute; inset:1px; border-radius:19px; background:linear-gradient(145deg,rgba(255,255,255,0.12),transparent 34%,rgba(0,229,255,0.05)); opacity:0; pointer-events:none; transition:opacity 0.18s; }
  .tp-rail-btn svg { width:18px; height:18px; position:relative; z-index:1; }
  .tp-rail-btn .lbl { position:relative; z-index:1; max-width:54px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:7px; line-height:1; font-weight:950; letter-spacing:0.10em; text-transform:uppercase; }
  .tp-rail-btn:hover { transform:translateY(-2px); color:rgba(255,255,255,0.95); background:linear-gradient(145deg,rgba(255,255,255,0.085),rgba(138,43,226,0.09)); border-color:rgba(0,229,255,0.22); box-shadow:0 16px 34px rgba(0,0,0,0.28),0 0 24px rgba(0,229,255,0.10),inset 0 1px 0 rgba(255,255,255,0.08); }
  .tp-rail-btn:hover::after { opacity:0.70; }
  .tp-rail-btn:focus-visible { outline:2px solid rgba(0,229,255,0.58); outline-offset:3px; }
  .tp-rail-btn.active { color:#ffffff; background:linear-gradient(145deg,rgba(138,43,226,0.34),rgba(47,140,255,0.18) 52%,rgba(0,229,255,0.13)); border-color:rgba(0,229,255,0.46); animation:tpRailPulse 3.2s ease-in-out infinite; }
  .tp-rail-btn.active::before { opacity:1; transform:scaleY(1); }
  .tp-rail-btn.active::after { opacity:1; }
  .tp-controls-col { position:relative; z-index:2; min-width:0; flex:1; background:linear-gradient(180deg,rgba(7,7,16,0.84),rgba(3,0,10,0.96)); }
  .tp-controls-col::before { content:''; position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 76% 0%,rgba(138,43,226,0.14),transparent 34%),radial-gradient(circle at 10% 82%,rgba(0,229,255,0.08),transparent 36%); }
  .tp-panel-head { --tp-mode-a:#8a2be2; --tp-mode-b:#00e5ff; position:relative; z-index:2; margin:14px 14px 0; padding:18px 18px 16px; border:1px solid rgba(255,255,255,0.10); border-radius:28px; background:linear-gradient(150deg,rgba(255,255,255,0.078),rgba(13,12,26,0.72) 46%,rgba(5,2,14,0.92)),radial-gradient(circle at 88% 0%,color-mix(in srgb, var(--tp-mode-a) 26%, transparent),transparent 45%),radial-gradient(circle at 10% 100%,color-mix(in srgb, var(--tp-mode-b) 16%, transparent),transparent 48%); box-shadow:0 22px 52px rgba(0,0,0,0.34),0 0 44px color-mix(in srgb, var(--tp-mode-a) 13%, transparent),inset 0 1px 0 rgba(255,255,255,0.12); overflow:hidden; backdrop-filter:blur(24px); }
  .tp-panel-head::before { content:''; position:absolute; right:-52px; top:-56px; width:160px; height:160px; border-radius:999px; background:radial-gradient(circle, color-mix(in srgb, var(--tp-mode-a) 44%, transparent), rgba(0,229,255,0.055) 45%, transparent 70%); opacity:0.86; pointer-events:none; filter:blur(1px); }
  .tp-panel-head::after { content:''; position:absolute; left:18px; right:18px; bottom:0; height:1px; background:linear-gradient(90deg,color-mix(in srgb, var(--tp-mode-a) 58%, transparent),color-mix(in srgb, var(--tp-mode-b) 48%, transparent),transparent); opacity:0.90; pointer-events:none; box-shadow:0 0 22px color-mix(in srgb, var(--tp-mode-b) 26%, transparent); }
  .tp-mode-kicker { position:relative; display:inline-flex; align-items:center; gap:8px; margin-bottom:10px; color:rgba(203,213,225,0.78); font-size:9px; font-weight:950; letter-spacing:0.22em; text-transform:uppercase; }
  .tp-mode-kicker::before { content:''; width:8px; height:8px; border-radius:999px; background:linear-gradient(135deg,var(--tp-mode-a),var(--tp-mode-b)); box-shadow:0 0 20px color-mix(in srgb, var(--tp-mode-a) 52%, transparent); }
  .tp-panel-title { position:relative; margin:0; min-height:24px; color:#fff; text-shadow:none; }
  .tp-panel-desc { position:relative; margin:9px 0 0; color:rgba(203,213,225,0.78); font-size:11px; font-weight:800; line-height:1.58; }
  .tp-sub-tabs {
    position:relative;
    display:flex;
    flex-wrap:nowrap;
    gap:0;
    margin-top:14px;
    padding:0;
    border:1px solid rgba(139,220,255,0.13);
    border-radius:20px;
    overflow:hidden;
    background:rgba(5,8,18,0.18);
    box-shadow:none;
  }
  .tp-panel-scroll { position:relative; z-index:2; padding:16px 14px 14px; scrollbar-width:thin; scrollbar-color:rgba(0,229,255,0.22) transparent; }
  .tp-panel-scroll::-webkit-scrollbar { width:4px; }
  .tp-panel-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.16); border-radius:999px; }
  .tp-scroll { scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.16) transparent; }
  .tp-scroll::-webkit-scrollbar { width:4px; }
  .tp-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.16); border-radius:999px; }
  /* Mobile: keep the rail compact */
  @media (max-width: 640px) {
    .tp-mode-rail { width:68px; flex-basis:68px; padding:12px 8px; }
    .tp-rail-brand { width:44px; height:44px; border-radius:17px; }
    .tp-rail-btn { width:50px; min-height:50px; border-radius:18px; }
    .tp-rail-btn .lbl { display:none; }
  }
  .tp-switch { width:36px;height:20px;border-radius:10px;position:relative;transition:background 0.2s,border-color 0.2s,box-shadow 0.2s;flex-shrink:0;cursor:pointer; }
  .tp-switch::after { content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.4); }
  .tp-switch.on::after { transform:translateX(16px); }
  .tp-input { width:100%;padding:9px 12px;border-radius:10px;font-size:12px;color:var(--text-primary);background:var(--bg-raised);border:1px solid var(--border);outline:none;font-family:inherit;transition:border-color 0.18s,background 0.18s,box-shadow 0.18s;box-sizing:border-box; }
  input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none;margin:0; }
  .tp-input:focus { border-color:var(--border-accent);background:rgba(12,14,18,0.94);box-shadow:0 0 0 3px rgba(47,140,255,0.12),0 0 20px rgba(47,140,255,0.10); }
  .tp-input::placeholder { color:var(--text-muted); }
  .tp-ta { width:100%;padding:10px 13px;border-radius:11px;font-size:12px;color:var(--text-primary);background:var(--bg-raised);border:1px solid var(--border);outline:none;font-family:inherit;resize:none;line-height:1.6;box-sizing:border-box;transition:border-color 0.18s,box-shadow 0.18s; }
  .tp-ta::placeholder { color:var(--text-muted); }
  .tp-ta:focus { border-color:var(--border-accent);outline:none;box-shadow:0 0 0 3px rgba(47,140,255,0.12),0 0 20px rgba(47,140,255,0.10); }
  .tp-drop:hover { border-color:rgba(47,140,255,0.28) !important;box-shadow:0 12px 32px rgba(0,0,0,0.18),0 0 22px rgba(47,140,255,0.12); }
  .tp-sub-tab {
    flex:1 1 auto;
    min-height:48px;
    padding:10px 12px;
    border:0;
    border-radius:0;
    background:transparent;
    color:rgba(203,213,225,0.72);
    font-size:10px;
    font-weight:950;
    cursor:pointer;
    transition:background 0.16s, color 0.16s;
    font-family:inherit;
    letter-spacing:0.12em;
    text-transform:uppercase;
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow:none;
  }
  .tp-sub-tab + .tp-sub-tab { border-left:1px solid rgba(139,220,255,0.13); }
  .tp-sub-tab:first-child { border-radius:20px 0 0 20px; }
  .tp-sub-tab:last-child { border-radius:0 20px 20px 0; }
  .tp-sub-tab.on {
    background:linear-gradient(145deg,rgba(138,43,226,0.18),rgba(47,140,255,0.13),rgba(0,229,255,0.06));
    color:#f8fafc;
  }
  .tp-sub-tab:not(.on):hover { color:rgba(255,255,255,0.92); background:rgba(255,255,255,0.035); }
  .tp-sub-tab:disabled { opacity:0.42; cursor:not-allowed; }
  .tp-workflow-page { --tp-mode-a:#2f8cff; --tp-mode-b:#8bdcff; display:flex; flex-direction:column; gap:12px; min-width:0; }
  .tp-workflow-page > div { margin-bottom:0 !important; }
  .tp-workflow-page > div:empty { display:none !important; }
  .tp-workflow-page [style*="#2d2d48"],
  .tp-workflow-page [style*="#1e1e38"],
  .tp-workflow-page [style*="#3a3a58"],
  .tp-workflow-page [style*="#4a4a68"],
  .tp-workflow-page [style*="#5a5a78"],
  .tp-workflow-page [style*="#64748b"] {
    color:rgba(148,163,184,0.74) !important;
  }
  .tp-workflow-page [style*="#0f0f1e"],
  .tp-workflow-page [style*="#111122"],
  .tp-workflow-page [style*="#131327"],
  .tp-workflow-page [style*="#0d0d1a"] {
    background:#0b0b0e !important;
  }
  .tp-workflow-page [style*="108,99,255"],
  .tp-workflow-page [style*="139,92,246"],
  .tp-workflow-page [style*="57,255,136"],
  .tp-workflow-page [style*="0,229,255"],
  .tp-workflow-page [style*="#12f7d6"],
  .tp-workflow-page [style*="#2f8cff"],
  .tp-workflow-page [style*="#0f766e"],
  .tp-workflow-page [style*="#38bdf8"],
  .tp-workflow-page [style*="#8bdcff"],
  .tp-workflow-page [style*="#4c8ef7"],
  .tp-workflow-page [style*="#6c63ff"],
  .tp-workflow-page [style*="#8b5cf6"],
  .tp-workflow-page [style*="#00e5ff"],
  .tp-workflow-page [style*="#a855f7"],
  .tp-workflow-page [style*="#ec4899"] {
    color:#8bdcff !important;
    border-color:rgba(47,140,255,0.28) !important;
    box-shadow:0 10px 26px rgba(0,0,0,0.13) !important;
  }
  .tp-workflow-page div[style*="108,99,255"],
  .tp-workflow-page button[style*="108,99,255"],
  .tp-workflow-page label[style*="108,99,255"],
  .tp-workflow-page div[style*="57,255,136"],
  .tp-workflow-page button[style*="57,255,136"],
  .tp-workflow-page div[style*="14,163,95"],
  .tp-workflow-page button[style*="14,163,95"],
  .tp-workflow-page div[style*="#12f7d6"],
  .tp-workflow-page button[style*="#12f7d6"],
  .tp-workflow-page div[style*="#0f766e"],
  .tp-workflow-page button[style*="#0f766e"],
  .tp-workflow-page div[style*="#8b5cf6"],
  .tp-workflow-page button[style*="#8b5cf6"],
  .tp-workflow-page div[style*="#6c63ff"],
  .tp-workflow-page button[style*="#6c63ff"] {
    background:linear-gradient(135deg,rgba(255,255,255,0.072),rgba(47,140,255,0.085)) !important;
  }
  .tp-workflow-page [class*="text-cyan"],
  .tp-workflow-page [class*="text-primary"] {
    color:#8bdcff !important;
  }
  .tp-workflow-page [class*="bg-cyan"],
  .tp-workflow-page [class*="bg-primary"] {
    background-color:rgba(47,140,255,0.10) !important;
  }
  .tp-workflow-page [class*="border-cyan"],
  .tp-workflow-page [class*="border-primary"] {
    border-color:rgba(47,140,255,0.24) !important;
  }
  .tp-workflow-page > div[style*="239,68,68"],
  .tp-workflow-page div[style*="239,68,68"] {
    background:rgba(239,68,68,0.09) !important;
    border-color:rgba(239,68,68,0.26) !important;
  }
  .tp-workflow-page > div[style*="245,197,24"],
  .tp-workflow-page div[style*="245,197,24"] {
    background:rgba(245,158,11,0.09) !important;
    border-color:rgba(245,158,11,0.24) !important;
  }
  .tp-workflow-page > div[style*="34,197,94"],
  .tp-workflow-page div[style*="34,197,94"] {
    background:rgba(47,140,255,0.08) !important;
    border-color:rgba(47,140,255,0.24) !important;
  }
  .tp-workflow-page label,
  .tp-workflow-page > div > span:first-child {
    color:rgba(161,161,170,0.84) !important;
    font-size:10px !important;
    font-weight:900 !important;
    letter-spacing:0.12em !important;
    text-transform:uppercase !important;
  }
  .tp-workflow-page input,
  .tp-workflow-page select,
  .tp-workflow-page textarea,
  .tp-input,
  .tp-ta {
    min-height:38px;
    border-radius:9px !important;
    border:1px solid rgba(255,255,255,0.085) !important;
    background:rgba(255,255,255,0.036) !important;
    color:#f8fafc !important;
    font-weight:700 !important;
    box-shadow:none !important;
  }
  .tp-workflow-page textarea,
  .tp-ta { min-height:82px; line-height:1.55 !important; }
  .tp-workflow-page input:focus,
  .tp-workflow-page select:focus,
  .tp-workflow-page textarea:focus,
  .tp-input:focus,
  .tp-ta:focus {
    border-color:color-mix(in srgb, var(--tp-mode-a) 54%, rgba(255,255,255,0.10)) !important;
    box-shadow:0 0 0 3px rgba(47,140,255,0.12),0 0 20px rgba(47,140,255,0.10) !important;
  }
  .tp-workflow-page button:not(.tp-sub-tab):not(.tp-inp-tab-clean):not(.tp-source-mode-btn):not(.tp-source-mode-btn-clean):not(.tp-qual-btn):not(.tp-topo-btn):not(.tp-style-chip) {
    border-radius:9px !important;
    border:1px solid rgba(255,255,255,0.08) !important;
    font-weight:900 !important;
    transition:background 0.18s, border-color 0.18s, color 0.18s, opacity 0.18s, box-shadow 0.18s !important;
  }
  .tp-workflow-page button:not(.tp-sub-tab):not(.tp-inp-tab-clean):not(.tp-source-mode-btn):not(.tp-source-mode-btn-clean):not(.tp-qual-btn):not(.tp-topo-btn):not(.tp-style-chip):hover {
    border-color:rgba(47,140,255,0.28) !important;
    box-shadow:0 10px 26px rgba(0,0,0,0.17),0 0 22px rgba(47,140,255,0.12) !important;
  }
  .tp-inp-tab { min-height:38px; flex:1;padding:8px 8px !important;border:1px solid transparent !important;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:0 !important;transition:background 0.18s, color 0.18s,border-color 0.18s,box-shadow 0.18s;font-family:inherit;background:transparent !important;color:rgba(148,163,184,0.72) !important; }
  .tp-inp-tab.active { background:linear-gradient(135deg,rgba(255,255,255,0.085),rgba(47,140,255,0.10)) !important;color:#f8fafc !important;border-color:rgba(47,140,255,0.30) !important;box-shadow:0 10px 22px rgba(0,0,0,0.16),0 0 20px rgba(47,140,255,0.12) !important; }
  .tp-model-card,
  .anim-card,
  .tex-input-box {
    border-radius:10px !important;
    background:rgba(255,255,255,0.028) !important;
    border:1px solid rgba(255,255,255,0.075) !important;
    box-shadow:none !important;
  }
  .tp-model-card.sel,
  .anim-card:hover,
  .tp-model-card:hover:not(.sel) {
    border-color:rgba(47,140,255,0.30) !important;
    box-shadow:0 12px 28px rgba(0,0,0,0.18),0 0 20px rgba(47,140,255,0.12) !important;
  }
  .tp-switch { background:rgba(255,255,255,0.12) !important; border:1px solid rgba(255,255,255,0.07); }
  .tp-switch.on { background:linear-gradient(135deg,var(--tp-mode-a),var(--tp-mode-b)) !important; box-shadow:0 0 18px -8px var(--tp-mode-a); }
  .tp-topo-btn,
  .tp-qual-btn,
  .anim-model-dd,
  .auto-rig-btn {
    min-height:38px;
    background:rgba(255,255,255,0.035) !important;
    border:1px solid rgba(255,255,255,0.08) !important;
    color:rgba(226,232,240,0.82) !important;
  }
  .tp-topo-btn.sel,
  .tp-qual-btn.sel,
  .auto-rig-btn.ready {
    background:linear-gradient(135deg,rgba(255,255,255,0.082),rgba(47,140,255,0.10)) !important;
    border-color:rgba(47,140,255,0.30) !important;
    color:#f8fafc !important;
  }
  .tp-drop,
  .mv-cell {
    border-radius:10px !important;
    border-color:rgba(255,255,255,0.11) !important;
    background-color:rgba(255,255,255,0.028) !important;
  }
  .mv-grid { gap:10px !important; padding:12px !important; }
  .sec-row { padding:13px 4px !important; border-radius:12px !important; }
  .sec-row:hover { background:rgba(255,255,255,0.045) !important; }
  .tp-action-dock {
    padding:10px 14px 14px !important;
    border-top:1px solid rgba(255,255,255,0.065);
    background:linear-gradient(180deg,rgba(255,255,255,0.012),rgba(5,5,8,0.48));
    box-shadow:0 -14px 38px rgba(47,140,255,0.05);
  }
  .tp-action-card {
    border-radius:12px !important;
    background:linear-gradient(160deg,rgba(255,255,255,0.064),rgba(255,255,255,0.028)) !important;
    border:1px solid rgba(255,255,255,0.082) !important;
    border-left:1px solid rgba(47,140,255,0.32) !important;
    box-shadow:0 18px 42px rgba(0,0,0,0.25),0 0 32px rgba(47,140,255,0.10) !important;
  }
  .tp-qual-btn { flex:1;padding:10px 4px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:background 0.18s, color 0.18s, border-color 0.18s;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit; }
  .tp-gen-btn { width:100%;padding:16px 0;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.04em;transition:background 0.22s, transform 0.22s, box-shadow 0.22s;font-family:inherit; }
  .tp-gen-btn.go { background:linear-gradient(110deg,#050608 0%,#1d4ed8 32%,#2f8cff 54%,#8bdcff 78%,#050608 100%); background-size:220% 220%; color:#f8fafc; box-shadow:0 18px 44px rgba(0,0,0,0.30),0 0 36px rgba(47,140,255,0.24),inset 0 1px 0 rgba(255,255,255,0.24); animation:tpButtonSheen 6s ease-in-out infinite; }
  .tp-gen-btn.go:hover { box-shadow:0 22px 52px rgba(0,0,0,0.36),0 0 48px rgba(47,140,255,0.32),inset 0 1px 0 rgba(255,255,255,0.30); transform:translateY(-1px); }
  .tp-gen-btn.no { background:rgba(255,255,255,0.025); color:var(--text-muted); cursor:not-allowed; border:1px solid var(--border); }
  .tp-model-card { padding:11px 13px;border-radius:10px;background:rgba(255,255,255,0.030);border:1px solid rgba(255,255,255,0.075);cursor:pointer;transition:background 0.16s, border-color 0.16s, box-shadow 0.16s;margin-bottom:5px;box-shadow:none; }
  .tp-model-card.sel { background:linear-gradient(135deg,rgba(255,255,255,0.072),rgba(47,140,255,0.085));border-color:rgba(47,140,255,0.30);box-shadow:0 12px 30px rgba(0,0,0,0.17),0 0 20px rgba(47,140,255,0.12); }
  .tp-model-card:hover:not(.sel) { background:rgba(255,255,255,0.045);border-color:rgba(255,255,255,0.12);box-shadow:none; }
  .checker { background-color:#101014;background-image:linear-gradient(45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,0.025) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,0.025) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,0.025) 75%);background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0; }
  .anim-card { border-radius:10px;overflow:hidden;cursor:pointer;transition:border-color 0.16s, background 0.16s; }
  .anim-card:hover { border-color:rgba(47,140,255,0.30) !important; transform:none;box-shadow:0 12px 28px rgba(0,0,0,0.17),0 0 20px rgba(47,140,255,0.12); }
  .sec-row { display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:11px 4px;user-select:none;border-radius:8px;transition:background 0.14s; }
  .sec-row span { transition:color 0.14s; }
  .sec-row:hover { background:rgba(255,255,255,0.02); }
  .sec-row:hover span { color:rgba(244,244,245,0.86) !important; }
  .tp-topo-btn { flex:1;padding:9px 4px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:background 0.16s, color 0.16s, outline 0.16s;font-family:inherit; }
  .tp-topo-btn.sel { background:linear-gradient(135deg,rgba(255,255,255,0.082),rgba(47,140,255,0.10));color:#f8fafc;outline:1px solid rgba(47,140,255,0.30);box-shadow:0 10px 24px rgba(0,0,0,0.16),0 0 20px rgba(47,140,255,0.12); }
  .tp-topo-btn:not(.sel) { background:var(--bg-raised);color:var(--text-secondary);outline:1px solid var(--border); }
  .tp-topo-btn:not(.sel):hover { background:rgba(255,255,255,0.07);color:rgba(244,244,245,0.84); }
  .tex-input-box { border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;background:rgba(255,255,255,0.028);margin-bottom:14px;box-shadow:none; }
  .tex-tab-bar { display:flex;background:rgba(255,255,255,0.05);padding:4px;gap:3px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.15); }
  .tex-tab { flex:1;padding:7px 0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:background 0.18s, color 0.18s, box-shadow 0.18s;font-family:inherit; }
  .tex-tab.on { background:rgba(255,255,255,0.14);box-shadow:0 2px 6px rgba(0,0,0,0.3); }
  .mv-grid { display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:11px; }
  .mv-cell { border-radius:10px;aspect-ratio:1/1;border:1.5px dashed rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;transition:border-color 0.16s,box-shadow 0.16s;position:relative; }
  .mv-cell:hover { border-color:rgba(47,140,255,0.30);box-shadow:0 12px 28px rgba(0,0,0,0.18),0 0 20px rgba(47,140,255,0.12); }
  .magic-mode-tab { flex:1;padding:8px 0;border:none;cursor:pointer;font-size:12px;font-weight:600;border-radius:11px;transition:background 0.18s, color 0.18s, box-shadow 0.18s;font-family:inherit; }
  .magic-mode-tab.on { background:#ffffff;color:#0a0a1a;box-shadow:0 2px 8px rgba(0,0,0,0.3); }
  .magic-mode-tab:not(.on) { background:transparent;color:#5a5a7a; }
  .anim-model-dd { width:100%;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);cursor:pointer;display:flex;align-items:center;gap:8px;transition:border-color 0.16s,box-shadow 0.16s; }
  .anim-model-dd:hover { border-color:rgba(47,140,255,0.30);box-shadow:0 12px 28px rgba(0,0,0,0.17),0 0 20px rgba(47,140,255,0.12); }
  .auto-rig-btn { width:100%;padding:13px 0;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;transition:background 0.2s, transform 0.2s, box-shadow 0.2s; }
  .auto-rig-btn.ready { background:rgba(255,255,255,0.08);color:#c8c8e0;box-shadow:0 2px 8px rgba(0,0,0,0.1); }
  .auto-rig-btn.ready:hover { background:rgba(255,255,255,0.12);box-shadow:0 4px 12px rgba(0,0,0,0.15); transform:translateY(-1px); }
  .auto-rig-btn.disabled { background:rgba(255,255,255,0.03);color:#1e1e38;cursor:not-allowed; }

  /* Full Generate-panel skin: buttons, cards, inputs, dropzones */
  .tp-panel-scroll::before {
    content:'';
    position:absolute;
    inset:0;
    pointer-events:none;
    background:
      linear-gradient(180deg, rgba(3,0,10,0.30), rgba(3,0,10,0.78)),
      radial-gradient(circle at 18% 10%, rgba(138,43,226,0.18), transparent 34%),
      radial-gradient(circle at 80% 72%, rgba(0,229,255,0.12), transparent 34%),
      var(--tp-rail-bg);
    background-size:auto, auto, auto, cover;
    background-position:center;
    opacity:0.28;
    mix-blend-mode:screen;
  }
  .tp-workflow-page { position:relative; gap:16px; }
  .tp-gen-tabs {
    min-height:88px;
    padding:5px !important;
    gap:5px !important;
    border-radius:24px !important;
    border:1px solid rgba(255,255,255,0.10);
    background:linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.026)) !important;
    box-shadow:0 18px 44px rgba(0,0,0,0.24),inset 0 1px 0 rgba(255,255,255,0.08);
    backdrop-filter:blur(22px);
  }
  .tp-inp-tab {
    min-height:74px !important;
    border-radius:0 !important;
    gap:8px !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.040),rgba(255,255,255,0.014)) !important;
    border:1px solid rgba(255,255,255,0.065) !important;
    color:rgba(148,163,184,0.82) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.035) !important;
  }
  .tp-inp-tab span { font-size:13px !important; font-weight:950 !important; letter-spacing:0 !important; text-transform:none !important; }
  .tp-inp-tab svg { width:20px !important; height:20px !important; }
  .tp-inp-tab.active {
    background:linear-gradient(145deg,rgba(139,220,255,0.18),rgba(47,140,255,0.12),rgba(255,255,255,0.055)) !important;
    color:#f8fafc !important;
    border-color:rgba(139,220,255,0.35) !important;
    box-shadow:0 18px 38px rgba(0,0,0,0.30),0 0 34px rgba(47,140,255,0.16),inset 0 1px 0 rgba(255,255,255,0.16) !important;
  }
  .tp-model-dd > span,
  .tp-workflow-page label,
  .tp-workflow-page > div > span:first-child {
    color:rgba(203,213,225,0.74) !important;
    font-size:10px !important;
    font-weight:950 !important;
    letter-spacing:0.17em !important;
    text-transform:uppercase !important;
  }
  .tp-model-dd-trigger,
  .tp-workflow-page input,
  .tp-workflow-page select,
  .tp-workflow-page textarea,
  .tp-input,
  .tp-ta {
    border-radius:18px !important;
    border:1px solid rgba(255,255,255,0.11) !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.060),rgba(255,255,255,0.024)) !important;
    color:#f8fafc !important;
    font-weight:800 !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.055),0 12px 28px rgba(0,0,0,0.13) !important;
    backdrop-filter:blur(18px);
  }
  .tp-model-dd-trigger:hover,
  .tp-workflow-page input:hover,
  .tp-workflow-page select:hover,
  .tp-workflow-page textarea:hover {
    border-color:rgba(139,220,255,0.28) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 16px 34px rgba(0,0,0,0.18),0 0 28px rgba(47,140,255,0.10) !important;
  }
  .tp-model-dd-menu { padding:6px !important; background:rgba(9,8,13,0.96) !important; }
  .tp-model-dd-option { border-radius:14px !important; border-bottom:0 !important; }
  .tp-model-dd-option:hover { background:rgba(139,220,255,0.10) !important; }
  .tp-source-mode-row { gap:0 !important; margin-top:2px; }
  .tp-workflow-page button:not(.tp-sub-tab):not(.tp-rail-btn):not(.tp-gen-btn):not(.tp-inp-tab):not(.tp-inp-tab-clean):not(.tp-source-mode-btn):not(.tp-source-mode-btn-clean):not(.tp-qual-btn):not(.tp-topo-btn):not(.tp-style-chip):not(.tp-thumb-remove-btn) {
    min-height:44px;
    border-radius:18px !important;
    border:1px solid rgba(255,255,255,0.095) !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.052),rgba(255,255,255,0.020)) !important;
    color:rgba(226,232,240,0.82) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.052) !important;
    backdrop-filter:blur(18px);
  }
  .tp-workflow-page button:not(.tp-sub-tab):not(.tp-rail-btn):not(.tp-gen-btn):not(.tp-inp-tab):not(.tp-inp-tab-clean):not(.tp-source-mode-btn):not(.tp-source-mode-btn-clean):not(.tp-qual-btn):not(.tp-topo-btn):not(.tp-style-chip):not(.tp-thumb-remove-btn):hover {
    transform:translateY(-1px);
    color:#fff !important;
    border-color:rgba(139,220,255,0.30) !important;
    box-shadow:0 16px 34px rgba(0,0,0,0.22),0 0 30px rgba(47,140,255,0.12),inset 0 1px 0 rgba(255,255,255,0.09) !important;
  }
  .tp-inline-option-card,
  .tp-setting-card,
  .tex-input-box {
    border-radius:22px !important;
    border:1px solid rgba(255,255,255,0.10) !important;
    background:linear-gradient(155deg,rgba(255,255,255,0.062),rgba(255,255,255,0.024)) !important;
    box-shadow:0 16px 38px rgba(0,0,0,0.20),inset 0 1px 0 rgba(255,255,255,0.06) !important;
    backdrop-filter:blur(20px);
  }
  .tp-upload-zone,
  .tp-drop,
  .mv-cell {
    border-radius:24px !important;
    border:1.5px dashed rgba(139,220,255,0.20) !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.035),rgba(3,0,10,0.22)),radial-gradient(circle at 50% 18%,rgba(47,140,255,0.10),transparent 44%) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.05),0 18px 42px rgba(0,0,0,0.18) !important;
  }
  .tp-upload-zone:hover,
  .tp-drop:hover,
  .mv-cell:hover {
    border-color:rgba(139,220,255,0.44) !important;
    box-shadow:0 18px 42px rgba(0,0,0,0.24),0 0 34px rgba(47,140,255,0.14),inset 0 1px 0 rgba(255,255,255,0.08) !important;
  }
  .tp-responsive-image-grid { align-content:start; }
  .tp-responsive-image-grid > div,
  .tp-responsive-view-card { min-width:0; }
  .tp-thumb-remove-btn {
    width:34px !important;
    height:34px !important;
    min-width:34px !important;
    min-height:34px !important;
    padding:0 !important;
    border-radius:999px !important;
    background:rgba(3,0,10,0.72) !important;
    border:1px solid rgba(255,255,255,0.14) !important;
    color:#fff !important;
    box-shadow:0 10px 24px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.10) !important;
    backdrop-filter:blur(10px);
  }
  .tp-thumb-remove-btn:hover {
    background:rgba(15,23,42,0.86) !important;
    border-color:rgba(139,220,255,0.34) !important;
    box-shadow:0 14px 28px rgba(0,0,0,0.32),0 0 18px rgba(47,140,255,0.12),inset 0 1px 0 rgba(255,255,255,0.12) !important;
  }
  @media (max-width: 640px) {
    .tp-responsive-image-upload-zone.is-multi-image {
      aspect-ratio:auto !important;
      height:auto !important;
      min-height:clamp(300px,92vw,420px);
    }
    .tp-responsive-image-upload-zone.is-many-images {
      min-height:clamp(420px,148vw,560px);
    }
    .tp-responsive-image-grid {
      height:auto !important;
      min-height:100%;
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:8px !important;
      padding:8px !important;
      overflow:visible !important;
    }
    .tp-responsive-view-grid {
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:8px !important;
    }
    .tp-responsive-view-card {
      border-radius:18px !important;
    }
    .tp-thumb-remove-btn {
      width:44px !important;
      height:44px !important;
      min-width:44px !important;
      min-height:44px !important;
    }
  }
  .tp-switch {
    width:38px !important;
    height:22px !important;
    border-radius:999px !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.055)) !important;
    border:1px solid rgba(255,255,255,0.12) !important;
    box-shadow:inset 0 1px 2px rgba(0,0,0,0.34) !important;
  }
  .tp-switch::after { width:18px; height:18px; background:#f8fafc; }
  .tp-switch.on {
    background:linear-gradient(135deg,#1d4ed8,#2f8cff,#8bdcff) !important;
    border-color:rgba(139,220,255,0.42) !important;
    box-shadow:0 0 22px rgba(47,140,255,0.22),inset 0 1px 0 rgba(255,255,255,0.24) !important;
  }
  .tp-switch.on::after { transform:translateX(16px); }
  .tp-qual-btn,
  .tp-topo-btn {
    min-height:56px !important;
    border-radius:0 !important;
    font-size:13px !important;
    font-weight:950 !important;
    background:transparent !important;
    outline:none !important;
    color:rgba(226,232,240,0.78) !important;
    box-shadow:none !important;
    border:0 !important;
  }
  .tp-qual-btn.sel,
  .tp-topo-btn.sel {
    background:linear-gradient(145deg,rgba(139,220,255,0.18),rgba(47,140,255,0.11),rgba(255,255,255,0.045)) !important;
    color:#f8fafc !important;
    outline:none !important;
    box-shadow:none !important;
  }
  .sec-row {
    padding:14px 12px !important;
    margin:4px -2px;
    border-radius:18px !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.026),rgba(255,255,255,0.010));
    border-top:1px solid rgba(255,255,255,0.055) !important;
  }
  .sec-row:hover { background:rgba(139,220,255,0.065) !important; }
  .tp-action-dock {
    padding:12px 14px 18px !important;
    border-top:1px solid rgba(255,255,255,0.085);
    background:linear-gradient(180deg,rgba(3,0,10,0.04),rgba(3,0,10,0.62));
    box-shadow:0 -18px 46px rgba(0,229,255,0.06);
  }
  .tp-action-card {
    border-radius:24px !important;
    border:1px solid rgba(139,220,255,0.18) !important;
    border-left:1px solid rgba(139,220,255,0.28) !important;
    background:linear-gradient(155deg,rgba(255,255,255,0.075),rgba(255,255,255,0.026)),radial-gradient(circle at 8% 0%,rgba(47,140,255,0.16),transparent 48%) !important;
    box-shadow:0 22px 56px rgba(0,0,0,0.34),0 0 42px rgba(47,140,255,0.13),inset 0 1px 0 rgba(255,255,255,0.10) !important;
  }
  .tp-gen-btn {
    min-height:54px !important;
    border-radius:18px !important;
    font-size:13px !important;
    font-weight:950 !important;
    letter-spacing:0.16em !important;
  }
  .tp-gen-btn.go {
    background:linear-gradient(115deg,#06121f 0%,#1d4ed8 30%,#2f8cff 54%,#8bdcff 75%,#f8fafc 100%) !important;
    color:#ffffff !important;
    box-shadow:0 22px 52px rgba(0,0,0,0.38),0 0 44px rgba(47,140,255,0.32),inset 0 1px 0 rgba(255,255,255,0.28) !important;
  }
  .tp-gen-btn.no {
    background:linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014)) !important;
    color:rgba(148,163,184,0.44) !important;
    border:1px solid rgba(255,255,255,0.08) !important;
  }

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

  /* Restored Tripo premium flat pass */
  .tp-panel-head {
    border-radius:22px !important;
    border:1px solid rgba(139,220,255,0.13) !important;
    background:
      linear-gradient(145deg,rgba(10,18,32,0.58),rgba(3,0,10,0.72) 62%,rgba(14,7,22,0.62)),
      radial-gradient(circle at 92% 8%,color-mix(in srgb, var(--tp-mode-a) 16%, transparent),transparent 34%) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 18px 42px rgba(0,0,0,0.18) !important;
    backdrop-filter:blur(22px) !important;
  }
  .tp-panel-head::before {
    left:0 !important;
    top:22px !important;
    bottom:22px !important;
    right:auto !important;
    width:2px !important;
    height:auto !important;
    border-radius:99px !important;
    background:linear-gradient(180deg,var(--tp-mode-a),var(--tp-mode-b)) !important;
    opacity:0.82 !important;
    filter:none !important;
    box-shadow:0 0 18px color-mix(in srgb, var(--tp-mode-b) 30%, transparent) !important;
  }
  .tp-panel-head::after {
    left:20px !important;
    right:20px !important;
    bottom:0 !important;
    height:1px !important;
    background:linear-gradient(90deg,transparent,color-mix(in srgb, var(--tp-mode-b) 34%, transparent),transparent) !important;
    box-shadow:none !important;
    opacity:0.72 !important;
  }

  .tp-workflow-page .tp-gen-tabs {
    min-height:54px !important;
    width:100% !important;
    max-width:100% !important;
    min-width:0 !important;
    box-sizing:border-box !important;
    padding:0 !important;
    gap:0 !important;
    border:0 !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.058),rgba(255,255,255,0.018)) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.075),0 12px 30px rgba(0,0,0,0.16) !important;
    overflow:hidden !important;
    border-radius:20px !important;
    margin-bottom:12px !important;
    isolation:isolate !important;
  }
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:hover,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:focus,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab.active {
    min-height:54px !important;
    min-width:0 !important;
    box-sizing:border-box !important;
    border:0 !important;
    border-radius:0 !important;
    box-shadow:none !important;
    outline:0 !important;
    background:transparent !important;
    transform:none !important;
    margin:0 !important;
    backdrop-filter:none !important;
  }
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab.active {
    background:linear-gradient(145deg,rgba(255,255,255,0.16),rgba(139,220,255,0.075)) !important;
    color:#f8fafc !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.14) !important;
  }
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:first-child {
    border-radius:0 !important;
  }
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:nth-child(2) {
    border-radius:0 !important;
  }
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:last-child {
    border-radius:0 !important;
  }
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab span { display:none !important; }
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab svg { width:21px !important; height:21px !important; }

  .tp-workflow-page .tp-source-mode-row,
  .tp-workflow-page .tp-flat-segment-row {
    gap:0 !important;
    width:100% !important;
    max-width:100% !important;
    min-width:0 !important;
    box-sizing:border-box !important;
    border-radius:20px !important;
    overflow:hidden !important;
    border:1px solid rgba(255,255,255,0.075) !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.050),rgba(255,255,255,0.016)) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.070),0 12px 30px rgba(0,0,0,0.16) !important;
  }
  .tp-workflow-page .tp-source-mode-row > button,
  .tp-workflow-page .tp-source-mode-row > button:hover,
  .tp-workflow-page .tp-source-mode-row > button:focus,
  .tp-workflow-page .tp-flat-segment-row > button,
  .tp-workflow-page .tp-flat-segment-row > button:hover,
  .tp-workflow-page .tp-flat-segment-row > button:focus,
  .tp-workflow-page .tp-flat-segment-row > .model-na,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:hover,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:focus {
    min-height:48px !important;
    min-width:0 !important;
    box-sizing:border-box !important;
    border:0 !important;
    outline:0 !important;
    box-shadow:none !important;
    border-radius:0 !important;
    background:transparent !important;
    transform:none !important;
    margin:0 !important;
  }
  .tp-workflow-page .tp-flat-segment-row > .model-na {
    flex:1 !important;
    display:flex !important;
  }
  .tp-workflow-page .tp-flat-segment-row > .model-na > button {
    flex:1 !important;
    width:100% !important;
  }
  .tp-workflow-page .tp-flat-segment-row > button:first-child,
  .tp-workflow-page .tp-flat-segment-row > .model-na:first-child > button {
    border-radius:0 !important;
  }
  .tp-workflow-page .tp-flat-segment-row > button:last-child,
  .tp-workflow-page .tp-flat-segment-row > .model-na:last-child > button {
    border-radius:0 !important;
  }
  .tp-workflow-page .tp-source-mode-row > button + button,
  .tp-workflow-page .tp-flat-segment-row > button + button,
  .tp-workflow-page .tp-flat-segment-row > .model-na + button,
  .tp-workflow-page .tp-flat-segment-row > button + .model-na > button {
    border-left:1px solid rgba(139,220,255,0.13) !important;
  }
  .tp-workflow-page .tp-source-mode-btn.active {
    background:linear-gradient(145deg,rgba(255,255,255,0.17),rgba(139,220,255,0.075)) !important;
    color:#f8fafc !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.16) !important;
    text-shadow:none !important;
  }
  .tp-workflow-page .tp-flat-segment-row > .sel,
  .tp-workflow-page .tp-flat-segment-row > .model-na > .sel {
    background:linear-gradient(145deg,rgba(138,43,226,0.18),rgba(47,140,255,0.13),rgba(0,229,255,0.06)) !important;
    color:#f8fafc !important;
  }
  .tp-workflow-page .tp-source-mode-row > button,
  .tp-workflow-page .tp-flat-segment-row > button,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button {
    font-size:9.5px !important;
    font-weight:950 !important;
    letter-spacing:0.08em !important;
    line-height:1 !important;
    white-space:nowrap !important;
    overflow:hidden !important;
    text-overflow:ellipsis !important;
    text-transform:uppercase !important;
    color:rgba(203,213,225,0.72) !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:focus {
    border-radius:0 !important;
    border-top-left-radius:0 !important;
    border-top-right-radius:0 !important;
    border-bottom-left-radius:0 !important;
    border-bottom-right-radius:0 !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child:active {
    border-top-left-radius:0 !important;
    border-bottom-left-radius:0 !important;
    border-top-right-radius:0 !important;
    border-bottom-right-radius:0 !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2),
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2):hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2):focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2):active {
    border-radius:0 !important;
    border-top-left-radius:0 !important;
    border-top-right-radius:0 !important;
    border-bottom-left-radius:0 !important;
    border-bottom-right-radius:0 !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child:active {
    border-top-left-radius:0 !important;
    border-bottom-left-radius:0 !important;
    border-top-right-radius:0 !important;
    border-bottom-right-radius:0 !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:first-child {
    border-radius:0 !important;
    border-top-right-radius:0 !important;
    border-bottom-right-radius:0 !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:not(:first-child):not(:last-child) {
    border-radius:0 !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:last-child {
    border-radius:0 !important;
    border-top-left-radius:0 !important;
    border-bottom-left-radius:0 !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"] {
    background:linear-gradient(145deg,rgba(255,255,255,0.17),rgba(139,220,255,0.075)) !important;
    color:#f8fafc !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.16) !important;
    text-shadow:none !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="false"] {
    background:transparent !important;
    color:rgba(203,213,225,0.72) !important;
    box-shadow:none !important;
  }
  .tp-workflow-page .tp-style-grid {
    display:grid !important;
    grid-template-columns:repeat(3, minmax(0, 1fr));
    gap:8px !important;
  }
  .tp-workflow-page .tp-style-chip,
  .tp-workflow-page .tp-style-chip:hover,
  .tp-workflow-page .tp-style-chip:focus {
    display:flex !important;
    align-items:center !important;
    justify-content:center !important;
    gap:0 !important;
    width:100% !important;
    min-height:42px !important;
    padding:0 12px !important;
    border-radius:999px !important;
    border:1px solid rgba(139,220,255,0.13) !important;
    background:rgba(255,255,255,0.035) !important;
    color:rgba(203,213,225,0.82) !important;
    box-shadow:none !important;
    transform:none !important;
    overflow:hidden !important;
  }
  .tp-workflow-page .tp-style-chip[data-active="true"] {
    background:linear-gradient(145deg,rgba(138,43,226,0.20),rgba(47,140,255,0.16),rgba(0,229,255,0.08)) !important;
    border-color:rgba(139,220,255,0.36) !important;
    color:#f8fafc !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.16),0 0 24px rgba(47,140,255,0.16) !important;
  }
  .tp-workflow-page .tp-style-chip-icon {
    font-size:14px !important;
    line-height:1 !important;
    flex:0 0 auto !important;
    opacity:0.92;
  }
  .tp-workflow-page .tp-style-chip-label {
    width:100% !important;
    min-width:0 !important;
    overflow:hidden !important;
    text-overflow:ellipsis !important;
    white-space:nowrap !important;
    text-align:center !important;
    font-size:12px !important;
    font-weight:900 !important;
    letter-spacing:0.01em !important;
  }

  .tp-custom-select { position:relative; z-index:20; }
  .tp-custom-select-trigger {
    width:100%;
    min-height:46px !important;
    display:flex !important;
    align-items:center !important;
    justify-content:space-between !important;
    padding:0 14px !important;
    border:1px solid rgba(139,220,255,0.16) !important;
    border-radius:18px !important;
    background:linear-gradient(145deg,rgba(15,23,42,0.48),rgba(3,7,18,0.34)) !important;
    color:#f8fafc !important;
    font-size:12px !important;
    font-weight:850 !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.055) !important;
  }
  .tp-custom-select-menu {
    position:absolute;
    top:calc(100% + 6px);
    left:0;
    right:0;
    z-index:80;
    padding:6px;
    border:1px solid rgba(139,220,255,0.16);
    border-radius:18px;
    background:rgba(4,7,18,0.96);
    box-shadow:0 22px 48px rgba(0,0,0,0.40),0 0 30px rgba(47,140,255,0.10);
    backdrop-filter:blur(22px);
  }
  .tp-custom-select-option {
    width:100%;
    min-height:38px !important;
    justify-content:flex-start !important;
    padding:0 12px !important;
    border:0 !important;
    border-radius:12px !important;
    background:transparent !important;
    color:rgba(203,213,225,0.76) !important;
    font-size:12px !important;
    font-weight:800 !important;
    box-shadow:none !important;
  }
  .tp-custom-select-option:hover,
  .tp-custom-select-option.selected {
    background:rgba(47,140,255,0.13) !important;
    color:#ffffff !important;
  }

  .tp-action-dock {
    border-top:1px solid rgba(139,220,255,0.10) !important;
    background:linear-gradient(180deg,rgba(3,0,10,0.02),rgba(3,7,18,0.46)) !important;
    box-shadow:none !important;
  }
  .tp-action-card {
    border-radius:22px !important;
    border:1px solid rgba(139,220,255,0.14) !important;
    border-left:0 !important;
    background:linear-gradient(145deg,rgba(15,23,42,0.42),rgba(3,7,18,0.28)) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.055) !important;
  }
  .tp-generation-dock {
    padding:8px 14px 14px !important;
    border-top:1px solid rgba(139,220,255,0.09) !important;
    background:linear-gradient(180deg,rgba(3,7,18,0.02),rgba(0,229,255,0.05)) !important;
    box-shadow:none !important;
  }
  .tp-generation-card {
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    box-shadow:none !important;
    overflow:visible !important;
  }
  .tp-generation-card > div:first-child {
    display:none !important;
  }
  .tp-generation-card .tp-asset-name-input {
    height:48px !important;
    border-radius:20px !important;
    border:1px solid rgba(139,220,255,0.16) !important;
    background:rgba(5,8,18,0.22) !important;
    box-shadow:none !important;
    padding:0 18px !important;
    color:#f8fafc !important;
    font-size:12px !important;
    font-weight:850 !important;
    letter-spacing:0.04em !important;
  }
  .tp-generation-card .tp-gen-btn {
    min-height:54px !important;
    border-radius:22px !important;
    border:0 !important;
    box-shadow:none !important;
    background:rgba(5,8,18,0.20) !important;
  }
  .tp-generation-card .tp-gen-btn.go {
    background:linear-gradient(145deg,rgba(138,43,226,0.20),rgba(47,140,255,0.16),rgba(0,229,255,0.07)) !important;
    color:#f8fafc !important;
  }
  .tp-generation-card .tp-gen-btn.no {
    background:rgba(5,8,18,0.16) !important;
    border:1px solid rgba(139,220,255,0.09) !important;
    color:rgba(148,163,184,0.50) !important;
  }
  .tp-generation-card .tp-export-btn {
    width:100% !important;
    min-height:44px !important;
    margin-top:8px !important;
    border:0 !important;
    border-radius:18px !important;
    background:rgba(5,8,18,0.18) !important;
    box-shadow:none !important;
    color:rgba(203,213,225,0.52) !important;
  }

  /* UX stability patch: segmented controls (source mode + quality/topology) */
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn {
    padding:9px 6px !important;
    font-size:clamp(9px, 0.95vw, 10.5px) !important;
    font-weight:850 !important;
    letter-spacing:0.02em !important;
    line-height:1.05 !important;
    white-space:nowrap !important;
    overflow:hidden !important;
    text-overflow:clip !important;
    text-align:center !important;
    transition:background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.12s !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="false"]:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="false"]:focus-visible {
    background:linear-gradient(145deg,rgba(255,255,255,0.09),rgba(139,220,255,0.06)) !important;
    color:#e2e8f0 !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 0 18px rgba(47,140,255,0.09) !important;
  }
  .tp-workflow-page .tp-flat-segment-row > button,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button {
    transition:background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.12s !important;
  }
  .tp-workflow-page .tp-flat-segment-row > button:not(.sel):not(:disabled):hover,
  .tp-workflow-page .tp-flat-segment-row > button:not(.sel):not(:disabled):focus-visible,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:not(.sel):not(:disabled):hover,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:not(.sel):not(:disabled):focus-visible {
    background:linear-gradient(145deg,rgba(255,255,255,0.09),rgba(139,220,255,0.06)) !important;
    color:#e2e8f0 !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 0 18px rgba(47,140,255,0.09) !important;
  }
  .tp-workflow-page .tp-flat-segment-row > .sel,
  .tp-workflow-page .tp-flat-segment-row > .sel:hover,
  .tp-workflow-page .tp-flat-segment-row > .sel:focus-visible,
  .tp-workflow-page .tp-flat-segment-row > .model-na > .sel,
  .tp-workflow-page .tp-flat-segment-row > .model-na > .sel:hover,
  .tp-workflow-page .tp-flat-segment-row > .model-na > .sel:focus-visible {
    background:linear-gradient(145deg,rgba(138,43,226,0.24),rgba(47,140,255,0.16),rgba(0,229,255,0.08)) !important;
    color:#f8fafc !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.14),0 0 22px rgba(47,140,255,0.12) !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:not(:disabled):active,
  .tp-workflow-page .tp-flat-segment-row > button:not(:disabled):active,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:not(:disabled):active {
    transform:scale(0.985) !important;
  }

  /* Final segmented-control pass: single-plane rows, divider lines, stable active state */
  .tp-workflow-page .tp-gen-tabs,
  .tp-workflow-page .tp-source-mode-row,
  .tp-workflow-page .tp-flat-segment-row {
    gap:0 !important;
    padding:0 !important;
    overflow:hidden !important;
    border-radius:20px !important;
    border:1px solid rgba(139,220,255,0.16) !important;
    background:linear-gradient(145deg,rgba(255,255,255,0.058),rgba(255,255,255,0.02)) !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.08) !important;
  }
  .tp-workflow-page .tp-gen-tabs {
    min-height:56px !important;
  }
  .tp-workflow-page .tp-source-mode-row,
  .tp-workflow-page .tp-flat-segment-row {
    min-height:52px !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:focus-visible,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:focus-visible,
  .tp-workflow-page .tp-flat-segment-row > button,
  .tp-workflow-page .tp-flat-segment-row > button:hover,
  .tp-workflow-page .tp-flat-segment-row > button:focus,
  .tp-workflow-page .tp-flat-segment-row > button:focus-visible,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:hover,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:focus,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:focus-visible {
    margin:0 !important;
    border:0 !important;
    border-radius:0 !important;
    outline:0 !important;
    background:transparent !important;
    box-shadow:none !important;
    transform:none !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab + .tp-inp-tab,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn + .tp-source-mode-btn,
  .tp-workflow-page .tp-flat-segment-row > button + button,
  .tp-workflow-page .tp-flat-segment-row > .model-na + button,
  .tp-workflow-page .tp-flat-segment-row > button + .model-na > button {
    border-left:1px solid rgba(139,220,255,0.2) !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn,
  .tp-workflow-page .tp-flat-segment-row > button,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button {
    min-height:52px !important;
    padding:0 14px !important;
    font-size:clamp(10px, 0.95vw, 11.5px) !important;
    font-weight:900 !important;
    letter-spacing:0.04em !important;
    line-height:1.15 !important;
    white-space:nowrap !important;
    overflow:hidden !important;
    text-overflow:ellipsis !important;
    text-align:center !important;
    color:rgba(203,213,225,0.8) !important;
    transition:background 0.16s, color 0.16s, box-shadow 0.16s !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab {
    min-height:56px !important;
    padding:0 10px !important;
    color:rgba(203,213,225,0.8) !important;
    transition:background 0.16s, color 0.16s, box-shadow 0.16s !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab.active,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab.active:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab.active:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab.active:focus-visible,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab.active:active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"],
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"]:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"]:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"]:focus-visible,
  .tp-workflow-page .tp-flat-segment-row > .sel,
  .tp-workflow-page .tp-flat-segment-row > .sel:hover,
  .tp-workflow-page .tp-flat-segment-row > .sel:focus,
  .tp-workflow-page .tp-flat-segment-row > .sel:focus-visible,
  .tp-workflow-page .tp-flat-segment-row > .model-na > .sel,
  .tp-workflow-page .tp-flat-segment-row > .model-na > .sel:hover,
  .tp-workflow-page .tp-flat-segment-row > .model-na > .sel:focus,
  .tp-workflow-page .tp-flat-segment-row > .model-na > .sel:focus-visible {
    background:linear-gradient(145deg,rgba(255,255,255,0.16),rgba(139,220,255,0.09)) !important;
    color:#f8fafc !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.14) !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="false"]:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="false"]:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="false"]:focus-visible,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:not(.active):hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:not(.active):focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:not(.active):focus-visible,
  .tp-workflow-page .tp-flat-segment-row > button:not(.sel):not(:disabled):hover,
  .tp-workflow-page .tp-flat-segment-row > button:not(.sel):not(:disabled):focus,
  .tp-workflow-page .tp-flat-segment-row > button:not(.sel):not(:disabled):focus-visible,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:not(.sel):not(:disabled):hover,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:not(.sel):not(:disabled):focus,
  .tp-workflow-page .tp-flat-segment-row > .model-na > button:not(.sel):not(:disabled):focus-visible {
    background:rgba(255,255,255,0.06) !important;
    color:#e2e8f0 !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.11) !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:first-child,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:not(:first-child):not(:last-child),
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:last-child {
    border-radius:0 !important;
    border-top-left-radius:0 !important;
    border-top-right-radius:0 !important;
    border-bottom-left-radius:0 !important;
    border-bottom-right-radius:0 !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"] {
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.14) !important;
  }
  /* Hard stop: never allow inner rounding on segmented controls */
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:hover,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:focus,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:focus-visible,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab:active,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab.active,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab.active:hover,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab.active:focus,
  .tp-workflow-page .tp-gen-tabs .tp-inp-tab.active:focus-visible,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child:focus-visible,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:first-child:active,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2),
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2):hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2):focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2):focus-visible,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:nth-child(2):active,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child:focus-visible,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab:last-child:active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:focus-visible,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"],
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"]:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"]:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"]:focus-visible,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:first-child,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:first-child:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:first-child:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:first-child:focus-visible,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:first-child:active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:last-child,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:last-child:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:last-child:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:last-child:focus-visible,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn:last-child:active {
    border-radius:0 !important;
    border-top-left-radius:0 !important;
    border-top-right-radius:0 !important;
    border-bottom-left-radius:0 !important;
    border-bottom-right-radius:0 !important;
    box-shadow:none !important;
    clip-path:inset(0) !important;
  }
  .tp-workflow-page .tp-gen-tabs *,
  .tp-workflow-page .tp-gen-tabs *::before,
  .tp-workflow-page .tp-gen-tabs *::after,
  .tp-workflow-page .tp-source-mode-row *,
  .tp-workflow-page .tp-source-mode-row *::before,
  .tp-workflow-page .tp-source-mode-row *::after {
    border-radius:0 !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab.active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn[data-active="true"] {
    box-shadow:none !important;
    background-clip:padding-box !important;
  }
  /* Clean segmented controls used by GeneratePanel to avoid legacy radius conflicts */
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:active,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean.active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean:active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean.active {
    border-radius:0 !important;
    border-top-left-radius:0 !important;
    border-top-right-radius:0 !important;
    border-bottom-left-radius:0 !important;
    border-bottom-right-radius:0 !important;
    border:0 !important;
    outline:0 !important;
    box-shadow:none !important;
    text-shadow:none !important;
    transform:none !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean + .tp-inp-tab-clean,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean + .tp-source-mode-btn-clean {
    border-left:1px solid rgba(139,220,255,0.2) !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean.model-na {
    pointer-events:none !important;
    opacity:0.35 !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean {
    position:relative !important;
    color:rgba(203,213,225,0.82) !important;
    gap:0 !important;
    overflow:visible !important;
  }
  .tp-workflow-page .tp-gen-tabs {
    overflow:visible !important;
    position:relative !important;
    z-index:5 !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:not(.active):hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:not(.active):focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:not(.active):focus-visible {
    background:rgba(255,255,255,0.06) !important;
    color:#e2e8f0 !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.10) !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean.active,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean.active:hover,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean.active:focus,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean.active:focus-visible {
    background:linear-gradient(145deg,rgba(255,255,255,0.16),rgba(139,220,255,0.09)) !important;
    color:#f8fafc !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.14) !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean {
    position:relative !important;
    color:rgba(203,213,225,0.76) !important;
    transition:background 0.16s ease,color 0.16s ease,box-shadow 0.16s ease,transform 0.16s ease !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean:not(.active):hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean:not(.active):focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean:not(.active):focus-visible {
    background:rgba(255,255,255,0.062) !important;
    color:#e2e8f0 !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.09) !important;
  }
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean.active,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean.active:hover,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean.active:focus,
  .tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean.active:focus-visible {
    background:linear-gradient(145deg,rgba(0,229,255,0.13),rgba(138,43,226,0.12)) !important;
    color:#f8fafc !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.14),0 0 24px rgba(0,229,255,0.08) !important;
  }
  .tp-workflow-page .tp-view-choice:hover,
  .tp-workflow-page .tp-view-choice:focus-visible {
    transform:translateY(-1px);
    border-color:rgba(0,229,255,0.28) !important;
    color:#f8fafc !important;
    box-shadow:0 12px 26px rgba(0,0,0,0.18),0 0 22px rgba(0,229,255,0.10),inset 0 1px 0 rgba(255,255,255,0.09) !important;
    outline:none;
  }
  /* Enhanced Active State for VIEW buttons */
  .tp-workflow-page button.tp-view-choice.active,
  .tp-workflow-page button.tp-view-choice.active:hover,
  .tp-workflow-page button.tp-view-choice.active:focus-visible {
    color: #ffffff !important;
    border: 2px solid #00e5ff !important;
    background: linear-gradient(145deg, rgba(0, 229, 255, 0.35), rgba(138, 43, 226, 0.25)) !important;
    box-shadow: 0 0 30px rgba(0, 229, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
    opacity: 1 !important;
    transform: scale(1.02) !important;
    z-index: 10;
  }
  .tp-workflow-page button.tp-view-choice.active::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 15px;
    background: linear-gradient(145deg, #00e5ff, #8a2be2);
    opacity: 0.15;
    z-index: -1;
    filter: blur(8px);
    animation: pulseGlow 2s infinite;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean .tp-tab-icon {
    width:20px !important;
    height:20px !important;
    flex:0 0 auto !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean .tp-tab-label {
    display:none !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean::after {
    content:attr(data-tooltip);
    position:absolute;
    left:50%;
    top:calc(100% + 8px);
    transform:translateX(-50%) translateY(-4px);
    padding:5px 8px;
    border-radius:8px;
    background:rgba(3,7,18,0.96);
    border:1px solid rgba(139,220,255,0.24);
    color:#e2e8f0;
    font-size:10px;
    font-weight:800;
    letter-spacing:0.03em;
    white-space:nowrap;
    opacity:0;
    pointer-events:none;
    z-index:30;
    transition:opacity 0.14s ease, transform 0.14s ease !important;
    box-shadow:0 8px 18px rgba(0,0,0,0.35);
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean::before {
    content:"";
    position:absolute;
    left:50%;
    top:calc(100% + 3px);
    transform:translateX(-50%) translateY(-4px) rotate(45deg);
    width:8px;
    height:8px;
    border-left:1px solid rgba(139,220,255,0.24);
    border-top:1px solid rgba(139,220,255,0.24);
    background:rgba(3,7,18,0.96);
    opacity:0;
    pointer-events:none;
    z-index:29;
    transition:opacity 0.14s ease, transform 0.14s ease !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:hover::after,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:focus::after,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:focus-visible::after {
    opacity:1 !important;
    transform:translateX(-50%) translateY(0) !important;
  }
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:hover::before,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:focus::before,
  .tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:focus-visible::before {
    opacity:1 !important;
    transform:translateX(-50%) translateY(0) rotate(45deg) !important;
  }
`;

function logFrontendDebug(label, payload) {
  if (!import.meta.env.DEV || import.meta.env.VITE_TRIPO_DEBUG !== "true") return;
  try {
    console.log(label, JSON.parse(JSON.stringify(payload)));
  } catch {
    console.log(label, payload);
  }
}

function formatApiError(data, fallback = "API error") {
  const base = data?.message || fallback;
  return data?.tripoTraceId ? `${base} (Tripo trace: ${data.tripoTraceId})` : base;
}

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

  const { jobs, addJob, addJobs, updateJob, markJobDone, markJobDoneAndSeen, markJobError, registerCancelHandler, unregisterCancelHandler } = useJobs();

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
  const [texSub, setTexSub] = useState(() => sessionStorage.getItem("tripo_mode") === "texture_paint" && !TRIPO_PAINT_MODE_DISABLED ? "paint" : "generate");

  useEffect(() => {
    let finalMode = mode;
    if (mode === "segment" && segSub === "fill_parts") finalMode = "fill_parts";
    if (mode === "texture" && texSub === "paint" && !TRIPO_PAINT_MODE_DISABLED) finalMode = "texture_paint";
    sessionStorage.setItem("tripo_mode", finalMode);
  }, [mode, segSub, texSub]);

  // generate
  const [genTab, setGenTab] = useState("image");
  const [modelVer, setModelVer] = useState(DEFAULT_MODEL_VERSION);
  const [prompt, setPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [aiSuggestedNeg, setAiSuggestedNeg] = useState("");
  const [makeBetter, setMakeBetter] = useState(true);
  const [meshQ, setMeshQ] = useState("standard");
  const [inParts, setInParts] = useState(false);
  const [privacy, setPrivacy] = useState("public");
  const [texOn, setTexOn] = useState(() => {
    const saved = sessionStorage.getItem("tripo_generate_texture");
    return saved == null ? false : saved === "true";
  });
  const [tex4K, setTex4K] = useState(() => {
    const saved = sessionStorage.getItem("tripo_generate_texture_4k");
    return saved == null ? true : saved === "true";
  });
  const [pbrOn, setPbrOn] = useState(() => {
    const savedTexture = sessionStorage.getItem("tripo_generate_texture");
    const saved = sessionStorage.getItem("tripo_generate_pbr");
    if (savedTexture === "false") return false;
    return saved === "true";
  });
  const [genStatus, setGenStatus] = useState("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [pendingCountdown, setPendingCountdown] = useState(null);
  const pendingTaskRef = useRef(null);
  const submitLockedRef = useRef(false);
  const [submitLocked, setSubmitLocked] = useState(false);
  const [, setMultiviewSourceMode] = useState("upload");
  const [generationModel, setGenerationModel] = useState("");
  const [generationTemplateId, setGenerationTemplateId] = useState("");
  const [generationOrientation, setGenerationOrientation] = useState("");
  const [generationCompress, setGenerationCompress] = useState("");
  const [generationRenderImage, setGenerationRenderImage] = useState(true);
  const [generationTextureAlignment, setGenerationTextureAlignment] = useState("");
  const [imageReference, setImageReference] = useState(null);
  const [multiviewReference, setMultiviewReference] = useState(null);
  const [multiviewMode, setMultiviewMode] = useState("");
  const [multiviewOrthographic, setMultiviewOrthographic] = useState(false);
  const [multiviewOriginalTaskId, setMultiviewOriginalTaskId] = useState("");
  const [multiviewImageMode, setMultiviewImageMode] = useState("generate_image");
  const [multiviewEditPrompt, setMultiviewEditPrompt] = useState("");
  const [multiviewEditView, setMultiviewEditView] = useState("front");
  const [multiImages, setMultiImages] = useState([]);
  const remoteMultiviewLoadSeqRef = useRef(0);
  const [batchImages, setBatchImages] = useState([]);
  const [imgFile, setImgFile] = useState(null);
  const [imgPrev, setImgPrev] = useState(null);
  const [imgToken, setImgToken] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("tripo_generate_texture", String(texOn));
  }, [texOn]);

  useEffect(() => {
    sessionStorage.setItem("tripo_generate_texture_4k", String(tex4K));
  }, [tex4K]);

  useEffect(() => {
    sessionStorage.setItem("tripo_generate_pbr", String(pbrOn && texOn));
  }, [pbrOn, texOn]);

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
  const [refineManualOverride, setRefineManualOverride] = useState(false);
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
  const [segmentProcessing, setSegmentProcessing] = useState(false);

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
  const [viewerHistId, setViewerHistId] = useState(null);
  const [selectedPreviewThumb, setSelectedPreviewThumb] = useState(null);
  const [manualSelectedItem, setManualSelectedItem] = useState(null);
  useEffect(() => {
    _selHistId = selHistId || null;
  }, [selHistId]);
  // Load pending model URL written by onParallelTaskSuccess when panel was unmounted
  useEffect(() => {
    const pending = _pendingModel;
    if (!pending) return;
    _pendingModel = null;
    if (!pending.url) return;
    setLoadingId(null);
    setModelUrl(pending.url);
    setGenStatus("succeeded");
    if (pending.taskId) {
      const pendingHistId = `tripo_${pending.taskId}`;
      setViewerHistId(pendingHistId);
    }
  }, []);

  useEffect(() => {
    if (!modelUrl) return;
    setLoadingId((current) => (current ? null : current));
    setSegmentProcessing(false);
  }, [modelUrl]);

  useEffect(() => () => {
    if (loadWatchdogRef.current) clearTimeout(loadWatchdogRef.current);
  }, []);

  const findHistoryItemById = useCallback((id) => {
    if (!id) return null;
    return history.find(h => h.id === id) || optimisticItems.find(h => h.id === id) || null;
  }, [history, optimisticItems]);
  const findHistoryItemByTaskKey = useCallback((taskKey) => {
    if (!taskKey) return null;
    return history.find(h => h.taskId === taskKey || h.id === taskKey)
      || optimisticItems.find(h => h.taskId === taskKey || h.id === taskKey)
      || null;
  }, [history, optimisticItems]);
  const resolveHistoryDisplayName = useCallback((item) => {
    if (!item) return "Model";
    const originalTaskKey = item?.params?.originalModelTaskId || item?.params?.originalTaskId || item?.params?.original_model_task_id || item?.params?.original_task_id || item?.params?.draftModelTaskId || item?.params?.draft_model_task_id;
    const originalItem = findHistoryItemByTaskKey(originalTaskKey);
    const base = originalItem?.name || originalItem?.prompt || item?.name || item?.prompt || item?.mode || "Model";
    if (item?.params?.animated) {
      const slug = item?.params?.animation ?? "";
      const label = slug.split(":").pop() || slug;
      return label ? `${base}_${label}` : base;
    }
    if (item?.params?.rigged) return `${base}_rigged`;
    return base;
  }, [findHistoryItemByTaskKey]);

  const activeH = useMemo(() => {
    const listedItem = findHistoryItemById(selHistId);
    if (listedItem) return listedItem;
    if (manualSelectedItem && manualSelectedItem.id === selHistId) return manualSelectedItem;
    return null;
  }, [findHistoryItemById, selHistId, manualSelectedItem]);

  const viewerH = useMemo(() => {
    const listedItem = findHistoryItemById(viewerHistId);
    if (listedItem) return listedItem;
    if (manualSelectedItem && manualSelectedItem.id === viewerHistId) return manualSelectedItem;
    return null;
  }, [findHistoryItemById, viewerHistId, manualSelectedItem]);
  const activeDisplayName = useMemo(() => resolveHistoryDisplayName(activeH), [activeH, resolveHistoryDisplayName]);
  const selectedPreviewItem = useMemo(() => {
    const baseItem = manualSelectedItem || activeH;
    if (!baseItem) return null;
    const thumbnailCacheKey = getHistoryThumbnailCacheKey(baseItem);
    const previewImageUrl = getModelPreviewImageUrl(baseItem);
    return {
      ...baseItem,
      displayName: resolveHistoryDisplayName(baseItem),
      thumbnail:
        previewImageUrl
        || selectedPreviewThumb
        || baseItem?.thumbnail
        || baseItem?.thumbnail_url
        || checkThumbnailCache(thumbnailCacheKey)
        || checkThumbnailCache(baseItem?.model_url)
        || null,
    };
  }, [manualSelectedItem, activeH, selectedPreviewThumb, resolveHistoryDisplayName]);
  const selectedPreviewColor = useMemo(() => {
    const item = selectedPreviewItem;
    if (!item) return color;

    const modeRaw = String(item?.mode || item?.params?.mode || item?.params?.type || "").toLowerCase();
    const source = item?.source || "tripo";
    const isImageSet = isImageHistoryItem(item);
    const isSegment = modeRaw === "segment" || modeRaw.includes("segment");
    const isFillParts = modeRaw === "fill_parts" || modeRaw.includes("fill_parts");
    const isRig = modeRaw === "rig" || modeRaw.includes("animate_rig") || item?.params?.rigged === true;
    const isAnim = (modeRaw === "animate" || modeRaw.includes("retarget") || modeRaw.includes("animation")) && !isRig
      || item?.params?.animated === true;

    if (isImageSet) return "#00e5ff";
    if (isSegment) return "#f59e0b";
    if (isFillParts) return "#2f8cff";
    if (isAnim) return "#2f8cff";
    if (isRig) return "#f472b6";
    if (source === "trellis") return "#8bdcff";
    if (source === "upload") return "#94a3b8";
    return "#64748b";
  }, [selectedPreviewItem, color]);
  const activeModelHistoryItem = isImageHistoryItem(activeH) ? viewerH : activeH;
  const activeTaskId = activeModelHistoryItem?.taskId || activeModelHistoryItem?.task_id || activeModelHistoryItem?.id || "";
  const activeTaskType = getHistoryTaskType(activeH);
  const activeMultiviewImageTaskId = ["generate_multiview_image", "edit_multiview_image"].includes(activeTaskType)
    ? activeTaskId
    : "";
  const selectedMultiviewImageTaskId = (activeMultiviewImageTaskId || multiviewOriginalTaskId || "").trim();
  const activeTaskIdRef = useRef(activeTaskId);
  activeTaskIdRef.current = activeTaskId;
  const historyRef = useRef(history);
  historyRef.current = history;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Only explicit URL deep-links should raise the full-screen loader on mount.
  const [loadingId, setLoadingId] = useState(() =>
    searchParams.get("tripoTaskId")
      ? "__url_pending__" : null
  );

  const isSegOutput = activeH?.mode === "segment";
  const isGeneratedInParts = activeH?.params?.generate_parts === true || activeH?.params?.inParts === true;
  const isFillPartsCompatible = isSegOutput || isGeneratedInParts;
  const segmentActionTaskId = (((segSub === "fill_parts" ? fillId : segId).trim() || activeTaskId) || "").trim();
  const segmentActionItem = findHistoryItemByTaskKey(segmentActionTaskId) || activeH || null;
  const segmentActionModelVersion = getHistoryModelVersion(segmentActionItem);
  const isSegmentModelVersionSupported = isPostProcessModelVersionSupported(segmentActionModelVersion);
  const retopoActionTaskId = ((retopoId.trim() || activeTaskId) || "").trim();
  const retopoActionItem = findHistoryItemByTaskKey(retopoActionTaskId) || activeH || null;
  const retopoActionModelVersion = getHistoryModelVersion(retopoActionItem);
  const isRetopoModelVersionSupported = isPostProcessModelVersionSupported(retopoActionModelVersion);
  const refineSelectedTaskId = (((refineManualOverride || !activeTaskId) ? refineId.trim() : activeTaskId) || "").trim();
  const refineSourceItem = useMemo(() => {
    if (!refineSelectedTaskId) return null;
    return history.find(h => h.taskId === refineSelectedTaskId || h.id === refineSelectedTaskId)
      || optimisticItems.find(h => h.taskId === refineSelectedTaskId || h.id === refineSelectedTaskId)
      || (activeH?.taskId === refineSelectedTaskId || activeH?.id === refineSelectedTaskId ? activeH : null);
  }, [refineSelectedTaskId, history, optimisticItems, activeH]);

  const itemHasTexture = useCallback((item) => {
    return resolveItemHasTexture(item, findHistoryItemByTaskKey);
  }, [findHistoryItemByTaskKey]);

  const sourceForRefine = refineSourceItem || activeH;
  const hasTexture = itemHasTexture(sourceForRefine);
  const activeSourceType = getHistoryTaskType(sourceForRefine);
  const refineSourceResolution = useMemo(() => {
    return resolveOperationSource({
      operation: "refine",
      selectedTaskId: refineSelectedTaskId,
      selectedItem: sourceForRefine,
      fallbackItem: activeH,
      findHistoryItemByTaskKey,
    });
  }, [sourceForRefine, refineSelectedTaskId, findHistoryItemByTaskKey]);
  const refineSourceTaskId = refineSourceResolution.taskId;
  const refineResolvedFromUpstream = !!(refineSelectedTaskId && refineSourceTaskId && refineSelectedTaskId !== refineSourceTaskId);
  const refineDraftSourceItem = useMemo(() => {
    return findHistoryItemByTaskKey(refineSourceTaskId) || null;
  }, [findHistoryItemByTaskKey, refineSourceTaskId]);
  const refineSourceDisplayName = useMemo(
    () => resolveHistoryDisplayName(sourceForRefine),
    [sourceForRefine, resolveHistoryDisplayName]
  );
  const refineDraftDisplayName = useMemo(
    () => resolveHistoryDisplayName(refineDraftSourceItem || sourceForRefine),
    [refineDraftSourceItem, sourceForRefine, resolveHistoryDisplayName]
  );
  const refineSourceModelVersion = getHistoryModelVersion(refineDraftSourceItem || sourceForRefine);
  const isRefineSourceVersionSupported = isRefineModelVersionSupported(refineSourceModelVersion);
  const isRefineSourceTypeSupported =
    !activeSourceType ||
    REFINE_DIRECT_SOURCE_TYPES.has(activeSourceType) ||
    UPSTREAM_SOURCE_TYPES.has(activeSourceType) ||
    refineResolvedFromUpstream;
  const isAlreadyRefinedSource = activeSourceType === "refine_model";
  const refineBlockedBySelectedSource = mode === "refine" && (!refineSourceTaskId || !isRefineSourceTypeSupported || !isRefineSourceVersionSupported || isAlreadyRefinedSource);
  const refineDisableReason = !refineSourceTaskId
    ? "Refine csak draft (texture OFF) modellen használható."
    : (!isRefineSourceTypeSupported ? `Refine ehhez a forrástípushoz nem támogatott: ${activeSourceType}` : "");

  const effectiveRefineDisableReason = refineDisableReason ||
    (isAlreadyRefinedSource ? "A már refine-olt modelleket nem lehet újra refine-olni." : "") ||
    (!isRefineSourceVersionSupported ? `Refine csak Tripo v1.4 draft modellel működik. Ez a modell: ${refineSourceModelVersion}` : "");
  const operationDisabledReason =
    mode === "segment" && segmentActionTaskId && !isSegmentModelVersionSupported
      ? `Segment csak P1 vagy v3 AI modellel generált 3D modellnél használható. Ez a modell: ${segmentActionModelVersion}`
      : mode === "retopo" && retopoActionTaskId && !isRetopoModelVersionSupported
        ? `Retopo csak P1 vagy v3 AI modellel generált 3D modellnél használható. Ez a modell: ${retopoActionModelVersion}`
        : mode === "refine" && refineBlockedBySelectedSource
          ? effectiveRefineDisableReason
          : "";

  const textureSelectedTaskId = ((texId.trim() || activeTaskId) || "").trim();
  const textureSelectedItem = useMemo(() => {
    if (!textureSelectedTaskId) return null;
    return history.find(h => h.taskId === textureSelectedTaskId || h.id === textureSelectedTaskId)
      || optimisticItems.find(h => h.taskId === textureSelectedTaskId || h.id === textureSelectedTaskId)
      || (activeH?.taskId === textureSelectedTaskId || activeH?.id === textureSelectedTaskId ? activeH : null);
  }, [textureSelectedTaskId, history, optimisticItems, activeH]);
  const textureTargetItem = textureSelectedItem || activeH;
  const textureSourceResolution = useMemo(() => {
    return resolveOperationSource({
      operation: "texture",
      selectedTaskId: textureSelectedTaskId,
      selectedItem: textureTargetItem,
      fallbackItem: activeH,
      findHistoryItemByTaskKey,
    });
  }, [textureTargetItem, textureSelectedTaskId, activeH, findHistoryItemByTaskKey]);
  const textureSourceTaskId = textureSourceResolution.taskId;
  const textureSourceItem = useMemo(() => {
    return findHistoryItemByTaskKey(textureSourceTaskId)
      || textureTargetItem
      || activeH
      || null;
  }, [findHistoryItemByTaskKey, textureSourceTaskId, textureTargetItem, activeH]);
  const textureSourceHasTexture = itemHasTexture(textureSourceItem);
  const textureTargetDisplayName = useMemo(() => resolveHistoryDisplayName(textureTargetItem), [textureTargetItem, resolveHistoryDisplayName]);
  const textureSourceDisplayName = useMemo(() => resolveHistoryDisplayName(textureSourceItem), [textureSourceItem, resolveHistoryDisplayName]);
  const pbrSourceResolvedFromUpstream = !!(textureSourceTaskId && textureSelectedTaskId && textureSourceTaskId !== textureSelectedTaskId);
  const textureEditTaskId = ((editId.trim() || activeTaskId) || "").trim();
  const textureEditItem = useMemo(() => {
    return findHistoryItemByTaskKey(textureEditTaskId)
      || activeH
      || null;
  }, [findHistoryItemByTaskKey, textureEditTaskId, activeH]);
  const textureEditSourceResolution = useMemo(() => {
    return resolveOperationSource({
      operation: "texture",
      selectedTaskId: textureEditTaskId,
      selectedItem: textureEditItem,
      fallbackItem: activeH,
      findHistoryItemByTaskKey,
    });
  }, [textureEditTaskId, textureEditItem, activeH, findHistoryItemByTaskKey]);
  const textureEditSourceTaskId = textureEditSourceResolution.taskId;
  const textureEditSourceItem = useMemo(() => {
    return findHistoryItemByTaskKey(textureEditSourceTaskId)
      || textureEditItem
      || activeH
      || null;
  }, [findHistoryItemByTaskKey, textureEditSourceTaskId, textureEditItem, activeH]);
  const textureEditDisplayName = useMemo(() => resolveHistoryDisplayName(textureEditItem), [textureEditItem, resolveHistoryDisplayName]);
  const textureEditSourceDisplayName = useMemo(() => resolveHistoryDisplayName(textureEditSourceItem), [textureEditSourceItem, resolveHistoryDisplayName]);
  const [, setViewerTextureReady] = useState(false);
  const [viewerUvOverlap, setViewerUvOverlap] = useState(false);
  const paintUvOverlapWarning = mode === "texture" && texSub === "paint" && viewerUvOverlap;

  useEffect(() => {
    setViewerTextureReady(false);
    setViewerUvOverlap(false);
  }, [modelUrl]);

  useEffect(() => {
    if (mode !== "refine") return;
    logFrontendDebug("[TripoPanel][refine-debug]", {
      refineId,
      refineManualOverride,
      activeTaskId,
      refineSelectedTaskId,
      refineSourceTaskId,
      refineResolvedFromUpstream,
      sourceTaskId: sourceForRefine?.taskId || sourceForRefine?.id || null,
      sourceMode: sourceForRefine?.mode || sourceForRefine?.params?.mode || null,
      sourceType: sourceForRefine?.params?.type || null,
      sourceTexture: sourceForRefine?.params?.texture ?? null,
      sourcePbr: sourceForRefine?.params?.pbr ?? null,
      hasTexture,
      isRefineSourceTypeSupported,
      refineBlockedBySelectedSource,
      refineDisableReason: effectiveRefineDisableReason,
    });
  }, [mode, refineId, refineManualOverride, activeTaskId, refineSelectedTaskId, refineSourceTaskId, refineResolvedFromUpstream, sourceForRefine, hasTexture, isRefineSourceTypeSupported, refineBlockedBySelectedSource, effectiveRefineDisableReason]);

  // Segment highlight state controlled manually via top-right toggle
  const [segmentHighlight, setSegmentHighlight] = useState(false);

  // texture mode options
  const [texInputTab, setTexInputTab] = useState("text");
  const [texPrompt, setTexPrompt] = useState("");
  const [texNeg, setTexNeg] = useState("");
  const [texPbr, setTexPbr] = useState(false);
  const [texAlignment, setTexAlignment] = useState("original_image");
  const [textureModelVer, setTextureModelVer] = useState(() => {
    const saved = sessionStorage.getItem("tripo_texture_model_version");
    return TEXTURE_MODEL_VERSIONS.some(v => v.id === saved) ? saved : DEFAULT_TEXTURE_MODEL_VERSION;
  });

  useEffect(() => {
    if (!TEXTURE_MODEL_VERSIONS.some(v => v.id === textureModelVer)) {
      setTextureModelVer(DEFAULT_TEXTURE_MODEL_VERSION);
      return;
    }
    sessionStorage.setItem("tripo_texture_model_version", textureModelVer);
  }, [textureModelVer]);

  useEffect(() => {
    if (tex4K && textureModelVer !== DETAILED_TEXTURE_MODEL_VERSION) {
      setTextureModelVer(DETAILED_TEXTURE_MODEL_VERSION);
    }
  }, [tex4K, textureModelVer]);

  const textureRequestModelVer = tex4K ? DETAILED_TEXTURE_MODEL_VERSION : textureModelVer;

  // texture_edit — Magic Brush (viewport inpainting)
  const [brushMode, setBrushMode] = useState("Gen Mode");
  const [brushPrompt, setBrushPrompt] = useState("");
  const [creativity, setCreativity] = useState(0.6);
  const [brushColor, setBrushColor] = useState("#39ff88");
  const [brushSize, setBrushSize] = useState(10);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const brushHardness = 1;
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const wasPaintModeRef = useRef(false);

  // panels / modals
  const [dlOpen, setDlOpen] = useState(false);
  const [dlItem, setDlItem] = useState(null);


  const histAbort = useRef(null);
  const loadRequestSeqRef = useRef(0);
  const loadWatchdogRef = useRef(null);
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
  // updating activeTaskId and an explicit selection updating the URL param.
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

  const PARALLEL_LIMIT = 10;

  const hasImageReference = !!(imageReference?.tripoFile || imageReference?.token);
  const hasMultiviewReference = !!(multiviewReference?.tripoFile || multiviewReference?.token);

  const isUploadedImageReady = useCallback((item) => {
    return Boolean(item?.tripoFile || item?.token);
  }, []);

  const textureMultiViewsReady = useMemo(
    () => [0, 1, 2, 3].every((index) => isUploadedImageReady(multiImages?.[index])),
    [multiImages, isUploadedImageReady]
  );
  const multiviewUploadsReady = useMemo(
    () => isMultiviewUploadReady(multiImages),
    [multiImages]
  );

  const canGen = useMemo(() => {
    if (submitLocked) return false;
    const running = [...activeTasksRef.current.values()]
      .filter(t => t.status === "running" || t.status === "pending").length;
    if (running >= PARALLEL_LIMIT) return false;

    switch (mode) {
      case "generate":
        if (genTab === "text") return !!prompt.trim();
        if (genTab === "image") {
          return batchImages?.length > 0 && batchImages.every((item) => isUploadedImageReady(item));
        }
        if (genTab === "multi") {
          return multiviewUploadsReady || !!selectedMultiviewImageTaskId;
        }
        return false;
      case "views":
        if (multiviewImageMode === "generate_image") return !!prompt.trim();
        if (multiviewImageMode === "generate_multiview_image") return hasMultiviewReference;
        return !!selectedMultiviewImageTaskId && !!multiviewEditPrompt.trim();
      case "segment":
        if (!isSegmentModelVersionSupported) return false;
        if (segSub === "fill_parts") {
          return isFillPartsCompatible && !!segmentActionTaskId;
        }
        return !!segmentActionTaskId;
      case "retopo":
        if (!isRetopoModelVersionSupported) return false;
        return !!retopoActionTaskId;
      case "texture":
        if (texSub === "paint") {
          if (TRIPO_PAINT_MODE_DISABLED) return false;
          if (brushMode === "Paint Mode") {
            return !TRIPO_PAINT_MODE_DISABLED && !!(textureEditSourceTaskId || editId.trim() || activeTaskId || modelUrl) && !!brushPrompt.trim();
          }
          return !!(textureEditSourceTaskId || editId.trim() || activeTaskId) && !!brushPrompt.trim();
        }
        {
          const hasTextureTarget = !!(texId.trim() || activeTaskId);
          const hasTextureGuidance =
            texInputTab === "text"
              ? !!texPrompt.trim()
              : texInputTab === "image"
                ? !!imgToken
                : textureMultiViewsReady;

          if (texPbr && textureSourceHasTexture && !hasTextureGuidance) {
            return hasTextureTarget;
          }

          return hasTextureTarget && hasTextureGuidance;
        }
      case "texture_edit":
        return !!(editId.trim() || activeTaskId) &&
          ((!TRIPO_PAINT_MODE_DISABLED && brushMode === "Paint Mode") || !!brushPrompt.trim());
      case "refine": {
        if (refineBlockedBySelectedSource) return false;
        return !!refineSourceTaskId;
      }
      case "stylize": return !!(stylizeId.trim() || activeTaskId);
      case "animate": return !!riggedId && selAnim.size > 0;
      default: return false;
    }
  }, [mode, genTab, prompt, batchImages, segId, fillId, retopoId, isFillPartsCompatible,
    texId, texSub, texInputTab, texPrompt, imgToken, multiImages, editId, brushMode, brushPrompt,
    refineId, refineSourceTaskId, stylizeId, riggedId, selAnim, activeTaskId, activeH, modelUrl, texPbr,
    textureSourceHasTexture, textureEditSourceTaskId, refineBlockedBySelectedSource, focusedInstanceId,
    _taskTick, submitLocked, isSegmentModelVersionSupported, isRetopoModelVersionSupported,
    segmentActionTaskId, retopoActionTaskId, imageReference,
    multiviewReference, multiviewOriginalTaskId, isUploadedImageReady, hasMultiviewReference, textureMultiViewsReady,
    multiviewUploadsReady, multiviewImageMode, multiviewEditPrompt, selectedMultiviewImageTaskId]);



  const authH = useCallback(async () => {
    const t = getIdToken ? await getIdToken() : "";
    return { "Content-Type": "application/json", Authorization: "Bearer " + t };
  }, [getIdToken]);

  const normalizeTripoUploadFile = useCallback(async (file) => {
    const mime = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    const isAvif = mime === "image/avif" || name.endsWith(".avif");
    if (!isAvif) return file;

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("AVIF preview decode failed"));
        el.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(img, 0, 0, width, height);
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("AVIF to PNG conversion failed"));
        }, "image/png");
      });
      const baseName = String(file?.name || "image").replace(/\.[^.]+$/, "") || "image";
      return new File([pngBlob], `${baseName}.png`, { type: "image/png" });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const uploadImageFile = useCallback(async (file) => {
    const normalizedFile = await normalizeTripoUploadFile(file);
    const t = getIdToken ? await getIdToken() : "";
    const form = new FormData(); form.append("file", normalizedFile);
    const res = await fetch(BASE_URL + "/api/tripo/upload", { method: "POST", headers: { Authorization: "Bearer " + t }, body: form });
    const d = await res.json();
    if (!d.success) throw new Error(formatApiError(d, "Upload failed"));
    return d.imageToken;
  }, [getIdToken, normalizeTripoUploadFile]);

  const getTripoImageType = useCallback((file) => {
    const mime = String(file?.type || "").toLowerCase();
    if (mime === "image/jpeg" || mime === "image/jpg") return "jpeg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/avif") return "png";

    const name = String(file?.name || "").toLowerCase();
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpeg";
    if (name.endsWith(".png")) return "png";
    if (name.endsWith(".webp")) return "webp";
    if (name.endsWith(".avif")) return "png";
    return "png";
  }, []);


  const toTripoImageRef = useCallback((item) => {
    if (!item) return null;
    if (item.tripoFile) return item.tripoFile;
    if (item.token) {
      return {
        type: getTripoImageType(item.file),
        file_token: item.token,
      };
    }
    return null;
  }, [getTripoImageType]);

  const uploadImageStsFile = useCallback(async (file) => {
    const normalizedFile = await normalizeTripoUploadFile(file);
    return uploadViaTripoSts({
      getIdToken,
      kind: "image",
      file: normalizedFile,
    });
  }, [getIdToken, normalizeTripoUploadFile]);

  const handleMultiImg = uploadImageStsFile;
  const handleBatchImg = uploadImageStsFile;

  const hydrateMultiviewImagesFromHistory = useCallback(async (item, { preferUpload = false } = {}) => {
    const previewUrls = getHistoryImageUrls(item).slice(0, 4);
    if (!previewUrls.length) {
      setMultiImages([]);
      return;
    }

    const requestSeq = ++remoteMultiviewLoadSeqRef.current;
    const seededItems = buildMultiviewPreviewItems(previewUrls);
    setMultiImages(seededItems);
    if (preferUpload) setMultiviewSourceMode("upload");

    const uploadedItems = await Promise.all(
      previewUrls.map(async (url, index) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`History image fetch failed (${response.status})`);
          const blob = await response.blob();
          const extension = inferImageTypeFromUrl(url);
          const file = new File(
            [blob],
            `tripo_${MULTIVIEW_UPLOAD_ORDER[index]?.id || `view_${index + 1}`}.${extension}`,
            { type: blob.type || `image/${extension}` }
          );
          const payload = await uploadImageStsFile(file);
          return {
            index,
            item: {
              ...seededItems[index],
              ...normalizeUploadedMultiviewItem(file, seededItems[index]?.preview || url, payload),
            },
          };
        } catch (error) {
          console.warn("[hydrateMultiviewImagesFromHistory] upload failed:", error?.message || error);
          return { index, item: seededItems[index] };
        }
      })
    );

    if (remoteMultiviewLoadSeqRef.current !== requestSeq) return;

    setMultiImages((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [...seededItems];
      uploadedItems.forEach(({ index, item: nextItem }) => {
        next[index] = nextItem;
      });
      return next;
    });
  }, [uploadImageStsFile]);

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
      const imageToken = await uploadImageFile(file);
      setImgToken(imageToken);
    } catch (e) {
      setErrorMsg("Upload failed: " + e.message);
      setImgFile(null); setImgPrev(null);
    }
    finally { setImgUploading(false); }
  }, [uploadImageFile]);

  // ── Asset upload (GLB/FBX/OBJ) ────────────────────────────────────────
  const [assetUploading, setAssetUploading] = useState(false);
  const assetFileRef = useRef(null);

  const handleAssetUpload = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!TRIPO_MODEL_IMPORT_EXTENSIONS.has(ext)) {
      const message = "Unsupported model file. Use .glb, .fbx, .obj, or .stl.";
      toast.error(message);
      setErrorMsg(message);
      return;
    }
    if (file.size > TRIPO_MODEL_IMPORT_MAX_BYTES) {
      const message = "Model file is too large. Maximum size is 150MB.";
      toast.error(message);
      setErrorMsg(message);
      return;
    }
    setAssetUploading(true);
    const instanceId = Math.random().toString(36).substring(2, 9);
    try {
      const uploadedFile = await uploadViaTripoSts({
        getIdToken,
        kind: "model",
        file,
      });
      const headers = await authH();
      const res = await fetch(BASE_URL + "/api/tripo/assets/import", {
        method: "POST",
        headers,
        body: JSON.stringify({
          file: uploadedFile,
          filename: file.name,
          fileSize: file.size,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(formatApiError(d, "Asset upload failed"));
      toast.success(`Asset uploaded: ${file.name}`);

      const label = `Upload ${file.name}`;
      const taskObj = {
        instanceId,
        taskId: d.taskId,
        mode: "upload",
        status: "running",
        progress: 0,
        label,
        startedAt: Date.now()
      };

      activeTasksRef.current.set(instanceId, taskObj);
      persistActiveTask(taskObj);

      addJob({
        id: instanceId,
        panelType: "tripo",
        title: label,
        status: "running",
        progress: 0,
        taskId: d.taskId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      forceUpdate();
      setRefreshTrigger((value) => value + 1);
    } catch (e) {
      toast.error(`Upload failed: ${e.message}`);
      setErrorMsg("Asset upload failed: " + e.message);
    } finally {
      setAssetUploading(false);
    }
  }, [authH, getIdToken, addJob, forceUpdate, persistActiveTask]);

  const extractRealtimeTaskError = useCallback((d) => {
    return (
      d.errorMessage ||
      d.rawOutput?.error_msg ||
      d.rawOutput?.error_message ||
      d.rawOutput?.error ||
      d.rawOutput?.message ||
      d.rawOutput?.reason ||
      (d.errorCode != null ? `Task ${d.status} (Tripo code ${d.errorCode})` : null) ||
      `Task ${d.status}`
    );
  }, []);

  const waitForTaskRealtime = useCallback(async (taskId, pt, onSuccess, { skipJumpCheck = false, onProgress = null } = {}) => {
    let prevProgress = 0;
    let stuckSince = null;
    const controller = new AbortController();

    const processStatus = async (d) => {
      if (!d?.success) throw new Error(formatApiError(d, "Poll error"));

      const prog = d.progress ?? 0;
      if (!skipJumpCheck && d.status !== "success" && prog - prevProgress > PROGRESS_JUMP_LIMIT) {
        throw Object.assign(new Error(`Auto-stopped: suspicious progress jump (${prevProgress}% → ${prog}%)`), { type: "auto_stop", autoStop: true });
      }
      if (d.status !== "success") {
        if (prog > 0 && prog === prevProgress) {
          if (!stuckSince) stuckSince = Date.now();
          else if (Date.now() - stuckSince > STUCK_THRESHOLD_MS) {
            throw Object.assign(new Error("Auto-stopped: stuck at " + prog + "% for 5min"), { type: "auto_stop", autoStop: true });
          }
        } else {
          stuckSince = null;
        }
      }

      if (d.status !== "success" && d.status !== "failed" && d.status !== "cancelled") {
        const dp = Math.min(prog, 99);
        setProgress(dp);
        updatePersistedProgress(dp);
        prevProgress = prog;
        if (dp >= 95) setStatusMsg("Finalizing…");
        if (onProgress) onProgress(dp);
        return false;
      }

      if (d.status === "success") {
        const hasImagePreview = extractTripoPreviewImageUrls(d).length > 0;
        if (!d.modelUrl && d.rigCheckResult === null && !hasImagePreview) {
          throw Object.assign(new Error("Content blocked by Tripo. Credits were not charged."), { type: "nsfw" });
        }
        await onSuccess(d);
        return true;
      }

      throw Object.assign(new Error(extractRealtimeTaskError(d)), { tripoStatus: d.status, rawOutput: d });
    };

    try {
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          controller.abort();
          fn(value);
        };

        streamTaskStatus({
          taskId,
          getIdToken,
          signal: controller.signal,
          onStatus: (eventType, payload) => {
            if (pt.cancelled || settled || eventType !== "status") return;
            Promise.resolve(processStatus(payload))
              .then((done) => {
                if (done) finish(resolve);
              })
              .catch((err) => finish(reject, err));
          },
        }).then(() => {
          if (!settled && !pt.cancelled) {
            finish(reject, new Error("Task stream ended unexpectedly"));
          }
        }).catch((err) => {
          if (err?.name === "AbortError") return;
          finish(reject, err);
        });
      });
      return true;
    } catch (err) {
      if (err?.name === "AbortError") return true;
      console.warn(`[waitForTaskRealtime] falling back to polling for ${taskId}:`, err?.message ?? err);
      return false;
    }
  }, [extractRealtimeTaskError, getIdToken]);

  const pollTask = useCallback(async (taskId, pt, headers, onSuccess, { skipJumpCheck = false, onProgress = null } = {}) => {
    const streamed = await waitForTaskRealtime(taskId, pt, onSuccess, { skipJumpCheck, onProgress });
    if (streamed) return;

    let n = 0, prevProgress = 0, stuckSince = null;
    while (n < POLL_MAX) {
      if (pt.cancelled) return;
      await new Promise(r => setTimeout(r, POLL_MS));
      if (pt.cancelled) return;
      n++;
      const res = await fetch(BASE_URL + "/api/tripo/task/" + taskId, { headers });
      const d = await res.json();
      if (!d.success) throw new Error(formatApiError(d, "Poll error"));
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
        if (!d.modelUrl && d.rigCheckResult === null && !hasTaskImagePreview(d)) {
          throw Object.assign(new Error("Content blocked by Tripo. Credits were not charged."), { type: "nsfw" });
        }
        await onSuccess(d); return;
      }
      if (d.status === "failed" || d.status === "cancelled") {
        console.warn("[pollTask] failed rawOutput:", d.rawOutput);
        const taskError =
          d.errorMessage ||
          d.rawOutput?.error_msg ||
          d.rawOutput?.error_message ||
          d.rawOutput?.error ||
          d.rawOutput?.message ||
          d.rawOutput?.reason ||
          (d.errorCode != null ? `Task ${d.status} (Tripo code ${d.errorCode})` : null) ||
          `Task ${d.status}`;
        throw Object.assign(new Error(taskError), { tripoStatus: d.status, rawOutput: d });
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
        const fetchFromProxy = (scopedTaskId = null) => {
          const proxyUrl = BASE_URL + "/api/tripo/model-proxy?url=" + encodeURIComponent(rawUrl) + (scopedTaskId ? `&taskId=${scopedTaskId}` : "");
          return fetch(proxyUrl, {
            headers: { Authorization: "Bearer " + t },
            signal: AbortSignal.timeout(45_000),
          });
        };
        let res = await fetchFromProxy(taskId);
        if (res.status === 403 && taskId) {
          console.warn("[fetchProxy] task-scoped proxy returned 403, retrying without taskId");
          res = await fetchFromProxy(null);
        }
        if (!res.ok) {
          const err = new Error("Model load HTTP " + res.status);
          err.status = res.status;
          throw err;
        }
        const blob = await res.blob();
        if (!blob || blob.size === 0) throw new Error("Empty model response");
        return URL.createObjectURL(blob);
      } catch (err) {
        lastErr = err;
        console.warn(`[fetchProxy] attempt ${attempt + 1}/${retries} failed:`, err.message);
        if (err?.status === 410 || err?.status === 404) break;
      }
    }
    throw lastErr ?? new Error("fetchProxy: all retries exhausted");
  }, [getIdToken]);

  const revokeBlobUrl = useCallback((url) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  }, []);

  const purgeExpiredHistoryItem = useCallback(async (item) => {
    if (!item?.id) return;
    setHistory((prev) => prev.filter((entry) => entry.id !== item.id));
    setOptimisticItems((prev) => prev.filter((entry) => entry.id !== item.id));
    if (selHistId === item.id) {
      setSelHistId(null);
      setManualSelectedItem(null);
      setSelectedPreviewThumb(null);
    }
    if (viewerHistId === item.id) {
      setViewerHistId(null);
    }
    try {
      const token = await getIdToken?.();
      const response = await fetch(`${BASE_URL}/api/tripo/history/${item.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok && response.status !== 404) {
        console.warn("[purgeExpiredHistoryItem] delete failed:", response.status);
      }
    } catch (err) {
      console.warn("[purgeExpiredHistoryItem] cleanup request failed:", err?.message ?? err);
    }
  }, [getIdToken, selHistId, viewerHistId]);

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
        if (!d.success) throw new Error(formatApiError(d, "Task check failed"));

        // Inline success handler for resume — handles all opTypes
        const onSuccess = async (sd) => {
          if (pt.cancelled) return;
          const previewHistoryFields = buildPreviewHistoryFields(extractTripoPreviewImageUrls(sd));
          if (opType === "rig") {
            const blob = sd.modelUrl ? await fetchProxy(sd.modelUrl, persisted.taskId) : null;
            if (pt.cancelled) { revokeBlobUrl(blob); return; }
            if (blob) { revokeBlobUrl(prevUrl.current); setModelUrl(blob); prevUrl.current = blob; }
            setRiggedId(persisted.taskId); setRigStep("rigged"); setShowRig(true);
            setStatusMsg(""); setGenStatus("succeeded");

            if (sd.modelUrl && blob) {
              try {
                const buf = await fetch(blob).then(r => r.arrayBuffer());
                await getCachedThumbnail(buf, { width: 280, height: 280, resourcePath: sd.modelUrl }, getModelHistoryThumbnailCacheKey(sd.modelUrl));
              } catch {
                // Thumbnail warmup is optional here.
              }
            }

            if (!persisted.savedToHistory && sd.modelUrl) {
              markHistorySaved();
              const _ni = await saveRigHist(persisted.taskId, sd.modelUrl, { prompt: "auto-rig", originalModelTaskId: persisted.mode === "animate" ? persisted.taskId : undefined, rigModelVer: persisted.rigModelVer, rigType: persisted.rigType, rigSpec: persisted.rigSpec, ...previewHistoryFields });
              if (_ni) {
                setViewerHistId(_ni.id);
                getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
              }
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
                await getCachedThumbnail(buf, { width: 280, height: 280, resourcePath: rawUrl }, getModelHistoryThumbnailCacheKey(rawUrl));
              } catch {
                // Thumbnail warmup is optional here.
              }
            }

            if (!persisted.savedToHistory) {
              markHistorySaved();
              const _ni = await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? "animation", animated: true, ...previewHistoryFields });
              if (_ni) {
                setViewerHistId(_ni.id);
                getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
              }
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
              const _ni = await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? (opType === "fill_parts" ? "part completion" : "segmentation"), mode: opType, ...previewHistoryFields });
              if (_ni) {
                setViewerHistId(_ni.id);
                getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
              }
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
                await getCachedThumbnail(buf, { width: 280, height: 280, resourcePath: rawUrl }, getModelHistoryThumbnailCacheKey(rawUrl));
              } catch {
                // Thumbnail warmup is optional here.
              }
            }

            if (!persisted.savedToHistory && rawUrl) {
              markHistorySaved();
              const _ni = await saveHist(persisted.taskId, rawUrl, { prompt: persisted.prompt ?? "", ...previewHistoryFields });
              if (_ni) {
                setViewerHistId(_ni.id);
                getIdToken().then(tok => fetch(`${BASE_URL}/api/tripo/task/${persisted.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } }).catch(() => { }));
              }
            }
          }
        };

        if (d.status === "success" && (d.modelUrl || opType === "segment" || opType === "fill_parts")) {
          await onSuccess(d);
        } else if (d.status === "failed" || d.status === "cancelled") {
          setIsRunning(false); setProgress(0); setStatusMsg("");
          if (opType === "rig") setRigStep("idle");
          currentTaskId.current = null; clearPersistedGen();
          const taskError =
            d.errorMessage ||
            d.rawOutput?.error_msg ||
            d.rawOutput?.error_message ||
            d.rawOutput?.error ||
            d.rawOutput?.message ||
            d.rawOutput?.reason ||
            (d.errorCode != null ? `Task ${d.status} (Tripo code ${d.errorCode})` : null) ||
            `Task ${d.status}`;
          setGenStatus("failed"); setErrorMsg(taskError);
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

  const { saveHist, saveRigHist, saveImageHist } = useTripoHistory({
    userId, prompt, negPrompt, mode, modelVer, activeStyle, history, histInit,
    setOptimisticItems, setHistory,
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

  const genCost = useMemo(() => estimateTripoPanelGenerationCost({
    mode,
    texSub,
    tex4K,
    smartLowPoly,
    quadMesh,
    segSub,
    multiviewImageMode,
    genTab,
    modelVer,
    texOn,
    pbrOn,
    meshQ,
    inParts,
    batchImageCount: batchImages?.length ?? 0,
  }, MODE_COST), [
    mode, texSub, genTab, texOn, pbrOn, tex4K, meshQ, inParts, quadMesh,
    smartLowPoly, modelVer, multiviewImageMode, segSub, batchImages,
  ]);

  const createTripoTaskRequest = useCallback(async (body, headersOverride = null) => {
    const headers = headersOverride ?? await authH();
    const tr = await fetch(BASE_URL + "/api/tripo/task", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const td = await tr.json();
    logFrontendDebug("[TripoPanel][submit-debug] backend response:", {
      httpStatus: tr.status,
      ok: tr.ok,
      response: td,
    });

    if (!td.success) {
      const msg = formatApiError(td, "Task failed");
      const lower = msg.toLowerCase();
      if (lower.includes("insufficient") || lower.includes("credit") || lower.includes("balance")) {
        throw Object.assign(new Error("Nincs elég Tripo kredit. Tölts fel a fiókodba!"), { type: "credits" });
      }
      if (lower.includes("nsfw") || lower.includes("content policy") || lower.includes("moderat")) {
        throw Object.assign(new Error("Tartalom blokkolva: NSFW vagy irányelvek megsértése."), { type: "nsfw" });
      }
      throw new Error(msg);
    }

    return {
      headers,
      taskId: td.taskId ?? (Array.isArray(td.taskIds) ? td.taskIds[0] : null),
      response: td,
    };
  }, [authH]);

  const loadHistoryIntoViewer = useCallback(async (item, { showLoading = false } = {}) => {
    if (!item) return;
    const reqSeq = ++loadRequestSeqRef.current;
    if (loadWatchdogRef.current) {
      clearTimeout(loadWatchdogRef.current);
      loadWatchdogRef.current = null;
    }
    if (histAbort.current) histAbort.current.cancelled = true;
    const t = { cancelled: false };
    histAbort.current = t;
    if (isImageHistoryItem(item)) {
      setGenStatus(item.status);
      setSegmentProcessing(false);
      if (showLoading) setLoadingId(null);
      return;
    }

    if (showLoading) {
      setLoadingId(item.id);
      // Rapid-switch safety: never allow infinite loading overlay.
      loadWatchdogRef.current = setTimeout(() => {
        if (loadRequestSeqRef.current === reqSeq) {
          setLoadingId(null);
          setSegmentProcessing(false);
        }
      }, 12000);
    }
    setViewerHistId(item.id);
    setGenStatus(item.status);
    setSegmentProcessing(false);
    setSegmentHighlight(false);
    setViewMode(item?.mode === "segment" ? "segment" : "uv");

    if (item.model_url) {
      try {
        const b = await fetchProxy(item.model_url, item.taskId);
        if (!t.cancelled) {
          revokeBlobUrl(prevUrl.current);
          setModelUrl(b);
          prevUrl.current = b;
        } else {
          revokeBlobUrl(b);
        }
      } catch (loadErr) {
        if (loadErr?.status === 410 || loadErr?.status === 404) {
          console.warn("[loadHistoryIntoViewer] expiring history item after proxy failure:", loadErr.message);
          if (!t.cancelled) {
            toast.error("Ez a Tripo asset mar nem elerheto, eltavolitottam a historybol.");
            await purgeExpiredHistoryItem(item);
            revokeBlobUrl(prevUrl.current);
            prevUrl.current = null;
            setModelUrl(null);
          }
        } else {
          console.warn("[loadHistoryIntoViewer] fetchProxy failed, using direct URL:", loadErr.message);
          if (!t.cancelled) {
            setModelUrl(item.model_url);
            prevUrl.current = item.model_url;
          }
        }
      }
    }

    if (loadRequestSeqRef.current === reqSeq) {
      if (loadWatchdogRef.current) {
        clearTimeout(loadWatchdogRef.current);
        loadWatchdogRef.current = null;
      }
      if (showLoading) setLoadingId(null);
    }
  }, [fetchProxy, purgeExpiredHistoryItem, revokeBlobUrl, setViewMode]);

  const applyHistorySelection = useCallback((item) => {
    if (!item) return;
    const isImageSet = isImageHistoryItem(item);
    const imageTaskType = isImageSet ? getHistoryTaskType(item) : null;
    const isMultiviewHistoryItem =
      imageTaskType === "generate_multiview_image" ||
      imageTaskType === "edit_multiview_image";
    setManualSelectedItem(item);
    setSelectedPreviewThumb(
      getModelPreviewImageUrl(item)
      || item?.previewThumbnail
      || item?.thumbnail
      || item?.thumbnail_url
      || checkThumbnailCache(getHistoryThumbnailCacheKey(item))
      || checkThumbnailCache(item?.model_url)
      || null
    );
    setSelHistId(item.id);
    setGenStatus(item.status);
    pendingUrlTaskId.current = null;
    setLoadingId(null);
    programmaticUrlRef.current = item?.taskId || null;
    if (item?.taskId) setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("tripoTaskId", item.taskId); return n; }, { replace: true });
    else setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("tripoTaskId"); return n; }, { replace: true });
    setSegmentHighlight(false);
    if (!isImageSet) {
      setViewMode(item?.mode === "segment" ? "segment" : "uv");
    }

    if (item?.taskId) {
      if (isMultiviewHistoryItem) {
        setMultiviewOriginalTaskId(item.taskId);
        setMultiviewSourceMode("generated_views");
        void hydrateMultiviewImagesFromHistory(item, {
          preferUpload: mode === "generate" && genTab === "multi",
        });
      } else if (!isImageSet) {
        setSegId(item.taskId); setFillId(item.taskId); setRetopoId(item.taskId);
        setTexId(item.taskId); setAnimId(item.taskId); setEditId(item.taskId);
        setRefineId(item.taskId); setRefineManualOverride(false); setStylizeId(item.taskId);
      } else {
        setMultiviewImageMode("generate_image");
      }
    }
    logFrontendDebug("[TripoPanel][history-select]", {
      taskId: item?.taskId || null,
      mode: item?.mode || item?.params?.mode || null,
      type: item?.params?.type || null,
      texture: item?.params?.texture ?? null,
      pbr: item?.params?.pbr ?? null,
    });

    const isRigItem = !isImageSet && (item?.mode === "rig" || item?.params?.rigged === true || item?.params?.type === "animate_rig");
    const isAnimItem = item?.params?.animated === true || item?.params?.type === "animate_retarget";
    if (isRigItem || isAnimItem) {
      const rigId = isAnimItem
        ? (item.params?.originalModelTaskId || item.params?.original_model_task_id || item.taskId)
        : item.taskId;
      setRiggedId(rigId || null);
      setRigStep("rigged");
      setShowRig(true);
      setDetectedRigModelVer(item.params?.rigModelVer ?? null);
      setDetectedRigType(item.params?.rigType ?? null);
      setDetectedRigSpec(item.params?.rigSpec ?? null);
      if (item?.params?.animations && item.params.animations.length > 0) {
        const ids = item.params.animations
          .map(slug => ANIMATION_LIBRARY.find(a => a.slug === slug)?.id)
          .filter(Boolean);
        setSelAnim(new Set(ids));
      } else if (item?.params?.animation) {
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
  }, [genTab, hydrateMultiviewImagesFromHistory, mode, setSearchParams]);

  const handleUseOriginalModel = useCallback(async (taskId) => {
    const originalItem = findHistoryItemByTaskKey(taskId);
    if (!originalItem) {
      toast.error("Az original modell nincs a historyban.");
      return;
    }
    applyHistorySelection(originalItem);
    await loadHistoryIntoViewer(originalItem, { showLoading: true });
    toast.success("Original model betoltve.");
  }, [applyHistorySelection, findHistoryItemByTaskKey, loadHistoryIntoViewer]);

  const syncAutoLoadedHistoryItem = useCallback((item) => {
    if (!item) return;
    if (shouldAutoSelectGeneratedHistoryItem(item)) {
      applyHistorySelection(item);
      return;
    }
    setViewerHistId(item.id);
  }, [applyHistorySelection]);

  const handleGen = useCallback(async () => {
    if (!canGen) return;
    if (mode === "refine" && refineBlockedBySelectedSource) {
      const msg = effectiveRefineDisableReason || "Refine cannot run on this selected model.";
      console.warn("[TripoPanel][refine-blocked-at-submit]", {
        msg,
        refineId,
        refineManualOverride,
        activeTaskId,
        refineSourceTaskId,
      });
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    if (submitLockedRef.current) return;
    submitLockedRef.current = true;
    setSubmitLocked(true);

    try {
      if (histAbort.current) histAbort.current.cancelled = true;
      histAbort.current = null;
      pendingUrlTaskId.current = null;
      setLoadingId(null);

      // Frontend credit check — don't send request if insufficient
      const estimatedCost = genCost;
      if (userCredits < estimatedCost && estimatedCost > 0) {
        toast.error(`Insufficient credits: ${estimatedCost} needed, ${userCredits} available`);
        setErrorMsg(`Insufficient credits. You need ${estimatedCost} credits but have ${userCredits}.`);
        return;
      }

      setGenStatus("pending"); setErrorMsg(""); setStatusMsg("");
      const srcId = activeTaskId;
      const animSlugs = [...selAnim].map(id => getAnimById(id)?.slug).filter(Boolean);
      const animSlug = animSlugs.length === 1 ? animSlugs[0] : null;
      try {
        let body;
        let requestPath = "/api/tripo/task";
        let snapshotExtras = {};

        const effectiveModel = modelVer;
        const _isModern = effectiveModel === "P1-20260311" || effectiveModel.startsWith("v3.");
        // Build style prefix for text_to_model
        const styleObj = STYLE_PREFIX.find(s => s.id === activeStyle);
        const stylePrefix = (genTab === "text" && styleObj) ? styleObj.prefix : "";
        const effectivePbrOn = texOn && pbrOn;
        switch (mode) {
          case "views": {
            if (multiviewImageMode === "generate_image") {
              body = {
                type: "generate_image",
                prompt: prompt.trim(),
                ...(negPrompt.trim() && { negative_prompt: negPrompt.trim() }),
                ...(generationModel && { model: generationModel }),
                ...(generationTemplateId && { template_id: generationTemplateId }),
                ...(generationOrientation && { orientation: generationOrientation }),
                ...(generationCompress && { compress: generationCompress }),
                ...(generationTextureAlignment && { texture_alignment: generationTextureAlignment }),
                ...(generationRenderImage && { render_image: true }),
                ...(hasImageReference && { reference_image: toTripoImageRef(imageReference) }),
              };
            } else if (multiviewImageMode === "generate_multiview_image") {
              const sourceFile = toTripoImageRef(multiviewReference);
              if (!sourceFile) throw new Error("Upload a source image before generating multiview images.");
              body = {
                type: "generate_multiview_image",
                file: sourceFile,
              };
            } else {
              const editPrompt = multiviewEditPrompt.trim();
              const originalTaskId = selectedMultiviewImageTaskId;
              if (!originalTaskId || !editPrompt) {
                throw new Error("Generate or select multiview images before editing views.");
              }
              body = {
                type: "edit_multiview_image",
                original_task_id: originalTaskId,
                prompts: [{
                  prompt: editPrompt,
                  view: multiviewEditView || "front",
                }],
              };
            }
            break;
          }
          case "generate":
            if (genTab === "text") {
              const isUltra = meshQ === "ultra" && _isModern;
              body = {
                type: "text_to_model", prompt: stylePrefix + prompt.trim(), model_version: effectiveModel,
                ...(negPrompt.trim() && { negative_prompt: negPrompt.trim() }),
                ...(tPose && { t_pose: true }),
                texture: !!texOn,
                pbr: !!effectivePbrOn,
                ...(texOn && { texture_quality: tex4K ? "detailed" : "standard" }),
                ...(isUltra && { geometry_quality: "detailed" }),
                ...(polycount > 0 && { face_limit: polycount }),
                ...(inParts && { generate_parts: true }),
                ...(quadMesh && { quad: true }),
                ...(smartLowPoly && { smart_low_poly: true }),
                ...(modelSeed != null && { model_seed: modelSeed }),
                ...(imageSeed != null && { image_seed: imageSeed }),
                ...(texOn && textureSeed != null && { texture_seed: textureSeed }),
                ...(generationCompress && { compress: generationCompress }),
                ...(generationOrientation && { orientation: generationOrientation }),
                ...(generationTextureAlignment && { texture_alignment: generationTextureAlignment }),
                ...(generationRenderImage && { render_image: true }),
                ...(autoSize && { auto_size: true }),
                ...(!exportUv && { export_uv: false }),
              };
            } else if (genTab === "multi") {
              const isUltra = meshQ === "ultra" && _isModern;
              const isP1 = effectiveModel === "P1-20260311";
              let originalTaskId = null;
              let files = null;

              if (multiviewUploadsReady) {
                files = getMultiviewFilesPayload(multiImages, toTripoImageRef);
              } else if (selectedMultiviewImageTaskId) {
                originalTaskId = selectedMultiviewImageTaskId;
              } else {
                throw new Error("Upload at least Front + 1 view, or select an Images history item first.");
              }

              body = {
                type: "multiview_to_model",
                ...(originalTaskId ? { original_task_id: originalTaskId } : { files }),
                model_version: effectiveModel,
                ...(negPrompt.trim() && !isP1 && { negative_prompt: negPrompt.trim() }),
                ...(tPose && { t_pose: true }),
                texture: !!texOn,
                pbr: !!effectivePbrOn,
                ...(texOn && { texture_quality: tex4K ? "detailed" : "standard" }),
                ...(!isP1 && isUltra && { geometry_quality: "detailed" }),
                ...(polycount > 0 && { face_limit: polycount }),
                // P1-20260311 does NOT support quad, smart_low_poly, generate_parts, geometry_quality
                ...(!isP1 && quadMesh && { quad: true }),
                ...(!isP1 && smartLowPoly && { smart_low_poly: true }),
                ...(!isP1 && inParts && { generate_parts: true }),
                ...(modelSeed != null && { model_seed: modelSeed }),
                ...(imageSeed != null && { image_seed: imageSeed }),
                ...(texOn && textureSeed != null && { texture_seed: textureSeed }),
                ...(generationCompress && { compress: generationCompress }),
                ...(generationOrientation && { orientation: generationOrientation }),
                ...(generationTextureAlignment && { texture_alignment: generationTextureAlignment }),
                ...(generationRenderImage && { render_image: true }),
                ...(autoSize && { auto_size: true }),
                ...(!exportUv && { export_uv: false }),
              };
            } else {
              // Unify Single and Batch images
              const isUltra = meshQ === "ultra" && _isModern;
              const isP1 = effectiveModel === "P1-20260311";
              const inputImages = (batchImages ?? []).map(toTripoImageRef).filter(Boolean);

              if (inputImages.length === 0) return;

              body = {
                type: "image_to_model",
                model_version: effectiveModel,
                ...(negPrompt.trim() && !isP1 && { negative_prompt: negPrompt.trim() }),
                ...(tPose && { t_pose: true }),
                texture: !!texOn,
                pbr: !!effectivePbrOn,
                ...(texOn && { texture_quality: tex4K ? "detailed" : "standard" }),
                ...(!isP1 && isUltra && { geometry_quality: "detailed" }),
                ...(makeBetter && { enable_image_autofix: true }),
                ...(polycount > 0 && { face_limit: polycount }),
                ...(!isP1 && quadMesh && { quad: true }),
                ...(!isP1 && smartLowPoly && { smart_low_poly: true }),
                ...(!isP1 && inParts && { generate_parts: true }),
                ...(modelSeed != null && { model_seed: modelSeed }),
                ...(imageSeed != null && { image_seed: imageSeed }),
                ...(texOn && textureSeed != null && { texture_seed: textureSeed }),
                ...(generationCompress && { compress: generationCompress }),
                ...(generationOrientation && { orientation: generationOrientation }),
                ...(generationTextureAlignment && { texture_alignment: generationTextureAlignment }),
                ...(generationRenderImage && { render_image: true }),
                ...(autoSize && { auto_size: true }),
                ...(!exportUv && { export_uv: false }),
              };

              const submission = buildImageToModelSubmission(body, inputImages);
              requestPath = submission.requestPath;
              body = submission.body;
              if (submission.taskCount > 1) {
                snapshotExtras = {
                  ...snapshotExtras,
                  batchSize: submission.taskCount,
                };
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
            const retopoSourceTaskId = (retopoId.trim() || srcId);
            const _retopoSrc = history.find(h => h.taskId === retopoSourceTaskId);
            const _retopoName = _retopoSrc?.name || _retopoSrc?.prompt || "";
            body = smartLowPoly ? {
              type: "smart_low_poly",
              original_model_task_id: retopoSourceTaskId,
              ...(quadMesh && { quad: true }),
              ...(polycount > 0 && { face_limit: polycount }),
              _sourceName: _retopoName,
            } : {
              type: "convert_model",
              original_model_task_id: retopoSourceTaskId,
              format: quadMesh ? "fbx" : (outFormat || "glb"),
              ...(quadMesh && { quad: true }),
              ...(polycount > 0 && { face_limit: polycount }),
              ...(pivotToBottom && { pivot_to_center_bottom: true }),
              _sourceName: _retopoName,
            };
            break;
          }
          case "texture": {
            const textureSourceName = resolveHistoryDisplayName(textureSourceItem || textureTargetItem || activeH);
            const hasTextureGuidance =
              texInputTab === "text"
                ? !!texPrompt.trim()
                : texInputTab === "image"
                  ? !!imgToken
                  : multiImages.length > 0;
            if (texSub === "paint") {
              const paintSourceTaskId = textureEditSourceTaskId || editId.trim() || srcId;
              const paintSourceName = resolveHistoryDisplayName(textureEditSourceItem || textureEditItem || activeH);
              const paintPrompt = brushPrompt.trim();
              if (!paintSourceTaskId) {
                throw new Error("Valassz modellt a Magic Brush futtatasa elott.");
              }
              if (!paintPrompt) {
                throw new Error("Adj meg promptot a Magic Brush texture passhez.");
              }
              // Extract the painted guide image from the 3D viewer and upload as style reference.
              // The Tripo texture_prompt API uses style_image when both text + image are present,
              // so the painted region becomes a visual guide alongside the text prompt.
              let guideToken = null;
              if (sceneRef.current && typeof sceneRef.current.hasPaintStrokes === 'function' && sceneRef.current.hasPaintStrokes()) {
                const packageData = await sceneRef.current.getTexturePaintEditPackage();
                if (packageData && packageData.guideBlob) {
                  const guideFile = new File([packageData.guideBlob], "guide.png", { type: "image/png" });
                  guideToken = await uploadImageFile(guideFile);
                }
              }

              const texturePrompt = {
                text: paintPrompt,
                // When both text + image are present, backend normalizes image → style_image
                ...(guideToken && { image: { type: "png", file_token: guideToken } }),
              };
              body = {
                type: "texture_model",
                original_model_task_id: paintSourceTaskId,
                _sourceName: paintSourceName,
                model_version: textureRequestModelVer,
                texture: true,
                pbr: !!texPbr,
                texture_quality: tex4K ? "detailed" : "standard",
                texture_prompt: texturePrompt,
              };
            } else {
              if (texPbr && textureSourceHasTexture && !hasTextureGuidance) {
                body = {
                  type: "texture_model",
                  original_model_task_id: textureSourceTaskId,
                  _sourceName: textureSourceName,
                  model_version: textureRequestModelVer,
                  texture: false,
                  pbr: true,
                  texture_quality: tex4K ? "detailed" : "standard",
                };
              } else {
                const textureImageRefs = [0, 1, 2, 3]
                  .map(index => toTripoImageRef(multiImages?.[index]))
                  .filter(Boolean);
                if (texInputTab === "multi" && textureImageRefs.length !== 4) {
                  throw new Error("A multi-view texture inputhoz tolts fel 4 kepet: front, left, back, right.");
                }
                const texturePrompt = {
                  ...(texInputTab === "text" && texPrompt.trim() && { text: texPrompt.trim() }),
                  ...((texInputTab === "image" && imgToken) && { image: { type: getTripoImageType(imgFile), file_token: imgToken } }),
                  ...((texInputTab === "multi" && textureImageRefs.length === 4) && { images: textureImageRefs }),
                };
                body = {
                  type: "texture_model", original_model_task_id: textureSourceTaskId,
                  _sourceName: textureSourceName,
                  model_version: textureRequestModelVer,
                  texture: true,
                  pbr: !!texPbr,
                  texture_quality: tex4K ? "detailed" : "standard",
                  ...(Object.keys(texturePrompt).length > 0 && { texture_prompt: texturePrompt }),
                  ...((texInputTab === "image" || texInputTab === "multi") && texAlignment && { texture_alignment: texAlignment }),
                };
              }
            }
            break;
          }
          case "refine":
            body = {
              type: "refine_model",
              draft_model_task_id: refineSourceTaskId,
              _sourceName: refineDraftDisplayName || refineSourceDisplayName,
            };
            break;
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

        logFrontendDebug("[TripoPanel][submit-debug] built body:", {
          mode,
          genTab,
          activeTaskId: srcId ?? null,
          texOn,
          pbrOn,
          tex4K,
          effectiveModel,
          estimatedCost,
          body,
        });
        logFrontendDebug("[TripoPanel][handleGen] submitting task:", {
          type: body.type,
          model: body.model_version,
          texture: body.texture,
          pbr: body.pbr,
          cost: estimatedCost,
        });

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
          snapshot: { ...body, ...snapshotExtras },
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
          if (mode === "refine") {
            logFrontendDebug("[TripoPanel][refine-debug] submitting refine body:", {
              type: body?.type,
              draft_model_task_id: body?.draft_model_task_id ?? null,
              selected_task_id: refineSelectedTaskId || null,
              resolved_from_upstream: refineResolvedFromUpstream,
            });
          }
          const tr = await fetch(BASE_URL + requestPath, { method: "POST", headers, body: JSON.stringify(body) });
          const td = await tr.json();
          logFrontendDebug("[TripoPanel][submit-debug] backend response:", {
            httpStatus: tr.status,
            ok: tr.ok,
            response: td,
          });

          if (!td.success) {
            const msg = formatApiError(td, "Task failed");
            const lower = msg.toLowerCase();
            if (lower.includes("insufficient") || lower.includes("credit") || lower.includes("balance")) throw Object.assign(new Error("Nincs elég Tripo kredit. Tölts fel a fiókodba!"), { type: "credits" });
            if (lower.includes("nsfw") || lower.includes("content policy") || lower.includes("moderat")) throw Object.assign(new Error("Tartalom blokkolva: NSFW vagy irányelvek megsértése."), { type: "nsfw" });
            throw new Error(msg);
          }

                    const current = activeTasksRef.current.get(instanceId);
          if (current) {
            if (td.taskIds && Array.isArray(td.taskIds)) {
              // Batch response: Multiple task IDs
              const newTasks = [];
              const newJobs = [];

              td.taskIds.forEach((taskId, idx) => {
                const subInstanceId = idx === 0 ? instanceId : crypto.randomUUID();
                const subLabel = `Generate #${genCount + idx + 1}`;

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
                newTasks.push(subTask);
                newJobs.push({
                  id: subInstanceId,
                  panelType: "tripo",
                  title: subLabel,
                  status: "running",
                  progress: 0,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                });
              });

              persistActiveTasks(newTasks);
              addJobs(newJobs);
            } else {
              // Single task ID response
              const updated = { ...current, taskId: td.taskId, status: "running" };
              activeTasksRef.current.set(instanceId, updated);
              persistActiveTask(updated);
              updateJob(instanceId, { status: "running", progress: 0, taskId: td.taskId });
            }
          }
          forceUpdate();
        } catch (e) {
          console.error("[TripoPanel][submit-debug] request failed:", e);
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
        setStatusMsg(e.message ?? "Generation setup failed");
        toast.error(e.message ?? "Generation setup failed");
      }
    } finally {
      submitLockedRef.current = false;
      setSubmitLocked(false);
    }
  }, [canGen, mode, texSub, refineBlockedBySelectedSource, effectiveRefineDisableReason, refineSourceTaskId, refineSelectedTaskId, refineResolvedFromUpstream, refineDraftDisplayName, refineSourceDisplayName, genTab, prompt, negPrompt, modelVer, texOn, pbrOn, tex4K, meshQ, polycount, inParts, makeBetter, imgToken, imgFile, multiImages, batchImages, segId, fillId, retopoId, quadMesh, smartLowPoly, outFormat, pivotToBottom, texId, texPrompt, texNeg, texPbr, texAlignment, textureModelVer, textureRequestModelVer, editId, brushPrompt, creativity, riggedId, selAnim, tPose, modelSeed, textureSeed, imageSeed, autoSize, exportUv, authH, fetchProxy, revokeBlobUrl, activeTaskId, refreshCredits, refineId, refineManualOverride, stylizeId, stylizeStyle, getIdToken, history, forceUpdate, persistActiveTask, addJob, addJobs, updateJob, markJobError, textureSourceHasTexture, textureEditSourceTaskId, textureEditSourceItem, textureEditItem, textureSourceTaskId, textureTargetItem, textureSourceItem, resolveHistoryDisplayName, getTripoImageType, activeH, generationModel, generationTemplateId, generationOrientation, generationCompress, generationRenderImage, generationTextureAlignment, imageReference, multiviewReference, multiviewMode, multiviewOrthographic, multiviewOriginalTaskId, selectedMultiviewImageTaskId, multiviewImageMode, multiviewEditPrompt, multiviewEditView, toTripoImageRef, uploadImageFile, hasImageReference, hasMultiviewReference]);

  const { rigCompatRef, getCompatibility, handleAutoRig } = useTripoRig({
    activeTaskId, animId, authH, pollTask, fetchProxy, revokeBlobUrl,
    saveRigHist, generateAIName, getIdToken,
    rigSpec, animOutFormat, rigType, animModelVer, animBakeAnimation, animExportGeometry, animAnimateInPlace,
    history, prompt, setViewerHistId,
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
    const thisOptimisticId = inst.taskId ? `tripo_${inst.taskId}` : null;
    const resolvedModelUrl = resolveTripoModelUrl(d);
    const previewUrls = extractTripoPreviewImageUrls(d);
    const previewHistoryFields = buildPreviewHistoryFields(previewUrls);

    if (thisOptimisticId && inst.mode !== "views") {
      setViewerHistId(thisOptimisticId);
    }

    if (blobUrl || resolvedModelUrl) {
      setLoadingId(null);
      revokeBlobUrl(prevUrl.current);
      const nextViewerUrl = blobUrl || resolvedModelUrl;
      setModelUrl(nextViewerUrl);
      prevUrl.current = nextViewerUrl;
      setGenStatus("succeeded");
      setSegmentHighlight(false);
      setViewMode(inst.mode === "segment" ? "segment" : "uv");
    }

    if (blobUrl) {
      // Prime thumbnail cache so HistoryCard renders instantly (no blank placeholder)
      if (resolvedModelUrl) {
        try {
          const buf = await fetch(blobUrl).then(r => r.arrayBuffer());
          await getCachedThumbnail(buf, { width: 280, height: 280, resourcePath: resolvedModelUrl }, getModelHistoryThumbnailCacheKey(resolvedModelUrl));
        } catch { /* non-critical — HistoryCard will regenerate on miss */ }
      }
    }
    markJobDone(inst.instanceId, { title: inst.label, progress: 100, taskId: inst.taskId, modelUrl: resolvedModelUrl ?? null });

    if (inst.mode === "views") {
      const imageTaskType = inst.snapshot?.type ?? multiviewImageMode;
      const isMultiviewTask =
        imageTaskType === "generate_multiview_image" ||
        imageTaskType === "edit_multiview_image";
      const historyLabel = imageTaskType === "generate_image" ? "Image" : "View Set";
      if (isMultiviewTask) {
        setMultiviewOriginalTaskId(inst.taskId || "");
        setMultiviewSourceMode("generated_views");
      }
      if (inst.taskId && previewUrls.length > 0) {
        const stableDocId = `tripo_${inst.taskId}`;
        const optimisticItem = {
          id: stableDocId,
          taskId: inst.taskId,
          status: "succeeded",
          source: "tripo",
          mode: inst.mode,
          kind: "images",
          type: imageTaskType,
          image_urls: previewUrls,
          previewImageUrl: previewUrls[0] ?? null,
          previewImageUrls: previewUrls,
          ts: Date.now(),
          prompt: inst.snapshot?.prompt || inst.label || historyLabel,
          name: inst.snapshot?._sourceName || inst.label || historyLabel,
          params: {
            type: imageTaskType,
            mode: inst.mode,
            assetKind: "images",
            ...(inst.snapshot?.original_task_id && { originalTaskId: inst.snapshot.original_task_id }),
            ...(d.consumedCredit != null && { consumedCredit: d.consumedCredit }),
          },
          createdAt: { toDate: () => new Date() },
        };
        setOptimisticItems(prev => [
          optimisticItem,
          ...prev.filter(o => o.id !== stableDocId),
        ]);
        syncAutoLoadedHistoryItem(optimisticItem);
        try {
          const ni = await saveImageHist(inst.taskId, previewUrls, {
            prompt: inst.snapshot?.prompt || inst.label || historyLabel,
            name: inst.snapshot?._sourceName || inst.label || historyLabel,
            label: inst.label,
            mode: inst.mode,
            type: imageTaskType,
            originalTaskId: inst.snapshot?.original_task_id ?? undefined,
            consumedCredit: d.consumedCredit ?? undefined,
          });
          if (ni) syncAutoLoadedHistoryItem(ni);
        } catch (e) {
          console.error("[onParallelTaskSuccess] saveImageHist failed:", e?.message ?? e);
        }
      }
      toast.success(
        isMultiviewTask
          ? "Image set ready. Model > Multi-view will use it automatically."
          : "Generated image ready.",
      );
      refreshCredits?.();
      return;
    }

    // Persist the durable Firestore URL so TripoPanel can load it on next mount.
    // Blob URLs are revoked on unmount and must not be stored here.
    if (resolvedModelUrl) {
      _pendingModel = { url: resolvedModelUrl, taskId: inst.taskId };
    }

    refreshCredits?.();

    if (!resolvedModelUrl && !blobUrl) {
      console.warn("[onParallelTaskSuccess] success payload had no model URL:", d);
      toast.error("A modell elkészült, de nem kaptunk betölthető modell URL-t.");
      return;
    }

    // Optimistic entry so Shared3DHistory shows card immediately (before Firestore round-trip)
    if (resolvedModelUrl && inst.taskId) {
      const stableDocId = `tripo_${inst.taskId}`;
      const isTextureOutput = inst.mode === "texture" || inst.snapshot?.type === "texture_model" || inst.snapshot?.texture === true;
      const originalModelTaskId = inst.snapshot?.original_model_task_id ?? inst.snapshot?.original_task_id ?? undefined;
      const draftModelTaskId = inst.snapshot?.draft_model_task_id ?? undefined;
      const sourceName = inst.snapshot?._sourceName || "";
      const modeLabel = inst.mode === "segment" ? "Segmentation" : inst.mode === "retopo" ? "Retopo" : "";
      const optimisticItem = {
        id: stableDocId,
        taskId: inst.taskId,
        status: "succeeded",
        model_url: resolvedModelUrl,
        ...previewHistoryFields,
        source: "tripo",
        mode: inst.mode,
        ...(inst.snapshot?.type && { type: inst.snapshot.type }),
        ...(isTextureOutput && { texture: true }),
        ...(inst.snapshot?.pbr === true && { pbr: true }),
        ts: Date.now(),
        prompt: inst.snapshot?.prompt || sourceName || inst.mode,
        ...(sourceName && { name: modeLabel ? `${modeLabel}/${sourceName}` : sourceName }),
        params: {
          ...(inst.mode === "animate" && { animated: true, originalModelTaskId: inst.riggedId || inst.originalTaskId || null }),
          ...(inst.snapshot?.type && { type: inst.snapshot.type }),
          ...(inst.snapshot?.model_version && { model_version: inst.snapshot.model_version }),
          ...(originalModelTaskId && { originalModelTaskId }),
          ...(draftModelTaskId && { draftModelTaskId }),
          ...(inst.snapshot?.preprocessTaskId && { preprocessTaskId: inst.snapshot.preprocessTaskId }),
          ...(inst.snapshot?.preprocessTaskType && { preprocessTaskType: inst.snapshot.preprocessTaskType }),
          ...(inst.snapshot?.generate_parts === true && { generate_parts: true, inParts: true }),
          ...(isTextureOutput && { texture: true }),
          ...(inst.snapshot?.pbr === true && { pbr: true }),
          ...(d.consumedCredit != null && { consumedCredit: d.consumedCredit }),
        },
        createdAt: { toDate: () => new Date() },
      };
      setOptimisticItems(prev => [
        optimisticItem,
        ...prev.filter(o => o.id !== stableDocId),
      ]);
      syncAutoLoadedHistoryItem(optimisticItem);
    }

    try {
      const isAnimate = inst.mode === "animate";
      if (isAnimate) {
        // animate_retarget — save each animated_model URL as a separate history entry
        const animatedModels = Array.isArray(d.rawOutput?.animated_models)
          ? d.rawOutput.animated_models.map(resolveTripoUrlNode).filter(Boolean)
          : null;
        const urlsToSave = animatedModels ?? (resolvedModelUrl ? [resolvedModelUrl] : []);
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
            consumedCredit: d.consumedCredit ?? undefined,
            ...previewHistoryFields,
          });
          if (ni) {
            syncAutoLoadedHistoryItem(ni);
            try {
              const tok = await getIdToken();
              await fetch(`${BASE_URL}/api/tripo/task/${inst.taskId}/ack`, { method: "POST", headers: { Authorization: `Bearer ${tok}` } });
            } catch { /* non-critical */ }
          }
        }
      } else {
        const _sourceName = inst.snapshot?._sourceName || "";
        const _modeLabel = inst.mode === "segment" ? "Segmentation" : inst.mode === "retopo" ? "Retopo" : "";
        const ni = await saveHist(inst.taskId, resolvedModelUrl, {
          prompt: inst.snapshot?.prompt || _sourceName || inst.label,
          name: _sourceName ? (_modeLabel ? `${_modeLabel}/${_sourceName}` : _sourceName) : undefined,
          label: inst.label,
          mode: inst.mode,
          source: inst.mode === "upload" ? "upload" : undefined,
          type: inst.snapshot?.type ?? undefined,
          modelVer: inst.snapshot?.model_version ?? undefined,
          originalModelTaskId: inst.snapshot?.original_model_task_id ?? inst.snapshot?.original_task_id ?? undefined,
          draftModelTaskId: inst.snapshot?.draft_model_task_id ?? undefined,
          preprocessTaskId: inst.snapshot?.preprocessTaskId ?? undefined,
          preprocessTaskType: inst.snapshot?.preprocessTaskType ?? undefined,
          consumedCredit: d.consumedCredit ?? undefined,
          ...previewHistoryFields,
          ...(inst.snapshot?.generate_parts === true && { generate_parts: true, inParts: true }),
          ...((inst.mode === "texture" || inst.snapshot?.type === "texture_model" || inst.snapshot?.texture === true) && { texture: true }),
          ...(inst.snapshot?.pbr === true && { pbr: true }),
        });
        if (ni) {
          syncAutoLoadedHistoryItem(ni);
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
  }, [saveHist, saveImageHist, getIdToken, refreshCredits, revokeBlobUrl, markJobDone, setOptimisticItems, history, setViewMode, syncAutoLoadedHistoryItem, multiviewImageMode]);

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
    applyHistorySelection(item);
    await loadHistoryIntoViewer(item, { showLoading: true });
  }, [applyHistorySelection, loadHistoryIntoViewer]);

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
    void selHist(item);
  }, [selHist]);

  useEffect(() => {
    const pendingTaskId = pendingUrlTaskId.current;
    if (!pendingTaskId) return;

    const pendingItem = [...optimisticItems, ...history].find(
      (item) => item.taskId === pendingTaskId || item.id === pendingTaskId
    );
    if (!pendingItem) return;

    pendingUrlTaskId.current = null;
    setLoadingId(null);
    void selHist(pendingItem);
  }, [history, optimisticItems, selHist]);

  const reuse = useCallback((item) => {
    if (isImageHistoryItem(item)) {
      const imageTaskType = getHistoryTaskType(item);
      if (imageTaskType === "generate_image") {
        setMode("views");
        setMultiviewImageMode("generate_image");
        setPrompt(item?.prompt || "");
        setNegPrompt(item?.negPrompt || "");
        setErrorMsg("");
        return;
      }
      if (item?.taskId) {
        setMultiviewOriginalTaskId(item.taskId);
        setMultiviewSourceMode("generated_views");
      }
      setMode("generate");
      setGenTab("multi");
      void hydrateMultiviewImagesFromHistory(item, { preferUpload: true });
      setErrorMsg("");
      return;
    }
    const styleObj = STYLE_PREFIX.find(s => s.id === item?.styleId);
    const rawPrompt = styleObj?.prefix && item?.prompt?.startsWith(styleObj.prefix)
      ? item.prompt.slice(styleObj.prefix.length)
      : (item?.prompt || "");
    setPrompt(rawPrompt);
    setNegPrompt(item?.negPrompt || "");
    if (item?.taskId) {
      setSegId(item.taskId); setFillId(item.taskId); setRetopoId(item.taskId);
      setTexId(item.taskId); setAnimId(item.taskId); setEditId(item.taskId);
      setRefineId(item.taskId); setRefineManualOverride(false); setStylizeId(item.taskId);
    }
    setActiveStyle(item?.styleId || "");
    setErrorMsg("");
  }, [hydrateMultiviewImagesFromHistory]);

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
    if (mode === "views") {
      if (multiviewImageMode === "generate_image") return "Generate Image";
      return multiviewImageMode === "edit_multiview_image" ? "Edit Views" : "Generate Views";
    }
    if (mode === "texture") {
      if (texSub === "paint" && TRIPO_PAINT_MODE_DISABLED) return "Waiting for Tripo Patch";
      if (texSub === "paint") return brushMode === "Paint Mode" ? "Apply Paint Texture" : "Apply Texture Prompt";
      return "Generate Texture";
    }
    return ({
      generate: "Generate Model",
      retopo: "Retopology",
      refine: "Refine Model", stylize: "Apply Style",
      animate: "Apply Animation",
    })[mode] ?? "Generate";
  }, [mode, segSub, texSub, brushMode, multiviewImageMode]);

  const modeTitle = useMemo(() => {
    if (mode === "segment") return segSub === "fill_parts" ? "Fill Parts" : "Segmentation";
    if (mode === "texture") return texSub === "paint" ? "Paint Mode Paused" : "3D Model Texture Generator";
    return ({
      generate: "Generate Model",
      views: "Image Tools",
      retopo: "Retopology",
      refine: "Model Refinement", stylize: "Style Transfer",
      animate: "3D Rigging & Animation",
    })[mode] ?? mode;
  }, [mode, segSub, texSub]);
  const modeMeta = MODE_UI[mode] ?? MODE_UI.generate;
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

  useEffect(() => {
    const enteringPaintMode =
      mode === "texture" &&
      texSub === "paint" &&
      !wasPaintModeRef.current;

    if (enteringPaintMode && sceneRef.current) {
      sceneRef.current.autoSpin = false;
      setAutoSpin(false);
    }

    wasPaintModeRef.current = mode === "texture" && texSub === "paint";
  }, [mode, texSub, setAutoSpin]);

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
        void selHist(histItem);
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
    // Skip URL changes we initiated ourselves (saveHist, selection sync)
    if (programmaticUrlRef.current === urlTaskIdParam) {
      programmaticUrlRef.current = null;
      return;
    }
    // Read latest values via refs — avoids history/activeTaskId as deps
    // which would re-trigger on every Firestore snapshot or state update
    if (urlTaskIdParam === activeTaskIdRef.current) return;
    const histItem = historyRef.current.find(h => h.taskId === urlTaskIdParam);
    if (histItem) {
      void selHist(histItem);
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
      leftSecondaryWidth={416}
      rightWidth={rightW}
      overlay={isMobile}
      leftSidebar={globalSidebar}
      leftSecondarySidebar={
        <div
          className="tp-side-shell h-full overflow-hidden backdrop-blur-3xl"
          style={{ "--tp-rail-bg": `url(${tripoSidebarBg})` }}
        >
          <div className="tp-mode-rail">
            <div className="tp-rail-brand">3D</div>
            <div className="tp-rail-list">
              {NAV.map(n => {
                const Icon = n.icon;
                return (
                  <Tooltip key={n.id} text={n.label} side="right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode(n.id);
                        setLeftSecondaryOpen(true);
                        if (isMobile) setRightOpen(false);
                      }}
                      className={"tp-rail-btn" + (mode === n.id ? " active" : "")}
                      aria-current={mode === n.id ? "page" : undefined}
                      aria-label={n.label}
                    >
                      <Icon />
                      <span className="lbl">{n.label}</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <div
            className="tp-controls-col flex-1 flex flex-col overflow-hidden"
            style={{ "--tp-mode-a": modeMeta.accent, "--tp-mode-b": modeMeta.accent2 }}
          >
            <div className="tp-panel-head flex-shrink-0">
              <div className="tp-mode-kicker">
                <span>{modeMeta.eyebrow}</span>
              </div>
              <h3 className="tp-panel-title text-[13px] font-black tracking-widest uppercase flex items-center gap-2 italic">
                <Activity className="w-4 h-4 opacity-70" style={{ color: modeMeta.accent }} />
                {modeTitle}
              </h3>
              <p className="tp-panel-desc">{modeMeta.description}</p>
              {mode === "segment" && (
                <div className="tp-sub-tabs">
                  {SEGMENT_SUBS.map(s => {
                    const isDisabled = s.id === "fill_parts" && !isFillPartsCompatible;
                    return (
                      <button
                        key={s.id}
                        disabled={isDisabled}
                        className={`tp-sub-tab${segSub === s.id ? " on" : ""}${isDisabled ? " opacity-30 cursor-not-allowed" : ""}`}
                        onClick={() => !isDisabled && setSegSub(s.id)}
                        style={{ flex: "1 1 auto", minWidth: "120px" }}
                        title={isDisabled ? "Only available for segmented or generate-parts models" : ""}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {mode === "texture" && (
                <div className="tp-sub-tabs">
                  {TEXTURE_SUBS.map(s => {
                    const isDisabled = !!s.disabled;
                    return (
                      <button
                        key={s.id}
                        disabled={isDisabled}
                        className={`tp-sub-tab${texSub === s.id ? " on" : ""}${isDisabled ? " opacity-30 cursor-not-allowed" : ""}`}
                        onClick={() => !isDisabled && setTexSub(s.id)}
                        style={{ flex: "1 1 auto", minWidth: "120px" }}
                        title={isDisabled ? s.disabledMessage : ""}
                      >
                        <span className="flex flex-col items-center justify-center gap-0.5">
                          <span>{s.label}</span>
                          {isDisabled && (
                            <span className="text-[7px] font-black uppercase tracking-[0.12em] text-white/25 leading-none">
                              {s.disabledMessage}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="tp-panel-scroll flex-1 overflow-y-auto tp-scroll">
              <div className="tp-workflow-page" style={mode !== "generate" ? { display: "none" } : undefined}>
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
                  multiviewOriginalTaskId={selectedMultiviewImageTaskId}
                  multiImages={multiImages} setMultiImages={setMultiImages}
                  canGen={canGen}
                  getIdToken={getIdToken}
                  handleMultiImg={handleMultiImg}
                  handleBatchImg={handleBatchImg}
                  color={modeMeta.accent} isRunning={isRunning} handleGen={handleGen}
                  setErrorMsg={setErrorMsg} activeStyles={activeStyle}
                  onStyleToggle={handleStyleToggle}
                  aiSuggestedNeg={aiSuggestedNeg} setAiSuggestedNeg={setAiSuggestedNeg}
                />
              </div>
              <div className="tp-workflow-page" style={mode !== "views" ? { display: "none" } : undefined}>
                <MultiviewImagesPanel
                  mode={multiviewImageMode}
                  setMode={setMultiviewImageMode}
                  prompt={prompt}
                  setPrompt={setPrompt}
                  referenceImage={imageReference}
                  setReferenceImage={setImageReference}
                  uploadReferenceImage={handleBatchImg}
                  generationModel={generationModel}
                  setGenerationModel={setGenerationModel}
                  generationTemplateId={generationTemplateId}
                  setGenerationTemplateId={setGenerationTemplateId}
                  generationOrientation={generationOrientation}
                  setGenerationOrientation={setGenerationOrientation}
                  generationCompress={generationCompress}
                  setGenerationCompress={setGenerationCompress}
                  generationRenderImage={generationRenderImage}
                  setGenerationRenderImage={setGenerationRenderImage}
                  generationTextureAlignment={generationTextureAlignment}
                  setGenerationTextureAlignment={setGenerationTextureAlignment}
                  sourceImage={multiviewReference}
                  setSourceImage={setMultiviewReference}
                  uploadImage={handleMultiImg}
                  hasSelectedTask={Boolean(selectedMultiviewImageTaskId)}
                  editPrompt={multiviewEditPrompt}
                  setEditPrompt={setMultiviewEditPrompt}
                  editView={multiviewEditView}
                  setEditView={setMultiviewEditView}
                />
              </div>
              <div className="tp-workflow-page" style={mode !== "segment" ? { display: "none" } : undefined}>
                <Segment
                  segSub={segSub}
                  activeTaskId={activeTaskId}
                  isRiggedInput={isRiggedInput}
                  isSegmentOutput={isSegOutput}
                  isGeneratedInParts={isGeneratedInParts}
                  isFillPartsCompatible={isFillPartsCompatible}
                  color={modeMeta.accent}
                />
              </div>
              <div className="tp-workflow-page" style={mode !== "retopo" ? { display: "none" } : undefined}>
                <Retopo quad={quadMesh} setQuad={setQuadMesh} smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly} polycount={polycount} setPolycount={setPolycount} outFormat={outFormat} setOutFormat={setOutFormat} pivotToBottom={pivotToBottom} setPivotToBottom={setPivotToBottom} activeTaskId={activeTaskId} color={modeMeta.accent} />
              </div>
              <div className="tp-workflow-page" style={mode !== "texture" ? { display: "none" } : undefined}>
                <Texture
                  mode={texSub === "paint" ? "texture_edit" : "texture"}
                  activeTaskId={texSub === "paint" ? (textureEditSourceTaskId || textureEditTaskId || activeTaskId) : (textureSelectedTaskId || activeTaskId)}
                  activeModelName={texSub === "paint" ? (textureEditSourceDisplayName || textureEditDisplayName) : textureTargetDisplayName}
                  textureTargetTaskId={textureSelectedTaskId || activeTaskId}
                  textureTargetName={textureTargetDisplayName}
                  pbrTargetTaskId={textureSourceTaskId || textureSelectedTaskId || activeTaskId}
                  pbrTargetName={textureSourceDisplayName}
                  pbrTargetResolved={pbrSourceResolvedFromUpstream}
                  onUseOriginalModel={() => handleUseOriginalModel(textureSourceTaskId)}
                  getIdToken={getIdToken}
                  texInputTab={texInputTab} setTexInputTab={setTexInputTab}
                  texPrompt={texPrompt} setTexPrompt={setTexPrompt}
                  imgPrev={imgPrev} imgToken={imgToken} imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef}
                  multiImages={multiImages} setMultiImages={setMultiImages}
                  uploadTextureImage={uploadImageStsFile}
                  textureModelVer={textureModelVer} setTextureModelVer={setTextureModelVer}
                  tex4K={tex4K} setTex4K={setTex4K}
                  pbrOn={texPbr} setPbrOn={setTexPbr} pbrAvailable={textureSourceHasTexture}
                  texAlignment={texAlignment} setTexAlignment={setTexAlignment}
                  brushMode={brushMode} setBrushMode={setBrushMode}
                  brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt}
                  creativity={creativity} setCreativity={setCreativity}
                  brushColor={brushColor} setBrushColor={setBrushColor}
                  brushSize={brushSize} setBrushSize={setBrushSize}
                  brushOpacity={brushOpacity} setBrushOpacity={setBrushOpacity}
                  uvOverlapWarning={paintUvOverlapWarning}
                  canvasRef={canvasRef}
                  color={modeMeta.accent}
                  onClearPaint={() => sceneRef.current?.clearPaint()}
                  paintModeDisabled={TRIPO_PAINT_MODE_DISABLED}
                  paintModeDisabledMessage={TRIPO_PAINT_MODE_DISABLED_MESSAGE}
                />
              </div>
              <div className="tp-workflow-page" style={mode !== "animate" ? { display: "none" } : undefined}>
                <Animate animId={animId} activeTaskId={activeTaskId} animSearch={animSearch} setAnimSearch={setAnimSearch} animCat={animCat} setAnimCat={setAnimCat} selAnim={selAnim} setSelAnim={setSelAnim} animModelVer={animModelVer} setAnimModelVer={setAnimModelVer} filtAnims={filtAnims} rigStep={rigStep} rigBtnLocked={rigBtnLocked} handleAutoRig={handleAutoRig} rigType={rigType} setRigType={setRigType} rigSpec={rigSpec} setRigSpec={setRigSpec} detectedRigType={detectedRigType} detectedRigModelVer={detectedRigModelVer} detectedRigSpec={detectedRigSpec} rigCompat={rigCompat} animOutFormat={animOutFormat} setAnimOutFormat={setAnimOutFormat} animBakeAnimation={animBakeAnimation} setAnimBakeAnimation={setAnimBakeAnimation} animExportGeometry={animExportGeometry} setAnimExportGeometry={setAnimExportGeometry} animAnimateInPlace={animAnimateInPlace} setAnimAnimateInPlace={setAnimAnimateInPlace} color={modeMeta.accent} />
              </div>
              {mode === "refine" && (
                <div className="tp-workflow-page">
                  {activeTaskId && (
                    <div className="p-3 rounded-xl bg-white/[0.055] border border-sky-400/25 shadow-[0_0_24px_rgba(47,140,255,0.08)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Box className="w-3.5 h-3.5 text-sky-200" />
                        <span className="text-sky-100 font-black uppercase tracking-wider text-[10px]">Active Mesh for Refinement</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-white/90 text-[11px] font-bold truncate max-w-[200px]">{activeDisplayName || "Untitled Model"}</p>
                        <p className="text-[#2d2d48] text-[9px] font-mono">{activeTaskId.slice(0, 8)}...</p>
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-zinc-400 font-black uppercase tracking-wider text-[10px]">Refinement Guide</span>
                    </div>
                    <p className="text-zinc-500 text-[11px] leading-relaxed italic">
                      Tripo Refine uses high-fidelity geometry reconstruction to fix mesh artifacts, sharpen edges, and optimize topology.
                    </p>
                  </div>

                  {refineBlockedBySelectedSource ? (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400 font-black uppercase tracking-wider text-[10px]">Incompatibility Detected</span>
                      </div>
                      <p className="text-red-300/70 text-[10px] leading-relaxed">
                        {effectiveRefineDisableReason || "Refine only works on compatible draft sources."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-3.5 h-3.5 text-sky-200" />
                            <span className="text-sky-100 font-black uppercase tracking-wider text-[10px]">Schema Match</span>
                          </div>
                          <p className="text-zinc-500 text-[10px] leading-relaxed m-0">
                            Refine sends only <span className="font-mono text-zinc-300">type: refine_model</span> and <span className="font-mono text-zinc-300">draft_model_task_id</span>. Prompt and negative prompt are not part of the Tripo refine schema.
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-zinc-500 font-black uppercase tracking-widest text-[9px]">Resolved Draft Source</span>
                            {refineResolvedFromUpstream && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-sky-100 bg-sky-400/10 border border-sky-300/20 rounded-full px-2 py-1">Upstream</span>
                            )}
                          </div>
                          <p className="text-white/85 text-[11px] font-bold truncate m-0">{refineDraftDisplayName || refineSourceDisplayName || "Selected model"}</p>
                          <p className="text-[#5b5b78] text-[9px] font-mono truncate mt-1 mb-0">{refineSourceTaskId || "No draft task selected"}</p>
                          {refineResolvedFromUpstream && (
                            <p className="text-zinc-500 text-[10px] leading-relaxed mt-2 mb-0">
                              The selected textured/post-process result is being refined through its original draft task.
                            </p>
                          )}
                          {refineResolvedFromUpstream && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleUseOriginalModel(refineSourceTaskId)}
                              className="mt-3 w-full h-8 rounded-lg border border-sky-300/25 bg-white/[0.055] text-sky-50 text-[9px] font-black uppercase tracking-widest shadow-[0_0_18px_rgba(47,140,255,0.08)]"
                            >
                              Use original model
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-2">
                    <label className="text-zinc-600 font-bold text-[9px] block mb-2 px-1">MANUAL TASK OVERRIDE (OPTIONAL)</label>
                    <input
                      className="tp-input"
                      placeholder="Paste a draft task ID here..."
                      value={refineId}
                      onChange={e => {
                        const nextValue = e.target.value;
                        setRefineId(nextValue);
                        setRefineManualOverride(!!nextValue.trim());
                      }}
                      style={{ height: 32, fontSize: 10, background: "rgba(0,0,0,0.2)" }}
                    />
                  </div>
                </div>
              )}
              {mode === "stylize" && (
                <div className="tp-workflow-page">
                  {activeTaskId && (
                    <div className="p-2 px-3 rounded-lg bg-white/[0.055] border border-sky-300/20 mb-4">
                      <p className="text-sky-100 font-bold text-[11px] m-0">Selected model</p>
                      <p className="text-[#2d2d48] text-[9px] mt-1 font-mono truncate">{activeTaskId}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3 p-1.5 px-2 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-sky-100 italic">
                    task: "stylize_model"
                  </div>
                  <div className="mb-4">
                    <span className="text-zinc-500 text-[11px] font-black uppercase tracking-widest block mb-2 italic">Style Filter</span>
                    <div className="grid grid-cols-2 gap-2">
                      {["lego", "voxel", "voronoi", "minecraft"].map(s => (
                        <button
                          key={s}
                          onClick={() => setStylizeStyle(s)}
                          className={`p-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${stylizeStyle === s ? 'bg-white/[0.075] text-white border border-sky-300/30 shadow-[0_0_18px_rgba(47,140,255,0.10)]' : 'bg-white/5 text-zinc-600 border border-white/5'}`}
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
            <div className="tp-action-dock tp-generation-dock" style={{ padding: "6px 10px 10px", flexShrink: 0 }}>
              <div className="tp-action-card tp-generation-card" style={{
                position: "relative",
                borderRadius: 12,
                background: "linear-gradient(160deg,rgba(255,255,255,0.075),rgba(255,255,255,0.030))",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
                borderLeft: "1px solid rgba(47,140,255,0.34)",
                boxShadow: "0 18px 42px rgba(0,0,0,0.26), 0 0 34px rgba(47,140,255,0.11)",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 140, height: 70, background: "radial-gradient(ellipse at 0% 0%, rgba(47,140,255,0.16) 0%, transparent 70%)", pointerEvents: "none" }} />

                {/* Model name row */}
                <div style={{ padding: "10px 12px 0", position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(139,220,255,0.88)", textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: "'JetBrains Mono', monospace" }}>ASSET NAME</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  </div>
                  <input
                    className="tp-input tp-asset-name-input"
                    placeholder={prompt ? prompt.trim().split(/\s+/).slice(0, 2).join(" ") || "Model neve…" : "Model neve…"}
                    value={modelName}
                    onChange={e => setModelName(e.target.value)}
                    style={{ width: "100%", fontSize: 11, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#f8fafc", letterSpacing: "0.04em" }}
                  />
                </div>

                {/* Generate / Running area */}
                <div style={{ padding: "8px 12px 10px", position: "relative", zIndex: 1 }}>
                  {pendingCountdown !== null ? (
                    <div className="fade-up">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                          <Loader2 style={{ width: 11, height: 11, color: "#2f8cff", flexShrink: 0 }} className="anim-spin" />
                          <span style={{ fontSize: 11, fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace" }}>Feldolgozás</span>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#8bdcff", textTransform: "uppercase", letterSpacing: "0.1em",
                          background: "rgba(47,140,255,0.11)", border: "1px solid rgba(47,140,255,0.30)",
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
                          <Loader2 style={{ width: 11, height: 11, color: "#2f8cff", flexShrink: 0 }} className="anim-spin" />
                          <span style={{ fontSize: 11, fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace" }}>{genLabel}</span>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: "#8bdcff", textTransform: "uppercase", letterSpacing: "0.1em",
                          background: "rgba(47,140,255,0.11)", border: "1px solid rgba(47,140,255,0.30)",
                          borderRadius: 20, padding: "2px 8px", fontFamily: "'JetBrains Mono', monospace",
                        }}>FELDOLGOZÁS</span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ position: "relative", height: 3, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 6 }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, height: "100%",
                          width: `${progress}%`,
                          background: "linear-gradient(90deg, #1d4ed8, #2f8cff, #8bdcff)",
                          borderRadius: 3,
                          boxShadow: "0 0 14px rgba(47,140,255,0.42)",
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                      {/* Sub row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace" }}>TRIPO</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#8bdcff", fontFamily: "'JetBrains Mono', monospace" }}>{progress}%</span>
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
                      {errorMsg && (
                        <div style={{
                          marginBottom: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid rgba(239,68,68,0.24)",
                          background: "rgba(239,68,68,0.08)",
                          color: "#fca5a5",
                          fontSize: 10,
                          fontWeight: 800,
                          lineHeight: 1.45,
                        }}>
                          {errorMsg}
                        </div>
                      )}
                      <button
                        className={"tp-gen-btn" + (canGen ? " go" : " no")}
                        onClick={handleGen}
                        disabled={!canGen}
                        style={{ height: 48, borderRadius: 10, width: "100%", fontSize: 12, letterSpacing: "0.12em" }}
                        title={
                          activeTasksRunningCount >= PARALLEL_LIMIT
                            ? `Maximum párhuzamos taskok elérve (${PARALLEL_LIMIT}/${PARALLEL_LIMIT})`
                            : (operationDisabledReason || undefined)
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
                          className="tp-export-btn"
                          onClick={() => { setDlItem(null); setDlOpen(true); }}
                          style={{
                            width: "100%", marginTop: 6, padding: "7px 0", borderRadius: 8,
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                            color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 700,
                            letterSpacing: "0.16em", textTransform: "uppercase", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#f8fafc"; e.currentTarget.style.borderColor = "rgba(47,140,255,0.34)"; e.currentTarget.style.background = "rgba(47,140,255,0.10)"; }}
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
            activeItemId={selHistId}
            loadingId={loadingId}
            refreshTrigger={refreshTrigger}
            optimisticItems={optimisticItems}
            firestoreCollection="tripo_history"
            onSelect={selHist}
            onReuse={reuse}
            onHistoryLoad={onHistoryLoad}
            onDownload={async (i) => {
              if (isImageHistoryItem(i)) {
                try {
            await downloadImageHistoryZip(i, i.name || i.prompt || `tripo_images_${i.taskId || Date.now()}`);
                } catch (e) {
                  alert(e.message);
                }
                return;
              }
              try { const b = await fetchProxy(i.model_url, i.taskId); setDlItem({ blobUrl: b, item: i }); setDlOpen(true); }
              catch (e) { alert(e.message); }
            }}
          />
        </div>
      }
    >
      <TripoWorkspaceWrapper
        color={modeMeta.accent}
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
        viewerH={viewerH}
        selectedItem={selectedPreviewItem}
        selectedPreviewColor={selectedPreviewColor}
        getIdToken={getIdToken}
        onRigDetected={onRigDetected}
        onAnimClipsDetected={handleAnimClipsDetected}
        animClips={animClips}
        activeClipIdx={activeClipIdx}
        onSwitchClip={handleSwitchClip}
        // 3D Paint
        paintMode={!TRIPO_PAINT_MODE_DISABLED && mode === "texture" && texSub === "paint" && brushMode === "Paint Mode"}
        onTextureAvailabilityChange={setViewerTextureReady}
        onUvOverlapChange={setViewerUvOverlap}
        paintColor={brushColor}
        paintSize={brushSize}
        paintOpacity={brushOpacity}
        paintHardness={brushHardness}
        paintCanvasRef={canvasRef}
        segmentProcessing={segmentProcessing}
        setSegmentProcessing={setSegmentProcessing}
        segmentHighlight={segmentHighlight}
        setSegmentHighlight={setSegmentHighlight}
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
  dlItem, setDlItem, setDlOpen, dlOpen, handleDlClose, activeH, viewerH, selectedItem, selectedPreviewColor, getIdToken,
  onRigDetected,
  onAnimClipsDetected,
  animClips, activeClipIdx, onSwitchClip,
  // 3D Paint
  paintMode, paintColor, paintSize, paintOpacity, paintHardness, paintCanvasRef,
  segmentProcessing, setSegmentProcessing,
  segmentHighlight, setSegmentHighlight
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
                className={`px-2 sm:px-3 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === v.id ? 'bg-white/[0.075] text-white border border-sky-300/30 shadow-[0_0_20px_rgba(47,140,255,0.12)]' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {v.label}
              </button>
            </Tooltip>
          ))}
          <div className="w-px h-5 bg-white/5 mx-0.5 sm:mx-1 hidden sm:block" />
          <IconBtn
            icon={<Scissors className="w-4 h-4" />}
            tip="Segment View (Glass + Poly Wire)"
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
              onSegmentProcessing={setSegmentProcessing}
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
              segmentEdgeColor={0x2f8cff}
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
          {(loadingId && !isRunning && !modelUrl) && (
            <motion.div
              initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black backdrop-blur-2xl"
            >
              <Loader2 className="w-8 h-8 text-sky-300 anim-spin mb-4" />
              <p className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">Fetching Spatial Voxel Map</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {segmentProcessing && modelUrl && (segmentHighlight || viewMode === "segment") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-[#05050c]/55 backdrop-blur-xl"
            >
              <div className="glass-panel flex flex-col items-center gap-4 rounded-[1.25rem] border border-white/10 bg-[#0f0f17]/70 px-8 py-7 shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-sky-300/25 bg-white/[0.065] shadow-[0_0_28px_rgba(47,140,255,0.16)]">
                  <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.35em] italic text-white">Segment View</p>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.28em] text-zinc-400">Building glass overlay and polygon wire cache</p>
                </div>
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
              <h3 className="text-sky-200 font-black text-[22px] tracking-[0.4em] uppercase italic mb-2">Awaiting Directive</h3>
              <p className="text-zinc-900/40 text-[9px] font-black uppercase tracking-[0.5em] italic">Inhabit the viewport via spatial forge</p>
            </div>
          </div>
        )}

        {/* Animation clip picker — visible when GLB has 2+ clips */}
        {animClips.length > 1 && modelUrl && !isRunning && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 shadow-2xl">
            <Play className="w-3.5 h-3.5 text-sky-300 mr-1 flex-shrink-0" />
            {animClips.map((clip, i) => (
              <button
                key={i}
                onClick={() => onSwitchClip(i)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeClipIdx === i
                  ? 'bg-white/[0.075] text-sky-50 border border-sky-300/30 shadow-[0_0_20px_rgba(47,140,255,0.12)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
              >
                {clip.name || `Clip ${i + 1}`}
              </button>
            ))}
            <span className="text-[9px] text-zinc-600 font-bold ml-1 tracking-wider">{animClips[activeClipIdx]?.duration?.toFixed(1)}s</span>
          </div>
        )}

        {selectedItem && (
          <SelectedHistoryPreview item={selectedItem} color={selectedPreviewColor || color} viewerItemId={viewerH?.id} selectedItemId={activeH?.id} getIdToken={getIdToken} />
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
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${autoSpin ? 'bg-white/[0.075] text-white border border-sky-300/30 shadow-[0_0_20px_rgba(47,140,255,0.12)]' : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'}`}
          >
            {autoSpin ? <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
            <span className="hidden sm:inline">{autoSpin ? "Spin Active" : "Start Spinner"}</span>
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {modelUrl && (
            <button
              onClick={() => { setDlItem(null); setDlOpen(true); }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl bg-white/[0.075] border border-sky-300/30 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(47,140,255,0.12)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Production Export</span><span className="sm:hidden">Export</span>
            </button>
          )}
        </div>
      </motion.div>

      <DownloadModal isOpen={dlOpen} onClose={handleDlClose} glbBlobUrl={dlItem ? dlItem.blobUrl : modelUrl} scene={sceneRef.current?.scene ?? sceneRef.current} filename={dlItem ? (dlItem.item?.prompt?.slice(0, 30) ?? ("tripo_" + Date.now())) : ((viewerH?.prompt || activeH?.prompt)?.slice(0, 30) ?? ("tripo_" + Date.now()))} color={color} />

      {/* ── FOOTER: Spatial Logic Stream ── */}
      {activeH && !isRunning && (
        <div className="h-10 bg-[#0a0a0f] border-t border-white/5 px-4 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-400/5 via-transparent to-transparent opacity-50" />
          <div className="relative z-10 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 italic flex items-center gap-2">
            <div className="w-2 h-0.5 bg-sky-300/30" />
            <span className="hidden sm:inline">Spatial Logic Stream v2.4.0</span>
            <span className="sm:hidden">SLS v2.4</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-8 relative z-10">
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
              <span className="hidden sm:inline">Neural Precision:</span><span className="sm:hidden">NP:</span> <span className="text-sky-300/70">Optimized</span>
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

function SelectedHistoryPreview({ item, color, viewerItemId, selectedItemId, getIdToken }) {
  const thumbnailCacheKey = getHistoryThumbnailCacheKey(item);
  const previewImageUrl = getModelPreviewImageUrl(item);
  const [blockedPreviewUrl, setBlockedPreviewUrl] = useState(null);
  const usablePreviewImageUrl = previewImageUrl && previewImageUrl !== blockedPreviewUrl
    ? previewImageUrl
    : null;
  const [thumbnail, setThumbnail] = useState(() =>
    usablePreviewImageUrl
    || item?.thumbnail
    || item?.thumbnail_url
    || checkThumbnailCache(thumbnailCacheKey)
    || checkThumbnailCache(item?.model_url)
    || null
  );

  useEffect(() => {
    setBlockedPreviewUrl(null);
  }, [item?.id]);

  useEffect(() => {
    if (!item?.model_url) {
      setThumbnail(usablePreviewImageUrl || item?.thumbnail || item?.thumbnail_url || null);
      return;
    }
    const cached =
      usablePreviewImageUrl
      || item?.thumbnail
      || item?.thumbnail_url
      || checkThumbnailCache(thumbnailCacheKey)
      || checkThumbnailCache(item.model_url)
      || null;
    setThumbnail(cached);
    if (cached) return undefined;

    let cancelled = false;
    (async () => {
      const data = await fetchModelData(item.model_url, getIdToken, item.taskId);
      if (cancelled || !data?.buffer) return;
      try {
        const thumb = await getCachedThumbnail(
          data.buffer,
          { width: 280, height: 280, resourcePath: item.model_url },
          thumbnailCacheKey || item.model_url
        );
        if (!cancelled) setThumbnail(thumb || null);
      } finally {
        if (data.blobUrl) URL.revokeObjectURL(data.blobUrl);
      }
    })().catch((err) => {
      if (!cancelled) console.warn("[SelectedHistoryPreview] thumbnail load failed:", err?.message || err);
    });

    return () => { cancelled = true; };
  }, [getIdToken, item?.id, item?.model_url, item?.taskId, item?.thumbnail, item?.thumbnail_url, usablePreviewImageUrl, thumbnailCacheKey]);

  if (!item) return null;

  const displayName = item?.displayName || item?.name || item?.prompt || item?.mode || "Selected";
  const modeLabel = (item?.mode || item?.params?.mode || "model").replace(/_/g, " ");
  const isMirroringViewer = viewerItemId === item.id;
  const isSelected = selectedItemId === item.id;
  const aura = `${color}85`;
  const border = `${color}aa`;
  const panelBg = `${color}1a`;
  const statusColor = isSelected ? color : (isMirroringViewer ? "#2f8cff" : color);
  const statusLabel = isSelected ? "selected" : (isMirroringViewer ? "viewer loaded" : "preview");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className="pointer-events-none absolute bottom-4 right-4 z-[70] aspect-square w-32 overflow-hidden rounded-[1.25rem] border bg-[#07070f]/90 backdrop-blur-xl sm:w-36"
      style={{
        borderColor: border,
        boxShadow: `0 16px 38px rgba(0,0,0,0.5), 0 0 30px ${aura}`,
      }}
    >
      <div className="absolute inset-0 overflow-hidden" style={{ background: `radial-gradient(circle at 50% -5%, ${panelBg}, transparent 60%), #04040b` }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={displayName}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            onError={() => {
              if (thumbnail && thumbnail === previewImageUrl) {
                setBlockedPreviewUrl(thumbnail);
                setThumbnail(null);
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Box className="h-8 w-8 text-white/30" />
          </div>
        )}

        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0.72) 100%)" }}
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 py-2">
          <span
            className="rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-[0.14em] text-white"
            style={{ background: `${color}33`, border: `1px solid ${color}66` }}
          >
            Selected
          </span>
          <span
            className="rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-[0.14em] text-white/90"
            style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${color}4d` }}
          >
            {modeLabel}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5">
          <div className="truncate text-[10px] font-black tracking-[0.01em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
            {displayName}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.12em]" style={{ color: `${statusColor}db` }}>
            <span
              className="inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
            />
            {statusLabel}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
