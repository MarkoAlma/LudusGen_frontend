// trellis/Animate.jsx
import React, { useState } from "react";
import {
  PersonStanding, ChevronDown, Check, Loader2, Search, Zap,
} from "lucide-react";
import { ANIMATION_LIBRARY, ANIM_CATEGORIES } from "./animationlibrary";

const ANIM_MODEL_VERSIONS = [
  { id: "v2.5-animals", label: "v2.5 – Good for Animals", icon: "🐾" },
  { id: "v2.0-human", label: "v2.0 – Humanoid", icon: "🚶" },
];

function CoinIcon({ size = 15 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#f5c518,#e09900)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Zap style={{ width: size * 0.56, height: size * 0.56, color: "#0a0800" }} />
    </div>
  );
}

function AnimCard({ anim, isSelected, onSelect }) {
  const [err, setErr] = useState(false);
  return (
    <div
      className="anim-card"
      onClick={onSelect}
      style={{ border: "1px solid " + (isSelected ? "rgba(108,99,255,0.5)" : "rgba(255,255,255,0.07)"), background: isSelected ? "rgba(108,99,255,0.08)" : "#111122" }}
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
 *  rigStep, handleAutoRig
 *  selAnim, setSelAnim
 *  animModelVer, setAnimModelVer
 *  animSearch, setAnimSearch
 *  animCat, setAnimCat
 *  filtAnims  (pre-filtered animation list)
 */
export default function Animate({
  activeTaskId,
  animId,
  rigStep,
  handleAutoRig,
  selAnim, setSelAnim,
  animModelVer, setAnimModelVer,
  animSearch, setAnimSearch,
  animCat, setAnimCat,
  filtAnims,
}) {
  const [animModelDD, setAnimModelDD] = useState(false);
  const animModelInfo = ANIM_MODEL_VERSIONS.find(v => v.id === animModelVer);

  return (
    <>
      {/* AI Model dropdown */}
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
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 80, background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
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

      {/* Auto Rig button */}
      <button
        className={"auto-rig-btn" + ((activeTaskId || animId) && rigStep !== "rigging" ? " ready" : " disabled")}
        onClick={handleAutoRig}
        disabled={(!activeTaskId && !animId) || rigStep === "rigging"}
        style={{ marginBottom: 16 }}
      >
        {rigStep === "rigging"
          ? <><Loader2 style={{ width: 14, height: 14 }} className="anim-spin" />Rigging…</>
          : <><CoinIcon size={16} />Auto Rig<span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 400, marginLeft: 2 }}>20</span></>}
      </button>

      {/* Rigged confirmation */}
      {rigStep === "rigged" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 9, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 12 }}>
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
        {["all", "basic", "interactive", ...ANIM_CATEGORIES.filter(c => !["all", "basic", "interactive"].includes(c))].slice(0, 5).map(c => (
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
        {filtAnims.map(a => (
          <AnimCard key={a.id} anim={a} isSelected={selAnim === a.id} onSelect={() => setSelAnim(selAnim === a.id ? null : a.id)} />
        ))}
        {filtAnims.length === 0 && (
          <p style={{ gridColumn: "span 2", color: "#1e1e38", fontSize: 11, textAlign: "center", margin: "16px 0" }}>No results</p>
        )}
      </div>
    </>
  );
}