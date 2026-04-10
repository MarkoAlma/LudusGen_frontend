import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Type, Sliders, Box, Zap, RotateCcw, Shuffle, Hash, RotateCcw as ResetIcon } from 'lucide-react';
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
const SectionLabel = ({ children }) => (
  <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic mb-3 block px-1">
    {children}
  </label>
);

/* ── Premium Slider with floating bubble ── */
function SliderControl({ label, value, min, max, step, onChange, onReset, defaultValue }) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bubbleX, setBubbleX] = useState(0);

  const pct = ((value - min) / (max - min)) * 100;

  const updateBubble = useCallback(() => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    setBubbleX((pct / 100) * rect.width);
  }, [pct]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    updateBubble();
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointerup', handlePointerUp);
      return () => window.removeEventListener('pointerup', handlePointerUp);
    }
  }, [isDragging]);

  React.useEffect(() => {
    updateBubble();
  }, [updateBubble]);

  return (
    <div className="relative">
      {/* Label + Reset row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
        {onReset && (
          <motion.button
            whileHover={{ scale: 1.15, rotate: -15 }}
            whileTap={{ scale: 0.9 }}
            onClick={onReset}
            className="p-1 rounded-md transition-colors"
            style={{ color: '#52525b' }}
            title={`Reset to ${defaultValue}`}
          >
            <ResetIcon className="w-3 h-3" />
          </motion.button>
        )}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-[10px] rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.75) ${pct}%, rgba(255,255,255,0.07) ${pct}%, rgba(255,255,255,0.07) 100%)`,
        }}
        onPointerDown={handlePointerDown}
      >
        {/* Floating value bubble */}
        <AnimatePresence>
          {(isDragging) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute pointer-events-none"
              style={{
                left: bubbleX,
                transform: 'translateX(-50%)',
                bottom: '100%',
                marginBottom: '8px',
              }}
            >
              <div
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white whitespace-nowrap"
                style={{
                  background: 'rgba(30,30,40,0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                {value}
              </div>
              {/* Bubble arrow */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                style={{
                  top: '100%',
                  marginTop: '-1px',
                  background: 'rgba(30,30,40,0.9)',
                  borderRight: '1px solid rgba(255,255,255,0.1)',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full pointer-events-none"
          style={{
            left: `${pct}%`,
            background: '#e4e4e7',
            boxShadow: '0 0 8px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            border: '2px solid rgba(255,255,255,0.15)',
          }}
        />
      </div>

      {/* Hidden native input for accessibility */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label={label}
      />
    </div>
  );
}

/* ── Hover-enhanced style button ── */
function StyleButton({ label, isActive, onClick, accentColor }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all duration-300 relative overflow-hidden group"
      style={isActive ? {
        background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}0a)`,
        borderColor: `${accentColor}45`,
        color: accentColor,
        boxShadow: `0 0 24px ${accentColor}12, inset 0 1px 0 rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(10px)',
      } : {
        background: 'linear-gradient(135deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
        borderColor: 'rgba(255,255,255,0.06)',
        color: '#52525b',
        backdropFilter: 'blur(8px)',
      }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 50% 0%, ${accentColor}30, transparent 70%)` }}
          transition={{ duration: 0.3 }}
        />
      )}
      {/* Shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 60%)`,
          backgroundSize: '200% 100%',
          animation: isActive ? 'none' : 'shimmer 2s ease-in-out infinite',
        }}
      />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}

/* ── Hover-enhanced preset button ── */
function PresetButton({ label, steps, isActive, onClick, accentColor }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="p-3.5 rounded-[1.25rem] border flex flex-col items-start justify-center transition-all duration-300 relative overflow-hidden group"
      style={isActive ? {
        background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}06)`,
        borderColor: `${accentColor}40`,
        color: accentColor,
        boxShadow: `0 0 24px ${accentColor}10, inset 0 1px 0 rgba(255,255,255,0.08)`,
        backdropFilter: 'blur(10px)',
      } : {
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        borderColor: 'rgba(255,255,255,0.06)',
        color: '#a1a1aa',
        backdropFilter: 'blur(8px)',
      }}
    >
      {isActive && (
        <div className="absolute inset-0 opacity-15"
          style={{ background: `radial-gradient(circle at 30% 50%, ${accentColor}25, transparent 60%)` }}
        />
      )}
      {/* Shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)`,
          backgroundSize: '200% 100%',
        }}
      />
      <span className="relative z-10 text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className="relative z-10 text-[8px] opacity-40 font-black uppercase tracking-tighter italic mt-1">{steps} steps</span>
    </motion.button>
  );
}

