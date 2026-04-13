import React, { useEffect, createContext } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValueEvent, useTransform, useMotionValue } from 'framer-motion';
import { PanelLeftClose, PanelRightClose, ChevronLeft } from 'lucide-react';

/**
 * StudioLayoutContext
 * Provides raw MotionValues to performance-critical children (ThreeViewer, HUDs)
 * to bypass React re-renders during cinematic transitions.
 */
export const StudioLayoutContext = createContext({
  smoothL: null,
  smoothR: null,
});

/**
 * StudioLayout
 * A unified cinematic layout manager for Tripo and Trellis studios.
 */
export default function StudioLayout({
  children,
  leftSidebar,
  leftSecondarySidebar,
  rightSidebar,
  topHUD,
  bottomHUD,
  leftWidth = 320,
  leftSecondaryWidth = 300,
  rightWidth = 280,
  leftOpen = true,
  leftSecondaryOpen = true,
  setLeftOpen,
  setLeftSecondaryOpen,
  rightOpen = true,
  setRightOpen,
  onOffsetChange,
  overlay = false,
  onRightToggle,
}) {
  // Cinematic Spring Configuration
  const springConfig = { damping: 38, stiffness: 180, mass: 1 };

  // In overlay mode, sidebars float on top — layout doesn't shrink viewport
  const layoutL1 = overlay ? 0 : (leftOpen ? leftWidth : 0);
  const layoutL2 = overlay ? 0 : ((leftOpen && leftSecondaryOpen && leftSecondarySidebar) ? leftSecondaryWidth : 0);
  const layoutR = overlay ? 0 : (rightOpen ? rightWidth : 0);

  const smoothL1 = useSpring(layoutL1, springConfig);
  const smoothL2 = useSpring(layoutL2, springConfig);
  const smoothR = useSpring(layoutR, springConfig);

  // Unified L MotionValue for children/HUDs
  const smoothL = useMotionValue(smoothL1.get() + smoothL2.get());

  useEffect(() => {
    smoothL1.set(overlay ? 0 : (leftOpen ? leftWidth : 0));
  }, [leftOpen, leftWidth, overlay, smoothL1]);

  useEffect(() => {
    smoothL2.set(overlay ? 0 : ((leftOpen && leftSecondaryOpen && leftSecondarySidebar) ? leftSecondaryWidth : 0));
  }, [leftOpen, leftSecondaryOpen, leftSecondaryWidth, leftSecondarySidebar, overlay, smoothL2]);

  useEffect(() => {
    smoothR.set(overlay ? 0 : (rightOpen ? rightWidth : 0));
  }, [rightOpen, rightWidth, overlay, smoothR]);

  // Synchronize unified L
  useMotionValueEvent(smoothL1, "change", (v) => smoothL.set(v + smoothL2.get()));
  useMotionValueEvent(smoothL2, "change", (v) => smoothL.set(smoothL1.get() + v));

  // Backwards compatibility for components not yet using Context
  useMotionValueEvent(smoothL, "change", (latest) => {
    onOffsetChange?.({ left: latest, right: smoothR.get() });
  });
  useMotionValueEvent(smoothR, "change", (latest) => {
    onOffsetChange?.({ left: smoothL.get(), right: latest });
  });

  const rightToggleX = useTransform(smoothR, (v) => v * -1);

  return (
    <StudioLayoutContext.Provider value={{ smoothL, smoothR }}>
      <div className="h-full w-full overflow-hidden bg-transparent text-white relative">

        {/* ── MAIN VIEWPORT AREA (FIXED/FULLSCREEN) ── */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="h-full w-full flex flex-col">
            {topHUD}
            <div className="flex-1 relative overflow-hidden">
              {children}
            </div>
            {bottomHUD}
          </div>
        </div>

        {/* ── LEFT SIDEBAR STACK ── */}
        <div className="absolute left-0 top-0 h-full flex pointer-events-none z-[60]">
          {/* Level 1: Main Sidebar */}
          <motion.div
            style={{ width: overlay ? (leftOpen ? leftWidth : 0) : smoothL1 }}
            className="h-full border-r border-white/5 overflow-hidden pointer-events-auto"
          >
            <div style={{ width: leftWidth, height: '100%' }}>
              {leftSidebar}
            </div>
          </motion.div>

          {/* Level 2: Secondary Content */}
          {overlay ? (
            <AnimatePresence>
              {leftOpen && leftSecondaryOpen && leftSecondarySidebar && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-[65]"
                    onClick={() => setLeftSecondaryOpen?.(false)}
                  />
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 200 }}
                    className="fixed top-0 h-full z-[70] border-r border-white/5 overflow-hidden bg-[#0a0a0f]/95 backdrop-blur-3xl pointer-events-auto"
                    style={{ left: leftWidth, width: `calc(100vw - ${leftWidth}px)` }}
                  >
                    {leftSecondarySidebar}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          ) : (
            <motion.div
              style={{ width: smoothL2 }}
              className="h-full border-r border-white/5 overflow-hidden bg-[#0a0a0f]/40 backdrop-blur-3xl pointer-events-auto"
            >
              <div style={{ width: leftSecondaryWidth, height: '100%' }}>
                {leftSecondarySidebar}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        {overlay ? (
          <AnimatePresence>
            {rightOpen && (
              <>
                {/* Backdrop — only covers the right portion, not the left nav */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-[65]"
                  onClick={() => setRightOpen(false)}
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 200 }}
                  className="fixed right-0 top-0 h-full z-[70] border-l border-white/5 overflow-hidden bg-[#0a0a0f]/95 backdrop-blur-3xl pointer-events-auto"
                  style={{ width: `calc(100vw - ${leftWidth}px)` }}
                >
                  {rightSidebar}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ) : (
          <motion.div
            style={{ width: smoothR }}
            className="absolute right-0 top-0 h-full z-[60] border-l border-white/5 overflow-hidden"
          >
            <div style={{ width: rightWidth, height: '100%' }}>
              {rightSidebar}
            </div>
          </motion.div>
        )}

        {/* ── LEFT TOGGLE BUTTON (2-ZONE) ── */}
        {setLeftOpen && (
          <motion.div
            style={{ x: smoothL }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[100]"
          >
            <AnimatePresence mode="wait">
              {/* State 3: Everything closed — single expand-all button */}
              {!leftOpen && (
                <motion.div
                  key="expand-all"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    onClick={() => { setLeftOpen(true); setLeftSecondaryOpen?.(true); }}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-3xl border border-white/10 hover:bg-white/10 transition-colors duration-200 text-zinc-500 hover:text-white shadow-2xl"
                    title="Expand All Panels"
                  >
                    <PanelLeftClose className="w-4 h-4 rotate-180" />
                  </button>
                </motion.div>
              )}

              {/* States 1 & 2: Nav is open — 2-zone pill */}
              {leftOpen && (
                <motion.div
                  key="two-zone"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex bg-[#0a0a0f]/80 backdrop-blur-3xl border border-white/10 border-l-0 rounded-r-2xl overflow-hidden shadow-2xl">
                    {/* Zone 1: Toggle secondary panel only */}
                    <button
                      onClick={() => setLeftSecondaryOpen?.(!leftSecondaryOpen)}
                      className="w-8 h-14 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors duration-200"
                      title={leftSecondaryOpen ? "Close Settings Panel" : "Open Settings Panel"}
                    >
                      <motion.div
                        animate={{ rotate: leftSecondaryOpen ? 0 : 180 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </motion.div>
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-white/10 my-auto" />

                    {/* Zone 2: Toggle nav (closes everything) */}
                    <button
                      onClick={() => setLeftOpen(false)}
                      className="w-8 h-14 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors duration-200"
                      title="Collapse All Panels"
                    >
                      <motion.div
                        animate={{ rotate: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      >
                        <PanelLeftClose className="w-4 h-4" />
                      </motion.div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {setRightOpen && (
          <motion.button
            initial={false}
            style={{ x: rightToggleX }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[100] flex items-center justify-center w-7 h-14 rounded-l-xl bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/10 border-r-0 hover:bg-white/10 transition-colors duration-200 text-zinc-500 hover:text-white shadow-2xl"
            onClick={() => {
              if (onRightToggle) { onRightToggle(); return; }
              setRightOpen(v => !v);
            }}
          >
            <motion.div
              animate={{ rotate: rightOpen ? 0 : 180 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>
        )}

      </div>
    </StudioLayoutContext.Provider>
  );
}



