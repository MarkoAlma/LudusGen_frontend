// trellis/DownloadModal.jsx
import React, { useState, useCallback, useEffect } from "react";
import { Download, X, Loader2, Check, Box, Layers, Triangle, Printer } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader }  from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { OBJExporter }  from "three/addons/exporters/OBJExporter.js";
import { STLExporter }  from "three/addons/exporters/STLExporter.js";

// ── Format definitions ────────────────────────────────────────────────────────
const FORMATS = [
  {
    id:    "glb",
    label: "GLB",
    ext:   ".glb",
    icon:  Box,
    desc:  "Binary GLTF — legkisebb méret",
    tags:  ["Blender", "Unity", "Unreal", "Web"],
    color: "#a78bfa",
    recommended: true,
  },
  {
    id:    "gltf",
    label: "GLTF",
    ext:   ".gltf",
    icon:  Layers,
    desc:  "JSON GLTF — szerkeszthető formátum",
    tags:  ["Blender", "Three.js", "Babylon.js"],
    color: "#60a5fa",
  },
  {
    id:    "obj",
    label: "OBJ",
    ext:   ".obj",
    icon:  Triangle,
    desc:  "Wavefront OBJ — széles kompatibilitás",
    tags:  ["Maya", "3ds Max", "Cinema 4D", "ZBrush"],
    color: "#34d399",
  },
  {
    id:    "stl",
    label: "STL",
    ext:   ".stl",
    icon:  Printer,
    desc:  "STL — 3D nyomtatáshoz",
    tags:  ["Cura", "PrusaSlicer", "Bambu Studio"],
    color: "#fb923c",
  },
];

// ── Tiszta scene betöltése a GLB blob-ból ─────────────────────────────────────
// Teljesen friss scene, nincsenek benne grid/fény/camera helperek
function loadCleanScene(glbBlobUrl) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      glbBlobUrl,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err),
    );
  });
}

