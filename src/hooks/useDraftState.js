import { useEffect, useState } from 'react';

function resolveStorage(storage) {
  if (typeof window === 'undefined') return null;
  return storage === 'session' ? window.sessionStorage : window.localStorage;
}

export function useDraftState(storageKey, initialValue, options = {}) {
  const storage = options.storage === 'session' ? 'session' : 'local';
  const [value, setValue] = useState(() => {
    const storageArea = resolveStorage(storage);
    if (!storageArea) return initialValue;
    const raw = storageArea.getItem(storageKey);
    if (!raw) return initialValue;
    try {
      return { ...initialValue, ...JSON.parse(raw) };
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    const storageArea = resolveStorage(storage);
    if (!storageArea) return;
    storageArea.setItem(storageKey, JSON.stringify(value));
  }, [storage, storageKey, value]);

  const clearDraft = () => {
    const storageArea = resolveStorage(storage);
    if (storageArea) {
      storageArea.removeItem(storageKey);
    }
    setValue(initialValue);
  };

  return [value, setValue, clearDraft];
}
