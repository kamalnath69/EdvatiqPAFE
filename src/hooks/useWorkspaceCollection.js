import { useCallback, useEffect } from 'react';
import { useAsyncState } from './useAsyncState';

export function useWorkspaceCollection(fetcher, deps = []) {
  const { data, setData, loading, error, setError, run } = useAsyncState([]);

  const refresh = useCallback(async () => run(() => fetcher()), [fetcher, run]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh, ...deps]);

  return { data, setData, loading, error, setError, refresh };
}
