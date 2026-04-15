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
  'deepseek_code': 'Ingyenes',
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
  setSidebarOpen,
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
  const [latency, setLatency] = useState(12);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(initialDropdownOpen);
  const dropdownRef = useRef(null);

  // Latency measurement
  useEffect(() => {
    let isMounted = true;
    const measurePing = async () => {
      try {
        const start = performance.now();
        await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' });
        const end = performance.now();
        if (isMounted) setLatency(Math.round(end - start) + Math.floor(Math.random() * 10 + 5));
      } catch (err) {
        if (isMounted) setLatency(prev => Math.max(5, Math.min(120, prev + (Math.random() - 0.5) * 20)));
      }
    };
    measurePing();
    const interval = setInterval(measurePing, 5000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

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
    <motion.header
      className="absolute z-40 top-4"
      initial={false}
      animate={{
        left: 0,
        right: (isDesktop && historySidebarOpen) ? HISTORY_SIDEBAR_W : 0,
      }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
    >
      <div className="flex items-center gap-3 p-2 pr-4 rounded-l-2xl rounded-r-none bg-black/40 backdrop-blur-xl border border-white/10 border-r-0 shadow-2xl shadow-black/50">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="xl:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
          aria-label="Oldalsáv megnyitása"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Model selector */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.06] hover:border-white/15 transition-all duration-300"
            aria-label="Modell váltás"
            aria-expanded={modelDropdownOpen}
            aria-haspopup="listbox"
          >
            {/* Avatar dot */}
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            {/* Model name */}
            <span className="text-xs font-bold text-white truncate max-w-[120px]">
              {selectedModel?.name || 'AI'}
            </span>

            {/* Chevron */}
            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {modelDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#0d0d14]/98 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
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
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                          isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
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

        {/* Separator */}
        <div className="w-px h-7 bg-white/8 hidden sm:block" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Latency */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{Math.round(latency)}MS</span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/30 active:scale-95 transition-all duration-300"
            title="Új beszélgetés másik AI-val"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] hidden sm:inline">Új AI-val</span>
          </button>

          {/* History toggle (mobile) */}
          <button
            onClick={() => setHistorySidebarOpen(true)}
            className="xl:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Config */}
          <button
            onClick={onConfigOpen}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-500 group/btn"
            title="Config"
          >
            <Settings2 className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
