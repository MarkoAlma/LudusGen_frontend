import React, { useEffect, createContext } from 'react';
import { motion, useSpring, useMotionValueEvent, useTransform, useMotionValue } from 'framer-motion';
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
  onOffsetChange
}) {
  // Cinematic Spring Configuration
  const springConfig = { damping: 38, stiffness: 180, mass: 1 };

  const smoothL1 = useSpring(leftOpen ? leftWidth : 0, springConfig);
  const smoothL2 = useSpring((leftOpen && leftSecondaryOpen && leftSecondarySidebar) ? leftSecondaryWidth : 0, springConfig);
  const smoothR = useSpring(rightOpen ? rightWidth : 0, springConfig);

  // Unified L MotionValue for children/HUDs
  const smoothL = useMotionValue(smoothL1.get() + smoothL2.get());

  useEffect(() => {
    smoothL1.set(leftOpen ? leftWidth : 0);
  }, [leftOpen, leftWidth, smoothL1]);

  useEffect(() => {
    smoothL2.set((leftOpen && leftSecondaryOpen && leftSecondarySidebar) ? leftSecondaryWidth : 0);
  }, [leftOpen, leftSecondaryOpen, leftSecondaryWidth, leftSecondarySidebar, smoothL2]);

  useEffect(() => {
    smoothR.set(rightOpen ? rightWidth : 0);
  }, [rightOpen, rightWidth, smoothR]);

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

        {/* ── LEFT SIDEBAR STACK (OVERLAY) ── */}
        <div className="absolute left-0 top-0 h-full flex pointer-events-none z-[60]">
          {/* Level 1: Main Sidebar */}
          <motion.div
            style={{ width: smoothL1 }}
            className="h-full border-r border-white/5 overflow-hidden pointer-events-auto"
          >
            <div style={{ width: leftWidth, height: '100%' }}>
              {leftSidebar}
            </div>
          </motion.div>

          {/* Level 2: Secondary Content */}
          <motion.div
            style={{ width: smoothL2 }}
            className="h-full border-r border-white/5 overflow-hidden bg-[#0a0a0f]/40 backdrop-blur-3xl pointer-events-auto"
          >
            <div style={{ width: leftSecondaryWidth, height: '100%' }}>
              {leftSecondarySidebar}
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT SIDEBAR (OVERLAY) ── */}
        <motion.div
          style={{ width: smoothR }}
          className="absolute right-0 top-0 h-full z-[60] border-l border-white/5 overflow-hidden"
        >
          <div style={{ width: rightWidth, height: '100%' }}>
            {rightSidebar}
          </div>
        </motion.div>

        {/* ── TOGGLE BUTTONS ── */}
        {setLeftOpen && (
          <motion.div
            style={{ x: smoothL }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[100] flex"
          >
            <div className="flex bg-[#0a0a0f]/80 backdrop-blur-3xl border border-white/10 border-l-0 rounded-r-2xl overflow-hidden shadow-2xl transition-all duration-300">
              {/* Level 1: Outer Layer Arrow (Close Primary or All) */}
              <button
                onClick={() => setLeftOpen(!leftOpen)}
                className="w-8 h-14 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors duration-200"
                title={leftOpen ? "Collapse Full Sidebar" : "Expand Sidebar"}
              >
                <motion.div
                  animate={{ rotate: leftOpen ? 0 : 180 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                  <PanelLeftClose className="w-4 h-4" />
                </motion.div>
              </button>

              {/* Dynamic Divider */}
              {leftSecondarySidebar && leftOpen && leftSecondaryOpen && setLeftSecondaryOpen && (
                <div className="w-px h-6 bg-white/10 my-auto" />
              )}

              {/* Level 2: Inner Layer Arrow (Close Secondary) */}
              {leftSecondarySidebar && leftOpen && leftSecondaryOpen && setLeftSecondaryOpen && (
                <motion.button
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 28, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  onClick={() => setLeftSecondaryOpen(false)}
                  className="h-14 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/10 transition-all duration-300"
                  title="Close Settings Panel"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {setRightOpen && (
          <motion.button
            initial={false}
            style={{ x: rightToggleX }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[100] flex items-center justify-center w-7 h-14 rounded-l-xl bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/10 border-r-0 hover:bg-white/10 transition-colors duration-200 text-zinc-500 hover:text-white shadow-2xl"
            onClick={() => setRightOpen(!rightOpen)}
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



