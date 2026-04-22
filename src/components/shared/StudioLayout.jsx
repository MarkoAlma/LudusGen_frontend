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
  const hasTabletL2Content = !isTablet || Boolean(leftSecondarySidebar);
  const resolvedL2Open = hasTabletL2Content ? effL2 : false;
    
  const effR = isMobile 
    ? (mobileActive === 'R' && (usingCtx ? panelCtx.panelState.R : true))
    : (usingCtx ? panelCtx.panelState.R : rightOpen);

  // Resolve effective setters
  const effSetL1 = usingCtx ? panelCtx.setPanelOpen.bind(null, 'L1') : setLeftOpen;
  const effSetL2 = usingCtx ? panelCtx.setPanelOpen.bind(null, 'L2') : setLeftSecondaryOpen;
  const effSetR  = usingCtx ? panelCtx.setPanelOpen.bind(null, 'R')  : setRightOpen;

  // On mobile, only one panel is "open" at a time
  const mobileL1Open = isMobile ? showL1Mobile && effL1 : effL1;
  const mobileL2Open = isMobile ? showL2Mobile && effL2 : resolvedL2Open;
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
    if (isMobile) {
      const mobileFullWidth = typeof window !== 'undefined' ? window.innerWidth : 320;
      // Respect compact toolstrip-only mobile layouts (e.g. gallery/history mode).
      if (leftSecondaryWidth <= 96) return leftSecondaryWidth;
      return mobileFullWidth;
    }
    if (isTablet) {
      // Respect compact toolstrip-only tablet layouts (e.g. gallery/history mode).
      if (leftSecondaryWidth <= 96) return leftSecondaryWidth;
      return Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.55 : 400, 400);
    }
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
  const mobilePanels = [
    leftSidebar ? 'L1' : null,
    leftSecondarySidebar ? 'L2' : null,
    rightSidebar ? 'R' : null,
  ].filter(Boolean);

  // ── Transform hooks (Must be top-level for React) ────────────────────────
  const desktopLX = useTransform(smoothL, v => (v <= 0.5 ? -1000 : 0));
  const desktopRX = useTransform(smoothR, v => {
    const val = rightWidth - v;
    return val < 0.5 ? 0 : val;
  });
  const contentWidthExpr = useTransform([smoothL, smoothR], ([l, r]) => `calc(100% - ${Math.round(l + r)}px)`);

  // ── Toggle handlers ──────────────────────────────────────────────────────
  const handleToggleL1 = () => effSetL1?.(!effL1);
  const handleToggleL2 = () => effSetL2?.(!resolvedL2Open);
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
            className="absolute left-0 top-0 bottom-0 z-40 flex border-r border-white/5 origin-left"
            style={{ 
              x: desktopLX,
              width: smoothL,
              background: '#0a0a14' 
            }}
          >
            {/* L1: Master Sidebar */}
            <motion.div className="h-full flex-shrink-0" style={{ width: smoothL1 }}>
              <div className="h-full overflow-hidden">{leftSidebar}</div>
            </motion.div>

            {/* L2: Secondary Panel */}
            {leftSecondarySidebar && (
              <motion.div className="h-full flex-shrink-0" style={{ width: smoothL2 }}>
                <div className="h-full overflow-hidden">{leftSecondarySidebar}</div>
              </motion.div>
            )}
          </motion.div>
        )}

        {!activeOverlay && rightSidebar && (
          <motion.div
            className="absolute right-0 top-0 bottom-0 z-40 border-l border-white/5"
            style={{ 
              x: desktopRX,
              width: smoothR, 
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
        {activeOverlay && isTablet && (leftSidebar || leftSecondarySidebar) && (
          <AnimatePresence>
            {(effL1 || effL2) && (
              <motion.div
                className="fixed top-0 left-0 bottom-0 z-35 flex overflow-hidden border-r border-white/5 bg-[#0a0a14]"
                style={{ width: smoothL }}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              >
                {leftSidebar && (
                  <motion.div className="h-full flex-shrink-0" style={{ width: smoothL1 }}>
                    <div className="h-full overflow-hidden" style={{ background: '#0a0a14' }}>
                      {leftSidebar}
                    </div>
                  </motion.div>
                )}

                {leftSecondarySidebar && (
                  <motion.div className="h-full flex-shrink-0" style={{ width: smoothL2 }}>
                    <div className="h-full overflow-hidden" style={{ background: '#0a0a14' }}>
                      {leftSecondarySidebar}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {activeOverlay && isMobile && leftSidebar && (
          <AnimatePresence>
            {mobileL1Open && (
              <motion.div
                className="fixed top-0 left-0 bottom-0 z-35 bg-[#0a0a14]"
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

        {activeOverlay && isMobile && leftSecondarySidebar && (
          <AnimatePresence>
            {mobileL2Open && (
              <motion.div
                className="fixed top-0 bottom-0 z-35 bg-[#0a0a14]"
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
                className="fixed top-0 right-0 bottom-0 z-35 bg-[#0a0a14]"
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
          className="h-full w-full relative z-10 shadow-inner"
          style={{
            x: activeOverlay ? 0 : smoothL,
            transform: 'translateZ(0)',
            position: 'absolute',
            left: 0,
            right: 0,
            width: activeOverlay ? '100%' : contentWidthExpr,
          }}
        >
          {children}
        </motion.div>

        <MobilePanelControls color={accentColor} panels={mobilePanels} />

        {/* ── Toggle buttons (Desktop) ────────────────────────────────── */}
        {!isMobile && (
          <motion.div
            className="absolute left-0 top-1/2 z-50 flex flex-col items-start gap-1.5"
            style={{ x: smoothL, y: '-50%' }}
          >
            {/* Master Toggle L1 */}
            <motion.button
              whileHover={{ x: 2, backgroundColor: 'rgba(255,255,255,0.06)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleL1}
              className="group relative flex items-center justify-center w-6 h-14 rounded-r-2xl bg-white/[0.02] backdrop-blur-2xl border border-l-0 border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-300"
              style={{ borderColor: effL1 ? 'rgba(255,255,255,0.1)' : `${accentColor}40` }}
            >
              <div className="absolute left-0 w-0.5 h-6 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors" />
              <div className="transition-all duration-300 transform group-hover:scale-110" style={{ color: effL1 ? 'rgba(255,255,255,0.4)' : accentColor }}>
                {effL1 ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
              </div>
              
              <div className="absolute inset-0 rounded-r-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" 
                style={{ boxShadow: `0 0 20px ${accentColor}15` }} 
              />
            </motion.button>

            {/* Secondary Toggle L2 */}
            {leftSecondarySidebar && (
              <motion.button
                whileHover={{ x: 2, backgroundColor: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleL2}
                className="group relative flex items-center justify-center w-6 h-10 rounded-r-xl bg-white/[0.02] backdrop-blur-xl border border-l-0 border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-300"
                style={{ borderColor: effL2 ? 'rgba(255,255,255,0.1)' : `${accentColor}40` }}
              >
                <div className="transition-all duration-300" style={{ color: effL2 ? 'rgba(255,255,255,0.4)' : accentColor }}>
                  {effL2 ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
              </motion.button>
            )}
          </motion.div>
        )}

        {!isMobile && rightSidebar && (
          <motion.div
            className="absolute right-0 top-1/2 z-50 flex flex-col items-end"
            style={{ x: rightToggleX, y: '-50%' }}
          >
            <motion.button
              whileHover={{ x: -2, backgroundColor: 'rgba(255,255,255,0.06)' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleR}
              className="group relative flex items-center justify-center w-6 h-14 rounded-l-2xl bg-white/[0.02] backdrop-blur-2xl border border-r-0 border-white/10 shadow-[-4px_0_24px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-300"
              style={{ 
                borderColor: effR ? 'rgba(255,255,255,0.1)' : `${accentColor}40`
              }}
            >
              <div className="absolute right-0 w-0.5 h-6 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors" />
              <div className="transition-all duration-300 transform group-hover:scale-110" style={{ color: effR ? 'rgba(255,255,255,0.4)' : accentColor }}>
                {effR ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              </div>
              {/* Subtle accent glow on hover */}
              <div className="absolute inset-0 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" 
                style={{ boxShadow: `0 0 20px ${accentColor}15` }} 
              />
            </motion.button>
          </motion.div>
        )}

        {/* ── Mobile Toggle Buttons (Left) ────────────────────────────── */}
        {false && isMobile && leftSidebar && (
          <motion.div
            className="absolute left-0 top-[42%] z-50 flex flex-col items-start gap-8"
            style={{ 
              x: smoothL, 
              y: '-50%'
            }}
          >
            <div className="flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleL1}
                className="w-10 h-11 flex items-center justify-center bg-[#0a0a14]/80 backdrop-blur-xl border border-l-0 border-white/10 text-zinc-400 rounded-r-xl shadow-2xl"
                style={{ color: mobileActive === 'L1' ? accentColor : 'white' }}
              >
                {mobileActive === 'L1' ? (
                  <X className="w-5 h-5" />
                ) : (
                  (mobileActive === 'L2') ? <ArrowLeftRight className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />
                )}
              </motion.button>
              {leftSecondarySidebar && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleToggleL2}
                  className="w-10 h-11 flex items-center justify-center bg-[#0a0a14]/80 backdrop-blur-xl border border-l-0 border-white/10 text-zinc-400 rounded-r-xl shadow-2xl"
                  style={{ color: mobileActive === 'L2' ? accentColor : 'white' }}
                >
                  {mobileActive === 'L2' ? (
                    <X className="w-5 h-5" />
                  ) : (
                    (mobileActive === 'L1') ? <ArrowLeftRight className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Mobile Toggle Button (Right) ───────────────────────────── */}
        {false && isMobile && rightSidebar && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleR}
            className="absolute right-0 top-[42%] z-50 w-10 h-11 flex items-center justify-center bg-[#0a0a14]/80 backdrop-blur-xl border border-r-0 border-white/10 text-zinc-400 shadow-2xl rounded-l-xl"
            style={{ 
              x: rightToggleX, 
              y: '-50%',
              color: effR ? accentColor : 'white'
            }}
          >
            {effR ? <X className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </motion.button>
        )}

        {/* ── Bottom HUD ───────────────────────────────────────────────── */}
        {bottomHUD && <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">{bottomHUD}</div>}
      </div>
    </StudioLayoutContext.Provider>
  );
}
