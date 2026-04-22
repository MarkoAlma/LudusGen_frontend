import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wrench, History, LayoutGrid, ChevronDown } from 'lucide-react';
import { useStudioPanels } from '../../context/StudioPanelContext';

const PANEL_LABELS = {
  L1: 'AI',
  L2: 'Eszközök',
  R: 'Elozmeny',
};

const PANEL_ICONS = {
  L1: Sparkles,
  L2: Wrench,
  R: History,
};

export default function MobilePanelControls({ color = '#8b5cf6', panels = [] }) {
  const { isMobile, mobileActive, panelState, setPanelOpen } = useStudioPanels();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isMobile || panels.length === 0) return null;

  const activePanel = panels.find((panelId) => mobileActive === panelId && panelState[panelId]) || null;
  const ActiveIcon = activePanel ? PANEL_ICONS[activePanel] : LayoutGrid;
  const activeLabel = activePanel ? PANEL_LABELS[activePanel] : 'Panelek';

  const handleToggle = (panelId) => {
    const isActive = mobileActive === panelId && panelState[panelId];
    setPanelOpen(panelId, !isActive);
    setMenuOpen(false);
  };

  const priority = { L1: 0, R: 1, L2: 2 };
  const orderedPanels = [...panels].sort((a, b) => priority[a] - priority[b]);

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-[68] bg-transparent"
            aria-label="Panel menu bezarasa"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed right-3 z-[70]"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setMenuOpen((open) => !open)}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a14]/82 text-white shadow-[0_16px_38px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
            style={{ boxShadow: activePanel ? `0 12px 32px rgba(0,0,0,0.38), 0 0 0 1px ${color}22` : undefined }}
            aria-expanded={menuOpen}
            aria-label={`${activeLabel} panel megnyitasa`}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-xl border"
              style={{
                background: activePanel ? `${color}22` : 'rgba(255,255,255,0.04)',
                borderColor: activePanel ? `${color}55` : 'rgba(255,255,255,0.08)',
              }}
            >
              <ActiveIcon className="h-3.5 w-3.5" style={{ color: activePanel ? color : '#d4d4d8' }} />
            </div>
            <ChevronDown className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border border-white/10 bg-[#12121f] p-[2px] text-zinc-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            {activePanel && (
              <span
                className="absolute -top-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border border-[#0a0a14]"
                style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
              />
            )}
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-[calc(100%+10px)] w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14]/92 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.48)] backdrop-blur-2xl"
              >
                <div className="mb-2 px-2 pt-1 text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">
                  Panelek
                </div>

                <div className="space-y-1">
                  {orderedPanels.map((panelId) => {
                    const Icon = PANEL_ICONS[panelId];
                    const isActive = mobileActive === panelId && panelState[panelId];

                    return (
                      <motion.button
                        key={panelId}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggle(panelId)}
                        className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200"
                        style={{
                          background: isActive ? `${color}20` : 'rgba(255,255,255,0.02)',
                          borderColor: isActive ? `${color}4d` : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border"
                          style={{
                            background: isActive ? `${color}16` : 'rgba(255,255,255,0.03)',
                            borderColor: isActive ? `${color}40` : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <Icon className="h-4 w-4" style={{ color: isActive ? color : '#a1a1aa' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white">
                            {PANEL_LABELS[panelId]}
                          </div>
                          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                            {isActive ? 'Aktiv panel' : 'Megnyitas'}
                          </div>
                        </div>
                        {isActive && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
