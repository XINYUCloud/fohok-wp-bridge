import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createApi, type Api } from './api';
import type { Site } from '../types';

const KEY_SITES = 'fohok.sites';
const KEY_ACTIVE = 'fohok.active';

interface StoreValue {
  sites: Site[];
  activeId: string | null;
  active: Site | null;
  notify: (message: string) => void;
  toast: string;
  addSite: (site: Site) => void;
  updateSite: (id: string, patch: Partial<Site>) => void;
  removeSite: (id: string) => void;
  setActive: (id: string | null) => void;
}

const StoreContext = createContext<StoreValue>(null as any);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [sites, setSites] = useState<Site[]>(() => read<Site[]>(KEY_SITES, []));
  const [activeId, setActiveId] = useState<string | null>(() => read<string | null>(KEY_ACTIVE, null));
  const [toast, setToast] = useState('');

  useEffect(() => { localStorage.setItem(KEY_SITES, JSON.stringify(sites)); }, [sites]);
  useEffect(() => { localStorage.setItem(KEY_ACTIVE, JSON.stringify(activeId)); }, [activeId]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? '' : current)), 3200);
  }

  const value = useMemo<StoreValue>(() => ({
    sites,
    activeId,
    active: sites.find((s) => s.id === activeId) || null,
    notify,
    toast,
    addSite: (site) => setSites((prev) => [...prev, site]),
    updateSite: (id, patch) => setSites((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    removeSite: (id) => setSites((prev) => prev.filter((s) => s.id !== id)),
    setActive: setActiveId,
  }), [sites, activeId, toast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  return useContext(StoreContext);
}

export function useApi(): Api | null {
  const { active } = useStore();
  return useMemo(() => (active ? createApi(active) : null), [active]);
}
