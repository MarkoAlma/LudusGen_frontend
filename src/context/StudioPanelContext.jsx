import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

const StudioPanelContext = createContext(null);

/**
 * StudioPanelProvider
 * Centralized state manager for AiStudio panels (L1: Master, L2: Studio, R: Archive).
 *
 * Desktop (>= 1280px): No limit — all 3 panels can be open simultaneously.
 * Tablet  (768–1279px): Max 2 panels open — closes L1 (nav sidebar) first, then LRU.
 * Mobile  (< 768px):    Max 1 panel open — true swap system with CLOSE + SWAP actions.
 */
export function StudioPanelProvider({ children }) {
  const isNarrow = useMediaQuery('(max-width: 1279px)');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = isNarrow && !isMobile;

  // Panel open state
  const [panelState, setPanelState] = useState({
    L1: true,
    L2: true,
    R: false,
  });

  // LRU stack: most-recent at end
  const [activeStack, setActiveStack] = useState(['L1', 'L2']);

  // Mobile: which panel is currently the "active" single panel
  const [mobileActive, setMobileActive] = useState('L2');

  // Track available panels (children can register which panels they support)
  const [availablePanels, setAvailablePanels] = useState(['L1', 'L2', 'R']);

  // ── Enforce constraints reactively ──────────────────────────────────────
  // Runs on every panel change (not just breakpoint transitions) to ensure
  // the limits are always respected regardless of how a panel was opened.
  useEffect(() => {
    if (isMobile && activeStack.length > 1) {
      // Mobile: max 1 panel — keep only the most recent
      const last = activeStack[activeStack.length - 1];
      setMobileActive(last);
      setPanelState({ L1: last === 'L1', L2: last === 'L2', R: last === 'R' });
      setActiveStack([last]);
    } else if (isTablet && activeStack.length > 2) {
      // Tablet: max 2 panels — close L1 first, then fall back to LRU
      const evictId = activeStack.includes('L1') ? 'L1' : activeStack[0];
      const kept = activeStack.filter(p => p !== evictId);
      setPanelState({
        L1: kept.includes('L1'),
        L2: kept.includes('L2'),
        R: kept.includes('R'),
      });
      setActiveStack(kept);
    }
  }, [isMobile, isTablet, activeStack]);

  // ── Enforce constraints on breakpoint change ────────────────────────────
  const prevMobileRef = useRef(isMobile);
  const prevTabletRef = useRef(isTablet);

  useEffect(() => {
    const wasMobile = prevMobileRef.current;
    const wasTablet = prevTabletRef.current;

    if (!wasMobile && isMobile) {
      // Entering mobile: collapse to single panel (most recent)
      const last = activeStack[activeStack.length - 1] || 'L2';
      setMobileActive(last);
      setPanelState({ L1: last === 'L1', L2: last === 'L2', R: last === 'R' });
    } else if (wasMobile && !isMobile) {
      // Leaving mobile: restore L1 + L2
      setPanelState(prev => ({ ...prev, L1: true, L2: true }));
      setActiveStack(['L1', 'L2']);
    }

    if (!wasTablet && isTablet) {
      // Entering tablet: max 2 — close L1 first, then fall back to LRU
      if (activeStack.length > 2) {
        const evictId = activeStack.includes('L1') ? 'L1' : activeStack[0];
        const kept = activeStack.filter(p => p !== evictId);
        setPanelState({
          L1: kept.includes('L1'),
          L2: kept.includes('L2'),
          R: kept.includes('R'),
        });
        setActiveStack(kept);
      }
    }

    prevMobileRef.current = isMobile;
    prevTabletRef.current = isTablet;
  }, [isMobile, isTablet]);

  // ── Toggle a panel ──────────────────────────────────────────────────────
  const togglePanel = useCallback((id) => {
    setPanelState(prev => {
      const isOpen = !prev[id];
      const nextState = { ...prev, [id]: isOpen };

      if (isOpen) {
        setActiveStack(stack => {
          const newStack = stack.filter(p => p !== id).concat(id);
          if (isMobile) {
            setMobileActive(id);
            return [id];
          }
          if (isTablet && newStack.length > 2) {
            // Close L1 first, then fall back to LRU
            const evicted = newStack.includes('L1') ? 'L1' : newStack[0];
            nextState[evicted] = false;
            return newStack.filter(p => p !== evicted);
          }
          return newStack;
        });
      } else {
        setActiveStack(stack => stack.filter(p => p !== id));
        if (isMobile && mobileActive === id) {
          // Closing the active mobile panel — allow all panels to be closed
          const remaining = activeStack.filter(p => p !== id);
          setMobileActive(remaining[remaining.length - 1] || null);
        }
      }

      return nextState;
    });
  }, [isMobile, isTablet, mobileActive, activeStack, availablePanels]);

  // ── Explicit set ────────────────────────────────────────────────────────
  const setPanelOpen = useCallback((id, open) => {
    setPanelState(prev => {
      if (prev[id] === open) return prev;
      const nextState = { ...prev, [id]: open };

      if (open) {
        setActiveStack(stack => {
          const newStack = stack.filter(p => p !== id).concat(id);
          if (isMobile) {
            setMobileActive(id);
            return [id];
          }
          if (isTablet && newStack.length > 2) {
            // Close L1 first, then fall back to LRU
            const evicted = newStack.includes('L1') ? 'L1' : newStack[0];
            nextState[evicted] = false;
            return newStack.filter(p => p !== evicted);
          }
          return newStack;
        });
      } else {
        setActiveStack(stack => stack.filter(p => p !== id));
        if (isMobile && mobileActive === id) {
          // Allow all panels to be closed on mobile
          const remaining = activeStack.filter(p => p !== id);
          setMobileActive(remaining[remaining.length - 1] || null);
        }
      }

      return nextState;
    });
  }, [isMobile, isTablet, mobileActive, activeStack, availablePanels]);

  // ── Mobile swap: cycle between L1 and L2 only ──────────────────────────
  const swapMobilePanel = useCallback(() => {
    // Swap only between left panels (L1 ↔ L2), never Archive
    const swapPanels = ['L1', 'L2'];
    const currentInSwap = swapPanels.includes(mobileActive) ? mobileActive : 'L2';
    const idx = swapPanels.indexOf(currentInSwap);
    const next = swapPanels[(idx + 1) % swapPanels.length];
    setMobileActive(next);
    setPanelState({ L1: next === 'L1', L2: next === 'L2', R: false });
    setActiveStack([next]);
  }, [mobileActive]);

  // ── Register available panels ───────────────────────────────────────────
  const registerPanel = useCallback((id) => {
    setAvailablePanels(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const unregisterPanel = useCallback((id) => {
    setAvailablePanels(prev => prev.filter(p => p !== id));
  }, []);

  return (
    <StudioPanelContext.Provider value={{
      panelState,
      togglePanel,
      setPanelOpen,
      swapMobilePanel,
      registerPanel,
      unregisterPanel,
      isMobile,
      isTablet,
      isNarrow,
      mobileActive,
      setMobileActive,
      availablePanels,
    }}>
      {children}
    </StudioPanelContext.Provider>
  );
}

export function useStudioPanels() {
  const context = useContext(StudioPanelContext);
  if (!context) {
    throw new Error('useStudioPanels must be used within a StudioPanelProvider');
  }
  return context;
}
