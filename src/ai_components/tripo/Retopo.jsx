// trellis/Retopo.jsx
import React from "react";
import { HelpCircle, Zap, ChevronDown, Info } from "lucide-react";
import { Tooltip } from "../meshy/ui/Primitives";
import { getFaceLimitConfig } from "./GeneratePanel";

/*
 *  Retopo panel maps to TWO different Tripo API task types:
 *
 *  smart_low_poly=ON  → task type: "smart_low_poly"
 *    face_limit is REQUIRED (not optional):
 *      quad=false: 1 000 – 20 000 faces, step 1 000
 *      quad=true:    500 – 10 000 faces, step   500
 *    output format: depends on quad (quad → FBX)
 *
 *  smart_low_poly=OFF → task type: "convert_model"
 *    face_limit is OPTIONAL (omit = Auto adaptive):
 *      quad=false: Auto – 500 000 faces, step 5 000
 *      quad=true:  Auto default 10 000, max 100 000, step 1 000
 *    Quad forces FBX output; other formats: glb, obj, stl, 3mf, usdz
 *
 *  Rigged model restrictions (API):
 *    - OBJ and STL conversions NOT supported for rigged model outputs
 *    - Use GLB or FBX for rigged models
 *
 *  getFaceLimitConfig(smartLowPoly, quad) is imported from GeneratePanel
 *  so both panels always stay in sync with the same source of truth.
 */

/* ── Convert-model output formats ──────────────────────────────────────
 *  API accepted values: "glb", "fbx", "obj", "stl", "3mf", "usdz"
 *  Note: quad=true forces fbx regardless of this selection.
 *  Note: "obj" and "stl" are NOT supported for rigged model inputs.
 * ─────────────────────────────────────────────────────────────────── */
export const CONVERT_FORMATS = [
  { id: "glb", label: "GLB", note: "Web / AR / engines" },
  { id: "fbx", label: "FBX", note: "Unity · Unreal · rigged" },
  { id: "obj", label: "OBJ", note: "DCC · static only" },
  { id: "stl", label: "STL", note: "3D print · static only" },
  { id: "3mf", label: "3MF", note: "3D print (modern)" },
  { id: "usdz", label: "USDZ", note: "Apple AR / iOS" },
];

/* Formats that cannot be used with rigged model inputs */
const RIGGED_UNSUPPORTED_FORMATS = new Set(["obj", "stl"]);

function CoinIcon({ size = 15 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#f5c518,#e09900)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Zap style={{ width: size * 0.56, height: size * 0.56, color: "#0a0800" }} />
    </div>
  );
}

