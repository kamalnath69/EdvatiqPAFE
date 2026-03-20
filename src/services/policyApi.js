import api from '../api';

const policyCache = new Map();
const policyInflight = new Map();

export async function getPolicy(key, options = {}) {
  const { force = false } = options;
  if (!key) return null;
  if (!force && policyCache.has(key)) return policyCache.get(key);
  if (!force && policyInflight.has(key)) return policyInflight.get(key);
  const request = api
    .get(`/policies/${key}`)
    .then((resp) => {
      policyCache.set(key, resp.data);
      return resp.data;
    })
    .finally(() => {
      policyInflight.delete(key);
    });
  policyInflight.set(key, request);
  return request;
}

export async function updatePolicy(key, payload) {
  const resp = await api.put(`/policies/${key}`, payload);
  policyCache.set(key, resp.data);
  return resp.data;
}
