import React, { createContext, useContext } from 'react';
import { useGlobalSidebar } from '../hooks/useGlobalSidebar';

export const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const sidebar = useGlobalSidebar();
  return (
    <SidebarContext.Provider value={sidebar}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
