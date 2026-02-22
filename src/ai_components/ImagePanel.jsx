import React, { useState, useRef } from "react";
import {
  Sparkles, Download, RefreshCw, Settings2,
  ChevronDown, ChevronUp, Loader2, AlertCircle,
  ImageIcon, Wand2, ZoomIn, X, Upload, Trash2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Aspect ratio opciók (FAL / Cloudflare / SD3) ──────
const ASPECT_RATIOS = [
  { label: "1:1",  value: "1:1",  w: 1024, h: 1024 },
  { label: "16:9", value: "16:9", w: 1344, h: 768  },
  { label: "9:16", value: "9:16", w: 768,  h: 1344 },
  { label: "4:3",  value: "4:3",  w: 1152, h: 896  },
  { label: "3:2",  value: "3:2",  w: 1216, h: 832  },
  { label: "2:3",  value: "2:3",  w: 832,  h: 1216 },
];

// ── FLUX méret presetek ───────────────────────────────
const FLUX_SIZES = [
  { label: "1:1",  value: "1:1",  w: 1024, h: 1024 },
  { label: "16:9", value: "16:9", w: 1280, h: 720  },
  { label: "9:16", value: "9:16", w: 720,  h: 1280 },
  { label: "4:3",  value: "4:3",  w: 1152, h: 896  },
  { label: "3:4",  value: "3:4",  w: 896,  h: 1152 },
  { label: "3:2",  value: "3:2",  w: 1344, h: 768  },
];

// ── FLUX Kontext kimeneti képarány ────────────────────
// "match_input_image" = megtartja az input kép arányát
const KONTEXT_ASPECT_RATIOS = [
  { label: "Eredeti", value: "match_input_image" },
  { label: "1:1",     value: "1:1"  },
  { label: "16:9",    value: "16:9" },
  { label: "9:16",    value: "9:16" },
  { label: "4:3",     value: "4:3"  },
  { label: "3:2",     value: "3:2"  },
];

const PROVIDER_META = {
  "google-image":  { label: "Gemini",       color: "#4285f4", dot: "#34a853" },
  "stability":     { label: "Stability AI", color: "#7c3aed", dot: "#a78bfa" },
  "cloudflare":    { label: "Cloudflare",   color: "#f6821f", dot: "#fbbf24" },
  "fal":           { label: "fal.ai",       color: "#10b981", dot: "#34d399" },
  "nvidia-image":  { label: "NVIDIA",       color: "#76b900", dot: "#a3e635" },
};

const EXAMPLE_PROMPTS = [
  "Cyberpunk cityscape at night",
  "Cute cat in a photo studio",
  "Abstract digital art",
  "Mountain, golden hour",
];

const getProvider = (m) => m.provider || "fal";

// ── NVIDIA modell típus detektálás ────────────────────
// Fontos: kontext ellenőrzés ELŐBB (flux.1-kontext-dev tartalmazza a "flux" szót is)
const getNvidiaType = (apiId = "") => {
  const id = apiId.toLowerCase();
  if (id.includes("kontext"))            return "flux-kontext";
  if (id.includes("flux"))              return "flux";
  if (id.includes("stable-diffusion-3")) return "sd3";
  return "other";
};

const Lightbox = ({ src, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(16px)" }}
    onClick={onClose}>
    <button onClick={onClose}
      className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
      <X className="w-5 h-5" />
    </button>
    <img src={src} alt="Full size"
      className="rounded-2xl shadow-2xl object-contain"
      style={{ maxHeight: "90vh", maxWidth: "90vw" }}
      onClick={(e) => e.stopPropagation()} />
  </div>
);

export default function ImagePanel({ selectedModel, userId, getIdToken }) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // ── Közös paraméterek ──────────────────────────────
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numImages, setNumImages] = useState(1);
  const [seed, setSeed] = useState("");
  const [steps, setSteps] = useState(28);
  const [guidance, setGuidance] = useState(7.5);

  // ── FLUX méret ─────────────────────────────────────
  const [fluxSizeIdx, setFluxSizeIdx] = useState(0);

  // ── FLUX Kontext ───────────────────────────────────
  const [kontextAspectRatio, setKontextAspectRatio] = useState("match_input_image");
  const [inputImage, setInputImage] = useState(null);      // data URL
  const [inputImageName, setInputImageName] = useState("");
  const fileInputRef = useRef(null);

  const color = selectedModel.color || "#7c3aed";
  const provider = getProvider(selectedModel);
  const providerMeta = PROVIDER_META[provider] || PROVIDER_META["fal"];
  const apiId = selectedModel.apiModel || "";

  const isGoogleImage  = provider === "google-image";
  const isStability    = provider === "stability";
  const isCloudflare   = provider === "cloudflare";
  const isNvidia       = provider === "nvidia-image";
  const isFal          = !isStability && !isGoogleImage && !isCloudflare && !isNvidia;

  const nvidiaType     = isNvidia ? getNvidiaType(apiId) : null;
  const isFluxKontext  = nvidiaType === "flux-kontext";
  const isFlux         = nvidiaType === "flux";
  const isSD3          = nvidiaType === "sd3";

  const singleImage    = isStability || isGoogleImage || isCloudflare || isNvidia;
  const imgCount       = singleImage ? 1 : Math.min(numImages, 4);

  // Kiválasztott méret a canvas arányhoz
  const selectedAR = isFlux
    ? FLUX_SIZES[fluxSizeIdx]
    : (ASPECT_RATIOS.find((a) => a.value === aspectRatio) || ASPECT_RATIOS[0]);

  // ── Input kép kezelése (Kontext) ───────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Csak képfájl tölthető fel (jpg, png, webp...)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("A kép mérete max 10 MB lehet");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputImage(ev.target.result);
      setInputImageName(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload({ target: { files: [file] } });
  };

  // ── Generálás ──────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    if (isFluxKontext && !inputImage) {
      setError("A FLUX Kontext modellhez tölts fel egy szerkesztendő képet!");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);
    try {
      const token = getIdToken ? await getIdToken() : null;
      if (!token) throw new Error("Nincs érvényes autentikációs token.");

      const fluxSize = FLUX_SIZES[fluxSizeIdx];

      const res = await fetch(`${API_BASE}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider,
          apiId,
          negative_prompt: negativePrompt.trim() || undefined,
          aspect_ratio: isFluxKontext ? kontextAspectRatio : aspectRatio,
          image_size: isFlux
            ? { width: fluxSize.w, height: fluxSize.h }
            : { width: selectedAR.w, height: selectedAR.h },
          num_images: singleImage ? 1 : Math.min(numImages, 4),
          seed: seed ? parseInt(seed) : undefined,
          num_inference_steps: steps,
          guidance_scale: guidance,
          // Kontext: input kép
          ...(isFluxKontext && inputImage ? { input_image: inputImage } : {}),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Képgenerálási hiba");
      setGeneratedImages(data.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (url, index) => {
    try {
      if (url.startsWith("data:")) {
        const a = document.createElement("a"); a.href = url;
        a.download = `generated_${Date.now()}_${index + 1}.png`; a.click(); return;
      }
      const blob = await (await fetch(url)).blob();
      const bu = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = bu;
      a.download = `generated_${Date.now()}_${index + 1}.png`; a.click();
      URL.revokeObjectURL(bu);
    } catch {}
  };

  // ── Méret / arány gombsor (közös stílus) ──────────
  const SizeGrid = ({ items, activeValue, onSelect }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {items.map((item) => {
        const isActive = activeValue === item.value;
        const bw = item.w >= item.h ? 18 : Math.round((item.w / item.h) * 18);
        const bh = item.h >= item.w ? 18 : Math.round((item.h / item.w) * 18);
        return (
          <button key={item.value} onClick={() => onSelect(item)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "8px 4px", borderRadius: 12, cursor: "pointer",
              background: isActive ? `${color}18` : "rgba(255,255,255,0.03)",
              border: `1px solid ${isActive ? color + "55" : "rgba(255,255,255,0.07)"}`,
              transition: "all 0.15s",
            }}>
            <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{
                width: bw, height: bh, borderRadius: 2,
                background: isActive ? color : "rgba(255,255,255,0.18)",
                opacity: isActive ? 0.85 : 0.4,
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? color : "#6b7280" }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Kontext képarány — nincs ikon, csak szöveges gombok
  const KontextARGrid = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {KONTEXT_ASPECT_RATIOS.map((ar) => {
        const isActive = kontextAspectRatio === ar.value;
        return (
          <button key={ar.value} onClick={() => setKontextAspectRatio(ar.value)}
            style={{
              padding: "8px 4px", borderRadius: 12, cursor: "pointer",
              background: isActive ? `${color}18` : "rgba(255,255,255,0.03)",
              border: `1px solid ${isActive ? color + "55" : "rgba(255,255,255,0.07)"}`,
              transition: "all 0.15s",
            }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? color : "#6b7280" }}>{ar.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div style={{ position: "absolute", inset: 0, display: "flex", overflow: "hidden" }}>

        {/* ══ BAL: Controls ══ */}
        <div style={{
          width: 264, flexShrink: 0, display: "flex", flexDirection: "column",
          overflowY: "auto", overflowX: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(6,6,18,0.7)",
        }}>
          {/* Header */}
          <div style={{ padding: "16px 16px 8px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${color}20`, border: `1px solid ${color}35`,
              }}>
                <Wand2 style={{ width: 14, height: 14, color }} />
              </div>
              <span style={{ color: "white", fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedModel.name}
              </span>
              <span style={{
                flexShrink: 0, fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 5,
                background: `${providerMeta.color}12`, color: providerMeta.color,
                border: `1px solid ${providerMeta.color}28`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: providerMeta.dot, flexShrink: 0 }} />
                {providerMeta.label}
              </span>
            </div>
          </div>

          {/* Scrollable controls */}
          <div style={{ flex: 1, padding: "0 16px", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>

            {/* ── FLUX Kontext: Input kép ── */}
            {isFluxKontext && (
              <div>
                <label style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                  Input kép
                  <span style={{ color: "#ef4444", fontSize: 13, lineHeight: 1 }}>*</span>
                </label>

                {inputImage ? (
                  // Előnézet + törlés
                  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${color}40` }}>
                    <img src={inputImage} alt="Input preview"
                      style={{ width: "100%", height: 112, objectFit: "cover", display: "block" }} />
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)",
                      display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "8px 10px",
                    }}>
                      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, maxWidth: 148, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inputImageName}
                      </span>
                      <button
                        onClick={() => { setInputImage(null); setInputImageName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        style={{ padding: "4px 6px", borderRadius: 6, background: "rgba(239,68,68,0.85)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <Trash2 style={{ width: 11, height: 11, color: "white" }} />
                        <span style={{ color: "white", fontSize: 10, fontWeight: 600 }}>Törlés</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Drop zone
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${color}35`, borderRadius: 12,
                      padding: "18px 12px", cursor: "pointer", transition: "border-color 0.15s",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      background: "rgba(255,255,255,0.02)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = color + "70"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = color + "35"}
                  >
                    <Upload style={{ width: 20, height: 20, color: `${color}55` }} />
                    <span style={{ color: "#6b7280", fontSize: 12, textAlign: "center", lineHeight: 1.45 }}>
                      Kattints vagy húzd ide<br />a szerkesztendő képet
                    </span>
                    <span style={{ color: "#4b5563", fontSize: 11 }}>JPG, PNG, WEBP · max 10 MB</span>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
              </div>
            )}

            {/* Prompt */}
            <div>
              <label style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                {isFluxKontext ? "Szerkesztési utasítás" : "Prompt"}
              </label>
              <div style={{ position: "relative" }}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate(); }}
                  placeholder={isFluxKontext ? "Pl. Replace the background with a forest..." : "Írd le a képet részletesen..."}
                  rows={4}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 12, color: "white",
                    fontSize: 13, resize: "none", outline: "none", lineHeight: 1.55, boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${prompt ? color + "45" : "rgba(255,255,255,0.08)"}`,
                    fontFamily: "inherit",
                  }}
                />
                <span style={{ position: "absolute", bottom: 8, right: 10, color: "#4b5563", fontSize: 11, pointerEvents: "none" }}>{prompt.length}</span>
              </div>
            </div>

            {/* Negative prompt — nem FLUX, nem Kontext, nem Google */}
            {!isGoogleImage && !isFlux && !isFluxKontext && (
              <div>
                <label style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Negatív <span style={{ color: "#4b5563", fontWeight: 400, textTransform: "none" }}>(opcionális)</span>
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Mit ne tartalmazzon..."
                  rows={2}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 12, color: "white",
                    fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            )}

            {/* ── Kontext: kimeneti képarány ──
            {isFluxKontext && (
              <div>
                <label style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                  Kimeneti képarány
                </label>
                <KontextARGrid />
              </div>
            )} */}

            {/* ── SD3 vagy nem-NVIDIA: Aspect ratio ── */}
            {(isSD3 || !isNvidia) && (
              <div>
                <label style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
                  Képarány
                </label>
                <SizeGrid
                  items={ASPECT_RATIOS}
                  activeValue={aspectRatio}
                  onSelect={(item) => setAspectRatio(item.value)}
                />
              </div>
            )}



            {/* Num images — csak FAL */}
            {isFal && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Képek száma</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{numImages}</span>
                </div>
                <input type="range" min={1} max={4} step={1} value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value))}
                  style={{ width: "100%", cursor: "pointer", accentColor: color }} />
              </div>
            )}

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced((p) => !p)}
              style={{
                display: "flex", alignItems: "center", gap: 8, color: "#6b7280",
                fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%",
              }}>
              <Settings2 style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>Speciális</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              {showAdvanced
                ? <ChevronUp style={{ width: 12, height: 12, flexShrink: 0 }} />
                : <ChevronDown style={{ width: 12, height: 12, flexShrink: 0 }} />}
            </button>

            {showAdvanced && (
              <div style={{ borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>

                {/* Seed */}
                <div>
                  <label style={{ color: "#6b7280", fontSize: 12, display: "block", marginBottom: 6 }}>
                    Seed <span style={{ color: "#4b5563" }}>(opcionális)</span>
                  </label>
                  <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="pl. 42"
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: 8, color: "white", fontSize: 13,
                      outline: "none", boxSizing: "border-box", background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit",
                    }} />
                </div>

                {/* Steps — FAL + NVIDIA */}
                {(isFal || isNvidia) && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ color: "#6b7280", fontSize: 12 }}>Steps</label>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{steps}</span>
                    </div>
                    <input type="range" min={1} max={50} step={1} value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value))}
                      style={{ width: "100%", cursor: "pointer", accentColor: color }} />
                    <p style={{ color: "#4b5563", fontSize: 11, marginTop: 2 }}>Több = jobb minőség, de lassabb</p>
                  </div>
                )}

                {/* CFG Scale — FAL + NVIDIA */}
                {(isFal || isNvidia) && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ color: "#6b7280", fontSize: 12 }}>CFG Scale</label>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>{guidance}</span>
                    </div>
                    <input type="range" min={1} max={isFlux || isFluxKontext ? 30 : 20} step={0.5} value={guidance}
                      onChange={(e) => setGuidance(parseFloat(e.target.value))}
                      style={{ width: "100%", cursor: "pointer", accentColor: color }} />
                    <p style={{ color: "#4b5563", fontSize: 11, marginTop: 2 }}>Alacsony = kreatív · Magas = prompt-hű</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate button — pinned bottom */}
          <div style={{ padding: "12px 16px 16px", flexShrink: 0 }}>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || (isFluxKontext && !inputImage)}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 600,
                color: "white", border: "none",
                cursor: (prompt.trim() && !isGenerating && (!isFluxKontext || inputImage)) ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: (prompt.trim() && !isGenerating && (!isFluxKontext || inputImage))
                  ? `linear-gradient(135deg, ${color}, ${color}aa)`
                  : "rgba(255,255,255,0.05)",
                opacity: (prompt.trim() && !isGenerating && (!isFluxKontext || inputImage)) ? 1 : 0.4,
                boxShadow: (prompt.trim() && !isGenerating && (!isFluxKontext || inputImage)) ? `0 4px 20px ${color}28` : "none",
                transition: "all 0.2s",
              }}>
              {isGenerating
                ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Generálás...</>
                : <><Sparkles style={{ width: 16, height: 16 }} /> Generálás</>}
            </button>
            <p style={{ textAlign: "center", color: "#4b5563", fontSize: 11, marginTop: 6 }}>Ctrl+Enter</p>
          </div>
        </div>

        {/* ══ JOBB: Canvas ══ */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Error */}
          {error && (
            <div style={{
              margin: "12px 12px 0", padding: "10px 12px", borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "flex-start", gap: 8,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            }}>
              <AlertCircle style={{ width: 15, height: 15, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.5, flex: 1 }}>{error}</p>
              <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", flexShrink: 0, padding: 0 }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          )}

          {/* Toolbar */}
          {(generatedImages.length > 0 || isGenerating) && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", flexShrink: 0,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ color: "#6b7280", fontSize: 11 }}>
                {isGenerating
                  ? "Generálás..."
                  : isFlux
                    ? `${generatedImages.length} kép · ${FLUX_SIZES[fluxSizeIdx].w}×${FLUX_SIZES[fluxSizeIdx].h} · ${FLUX_SIZES[fluxSizeIdx].label}`
                    : isFluxKontext
                      ? `${generatedImages.length} kép · ${kontextAspectRatio}`
                      : `${generatedImages.length} kép · ${selectedAR.w}×${selectedAR.h} · ${aspectRatio}`}
              </span>
              <div style={{ flex: 1 }} />
              {!isGenerating && (
                <button onClick={handleGenerate}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
                    fontSize: 12, color: "#9ca3af", cursor: "pointer",
                    background: "none", border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                  <RefreshCw style={{ width: 12, height: 12 }} /> Újra
                </button>
              )}
            </div>
          )}

          {/* Canvas */}
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>

            {/* Empty state */}
            {!isGenerating && generatedImages.length === 0 && !error && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${color}0d`, border: `1px solid ${color}18`,
                }}>
                  <ImageIcon style={{ width: 32, height: 32, color: `${color}40` }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                    {isFluxKontext ? "Tölts fel egy képet és adj utasítást" : "Még nincs kép"}
                  </p>
                  <p style={{ color: "#374151", fontSize: 12 }}>
                    {isFluxKontext ? "A Kontext modell meglévő képek szerkesztésére specializálódott" : "Írj egy promptot a bal oldalon"}
                  </p>
                </div>
                {!isFluxKontext && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 360 }}>
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button key={ex} onClick={() => setPrompt(ex)}
                        style={{
                          fontSize: 12, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af",
                        }}>
                        {ex}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading skeleton */}
            {isGenerating && (
              <div style={{
                position: "absolute", inset: 0, padding: 16,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                {Array.from({ length: imgCount }).map((_, i) => (
                  <div key={i} style={{
                    borderRadius: 16, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 10,
                    aspectRatio: `${selectedAR.w} / ${selectedAR.h}`,
                    maxWidth: imgCount > 1 ? "calc(50% - 6px)" : "100%",
                    maxHeight: "100%", width: "auto", height: "100%",
                    background: `${color}10`, border: `1px solid ${color}20`,
                    animation: "shimmer 2s ease-in-out infinite",
                  }}>
                    <Loader2 style={{ width: 28, height: 28, color: `${color}60`, animation: "spin 1s linear infinite" }} />
                    <span style={{ color: `${color}60`, fontSize: 12 }}>Generálás...</span>
                  </div>
                ))}
              </div>
            )}

            {/* Generated images */}
            {!isGenerating && generatedImages.length > 0 && (
              <div style={{
                position: "absolute", inset: 0, padding: 16,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                {generatedImages.map((img, i) => (
                  <div key={i}
                    style={{
                      position: "relative", borderRadius: 16, overflow: "hidden",
                      border: `1px solid ${color}25`,
                      aspectRatio: `${selectedAR.w} / ${selectedAR.h}`,
                      maxWidth: generatedImages.length > 1 ? "calc(50% - 6px)" : "100%",
                      maxHeight: "100%", width: "auto", height: "100%",
                      flexShrink: 0,
                    }}>
                    <img src={img.url} alt={`Generated ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "rgba(0,0,0,0.2)" }} />
                    {/* Hover overlay */}
                    <div
                      style={{
                        position: "absolute", inset: 0, opacity: 0, transition: "opacity 0.2s",
                        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)",
                        display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: 12,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                    >
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                        {img.width ? `${img.width}×${img.height}` : `${selectedAR.w}×${selectedAR.h}`}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setLightboxSrc(img.url)}
                          style={{
                            padding: 8, borderRadius: 10, color: "white", cursor: "pointer",
                            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "none",
                          }}
                          title="Teljes méret">
                          <ZoomIn style={{ width: 14, height: 14 }} />
                        </button>
                        <button onClick={() => downloadImage(img.url, i)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                            borderRadius: 10, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: `${color}cc`, backdropFilter: "blur(8px)", border: "none",
                          }}>
                          <Download style={{ width: 14, height: 14 }} /> Letöltés
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
}