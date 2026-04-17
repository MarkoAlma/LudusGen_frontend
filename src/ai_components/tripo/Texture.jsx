// trellis/Texture.jsx
import React, { useState, useRef, useCallback } from "react";
import {
  Image, Cpu, Pencil, HelpCircle, Check, Loader2,
  PersonStanding, Zap, Upload, X,
} from "lucide-react";

/* ─── helpers ────────────────────────────────────────────────────────── */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/*
 *  Tripo API task mapping:
 *
 *  mode="texture"      → task type: "texture_model"
 *    Supported inputs: image (file_token), multi-view (files[]), text (prompt)
 *    Options: pbr (bool), texture_quality ("detailed" | "HD"), texture_seed
 *    NOTE: pbr=true generates albedo + normal + roughness + metallic maps.
 *          pbr=true OVERRIDES texture=true — the API treats them as exclusive.
 *    NOTE: texture_alignment: "original_image" (default) | "geometry"
 *
 *  mode="texture_edit" → task type: "texture_model" (with painted mask as reference image)
 *    Gen Mode: prompt-based regeneration via texture_model with mask file.
 *    Paint Mode: direct color painting on 3D viewport, canvas sent as mask.
 *
 *  REMOVED modes (not available as separate Tripo API v2 tasks):
 *    texture_upscale → no such task exists
 *    texture_pbr     → not a separate task; use texture_model with pbr=true
 */

/* ─── Tab definitions ───────────────────────────────────────────────── */
const TEX_INPUT_TABS = [
  { id: "image", icon: Image, tip: "Image reference" },
  { id: "multi", icon: Cpu, tip: "Multi-view" },
  { id: "text", icon: Pencil, tip: "Text prompt" },
];

/* ─── helpers ────────────────────────────────────────────────────────── */
function CoinIcon({ size = 15 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#f5c518,#e09900)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Zap style={{ width: size * 0.56, height: size * 0.56, color: "#0a0800" }} />
    </div>
  );
}

