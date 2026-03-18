import api from '../api';

export const SESSIONS_CHANGED_EVENT = 'archerypt:sessions-changed';

export async function listSessions() {
  const resp = await api.get('/sessions/');
  return resp.data || [];
}

export async function listSessionsForStudent(username) {
  const resp = await api.get(`/sessions/${username}`);
  return resp.data || [];
}

export async function createSession(payload) {
  const resp = await api.post('/sessions/', payload);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSIONS_CHANGED_EVENT));
  }
  return resp.data;
}
