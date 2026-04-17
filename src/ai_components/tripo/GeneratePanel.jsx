// trellis/GeneratePanel.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Image, Boxes, Grid3x3, Pencil, HelpCircle, Upload, Check, X,
  Loader2, Globe, Lock, ChevronDown, PersonStanding, Zap, Images, Lightbulb,
  Camera, Box, Gamepad2, FlaskConical, Triangle, Palette, Sparkles, ToyBrick, Mountain, Dice5,
} from "lucide-react";
import Enhancer from "../Enhancer";

/* ─── Tab definitions ─────────────────────────────────────────────────── */
export const GEN_TABS = [
  { id: "image", icon: Image, tip: "Image to 3D" },
  { id: "multi", icon: Boxes, tip: "Multi-view to 3D" },
  { id: "batch", icon: Images, tip: "Batch Images to 3D" },
  { id: "text", icon: Pencil, tip: "Text to 3D" },
];

/* "Make Image Better" (enable_image_autofix) only on image-based tabs */
const TABS_WITH_MAKE_BETTER = new Set(["image", "batch"]);

/* ─── Model versions — real Tripo API strings ─────────────────────────── */
export const MODEL_VERSIONS = [
  { id: "P1-20260311", label: "P1-20260311 (Latest Model)" },
  { id: "v3.1-20260211", label: "V3.1" },
  { id: "v3.0-20250812", label: "V3.0" },
  { id: "v2.5-20250123", label: "V2.5" },
  { id: "Turbo-v1.0-20250506", label: "Turbo V1.0" },
  { id: "v2.0-20240919", label: "V2.0" },
  { id: "v1.4-20240625", label: "V1.4 (Fastest Model)" },
];

/* ─── Per-model capability map ───────────────────────────────────────────
 *  Defines which API parameters each model version actually accepts.
 *  UI elements receive the .model-na class (dimmed, blocked) when the
 *  currently selected model doesn't support that feature.
 * ─────────────────────────────────────────────────────────────────────── */
export const MODEL_CAPS = {
  "P1-20260311": {
    ultraMesh: true, texture: true, pbr: true, tex4K: false,
    multiview: true, batch: true, tPose: false, inParts: true,
    negPrompt: true, smartLowPoly: false, quad: false,
    autoSize: true, exportUv: true, makeBetter: true,
    modelSeed: true, imageSeed: true, textureSeed: true,
  },
  "v3.1-20260211": {
    ultraMesh: true, texture: true, pbr: true, tex4K: true,
    multiview: true, batch: true, tPose: true, inParts: true,
    negPrompt: true, smartLowPoly: true, quad: true,
    autoSize: true, exportUv: true, makeBetter: true,
    modelSeed: true, imageSeed: true, textureSeed: true,
  },
  "v3.0-20250812": {
    ultraMesh: true, texture: true, pbr: true, tex4K: true,
    multiview: true, batch: true, tPose: true, inParts: true,
    negPrompt: true, smartLowPoly: true, quad: true,
    autoSize: true, exportUv: true, makeBetter: true,
    modelSeed: true, imageSeed: true, textureSeed: true,
  },
  "v2.5-20250123": {
    ultraMesh: false, texture: true, pbr: true, tex4K: true,
    multiview: true, batch: true, tPose: false, inParts: true,
    negPrompt: true, smartLowPoly: false, quad: true,
    autoSize: true, exportUv: true, makeBetter: true,
    modelSeed: true, imageSeed: true, textureSeed: true,
  },
  "Turbo-v1.0-20250506": {
    ultraMesh: false, texture: false, pbr: false, tex4K: false,
    multiview: false, batch: true, tPose: false, inParts: false,
    negPrompt: false, smartLowPoly: false, quad: false,
    autoSize: false, exportUv: true, makeBetter: true,
    modelSeed: true, imageSeed: false, textureSeed: false,
  },
  "v2.0-20240919": {
    ultraMesh: false, texture: true, pbr: true, tex4K: true,
    multiview: true, batch: true, tPose: false, inParts: true,
    negPrompt: true, smartLowPoly: false, quad: true,
    autoSize: true, exportUv: true, makeBetter: true,
    modelSeed: true, imageSeed: true, textureSeed: true,
  },
  "v1.4-20240625": {
    ultraMesh: false, texture: true, pbr: false, tex4K: false,
    multiview: false, batch: false, tPose: false, inParts: false,
    negPrompt: false, smartLowPoly: false, quad: false,
    autoSize: false, exportUv: true, makeBetter: true,
    modelSeed: false, imageSeed: false, textureSeed: false,
  },
};

export function getModelCaps(modelVer) {
  return MODEL_CAPS[modelVer] ?? MODEL_CAPS["v2.5-20250123"];
}

/* ─── API face_limit constraints ─────────────────────────────────────── */
export function getFaceLimitConfig(smartLowPoly, quad) {
  if (smartLowPoly && quad) return { min: 500, max: 10_000, step: 500, defaultVal: 5_000, allowAuto: false };
  if (smartLowPoly && !quad) return { min: 1_000, max: 20_000, step: 1_000, defaultVal: 8_000, allowAuto: false };
  if (!smartLowPoly && quad) return { min: 0, max: 100_000, step: 1_000, defaultVal: 10_000, allowAuto: true };
  return { min: 0, max: 500_000, step: 5_000, defaultVal: 0, allowAuto: true };
}

/* ─── Model-NA wrapper ───────────────────────────────────────────────────
 *  Renders children inside a .model-na wrapper when `unsupported` is true.
 *  The tooltip is still accessible via the wrapper's title attribute.
 * ─────────────────────────────────────────────────────────────────────── */