function SelectedModelBadge({ activeTaskId }) {
  if (!activeTaskId) return null;
  return (
    <div style={{ padding: "8px 12px", borderRadius: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <p style={{ color: "#b5b0ff", fontSize: 11, fontWeight: 600, margin: 0 }}>Selected model</p>
      <p style={{ color: "#2d2d48", fontSize: 10, margin: "2px 0 0", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {activeTaskId}
      </p>
    </div>
  );
}

/* ─── TexInputBox ────────────────────────────────────────────────────── */
function TexInputBox({
  tab, setTab,
  texPrompt, setTexPrompt,
  imgPrev, imgToken, imgUploading, handleImg, fileRef,
  multiImages, setMultiImages,
}) {
  const VIEW_SLOTS = ["Front", "Left", "Right", "Back"];

  return (
    <div className="tex-input-box">
      {/* Tab bar */}
      <div className="tex-tab-bar">
        {TEX_INPUT_TABS.map(t => (
          <button
            key={t.id}
            className={"tex-tab" + (tab === t.id ? " on" : "")}
            onClick={() => setTab(t.id)}
            title={t.tip}
            style={{ color: tab === t.id ? "#e8e8f4" : "#2d2d48" }}
          >
            <t.icon style={{ width: 15, height: 15 }} />
          </button>
        ))}
      </div>

      {/* ── Image tab ── */}
      {tab === "image" && (
        <div
          className="tp-drop checker"
          onClick={() => !imgUploading && fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImg(f); }}
          style={{ width: "100%", aspectRatio: "1/1", cursor: imgUploading ? "wait" : "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {imgPrev ? (
            <>
              <img src={imgPrev} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {imgUploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(9,9,18,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 style={{ width: 24, height: 24, color: "#6c63ff" }} className="anim-spin" />
                </div>
              )}
              {imgToken && !imgUploading && (
                <div style={{ position: "absolute", bottom: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check style={{ width: 12, height: 12, color: "#fff" }} />
                </div>
              )}
              {/* Clear button */}
              <button
                onClick={e => { e.stopPropagation(); handleImg(null); }}
                style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X style={{ width: 11, height: 11, color: "#fff" }} />
              </button>
            </>
          ) : (
            <div style={{ textAlign: "center", pointerEvents: "none", padding: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 9px" }}>
                <Upload style={{ width: 18, height: 18, color: "#2d2d48" }} />
              </div>
              <p style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Upload reference image</p>
              <p style={{ color: "#2d2d48", fontSize: 10, margin: 0 }}>JPG, PNG, WEBP  ≤ 20MB</p>
            </div>
          )}
        </div>
      )}

      {/* ── Multi-view tab ── */}
      {tab === "multi" && (
        <div className="mv-grid">
          {VIEW_SLOTS.map((slot, i) => {
            const prev = multiImages?.[i]?.preview;
            return (
              <div
                key={slot}
                className="mv-cell checker"
                onClick={() => {
                  const inp = document.createElement("input");
                  inp.type = "file"; inp.accept = "image/*";
                  inp.onchange = e => {
                    const f = e.target.files[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = ev => {
                        const next = [...(multiImages || [])];
                        next[i] = { file: f, preview: ev.target.result };
                        setMultiImages(next);
                      };
                      r.readAsDataURL(f);
                    }
                  };
                  inp.click();
                }}
              >
                <div style={{ position: "absolute", top: 5, left: 5, zIndex: 2 }}><CoinIcon size={13} /></div>
                {prev ? (
                  <img src={prev} alt={slot} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                ) : (
                  <>
                    <PersonStanding style={{ width: 20, height: 20, color: "#2d2d48" }} />
                    <span style={{ color: "#2d2d48", fontSize: 10, fontWeight: 500 }}>{slot}</span>
                    <span style={{ color: "#1a1a30", fontSize: 9 }}>JPG, PNG, WEBP  ≤ 20MB</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Text tab ── */}
      {tab === "text" && (
        <div style={{ position: "relative", padding: "4px 0 0" }}>
          <textarea
            className="tp-ta"
            value={texPrompt}
            onChange={e => setTexPrompt(e.target.value.slice(0, 1000))}
            placeholder="Describe the texture style you want to generate…"
            rows={7}
            style={{ minHeight: 160 }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px 10px" }}>
            <button style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap style={{ width: 13, height: 13, color: "#f5c518" }} />
            </button>
            <span style={{ color: "#2d2d48", fontSize: 10, fontFamily: "monospace" }}>{texPrompt.length}/1000</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MagicBrushPanel ────────────────────────────────────────────────── */
function MagicBrushPanel({
  brushPrompt, setBrushPrompt,
  creativity, setCreativity,
  brushMode, setBrushMode,
  brushColor, setBrushColor,
  brushSize, setBrushSize,
  canvasRef,
}) {
  const spectrumRef = useRef(null);
  const [spectrumPct, setSpectrumPct] = useState(50);

  /* ── pick color from the rainbow bar ─────────────────────────────── */
  const pickFromSpectrum = useCallback((clientX) => {
    const el = spectrumRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setSpectrumPct(Math.round(pct * 100));
    /* HSL rainbow: hue 0→360 maps to the bar's 0→1 */
    const hue = pct * 360;
    const hex = hslToHex(hue, 100, 50);
    setBrushColor(hex);
  }, [setBrushColor]);

  const handleSpectrumMouseDown = useCallback((e) => {
    pickFromSpectrum(e.clientX);
    const onMove = (ev) => pickFromSpectrum(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [pickFromSpectrum]);

  const handleHex = e => {
    const hex = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    setBrushColor("#" + hex);
  };

  return (
    <div>
      {/* Mode switcher */}
      <div style={{ display: "flex", gap: 3, padding: "4px", background: "rgba(255,255,255,0.05)", borderRadius: 13, marginBottom: 16, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)" }}>
        {["Gen Mode", "Paint Mode"].map(m => (
          <button
            key={m}
            className={"magic-mode-tab" + (brushMode === m ? " on" : "")}
            onClick={() => setBrushMode(m)}
          >{m}</button>
        ))}
      </div>

      {/* Gen Mode — prompt-based inpainting */}
      {brushMode === "Gen Mode" && (
        <>
          <div style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", marginBottom: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <textarea
              className="tp-ta"
              value={brushPrompt}
              onChange={e => setBrushPrompt(e.target.value.slice(0, 1000))}
              placeholder="Describe the new texture for the painted region…"
              rows={7}
              style={{ minHeight: 140, padding: "12px 12px 4px" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 12px 10px" }}>
              <span style={{ color: "#2d2d48", fontSize: 10, fontFamily: "monospace" }}>{brushPrompt.length}/1000</span>
            </div>
          </div>

          {/* Creativity Strength (creativity_strength: 0 – 1) */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Creativity Strength</span>
              <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
              <span style={{ marginLeft: "auto", color: "#2d2d48", fontSize: 9, fontFamily: "monospace" }}>0 – 1</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range" min={0} max={1} step={0.01}
                value={creativity}
                onChange={e => setCreativity(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#6c63ff" }}
              />
              <div style={{ width: 52, padding: "5px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", textAlign: "center" }}>
                <span style={{ color: "#c8c8e0", fontSize: 12, fontFamily: "monospace" }}>{creativity.toFixed(2)}</span>
              </div>
            </div>
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "5px 0 0", lineHeight: 1.5 }}>
              {creativity < 0.4 && "Conservative — stays close to original texture"}
              {creativity >= 0.4 && creativity < 0.7 && "Balanced — moderate creativity"}
              {creativity >= 0.7 && "High — freely reimagines the painted area"}
            </p>
          </div>
        </>
      )}

      {/* Paint Mode — direct color painting on canvas */}
      {brushMode === "Paint Mode" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Drawing canvas */}
          <div style={{ borderRadius: 13, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              style={{ width: "100%", aspectRatio: "1/1", display: "block", cursor: "crosshair", background: "#1a1a2e" }}
            />
            <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.5)", borderRadius: 4, padding: "2px 6px" }}>
                Paint mask
              </span>
            </div>
          </div>

          {/* Brush size */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Brush Size</span>
              <span style={{ marginLeft: "auto", color: "#2d2d48", fontSize: 9, fontFamily: "monospace" }}>1 – 50</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range" min={1} max={50} step={1}
                value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#6c63ff" }}
              />
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)" }}>
                <div style={{ width: Math.max(4, Math.min(32, brushSize)), height: Math.max(4, Math.min(32, brushSize)), borderRadius: "50%", background: brushColor }} />
              </div>
            </div>
          </div>

          {/* Color spectrum bar */}
          <div
            ref={spectrumRef}
            onPointerDown={handleSpectrumMouseDown}
            style={{ height: 14, borderRadius: 7, background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)", cursor: "pointer", position: "relative" }}
          >
            <div style={{ position: "absolute", top: -2, left: `${spectrumPct}%`, width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "2px solid rgba(0,0,0,0.3)", transform: "translateX(-50%)", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", pointerEvents: "none" }} />
          </div>

          {/* Color swatch + hex input */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: brushColor, border: "2px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />
            <input
              value={brushColor.replace("#", "").toUpperCase()}
              onChange={handleHex}
              style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#e4e4f0", fontSize: 12, fontFamily: "monospace", outline: "none", textAlign: "center" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── main export ────────────────────────────────────────────────────── */
/*
 *  mode: "texture" | "texture_edit"
 *
 *  "texture"      → texture_model API task
 *                   supports image / multi-view / text input
 *                   options: pbr, tex4K (texture_quality "HD"), texture_seed
 *
 *  "texture_edit" → texture_model API task (with painted mask as file reference)
 *                   Gen Mode / Paint Mode
 *
 *  REMOVED: "texture_upscale" — no such Tripo API v2 task
 *  REMOVED: "texture_pbr"    — use mode="texture" with pbrOn=true instead
 */
export default function Texture({
  mode,
  activeTaskId,                              // shown as selected model badge in all modes
  // texture mode inputs
  texInputTab, setTexInputTab,
  texPrompt, setTexPrompt,
  imgPrev, imgToken, imgUploading, handleImg, fileRef,
  multiImages, setMultiImages,
  // texture mode options
  tex4K, setTex4K,                           // texture_quality: "HD" vs "detailed"
  pbrOn, setPbrOn,                           // pbr: true — generates albedo/normal/roughness/metallic
  texAlignment, setTexAlignment,             // texture_alignment: "original_image" | "geometry"
  // texture_edit mode
  brushMode, setBrushMode,
  brushPrompt, setBrushPrompt,
  creativity, setCreativity,                 // creativity_strength 0–1
  brushColor, setBrushColor,
  brushSize, setBrushSize,                   // brush radius in pixels
  canvasRef,                                 // ref for the paint canvas element
}) {
  return (
    <>
      {/* ── TEXTURE (texture_model) ── */}
      {mode === "texture" && (
        <>
          <SelectedModelBadge activeTaskId={activeTaskId} />

          <TexInputBox
            tab={texInputTab} setTab={setTexInputTab}
            texPrompt={texPrompt} setTexPrompt={setTexPrompt}
            imgPrev={imgPrev} imgToken={imgToken}
            imgUploading={imgUploading} handleImg={handleImg} fileRef={fileRef}
            multiImages={multiImages} setMultiImages={setMultiImages}
          />

          {/* ── 4K Texture (texture_quality: "HD") ── */}
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", cursor: "pointer" }}
            onClick={() => setTex4K(v => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <CoinIcon size={14} />
              <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>4K Texture</span>
              <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
            </div>
            <div className={"tp-switch" + (tex4K ? " on" : "")} style={{ background: tex4K ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
          </div>
          {tex4K && (
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              texture_quality: "HD" — higher resolution, slower generation.
            </p>
          )}

          {/* ── PBR Maps ── */}
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", cursor: "pointer" }}
            onClick={() => setPbrOn(v => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>PBR Maps</span>
              <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
            </div>
            <div className={"tp-switch" + (pbrOn ? " on" : "")} style={{ background: pbrOn ? "#4c8ef7" : "rgba(255,255,255,0.12)" }} />
          </div>
          {pbrOn && (
            <p style={{ color: "#4a4a68", fontSize: 10, margin: "-4px 0 4px", lineHeight: 1.5 }}>
              Generates albedo, normal, roughness & metallic maps. Overrides standard texture output.
            </p>
          )}

          {/* ── Texture Alignment ── */}
          {setTexAlignment && (texInputTab === "image" || texInputTab === "multi") && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <span style={{ color: "#c8c8e0", fontSize: 13, fontWeight: 500 }}>Texture Alignment</span>
                <HelpCircle style={{ width: 13, height: 13, color: "#1e1e3a" }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "original_image", label: "Image" },
                  { id: "geometry", label: "Geometry" },
                ].map(opt => (
                  <button
                    key={opt.id}
                    className="tp-topo-btn"
                    onClick={() => setTexAlignment(opt.id)}
                    style={{
                      background: texAlignment === opt.id ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
                      color: texAlignment === opt.id ? "#a5a0ff" : "#3d3d5a",
                      outline: texAlignment === opt.id ? "1.5px solid rgba(108,99,255,0.4)" : "1.5px solid rgba(255,255,255,0.07)",
                    }}
                  >{opt.label}</button>
                ))}
              </div>
              <p style={{ color: "#4a4a68", fontSize: 10, margin: "5px 0 0", lineHeight: 1.5 }}>
                {texAlignment === "original_image"
                  ? "Aligns texture colours to the reference image."
                  : "Aligns texture to the model's surface geometry."}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── MAGIC BRUSH (texture_edit) ── */}
      {mode === "texture_edit" && (
        <>
          <SelectedModelBadge activeTaskId={activeTaskId} />
          <MagicBrushPanel
            brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt}
            creativity={creativity} setCreativity={setCreativity}
            brushMode={brushMode} setBrushMode={setBrushMode}
            brushColor={brushColor} setBrushColor={setBrushColor}
            brushSize={brushSize} setBrushSize={setBrushSize}
            canvasRef={canvasRef}
          />
        </>
      )}
    </>
  );
}