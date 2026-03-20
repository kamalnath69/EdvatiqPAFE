import { useEffect, useState } from 'react';

export function useDraftState(storageKey, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return initialValue;
    try {
      return { ...initialValue, ...JSON.parse(raw) };
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  }, [storageKey, value]);

  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    setValue(initialValue);
  };

  return [value, setValue, clearDraft];
}
