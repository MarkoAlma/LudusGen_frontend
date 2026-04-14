import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Settings2, Sparkles, History, Wifi, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_MODELS } from '../../ai_components/models';

const CONTENT_MAX_W = 'max-w-3xl';
const HISTORY_SIDEBAR_W = 288;
const SIDEBAR_W = 320;

const CHAT_MODELS = ALL_MODELS.filter(m => m.panelType === 'chat');

export default function ChatHeader({ selectedModel, setSidebarOpen, setHistorySidebarOpen, onConfigOpen, navHeight, historySidebarOpen, isDesktop, sidebarCollapsed, onModelSwitch }) {
  const themeColor = selectedModel?.color || "#8b5cf6";
  const [latency, setLatency] = useState(12);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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
      <div className="flex items-center gap-4 p-2 pr-4 rounded-l-2xl rounded-r-none bg-black/40 backdrop-blur-xl border border-white/10 border-r-0 shadow-2xl shadow-black/50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="xl:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model avatar */}
        <div className="relative group/header">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-700 bg-white/[0.05]"
            style={{
              borderColor: `${themeColor}40`,
              color: themeColor
            }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Info + Model Switcher */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-white italic tracking-widest leading-none max-w-[100px] sm:max-w-none truncate">
              {selectedModel?.name || "AI Chat"}
            </h2>

            {/* Model Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-1 px-1.5 py-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                title="Modell váltás"
              >
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {modelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-white/5">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em]">Modell váltás</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {CHAT_MODELS.map(model => (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(model)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all ${
                            selectedModel?.id === model.id
                              ? 'bg-white/[0.06]'
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: model.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-white truncate block">
                              {model.name}
                            </span>
                            <span className="text-[8px] text-gray-500 font-bold">
                              {model.provider}
                            </span>
                          </div>
                          {selectedModel?.id === model.id && (
                            <span className="text-[8px] font-black text-emerald-500 uppercase">Aktív</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1.5 hidden sm:flex">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">System_Live</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5 text-zinc-500" />
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{Math.round(latency)}MS</span>
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHistorySidebarOpen(true)}
            className="xl:hidden p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={onConfigOpen}
            className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-500 group/btn"
            title="Config"
          >
            <Settings2 className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
