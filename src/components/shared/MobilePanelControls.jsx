import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Menu, Wrench, History } from 'lucide-react';
import { useStudioPanels } from '../../context/StudioPanelContext';

const PANEL_LABELS = {
  L1: 'Menu',
  L2: 'Tools',
  R: 'History',
};

const PANEL_ICONS = {
  L1: <Menu style={{ width: 14, height: 14 }} />,
  L2: <Wrench style={{ width: 14, height: 14 }} />,
  R: <History style={{ width: 14, height: 14 }} />,
};

/**
 * Floating mobile/tablet panel controls.
 * Always visible on mobile/tablet — shows SWAP + CLOSE when a panel is open,
 * or reopen buttons when all panels are closed.
 */
export default function MobilePanelControls({ color = '#8b5cf6' }) {
  const {
    isMobile,
    isTablet,
    mobileActive,
    panelState,
    setPanelOpen,
    swapMobilePanel,
    availablePanels,
  } = useStudioPanels();

  if (!isMobile && !isTablet) return null;

  const anyOpen = availablePanels.some(id => panelState[id]);

  // ── All closed: show reopen buttons ────────────────────────────────────
  if (!anyOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          pointerEvents: 'auto',
        }}
      >
        {availablePanels.map(id => (
          <button
            key={id}
            onClick={() => setPanelOpen(id, true)}
            aria-label={`Open ${PANEL_LABELS[id]}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(10,10,20,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {PANEL_ICONS[id]}
          </button>
        ))}
      </motion.div>
    );
  }

  // ── Panel open: show a vertical strip in the 72px gap ─────────────────
  const isGapOnRight = mobileActive === 'L1' || mobileActive === 'L2';
  const otherPanels = availablePanels.filter(id => id !== mobileActive);

  // Common button styles inherited from the "all closed" state
  const btnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(10,10,20,0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    pointerEvents: 'auto',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: isGapOnRight ? 20 : -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: isGapOnRight ? 20 : -20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: 12,
          [isGapOnRight ? 'right' : 'left']: 14,
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {/* Close Button — High visibility */}
        <button
          onClick={() => setPanelOpen(mobileActive, false)}
          aria-label="Close panel"
          style={{ ...btnStyle, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
        >
          <X style={{ width: 18, height: 18 }} />
        </button>

        {/* Swap Button — Between L1 and L2 */}
        {(mobileActive === 'L1' || mobileActive === 'L2') && (
          <button
            onClick={swapMobilePanel}
            aria-label="Swap panel"
            style={{ ...btnStyle, color: '#a5b4fc' }}
          >
            <ArrowLeftRight style={{ width: 18, height: 18 }} />
          </button>
        )}

        {/* Tiny Separator */}
        <div style={{ width: 20, height: 1, opacity: 0.1, background: '#fff', margin: '4px 0' }} />

        {/* Quick-access to OTHER panels */}
        {otherPanels.map(id => (
          <button
            key={id}
            onClick={() => setPanelOpen(id, true)}
            aria-label={`Switch to ${PANEL_LABELS[id]}`}
            style={{ ...btnStyle, color: '#94a3b8' }}
          >
            {PANEL_ICONS[id]}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
