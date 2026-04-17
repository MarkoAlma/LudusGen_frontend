// trellis/Animate.jsx
import React, { useState } from "react";
import {
  PersonStanding, ChevronDown, ChevronRight, Check, Loader2, Search, Zap, AlertCircle,
} from "lucide-react";
import { ANIMATION_LIBRARY, ANIM_CATEGORIES } from "./animationlibrary";

const ANIM_MODEL_VERSIONS = [
  { id: "v1", label: "v1.0 – Full Biped Library (80+)", icon: "🎭" },
  { id: "v2", label: "v2.0 – Humanoid (16)", icon: "🚶" },
  { id: "v2.5", label: "v2.5 – Animals (16)", icon: "🐾" },
];

const RIG_TYPES = [
  { id: "biped", label: "Biped (Humanoid)" },
  { id: "quadruped", label: "Quadruped" },
  { id: "hexapod", label: "Hexapod" },
  { id: "octopod", label: "Octopod" },
  { id: "avian", label: "Avian" },
  { id: "serpentine", label: "Serpentine" },
  { id: "aquatic", label: "Aquatic" },
];

const RIG_SPECS = [
  { id: "tripo", label: "Tripo (default)" },
  { id: "mixamo", label: "Mixamo" },
];

function CoinIcon({ size = 15 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#f5c518,#e09900)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Zap style={{ width: size * 0.56, height: size * 0.56, color: "#0a0800" }} />
    </div>
  );
}

