// trellis/GeneratePanel.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Image, Boxes, Grid3x3, Pencil, HelpCircle, Upload, Check, X,
  Loader2, Globe, Lock, ChevronDown, PersonStanding, Zap, Images, Lightbulb,
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

/* ─── Model versions — real Tripo API strings ─────────────────────────────
 *
 *  P1-20260311              → Latest Model, prémium minőség
 *  v3.1-20260211     → V3.1, kiváló minőség
 *  v3.0-20250812     → V3.0, Ultra mód (geometry_quality), akár 2M polygon
 *  v2.5-20250123     → gyors & kiegyensúlyozott (~25-30s)
 *  Turbo-v1.0-20250506 → leggyorsabb prototipizálás (~5-10s)
 *  v1.4-20240625     → Fastest (lapos árazás: text=20, image=30)
 * ─────────────────────────────────────────────────────────────────────── */
export const MODEL_VERSIONS = [
  { id: "P1-20260311",                   label: "P1-20260311 (Latest Model)"    },
  { id: "v3.1-20260211",          label: "V3.1"                   },
  { id: "v3.0-20250812",          label: "V3.0"                   },
  { id: "v2.5-20250123",          label: "V2.5"                   },
  { id: "Turbo-v1.0-20250506",    label: "Turbo V1.0"             },
  { id: "v2.0-20240919",          label: "V2.0"                   },
  { id: "v1.4-20240625",          label: "V1.4 (Fastest Model)"   },
];

/* ─── API face_limit constraints (official Tripo docs) ───────────────────
 *
 *  smart_low_poly=false, quad=false  → Auto (adaptive), max 500 000, step 5 000
 *  smart_low_poly=false, quad=true   → Auto defaults to 10 000; max 100 000, step 1 000
 *  smart_low_poly=true,  quad=false  → required: 1 000 – 20 000, step 1 000
 *  smart_low_poly=true,  quad=true   → required:   500 – 10 000, step   500
 *
 *  When smart_low_poly is ON the API requires a value in the stated range —
 *  "Auto" (0) is NOT valid; the slider minimum is forced to the lower bound.
 *
 *  For Retopo panel (smart_low_poly task type) the same ranges apply.
 * ─────────────────────────────────────────────────────────────────────── */
export function getFaceLimitConfig(smartLowPoly, quad) {
  if (smartLowPoly && quad) return { min: 500, max: 10_000, step: 500, defaultVal: 5_000, allowAuto: false };
  if (smartLowPoly && !quad) return { min: 1_000, max: 20_000, step: 1_000, defaultVal: 8_000, allowAuto: false };
  if (!smartLowPoly && quad) return { min: 0, max: 100_000, step: 1_000, defaultVal: 10_000, allowAuto: true };
  /* triangle, no smart_low_poly */
  return { min: 0, max: 500_000, step: 5_000, defaultVal: 0, allowAuto: true };
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
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 }}
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
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: border && open ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}>
        <span style={{ color: "#4a4a68", fontSize: 13, fontWeight: 500 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {extra}
          {open
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d2d48" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d2d48" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>}
        </div>
      </div>
      {open && <div style={{ padding: "10px 0 2px", animation: "fadeUp 0.15s ease" }}>{children}</div>}
    </div>
  );
}

