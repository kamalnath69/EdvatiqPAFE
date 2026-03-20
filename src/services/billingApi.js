import api from '../api';

let plansCache = null;
let plansInflight = null;

export async function listPlans(options = {}) {
  const { force = false } = options;
  if (!force && plansCache) return plansCache;
  if (!force && plansInflight) return plansInflight;
  plansInflight = api
    .get('/billing/plans')
    .then((resp) => {
      plansCache = resp.data || [];
      return plansCache;
    })
    .finally(() => {
      plansInflight = null;
    });
  return plansInflight;
}

export async function createOrder(payload) {
  const resp = await api.post('/billing/create-order', payload);
  return resp.data;
}

export async function verifyPayment(payload) {
  const resp = await api.post('/billing/verify', payload);
  return resp.data;
}

export async function updatePlanFeatures(planCode, payload) {
  const resp = await api.put(`/billing/plans/${planCode}`, payload);
  plansCache = null;
  return resp.data;
}
