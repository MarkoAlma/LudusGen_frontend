// Meshy v6 Workspace — Editorial Brutalist Cinematic Desktop
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Upload,
  RotateCcw,
  Download,
  Layers,
  Box,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Sparkles,
  Move3d,
  Clock,
  Wand2,
  Camera,
  Play,
  Square,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  PersonStanding,
  Settings,
  Paintbrush2,
  Type,
} from "lucide-react";

// ── Sub-modules ────────────────────────────────────────────────────────────
import ThreeViewer from "./viewer/ThreeViewer";
import LightingControls from "./viewer/LightingControls";
import { setCameraPreset } from "./viewer/threeHelpers";
import DownloadModal from "./modals/DownloadModal";
import EditTextureModal from "./modals/EditTextureModal";
import RemeshModal from "./modals/RemeshModal";
import AnimateModal from "./modals/AnimateModal";
import { Tooltip, IconBtn } from "./ui/Primitives";
import {
  Toggle,
  SegControl,
  Select,
  MeshyRow,
  NumStepper,
  Collapsible,
  HistoryCard,
} from "./ui/Controls";

// ── Constants ──────────────────────────────────────────────────────────────
const PROMPT_MAX = 600;
const LS_KEY = "meshy_panel_history_v1";
const POLL_MS = 2500;
const API_BASE = "/api/meshy";

