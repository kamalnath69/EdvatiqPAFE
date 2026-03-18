import api from '../api';

export async function listPlans() {
  const resp = await api.get('/billing/plans');
  return resp.data || [];
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
  return resp.data;
}
