import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Wand2, Plus, X, Trash2, Zap, Settings2, Info, ArrowUpRight, Sparkles, Cpu, Activity, Layers, Target, Maximize2, ChevronDown, Pencil, Upload, Images, Loader2 } from 'lucide-react';
import Enhancer from '../../ai_components/Enhancer';
import { ALL_MODELS } from '../../ai_components/models';
import { createPortal } from 'react-dom';
import { API_BASE } from '../../api/client';

const MODEL_LIMIT_LABEL = "Global limit";

export function GalleryPickerModal({
  onClose,
  onSelectMultiple,
  getIdToken,
  slotsAvailable,
  variant = 'default',
  title,
  subtitle,
  confirmLabel,
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [adding, setAdding] = useState(false);
  const abortRef = useRef(null);
  const isTripo = variant === 'tripo';
  const resolvedTitle = title || (isTripo ? 'Gallery Vault' : 'Gallery');
  const resolvedSubtitle = subtitle || (selected.length > 0
    ? `${selected.length} / ${slotsAvailable} selected`
    : `Maximum ${slotsAvailable} images`);
  const resolvedConfirmLabel = confirmLabel || (isTripo ? 'Load selected' : 'Add');

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const fetchGallery = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`${API_BASE}/api/image-gallery`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (data.success) setImages(data.images);
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Gallery fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
    return () => controller.abort();
  }, []);

  const toggleSelect = (img) => {
    setSelected(prev => {
      const isSelected = prev.some(i => i.id === img.id);
      if (isSelected) return prev.filter(i => i.id !== img.id);
      if (prev.length >= slotsAvailable) return prev;
      return [...prev, img];
    });
  };

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setAdding(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const token = await getIdToken();
      const results = await Promise.all(selected.map(async (img) => {
        const res = await fetch(`${API_BASE}/api/image-gallery/proxy?key=${encodeURIComponent(img.full_key)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!res.ok) throw new Error(res.statusText);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ dataUrl: e.target.result, name: img.id + '.png' });
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }));
      onSelectMultiple(results);
      onClose();
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Image load failed:', err);
      setAdding(false);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden ${
          isTripo
            ? 'rounded-[2rem] border border-white/10 bg-[#05010e]/95 shadow-[0_0_40px_rgba(138,43,226,0.18)]'
            : 'rounded-[2rem] bg-[#0a0a14] border border-white/10 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-8 py-5 ${isTripo ? 'border-b border-white/10 bg-white/[0.02]' : 'border-b border-white/5'}`}>
          <div>
            {isTripo && (
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300/70">Shared Image Gallery</p>
            )}
            <h3 className={`text-sm font-black text-white uppercase tracking-[0.2em] ${isTripo ? 'mt-2 text-xl italic tracking-tighter normal-case' : 'italic'}`}>{resolvedTitle}</h3>
            <p className={`mt-1 font-bold uppercase tracking-widest ${isTripo ? 'text-[10px] text-zinc-400 normal-case tracking-normal' : 'text-[9px] text-white/20'}`}>
              {resolvedSubtitle}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleClose}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center text-white transition-all ${
              isTripo
                ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">{isTripo ? 'Gallery empty' : 'Empty gallery'}</p>
              <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest">{isTripo ? 'Generate or save images first' : 'Generate images first'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img) => {
                const isSelected = selected.some(i => i.id === img.id);
                const isDisabled = !isSelected && selected.length >= slotsAvailable;
                return (
                  <button
                    key={img.id}
                    onClick={() => toggleSelect(img)}
                    disabled={isDisabled || adding}
                    className={`relative aspect-square rounded-xl overflow-hidden border transition-all group disabled:opacity-30 ${isSelected ? 'border-violet-500 ring-2 ring-violet-500/40' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <img
                      src={img.thumbUrl}
                      alt={img.prompt}
                      className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-black">
                          {selected.findIndex(i => i.id === img.id) + 1}
                        </div>
                      </div>
                    )}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected.length > 0 && (
          <div className={`p-4 ${isTripo ? 'border-t border-white/10 bg-white/[0.03]' : 'border-t border-white/5 bg-white/[0.02]'}`}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAdd}
              disabled={adding}
              className={`w-full py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                isTripo
                  ? 'bg-gradient-to-r from-[#8a2be2] via-[#7c3aed] to-[#00e5ff] shadow-[0_0_30px_rgba(138,43,226,0.3)] hover:brightness-110'
                  : 'bg-violet-600 hover:bg-violet-500'
              }`}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {adding ? 'Loading...' : `${resolvedConfirmLabel} (${selected.length})`}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}

export default function ImageControls({
  selectedModel,
  onModelChange,
  prompt, setPrompt,
  negativePrompt, setNegativePrompt,
  aspectRatio, setAspectRatio,
  quality, setQuality,
  numImages, setNumImages,
  seed, setSeed,
  steps, setSteps,
  guidance, setGuidance,
  promptExtend, setPromptExtend,
  inputImages, setInputImages,
  isGenerating,
  onGenerate,
  fluxSizeIdx, setFluxSizeIdx,
  showAdvanced, setShowAdvanced,
  isEnhancerBusy, setIsEnhancerBusy,
  enhancingPrompt, dehancingPrompt, gemmaVisionPrompt,
  ASPECT_RATIO_LIST, QUALITY_PRESETS, FLUX_SIZES,
  getIdToken
}) {
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const popoverRef = useRef(null);
  const color = selectedModel.color || "#7c3aed";

  // Generáló vs szerkesztő mód
  const isEditMode = !!selectedModel.needsInputImage;
  const availableModels = ALL_MODELS.filter(
    m => m.panelType === 'image' && !!m.needsInputImage === isEditMode
  );

  // Dropdown bezárása külső kattintásra
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - inputImages.length);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setInputImages(prev => [...prev, { dataUrl: ev.target.result, name: file.name }].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });
  };

  const isNvidia = selectedModel.provider === "nvidia-image";
  const apiId = selectedModel.apiModel || "";
  const provider = selectedModel.provider || "fal";
  const isGoogleImage = provider === "google-image";
  const isStability = provider === "stability";
  const isCloudflare = provider === "cloudflare";
  const isFal = !isStability && !isGoogleImage && !isCloudflare && !isNvidia;
  const isModelScopeEdit = !!selectedModel.needsInputImage;
  const getNvidiaType = (id = "") => {
    const lowId = id.toLowerCase();
    if (lowId.includes("flux")) return "flux";
    if (lowId.includes("stable-diffusion-3")) return "sd3";
    return "other";
  };
  const nvidiaType = isNvidia ? getNvidiaType(apiId) : null;
  const isFlux = nvidiaType === "flux";
  const isSD3 = nvidiaType === "sd3";

  const currentRatio = isFlux ? FLUX_SIZES[fluxSizeIdx] : aspectRatio;

  return (
    <div className="flex flex-col h-full bg-[#0a0618]/30 backdrop-blur-[60px] relative border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Model Dropdown Header */}
      <div className="pt-4 border-b border-white/5 relative z-20 bg-white/[0.02] backdrop-blur-3xl">
        <div className="h-16 px-4 flex items-center" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 w-full pl-2 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300"
          >
            {/* Mode icon */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {isEditMode
                ? <Pencil className="w-3.5 h-3.5" />
                : <ImageIcon className="w-3.5 h-3.5" />}
            </div>

            {/* Model name */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em] leading-none mb-1">
                {isEditMode ? 'Image editing' : 'Image generation'}
              </p>
              <p className="text-[12px] font-black text-white truncate leading-none">
                {selectedModel.name}
              </p>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown panel */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-4 right-4 mt-1 rounded-xl border border-white/10 bg-[#0d0d14]/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    {isEditMode ? 'Editing models' : 'Generation models'}
                  </span>
                  <span className="text-[8px] text-zinc-600 font-bold">{availableModels.length} models</span>
                </div>

                {/* Model list */}
                <div className="max-h-72 overflow-y-auto py-1">
                  {availableModels.map(model => {
                    const isActive = selectedModel?.id === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange?.(model);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
                          }`}
                      >
                        {/* Color dot */}
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: model.color,
                            boxShadow: isActive ? `0 0 8px ${model.color}80` : 'none',
                          }}
                        />
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] font-bold text-white truncate block">{model.name}</span>
                        </div>
                        {/* Badge */}
                        {MODEL_LIMIT_LABEL && (
                          <span
                            className="text-[8px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 border"
                            style={{
                              color: isActive ? model.color : '#6b7280',
                              borderColor: isActive ? `${model.color}40` : 'rgba(255,255,255,0.06)',
                              backgroundColor: isActive ? `${model.color}12` : 'rgba(255,255,255,0.02)',
                            }}
                          >
                            {MODEL_LIMIT_LABEL}
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[8px] font-black text-emerald-500 uppercase flex-shrink-0">Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scrollable Configuration Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 h-full relative z-10">

        {/* Section: Prompts */}
        <div className="px-6 space-y-6 pb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">
                Positive prompt
              </label>
              <Sparkles className="w-3.5 h-3.5 text-primary opacity-30 animate-pulse" />
            </div>
            <div className="relative group">
              <Enhancer
                value={prompt}
                onChange={setPrompt}
                onBusyChange={setIsEnhancerBusy}
                enhancing_prompt={enhancingPrompt}
                dechanting_prompt={dehancingPrompt}
                gemmaVisionPrompt={gemmaVisionPrompt}
                inputImages={inputImages}
                color={color}
                onSubmit={onGenerate}
                onNegativeChange={setNegativePrompt}
                getIdToken={getIdToken}
              />
            </div>
          </div>

          {isModelScopeEdit && !isGoogleImage && !isFlux && (
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic px-1">
                Negative prompt
              </label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="What should the image avoid? (e.g. distorted limbs, text...)"
                rows={2}
                className="w-full bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-[13px] text-zinc-500 placeholder-zinc-800 focus:outline-none focus:border-white/10 transition-all resize-none leading-relaxed overflow-y-auto"
              />
            </div>
          )}

          {/* Input Images */}
          {isModelScopeEdit && (
            <div className="space-y-3 pt-2">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic px-1">
                Reference images
              </label>
              <div className="grid grid-cols-2 gap-2">
                {inputImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/5 group shadow-lg">
                    <img src={img.dataUrl || null} className="w-full h-full object-cover" alt="ref" />
                    <button
                      onClick={() => setInputImages(p => p.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ))}
                {inputImages.length < 3 && (
                  <div className="relative aspect-video" ref={popoverRef}>
                    <button
                      onClick={() => setPopoverOpen(p => !p)}
                      className="w-full h-full rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-700 hover:border-primary/40 hover:text-primary transition-all bg-white/[0.01] group"
                    >
                      <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Attach image ({3 - inputImages.length} slots left)</span>
                    </button>

                    <AnimatePresence>
                      {popoverOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-white/10 bg-[#0d0d14]/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
                        >
                          <button
                            onClick={() => { fileInputRef.current?.click(); setPopoverOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-all"
                          >
                            <Upload className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">From device</span>
                          </button>
                          <div className="h-px bg-white/5 mx-3" />
                          <button
                            onClick={() => { setGalleryPickerOpen(true); setPopoverOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-all"
                          >
                            <Images className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">From gallery</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} multiple />
              <AnimatePresence>
                {galleryPickerOpen && (
                  <GalleryPickerModal
                    onClose={() => setGalleryPickerOpen(false)}
                    onSelectMultiple={(imgs) => setInputImages(prev => [...prev, ...imgs].slice(0, 3))}
                    getIdToken={getIdToken}
                    slotsAvailable={3 - inputImages.length}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="h-px bg-white/5 mx-6 mb-6" />

        {/* Section: Configuration */}
        <div className="px-6 space-y-6 pb-24">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Settings2 className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Basic settings</span>
          </div>

          {/* Quality selector */}
          {(isSD3 || !isNvidia) && !isModelScopeEdit && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Layers className="w-3 h-3 text-zinc-600" />
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Quality</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(QUALITY_PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setQuality(key)}
                    className={`flex flex-col items-center py-2.5 rounded-xl border transition-all duration-300 ${quality === key ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                      }`}
                    style={quality === key ? {
                      backgroundColor: `${color}15`,
                      borderColor: `${color}40`,
                      color: color,
                      boxShadow: `0 0 15px ${color}08`
                    } : {}}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tighter">{p.label}</span>
                    <span className="text-[7px] font-bold opacity-40 uppercase tracking-widest mt-0.5">{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aspect Ratio */}
          {((isSD3 || !isNvidia) || isFlux) && !isModelScopeEdit && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Maximize2 className="w-3 h-3 text-zinc-600" />
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Image size and ratio</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(isFlux ? FLUX_SIZES : ASPECT_RATIO_LIST).map((ar, idx) => {
                  const isActive = isFlux ? fluxSizeIdx === idx : aspectRatio === ar.value;
                  const size = isFlux ? ar : QUALITY_PRESETS[quality].sizes[ar.value];

                  return (
                    <button
                      key={idx}
                      onClick={() => isFlux ? setFluxSizeIdx(idx) : setAspectRatio(ar.value)}
                      className={`flex flex-col items-center py-2.5 rounded-xl text-[10px] font-black transition-all border duration-300 ${isActive ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700'
                        }`}
                      style={isActive ? {
                        backgroundColor: `${color}15`,
                        borderColor: `${color}40`,
                        color: color,
                        boxShadow: `0 0 15px ${color}08`
                      } : {}}
                    >
                      <span className="uppercase tracking-widest">{ar.label}</span>
                      <span className="text-[7px] font-bold opacity-40 mt-0.5">{size.w}x{size.h}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Num images */}
          {isFal && !isModelScopeEdit && (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Number of images</span>
                <span className="text-[10px] font-black italic" style={{ color }}>{numImages}</span>
              </div>
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="absolute h-full transition-all duration-300"
                  style={{ width: `${(numImages / 4) * 100}%`, backgroundColor: color }}
                />
                <input
                  type="range" min="1" max="4" step="1"
                  value={numImages} onChange={(e) => setNumImages(parseInt(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>
          )}

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between py-2 px-1 text-zinc-600 hover:text-zinc-400 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Settings2 className={`w-3.5 h-3.5 transition-transform duration-500 ${showAdvanced ? 'rotate-90' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] italic">Advanced settings</span>
            </div>
            <motion.div
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              className="flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-6"
              >
                {/* Seed */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Random seed</span>
                    <span className="text-[8px] text-zinc-800 font-bold uppercase tracking-widest">(Optional)</span>
                  </div>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Seed value (e.g. 42)"
                    className="w-full bg-white/[0.01] border border-white/5 rounded-xl p-3 text-[12px] text-zinc-500 placeholder-zinc-800 focus:outline-none focus:border-white/10 transition-all font-mono"
                  />
                </div>

                {/* Parameters Sliders */}
                {(isFal || isNvidia) && !isModelScopeEdit && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Generation steps</span>
                        <span className="text-[10px] font-black italic" style={{ color }}>{steps}</span>
                      </div>
                      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="absolute h-full transition-all duration-300"
                          style={{ width: `${(steps / 50) * 100}%`, backgroundColor: color }}
                        />
                        <input
                          type="range" min="1" max="50" step="1"
                          value={steps} onChange={(e) => setSteps(parseInt(e.target.value))}
                          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Prompt guidance</span>
                        <span className="text-[10px] font-black italic" style={{ color }}>{guidance}</span>
                      </div>
                      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="absolute h-full transition-all duration-300"
                          style={{ width: `${(guidance / (isFlux ? 30 : 20)) * 100}%`, backgroundColor: color }}
                        />
                        <input
                          type="range" min="1.5" max={isFlux ? 30 : 20} step="0.5"
                          value={guidance} onChange={(e) => setGuidance(parseFloat(e.target.value))}
                          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompt Extend Toggle Moved Here & Simplified */}
                {isModelScopeEdit && (
                  <button
                    onClick={() => setPromptExtend(!promptExtend)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${promptExtend ? 'bg-white/[0.04] border-white/10' : 'bg-transparent border-white/5 text-zinc-700'}`}
                    style={promptExtend ? { borderColor: `${color}40`, color } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-3.5 h-3.5 opacity-40" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">AI prompt extension</span>
                    </div>
                    <div className="w-8 h-4 rounded-full relative transition-colors bg-white/5 shadow-inner">
                      <motion.div
                        animate={{ x: promptExtend ? 18 : 3 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md"
                        style={{ backgroundColor: promptExtend ? color : '#52525b' }}
                      />
                    </div>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>


          {/* Current Model Status Card */}

        </div>

      </div>

      {/* Generation Bar */}
      <div className="mt-auto p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-3xl relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
        <button
          onClick={onGenerate}
          disabled={isGenerating || isEnhancerBusy || !prompt.trim()}
          className="w-full py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:grayscale shadow-2xl relative overflow-hidden group/btn"
          style={{
            backgroundColor: prompt.trim() && !isEnhancerBusy ? color : '#ffffff',
            color: prompt.trim() && !isEnhancerBusy ? '#ffffff' : '#000000',
            boxShadow: prompt.trim() && !isEnhancerBusy ? `0 10px 30px ${color}30` : 'none'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          {isGenerating ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Activity className="w-4 h-4" />
              </motion.div>
              <span>Creating...</span>
            </>
          ) : isEnhancerBusy ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Sparkles className="w-4 h-4" />
              </motion.div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Create image</span> <Zap className="w-4 h-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