// ── localStorage helpers ───────────────────────────────────────────────────
const loadHistory = () => {
  try {
    const r = localStorage.getItem(LS_KEY);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
};
const saveHistory = (h) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(h.slice(0, 40)));
  } catch {}
};
const fileToDataURI = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
const fmtDate = (d) =>
  new Date(d).toLocaleString("hu-HU", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── Default generation params ───────────────────────────────────────────────
const defaultParams = () => ({
  ai_model: "latest",
  model_type: "standard",
  topology: "triangle",
  target_polycount: 100000,
  should_remesh: false,
  symmetry_mode: "auto",
  pose_mode: "",
  multiview: false,
  should_texture: true,
  num_generations: 1,
  enable_pbr: true,
  texture_prompt: "",
  license: "cc",
});

// ── UV layer config (used by EditTextureModal) ──────────────────────────────
const UV_LAYER_LABELS = {
  base_color: "Base Color",
  roughness: "Roughness",
  metallic: "Metallic",
  normal: "Normal",
  emissive: "Emissive",
};

// ── View mode definitions ───────────────────────────────────────────────────
//   id       → passed to ThreeViewer / applyViewMode
//   label    → shown in toolbar button
//   tip      → tooltip text
const VIEW_MODES = [
  { id: "clay", label: "Clay", tip: "Clay — semleges szürke agyag" },
  { id: "uv", label: "Base Color", tip: "Base Color — textúra árnyék nélkül" },
  { id: "normal", label: "RGB", tip: "RGB — textúra árnyékkal" },
];

// ══════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ══════════════════════════════════════════════════════════════════════════
const BG_OPTIONS = [
  {
    id: "default",
    label: "STATION",
    tip: "Default Workstation (Checker)",
    render: () => (
      <div
        className="w-3.5 h-3.5 rounded-md border border-white/10"
        style={{
          background:
            "linear-gradient(45deg,#0a0a0f 25%,#18181b 25%,#18181b 50%,#0a0a0f 50%,#0a0a0f 75%,#18181b 75%)",
          backgroundSize: "4px 4px",
        }}
      />
    ),
  },
  {
    id: "black",
    label: "VOID",
    tip: "Absolute Zero Black",
    render: () => (
      <div className="w-3.5 h-3.5 rounded-md bg-black border border-white/5" />
    ),
  },
  {
    id: "darkgray",
    label: "ZINC",
    tip: "Matte Zinc Gray",
    render: () => (
      <div className="w-3.5 h-3.5 rounded-md bg-[#18181b] border border-white/10" />
    ),
  },
  {
    id: "white",
    label: "LAB",
    tip: "Sterile White Laboratory",
    render: () => (
      <div className="w-3.5 h-3.5 rounded-md bg-white border border-white/20" />
    ),
  },
];

function BgColorPicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const h = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = BG_OPTIONS.find((o) => o.id === value) ?? BG_OPTIONS[0];

  return (
    <div className="relative inline-flex" ref={ref}>
      <Tooltip text="Háttér szín" side="bottom">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-600 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer"
        >
          {current.render()}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </Tooltip>

      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 z-[1000] w-40 rounded-2xl bg-[#0a0a0f] border border-white/10 shadow-[0_24_64px_rgba(0,0,0,0.8)] p-1 flex flex-col gap-0.5">
          {BG_OPTIONS.map((opt) => {
            const isActive = value === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-none text-left w-full transition-all ${
                  isActive ? 'bg-white/5 text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
                }`}
              >
                {opt.render()}
                {opt.label}
                {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WireframeControl({
  active,
  onToggle,
  opacity,
  onOpacityChange,
  color,
  onColorChange,
  accentColor,
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const h = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pct = ((opacity - 0.05) / (1 - 0.05)) * 100;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
      }}
      ref={ref}
    >
      <Tooltip
        text={
          active ? "Wire overlay kikapcsolása" : "Wire overlay bekapcsolása"
        }
        side="bottom"
      >
        <button
          onClick={onToggle}
          style={{
            padding: "3px 8px",
            borderRadius: open ? "7px 0 0 7px" : 7,
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            transition: "all 0.15s",
            background: active ? `${accentColor}28` : "rgba(255,255,255,0.04)",
            color: active ? accentColor : "#6b7280",
            outline: active
              ? `1px solid ${accentColor}50`
              : "1px solid rgba(255,255,255,0.06)",
            borderRight: open ? "none" : undefined,
          }}
        >
          Wire
        </button>
      </Tooltip>

      <Tooltip text="Wire beállítások" side="bottom">
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: "3px 5px",
            borderRadius: open ? "0 7px 7px 0" : 7,
            fontSize: 9,
            cursor: "pointer",
            border: "none",
            transition: "all 0.15s",
            background: open ? `${accentColor}28` : "rgba(255,255,255,0.04)",
            color: open ? accentColor : "#6b7280",
            outline: open
              ? `1px solid ${accentColor}50`
              : "1px solid rgba(255,255,255,0.06)",
            borderLeft: open ? `1px solid ${accentColor}30` : undefined,
            marginLeft: 1,
          }}
        >
          ▾
        </button>
      </Tooltip>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 999,
            width: 200,
            borderRadius: 12,
            background: "#0f0f23",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            padding: 12,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -6,
              left: 14,
              width: 12,
              height: 12,
              background: "#0f0f23",
              border: "1px solid rgba(255,255,255,0.12)",
              borderBottom: "none",
              borderRight: "none",
              transform: "rotate(45deg)",
            }}
          />

          <p
            style={{
              color: "#e5e7eb",
              fontSize: 11,
              fontWeight: 800,
              margin: "0 0 10px",
            }}
          >
            Wire overlay
          </p>

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  color: "#9ca3af",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Átlátszóság
              </span>
              <span
                style={{ color: accentColor, fontSize: 11, fontWeight: 800 }}
              >
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <div
              style={{
                position: "relative",
                height: 5,
                borderRadius: 3,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  borderRadius: 3,
                  background: `linear-gradient(90deg,${accentColor},#8b5cf6)`,
                  width: `${pct}%`,
                  pointerEvents: "none",
                }}
              />
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={opacity}
                onChange={(e) => onOpacityChange(Number(e.target.value))}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                  margin: 0,
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                color: "#9ca3af",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Szín
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {["#ffffff", "#84cc16", "#60a5fa", "#f87171"].map((c) => (
                <button
                  key={c}
                  onClick={() => onColorChange(c)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "none",
                    background: c,
                    cursor: "pointer",
                    outline:
                      color === c
                        ? `2px solid ${accentColor}`
                        : "2px solid transparent",
                    outlineOffset: 1,
                  }}
                />
              ))}
              <label
                style={{
                  cursor: "pointer",
                  position: "relative",
                  width: 16,
                  height: 16,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "1.5px dashed #4b5563",
                    background: color,
                    cursor: "pointer",
                  }}
                />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColorChange(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                    width: "100%",
                    height: "100%",
                  }}
                />
              </label>
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "#6b7280", fontSize: 10 }}>Wire overlay</span>
            <button
              onClick={onToggle}
              style={{
                position: "relative",
                width: 32,
                height: 18,
                borderRadius: 9,
                flexShrink: 0,
                cursor: "pointer",
                border: "none",
                background: active ? accentColor : "rgba(255,255,255,0.1)",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  left: active ? 16 : 2,
                }}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Trellis2Panel({ selectedModel, getIdToken }) {
  const color = selectedModel?.color || "#06b6d4";

  // ── Input & generation state ─────────────────────────────────────────────
  const [inputMode, setInputMode] = useState("text");
  const [prompt, setPrompt] = useState("");
  const [modelName, setModelName] = useState("");
  const [params, setParams] = useState(defaultParams);
  const [poseEnabled, setPoseEnabled] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [taskId, setTaskId] = useState(null);
  const [taskType, setTaskType] = useState("text-to-3d");
  const [genStatus, setGenStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [modelUrl, setModelUrl] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [previewTaskId, setPreviewTaskId] = useState(null);
  const [refining, setRefining] = useState(false);
  const [wireframeOverlay, setWireframeOverlay] = useState(false);
  const [wireOpacity, setWireOpacity] = useState(0.22);
  const [wireColor, setWireColor] = useState("#ffffff");
  const wireHexColor = parseInt(wireColor.replace("#", ""), 16);

  // ── Viewer state ─────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState("clay");
  const [lightMode, setLightMode] = useState("studio");
  const [showGrid, setShowGrid] = useState(true);
  const [autoSpin, setAutoSpin] = useState(true);
  const [uvLayer, setUvLayer] = useState("base_color");
  const [bgColor, setBgColor] = useState("default");

  // ── Lighting advanced state ───────────────────────────────────────────────
  const [lightStrength, setLightStrength] = useState(1.0);
  const [lightRotation, setLightRotation] = useState(0);
  const [lightAutoRotate, setLightAutoRotate] = useState(false);
  const [lightAutoRotateSpeed, setLightAutoRotateSpeed] = useState(0.5);
  const [dramaticColor, setDramaticColor] = useState("#4400ff");

  // ── UI state ─────────────────────────────────────────────────────────────
  const [rightOpen, setRightOpen] = useState(true);
  const [showDownload, setShowDownload] = useState(false);
  const [showEditTexture, setShowEditTexture] = useState(false);
  const [showRemesh, setShowRemesh] = useState(false);
  const [showAnimate, setShowAnimate] = useState(false);

  // ── History ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState(() => loadHistory());
  const [activeItem, setActiveItem] = useState(() => loadHistory()[0] ?? null);
  const [histSearch, setHistSearch] = useState("");
  const [bgLightOn, setBgLightOn] = useState(true);
  const [bgLightColor, setBgLightColor] = useState("#ffffff");
  const [bgLightSize, setBgLightSize] = useState(4);
  const [bgLightIntensity, setBgLightIntensity] = useState(0.1);
  const [gridColor1, setGridColor1] = useState("#1e1e3a");
  const [gridColor2, setGridColor2] = useState("#111128");

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const sceneRef = useRef(null);
  const pollTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const modelFileInputRef = useRef(null);

  const setParam = useCallback(
    (k, v) => setParams((p) => ({ ...p, [k]: v })),
    [],
  );

  const handleImageFile = useCallback((file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      handleImageFile(e.dataTransfer?.files[0] ?? e.target?.files?.[0]);
    },
    [handleImageFile],
  );

  const handleUpload3DModel = useCallback((file) => {
    if (!file) return;
    const validFormats = [
      "model/gltf-binary",
      "model/gltf+json",
      "application/octet-stream",
      "text/plain",
    ];
    const validExtensions = [".glb", ".gltf", ".obj"];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    const hasValidType = validFormats.includes(file.type) || hasValidExt;

    if (!hasValidType) {
      setErrorMsg("Csak GLB, GLTF vagy OBJ formátum támogatott!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataUrl = e.target?.result;
        setModelUrl(dataUrl);
        setErrorMsg("");
        const item = {
          id: `m_uploaded_${Date.now()}`,
          task_id: null,
          task_type: "uploaded",
          prompt: file.name,
          status: "succeeded",
          thumbnail: null,
          model_urls: { glb: dataUrl },
          ts: Date.now(),
        };
        setHistory((h) => [item, ...h]);
        setActiveItem(item);
      } catch (err) {
        setErrorMsg("Hiba a fájl olvasásakor: " + err.message);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Nem sikerült a fájlt olvasni!");
    };
    reader.readAsDataURL(file);
  }, []);

  const authHeaders = useCallback(async () => {
    const token = getIdToken ? await getIdToken() : "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, [getIdToken]);

  const startPolling = useCallback(
    (id, type) => {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        try {
          const headers = await authHeaders();
          const res = await fetch(`${API_BASE}/task/${type}/${id}`, {
            headers,
          });
          const data = await res.json();
          if (!data.success) return;
          setProgress(data.progress ?? 0);
          setGenStatus(data.status?.toLowerCase() ?? "pending");
          if (data.status === "SUCCEEDED") {
            clearInterval(pollTimerRef.current);
            setProgress(100);
            const glbUrl = data.model_urls?.glb ?? data.model_urls?.obj ?? null;
            setModelUrl(glbUrl);
            setThumbnail(data.thumbnail_url ?? null);
            setPreviewTaskId(id);
            const item = {
              id: `m_${id}`,
              task_id: id,
              task_type: type,
              prompt:
                inputMode === "text"
                  ? prompt
                  : (imageFile?.name ?? "Kép alapú"),
              status: "succeeded",
              thumbnail: data.thumbnail_url ?? null,
              model_urls: data.model_urls ?? {},
              ts: Date.now(),
            };
            setHistory((h) => [item, ...h]);
            setActiveItem(item);
          } else if (data.status === "FAILED" || data.status === "EXPIRED") {
            clearInterval(pollTimerRef.current);
            setErrorMsg(data.task_error?.message ?? "Generálás sikertelen");
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
      }, POLL_MS);
    },
    [authHeaders, inputMode, prompt, imageFile],
  );

  const handleGenerate = useCallback(async () => {
    if (genStatus === "pending" || genStatus === "in_progress") return;
    if (inputMode === "text" && !prompt.trim()) return;
    if (inputMode === "image" && !imageFile) return;
    setErrorMsg("");
    setModelUrl(null);
    setPreviewTaskId(null);
    setProgress(0);
    setGenStatus("pending");
    try {
      const headers = await authHeaders();
      let res, data;
      if (inputMode === "text") {
        res = await fetch(`${API_BASE}/text-to-3d`, {
          method: "POST",
          headers,
          body: JSON.stringify({ prompt: prompt.trim(), ...params }),
        });
        data = await res.json();
        setTaskType("text-to-3d");
      } else {
        const imageDataURI = await fileToDataURI(imageFile);
        res = await fetch(`${API_BASE}/image-to-3d`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            image_url: imageDataURI,
            model_type: params.model_type,
            ai_model: params.ai_model,
            topology: params.topology,
            target_polycount: params.target_polycount,
            symmetry_mode: params.symmetry_mode,
            should_remesh: params.should_remesh,
            should_texture: params.should_texture,
            enable_pbr: params.enable_pbr,
            pose_mode: params.pose_mode,
            ...(params.texture_prompt ? { texture_prompt: params.texture_prompt } : {}),
          }),
        });
        data = await res.json();
        setTaskType("image-to-3d");
      }
      if (!data.success) {
        setGenStatus("failed");
        setErrorMsg(data.message ?? "Hiba");
        return;
      }
      setTaskId(data.task_id);
      startPolling(data.task_id, inputMode === "text" ? "text-to-3d" : "image-to-3d");
    } catch (err) {
      setGenStatus("failed");
      setErrorMsg(err.message ?? "Hálózati hiba");
    }
  }, [genStatus, inputMode, prompt, imageFile, params, authHeaders, startPolling]);

  const handleRefine = useCallback(async () => {
    if (!previewTaskId || refining) return;
    setRefining(true);
    setGenStatus("pending");
    setProgress(0);
    setErrorMsg("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/refine`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          preview_task_id: previewTaskId,
          enable_pbr: params.enable_pbr,
          texture_prompt: params.texture_prompt,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setGenStatus("failed");
        setErrorMsg(data.message);
        setRefining(false);
        return;
      }
      setTaskId(data.task_id);
      startPolling(data.task_id, "text-to-3d");
    } catch (err) {
      setGenStatus("failed");
      setErrorMsg(err.message);
      setRefining(false);
    }
  }, [previewTaskId, refining, params, authHeaders, startPolling]);

  useEffect(() => () => clearInterval(pollTimerRef.current), []);

  const handleSelectHistory = useCallback((item) => {
    setActiveItem(item);
    if (item.model_urls?.glb) setModelUrl(item.model_urls.glb);
    else if (item.model_urls?.obj) setModelUrl(item.model_urls.obj);
    setGenStatus(item.status);
    setThumbnail(item.thumbnail ?? null);
  }, []);

  const camPreset = useCallback((preset) => {
    if (sceneRef.current) {
      setCameraPreset(sceneRef.current, preset);
      const spin = preset === "reset";
      setAutoSpin(spin);
      sceneRef.current.autoSpin = spin;
    }
  }, []);

  const toggleAutoSpin = useCallback(() => {
    setAutoSpin((v) => !v);
  }, []);

  const charPct = prompt.length / PROMPT_MAX;
  const charColor = charPct > 0.9 ? "#f87171" : charPct > 0.72 ? "#fbbf24" : "#4b5563";
  const isRunning = genStatus === "pending" || genStatus === "in_progress";
  const canGen = !isRunning && (inputMode === "text" ? prompt.trim().length > 0 : !!imageFile);

  const filteredHistory = useMemo(() => {
    const q = histSearch.toLowerCase();
    return q ? history.filter((i) => i.prompt.toLowerCase().includes(q)) : history;
  }, [history, histSearch]);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .animate-pulse { animation: pulse 2s ease-in-out infinite; }
      `}</style>

      <div className="flex h-full overflow-hidden bg-black font-sans">
      <div className="flex-1 flex overflow-hidden">
        {/* ════ LEFT PANEL — GENERATOR STATION ════ */}
        <aside className="w-80 flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0a0a0f] relative z-20 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
          <div className="pt-20 lg:pt-24 flex flex-col h-full overflow-hidden">
          
          {/* Header - STATION SOLID HUD */}
          <div className="p-6 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-5">
              <Sparkles className="w-4 h-4" style={{ color }} />
              <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] italic leading-none">Forge Station</span>
            </div>
            
            {/* Input Selection Tabs */}
            <div className="flex bg-white/[0.02] border border-white/5 rounded-xl p-1 mb-2">
              {[
                { id: "text", label: "Neural Prompt", icon: <Type className="w-3 h-3" /> },
                { id: "image", label: "Image Reference", icon: <ImageIcon className="w-3 h-3" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInputMode(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none ${
                    inputMode === tab.id ? 'bg-white/5 text-white' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <BgColorPicker value={bgColor} onChange={setBgColor} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">

            {/* Image input */}
            {inputMode === "image" ? (
              <>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <ImageIcon className="w-3 h-3 text-zinc-700" />
                    <span className="text-zinc-600 font-black text-[9px] uppercase tracking-[0.4em] italic">Visual Seed</span>
                  </div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = color; }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer flex flex-col items-center justify-center p-4 relative overflow-hidden group/drop"
                  >
                    {imagePreview ? (
                      <div className="absolute inset-0">
                        <img src={imagePreview} alt="preview" className="w-full h-full object-cover transition-transform duration-700 group-hover/drop:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/drop:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white font-black text-[10px] uppercase tracking-widest">Swap Reference</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/80 text-red-400 border-none cursor-pointer flex items-center justify-center hover:scale-110 transition-all z-10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-zinc-800 mb-4 group-hover/drop:scale-110 transition-transform" />
                        <p className="text-zinc-600 font-black text-[9px] uppercase tracking-widest text-center m-0">Drop Visual Matrix</p>
                        <p className="text-zinc-900 font-bold text-[8px] uppercase mt-2">Maximum 20MB Payload</p>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleDrop({ ...e, dataTransfer: { files: e.target.files } })} />
                </>
            ) : (
              /* Text prompt */
              <>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-3.5 h-3.5 text-zinc-400 group-focus-within:text-emerald-400 transition-colors" />
                      <span className="text-zinc-200 font-black text-[10px] uppercase tracking-[0.4em] italic">Neural Prompt</span>
                    </div>
                    <span className={`text-[9px] font-black tracking-widest ${prompt.length > PROMPT_MAX * 0.8 ? 'text-amber-500' : 'text-zinc-500'}`}>
                      {prompt.length} / {PROMPT_MAX}
                    </span>
                  </div>
                  <div className="relative group">
                    <textarea
                      value={prompt}
                      maxLength={PROMPT_MAX}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="CONSTRUCT MODEL FROM DESCRIPTIVE DATA..."
                      className="w-full min-h-[140px] px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-tight text-zinc-200 bg-white/[0.01] border border-white/5 hover:border-white/10 focus:border-emerald-500/50 outline-none transition-all resize-none placeholder:text-zinc-800 scrollbar-hide"
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                       <button className="w-7 h-7 rounded-lg bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-800 hover:text-white cursor-pointer transition-colors">
                          <Wand2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>
                </>
              )}

            <div className="space-y-6 mt-6">
              {errorMsg && (
                <div className="flex gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 animate-pulse">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-red-400 font-black text-[9px] uppercase tracking-widest m-0 leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {inputMode === "image" && (
                <MeshyRow label="Reference Title" tip="Opcionális modell név">
                  <input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="ASSIGN IDENTIFIER..."
                    className="w-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-white/[0.02] border border-white/5 hover:border-white/10 outline-none transition-all placeholder:text-zinc-800"
                  />
                </MeshyRow>
              )}

              <MeshyRow label="Structural Fidelity" tip="Standard: részletes · Low Poly: stílusos">
                <SegControl
                  value={params.model_type}
                  options={[
                    { value: "standard", label: "STANDARD" },
                    { value: "lowpoly", label: "LOW POLY" },
                  ]}
                  onChange={(v) => setParam("model_type", v)}
                  color={color}
                />
              </MeshyRow>

              <MeshyRow label="Forge Engine" tip="Meshy AI modell verzió">
                <Select
                  value={params.ai_model}
                  onChange={(v) => setParam("ai_model", v)}
                  options={[
                    { value: "latest", label: "MESHY CORE v6" },
                    { value: "meshy-5", label: "MESHY CORE v5" },
                  ]}
                />
              </MeshyRow>

              {inputMode === "text" && (
                <MeshyRow label="Alignment Pose" tip="Karakter póz">
                  <SegControl
                    value={params.pose_mode || "none"}
                    options={[
                      { value: "none", label: "NONE" },
                      { value: "a-pose", label: "A-POSE" },
                      { value: "t-pose", label: "T-POSE" },
                    ]}
                    onChange={(v) => setParam("pose_mode", v === "none" ? "" : v)}
                    color={color}
                  />
                </MeshyRow>
              )}

              {inputMode === "text" && (
                <MeshyRow label="Batch Magnitude" tip="Hány modell variáns (1–4)">
                  <NumStepper
                    value={params.num_generations}
                    onChange={(v) => setParam("num_generations", v)}
                    min={1}
                    max={4}
                  />
                </MeshyRow>
              )}

              <MeshyRow label="Data Protocol" tip="CC BY 4.0: nyílt · Private: prémium">
                <SegControl
                  value={params.license}
                  options={[
                    { value: "cc", label: "PUBLIC CC" },
                    { value: "private", label: "ENCRYPTED 👑" },
                  ]}
                  onChange={(v) => setParam("license", v)}
                  color={color}
                />
              </MeshyRow>

              <div className="w-full h-[1px] bg-white/5 my-4" />

              <Collapsible title="Advanced Parameters" color={color}>
                <Select
                  label="Surface Topology"
                  value={params.topology}
                  onChange={(v) => setParam("topology", v)}
                  options={[
                    { value: "triangle", label: "▲ TRIANGULAR" },
                    { value: "quad", label: "■ QUADRATIC" },
                  ]}
                />
                
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-zinc-800 font-black text-[8px] uppercase tracking-[0.4em] italic leading-none">Polycount Target</span>
                    <span className="text-zinc-300 font-mono text-[10px] font-black">{(params.target_polycount / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="relative h-1 mb-4">
                    <div className="absolute inset-0 bg-white/5 rounded-full" />
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent rounded-full opacity-50 transition-all duration-300"
                      style={{ 
                        width: `${((params.target_polycount - 100) / 299900) * 100}%`,
                        backgroundColor: color 
                      }}
                    />
                    <input
                      type="range"
                      min={100}
                      max={300000}
                      step={5000}
                      value={params.target_polycount}
                      onChange={(e) => setParam("target_polycount", Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <Toggle label="Remesh Protocol" hint="Optimize topology flow" value={params.should_remesh} onChange={(v) => setParam("should_remesh", v)} color={color} />
                <Toggle label="PBR Materials" hint="Export mapping data" value={params.enable_pbr} onChange={(v) => setParam("enable_pbr", v)} color={color} />
                
                <div className="mt-4">
                   <span className="text-zinc-400 font-black text-[9px] uppercase tracking-[0.4em] italic leading-none mb-3 block px-1">Material Override</span>
                   <textarea
                    value={params.texture_prompt}
                    onChange={(e) => setParam("texture_prompt", e.target.value.slice(0, 600))}
                    placeholder="DESCRIPTOR OVERRIDE..."
                    className="w-full min-h-[80px] px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-tight text-white/70 bg-white/[0.01] border border-white/5 focus:border-white/20 outline-none transition-all placeholder:text-zinc-800 italic"
                  />
                </div>
              </Collapsible>
            </div>
          </div>

          {/* SIDEBAR FOOTER — COMMAND EXECUTION */}
          <div className="p-6 border-t border-white/5 bg-white/[0.01]">
             {isRunning && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-zinc-600 font-black text-[8px] uppercase tracking-widest italic">Forging Unit</span>
                  <span className="text-zinc-400 font-mono text-[10px]">{progress}%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${color}, #8b5cf6)` 
                    }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-zinc-800" />
                <span className="text-zinc-700 font-black text-[9px] uppercase tracking-widest italic">Est. 60s</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                <span className="text-white font-black text-[12px]">20</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGen}
              className={`w-full group relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] italic transition-all duration-700 cursor-pointer border-none ${
                !canGen ? 'opacity-20 grayscale brightness-50' : 'hover:scale-[1.02] active:scale-95'
              }`}
              style={{
                background: isRunning 
                  ? 'rgba(255,255,255,0.02)' 
                  : `linear-gradient(135deg, ${color}, #8b5cf6)`,
                boxShadow: isRunning ? 'none' : `0 12px 40px ${color}44`,
                color: isRunning ? '#52525b' : '#fff'
              }}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  INITIATE FORGE
                </>
              )}
              
              {!isRunning && canGen && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
              )}
            </button>

            {previewTaskId && inputMode === "text" && genStatus === "succeeded" && (
                <button
                  onClick={handleRefine}
                  disabled={refining}
                  className="w-full mt-3 flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic text-zinc-400 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:text-white transition-all cursor-pointer"
                >
                  {refining ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refining Vector...</>
                  ) : (
                    <><RefreshCw className="w-3.5 h-3.5" /> Refine PBR Matrix</>
                  )}
                </button>
            )}
          </div>
          </div>
        </aside>

        {/* ════ CENTER — 3D VIEWER ════ */}
        <main
          className="pt-20 lg:pt-24"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 1,
            background: "#0a0a0f",
            overflow: "hidden"
          }}
        >
          {/* Top toolbar (Floating) — STATION HUD ENTRY */}
          <div
            className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center p-1.5 rounded-2xl border border-white/5 backdrop-blur-3xl shadow-2xl z-50 transition-all duration-700 hover:border-white/10"
            style={{
              background: "rgba(10,10,15,0.4)",
              gap: 12,
            }}
          >
            <div className="flex items-center gap-4 px-2">
              <div className="flex items-center gap-1.5 mr-2">
                <div className="w-1 h-1 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" style={{ background: color }} />
                <span className="text-zinc-600 font-black text-[9px] uppercase tracking-[0.4em] italic leading-none">Nézet</span>
              </div>

              {/* View mode buttons — STATION ENGINE SELECTORS */}
              <div className="flex items-center gap-1">
                {VIEW_MODES.map((v) => (
                  <Tooltip key={v.id} text={v.tip} side="bottom">
                    <button
                      onClick={() => setViewMode(v.id)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer border-none transition-all duration-500 ${
                        viewMode === v.id
                          ? 'text-white'
                          : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                      style={viewMode === v.id ? { 
                        background: color, 
                        boxShadow: `0 0 15px ${color}40`,
                      } : {
                        background: 'rgba(255,255,255,0.02)'
                      }}
                    >
                      {v.label}
                    </button>
                  </Tooltip>
                ))}

                {/* Wireframe Controls */}
                {modelUrl && (
                  <div className="ml-1 border-l border-white/5 pl-2">
                    <WireframeControl
                      active={wireframeOverlay}
                      onToggle={() => setWireframeOverlay((v) => !v)}
                      opacity={wireOpacity}
                      onOpacityChange={setWireOpacity}
                      color={wireColor}
                      onColorChange={setWireColor}
                      accentColor={color}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right actions — STATION COMMANDS */}
            <div className="flex items-center gap-1.5 border-l border-white/5 pl-4 ml-2 mr-2">
              {modelUrl && (
                <div className="flex items-center gap-1.5">
                   {[
                    {
                      label: "Remesh",
                      icon: <Settings className="w-3 h-3" />,
                      onClick: () => setShowRemesh(true),
                    },
                    {
                      label: "Edit Texture",
                      icon: <Paintbrush2 className="w-3 h-3" />,
                      onClick: () => setShowEditTexture(true),
                    },
                    {
                      label: "Animate",
                      icon: <PersonStanding className="w-3 h-3" />,
                      onClick: () => setShowAnimate(true),
                    },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={btn.onClick}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                    >
                      {btn.icon} {btn.label}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setShowDownload(true)}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic text-white transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95 border-none"
                    style={{
                      background: `linear-gradient(135deg, ${color}, #8b5cf6)`,
                      boxShadow: `0 8px 32px ${color}33`,
                    }}
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  <div className="w-[1px] h-4 bg-white/5 mx-2" />
                </div>
              )}

              {/* Action Buttons Integration */}
              <div className="flex items-center gap-1">
                <Tooltip text="Feltöltés (3D)" side="bottom">
                  <button
                    onClick={() => modelFileInputRef.current?.click()}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-zinc-600 hover:text-zinc-300 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                
                <div className="flex items-center gap-1 border-l border-white/5 pl-2 ml-1">
                   <div className="flex items-center gap-1 mr-1">
                    <div className="w-1 h-1 rounded-full bg-zinc-800" />
                    <span className="text-zinc-800 font-black text-[8px] uppercase tracking-[0.4em] italic leading-none">Fény</span>
                  </div>
                  <LightingControls
                    viewMode={viewMode}
                    lightMode={lightMode}
                    setLightMode={setLightMode}
                    lightStrength={lightStrength}
                    setLightStrength={setLightStrength}
                    lightRotation={lightRotation}
                    setLightRotation={setLightRotation}
                    lightAutoRotate={lightAutoRotate}
                    setLightAutoRotate={setLightAutoRotate}
                    lightAutoRotateSpeed={lightAutoRotateSpeed}
                    setLightAutoRotateSpeed={setLightAutoRotateSpeed}
                    dramaticColor={dramaticColor}
                    setDramaticColor={setDramaticColor}
                    bgLightOn={bgLightOn}
                    setBgLightOn={setBgLightOn}
                    bgLightColor={bgLightColor}
                    setBgLightColor={setBgLightColor}
                    bgLightSize={bgLightSize}
                    setBgLightSize={setBgLightSize}
                    bgLightIntensity={bgLightIntensity}
                    setBgLightIntensity={setBgLightIntensity}
                    gridColor1={gridColor1}
                    setGridColor1={setGridColor1}
                    gridColor2={gridColor2}
                    setGridColor2={setGridColor2}
                    color={color}
                  />
                </div>

                <IconBtn
                  icon={<Box className="w-3.5 h-3.5" />}
                  tip={showGrid ? "Rács elrejtése" : "Rács megjelenítése"}
                  active={showGrid}
                  color={color}
                  onClick={() => setShowGrid((v) => !v)}
                  size={32}
                />
                <IconBtn
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                  tip={rightOpen ? "Előzmények bezárása" : "Előzmények megnyitása"}
                  active={rightOpen}
                  color={color}
                  onClick={() => setRightOpen((v) => !v)}
                  size={32}
                />
              </div>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="flex-1 relative overflow-hidden bg-[#0a0a0f]">
            {/* Viewport Telemetry */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 text-zinc-900 font-black text-[8px] uppercase tracking-[0.4em] pointer-events-none z-10 whitespace-nowrap opacity-40">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-2.5 h-2.5" /> 
                DRAG FORGE ROTATION
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-950" />
              <div className="flex items-center gap-2">
                SHIFT+DRAG VECTOR PAN
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-950" />
              <div className="flex items-center gap-2">
                SCROLL MAGNITUDE
              </div>
            </div>

            <ThreeViewer
              color={color}
              viewMode={viewMode}
              lightMode={lightMode}
              showGrid={showGrid}
              modelUrl={modelUrl}
              lightStrength={lightStrength}
              lightRotation={lightRotation}
              lightAutoRotate={lightAutoRotate}
              lightAutoRotateSpeed={lightAutoRotateSpeed}
              dramaticColor={dramaticColor}
              wireframeOverlay={wireframeOverlay}
              wireOpacity={wireOpacity}
              wireHexColor={wireHexColor}
              autoSpin={autoSpin}
              bgColor={bgColor}
              bgLightOn={bgLightOn}
              bgLightColor={bgLightColor}
              bgLightSize={bgLightSize}
              bgLightIntensity={bgLightIntensity}
              gridColor1={gridColor1}
              gridColor2={gridColor2}
              onSpinStop={() => setAutoSpin(false)}
              onReady={(s) => { sceneRef.current = s; }}
            />

            {/* STATION FORGE OVERLAY — Cinematic Loading */}
            {isRunning && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-xl pointer-events-none">
                <div className="relative group">
                  <div className="absolute inset-0 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" style={{ backgroundColor: color }} />
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center p-0.5 bg-gradient-to-br from-white/10 to-transparent border border-white/5 relative z-10">
                    <div className="w-full h-full rounded-[1.4rem] bg-zinc-950/80 flex items-center justify-center">
                      <Box className="w-8 h-8 animate-pulse" style={{ color }} />
                    </div>
                  </div>
                  {/* Rotating Rings */}
                  <div className="absolute inset-[-10px] border border-dashed border-white/5 rounded-full animate-[spin_10s_linear_infinite] opacity-20" />
                  <div className="absolute inset-[-20px] border border-dashed border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-10" />
                </div>

                <div className="mt-10 text-center">
                  <h3 className="text-white font-black text-[12px] uppercase tracking-[0.6em] italic m-0">
                    Neural Forging Sequence
                  </h3>
                  <p className="text-zinc-600 font-bold text-[9px] uppercase tracking-[0.3em] mt-3">
                    {genStatus === "pending" ? "Station Synchronization..." : `Meshy Core Processing... ${progress}%`}
                  </p>
                </div>

                {/* Progress Bar — STATION THEME */}
                <div className="mt-8 w-64 h-[2px] bg-white/5 relative overflow-hidden rounded-full">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r transition-all duration-700 ease-out"
                    style={{ 
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, transparent, ${color}, #8b5cf6)`
                    }}
                  />
                  {/* Subtle Glow */}
                  <div className="absolute top-0 bottom-0 blur-[2px] opacity-50"
                    style={{ left: `${progress}%`, width: '10px', backgroundColor: color }}
                  />
                </div>
                
                <div className="mt-12 flex items-center gap-6">
                   <div className="flex flex-col items-center gap-1">
                      <span className="text-zinc-800 font-black text-[7px] uppercase tracking-widest">Latency</span>
                      <span className="text-emerald-500/50 font-mono text-[9px]">0.4ms</span>
                   </div>
                   <div className="w-[1px] h-4 bg-white/5" />
                   <div className="flex flex-col items-center gap-1">
                      <span className="text-zinc-800 font-black text-[7px] uppercase tracking-widest">Buffer</span>
                      <span className="text-zinc-700 font-mono text-[9px]">Optimized</span>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom toolbar (Floating) — CAMERA & STATION HUD */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center p-1.5 rounded-2xl border border-white/5 backdrop-blur-3xl shadow-2xl z-50 transition-all duration-700 hover:border-white/10"
            style={{
              background: "rgba(10,10,15,0.4)",
              gap: 12,
            }}
          >
            <div className="flex items-center gap-3 px-3">
              <div className="flex items-center gap-1.5 mr-2">
                <div className="w-1 h-1 rounded-full bg-zinc-800" />
                <span className="text-zinc-600 font-black text-[9px] uppercase tracking-[0.4em] italic leading-none">Kamera</span>
              </div>
              <IconBtn icon={<RotateCcw className="w-3 h-3" />} tip="Reset Station View" onClick={() => camPreset("reset")} size={32} />
              <IconBtn icon={<Camera className="w-3 h-3" />} tip="Anterior Alignment" onClick={() => camPreset("front")} size={32} />
              <IconBtn icon={<Move3d className="w-3 h-3" />} tip="Lateral Vector" onClick={() => camPreset("side")} size={32} />
              <IconBtn icon={<Layers className="w-3 h-3" />} tip="Zenith Projection" onClick={() => camPreset("top")} size={32} />
              
              <div className="w-[1px] h-4 bg-white/5 mx-2" />
              
              <Tooltip text={autoSpin ? "Deactivate Rotation" : "Activate Cinematic Cycle"} side="top">
                <button
                  onClick={toggleAutoSpin}
                  className={`flex items-center gap-2.5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none ${
                    autoSpin ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-300'
                  }`}
                  style={autoSpin ? { 
                    background: color, 
                    boxShadow: `0 0 15px ${color}33`,
                  } : { 
                    background: 'rgba(255,255,255,0.02)' 
                  }}
                >
                  {autoSpin ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  Auto-spin
                </button>
              </Tooltip>
            </div>
          </div>
        </main>

        {/* ════ RIGHT PANEL — STATION RECORDS ════ */}
        {rightOpen && (
          <aside className="w-72 flex-shrink-0 flex flex-col border-l border-white/5 bg-[#0a0a0f] relative z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
            <div className="pt-20 lg:pt-24 flex flex-col h-full overflow-hidden">
              {/* Header - STATION SOLID HUD */}
              <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-white font-black text-[10px] uppercase tracking-[0.4em] italic leading-none">Records</span>
                  </div>
                  <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-tighter">
                    {history.length} ITEMS
                  </div>
                </div>
                <div className="relative group">
                  <input
                    placeholder="SCANNING DATABANKS..."
                    value={histSearch}
                    onChange={(e) => setHistSearch(e.target.value)}
                    className="w-full h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 bg-white/[0.02] border border-white/5 group-hover:border-white/10 focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-800"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-zinc-800 group-focus-within:bg-zinc-500 transition-colors" />
                </div>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide bg-[#0a0a0f]">
                {filteredHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <Box className="w-8 h-8 text-zinc-900 mb-4 opacity-20" />
                    <p className="text-zinc-800 font-black text-[9px] uppercase tracking-[0.3em] m-0">
                      {histSearch ? "NO MATCHING UNITS FOUND" : "FORGE DATABASE EMPTY"}
                    </p>
                  </div>
                )}
                {filteredHistory.map((item) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    isActive={activeItem?.id === item.id}
                    onSelect={handleSelectHistory}
                    color={color}
                  />
                ))}
              </div>

              {/* Footer Actions */}
              {history.length > 0 && (
                <div className="p-5 border-t border-white/5 bg-white/[0.01]">
                  <Tooltip text="Összes előzmény törlése" side="top">
                    <button
                      onClick={() => {
                        if (window.confirm("Törlöd az összes előzményt?")) {
                          setHistory([]);
                          setActiveItem(null);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.4em] italic text-zinc-600 hover:text-red-500 bg-white/[0.01] hover:bg-red-500/5 border border-white/5 hover:border-red-500/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Purge Station Records
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>

    <input ref={modelFileInputRef} type="file" accept=".glb,.gltf,.obj" className="hidden" onChange={(e) => handleUpload3DModel(e.target.files[0])} />

      {/* ════ MODALS ════ */}
      {showDownload && (
        <DownloadModal
          onClose={() => setShowDownload(false)}
          activeItem={activeItem}
          color={color}
        />
      )}
      {showEditTexture && (
        <EditTextureModal
          onClose={() => setShowEditTexture(false)}
          color={color}
          uvLayer={uvLayer}
          setUvLayer={setUvLayer}
        />
      )}
      {showRemesh && (
        <RemeshModal
          onClose={() => setShowRemesh(false)}
          color={color}
          params={params}
          setParam={setParam}
        />
      )}
      {showAnimate && (
        <AnimateModal
          onClose={() => setShowAnimate(false)}
          color={color}
          modelUrl={modelUrl}
        />
      )}
    </>
  );
}
