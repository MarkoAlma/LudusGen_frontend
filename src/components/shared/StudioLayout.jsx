import React, { useEffect, createContext } from 'react';
import { motion, useSpring, useMotionValueEvent, useTransform } from 'framer-motion';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';

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
  rightSidebar,
  topHUD,
  bottomHUD,
  leftWidth = 320,
  rightWidth = 280,
  leftOpen = true,
  setLeftOpen,
  rightOpen = true,
  setRightOpen,
  onOffsetChange
}) {
  // Cinematic Spring Configuration
  // Higher damping (38) and lower stiffness (180) for a weighted, premium feel.
  const springConfig = { damping: 38, stiffness: 180, mass: 1 };
  
  const smoothL = useSpring(leftOpen ? leftWidth : 0, springConfig);
  const smoothR = useSpring(rightOpen ? rightWidth : 0, springConfig);

  useEffect(() => {
    smoothL.set(leftOpen ? leftWidth : 0);
  }, [leftOpen, leftWidth, smoothL]);

  useEffect(() => {
    smoothR.set(rightOpen ? rightWidth : 0);
  }, [rightOpen, rightWidth, smoothR]);

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
      <div className="flex h-full w-full overflow-hidden bg-transparent text-white relative">
        
        {/* ── LEFT SIDEBAR ── */}
        <motion.div 
          style={{ width: smoothL }}
          className="flex-shrink-0 relative z-[60] border-r border-white/5 h-full overflow-hidden"
        >
          <div style={{ width: leftWidth, height: '100%' }}>
            {leftSidebar}
          </div>
        </motion.div>

        {/* ── MAIN VIEWPORT AREA ── */}
        <div className="flex-1 min-w-0 flex flex-col relative z-10 h-full overflow-hidden">
          {topHUD}
          
          <div className="flex-1 relative overflow-hidden">
            {children}
          </div>

          {bottomHUD}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <motion.div 
          style={{ width: smoothR }}
          className="flex-shrink-0 relative z-[60] border-l border-white/5 h-full overflow-hidden"
        >
          <div style={{ width: rightWidth, height: '100%' }}>
            {rightSidebar}
          </div>
        </motion.div>

        {/* ── TOGGLE BUTTONS ── */}
        {setLeftOpen && (
          <motion.button
            initial={false}
            style={{ x: smoothL }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[100] flex items-center justify-center w-7 h-14 rounded-r-xl bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/10 border-l-0 hover:bg-white/10 transition-colors duration-200 text-zinc-500 hover:text-white shadow-2xl"
            onClick={() => setLeftOpen(!leftOpen)}
          >
            <motion.div
              animate={{ rotate: leftOpen ? 0 : 180 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <PanelLeftClose className="w-4 h-4" />
            </motion.div>
          </motion.button>
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


