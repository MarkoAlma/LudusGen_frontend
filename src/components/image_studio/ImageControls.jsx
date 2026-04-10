import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Wand2, Plus, X, Trash2, Zap, Settings2, Info, ArrowUpRight, Sparkles, Cpu, Activity } from 'lucide-react';

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
  onGenerate
}) {
  const fileInputRef = useRef(null);
  const color = selectedModel.color || "#7c3aed";

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setInputImages(prev => [...prev, { dataUrl: ev.target.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0618]/30 backdrop-blur-[60px] relative border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Studio Identity Header */}
      <div className="pt-20 lg:pt-24 border-b border-white/5 relative z-20 bg-white/[0.02] backdrop-blur-3xl">
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
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the desired visualization..."
              rows={2}
              className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[13px] text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-white/10 focus:bg-white/[0.04] transition-all resize-none shadow-xl leading-relaxed"
            />
          </div>
        </div>

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

        {/* Input Images */}
        {selectedModel.needsInputImage && (
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
              {inputImages.length < 4 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-700 hover:border-primary/40 hover:text-primary transition-all bg-white/[0.01] group"
                >
                  <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Attach Asset</span>
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

        {/* Aspect Ratio */}
        <div className="space-y-3">
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic ml-1">Composition Ratio</span>
          <div className="grid grid-cols-3 gap-2">
            {["1:1", "16:9", "9:16", "4:3", "3:2", "2:3"].map(ar => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`py-2 rounded-xl text-[10px] font-black transition-all border duration-300 ${
                  aspectRatio === ar ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                }`}
                style={aspectRatio === ar ? {
                  backgroundColor: `${color}15`,
                  borderColor: `${color}40`,
                  color: color,
                  boxShadow: `0 0 15px ${color}08`
                } : {}}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters Sliders */}
        <div className="space-y-6 pt-2">
           <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic">Inference Steps</span>
                <span className="text-[10px] font-black italic" style={{ color }}>{steps}</span>
              </div>
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                   className="absolute h-full transition-all duration-300" 
                   style={{ width: `${(steps/80)*100}%`, backgroundColor: color }} 
                />
                <input 
                   type="range" min="10" max="80" step="1" 
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
                   style={{ width: `${(guidance/20)*100}%`, backgroundColor: color }} 
                />
                <input 
                  type="range" min="1" max="20" step="0.5" 
                  value={guidance} onChange={(e) => setGuidance(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" 
                />
              </div>
           </div>
        </div>

        {/* Prompt Extend Toggle */}
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
          disabled={isGenerating || !prompt.trim()}
          className="w-full py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:grayscale shadow-2xl relative overflow-hidden group/btn"
          style={{ 
            backgroundColor: prompt.trim() ? color : '#ffffff',
            color: prompt.trim() ? '#ffffff' : '#000000',
            boxShadow: prompt.trim() ? `0 10px 30px ${color}30` : 'none'
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
