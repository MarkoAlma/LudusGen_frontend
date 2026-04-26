// trellis/GeneratePanel.jsx
import React, { useState, useRef, useEffect, memo } from "react";
import {
  Image, Boxes, Grid3x3, Pencil, HelpCircle, Upload, Check, X, Plus,
  Loader2, ChevronDown, ChevronUp, PersonStanding, Zap, Images, Lightbulb,
  Camera, Box, Gamepad2, FlaskConical, Triangle, Palette, Sparkles, ToyBrick, Mountain, Dice5,
  Type, User, ChevronLeft, ChevronRight, Info,
} from "lucide-react";
import Enhancer from "../Enhancer";
import { Tooltip } from "../meshy/ui/Primitives";
import { MULTIVIEW_UPLOAD_ORDER } from "./multiviewUtils";

/* ─── Tab definitions ─────────────────────────────────────────────────── */
export const GEN_TABS = [
  { id: "image", icon: Images, label: "Image(s)", tip: "Upload 1-10 source images for high-fidelity reconstruction" },
  { id: "multi", icon: Box, label: "Multi-view", tip: "Upload Tripo views in order: Front, Left, Back, Right" },
  { id: "text", icon: Type, label: "Text", tip: "AI-driven Text-to-3D generation via descriptive prompts" },
];

/* "Make Image Better" (enable_image_autofix) only on image-based tabs */
const TABS_WITH_MAKE_BETTER = new Set(["image"]);

/* ─── Model versions — real Tripo API strings ─────────────────────────── */
export const MODEL_VERSIONS = [
  { id: "v3.1-20260211", label: "V3.1 (Latest)" },
  { id: "P1-20260311", label: "P1-20260311" },
  { id: "v3.0-20250812", label: "V3.0" },
  { id: "v2.5-20250123", label: "V2.5" },
  { id: "Turbo-v1.0-20250506", label: "Turbo V1.0" },
  { id: "v2.0-20240919", label: "V2.0" },
  { id: "v1.4-20240625", label: "V1.4 (Fastest Model)" },
];

const ORIENTATION_OPTIONS = [
  { value: "", label: "Default" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
  { value: "square", label: "Square" },
];

const COMPRESS_OPTIONS = [
  { value: "", label: "Off" },
  { value: "geometry", label: "Geometry" },
];

const MULTIVIEW_MODE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "concept", label: "Concept" },
  { value: "orthographic", label: "Orthographic" },
  { value: "character", label: "Character" },
  { value: "product", label: "Product" },
];

/* ─── Per-model capability map ───────────────────────────────────────────
 *  Defines which API parameters each model version actually accepts.
 *  UI elements receive the .model-na class (dimmed, blocked) when the
 *  currently selected model doesn't support that feature.
 * ─────────────────────────────────────────────────────────────────────── */
export const UNIVERSAL_CAPS = {
  ultraMesh: true, texture: true, pbr: true, tex4K: true,
  multiview: true, batch: true, tPose: true, inParts: true,
  negPrompt: true, smartLowPoly: true, quad: true,
  autoSize: true, exportUv: true, makeBetter: true,
  modelSeed: true, imageSeed: true, textureSeed: true,
};

export function getModelCaps() {
  return UNIVERSAL_CAPS;
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
function Na({ children }) {
  return <>{children}</>;
}

/* ─── helpers ─────────────────────────────────────────────────────────── */
function Toggle({ label, value, onChange, hint = false, disabled = false }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 0", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
      }}
      onClick={() => !disabled && onChange(!value)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>{label}</span>
        {hint && <HelpCircle style={{ width: 13, height: 13, color: "#475569" }} />}
      </div>
      <div className={"tp-switch" + (value ? " on" : "")}
        style={{ background: value ? "#2f8cff" : "rgba(255,255,255,0.12)" }} />
    </div>
  );
}

function SeedSpinner({ value, onChange, disabled = false }) {
  const handleText = (e) => {
    const v = e.target.value;
    onChange(v === "" ? null : parseInt(v, 10));
  };
  const step = (dir) => {
    if (disabled) return;
    const cur = value ?? 0;
    const next = Math.max(0, cur + dir);
    onChange(next);
  };
  return (
    <div style={{
      display: "flex", alignItems: "stretch",
      background: "var(--bg-raised)", border: "1px solid var(--border)",
      borderRadius: 8, overflow: "hidden", height: 26,
    }}>
      <input
        type="number" min="0" placeholder="Random"
        value={value ?? ""}
        onChange={handleText}
        disabled={disabled}
        style={{
          width: 72, border: "none", outline: "none", background: "transparent",
          color: "var(--text-primary)", fontSize: 11, fontFamily: "inherit",
          textAlign: "right", padding: "0 6px",
          MozAppearance: "textfield",
        }}
      />
      <div style={{
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid var(--border)",
      }}>
        <button
          type="button" onClick={() => step(1)} disabled={disabled}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: disabled ? "not-allowed" : "pointer",
            padding: "0 4px", borderBottom: "1px solid var(--border)",
            color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
            lineHeight: 1,
          }}
        >
          <ChevronUp style={{ width: 9, height: 9 }} />
        </button>
        <button
          type="button" onClick={() => step(-1)} disabled={disabled}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: disabled ? "not-allowed" : "pointer",
            padding: "0 4px",
            color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
            lineHeight: 1,
          }}
        >
          <ChevronDown style={{ width: 9, height: 9 }} />
        </button>
      </div>
    </div>
  );
}

function TripoSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value) || options[0];

  return (
    <div
      className="tp-custom-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      style={{ position: "relative" }}
    >
      <button
        type="button"
        className="tp-custom-select-trigger"
        onClick={() => setOpen(v => !v)}
      >
        <span>{selected?.label || "Default"}</span>
        <ChevronDown style={{ width: 15, height: 15, opacity: 0.78, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.16s ease" }} />
      </button>
      {open && (
        <div className="tp-custom-select-menu">
          {options.map(option => (
            <button
              key={option.value || "default"}
              type="button"
              className={"tp-custom-select-option" + (option.value === value ? " selected" : "")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
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
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>}
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
            <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Smart Low Poly</span>
            <span style={{ background: "linear-gradient(135deg,#1d4ed8,#2f8cff,#8bdcff)", color: "#02040a", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4 }}>v2</span>
            <HelpCircle style={{ width: 13, height: 13, color: "#475569" }} />
          </div>
          <div className={"tp-switch" + (smartLowPoly && capsSmartLowPoly ? " on" : "")}
            style={{ background: smartLowPoly && capsSmartLowPoly ? "#2f8cff" : "rgba(255,255,255,0.12)" }} />
        </div>
      </Na>

      {smartLowPoly && capsSmartLowPoly && (
        <div style={{ padding: "6px 9px", borderRadius: 8, background: "rgba(47,140,255,0.07)", border: "1px solid rgba(47,140,255,0.22)", display: "flex", gap: 6, marginBottom: 4, boxShadow: "0 0 18px rgba(47,140,255,0.08)" }}>
          <HelpCircle style={{ width: 11, height: 11, color: "#8bdcff", marginTop: 1, flexShrink: 0 }} />
          <p style={{ color: "#bfdbfe", fontSize: 10, margin: 0, lineHeight: 1.5 }}>
            Applied at generation time. Simple inputs work best — may fail on complex geometry.
          </p>
        </div>
      )}

      {/* Topology */}
      <div style={{ margin: "14px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Topology</span>
        <Tooltip text="Triangles are standard. Quads provide better flow for sculpting/animation but are slower to generate." side="left">
          <HelpCircle style={{ width: 13, height: 13, color: "#475569" }} />
        </Tooltip>
      </div>
      <div className="tp-flat-segment-row" style={{ display: "flex", gap: 0, marginBottom: 10 }}>
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
          <HelpCircle style={{ width: 13, height: 13, color: "#475569" }} />
          <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 9, fontFamily: "monospace" }}>
            {cfg.allowAuto ? `Auto – ${(cfg.max / 1000).toFixed(0)}k` : `${cfg.min.toLocaleString()} – ${cfg.max.toLocaleString()}`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={localVal}
            onChange={e => setLocalVal(Number(e.target.value))}
            onMouseUp={e => commit(Number(e.target.value))}
            onTouchEnd={e => commit(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#2f8cff" }}
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
        <p style={{ color: "#64748b", fontSize: 10, margin: "5px 0 0", lineHeight: 1.5 }}>
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
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8bdcff" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>,
    <Zap width={13} height={13} color="#8bdcff" />,
    <Zap width={13} height={13} color="#f5c518" />,
  ];

  return (
    <div className="tp-model-dd" style={{ marginTop: 14, position: "relative" }}>
      <span style={{ color: "#64748b", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>AI Model</span>
      <button
        className="tp-model-dd-trigger"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", minHeight: 56, padding: "11px 14px", borderRadius: 18,
          background: "linear-gradient(145deg, rgba(255,255,255,0.060), rgba(255,255,255,0.024))",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.055), 0 12px 28px rgba(0,0,0,0.16)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 13, background: "linear-gradient(145deg, rgba(47,140,255,0.24), rgba(139,220,255,0.10))", boxShadow: "0 0 22px rgba(47,140,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icons[MODEL_VERSIONS.findIndex(v => v.id === modelVer)] ?? icons[0]}
          </div>
          <span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 900 }}>{selected.label}</span>
        </div>
        <ChevronDown style={{ width: 13, height: 13, color: "#64748b", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div className="tp-model-dd-menu" style={{
          position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)",
          background: "rgba(10,9,14,0.96)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20, overflow: "hidden", zIndex: 50,
          boxShadow: "0 18px 46px rgba(0,0,0,0.62), 0 0 0 1px rgba(255,255,255,0.04), 0 0 28px rgba(47,140,255,0.10)",
          backdropFilter: "blur(24px)",
        }}>
          {MODEL_VERSIONS.map((v, i) => (
            <button
              key={v.id}
              className="tp-model-dd-option"
              onClick={() => { setModelVer(v.id); setOpen(false); }}
              style={{
                width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                background: modelVer === v.id ? "rgba(47,140,255,0.12)" : "transparent",
                border: "none", borderBottom: i < MODEL_VERSIONS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(47,140,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {icons[i]}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ color: modelVer === v.id ? "#8bdcff" : "#c8c8e0", fontSize: 12, fontWeight: 600, display: "block" }}>{v.label}</span>
                {i === 0 && <span style={{ color: "#64748b", fontSize: 9 }}>~90s · up to 2M polygons (Ultra)</span>}
                {i === 1 && <span style={{ color: "#64748b", fontSize: 9 }}>~25s · balanced speed & quality</span>}
                {i === 2 && <span style={{ color: "#64748b", fontSize: 9 }}>~5s · prototyping only</span>}
              </div>
              {modelVer === v.id && <div><Check style={{ width: 13, height: 13, color: "#8bdcff" }} /></div>}
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
  {
    id: "photo",
    label: "Photo",
    icon: "📷",
    prefix: "photorealistic, high detail photography, professional 3D render, cinematic lighting, 8k resolution, ultra-detailed textures, realistic materials, ",
    draftPrefix: "photorealistic, high detail shape study, realistic proportions, clean silhouette, high-fidelity geometry, fine surface detail, ",
  },
  { id: "voxel", label: "Voxel", icon: "🧊", prefix: "precise voxel art style, cubic voxel grid construction, blocky 3D modular design, clean voxel geometry, isometric voxel aesthetic, " },
  { id: "pixel", label: "Pixel", icon: "👾", prefix: "retro 32-bit pixel art style, conversion of 2D sprite to 3D volume, stylized jagged edges, vibrant limited palette, nostalgic game aesthetic, " },
  { id: "clay", label: "Clay", icon: "🏺", prefix: "claymation style, authentic clay surface with fingerprints, hand-sculpted plasticine texture, soft rounded organic forms, stop-motion aesthetic, " },
  { id: "cartoon", label: "Cartoon", icon: "🎨", prefix: "stylized 3D cartoon, expressive proportions, clean toon shaded surfaces, vibrant saturated colors, high-quality animation style, " },
  { id: "anime", label: "Anime", icon: "✨", prefix: "high-quality anime 3D model, cel-shaded aesthetics, crisp outlines, vibrant anime palette, Japanese studio animation style, " },
  { id: "chibi", label: "Chibi", icon: "🧸", prefix: "adorable chibi style, stylized super-deformed proportions, large expressive eyes, small cute body, toy-like aesthetic, kawaii character design, " },
  { id: "sculpt", label: "Sculpt", icon: "🗿", prefix: "masterpiece marble sculpture, high-detail museum quality stonework, realistic chiseled surfaces, classical art aesthetic, white marble texture, " },
  { id: "mini", label: "Mini", icon: "🎲", prefix: "highly detailed tabletop miniature, custom 3D printed figurine style, hand-painted gaming piece scale, macro photography of a scale model, " },
];


/* ─── Enhancer prompts (module-scope — no component deps) ────────────── */
export const TRIPO_ENHANCE_PROMPT = `You are a Tripo3D prompt engineer. Improve the user's prompt for 3D mesh generation.

OUTPUT: Raw JSON ONLY — no markdown, no prose: {"prompt": "...", "negative_prompt": "..."}

STEP 1 — IDENTIFY SUBJECT TYPE (internal reasoning, not in output):
- humanoid: human, character, warrior, mage, anime girl, robot with human body shape
- creature: dragon, dog, horse, wolf, bird, fish, monster, alien beast
- vehicle: car, tank, spaceship, motorcycle, helicopter, boat
- prop_weapon: sword, axe, gun, shield, potion, gem, book, chair, crate, food, any inanimate object
- environment: castle, dungeon, forest scene, room, landscape

STEP 2 — APPLY POSE RULE for identified type:
- humanoid → T-pose, arms slightly away from body, symmetrical stance, both feet flat on ground
- creature → natural standing pose, weight distributed, all limbs grounded
- vehicle → complete model, all parts present and intact
- prop_weapon → complete model, all sides fully closed, no open faces, no hollow shells
- environment → complete scene, all elements present

STEP 3 — ADD MINIMAL QUALITY TOKENS (positive only, type-appropriate):
- humanoid → clean topology, symmetrical
- creature → natural anatomy, complete body
- vehicle → complete model, intact panels, fully enclosed geometry
- prop_weapon → complete object, all sides present, fully closed mesh, back and bottom faces included
- environment → complete scene

RULES:
- Preserve the user's exact intent, clothing, outfit, and design choices.
- Comma-separated keywords. No sentences.
- For prop_weapon: always append "fully closed mesh, all sides modeled, no missing faces, complete back geometry"
- Positive prompt: specific design negations are OK (e.g. "without hat") — NO quality boilerplate like "no artifacts", "non-waxy", "no missing parts".
- MAX 850 characters for prompt field.
- OMIT: lighting, background, camera, render engine names, "photorealistic", "4K", "CGI"

NEGATIVE PROMPT — type-specific mesh artifacts only, MAX 250 characters:
- humanoid → merged fingers, fused limbs, floating body parts, asymmetrical anatomy, truncated torso, missing feet
- creature → extra limbs, fused legs, missing tail, floating paws, asymmetrical body
- vehicle → warped panels, missing wheels, floating parts, incomplete frame, open geometry
- prop_weapon → open faces, missing backface, hollow shell, incomplete geometry, broken blade, missing handle, floating pieces
- environment → floating objects, incomplete structures, missing ground plane`;

export const TRIPO_SUPER_ENHANCE_PROMPT = `You are an elite Tripo3D prompt engineer. Fully expand the user's prompt with rich construction-level detail for 3D mesh generation.

OUTPUT: Raw JSON ONLY — no markdown, no prose: {"prompt": "...", "negative_prompt": "..."}

STEP 1 — IDENTIFY SUBJECT TYPE (internal reasoning, not in output):
- humanoid: human, character, warrior, mage, anime girl, robot with human body shape
- creature: dragon, dog, horse, wolf, bird, fish, monster, alien beast
- vehicle: car, tank, spaceship, motorcycle, helicopter, boat
- prop_weapon: sword, axe, gun, shield, potion, gem, book, chair, crate, food, any inanimate object
- environment: castle, dungeon, forest scene, room, landscape

STEP 2 — APPLY POSE RULE for identified type:
- humanoid → T-pose, arms slightly away from body, symmetrical stance, both feet flat on ground
- creature → natural standing pose, weight distributed, all limbs grounded
- vehicle → complete model, all parts present and intact
- prop_weapon → complete model, all sides fully closed, no open faces, no hollow shells
- environment → complete scene, all elements present

STEP 3 — INFER AND ADD type-appropriate details NOT present in the original prompt:
- humanoid → clothing material/texture, accessories, facial features, hair style/color, armor details, boots/gloves
- creature → fur/scale/feather texture, claw/tooth detail, muscle definition, eye color, pattern/markings
- vehicle → panel material, weathering/wear level, window glass, exhaust/intake details, insignia/markings, fully enclosed body
- prop_weapon → material (steel/wood/leather/etc.), engraving/rune detail, worn edges, grip wrap, gems/inlays, back face, bottom face, all sides modeled
- environment → ground/floor material, atmospheric lighting, key props, background structures, foliage/debris

STEP 4 — ADD RICH QUALITY TOKENS (positive only, type-appropriate):
- humanoid → clean topology, symmetrical, realistic proportions, detailed surface, high-fidelity mesh
- creature → natural anatomy, realistic proportions, detailed fur/scales, expressive features
- vehicle → precise engineering details, realistic materials, complete mechanical assembly, fully closed geometry
- prop_weapon → realistic material surfaces, fine detail work, fully closed mesh, all sides modeled, complete back geometry, no missing faces, authentic construction
- environment → cohesive scene composition, detailed surfaces, complete structures, atmospheric depth

HARD RULES:
- USER INTENT IS SACRED: preserve exact clothing, outfit, and design choices. Add material/texture detail to what user specified — never replace it.
- Comma-separated keywords. No sentences.
- For prop_weapon: always append "fully closed mesh, all sides modeled, complete back and bottom geometry" to positive prompt.
- Positive prompt: specific design negations OK (e.g. "without hat") — NO quality boilerplate negations.
- ONE model only. MAX 850 characters for prompt field.
- OMIT: lighting, background, camera, render engine names, "photorealistic", "4K", "CGI"
- NSFW filter: keep user's clothing exactly (bikini, swimsuit, crop top — all fine). BLOCK only: genitalia, sexual acts, fetish terms, sexually explicit character names. Replace only those with safe equivalents.

NEGATIVE PROMPT — comprehensive, type-specific, MAX 250 characters:
- humanoid → merged fingers, fused limbs, floating body parts, asymmetrical anatomy, truncated torso, missing feet, extra fingers, deformed face, melted features
- creature → extra limbs, fused legs, missing tail, floating paws, asymmetrical body, malformed head, extra eyes, deformed snout
- vehicle → warped panels, missing wheels, floating parts, incomplete frame, melted bodywork, asymmetric chassis, open geometry
- prop_weapon → open faces, missing backface, hollow shell, broken geometry, missing components, floating pieces, incomplete blade, warped handle, melted edges
- environment → floating objects, incomplete structures, missing ground plane, disconnected elements, collapsing geometry`;

export const TRIPO_SIMPLIFY_PROMPT = `You are a 3D model prompt engineer.
The user gives you a long or complex prompt. Simplify it to a clear, concise English description under 200 characters, keeping the essential object and style.
Respond ONLY with plain text, no JSON, no explanation.`;

/* ─── GeneratePanel ───────────────────────────────────────────────────── */
const GeneratePanel = memo(({
  genTab, setGenTab,
  prompt, setPrompt,
  makeBetter, setMakeBetter,
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
  imageSourceMode, setImageSourceMode,
  multiviewSourceMode, setMultiviewSourceMode,
  generationModel, setGenerationModel,
  generationTemplateId, setGenerationTemplateId,
  generationOrientation, setGenerationOrientation,
  generationCompress, setGenerationCompress,
  generationRenderImage, setGenerationRenderImage,
  generationTextureAlignment, setGenerationTextureAlignment,
  imageReference, setImageReference,
  multiviewReference, setMultiviewReference,
  multiviewMode, setMultiviewMode,
  multiviewOrthographic, setMultiviewOrthographic,
  multiviewOriginalTaskId, setMultiviewOriginalTaskId,
  activeStyles = [],
  onStyleToggle = () => { },
}) => {
  const slotIcons = {
    front: <User style={{ width: 14, height: 14 }} />,
    left: <ChevronLeft style={{ width: 14, height: 14 }} />,
    back: <User style={{ width: 14, height: 14, opacity: 0.5 }} />,
    right: <ChevronRight style={{ width: 14, height: 14 }} />,
  };
  const MV_SLOTS = MULTIVIEW_UPLOAD_ORDER.map((slot) => ({
    ...slot,
    icon: slotIcons[slot.id],
  }));
  const batchInputRef = useRef(null);
  const isUploadedItemReady = (item) => Boolean(item?.token || item?.tripoFile);
  const uploadedMultiviewCount = MULTIVIEW_UPLOAD_ORDER.reduce(
    (count, _, index) => count + (isUploadedItemReady(multiImages?.[index]) ? 1 : 0),
    0
  );
  const isFrontMultiviewReady = isUploadedItemReady(multiImages?.[0]);
  const multiviewSourceHelp = {
    upload: {
      title: "Upload views",
      body: "Best for exact control. Add at least Front plus one more view; full order is Front, Left, Back, Right.",
    },
    generate_multiview_image: {
      title: "Generate views",
      body: "Tripo creates the guide views first, then LudusGen turns that task into a 3D model automatically.",
    },
    edit_multiview_image: {
      title: "Edit views",
      body: "Use an existing multiview task ID, a reference image, or uploaded guide views to revise the view set before 3D generation.",
    },
  };
  const normalizeUploadedItem = (file, preview, payload) => ({
    file,
    preview,
    token: typeof payload === "string"
      ? payload
      : payload?.token || payload?.object?.key || "sts",
    ...(typeof payload === "object" && payload ? { tripoFile: payload } : {}),
  });

  /* ─── Capabilities for current model ──────────────────────────────────
   * Priority: backendCaps (fetched from API) > static MODEL_CAPS fallback.
   * This makes the frontend dynamically adapt to backend-defined capabilities
   * without any hardcoded model-specific logic here.
   * ────────────────────────────────────────────────────────────────────── */
  const caps = UNIVERSAL_CAPS;

  /* ─── Auto-reset incompatible settings when model changes ─────────── */
  useEffect(() => {
    const c = getModelCaps(modelVer);
    if (!c.multiview && genTab === "multi") setGenTab("image");
    if (genTab === "batch") setGenTab("image"); // Auto-redirect deprecated tab
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
        handleBatchImg && handleBatchImg(f).then(payload => {
          setBatchImages(prev => prev.map(i => i.file === f ? normalizeUploadedItem(f, ev.target.result, payload) : i));
        }).catch(() => { });
      };
      r.readAsDataURL(f);
    });
  }

  /* ─── Derived ─────────────────────────────────────────────────────── */
  const activePbrOn = texOn && pbrOn;
  const partsBlockers = [
    texOn ? "Texture off" : null,
    activePbrOn ? "PBR off" : null,
    quadMesh ? "Triangle topology" : null,
  ].filter(Boolean);
  const partsDisabled = partsBlockers.length > 0;
  const partsRequirement = partsBlockers.length > 2
    ? `${partsBlockers.slice(0, -1).join(", ")}, and ${partsBlockers[partsBlockers.length - 1]}`
    : partsBlockers.join(" and ");
  const sourceModeRowStyle = {
    display: "flex",
    gap: 0,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: 20,
    overflow: "hidden",
    background: "rgba(3,7,18,0.28)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045)",
  };
  const sourceModeBtnStyle = (_active, index = 0, count = 1) => ({
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    padding: "9px 6px",
    border: 0,
    borderLeft: index > 0 ? "1px solid rgba(139,220,255,0.12)" : 0,
    borderRadius: 0,
    background: "transparent",
    color: "#94a3b8",
    fontSize: count >= 3 ? 9.5 : 10.25,
    fontWeight: 900,
    letterSpacing: "0.02em",
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    textAlign: "center",
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: "none",
  });
  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(139,220,255,0.16)",
    background: "linear-gradient(145deg, rgba(15,23,42,0.44), rgba(3,7,18,0.34))",
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: 700,
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  };
  const labelStyle = {
    color: "rgba(225,226,212,0.70)",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6,
  };
  const subtleHintStyle = { color: "rgba(148,163,184,0.78)", fontSize: 10, lineHeight: 1.5, margin: 0 };
  const renderReferenceUploader = (value, setter, uploadHandler, emptyLabel) => {
    const openPicker = () => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/jpeg,image/png,image/webp,image/avif";
      inp.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          setter({ file, preview: ev.target.result, token: null });
          uploadHandler?.(file).then((payload) => {
            setter(normalizeUploadedItem(file, ev.target.result, payload));
          }).catch(() => { });
        };
        reader.readAsDataURL(file);
      };
      inp.click();
    };

    return (
      <div
        onClick={openPicker}
        style={{
          border: "1.5px dashed rgba(139,220,255,0.28)",
          background: "linear-gradient(145deg, rgba(15,23,42,0.32), rgba(3,7,18,0.24))",
          borderRadius: 20,
          minHeight: 124,
          cursor: "pointer",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value?.preview ? (
          <>
            <img src={value.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {!isUploadedItemReady(value) && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(3,0,10,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 style={{ width: 18, height: 18, color: "#2f8cff" }} className="anim-spin" />
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 16 }}>
            <Upload style={{ width: 18, height: 18, color: "#2f8cff", margin: "0 auto 8px" }} />
            <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700 }}>{emptyLabel}</div>
            <p style={{ ...subtleHintStyle, marginTop: 6 }}>Optional reference via STS upload</p>
          </div>
        )}
      </div>
    );
  };

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Tab bar ── */}
      <div className="tp-gen-tabs" style={{ display: "flex", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", gap: 0, padding: 0, overflow: "hidden", background: "rgba(255,255,255,0.06)", borderRadius: 22, marginBottom: 14 }}>
        {GEN_TABS.map(t => {
          const tabCap = { image: true, text: true, multi: caps.multiview };
          const disabled = !tabCap[t.id];
          return (
            <button
              key={t.id}
              type="button"
              className={"tp-inp-tab-clean" + (genTab === t.id ? " active" : "") + (disabled ? " model-na" : "")}
              data-tooltip={t.label}
              aria-label={t.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (disabled) return;
                setGenTab(t.id);
              }}
              title={disabled ? `Not available with ${modelVer}` : t.tip}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0,
                borderRadius: 0,
                border: 0,
                margin: 0,
                color: genTab === t.id ? "#e2e8f0" : "#94a3b8",
                cursor: disabled ? "not-allowed" : "pointer",
                padding: "8px 0",
                opacity: disabled ? 0.35 : 1,
              }}
            >
              <t.icon size={15} className="tp-tab-icon" />
              <span className="tp-tab-label" style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── AI Model ── */}
      <ModelDropdown modelVer={modelVer} setModelVer={setModelVer} />

      {genTab === "image" && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="tp-source-mode-row" style={sourceModeRowStyle}>
            <button type="button" className={"tp-source-mode-btn-clean" + (imageSourceMode === "upload" ? " active" : "")} data-active={imageSourceMode === "upload" ? "true" : "false"} aria-pressed={imageSourceMode === "upload"} onMouseDown={(e) => e.preventDefault()} onClick={() => setImageSourceMode("upload")} style={sourceModeBtnStyle(imageSourceMode === "upload", 0, 2)}>Upload Source</button>
            <button type="button" className={"tp-source-mode-btn-clean" + (imageSourceMode === "generate_image" ? " active" : "")} data-active={imageSourceMode === "generate_image" ? "true" : "false"} aria-pressed={imageSourceMode === "generate_image"} onMouseDown={(e) => e.preventDefault()} onClick={() => setImageSourceMode("generate_image")} style={sourceModeBtnStyle(imageSourceMode === "generate_image", 1, 2)}>Generate Image</button>
          </div>

          {imageSourceMode === "generate_image" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>Image Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the source image you want Tripo to generate before converting it to 3D…"
                  style={{ ...fieldStyle, resize: "vertical", minHeight: 96 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Reference Image</label>
                {renderReferenceUploader(imageReference, setImageReference, handleBatchImg, "Add reference image")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Image Model</label>
                  <input value={generationModel} onChange={(e) => setGenerationModel(e.target.value)} placeholder="Optional model id" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Template</label>
                  <input value={generationTemplateId} onChange={(e) => setGenerationTemplateId(e.target.value)} placeholder="Optional template id" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Orientation</label>
                  <TripoSelect value={generationOrientation} onChange={setGenerationOrientation} options={ORIENTATION_OPTIONS} />
                </div>
                <div>
                  <label style={labelStyle}>Compress</label>
                  <TripoSelect value={generationCompress} onChange={setGenerationCompress} options={COMPRESS_OPTIONS} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Texture Alignment</label>
                <input value={generationTextureAlignment} onChange={(e) => setGenerationTextureAlignment(e.target.value)} placeholder="Optional texture alignment hint" style={fieldStyle} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>Render Image</div>
                  <p style={subtleHintStyle}>Keep a preview render in the Tripo task output.</p>
                </div>
                <div className={"tp-switch" + (generationRenderImage ? " on" : "")} onClick={() => setGenerationRenderImage((v) => !v)} />
              </div>
            </div>
          )}
        </div>
      )}

      {genTab === "multi" && (
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="tp-source-mode-row" style={sourceModeRowStyle}>
            <button type="button" className={"tp-source-mode-btn-clean" + (multiviewSourceMode === "upload" ? " active" : "")} data-active={multiviewSourceMode === "upload" ? "true" : "false"} aria-pressed={multiviewSourceMode === "upload"} title="Upload existing view images" onMouseDown={(e) => e.preventDefault()} onClick={() => setMultiviewSourceMode("upload")} style={sourceModeBtnStyle(multiviewSourceMode === "upload", 0, 3)}>Upload</button>
            <button type="button" className={"tp-source-mode-btn-clean" + (multiviewSourceMode === "generate_multiview_image" ? " active" : "")} data-active={multiviewSourceMode === "generate_multiview_image" ? "true" : "false"} aria-pressed={multiviewSourceMode === "generate_multiview_image"} title="Generate Tripo guide views first" onMouseDown={(e) => e.preventDefault()} onClick={() => setMultiviewSourceMode("generate_multiview_image")} style={sourceModeBtnStyle(multiviewSourceMode === "generate_multiview_image", 1, 3)}>Generate</button>
            <button type="button" className={"tp-source-mode-btn-clean" + (multiviewSourceMode === "edit_multiview_image" ? " active" : "")} data-active={multiviewSourceMode === "edit_multiview_image" ? "true" : "false"} aria-pressed={multiviewSourceMode === "edit_multiview_image"} title="Edit an existing view set" onMouseDown={(e) => e.preventDefault()} onClick={() => setMultiviewSourceMode("edit_multiview_image")} style={sourceModeBtnStyle(multiviewSourceMode === "edit_multiview_image", 2, 3)}>Edit</button>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 16, background: "rgba(0,229,255,0.055)", border: "1px solid rgba(0,229,255,0.14)", boxShadow: "0 0 22px rgba(0,229,255,0.06)" }}>
            <Info style={{ width: 15, height: 15, color: "#00e5ff", flex: "0 0 auto", marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
                {multiviewSourceHelp[multiviewSourceMode]?.title}
              </div>
              <p style={{ ...subtleHintStyle, color: "rgba(226,232,240,0.72)" }}>
                {multiviewSourceHelp[multiviewSourceMode]?.body}
              </p>
            </div>
          </div>

          {multiviewSourceMode !== "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>{multiviewSourceMode === "edit_multiview_image" ? "Edit Prompt" : "Multiview Prompt"}</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder={multiviewSourceMode === "edit_multiview_image"
                    ? "Describe how the generated multiview set should be edited…"
                    : "Describe the subject for Tripo multiview image generation…"}
                  style={{ ...fieldStyle, resize: "vertical", minHeight: 96 }}
                />
              </div>
              {multiviewSourceMode === "edit_multiview_image" && (
                <div>
                  <label style={labelStyle}>Original Task Id</label>
                  <input value={multiviewOriginalTaskId} onChange={(e) => setMultiviewOriginalTaskId(e.target.value)} placeholder="Optional original multiview task id" style={fieldStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Reference Image</label>
                {renderReferenceUploader(multiviewReference, setMultiviewReference, handleMultiImg, "Add multiview reference")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Image Model</label>
                  <input value={generationModel} onChange={(e) => setGenerationModel(e.target.value)} placeholder="Optional model id" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Template</label>
                  <input value={generationTemplateId} onChange={(e) => setGenerationTemplateId(e.target.value)} placeholder="Optional template id" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Orientation</label>
                  <TripoSelect value={generationOrientation} onChange={setGenerationOrientation} options={ORIENTATION_OPTIONS} />
                </div>
                <div>
                  <label style={labelStyle}>Compress</label>
                  <TripoSelect value={generationCompress} onChange={setGenerationCompress} options={COMPRESS_OPTIONS} />
                </div>
                <div>
                  <label style={labelStyle}>Mode</label>
                  <TripoSelect value={multiviewMode} onChange={setMultiviewMode} options={MULTIVIEW_MODE_OPTIONS} />
                </div>
                <div>
                  <label style={labelStyle}>Texture Alignment</label>
                  <input value={generationTextureAlignment} onChange={(e) => setGenerationTextureAlignment(e.target.value)} placeholder="Optional texture alignment hint" style={fieldStyle} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>Render Image</div>
                    <p style={subtleHintStyle}>Keep preview renders in the task output.</p>
                  </div>
                  <div className={"tp-switch" + (generationRenderImage ? " on" : "")} onClick={() => setGenerationRenderImage((v) => !v)} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>Orthographic</div>
                    <p style={subtleHintStyle}>Enable orthographic projection for cleaner guide views.</p>
                  </div>
                  <div className={"tp-switch" + (multiviewOrthographic ? " on" : "")} onClick={() => setMultiviewOrthographic((v) => !v)} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── Text tab ── */}
      {genTab === "text" && (
        <>
          {/* Style prefix buttons */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Style
            </label>
            <div className="tp-style-grid">
              {STYLE_PREFIX.map(s => {
                const active = activeStyles === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={"tp-style-chip" + (active ? " active" : "")}
                    data-active={active ? "true" : "false"}
                    aria-pressed={active}
                    onClick={() => onStyleToggle(s.id)}
                    title={s.prefix}
                  >
                    <span className="tp-style-chip-label">{s.label}</span>
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
            color="#2f8cff"
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
              <span style={{ color: tPose && caps.tPose ? "#8bdcff" : "#64748b", fontSize: 11, fontWeight: 600 }}>T-Pose</span>
              <div className={"tp-switch" + (tPose && caps.tPose ? " on" : "")}
                style={{ width: 28, height: 16, background: tPose && caps.tPose ? "#2f8cff" : "rgba(255,255,255,0.12)" }} />
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
          <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 5 }}>
            Negative Prompt
          </label>
          <textarea
            className="tp-ta"
            placeholder={caps.negPrompt ? "Negative prompt (optional)…" : "Not supported by this model"}
            value={negPrompt}
            onChange={e => caps.negPrompt && setNegPrompt(e.target.value.slice(0, 255))}
            rows={2}
            disabled={!caps.negPrompt}
            maxLength={255}
            style={{
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
              background: "rgba(255,255,255,0.03)", fontSize: 11, resize: "none", width: "100%",
              boxSizing: "border-box", padding: "8px 11px",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 3 }}>
            <span style={{
              fontSize: 10,
              color: negPrompt.length > 230 ? (negPrompt.length >= 255 ? "#ef4444" : "#f59e0b") : "#6b6b8a",
            }}>
              {negPrompt.length}/255
            </span>
          </div>
        </div>
      </Na>

      {/* ── Multi-view tab ── */}
      {genTab === "multi" && multiviewSourceMode !== "generate_multiview_image" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8, padding: "0 2px" }}>
            <span style={{ color: "#94a3b8", fontSize: 10, fontWeight: 800 }}>
              {uploadedMultiviewCount}/4 views ready
            </span>
            <span style={{ color: isFrontMultiviewReady && uploadedMultiviewCount >= 2 ? "#10B981" : "#F59E0B", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>
              {isFrontMultiviewReady && uploadedMultiviewCount >= 2 ? "Ready to generate" : "Front + 1 view required"}
            </span>
          </div>
          {multiImages?.some(i => i) && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
              <button
                onClick={() => setMultiImages([])}
                style={{ background: "none", border: "none", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 6px" }}
              >
                Clear all views
              </button>
            </div>
          )}
          <div style={{ border: "1.5px solid rgba(47,140,255,0.28)", borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.035)", boxShadow: "0 0 22px rgba(47,140,255,0.07)" }}>
            <div className="mv-grid">
              {MV_SLOTS.map((slot, i) => {
                const prev = multiImages?.[i]?.preview;
                const isUploading = multiImages?.[i] && !isUploadedItemReady(multiImages[i]);
                return (
                  <div key={slot.label} className={"mv-cell checker" + (prev ? " has-img" : "")}
                    onClick={() => {
                      const inp = document.createElement("input");
                      inp.type = "file"; inp.accept = "image/jpeg,image/png,image/webp,image/avif";
                      inp.onchange = e => {
                        const f = e.target.files[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = ev => {
                            const next = [...(multiImages ?? [])];
                            next[i] = { file: f, preview: ev.target.result, token: null };
                            setMultiImages(next);
                            handleMultiImg && handleMultiImg(f).then(payload => {
                              setMultiImages(prev => {
                                const updated = [...prev];
                                if (updated[i]) updated[i] = normalizeUploadedItem(f, ev.target.result, payload);
                                return updated;
                              });
                            }).catch(() => { });
                          };
                          r.readAsDataURL(f);
                        }
                      };
                      inp.click();
                    }}>
                    {prev ? (
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <img src={prev} alt={slot.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {isUploading && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Loader2 style={{ width: 14, height: 14, color: "#2f8cff" }} className="anim-spin" />
                          </div>
                        )}
                        <div style={{ position: "absolute", bottom: 4, left: 4, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>
                          {slot.label}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                          {slot.icon}
                        </div>
                        <span style={{ color: "#e2e2f0", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{slot.label}</span>
                        <span style={{ color: "#475569", fontSize: 7, fontWeight: 500 }}>CLICK TO UPLOAD</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Image tab (Unified Single/Batch) ── */}
      {genTab === "image" && imageSourceMode === "upload" && (
        <div style={{ marginBottom: 14 }}>
          <div
            className="tp-drop tp-upload-zone checker"
            style={{
              width: "100%", aspectRatio: (batchImages?.length > 3) ? "1/1" : "1.6/1", borderRadius: 14,
              border: "1.5px dashed rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer", overflow: "hidden", position: "relative",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "aspect-ratio 0.3s ease",
            }}
            onClick={() => batchInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleBatchFiles(e.dataTransfer.files); }}
          >
            {batchImages && batchImages.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: batchImages.length === 1 ? "1fr" : "repeat(auto-fill, minmax(80px, 1fr))",
                gap: 6, width: "100%", height: "100%", padding: 8, boxSizing: "border-box",
                overflowY: "auto"
              }}>
                {batchImages.map((img, i) => (
                  <div key={i} style={{
                    position: "relative", borderRadius: 8, overflow: "hidden",
                    aspectRatio: "1/1",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }}>
                    <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      onClick={e => { e.stopPropagation(); setBatchImages(prev => prev.filter((_, idx) => idx !== i)); }}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", backdropFilter: "blur(4px)" }}>
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                    {!isUploadedItemReady(img) && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Loader2 style={{ width: 16, height: 16, color: "#2f8cff" }} className="anim-spin" />
                      </div>
                    )}
                    {isUploadedItemReady(img) && (
                      <div style={{ position: "absolute", bottom: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: "#2f8cff", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #8bdcff", boxShadow: "0 0 12px rgba(47,140,255,0.34)" }}>
                        <Check style={{ width: 8, height: 8, color: "#fff" }} />
                      </div>
                    )}
                  </div>
                ))}
                {batchImages.length < 10 && (
                  <div style={{ borderRadius: 8, border: "1.5px dashed rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1/1", cursor: "pointer" }}>
                    <Plus style={{ width: 20, height: 20, color: "#64748b" }} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", pointerEvents: "none" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(47,140,255,0.10)", boxShadow: "0 0 22px rgba(47,140,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                  <Upload style={{ width: 20, height: 20, color: "#2f8cff" }} />
                </div>
                <p style={{ color: "#e2e2f0", fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Upload Image(s)</p>
                <p style={{ color: "#64748b", fontSize: 11, margin: "2px 0 0" }}>AVIF supported too</p>
                <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>JPG, PNG, WEBP · Up to 10 images</p>
              </div>
            )}
          </div>
          {batchImages && batchImages.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, padding: "0 2px" }}>
              <span style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>
                {batchImages.length === 1 ? "1 image ready" : `${batchImages.length} images ready`}
              </span>
              <button onClick={() => setBatchImages([])} style={{ color: "#ef4444", fontSize: 11, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                Clear all
              </button>
            </div>
          )}
          <input ref={batchInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple style={{ display: "none" }}
            onChange={e => { if (e.target.files) handleBatchFiles(e.target.files); }} />
        </div>
      )}

      {/* ── Make Image Better ── */}
      {TABS_WITH_MAKE_BETTER.has(genTab) && (
        <Na unsupported={!caps.makeBetter} tip={`Make Image Better not supported by ${modelVer}`}>
          <div
            className="tp-setting-card"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)", marginBottom: 14,
              cursor: caps.makeBetter ? "pointer" : "not-allowed",
              opacity: caps.makeBetter ? 1 : 0.5
            }}
            onClick={() => caps.makeBetter && setMakeBetter(!makeBetter)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(47,140,255,0.10)", boxShadow: "0 0 18px rgba(47,140,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles style={{ width: 16, height: 16, color: "#2f8cff" }} />
              </div>
              <div>
                <p
                  style={{ color: "#e2e2f0", fontSize: 12, fontWeight: 600, margin: 0, cursor: "help" }}
                  title="AI identifies and fixes common issues in your source image before 3D generation for better accuracy."
                >
                  Make Image Better
                </p>
                <p style={{ color: "#64748b", fontSize: 10, margin: 0 }}>AI optimizes input before generation</p>
              </div>
            </div>
            <div className={"tp-switch" + (makeBetter && caps.makeBetter ? " on" : "")} />
          </div>
        </Na>
      )}



      {/* ── Mesh Quality ── */}
      <div style={{ margin: "14px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Mesh Quality</span>
        <HelpCircle
          style={{ width: 13, height: 13, color: "#475569", cursor: "help" }}
          title="Ultra uses detailed geometry refinement. Standard is faster but with fewer polygons."
        />
      </div>
      <div className="tp-flat-segment-row" style={{ display: "flex", gap: 0, marginBottom: 2 }}>
        {/* Ultra — model-na when not supported */}
        <Na unsupported={!caps.ultraMesh} tip={`Ultra quality not supported by ${modelVer} — requires P1-20260311 or v3.x`}>
          <button
            type="button"
            className={"tp-qual-btn" + (meshQ === "ultra" && caps.ultraMesh ? " sel" : "")}
            onClick={() => caps.ultraMesh && setMeshQ("ultra")}
            disabled={!caps.ultraMesh}
            title={caps.ultraMesh ? "geometry_quality: detailed" : `Requires P1-20260311 or v3.x`}
            style={{
              cursor: caps.ultraMesh ? "pointer" : "not-allowed",
              opacity: caps.ultraMesh ? 1 : 0.5,
            }}>
            Ultra
          </button>
        </Na>
        {/* Standard — always available */}
        <button
          type="button"
          className={"tp-qual-btn" + (meshQ === "standard" || !caps.ultraMesh ? " sel" : "")}
          onClick={() => setMeshQ("standard")}
          title="geometry_quality: standard"
        >
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
          Generate in Parts requires {partsRequirement}.
        </p>
      )}

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
                cursor: texOn && caps.tex4K ? "pointer" : "not-allowed",
                opacity: texOn && caps.tex4K ? 1 : 0.4,
              }}
              onClick={() => texOn && caps.tex4K && setTex4K(v => !v)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>4K Texture</span>
                <HelpCircle
                  style={{ width: 13, height: 13, color: "#475569", cursor: "help" }}
                  title="Generates 4096x4096px textures. Significantly higher detail but takes more time."
                />
              </div>
              <div className={"tp-switch" + (tex4K && texOn && caps.tex4K ? " on" : "")}
                style={{ background: tex4K && texOn && caps.tex4K ? "#2f8cff" : "rgba(255,255,255,0.12)" }} />
            </div>
          </Na>
          {tex4K && texOn && caps.tex4K && (
            <p style={{ color: "#64748b", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
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
                opacity: texOn && caps.pbr ? 1 : 0.4,
              }}
              onClick={() => texOn && caps.pbr && setPbrOn(v => !v)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>PBR</span>
                <HelpCircle
                  style={{ width: 13, height: 13, color: "#475569", cursor: "help" }}
                  title="Physically Based Rendering: Includes Metallic, Roughness and Normal maps."
                />
              </div>
              <div className={"tp-switch" + (pbrOn && texOn && caps.pbr ? " on" : "")}
                style={{ background: pbrOn && texOn && caps.pbr ? "#2f8cff" : "rgba(255,255,255,0.12)" }} />
            </div>
          </Na>
          {pbrOn && texOn && caps.pbr && (
            <p style={{ color: "#64748b", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
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
                <HelpCircle
                  style={{ width: 13, height: 13, color: "#475569", cursor: "help" }}
                  title="Controls the geometric variation of the 3D model. Fixed seed ensures reproducible results."
                />
              </div>
              <SeedSpinner value={modelSeed} onChange={v => caps.modelSeed && setModelSeed(v)} disabled={!caps.modelSeed} />
            </div>
          </Na>

          {/* image_seed */}
          <Na unsupported={!caps.imageSeed} tip={`Image Seed not supported by ${modelVer}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Image Seed</span>
                <HelpCircle
                  style={{ width: 13, height: 13, color: "#475569", cursor: "help" }}
                  title="Controls how the AI interprets the source image. Fixed seed keeps interpretation consistent."
                />
              </div>
              <SeedSpinner value={imageSeed} onChange={v => caps.imageSeed && setImageSeed(v)} disabled={!caps.imageSeed} />
            </div>
          </Na>

          {/* texture_seed */}
          {texOn && (
            <Na unsupported={!caps.textureSeed} tip={`Texture Seed not supported by ${modelVer}`}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Texture Seed</span>
                  <HelpCircle
                    style={{ width: 13, height: 13, color: "#475569", cursor: "help" }}
                    title="Controls the randomness of texture generation and UV mapping layout."
                  />
                </div>
                <SeedSpinner value={textureSeed} onChange={v => caps.textureSeed && setTextureSeed(v)} disabled={!caps.textureSeed} />
              </div>
            </Na>
          )}

          {/* auto_size */}
          <Na unsupported={!caps.autoSize} tip={`Auto Size not supported by ${modelVer}`}>
            <Toggle label="Auto Size" value={autoSize && caps.autoSize} onChange={v => caps.autoSize && setAutoSize(v)} hint disabled={!caps.autoSize} />
          </Na>
          {autoSize && caps.autoSize && (
            <p style={{ color: "#64748b", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              Scales the model to real-world dimensions (meters).
            </p>
          )}

          {/* export_uv */}
          <Toggle label="Export UV" value={exportUv} onChange={setExportUv} hint />
          {!exportUv && (
            <p style={{ color: "#64748b", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              Skips UV unwrap during generation — faster & smaller file. UV added at texturing stage.
            </p>
          )}

        </div>
      </Collapsible>


    </>
  );
});

export default GeneratePanel;
