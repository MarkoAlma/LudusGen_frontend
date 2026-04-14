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

  // ── Panel open: show SWAP (left) + CLOSE (right) ──────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        {/* Active panel indicator */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 10,
            background: 'rgba(10,10,20,0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              background: `${color}18`,
              border: `1px solid ${color}30`,
            }}
          >
            {PANEL_ICONS[mobileActive]}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.04em' }}>
            {PANEL_LABELS[mobileActive]}
          </span>
        </div>

        {/* Actions: SWAP (left) + CLOSE (right) */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Swap — only between L1 and L2 */}
          <button
            onClick={swapMobilePanel}
            aria-label="Swap panel"
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
              color: '#a5b4fc',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeftRight style={{ width: 16, height: 16 }} />
          </button>

          {/* Close */}
          <button
            onClick={() => setPanelOpen(mobileActive, false)}
            aria-label="Close panel"
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
              color: '#f87171',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
