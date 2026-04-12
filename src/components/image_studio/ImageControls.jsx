import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Wand2, Plus, X, Trash2, Zap, Settings2, Info, ArrowUpRight, Sparkles, Cpu, Activity, Layers, Target, Maximize2 } from 'lucide-react';
import Enhancer from '../../ai_components/Enhancer';

export default function ImageControls({
  selectedModel,
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
  const color = selectedModel.color || "#7c3aed";

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
      {/* Studio Identity Header */}
      <div className="pt-4 border-b border-white/5 relative z-20 bg-white/[0.02] backdrop-blur-3xl">
        <div className="h-16 px-6 flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
            style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}
          >
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.4em] italic leading-none">Neural Forge</h3>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1.5">Image Generator v4.0</p>
          </div>
        </div>
      </div>

      {/* Scrollable Configuration Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 h-full relative z-10">

      {/* Section: Prompts */}
      <div className="px-6 space-y-6 pb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic">
               Positive Command
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
               Negative Constraints
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Items to omit from frame..."
              rows={1}
              className="w-full bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-[13px] text-zinc-500 placeholder-zinc-800 focus:outline-none focus:border-white/10 transition-all resize-none leading-relaxed"
            />
          </div>
        )}

        {/* Input Images */}
        {isModelScopeEdit && (
          <div className="space-y-3 pt-2">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic px-1">
               Reference Clusters
            </label>
            <div className="grid grid-cols-2 gap-2">
              {inputImages.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/5 group shadow-lg">
                  <img src={img.dataUrl} className="w-full h-full object-cover" alt="ref" />
                  <button 
                    onClick={() => setInputImages(p => p.filter((_, i) => i !== idx))}
                    className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
              {inputImages.length < 3 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-700 hover:border-primary/40 hover:text-primary transition-all bg-white/[0.01] group"
                >
                  <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Attach Asset ({3 - inputImages.length} free)</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} multiple />
          </div>
        )}
      </div>

      <div className="h-px bg-white/5 mx-6 mb-6" />

      {/* Section: Configuration */}
      <div className="px-6 space-y-6 pb-24">
        <div className="flex items-center gap-2 px-1 mb-2">
           <Settings2 className="w-3.5 h-3.5 text-zinc-600" />
           <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Core Parameters</span>
        </div>

        {/* Quality selector */}
        {(isSD3 || !isNvidia) && !isModelScopeEdit && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
               <Layers className="w-3 h-3 text-zinc-600" />
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Process Fidelity</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(QUALITY_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setQuality(key)}
                  className={`flex flex-col items-center py-2.5 rounded-xl border transition-all duration-300 ${
                    quality === key ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'
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
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Composition Area</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(isFlux ? FLUX_SIZES : ASPECT_RATIO_LIST).map((ar, idx) => {
                const isActive = isFlux ? fluxSizeIdx === idx : aspectRatio === ar.value;
                const size = isFlux ? ar : QUALITY_PRESETS[quality].sizes[ar.value];
                
                return (
                  <button
                    key={idx}
                    onClick={() => isFlux ? setFluxSizeIdx(idx) : setAspectRatio(ar.value)}
                    className={`flex flex-col items-center py-2.5 rounded-xl text-[10px] font-black transition-all border duration-300 ${
                      isActive ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700'
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
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Asset Quantity</span>
              <span className="text-[10px] font-black italic" style={{ color }}>{numImages}</span>
            </div>
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                 className="absolute h-full transition-all duration-300" 
                 style={{ width: `${(numImages/4)*100}%`, backgroundColor: color }} 
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
            <span className="text-[9px] font-black uppercase tracking-[0.4em] italic">Advanced Control</span>
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
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Temporal Seed</span>
                  <span className="text-[8px] text-zinc-800 font-bold uppercase tracking-widest">(Optional)</span>
                </div>
                <input 
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Entropy value (e.g. 42)"
                  className="w-full bg-white/[0.01] border border-white/5 rounded-xl p-3 text-[12px] text-zinc-500 placeholder-zinc-800 focus:outline-none focus:border-white/10 transition-all font-mono"
                />
              </div>

              {/* Parameters Sliders */}
              {(isFal || isNvidia) && !isModelScopeEdit && (
                <div className="space-y-6">
                   <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Inference Steps</span>
                        <span className="text-[10px] font-black italic" style={{ color }}>{steps}</span>
                      </div>
                      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                           className="absolute h-full transition-all duration-300" 
                           style={{ width: `${(steps/50)*100}%`, backgroundColor: color }} 
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
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Neural Guidance</span>
                        <span className="text-[10px] font-black italic" style={{ color }}>{guidance}</span>
                      </div>
                      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                           className="absolute h-full transition-all duration-300" 
                           style={{ width: `${(guidance/(isFlux ? 30 : 20))*100}%`, backgroundColor: color }} 
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt Extend Toggle */}
        {isModelScopeEdit && (
          <button 
            onClick={() => setPromptExtend(!promptExtend)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 group ${
              promptExtend ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700'
            }`}
            style={promptExtend ? {
              backgroundColor: `${color}08`,
              borderColor: `${color}20`,
              color: color
            } : {}}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${promptExtend ? 'bg-primary/20 text-white shadow-lg' : 'bg-white/10 text-zinc-800'}`}>
                 <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">AI Expansion</span>
            </div>
            <div className="w-8 h-4 rounded-full relative transition-colors shadow-inner" style={{ backgroundColor: promptExtend ? color : 'rgba(255,255,255,0.05)' }}>
              <motion.div 
                animate={{ x: promptExtend ? 18 : 3 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-md"
              />
            </div>
          </button>
        )}

        {/* Current Model Status Card */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
           <div className="relative z-10 flex items-center justify-between">
              <div className="min-w-0">
                 <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-1">Active Neural Unit</p>
                 <h4 className="text-xs font-black text-white italic truncate pr-2">{selectedModel.name}</h4>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[8px] font-black text-emerald-500 tracking-tighter uppercase italic">Ready</span>
              </div>
           </div>
        </div>
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
              <span>Forging...</span>
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
              <span>Forge Image</span> <Zap className="w-4 h-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
