import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, RotateCcw, Zap, Hash, Target } from 'lucide-react';

const SliderControl = ({ label, value, onChange, min, max, step, icon: Icon, description, color = '#8b5cf6' }) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
        <span className="text-[11px] text-gray-400 font-bold">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-gray-500">{typeof value === 'number' ? (step < 1 ? value.toFixed(2) : value) : value}</span>
        <button
          onClick={() => onChange(min + (max - min) / 2)}
          className="p-1 rounded hover:bg-white/5 text-gray-700 hover:text-gray-500 transition-all duration-500"
          title="Visszaállítás"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.06) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.06) 100%)`,
      }}
    />
    <p className="text-[10px] text-gray-600 font-bold">{description}</p>
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
  themeColor = '#8b5cf6'
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-[210] flex flex-col"
          >
            <div className="flex-1 flex flex-col bg-[#03000a]/95 backdrop-blur-xl border-l border-white/5 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{
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
                    <span className="text-[11px] text-gray-400 font-bold">System Prompt</span>
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
    </AnimatePresence>
  );
}
