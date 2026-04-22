import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings2, Sparkles, ChevronDown, Plus, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MODEL_GROUPS, ALL_MODELS } from '../../ai_components/models';

const HISTORY_SIDEBAR_W = 288;

// Get Code group models
const CODE_GROUP = MODEL_GROUPS.find(g => g.id === 'code');
const CODE_MODELS = CODE_GROUP
  ? CODE_GROUP.categories.flatMap(c => c.models)
  : ALL_MODELS.filter(m => m.panelType === 'chat');

// Price map for Code models (fallback for models without badge)
const MODEL_PRICES = {
  'trinity-large': 'Ingyenes',
  'gemini-3-flash': 'Ingyenes',
  'gemini-2.5-pro': 'Prémium',
  'groq-gpt120b': '$0.50 / 1M tok',
  'groq-qwen3': '$0.30 / 1M tok',
  'groq-llama70b': '$0.60 / 1M tok',
  'cerebras-llama8b': '$0.10 / 1M tok',
  'mistral-large': '$2.00 / 1M tok',
  'nvidia-glm4.7': '$0.40 / 1M tok',
  'deepseek-v3.2': '$0.80 / 1M tok',
  'google-gemma-3-27b-it': 'Ingyenes',
  'gpt4o_code': '$5.00 / 1M tok',
};

export default function ModelBar({
  selectedModel,
  setHistorySidebarOpen,
  onConfigOpen,
  navHeight,
  historySidebarOpen,
  isDesktop,
  sidebarCollapsed,
  onModelSwitch,
  onNewChat,
  initialDropdownOpen = false
}) {
  const themeColor = selectedModel?.color || "#8b5cf6";
  const [modelDropdownOpen, setModelDropdownOpen] = useState(initialDropdownOpen);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!modelDropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelDropdownOpen]);

  // React to initialDropdownOpen prop changes
  useEffect(() => {
    if (initialDropdownOpen) setModelDropdownOpen(true);
  }, [initialDropdownOpen]);

  const handleModelSelect = useCallback((model) => {
    setModelDropdownOpen(false);
    onModelSwitch?.(model);
  }, [onModelSwitch]);

  return (
    <motion.div
      className="w-full flex items-center justify-between px-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        {/* Model selector */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl hover:bg-white/[0.04] transition-all duration-300 text-gray-400 hover:text-white"
            aria-label="Modell váltás"
            aria-expanded={modelDropdownOpen}
            aria-haspopup="listbox"
          >
            {/* Avatar dot */}
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border"
              style={{ backgroundColor: `${themeColor}20`, borderColor: `${themeColor}40`, color: themeColor }}
            >
              <Sparkles className="w-3 h-3" />
            </div>

            {/* Model name */}
            <span className="text-[11px] font-bold truncate max-w-[150px]">
              {selectedModel?.name || 'AI'}
            </span>

            {/* Chevron */}
            <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {modelDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-2 w-80 rounded-xl border border-white/10 bg-[#0d0d14]/98 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Kód AI választás</span>
                  <span className="text-[8px] text-gray-600 font-bold">{CODE_MODELS.length} modell</span>
                </div>

                {/* Model list */}
                <div className="max-h-80 overflow-y-auto py-1">
                  {CODE_MODELS.map(model => {
                    const isActive = selectedModel?.id === model.id;
                    const price = model.badge || MODEL_PRICES[model.id] || '';

                    return (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
                          }`}
                      >
                        {/* Color dot */}
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-transparent"
                          style={{
                            backgroundColor: model.color,
                            boxShadow: isActive ? `0 0 8px ${model.color}80` : 'none',
                          }}
                        />

                        {/* Name + provider */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[12px] font-bold text-white truncate block">
                            {model.name}
                          </span>
                          <span className="text-[9px] text-gray-600 font-medium">
                            {model.provider}
                          </span>
                        </div>

                        {/* Price badge */}
                        {price && (
                          <span
                            className="text-[8px] font-bold px-2 py-0.5 rounded-md shrink-0 border"
                            style={{
                              color: isActive ? model.color : '#6b7280',
                              borderColor: isActive ? `${model.color}40` : 'rgba(255,255,255,0.06)',
                              backgroundColor: isActive ? `${model.color}12` : 'rgba(255,255,255,0.02)',
                            }}
                          >
                            {price}
                          </span>
                        )}

                        {/* Active indicator */}
                        {isActive && (
                          <span className="text-[8px] font-black text-emerald-500 uppercase shrink-0">Aktív</span>
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

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-2">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] active:scale-95 transition-all duration-300"
          title="Új munkaablak nyitása"
        >
          <Plus className="w-3 h-3" />
          <span className="text-[10px] font-medium tracking-wide hidden sm:inline">Új chat</span>
        </button>

        <div className="w-px h-4 bg-white/10 hidden sm:block mx-1" />

        {/* History toggle (mobile) */}
        <button
          onClick={() => setHistorySidebarOpen(true)}
          className="xl:hidden p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all"
          title="Előzmények megnyitása"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Config */}
        <button
          onClick={onConfigOpen}
          className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all duration-500 group/btn"
          title="Beállítások"
        >
          <Settings2 className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-500" />
        </button>
      </div>
    </motion.div>
  );
}
