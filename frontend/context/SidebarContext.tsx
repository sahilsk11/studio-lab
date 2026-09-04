import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type SidebarContextValue = {
  /** User toggled sidebar open on landing. */
  open: boolean;
  /** User has left the landing page at least once this session. */
  hasNavigated: boolean;
  toggle: () => void;
  markNavigated: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const markNavigated = useCallback(() => {
    setHasNavigated(true);
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ open, hasNavigated, toggle, markNavigated }),
    [open, hasNavigated, toggle, markNavigated],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
