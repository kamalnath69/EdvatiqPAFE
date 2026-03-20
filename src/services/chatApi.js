import api from '../api';

export async function getCoachConfig() {
  const resp = await api.get('/chat/config');
  return resp.data;
}

export async function updateCoachConfig(payload) {
  const resp = await api.put('/chat/config', payload);
  return resp.data;
}

export async function askCoach(payload) {
  const resp = await api.post('/chat/ask', payload);
  return resp.data;
}

export async function getLiveCoachGuidance(payload) {
  const resp = await api.post('/chat/live-guidance', payload);
  return resp.data;
}

export async function getWalletSummary() {
  const resp = await api.get('/wallet/summary');
  return resp.data;
}

export async function listWalletTransactions(limit = 20) {
  const resp = await api.get('/wallet/transactions', { params: { limit } });
  return resp.data || [];
}

export async function topUpWallet(payload) {
  const resp = await api.post('/wallet/top-up', payload);
  return resp.data;
}
