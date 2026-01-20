import { useState, useEffect, useCallback, useRef } from "react";
import type { AppState } from "@/types/flexi-tracker";
import { DEFAULT_SETTINGS, DEFAULT_STATE } from "@/lib/flexi-tracker-utils";

const STORAGE_KEY = "flexi-tracker-data";

export const useStorage = (): [AppState, (newState: AppState) => void, boolean] => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Try window.storage first (for Electron/native apps)
        if (window.storage) {
          const result = await window.storage.get(STORAGE_KEY);
          if (result?.value) {
            const parsed = JSON.parse(result.value);
            setState({
              ...DEFAULT_STATE,
              ...parsed,
              settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
            });
          }
        } else {
          // Fallback to localStorage for web
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setState({
              ...DEFAULT_STATE,
              ...parsed,
              settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
            });
          }
        }
      } catch (e) {
        console.log("No existing data, starting fresh");
      }
      setLoaded(true);
    };
    load();
  }, []);

  const save = useCallback((newState: AppState) => {
    setState(newState);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const serialized = JSON.stringify(newState);
        if (window.storage) {
          await window.storage.set(STORAGE_KEY, serialized);
        } else {
          localStorage.setItem(STORAGE_KEY, serialized);
        }
      } catch (e) {
        console.error("Failed to save:", e);
      }
    }, 300);
  }, []);

  return [state, save, loaded];
};
