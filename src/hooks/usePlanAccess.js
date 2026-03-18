import { useContext, useEffect, useMemo } from 'react';
import { AuthContext } from '../context/auth-context';
import { listPlans } from '../services/billingApi';
import { useAsyncState } from './useAsyncState';

export function usePlanAccess() {
  const { user } = useContext(AuthContext);
  const plansState = useAsyncState([]);
  const { data, loading, run } = plansState;

  useEffect(() => {
    if (!user) return;
    run(() => listPlans(), { setPending: false }).catch(() => {});
  }, [user, run]);

  const plan = useMemo(() => {
    if (!user) return null;
    return data.find((p) => p.code === user.plan_code) || null;
  }, [data, user]);

  const ai_chat = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (plan && typeof plan.ai_chat === 'boolean') return plan.ai_chat;
    return user.plan_tier === 'pro';
  }, [plan, user]);

  const ai_analytics = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (plan && typeof plan.ai_analytics === 'boolean') return plan.ai_analytics;
    return user.plan_tier === 'pro';
  }, [plan, user]);

  return {
    plan,
    ai_chat,
    ai_analytics,
    loading,
  };
}
