import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Type, Sliders, Box, Zap, RotateCcw, Shuffle, Hash, AlertCircle } from 'lucide-react';
import { STYLE_OPTIONS, TRELLIS_PRESETS } from '../../ai_components/trellis/Constants';

/* ── Glass Card primitive ── */
const GlassCard = ({ children, className = '', style = {} }) => (
  <div
    className={className}
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%)',
      backdropFilter: 'blur(20px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '1.25rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ── Section label ── */
const SectionLabel = ({ children, className = "" }) => (
  <label className={`text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic mb-3 block px-1 ${className}`}>
    {children}
  </label>
);

/* ── Kinetic Slider Component (Spring Animated) ── */
const TrellisSlider = ({ label, value, min, max, step, onChange, color = "#a78bfa", onReset }) => {
  const [isDragging, setIsDragging] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="group/slider space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 italic">{label}</span>
        <div className="flex items-center gap-2">
          <div className="px-1.5 py-0.5 rounded-md bg-white/[0.02] border border-white/5 flex items-center justify-center min-w-[28px]">
            <span className="text-[10px] font-black tabular-nums text-white" style={{ color: value !== min ? color : '#3f3f46' }}>
              {step < 1 ? value.toFixed(1) : value}
            </span>
          </div>
          <button
            onClick={onReset}
            className="p-1 rounded-lg hover:bg-white/5 text-zinc-700 hover:text-white transition-all active:scale-90"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      <div className="relative pt-4 pb-1 px-0.5">
        <motion.div
          className="absolute -top-3 px-2 py-0.5 rounded-lg flex items-center justify-center min-w-[28px] z-20 pointer-events-none shadow-xl border border-white/20 backdrop-blur-md opacity-0 group-hover/slider:opacity-100 transition-opacity"
          style={{
            left: `${percentage}%`,
            x: '-50%',
            backgroundColor: `${color}cc`
          }}
          animate={{ x: '-50%', left: `${percentage}%` }}
          transition={isDragging ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
        >
          <span className="text-[9px] font-black text-white tabular-nums">
            {step < 1 ? value.toFixed(1) : value}
          </span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{ backgroundColor: `${color}cc` }} />
        </motion.div>

        <div className="relative h-1.5 w-full rounded-full bg-black/40 border border-white/5 overflow-hidden">
          <motion.div
            className="absolute left-0 top-0 bottom-0"
            style={{
              background: `linear-gradient(90deg, ${color}33, ${color})`,
              width: `${percentage}%`
            }}
            animate={{ width: `${percentage}%` }}
            transition={isDragging ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-30"
        />
      </div>
    </div>
  );
};

