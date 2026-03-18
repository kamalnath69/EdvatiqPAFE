import api from '../api';

export async function loginRequest(username, password) {
  const resp = await api.post(
    '/auth/token',
    new URLSearchParams({ username, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return resp.data;
}

export async function getMe() {
  const resp = await api.get('/auth/me');
  return resp.data;
}

export async function requestEmailVerification(identity) {
  const resp = await api.post('/auth/request-email-verification', { identity });
  return resp.data;
}

export async function verifyEmail(identity, code) {
  const resp = await api.post('/auth/verify-email', { identity, code });
  return resp.data;
}

export async function requestPasswordReset(identity) {
  const resp = await api.post('/auth/forgot-password', { identity });
  return resp.data;
}

export async function resetPassword(identity, code, newPassword) {
  const resp = await api.post('/auth/reset-password', {
    identity,
    code,
    new_password: newPassword,
  });
  return resp.data;
}

export async function requestSignupVerification(email) {
  const resp = await api.post('/auth/request-signup-verification', { email });
  return resp.data;
}

export async function verifySignupEmail(email, code) {
  const resp = await api.post('/auth/verify-signup-email', { email, code });
  return resp.data;
}
