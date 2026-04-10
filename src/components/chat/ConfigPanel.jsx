import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, RotateCcw, Zap, Hash, Target } from 'lucide-react';
import { findModelGroup } from '../../ai_components/models';
import bgChat from '../../assets/bg-chat.png';
import bgCode from '../../assets/bg-code.png';
import bgAudio from '../../assets/bg-audio.png';
import bgImage from '../../assets/bg-image.png';
import bg3d from '../../assets/bg-3d.png';

const CATEGORY_BGS = {
  chat: bgChat,
  code: bgCode,
  audio: bgAudio,
  image: bgImage,
  threed: bg3d
};

const SliderControl = ({ label, value, onChange, min, max, step, icon: Icon, description, color = '#8b5cf6' }) => (
  <div className="group/slider space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 group-hover/slider:border-white/10 transition-colors">
          {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
        </div>
        <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-md bg-white/[0.02] border border-white/10 shadow-inner">
           <span className="text-xs font-black tabular-nums" style={{ color }}>
             {typeof value === 'number' ? (step < 1 ? value.toFixed(2) : value) : value}
           </span>
        </div>
        <button
          onClick={() => onChange(min + (max - min) / 2)}
          className="p-1.5 rounded-md hover:bg-white/5 text-gray-700 hover:text-white transition-all duration-300"
          title="Reset to default"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>

    <div className="relative pt-6 px-1">
      {/* Floating Value Bubble */}
      <motion.div 
        className="absolute -top-3 px-2 py-0.5 rounded flex items-center justify-center min-w-[32px] z-20 pointer-events-none shadow-xl border border-white/20"
        style={{ 
          left: `calc(${((value - min) / (max - min)) * 100}% )`,
          x: '-50%',
          backgroundColor: color
        }}
        animate={{ 
          scale: 1, 
          opacity: 1
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <span className="text-[9px] font-black text-white tabular-nums">
          {typeof value === 'number' ? (step < 1 ? value.toFixed(2) : value) : value}
        </span>
        {/* Little Arrow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{ backgroundColor: color }} />
      </motion.div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/5 accent-primary hover:bg-white/10 transition-all custom-slider"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.06) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.06) 100%)`,
        }}
      />
      <div className="flex justify-between mt-1.5 px-0.5">
        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-tighter">{min}</span>
        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-tighter">{max}</span>
      </div>
    </div>
    
    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed pl-1 border-l border-white/5 ml-1">
      {description}
    </p>

    <style dangerouslySetInnerHTML={{ __html: `
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 0 10px ${color}80, 0 0 20px ${color}30;
        transition: all 0.3s ease;
        border: 2px solid ${color};
      }
      .custom-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 0 15px ${color}, 0 0 30px ${color}50;
      }
    `}} />
  </div>
);

export default function ConfigPanel({
  isOpen, onClose,
  temperature, setTemperature,
  maxTokens, setMaxTokens,
  topP, setTopP,
  frequencyPenalty, setFrequencyPenalty,
  presencePenalty, setPresencePenalty,
  systemPrompt, setSystemPrompt,
  themeColor = '#8b5cf6',
  navHeight = 0,
  selectedModelId
}) {
  const currentGroupId = findModelGroup(selectedModelId) || 'chat';
  const currentBg = CATEGORY_BGS[currentGroupId] || bgChat;

  // Portal target for mounting the panel globally
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 bottom-0 w-full max-w-sm z-[1001] flex flex-col"
            style={{ top: navHeight }}
          >
            <div className="flex-1 flex flex-col bg-[#000002]/98 backdrop-blur-[40px] border-l border-white/5 overflow-hidden relative">
              {/* ── Ambient Background ── */}
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.img
                    key={currentBg}
                    src={currentBg}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 0.1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-soft-light"
                    alt=""
                  />
                </AnimatePresence>
                <motion.div
                  className="absolute inset-0 transition-colors duration-1000"
                  animate={{ backgroundColor: themeColor }}
                  style={{ mixBlendMode: 'soft-light', opacity: 0.03 }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border relative z-10" style={{
                    backgroundColor: `${themeColor}12`,
                    borderColor: `${themeColor}25`,
                    color: themeColor
                  }}>
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs text-gray-300 font-bold">Config</h3>
                    <p className="text-[9px] text-gray-600 font-bold">Model paraméterek</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-600 hover:text-gray-400 transition-all duration-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                {/* System Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" style={{ color: themeColor }} />
                    <span className="text-[11px] text-gray-400 font-bold relative z-10">System Prompt</span>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Add meg a system promptot..."
                    rows={4}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl p-3 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all duration-500 resize-none leading-relaxed font-bold"
                  />
                </div>

                {/* Divider */}
                <div className="h-px bg-white/5" />

                {/* Sliders */}
                <SliderControl
                  label="Temperature"
                  icon={Zap}
                  value={temperature}
                  onChange={setTemperature}
                  min={0}
                  max={2}
                  step={0.05}
                  color={themeColor}
                  description="Alacsonyabb = fókuszáltabb, magasabb = kreatívabb."
                />

                <SliderControl
                  label="Max Tokens"
                  icon={Hash}
                  value={maxTokens}
                  onChange={setMaxTokens}
                  min={128}
                  max={8192}
                  step={128}
                  color={themeColor}
                  description="A válasz maximális hossza tokenekben."
                />

                <SliderControl
                  label="Top P"
                  icon={Target}
                  value={topP}
                  onChange={setTopP}
                  min={0}
                  max={1}
                  step={0.05}
                  color={themeColor}
                  description="Nucleus sampling — alacsonyabb = determinisztikusabb."
                />

                <SliderControl
                  label="Frequency Penalty"
                  icon={RotateCcw}
                  value={frequencyPenalty}
                  onChange={setFrequencyPenalty}
                  min={-2}
                  max={2}
                  step={0.1}
                  color={themeColor}
                  description="Ismétlődő szavak büntetése."
                />

                <SliderControl
                  label="Presence Penalty"
                  icon={RotateCcw}
                  value={presencePenalty}
                  onChange={setPresencePenalty}
                  min={-2}
                  max={2}
                  step={0.1}
                  color={themeColor}
                  description="Új témák ösztönzése."
                />
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/5">
                <span className="text-[9px] text-gray-700 font-bold">A változások azonnal érvényesek</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
