import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, useTransform, useMotionValueEvent } from 'framer-motion';
import { ChevronRight, ChevronLeft, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X, ArrowLeftRight } from 'lucide-react';
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

  // ── Mobile: only show the active panel ───────────────────────────────────
  const mobileActive = usingCtx ? panelCtx.mobileActive : null;
  const showL1Mobile = isMobile && (!usingCtx || mobileActive === 'L1');
  const showL2Mobile = isMobile && (!usingCtx || mobileActive === 'L2');
  const showRMobile  = isMobile && (!usingCtx || mobileActive === 'R');

  // Resolve effective open states: use context on mobile/tablet, props on desktop
  // On mobile, we strictly follow mobileActive to ensure actions (toggle/swap) are in sync
  const effL1 = isMobile 
    ? (mobileActive === 'L1' && (usingCtx ? panelCtx.panelState.L1 : true))
    : (usingCtx ? panelCtx.panelState.L1 : leftOpen);
    
  const effL2 = isMobile 
    ? (mobileActive === 'L2' && (usingCtx ? panelCtx.panelState.L2 : true))
    : (usingCtx ? panelCtx.panelState.L2 : leftSecondaryOpen);
    
  const effR = isMobile 
    ? (mobileActive === 'R' && (usingCtx ? panelCtx.panelState.R : true))
    : (usingCtx ? panelCtx.panelState.R : rightOpen);

  // Resolve effective setters
  const effSetL1 = usingCtx ? panelCtx.setPanelOpen.bind(null, 'L1') : setLeftOpen;
  const effSetL2 = usingCtx ? panelCtx.setPanelOpen.bind(null, 'L2') : setLeftSecondaryOpen;
  const effSetR  = usingCtx ? panelCtx.setPanelOpen.bind(null, 'R')  : setRightOpen;

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
    if (isMobile) return typeof window !== 'undefined' ? window.innerWidth - 72 : 248;
    if (isTablet) return 280;
    return leftWidth;
  };
  const getL2Width = () => {
    if (isMobile) return typeof window !== 'undefined' ? window.innerWidth - 72 : 248;
    if (isTablet) return Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.55 : 400, 400);
    return leftSecondaryWidth;
  };
  const getRWidth = () => {
    if (isMobile) return typeof window !== 'undefined' ? window.innerWidth - 72 : 248;
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

  // ── Transform hooks (Must be top-level for React) ────────────────────────
  const combinedLeftWidth = leftWidth + (leftSecondarySidebar ? leftSecondaryWidth : 0);
  const desktopLX = useTransform(smoothL, v => v - combinedLeftWidth);
  const desktopRX = useTransform(smoothR, v => (rightWidth - v));
  const contentWidthExpr = useTransform([smoothL, smoothR], ([l, r]) => `calc(100% - ${l + r}px)`);

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
      <div className="h-full w-full relative overflow-hidden bg-[#05050a]">
        {/* ── HUD overlays ─────────────────────────────────────────────── */}
        {topHUD && (
          <div className="absolute top-0 left-0 right-0 z-[60] pointer-events-none">
            {topHUD}
          </div>
        )}

        {/* ── Desktop Sidebars (Transform-based for performance) ────────── */}
        {!activeOverlay && leftSidebar && (
          <motion.div
            className="absolute left-0 top-0 bottom-0 z-40 flex border-r border-white/5 will-change-transform"
            style={{ 
              x: desktopLX,
              width: combinedLeftWidth,
              background: '#0a0a14' 
            }}
          >
            {/* L1: Master Sidebar */}
            <div className="h-full flex-shrink-0" style={{ width: leftWidth }}>
              <div className="h-full overflow-hidden">{leftSidebar}</div>
            </div>

            {/* L2: Secondary Panel */}
            {leftSecondarySidebar && (
              <div className="h-full flex-shrink-0" style={{ width: leftSecondaryWidth }}>
                <div className="h-full overflow-hidden">{leftSecondarySidebar}</div>
              </div>
            )}
          </motion.div>
        )}

        {!activeOverlay && rightSidebar && (
          <motion.div
            className="absolute right-0 top-0 bottom-0 z-40 border-l border-white/5 will-change-transform"
            style={{ 
              x: desktopRX,
              width: rightWidth, 
              background: '#0a0a14' 
            }}
          >
            <div
              className="h-full overflow-hidden"
              style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
            >
              {rightSidebar}
            </div>
          </motion.div>
        )}

        {/* ── Overlay backdrops (mobile/tablet) ────────────────────────── */}
        <AnimatePresence>
          {activeOverlay && (mobileL1Open || mobileL2Open || mobileROpen) && (
            <motion.div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => {
                if (mobileROpen) handleMobileClose('R');
                else if (mobileL2Open) handleMobileClose('L2');
                else if (mobileL1Open) handleMobileClose('L1');
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Overlay panels (mobile/tablet slide-in) ──────────────────── */}
        {activeOverlay && leftSidebar && (
          <AnimatePresence>
            {mobileL1Open && (
              <motion.div
                className="fixed top-0 left-0 bottom-0 z-35 bg-[#0a0a14] will-change-transform"
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
                className="fixed top-0 bottom-0 z-35 bg-[#0a0a14] will-change-transform"
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
                className="fixed top-0 right-0 bottom-0 z-35 bg-[#0a0a14] will-change-transform"
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
          className="h-full w-full relative z-10 will-change-transform shadow-inner"
          style={{
            x: activeOverlay ? 0 : smoothL,
            position: 'absolute',
            left: 0,
            right: 0,
            width: activeOverlay ? '100%' : contentWidthExpr,
          }}
        >
          {children}
        </motion.div>

        {/* ── Toggle buttons (Desktop) ────────────────────────────────── */}
        {!isMobile && leftSidebar && (
          <motion.div
            className="absolute left-0 top-1/2 z-50 flex flex-col items-start"
            style={{ x: smoothL, y: '-50%' }}
          >
            <button
              onClick={handleToggleL1}
              className="p-1.5 rounded-r-lg bg-[#0a0a14] border border-l-0 border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
              aria-label={effL1 ? 'Close sidebar' : 'Open sidebar'}
            >
              {effL1 ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            </button>
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

        {!isMobile && rightSidebar && (
          <motion.button
            className="absolute right-0 top-1/2 z-50 p-1.5 rounded-l-lg bg-[#0a0a14] border border-r-0 border-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            style={{ x: rightToggleX, y: '-50%' }}
            onClick={handleToggleR}
            aria-label={effR ? 'Close archive' : 'Open archive'}
          >
            {effR ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </motion.button>
        )}

        {/* ── Mobile Toggle Buttons (Left) ────────────────────────────── */}
        {isMobile && leftSidebar && (
          <motion.div
            className="absolute left-0 top-1/2 z-50 flex flex-col items-start"
            style={{ 
              x: smoothL, 
              y: leftSecondarySidebar ? '-50%' : 'calc(-50% - 30px)' 
            }}
          >
            <div className="flex flex-col shadow-2xl">
              <button
                onClick={handleToggleL1}
                className="w-11 h-11 flex items-center justify-center bg-[#0a0a14] border border-l-0 border-white/10 text-zinc-400 rounded-r-xl"
              >
                {mobileActive === 'L1' ? (
                  <X className="w-5 h-5 text-red-400/80" />
                ) : (
                  (mobileActive === 'L2') ? <ArrowLeftRight className="w-5 h-5 text-indigo-400" /> : <PanelLeftOpen className="w-5 h-5" />
                )}
              </button>
              {leftSecondarySidebar && (
                <button
                  onClick={handleToggleL2}
                  className="w-11 h-11 mt-[50px] flex items-center justify-center bg-[#0a0a14] border border-l-0 border-white/10 text-zinc-400 rounded-r-xl"
                >
                  {mobileActive === 'L2' ? (
                    <X className="w-5 h-5 text-red-400/80" />
                  ) : (
                    (mobileActive === 'L1') ? <ArrowLeftRight className="w-5 h-5 text-indigo-400" /> : <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Mobile Toggle Button (Right) ───────────────────────────── */}
        {isMobile && rightSidebar && (
          <motion.button
            onClick={handleToggleR}
            className="absolute right-0 top-1/2 z-50 w-11 h-11 flex items-center justify-center bg-[#0a0a14] border border-r-0 border-white/10 text-zinc-400 shadow-2xl rounded-l-xl"
            style={{ 
              x: rightToggleX, 
              y: leftSecondarySidebar ? '-50%' : 'calc(-50% + 30px)' 
            }}
          >
            {effR ? <X className="w-5 h-5 text-red-400/80" /> : <PanelRightOpen className="w-5 h-5" />}
          </motion.button>
        )}

        {/* ── Bottom HUD ───────────────────────────────────────────────── */}
        {bottomHUD && <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">{bottomHUD}</div>}
      </div>
    </StudioLayoutContext.Provider>
  );
}