function AnimCard({ anim, isSelected, selCount, onSelect }) {
  const [err, setErr] = useState(false);
  return (
    <div
      className="anim-card"
      onClick={onSelect}
      style={{ border: "1px solid " + (isSelected ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.07)"), background: isSelected ? "rgba(139,92,246,0.08)" : "#111122" }}
    >
      <div style={{ aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", background: "#111122", position: "relative", overflow: "hidden" }}>
        {!err
          ? <img src={anim.gif} alt={anim.label} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          : <PersonStanding style={{ width: 28, height: 28, color: "#2a2a44" }} />}
        {isSelected && (
          <div style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: "#6c63ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check style={{ width: 9, height: 9, color: "#fff" }} />
          </div>
        )}
        {!isSelected && selCount >= 5 && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#8a8aaa", fontSize: 9, fontWeight: 700 }}>MAX</span>
          </div>
        )}
      </div>
      <div style={{ padding: "5px 7px 6px", background: "#0d0d1a" }}>
        <span style={{ color: "#9090b8", fontSize: 9, fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{anim.label}</span>
      </div>
    </div>
  );
}

/**
 * Props:
 *  activeTaskId, animId
 *  rigStep, handleAutoRig, handlePrerigcheck
 *  prerigcheckResult  { riggable: bool, rigType: string } | null
 *  selAnim, setSelAnim
 *  animModelVer, setAnimModelVer  (for auto-rig: "v1", "v2", or "v2.5")
 *  rigType, setRigType            (for auto-rig: biped, quadruped, etc.)
 *  rigSpec, setRigSpec            (for auto-rig: "tripo" or "mixamo")
 *  detectedRigType                (auto-detected rig type from prerigcheck or history)
 *  animSearch, setAnimSearch
 *  animCat, setAnimCat
 *  filtAnims  (pre-filtered animation list)
 *  animOutFormat, setAnimOutFormat
 *  animBakeAnimation, setAnimBakeAnimation
 *  animExportGeometry, setAnimExportGeometry
 *  animAnimateInPlace, setAnimAnimateInPlace
 */
export default function Animate({
  activeTaskId,
  animId,
  rigStep,
  handleAutoRig,
  handlePrerigcheck,
  prerigcheckResult,
  selAnim, setSelAnim,
  animModelVer, setAnimModelVer,
  rigType, setRigType,
  rigSpec, setRigSpec,
  detectedRigType,
  detectedRigModelVer,
  detectedRigSpec,
  animSearch, setAnimSearch,
  animCat, setAnimCat,
  filtAnims,
  animOutFormat, setAnimOutFormat,
  animBakeAnimation, setAnimBakeAnimation,
  animExportGeometry, setAnimExportGeometry,
  animAnimateInPlace, setAnimAnimateInPlace,
}) {
  const [animModelDD, setAnimModelDD] = useState(false);
  const [rigTypeDD, setRigTypeDD] = useState(false);
  const [rigSpecDD, setRigSpecDD] = useState(false);
  const [outputOptsOpen, setOutputOptsOpen] = useState(false);
  const animModelInfo = ANIM_MODEL_VERSIONS.find(v => v.id === animModelVer);
  const rigTypeInfo = RIG_TYPES.find(r => r.id === rigType);
  const rigSpecInfo = RIG_SPECS.find(s => s.id === rigSpec);

  // detectedRigModelVer is only set when a rigged model is actively selected or just rigged.
  // null + rigStep !== "rigged"  → no rig loaded, show all, UI dropdown controls new rigs
  // null + rigStep === "rigged"  → old item without metadata, show all (can't know version)
  // set                          → filter by saved rig version, ignore UI dropdown

  const v1Cats = ["all", ...ANIM_CATEGORIES.filter(c => !["all", "basic", "interactive", "v2_only"].includes(c))];
  const v2Cats = ["all", "idle", "walking", "running", "combat", "action", "other"];

  // savedRigLibVer: "v1" | "v2" | null (null = show all)
  const savedRigLibVer = !detectedRigModelVer
    ? null
    : detectedRigModelVer.startsWith("v1") ? "v1" : "v2";

  const effectiveAnims = savedRigLibVer === null
    ? filtAnims
    : filtAnims.filter(a => a.rigVersion === savedRigLibVer);

  const visibleCats = savedRigLibVer === "v1" ? v1Cats : v2Cats;

  if (savedRigLibVer === "v2" && !v2Cats.includes(animCat)) {
    setAnimCat("all");
  }

  const hasModel = !!(activeTaskId || animId);

  return (
    <>
      {/* AI Model / Rig Version selector */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ color: "#8a8aaa", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 7 }}>AI Model</span>
        <div style={{ position: "relative" }}>
          <button className="anim-model-dd" onClick={() => setAnimModelDD(v => !v)}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(108,99,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <PersonStanding style={{ width: 16, height: 16, color: "#a5a0ff" }} />
            </div>
            <span style={{ color: "#e8e8f4", fontSize: 12, fontWeight: 600, flex: 1, textAlign: "left" }}>{animModelInfo?.label}</span>
            <ChevronDown style={{ width: 14, height: 14, color: "#2d2d48", transform: animModelDD ? "rotate(180deg)" : "none", transition: "transform 0.14s" }} />
          </button>
          {animModelDD && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 80, background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)" }}>
              {ANIM_MODEL_VERSIONS.map(v => (
                <button key={v.id}
                  onClick={() => { setAnimModelVer(v.id); setAnimModelDD(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                    background: animModelVer === v.id ? "rgba(108,99,255,0.1)" : "transparent",
                    border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: "1px solid rgba(255,255,255,0.04)"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = animModelVer === v.id ? "rgba(108,99,255,0.1)" : "transparent"}>
                  <span style={{ fontSize: 14 }}>{v.icon}</span>
                  <span style={{ color: "#c8c8e0", fontSize: 12 }}>{v.label}</span>
                  {animModelVer === v.id && <Check style={{ width: 12, height: 12, color: "#a5a0ff", marginLeft: "auto" }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rig Type selector — only for v1 */}
      {animModelVer === "v1" && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: "#8a8aaa", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 7 }}>Rig Type</span>
          <div style={{ position: "relative" }}>
            <button className="anim-model-dd" onClick={() => setRigTypeDD(v => !v)}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(108,99,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PersonStanding style={{ width: 16, height: 16, color: "#a5a0ff" }} />
              </div>
              <span style={{ color: "#e8e8f4", fontSize: 12, fontWeight: 600, flex: 1, textAlign: "left", textTransform: "capitalize" }}>{rigTypeInfo?.label}</span>
              <ChevronDown style={{ width: 14, height: 14, color: "#2d2d48", transform: rigTypeDD ? "rotate(180deg)" : "none", transition: "transform 0.14s" }} />
            </button>
            {rigTypeDD && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 80, background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)" }}>
                {RIG_TYPES.map(r => (
                  <button key={r.id}
                    onClick={() => { setRigType(r.id); setRigTypeDD(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      background: rigType === r.id ? "rgba(108,99,255,0.1)" : "transparent",
                      border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: "1px solid rgba(255,255,255,0.04)",
                      textTransform: "capitalize",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = rigType === r.id ? "rgba(108,99,255,0.1)" : "transparent"}>
                    <span style={{ color: "#c8c8e0", fontSize: 12 }}>{r.label}</span>
                    {rigType === r.id && <Check style={{ width: 12, height: 12, color: "#a5a0ff", marginLeft: "auto" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rig Spec selector — only for v1 */}
      {animModelVer === "v1" && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: "#8a8aaa", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 7 }}>Rig Spec</span>
          <div style={{ position: "relative" }}>
            <button className="anim-model-dd" onClick={() => setRigSpecDD(v => !v)}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(108,99,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PersonStanding style={{ width: 16, height: 16, color: "#a5a0ff" }} />
              </div>
              <span style={{ color: "#e8e8f4", fontSize: 12, fontWeight: 600, flex: 1, textAlign: "left" }}>{rigSpecInfo?.label}</span>
              <ChevronDown style={{ width: 14, height: 14, color: "#2d2d48", transform: rigSpecDD ? "rotate(180deg)" : "none", transition: "transform 0.14s" }} />
            </button>
            {rigSpecDD && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 80, background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)" }}>
                {RIG_SPECS.map(s => (
                  <button key={s.id}
                    onClick={() => { setRigSpec(s.id); setRigSpecDD(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      background: rigSpec === s.id ? "rgba(108,99,255,0.1)" : "transparent",
                      border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = rigSpec === s.id ? "rgba(108,99,255,0.1)" : "transparent"}>
                    <span style={{ color: "#c8c8e0", fontSize: 12 }}>{s.label}</span>
                    {rigSpec === s.id && <Check style={{ width: 12, height: 12, color: "#a5a0ff", marginLeft: "auto" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prerigcheck button */}
      {hasModel && rigStep === "idle" && (
        <button
          className="auto-rig-btn ready"
          onClick={handlePrerigcheck}
          style={{ marginBottom: 8, background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.3)" }}
        >
          <Search style={{ width: 14, height: 14 }} />Check Rig Compatibility
        </button>
      )}

      {/* Prerigcheck result */}
      {prerigcheckResult && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 11, marginBottom: 12,
          background: prerigcheckResult.riggable ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
          border: "1px solid " + (prerigcheckResult.riggable ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"),
        }}>
          {prerigcheckResult.riggable
            ? <Check style={{ width: 11, height: 11, color: "#22c55e", flexShrink: 0 }} />
            : <AlertCircle style={{ width: 11, height: 11, color: "#ef4444", flexShrink: 0 }} />}
          <span style={{ fontSize: 11, color: prerigcheckResult.riggable ? "#86efac" : "#fca5a5" }}>
            {prerigcheckResult.riggable
              ? `Riggable — detected type: ${prerigcheckResult.rigType}`
              : "Model may not be riggable"}
          </span>
        </div>
      )}

      {/* Auto Rig button */}
      <button
        className={"auto-rig-btn" + (hasModel && rigStep !== "rigging" ? " ready" : " disabled")}
        onClick={handleAutoRig}
        disabled={!hasModel || rigStep === "rigging"}
        style={{ marginBottom: 16 }}
      >
        {rigStep === "rigging"
          ? <><Loader2 style={{ width: 14, height: 14 }} className="anim-spin" />Rigging…</>
          : <><CoinIcon size={16} />Auto Rig<span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 400, marginLeft: 2 }}>25</span></>}
      </button>

      {/* Rigged confirmation */}
      {rigStep === "rigged" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 11, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 12 }}>
          <Check style={{ width: 11, height: 11, color: "#22c55e", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#86efac" }}>Rigged — select an animation below</span>
        </div>
      )}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <Search style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "#2d2d48" }} />
        <input value={animSearch} onChange={e => setAnimSearch(e.target.value)} placeholder="Search"
          className="tp-input" style={{ paddingLeft: 28, fontSize: 11 }} />
      </div>

      {/* Category pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {visibleCats.map(c => (
          <button key={c} onClick={() => setAnimCat(c)}
            style={{
              padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none",
              textTransform: "capitalize",
              background: animCat === c ? "rgba(108,99,255,0.22)" : "rgba(255,255,255,0.06)",
              color: animCat === c ? "#a5a0ff" : "#5a5a7a",
              outline: animCat === c ? "1px solid rgba(108,99,255,0.4)" : "1px solid transparent",
              fontFamily: "inherit"
            }}>
            {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Animation grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {effectiveAnims.map(a => (
          <AnimCard key={a.id} anim={a} isSelected={selAnim.has(a.id)} selCount={selAnim.size} onSelect={() => {
            setSelAnim(prev => {
              const next = new Set(prev);
              if (next.has(a.id)) { next.delete(a.id); }
              else if (next.size < 5) { next.add(a.id); }
              return next;
            });
          }} />
        ))}
        {effectiveAnims.length === 0 && (
          <p style={{ gridColumn: "span 2", color: "#1e1e38", fontSize: 11, textAlign: "center", margin: "16px 0" }}>No results</p>
        )}
      </div>

      {/* Output Options — collapsible */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => setOutputOptsOpen(v => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 6,
            padding: "7px 10px", borderRadius: 8, cursor: "pointer",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            color: "#8a8aaa", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          {outputOptsOpen
            ? <ChevronDown style={{ width: 13, height: 13 }} />
            : <ChevronRight style={{ width: 13, height: 13 }} />}
          Output Options
        </button>

        {outputOptsOpen && (
          <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Output Format: glb / fbx */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#8a8aaa", fontSize: 11 }}>Format</span>
              <div style={{ display: "flex", gap: 4 }}>
                {["glb", "fbx"].map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setAnimOutFormat(fmt)}
                    style={{
                      padding: "3px 12px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase",
                      border: "1px solid " + (animOutFormat === fmt ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.07)"),
                      background: animOutFormat === fmt ? "rgba(108,99,255,0.18)" : "rgba(255,255,255,0.04)",
                      color: animOutFormat === fmt ? "#a5a0ff" : "#5a5a7a",
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Bake Animation */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: animOutFormat === "fbx" ? "default" : "pointer", opacity: animOutFormat === "fbx" ? 0.45 : 1 }}>
              <input
                type="checkbox"
                checked={animBakeAnimation}
                disabled={animOutFormat === "fbx"}
                onChange={e => setAnimBakeAnimation(e.target.checked)}
                style={{ accentColor: "#6c63ff", width: 13, height: 13, flexShrink: 0 }}
              />
              <span style={{ color: "#8a8aaa", fontSize: 11, flex: 1 }}>Bake Animation</span>
            </label>
            {animOutFormat === "fbx" && (
              <div style={{ paddingLeft: 21, marginBottom: 6 }}>
                <span style={{ color: "#4a4a6a", fontSize: 10 }}>Only available for GLB format</span>
              </div>
            )}

            {/* Export with Geometry */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={animExportGeometry}
                onChange={e => setAnimExportGeometry(e.target.checked)}
                style={{ accentColor: "#6c63ff", width: 13, height: 13, flexShrink: 0 }}
              />
              <span style={{ color: "#8a8aaa", fontSize: 11 }}>Export with Geometry</span>
            </label>

            {/* Animate in Place */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={animAnimateInPlace}
                onChange={e => setAnimAnimateInPlace(e.target.checked)}
                style={{ accentColor: "#6c63ff", width: 13, height: 13, flexShrink: 0 }}
              />
              <span style={{ color: "#8a8aaa", fontSize: 11 }}>Animate in Place</span>
            </label>
          </div>
        )}
      </div>
    </>
  );
}