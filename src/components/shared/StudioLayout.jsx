import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, useTransform, useMotionValueEvent } from 'framer-motion';
import { ChevronRight, ChevronLeft, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useStudioPanels } from '../../context/StudioPanelContext';
import MobilePanelControls from './MobilePanelControls';

export const StudioLayoutContext = createContext(null);

export default function StudioLayout({
  children,
  leftSidebar,
  leftSecondarySidebar,
  rightSidebar,
  topHUD,
  bottomHUD,
  leftOpen,
  setLeftOpen,
  leftSecondaryOpen,
  setLeftSecondaryOpen,
  rightOpen,
  setRightOpen,
  leftWidth = 320,
  leftSecondaryWidth = 392,
  leftSecondaryClosedWidth = 0,
  rightWidth = 320,
  onOffsetChange,
  overlay = false,
  accentColor = '#8b5cf6',
}) {
  const isNarrow = useMediaQuery('(max-width: 1279px)');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = isNarrow && !isMobile;
  const activeOverlay = overlay || isNarrow;

  // ── Consume centralized panel state on mobile/tablet ─────────────────────
  const panelCtx = useStudioPanels();
  const usingCtx = !isMobile && !isTablet ? false : !!panelCtx;

  // Resolve effective open states: use context on mobile/tablet, props on desktop
  const effL1 = usingCtx ? panelCtx.panelState.L1 : leftOpen;
  const effL2 = usingCtx ? panelCtx.panelState.L2 : leftSecondaryOpen;
  const effR  = usingCtx ? panelCtx.panelState.R  : rightOpen;

  // Resolve effective setters
  const effSetL1 = usingCtx ? panelCtx.setPanelOpen.bind(null, 'L1') : setLeftOpen;
  const effSetL2 = usingCtx ? panelCtx.setPanelOpen.bind(null, 'L2') : setLeftSecondaryOpen;
  const effSetR  = usingCtx ? panelCtx.setPanelOpen.bind(null, 'R')  : setRightOpen;

  // ── Mobile: only show the active panel ───────────────────────────────────
  const mobileActive = usingCtx ? panelCtx.mobileActive : null;
  const showL1Mobile = isMobile && (!usingCtx || mobileActive === 'L1');
  const showL2Mobile = isMobile && (!usingCtx || mobileActive === 'L2');
  const showRMobile  = isMobile && (!usingCtx || mobileActive === 'R');

  // On mobile, only one panel is "open" at a time
  const mobileL1Open = isMobile ? showL1Mobile && effL1 : effL1;
  const mobileL2Open = isMobile ? showL2Mobile && effL2 : effL2;
  const mobileROpen  = isMobile ? showRMobile  && effR  : effR;

  // ── Spring animations ────────────────────────────────────────────────────
  const smoothL1 = useSpring(0, { damping: 24, stiffness: 260, mass: 0.6 });
  const smoothL2 = useSpring(0, { damping: 24, stiffness: 260, mass: 0.6 });
  const smoothR  = useSpring(0, { damping: 24, stiffness: 260, mass: 0.6 });

  // ── Responsive widths ────────────────────────────────────────────────────
  const getL1Width = () => {
    if (isMobile) return typeof window !== 'undefined' ? window.innerWidth - 32 : 320;
    if (isTablet) return 280;
    return leftWidth;
  };
  const getL2Width = () => {
    if (isMobile) return typeof window !== 'undefined' ? window.innerWidth - 32 : 320;
    if (isTablet) return Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.55 : 400, 400);
    return leftSecondaryWidth;
  };
  const getRWidth = () => {
    if (isMobile) return typeof window !== 'undefined' ? window.innerWidth - 32 : 320;
    if (isTablet) return Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.55 : 400, 400);
    return rightWidth;
  };

  const targetL1 = mobileL1Open ? getL1Width() : 0;
  const targetL2 = mobileL2Open ? getL2Width() : (leftSecondaryClosedWidth || 0);
  const targetR  = mobileROpen  ? getRWidth()  : 0;

  useEffect(() => { smoothL1.set(targetL1); }, [targetL1]);
  useEffect(() => { smoothL2.set(targetL2); }, [targetL2]);
  useEffect(() => { smoothR.set(targetR);  }, [targetR]);

  const smoothL = useTransform([smoothL1, smoothL2], ([v1, v2]) => v1 + v2);

  // ── Offset callback ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!onOffsetChange) return;
    const unsubL = smoothL.on('change', v => onOffsetChange(prev => ({ ...prev, left: v })));
    const unsubR = smoothR.on('change', v => onOffsetChange(prev => ({ ...prev, right: v })));
    return () => { unsubL(); unsubR(); };
  }, [onOffsetChange, smoothL, smoothR]);

  const rightToggleX = useTransform(smoothR, v => v * -1);
  const effectiveL1Width = getL1Width();

  // ── Toggle handlers ──────────────────────────────────────────────────────
  const handleToggleL1 = () => effSetL1?.(!effL1);
  const handleToggleL2 = () => effSetL2?.(!effL2);
  const handleToggleR  = () => effSetR?.(!effR);

  // ── Mobile close handler ─────────────────────────────────────────────────
  const handleMobileClose = (panelId) => {
    if (panelId === 'L1') effSetL1?.(false);
    if (panelId === 'L2') effSetL2?.(false);
    if (panelId === 'R')  effSetR?.(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <StudioLayoutContext.Provider value={{ smoothL, smoothR }}>
      <div className="h-full w-full relative overflow-hidden">
        {/* ── HUD overlays ─────────────────────────────────────────────── */}
        {topHUD && <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">{topHUD}</div>}

        {/* ── Left panels (combined container) — desktop only ──────────── */}
        {!activeOverlay && leftSidebar && (
          <motion.div
            className="absolute left-0 top-0 bottom-0 z-40 flex border-r border-white/5"
            style={{ width: smoothL, background: '#0a0a14' }}
          >
            {/* L1: Master Sidebar */}
            <motion.div
              className="h-full flex-shrink-0"
              style={{ width: smoothL1 }}
            >
              <div className="h-full overflow-hidden">
                {leftSidebar}
              </div>
            </motion.div>

            {/* L2: Secondary Panel */}
            {leftSecondarySidebar && (
              <motion.div
                className="h-full flex-shrink-0"
                style={{ width: smoothL2 }}
              >
                <div className="h-full overflow-hidden">
                  {leftSecondarySidebar}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Right sidebar — desktop only ─────────────────────────────── */}
        {!activeOverlay && rightSidebar && (
          <motion.div
            className="absolute right-0 top-0 bottom-0 z-40 border-l border-white/5"
            style={{ width: smoothR, background: '#0a0a14' }}
          >
            <div className="h-full overflow-hidden">
              {rightSidebar}
            </div>
          </motion.div>
        )}

        {/* ── Overlay backdrops (mobile/tablet) ────────────────────────── */}
        {activeOverlay && (mobileL1Open || mobileL2Open || mobileROpen) && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (mobileROpen) handleMobileClose('R');
              else if (mobileL2Open) handleMobileClose('L2');
              else if (mobileL1Open) handleMobileClose('L1');
            }}
          />
        )}

        {/* ── Overlay panels (mobile/tablet slide-in) ──────────────────── */}
        {activeOverlay && leftSidebar && (
          <AnimatePresence>
            {mobileL1Open && (
              <motion.div
                className="fixed top-0 left-0 bottom-0 z-35"
                style={{ width: getL1Width() }}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              >
                <div className="h-full overflow-hidden" style={{ background: '#0a0a14' }}>
                  {leftSidebar}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {activeOverlay && leftSecondarySidebar && (
          <AnimatePresence>
            {mobileL2Open && (
              <motion.div
                className="fixed top-0 bottom-0 z-35"
                style={{
                  width: getL2Width(),
                  left: mobileL1Open ? effectiveL1Width : 0,
                }}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              >
                <div className="h-full overflow-hidden" style={{ background: '#0a0a14' }}>
                  {leftSecondarySidebar}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {activeOverlay && rightSidebar && (
          <AnimatePresence>
            {mobileROpen && (
              <motion.div
                className="fixed top-0 right-0 bottom-0 z-35"
                style={{ width: getRWidth() }}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              >
                <div className="h-full overflow-hidden" style={{ background: '#0a0a14' }}>
                  {rightSidebar}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── Main content area ────────────────────────────────────────── */}
        <motion.div
          className="h-full relative z-10"
          style={{
            paddingLeft: activeOverlay ? 0 : smoothL,
            paddingRight: activeOverlay ? 0 : smoothR,
          }}
        >
          {children}
        </motion.div>

        {/* ── Mobile Panel Controls (SWAP + CLOSE / reopen) ────────────── */}
        {activeOverlay && (
          <MobilePanelControls color={accentColor} />
        )}

        {/* ── Toggle buttons (desktop only, not narrow) ────────────────── */}
        {!activeOverlay && leftSidebar && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 z-50 flex flex-col"
            style={{ x: smoothL }}
          >
            {/* L1 toggle */}
            <button
              onClick={handleToggleL1}
              className="p-1.5 rounded-r-lg bg-[#0a0a14] border border-l-0 border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              aria-label={effL1 ? 'Close sidebar' : 'Open sidebar'}
            >
              {effL1 ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            </button>

            {/* L2 toggle (only if secondary panel exists) */}
            {leftSecondarySidebar && (
              <button
                onClick={handleToggleL2}
                className="p-1.5 rounded-r-lg bg-[#0a0a14] border border-l-0 border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer mt-1"
                aria-label={effL2 ? 'Close panel' : 'Open panel'}
              >
                {effL2 ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </motion.div>
        )}

        {/* ── Right sidebar toggle — desktop ───────────────────────────── */}
        {!activeOverlay && rightSidebar && (
          <motion.button
            className="absolute top-1/2 -translate-y-1/2 z-50 p-1.5 rounded-l-lg bg-[#0a0a14] border border-r-0 border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            style={{ x: rightToggleX }}
            onClick={handleToggleR}
            aria-label={effR ? 'Close archive' : 'Open archive'}
          >
            {effR ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </motion.button>
        )}

        {/* ── Archive toggle — mobile/tablet ───────────────────────────── */}
        {activeOverlay && rightSidebar && (
          <motion.button
            className="fixed top-1/2 right-3 z-50 flex items-center justify-center w-10 h-10 rounded-xl bg-[#0a0a14]/80 backdrop-blur-sm border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            onClick={handleToggleR}
            aria-label={effR ? 'Close archive' : 'Open archive'}
          >
            {effR ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </motion.button>
        )}

        {/* ── Bottom HUD ───────────────────────────────────────────────── */}
        {bottomHUD && <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">{bottomHUD}</div>}
      </div>
    </StudioLayoutContext.Provider>
  );
}
