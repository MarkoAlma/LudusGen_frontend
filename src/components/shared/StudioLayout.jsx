import React, { useEffect, createContext } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValueEvent, useTransform, useMotionValue } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, Layout, X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

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
  leftSecondaryClosedWidth = 0, // NEW: Allows persistent 'Icon Strips'
  setLeftOpen,
  setLeftSecondaryOpen,
  rightOpen = true,
  setRightOpen,
  onOffsetChange,
  overlay = false,
  onRightToggle,
}) {
  // Breakpoints & Viewport Awareness
  const isNarrow = useMediaQuery("(max-width: 1280px)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const activeOverlay = overlay || isNarrow;
  
  // Custom widths for Mobile Drawer behavior
  const effectiveL1Width = isMobile ? (window.innerWidth - 32) : leftWidth;
  const effectiveSecondaryWidth = isMobile ? (window.innerWidth - 32) : leftSecondaryWidth;
  const effectiveRWidth = isMobile ? (window.innerWidth - 32) : rightWidth;

  // Cinematic Spring Configuration - Tuned for Snappy Responsiveness
  const springConfig = { damping: 24, stiffness: 260, mass: 0.6 };

  // Logic Refinement: L1 (Master) should be independent of L2 (Secondary)
  // Logic Refinement: L2 (Secondary) can collapse to a 'ClosedWidth' (e.g. 72px for Icons)
  const targetL1 = activeOverlay ? 0 : (leftOpen ? effectiveL1Width : 0);
  const targetL2 = (activeOverlay || !leftSecondarySidebar) ? 0 : (leftSecondaryOpen ? effectiveSecondaryWidth : leftSecondaryClosedWidth);
  const targetR = (activeOverlay || !rightSidebar) ? 0 : (rightOpen ? effectiveRWidth : 0);

  // High-Performance Springs: Directly tracking target values
  const smoothL1 = useSpring(targetL1, springConfig);
  const smoothL2 = useSpring(targetL2, springConfig);
  const smoothR = useSpring(targetR, springConfig);

  // Sync springs to target changes
  useEffect(() => { smoothL1.set(targetL1); }, [targetL1, smoothL1]);
  useEffect(() => { smoothL2.set(targetL2); }, [targetL2, smoothL2]);
  useEffect(() => { smoothR.set(targetR); }, [targetR, smoothR]);

  // Unified L MotionValue: Derived via useTransform for perfect synchronization
  const smoothL = useTransform([smoothL1, smoothL2], ([v1, v2]) => v1 + v2);

  // Backwards compatibility & HUD Offset Tracking
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
            <motion.div 
              style={{ 
                paddingLeft: smoothL, 
                paddingRight: smoothR 
              }}
              className="flex-1 relative overflow-hidden"
            >
              {children}
            </motion.div>
            {bottomHUD}
          </div>
        </div>

        {/* ── LEFT SIDEBAR STACK (UNIFIED) ── */}
        <div className="absolute left-0 top-0 h-full flex pointer-events-none z-[60]">
          {!activeOverlay ? (
            <motion.div
              style={{ width: smoothL }}
              className="h-full flex overflow-hidden pointer-events-auto bg-[#0a0a0f]/40 backdrop-blur-3xl border-r border-white/5"
            >
              {/* Level 1: Main Sidebar (Narrow Strip) */}
              {leftSidebar && (
                <motion.div
                  style={{ width: smoothL1 }}
                  className="h-full overflow-hidden flex-shrink-0"
                >
                  <div style={{ width: effectiveL1Width, height: '100%' }}>
                    {leftSidebar}
                  </div>
                </motion.div>
              )}

              {/* Level 2: Secondary Content (Panel) */}
              {leftSecondarySidebar && (
                <motion.div
                  style={{ width: smoothL2 }}
                  className={`h-full overflow-hidden flex-shrink-0 ${leftOpen ? 'border-l border-white/5' : ''}`}
                >
                  <div style={{ width: effectiveSecondaryWidth, height: '100%' }}>
                    {leftSecondarySidebar}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <>
              {/* Overlay Mode logic remains separate for mobility/depth */}
              {leftOpen && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  style={{ width: effectiveL1Width }}
                  className="fixed left-0 top-0 h-full z-[100] bg-[#0a0a0f]/95 backdrop-blur-3xl border-r border-white/5 shadow-2xl overflow-hidden pointer-events-auto"
                >
                  <div className="h-full relative">
                    {leftSidebar}
                    {isMobile && (
                      <button onClick={() => setLeftOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {leftSecondaryOpen && leftSecondarySidebar && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/60 z-[65] backdrop-blur-[2px]"
                      onClick={() => setLeftSecondaryOpen?.(false)}
                    />
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "-100%" }}
                      transition={{ type: "spring", damping: 28, stiffness: 200 }}
                      className="fixed top-0 h-full z-[70] border-r border-white/5 overflow-hidden bg-[#0a0a0f]/95 backdrop-blur-3xl pointer-events-auto shadow-2xl"
                      style={{ 
                        left: (isMobile || !leftOpen) ? 0 : effectiveL1Width, 
                        width: isMobile ? effectiveSecondaryWidth : leftSecondaryWidth 
                      }}
                    >
                      <div className="h-full relative">
                        {leftSecondarySidebar}
                        {isMobile && (
                          <button onClick={() => setLeftSecondaryOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-[101]">
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        {activeOverlay ? (
          <AnimatePresence>
            {rightOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-[65] backdrop-blur-[2px]"
                  onClick={() => setRightOpen(false)}
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 200 }}
                  className="fixed right-0 top-0 h-full z-[70] border-l border-white/5 overflow-hidden bg-[#0a0a0f]/95 backdrop-blur-3xl pointer-events-auto shadow-2xl"
                  style={{ width: isMobile ? effectiveRWidth : rightWidth }}
                >
                  <div className="h-full relative">
                    {rightSidebar}
                    {isMobile && (
                      <button onClick={() => setRightOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-[101]">
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ) : (
          <motion.div
            style={{ width: smoothR }}
            className="absolute right-0 top-0 h-full z-[60] border-l border-white/5 overflow-hidden"
          >
            <div style={{ width: effectiveRWidth, height: '100%' }}>
              {rightSidebar}
            </div>
          </motion.div>
        )}

        {/* ── LEFT TOGGLE BUTTON (2-ZONE) — Desktop only ── */}
        {setLeftOpen && !isMobile && (
          <motion.div
            style={{ x: smoothL }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[100]"
          >
            <AnimatePresence>
              {/* State 3: Everything closed — single expand-all button */}
              {(!leftOpen && (!leftSecondarySidebar || !leftSecondaryOpen)) && (
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
                    {leftSecondarySidebar ? (
                      <Layout className="w-5 h-5 translate-y-[1px]" />
                    ) : (
                      <ChevronLeft className="w-5 h-5 rotate-180" />
                    )}
                  </button>
                </motion.div>
              )}

              {/* Compound Unified Toggle (Master + Studio) */}
              {(leftOpen || (leftSecondarySidebar && leftSecondaryOpen)) && (
                <motion.div
                  key="unified-toggle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex bg-[#0a0a0f]/80 backdrop-blur-3xl border border-white/10 border-l-0 rounded-r-2xl overflow-hidden shadow-2xl">
                    {/* Zone 1: Global Sidebar Toggle (Left - closer to L1) */}
                    {leftSidebar && (
                      <button
                        onClick={() => setLeftOpen(!leftOpen)}
                        className="w-10 h-12 flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                        title={leftOpen ? "Fold Workspace Strip" : "Expand Workspace Strip"}
                      >
                        <ChevronsLeft className={`w-4 h-4 transition-transform duration-500 ${!leftOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    {/* Zone 2: Secondary Panel Toggle (Right - closer to Content) */}
                    {leftSecondarySidebar && (
                      <button
                        onClick={() => setLeftSecondaryOpen?.(!leftSecondaryOpen)}
                        className={`w-8 h-12 flex items-center justify-center text-zinc-600 hover:text-primary transition-colors duration-200 ${leftSidebar ? 'border-l border-white/5' : ''}`}
                        title={leftSecondaryOpen ? "Close Studio Panel" : "Open Studio Panel"}
                      >
                        <ChevronLeft className={`w-4 h-4 transition-transform duration-500 ${!leftSecondaryOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {setRightOpen && !isMobile && (
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



