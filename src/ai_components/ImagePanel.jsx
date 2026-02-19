import React, { useState, useEffect } from "react";
import {
  Wand2, Download, Loader2, CheckCircle2, XCircle,
  Settings2, Bookmark, History, Plus, Trash2, Copy, X,
  RefreshCw, Shuffle, Sliders,
} from "lucide-react";
import { db } from "../firebase/firebaseApp";
import { collection, addDoc, query, orderBy, limit, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { DEFAULT_PRESETS } from "./models";

const API_BASE = "http://localhost:3001";

const ASPECT_RATIOS = [
  { label: "1:1", w: 1024, h: 1024 },
  { label: "16:9", w: 1792, h: 1024 },
  { label: "9:16", w: 1024, h: 1792 },
  { label: "4:3", w: 1344, h: 1024 },
  { label: "3:4", w: 1024, h: 1344 },
  { label: "3:2", w: 1536, h: 1024 },
];

const STYLE_TAGS = [
  "photorealistic", "cinematic", "oil painting", "watercolor", "anime",
  "digital art", "concept art", "illustration", "sketch", "3D render",
  "film noir", "neon lights", "golden hour", "studio lighting", "bokeh",
  "macro photography", "aerial view", "low angle", "high contrast",
  "minimalist", "baroque", "cyberpunk", "steampunk", "fantasy",
];

const QUALITY_TAGS = [
  "8k uhd", "high resolution", "detailed", "sharp focus", "masterpiece",
  "best quality", "professional photography", "award winning",
];

export default function ImagePanel({ selectedModel, userId, getIdToken }) {
  const [activeTab, setActiveTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [steps, setSteps] = useState(selectedModel.maxSteps > 10 ? 28 : 4);
  const [guidance, setGuidance] = useState(7.5);
  const [seed, setSeed] = useState("");
  const [numImages, setNumImages] = useState(1);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState(null);

  const [presets, setPresets] = useState(DEFAULT_PRESETS.image);
  const [activePresetId, setActivePresetId] = useState("img_photorealistic");
  const [history, setHistory] = useState([]);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const color = selectedModel.color;

  useEffect(() => {
    loadHistory();
    loadUserPresets();
  }, [userId, selectedModel.id]);

  const loadHistory = async () => {
    if (!userId) return;
    try {
      const ref = collection(db, "image_generations", userId, selectedModel.id);
      const q = query(ref, orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(q);
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const loadUserPresets = async () => {
    if (!userId) return;
    try {
      const ref = collection(db, "presets", userId, "image");
      const snap = await getDocs(ref);
      const userPresets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (userPresets.length) setPresets([...DEFAULT_PRESETS.image, ...userPresets]);
    } catch (e) {}
  };

  const applyPreset = (preset) => {
    if (preset.positivePrefix) setPrompt((p) => (preset.positivePrefix + p.replace(/^[^,]+,\s*/g, "")));
    if (preset.negativePrompt !== undefined) setNegativePrompt(preset.negativePrompt);
    if (preset.width) setAspectRatio(ASPECT_RATIOS.find(a => a.w === preset.width) || ASPECT_RATIOS[0]);
    if (preset.steps) setSteps(preset.steps);
    if (preset.guidance) setGuidance(preset.guidance);
    setActivePresetId(preset.id);
  };

  const saveToHistory = async (images, promptUsed) => {
    if (!userId) return;
    try {
      await addDoc(collection(db, "image_generations", userId, selectedModel.id), {
        images,
        prompt: promptUsed,
        negativePrompt,
        width: aspectRatio.w,
        height: aspectRatio.h,
        steps,
        guidance,
        seed: seed || null,
        modelId: selectedModel.id,
        createdAt: serverTimestamp(),
      });
      await loadHistory();
    } catch (e) { console.error(e); }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const token = getIdToken ? await getIdToken() : null;
      const res = await fetch(`${API_BASE}/api/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          apiId: selectedModel.apiId,
          prompt,
          negative_prompt: negativePrompt || undefined,
          image_size: { width: aspectRatio.w, height: aspectRatio.h },
          num_inference_steps: steps,
          guidance_scale: guidance,
          seed: seed ? parseInt(seed) : undefined,
          num_images: numImages,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const images = data.images || [];
      setGeneratedImages(images);
      await saveToHistory(images, prompt);
    } catch (err) {
      setError(err.message || "Generálási hiba");
    } finally {
      setIsGenerating(false);
    }
  };

  const addStyleTag = (tag) => {
    setPrompt((p) => p ? `${p}, ${tag}` : tag);
  };

  const randomSeed = () => setSeed(Math.floor(Math.random() * 999999999).toString());

  const savePreset = async () => {
    if (!newPresetName.trim()) return;
    const preset = {
      name: newPresetName,
      positivePrefix: "",
      negativePrompt,
      width: aspectRatio.w,
      height: aspectRatio.h,
      steps,
      guidance,
      createdAt: new Date().toISOString(),
    };
    if (userId) {
      try {
        const ref = collection(db, "presets", userId, "image");
        const docRef = await addDoc(ref, preset);
        preset.id = docRef.id;
      } catch (e) {}
    } else {
      preset.id = Date.now().toString();
    }
    setPresets((p) => [...p, preset]);
    setNewPresetName("");
    setPresetModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 flex-shrink-0">
        {[
          { id: "generate", label: "🖼️ Generálás" },
          { id: "settings", label: "⚙️ Beállítások" },
          { id: "presets", label: `📌 Presetek (${presets.length})` },
          { id: "history", label: `📂 Előzmények (${history.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: activeTab === tab.id ? `${color}20` : "transparent",
              color: activeTab === tab.id ? "white" : "#6b7280",
              border: activeTab === tab.id ? `1px solid ${color}40` : "1px solid transparent",
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ─── */}
      {activeTab === "generate" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Prompt *</label>
              <span className="text-gray-600 text-xs">{prompt.length} kar</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Írd le a képet angolul... pl: a majestic mountain at sunset, dramatic lighting, 8k photography"
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-white text-sm placeholder-gray-600 resize-none focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${prompt ? color + "40" : "rgba(255,255,255,0.09)"}`,
              }}
            />
          </div>

          {/* Style tags */}
          <div>
            <label className="text-gray-500 text-xs mb-2 block">Stílus tagek (kattints a hozzáadáshoz):</label>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => addStyleTag(tag)}
                  className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white transition-all hover:scale-105"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Negative prompt */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              Negatív prompt
            </label>
            <input
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Amit NE tartalmazzon: blurry, low quality, watermark..."
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
            />
          </div>

          {/* Aspect ratio */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Arány / Méret
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.label}
                  onClick={() => setAspectRatio(ar)}
                  className="flex flex-col items-center justify-center py-2 rounded-xl transition-all"
                  style={{
                    background: aspectRatio.label === ar.label ? `${color}20` : "rgba(255,255,255,0.03)",
                    border: aspectRatio.label === ar.label ? `1.5px solid ${color}55` : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="mb-1 rounded-sm"
                    style={{
                      width: ar.w > ar.h ? 20 : ar.w === ar.h ? 14 : 10,
                      height: ar.h > ar.w ? 20 : ar.w === ar.h ? 14 : 10,
                      background: aspectRatio.label === ar.label ? color : "rgba(255,255,255,0.3)",
                    }}
                  />
                  <span className="text-xs font-semibold" style={{ color: aspectRatio.label === ar.label ? "white" : "#6b7280" }}>
                    {ar.label}
                  </span>
                  <span className="text-xs text-gray-600">{ar.w}×{ar.h}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Num images */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Képek száma: {numImages}
            </label>
            <div className="flex gap-2">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumImages(n)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: numImages === n ? `${color}25` : "rgba(255,255,255,0.04)",
                    border: numImages === n ? `1px solid ${color}50` : "1px solid rgba(255,255,255,0.08)",
                    color: numImages === n ? "white" : "#6b7280",
                  }}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Generated images */}
          {generatedImages.length > 0 && (
            <div className={`grid gap-3 ${generatedImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {generatedImages.map((img, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden group">
                  <img src={img.url} alt={`Generated ${i + 1}`} className="w-full rounded-xl" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 rounded-xl">
                    <a
                      href={img.url}
                      download={`image_${Date.now()}.png`}
                      className="p-2.5 rounded-xl text-white transition-all hover:scale-110"
                      style={{ background: `${color}70`, border: `1px solid ${color}` }}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(img.url)}
                      className="p-2.5 rounded-xl text-white transition-all hover:scale-110"
                      style={{ background: "rgba(255,255,255,0.2)" }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all duration-300"
            style={{
              background: prompt.trim() && !isGenerating
                ? `linear-gradient(135deg, ${color}, ${color}88)`
                : "rgba(255,255,255,0.05)",
              opacity: prompt.trim() && !isGenerating ? 1 : 0.4,
              boxShadow: prompt.trim() && !isGenerating ? `0 0 30px ${color}30` : "none",
            }}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Generálás...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Wand2 className="w-4 h-4" /> Kép generálása
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── SETTINGS TAB ─── */}
      {activeTab === "settings" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
          {[
            { label: `Steps: ${steps}`, min: 1, max: selectedModel.maxSteps || 50, step: 1, val: steps, set: setSteps,
              hint: "Több lépés = jobb minőség, de lassabb" },
            { label: `Guidance Scale: ${guidance}`, min: 1, max: 15, step: 0.5, val: guidance, set: setGuidance,
              hint: "Mennyire kövesse a promptot (7-8 az optimális)" },
          ].map(({ label, min, max, step, val, set, hint }) => (
            <div key={label} className="p-4 rounded-xl space-y-2"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex justify-between">
                <span className="text-white text-sm font-semibold">{label}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={val}
                onChange={(e) => set(parseFloat(e.target.value))}
                className="w-full" style={{ accentColor: color }} />
              <p className="text-gray-600 text-xs">{hint}</p>
            </div>
          ))}

          {/* Seed */}
          <div className="p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <label className="text-white text-sm font-semibold block mb-2">Seed</label>
            <div className="flex gap-2">
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Véletlenszerű (üres)"
                className="flex-1 px-3 py-2 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button onClick={randomSeed} className="p-2 rounded-xl text-gray-400 hover:text-white"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <Shuffle className="w-4 h-4" />
              </button>
              {seed && (
                <button onClick={() => setSeed("")} className="p-2 rounded-xl text-gray-400 hover:text-white"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-gray-600 text-xs mt-1">Azonos seed = azonos kép, ha a prompt is azonos</p>
          </div>

          {/* Save as preset button */}
          {!presetModalOpen ? (
            <button
              onClick={() => setPresetModalOpen(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: `${color}20`, border: `1px solid ${color}40`, color: "white" }}
            >
              <Bookmark className="w-4 h-4" /> Beállítások mentése presetként
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset neve..."
                className="flex-1 px-3 py-2 rounded-xl text-white text-sm focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${color}40` }}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && savePreset()}
              />
              <button onClick={savePreset} className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                Ment
              </button>
              <button onClick={() => setPresetModalOpen(false)} className="p-2 rounded-xl text-gray-500"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PRESETS TAB ─── */}
      {activeTab === "presets" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin">
          {presets.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                className="p-3 rounded-xl"
                style={{
                  background: isActive ? `${color}15` : "rgba(255,255,255,0.02)",
                  border: isActive ? `1px solid ${color}40` : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold text-sm">{preset.name}</span>
                    {preset.description && <p className="text-gray-500 text-xs mt-0.5">{preset.description}</p>}
                    <div className="flex gap-2 mt-1 text-xs text-gray-600">
                      {preset.steps && <span>Steps: {preset.steps}</span>}
                      {preset.guidance && <span>CFG: {preset.guidance}</span>}
                      {preset.width && <span>{preset.width}×{preset.height}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: isActive ? `${color}25` : "rgba(255,255,255,0.06)",
                      color: isActive ? color : "#9ca3af",
                      border: `1px solid ${isActive ? color + "40" : "transparent"}`,
                    }}
                  >
                    {isActive ? "✓ Aktív" : "Alkalmaz"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORY TAB ─── */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <History className="w-10 h-10 text-gray-700" />
              <p className="text-gray-500 text-sm">Még nincs generálási előzmény</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {history.map((item) => (
                <div key={item.id} className="group relative rounded-xl overflow-hidden cursor-pointer"
                  onClick={() => setPrompt(item.prompt)}>
                  {item.images?.[0]?.url && (
                    <img src={item.images[0].url} alt="" className="w-full aspect-square object-cover rounded-xl" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 rounded-b-xl opacity-0 group-hover:opacity-100 transition-all"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                    <p className="text-white text-xs truncate">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}