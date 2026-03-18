import { useCallback, useEffect } from 'react';
import { useAsyncState } from './useAsyncState';
import { getPolicy } from '../services/policyApi';

export function usePolicy(key) {
  const state = useAsyncState(null);

  const refresh = useCallback(async () => {
    if (!key) return null;
    return state.run(() => getPolicy(key));
  }, [key, state]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return { ...state, refresh };
}
