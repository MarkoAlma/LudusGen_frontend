import { useState, useEffect, useCallback } from 'react';

export function useSidebarState(storageKey, defaultOpen = true) {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? JSON.parse(saved) : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const check = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop) setIsOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  return { isOpen, setIsOpen, isDesktop, toggle };
}
