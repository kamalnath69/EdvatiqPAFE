import { useCallback, useEffect } from 'react';
import { useAsyncState } from './useAsyncState';
import { getPolicy } from '../services/policyApi';

export function usePolicy(key) {
  const { run, ...state } = useAsyncState(null);

  const refresh = useCallback(async () => {
    if (!key) return null;
    return run(() => getPolicy(key));
  }, [key, run]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return { ...state, refresh };
}