function Na({ unsupported, tip, children }) {
  if (!unsupported) return <>{children}</>;
  return (
    <div
      className="model-na"
      title={tip ?? "Not available with this model"}
      style={{ cursor: "not-allowed" }}
    >
      {children}
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────────────── */
function CoinIcon({ size = 15 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#f5c518,#e09900)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Zap style={{ width: size * 0.56, height: size * 0.56, color: "#0a0800" }} />
    </div>
  );
}

function Toggle({ label, value, onChange, hint = false, premium = false, disabled = false }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 0", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      }}
      onClick={() => !disabled && onChange(!value)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {premium && <CoinIcon />}
        <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>{label}</span>
        {hint && <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />}
      </div>
      <div className={"tp-switch" + (value ? " on" : "")}
        style={{ background: value ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
    </div>
  );
}

function Collapsible({ label, children, border = true, extra }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="sec-row" onClick={() => setOpen(v => !v)}
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: border && open ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
        <span style={{ color: "#525270", fontSize: 13, fontWeight: 500 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {extra}
          {open
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d2d48" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d2d48" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>}
        </div>
      </div>
      {open && <div style={{ padding: "12px 2px 4px", animation: "fadeUp 0.15s ease" }}>{children}</div>}
    </div>
  );
}

/* ─── TopoControls ────────────────────────────────────────────────────── */
function TopoControls({
  quad, setQuad, smartLowPoly, setSmartLowPoly, polycount, setPolycount,
  capsQuad = true, capsSmartLowPoly = true,
}) {
  const cfg = getFaceLimitConfig(smartLowPoly, quad);
  const [localVal, setLocalVal] = React.useState(() => Math.max(cfg.min, polycount));

  React.useEffect(() => {
    setLocalVal(Math.max(cfg.min, polycount));
  }, [polycount]); // eslint-disable-line

  function handleSetQuad(val) {
    if (!capsQuad && val) return;
    setQuad(val);
    const next = getFaceLimitConfig(smartLowPoly, val);
    const reset = next.allowAuto ? 0 : next.defaultVal;
    setPolycount(reset); setLocalVal(reset);
  }
  function handleSetSmartLowPoly(val) {
    if (!capsSmartLowPoly && val) return;
    setSmartLowPoly(val);
    const next = getFaceLimitConfig(val, quad);
    const reset = next.allowAuto ? 0 : next.defaultVal;
    setPolycount(reset); setLocalVal(reset);
  }

  function commit(raw) {
    const v = isNaN(raw) ? cfg.min : Math.max(cfg.min, Math.min(cfg.max, raw));
    setLocalVal(v); setPolycount(v);
  }

  const showAuto = cfg.allowAuto && localVal === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

      {/* Smart Low Poly */}
      <Na unsupported={!capsSmartLowPoly} tip="Smart Low Poly not supported by this model">
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 0", cursor: capsSmartLowPoly ? "pointer" : "not-allowed",
          }}
          onClick={() => capsSmartLowPoly && handleSetSmartLowPoly(!smartLowPoly)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <CoinIcon />
            <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Smart Low Poly</span>
            <span style={{ background: "linear-gradient(135deg,#c026d3,#a21caf)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4 }}>v2</span>
            <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
          </div>
          <div className={"tp-switch" + (smartLowPoly && capsSmartLowPoly ? " on" : "")}
            style={{ background: smartLowPoly && capsSmartLowPoly ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
        </div>
      </Na>

      {smartLowPoly && capsSmartLowPoly && (
        <div style={{ padding: "6px 9px", borderRadius: 8, background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.18)", display: "flex", gap: 6, marginBottom: 4 }}>
          <HelpCircle style={{ width: 11, height: 11, color: "#a5a0ff", marginTop: 1, flexShrink: 0 }} />
          <p style={{ color: "#a5a0ff", fontSize: 10, margin: 0, lineHeight: 1.5 }}>
            Applied at generation time. Simple inputs work best — may fail on complex geometry.
          </p>
        </div>
      )}

      {/* Topology */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, marginTop: 4 }}>
        <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Topology</span>
        <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {/* Quad */}
        <Na unsupported={!capsQuad} tip="Quad topology not supported by this model">
          <button
            className={"tp-topo-btn" + (quad && capsQuad ? " sel" : "")}
            onClick={() => handleSetQuad(true)}
            style={{ cursor: capsQuad ? "pointer" : "not-allowed" }}
          >
            Quad
          </button>
        </Na>
        <button
          className={"tp-topo-btn" + (!quad || !capsQuad ? " sel" : "")}
          onClick={() => handleSetQuad(false)}
        >
          Triangle
        </button>
      </div>

      {/* Face Limit */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Face Limit</span>
          <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
          <span style={{ marginLeft: "auto", color: "#2d2d48", fontSize: 9, fontFamily: "monospace" }}>
            {cfg.allowAuto ? `Auto – ${(cfg.max / 1000).toFixed(0)}k` : `${cfg.min.toLocaleString()} – ${cfg.max.toLocaleString()}`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={localVal}
            onChange={e => setLocalVal(Number(e.target.value))}
            onMouseUp={e => commit(Number(e.target.value))}
            onTouchEnd={e => commit(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#6c63ff" }}
          />
          <input
            type="number" min={cfg.min} max={cfg.max} step={cfg.step}
            value={showAuto ? "" : localVal}
            placeholder={cfg.allowAuto ? "Auto" : String(cfg.defaultVal)}
            onChange={e => { const v = parseInt(e.target.value, 10); commit(isNaN(v) ? cfg.min : v); }}
            style={{
              width: 80, padding: "5px 8px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)", color: "#c8c8e0",
              fontSize: 12, fontFamily: "monospace", outline: "none",
              textAlign: "center", boxSizing: "border-box",
            }}
          />
        </div>
        <p style={{ color: "#4a4a68", fontSize: 10, margin: "5px 0 0", lineHeight: 1.5 }}>
          {showAuto && "Auto — model adaptively determines optimal face count"}
          {!showAuto && smartLowPoly && quad && "Quad smart-low-poly: 500 – 10 000 faces (required)"}
          {!showAuto && smartLowPoly && !quad && "Smart-low-poly: 1 000 – 20 000 faces (required)"}
          {!showAuto && !smartLowPoly && quad && "Quad: default 10 000 when unset"}
          {!showAuto && !smartLowPoly && !quad && `${localVal.toLocaleString()} faces`}
        </p>
        {quad && capsQuad && (
          <div style={{ marginTop: 6, padding: "6px 9px", borderRadius: 8, background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.15)", display: "flex", gap: 6 }}>
            <span style={{ color: "#f5c518", fontSize: 9, marginTop: 1, flexShrink: 0 }}>⚠</span>
            <p style={{ color: "#fcd34d", fontSize: 10, margin: 0, lineHeight: 1.5 }}>
              Quad forces FBX output. Incompatible with Generate in Parts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── AI Model Dropdown ───────────────────────────────────────────────── */
function ModelDropdown({ modelVer, setModelVer }) {
  const [open, setOpen] = useState(false);
  const selected = MODEL_VERSIONS.find(v => v.id === modelVer) ?? MODEL_VERSIONS[0];

  const icons = [
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a5a0ff" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>,
    <Zap width={13} height={13} color="#a5a0ff" />,
    <Zap width={13} height={13} color="#f5c518" />,
  ];

  return (
    <div style={{ marginTop: 14, position: "relative" }}>
      <span style={{ color: "#4a4a68", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>AI Model</span>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 8,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(108,99,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icons[MODEL_VERSIONS.findIndex(v => v.id === modelVer)] ?? icons[0]}
          </div>
          <span style={{ color: "#e8e8f4", fontSize: 12, fontWeight: 600 }}>{selected.label}</span>
        </div>
        <ChevronDown style={{ width: 13, height: 13, color: "#2d2d48", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: "calc(100% + 4px)",
          background: "#131327", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, overflow: "hidden", zIndex: 50,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          {MODEL_VERSIONS.map((v, i) => (
            <button
              key={v.id}
              onClick={() => { setModelVer(v.id); setOpen(false); }}
              style={{
                width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                background: modelVer === v.id ? "rgba(108,99,255,0.15)" : "transparent",
                border: "none", borderBottom: i < MODEL_VERSIONS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(108,99,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {icons[i]}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ color: modelVer === v.id ? "#a5a0ff" : "#c8c8e0", fontSize: 12, fontWeight: 600, display: "block" }}>{v.label}</span>
                {i === 0 && <span style={{ color: "#2d2d48", fontSize: 9 }}>~90s · up to 2M polygons (Ultra)</span>}
                {i === 1 && <span style={{ color: "#2d2d48", fontSize: 9 }}>~25s · balanced speed & quality</span>}
                {i === 2 && <span style={{ color: "#2d2d48", fontSize: 9 }}>~5s · prototyping only</span>}
              </div>
              {modelVer === v.id && <div><Check style={{ width: 13, height: 13, color: "#a5a0ff" }} /></div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Style prefix buttons ──────────────────────────────────────────────
 * Each style has a label, emoji icon, and prefix text prepended to the
 * prompt at submission time. Only ONE style can be active at a time.
 * ─────────────────────────────────────────────────────────────────────── */
export const STYLE_PREFIX = [
  { id: "photo", label: "Photo", icon: "📷", prefix: "photorealistic, high detail photography, professional 3D render, cinematic lighting, 8k resolution, ultra-detailed textures, realistic materials, " },
  { id: "voxel", label: "Voxel", icon: "🧊", prefix: "precise voxel art style, cubic voxel grid construction, blocky 3D modular design, clean voxel geometry, isometric voxel aesthetic, " },
  { id: "pixel", label: "Pixel", icon: "👾", prefix: "retro 32-bit pixel art style, conversion of 2D sprite to 3D volume, stylized jagged edges, vibrant limited palette, nostalgic game aesthetic, " },
  { id: "clay", label: "Clay", icon: "🏺", prefix: "claymation style, authentic clay surface with fingerprints, hand-sculpted plasticine texture, soft rounded organic forms, stop-motion aesthetic, " },
  { id: "cartoon", label: "Cartoon", icon: "🎨", prefix: "stylized 3D cartoon, expressive proportions, clean toon shaded surfaces, vibrant saturated colors, high-quality animation style, " },
  { id: "anime", label: "Anime", icon: "✨", prefix: "high-quality anime 3D model, cel-shaded aesthetics, crisp outlines, vibrant anime palette, Japanese studio animation style, " },
  { id: "chibi", label: "Chibi", icon: "🧸", prefix: "adorable chibi style, stylized super-deformed proportions, large expressive eyes, small cute body, toy-like aesthetic, kawaii character design, " },
  { id: "sculpt", label: "Sculpt", icon: "🗿", prefix: "masterpiece marble sculpture, high-detail museum quality stonework, realistic chiseled surfaces, classical art aesthetic, white marble texture, " },
  { id: "mini", label: "Mini", icon: "🎲", prefix: "highly detailed tabletop miniature, custom 3D printed figurine style, hand-painted gaming piece scale, macro photography of a scale model, " },
];


/* ─── GeneratePanel ───────────────────────────────────────────────────── */
export default function GeneratePanel({
  genTab, setGenTab,
  prompt, setPrompt,
  makeBetter, setMakeBetter,
  imgPrev, setImgPrev, imgToken, setImgToken, imgUploading, handleImg, fileRef, setImgFile,
  multiImages, setMultiImages,
  batchImages, setBatchImages,
  meshQ, setMeshQ,
  inParts, setInParts,
  privacy, setPrivacy,
  texOn, setTexOn,
  tex4K, setTex4K,
  pbrOn, setPbrOn,
  quadMesh, setQuadMesh,
  smartLowPoly, setSmartLowPoly,
  polycount, setPolycount,
  modelVer, setModelVer,
  isRunning,
  canGen,
  handleGen,
  negPrompt, setNegPrompt,
  getIdToken,
  handleMultiImg,
  handleBatchImg,
  setErrorMsg,
  tPose, setTPose,
  modelSeed, setModelSeed,
  textureSeed, setTextureSeed,
  imageSeed, setImageSeed,
  autoSize, setAutoSize,
  exportUv, setExportUv,
  // backendCaps: capability map fetched from backend.
  // If provided, overrides the static MODEL_CAPS fallback.
  // Shape: { [modelVersionId]: { ultraMesh, texture, negPrompt, ... } }
  backendCaps = null,
  // Style prefix state — managed by parent (TripoPanel)
  activeStyles = [],
  onStyleToggle = () => { },
}) {
  const MV_SLOTS = ["Front", "Left", "Right", "Back"];
  const batchInputRef = useRef(null);

  /* ─── Capabilities for current model ──────────────────────────────────
   * Priority: backendCaps (fetched from API) > static MODEL_CAPS fallback.
   * This makes the frontend dynamically adapt to backend-defined capabilities
   * without any hardcoded model-specific logic here.
   * ────────────────────────────────────────────────────────────────────── */
  const caps = backendCaps
    ? (backendCaps[modelVer] ?? backendCaps["v2.5-20250123"] ?? getModelCaps(modelVer))
    : getModelCaps(modelVer);

  /* ─── Auto-reset incompatible settings when model changes ─────────── */
  useEffect(() => {
    const c = getModelCaps(modelVer);
    if (!c.multiview && genTab === "multi") setGenTab("image");
    if (!c.batch && genTab === "batch") setGenTab("image");
    if (!c.tPose && tPose) setTPose(false);
    if (!c.negPrompt) setNegPrompt("");
    if (!c.inParts && inParts) setInParts(false);
    if (!c.smartLowPoly && smartLowPoly) setSmartLowPoly(false);
    if (!c.ultraMesh && meshQ === "ultra") setMeshQ("standard");
    if (!c.texture && texOn) setTexOn(false);
    if (!c.pbr && pbrOn) setPbrOn(false);
    if (!c.tex4K && tex4K) setTex4K(false);
    if (!c.quad && quadMesh) setQuadMesh(false);
    if (!c.autoSize && autoSize) setAutoSize(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelVer]);

  /* ─── Batch file handler ──────────────────────────────────────────── */
  function handleBatchFiles(files) {
    const arr = Array.from(files).slice(0, 10 - (batchImages?.length ?? 0));
    arr.forEach(f => {
      const r = new FileReader();
      r.onload = ev => {
        const tempItem = { file: f, preview: ev.target.result, token: null };
        setBatchImages(prev => {
          const next = [...(prev ?? [])];
          if (next.length < 10) next.push(tempItem);
          return next;
        });
        handleBatchImg && handleBatchImg(f).then(token => {
          setBatchImages(prev => prev.map(i => i.file === f ? { ...i, token } : i));
        }).catch(() => { });
      };
      r.readAsDataURL(f);
    });
  }

  /* ─── Derived ─────────────────────────────────────────────────────── */
  const partsDisabled = texOn || pbrOn || quadMesh;
  const isModernModel = modelVer === "P1-20260311" || modelVer.startsWith("v3.");

  /* ─── Enhancer prompts ────────────────────────────────────────────── */
  const TRIPO_ENHANCE_PROMPT = `You are a world-class 3D concept artist and Tripo3D prompt engineer. Transform the user's raw idea into a vivid, production-ready 3D asset description that a mesh generator will interpret as a stunning model.

OUTPUT: Raw JSON ONLY: {"prompt": "...", "negative_prompt": "..."}

CREATIVE PHILOSOPHY:
- Think like a concept artist at a AAA studio. The user gives you a seed — you grow it into a fully realized design.
- INFER what the user is imagining but didn't say: if they say "warrior", you decide the era, armor style, weapon wear, battle damage, cultural influence.
- Every keyword should paint a picture of FORM and SURFACE — what would a sculptor see?

PROMPT STRUCTURE (in this order):
1. CHARACTER NAME (verbatim if given) + GENDER ("male"/"female"/"neutral") as separate early tokens
2. ARCHETYPE/ROLE: what this character IS (e.g., "battle-hardened samurai", "cyberpunk street medic")
3. BODY: Use direct tags — chest, stomach, waist, hips, butt, shoulders, arms, legs, thighs. Shape words like "big chest", "wide hips", "round butt", "muscular arms", "thick thighs" are ENCOURAGED when fitting.
4. FACE/HEAD: facial structure, expression, hair (style + texture + length), ears, jaw shape
5. OUTFIT: each garment piece separately with material + condition (pristine/weathered/battle-worn/patched)
6. DESIGN LANGUAGE: hard-surface vs organic, panel lines vs flowing curves, geometric vs asymmetric, chunky vs sleek
7. MATERIAL STORY: surfaces tell history — scratched metal means combat, worn leather means journey, clean fabric means status
8. COLOR PALETTE: 2-3 dominant colors by name (obsidian black, burnt sienna, arctic white) — no hex/RGB

HARD RULES:
- ONE model only. Never pairs/duos.
- Comma-separated keywords — no sentences, no conjunctions. MAX 850 chars.
- ALWAYS end with: "full body head to toe, complete figure, full legs and feet visible, neutral A-pose, standing on ground plane, natural skin texture, matte finish, non-waxy"
- OMIT: lighting, background, camera, render engine names, "photorealistic", "highly detailed", "4K", "CGI"

NSFW FILTER (Tripo rejects explicit content):
- SAFE: big chest, round butt, wide hips, curvy, muscular, slim, thick thighs, toned stomach — these are geometry.
- BLOCK: nudity, genitalia, sexual poses, "naked/nude/topless/exposed/see-through", fetish terms. Replace with minimal clothing (tank top, bodysuit, shorts).
- Pure NSFW requests → output a neutral character in default outfit.

NEGATIVE PROMPT (MAX 250 chars):
floating objects, disconnected parts, extra limbs, missing limbs, cut-off torso, background scenery, fused fingers, duplicate model, two figures, melted features, wax skin, plastic doll, NSFW, nudity`;

  const TRIPO_SUPER_ENHANCE_PROMPT = `You are an elite 3D character technical artist and Tripo3D prompt engineer. Transform the user's idea into the most detailed, production-quality 3D asset description possible — adding construction-level detail a concept artist would specify in a final character sheet.

OUTPUT: Raw JSON ONLY: {"prompt": "...", "negative_prompt": "..."}

CREATIVE PHILOSOPHY:
- You are the final step before a model goes into production. Every surface, seam, and silhouette choice must be intentional.
- INFER the full design from minimal input — if user says "knight", you decide: plate armor era (Gothic/Maximilian/fantasy), damage history, heraldry hints, under-armor layering, gauntlet articulation style.
- Think in LAYERS: skin → undergarments → base clothing → armor/accessories → weathering/storytelling

PROMPT STRUCTURE (in this order):
1. CHARACTER NAME (verbatim) + GENDER ("male"/"female"/"neutral")
2. ARCHETYPE with a twist — don't be generic ("frost-scarred Viking shieldmaiden" not just "Viking woman")
3. BODY: chest, stomach, waist, hips, butt, shoulders, arms, legs, thighs — with shape (big chest, wide hips, round butt, muscular arms are ENCOURAGED)
4. FACE: bone structure, expression micro-detail, skin condition (scars, freckles, laugh lines), hair physics
5. OUTFIT (layer by layer, inside out): fabric weight, drape behavior, tension points, seam routing, closure type (buckles/laces/clasps)
6. HARD-SURFACE: panel flow direction, edge bevels, rivet patterns, hinge mechanisms, surface finish (anodized/brushed/hammered)
7. ORGANIC SURFACES: pore density variation (coarse on arms, fine on cheeks), vein topology on hands, knuckle wrinkle depth, nail shape
8. MATERIAL NARRATIVE: each surface tells a micro-story — polished brass = ceremonial, scratched steel = combat veteran, frayed cloth = long journey
9. COLOR PALETTE: 2-4 named colors with material context (ash-grey weathered steel, deep burgundy dyed leather)

CONSTRUCTION DETAILS TO ADD:
- Fabric: weave pattern, thread direction, seam reinforcement, button/rivet material, wear-fade zones, hem finishing
- Leather: tanning type (vegetable/chrome), grain direction, tooling patterns, dye penetration depth, flex cracking at joints
- Metal: forging marks, heat treatment color bands, weld bead visibility, patina distribution, reflection sharpness
- Hair: strand diameter variation, root lift, flyaway density, part line definition, texture gradient wet-to-dry
- Skin: sub-surface scatter zones (ears, fingertips, nose), callus mapping (palms, heels), micro-expression wrinkle map

HARD RULES:
- ONE model only. Comma-separated keywords. MAX 850 chars.
- ALWAYS end with: "full body head to toe, complete figure, full legs and feet visible, neutral A-pose, standing on ground plane, natural skin texture, matte finish, non-waxy"
- OMIT: lighting, background, camera, render engines, filler adjectives

NSFW FILTER (Tripo rejects explicit content):
- SAFE: big chest, round butt, wide hips, curvy, muscular, slim, thick thighs — geometry descriptors.
- BLOCK: nudity, genitalia, sexual poses, "naked/nude/topless/exposed/see-through", fetish terms. Replace with minimal clothing.
- Pure NSFW → neutral character in default clothing.

NEGATIVE PROMPT (MAX 250 chars):
floating objects, disconnected parts, extra limbs, missing limbs, cut-off torso, background scenery, fused fingers, duplicate model, two figures, melted features, wax skin, plastic doll, NSFW, nudity`;

  const TRIPO_SIMPLIFY_PROMPT = `You are a 3D model prompt engineer.
The user gives you a long or complex prompt. Simplify it to a clear, concise English description under 200 characters, keeping the essential object and style.
Respond ONLY with plain text, no JSON, no explanation.`;

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 3, padding: "4px", background: "rgba(255,255,255,0.05)", borderRadius: 13, marginBottom: 14, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)" }}>
        {GEN_TABS.map(t => {
          const tabCap = { image: true, text: true, multi: caps.multiview, batch: caps.batch };
          const disabled = !tabCap[t.id];
          return (
            <button
              key={t.id}
              className={"tp-inp-tab" + (genTab === t.id ? " active" : "") + (disabled ? " model-na" : "")}
              onClick={() => {
                if (!disabled) {
                  setGenTab(t.id);
                  // P1-20260311 consistently fails for text_to_model ("Failed to call LLM API").
                  // Auto-switch to v3.1 when user selects text tab with P1.
                  if (t.id === "text" && modelVer === "P1-20260311") {
                    setModelVer("v3.1-20260211");
                  }
                }
              }}
              title={disabled ? `Not available with ${modelVer}` : t.tip}
              style={{
                color: genTab === t.id ? "#0a0a1a" : "#4a4a68",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <t.icon style={{ width: 15, height: 15 }} />
            </button>
          );
        })}
      </div>

      {/* ── Text tab ── */}
      {genTab === "text" && (
        <>
          {/* Style prefix buttons */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ color: "#4a4a68", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Style
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {STYLE_PREFIX.map(s => {
                const active = activeStyles === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onStyleToggle(s.id)}
                    title={s.prefix}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "7px 13px", borderRadius: 11,
                      fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      border: active ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.06)",
                      background: active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.035)",
                      color: active ? "#b5b0ff" : "#5a5a78",
                      transition: "all 0.15s ease",
                      fontFamily: "'SF Pro Text', system-ui, sans-serif",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Enhancer
            value={prompt}
            onChange={val => { setPrompt(val); setErrorMsg?.(""); }}
            onNegativeChange={setNegPrompt}
            onSubmit={() => canGen && handleGen()}
            color="#6c63ff"
            getIdToken={getIdToken}
            enhancing_prompt={TRIPO_ENHANCE_PROMPT}
            super_enhancing_prompt={TRIPO_SUPER_ENHANCE_PROMPT}
            dechanting_prompt={TRIPO_SIMPLIFY_PROMPT}
            onBusyChange={() => { }}
            stylePrefix={activeStyles ? (STYLE_PREFIX.find(s => s.id === activeStyles)?.prefix ?? '') : ''}
          />

          {/* T-Pose toggle */}
          <Na unsupported={!caps.tPose} tip={`T-Pose not supported by ${modelVer}`}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                gap: 6, cursor: caps.tPose ? "pointer" : "not-allowed",
                marginTop: -8, marginBottom: 10,
              }}
              onClick={() => caps.tPose && setTPose(v => !v)}
            >
              <span style={{ color: tPose && caps.tPose ? "#a5a0ff" : "#4a4a68", fontSize: 11, fontWeight: 600 }}>T-Pose</span>
              <div className={"tp-switch" + (tPose && caps.tPose ? " on" : "")}
                style={{ width: 28, height: 16, background: tPose && caps.tPose ? "#6c63ff" : "rgba(255,255,255,0.12)" }} />
            </div>
          </Na>
        </>
      )}

      {/* ── Negative prompt — shown for all tabs that support it ─────────
       *  FIX: was inside {genTab === "text" && ...} so image/multi/batch
       *  users could never set it even though the API supports it.
       * ─────────────────────────────────────────────────────────────────── */}
      <Na unsupported={!caps.negPrompt} tip={`Negative prompt not supported by ${modelVer}`}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ color: "#4a4a68", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>
            Negative Prompt
          </label>
          <textarea
            className="tp-ta"
            placeholder={caps.negPrompt ? "Negative prompt (optional)…" : "Not supported by this model"}
            value={negPrompt}
            onChange={e => caps.negPrompt && setNegPrompt(e.target.value.slice(0, 250))}
            rows={2}
            disabled={!caps.negPrompt}
            maxLength={250}
            style={{
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
              background: "rgba(255,255,255,0.03)", fontSize: 11, resize: "none", width: "100%",
              boxSizing: "border-box", padding: "8px 11px",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 3 }}>
            <span style={{
              fontSize: 10,
              color: negPrompt.length > 225 ? (negPrompt.length >= 250 ? "#ef4444" : "#f59e0b") : "#6b6b8a",
            }}>
              {negPrompt.length}/250
            </span>
          </div>
        </div>
      </Na>

      {/* ── Multi-view tab ── */}
      {genTab === "multi" && (
        <div style={{ border: "1.5px solid rgba(139,92,246,0.3)", borderRadius: 14, overflow: "hidden", background: "rgba(139,92,246,0.03)", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <div className="mv-grid">
            {MV_SLOTS.map((slot, i) => {
              const prev = multiImages?.[i]?.preview;
              return (
                <div key={slot} className="mv-cell checker"
                  onClick={() => {
                    const inp = document.createElement("input");
                    inp.type = "file"; inp.accept = "image/*";
                    inp.onchange = e => {
                      const f = e.target.files[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = ev => {
                          const next = [...(multiImages ?? [])];
                          next[i] = { file: f, preview: ev.target.result, token: null };
                          setMultiImages(next);
                          handleMultiImg && handleMultiImg(f).then(token => {
                            setMultiImages(prev => {
                              const updated = [...prev];
                              if (updated[i]) updated[i] = { ...updated[i], token };
                              return updated;
                            });
                          }).catch(() => { });
                        };
                        r.readAsDataURL(f);
                      }
                    };
                    inp.click();
                  }}>
                  <div style={{ position: "absolute", top: 5, left: 5, zIndex: 2 }}><CoinIcon size={13} /></div>
                  {prev ? (
                    <img src={prev} alt={slot} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                  ) : (
                    <>
                      <PersonStanding style={{ width: 20, height: 20, color: "#2d2d48" }} />
                      <span style={{ color: "#2d2d48", fontSize: 10, fontWeight: 500 }}>{slot}</span>
                      <span style={{ color: "#1a1a30", fontSize: 9 }}>JPG, PNG, WEBP, Size ≤ 20MB</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Image tab ── */}
      {genTab === "image" && (
        <div
          className="tp-drop checker"
          onClick={() => !imgUploading && fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImg(f); }}
          style={{
            width: "100%", aspectRatio: "1/1", borderRadius: 14,
            border: "1.5px dashed rgba(255,255,255,0.08)",
            cursor: imgUploading ? "wait" : "pointer", overflow: "hidden",
            marginBottom: 14, position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          {imgPrev ? (
            <>
              <img src={imgPrev} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {imgUploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(9,9,18,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 style={{ width: 24, height: 24, color: "#6c63ff" }} className="anim-spin" />
                </div>
              )}
              {imgToken && (
                <div style={{ position: "absolute", bottom: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check style={{ width: 12, height: 12, color: "#fff" }} />
                </div>
              )}
              <button onClick={e => { e.stopPropagation(); setImgPrev(null); setImgToken(null); setImgFile(null); if (fileRef?.current) fileRef.current.value = ""; }}
                style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <X style={{ width: 11, height: 11 }} />
              </button>
            </>
          ) : (
            <div style={{ textAlign: "center", pointerEvents: "none" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 9px" }}>
                <Upload style={{ width: 18, height: 18, color: "#2d2d48" }} />
              </div>
              <p style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Upload</p>
              <p style={{ color: "#2d2d48", fontSize: 10, margin: 0 }}>JPG, PNG, WEBP  Size ≤ 20MB</p>
            </div>
          )}
        </div>
      )}

      {/* ── Batch tab ── */}
      {genTab === "batch" && (
        <div style={{ marginBottom: 14 }}>
          <div
            className="tp-drop checker"
            style={{
              width: "100%", aspectRatio: "1/1", borderRadius: 12,
              border: "1.5px dashed rgba(108,99,255,0.35)",
              background: "rgba(108,99,255,0.04)",
              cursor: "pointer", overflow: "hidden", position: "relative",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            }}
            onClick={() => batchInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleBatchFiles(e.dataTransfer.files); }}
          >
            <div style={{ position: "absolute", top: 8, left: 8, zIndex: 2 }}><CoinIcon size={16} /></div>
            <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
              <Lightbulb style={{ width: 16, height: 16, color: "#4a4a68" }} />
            </div>
            {batchImages && batchImages.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, width: "100%", height: "100%", padding: 8, boxSizing: "border-box" }}>
                {batchImages.map((img, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: "1/1" }}>
                    <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      onClick={e => { e.stopPropagation(); setBatchImages(prev => prev.filter((_, idx) => idx !== i)); }}
                      style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X style={{ width: 9, height: 9, color: "#fff" }} />
                    </button>
                  </div>
                ))}
                {batchImages.length < 10 && (
                  <div style={{ borderRadius: 6, border: "1.5px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1/1", cursor: "pointer" }}>
                    <Upload style={{ width: 14, height: 14, color: "#4a4a68" }} />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Upload style={{ width: 18, height: 18, color: "#2d2d48" }} />
                </div>
                <p style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 600, margin: 0 }}>Upload — up to 10</p>
                <p style={{ color: "#2d2d48", fontSize: 10, margin: 0 }}>JPG, PNG, WEBP  Size ≤ 20MB</p>
              </>
            )}
          </div>
          {batchImages && batchImages.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ color: "#4a4a68", fontSize: 11 }}>{batchImages.length}/10 images</span>
              <button onClick={() => setBatchImages([])} style={{ color: "#f87171", fontSize: 11, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Clear all</button>
            </div>
          )}
          <input ref={batchInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: "none" }}
            onChange={e => { if (e.target.files) handleBatchFiles(e.target.files); }} />
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImg(f); }} />

      {/* ── Make Image Better ── */}
      {TABS_WITH_MAKE_BETTER.has(genTab) && (
        <Na unsupported={!caps.makeBetter} tip={`Make Image Better not supported by ${modelVer}`}>
          <Toggle label="Make Image Better" value={makeBetter} onChange={setMakeBetter} hint disabled={!caps.makeBetter} />
        </Na>
      )}
      {TABS_WITH_MAKE_BETTER.has(genTab) && makeBetter && caps.makeBetter && (
        <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 6px", lineHeight: 1.5 }}>
          AI optimizes the input image before generation. Slower but may improve quality.
        </p>
      )}

      {/* ── Mesh Quality ── */}
      <div style={{ margin: "14px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Mesh Quality</span>
        <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
        {/* Ultra — model-na when not supported */}
        <Na unsupported={!caps.ultraMesh} tip={`Ultra quality not supported by ${modelVer} — requires P1-20260311 or v3.x`}>
          <button
            className="tp-qual-btn"
            onClick={() => caps.ultraMesh && setMeshQ("ultra")}
            title={caps.ultraMesh ? "geometry_quality: detailed" : `Requires P1-20260311 or v3.x`}
            style={{
              background: meshQ === "ultra" && caps.ultraMesh ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
              color: meshQ === "ultra" && caps.ultraMesh ? "#a5a0ff" : "#3d3d5a",
              outline: meshQ === "ultra" && caps.ultraMesh ? "1.5px solid rgba(108,99,255,0.4)" : "1.5px solid rgba(255,255,255,0.07)",
              cursor: caps.ultraMesh ? "pointer" : "not-allowed",
            }}>
            <CoinIcon size={14} />Ultra
          </button>
        </Na>
        {/* Standard — always available */}
        <button
          className="tp-qual-btn"
          onClick={() => setMeshQ("standard")}
          title="geometry_quality: standard"
          style={{
            background: meshQ === "standard" || !caps.ultraMesh ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
            color: meshQ === "standard" || !caps.ultraMesh ? "#a5a0ff" : "#3d3d5a",
            outline: meshQ === "standard" || !caps.ultraMesh ? "1.5px solid rgba(108,99,255,0.4)" : "1.5px solid rgba(255,255,255,0.07)",
          }}>
          Standard
        </button>
      </div>
      {meshQ === "ultra" && !caps.ultraMesh && (
        <p style={{ color: "#f5c518", fontSize: 10, margin: "2px 0 4px", lineHeight: 1.5 }}>
          Ultra quality requires P1-20260311 or v3.x model.
        </p>
      )}

      {/* ── Generate in Parts ── */}
      <Na unsupported={!caps.inParts} tip={`Generate in Parts not supported by ${modelVer}`}>
        <Toggle
          label="Generate in Parts"
          value={inParts}
          onChange={setInParts}
          hint premium
          disabled={partsDisabled || !caps.inParts}
        />
      </Na>
      {partsDisabled && caps.inParts && (
        <p style={{ color: "#f87171", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
          Generate in Parts requires Texture off, PBR off, and Triangle topology.
        </p>
      )}

      {/* ── Privacy ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Privacy</span>
          <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
        </div>
        <button onClick={() => setPrivacy(v => v === "public" ? "private" : "public")}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", color: "#8a8aaa", fontSize: 12, fontWeight: 500, fontFamily: "inherit" }}>
          {privacy === "public" ? <Globe style={{ width: 12, height: 12 }} /> : <Lock style={{ width: 12, height: 12 }} />}
          {privacy === "public" ? "Public" : "Private"}
          <ChevronDown style={{ width: 10, height: 10 }} />
        </button>
      </div>

      {/* ── Texture ── */}
      <Na unsupported={!caps.texture} tip={`Texture not supported by ${modelVer}`}>
        <Toggle label="Texture" value={texOn && caps.texture} onChange={v => caps.texture && setTexOn(v)} disabled={!caps.texture} />
      </Na>

      <Collapsible label="Texture Settings">
        <div style={{ display: "flex", flexDirection: "column" }}>

          {/* 4K Texture */}
          <Na unsupported={!caps.tex4K} tip={`4K Texture not supported by ${modelVer}`}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 0",
                cursor: (texOn || pbrOn) && caps.tex4K ? "pointer" : "not-allowed",
                opacity: (texOn || pbrOn) && caps.tex4K ? 1 : 0.4,
              }}
              onClick={() => (texOn || pbrOn) && caps.tex4K && setTex4K(v => !v)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <CoinIcon size={14} />
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>4K Texture</span>
                <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
              </div>
              <div className={"tp-switch" + (tex4K && (texOn || pbrOn) && caps.tex4K ? " on" : "")}
                style={{ background: tex4K && texOn && caps.tex4K ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
            </div>
          </Na>
          {tex4K && (texOn || pbrOn) && caps.tex4K && (
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              texture_quality: "HD" — higher resolution, slower generation.
            </p>
          )}

          {/* PBR */}
          <Na unsupported={!caps.pbr} tip={`PBR not supported by ${modelVer}`}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 0",
                cursor: texOn && caps.pbr ? "pointer" : "not-allowed",
                opacity: (texOn || pbrOn) && caps.pbr ? 1 : 0.4,
              }}
              onClick={() => texOn && caps.pbr && setPbrOn(v => !v)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>PBR</span>
                <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
              </div>
              <div className={"tp-switch" + (pbrOn && texOn && caps.pbr ? " on" : "")}
                style={{ background: pbrOn && texOn && caps.pbr ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
            </div>
          </Na>
          {pbrOn && texOn && caps.pbr && (
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              Generates albedo, normal, roughness & metallic maps. Overrides texture=true.
            </p>
          )}
        </div>
      </Collapsible>

      {/* ── Topology Settings ── */}
      <Collapsible label="Topology Settings" border={false}>
        <TopoControls
          quad={quadMesh} setQuad={setQuadMesh}
          smartLowPoly={smartLowPoly} setSmartLowPoly={setSmartLowPoly}
          polycount={polycount} setPolycount={setPolycount}
          capsQuad={caps.quad}
          capsSmartLowPoly={caps.smartLowPoly}
        />
      </Collapsible>

      {/* ── Advanced Settings ── */}
      <Collapsible label="Advanced Settings" border={false}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* model_seed */}
          <Na unsupported={!caps.modelSeed} tip={`Model Seed not supported by ${modelVer}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Model Seed</span>
                <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
              </div>
              <input
                type="number" min="0" placeholder="Random"
                value={modelSeed ?? ""}
                onChange={e => caps.modelSeed && setModelSeed(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                disabled={!caps.modelSeed}
                className="tp-input"
                style={{ width: 90, textAlign: "right", fontSize: 11, padding: "4px 8px" }}
              />
            </div>
          </Na>

          {/* image_seed */}
          <Na unsupported={!caps.imageSeed} tip={`Image Seed not supported by ${modelVer}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Image Seed</span>
                <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
              </div>
              <input
                type="number" min="0" placeholder="Random"
                value={imageSeed ?? ""}
                onChange={e => caps.imageSeed && setImageSeed(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                disabled={!caps.imageSeed}
                className="tp-input"
                style={{ width: 90, textAlign: "right", fontSize: 11, padding: "4px 8px" }}
              />
            </div>
          </Na>

          {/* texture_seed */}
          {(texOn || pbrOn) && (
            <Na unsupported={!caps.textureSeed} tip={`Texture Seed not supported by ${modelVer}`}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Texture Seed</span>
                  <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
                </div>
                <input
                  type="number" min="0" placeholder="Random"
                  value={textureSeed ?? ""}
                  onChange={e => caps.textureSeed && setTextureSeed(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  disabled={!caps.textureSeed}
                  className="tp-input"
                  style={{ width: 90, textAlign: "right", fontSize: 11, padding: "4px 8px" }}
                />
              </div>
            </Na>
          )}

          {/* auto_size */}
          <Na unsupported={!caps.autoSize} tip={`Auto Size not supported by ${modelVer}`}>
            <Toggle label="Auto Size" value={autoSize && caps.autoSize} onChange={v => caps.autoSize && setAutoSize(v)} hint disabled={!caps.autoSize} />
          </Na>
          {autoSize && caps.autoSize && (
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              Scales the model to real-world dimensions (meters).
            </p>
          )}

          {/* export_uv */}
          <Toggle label="Export UV" value={exportUv} onChange={setExportUv} hint />
          {!exportUv && (
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              Skips UV unwrap during generation — faster & smaller file. UV added at texturing stage.
            </p>
          )}

        </div>
      </Collapsible>

      {/* ── AI Model ── */}
      <ModelDropdown modelVer={modelVer} setModelVer={setModelVer} />
    </>
  );
}