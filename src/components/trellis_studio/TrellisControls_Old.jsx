import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Type, Sliders, Box, Zap, Trash2, RotateCcw, Shuffle, Hash } from 'lucide-react';
import { STYLE_OPTIONS, TRELLIS_PRESETS } from '../../ai_components/trellis/Constants';

export default function TrellisControls({
  prompt, setPrompt,
  selectedStyle, setSelectedStyle,
  params, setParams,
  onGenerate, isRunning,
  enhancing, onEnhance, onDechant
}) {
  const color = "#a78bfa"; // Trellis Primary

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] border-r border-white/5 relative overflow-hidden shadow-2xl">
      <div className="pt-20 lg:pt-24 border-b border-white/5 relative z-20 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="h-16 px-6 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
            style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}
          >
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.4em] italic leading-none">Spatial Forge</h3>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1.5">Voxel Engine v2.0</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-hide">
        {/* Style Selection */}
        <div className="px-6">
          <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic mb-3 block px-1">Engine Algorithm</label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.slice(0, 6).map(style => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`py-2 rounded-xl border text-[10px] font-black uppercase transition-all duration-300 ${
                  selectedStyle === style.id ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-white/10 hover:text-zinc-500'
                }`}
                style={selectedStyle === style.id ? {
                  backgroundColor: `${color}15`,
                  borderColor: `${color}40`,
                  color: color,
                  boxShadow: `0 0 15px ${color}08`
                } : {}}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="px-6">
          <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic mb-3 block px-1">Spatial Directive</label>
          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Cybernetic construct with neural logic flow..."
              rows={3}
              className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[13px] text-zinc-200 placeholder-zinc-800 focus:outline-none focus:border-white/10 focus:bg-white/[0.04] transition-all resize-none shadow-xl leading-relaxed"
            />
          </div>

          {/* Prompt Actions: Enhance + Dechant */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={onEnhance}
              disabled={enhancing || !prompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-white/5 bg-white/[0.02] text-zinc-500 hover:text-zinc-300 hover:border-white/10 hover:bg-white/[0.04] transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {enhancing ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </motion.div>
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Enhance
            </button>
            <button
              onClick={onDechant}
              disabled={enhancing || !prompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-white/5 bg-white/[0.02] text-zinc-500 hover:text-zinc-300 hover:border-white/10 hover:bg-white/[0.04] transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Type className="w-3.5 h-3.5" />
              Dechant
            </button>
          </div>
        </div>

        {/* Seed Control */}
        <div className="px-6">
          <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic mb-3 block px-1">Generation Seed</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setParams(prev => ({ ...prev, randomSeed: !prev.randomSeed }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${
                params.randomSeed
                  ? 'bg-white/[0.04] border-white/10 text-zinc-300'
                  : 'bg-white/[0.01] border-white/5 text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              Random
            </button>
            {!params.randomSeed && (
              <div className="flex-1 relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700" />
                <input
                  type="number"
                  value={params.seed}
                  onChange={(e) => setParams(prev => ({ ...prev, seed: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-[11px] text-zinc-300 focus:outline-none focus:border-white/10 transition-all"
                  min="0"
                  max="2147483647"
                />
              </div>
            )}
          </div>
        </div>

        {/* CFG Scale Sliders */}
        <div className="px-6">
          <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic mb-3 block px-1 flex items-center gap-2">
            <Sliders className="w-3 h-3" /> CFG Scale
          </label>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">SLAT CFG</span>
                <span className="text-[9px] font-bold text-zinc-500">{params.slat_cfg_scale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={params.slat_cfg_scale}
                onChange={(e) => setParams(prev => ({ ...prev, slat_cfg_scale: parseFloat(e.target.value) }))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${color} 0%, ${color} ${((params.slat_cfg_scale - 1) / 19) * 100}%, rgba(255,255,255,0.05) ${((params.slat_cfg_scale - 1) / 19) * 100}%, rgba(255,255,255,0.05) 100%)`
                }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">SS CFG</span>
                <span className="text-[9px] font-bold text-zinc-500">{params.ss_cfg_scale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={params.ss_cfg_scale}
                onChange={(e) => setParams(prev => ({ ...prev, ss_cfg_scale: parseFloat(e.target.value) }))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${color} 0%, ${color} ${((params.ss_cfg_scale - 1) / 19) * 100}%, rgba(255,255,255,0.05) ${((params.ss_cfg_scale - 1) / 19) * 100}%, rgba(255,255,255,0.05) 100%)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="px-6">
          <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 italic mb-3 block px-1">Inference Fidelity</label>
          <div className="space-y-2 mb-4">
            {TRELLIS_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => setParams(prev => ({
                  ...prev,
                  slat_sampling_steps: preset.slat_steps,
                  ss_sampling_steps: preset.ss_steps,
                  slat_cfg_scale: preset.slat_cfg,
                  ss_cfg_scale: preset.ss_cfg
                }))}
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                  params.slat_sampling_steps === preset.slat_steps && params.ss_sampling_steps === preset.ss_steps ? '' : 'bg-white/[0.01] border-white/5 text-zinc-700 hover:border-zinc-500 hover:bg-white/[0.02]'
                }`}
                style={params.slat_sampling_steps === preset.slat_steps && params.ss_sampling_steps === preset.ss_steps ? {
                  backgroundColor: `${color}08`,
                  borderColor: `${color}30`,
                  color: color
                } : {}}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">{preset.label}</span>
                <span className="text-[8px] opacity-40 font-black uppercase tracking-tighter italic">{preset.slat_steps} steps</span>
              </button>
            ))}
          </div>

          {/* Manual Step Controls */}
          <div className="space-y-3 pt-3 border-t border-white/5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">SLAT Steps</span>
                <span className="text-[9px] font-bold text-zinc-500">{params.slat_sampling_steps}</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={params.slat_sampling_steps}
                onChange={(e) => setParams(prev => ({ ...prev, slat_sampling_steps: parseInt(e.target.value) }))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${color} 0%, ${color} ${((params.slat_sampling_steps - 5) / 45) * 100}%, rgba(255,255,255,0.05) ${((params.slat_sampling_steps - 5) / 45) * 100}%, rgba(255,255,255,0.05) 100%)`
                }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">SS Steps</span>
                <span className="text-[9px] font-bold text-zinc-500">{params.ss_sampling_steps}</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={params.ss_sampling_steps}
                onChange={(e) => setParams(prev => ({ ...prev, ss_sampling_steps: parseInt(e.target.value) }))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${color} 0%, ${color} ${((params.ss_sampling_steps - 5) / 45) * 100}%, rgba(255,255,255,0.05) ${((params.ss_sampling_steps - 5) / 45) * 100}%, rgba(255,255,255,0.05) 100%)`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto p-6 bg-[#0a0a0f] border-t border-white/5 backdrop-blur-xl relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.3)]">
        <button
          onClick={onGenerate}
          disabled={isRunning || !prompt.trim()}
          className="w-full py-4 rounded-[1.2rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:grayscale shadow-2xl relative overflow-hidden group/btn"
          style={{
            backgroundColor: prompt.trim() ? color : '#ffffff',
            color: prompt.trim() ? '#ffffff' : '#000000',
            boxShadow: prompt.trim() ? `0 10px 30px ${color}30` : 'none'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          {isRunning ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <RotateCcw className="w-4 h-4" />
              </motion.div>
              <span>Constructing...</span>
            </>
          ) : (
            <>
              <span>Evolve Asset</span> <Zap className="w-4 h-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
