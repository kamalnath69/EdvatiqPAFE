import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPlans } from '../store/plansSlice';

export function usePlanAccess() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const plans = useAppSelector((state) => state.plans.items);
  const loading = useAppSelector((state) => state.plans.loading);
  const loaded = useAppSelector((state) => state.plans.loaded);

  useEffect(() => {
    if (!user || loaded) return;
    dispatch(fetchPlans());
  }, [dispatch, loaded, user]);

  const plan = useMemo(() => {
    if (!user) return null;
    return plans.find((p) => p.code === user.plan_code) || null;
  }, [plans, user]);

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
