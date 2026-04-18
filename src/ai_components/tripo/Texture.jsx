// tripo/Texture.jsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Image, Cpu, Pencil, HelpCircle, Check, Loader2,
  PersonStanding, Upload, X, RotateCcw,
  Paintbrush, Wand2,
} from "lucide-react";

/* ─── color helpers ─────────────────────────────────────────────────────── */
export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { r, g, b };
}

function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = n => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/* ─── design tokens ─────────────────────────────────────────────────────── */
const T = {
  bg: "#0a0a14",
  glass: "rgba(255,255,255,0.03)",
  glassBorder: "rgba(255,255,255,0.07)",
  glassBorderHover: "rgba(255,255,255,0.12)",
  divider: "rgba(255,255,255,0.06)",
  purple: "#8b5cf6",
  cyan: "#00e5ff",
  pink: "#ff007f",
  textPrimary: "#e8e8f4",
  textMuted: "#7a7a9a",
  textDim: "#3d3d5a",
  labelStyle: {
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#6b6b8a",
  },
};

/* ─── micro components ──────────────────────────────────────────────────── */
function Divider() {
  return <div style={{ height: 1, background: T.divider, margin: "14px 0" }} />;
}

function SectionLabel({ children }) {
  return (
    <div style={{ ...T.labelStyle, marginBottom: 8 }}>{children}</div>
  );
}

function ValueBadge({ children }) {
  return (
    <span style={{
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: 700,
      color: T.textPrimary,
      background: "rgba(255,255,255,0.06)",
      border: `1px solid ${T.glassBorder}`,
      borderRadius: 6,
      padding: "2px 7px",
      minWidth: 38,
      textAlign: "center",
      display: "inline-block",
    }}>{children}</span>
  );
}

function StyledSlider({ min, max, step, value, onChange, color = T.purple }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      style={{
        flex: 1,
        accentColor: color,
        cursor: "pointer",
        height: 4,
        appearance: "auto",
        WebkitAppearance: "auto",
      }}
    />
  );
}

