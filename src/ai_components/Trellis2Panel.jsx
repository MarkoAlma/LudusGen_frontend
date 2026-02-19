import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, Download, Box, Loader2, CheckCircle2,
  XCircle, Settings2, History, Bookmark, Plus,
  Trash2, ChevronDown, ChevronUp, AlertTriangle,
  RefreshCw, Eye
} from "lucide-react";

// =====================================================
// TRELLIS.2 Panel Component
// Ezt a komponenst illesszd be az AIChat.jsx-be
// amikor selectedAI === "trellis2"
// =====================================================

const Trellis2Panel = ({ userId, authToken }) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null); // null | "uploading" | "generating" | "done" | "error"
  const [progress, setProgress] = useState(0);
  const [glbUrl, setGlbUrl] = useState(null);
  const [error, setError] = useState(null);

  // Paraméterek
  const [resolution, setResolution] = useState("1024");
  const [ssGuidance, setSsGuidance] = useState(7.5);
  const [slatGuidance, setSlatGuidance] = useState(3.0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Előzmények & presetek
  const [history, setHistory] = useState([]);
  const [presets, setPresets] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("generate"); // "generate" | "history" | "presets"

  const fileInputRef = useRef(null);
  const API_BASE = "http://localhost:3001";

  // =====================================================
  // Előzmények betöltése localStorage-ból
  // (Firestore-ra cseréld production-ban)
  // =====================================================
  useEffect(() => {
    const saved = localStorage.getItem(`trellis2_history_${userId}`);
    if (saved) setHistory(JSON.parse(saved));

    const savedPresets = localStorage.getItem(`trellis2_presets_${userId}`);
    if (savedPresets) setPresets(JSON.parse(savedPresets));
  }, [userId]);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem(`trellis2_history_${userId}`, JSON.stringify(newHistory));
  };

  const savePresets = (newPresets) => {
    setPresets(newPresets);
    localStorage.setItem(`trellis2_presets_${userId}`, JSON.stringify(newPresets));
  };

  // =====================================================
  // Drag & Drop kezelés
  // =====================================================
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;
    setImage(file);
    setGlbUrl(null);
    setError(null);
    setGenerationStatus(null);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // =====================================================
  // Preset alkalmazása
  // =====================================================
  const applyPreset = (preset) => {
    setResolution(preset.resolution);
    setSsGuidance(preset.ssGuidance);
    setSlatGuidance(preset.slatGuidance);
    setShowPresets(false);
  };

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    const preset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      resolution,
      ssGuidance,
      slatGuidance,
      createdAt: new Date().toISOString(),
    };
    const newPresets = [preset, ...presets];
    savePresets(newPresets);
    setNewPresetName("");
    setSavePresetOpen(false);
  };

  const deletePreset = (id) => {
    savePresets(presets.filter((p) => p.id !== id));
  };

  // =====================================================
  // 3D Generálás
  // =====================================================
  const handleGenerate = async () => {
    if (!image) return;

    setIsGenerating(true);
    setError(null);
    setGlbUrl(null);
    setProgress(10);
    setGenerationStatus("uploading");

    try {
      // 1. Kép base64-ra konvertálása
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result.split(",")[1]);
        reader.readAsDataURL(image);
      });
      const base64Image = await base64Promise;

      setProgress(25);

      // 2. Kép feltöltése Fal.ai storage-ba (backend proxyn keresztül)
      const uploadRes = await fetch(`${API_BASE}/api/upload-to-fal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          base64Image,
          mimeType: image.type,
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.message);

      setProgress(40);
      setGenerationStatus("generating");

      // 3. TRELLIS.2 generálás
      const genRes = await fetch(`${API_BASE}/api/trellis2-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          imageUrl: uploadData.url,
          resolution,
          ssGuidance,
          slatGuidance,
        }),
      });

      // Progress szimulálása (a generálás háttérben fut)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 3, 90));
      }, 1500);

      const genData = await genRes.json();
      clearInterval(progressInterval);

      if (!genData.success) throw new Error(genData.message);

      setProgress(100);
      setGlbUrl(genData.glbUrl);
      setGenerationStatus("done");

      // 4. Előzménybe mentés
      const historyEntry = {
        id: Date.now().toString(),
        imagePreview: imagePreview,
        glbUrl: genData.glbUrl,
        resolution,
        ssGuidance,
        slatGuidance,
        createdAt: new Date().toISOString(),
        label: `Generálás ${new Date().toLocaleString("hu-HU")}`,
      };
      saveHistory([historyEntry, ...history.slice(0, 19)]); // max 20 előzmény

    } catch (err) {
      console.error("Generation error:", err);
      setError(err.message || "Generálási hiba történt");
      setGenerationStatus("error");
    } finally {
      setIsGenerating(false);
    }
  };

  const resolutionOptions = [
    { value: "512", label: "512³", price: "$0.25", time: "~3s", desc: "Gyors / Teszt" },
    { value: "1024", label: "1024³", price: "$0.30", time: "~17s", desc: "Ajánlott" },
    { value: "1536", label: "1536³", price: "$0.35", time: "~60s", desc: "Legjobb minőség" },
  ];

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif" }}
    >
      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/10">
        {[
          { id: "generate", label: "🧊 Generálás" },
          { id: "history", label: `📂 Előzmények (${history.length})` },
          { id: "presets", label: `⚡ Presetek (${presets.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: activeTab === tab.id
                ? "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(14,165,233,0.2))"
                : "transparent",
              color: activeTab === tab.id ? "#67e8f9" : "#9ca3af",
              border: activeTab === tab.id ? "1px solid rgba(6,182,212,0.4)" : "1px solid transparent",
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== TAB: GENERÁLÁS ========== */}
      {activeTab === "generate" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Kép feltöltés */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !imagePreview && fileInputRef.current?.click()}
            className="relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
            style={{
              minHeight: imagePreview ? "auto" : "180px",
              border: isDragging
                ? "2px dashed #06b6d4"
                : imagePreview
                  ? "2px solid rgba(6,182,212,0.3)"
                  : "2px dashed rgba(255,255,255,0.15)",
              background: isDragging
                ? "rgba(6,182,212,0.08)"
                : "rgba(255,255,255,0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {imagePreview ? (
              <div className="relative w-full">
                <img
                  src={imagePreview}
                  alt="Feltöltött kép"
                  className="w-full rounded-2xl object-contain"
                  style={{ maxHeight: "250px" }}
                />
                {/* Csere gomb */}
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs text-white"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}
                >
                  Csere
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}
                >
                  <Upload className="w-7 h-7 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Húzd ide a képet</p>
                  <p className="text-gray-400 text-sm mt-1">vagy kattints a tallózáshoz</p>
                  <p className="text-gray-500 text-xs mt-2">JPG, PNG, WEBP — max 5MB</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />

          {/* Felbontás választó */}
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Felbontás
            </p>
            <div className="grid grid-cols-3 gap-2">
              {resolutionOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setResolution(opt.value)}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: resolution === opt.value
                      ? "rgba(6,182,212,0.15)"
                      : "rgba(255,255,255,0.03)",
                    border: resolution === opt.value
                      ? "1px solid rgba(6,182,212,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="text-white font-bold text-sm">{opt.label}</div>
                  <div className="text-cyan-400 text-xs">{opt.price}</div>
                  <div className="text-gray-500 text-xs">{opt.time}</div>
                  <div className="text-gray-400 text-xs">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Haladó beállítások */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#9ca3af",
            }}
          >
            <span className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Haladó beállítások
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div
              className="p-4 rounded-xl space-y-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* SS Guidance */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-gray-300 text-sm">SS Guidance Strength</label>
                  <span className="text-cyan-400 text-sm font-bold">{ssGuidance}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={ssGuidance}
                  onChange={(e) => setSsGuidance(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Struktúra hűség az eredeti képhez (alapért.: 7.5)
                </p>
              </div>

              {/* SLAT Guidance */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-gray-300 text-sm">SLAT Guidance Strength</label>
                  <span className="text-cyan-400 text-sm font-bold">{slatGuidance}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={slatGuidance}
                  onChange={(e) => setSlatGuidance(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Textúra finomítás (alapért.: 3.0 — ne emeld 5 fölé)
                </p>
              </div>

              {/* Preset mentés */}
              {!savePresetOpen ? (
                <button
                  onClick={() => setSavePresetOpen(true)}
                  className="w-full py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: "rgba(6,182,212,0.1)",
                    border: "1px solid rgba(6,182,212,0.2)",
                    color: "#67e8f9",
                  }}
                >
                  <Bookmark className="w-4 h-4" />
                  Beállítások mentése presetként
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Preset neve..."
                    className="flex-1 px-3 py-2 rounded-xl text-sm text-white"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && saveCurrentAsPreset()}
                    autoFocus
                  />
                  <button
                    onClick={saveCurrentAsPreset}
                    className="px-4 py-2 rounded-xl text-sm text-white font-semibold"
                    style={{ background: "linear-gradient(135deg, #06b6d4, #0ea5e9)" }}
                  >
                    Ment
                  </button>
                  <button
                    onClick={() => setSavePresetOpen(false)}
                    className="px-3 py-2 rounded-xl text-sm text-gray-400"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Progress / Status */}
          {isGenerating && (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(6,182,212,0.08)",
                border: "1px solid rgba(6,182,212,0.25)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                <span className="text-cyan-300 text-sm font-semibold">
                  {generationStatus === "uploading" ? "Kép feltöltése..." : "3D modell generálása..."}
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
                  }}
                />
              </div>
              <p className="text-gray-400 text-xs mt-2 text-right">{progress}%</p>
            </div>
          )}

          {/* Hiba */}
          {error && (
            <div
              className="p-4 rounded-2xl flex items-start gap-3"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-sm font-semibold">Hiba történt</p>
                <p className="text-red-400/70 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Sikeres eredmény */}
          {glbUrl && generationStatus === "done" && (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">3D modell kész!</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={glbUrl}
                  download="model.glb"
                  className="flex-1 py-3 rounded-xl text-center text-white font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #06b6d4, #0ea5e9)" }}
                >
                  <Download className="w-4 h-4" />
                  Letöltés (.glb)
                </a>
                <a
                  href={glbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-xl text-white flex items-center gap-2 transition-all hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Megnyitás
                </a>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Blenderbe, Unity-be vagy Unreal Engine-be importálható
              </p>
            </div>
          )}

          {/* Generálás gomb */}
          <button
            onClick={handleGenerate}
            disabled={!image || isGenerating}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all duration-300"
            style={{
              background:
                !image || isGenerating
                  ? "rgba(255,255,255,0.05)"
                  : "linear-gradient(135deg, #06b6d4, #0ea5e9, #8b5cf6)",
              cursor: !image || isGenerating ? "not-allowed" : "pointer",
              opacity: !image || isGenerating ? 0.5 : 1,
              boxShadow: !image || isGenerating ? "none" : "0 0 30px rgba(6,182,212,0.3)",
            }}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generálás...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Box className="w-5 h-5" />
                3D Modell Generálása
              </span>
            )}
          </button>

          {/* Tipp */}
          <div
            className="p-3 rounded-xl flex items-start gap-2"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-400/80 text-xs">
              Legjobb eredmény: fehér/egyszínű hátterű, jól megvilágított, egyértelmű tárgy.
            </p>
          </div>
        </div>
      )}

      {/* ========== TAB: ELŐZMÉNYEK ========== */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <History className="w-12 h-12 text-gray-600" />
              <p className="text-gray-400">Még nincs generálási előzmény</p>
              <p className="text-gray-500 text-sm">Generálj egy 3D modellt az első előzményhez</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex gap-3">
                    <img
                      src={entry.imagePreview}
                      alt="input"
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{entry.label}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(6,182,212,0.15)", color: "#67e8f9" }}
                        >
                          {entry.resolution}³
                        </span>
                        <span className="text-gray-500 text-xs">
                          SS: {entry.ssGuidance} · SLAT: {entry.slatGuidance}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(entry.createdAt).toLocaleString("hu-HU")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a
                      href={entry.glbUrl}
                      download="model.glb"
                      className="flex-1 py-2 rounded-xl text-center text-xs text-white font-semibold flex items-center justify-center gap-1"
                      style={{ background: "linear-gradient(135deg, #06b6d4, #0ea5e9)" }}
                    >
                      <Download className="w-3 h-3" />
                      Letöltés
                    </a>
                    <button
                      onClick={() => {
                        setImagePreview(entry.imagePreview);
                        setResolution(entry.resolution);
                        setSsGuidance(entry.ssGuidance);
                        setSlatGuidance(entry.slatGuidance);
                        setGlbUrl(entry.glbUrl);
                        setGenerationStatus("done");
                        setActiveTab("generate");
                      }}
                      className="flex-1 py-2 rounded-xl text-center text-xs text-cyan-300 flex items-center justify-center gap-1"
                      style={{
                        background: "rgba(6,182,212,0.1)",
                        border: "1px solid rgba(6,182,212,0.2)",
                      }}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Újragenerálás
                    </button>
                    <button
                      onClick={() => saveHistory(history.filter((h) => h.id !== entry.id))}
                      className="px-3 py-2 rounded-xl text-xs text-red-400"
                      style={{ background: "rgba(239,68,68,0.1)" }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: PRESETEK ========== */}
      {activeTab === "presets" && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Gyors presetek */}
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Beépített presetek
          </p>
          <div className="space-y-2 mb-4">
            {[
              { name: "⚡ Gyors teszt", resolution: "512", ssGuidance: 7.5, slatGuidance: 3.0, desc: "512p · olcsó, gyors" },
              { name: "✅ Kiegyensúlyozott", resolution: "1024", ssGuidance: 7.5, slatGuidance: 3.0, desc: "1024p · ajánlott" },
              { name: "🏆 Legjobb minőség", resolution: "1536", ssGuidance: 8.5, slatGuidance: 3.5, desc: "1536p · prémium" },
              { name: "🎮 Játék asset", resolution: "1024", ssGuidance: 7.0, slatGuidance: 3.5, desc: "1024p · jó topológia" },
              { name: "🛍️ Termékfotó", resolution: "1024", ssGuidance: 9.0, slatGuidance: 2.5, desc: "1024p · pontos forma" },
              { name: "🎨 Kreatív", resolution: "1024", ssGuidance: 5.0, slatGuidance: 2.5, desc: "1024p · interpretatív" },
            ].map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="w-full p-3 rounded-xl text-left transition-all hover:opacity-90"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex justify-between items-start">
                  <span className="text-white text-sm font-semibold">{p.name}</span>
                  <span className="text-cyan-400 text-xs">{p.desc}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  SS: {p.ssGuidance} · SLAT: {p.slatGuidance}
                </div>
              </button>
            ))}
          </div>

          {/* Saját presetek */}
          {presets.length > 0 && (
            <>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Saját presetek
              </p>
              <div className="space-y-2">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl flex items-center gap-3"
                    style={{
                      background: "rgba(139,92,246,0.08)",
                      border: "1px solid rgba(139,92,246,0.2)",
                    }}
                  >
                    <button
                      onClick={() => applyPreset(p)}
                      className="flex-1 text-left"
                    >
                      <div className="text-white text-sm font-semibold">{p.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {p.resolution}³ · SS: {p.ssGuidance} · SLAT: {p.slatGuidance}
                      </div>
                    </button>
                    <button
                      onClick={() => deletePreset(p.id)}
                      className="p-1.5 rounded-lg text-red-400"
                      style={{ background: "rgba(239,68,68,0.1)" }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {presets.length === 0 && (
            <div
              className="p-4 rounded-xl text-center"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed rgba(255,255,255,0.1)",
              }}
            >
              <p className="text-gray-500 text-sm">
                Saját presetet a "Haladó beállítások" menüben menthetsz el
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Trellis2Panel;