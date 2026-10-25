"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PREFS, type TripPrefs } from "./types";

/** Preferencias del viaje: viven solo en este teléfono (localStorage). Sin edad ni género. */
const KEY = "equilibici.viaje.prefs.v1";
const listeners = new Set<() => void>();
let cache: TripPrefs | null = null;

function read(): TripPrefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<TripPrefs>) } : DEFAULT_PREFS;
  } catch {
    cache = DEFAULT_PREFS;
  }
  return cache;
}

function write(next: TripPrefs) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* modo privado: se queda en memoria */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
  const update = useCallback((patch: Partial<TripPrefs>) => write({ ...read(), ...patch }), []);
  return [prefs, update] as const;
}