export default function Retopo({
  activeTaskId,
  quad, setQuad,
  smartLowPoly, setSmartLowPoly,
  polycount, setPolycount,
  /* convert_model extras */
  outFormat, setOutFormat,             // "glb" | "fbx" | "obj" | "stl" | "3mf" | "usdz"
  pivotToBottom, setPivotToBottom,     // pivot_to_center_bottom
  isRiggedInput,                       // caller passes true if the selected model is rigged/animated
}) {
  const cfg = getFaceLimitConfig(smartLowPoly, quad);
  const [localVal, setLocalVal] = React.useState(() => Math.max(cfg.min, polycount));
  const [fmtOpen, setFmtOpen] = React.useState(false);

  React.useEffect(() => {
    setLocalVal(Math.max(cfg.min, polycount));
  }, [polycount]); // eslint-disable-line

  function handleSetQuad(val) {
    setQuad(val);
    const next = getFaceLimitConfig(smartLowPoly, val);
    const reset = next.allowAuto ? 0 : next.defaultVal;
    setPolycount(reset);
    setLocalVal(reset);
    // Quad forces FBX — update format selection accordingly
    if (val && setOutFormat) setOutFormat("fbx");
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
  const selectedFmt = CONVERT_FORMATS.find(f => f.id === (outFormat ?? "glb")) ?? CONVERT_FORMATS[0];

  return (
    <>
      {/* Selected model badge */}
      {activeTaskId && (
        <div style={{ padding: "8px 12px", borderRadius: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <p style={{ color: "#b5b0ff", fontSize: 11, fontWeight: 600, margin: 0 }}>Selected model</p>
          <p style={{ color: "#2d2d48", fontSize: 10, margin: "2px 0 0", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeTaskId}</p>
        </div>
      )}

      {/* Rigged model warning */}
      {isRiggedInput && (
        <div style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.15)", display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={{ color: "#f5c518", fontSize: 9, marginTop: 1, flexShrink: 0 }}>⚠</span>
          <p style={{ color: "#fcd34d", fontSize: 10, margin: 0, lineHeight: 1.5 }}>
            Rigged model: OBJ and STL export are not supported. Use GLB or FBX.
          </p>
        </div>
      )}

      {/* Task mode indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, padding: "6px 9px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: smartLowPoly ? "#a5a0ff" : "#4a4a68", flexShrink: 0 }} />
        <p style={{ color: smartLowPoly ? "#a5a0ff" : "#4a4a68", fontSize: 10, margin: 0, lineHeight: 1.5, fontFamily: "monospace" }}>
          {smartLowPoly ? 'task: "smart_low_poly"' : 'task: "convert_model"'}
        </p>
      </div>

      {/* ── Smart Low Poly toggle ── */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", cursor: "pointer" }}
        onClick={() => handleSetSmartLowPoly(!smartLowPoly)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <CoinIcon />
          <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Smart Low Poly</span>
          <span style={{ background: "linear-gradient(135deg,#c026d3,#a21caf)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4 }}>v2</span>
          <Info 
            size={13} 
            style={{ color: "#4a4a68", cursor: "help" }} 
            title="Advanced mesh simplification that preserves surface detail on flat areas while keeping density on high-curvature areas."
          />
        </div>
        <div className={"tp-switch" + (smartLowPoly ? " on" : "")} style={{ background: smartLowPoly ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
      </div>

      {smartLowPoly && (
        <div style={{ padding: "6px 9px", borderRadius: 8, background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.18)", display: "flex", gap: 6, marginBottom: 6 }}>
          <HelpCircle style={{ width: 11, height: 11, color: "#a5a0ff", marginTop: 1, flexShrink: 0 }} />
          <p style={{ color: "#a5a0ff", fontSize: 10, margin: 0, lineHeight: 1.5 }}>
            {quad
              ? "Smart Low Poly + Quad: face limit required (500 – 10 000)"
              : "Smart Low Poly: face limit required (1 000 – 20 000)"}
            {" "}Simple inputs recommended — may fail on complex geometry.
          </p>
        </div>
      )}

      {/* ── Topology ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, marginTop: 8 }}>
        <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Topology</span>
        <Info 
          size={13} 
          style={{ color: "#4a4a68", cursor: "help" }} 
          title="Output the mesh using 4-sided faces (quads). Forces FBX format output."
        />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button className={"tp-topo-btn" + (quad ? " sel" : "")} onClick={() => handleSetQuad(true)}>Quad</button>
        <button className={"tp-topo-btn" + (!quad ? " sel" : "")} onClick={() => handleSetQuad(false)}>Triangle</button>
      </div>

      {/* Quad warning */}
      {quad && (
        <div style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.15)", display: "flex", gap: 6, marginBottom: 10 }}>
          <span style={{ color: "#f5c518", fontSize: 9, marginTop: 1, flexShrink: 0 }}>⚠</span>
          <p style={{ color: "#fcd34d", fontSize: 10, margin: 0, lineHeight: 1.5 }}>
            Quad forces FBX output. {!smartLowPoly && "Default face limit: 10 000."}
          </p>
        </div>
      )}

      {/* ── Output Format (convert_model mode only) ── */}
      {!smartLowPoly && setOutFormat && (
        <div style={{ marginBottom: 12, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Output Format</span>
            <HelpCircle 
              style={{ width: 13, height: 13, color: "#1e1e3a", cursor: "help" }} 
              title="Select the primary file format for your exported 3D model. Note: Quads force FBX format."
            />
          </div>
          <button
            disabled={quad}
            onClick={() => !quad && setFmtOpen(v => !v)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: quad ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: quad ? 0.5 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#e8e8f4", fontSize: 12, fontWeight: 700, fontFamily: "monospace", width: 36 }}>{quad ? "FBX" : selectedFmt.label}</span>
              <span style={{ color: "#2d2d48", fontSize: 11 }}>{quad ? "Forced by Quad" : selectedFmt.note}</span>
            </div>
            {!quad && <ChevronDown style={{ width: 12, height: 12, color: "#2d2d48", transform: fmtOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />}
          </button>

          {fmtOpen && !quad && (
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: "calc(100% + 4px)", zIndex: 50,
              background: "#131327", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
            }}>
              {CONVERT_FORMATS.map((f, i) => {
                const unsupported = isRiggedInput && RIGGED_UNSUPPORTED_FORMATS.has(f.id);
                return (
                  <button
                    key={f.id}
                    disabled={unsupported}
                    onClick={() => { if (!unsupported) { setOutFormat(f.id); setFmtOpen(false); } }}
                    style={{
                      width: "100%", padding: "9px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: outFormat === f.id ? "rgba(108,99,255,0.15)" : "transparent",
                      border: "none", borderBottom: i < CONVERT_FORMATS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      cursor: unsupported ? "not-allowed" : "pointer",
                      fontFamily: "inherit", opacity: unsupported ? 0.3 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: outFormat === f.id ? "#a5a0ff" : "#c8c8e0", fontSize: 12, fontWeight: 700, fontFamily: "monospace", width: 36 }}>{f.label}</span>
                      <span style={{ color: "#2d2d48", fontSize: 11 }}>{f.note}{unsupported ? " · not for rigged" : ""}</span>
                    </div>
                    {outFormat === f.id && <span style={{ color: "#a5a0ff", fontSize: 10 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Face Limit ── */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Face Limit</span>
          <HelpCircle 
            style={{ width: 13, height: 13, color: "#1e1e3a", cursor: "help" }} 
            title="Defines the target polygon count. Auto uses adaptive density. Fixed values force specific counts."
          />
          <span style={{ marginLeft: "auto", color: "#2d2d48", fontSize: 9, fontFamily: "monospace" }}>
            {cfg.allowAuto
              ? `Auto – ${(cfg.max / 1000).toFixed(0)}k`
              : `${cfg.min.toLocaleString()} – ${cfg.max.toLocaleString()} · required`}
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
              width: 80, padding: "5px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)", color: "#c8c8e0", fontSize: 12, fontFamily: "monospace",
              outline: "none", textAlign: "center", boxSizing: "border-box"
            }}
          />
        </div>

        <p style={{ color: "#4a4a68", fontSize: 10, margin: "5px 0 0", lineHeight: 1.5 }}>
          {showAuto && "Auto — adaptive, optimal face count determined by model"}
          {!showAuto && smartLowPoly && quad && "Smart Low Poly + Quad: 500 – 10 000 (required)"}
          {!showAuto && smartLowPoly && !quad && "Smart Low Poly: 1 000 – 20 000 (required)"}
          {!showAuto && !smartLowPoly && quad && "Quad: default 10 000 when unset"}
          {!showAuto && !smartLowPoly && !quad && `${localVal.toLocaleString()} faces`}
        </p>
      </div>

      {/* ── Pivot to Center Bottom (convert_model only) ── */}
      {!smartLowPoly && setPivotToBottom && (
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", cursor: "pointer", marginTop: 4 }}
          onClick={() => setPivotToBottom(v => !v)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Pivot to Center Bottom</span>
            <HelpCircle 
              style={{ width: 13, height: 13, color: "#1e1e3a", cursor: "help" }} 
              title="Repositions the model's origin to the center of its base (feet level). Essential for game engines."
            />
          </div>
          <div className={"tp-switch" + (pivotToBottom ? " on" : "")} style={{ background: pivotToBottom ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
        </div>
      )}
    </>
  );
}