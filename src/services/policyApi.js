import api from '../api';

export async function getPolicy(key) {
  const resp = await api.get(`/policies/${key}`);
  return resp.data;
}

export async function updatePolicy(key, payload) {
  const resp = await api.put(`/policies/${key}`, payload);
  return resp.data;
}