// ── Exporter logic ────────────────────────────────────────────────────────────
async function exportModel(format, glbBlobUrl, filename) {
  const baseName = filename.replace(/\.[^.]+$/, "");

  // GLB — natív blob újraletöltés, konvertálás nélkül
  if (format === "glb") {
    const a = document.createElement("a");
    a.href     = glbBlobUrl;
    a.download = `${baseName}.glb`;
    a.click();
    return;
  }

  // Minden más formátumhoz: tiszta scene a GLB-ből
  const cleanScene = await loadCleanScene(glbBlobUrl);

  if (format === "gltf") {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      try {
        exporter.parse(
          cleanScene,
          (result) => {
            try {
              const str  = JSON.stringify(result, null, 2);
              const blob = new Blob([str], { type: "model/gltf+json" });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement("a");
              a.href = url; a.download = `${baseName}.gltf`; a.click();
              setTimeout(() => URL.revokeObjectURL(url), 10_000);
              resolve();
            } catch (e) { reject(e); }
          },
          { binary: false },
        );
      } catch (e) { reject(e); }
    });
  }

  if (format === "obj") {
    const exporter = new OBJExporter();
    const result   = exporter.parse(cleanScene);
    const blob     = new Blob([result], { type: "text/plain" });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href = url; a.download = `${baseName}.obj`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  if (format === "stl") {
    const exporter = new STLExporter();
    const result   = exporter.parse(cleanScene, { binary: true });
    const blob     = new Blob([result], { type: "application/octet-stream" });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href = url; a.download = `${baseName}.stl`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
}

// ── Modal CSS ─────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes dlModalIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);   }
  }
  @keyframes dlBackdropIn { from { opacity: 0; } to { opacity: 1; } }
  .dl-modal-backdrop {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(2,2,10,0.82);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    display: flex; align-items: center; justify-content: center;
    animation: dlBackdropIn 0.18s ease;
  }
  .dl-modal-box {
    width: 380px; border-radius: 18px;
    background: rgba(12,10,28,0.98);
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
    animation: dlModalIn 0.22s cubic-bezier(0.34,1.2,0.64,1);
    overflow: hidden;
    font-family: "'SF Pro Text', -apple-system, system-ui, sans-serif";
  }
  .dl-fmt-card {
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.025);
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 11px 13px;
    display: flex; align-items: center; gap: 11px;
    position: relative; overflow: hidden;
  }
  .dl-fmt-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.14);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }
  .dl-fmt-card.active {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  .dl-fmt-card.downloading {
    pointer-events: none; opacity: 0.7;
  }
  .dl-tag {
    padding: 2px 6px; border-radius: 4px;
    font-size: 8px; font-weight: 700;
    font-family: 'SF Mono', monospace;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: #3d3d5a;
    white-space: nowrap;
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function DownloadModal({ isOpen, onClose, glbBlobUrl, scene, filename, color }) {
  const [downloading, setDownloading] = useState(null);
  const [done,        setDone]        = useState(null);
  const accent = color ?? "#a78bfa";

  useEffect(() => {
    if (isOpen) { setDone(null); setDownloading(null); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleDownload = useCallback(async (fmt) => {
    if (downloading) return;
    setDownloading(fmt.id);
    try {
      // scene argumentum már nem kell — a glbBlobUrl-ból töltünk be
      await exportModel(fmt.id, glbBlobUrl, filename ?? `trellis_${Date.now()}`);
      setDone(fmt.id);
      setTimeout(() => setDone(null), 2000);
    } catch (err) {
      console.error("Export hiba:", err);
      alert(`Export sikertelen (${fmt.label}): ${err?.message ?? err}`);
    } finally {
      setDownloading(null);
    }
  }, [downloading, glbBlobUrl, filename]);

  if (!isOpen) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="dl-modal-backdrop" onClick={onClose}>
        <div className="dl-modal-box" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            padding: "16px 18px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `${accent}14`, border: `1px solid ${accent}28`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 16px ${accent}18`, flexShrink: 0,
            }}>
              <Download style={{ width: 13, height: 13, color: accent }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: "#e5e7eb", fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em" }}>
                Letöltés formátuma
              </p>
              <p style={{ margin: "1px 0 0", color: "#272745", fontSize: 9, fontFamily: "'SF Mono', monospace" }}>
                {filename ?? "3D model"}
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 26, height: 26, borderRadius: 7, border: "none",
              background: "rgba(255,255,255,0.04)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#3d3d5a", transition: "all 0.14s", flexShrink: 0,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#9ca3af"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#3d3d5a"; }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>

          {/* Format grid */}
          <div style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            {FORMATS.map((fmt) => {
              const Icon     = fmt.icon;
              const isActive = downloading === fmt.id;
              const isDone   = done === fmt.id;
              const fColor   = fmt.color;

              return (
                <div
                  key={fmt.id}
                  className={`dl-fmt-card${isActive ? " active downloading" : ""}`}
                  style={{
                    borderColor: isActive || isDone ? `${fColor}40` : undefined,
                    background:  isActive || isDone ? `${fColor}0c` : undefined,
                    boxShadow:   isActive || isDone ? `0 4px 20px ${fColor}12` : undefined,
                  }}
                  onClick={() => handleDownload(fmt)}
                >
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                    background: `linear-gradient(180deg, ${fColor}90, ${fColor}30)`,
                    borderRadius: "10px 0 0 10px",
                    opacity: isActive || isDone ? 1 : 0,
                    transition: "opacity 0.15s",
                  }} />

                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: `${fColor}12`, border: `1px solid ${fColor}24`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isActive ? (
                      <Loader2 style={{ width: 14, height: 14, color: fColor }} className="animate-spin" />
                    ) : isDone ? (
                      <Check style={{ width: 14, height: 14, color: fColor }} />
                    ) : (
                      <Icon style={{ width: 14, height: 14, color: fColor }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ color: "#e2e0f0", fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em" }}>
                        {fmt.label}
                      </span>
                      <span style={{ color: "#252535", fontSize: 9, fontFamily: "'SF Mono', monospace" }}>
                        {fmt.ext}
                      </span>
                      {fmt.recommended && (
                        <span style={{
                          fontSize: 7.5, fontWeight: 800, padding: "1px 5px",
                          borderRadius: 4, background: `${accent}18`,
                          color: accent, border: `1px solid ${accent}30`,
                          fontFamily: "'SF Mono', monospace", letterSpacing: "0.04em",
                        }}>
                          AJÁNLOTT
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0 0 5px", color: "#3d3d5a", fontSize: 9, lineHeight: 1.4 }}>
                      {isDone ? "✓ Letöltés elindult" : isActive ? "Konvertálás…" : fmt.desc}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {fmt.tags.map((tag) => (
                        <span key={tag} className="dl-tag">{tag}</span>
                      ))}
                    </div>
                  </div>

                  {!isActive && !isDone && (
                    <div style={{ color: "#1e1e34", fontSize: 14, flexShrink: 0 }}>›</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            padding: "0 14px 14px",
            color: "#161625", fontSize: 8.5,
            fontFamily: "'SF Mono', monospace", textAlign: "center",
          }}>
            GLB → natív letöltés · GLTF / OBJ / STL → GLB újraparsing
          </div>

        </div>
      </div>
    </>
  );
}