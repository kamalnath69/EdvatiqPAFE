import api from '../api';

export async function createDemoLead(payload) {
  const resp = await api.post('/leads/demo', payload);
  return resp.data;
}

export async function createSupportLead(payload) {
  const resp = await api.post('/leads/support', payload);
  return resp.data;
}

export async function listDemoLeads() {
  const resp = await api.get('/leads/demo');
  return resp.data || [];
}

export async function listSupportLeads() {
  const resp = await api.get('/leads/support');
  return resp.data || [];
}