function GlassSwitch({ on, onChange }) {
  return (
    <motion.div
      onClick={onChange}
      whileTap={{ scale: 0.95 }}
      style={{
        width: 38,
        height: 22,
        borderRadius: 11,
        background: on ? T.purple : "rgba(255,255,255,0.1)",
        border: `1px solid ${on ? "rgba(139,92,246,0.5)" : T.glassBorder}`,
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s, border-color 0.2s",
        boxShadow: on ? `0 0 10px rgba(139,92,246,0.3)` : "none",
      }}
    >
      <motion.div
        animate={{ left: on ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        style={{
          position: "absolute",
          top: 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }}
      />
    </motion.div>
  );
}

/* ─── Tab definitions ───────────────────────────────────────────────────── */
const TEX_INPUT_TABS = [
  { id: "image", icon: Image, tip: "Image reference" },
  { id: "multi", icon: Cpu, tip: "Multi-view" },
  { id: "text", icon: Pencil, tip: "Text prompt" },
];

/* ─── SelectedModelBadge ─────────────────────────────────────────────────── */
export function SelectedModelBadge({ activeTaskId }) {
  if (!activeTaskId) return null;
  return (
    <div style={{
      padding: "10px 14px",
      borderRadius: 12,
      background: "rgba(139,92,246,0.07)",
      border: "1px solid rgba(139,92,246,0.22)",
      marginBottom: 14,
      boxShadow: "0 0 16px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>
      <p style={{ color: "#b5a8ff", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 3px" }}>
        Selected Model
      </p>
      <p style={{
        color: T.textMuted,
        fontSize: 10,
        margin: 0,
        fontFamily: "monospace",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {activeTaskId}
      </p>
    </div>
  );
}

/* ─── TexInputBox ────────────────────────────────────────────────────────── */
export function TexInputBox({
  tab, setTab,
  texPrompt, setTexPrompt,
  imgPrev, imgToken, imgUploading, handleImg, fileRef,
  multiImages, setMultiImages,
}) {
  const VIEW_SLOTS = ["Front", "Left", "Right", "Back"];

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${T.glassBorder}`,
      background: T.glass,
      overflow: "hidden",
      marginBottom: 14,
      backdropFilter: "blur(16px)",
    }}>
      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: 2,
        padding: "6px 6px 0",
        borderBottom: `1px solid ${T.divider}`,
      }}>
        {TEX_INPUT_TABS.map(t => (
          <motion.button
            key={t.id}
            onClick={() => setTab(t.id)}
            title={t.tip}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "7px 4px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              background: tab === t.id ? "rgba(139,92,246,0.15)" : "transparent",
              color: tab === t.id ? "#c4b5fd" : T.textDim,
              borderBottom: tab === t.id ? `2px solid ${T.purple}` : "2px solid transparent",
              transition: "all 0.18s",
            }}
          >
            <t.icon style={{ width: 13, height: 13 }} />
            <span style={{ display: "inline" }}>{t.tip.split(" ")[0]}</span>
          </motion.button>
        ))}
      </div>

      {/* Image tab */}
      {tab === "image" && (
        <div
          onClick={() => !imgUploading && fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImg(f); }}
          style={{
            width: "100%",
            aspectRatio: "1/1",
            cursor: imgUploading ? "wait" : "pointer",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px",
          }}
        >
          {imgPrev ? (
            <>
              <img src={imgPrev} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {imgUploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,20,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 style={{ width: 24, height: 24, color: T.purple }} className="anim-spin" />
                </div>
              )}
              {imgToken && !imgUploading && (
                <div style={{ position: "absolute", bottom: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check style={{ width: 12, height: 12, color: "#fff" }} />
                </div>
              )}
              <motion.button
                onClick={e => { e.stopPropagation(); handleImg(null); }}
                whileTap={{ scale: 0.9 }}
                style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X style={{ width: 11, height: 11, color: "#fff" }} />
              </motion.button>
            </>
          ) : (
            <div style={{ textAlign: "center", pointerEvents: "none", padding: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <Upload style={{ width: 18, height: 18, color: "#a78bfa" }} />
              </div>
              <p style={{ color: T.textPrimary, fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>Upload reference image</p>
              <p style={{ color: T.textDim, fontSize: 10, fontWeight: 600, margin: 0 }}>JPG · PNG · WEBP &nbsp;≤ 20 MB</p>
            </div>
          )}
        </div>
      )}

      {/* Multi-view tab */}
      {tab === "multi" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 8 }}>
          {VIEW_SLOTS.map((slot, i) => {
            const prev = multiImages?.[i]?.preview;
            return (
              <motion.div
                key={slot}
                whileTap={{ scale: 0.97 }}
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
                style={{
                  aspectRatio: "1/1",
                  borderRadius: 10,
                  border: `1px solid ${T.glassBorder}`,
                  background: "repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%) 0 0 / 12px 12px",
                  cursor: "pointer",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  overflow: "hidden",
                  transition: "border-color 0.18s",
                }}
              >
                {prev ? (
                  <img src={prev} alt={slot} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
                ) : (
                  <>
                    <PersonStanding style={{ width: 18, height: 18, color: T.textDim }} />
                    <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 700 }}>{slot}</span>
                  </>
                )}
                <div style={{ position: "absolute", top: 5, left: 5, background: "rgba(10,10,20,0.7)", borderRadius: 5, padding: "2px 5px" }}>
                  <span style={{ color: T.textDim, fontSize: 8, fontWeight: 700 }}>{slot.toUpperCase()}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Text tab */}
      {tab === "text" && (
        <div style={{ padding: "10px 10px 6px" }}>
          <textarea
            className="tp-ta"
            value={texPrompt}
            onChange={e => setTexPrompt(e.target.value.slice(0, 1000))}
            placeholder="Describe the texture style you want to generate…"
            rows={7}
            style={{ minHeight: 150, background: "transparent", border: "none", resize: "none", width: "100%", padding: "2px 4px" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 4 }}>
            <span style={{ color: T.textDim, fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}>{texPrompt.length}/1000</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── HSV Color Picker ───────────────────────────────────────────────────── */
function HsvColorPicker({ brushColor, setBrushColor }) {
  const svCanvasRef = useRef(null);
  const [hsv, setHsv] = useState(() => hexToHsv(brushColor || "#8b5cf6"));
  const [hexInput, setHexInput] = useState((brushColor || "#8b5cf6").replace("#", "").toUpperCase());
  const draggingSv = useRef(false);
  const draggingHue = useRef(false);

  // Sync hsv when brushColor changes externally
  useEffect(() => {
    if (!brushColor) return;
    const parsed = hexToHsv(brushColor);
    setHsv(parsed);
    setHexInput(brushColor.replace("#", "").toUpperCase());
  }, [brushColor]);

  // Draw SV square
  useEffect(() => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    // Base hue color
    const hueHex = hsvToHex(hsv.h, 1, 1);
    // White→hue horizontal gradient
    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0, "#ffffff");
    gradH.addColorStop(1, hueHex);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);
    // transparent→black vertical gradient
    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, "transparent");
    gradV.addColorStop(1, "#000000");
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);
  }, [hsv.h]);

  const pickSv = useCallback((clientX, clientY) => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    const newHsv = { ...hsv, s, v };
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setBrushColor(hex);
    setHexInput(hex.replace("#", "").toUpperCase());
  }, [hsv, setBrushColor]);

  const handleSvMouseDown = useCallback((e) => {
    draggingSv.current = true;
    pickSv(e.clientX, e.clientY);
    const onMove = (ev) => { if (draggingSv.current) pickSv(ev.clientX, ev.clientY); };
    const onUp = () => {
      draggingSv.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [pickSv]);

  const hueBarRef = useRef(null);

  const pickHue = useCallback((clientX) => {
    const el = hueBarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
    const newHsv = { ...hsv, h };
    setHsv(newHsv);
    const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setBrushColor(hex);
    setHexInput(hex.replace("#", "").toUpperCase());
  }, [hsv, setBrushColor]);

  const handleHueMouseDown = useCallback((e) => {
    draggingHue.current = true;
    pickHue(e.clientX);
    const onMove = (ev) => { if (draggingHue.current) pickHue(ev.clientX); };
    const onUp = () => {
      draggingHue.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [pickHue]);

  const handleHexInput = (e) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    setHexInput(raw.toUpperCase());
    if (raw.length === 6) {
      const hex = "#" + raw;
      setBrushColor(hex);
      setHsv(hexToHsv(hex));
    }
  };

  const svX = hsv.s * 100;
  const svY = (1 - hsv.v) * 100;
  const hueX = (hsv.h / 360) * 100;
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* SV square */}
      <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${T.glassBorder}` }}>
        <canvas
          ref={svCanvasRef}
          width={200}
          height={150}
          onPointerDown={handleSvMouseDown}
          style={{ display: "block", width: "100%", height: 150, cursor: "crosshair" }}
        />
        {/* Circular handle */}
        <div
          style={{
            position: "absolute",
            left: `${svX}%`,
            top: `${svY}%`,
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.5)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            background: currentHex,
          }}
        />
      </div>

      {/* Hue slider */}
      <div style={{ position: "relative" }}>
        <div
          ref={hueBarRef}
          onPointerDown={handleHueMouseDown}
          style={{
            height: 14,
            borderRadius: 7,
            background: "linear-gradient(to right, #f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
            cursor: "pointer",
            border: `1px solid ${T.glassBorder}`,
            position: "relative",
          }}
        >
          <div style={{
            position: "absolute",
            top: -2,
            left: `${hueX}%`,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: hsvToHex(hsv.h, 1, 1),
            border: "2px solid #fff",
            boxShadow: "0 1px 5px rgba(0,0,0,0.5)",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }} />
        </div>
      </div>

      {/* Hex + preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: currentHex,
          border: `2px solid ${T.glassBorder}`,
          flexShrink: 0,
          boxShadow: `0 0 10px ${currentHex}55`,
        }} />
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 0,
          borderRadius: 8,
          border: `1px solid ${T.glassBorder}`,
          background: "rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}>
          <span style={{ color: T.textMuted, fontSize: 12, fontFamily: "monospace", fontWeight: 700, padding: "6px 8px", borderRight: `1px solid ${T.divider}` }}>#</span>
          <input
            value={hexInput}
            onChange={handleHexInput}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: T.textPrimary,
              fontSize: 12,
              fontFamily: "monospace",
              fontWeight: 700,
              padding: "6px 8px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
            maxLength={6}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── MagicBrushPanel ────────────────────────────────────────────────────── */
export function MagicBrushPanel({
  brushPrompt, setBrushPrompt,
  creativity, setCreativity,
  brushMode, setBrushMode,
  brushColor, setBrushColor,
  brushSize, setBrushSize,
  brushOpacity = 1, setBrushOpacity,
  brushHardness = 80, setBrushHardness,
  canvasRef,
  onUndo,
}) {

  const PRESETS = ["#000000", "#ffffff", "#ef4444", "#f97316", "#eab308", "#22c55e", "#00e5ff", "#8b5cf6"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Mode switcher + Undo */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <div style={{
          display: "flex",
          flex: 1,
          padding: 3,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 12,
          border: `1px solid ${T.glassBorder}`,
          gap: 3,
        }}>
          {["Gen Mode", "Paint Mode"].map(m => (
            <motion.button
              key={m}
              onClick={() => setBrushMode(m)}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1,
                padding: "7px 4px",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.02em",
                background: brushMode === m ? "rgba(139,92,246,0.2)" : "transparent",
                color: brushMode === m ? "#c4b5fd" : T.textDim,
                boxShadow: brushMode === m ? "0 0 12px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
                transition: "all 0.18s",
              }}
            >
              {m === "Gen Mode" ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Wand2 style={{ width: 12, height: 12 }} />
                  Gen Mode
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Paintbrush style={{ width: 12, height: 12 }} />
                  Paint Mode
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {brushMode === "Paint Mode" && onUndo && (
          <motion.button
            onClick={onUndo}
            whileTap={{ scale: 0.95 }}
            title="Undo last stroke"
            style={{
              width: 42,
              borderRadius: 12,
              border: `1px solid ${T.glassBorder}`,
              background: "rgba(255,255,255,0.04)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "border-color 0.18s, background 0.18s",
            }}
          >
            <RotateCcw style={{ width: 14, height: 14, color: T.textMuted }} />
          </motion.button>
        )}
      </div>

      {/* ── GEN MODE ── */}
      {brushMode === "Gen Mode" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <SectionLabel>Prompt</SectionLabel>
            <div style={{
              borderRadius: 12,
              border: `1px solid ${T.glassBorder}`,
              background: "rgba(255,255,255,0.025)",
              overflow: "hidden",
              backdropFilter: "blur(12px)",
            }}>
              <textarea
                className="tp-ta"
                value={brushPrompt}
                onChange={e => setBrushPrompt(e.target.value.slice(0, 1000))}
                placeholder="Describe the new texture for the painted region…"
                rows={6}
                style={{
                  minHeight: 130,
                  padding: "12px 12px 4px",
                  background: "transparent",
                  border: "none",
                  resize: "none",
                  width: "100%",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 12px 8px" }}>
                <span style={{ color: T.textDim, fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{brushPrompt.length}/1000</span>
              </div>
            </div>
          </div>

          <Divider />

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SectionLabel>Creativity Strength</SectionLabel>
                <HelpCircle style={{ width: 12, height: 12, color: T.textDim, flexShrink: 0 }} />
              </div>
              <ValueBadge>{creativity.toFixed(2)}</ValueBadge>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StyledSlider min={0} max={1} step={0.01} value={creativity} onChange={e => setCreativity(Number(e.target.value))} />
            </div>
            <p style={{ color: T.textDim, fontSize: 10, fontWeight: 600, margin: "6px 0 0", lineHeight: 1.6 }}>
              {creativity < 0.4 && "Conservative — stays close to original texture"}
              {creativity >= 0.4 && creativity < 0.7 && "Balanced — moderate creative freedom"}
              {creativity >= 0.7 && "High — freely reimagines the painted area"}
            </p>
          </div>
        </div>
      )}

      {/* ── PAINT MODE ── */}
      {brushMode === "Paint Mode" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Instruction banner */}
          <div style={{
            borderRadius: 12,
            border: "1px solid rgba(139,92,246,0.18)",
            background: "rgba(139,92,246,0.06)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 14,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Pencil style={{ width: 14, height: 14, color: "#a78bfa" }} />
            </div>
            <div>
              <p style={{ color: "#c4b5fd", fontSize: 11, fontWeight: 800, margin: "0 0 6px" }}>Paint on the 3D Model</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {[
                  ["Left drag", "Paint"],
                  ["Shift + drag", "Orbit camera"],
                  ["Right drag", "Pan"],
                  ["Scroll wheel", "Zoom"],
                  ["Double-click", "Focus on point"],
                ].map(([key, action]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 5, padding: "1px 6px", fontSize: 9, fontWeight: 800, color: "#e0e0f8", fontFamily: "monospace", whiteSpace: "nowrap", flexShrink: 0 }}>{key}</span>
                    <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 600 }}>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Color section */}
          <div>
            <SectionLabel>Color</SectionLabel>
            <HsvColorPicker brushColor={brushColor} setBrushColor={setBrushColor} />
          </div>

          <Divider />

          {/* Presets */}
          <div>
            <SectionLabel>Swatches</SectionLabel>
            <div style={{ display: "flex", gap: 5 }}>
              {PRESETS.map(c => (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setBrushColor(c)}
                  title={c}
                  style={{
                    flex: 1,
                    aspectRatio: "1/1",
                    borderRadius: 6,
                    background: c,
                    border: brushColor === c
                      ? `2px solid ${T.purple}`
                      : "2px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    boxShadow: brushColor === c ? `0 0 8px ${c}88, 0 0 0 2px ${T.purple}44` : "none",
                    transition: "border 0.15s, box-shadow 0.15s",
                  }}
                />
              ))}
            </div>
          </div>

          <Divider />

          {/* Brush Settings */}
          <div>
            <SectionLabel>Brush</SectionLabel>

            {/* Size row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              {/* Visual preview */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${T.glassBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <div style={{
                  width: Math.max(4, Math.min(32, brushSize * 0.27)),
                  height: Math.max(4, Math.min(32, brushSize * 0.27)),
                  borderRadius: "50%",
                  background: brushColor,
                  boxShadow: `0 0 6px ${brushColor}88`,
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ ...T.labelStyle, fontSize: 10 }}>Size</span>
                  <ValueBadge>{brushSize}px</ValueBadge>
                </div>
                <StyledSlider min={0.5} max={120} step={0.5} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} />
              </div>
            </div>

            {/* Hardness row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ ...T.labelStyle, fontSize: 10 }}>Hardness</span>
                  <ValueBadge>{brushHardness}%</ValueBadge>
                </div>
                <StyledSlider min={0} max={100} step={1} value={brushHardness} onChange={e => setBrushHardness(Number(e.target.value))} color={T.cyan} />
              </div>
            </div>

            {/* Opacity row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 40, height: 40, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ ...T.labelStyle, fontSize: 10 }}>Opacity</span>
                  <ValueBadge>{Math.round(brushOpacity * 100)}%</ValueBadge>
                </div>
                <StyledSlider min={0} max={1} step={0.01} value={brushOpacity} onChange={e => setBrushOpacity(Number(e.target.value))} color={T.pink} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── main export ─────────────────────────────────────────────────────────── */
export default function Texture({
  mode,
  activeTaskId,
  texInputTab, setTexInputTab,
  texPrompt, setTexPrompt,
  imgPrev, imgToken, imgUploading, handleImg, fileRef,
  multiImages, setMultiImages,
  tex4K, setTex4K,
  pbrOn, setPbrOn,
  texAlignment, setTexAlignment,
  brushMode, setBrushMode,
  brushPrompt, setBrushPrompt,
  creativity, setCreativity,
  brushColor, setBrushColor,
  brushSize, setBrushSize,
  brushOpacity, setBrushOpacity,
  brushHardness, setBrushHardness,
  canvasRef,
  onUndo,
}) {
  return (
    <>
      {/* ── TEXTURE MODE ── */}
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

          {/* 4K Texture */}
          <motion.div
            whileTap={{ scale: 0.99 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 11,
              border: `1px solid ${tex4K ? "rgba(139,92,246,0.25)" : T.glassBorder}`,
              background: tex4K ? "rgba(139,92,246,0.07)" : T.glass,
              cursor: "pointer",
              marginBottom: 8,
              transition: "all 0.18s",
            }}
            onClick={() => setTex4K(v => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: T.textPrimary, fontSize: 13, fontWeight: 700 }}>4K Texture</span>
              <HelpCircle style={{ width: 13, height: 13, color: T.textDim }} />
            </div>
            <GlassSwitch on={tex4K} onChange={() => setTex4K(v => !v)} />
          </motion.div>
          {tex4K && (
            <p style={{ color: T.textDim, fontSize: 10, fontWeight: 600, margin: "-2px 0 10px 2px", lineHeight: 1.6 }}>
              texture_quality: "HD" — higher resolution, slower generation.
            </p>
          )}

          {/* PBR Maps */}
          <motion.div
            whileTap={{ scale: 0.99 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 11,
              border: `1px solid ${pbrOn ? "rgba(0,229,255,0.2)" : T.glassBorder}`,
              background: pbrOn ? "rgba(0,229,255,0.05)" : T.glass,
              cursor: "pointer",
              marginBottom: 8,
              transition: "all 0.18s",
            }}
            onClick={() => setPbrOn(v => !v)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: T.textPrimary, fontSize: 13, fontWeight: 700 }}>PBR Maps</span>
              <HelpCircle style={{ width: 13, height: 13, color: T.textDim }} />
            </div>
            <GlassSwitch on={pbrOn} onChange={() => setPbrOn(v => !v)} />
          </motion.div>
          {pbrOn && (
            <p style={{ color: T.textDim, fontSize: 10, fontWeight: 600, margin: "-2px 0 10px 2px", lineHeight: 1.6 }}>
              Generates albedo, normal, roughness &amp; metallic maps. Overrides standard texture output.
            </p>
          )}

          {/* Texture Alignment */}
          {setTexAlignment && (texInputTab === "image" || texInputTab === "multi") && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <span style={{ color: T.textPrimary, fontSize: 13, fontWeight: 700 }}>Texture Alignment</span>
                <HelpCircle style={{ width: 13, height: 13, color: T.textDim }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "original_image", label: "Image" },
                  { id: "geometry", label: "Geometry" },
                ].map(opt => (
                  <motion.button
                    key={opt.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setTexAlignment(opt.id)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 9,
                      border: texAlignment === opt.id
                        ? "1.5px solid rgba(139,92,246,0.45)"
                        : `1.5px solid ${T.glassBorder}`,
                      background: texAlignment === opt.id ? "rgba(139,92,246,0.15)" : T.glass,
                      color: texAlignment === opt.id ? "#c4b5fd" : T.textMuted,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.18s",
                    }}
                  >{opt.label}</motion.button>
                ))}
              </div>
              <p style={{ color: T.textDim, fontSize: 10, fontWeight: 600, margin: "6px 0 0", lineHeight: 1.6 }}>
                {texAlignment === "original_image"
                  ? "Aligns texture colours to the reference image."
                  : "Aligns texture to the model's surface geometry."}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── MAGIC BRUSH MODE ── */}
      {mode === "texture_edit" && (
        <>
          <SelectedModelBadge activeTaskId={activeTaskId} />
          <MagicBrushPanel
            brushPrompt={brushPrompt} setBrushPrompt={setBrushPrompt}
            creativity={creativity} setCreativity={setCreativity}
            brushMode={brushMode} setBrushMode={setBrushMode}
            brushColor={brushColor} setBrushColor={setBrushColor}
            brushSize={brushSize} setBrushSize={setBrushSize}
            brushOpacity={brushOpacity} setBrushOpacity={setBrushOpacity}
            brushHardness={brushHardness} setBrushHardness={setBrushHardness}
            canvasRef={canvasRef}
            onUndo={onUndo}
          />
        </>
      )}
    </>
  );
}