/* ─── TopoControls ────────────────────────────────────────────────────── */
function TopoControls({ quad, setQuad, smartLowPoly, setSmartLowPoly, polycount, setPolycount }) {
  const cfg = getFaceLimitConfig(smartLowPoly, quad);
  const [localVal, setLocalVal] = React.useState(() => Math.max(cfg.min, polycount));

  React.useEffect(() => {
    setLocalVal(Math.max(cfg.min, polycount));
  }, [polycount]); // eslint-disable-line

  function handleSetQuad(val) {
    setQuad(val);
    const next = getFaceLimitConfig(smartLowPoly, val);
    const reset = next.allowAuto ? 0 : next.defaultVal;
    setPolycount(reset);
    setLocalVal(reset);
  }
  function handleSetSmartLowPoly(val) {
    setSmartLowPoly(val);
    const next = getFaceLimitConfig(val, quad);
    const reset = next.allowAuto ? 0 : next.defaultVal;
    setPolycount(reset);
    setLocalVal(reset);
  }

  function commit(raw) {
    const v = isNaN(raw) ? cfg.min : Math.max(cfg.min, Math.min(cfg.max, raw));
    setLocalVal(v);
    setPolycount(v);
  }

  const showAuto = cfg.allowAuto && localVal === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

      {/* Smart Low Poly */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", cursor: "pointer" }}
        onClick={() => handleSetSmartLowPoly(!smartLowPoly)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <CoinIcon />
          <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Smart Low Poly</span>
          <span style={{ background: "linear-gradient(135deg,#c026d3,#a21caf)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4 }}>v2</span>
          <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
        </div>
        <div className={"tp-switch" + (smartLowPoly ? " on" : "")}
          style={{ background: smartLowPoly ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
      </div>

      {/* Smart Low Poly info note */}
      {smartLowPoly && (
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
        <button className={"tp-topo-btn" + (quad ? " sel" : "")} onClick={() => handleSetQuad(true)}>Quad</button>
        <button className={"tp-topo-btn" + (!quad ? " sel" : "")} onClick={() => handleSetQuad(false)}>Triangle</button>
      </div>

      {/* Face Limit / Polycount */}
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
            type="range"
            min={cfg.min} max={cfg.max} step={cfg.step}
            value={localVal}
            onChange={e => setLocalVal(Number(e.target.value))}
            onMouseUp={e => commit(Number(e.target.value))}
            onTouchEnd={e => commit(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#6c63ff" }}
          />
          <input
            type="number"
            min={cfg.min} max={cfg.max} step={cfg.step}
            value={showAuto ? "" : localVal}
            placeholder={cfg.allowAuto ? "Auto" : String(cfg.defaultVal)}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              commit(isNaN(v) ? cfg.min : v);
            }}
            style={{
              width: 80, padding: "5px 8px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)", color: "#c8c8e0",
              fontSize: 12, fontFamily: "monospace", outline: "none",
              textAlign: "center", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Contextual hint */}
        <p style={{ color: "#4a4a68", fontSize: 10, margin: "5px 0 0", lineHeight: 1.5 }}>
          {showAuto && "Auto — model adaptively determines optimal face count"}
          {!showAuto && smartLowPoly && quad && "Quad smart-low-poly: 500 – 10 000 faces (required)"}
          {!showAuto && smartLowPoly && !quad && "Smart-low-poly: 1 000 – 20 000 faces (required)"}
          {!showAuto && !smartLowPoly && quad && "Quad: default 10 000 when unset"}
          {!showAuto && !smartLowPoly && !quad && `${localVal.toLocaleString()} faces`}
        </p>

        {/* Quad incompatibility warning */}
        {quad && (
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
    // v3.0 star
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a5a0ff" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>,
    // v2.5 zap
    <Zap width={13} height={13} color="#a5a0ff" />,
    // Turbo zap double
    <Zap width={13} height={13} color="#f5c518" />,
  ];

  return (
    <div style={{ marginTop: 14, position: "relative" }}>
      <span style={{ color: "#4a4a68", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>AI Model</span>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
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
          borderRadius: 10, overflow: "hidden", zIndex: 50,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
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

/* ─── GeneratePanel ───────────────────────────────────────────────────── */
export default function GeneratePanel({
  genTab, setGenTab,
  prompt, setPrompt,
  makeBetter, setMakeBetter,       // enable_image_autofix
  imgPrev, imgToken, imgUploading, handleImg, fileRef,
  multiImages, setMultiImages,
  batchImages, setBatchImages,
  meshQ, setMeshQ,                 // "ultra" → geometry_quality:"detailed" for P1-20260311 / v3.x
  inParts, setInParts,             // generate_parts
  privacy, setPrivacy,
  texOn, setTexOn,                 // texture (bool)
  tex4K, setTex4K,                 // texture_quality: "HD" vs "detailed"
  pbrOn, setPbrOn,                 // pbr (bool)
  quadMesh, setQuadMesh,           // quad (bool)
  smartLowPoly, setSmartLowPoly,   // smart_low_poly (bool) at generation time
  polycount, setPolycount,         // face_limit
  modelVer, setModelVer,           // model_version API string
  isRunning,
  canGen,
  handleGen,
    negPrompt, setNegPrompt,
  getIdToken,
  // A GeneratePanel function paramétereibe INSERT (a handleImg után):
  handleMultiImg,   // NEW: (file) => Promise<token>
  handleBatchImg,   // NEW: (file) => Promise<token>
  setErrorMsg,
tPose, setTPose,
  // Advanced params
  modelSeed, setModelSeed,
  textureSeed, setTextureSeed,
  imageSeed, setImageSeed,
  autoSize, setAutoSize,
  exportUv, setExportUv,
}) {
  const MV_SLOTS = ["Front", "Left", "Right", "Back"];
  const batchInputRef = useRef(null);

  // V1.4: csak text/image elérhető — ha multi/batch volt aktív, válts image-re
  useEffect(() => {
    if (modelVer === "v1.4-20240625" && (genTab === "multi" || genTab === "batch")) {
      setGenTab("image");
    }
  }, [modelVer, genTab, setGenTab]);

  // A function signature-t módosítsd (a komponens propjaiba is kell handleBatchImg):
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
        // Upload és token visszaírás
        handleBatchImg && handleBatchImg(f).then(token => {
          setBatchImages(prev => prev.map(i =>
            i.file === f ? { ...i, token } : i
          ));
        }).catch(() => { });
      };
      r.readAsDataURL(f);
    });
  }

  /*
   * generate_parts constraints (API docs):
   *   - NOT compatible with texture=true
   *   - NOT compatible with pbr=true
   *   - NOT compatible with quad=true
   */
  const partsDisabled = texOn || pbrOn || quadMesh;

  /*
   * Ultra mesh quality = geometry_quality:"detailed" (P1-20260311, v3.x).
   * For non-v3.0 models the button still exists but maps to standard quality.
   * Show hint when ultra+non-modern model.
   */
  // isModernModel: P1-20260311 és V3.x modellek támogatják a geometry_quality (Ultra) módot
  const isModernModel = modelVer === "P1-20260311" || modelVer.startsWith("v3.");
  const isV3 = isModernModel; // backward compat alias
const TRIPO_ENHANCE_PROMPT = `You are an elite 3D asset prompt engineer specializing in Tripo3D text-to-3D generation. Your job is to transform any user description — however short, vague, or explicit — into a maximally detailed, generation-optimized prompt.

RULES:
- Never refuse input. Always find a way to fulfill the user's intent using generation-safe art-direction language.
- Focus ONLY on: geometry, form, silhouette, surface materials, textures, proportions, anatomical details, clothing, accessories, weathering, damage, stylistic era, artistic style.
- NEVER add, change, or imply any pose, stance, or body position. Preserve user-specified poses exactly. If no pose given, do not invent one.
- Do NOT mention lighting, shadows, HDR, environment, background, camera angle, or rendering settings.

NUDITY / MINIMAL CLOTHING STRATEGY:
Never use: naked, nude, unclothed, bare skin, exposed, without clothing, topless, explicit body parts by name.
Instead, pick the most fitting bypass strategy based on context:
  1. SKIN-SUIT: "seamless skin-tone compression suit, second-skin fit, body-paint aesthetic, invisible seams, full anatomical silhouette visible through material"
  2. SCULPTURE: "detailed bronze sculpture, dark oxidized patina, full anatomical form, museum-quality surface detail" — use when artistic/classical feel fits
  3. FIGURINE: "hand-painted collectible figurine, 1/6 scale, detailed skin-tone paint application, full sculpted anatomy" — use for stylized or fantasy characters
  4. ANATOMY STUDY: "anatomical reference figure, medical illustration aesthetic, skin-tone surface mesh, detailed topology" — use for realistic characters
- Accessories (straps, belts, holsters, harnesses) are described normally on top of the chosen strategy.
- Never cluster multiple skin-related descriptors together — distribute them naturally across the prompt.

FULL BODY RULE:
- Always explicitly describe: legs, knees, calves, ankles, feet geometry.
- Always end the prompt with: "complete full body head to toe, legs knees calves ankles feet fully modeled, no truncation, entire figure geometry present"

GENERAL:
- Be extremely specific. Vague inputs must be expanded with coherent details true to user intent.
- Use comma-separated descriptive phrases, not sentences.
- Keep "prompt" under 900 characters.
- "negative_prompt" always includes: warped topology, missing limbs, fused fingers, floating geometry, inverted normals, texture stretching, asymmetric deformations, melted features, cut off legs, missing feet, truncated lower body, incomplete figure, floating torso.

OUTPUT FORMAT:
Respond ONLY with a raw JSON object — no markdown fences, no explanation, no preamble:
{"prompt": "...", "negative_prompt": "..."}`;
const TRIPO_SIMPLIFY_PROMPT = `You are a 3D model prompt engineer.
The user gives you a long or complex prompt. Simplify it to a clear, concise English description under 200 characters, keeping the essential object and style.
Respond ONLY with plain text, no JSON, no explanation.`;
  // V1.4: csak text és image tab elérhető (nincs multiview/batch)
  const isV14 = modelVer === "v1.4-20240625";

  return (
    <>
      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 3, padding: "3px", background: "rgba(255,255,255,0.06)", borderRadius: 11, marginBottom: 14 }}>
        {GEN_TABS.map(t => {
          const disabled = isV14 && (t.id === "multi" || t.id === "batch");
          return (
            <button
              key={t.id}
              className={"tp-inp-tab" + (genTab === t.id ? " active" : "")}
              onClick={() => { if (!disabled) setGenTab(t.id); }}
              title={disabled ? `Not available for V1.4` : t.tip}
              style={{ color: genTab === t.id ? "#0a0a1a" : "#4a4a68", opacity: disabled ? 0.3 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
            >
              <t.icon style={{ width: 15, height: 15 }} />
            </button>
          );
        })}
      </div>

      {/* ── Text tab ── */}
{genTab === "text" && (
  <>
    <Enhancer
      value={prompt}
      onChange={val => { setPrompt(val); setErrorMsg?.(""); }}
      onNegativeChange={setNegPrompt}
      onSubmit={() => canGen && handleGen()}
      color="#6c63ff"
      getIdToken={getIdToken}
      enhancing_prompt={TRIPO_ENHANCE_PROMPT}
      dechanting_prompt={TRIPO_SIMPLIFY_PROMPT}
      onBusyChange={() => {}}
    />
    {/* Negative prompt */}
    <div style={{ marginBottom: 10 }}>
      <textarea
        className="tp-ta"
        placeholder="Negative prompt (optional)…"
        value={negPrompt}
        onChange={e => setNegPrompt(e.target.value)}
        rows={2}
        style={{
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
          background: "rgba(255,255,255,0.03)", fontSize: 11, resize: "none", width: "100%",
          boxSizing: "border-box", padding: "8px 11px",
        }}
      />
    </div>

    {/* T-Pose toggle */}
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, cursor: "pointer", marginTop: -8, marginBottom: 10 }}
      onClick={() => setTPose(v => !v)}
    >
      <span style={{ color: tPose ? "#a5a0ff" : "#4a4a68", fontSize: 11, fontWeight: 600 }}>T-Pose</span>
      <div className={"tp-switch" + (tPose ? " on" : "")}
        style={{ width: 28, height: 16, background: tPose ? "#6c63ff" : "rgba(255,255,255,0.12)" }} />
    </div>
  </>
)}

      {/* ── Multi-view tab ── */}
      {genTab === "multi" && (
        <div style={{ border: "1.5px solid rgba(108,99,255,0.35)", borderRadius: 12, overflow: "hidden", background: "rgba(108,99,255,0.04)", marginBottom: 14 }}>
          <div className="mv-grid">
            {MV_SLOTS.map((slot, i) => {
              const prev = multiImages?.[i]?.preview;
              return (
                <div key={slot} className="mv-cell checker"
                  onClick={() => {
                    const inp = document.createElement("input");
                    inp.type = "file"; inp.accept = "image/*";
                    // REPLACE az inp.onchange-t:
                    inp.onchange = e => {
                      const f = e.target.files[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = ev => {
                          const next = [...(multiImages ?? [])];
                          next[i] = { file: f, preview: ev.target.result, token: null };
                          setMultiImages(next);
                          // Upload
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
            width: "100%", aspectRatio: "1/1", borderRadius: 12,
            border: "1.5px dashed rgba(255,255,255,0.1)",
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
              <button onClick={e => e.stopPropagation()}
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

      {/* ── Make Image Better (enable_image_autofix) — image + batch tabs only ── */}
      {TABS_WITH_MAKE_BETTER.has(genTab) && (
        <Toggle
          label="Make Image Better"
          value={makeBetter}
          onChange={setMakeBetter}
          hint
        />
      )}
      {TABS_WITH_MAKE_BETTER.has(genTab) && makeBetter && (
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
        {[
          { id: "ultra", label: "Ultra", prem: true, hint: isV3 ? "geometry_quality: detailed" : "P1-20260311 / v3.x only" },
          { id: "standard", label: "Standard", prem: false, hint: "geometry_quality: standard" },
        ].map(q => (
          <button key={q.id} className="tp-qual-btn" onClick={() => setMeshQ(q.id)}
            title={q.hint}
            style={{
              background: meshQ === q.id ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
              color: meshQ === q.id ? "#a5a0ff" : "#3d3d5a",
              outline: meshQ === q.id ? "1.5px solid rgba(108,99,255,0.4)" : "1.5px solid rgba(255,255,255,0.07)",
              opacity: q.id === "ultra" && !isV3 ? 0.5 : 1,
            }}>
            {q.prem && <CoinIcon size={14} />}{q.label}
          </button>
        ))}
      </div>
      {meshQ === "ultra" && !isV3 && (
        <p style={{ color: "#f5c518", fontSize: 10, margin: "2px 0 4px", lineHeight: 1.5 }}>
          Ultra quality requires P1-20260311 or v3.x model.
        </p>
      )}

      {/* ── Generate in Parts ── */}
      <Toggle
        label="Generate in Parts"
        value={inParts}
        onChange={setInParts}
        hint premium
        disabled={partsDisabled}
      />
      {partsDisabled && (
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
      <Toggle label="Texture" value={texOn} onChange={setTexOn} />
      <Collapsible label="Texture Settings">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* 4K Texture → texture_quality: "HD" */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", cursor: texOn ? "pointer" : "not-allowed", opacity: (texOn || pbrOn) ? 1 : 0.4
            }}
            onClick={() => (texOn || pbrOn) && setTex4K(v => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <CoinIcon size={14} />
              <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>4K Texture</span>
              <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
            </div>
            <div className={"tp-switch" + (tex4K && (texOn || pbrOn) ? " on" : "")}

              style={{ background: tex4K && texOn ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
          </div>
          {tex4K && (texOn || pbrOn) && (
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              texture_quality: "HD" — higher resolution, slower generation.
            </p>
          )}

          {/* PBR */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", cursor: texOn ? "pointer" : "not-allowed", opacity: (texOn || pbrOn) ? 1 : 0.4
            }}
            onClick={() => texOn && setPbrOn(v => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>PBR</span>
              <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
            </div>
            <div className={"tp-switch" + (pbrOn && texOn ? " on" : "")}
              style={{ background: pbrOn && texOn ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
          </div>
          {pbrOn && texOn && (
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
        />
      </Collapsible>

      {/* ── Advanced Settings ── */}
      <Collapsible label="Advanced Settings" border={false}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* model_seed */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Model Seed</span>
              <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
            </div>
            <input
              type="number" min="0" placeholder="Random"
              value={modelSeed ?? ""}
              onChange={e => setModelSeed(e.target.value === "" ? null : parseInt(e.target.value, 10))}
              className="tp-input"
              style={{ width: 90, textAlign: "right", fontSize: 11, padding: "4px 8px" }}
            />
          </div>

          {/* image_seed */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Image Seed</span>
              <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
            </div>
            <input
              type="number" min="0" placeholder="Random"
              value={imageSeed ?? ""}
              onChange={e => setImageSeed(e.target.value === "" ? null : parseInt(e.target.value, 10))}
              className="tp-input"
              style={{ width: 90, textAlign: "right", fontSize: 11, padding: "4px 8px" }}
            />
          </div>

          {/* texture_seed — csak ha textúra be van kapcsolva */}
          {(texOn || pbrOn) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Texture Seed</span>
                <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
              </div>
              <input
                type="number" min="0" placeholder="Random"
                value={textureSeed ?? ""}
                onChange={e => setTextureSeed(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                className="tp-input"
                style={{ width: 90, textAlign: "right", fontSize: 11, padding: "4px 8px" }}
              />
            </div>
          )}

          {/* auto_size */}
          <Toggle
            label="Auto Size"
            value={autoSize}
            onChange={setAutoSize}
            hint
          />
          {autoSize && (
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              Scales the model to real-world dimensions (meters).
            </p>
          )}

          {/* export_uv */}
          <Toggle
            label="Export UV"
            value={exportUv}
            onChange={setExportUv}
            hint
          />
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