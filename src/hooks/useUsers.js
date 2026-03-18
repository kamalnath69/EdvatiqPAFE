import { useCallback, useEffect } from 'react';
import { assignSport, createUser, deleteUser, listUsers } from '../services/usersApi';
import { useAsyncState } from './useAsyncState';

export function useUsers(enabled = true) {
  const { data, setData, loading, error, setError, run } = useAsyncState([]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setData([]);
      return [];
    }
    return run(() => listUsers());
  }, [enabled, run, setData]);

  const create = useCallback(
    async (payload) => {
      await createUser(payload);
      return refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (username) => {
      await deleteUser(username);
      return refresh();
    },
    [refresh]
  );

  const assign = useCallback(
    async (username, sport) => {
      await assignSport(username, sport);
      return refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return { data, setData, loading, error, setError, refresh, create, remove, assign };
}
