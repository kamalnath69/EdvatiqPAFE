import { useCallback, useEffect } from 'react';
import { SESSIONS_CHANGED_EVENT, createSession, listSessions, listSessionsForStudent } from '../services/sessionsApi';
import { useAsyncState } from './useAsyncState';

export function useSessions({ mode = 'all', username = '' } = {}) {
  const { data, setData, loading, error, setError, run } = useAsyncState([]);

  const refresh = useCallback(async () => {
    if (mode === 'student' && username) {
      return run(() => listSessionsForStudent(username));
    }
    if (mode === 'student' && !username) {
      setData([]);
      return [];
    }
    return run(() => listSessions());
  }, [mode, username, run, setData]);

  const create = useCallback(
    async (payload) => {
      await createSession(payload);
      return refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    const onSessionsChanged = () => {
      refresh().catch(() => {});
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(SESSIONS_CHANGED_EVENT, onSessionsChanged);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SESSIONS_CHANGED_EVENT, onSessionsChanged);
      }
    };
  }, [refresh]);

  return { data, setData, loading, error, setError, refresh, create };
}