export default function TrellisControls({
  prompt, setPrompt,
  selectedStyle, setSelectedStyle,
  params, setParams,
  onGenerate, isRunning,
  enhancing, onEnhance, onDechant,
  enhanceError,
  customPreset, handleSaveCustomPreset, onDeleteCustomPreset,
}) {
  const color = "#a78bfa";
  const colorCyan = "#67e8f9";

  const [justSaved, setJustSaved] = useState(false);

  const handleSaveCurrentAsCustom = () => {
    handleSaveCustomPreset(params);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleResetParam = (key, defaultValue) => {
    setParams(prev => ({ ...prev, [key]: defaultValue }));
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#060410]"
      style={{
        borderRight: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* ── Ambient Background Mesh ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], opacity: [0.07, 0.1, 0.07] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-20 w-64 h-64 blur-[100px] rounded-full"
          style={{ background: `radial-gradient(circle, ${color}, transparent)` }}
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0], opacity: [0.05, 0.08, 0.05] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-20 -right-20 w-48 h-48 blur-[80px] rounded-full"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
        />
        <div className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-30" style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
      }}>
        <div className="h-14 px-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: `${color}10`, borderColor: `${color}25`, color }}
          >
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white font-black text-[9px] uppercase tracking-[0.3em] italic leading-none">Spatial Forge</h3>
            <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest mt-1">v2.0 Engine</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 relative z-10 scrollbar-hide px-5">

        {/* Style selection */}
        <div className="space-y-2">
          <SectionLabel className="mb-0">Algorithm</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {STYLE_OPTIONS.map(style => {
              const isActive = selectedStyle === style.id;
              return (
                <motion.button
                  key={style.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedStyle(style.id)}
                  className="py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all duration-300 relative overflow-hidden group/btn"
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${color}20, ${color}05)`,
                    borderColor: `${color}40`,
                    color,
                    boxShadow: `0 0 20px ${color}10`,
                  } : {
                    background: 'rgba(255,255,255,0.015)',
                    borderColor: 'rgba(255,255,255,0.04)',
                    color: '#44444b',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10 italic">{style.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Prompt section */}
        <div className="space-y-2">
          <SectionLabel className="mb-0">Spatial Directive</SectionLabel>
          <GlassCard className="rounded-2xl">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Directive Input..."
              rows={8}
              className="w-full bg-transparent p-3 text-[12px] text-zinc-300 placeholder-zinc-700 focus:outline-none resize-none leading-tight"
            />
          </GlassCard>
          <div className="flex gap-1.5">
            <button onClick={onEnhance} disabled={enhancing || !prompt.trim()} className="flex-1 py-2 rounded-xl border border-white/5 bg-white/[0.03] text-[8px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all disabled:opacity-20 flex items-center justify-center gap-1.5">
              <Sparkles className="w-2.5 h-2.5" /> Enhance
            </button>
            <button onClick={onDechant} disabled={enhancing || !prompt.trim()} className="flex-1 py-2 rounded-xl border border-white/5 bg-white/[0.03] text-[8px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all disabled:opacity-20 flex items-center justify-center gap-1.5">
              <Type className="w-2.5 h-2.5" /> Dechant
            </button>
          </div>
          {enhanceError && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              marginTop: 6, padding: "6px 10px", borderRadius: 8,
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
            }}>
              <AlertCircle style={{ width: 11, height: 11, color: "#f87171", flexShrink: 0 }} />
              <span style={{ fontSize: 10, lineHeight: 1.4, color: "#fca5a5" }}>
                {enhanceError}
              </span>
            </div>
          )}
        </div>

        {/* Sliders Card */}
        <div className="space-y-2.5">
          <SectionLabel className="mb-0">Parameters</SectionLabel>
          <GlassCard className="p-4 space-y-5 rounded-2xl">
            <TrellisSlider
              label="SLAT CFG"
              value={params.slat_cfg_scale}
              min={1} max={20} step={0.5}
              onChange={(v) => setParams(prev => ({ ...prev, slat_cfg_scale: v }))}
              onReset={() => handleResetParam('slat_cfg_scale', 7.5)}
            />
            <TrellisSlider
              label="SS CFG"
              value={params.ss_cfg_scale}
              min={1} max={20} step={0.5}
              onChange={(v) => setParams(prev => ({ ...prev, ss_cfg_scale: v }))}
              onReset={() => handleResetParam('ss_cfg_scale', 7.5)}
            />
            <div className="h-px bg-white/5 mx-1" />
            <TrellisSlider
              label="SLAT Steps"
              value={params.slat_sampling_steps}
              min={5} max={50} step={1}
              onChange={(v) => setParams(prev => ({ ...prev, slat_sampling_steps: v }))}
              onReset={() => handleResetParam('slat_sampling_steps', 25)}
            />
            <TrellisSlider
              label="SS Steps"
              value={params.ss_sampling_steps}
              min={5} max={50} step={1}
              onChange={(v) => setParams(prev => ({ ...prev, ss_sampling_steps: v }))}
              onReset={() => handleResetParam('ss_sampling_steps', 25)}
            />
          </GlassCard>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <SectionLabel className="mb-0">Presets</SectionLabel>
            <motion.button
              animate={justSaved ? { scale: [1, 1.1, 1], backgroundColor: ['rgba(255,255,255,0.05)', 'rgba(34,197,94,0.15)', 'rgba(255,255,255,0.05)'] } : {}}
              onClick={handleSaveCurrentAsCustom}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all duration-300 ${justSaved ? 'border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-500 hover:text-white'}`}
            >
              {justSaved ? <Zap className="w-2.5 h-2.5 fill-current" /> : <Zap className="w-2.5 h-2.5" />}
              <span className="text-[8px] font-black uppercase tracking-widest italic">
                {justSaved ? "Preset Saved!" : "Save Current State"}
              </span>
            </motion.button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {customPreset && (
              <div className="col-span-2 relative group/preset">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setParams(prev => ({ ...prev, ...customPreset }))}
                  className="w-full p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${colorCyan}15, ${colorCyan}05)`,
                    borderColor: `${colorCyan}30`,
                    color: colorCyan,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="flex items-center gap-2.5 relative z-10">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] font-black uppercase italic leading-none text-white">Custom Preset</span>
                      <p className="text-[7px] text-cyan-500/60 font-bold uppercase tracking-widest mt-0.5">Spatial Archive</p>
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                </motion.button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomPreset?.();
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center opacity-0 group-hover/preset:opacity-100 transition-opacity hover:bg-red-500/20 hover:border-red-500/30 text-zinc-500 hover:text-red-400 z-20"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {TRELLIS_PRESETS.map(preset => {
              const isActive = params.slat_sampling_steps === preset.slat_steps && params.ss_sampling_steps === preset.ss_steps;
              return (
                <motion.button
                  key={preset.label}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setParams(prev => ({
                    ...prev,
                    slat_sampling_steps: preset.slat_steps,
                    ss_sampling_steps: preset.ss_steps,
                    slat_cfg_scale: preset.slat_cfg,
                    ss_cfg_scale: preset.ss_cfg,
                  }))}
                  className="p-3 rounded-2xl border flex flex-col items-start justify-center transition-all duration-300 relative overflow-hidden group/preset"
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                    borderColor: `${color}35`,
                    color,
                    backdropFilter: 'blur(10px)',
                  } : {
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.04)',
                    color: '#66666e',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover/preset:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10 text-[9px] font-black uppercase tracking-widest italic">{preset.label}</span>
                  <span className="relative z-10 text-[7px] opacity-30 font-black uppercase italic mt-0.5">{preset.slat_steps} steps</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Generate */}
      <div className="p-6 relative z-20 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <motion.button
          whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }}
          whileTap={{ scale: 0.99 }}
          onClick={onGenerate}
          disabled={isRunning || !prompt.trim()}
          className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 transition-all disabled:opacity-20 relative overflow-hidden group/gen"
          style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: prompt.trim() ? '#fff' : '#3f3f46'
          }}
        >
          {/* Subtle Glow Background behind text */}
          {prompt.trim() && !isRunning && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none" />
          )}

          {/* Animated Gradient Border (Thin & Clean) */}
          {prompt.trim() && (
            <div className="absolute inset-0 p-[1px] rounded-2xl overflow-hidden pointer-events-none">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_40%,#a78bfa_50%,transparent_60%,transparent_100%)] opacity-30"
              />
              <div className="absolute inset-[1px] bg-[#0a0a10] rounded-2xl" />
            </div>
          )}

          <AnimatePresence mode="wait">
            {isRunning ? (
              <motion.div
                key="forging"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-primary relative z-10"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </motion.div>
                <span className="tracking-[0.5em]">Forging...</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 relative z-10"
              >
                <span className={prompt.trim() ? 'text-white' : 'text-zinc-700'}>Evolve Asset</span>
                <div className="relative">
                  <Zap className={`w-3.5 h-3.5 transition-all duration-500 ${prompt.trim() ? 'text-primary fill-primary/20' : 'text-zinc-800'}`} />
                  {prompt.trim() && (
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0, 0.3, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-primary rounded-full blur-md"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inner Gloss */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        </motion.button>

        {/* Technical Sub-label minimalist */}
        <div className="mt-3 flex items-center justify-center opacity-10">
          <span className="text-[6px] font-black uppercase tracking-[0.8em] italic">Spatial Directive Stream v2.0</span>
        </div>
      </div>
    </div>
  );
}
