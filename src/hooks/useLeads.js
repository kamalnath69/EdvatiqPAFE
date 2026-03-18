import { useCallback, useEffect } from 'react';
import { useAsyncState } from './useAsyncState';
import { listDemoLeads, listSupportLeads } from '../services/leadsApi';

export function useLeads() {
  const demoState = useAsyncState([]);
  const supportState = useAsyncState([]);

  const refresh = useCallback(async () => {
    await Promise.all([
      demoState.run(() => listDemoLeads()),
      supportState.run(() => listSupportLeads()),
    ]);
  }, [demoState, supportState]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      refresh().catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  return {
    demo: demoState,
    support: supportState,
    refresh,
  };
}