export default function TrellisControls({
  prompt, setPrompt,
  selectedStyle, setSelectedStyle,
  params, setParams,
  onGenerate, isRunning,
  enhancing, onEnhance, onDechant
}) {
  const color = "#a78bfa";
  const colorCyan = "#67e8f9";

  return (
    <div className="h-full flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(10,8,20,0.88) 0%, rgba(6,4,16,0.94) 50%, rgba(8,6,18,0.90) 100%)',
        backdropFilter: 'blur(30px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(30px) saturate(1.3)',
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
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, 15, 0], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 blur-[90px] rounded-full"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }}
        />
        <motion.div
          animate={{ x: [0, -10, 0], y: [0, 20, 0], opacity: [0.02, 0.04, 0.02] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          className="absolute top-1/3 right-0 w-40 h-40 blur-[70px] rounded-full"
          style={{ background: `radial-gradient(circle, ${colorCyan}, transparent)` }}
        />
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/20 to-transparent" />
      </div>

      {/* ── Header ─ */}
      <div className="relative z-30" style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)',
      }}>
        <div className="h-16 px-7 flex items-center gap-4">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{
                backgroundColor: `${color}12`,
                borderColor: `${color}35`,
                color,
                boxShadow: `0 0 24px ${color}18, 0 0 60px ${color}08, inset 0 1px 0 rgba(255,255,255,0.12)`,
              }}
            >
              <Box className="w-5 h-5" />
            </div>
            <div
              className="absolute -inset-1.5 rounded-2xl opacity-40 blur-lg"
              style={{ background: `radial-gradient(circle, ${color}25, transparent)` }}
            />
          </div>
          <div>
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.4em] italic leading-none">Spatial Forge</h3>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1.5">Voxel Engine v2.0</p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto py-5 space-y-6 relative z-10 scrollbar-hide px-7">

        {/* Style Selection */}
        <div>
          <SectionLabel>Engine Algorithm</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.slice(0, 6).map(style => (
              <StyleButton
                key={style.id}
                label={style.label}
                isActive={selectedStyle === style.id}
                onClick={() => setSelectedStyle(style.id)}
                accentColor={color}
              />
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <SectionLabel>Spatial Directive</SectionLabel>
          <GlassCard className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Cybernetic construct with neural logic flow..."
              rows={3}
              className="w-full bg-transparent p-4 text-[13px] text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none leading-relaxed"
            />
            <div className="absolute inset-0 rounded-[1.25rem] opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ boxShadow: `0 0 30px ${color}15, inset 0 0 0 1px ${color}30` }}
            />
          </GlassCard>

          {/* Prompt Actions */}
          <div className="flex gap-2 mt-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEnhance}
              disabled={enhancing || !prompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden group/enhance"
              style={{
                background: enhancing
                  ? `linear-gradient(135deg, ${color}15, ${color}08)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))',
                borderColor: enhancing ? `${color}35` : 'rgba(255,255,255,0.06)',
                color: enhancing ? color : '#71717a',
                backdropFilter: 'blur(10px)',
              }}
            >
              {enhancing ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </motion.div>
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Enhance
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onDechant}
              disabled={enhancing || !prompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))',
                borderColor: 'rgba(255,255,255,0.06)',
                color: '#71717a',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Type className="w-3.5 h-3.5" />
              Dechant
            </motion.button>
          </div>
        </div>

        {/* Seed Control */}
        <GlassCard>
          <div className="p-4">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic mb-3 block">Generation Seed</label>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setParams(prev => ({ ...prev, randomSeed: !prev.randomSeed }))}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest"
                style={params.randomSeed ? {
                  background: `linear-gradient(135deg, ${color}18, ${color}08)`,
                  borderColor: `${color}35`,
                  color,
                  boxShadow: `0 0 16px ${color}10`,
                } : {
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.06)',
                  color: '#52525b',
                }}
              >
                <Shuffle className="w-3.5 h-3.5" />
                Random
              </motion.button>
              {!params.randomSeed && (
                <div className="flex-1 relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
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
        </GlassCard>

        {/* Combined Sliders Card: CFG + Manual Override */}
        <GlassCard>
          <div className="p-4">
            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic mb-4 block flex items-center gap-2">
              <Sliders className="w-3 h-3" /> CFG Scale
            </label>
            <div className="space-y-5">
              {/* SLAT CFG */}
              <SliderControl
                label="SLAT CFG"
                value={params.slat_cfg_scale}
                min={1}
                max={20}
                step={0.5}
                onChange={(v) => setParams(prev => ({ ...prev, slat_cfg_scale: v }))}
                onReset={() => setParams(prev => ({ ...prev, slat_cfg_scale: 3.0 }))}
                defaultValue={3.0}
              />
              {/* SS CFG */}
              <SliderControl
                label="SS CFG"
                value={params.ss_cfg_scale}
                min={1}
                max={20}
                step={0.5}
                onChange={(v) => setParams(prev => ({ ...prev, ss_cfg_scale: v }))}
                onReset={() => setParams(prev => ({ ...prev, ss_cfg_scale: 7.5 }))}
                defaultValue={7.5}
              />
              {/* Divider */}
              <div className="h-px bg-white/5" />
              {/* SLAT Steps */}
              <SliderControl
                label="SLAT"
                value={params.slat_sampling_steps}
                min={5}
                max={50}
                step={1}
                onChange={(v) => setParams(prev => ({ ...prev, slat_sampling_steps: v }))}
                onReset={() => setParams(prev => ({ ...prev, slat_sampling_steps: 25 }))}
                defaultValue={25}
              />
              {/* SS Steps */}
              <SliderControl
                label="SS"
                value={params.ss_sampling_steps}
                min={5}
                max={50}
                step={1}
                onChange={(v) => setParams(prev => ({ ...prev, ss_sampling_steps: v }))}
                onReset={() => setParams(prev => ({ ...prev, ss_sampling_steps: 25 }))}
                defaultValue={25}
              />
            </div>
          </div>
        </GlassCard>

        {/* Presets */}
        <div>
          <SectionLabel>Inference Fidelity</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {TRELLIS_PRESETS.map(preset => (
              <PresetButton
                key={preset.label}
                label={preset.label}
                steps={preset.slat_steps}
                isActive={params.slat_sampling_steps === preset.slat_steps && params.ss_sampling_steps === preset.ss_steps}
                onClick={() => setParams(prev => ({
                  ...prev,
                  slat_sampling_steps: preset.slat_steps,
                  ss_sampling_steps: preset.ss_steps,
                  slat_cfg_scale: preset.slat_cfg,
                  ss_cfg_scale: preset.ss_cfg,
                }))}
                accentColor={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer: Generate Button ── */}
      <div className="p-7 relative z-20" style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
      }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGenerate}
          disabled={isRunning || !prompt.trim()}
          className="w-full py-4 rounded-full font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all disabled:opacity-20 disabled:grayscale relative overflow-hidden group/btn"
          style={{
            background: prompt.trim()
              ? `linear-gradient(135deg, ${color}, ${color}bb)`
              : 'rgba(255,255,255,0.08)',
            color: prompt.trim() ? '#ffffff' : '#000000',
            boxShadow: prompt.trim()
              ? `0 10px 40px ${color}30, 0 0 80px ${color}10, inset 0 1px 0 rgba(255,255,255,0.15)`
              : 'none',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
          {isRunning ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <RotateCcw className="w-4 h-4" />
              </motion.div>
              <span>Constructing...</span>
            </>
          ) : (
            <>
              <span>Evolve Asset</span>
              <Zap className="w-4 h-4 fill-current" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
